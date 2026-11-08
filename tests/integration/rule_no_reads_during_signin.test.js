// While a second account signs in (viewer.ts), the browser's Reddit login is
// that account's. So nothing reads Reddit for the user until the sign-in ends:
// no request to any reddit host goes out from any of the user's paths, only the
// sign-in's own (viewer.ts's connect flow). A read that went out then would
// read as the second account, or logged out, and its answer would be taken as
// the user's.
//
// Each row is one way the extension comes to read Reddit: a timer, a browser
// event, a message, a page's button. Add every new one to ROWS. The rows run
// twice: during a sign-in, where nothing may go out, and with none under way,
// where each must read Reddit, so no row passes by never reading at all.

// Install chrome global BEFORE any source import
import '../mocks/chrome-api.js'

import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest'
import browserMock, { __resetStorage, __getLocalStorage } from '../mocks/webextension-polyfill.js'
import { parseHTML, DOMParser } from 'linkedom'
import { loadBackground } from '../mocks/background.js'
import { cookie, fill } from '../mocks/cookies.js'
import { openPage } from '../mocks/extension-page.js'
import { getDiagEntries } from '../mocks/diag-entries.js'
import { clearDiagLog } from '../../src/src/diaglog'
import { ALARM_NAME, REMOVED } from '../../src/src/common'
import { setCurrentStateForId } from '../../src/src/monitoring'
import { _scanTurn } from '../../src/src/requests'
import { _resetLoggedInFetchState } from '../../src/src/logged-in-fetch'
import { VIEWER_CONNECT_KEY } from '../../src/src/viewer'

const REDDIT_HOSTS = /(^|\.)(reddit\.com|redd\.it|redditmedia\.com|redditstatic\.com)$/i
const isReddit = url => {
    try {
        return REDDIT_HOSTS.test(new URL(url).hostname)
    } catch {
        return false
    }
}

// Every request any context sends. Reddit answers as it would during a sign-in:
// me.json names the second account, whose login the browser holds, and the
// rest get its edge's block page.
const sent = []
const toReddit = (from = 0) => sent.slice(from).filter(isReddit)
const SECOND_ACCOUNT = 'helper'
const jsonAnswer = data =>
    new Response(JSON.stringify(data), { status: 200, headers: { 'content-type': 'application/json' } })
const asDuringSignIn = url =>
    /\/api\/me\.json/.test(url)
        ? jsonAnswer({ data: { name: SECOND_ACCOUNT } })
        : isReddit(url)
          ? new Response('network security', { status: 403, headers: { 'content-type': 'text/html; charset=utf-8' } })
          : jsonAnswer({})
let reply = asDuringSignIn
Object.defineProperty(globalThis, 'fetch', {
    configurable: true,
    get: () => async url => {
        sent.push(String(url))
        return reply(String(url))
    },
    // Not loadBackground's fetch that never answers: a path that breaks the
    // rule goes on to show what else it would send
    set() {},
})

// The browser's events loadBackground doesn't fire, kept so a row can
const heard = { onCookieChanged: [] }
const listenOn = (target, name, as = name) => {
    const listeners = (heard[as] = [])
    Object.defineProperty(target, name, {
        configurable: true,
        get: () => ({ addListener: fn => listeners.push(fn), removeListener() {}, hasListener: () => false }),
        set() {},
    })
}
listenOn(chrome.alarms, 'onAlarm')
listenOn(chrome.tabs, 'onUpdated')
listenOn(chrome.runtime, 'onStartup')
listenOn(chrome.runtime, 'onMessageExternal')
listenOn(chrome.contextMenus, 'onClicked', 'onMenuClicked')
let cookiesInBackground
Object.defineProperty(chrome, 'cookies', {
    configurable: true,
    get: () => cookiesInBackground,
    set: api => {
        cookiesInBackground = { ...api, onChanged: { addListener: fn => heard.onCookieChanged.push(fn) } }
    },
})
const fire = (name, ...args) => heard[name].forEach(listener => listener(...args))

const USER = 'alice'
const SYNC = {
    options: { removal_status: { track: true }, lock_status: { track: true } },
    user_subscriptions: { [USER]: true },
    other_subscriptions: { t1_followed: { t: 1 } },
}
const LOCAL = { last_logged_in_user: USER, followed_post_ids: { t1_followed: 'p1' } }
// A sign-in under way, as startViewerConnect leaves it once the user's cookies
// are set aside. No tab yet, so nothing ends it early (recoverViewerConnect).
const signingIn = () => ({ [VIEWER_CONNECT_KEY]: { started: Date.now(), mainUser: USER, main: [] } })

const REDDIT_PAGE = 'https://www.reddit.com/r/pics/comments/abc123/a_title/def456/'
const REDDIT_LOCATION = { protocol: 'https:', hostname: 'www.reddit.com', href: REDDIT_PAGE }
const FROM_REDDIT_TAB = { tab: { id: 7, url: REDDIT_PAGE }, url: REDDIT_PAGE }
const REVEDDIT_PAGE = 'https://www.reveddit.com/v/spez/'
const FROM_REVEDDIT_TAB = { tab: { id: 9, url: REVEDDIT_PAGE }, url: REVEDDIT_PAGE }
const BRIDGE_URL = 'https://www.reddit.com/user/spez/about/.json'

// A thread page with a live comment and a removed one kept for its reply
const POST = 't3_post'
const commentOnPage = (id, author, parent, inner = '<div slot="comment"><p>live words</p></div>') =>
    `<shreddit-comment thingid="${id}" author="${author}" ${parent ? `parentid="${parent}"` : ''} ` +
    `created="${new Date().toISOString()}"><details open>${inner}<div id="comment-children"></div></details></shreddit-comment>`
const THREAD_PAGE =
    '<html><body><shreddit-post comment-count="3"></shreddit-post><shreddit-comment-tree><section>' +
    commentOnPage('t1_tomb', '[deleted]', '', '<p>Comment removed by moderator</p>') +
    commentOnPage('t1_bob1', 'bob', 't1_tomb') +
    '</section></shreddit-comment-tree></body></html>'

const SKIPPED = '[reveddit] checkForChanges: skipping, a second account is signing in'
const savedLog = async () => (await getDiagEntries()).map(entry => entry.m)
const lastProgress = async scan => {
    const progress = []
    await scan(p => progress.push(p))
    return progress.at(-1)
}
const scanSaysWhy = last =>
    expect(last).toMatchObject({ status: 'error', message: expect.stringMatching(/^A second account is signing in\./) })
const bridgeSaysBusy = answer =>
    expect(answer).toEqual({ ok: false, status: 0, error: 'busy', retryAfterMs: expect.any(Number) })
const connectSaysWhy = answer =>
    expect(answer).toEqual({ success: false, indeterminate: true, reason: 'a second account is signing in' })

let background
let scans
let contentCommon
let atStart

// drive starts the row and returns its answer, if it has one. check reads that
// answer, or what the row says instead. reads: false for a row that never
// reads Reddit, which has no second run.
const ROWS = [
    {
        name: 'the monitoring alarm',
        drive: () => fire('onAlarm', { name: ALARM_NAME }),
        check: async () => expect(await savedLog()).toContain(SKIPPED),
    },
    {
        name: '"check now" on the options page',
        drive: () => background.send({ action: 'run-check-now' }),
        // The page says to copy the log, which says why
        check: async answer => {
            expect(answer).toEqual({ started: true })
            expect(await savedLog()).toContain(SKIPPED)
        },
    },
    {
        name: "the popup's follow switch, whose check runs in the popup",
        drive: () => {
            vi.stubGlobal('window', {})
            return setCurrentStateForId('t1_popup', 'https://www.reddit.com/r/x/comments/abc/_/popup/')
        },
    },
    {
        name: 'the link menu\'s "reveddit subscribe", in the background',
        drive: () =>
            fire('onMenuClicked', {
                menuItemId: 'reveddit-subscribe',
                linkUrl: 'https://www.reddit.com/r/x/comments/abc/_/menu/',
            }),
    },
    {
        name: "a reddit page's follow button, whose check the background runs",
        drive: () => {
            // A content script on that page
            vi.stubGlobal('location', REDDIT_LOCATION)
            vi.stubGlobal('window', { location: REDDIT_LOCATION })
            const button = parseHTML('<button></button>').document.querySelector('button')
            contentCommon.setTextAndFunction_subscribe('t1_def456', button)
            button.onclick({ preventDefault() {}, stopPropagation() {} })
        },
    },
    {
        name: "the background's lookup for a reddit page (get-reddit-items-by-id)",
        drive: () =>
            background.send(
                { action: 'get-reddit-items-by-id', ids: ['t1_def456'], username: '', authItemsMeta: {} },
                FROM_REDDIT_TAB,
            ),
        // Nothing checked, which the page's check drops without saving anything
        check: answer => expect(answer).toEqual({ response: 'done', items: null }),
    },
    {
        name: "the popup's Connect",
        drive: () => background.send({ action: 'try-reconnect' }),
        check: connectSaysWhy,
    },
    {
        name: "the welcome page's poll of Connect",
        drive: () => background.send({ action: 'try-reconnect', quiet: true }),
        check: connectSaysWhy,
    },
    {
        name: "the cookie listener, as the sign-in takes the user's login out of the browser",
        drive: () => {
            // A warning a login settles, which the listener's recovery reads me.json for
            __getLocalStorage().error_status = 'needs_user'
            fire('onCookieChanged', { removed: true, cause: 'explicit', cookie: cookie('reddit_session', 'S1') })
        },
    },
    {
        name: "the cookie listener, as reddit's login page sets a cookie",
        drive: () => {
            __getLocalStorage().error_status = 'needs_user'
            fire('onCookieChanged', { removed: false, cause: 'explicit', cookie: cookie('loid', 'L1') })
        },
    },
    {
        name: 'a reddit tab finishing loading',
        drive: () => {
            __getLocalStorage().error_status = 'needs_user'
            fire('onUpdated', 5, { status: 'complete' }, { id: 5, url: 'https://www.reddit.com/r/pics/' })
        },
    },
    {
        name: 'the bridge, relayed from a reveddit.com tab',
        drive: () => background.send({ action: 'bridge-fetch', url: BRIDGE_URL }, FROM_REVEDDIT_TAB),
        check: bridgeSaysBusy,
    },
    {
        name: 'the bridge, from a reveddit.com page in Chrome',
        drive: () =>
            new Promise(resolve =>
                fire('onMessageExternal', { action: 'bridge-fetch', url: BRIDGE_URL }, { url: REVEDDIT_PAGE }, resolve),
            ),
        check: bridgeSaysBusy,
    },
    {
        name: 'the thread scan',
        drive: () =>
            lastProgress(onProgress => scans.scanThreadForRemovedComments(POST, 'sub', true, new Map(), onProgress)),
        check: scanSaysWhy,
    },
    {
        name: 'Scan-Rev on a live comment',
        drive: () =>
            lastProgress(onProgress => scans.restoreComment('t1_bob1', POST, 'sub', true, onProgress, new Map())),
        check: scanSaysWhy,
    },
    {
        name: 'restore on a removed comment',
        drive: () =>
            lastProgress(onProgress => scans.restoreComment('t1_tomb', POST, 'sub', true, onProgress, new Map())),
        check: scanSaysWhy,
    },
    {
        name: 'the profile scan',
        drive: () => lastProgress(onProgress => scans.scanUserProfile('bob', onProgress)),
        check: scanSaysWhy,
    },
    {
        name: 'the browser starting, with no account remembered',
        drive: () => {
            delete __getLocalStorage().last_logged_in_user
            fire('onStartup')
        },
    },
    {
        name: 'an update',
        drive: () => background.install({ reason: 'update', previousVersion: '0.0.5.31' }),
        reads: false,
    },
]

// Long enough for any row's waits: a cycle's jitter, the bridge's wait for a
// cycle, a scan's turn
const SETTLE_MS = 30 * 1000

beforeAll(async () => {
    __resetStorage(SYNC, { ...LOCAL, ...signingIn() })
    fill([cookie('reddit_session', 'S2')])
    background = await loadBackground()
    // What it does as it starts, as a worker waking or the browser starting
    await new Promise(resolve => setTimeout(resolve, 50))
    atStart = toReddit()
    globalThis.DOMParser = DOMParser
    scans = { ...(await import('../../src/src/restore.ts')), ...(await import('../../src/src/profile-scan.ts')) }
    // The buttons' module reads the page's address as it loads
    vi.stubGlobal('location', REDDIT_LOCATION)
    contentCommon = await import('../../src/src/content-common')
    vi.unstubAllGlobals()
})

// Each row starts well after the last one, so no pace, throttle or overlap
// window a row leaves behind holds the next one back
let clock = Date.now()
const savedSendMessage = browserMock.runtime.sendMessage
beforeEach(async () => {
    clock += 10 * 60 * 1000
    vi.useFakeTimers({ now: clock })
    __resetStorage(SYNC, LOCAL)
    // The browser's login: the second account's during a sign-in
    fill([cookie('reddit_session', 'S2')])
    _resetLoggedInFetchState()
    _scanTurn.next = 0
    reply = asDuringSignIn
    globalThis.document = parseHTML(THREAD_PAGE).document
    // A page's messages reach the background, as from a reddit tab
    browserMock.runtime.sendMessage = message => background.send(message, FROM_REDDIT_TAB)
    await clearDiagLog()
    sent.length = 0
})
afterEach(() => {
    browserMock.runtime.sendMessage = savedSendMessage
})

describe('while a second account signs in', () => {
    beforeEach(() => {
        Object.assign(__getLocalStorage(), signingIn())
    })

    it('the background starting sends nothing to reddit', () => {
        expect(atStart).toEqual([])
    })

    it.each(ROWS)('$name sends nothing to reddit', async ({ drive, check }) => {
        const answer = Promise.resolve(drive())
        await vi.advanceTimersByTimeAsync(SETTLE_MS)
        expect(toReddit()).toEqual([])
        // Awaited even with nothing to check, so a row that fails to start fails
        const answered = await answer
        if (check) await check(answered)
    })
})

describe('a sign-in that starts while the user is being read for', () => {
    it('stops a monitoring cycle under way from sending more', async () => {
        let answerLoginCheck
        reply = url =>
            /\/api\/me\.json/.test(url) && !answerLoginCheck
                ? new Promise(resolve => (answerLoginCheck = () => resolve(jsonAnswer({ data: { name: USER } }))))
                : asDuringSignIn(url)
        fire('onAlarm', { name: ALARM_NAME })
        // Past the cycle's jitter, its login check is out
        await vi.advanceTimersByTimeAsync(11 * 1000)
        expect(answerLoginCheck).toBeDefined()
        Object.assign(__getLocalStorage(), signingIn())
        const from = sent.length
        answerLoginCheck()
        await vi.advanceTimersByTimeAsync(SETTLE_MS)
        expect(toReddit(from)).toEqual([])
    })

    it('stops a bridge read waiting behind another from going out', async () => {
        let answerFirst
        reply = url =>
            isReddit(url) && !answerFirst
                ? new Promise(resolve => (answerFirst = () => resolve(jsonAnswer({ kind: 't2', data: {} }))))
                : asDuringSignIn(url)
        background.send({ action: 'bridge-fetch', url: BRIDGE_URL }, FROM_REVEDDIT_TAB)
        await vi.advanceTimersByTimeAsync(100)
        expect(answerFirst).toBeDefined()
        // Past its checks, it waits its turn behind the first
        const second = background.send(
            { action: 'bridge-fetch', url: 'https://www.reddit.com/user/spez/comments.json?limit=100' },
            FROM_REVEDDIT_TAB,
        )
        await vi.advanceTimersByTimeAsync(100)
        Object.assign(__getLocalStorage(), signingIn())
        const from = sent.length
        answerFirst()
        await vi.advanceTimersByTimeAsync(SETTLE_MS)
        expect(toReddit(from)).toEqual([])
        bridgeSaysBusy(await second)
    })

    it('stops a scan waiting for its turn, as it asks again, and says why', async () => {
        // Another scan's read just went out, so this one waits its turn
        _scanTurn.next = Date.now() + 2500
        const answers = []
        browserMock.runtime.sendMessage = async message => {
            const answer = await background.send(message, FROM_REDDIT_TAB)
            answers.push(answer)
            return answer
        }
        const last = lastProgress(onProgress =>
            scans.scanThreadForRemovedComments(POST, 'sub', true, new Map(), onProgress),
        )
        await vi.waitFor(() => expect(answers).toHaveLength(1))
        expect(answers[0].waitMs).toBeGreaterThan(0)
        Object.assign(__getLocalStorage(), signingIn())
        await vi.advanceTimersByTimeAsync(SETTLE_MS)
        expect(toReddit()).toEqual([])
        scanSaysWhy(await last)
    })
})

describe('with no sign-in under way', () => {
    it.each(ROWS.filter(row => row.reads !== false))('$name reads reddit', async ({ drive }) => {
        drive()
        await vi.advanceTimersByTimeAsync(SETTLE_MS)
        expect(toReddit()).not.toEqual([])
    })
})

// Last, as a page loads fresh copies of the modules (openPage)
describe("the history page's Open on Reddit, for a comment whose post isn't kept", () => {
    it('sends nothing to reddit while a second account signs in', async () => {
        vi.useRealTimers()
        const { document, window } = await openPage(
            () => {
                globalThis.window.location = { search: '' }
                // The welcome banner was dismissed
                vi.stubGlobal('localStorage', { getItem: () => '1' })
                return import('../../src/src/history.tsx')
            },
            {
                user_subscriptions: { [USER]: true },
                other_subscriptions: {},
                [`changes_u_${USER}`]: [{ i: 't1_nopost', o: 1, g: REMOVED, n: 0 }],
            },
            { [`items_u_${USER}`]: { t1_nopost: { t: 'words of mine', c: 0 } }, ...signingIn() },
        )
        window.open = vi.fn()
        const openOnReddit = () =>
            Array.from(document.querySelectorAll('button')).find(button =>
                button.textContent.includes('Open on Reddit'),
            )
        await vi.waitFor(() => expect(openOnReddit()).toBeDefined())
        openOnReddit().click()
        await vi.waitFor(() => expect(window.open).toHaveBeenCalled())
        expect(toReddit()).toEqual([])
    })
})
