// Nothing that repeats on its own writes to the saved diagnostic log when it
// finds no login: not a page's poll, not a timer, not a stream of events. The
// monitoring cycle is the one exception, since its lines are the record. A
// miss's lines go to the console only, or come no more often than the cycle
// runs. The welcome page's poll once wrote about 1,800 lines an hour into the
// log people copy for bug reports.
//
// Each row is one way to find no login, or one thing that repeats. Add a row
// for anything new that repeats and can look for the login: a page's poll, a
// timer or alarm, or a listener on cookies, tabs or storage.

// Install chrome global BEFORE any source import
import '../mocks/chrome-api.js'

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { __resetStorage, __getLocalStorage } from '../mocks/webextension-polyfill.js'
import { loadBackground } from '../mocks/background.js'
import { cookie, fill, jar, cookiesApi } from '../mocks/cookies.js'
import { refusing, res, untilAborted } from '../mocks/responses.js'
import { getDiagEntries } from '../mocks/diag-entries.js'
import { clearDiagLog } from '../../src/src/diaglog'
import { _resetLoggedInFetchState, WWW_FETCH_TIMEOUT_MS } from '../../src/src/logged-in-fetch'
import { LOGGED_IN_VIEW_UNAVAILABLE } from '../../src/src/reddit-auth'
import { INTERVAL_DEFAULT } from '../../src/src/storage'
import { ALARM_NAME } from '../../src/src/common'
import { VIEWER_CONNECT_KEY } from '../../src/src/viewer'

// The cycle, whose misses are the record
vi.mock('../../src/src/monitoring', async importOriginal => ({ ...(await importOriginal()), checkForChanges: vi.fn() }))

// The background's cookie, tab and alarm listeners, which loadBackground
// doesn't hand back: kept as the script adds them, so a test can fire them
const heard = { cookies: [], tabs: [], alarms: [] }
const keeping = list => ({ addListener: fn => list.push(fn), removeListener() {}, hasListener: () => false })
const keepListeners = (api, name, list) =>
    Object.defineProperty(api, name, { configurable: true, get: () => keeping(list), set() {} })
keepListeners(chrome.tabs, 'onUpdated', heard.tabs)
keepListeners(chrome.alarms, 'onAlarm', heard.alarms)
// loadBackground puts in a whole cookies API, whose onChanged is kept
let chromeCookies
Object.defineProperty(chrome, 'cookies', {
    configurable: true,
    get: () => chromeCookies,
    set: api => {
        chromeCookies = { ...api, onChanged: keeping(heard.cookies) }
    },
})

// What the browser tells the background
const cookieChanged = c => heard.cookies.forEach(listener => listener({ removed: false, cookie: c, cause: 'explicit' }))
// As Reddit expires one, which isn't the first half of a new value
const cookieRemoved = c =>
    heard.cookies.forEach(listener => listener({ removed: true, cookie: c, cause: 'expired_overwrite' }))
const pageLoaded = (tabId, url) =>
    heard.tabs.forEach(listener => listener(tabId, { status: 'complete' }, { id: tabId, url }))
const alarmRang = name => heard.alarms.forEach(listener => listener({ name }))

let background

beforeAll(async () => {
    background = await loadBackground()
})

beforeEach(async () => {
    __resetStorage({ options: {}, user_subscriptions: {}, other_subscriptions: {} })
    fill([])
    _resetLoggedInFetchState()
    await clearDiagLog()
})

const savedLines = async () => (await getDiagEntries()).map(entry => entry.m)
// The line the login check writes for each host it asks
const missed = reason =>
    ['www', 'old'].map(
        host => `getLoggedinUser direct fetch failed (https://${host}.reddit.com/api/me.json): ${reason}`,
    )
const unsure = reason => ({ success: false, indeterminate: true, reason })
const NON_JSON = 'non-JSON response (challenge or HTML page)'
const meJsonReads = fetch => fetch.mock.calls.filter(([url]) => String(url).includes('/api/me.json')).length

const signedIn = () => fill([cookie('reddit_session', 'S1')])
// A second account signs in in tab 7, and the browser holds its login
const signingIn = () => {
    fill([cookie('reddit_session', 'B1')])
    __getLocalStorage()[VIEWER_CONNECT_KEY] = { started: Date.now(), mainUser: 'alice', main: [], tabId: 7 }
}
// A www.reddit.com tab, without which the cookies aren't saved, and the
// browser's cookies as the jar holds them
const openRedditTab = () => {
    vi.spyOn(chrome.tabs, 'query').mockImplementation((query, callback) =>
        callback(String(query?.url).includes('*://*.reddit.com/*') ? [{ id: 3, url: 'https://www.reddit.com/' }] : []),
    )
    vi.spyOn(chrome.cookies, 'getAll').mockImplementation((query, callback) => callback([...jar.values()]))
}
// Matches parse_html/new.ts solveChallenge: the js_challenge marker, the
// string-doubling puzzle and a token input
const CHALLENGE_HTML =
    '<html><body>js_challenge <script>await(async e=>e+e)("abc")</script>' +
    '<input type="hidden" name="token" value="tok123"></body></html>'

// Each way the poll can find no login. console: what it shows there instead.
const quietMisses = [
    [
        "there's no login cookie",
        { setup: () => fill([]), answer: { success: false, indeterminate: false }, console: [] },
    ],
    ['reddit refuses me.json on both hosts with 403s', { answer: unsure('status 403'), console: missed('status 403') }],
    [
        'reddit answers a 429',
        { fetch: async () => res(429, ''), answer: unsure('status 429'), console: missed('status 429') },
    ],
    [
        'reddit answers a challenge page, and its solution gets one too',
        {
            fetch: async () => res(200, CHALLENGE_HTML),
            answer: unsure(NON_JSON),
            console: [
                '[reveddit] me.json challenge detected on www.reddit.com — retrying with solution',
                ...missed(NON_JSON),
            ],
        },
    ],
    [
        "reddit answers a challenge page there's no solving",
        {
            fetch: async () => res(200, '<html>some interstitial</html>'),
            answer: unsure(NON_JSON),
            console: missed(NON_JSON),
        },
    ],
    [
        'the request fails on the network',
        {
            fetch: async () => {
                throw new TypeError('Failed to fetch')
            },
            answer: unsure('network error: Failed to fetch'),
            console: missed('network error: Failed to fetch'),
        },
    ],
    [
        'reddit never answers',
        {
            fetch: (url, init) => untilAborted(init.signal),
            // Both hosts' deadlines
            wait: 2 * WWW_FETCH_TIMEOUT_MS,
            answer: unsure('network error: aborted'),
            console: missed('network error: aborted'),
        },
    ],
    [
        'the stored cookies go back and reddit still refuses them',
        {
            setup: () => {
                __getLocalStorage().stored_reddit_cookie_objects = [cookie('token_v2', 'T2')]
            },
            answer: unsure('status 403'),
            console: [...missed('status 403'), 'Failed to authenticate with stored cookies'],
        },
    ],
    [
        'a second account is signing in',
        {
            setup: signingIn,
            answer: { success: false, indeterminate: true, reason: 'a second account is signing in' },
            console: [],
        },
    ],
    [
        "saving reddit's cookies fails",
        {
            setup: () => {
                openRedditTab()
                const set = chrome.storage.local.set
                vi.spyOn(chrome.storage.local, 'set').mockImplementation((items, callback) => {
                    if ('stored_reddit_cookie_objects' in items) throw new Error('QUOTA_BYTES quota exceeded')
                    return set(items, callback)
                })
            },
            answer: { success: false },
            console: ['try-reconnect error:'],
        },
    ],
]

describe("the welcome page's poll, a quiet Connect, keeps a miss out of the saved log", () => {
    it.each(quietMisses)('when %s', async (_, row) => {
        signedIn()
        row.setup?.()
        vi.stubGlobal('fetch', vi.fn(row.fetch ?? refusing()))
        const logged = vi.spyOn(console, 'log')
        if (row.wait) vi.useFakeTimers()
        const answer = background.send({ action: 'try-reconnect', quiet: true })
        if (row.wait) await vi.advanceTimersByTimeAsync(row.wait)
        expect(await answer).toEqual(row.answer)
        expect(await savedLines()).toEqual([])
        // Still there to see in the console
        expect(logged.mock.calls.map(([line]) => line)).toEqual(expect.arrayContaining(row.console))
    })

    // So the rows above can't pass with nothing logged at all
    it("but the popup's Connect, which isn't quiet, writes its miss there", async () => {
        signedIn()
        vi.stubGlobal('fetch', vi.fn(refusing()))
        expect(await background.send({ action: 'try-reconnect' })).toEqual(unsure('status 403'))
        expect(await savedLines()).toEqual(missed('status 403'))
    })
})

// Ten minutes of each, against the cycle's runs in those ten minutes at the
// interval a new install has
const TEN_MINUTES = 10 * 60 * 1000
const CYCLES = TEN_MINUTES / (INTERVAL_DEFAULT * 60 * 1000)
// Each starts a day after the last, so no throttle remembers the one before
let startAt = Date.now()
const nextStart = () => (startAt += 24 * 60 * 60 * 1000)

// Reddit refusing me.json after setup, with each me.json read a look
const whileRefused = (setup, repeat) => () => {
    setup()
    const fetch = vi.fn(refusing())
    vi.stubGlobal('fetch', fetch)
    return { repeat, looked: () => meJsonReads(fetch) }
}
// Signed in, in a reddit tab, with the warning that reddit keeps refusing the
// login check: one a login settles, which cookie changes and page loads try to
// clear
const loginRefused = () => {
    signedIn()
    openRedditTab()
    __getLocalStorage().error_status = LOGGED_IN_VIEW_UNAVAILABLE
}
// A message to the background, with each answer that says what it found a look
const asking = (message, sender, found) => () => {
    let looks = 0
    return {
        repeat: () =>
            background.send(message, sender).then(answer => {
                if (answer && found(answer)) looks++
            }),
        looked: () => looks,
    }
}

// Each thing that repeats: how often, and what it does each time (repeat)
// once start has set it up. looked counts its looks for the login, so a row
// can't pass by never reaching it.
const repeating = [
    [
        "the welcome page's poll, every 2 seconds, while reddit refuses me.json",
        {
            every: 2000,
            start: whileRefused(signedIn, () => background.send({ action: 'try-reconnect', quiet: true })),
        },
    ],
    // A new value for a cookie that isn't a login's is only counted, so it's no
    // row here (reddit_answer_costs.test.js)
    [
        "reddit's login cookie changing every 5 seconds while reddit refuses me.json",
        {
            every: 5000,
            start: whileRefused(loginRefused, i => {
                fill([cookie('reddit_session', `S${i}`)])
                cookieChanged(cookie('reddit_session', `S${i}`))
            }),
        },
    ],
    [
        'reddit pages loading every 15 seconds while reddit refuses me.json',
        { every: 15000, start: whileRefused(loginRefused, () => pageLoaded(3, 'https://www.reddit.com/r/test/')) },
    ],
    [
        "reddit's cookies going every 5 seconds, in a reddit tab, while nobody is signed in",
        {
            every: 5000,
            start: () => {
                openRedditTab()
                // The other warning a login settles
                __getLocalStorage().error_status = 'needs_user'
                vi.stubGlobal('fetch', vi.fn(refusing()))
                const before = cookiesApi.get.mock.calls.length
                return {
                    // The jar changes too, so each one is saved
                    repeat: i => {
                        fill([cookie('loid', `L${i}`)])
                        cookieRemoved(cookie('session_tracker', `t${i}`))
                    },
                    // Asking the browser for the login cookie
                    looked: () => cookiesApi.get.mock.calls.length - before,
                }
            },
        },
    ],
    [
        "pages loading every 30 seconds in a second account's sign-in tab while reddit refuses me.json",
        { every: 30000, start: whileRefused(signingIn, () => pageLoaded(7, 'https://www.reddit.com/')) },
    ],
    [
        "reddit setting the second account's login cookie every 30 seconds while reddit refuses me.json",
        { every: 30000, start: whileRefused(signingIn, () => cookieChanged(cookie('reddit_session', 'B1'))) },
    ],
    [
        'the monitoring alarm every minute while the news feed is down',
        {
            every: INTERVAL_DEFAULT * 60 * 1000,
            start: () => {
                const fetch = vi.fn(async () => res(503, ''))
                vi.stubGlobal('fetch', fetch)
                return { repeat: () => alarmRang(ALARM_NAME), looked: () => fetch.mock.calls.length }
            },
        },
    ],
    [
        'the popup asking for its status line every 30 seconds',
        { every: 30000, start: asking({ action: 'get-diag-status' }, {}, answer => 'lastCheck' in answer) },
    ],
    [
        "reveddit.com's requests through the extension every 5 seconds while nobody is signed in",
        {
            every: 5000,
            start: asking(
                { action: 'bridge-fetch', url: 'https://www.reddit.com/api/info.json?id=t1_abc' },
                { tab: { url: 'https://www.reveddit.com/v/someuser/' } },
                answer => answer.error === 'not_logged_in',
            ),
        },
    ],
]

describe('what repeats while it finds no login writes to the saved log no more often than the cycle runs', () => {
    it.each(repeating)('%s', async (_, stream) => {
        vi.useFakeTimers()
        vi.setSystemTime(nextStart())
        const { repeat, looked } = stream.start()
        // What one look writes. Once each time the cycle runs is as much as the
        // cycle writes of its own misses.
        let oneLook
        for (let i = 0; i * stream.every < TEN_MINUTES; i++) {
            repeat(i)
            await vi.advanceTimersByTimeAsync(stream.every)
            oneLook ??= (await savedLines()).length
        }
        expect(looked()).toBeGreaterThan(0)
        expect((await savedLines()).length).toBeLessThanOrEqual(oneLook * CYCLES)
    })
})
