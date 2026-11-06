// The second Reddit account (viewer.ts): connecting it through reddit's own
// login page while the user's cookies are set aside and put back, the gates
// that keep everything else still meanwhile, the header rule that puts its
// cookies on the extension's own marked requests, and the lookup of the
// user's own items through it (requests.ts lookupItemsByID_fromViewer).

// Install chrome global BEFORE any source import
import '../mocks/chrome-api.js'

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import browserMock, { __resetStorage, __getLocalStorage } from '../mocks/webextension-polyfill.js'

import {
    startViewerConnect,
    finishViewerConnect,
    cancelViewerConnect,
    recoverViewerConnect,
    disconnectViewer,
    installViewerHeaderRule,
    isViewerConnecting,
    viewerCookieHeader,
    viewerCookieHeaderFor,
    settableCookie,
    toStoredCookie,
    viewerUrl,
    isViewerRequestUrl,
    fetchJsonAsViewer,
    _viewerFetchState,
    VIEWER_FETCH_TIMEOUT_MS,
    VIEWER_KEY,
    VIEWER_CONNECT_KEY,
    VIEWER_CONNECT_RESULT_KEY,
    VIEWER_CONNECT_TIMEOUT_MS,
    VIEWER_CONNECT_ALARM,
    VIEWER_WHO_AM_I_TIMEOUT_MS,
    VIEWER_LOGIN_URL,
    VIEWER_RULE_ID,
} from '../../src/src/viewer'
import {
    storeRedditCookies,
    lookupItemsByID_withFallback,
    _viewerTiming,
    lookupWarningToKeep,
    ABSENT_VERIFY_UNAVAILABLE,
    VIEWER_SIGNED_OUT,
    VIEWER_UNAVAILABLE,
    PROFILE_PUBLICLY_EMPTY,
} from '../../src/src/requests'
import { checkForChanges } from '../../src/src/monitoring'
import { cookie, jar, cookieKey as key, fill, cookiesApi } from '../mocks/cookies.js'

const TOKEN = 'ab'.repeat(16)
const LOGIN_TAB = 42

const MAIN = [
    cookie('reddit_session', 'A-SESSION'),
    cookie('token_v2', 'A-TOKEN', { sameSite: 'unspecified', expirationDate: 1900000000 }),
    cookie('csrf_token', 'A-CSRF', {
        domain: 'www.reddit.com',
        hostOnly: true,
        httpOnly: false,
        sameSite: 'strict',
        session: true,
        expirationDate: undefined,
    }),
]
const SECOND = [cookie('reddit_session', 'B-SESSION'), cookie('token_v2', 'B-TOKEN'), cookie('loid', 'B-LOID')]

const jarValues = () =>
    [...jar.values()]
        .map(c => `${c.name}=${c.value}`)
        .sort()
        .join('; ')

const savedTabs = { ...browserMock.tabs }
const savedChrome = { tabs: { ...globalThis.chrome.tabs }, sync: globalThis.chrome.storage.sync.get }

beforeEach(() => {
    __resetStorage()
    fill(MAIN)
    browserMock.cookies = cookiesApi
    browserMock.tabs.create = vi.fn(async () => ({ id: LOGIN_TAB }))
    browserMock.tabs.update = vi.fn(async () => ({}))
    browserMock.tabs.get = vi.fn(async id => ({ id }))
    _viewerTiming.delayMs = 0
    Object.assign(_viewerFetchState, { preferredCacheMode: {}, latestMode: {}, doubleBlockAt: {} })
    vi.spyOn(console, 'log').mockImplementation(() => {})
    globalThis.fetch = vi.fn(async url => {
        throw new Error(`unexpected network call: ${url}`)
    })
})

afterEach(() => {
    Object.assign(browserMock.tabs, savedTabs)
    delete browserMock.tabs.create
    delete browserMock.tabs.update
    delete browserMock.tabs.get
    delete browserMock.cookies
    Object.assign(globalThis.chrome.tabs, savedChrome.tabs)
    globalThis.chrome.storage.sync.get = savedChrome.sync
    delete globalThis.chrome.cookies
    delete globalThis.chrome.declarativeNetRequest
    vi.restoreAllMocks()
})

describe('the second account cookies', () => {
    it('go back as they were: a host-only cookie without a domain, a session cookie without an expiry', () => {
        const [session, token, csrf] = MAIN.map(toStoredCookie)
        expect(settableCookie(session)).toEqual({
            url: 'https://reddit.com/',
            name: 'reddit_session',
            value: 'A-SESSION',
            path: '/',
            secure: true,
            httpOnly: true,
            domain: '.reddit.com',
            sameSite: 'no_restriction',
            expirationDate: 2000000000,
            storeId: '0',
        })
        expect(settableCookie(token).sameSite).toBeUndefined()
        const hostOnly = settableCookie(csrf)
        expect(hostOnly.url).toBe('https://www.reddit.com/')
        expect(hostOnly.domain).toBeUndefined()
        expect(hostOnly.expirationDate).toBeUndefined()
    })

    it("make the Cookie header www.reddit.com would get: that host's, path /, unexpired", () => {
        const cookies = [
            ...SECOND,
            cookie('old_only', 'x', { domain: 'old.reddit.com', hostOnly: true }),
            cookie('apex_only', 'x', { domain: 'reddit.com', hostOnly: true }),
            cookie('deep', 'x', { path: '/r/' }),
            cookie('stale', 'x', { expirationDate: 1000 }),
            cookie('www', 'w', { domain: 'www.reddit.com', hostOnly: true }),
        ].map(toStoredCookie)
        expect(viewerCookieHeader(cookies, 1800000000)).toBe(
            'reddit_session=B-SESSION; token_v2=B-TOKEN; loid=B-LOID; www=w',
        )
    })

    it('ride only on URLs carrying the current secret marker', () => {
        const url = viewerUrl('https://www.reddit.com/user/alice/comments.json?sort=new', TOKEN)
        expect(url).toBe(`https://www.reddit.com/user/alice/comments.json?sort=new&rv_viewer=${TOKEN}`)
        expect(isViewerRequestUrl(url, TOKEN)).toBe(true)
        expect(isViewerRequestUrl(viewerUrl('https://www.reddit.com/api/me.json', TOKEN), TOKEN)).toBe(true)
        expect(isViewerRequestUrl(viewerUrl('https://www.reddit.com/x', 'cd'.repeat(16)), TOKEN)).toBe(false)
        expect(isViewerRequestUrl(`https://www.reddit.com/x?rv_viewer=${TOKEN}0`, TOKEN)).toBe(false)
        expect(isViewerRequestUrl(`https://old.reddit.com/x?rv_viewer=${TOKEN}`, TOKEN)).toBe(false)
        expect(isViewerRequestUrl('https://www.reddit.com/x?rv_viewer=1', '1')).toBe(false)
    })

    it('go on each Firefox request as it is sent, so one that has expired since stays off', () => {
        const viewer = {
            token: TOKEN,
            cookies: [SECOND[0], { ...SECOND[1], expirationDate: 1500 }].map(toStoredCookie),
        }
        const url = viewerUrl('https://www.reddit.com/api/me.json', TOKEN)
        expect(viewerCookieHeaderFor(url, viewer, 1000)).toBe('reddit_session=B-SESSION; token_v2=B-TOKEN')
        expect(viewerCookieHeaderFor(url, viewer, 2000)).toBe('reddit_session=B-SESSION')
        expect(viewerCookieHeaderFor(viewerUrl('https://www.reddit.com/api/me.json', 'cd'.repeat(16)), viewer, 1000)).toBe('')
        expect(viewerCookieHeaderFor(url, null)).toBe('')
    })
})

describe('connecting a second account', () => {
    const signInAs = cookies => cookies.forEach(c => jar.set(key(c), { ...c }))

    it("sets the user's cookies aside, then keeps the second account's and puts the user's back exactly", async () => {
        expect(await startViewerConnect('alice')).toEqual({ ok: true })
        expect(jar.size).toBe(0)
        expect(browserMock.tabs.create).toHaveBeenCalledWith({ url: VIEWER_LOGIN_URL, active: true })
        expect(__getLocalStorage()[VIEWER_CONNECT_KEY]).toMatchObject({ mainUser: 'alice', tabId: LOGIN_TAB })
        expect(await isViewerConnecting()).toBe(true)

        signInAs(SECOND)
        await finishViewerConnect(async () => 'bob')

        const account = __getLocalStorage()[VIEWER_KEY]
        expect(account.name).toBe('bob')
        expect(account.token).toMatch(/^[0-9a-f]{32}$/)
        expect(account.cookies.map(c => c.value).sort()).toEqual(['B-LOID', 'B-SESSION', 'B-TOKEN'])
        // every attribute back, a session cookie still without an expiry
        expect([...jar.values()]).toEqual(
            expect.arrayContaining(
                MAIN.map(({ expirationDate, ...c }) =>
                    expect.objectContaining({ ...c, ...(expirationDate && { expirationDate }) }),
                ),
            ),
        )
        expect(jarValues()).toBe('csrf_token=A-CSRF; reddit_session=A-SESSION; token_v2=A-TOKEN')
        expect(jar.get('www.reddit.com|/|csrf_token')).toMatchObject({ hostOnly: true, session: true })
        expect(await isViewerConnecting()).toBe(false)
        expect(__getLocalStorage()[VIEWER_CONNECT_RESULT_KEY]).toMatchObject({ ok: true })
        expect(browserMock.tabs.update).toHaveBeenCalledWith(LOGIN_TAB, {
            url: 'chrome-extension://fakeidsrc/options.html#second-account',
        })
    })

    it('sets an alarm that ends the sign-in on time, whatever the monitoring interval', async () => {
        const create = vi.spyOn(globalThis.chrome.alarms, 'create')
        await startViewerConnect('alice')
        expect(create).toHaveBeenCalledWith(VIEWER_CONNECT_ALARM, {
            delayInMinutes: VIEWER_CONNECT_TIMEOUT_MS / 60000 + 0.5,
        })
    })

    it("a new second account starts without the last one's warning, but other warnings stay", async () => {
        __getLocalStorage().error_status = 'viewer_signed_out'
        __getLocalStorage().viewer_lookup_consecutive_failures = 3
        await startViewerConnect('alice')
        signInAs(SECOND)
        await finishViewerConnect(async () => 'carol')
        expect(__getLocalStorage().error_status).toBeUndefined()
        expect(__getLocalStorage().viewer_lookup_consecutive_failures).toBeUndefined()

        __getLocalStorage().error_status = 'login_required'
        await disconnectViewer()
        expect(__getLocalStorage().error_status).toBe('login_required')
    })

    it("signing in to the user's own account again connects nothing", async () => {
        await startViewerConnect('alice')
        signInAs(MAIN)
        await finishViewerConnect(async () => 'Alice')
        expect(__getLocalStorage()[VIEWER_KEY]).toBeUndefined()
        expect(__getLocalStorage()[VIEWER_CONNECT_RESULT_KEY]).toMatchObject({ ok: false, error: 'same_account' })
        expect(jarValues()).toBe('csrf_token=A-CSRF; reddit_session=A-SESSION; token_v2=A-TOKEN')
    })

    it('waits while nobody has signed in, unless told to end; cancelling puts the login back', async () => {
        await startViewerConnect('alice')
        await finishViewerConnect(async () => null)
        expect(await isViewerConnecting()).toBe(true)
        await finishViewerConnect(async () => null, 'not_signed_in')
        expect(await isViewerConnecting()).toBe(false)
        expect(__getLocalStorage()[VIEWER_CONNECT_RESULT_KEY]).toMatchObject({ ok: false, error: 'not_signed_in' })
        expect(jarValues()).toBe('csrf_token=A-CSRF; reddit_session=A-SESSION; token_v2=A-TOKEN')

        await startViewerConnect('alice')
        signInAs(SECOND)
        await cancelViewerConnect('cancelled')
        expect(__getLocalStorage()[VIEWER_KEY]).toBeUndefined()
        expect(jarValues()).toBe('csrf_token=A-CSRF; reddit_session=A-SESSION; token_v2=A-TOKEN')
    })

    it('a sign-in whose tab is gone, or that ran too long, ends when the worker looks again', async () => {
        await startViewerConnect('alice')
        await recoverViewerConnect(async () => null)
        expect(await isViewerConnecting()).toBe(true)
        browserMock.tabs.get = vi.fn(async () => {
            throw new Error('No tab with id: 42')
        })
        await recoverViewerConnect(async () => null)
        expect(await isViewerConnecting()).toBe(false)

        await startViewerConnect('alice')
        __getLocalStorage()[VIEWER_CONNECT_KEY].started = Date.now() - VIEWER_CONNECT_TIMEOUT_MS - 1000
        signInAs(SECOND)
        await recoverViewerConnect(async () => 'bob')
        expect(__getLocalStorage()[VIEWER_KEY].name).toBe('bob')
        expect(jarValues()).toBe('csrf_token=A-CSRF; reddit_session=A-SESSION; token_v2=A-TOKEN')
    })

    // A whoAmI that answers only when told to, and says when it's been asked
    const heldWhoAmI = () => {
        let answer
        let asked
        const wasAsked = new Promise(resolve => (asked = resolve))
        const whoAmI = () =>
            new Promise(resolve => {
                answer = resolve
                asked()
            })
        return { whoAmI, wasAsked, answer: name => answer(name) }
    }

    it('a tab closed while a finish is under way still ends the sign-in', async () => {
        await startViewerConnect('alice')
        const held = heldWhoAmI()
        // The login tab reached a reddit page, then closed before reddit said who's signed in
        const finishing = finishViewerConnect(held.whoAmI)
        const closed = finishViewerConnect(async () => null, 'not_signed_in')
        await held.wasAsked
        held.answer(null)
        await Promise.all([finishing, closed])
        expect(await isViewerConnecting()).toBe(false)
        expect(__getLocalStorage()[VIEWER_CONNECT_RESULT_KEY]).toMatchObject({ ok: false, error: 'not_signed_in' })
        expect(jarValues()).toBe('csrf_token=A-CSRF; reddit_session=A-SESSION; token_v2=A-TOKEN')
    })

    it('a cancel pressed while a finish saves waits for it, so the second account keeps its own cookies', async () => {
        await startViewerConnect('alice')
        signInAs(SECOND)
        const held = heldWhoAmI()
        const finishing = finishViewerConnect(held.whoAmI)
        await held.wasAsked
        const cancelled = cancelViewerConnect('cancelled')
        // Time for a cancel that didn't wait its turn to put the user's cookies back
        await new Promise(resolve => setTimeout(resolve, 20))
        held.answer('bob')
        await Promise.all([finishing, cancelled])
        expect(__getLocalStorage()[VIEWER_KEY].cookies.map(c => c.value).sort()).toEqual([
            'B-LOID',
            'B-SESSION',
            'B-TOKEN',
        ])
        expect(jarValues()).toBe('csrf_token=A-CSRF; reddit_session=A-SESSION; token_v2=A-TOKEN')
        expect(await isViewerConnecting()).toBe(false)
    })

    it("a sign-in ended while reddit won't say who's signed in says so, not that nobody signed in", async () => {
        await startViewerConnect('alice')
        signInAs(SECOND)
        await finishViewerConnect(async () => {
            throw new Error("reddit didn't say who's signed in")
        }, 'not_signed_in')
        expect(__getLocalStorage()[VIEWER_CONNECT_RESULT_KEY]).toMatchObject({ ok: false, error: 'unconfirmed' })
        expect(__getLocalStorage()[VIEWER_KEY]).toBeUndefined()
        expect(jarValues()).toBe('csrf_token=A-CSRF; reddit_session=A-SESSION; token_v2=A-TOKEN')
    })

    it("a login tab closed before anyone signed in ends at once, without asking reddit, whatever logged-out cookies reddit's page set", async () => {
        await startViewerConnect('alice')
        // Reddit's login page sets these for every visitor
        signInAs([
            cookie('loid', 'ANON-LOID'),
            cookie('token_v2', 'ANON-TOKEN'),
            cookie('csrf_token', 'ANON-CSRF', { domain: 'www.reddit.com', hostOnly: true }),
        ])
        const whoAmI = vi.fn(async () => {
            throw new Error("reddit didn't say who's signed in (block page)")
        })
        await finishViewerConnect(whoAmI, 'not_signed_in')
        expect(whoAmI).not.toHaveBeenCalled()
        expect(__getLocalStorage()[VIEWER_CONNECT_RESULT_KEY]).toMatchObject({ ok: false, error: 'not_signed_in' })
        expect(jarValues()).toBe('csrf_token=A-CSRF; reddit_session=A-SESSION; token_v2=A-TOKEN')
    })

    it('a login cookie reddit says is signed out reads as nobody signed in', async () => {
        await startViewerConnect('alice')
        signInAs(SECOND)
        await finishViewerConnect(async () => null, 'not_signed_in')
        expect(__getLocalStorage()[VIEWER_CONNECT_RESULT_KEY]).toMatchObject({ ok: false, error: 'not_signed_in' })
        expect(jarValues()).toBe('csrf_token=A-CSRF; reddit_session=A-SESSION; token_v2=A-TOKEN')
    })

    it("a finish waits only so long for reddit to say who's signed in, so a cancel behind it isn't held", async () => {
        await startViewerConnect('alice')
        signInAs(SECOND)
        vi.useFakeTimers()
        try {
            // reddit never answers who's signed in
            const finishing = finishViewerConnect(() => new Promise(() => {}))
            const cancelled = cancelViewerConnect('cancelled')
            await vi.advanceTimersByTimeAsync(VIEWER_WHO_AM_I_TIMEOUT_MS + 1)
            await Promise.all([finishing, cancelled])
        } finally {
            vi.useRealTimers()
        }
        expect(await isViewerConnecting()).toBe(false)
        expect(__getLocalStorage()[VIEWER_CONNECT_RESULT_KEY]).toMatchObject({ ok: false, error: 'cancelled' })
        expect(jarValues()).toBe('csrf_token=A-CSRF; reddit_session=A-SESSION; token_v2=A-TOKEN')
    })

    it("the incognito windows' copy of the extension (Chrome, Edge) leaves a sign-in alone", async () => {
        const saved = globalThis.chrome.extension
        const incognito = on => (globalThis.chrome.extension = { inIncognitoContext: on })
        try {
            incognito(true)
            expect(await startViewerConnect('alice')).toEqual({ ok: false, error: 'incognito' })
            expect(await isViewerConnecting()).toBe(false)
            expect(jarValues()).toBe('csrf_token=A-CSRF; reddit_session=A-SESSION; token_v2=A-TOKEN')

            // One the normal copy started: the incognito copy can't see its tab
            // or reach its cookies, so it neither ends nor finishes it
            incognito(false)
            await startViewerConnect('alice')
            signInAs(SECOND)
            incognito(true)
            browserMock.tabs.get = vi.fn(async () => {
                throw new Error('No tab with id: 42')
            })
            await recoverViewerConnect(async () => null)
            await finishViewerConnect(async () => 'bob', 'not_signed_in')
            await cancelViewerConnect('cancelled')
            expect(await isViewerConnecting()).toBe(true)
            expect(__getLocalStorage()[VIEWER_KEY]).toBeUndefined()
            expect(__getLocalStorage()[VIEWER_CONNECT_RESULT_KEY]).toBeUndefined()
            expect(jarValues()).toBe('loid=B-LOID; reddit_session=B-SESSION; token_v2=B-TOKEN')

            incognito(false)
            await finishViewerConnect(async () => 'bob')
            expect(__getLocalStorage()[VIEWER_KEY].name).toBe('bob')
            expect(jarValues()).toBe('csrf_token=A-CSRF; reddit_session=A-SESSION; token_v2=A-TOKEN')
        } finally {
            globalThis.chrome.extension = saved
        }
    })

    it("keeps the stored-cookie snapshot and monitoring still while it's under way", async () => {
        globalThis.chrome.tabs.query = (q, cb) => cb([{ id: 1, url: 'https://www.reddit.com/' }])
        globalThis.chrome.cookies = { getAll: (q, cb) => cb([...jar.values()]) }
        await startViewerConnect('alice')
        signInAs(SECOND)
        expect(await storeRedditCookies()).toBe(false)
        expect(__getLocalStorage().stored_reddit_cookie_objects).toBeUndefined()

        const syncGet = vi.fn()
        globalThis.chrome.storage.sync.get = syncGet
        await checkForChanges()
        expect(syncGet).not.toHaveBeenCalled()

        await cancelViewerConnect('cancelled')
        expect(await storeRedditCookies()).toBe(true)
        expect(__getLocalStorage().stored_reddit_cookie_objects.find(c => c.name === 'reddit_session').value).toBe('A-SESSION')
    })
})

describe('the header rule (Chrome and Edge)', () => {
    it('sets the cookie only on GETs from no tab whose URL carries the token, and goes with a disconnect', async () => {
        const updateSessionRules = vi.fn(async () => {})
        globalThis.chrome.declarativeNetRequest = { updateSessionRules }
        __getLocalStorage()[VIEWER_KEY] = {
            name: 'bob',
            token: TOKEN,
            cookies: SECOND.map(toStoredCookie),
            connectedAt: 1,
        }
        await installViewerHeaderRule()
        const { removeRuleIds, addRules } = updateSessionRules.mock.calls[0][0]
        expect(removeRuleIds).toEqual([VIEWER_RULE_ID])
        expect(addRules).toHaveLength(1)
        expect(addRules[0].action.requestHeaders).toEqual([
            { header: 'cookie', operation: 'set', value: 'reddit_session=B-SESSION; token_v2=B-TOKEN; loid=B-LOID' },
        ])
        expect(addRules[0].condition).toMatchObject({
            tabIds: [-1],
            initiatorDomains: [chrome.runtime.id],
            requestMethods: ['get'],
        })
        expect(
            new RegExp(addRules[0].condition.regexFilter).test(viewerUrl('https://www.reddit.com/api/me.json', TOKEN)),
        ).toBe(true)

        // The account's warning and failure count go with it
        __getLocalStorage().error_status = 'viewer_unavailable'
        __getLocalStorage().viewer_lookup_consecutive_failures = 7
        await disconnectViewer()
        expect(__getLocalStorage()[VIEWER_KEY]).toBeUndefined()
        expect(__getLocalStorage().error_status).toBeUndefined()
        expect(__getLocalStorage().viewer_lookup_consecutive_failures).toBeUndefined()
        expect(updateSessionRules.mock.calls[1][0]).toEqual({ removeRuleIds: [VIEWER_RULE_ID], addRules: [] })
    })
})

const json = (body, status = 200) => ({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => 'application/json; charset=UTF-8' },
    json: async () => body,
})
const BLOCK = {
    ok: false,
    status: 403,
    headers: { get: () => 'text/html' },
    json: async () => {
        throw new Error('not json')
    },
}
const listing = (names, after = null) => json({ data: { after, children: names.map(name => ({ data: name })) } })
const comment = (name, extra = {}) => ({ name, author: 'alice', body: 'hi', ...extra })
// A comment's permalink JSON: its post, then the comment, or nothing at all,
// which is what another account gets for a removed comment without replies
const thread = (data, post = 't3_post1') =>
    json([{ data: { children: [{ data: { name: post } }] } }, { data: { children: data ? [{ data }] : [] } }])

describe('checking the user’s items through the second account', () => {
    const connect = () => {
        __getLocalStorage()[VIEWER_KEY] = {
            name: 'bob',
            token: TOKEN,
            cookies: SECOND.map(toStoredCookie),
            connectedAt: 1,
        }
    }
    const answer = routes =>
        (globalThis.fetch = vi.fn(async (url, init) => {
            expect(url).toContain(`rv_viewer=${TOKEN}`)
            expect(init.credentials).toBe('omit')
            for (const [part, response] of routes) {
                if (url.includes(part)) return typeof response === 'function' ? response(url) : response
            }
            throw new Error(`unexpected request: ${url}`)
        }))
    const lookup = (ids, meta = {}) =>
        lookupItemsByID_withFallback('api/info', '', null, false, ids, 'alice', meta)
    const meta = ids => Object.fromEntries(ids.map(id => [id, { link_id: 't3_post1', created_utc: 1 }]))

    it('makes the header rule again before each lookup, so a cookie that has expired since stays off', async () => {
        const savedDnr = globalThis.chrome.declarativeNetRequest
        const updateSessionRules = vi.fn(async () => {})
        globalThis.chrome.declarativeNetRequest = { updateSessionRules }
        try {
            __getLocalStorage()[VIEWER_KEY] = {
                name: 'bob',
                token: TOKEN,
                cookies: [SECOND[0], { ...SECOND[1], expirationDate: 1000 }, SECOND[2]].map(toStoredCookie),
                connectedAt: 1,
            }
            answer([
                ['/api/me.json', json({ data: { name: 'bob' } })],
                ['/user/alice/comments.json', listing([comment('t1_live')])],
            ])
            await lookup(['t1_live'], meta(['t1_live']))
            const { addRules } = updateSessionRules.mock.calls[0][0]
            expect(addRules[0].action.requestHeaders[0].value).toBe('reddit_session=B-SESSION; loid=B-LOID')
        } finally {
            globalThis.chrome.declarativeNetRequest = savedDnr
        }
    })

    it('reads listings and threads as the second account, never the logged-out view', async () => {
        connect()
        answer([
            ['/api/me.json', json({ data: { name: 'bob' } })],
            ['/user/alice/comments.json', listing([comment('t1_live')])],
            ['/user/alice/submitted.json', listing([])],
            ['/_/gone.json', thread(comment('t1_gone', { author: '[deleted]', body: '[removed]' }))],
            ['/_/hidden.json', thread(comment('t1_hidden'))],
        ])
        const results = await lookup(['t1_live', 't1_gone', 't1_hidden'], meta(['t1_live', 't1_gone', 't1_hidden']))
        const byName = Object.fromEntries(results.map(r => [r.data.name, r.data]))
        expect(byName.t1_live).toMatchObject({ author: 'alice', body: 'hi', _public_view: true })
        expect(byName.t1_gone).toMatchObject({ author: '[deleted]', body: '[removed]', is_robot_indexable: false })
        expect(byName.t1_hidden).toMatchObject({ author: 'alice', is_robot_indexable: true })
        // verdicts are cached: the next lookup reads no thread, and only comments
        // are asked about, so the posts listing isn't walked
        globalThis.fetch.mockClear()
        await lookup(['t1_live', 't1_gone', 't1_hidden'], meta(['t1_live', 't1_gone', 't1_hidden']))
        expect(globalThis.fetch.mock.calls.map(c => new URL(c[0]).pathname)).toEqual(['/user/alice/comments.json'])
    })

    it("a listing no item needs isn't walked, so its failing stops nothing", async () => {
        connect()
        __getLocalStorage().viewer_identity = { token: TOKEN, result: 'ok', t: Date.now() }
        // The posts listing is refused; only comments are checked
        answer([
            ['/user/alice/submitted.json', BLOCK],
            ['/user/alice/comments.json', listing([comment('t1_live')])],
            ['/_/gone.json', thread(null)],
        ])
        const results = await lookup(['t1_live', 't1_gone'], meta(['t1_live', 't1_gone']))
        expect(results.map(r => r.data.name).sort()).toEqual(['t1_gone', 't1_live'])
        expect(globalThis.fetch.mock.calls.some(c => c[0].includes('submitted.json'))).toBe(false)
    })

    it("a me.json reddit won't answer is asked again in half an hour, not every cycle", async () => {
        connect()
        answer([
            ['/api/me.json', BLOCK],
            ['/user/alice/', listing([comment('t1_live')])],
        ])
        await lookup(['t1_live'], meta(['t1_live']))
        await lookup(['t1_live'], meta(['t1_live']))
        expect(globalThis.fetch.mock.calls.filter(c => c[0].includes('/api/me.json'))).toHaveLength(2)
    })

    // A 200 page in place of the JSON: a challenge
    const CHALLENGE = {
        ok: true,
        status: 200,
        headers: { get: () => 'text/html' },
        json: async () => {
            throw new Error('not json')
        },
    }

    it('challenge pages in place of the JSON: the listings rest the account, thread reads stop, no mode is learned', async () => {
        connect()
        __getLocalStorage().viewer_identity = { token: TOKEN, result: 'ok', t: Date.now() }
        answer([['/user/alice/comments.json', CHALLENGE]])
        await expect(lookup(['t1_live'])).rejects.toThrow('a page in place of JSON')
        expect(__getLocalStorage().viewer_rest).toMatchObject({ token: TOKEN })
        expect(_viewerFetchState.preferredCacheMode).toEqual({})

        delete __getLocalStorage().viewer_rest
        answer([
            ['/user/alice/comments.json', listing([])],
            ['/_/', CHALLENGE],
        ])
        await lookup(['t1_one', 't1_two'], meta(['t1_one', 't1_two']))
        expect(globalThis.fetch.mock.calls.filter(c => c[0].includes('/_/'))).toHaveLength(1)
    })

    it("a thread read rate limited doesn't count toward the second account's warning", async () => {
        connect()
        __getLocalStorage().viewer_identity = { token: TOKEN, result: 'ok', t: Date.now() }
        __getLocalStorage().viewer_thread_consecutive_failures = { token: TOKEN, failures: 4 }
        answer([
            ['/user/alice/comments.json', listing([])],
            ['/_/', json({}, 429)],
        ])
        await lookup(['t1_one'], meta(['t1_one']))
        expect(__getLocalStorage().viewer_thread_consecutive_failures).toMatchObject({ failures: 4 })
        expect(__getLocalStorage().error_status).not.toBe(VIEWER_UNAVAILABLE)
    })

    it('a 429 on me.json or a listing enters the backoff at once, sending nothing more', async () => {
        connect()
        answer([['/api/me.json', json({}, 429)]])
        await expect(lookup(['t1_live', 't3_post'])).rejects.toThrow('429')
        expect(__getLocalStorage().rate_limit_until).toBeGreaterThan(Date.now())
        expect(globalThis.fetch).toHaveBeenCalledTimes(1)

        delete __getLocalStorage().rate_limit_until
        __getLocalStorage().viewer_identity = { token: TOKEN, result: 'ok', t: Date.now() }
        answer([['/user/alice/comments.json', json({}, 429)]])
        await expect(lookup(['t1_live', 't3_post'])).rejects.toThrow('429')
        expect(globalThis.fetch.mock.calls.some(c => c[0].includes('submitted.json'))).toBe(false)
    })

    it("a comment its own permalink leaves out is removed, but only on the right post with nothing else there", async () => {
        connect()
        const ids = ['t1_childless', 't1_otherpost', 't1_unfocused']
        answer([
            ['/api/me.json', json({ data: { name: 'bob' } })],
            ['/user/alice/', listing([])],
            ['/_/childless.json', thread(null)],
            ['/_/otherpost.json', thread(null, 't3_elsewhere')],
            ['/_/unfocused.json', thread(comment('t1_someone_else'))],
        ])
        const results = await lookup(ids, meta(ids))
        expect(results.map(r => r.data.name)).toEqual(['t1_childless'])
        expect(results[0].data).toMatchObject({ author: '[deleted]', body: '[removed]' })
        expect(__getLocalStorage().viewer_item_verdicts).toMatchObject({
            t1_childless: { v: 'removed' },
            t1_otherpost: { v: 'unknown' },
            t1_unfocused: { v: 'unknown' },
        })
    })

    it("ends the logged-out view's own warnings, which that view would otherwise keep up", async () => {
        connect()
        __getLocalStorage().absent_verify_consecutive_failures = 7
        __getLocalStorage().profile_pagination_consecutive_shortfalls = 6
        __getLocalStorage().www_detect_consecutive_failures = 7
        // and an earlier missing-profile reading, which the bridge would keep acting on
        __getLocalStorage().public_profile_unavailable = { user: 'alice', t: Date.now() }
        answer([
            ['/api/me.json', json({ data: { name: 'bob' } })],
            ['/user/alice/', listing([comment('t1_live')])],
        ])
        await lookup(['t1_live'], meta(['t1_live']))
        expect(__getLocalStorage().absent_verify_consecutive_failures).toBeUndefined()
        expect(__getLocalStorage().profile_pagination_consecutive_shortfalls).toBeUndefined()
        expect(__getLocalStorage().www_detect_consecutive_failures).toBeUndefined()
        expect(__getLocalStorage().public_profile_unavailable).toBeUndefined()
    })

    it('an item the second account gets as [unavailable] (a block) gets no verdict, not a removal', async () => {
        connect()
        __getLocalStorage().viewer_identity = { token: TOKEN, result: 'ok', t: Date.now() }
        const blocked = { name: 't1_blk', author: '[unavailable]', body: '[unavailable]' }
        answer([
            ['/user/alice/comments.json', listing([comment('t1_live'), blocked])],
            ['/user/alice/submitted.json', listing([])],
            ['/_/blk.json', thread(blocked)],
        ])
        const results = await lookup(['t1_live', 't1_blk'], meta(['t1_live', 't1_blk']))
        expect(results.map(r => r.data.name)).toEqual(['t1_live'])
        expect(__getLocalStorage().viewer_item_verdicts.t1_blk).toMatchObject({ v: 'unknown' })
    })

    it('a live verdict lasts by the item’s age, and ends when an item read live while listed drops out', async () => {
        connect()
        __getLocalStorage().viewer_identity = { token: TOKEN, result: 'ok', t: Date.now() }
        const nowSec = Math.floor(Date.now() / 1000)
        // A 90-minute-old comment missing from the listing, read live an hour ago:
        // an eighth of its age has passed, so it's read again
        __getLocalStorage().viewer_item_verdicts = { t1_gone: { v: 'live', t: Date.now() - 3600 * 1000 } }
        answer([
            ['/user/alice/', listing([])],
            ['/_/gone.json', thread(null)],
        ])
        let results = await lookup(['t1_gone'], { t1_gone: { link_id: 't3_post1', created_utc: nowSec - 90 * 60 } })
        expect(results.map(r => r.data.body)).toEqual(['[removed]'])

        // A young post read live a minute ago while listed, gone from the listing now
        __getLocalStorage().viewer_item_verdicts = { t3_young: { v: 'live', t: Date.now() - 60 * 1000, l: 1 } }
        const removedPost = json([
            { data: { children: [{ data: { name: 't3_young', removed_by_category: 'moderator' } }] } },
            { data: { children: [] } },
        ])
        answer([
            ['/user/alice/', listing([])],
            ['/comments/young.json', removedPost],
        ])
        results = await lookup(['t3_young'], { t3_young: { created_utc: nowSec - 3600 } })
        expect(results.map(r => r.data.is_robot_indexable)).toEqual([false])
    })

    it("a later listing page failing only ends the walk: what the first page showed still stands", async () => {
        connect()
        __getLocalStorage().viewer_identity = { token: TOKEN, result: 'ok', t: Date.now() }
        answer([
            ['after=', json({}, 503)],
            ['/user/alice/comments.json', listing([comment('t1_zzzz')], 't1_zzzz')],
            ['/user/alice/submitted.json', listing([])],
        ])
        const results = await lookup(['t1_zzzz', 't1_aaa'], meta(['t1_zzzz', 't1_aaa']))
        // the newer comment is listed, so live; the older one, below where the walk stopped, gets no verdict
        expect(results.map(r => r.data.name)).toEqual(['t1_zzzz'])
        expect(__getLocalStorage().viewer_lookup_consecutive_failures).toBeUndefined()
    })

    it('says nothing about an item older than the part of the listing walked', async () => {
        connect()
        // three pages of newer comments, each with more after it
        answer([
            ['/api/me.json', json({ data: { name: 'bob' } })],
            ['/user/alice/comments.json', listing([comment('t1_zzzz')], 't1_zzzz')],
            ['/user/alice/submitted.json', listing([])],
        ])
        expect(await lookup(['t1_aaa'], meta(['t1_aaa']))).toEqual([])
        expect(globalThis.fetch.mock.calls.filter(c => c[0].includes('comments.json'))).toHaveLength(3)
    })

    it("a signed-out second account says so at once, and doesn't fall back to the logged-out view", async () => {
        connect()
        answer([['/api/me.json', json({})]])
        await expect(lookup(['t1_live'])).rejects.toThrow(VIEWER_SIGNED_OUT)
        expect(__getLocalStorage().error_status).toBe(VIEWER_SIGNED_OUT)
    })

    it('a second account whose login cookie has expired is signed out, without asking reddit, which may answer with a block page', async () => {
        __getLocalStorage()[VIEWER_KEY] = {
            name: 'bob',
            token: TOKEN,
            cookies: [{ ...SECOND[0], expirationDate: 1000 }, SECOND[1], SECOND[2]].map(toStoredCookie),
            connectedAt: 1,
        }
        __getLocalStorage().viewer_identity = { token: TOKEN, result: 'ok', t: Date.now() }
        answer([['.json', BLOCK]])
        await expect(lookup(['t1_live'])).rejects.toThrow(VIEWER_SIGNED_OUT)
        expect(__getLocalStorage().error_status).toBe(VIEWER_SIGNED_OUT)
        expect(__getLocalStorage().viewer_identity).toMatchObject({ token: TOKEN, result: 'signed_out' })
        expect(globalThis.fetch).not.toHaveBeenCalled()
    })

    it('refused listings rest the second account half an hour, and the warning comes up all the same', async () => {
        connect()
        __getLocalStorage().viewer_identity = { token: TOKEN, result: 'ok', t: Date.now() }
        answer([['.json', BLOCK]])
        await expect(lookup(['t1_live'])).rejects.toThrow('second-account lookup failed: block page')
        // the block page is retried once in the other cache mode
        expect(globalThis.fetch.mock.calls.slice(0, 2).map(c => c[1].cache)).toEqual(['default', 'no-cache'])
        const sent = globalThis.fetch.mock.calls.length
        for (let i = 2; i <= 5; i++) {
            await expect(lookup(['t1_live'])).rejects.toThrow('second-account lookup skipped: resting')
            expect(__getLocalStorage().error_status).toBe(i < 5 ? undefined : VIEWER_UNAVAILABLE)
        }
        expect(globalThis.fetch.mock.calls).toHaveLength(sent)
        // Once the rest is over, it asks again
        __getLocalStorage().viewer_rest.t = Date.now() - 31 * 60 * 1000
        await expect(lookup(['t1_live'])).rejects.toThrow('second-account lookup failed: block page')
        expect(globalThis.fetch.mock.calls.length).toBeGreaterThan(sent)
        // A rest begun while the clock ran ahead doesn't hold once it's put right
        __getLocalStorage().viewer_rest = { token: TOKEN, t: Date.now() + 24 * 3600 * 1000 }
        const before = globalThis.fetch.mock.calls.length
        await expect(lookup(['t1_live'])).rejects.toThrow('second-account lookup failed: block page')
        expect(globalThis.fetch.mock.calls.length).toBeGreaterThan(before)
    })

    it('a rest dated ahead by a clock since put right is dropped, so it never begins one of its own', async () => {
        connect()
        __getLocalStorage().viewer_identity = { token: TOKEN, result: 'ok', t: Date.now() }
        __getLocalStorage().viewer_rest = { token: TOKEN, t: Date.now() + 2 * 3600 * 1000 }
        answer([['/user/alice/', listing([comment('t1_live')])]])
        expect((await lookup(['t1_live'], meta(['t1_live']))).map(r => r.data.name)).toEqual(['t1_live'])
        expect(__getLocalStorage().viewer_rest).toBeUndefined()
    })

    it('the pass keeps the warnings of the view that checked, the logged-out one when the second account wrote the items', async () => {
        connect()
        globalThis.fetch = vi.fn(async () => {
            throw new TypeError('Failed to fetch')
        })
        await lookupItemsByID_withFallback('api/info', '', null, false, ['t1_x'], 'alice', {
            t1_x: { author: 'Bob', link_id: 't3_post1' },
        }).catch(() => {})
        __getLocalStorage().viewer_thread_consecutive_failures = { token: TOKEN, failures: 5 }
        __getLocalStorage().absent_verify_consecutive_failures = 7
        expect(await lookupWarningToKeep('alice')).toBe(ABSENT_VERIFY_UNAVAILABLE)
        // A later pass with no items checks through neither view: the usual rule again
        expect(await lookupItemsByID_withFallback('api/info', '', null, false, [], 'alice', {})).toEqual([])
        expect(await lookupWarningToKeep('alice')).toBe(null)
    })

    it('a thread read refused with the block page waits, and the next cycle reads the items after it', async () => {
        connect()
        __getLocalStorage().viewer_identity = { token: TOKEN, result: 'ok', t: Date.now() }
        const ids = ['t1_blocked', 't1_gone']
        answer([
            ['/user/alice/', listing([])],
            ['/_/blocked.json', BLOCK],
            ['/_/gone.json', thread(null)],
        ])
        expect(await lookup(ids, meta(ids))).toEqual([])
        const results = await lookup(ids, meta(ids))
        expect(results.map(r => r.data.name)).toEqual(['t1_gone'])
        expect(results[0].data).toMatchObject({ body: '[removed]' })
        // asked for in one cycle only, in both cache modes
        expect(globalThis.fetch.mock.calls.filter(c => c[0].includes('/_/blocked.json'))).toHaveLength(2)
    })

    it('cycles whose thread reads all come back without a verdict raise its warning, which a pass keeps', async () => {
        connect()
        __getLocalStorage().viewer_identity = { token: TOKEN, result: 'ok', t: Date.now() }
        answer([
            ['/user/alice/', listing([comment('t1_live')])],
            ['/_/', BLOCK],
        ])
        for (let i = 1; i <= 5; i++) {
            const ids = ['t1_live', `t1_gone${i}`]
            expect((await lookup(ids, meta(ids))).map(r => r.data.name)).toEqual(['t1_live'])
            expect(__getLocalStorage().error_status).toBe(i < 5 ? undefined : VIEWER_UNAVAILABLE)
        }
        expect(await lookupWarningToKeep('alice')).toBe(VIEWER_UNAVAILABLE)
        // The second account signed in to the browser doesn't check: the logged-out view's warnings apply
        expect(await lookupWarningToKeep('Bob')).toBe(null)
        // While an item it's about waits out its half hour, the warning stays
        await lookup(['t1_live', 't1_gone5'], meta(['t1_live', 't1_gone5']))
        expect(await lookupWarningToKeep('alice')).toBe(VIEWER_UNAVAILABLE)

        // a verdict ends the streak
        answer([
            ['/user/alice/', listing([comment('t1_live')])],
            ['/_/back.json', thread(comment('t1_back'))],
        ])
        await lookup(['t1_live', 't1_back'], meta(['t1_live', 't1_back']))
        expect(await lookupWarningToKeep('alice')).toBe(null)

        // and so does nothing being left to read, as when those items were deleted
        __getLocalStorage().viewer_thread_consecutive_failures = { token: TOKEN, failures: 5 }
        await lookup(['t1_live'], meta(['t1_live']))
        expect(await lookupWarningToKeep('alice')).toBe(null)
        // or every item being gone, which asks reddit nothing
        __getLocalStorage().viewer_thread_consecutive_failures = { token: TOKEN, failures: 5 }
        const sent = globalThis.fetch.mock.calls.length
        expect(await lookup([])).toEqual([])
        expect(globalThis.fetch.mock.calls).toHaveLength(sent)
        expect(await lookupWarningToKeep('alice')).toBe(null)
    })

    it('both listings missing while a known profile loads is the shadowban signature: one warning', async () => {
        connect()
        answer([
            ['/api/me.json', json({ data: { name: 'bob' } })],
            ['/user/alice/', json({ error: 404 }, 404)],
            ['/user/reddit/comments.json', listing([comment('t1_r')])],
        ])
        await expect(lookup(['t1_live'])).rejects.toThrow(PROFILE_PUBLICLY_EMPTY)
    })

    it('never checks the second account’s own items through itself, which would read as their author', async () => {
        connect()
        globalThis.fetch = vi.fn(async () => {
            throw new TypeError('Failed to fetch')
        })
        const results = await lookupItemsByID_withFallback('api/info', '', null, false, ['t1_x'], 'Bob', {}).catch(
            e => e,
        )
        expect(results).toBeInstanceOf(Error)
        const urls = globalThis.fetch.mock.calls.map(c => c[0])
        expect(urls.length).toBeGreaterThan(0)
        expect(urls.some(url => url.includes('rv_viewer='))).toBe(false)
        expect(urls[0]).toContain('/user/Bob/')
    })

    it('fetchJsonAsViewer keeps the cache mode that gets past the block page, never one that went unanswered', async () => {
        const viewer = { name: 'bob', token: TOKEN, cookies: [], connectedAt: 1 }
        const get = () => fetchJsonAsViewer('https://www.reddit.com/api/me.json', viewer)
        // A retry with no answer at all says nothing about its mode
        globalThis.fetch = vi.fn(async (url, init) => {
            if (init.cache === 'no-cache') throw new TypeError('Failed to fetch')
            return BLOCK
        })
        expect(await get()).toMatchObject({ ok: false, status: 0 })
        expect(_viewerFetchState.preferredCacheMode).toEqual({})
        // Only no-cache gets past the edge: it's learned, and asked first after that
        globalThis.fetch = vi.fn(async (url, init) => (init.cache === 'no-cache' ? json({ ok: 1 }) : BLOCK))
        await get()
        expect(await get()).toMatchObject({ ok: true })
        expect(globalThis.fetch.mock.calls.map(c => c[1].cache)).toEqual(['default', 'no-cache', 'no-cache'])
        // Blocked in both modes: that kind of request skips the retry for a while
        globalThis.fetch = vi.fn(async () => BLOCK)
        expect(await get()).toMatchObject({ ok: false, blocked: true })
        expect(await get()).toMatchObject({ ok: false, blocked: true })
        expect(globalThis.fetch.mock.calls.map(c => c[1].cache)).toEqual(['no-cache', 'default', 'no-cache'])
    })

    it('each kind of request keeps its own mode, so its pause tries the one that works for it', async () => {
        const viewer = { name: 'bob', token: TOKEN, cookies: [], connectedAt: 1 }
        const thread = 'https://www.reddit.com/comments/p/_/c.json'
        // Listings pass in no-cache only, thread reads in default only, and
        // the thread reads are refused for a moment
        let threadsRefused = true
        globalThis.fetch = vi.fn(async (url, init) => {
            if (url.includes('/comments/p/')) return !threadsRefused && init.cache === 'default' ? json([]) : BLOCK
            return init.cache === 'no-cache' ? listing([]) : BLOCK
        })
        await fetchJsonAsViewer('https://www.reddit.com/user/alice/comments.json', viewer)
        expect(await fetchJsonAsViewer(thread, viewer)).toMatchObject({ blocked: true })
        threadsRefused = false
        expect(await fetchJsonAsViewer(thread, viewer)).toMatchObject({ ok: true })
    })

    it('a pause recorded while the clock ran ahead ends once the clock is put right, and is dropped', async () => {
        const viewer = { name: 'bob', token: TOKEN, cookies: [], connectedAt: 1 }
        const kind = `${TOKEN}:/api/me.json`
        _viewerFetchState.preferredCacheMode[kind] = 0
        _viewerFetchState.doubleBlockAt[kind] = Date.now() + 24 * 3600 * 1000
        globalThis.fetch = vi.fn(async (url, init) => (init.cache === 'no-cache' ? json({ ok: 1 }) : BLOCK))
        expect(await fetchJsonAsViewer('https://www.reddit.com/api/me.json', viewer)).toMatchObject({ ok: true })
        expect(_viewerFetchState.doubleBlockAt[kind]).toBeUndefined()
        // Also when the first answer gets through, so the stamp can't start a pause later
        _viewerFetchState.doubleBlockAt[kind] = Date.now() + 2 * 3600 * 1000
        _viewerFetchState.preferredCacheMode[kind] = 1
        expect(await fetchJsonAsViewer('https://www.reddit.com/api/me.json', viewer)).toMatchObject({ ok: true })
        expect(_viewerFetchState.doubleBlockAt[kind]).toBeUndefined()
    })

    it('a kind with no mode of its own yet starts from the one the account last learned', async () => {
        const viewer = { name: 'bob', token: TOKEN, cookies: [], connectedAt: 1 }
        // Every kind passes in no-cache only, as when reddit refuses a request style everywhere
        globalThis.fetch = vi.fn(async (url, init) => (init.cache === 'no-cache' ? json({ data: { children: [] } }) : BLOCK))
        await fetchJsonAsViewer('https://www.reddit.com/user/alice/comments.json', viewer)
        globalThis.fetch.mockClear()
        expect(await fetchJsonAsViewer('https://www.reddit.com/comments/p/_/c.json', viewer)).toMatchObject({ ok: true })
        expect(globalThis.fetch.mock.calls.map(c => c[1].cache)).toEqual(['no-cache'])
    })

    it("a kind of request refused in both modes doesn't keep another from finding the mode that works", async () => {
        connect()
        // me.json is refused in both modes; the listings answer in no-cache only
        globalThis.fetch = vi.fn(async (url, init) => {
            if (url.includes('/api/me.json') || init.cache !== 'no-cache') return BLOCK
            return url.includes('/comments.json') ? listing([comment('t1_live')]) : listing([])
        })
        const results = await lookup(['t1_live'], meta(['t1_live']))
        expect(results.map(r => r.data.name)).toEqual(['t1_live'])
        expect(__getLocalStorage().viewer_rest).toBeUndefined()
    })

    it('fetchJsonAsViewer gives up on an answer whose body stalls, at the same deadline', async () => {
        vi.useFakeTimers()
        try {
            // Headers arrive, then the body never finishes until the request is aborted
            globalThis.fetch = vi.fn(async (url, init) => ({
                ok: true,
                status: 200,
                headers: { get: () => 'application/json; charset=UTF-8' },
                json: () =>
                    new Promise((resolve, reject) =>
                        init.signal.addEventListener('abort', () => reject(new Error('aborted'))),
                    ),
            }))
            const pending = fetchJsonAsViewer('https://www.reddit.com/api/me.json', {
                name: 'bob',
                token: TOKEN,
                cookies: [],
                connectedAt: 1,
            })
            await vi.advanceTimersByTimeAsync(VIEWER_FETCH_TIMEOUT_MS + 1)
            expect(await pending).toEqual({ ok: false, status: 200, blocked: false })
        } finally {
            vi.useRealTimers()
        }
    })

    it('nor when login detection fell back to the cached username, but the items say the second account wrote them', async () => {
        connect()
        globalThis.fetch = vi.fn(async () => {
            throw new TypeError('Failed to fetch')
        })
        await lookupItemsByID_withFallback('api/info', '', null, false, ['t1_x'], 'alice', {
            t1_x: { author: 'Bob', link_id: 't3_post1' },
        }).catch(() => {})
        const urls = globalThis.fetch.mock.calls.map(c => c[0])
        expect(urls.length).toBeGreaterThan(0)
        expect(urls.some(url => url.includes('rv_viewer='))).toBe(false)
    })

    it("fetchJsonAsViewer leaves the browser's cookies off and marks the URL", async () => {
        const fetchSpy = (globalThis.fetch = vi.fn(async () => json({ ok: 1 })))
        const r = await fetchJsonAsViewer('https://www.reddit.com/api/me.json', {
            name: 'bob',
            token: TOKEN,
            cookies: [],
            connectedAt: 1,
        })
        expect(r).toMatchObject({ ok: true, json: { ok: 1 } })
        expect(fetchSpy.mock.calls[0][0]).toBe(`https://www.reddit.com/api/me.json?rv_viewer=${TOKEN}`)
        expect(fetchSpy.mock.calls[0][1]).toMatchObject({ credentials: 'omit', cache: 'default' })
    })
})
