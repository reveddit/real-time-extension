// The logged-out reads' own cookies (public-cookies.ts): kept from reddit's
// answers the way a browser keeps them, sent back only on requests carrying
// the jar's marker, started over when a profile page is refused on every
// route, and dropped when the news feed turns them off.

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
    emptyPublicCookies,
    _publicCookieTiming,
    _resetPublicCookies,
    PUBLIC_COOKIES_KEY,
    PUBLIC_COOKIES_RULE_ID,
} from '../../src/src/public-cookies'
import { getWwwHtmlFetcher, _wwwRouteTiming } from '../../src/src/www-fetcher'
import { NEWS_CACHE_KEY } from '../../src/src/news'

const PAGE_URL = 'https://www.reddit.com/user/alice/comments/?sort=new'
const PARTIAL_URL =
    'https://www.reddit.com/svc/shreddit/profiles/profile_comments-more-posts/new/' +
    '?sort=new&after=dDFfYQ%3D%3D&name=alice&feedLength=8'
const ITEM_URL = 'https://www.reddit.com/r/pics/comments/abc/t/'
const TOKEN = 'ab'.repeat(16)
const OTHER_TOKEN = 'cd'.repeat(16)

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
        _publicCookieTiming.saveDelayMs = 2000
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
        const log = (await getDiagEntries()).map(e => e.m).join('\n')
        expect(log).toMatch(/send back the cookies reddit gives them \(token_v2, loid\)/)
        expect(log).not.toMatch(/T1|L1|S2|S3/)
    })

    it('a profile page refused on every route starts the jar over; an item page’s refusal leaves it', async () => {
        __resetStorage({}, { [PUBLIC_COOKIES_KEY]: { token: TOKEN, cookies: [kept('token_v2', 'T1')] } })
        _resetPublicCookies(true)
        const sent = reddit(() => ({ status: 403, body: 'network security' }))
        const fetcher = await getWwwHtmlFetcher()
        await expect(fetcher.fetchHtml(ITEM_URL)).rejects.toThrow(/403/)
        expect(stored().cookies.map(c => c.name)).toEqual(['token_v2'])
        await expect(fetcher.fetchHtml(PARTIAL_URL)).rejects.toThrow(/403/)
        expect(stored()).toEqual({ token: TOKEN, cookies: [] })
        expect(sent.length).toBeGreaterThan(1)
        expect(sent.every(s => s.cookie === 'token_v2=T1')).toBe(true)
        expect((await getDiagEntries()).map(e => e.m).join('\n')).toMatch(
            /logged-out cookies dropped, to start over: every route tried got a 403 for profile-partial pages/,
        )
    })

    it('turned off by the news feed: requests go unmarked, and the kept cookies go', async () => {
        __resetStorage(
            {},
            {
                [PUBLIC_COOKIES_KEY]: { token: TOKEN, cookies: [kept('token_v2', 'T1')] },
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

    it('Firefox: the header listener puts them only on GETs marked with the jar’s token, in place of any cookie', async () => {
        __resetStorage({}, { [PUBLIC_COOKIES_KEY]: { token: TOKEN, cookies: [kept('token_v2', 'T1')] } })
        _resetPublicCookies(true)
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
        for (const [url, method] of [
            [`${PAGE_URL}&rv_public=${OTHER_TOKEN}`, 'GET'],
            [`${PAGE_URL}&rv_public=${TOKEN}`, 'POST'],
        ]) {
            expect(await sending(url, method), `${method} ${url}`).toEqual([
                { name: 'Cookie', value: 'reddit_session=USER' },
            ])
        }
    })

    it('Chrome and Edge: the rule sets them on marked GETs from any tab or none, and is made again as they change', async () => {
        const updateSessionRules = vi.fn(async () => {})
        chrome.declarativeNetRequest = { updateSessionRules }
        globalThis.__BUILT_FOR__ = 'chrome'
        try {
            _resetPublicCookies(true)
            const url = (await publicViewMarking())(PAGE_URL)
            background.headersReceived({
                url,
                responseHeaders: [{ name: 'set-cookie', value: 'token_v2=T1; Domain=.reddit.com; Path=/' }],
            })
            await vi.waitFor(() => expect(updateSessionRules.mock.calls.at(-1)?.[0].addRules).toHaveLength(1))
            const { removeRuleIds, addRules } = updateSessionRules.mock.calls.at(-1)[0]
            expect(removeRuleIds).toEqual([PUBLIC_COOKIES_RULE_ID])
            expect(addRules[0].action.requestHeaders).toEqual([
                { header: 'cookie', operation: 'set', value: 'token_v2=T1' },
            ])
            expect(addRules[0].condition).not.toHaveProperty('tabIds')
            expect(addRules[0].condition.requestMethods).toEqual(['get'])
            const filter = new RegExp(addRules[0].condition.regexFilter)
            expect(filter.test(url)).toBe(true)
            expect(filter.test(PAGE_URL)).toBe(false)
            expect(filter.test(url.replace(/rv_public=[0-9a-f]+/, `rv_public=${OTHER_TOKEN}`))).toBe(false)
            // Emptied, the jar takes its rule with it
            await emptyPublicCookies('a test')
            expect(updateSessionRules.mock.calls.at(-1)[0]).toEqual({
                removeRuleIds: [PUBLIC_COOKIES_RULE_ID],
                addRules: [],
            })
        } finally {
            globalThis.__BUILT_FOR__ = 'firefox'
            delete chrome.declarativeNetRequest
        }
    })

    it('in a page (the popup), marks with the background’s token, waits for nothing and changes nothing', async () => {
        __resetStorage({}, { [PUBLIC_COOKIES_KEY]: { token: TOKEN, cookies: [kept('token_v2', 'T1')] } })
        _resetPublicCookies(false)
        const mark = await publicViewMarking()
        expect(mark('https://www.reddit.com/x?a=1')).toBe(`https://www.reddit.com/x?a=1&rv_public=${TOKEN}`)
        expect(mark('https://www.reddit.com/x')).toBe(`https://www.reddit.com/x?rv_public=${TOKEN}`)
        const settled = vi.fn()
        publicCookiesSettled(mark(PAGE_URL), Date.now()).then(settled)
        await vi.waitFor(() => expect(settled).toHaveBeenCalled(), { timeout: 100 })
        await emptyPublicCookies('a test')
        expect(stored().cookies).toHaveLength(1)
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
