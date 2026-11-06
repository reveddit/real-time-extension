// Shared by the tests of the www fetcher and absent-item verification: page
// fixtures, the news feed's route order, and hooks that leave every test with
// empty storage, a failing network and stubbed legacy parsers.
import { beforeEach, afterEach, vi } from 'vitest'
import browserMock, { __resetStorage, __getLocalStorage } from './webextension-polyfill.js'
import { _legacyLookups } from '../../src/src/legacy-lookup'
import { _wwwRouteTiming } from '../../src/src/www-fetcher'

// No scaffolding, no challenge marker: classifyCommentPage → 'unknown'.
export const SHELL_HTML = '<html><head><title>Reddit</title></head><body>nothing here</body></html>'
// Scaffolding present, comment tag present with a real author → 'live'.
export const livePage = id =>
    `<html><body><shreddit-comment-tree></shreddit-comment-tree>` +
    `<shreddit-comment thingId="${id}" author="alice"></shreddit-comment></body></html>`

// The news feed's route order (options.www_route_order), ahead of the built-in one
export const routeOrder = routes => {
    __getLocalStorage().news_cache = {
        feed: {
            messages: [],
            options: { mechanisms: {}, www_route_order: Array.isArray(routes) ? { chrome: routes } : routes },
        },
        lastFetched: Date.now(),
    }
}

// Call once at the top of a test file.
export const useFetcherHooks = () => {
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
    })
}
