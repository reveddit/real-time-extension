// The logged-out reads' own cookies (public-cookies.ts): kept from reddit's
// answers the way a browser keeps them, sent back only on GETs carrying the
// jar's marker, started over (with a new marker) at the next lookup after
// reddit refuses the profile's pages on every route, at most once in
// START_OVER_MIN_MS, or at once when the profile's page has come back
// unreadable for long enough, and dropped when the news feed turns them off.

// Install chrome global BEFORE any source import
import '../mocks/chrome-api.js'

import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest'
import browserMock, { __resetStorage, __getLocalStorage } from '../mocks/webextension-polyfill.js'
import { loadBackground } from '../mocks/background.js'
import { res } from '../mocks/responses.js'
import { getDiagEntries } from '../mocks/diag-entries.js'
import {
    parseSetCookie,
    withSetCookies,
    setCookieLines,
    publicViewMarking,
    publicCookiesSettled,
    publicCookieHeaderFor,
    requestPublicCookiesStartOver,
    _publicCookieTiming,
    _resetPublicCookies,
    PUBLIC_COOKIES_KEY,
    PUBLIC_COOKIES_RULE_ID,
    START_OVER_MIN_MS,
    notePublicViewUnreadable,
    UNREADABLE_KEY,
    UNREADABLE_START_OVER_AFTER_MS,
} from '../../src/src/public-cookies'
import { getWwwHtmlFetcher, _wwwRouteTiming } from '../../src/src/www-fetcher'
import { lookupItemsByID_fromPublicProfile } from '../../src/src/requests'
import { NEWS_CACHE_KEY } from '../../src/src/news'

const PAGE_URL = 'https://www.reddit.com/user/alice/comments/?sort=new'
const PARTIAL_URL =
    'https://www.reddit.com/svc/shreddit/profiles/profile_comments-more-posts/new/' +
    '?sort=new&after=dDFfYQ%3D%3D&name=alice&feedLength=8'
const ITEM_URL = 'https://www.reddit.com/r/pics/comments/abc/t/'
const TOKEN = 'ab'.repeat(16)
const OTHER_TOKEN = 'cd'.repeat(16)
const CAPTCHA = '<html><head><title>Reddit - Prove your humanity</title></head><body></body></html>'

describe('a Set-Cookie header, kept the way a browser keeps it', () => {
    it('a domain cookie with its flags, and a host-only one on the default path', () => {
        expect(
            parseSetCookie('token_v2=T1; Domain=.reddit.com; Path=/; Max-Age=86400; HttpOnly; Secure', PAGE_URL, 1000),
        ).toEqual({
            name: 'token_v2',
            value: 'T1',
            domain: '.reddit.com',
            path: '/',
            secure: true,
            httpOnly: true,
            hostOnly: false,
            expirationDate: 87400,
        })
        expect(parseSetCookie('csrf=abc', PAGE_URL, 1000)).toEqual({
            name: 'csrf',
            value: 'abc',
            domain: 'www.reddit.com',
            path: '/user/alice/comments',
            secure: false,
            httpOnly: false,
            hostOnly: true,
        })
    })

    it('Max-Age wins over Expires, and a date in the past removes the cookie it replaces', () => {
        expect(
            parseSetCookie('a=1; Expires=Thu, 01 Jan 2099 00:00:00 GMT; Max-Age=10', PAGE_URL, 1000).expirationDate,
        ).toBe(1010)
        expect(parseSetCookie('a=1; Expires=Thu, 01 Jan 1970 00:00:10 GMT', PAGE_URL, 1000).expirationDate).toBe(10)
        const jar = withSetCookies(
            [],
            ['a=1; Domain=reddit.com; Path=/', 'b=2; Domain=reddit.com; Path=/'],
            PAGE_URL,
            1000,
        )
        expect(
            withSetCookies(jar, ['a=; Domain=reddit.com; Path=/; Max-Age=0'], PAGE_URL, 1000).map(c => c.name),
        ).toEqual(['b'])
        expect(
            withSetCookies(
                jar,
                ['b=3; Domain=reddit.com; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT'],
                PAGE_URL,
                1000,
            ).map(c => c.name),
        ).toEqual(['a'])
    })

    it('a new value replaces the one with its name, domain and path; the rest stay, and expired ones drop out', () => {
        const label = cookies => cookies.map(c => `${c.name}@${c.domain}=${c.value}`)
        const start = withSetCookies(
            [],
            ['a=1; Domain=.reddit.com; Path=/', 'a=host; Path=/', 'old=x; Domain=.reddit.com; Path=/; Max-Age=5'],
            PAGE_URL,
            1000,
        )
        expect(label(start)).toEqual(['a@.reddit.com=1', 'a@www.reddit.com=host', 'old@.reddit.com=x'])
        expect(label(withSetCookies(start, ['a=2; Domain=reddit.com; Path=/'], PAGE_URL, 2000))).toEqual([
            'a@www.reddit.com=host',
            'a@.reddit.com=2',
        ])
    })

    it('keeps none that a request to any www.reddit.com page wouldn’t carry, so none can push one out that it would', () => {
        const start = withSetCookies([], ['token_v2=T1; Domain=.reddit.com; Path=/'], PAGE_URL, 1000)
        // No Path on an item page's answer: that page's directory, not /
        const pathless = Array.from({ length: 60 }, (_, i) => `x${i}=${i}`)
        expect(
            withSetCookies(
                start,
                [...pathless, 'p=1; Path=/svc', 'q=1; Domain=.reddit.com; Path=/svc'],
                ITEM_URL,
                1000,
            ).map(c => c.name),
        ).toEqual(['token_v2'])
    })

    it('ignores what a browser ignores: no name, another site, a whole top-level domain, a sibling host', () => {
        for (const line of ['=x', 'novalue', 'a=1; Domain=evil.com', 'a=1; Domain=com', 'a=1; Domain=old.reddit.com']) {
            expect(parseSetCookie(line, PAGE_URL, 1000), line).toBeNull()
        }
    })

    it('reads Chrome’s headers, one per cookie, and Firefox’s, joined by newlines', () => {
        expect(
            setCookieLines([
                { name: 'Set-Cookie', value: 'a=1' },
                { name: 'set-cookie', value: 'b=2' },
                { name: 'Content-Type', value: 'text/html' },
            ]),
        ).toEqual(['a=1', 'b=2'])
        expect(setCookieLines([{ name: 'Set-Cookie', value: 'a=1; Path=/\nb=2' }])).toEqual(['a=1; Path=/', 'b=2'])
        expect(setCookieLines(undefined)).toEqual([])
    })
})

describe('the logged-out reads’ cookies', () => {
    let background
    const stored = () => __getLocalStorage()[PUBLIC_COOKIES_KEY]
    const log = async () => (await getDiagEntries()).map(e => e.m).join('\n')
    const kept = (name, value) => ({
        name,
        value,
        domain: '.reddit.com',
        path: '/',
        secure: true,
        httpOnly: false,
        hostOnly: false,
        expirationDate: Date.now() / 1000 + 86400,
    })
    // A jar from an earlier worker, whose identity began `age` ago
    const keepJar = (cookies, age = 0, token = TOKEN) => {
        __resetStorage({}, { [PUBLIC_COOKIES_KEY]: { token, cookies, since: Date.now() - age } })
        _resetPublicCookies(true)
    }
    const OLD_ENOUGH = START_OVER_MIN_MS + 60 * 1000

    beforeAll(async () => {
        background = await loadBackground()
        _wwwRouteTiming.switchDelayMs = 0
    })

    beforeEach(() => {
        __resetStorage()
        _resetPublicCookies(true)
        // Answers are reported here, so each fetch waits for its own
        _publicCookieTiming.settleMs = 1000
        _publicCookieTiming.saveDelayMs = 0
    })

    afterEach(() => {
        _publicCookieTiming.settleMs = 0
        _publicCookieTiming.saveDelayMs = 5000
        _publicCookieTiming.saveEveryMs = 30000
        chrome.extension.inIncognitoContext = false
    })

    // Reddit answering the background's fetches with answer(url, n) for the
    // nth request, through the Firefox header listener, as the browser would:
    // each request's Cookie header is kept. An answer's Set-Cookie headers
    // reach webRequest a little after the page, as they can in a browser,
    // where its events come by another path: each fetch must wait for them.
    const reddit = answer => {
        const sent = []
        vi.stubGlobal('fetch', async url => {
            const headers = (await background.beforeSendHeaders({ url, method: 'GET', tabId: -1, requestHeaders: [] }))
                ?.requestHeaders
            sent.push({ url, cookie: headers?.find(h => h.name.toLowerCase() === 'cookie')?.value || '' })
            const {
                status = 200,
                body = '<html><body>a page</body></html>',
                setCookies = [],
            } = answer(url, sent.length)
            setTimeout(
                () =>
                    background.headersReceived({
                        url,
                        method: 'GET',
                        responseHeaders: setCookies.map(value => ({ name: 'set-cookie', value })),
                    }),
                20,
            )
            return res(status, body, 'text/html; charset=utf-8')
        })
        return sent
    }

    it('marks every request, keeps what reddit sets and sends it back on the next one', async () => {
        const sent = reddit((url, n) => ({
            setCookies:
                n === 1
                    ? [
                          'token_v2=T1; Domain=.reddit.com; Path=/; Max-Age=86400; HttpOnly; Secure',
                          'loid=L1; Domain=.reddit.com; Path=/; Max-Age=63072000; Secure',
                      ]
                    : [`session_tracker=S${n}; Domain=.reddit.com; Path=/; Secure`],
        }))
        const { fetchHtml } = await getWwwHtmlFetcher()
        const { token } = stored()
        expect(token).toMatch(/^[0-9a-f]{32}$/)
        await fetchHtml(PAGE_URL)
        await fetchHtml(PARTIAL_URL)
        await fetchHtml(ITEM_URL)
        expect(sent.map(s => s.url)).toEqual(
            [PAGE_URL, PARTIAL_URL, ITEM_URL].map(url => `${url}${url.includes('?') ? '&' : '?'}rv_public=${token}`),
        )
        expect(sent.map(s => s.cookie)).toEqual([
            '',
            'token_v2=T1; loid=L1',
            'token_v2=T1; loid=L1; session_tracker=S2',
        ])
        // Saved for the next worker, with the newest value
        await vi.waitFor(() =>
            expect(stored().cookies.map(c => `${c.name}=${c.value}`)).toEqual([
                'token_v2=T1',
                'loid=L1',
                'session_tracker=S3',
            ]),
        )
        // The log names them, and no value goes in
        const text = await log()
        expect(text).toMatch(/send back the cookies reddit gives them \(token_v2, loid\)/)
        expect(text).not.toMatch(/T1|L1|S2|S3/)
    })

    it('a profile page refused on every route starts the jar over at the next lookup, with a new marker; an item page’s refusal doesn’t', async () => {
        keepJar([kept('token_v2', 'T1')], OLD_ENOUGH)
        const sent = reddit(() => ({ status: 403, body: 'network security' }))
        const lookup = await getWwwHtmlFetcher()
        await expect(lookup.fetchHtml(ITEM_URL)).rejects.toThrow(/403/)
        // The rest of this lookup keeps the cookies its other pages were read with
        await expect(lookup.fetchHtml(PARTIAL_URL)).rejects.toThrow(/403/)
        expect(stored()).toMatchObject({ token: TOKEN, cookies: [{ name: 'token_v2' }] })
        expect(sent.length).toBeGreaterThan(1)
        expect(sent.every(s => s.cookie === 'token_v2=T1')).toBe(true)

        await getWwwHtmlFetcher()
        const fresh = stored()
        expect(fresh.token).toMatch(/^[0-9a-f]{32}$/)
        expect(fresh.token).not.toBe(TOKEN)
        expect(fresh.cookies).toEqual([])
        expect(fresh.since).toBeGreaterThan(Date.now() - 60 * 1000)
        expect(await log()).toMatch(
            /start over with new cookies and a new marker: profile-partial pages refused \(background:reload 403/,
        )

        // A new identity isn't started over again this soon
        requestPublicCookiesStartOver('a test')
        await getWwwHtmlFetcher()
        expect(stored().token).toBe(fresh.token)
    })

    it('the captcha on every route counts too, but not an identity younger than START_OVER_MIN_MS', async () => {
        keepJar([kept('token_v2', 'T1')], START_OVER_MIN_MS - 60 * 1000)
        reddit(() => ({ body: CAPTCHA }))
        await expect((await getWwwHtmlFetcher()).fetchHtml(PAGE_URL)).rejects.toThrow(/captcha/)
        await getWwwHtmlFetcher()
        expect(stored().token).toBe(TOKEN)

        keepJar([kept('token_v2', 'T1')], OLD_ENOUGH)
        await expect((await getWwwHtmlFetcher()).fetchHtml(PAGE_URL)).rejects.toThrow(/captcha/)
        await getWwwHtmlFetcher()
        expect(stored().token).not.toBe(TOKEN)
    })

    // 2026-11-17: a jar started over after 403s landed in a Posts-tab layout
    // the parser couldn't read, picked by the cookies, and kept it for hours
    describe('a profile page that keeps coming back unreadable', () => {
        const record = () => __getLocalStorage()[UNREADABLE_KEY]
        const unreadableSince = (ago, more = {}) => {
            __getLocalStorage()[UNREADABLE_KEY] = { since: Date.now() - ago, ...more }
        }
        const HOUR = 3600 * 1000

        it('starts the jar over at once after UNREADABLE_START_OVER_AFTER_MS of it, however old the jar', async () => {
            keepJar([kept('token_v2', 'T1')], 5 * 24 * HOUR)
            // A few minutes of it, as an outage's error pages would be, leave a trusted jar alone
            await notePublicViewUnreadable()
            expect(record()).toEqual({ since: expect.any(Number) })
            unreadableSince(UNREADABLE_START_OVER_AFTER_MS - 60 * 1000)
            await notePublicViewUnreadable()
            expect(stored().token).toBe(TOKEN)

            keepJar([kept('token_v2', 'T1')])
            unreadableSince(UNREADABLE_START_OVER_AFTER_MS + 60 * 1000)
            await notePublicViewUnreadable()
            expect(stored().token).not.toBe(TOKEN)
            expect(stored().cookies).toEqual([])
            expect(record()).toMatchObject({ startOvers: 1, startedOverAt: expect.any(Number) })
            expect(await log()).toMatch(
                /start over with new cookies and a new marker: the profile's page has been unreadable since \d{4}-/,
            )
        })

        it('waits twice as long before each start-over after it, up to START_OVER_MIN_MS', async () => {
            keepJar([kept('token_v2', 'T1')])
            unreadableSince(5 * HOUR, { startOvers: 1, startedOverAt: Date.now() - 50 * 60 * 1000 })
            await notePublicViewUnreadable()
            expect(stored().token).toBe(TOKEN)
            unreadableSince(5 * HOUR, { startOvers: 1, startedOverAt: Date.now() - 70 * 60 * 1000 })
            await notePublicViewUnreadable()
            const second = stored().token
            expect(second).not.toBe(TOKEN)
            expect(record()).toMatchObject({ startOvers: 2 })

            unreadableSince(3 * 24 * HOUR, { startOvers: 9, startedOverAt: Date.now() - START_OVER_MIN_MS + 60 * 1000 })
            await notePublicViewUnreadable()
            expect(stored().token).toBe(second)
            unreadableSince(3 * 24 * HOUR, { startOvers: 9, startedOverAt: Date.now() - START_OVER_MIN_MS - 60 * 1000 })
            await notePublicViewUnreadable()
            expect(stored().token).not.toBe(second)
        })

        it('a time to come, from a clock set back, starts the count again', async () => {
            keepJar([kept('token_v2', 'T1')])
            unreadableSince(-24 * HOUR)
            await notePublicViewUnreadable()
            expect(stored().token).toBe(TOKEN)
            expect(record().since).toBeLessThanOrEqual(Date.now())
        })

        it('a lookup notes it and starts over in time, and a good lookup ends it', async () => {
            keepJar([kept('token_v2', 'T1')])
            let posts = '<html><body><shreddit-post id="t3_x1" author="someone"></shreddit-post></body></html>'
            reddit(url => ({
                body: url.includes('/submitted/') ? posts : '<html><body><div thing-id="t1_a"></div></body></html>',
            }))
            const lookup = () => lookupItemsByID_fromPublicProfile(['t1_a'], 'alice', {})
            await expect(lookup()).rejects.toThrow(/posts page unrecognized/)
            const { since } = record()
            await expect(lookup()).rejects.toThrow(/posts page unrecognized/)
            expect(record()).toEqual({ since })
            expect(stored().token).toBe(TOKEN)

            unreadableSince(UNREADABLE_START_OVER_AFTER_MS)
            await expect(lookup()).rejects.toThrow(/posts page unrecognized/)
            // In this lookup, not the next, which a worker stopped in between would lose
            expect(stored().token).not.toBe(TOKEN)

            // The new cookies get a layout that reads
            posts = '<html><body><div thing-id="t3_x1"></div></body></html>'
            await lookup()
            expect(record()).toBeUndefined()
        })
    })

    it('a network error among the refusals says nothing about the cookies, so they stay', async () => {
        _publicCookieTiming.settleMs = 0
        keepJar([kept('token_v2', 'T1')], OLD_ENOUGH)
        let n = 0
        vi.stubGlobal('fetch', async () => {
            if (++n === 1) throw new TypeError('Failed to fetch')
            return res(403, 'network security', 'text/html; charset=utf-8')
        })
        await expect((await getWwwHtmlFetcher()).fetchHtml(PARTIAL_URL)).rejects.toThrow(/403/)
        expect(n).toBeGreaterThan(1)
        await getWwwHtmlFetcher()
        expect(stored().token).toBe(TOKEN)
    })

    it('turned off by the news feed: requests go unmarked, and the kept cookies go', async () => {
        __resetStorage(
            {},
            {
                [PUBLIC_COOKIES_KEY]: { token: TOKEN, cookies: [kept('token_v2', 'T1')], since: 1 },
                [NEWS_CACHE_KEY]: { feed: { messages: [], options: { mechanisms: { publicViewCookies: 'off' } } } },
            },
        )
        _resetPublicCookies(true)
        const sent = reddit(() => ({}))
        const { fetchHtml } = await getWwwHtmlFetcher()
        await fetchHtml(PAGE_URL)
        expect(sent).toEqual([{ url: PAGE_URL, cookie: '' }])
        expect(stored()).toBeUndefined()
    })

    it('a stored jar with entries it can’t use keeps the good ones, and the lookup goes on', async () => {
        __resetStorage(
            {},
            {
                [PUBLIC_COOKIES_KEY]: {
                    token: TOKEN,
                    cookies: [null, { name: 'x' }, kept('token_v2', 'T1'), { ...kept('p', '1'), path: '/svc' }],
                    since: 'not a time',
                },
            },
        )
        _resetPublicCookies(true)
        const sent = reddit(() => ({}))
        await (await getWwwHtmlFetcher()).fetchHtml(PAGE_URL)
        expect(sent.map(s => s.cookie)).toEqual(['token_v2=T1'])
    })

    it('takes in answers only to GETs marked with the jar’s token', async () => {
        keepJar([])
        const setsLogin = [{ name: 'set-cookie', value: 'token_v2=USER; Domain=.reddit.com; Path=/' }]
        background.headersReceived({
            url: `${PAGE_URL}&rv_public=${TOKEN}`,
            method: 'POST',
            responseHeaders: setsLogin,
        })
        background.headersReceived({
            url: `${PAGE_URL}&rv_public=${OTHER_TOKEN}`,
            method: 'GET',
            responseHeaders: setsLogin,
        })
        await new Promise(r => setTimeout(r, 20))
        expect(await publicCookieHeaderFor(`${PAGE_URL}&rv_public=${TOKEN}`)).toBe('')
        background.headersReceived({ url: `${PAGE_URL}&rv_public=${TOKEN}`, method: 'GET', responseHeaders: setsLogin })
        await vi.waitFor(async () =>
            expect(await publicCookieHeaderFor(`${PAGE_URL}&rv_public=${TOKEN}`)).toBe('token_v2=USER'),
        )
    })

    it('saves once answers pause, not at every answer', async () => {
        keepJar([])
        _publicCookieTiming.saveDelayMs = 40
        const set = vi.spyOn(browserMock.storage.local, 'set')
        for (let i = 0; i < 5; i++) {
            background.headersReceived({
                url: `${PAGE_URL}&rv_public=${TOKEN}`,
                method: 'GET',
                responseHeaders: [{ name: 'set-cookie', value: `session_tracker=S${i}; Domain=.reddit.com; Path=/` }],
            })
            await new Promise(r => setTimeout(r, 10))
        }
        await vi.waitFor(() => expect(stored().cookies.map(c => c.value)).toEqual(['S4']))
        await new Promise(r => setTimeout(r, 60))
        expect(set.mock.calls.filter(([items]) => PUBLIC_COOKIES_KEY in items)).toHaveLength(1)
    })

    it('Firefox: a GET marked with the jar’s token carries its cookies or none; other requests keep theirs', async () => {
        keepJar([kept('token_v2', 'T1')])
        const sending = async (url, method = 'GET') =>
            (
                await background.beforeSendHeaders({
                    url,
                    method,
                    tabId: 5,
                    requestHeaders: [{ name: 'Cookie', value: 'reddit_session=USER' }],
                })
            )?.requestHeaders
        expect(await sending(`${PAGE_URL}&rv_public=${TOKEN}`)).toEqual([{ name: 'Cookie', value: 'token_v2=T1' }])
        // A URL with another token may be a page's own request
        for (const [url, method] of [
            [`${PAGE_URL}&rv_public=${OTHER_TOKEN}`, 'GET'],
            [`${PAGE_URL}&rv_public=${TOKEN}`, 'POST'],
        ]) {
            expect(await sending(url, method), `${method} ${url}`).toEqual([
                { name: 'Cookie', value: 'reddit_session=USER' },
            ])
        }
        keepJar([])
        expect(await sending(`${PAGE_URL}&rv_public=${TOKEN}`)).toEqual([])
    })

    it('Chrome and Edge: the rule takes cookies off marked GETs from any tab or none until there are some, then sets them', async () => {
        const updateSessionRules = vi.fn(async () => {})
        chrome.declarativeNetRequest = { updateSessionRules }
        globalThis.__BUILT_FOR__ = 'chrome'
        try {
            _resetPublicCookies(true)
            const url = (await publicViewMarking())(PAGE_URL)
            const empty = updateSessionRules.mock.calls.at(-1)[0]
            expect(empty.removeRuleIds).toEqual([PUBLIC_COOKIES_RULE_ID])
            expect(empty.addRules[0].action.requestHeaders).toEqual([{ header: 'cookie', operation: 'remove' }])

            background.headersReceived({
                url,
                method: 'GET',
                responseHeaders: [{ name: 'set-cookie', value: 'token_v2=T1; Domain=.reddit.com; Path=/' }],
            })
            await vi.waitFor(() =>
                expect(updateSessionRules.mock.calls.at(-1)[0].addRules[0].action.requestHeaders).toEqual([
                    { header: 'cookie', operation: 'set', value: 'token_v2=T1' },
                ]),
            )
            const { removeRuleIds, addRules } = updateSessionRules.mock.calls.at(-1)[0]
            expect(removeRuleIds).toEqual([PUBLIC_COOKIES_RULE_ID])
            expect(addRules[0].condition).not.toHaveProperty('tabIds')
            expect(addRules[0].condition.requestMethods).toEqual(['get'])
            const filter = new RegExp(addRules[0].condition.regexFilter)
            expect(filter.test(url)).toBe(true)
            expect(filter.test(PAGE_URL)).toBe(false)
            expect(filter.test(url.replace(/rv_public=[0-9a-f]+/, `rv_public=${OTHER_TOKEN}`))).toBe(false)

            // A rule that fails to go in doesn't stop the next one
            updateSessionRules.mockImplementationOnce(async () => {
                throw new Error('a test')
            })
            background.headersReceived({
                url,
                method: 'GET',
                responseHeaders: [{ name: 'set-cookie', value: 'token_v2=T2; Domain=.reddit.com; Path=/' }],
            })
            background.headersReceived({
                url,
                method: 'GET',
                responseHeaders: [{ name: 'set-cookie', value: 'token_v2=T3; Domain=.reddit.com; Path=/' }],
            })
            await vi.waitFor(() =>
                expect(updateSessionRules.mock.calls.at(-1)[0].addRules[0].action.requestHeaders[0].value).toBe(
                    'token_v2=T3',
                ),
            )
        } finally {
            globalThis.__BUILT_FOR__ = 'firefox'
            delete chrome.declarativeNetRequest
        }
    })

    it('in a page (the popup), marks with the background’s token, waits for nothing and changes nothing', async () => {
        keepJar([kept('token_v2', 'T1')], OLD_ENOUGH)
        _resetPublicCookies(false)
        const mark = await publicViewMarking()
        expect(mark('https://www.reddit.com/x?a=1')).toBe(`https://www.reddit.com/x?a=1&rv_public=${TOKEN}`)
        expect(mark('https://www.reddit.com/x')).toBe(`https://www.reddit.com/x?rv_public=${TOKEN}`)
        const settled = vi.fn()
        publicCookiesSettled(mark(PAGE_URL), Date.now()).then(settled)
        await vi.waitFor(() => expect(settled).toHaveBeenCalled(), { timeout: 100 })
        requestPublicCookiesStartOver('a test')
        __getLocalStorage()[UNREADABLE_KEY] = { since: Date.now() - START_OVER_MIN_MS }
        await notePublicViewUnreadable()
        await publicViewMarking()
        expect(stored()).toMatchObject({ token: TOKEN, cookies: [{ name: 'token_v2' }] })
    })

    it('the incognito copy marks nothing, and a page marks nothing before the background has made a jar', async () => {
        chrome.extension.inIncognitoContext = true
        expect((await publicViewMarking())(PAGE_URL)).toBe(PAGE_URL)
        chrome.extension.inIncognitoContext = false
        _resetPublicCookies(false)
        expect((await publicViewMarking())(PAGE_URL)).toBe(PAGE_URL)
        expect(stored()).toBeUndefined()
    })
})
