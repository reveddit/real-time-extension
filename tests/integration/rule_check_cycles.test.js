// However a check is started, and whatever fails in its first steps, two
// checks' requests never run at the same time, nothing stays marked running
// once every check has ended, and the next trigger after that runs. Marked
// running is isCycleInFlight, which the website bridge waits on and answers
// busy for, and the overlap guard, which skips a trigger while a check runs.
// Two checks at once doubled the request rate right before reddit's first 429s
// (issue #14). A new way to start a check goes in `triggers`, a new step a check
// takes before its requests in `phases` and `failures`, and anything else that
// sends requests on its own, with a guard of its own, at the end.

// Install chrome global BEFORE any source import
import '../mocks/chrome-api.js'

import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest'
import browserMock, { __resetStorage, __getLocalStorage } from '../mocks/webextension-polyfill.js'
import { loadBackground } from '../mocks/background.js'
import { cookie, fill } from '../mocks/cookies.js'
import { json, res } from '../mocks/responses.js'
import { getDiagEntries } from '../mocks/diag-entries.js'
import { clearDiagLog } from '../../src/src/diaglog'
import { _resetLoggedInFetchState } from '../../src/src/logged-in-fetch'
import { isCycleInFlight } from '../../src/src/monitoring'
import { isViewerConnecting, recoverViewerConnect, VIEWER_CONNECT_KEY } from '../../src/src/viewer'
import { createDevActionHandler } from '../../src/src/background-dev'
import { ALARM_NAME } from '../../src/src/common'

const { checks, nextCheck } = vi.hoisted(() => ({ checks: [], nextCheck: { arm: null } }))

// Every check the background starts, kept with how its call ended. arm runs as
// the next one starts, so what it sets up meets that check's own steps, not the
// trigger's.
vi.mock('../../src/src/monitoring', async importOriginal => {
    const monitoring = await importOriginal()
    return {
        ...monitoring,
        checkForChanges: (...args) => {
            const arm = nextCheck.arm
            nextCheck.arm = null
            arm?.()
            const check = { settled: false, error: null }
            checks.push(check)
            const run = monitoring.checkForChanges(...args)
            // Most triggers don't wait for their check, so a rejection would go unhandled
            run.then(
                () => (check.settled = true),
                error => Object.assign(check, { settled: true, error }),
            )
            return run
        },
    }
})
// The sign-in's steps a check waits on, which a test can make reject once
vi.mock('../../src/src/viewer', async importOriginal => {
    const viewer = await importOriginal()
    return {
        ...viewer,
        isViewerConnecting: vi.fn(viewer.isViewerConnecting),
        recoverViewerConnect: vi.fn(viewer.recoverViewerConnect),
    }
})

const USER = 'alice'
const TOKEN_URL = 'https://www.reddit.com/api/v1/access_token'

// Listeners loadBackground's stand-in events drop: the alarm's, and the cookie
// changes' and tab loads' that start the login recovery
const kept = { alarm: [], cookieChange: [], tabUpdate: [] }
const keepingEvent = list => ({ addListener: fn => list.push(fn), removeListener() {}, hasListener: () => false })
const keepListeners = (target, name, list) =>
    Object.defineProperty(target, name, { configurable: true, get: () => keepingEvent(list), set() {} })

let background
let devAction
beforeAll(async () => {
    keepListeners(chrome.alarms, 'onAlarm', kept.alarm)
    keepListeners(chrome.tabs, 'onUpdated', kept.tabUpdate)
    // loadBackground puts a new cookies API in place
    let cookiesApi
    Object.defineProperty(chrome, 'cookies', {
        configurable: true,
        get: () => cookiesApi,
        set: api => (cookiesApi = { ...api, onChanged: keepingEvent(kept.cookieChange) }),
    })
    background = await loadBackground()
    devAction = createDevActionHandler(async () => ({}))
})

// Each check asks for a token with the user's own client id first, and that
// request waits for the test to answer it. So a check is in its requests while
// its token request waits, and two waiting at once are two checks' requests at
// once. Connect and an install ask who's logged in before their check, which
// isn't a check's request.
let tokens
let tokensSent
let mostAtOnce
const answerTokens = () => tokens.splice(0).forEach(answer => answer())
const stubFetch = () => {
    tokens = []
    tokensSent = 0
    mostAtOnce = 0
    vi.stubGlobal('fetch', async url => {
        url = String(url)
        if (url === TOKEN_URL) {
            tokensSent++
            return new Promise(resolve => {
                tokens.push(() => resolve(res(500, '')))
                mostAtOnce = Math.max(mostAtOnce, tokens.length)
            })
        }
        if (url.includes('/api/me.json')) return res(200, JSON.stringify({ data: { name: USER } }))
        // The news feed the alarm also fetches
        if (url.startsWith('https://www.reveddit.com/')) return json(200, {})
        // The user's listing and anything else: an outage, so the check ends soon
        return res(500, '')
    })
}

// Reads of local storage a test holds up or fails: each rule takes the nth read
// of its key, counted from when the rule is made, once
const realLocalGet = browserMock.storage.local.get
let readRules
const keyNames = keys =>
    keys && typeof keys === 'object' && !Array.isArray(keys) ? Object.keys(keys) : [].concat(keys ?? [])
const readRule = (key, nth, take) => {
    const rule = { key, nth, seen: 0, met: false, take }
    readRules.push(rule)
    return rule
}
// Held until released, then answered with what's stored by then
const holdRead = (key, nth = 1) => {
    let release
    const released = new Promise(resolve => (release = resolve))
    const rule = readRule(key, nth, read => released.then(read))
    return { reached: () => rule.met, release }
}
const failRead = key => {
    const rule = readRule(key, 1, () => Promise.reject(new Error('storage read failed')))
    return { met: () => rule.met }
}
// The check's read of the synced data, failing the way the browser fails a read:
// the callback gets nothing, with lastError set. It's the check's first read
// once its requests begin.
const failSyncedRead = () => {
    const realSyncGet = chrome.storage.sync.get
    let met = false
    vi.spyOn(chrome.storage.sync, 'get').mockImplementation((keys, callback) => {
        if (!met && keys === undefined && isCycleInFlight()) {
            met = true
            chrome.runtime.lastError = { message: 'IO error' }
            try {
                callback?.()
            } finally {
                chrome.runtime.lastError = null
            }
            return Promise.resolve()
        }
        return realSyncGet(keys, callback)
    })
    return { met: () => met }
}
// A mock's next answer, rejected
const rejectOnce = mock => {
    mock.mockRejectedValueOnce(new Error('storage read failed'))
    return { met: () => mock.mock.settledResults.some(result => result.type === 'rejected') }
}
const logged = (text, times = 1) => ({ met: async () => (await count(text)) === times })

const startSignIn = () => (__getLocalStorage()[VIEWER_CONNECT_KEY] = { started: Date.now(), main: [] })
const endSignIn = () => delete __getLocalStorage()[VIEWER_CONNECT_KEY]
const startBackoff = () => (__getLocalStorage().rate_limit_until = Date.now() + 60 * 1000)
const endBackoff = () => delete __getLocalStorage().rate_limit_until

const fireAlarm = async () => kept.alarm.forEach(listener => listener({ name: ALARM_NAME }))

// Every way a check starts. fire resolves once the trigger has asked for its
// check, or chosen not to. declines says when it doesn't ask.
const CHECK_NOW = "the options page's check now"
const triggers = [
    { name: 'the alarm', jitters: true, fire: fireAlarm },
    {
        name: CHECK_NOW,
        // At most once a minute
        declines: first => first.name === CHECK_NOW,
        fire: () => background.send({ action: 'run-check-now' }),
    },
    {
        name: "Connect, or the welcome page's poll",
        // It answers that a second account is signing in
        declinesDuringSignIn: true,
        declines: (first, phase) => !!phase.signIn,
        fire: () => background.send({ action: 'try-reconnect', quiet: true }),
    },
    {
        name: 'an install',
        fire: async () => {
            const before = checks.length
            background.install({ reason: 'install' })
            // 3 s after the user is subscribed
            await until('checked after the install', () => checks.length > before)
        },
    },
    // It answers once the check's call returns, which a held check's doesn't
    { name: 'the dev action', fire: async () => devAction({ action: 'dev-run-check' }, () => {}) },
]

// Long enough for every promise chain the fakes answer at once
const settle = async () => {
    for (let i = 0; i < 10; i++) await new Promise(resolve => setImmediate(resolve))
}
// A tenth of a second on each time, for a jitter or a timer to run out
const until = async (what, done) => {
    for (let i = 0; i < 100; i++) {
        if (await done()) return
        await settle()
        await vi.advanceTimersByTimeAsync(100)
    }
    throw new Error(`never ${what}`)
}
const count = async text => (await getDiagEntries()).filter(entry => entry.m.includes(text)).length
const STARTED = 'checkForChanges: cycle start'
const DONE = 'checkForChanges: cycle done'
const SKIPPED = 'previous cycle still running'

// Every check ends: its requests are answered, and a jitter or a wait runs out
const endEveryCheck = async () => {
    for (let i = 0; i < 4; i++) {
        answerTokens()
        await vi.advanceTimersByTimeAsync(10 * 1000)
        await settle()
    }
    expect(tokens).toHaveLength(0)
    expect(checks.every(check => check.settled)).toBe(true)
}

// The rule, once every check has ended
const expectTheRule = async () => {
    expect.soft(mostAtOnce, "two checks' requests at once").toBeLessThanOrEqual(1)
    expect.soft(isCycleInFlight(), 'a check still marked in flight').toBe(false)
    const started = await count(STARTED)
    const skipped = await count(SKIPPED)
    const sent = tokensSent
    await fireAlarm()
    await endEveryCheck()
    expect.soft(await count(SKIPPED), 'the next trigger skipped').toBe(skipped)
    expect.soft(await count(STARTED), "the next trigger's check started").toBe(started + 1)
    expect.soft(tokensSent, "the next trigger's check sent").toBe(sent + 1)
}

// The checks' times outlive a test, so each test starts an hour on, past
// whatever a test before it left. A millisecond on with every reading, so no
// two steps share one.
let clock = Date.now()
beforeEach(async () => {
    await clearDiagLog()
    clock += 60 * 60 * 1000
    vi.spyOn(Date, 'now').mockImplementation(() => ++clock)
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    // The alarm's jitter: a tenth of a second
    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    __resetStorage({
        options: { custom_clientid: 'someclient', removal_status: { track: true }, lock_status: { track: true } },
        user_subscriptions: {},
        other_subscriptions: {},
    })
    fill([cookie('reddit_session', 'S1')])
    _resetLoggedInFetchState()
    stubFetch()
    checks.length = 0
    nextCheck.arm = null
    isViewerConnecting.mockReset()
    recoverViewerConnect.mockReset()
    readRules = []
    vi.spyOn(browserMock.storage.local, 'get').mockImplementation((keys, ...rest) => {
        for (const rule of readRules) {
            if (!rule.met && keyNames(keys).includes(rule.key) && ++rule.seen === rule.nth) {
                rule.met = true
                return rule.take(() => realLocalGet(keys, ...rest))
            }
        }
        return realLocalGet(keys, ...rest)
    })
})

afterEach(async () => {
    // Whatever a failed test left waiting ends here, not in the next test
    readRules = []
    answerTokens()
    await vi.advanceTimersByTimeAsync(60 * 1000)
    await settle()
})

// Where the first check is when a second trigger comes. arm stops it there as
// it starts; reached says it has got there.
const phases = [
    {
        name: 'its sign-in check',
        arm: () => holdRead(VIEWER_CONNECT_KEY),
    },
    {
        name: 'its sign-in recovery',
        signIn: true,
        // The check's second read of the sign-in, in recoverViewerConnect.
        // Meanwhile the sign-in ends.
        arm: () => holdRead(VIEWER_CONNECT_KEY, 2),
        inside: () => expect(recoverViewerConnect).toHaveBeenCalledTimes(1),
        beforeRelease: endSignIn,
    },
    {
        name: 'its backoff read',
        arm: () => holdRead('rate_limit_until'),
    },
    {
        name: 'its jitter',
        onlyFor: trigger => trigger.jitters,
        // 9 s, past an install's 3 s
        random: 0.9,
        reached: async () => (await count(STARTED)) === 1 && tokensSent === 0,
    },
    {
        name: 'its requests',
        reached: () => tokens.length === 1,
    },
    {
        name: 'after it ends',
        reached: async () => {
            answerTokens()
            return (await count(DONE)) === 1
        },
    },
]

describe('a second trigger while a check runs', () => {
    describe.each(triggers)('a check started by $name', first => {
        describe.each(
            phases.filter(
                phase => (!phase.onlyFor || phase.onlyFor(first)) && !(phase.signIn && first.declinesDuringSignIn),
            ),
        )('with a second trigger during $name', phase => {
            it.each(triggers)('from $name', async second => {
                if (phase.random) Math.random.mockReturnValue(phase.random)
                if (phase.signIn) startSignIn()
                let hold
                nextCheck.arm = () => (hold = phase.arm?.())
                await first.fire()
                await until(`reached ${phase.name}`, () => (phase.arm ? hold?.reached() : phase.reached()))
                phase.inside?.()

                const before = checks.length
                await second.fire()
                await settle()
                expect(checks.length - before, 'the second trigger asked for a check').toBe(
                    second.declines?.(first, phase) ? 0 : 1,
                )
                if (hold) {
                    phase.beforeRelease?.()
                    hold.release()
                }
                // Every check going ahead asks for its token before any is answered
                await vi.advanceTimersByTimeAsync(10 * 1000)
                await settle()
                await endEveryCheck()
                expect(tokensSent, 'the first check sent').toBeGreaterThanOrEqual(1)
                await expectTheRule()
            })
        })
    })
})

// A check's steps before its requests, failing or skipping the check. met says
// the failure or skip came in the check.
const failures = [
    {
        name: 'its sign-in check rejects',
        arm: () => rejectOnce(isViewerConnecting),
    },
    {
        name: 'its sign-in recovery rejects',
        before: startSignIn,
        after: endSignIn,
        signIn: true,
        arm: () => rejectOnce(recoverViewerConnect),
    },
    {
        name: 'its backoff read rejects',
        arm: () => failRead('rate_limit_until'),
    },
    {
        // Taken as no sign-in
        name: "its sign-in check's storage read rejects",
        arm: () => failRead(VIEWER_CONNECT_KEY),
    },
    {
        name: 'it skips for a sign-in',
        before: startSignIn,
        after: endSignIn,
        signIn: true,
        arm: () => logged('skipping, a second account is signing in'),
    },
    {
        // Check now runs anyway, and says so
        name: 'it skips for a rate-limit backoff',
        before: startBackoff,
        after: endBackoff,
        arm: () => logged('rate-limit backoff'),
    },
    {
        name: 'its read of the synced data fails',
        arm: () => failSyncedRead(),
    },
]

describe("a check's first steps that fail", () => {
    describe.each(triggers)('a check started by $name', trigger => {
        it.each(failures.filter(failure => !(failure.signIn && trigger.declinesDuringSignIn)))(
            'where $name',
            async failure => {
                failure.before?.()
                let failed
                nextCheck.arm = () => (failed = failure.arm())
                await trigger.fire()
                await until('started a check', () => checks.length === 1)
                await endEveryCheck()
                expect(await failed.met(), 'the failure came in the check').toBe(true)
                failure.after?.()
                await expectTheRule()
            },
        )
    })
})

// The queue runs inside the check, before its end, so it has no guard of its own
describe('the pending-post queue', () => {
    it('waits between posts as part of its check, which a trigger meanwhile leaves alone', async () => {
        __getLocalStorage().pending_post_lookups = ['t3_queue1', 't3_queue2']
        fireAlarm()
        await until('asked for a token', () => tokens.length === 1)
        answerTokens()
        // Between the two posts
        await until('read the first post', () => __getLocalStorage().pending_post_progress)
        expect(await count(DONE)).toBe(0)
        expect(isCycleInFlight()).toBe(true)
        await background.send({ action: 'run-check-now' })
        expect(await count(SKIPPED)).toBe(1)
        await endEveryCheck()
        expect(__getLocalStorage().pending_post_lookups).toEqual([])
        await expectTheRule()
    })
})

// background.ts recoverIfDegraded: while the warning says nobody's logged in, a
// reddit cookie that changes or a reddit tab that loads asks reddit who is, one
// at a time (recoveringMe) and at most twice a minute
describe("the login recovery, which asks reddit who's logged in on its own", () => {
    let asks
    let mostAsksAtOnce
    beforeEach(() => {
        __getLocalStorage().error_status = 'needs_user'
        asks = []
        mostAsksAtOnce = 0
        vi.stubGlobal('fetch', async url => {
            if (!String(url).includes('/api/me.json')) return res(500, '')
            return new Promise(resolve => {
                asks.push(() => resolve(res(200, JSON.stringify({ data: { name: USER } }))))
                mostAsksAtOnce = Math.max(mostAsksAtOnce, asks.length)
            })
        })
    })
    afterEach(async () => {
        asks.splice(0).forEach(answer => answer())
        await settle()
    })
    const changeCookies = (...names) =>
        names.forEach(name =>
            kept.cookieChange.forEach(listener =>
                listener({ cookie: { name, domain: '.reddit.com' }, removed: false, cause: 'explicit' }),
            ),
        )
    const loadTabs = (...ids) =>
        ids.forEach(id =>
            kept.tabUpdate.forEach(listener =>
                listener(id, { status: 'complete' }, { id, url: 'https://www.reddit.com/r/test/' }),
            ),
        )

    const recoveryTriggers = [
        {
            name: 'a login, which sets several reddit cookies at once',
            fire: () => changeCookies('reddit_session', 'token_v2', 'loid', 'session_tracker'),
            fireOne: () => changeCookies('reddit_session'),
        },
        {
            name: 'reddit tabs that load at once, as when the browser restores them',
            fire: () => loadTabs(11, 12, 13),
            fireOne: () => loadTabs(11),
        },
    ]

    it.each(recoveryTriggers)('asks one at a time after $name', async trigger => {
        trigger.fire()
        await until('asked', () => asks.length > 0)
        expect(mostAsksAtOnce).toBe(1)
    })

    it.each(recoveryTriggers)(
        'asks again after $name, once the last ask has ended and half a minute has passed',
        async trigger => {
            trigger.fireOne()
            await until('asked', () => asks.length === 1)
            asks.splice(0).forEach(answer => answer())
            await settle()
            // Still nobody, say the login was refused since
            __getLocalStorage().error_status = 'needs_user'
            clock += 31 * 1000
            trigger.fireOne()
            await until('asked again', () => asks.length === 1)
        },
    )
})
