// Public-view fetch routes (www-routes.ts): their names, the built-in order,
// and the news feed's options.www_route_order, which can reorder and skip
// them without a store release (0.0.5.26's options.www_routes is ignored).

// Install chrome global BEFORE any source import
import '../mocks/chrome-api.js'

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { __resetStorage, __getLocalStorage } from '../mocks/webextension-polyfill.js'

import {
    isWwwRoute,
    parseWwwRoute,
    sanitizeWwwRouteOrder,
    defaultWwwRoutes,
    wwwRouteOrder,
} from '../../src/src/www-routes'
import {
    fetchNews,
    getRemoteWwwRouteOrder,
    getRemoteLoginCookies,
    NEWS_CACHE_KEY,
    LEGACY_REFUSED_UNTIL_KEY,
    applyRemoteConfig,
} from '../../src/src/news'
import { getPublicModlogsFeed, setPublicModlogsFeed, DEFAULT_PUBLICMODLOGS_FEED } from '../../src/src/bridge-config'
import { getMarkupConfig, setMarkupConfig } from '../../src/src/markup-config'

describe('www route names', () => {
    it('are leg:cache, with known legs and cache modes only', () => {
        expect(isWwwRoute('background:no-store')).toBe(true)
        expect(isWwwRoute('tab:default')).toBe(true)
        for (const bad of ['background', 'background:force-cache', 'window:reload', 'tab:reload:x', '', 3, null]) {
            expect(isWwwRoute(bad)).toBe(false)
        }
        expect(parseWwwRoute('tab:no-cache')).toEqual({ leg: 'tab', cache: 'no-cache' })
    })

    it("the built-in order (Chrome's, also outside a build) leads with a background fetch without cache headers", () => {
        const routes = defaultWwwRoutes()
        expect(routes[0]).toBe('background:no-store')
        expect(routes.every(isWwwRoute)).toBe(true)
        expect(new Set(routes).size).toBe(routes.length)
        // a fresh copy each time
        routes.reverse()
        expect(defaultWwwRoutes()[0]).toBe('background:no-store')
    })

    it("Firefox's built-in order starts with its tab's own fetch and has no 'no-store', which sends reload's headers there", () => {
        globalThis.__BUILT_FOR__ = 'firefox'
        try {
            const routes = defaultWwwRoutes()
            expect(routes[0]).toBe('tab:default')
            expect(routes.some(route => route.endsWith(':no-store'))).toBe(false)
            expect(routes).toContain('background:default')
        } finally {
            globalThis.__BUILT_FOR__ = 'chrome'
        }
    })

    it('sanitizing keeps known routes, once each, in order, per browser; no bare list across browsers', () => {
        expect(
            sanitizeWwwRouteOrder({
                chrome: ['tab:reload', 'bogus', 'tab:reload', 'background:no-cache', 7],
                firefox: { order: ['tab:default'], skip: ['background:reload', 'x'] },
                edge: ['tab:default'],
            }),
        ).toEqual({
            chrome: { order: ['tab:reload', 'background:no-cache'], skip: [] },
            firefox: { order: ['tab:default'], skip: ['background:reload'] },
        })
        // 0.0.5.26's form, a bare list for every browser, means nothing here
        expect(sanitizeWwwRouteOrder(['tab:reload'])).toEqual({})
        expect(sanitizeWwwRouteOrder({ chrome: 'tab:reload' })).toEqual({})
        expect(sanitizeWwwRouteOrder(undefined)).toEqual({})
    })

    it("the order puts this browser's listed routes first and the built-in ones the list leaves out after", () => {
        expect(wwwRouteOrder({ chrome: { order: ['tab:reload'], skip: [] } })).toEqual([
            'tab:reload',
            ...defaultWwwRoutes().filter(route => route !== 'tab:reload'),
        ])
        expect(wwwRouteOrder({ firefox: { order: ['tab:reload'], skip: [] } })).toEqual(defaultWwwRoutes())
        expect(wwwRouteOrder()).toEqual(defaultWwwRoutes())
    })

    it('skipped routes drop out, but a background route always stays', () => {
        const skip = defaultWwwRoutes().filter(route => route !== 'tab:no-cache')
        expect(wwwRouteOrder({ chrome: { order: [], skip: ['background:no-store'] } })).not.toContain(
            'background:no-store',
        )
        // skipping every route but a tab one leaves the first background route in
        expect(wwwRouteOrder({ chrome: { order: [], skip } })).toEqual(['tab:no-cache', 'background:no-store'])
    })
})

describe('options.www_route_order in the news feed', () => {
    const serveFeed = options =>
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => ({ ok: true, json: async () => ({ messages: [], options }) })),
        )

    beforeEach(() => {
        __resetStorage({}, {})
        vi.spyOn(console, 'log').mockImplementation(() => {})
    })

    afterEach(() => {
        vi.unstubAllGlobals()
        vi.restoreAllMocks()
    })

    it('is cached sanitized and read back', async () => {
        serveFeed({
            www_route_order: {
                chrome: ['tab:no-cache', 'nope', 'background:no-store'],
                firefox: { skip: ['tab:reload'] },
            },
        })
        await fetchNews({ force: true })
        const expected = {
            chrome: { order: ['tab:no-cache', 'background:no-store'], skip: [] },
            firefox: { order: [], skip: ['tab:reload'] },
        }
        expect(__getLocalStorage()[NEWS_CACHE_KEY].feed.options.www_route_order).toEqual(expected)
        expect(await getRemoteWwwRouteOrder()).toEqual(expected)
    })

    it("is left out when it names no known route, and 0.0.5.26's www_routes is ignored", async () => {
        serveFeed({ www_route_order: { chrome: ['nope'] }, www_routes: ['tab:reload'] })
        await fetchNews({ force: true })
        expect(__getLocalStorage()[NEWS_CACHE_KEY].feed.options).not.toHaveProperty('www_route_order')
        expect(__getLocalStorage()[NEWS_CACHE_KEY].feed.options).not.toHaveProperty('www_routes')
        expect(await getRemoteWwwRouteOrder()).toEqual({})
    })
})

describe('options.markup and options.login_cookies in the news feed', () => {
    beforeEach(() => {
        __resetStorage({}, {})
        vi.spyOn(console, 'log').mockImplementation(() => {})
    })
    afterEach(() => {
        setMarkupConfig({})
        vi.unstubAllGlobals()
        vi.restoreAllMocks()
    })

    it('are cached sanitized, and the markup names apply at once', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => ({
                ok: true,
                json: async () => ({
                    messages: [],
                    options: {
                        markup: { comment_id_attributes: ['data-fullname', 'no spaces'] },
                        login_cookies: ['session_v2', 'bad;name', 'reddit_session'],
                    },
                }),
            })),
        )
        await fetchNews({ force: true })
        const options = __getLocalStorage()[NEWS_CACHE_KEY].feed.options
        expect(options.markup).toEqual({ commentIdAttributes: ['data-fullname'] })
        expect(options.login_cookies).toEqual(['session_v2', 'reddit_session'])
        expect(getMarkupConfig().commentIdAttributes).toEqual(['data-fullname', 'thingId', 'thing-id'])
        expect(await getRemoteLoginCookies()).toEqual(['session_v2', 'reddit_session'])
    })

    it('without them, the login cookie is reddit_session', async () => {
        expect(await getRemoteLoginCookies()).toEqual(['reddit_session'])
    })
})

// Fixes from the 0.0.5.27 review (2026-10-22), applied 2026-10-24
describe('0.0.5.27 review fixes: the news feed', () => {
    const serveFeed = feed =>
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => ({ ok: true, json: async () => ({ messages: [], ...feed }) })),
        )
    beforeEach(() => {
        __resetStorage({}, {})
        vi.spyOn(console, 'log').mockImplementation(() => {})
    })
    afterEach(() => {
        setPublicModlogsFeed('')
        vi.unstubAllGlobals()
        vi.restoreAllMocks()
    })

    it('a cache dated in the future (a clock set back) does not hold the hourly fetch off', async () => {
        __resetStorage({}, { [NEWS_CACHE_KEY]: { feed: { messages: [] }, lastFetched: Date.now() + 5 * 3600 * 1000 } })
        serveFeed({})
        await fetchNews()
        expect(globalThis.fetch).toHaveBeenCalled()
    })

    it('a change of legacy host or switch ends the legacy rest; the same settings keep it', async () => {
        const until = Date.now() + 3600 * 1000
        __resetStorage(
            {},
            {
                [NEWS_CACHE_KEY]: { feed: { messages: [], options: { mechanisms: {} } }, lastFetched: 1 },
                [LEGACY_REFUSED_UNTIL_KEY]: until,
            },
        )
        serveFeed({ options: { mechanisms: {} } })
        await fetchNews({ force: true })
        expect(__getLocalStorage()[LEGACY_REFUSED_UNTIL_KEY]).toBe(until)
        serveFeed({ options: { mechanisms: {}, legacy_host: 'old.reddit.com' } })
        await fetchNews({ force: true })
        expect(__getLocalStorage()[LEGACY_REFUSED_UNTIL_KEY]).toBeUndefined()
    })

    it('a well-formed publicmodlogs_feed replaces the token, also after a worker restart', async () => {
        const token = 'a'.repeat(40)
        serveFeed({ options: { mechanisms: {}, publicmodlogs_feed: token } })
        await fetchNews({ force: true })
        expect(getPublicModlogsFeed()).toBe(token)
        setPublicModlogsFeed('')
        expect(getPublicModlogsFeed()).toBe(DEFAULT_PUBLICMODLOGS_FEED)
        await applyRemoteConfig()
        expect(getPublicModlogsFeed()).toBe(token)

        serveFeed({ options: { mechanisms: {}, publicmodlogs_feed: 'not-a-token' } })
        await fetchNews({ force: true })
        expect(getPublicModlogsFeed()).toBe(DEFAULT_PUBLICMODLOGS_FEED)
    })
})
