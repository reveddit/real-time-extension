// Absent-item verification hardening (issue #14): unknown verdicts are cached
// briefly and paced instead of re-fetched every cycle, unreadable pages log a
// page fingerprint, the legacy tiebreak logs its result, a persistently dead
// channel raises the absent_verify_unavailable badge, and a tab whose content
// script is orphaned falls back to scripting.executeScript. Fetches go through
// learned routes (leg x cache mode) that survive Reddit refusing some of them.

// Install chrome global BEFORE any source import
import '../mocks/chrome-api.js'

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import browserMock, { __resetStorage, __getLocalStorage } from '../mocks/webextension-polyfill.js'

import {
    verifyFeedAbsentItems,
    getWwwHtmlFetcher,
    _fetchViaExecuteScript,
    _legacyLookups,
    ABSENT_VERIFY_UNAVAILABLE,
    PUBLIC_VIEW_FETCH_INIT,
    publicViewInit,
    WWW_ROUTE_STATE_KEY,
    WWW_ROUTE_RETRY_MS,
    _wwwRouteTiming,
    wwwPageKind,
    pageContextFetch,
} from '../../src/src/requests'

const CACHE_KEY = 'www_absent_item_verdicts'
const FAILURES_KEY = 'absent_verify_consecutive_failures'

// No scaffolding, no challenge marker: classifyCommentPage → 'unknown'.
const SHELL_HTML = '<html><head><title>Reddit</title></head><body>nothing here</body></html>'
// Scaffolding present, comment tag present with a real author → 'live'.
const livePage = id =>
    `<html><body><shreddit-comment-tree></shreddit-comment-tree>` +
    `<shreddit-comment thingId="${id}" author="alice"></shreddit-comment></body></html>`

const meta = ids => Object.fromEntries(ids.map(id => [id, { permalink: `/r/sub/comments/abc/comment/${id}/` }]))

const res = (status, body) => ({
    ok: status >= 200 && status < 300,
    status,
    text: async () => body,
})

// The news feed's route order (options.www_routes), replacing the built-in one
const routeOrder = routes => {
    __getLocalStorage().news_cache = {
        feed: { messages: [], options: { mechanisms: {}, www_routes: routes } },
        lastFetched: Date.now(),
    }
}

const savedLookups = { commentsById: _legacyLookups.commentsById, postByPath: _legacyLookups.postByPath }
const savedTabs = { query: browserMock.tabs.query, sendMessage: browserMock.tabs.sendMessage }

beforeEach(() => {
    __resetStorage()
    // no pause between routes, except where a test sets one
    _wwwRouteTiming.switchDelayMs = 0
    // The real legacy parsers run HTMLRewriter (WASM) — unavailable under
    // vitest, so every test routes through the seam.
    _legacyLookups.commentsById = vi.fn(async () => [])
    _legacyLookups.postByPath = vi.fn(async () => null)
    globalThis.fetch = vi.fn(async () => {
        throw new Error('unexpected network call')
    })
})

afterEach(() => {
    _legacyLookups.commentsById = savedLookups.commentsById
    _legacyLookups.postByPath = savedLookups.postByPath
    browserMock.tabs.query = savedTabs.query
    browserMock.tabs.sendMessage = savedTabs.sendMessage
    delete browserMock.scripting
    vi.restoreAllMocks()
})

describe('verifyFeedAbsentItems unknown caching', () => {
    it('caches an unknown verdict and paces the retry instead of re-fetching next cycle', async () => {
        const fetchHtml = vi.fn(async () => SHELL_HTML)
        const first = await verifyFeedAbsentItems(['t1_a'], meta(['t1_a']), fetchHtml)
        expect(first).toEqual({})
        // svc partial + full page, both unreadable
        expect(fetchHtml).toHaveBeenCalledTimes(2)
        expect(__getLocalStorage()[CACHE_KEY].t1_a.v).toBe('unknown')

        const fetchHtml2 = vi.fn(async () => SHELL_HTML)
        const second = await verifyFeedAbsentItems(['t1_a'], meta(['t1_a']), fetchHtml2)
        expect(second).toEqual({})
        expect(fetchHtml2).not.toHaveBeenCalled()
    })

    it('re-fetches once the unknown TTL has expired', async () => {
        __getLocalStorage()[CACHE_KEY] = { t1_a: { v: 'unknown', t: Date.now() - 31 * 60 * 1000 } }
        const fetchHtml = vi.fn(async () => SHELL_HTML)
        await verifyFeedAbsentItems(['t1_a'], meta(['t1_a']), fetchHtml)
        expect(fetchHtml).toHaveBeenCalledTimes(2)
    })

    it('still returns cached definitive verdicts without fetching', async () => {
        __getLocalStorage()[CACHE_KEY] = { t1_a: { v: 'live', t: Date.now() } }
        const fetchHtml = vi.fn(async () => SHELL_HTML)
        const verdicts = await verifyFeedAbsentItems(['t1_a'], meta(['t1_a']), fetchHtml)
        expect(verdicts).toEqual({ t1_a: 'live' })
        expect(fetchHtml).not.toHaveBeenCalled()
    })

    it('a paced unknown can still be settled by the legacy tiebreak', async () => {
        __getLocalStorage()[CACHE_KEY] = { t1_a: { v: 'unknown', t: Date.now() } }
        _legacyLookups.commentsById = vi.fn(async () => [
            { data: { name: 't1_canary', author: 'bob' } },
            { data: { name: 't1_a', author: 'alice' } },
        ])
        const fetchHtml = vi.fn(async () => SHELL_HTML)
        const verdicts = await verifyFeedAbsentItems(['t1_a'], meta(['t1_a']), fetchHtml, ['t1_canary'])
        expect(fetchHtml).not.toHaveBeenCalled()
        expect(verdicts).toEqual({ t1_a: 'live' })
        expect(__getLocalStorage()[CACHE_KEY].t1_a.v).toBe('live')
    })
})

describe('unreadable-page diagnostics', () => {
    it('logs a page fingerprint when a fetched page yields unknown', async () => {
        const spy = vi.spyOn(console, 'log')
        await verifyFeedAbsentItems(['t1_a'], meta(['t1_a']), async () => SHELL_HTML)
        const call = spy.mock.calls.find(c => String(c[0]).includes('page unreadable (no solvable challenge)'))
        expect(call).toBeTruthy()
        expect(String(call[1])).toContain(`bytes=${SHELL_HTML.length}`)
        expect(String(call[1])).toContain('challenge=0')
        expect(String(call[1])).toContain('scaffold=0')
        expect(String(call[1])).toContain('Reddit')
        // The svc partial attempt gets its own fingerprint line too
        expect(spy.mock.calls.some(c => String(c[0]).includes('svc partial unreadable'))).toBe(true)
    })

    it('logs the legacy tiebreak result including the silent-empty case', async () => {
        const spy = vi.spyOn(console, 'log')
        await verifyFeedAbsentItems(['t1_a'], meta(['t1_a']), async () => SHELL_HTML, ['t1_canary'])
        const line = spy.mock.calls.find(c => String(c[0]).includes('legacy comment tiebreak:'))
        expect(line).toBeTruthy()
        expect(String(line[0])).toContain('0/2 rendered')
        expect(String(line[0])).toContain('canaryRendered=false')
    })

    it('logs a per-cycle pacing summary', async () => {
        const spy = vi.spyOn(console, 'log')
        __getLocalStorage()[CACHE_KEY] = { t1_b: { v: 'unknown', t: Date.now() } }
        await verifyFeedAbsentItems(['t1_a', 't1_b'], meta(['t1_a', 't1_b']), async () => SHELL_HTML)
        const line = spy.mock.calls.find(c => String(c[0]).includes('absent verify:'))
        expect(line).toBeTruthy()
        expect(String(line[0])).toContain('1 fetched')
        expect(String(line[0])).toContain('1 paced')
        expect(String(line[0])).toContain('0 resolved')
    })
})

describe('svc partial-first verification', () => {
    it('resolves via the svc partial without fetching the full page', async () => {
        const fetchHtml = vi.fn(async url => {
            if (url.includes('/svc/shreddit/comments/')) return livePage('t1_a')
            throw new Error(`unexpected full-page fetch: ${url}`)
        })
        const verdicts = await verifyFeedAbsentItems(['t1_a'], meta(['t1_a']), fetchHtml)
        expect(verdicts).toEqual({ t1_a: 'live' })
        expect(fetchHtml).toHaveBeenCalledTimes(1)
        expect(fetchHtml.mock.calls[0][0]).toContain('/svc/shreddit/comments/r/sub/abc/a?render-mode=partial')
    })

    it('falls back to the full page when the partial is unreadable', async () => {
        const fetchHtml = vi.fn(async url => (url.includes('/svc/') ? SHELL_HTML : livePage('t1_a')))
        const verdicts = await verifyFeedAbsentItems(['t1_a'], meta(['t1_a']), fetchHtml)
        expect(verdicts).toEqual({ t1_a: 'live' })
        expect(fetchHtml).toHaveBeenCalledTimes(2)
        expect(fetchHtml.mock.calls[0][0]).toContain('/svc/')
        expect(fetchHtml.mock.calls[1][0]).not.toContain('/svc/')
    })

    it('a 429 on the partial flags the shared rate limit even when the page fallback succeeds', async () => {
        const fetchHtml = vi.fn(async url => {
            if (url.includes('/svc/')) throw new Error('www.reddit.com request failed: 429')
            return livePage('t1_a')
        })
        const verdicts = await verifyFeedAbsentItems(['t1_a'], meta(['t1_a']), fetchHtml)
        expect(verdicts).toEqual({ t1_a: 'live' })
        expect(__getLocalStorage().rate_limit_until).toBeGreaterThan(Date.now())
    })
})

describe('absent_verify_unavailable badge (F4)', () => {
    it('sets the badge after 5 consecutive fetching cycles that resolve nothing', async () => {
        for (let i = 1; i <= 5; i++) {
            const id = `t1_x${i}`
            await verifyFeedAbsentItems([id], meta([id]), async () => SHELL_HTML)
            expect(__getLocalStorage()[FAILURES_KEY]).toBe(i)
        }
        expect(__getLocalStorage().error_status).toBe(ABSENT_VERIFY_UNAVAILABLE)
    })

    it('any fresh definitive verdict resets the streak', async () => {
        __getLocalStorage()[FAILURES_KEY] = 4
        await verifyFeedAbsentItems(['t1_ok'], meta(['t1_ok']), async () => livePage('t1_ok'))
        expect(__getLocalStorage()[FAILURES_KEY]).toBeUndefined()
        expect(__getLocalStorage().error_status).toBeUndefined()
    })

    it('cycles that fetch nothing are neutral', async () => {
        __getLocalStorage()[FAILURES_KEY] = 4
        __getLocalStorage()[CACHE_KEY] = { t1_a: { v: 'unknown', t: Date.now() } }
        await verifyFeedAbsentItems(['t1_a'], meta(['t1_a']), async () => SHELL_HTML)
        expect(__getLocalStorage()[FAILURES_KEY]).toBe(4)
        expect(__getLocalStorage().error_status).toBeUndefined()
    })
})

describe('getWwwHtmlFetcher tab legs', () => {
    const openTab = () => {
        browserMock.tabs.query = vi.fn(async () => [{ id: 7 }])
    }
    beforeEach(() => routeOrder(['tab:no-cache', 'background:no-store']))

    it("uses the content script when it answers, with the route's cache mode", async () => {
        openTab()
        browserMock.tabs.sendMessage = vi.fn(async () => ({ success: true, html: 'CSPAGE' }))
        browserMock.scripting = { executeScript: vi.fn() }
        const { fetchHtml, viaTab } = await getWwwHtmlFetcher()
        expect(viaTab).toBe(true)
        expect(await fetchHtml('https://www.reddit.com/x')).toBe('CSPAGE')
        expect(browserMock.tabs.sendMessage).toHaveBeenCalledWith(7, {
            action: 'fetch-www-profile-public',
            url: 'https://www.reddit.com/x',
            cache: 'no-cache',
        })
        expect(browserMock.scripting.executeScript).not.toHaveBeenCalled()
    })

    it('falls back to executeScript when the content script is orphaned', async () => {
        openTab()
        browserMock.scripting = {
            executeScript: vi.fn(async () => [{ result: { ok: true, status: 200, text: 'TABPAGE' } }]),
        }
        const { fetchHtml, viaTab } = await getWwwHtmlFetcher()
        expect(viaTab).toBe(true)
        expect(await fetchHtml('https://www.reddit.com/x')).toBe('TABPAGE')
        expect(browserMock.scripting.executeScript).toHaveBeenCalledTimes(1)
        const call = browserMock.scripting.executeScript.mock.calls[0][0]
        expect(call.target).toEqual({ tabId: 7 })
        expect(call.args).toEqual(['https://www.reddit.com/x', publicViewInit('no-cache')])
    })

    it('surfaces HTTP failures from the injected fetch (rate-limit flagging depends on the message shape)', async () => {
        openTab()
        browserMock.scripting = {
            executeScript: vi.fn(async () => [{ result: { ok: false, status: 429, text: '' } }]),
        }
        const { fetchHtml } = await getWwwHtmlFetcher()
        await expect(fetchHtml('https://www.reddit.com/x')).rejects.toThrow('request failed: 429')
        expect(globalThis.fetch).not.toHaveBeenCalled()
    })

    it('moves on to the background route when injection itself is unavailable', async () => {
        openTab()
        browserMock.scripting = {
            executeScript: vi.fn(async () => {
                throw new Error('No tab with id: 7')
            }),
        }
        globalThis.fetch = vi.fn(async () => res(200, 'BGPAGE'))
        const fetcher = await getWwwHtmlFetcher()
        expect(await fetcher.fetchHtml('https://www.reddit.com/x')).toBe('BGPAGE')
        expect(globalThis.fetch).toHaveBeenCalledTimes(1)
        expect(globalThis.fetch).toHaveBeenCalledWith('https://www.reddit.com/x', publicViewInit('no-store'))
        // the tab can't fetch, so post pages go unchecked
        expect(fetcher.viaTab).toBe(false)
    })

    it('never uses a discarded tab, where both tab legs fail', async () => {
        browserMock.tabs.query = vi.fn(async () => [{ id: 3, discarded: true }])
        browserMock.tabs.sendMessage = vi.fn()
        browserMock.scripting = { executeScript: vi.fn() }
        globalThis.fetch = vi.fn(async () => res(200, 'BGPAGE'))
        const fetcher = await getWwwHtmlFetcher()
        expect(fetcher.viaTab).toBe(false)
        expect(await fetcher.fetchHtml('https://www.reddit.com/x')).toBe('BGPAGE')
        expect(browserMock.tabs.sendMessage).not.toHaveBeenCalled()
        expect(browserMock.scripting.executeScript).not.toHaveBeenCalled()
    })

    it('uses a live tab when a discarded one comes first', async () => {
        browserMock.tabs.query = vi.fn(async () => [{ id: 3, discarded: true }, { id: 9 }])
        browserMock.scripting = {
            executeScript: vi.fn(async () => [{ result: { ok: true, status: 200, text: 'TABPAGE' } }]),
        }
        const { fetchHtml } = await getWwwHtmlFetcher()
        await fetchHtml('https://www.reddit.com/x')
        expect(browserMock.scripting.executeScript.mock.calls[0][0].target).toEqual({ tabId: 9 })
    })
})

// Reddit's edge refuses some leg and cache-mode combinations and keeps changing
// which: on 2026-10-17 the background needed cache 'reload', on 2026-10-21
// 'reload' was what it refused. A refusal moves a fetch to the next route, and
// the route that served leads from then on, per kind of page.
describe('getWwwHtmlFetcher routes', () => {
    const CAPTCHA = '<html><head><title>Reddit - Prove your humanity</title></head><body></body></html>'
    const FEED = 'https://www.reddit.com/user/u/comments/?sort=new'
    const PARTIAL = 'https://www.reddit.com/svc/shreddit/comments/r/s/abc/x1?render-mode=partial'
    // Background answers by cache mode: a status, a page, or a thrown error;
    // modes not listed serve 'PAGE'
    const answersByCache = answers => {
        globalThis.fetch = vi.fn(async (_url, init) => {
            const answer = answers[init?.cache || 'default']
            if (answer instanceof Error) throw answer
            if (answer === undefined) return res(200, 'PAGE')
            return typeof answer === 'number' ? res(answer, 'BLOCK') : res(200, answer)
        })
    }
    const cachesTried = () => globalThis.fetch.mock.calls.map(c => c[1]?.cache || 'default')
    const routeState = () => __getLocalStorage()[WWW_ROUTE_STATE_KEY]

    it('leads with a background fetch that sends no cache headers', async () => {
        answersByCache({})
        const fetcher = await getWwwHtmlFetcher()
        expect(fetcher.viaTab).toBe(false)
        expect(await fetcher.fetchHtml(FEED)).toBe('PAGE')
        expect(globalThis.fetch).toHaveBeenCalledWith(FEED, publicViewInit('no-store'))
        expect(routeState().lead.feed).toBe('background:no-store')
    })

    it('a 403 sends the same URL to the next route, which then leads, also in later lookups', async () => {
        answersByCache({ 'no-store': 403 })
        const fetcher = await getWwwHtmlFetcher()
        expect(await fetcher.fetchHtml(FEED)).toBe('PAGE')
        expect(await fetcher.fetchHtml(FEED)).toBe('PAGE')
        expect(cachesTried()).toEqual(['no-store', 'no-cache', 'no-cache'])
        expect(routeState().lead.feed).toBe('background:no-cache')
        expect(fetcher.leads()).toEqual({ feed: 'background:no-cache' })

        globalThis.fetch.mockClear()
        const next = await getWwwHtmlFetcher()
        await next.fetchHtml(FEED)
        expect(cachesTried()).toEqual(['no-cache'])
    })

    it("the captcha's 200 is a refusal too", async () => {
        answersByCache({ 'no-store': CAPTCHA })
        const fetcher = await getWwwHtmlFetcher()
        expect(await fetcher.fetchHtml(FEED)).toBe('PAGE')
        expect(cachesTried()).toEqual(['no-store', 'no-cache'])
    })

    it('a network failure moves on to the next route', async () => {
        answersByCache({ 'no-store': new TypeError('Failed to fetch') })
        const fetcher = await getWwwHtmlFetcher()
        expect(await fetcher.fetchHtml(FEED)).toBe('PAGE')
        expect(cachesTried()).toEqual(['no-store', 'no-cache'])
    })

    it('each kind of page keeps its own lead', async () => {
        answersByCache({ 'no-store': 403 })
        const fetcher = await getWwwHtmlFetcher()
        await fetcher.fetchHtml(FEED)
        answersByCache({})
        await fetcher.fetchHtml(PARTIAL)
        expect(cachesTried()).toEqual(['no-store'])
        expect(routeState().lead).toEqual({ feed: 'background:no-cache', partial: 'background:no-store' })
    })

    it('a 429 or a 404 is not a refusal: no other route, nothing remembered', async () => {
        for (const status of [429, 404]) {
            __resetStorage()
            answersByCache({ 'no-store': status })
            const fetcher = await getWwwHtmlFetcher()
            await expect(fetcher.fetchHtml(FEED)).rejects.toThrow(`request failed: ${status}`)
            expect(cachesTried()).toEqual(['no-store'])
            expect(routeState()).toBeUndefined()
        }
    })

    it('when every route is refused it names them, then tries one route until the retry window passes', async () => {
        answersByCache({ 'no-store': 403, 'no-cache': CAPTCHA, reload: 403, default: 403 })
        const fetcher = await getWwwHtmlFetcher()
        await expect(fetcher.fetchHtml(FEED)).rejects.toThrow(
            'request failed: 403 (refused: background:no-store 403, background:no-cache captcha, background:reload 403)',
        )
        expect(cachesTried()).toEqual(['no-store', 'no-cache', 'reload'])
        expect(Date.now() - routeState().exhaustedAt.feed).toBeLessThan(5000)

        globalThis.fetch.mockClear()
        await expect(fetcher.fetchHtml(FEED)).rejects.toThrow('request failed: 403')
        expect(cachesTried()).toEqual(['no-store'])

        routeState().exhaustedAt.feed = Date.now() - WWW_ROUTE_RETRY_MS - 1000
        globalThis.fetch.mockClear()
        const later = await getWwwHtmlFetcher()
        await expect(later.fetchHtml(FEED)).rejects.toThrow('request failed: 403')
        expect(cachesTried()).toEqual(['no-store', 'no-cache', 'reload'])
    })

    it('a route that serves again ends the wait', async () => {
        __getLocalStorage()[WWW_ROUTE_STATE_KEY] = {
            lead: { feed: 'background:no-cache' },
            exhaustedAt: { feed: Date.now() },
        }
        answersByCache({})
        const fetcher = await getWwwHtmlFetcher()
        expect(await fetcher.fetchHtml(FEED)).toBe('PAGE')
        expect(cachesTried()).toEqual(['no-cache'])
        expect(routeState().exhaustedAt.feed).toBeUndefined()
    })

    it('the news feed can reorder the routes, and a lead it no longer lists is dropped', async () => {
        routeOrder(['background:reload', 'background:no-store'])
        __getLocalStorage()[WWW_ROUTE_STATE_KEY] = { lead: { feed: 'background:no-cache' }, exhaustedAt: {} }
        answersByCache({})
        const fetcher = await getWwwHtmlFetcher()
        await fetcher.fetchHtml(FEED)
        expect(cachesTried()).toEqual(['reload'])
        expect(routeState().lead.feed).toBe('background:reload')
    })

    it('ignores a malformed stored lead', async () => {
        __getLocalStorage()[WWW_ROUTE_STATE_KEY] = { lead: { feed: 'background:bogus' }, exhaustedAt: { feed: 'x' } }
        answersByCache({})
        const fetcher = await getWwwHtmlFetcher()
        await fetcher.fetchHtml(FEED)
        expect(cachesTried()).toEqual(['no-store'])
    })

    it('a challenge page neither picks the lead nor ends the wait: only the solved page does', async () => {
        const challenge =
            `<script>const solution = await(async e=>e+e)("ab");</script>` +
            `<form hidden method="GET"><input type="hidden" name="js_challenge" value="1"/>` +
            `<input type="hidden" name="jsc_token" value="tok1"/></form>`
        const exhaustedAt = Date.now() - 60 * 1000
        __getLocalStorage()[WWW_ROUTE_STATE_KEY] = {
            lead: { feed: 'background:reload' },
            exhaustedAt: { feed: exhaustedAt },
        }
        // everything is refused except the challenge itself
        globalThis.fetch = vi.fn(async url =>
            url.includes('js_challenge=1') ? res(403, 'BLOCK') : res(200, challenge),
        )
        const fetcher = await getWwwHtmlFetcher()
        expect(await fetcher.fetchHtml(FEED)).toBe(challenge)
        expect(routeState().exhaustedAt.feed).toBe(exhaustedAt)
        await expect(fetcher.fetchHtml(`${FEED}&solution=abab&js_challenge=1&jsc_token=tok1`)).rejects.toThrow(
            'request failed: 403 (refused: background:reload 403)',
        )
        // still waiting: one request for the challenge and one for the solve
        expect(cachesTried()).toEqual(['reload', 'reload'])
        expect(routeState().exhaustedAt.feed).toBe(exhaustedAt)
    })

    it('pauses before trying another route', async () => {
        vi.useFakeTimers()
        try {
            _wwwRouteTiming.switchDelayMs = 1000
            answersByCache({ 'no-store': 403 })
            const fetcher = await getWwwHtmlFetcher()
            const page = fetcher.fetchHtml(FEED)
            await vi.advanceTimersByTimeAsync(999)
            expect(cachesTried()).toEqual(['no-store'])
            await vi.advanceTimersByTimeAsync(1)
            expect(await page).toBe('PAGE')
            expect(cachesTried()).toEqual(['no-store', 'no-cache'])
        } finally {
            vi.useRealTimers()
        }
    })

    it('parallel fetches of one kind walk the routes once', async () => {
        answersByCache({ 'no-store': 403 })
        const fetcher = await getWwwHtmlFetcher()
        const pages = await Promise.all([
            fetcher.fetchHtml(FEED),
            fetcher.fetchHtml('https://www.reddit.com/user/u/submitted/?sort=new'),
        ])
        expect(pages).toEqual(['PAGE', 'PAGE'])
        expect(cachesTried()).toEqual(['no-store', 'no-cache', 'no-cache'])
    })

    it("a refused tab route moves on without trying the injected fetch, which would get the content script's answer", async () => {
        routeOrder(['tab:default', 'tab:no-cache', 'background:no-store'])
        browserMock.tabs.query = vi.fn(async () => [{ id: 7 }])
        browserMock.tabs.sendMessage = vi.fn(async (_id, msg) =>
            msg.cache === 'default'
                ? { success: false, error: 'www.reddit.com request failed: 403' }
                : { success: true, html: 'CSPAGE' },
        )
        browserMock.scripting = { executeScript: vi.fn() }
        const fetcher = await getWwwHtmlFetcher()
        expect(await fetcher.fetchHtml(FEED)).toBe('CSPAGE')
        expect(browserMock.tabs.sendMessage.mock.calls.map(c => c[1].cache)).toEqual(['default', 'no-cache'])
        expect(browserMock.scripting.executeScript).not.toHaveBeenCalled()
        expect(routeState().lead.feed).toBe('tab:no-cache')
        expect(fetcher.viaTab).toBe(true)
    })
})

describe('wwwPageKind', () => {
    it('tells profile feeds, /svc partials and thread pages apart', () => {
        expect(wwwPageKind('https://www.reddit.com/user/u/comments/?sort=new')).toBe('feed')
        expect(wwwPageKind('https://www.reddit.com/user/u/submitted/?sort=new&solution=x')).toBe('feed')
        expect(
            wwwPageKind('https://www.reddit.com/svc/shreddit/profiles/profile_comments-more-posts/new/?after=x'),
        ).toBe('feed')
        expect(wwwPageKind('https://www.reddit.com/svc/shreddit/comments/r/s/abc/x1?render-mode=partial')).toBe(
            'partial',
        )
        expect(wwwPageKind('https://www.reddit.com/r/s/comments/abc/comment/x1/')).toBe('page')
        expect(wwwPageKind('https://www.reddit.com/comments/abc/')).toBe('page')
    })
})

describe('_fetchViaExecuteScript contract', () => {
    it('throws when no scripting API exists', async () => {
        await expect(_fetchViaExecuteScript(1, 'u')).rejects.toThrow('scripting API unavailable')
    })

    it('the injected function returns a tagged object and never rejects', async () => {
        browserMock.scripting = { executeScript: vi.fn(async () => [{ result: { ok: true, status: 200, text: '' } }]) }
        await _fetchViaExecuteScript(1, 'u')
        const func = browserMock.scripting.executeScript.mock.calls[0][0].func

        globalThis.fetch = vi.fn(async () => res(200, 'X'))
        expect(await func('u')).toEqual({ ok: true, status: 200, text: 'X' })

        globalThis.fetch = vi.fn(async () => res(500, 'boom'))
        expect(await func('u')).toEqual({ ok: false, status: 500, text: '' })

        globalThis.fetch = vi.fn(async () => {
            throw new Error('net down')
        })
        const failed = await func('u')
        expect(failed.ok).toBe(false)
        expect(failed.status).toBe(0)
        expect(failed.err).toContain('net down')
    })

    it('hands the injected function the public-view options', async () => {
        browserMock.scripting = { executeScript: vi.fn(async () => [{ result: { ok: true, status: 200, text: '' } }]) }
        await _fetchViaExecuteScript(1, 'https://www.reddit.com/x')
        expect(browserMock.scripting.executeScript.mock.calls[0][0].args).toEqual([
            'https://www.reddit.com/x',
            PUBLIC_VIEW_FETCH_INIT,
        ])
    })

    it("the injected function uses the page's own fetch when Firefox exposes content.fetch", async () => {
        browserMock.scripting = { executeScript: vi.fn(async () => [{ result: { ok: true, status: 200, text: '' } }]) }
        await _fetchViaExecuteScript(1, 'u')
        const func = browserMock.scripting.executeScript.mock.calls[0][0].func
        globalThis.fetch = vi.fn(async () => res(200, 'SANDBOX'))
        globalThis.content = { fetch: vi.fn(async () => res(200, 'PAGE')) }
        try {
            expect(await func('u', PUBLIC_VIEW_FETCH_INIT)).toEqual({ ok: true, status: 200, text: 'PAGE' })
            expect(globalThis.content.fetch).toHaveBeenCalledWith('u', PUBLIC_VIEW_FETCH_INIT)
            expect(globalThis.fetch).not.toHaveBeenCalled()
        } finally {
            delete globalThis.content
        }
    })
})

// Firefox (MV2) content-script fetch() is the extension's privileged fetch, which
// reddit treats like a background request (JS challenge, then a 403 on the
// solved request). The page's own fetch (content.fetch) is what Chrome content
// scripts get natively.
describe('public-view fetch options and page-context fetch', () => {
    it('every route omits credentials and adds only its cache mode', () => {
        expect(PUBLIC_VIEW_FETCH_INIT.credentials).toBe('omit')
        expect(PUBLIC_VIEW_FETCH_INIT.cache).toBeUndefined()
        expect(publicViewInit('default')).toBe(PUBLIC_VIEW_FETCH_INIT)
        for (const cache of ['no-store', 'no-cache', 'reload']) {
            expect(publicViewInit(cache)).toEqual({ ...PUBLIC_VIEW_FETCH_INIT, cache })
        }
    })

    it('pageContextFetch prefers content.fetch (Firefox) and keeps fetch elsewhere (Chrome)', async () => {
        globalThis.fetch = vi.fn(async () => res(200, 'SANDBOX'))
        const viaFetch = await pageContextFetch('u', PUBLIC_VIEW_FETCH_INIT)
        expect(await viaFetch.text()).toBe('SANDBOX')
        expect(globalThis.fetch).toHaveBeenCalledWith('u', PUBLIC_VIEW_FETCH_INIT)

        globalThis.content = { fetch: vi.fn(async () => res(200, 'PAGE')) }
        try {
            const viaPage = await pageContextFetch('u', PUBLIC_VIEW_FETCH_INIT)
            expect(await viaPage.text()).toBe('PAGE')
            expect(globalThis.content.fetch).toHaveBeenCalledWith('u', PUBLIC_VIEW_FETCH_INIT)
            expect(globalThis.fetch).toHaveBeenCalledTimes(1)
        } finally {
            delete globalThis.content
        }
    })

    it('pageContextFetch ignores a content global without fetch', async () => {
        globalThis.fetch = vi.fn(async () => res(200, 'SANDBOX'))
        globalThis.content = {}
        try {
            expect(await (await pageContextFetch('u', PUBLIC_VIEW_FETCH_INIT)).text()).toBe('SANDBOX')
        } finally {
            delete globalThis.content
        }
    })
})
