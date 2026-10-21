// Public-view fetch routes (www-routes.ts): their names, the built-in order,
// and the news feed's options.www_routes, which can reorder them without a
// store release.

// Install chrome global BEFORE any source import
import '../mocks/chrome-api.js'

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { __resetStorage, __getLocalStorage } from '../mocks/webextension-polyfill.js'

import { isWwwRoute, parseWwwRoute, sanitizeWwwRoutes, defaultWwwRoutes } from '../../src/src/www-routes'
import { fetchNews, getRemoteWwwRoutes, NEWS_CACHE_KEY } from '../../src/src/news'

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

    it('sanitizing keeps known routes, once each, in order', () => {
        expect(sanitizeWwwRoutes(['tab:reload', 'bogus', 'tab:reload', 'background:no-cache', 7])).toEqual([
            'tab:reload',
            'background:no-cache',
        ])
        expect(sanitizeWwwRoutes('tab:reload')).toEqual([])
        expect(sanitizeWwwRoutes(undefined)).toEqual([])
    })
})

describe('options.www_routes in the news feed', () => {
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
        serveFeed({ www_routes: ['tab:no-cache', 'nope', 'background:no-store'] })
        await fetchNews({ force: true })
        expect(__getLocalStorage()[NEWS_CACHE_KEY].feed.options.www_routes).toEqual([
            'tab:no-cache',
            'background:no-store',
        ])
        expect(await getRemoteWwwRoutes()).toEqual(['tab:no-cache', 'background:no-store'])
    })

    it('is left out when it names no known route, and reads back empty', async () => {
        serveFeed({ www_routes: ['nope'] })
        await fetchNews({ force: true })
        expect(__getLocalStorage()[NEWS_CACHE_KEY].feed.options).not.toHaveProperty('www_routes')
        expect(await getRemoteWwwRoutes()).toEqual([])
    })
})
