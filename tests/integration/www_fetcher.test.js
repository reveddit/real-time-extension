// The www page fetcher (www-fetcher.ts): fetches go through routes (leg x cache
// mode), resting the ones Reddit refuses, and a tab whose content script is
// orphaned falls back to scripting.executeScript.

// Install chrome global BEFORE any source import
import '../mocks/chrome-api.js'

import { describe, it, expect, beforeEach, vi } from 'vitest'
import browserMock, { __resetStorage, __getLocalStorage } from '../mocks/webextension-polyfill.js'
import { res, untilAborted } from '../mocks/responses.js'
import {
    getWwwHtmlFetcher,
    _fetchViaExecuteScript,
    WWW_ROUTE_STATE_KEY,
    WWW_HARD_REFUSAL_MS,
    WWW_SOFT_REFUSAL_MS,
    WWW_BLOCKED_RETRY_MS,
    _wwwRouteTiming,
    wwwPageKind,
    isSupportedRedditTab,
} from '../../src/src/www-fetcher'
import { PUBLIC_VIEW_FETCH_INIT, publicViewInit, pageContextFetch } from '../../src/src/www-routes'
import { WWW_FETCH_TIMEOUT_MS } from '../../src/src/logged-in-fetch'
import { routeOrder, useFetcherHooks } from '../mocks/www-fetch-hooks.js'

useFetcherHooks()

describe('getWwwHtmlFetcher tab legs', () => {
    const openTab = () => {
        browserMock.tabs.query = vi.fn(async () => [{ id: 7 }])
    }
    beforeEach(() => routeOrder(['tab:no-cache', 'background:no-store']))

    it("uses the content script when it answers, with the route's cache mode", async () => {
        openTab()
        browserMock.tabs.sendMessage = vi.fn(async () => ({ success: true, html: 'CSPAGE' }))
        browserMock.scripting = { executeScript: vi.fn() }
        const { fetchHtml } = await getWwwHtmlFetcher()
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
        const { fetchHtml } = await getWwwHtmlFetcher()
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

    it('moves on to the background route when injection itself is unavailable, without counting the tab as refused', async () => {
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
        expect(globalThis.fetch).toHaveBeenCalledWith(
            'https://www.reddit.com/x',
            expect.objectContaining(publicViewInit('no-store')),
        )
        expect(__getLocalStorage()[WWW_ROUTE_STATE_KEY].page.routes['tab:no-cache']).toBeUndefined()
    })

    it('a network error in the tab moves on to the next route instead of ending the fetch', async () => {
        openTab()
        browserMock.tabs.sendMessage = vi.fn(async () => ({ success: false, error: 'Failed to fetch', status: 0 }))
        browserMock.scripting = { executeScript: vi.fn() }
        globalThis.fetch = vi.fn(async () => res(200, 'BGPAGE'))
        const fetcher = await getWwwHtmlFetcher()
        expect(await fetcher.fetchHtml('https://www.reddit.com/x')).toBe('BGPAGE')
        // the content script answered, so it isn't treated as dead
        expect(browserMock.scripting.executeScript).not.toHaveBeenCalled()
        const record = __getLocalStorage()[WWW_ROUTE_STATE_KEY].page.routes['tab:no-cache']
        expect(record.until - Date.now()).toBeGreaterThan(WWW_SOFT_REFUSAL_MS - 5000)
        expect(record.until - Date.now()).toBeLessThanOrEqual(WWW_SOFT_REFUSAL_MS)
    })

    it('an injected fetch that gets no answer (status 0) moves on too', async () => {
        openTab()
        browserMock.scripting = {
            executeScript: vi.fn(async () => [{ result: { ok: false, status: 0, text: '', err: 'TypeError' } }]),
        }
        globalThis.fetch = vi.fn(async () => res(200, 'BGPAGE'))
        const fetcher = await getWwwHtmlFetcher()
        expect(await fetcher.fetchHtml('https://www.reddit.com/x')).toBe('BGPAGE')
    })

    it('gives up on a content script that never answers', async () => {
        vi.useFakeTimers()
        try {
            openTab()
            browserMock.tabs.sendMessage = vi.fn(() => new Promise(() => {}))
            browserMock.scripting = {
                executeScript: vi.fn(async () => [{ result: { ok: true, status: 200, text: 'TABPAGE' } }]),
            }
            const fetcher = await getWwwHtmlFetcher()
            const page = fetcher.fetchHtml('https://www.reddit.com/x')
            await vi.advanceTimersByTimeAsync(WWW_FETCH_TIMEOUT_MS)
            expect(await page).toBe('TABPAGE')
        } finally {
            vi.useRealTimers()
        }
    })

    it('never uses a discarded or frozen tab, where both tab legs fail', async () => {
        for (const tab of [
            { id: 3, discarded: true },
            { id: 4, frozen: true },
        ]) {
            browserMock.tabs.query = vi.fn(async () => [tab])
            browserMock.tabs.sendMessage = vi.fn()
            browserMock.scripting = { executeScript: vi.fn() }
            globalThis.fetch = vi.fn(async () => res(200, 'BGPAGE'))
            const fetcher = await getWwwHtmlFetcher()
            expect(await fetcher.fetchHtml('https://www.reddit.com/x')).toBe('BGPAGE')
            expect(browserMock.tabs.sendMessage).not.toHaveBeenCalled()
            expect(browserMock.scripting.executeScript).not.toHaveBeenCalled()
        }
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
// 'reload' was what it refused. A refusal moves a fetch to the next route and
// rests the refused route, per kind of page.
describe('getWwwHtmlFetcher routes', () => {
    const CAPTCHA = '<html><head><title>Reddit - Prove your humanity</title></head><body></body></html>'
    const FEED = 'https://www.reddit.com/user/u/comments/?sort=new'
    const PROFILE_PARTIAL = 'https://www.reddit.com/svc/shreddit/profiles/profile_comments-more-posts/new/?after=x'
    const PARTIAL = 'https://www.reddit.com/svc/shreddit/comments/r/s/abc/x1?render-mode=partial'
    const challenge =
        `<script>const solution = await(async e=>e+e)("ab");</script>` +
        `<form hidden method="GET"><input type="hidden" name="js_challenge" value="1"/>` +
        `<input type="hidden" name="jsc_token" value="tok1"/></form>`
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
    const restsFor = (kind, route) => routeState()[kind].routes[route].until - Date.now()

    it('starts with a background fetch that sends no cache headers', async () => {
        answersByCache({})
        const fetcher = await getWwwHtmlFetcher()
        expect(await fetcher.fetchHtml(FEED)).toBe('PAGE')
        expect(globalThis.fetch).toHaveBeenCalledWith(FEED, expect.objectContaining(publicViewInit('no-store')))
        expect(routeState().profile.served.route).toBe('background:no-store')
        expect(fetcher.servedRoutes()).toEqual({ profile: 'background:no-store' })
    })

    it('a 403 sends the same URL to the next route and rests the refused one for hours, also in later lookups', async () => {
        answersByCache({ 'no-store': 403 })
        const fetcher = await getWwwHtmlFetcher()
        expect(await fetcher.fetchHtml(FEED)).toBe('PAGE')
        expect(await fetcher.fetchHtml(FEED)).toBe('PAGE')
        expect(cachesTried()).toEqual(['no-store', 'no-cache', 'no-cache'])
        expect(restsFor('profile', 'background:no-store')).toBeGreaterThan(WWW_HARD_REFUSAL_MS - 5000)
        expect(fetcher.servedRoutes()).toEqual({ profile: 'background:no-cache' })

        globalThis.fetch.mockClear()
        const next = await getWwwHtmlFetcher()
        await next.fetchHtml(FEED)
        expect(cachesTried()).toEqual(['no-cache'])
    })

    it("the captcha's 200 is a refusal too, resting the route for half an hour", async () => {
        answersByCache({ 'no-store': CAPTCHA })
        const fetcher = await getWwwHtmlFetcher()
        expect(await fetcher.fetchHtml(FEED)).toBe('PAGE')
        expect(cachesTried()).toEqual(['no-store', 'no-cache'])
        expect(restsFor('profile', 'background:no-store')).toBeGreaterThan(WWW_SOFT_REFUSAL_MS - 5000)
        expect(restsFor('profile', 'background:no-store')).toBeLessThanOrEqual(WWW_SOFT_REFUSAL_MS)
    })

    it('a network failure moves on to the next route', async () => {
        answersByCache({ 'no-store': new TypeError('Failed to fetch') })
        const fetcher = await getWwwHtmlFetcher()
        expect(await fetcher.fetchHtml(FEED)).toBe('PAGE')
        expect(cachesTried()).toEqual(['no-store', 'no-cache'])
    })

    it('a background fetch that never answers is given up on and the next route tried', async () => {
        vi.useFakeTimers()
        try {
            globalThis.fetch = vi.fn((_url, init) =>
                init.cache === 'no-store' ? untilAborted(init.signal) : Promise.resolve(res(200, 'PAGE')),
            )
            const fetcher = await getWwwHtmlFetcher()
            const page = fetcher.fetchHtml(FEED)
            await vi.advanceTimersByTimeAsync(WWW_FETCH_TIMEOUT_MS)
            expect(await page).toBe('PAGE')
            expect(cachesTried()).toEqual(['no-store', 'no-cache'])
        } finally {
            vi.useRealTimers()
        }
    })

    it('each kind of page keeps its own memory, profile partials apart from profile pages', async () => {
        answersByCache({ 'no-store': 403 })
        const fetcher = await getWwwHtmlFetcher()
        await fetcher.fetchHtml(FEED)
        answersByCache({})
        await fetcher.fetchHtml(PARTIAL)
        await fetcher.fetchHtml(PROFILE_PARTIAL)
        expect(cachesTried()).toEqual(['no-store', 'no-store'])
        expect(fetcher.servedRoutes()).toEqual({
            profile: 'background:no-cache',
            'profile-partial': 'background:no-store',
            partial: 'background:no-store',
        })
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

    it('when every route is refused it names them, then tries only the route that comes back soonest', async () => {
        answersByCache({ 'no-store': 403, 'no-cache': CAPTCHA, reload: 403 })
        const fetcher = await getWwwHtmlFetcher()
        await expect(fetcher.fetchHtml(FEED)).rejects.toThrow(
            'request failed: 403 (refused: background:no-store 403, background:no-cache captcha, background:reload 403)',
        )
        expect(cachesTried()).toEqual(['no-store', 'no-cache', 'reload'])

        globalThis.fetch.mockClear()
        await expect(fetcher.fetchHtml(FEED)).rejects.toThrow('refused: background:no-cache captcha)')
        expect(cachesTried()).toEqual(['no-cache'])

        // the captcha's rest ends first: that route, then the next to come back
        routeState().profile.routes['background:no-cache'].until = Date.now() - 1000
        globalThis.fetch.mockClear()
        const later = await getWwwHtmlFetcher()
        await expect(later.fetchHtml(FEED)).rejects.toThrow()
        expect(cachesTried()).toEqual(['no-cache', 'no-store'])
    })

    // Seen 2026-11-11: reddit refused profiles' older pages on every route, and
    // each check still sent a refused request for comments and one for posts
    it('when every route got a 403, that kind of page goes unasked for half an hour, then one route is asked', async () => {
        const ALL_403 = 'refused: background:no-store 403, background:no-cache 403, background:reload 403'
        answersByCache({ 'no-store': 403, 'no-cache': 403, reload: 403 })
        const fetcher = await getWwwHtmlFetcher()
        await expect(fetcher.fetchHtml(PROFILE_PARTIAL)).rejects.toThrow(`request failed: 403 (${ALL_403})`)
        expect(cachesTried()).toEqual(['no-store', 'no-cache', 'reload'])

        // The rest of this lookup and the next ones ask nothing, and say when they will
        globalThis.fetch.mockClear()
        const blocked = 'request failed: 403 (every route got a 403 for profile-partial pages; next try after '
        await expect(fetcher.fetchHtml(PROFILE_PARTIAL)).rejects.toThrow(blocked)
        await expect((await getWwwHtmlFetcher()).fetchHtml(PROFILE_PARTIAL)).rejects.toThrow(blocked)
        expect(globalThis.fetch).not.toHaveBeenCalled()
        // Another kind of page keeps its own routes
        await expect(fetcher.fetchHtml(PARTIAL)).rejects.toThrow(ALL_403)
        expect(cachesTried()).toEqual(['no-store', 'no-cache', 'reload'])

        // Half an hour after the last 403, the route that comes back soonest is asked
        const routes = routeState()['profile-partial'].routes
        for (const record of Object.values(routes)) {
            record.t -= WWW_BLOCKED_RETRY_MS
            record.until -= WWW_BLOCKED_RETRY_MS
        }
        routes['background:reload'].until -= 1000
        globalThis.fetch.mockClear()
        const later = await getWwwHtmlFetcher()
        await expect(later.fetchHtml(PROFILE_PARTIAL)).rejects.toThrow('(refused: background:reload 403)')
        expect(cachesTried()).toEqual(['reload'])
        globalThis.fetch.mockClear()
        await expect(later.fetchHtml(PROFILE_PARTIAL)).rejects.toThrow(blocked)
        expect(globalThis.fetch).not.toHaveBeenCalled()
    })

    it('every background route blocked: a tab route without a 403 of its own is tried at once', async () => {
        const now = Date.now()
        const blocked = { t: now, until: now + WWW_HARD_REFUSAL_MS }
        __getLocalStorage()[WWW_ROUTE_STATE_KEY] = {
            profile: {
                routes: {
                    'background:no-store': blocked,
                    'background:no-cache': blocked,
                    'background:reload': blocked,
                },
            },
        }
        // No tab open: nothing is asked
        const closed = await getWwwHtmlFetcher()
        await expect(closed.fetchHtml(FEED)).rejects.toThrow('every route got a 403 for profile pages')
        // A tab opened since gets its try
        browserMock.tabs.query = vi.fn(async () => [{ id: 7 }])
        browserMock.tabs.sendMessage = vi.fn(async () => ({ success: true, html: 'TABPAGE' }))
        const open = await getWwwHtmlFetcher()
        expect(await open.fetchHtml(FEED)).toBe('TABPAGE')
        expect(globalThis.fetch).not.toHaveBeenCalled()
    })

    it('a resting route that serves again stops resting', async () => {
        const now = Date.now()
        __getLocalStorage()[WWW_ROUTE_STATE_KEY] = {
            profile: {
                routes: {
                    'background:no-store': { t: now, until: now + WWW_HARD_REFUSAL_MS },
                    'background:no-cache': { t: now, until: now + 60 * 1000 },
                    'background:reload': { t: now, until: now + WWW_HARD_REFUSAL_MS },
                },
            },
        }
        answersByCache({})
        const fetcher = await getWwwHtmlFetcher()
        expect(await fetcher.fetchHtml(FEED)).toBe('PAGE')
        expect(cachesTried()).toEqual(['no-cache'])
        expect(routeState().profile.routes['background:no-cache'].until).toBeUndefined()
        expect(routeState().profile.served.route).toBe('background:no-cache')
    })

    it("the news feed can reorder this browser's routes; the routes it leaves out still follow", async () => {
        routeOrder({ chrome: ['background:reload'] })
        answersByCache({ reload: 403 })
        const fetcher = await getWwwHtmlFetcher()
        expect(await fetcher.fetchHtml(FEED)).toBe('PAGE')
        expect(cachesTried()).toEqual(['reload', 'no-store'])

        // another browser's list leaves this one's order alone
        __resetStorage()
        routeOrder({ firefox: ['background:reload'] })
        answersByCache({})
        const other = await getWwwHtmlFetcher()
        await other.fetchHtml(FEED)
        expect(cachesTried()).toEqual(['no-store'])
    })

    it('ignores malformed stored state', async () => {
        __getLocalStorage()[WWW_ROUTE_STATE_KEY] = {
            profile: {
                routes: {
                    'background:bogus': { t: 1, until: Date.now() + 1e9 },
                    'background:no-store': { t: 'x', until: 'y' },
                },
                served: { route: 'nope', t: 5 },
            },
            feed: 'old shape',
        }
        answersByCache({})
        const fetcher = await getWwwHtmlFetcher()
        await fetcher.fetchHtml(FEED)
        expect(cachesTried()).toEqual(['no-store'])
    })

    it('a rest a fast clock left in the future is held to the longest rest', async () => {
        const farAhead = Date.now() + 100 * 3600 * 1000
        __getLocalStorage()[WWW_ROUTE_STATE_KEY] = {
            profile: { routes: { 'background:no-store': { t: farAhead, until: farAhead } } },
        }
        answersByCache({})
        const fetcher = await getWwwHtmlFetcher()
        await fetcher.fetchHtml(FEED)
        expect(restsFor('profile', 'background:no-store')).toBeLessThanOrEqual(WWW_HARD_REFUSAL_MS)
        expect(routeState().profile.routes['background:no-store'].t).toBeLessThanOrEqual(Date.now())
    })

    it("removes the earlier versions' route memory", async () => {
        __getLocalStorage().www_route_state = { lead: { feed: 'background:reload' }, exhaustedAt: {} }
        __getLocalStorage().www_tab_refused_at = Date.now()
        answersByCache({})
        const fetcher = await getWwwHtmlFetcher()
        await fetcher.fetchHtml(FEED)
        expect(__getLocalStorage().www_route_state).toBeUndefined()
        expect(__getLocalStorage().www_tab_refused_at).toBeUndefined()
    })

    it('a challenge changes nothing; a challenge in answer to its solution is a refusal, and the solution goes to the next route', async () => {
        const solved = `${FEED}&solution=abab&js_challenge=1&jsc_token=tok1`
        globalThis.fetch = vi.fn(async (url, init) =>
            init.cache === 'no-store' ? res(200, challenge) : res(200, url === solved ? 'PAGE' : challenge),
        )
        const fetcher = await getWwwHtmlFetcher()
        expect(await fetcher.fetchHtml(FEED)).toBe(challenge)
        expect(routeState()).toBeUndefined()
        expect(await fetcher.fetchHtml(solved)).toBe('PAGE')
        expect(cachesTried()).toEqual(['no-store', 'no-store', 'no-cache'])
        expect(globalThis.fetch.mock.calls.slice(1).map(c => c[0])).toEqual([solved, solved])
        expect(restsFor('profile', 'background:no-store')).toBeLessThanOrEqual(WWW_SOFT_REFUSAL_MS)
        expect(routeState().profile.served.route).toBe('background:no-cache')
    })

    it('a page the caller cannot read is a refusal; when no route reads it, the page goes back to the caller', async () => {
        answersByCache({ 'no-cache': 'GOOD' })
        const readable = html => html === 'GOOD'
        const fetcher = await getWwwHtmlFetcher()
        expect(await fetcher.fetchHtml(FEED, readable)).toBe('GOOD')
        expect(cachesTried()).toEqual(['no-store', 'no-cache'])
        expect(routeState().profile.served.route).toBe('background:no-cache')

        __resetStorage()
        answersByCache({})
        const unreadable = await getWwwHtmlFetcher()
        expect(await unreadable.fetchHtml(FEED, readable)).toBe('PAGE')
        expect(cachesTried()).toEqual(['no-store', 'no-cache', 'reload'])
        expect(routeState().profile.served).toBeUndefined()
    })

    it('tab routes skipped for want of a tab are not refusals, and get their turn once a tab is open', async () => {
        routeOrder(['tab:default', 'background:no-store'])
        answersByCache({})
        const noTab = await getWwwHtmlFetcher()
        expect(await noTab.fetchHtml(FEED)).toBe('PAGE')
        expect(routeState().profile.routes['tab:default']).toBeUndefined()

        browserMock.tabs.query = vi.fn(async () => [{ id: 7 }])
        browserMock.tabs.sendMessage = vi.fn(async () => ({ success: true, html: 'CSPAGE' }))
        const withTab = await getWwwHtmlFetcher()
        expect(await withTab.fetchHtml(FEED)).toBe('CSPAGE')
        expect(routeState().profile.served.route).toBe('tab:default')
    })

    it("overlapping lookups keep each other's refusals: the newest record per route wins", async () => {
        const first = await getWwwHtmlFetcher()
        const second = await getWwwHtmlFetcher()
        answersByCache({ 'no-store': 403 })
        await first.fetchHtml(FEED)
        // the second lookup read the memory before the first one's refusal
        answersByCache({})
        await second.fetchHtml(PARTIAL)
        expect(restsFor('profile', 'background:no-store')).toBeGreaterThan(WWW_HARD_REFUSAL_MS - 5000)
        expect(routeState().partial.served.route).toBe('background:no-store')
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
                ? { success: false, error: 'www.reddit.com request failed: 403', status: 403 }
                : { success: true, html: 'CSPAGE' },
        )
        browserMock.scripting = { executeScript: vi.fn() }
        const fetcher = await getWwwHtmlFetcher()
        expect(await fetcher.fetchHtml(FEED)).toBe('CSPAGE')
        expect(browserMock.tabs.sendMessage.mock.calls.map(c => c[1].cache)).toEqual(['default', 'no-cache'])
        expect(browserMock.scripting.executeScript).not.toHaveBeenCalled()
        expect(routeState().profile.served.route).toBe('tab:no-cache')
    })

    it('a resting route that cannot run does not block the resting routes behind it', async () => {
        routeOrder(['tab:no-cache', 'background:no-store'])
        // a tab is open, but its content script is orphaned and injection is unavailable
        browserMock.tabs.query = vi.fn(async () => [{ id: 7 }])
        browserMock.tabs.sendMessage = vi.fn(async () => {
            throw new Error('Receiving end does not exist')
        })
        const now = Date.now()
        __getLocalStorage()[WWW_ROUTE_STATE_KEY] = {
            profile: {
                routes: {
                    'tab:no-cache': { t: now, until: now + 60 * 1000 },
                    'background:no-store': { t: now, until: now + WWW_HARD_REFUSAL_MS },
                },
            },
        }
        globalThis.fetch = vi.fn(async () => res(200, 'PAGE'))
        const { fetchHtml } = await getWwwHtmlFetcher()
        expect(await fetchHtml(FEED)).toBe('PAGE')
        expect(globalThis.fetch).toHaveBeenCalledTimes(1)
    })
})

describe('wwwPageKind', () => {
    it('tells profile pages, their partials, other /svc partials and thread pages apart', () => {
        expect(wwwPageKind('https://www.reddit.com/user/u/comments/?sort=new')).toBe('profile')
        expect(wwwPageKind('https://www.reddit.com/user/u/submitted/?sort=new&solution=x')).toBe('profile')
        expect(
            wwwPageKind('https://www.reddit.com/svc/shreddit/profiles/profile_comments-more-posts/new/?after=x'),
        ).toBe('profile-partial')
        expect(wwwPageKind('https://www.reddit.com/svc/shreddit/comments/r/s/abc/x1?render-mode=partial')).toBe(
            'partial',
        )
        expect(wwwPageKind('https://www.reddit.com/r/s/comments/abc/comment/x1/')).toBe('page')
        expect(wwwPageKind('https://www.reddit.com/comments/abc/')).toBe('page')
        // a post in a profile, and a comment on one, are pages, not the profile
        expect(wwwPageKind('https://www.reddit.com/user/u/comments/abc/a_title/')).toBe('page')
        expect(wwwPageKind('https://www.reddit.com/user/u/comments/abc/comment/x1/?solution=x')).toBe('page')
    })
})

describe('isSupportedRedditTab', () => {
    it("takes www.reddit.com and old.reddit.com, and no tab whose address is missing or won't parse", () => {
        expect(isSupportedRedditTab({ url: 'https://www.reddit.com/r/pics/' })).toBe(true)
        expect(isSupportedRedditTab({ url: 'https://old.reddit.com/' })).toBe(true)
        for (const url of ['https://new.reddit.com/', 'https://reddit.com/', 'not a url', undefined]) {
            expect(isSupportedRedditTab({ url })).toBe(false)
        }
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
        expect(await func('u')).toEqual({ ok: true, status: 200, text: 'X', redirectedTo: '' })

        globalThis.fetch = vi.fn(async () => res(500, 'boom'))
        expect(await func('u')).toEqual({ ok: false, status: 500, text: '', redirectedTo: '' })

        // Where a redirect landed, so the background can tell reddit's login page
        globalThis.fetch = vi.fn(async () => ({
            ...res(200, 'L'),
            redirected: true,
            url: 'https://www.reddit.com/login/',
        }))
        expect(await func('u')).toEqual({
            ok: true,
            status: 200,
            text: 'L',
            redirectedTo: 'https://www.reddit.com/login/',
        })

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
            expect(await func('u', PUBLIC_VIEW_FETCH_INIT)).toEqual({
                ok: true,
                status: 200,
                text: 'PAGE',
                redirectedTo: '',
            })
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
