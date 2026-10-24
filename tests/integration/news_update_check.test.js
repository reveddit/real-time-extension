// Asking the browser to update as soon as this build's own store publishes a
// newer version (news.ts storeUpdateToRequest, requestStoreUpdateIfBehind),
// and the feed field and fetch throttle it relies on.

// Install chrome global BEFORE any source import
import '../mocks/chrome-api.js'

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { __resetStorage, __getLocalStorage } from '../mocks/webextension-polyfill.js'

import {
    fetchNews,
    requestStoreUpdateIfBehind,
    storeUpdateToRequest,
    NEWS_CACHE_KEY,
    UPDATE_CHECK_REQUESTED_KEY,
    UPDATE_CHECK_ASKED_AT_KEY,
    UPDATE_CHECK_RETRY_MS,
    NEWS_FETCH_FAILED_AT_KEY,
    FAILED_FETCH_RETRY_MS,
} from '../../src/src/news'
import { clearDiagLog, getDiagEntries } from '../../src/src/diaglog'

const loggedLines = async () => (await getDiagEntries()).map(e => e.m)

describe('storeUpdateToRequest', () => {
    it('asks for a store version newer than the running one', () => {
        expect(storeUpdateToRequest('0.0.5.25', '0.0.5.26', undefined)).toBe('0.0.5.26')
        expect(storeUpdateToRequest('0.0.5.9', '0.0.5.10', undefined)).toBe('0.0.5.10')
    })

    it('not when the running version is the same or newer', () => {
        expect(storeUpdateToRequest('0.0.5.26', '0.0.5.26', undefined)).toBeNull()
        expect(storeUpdateToRequest('0.0.5.27', '0.0.5.26', undefined)).toBeNull()
    })

    it('not again soon for a version already asked for; again after the retry interval, and at once for a newer one', () => {
        const now = Date.now()
        expect(storeUpdateToRequest('0.0.5.25', '0.0.5.26', '0.0.5.26', now - 1000, now)).toBeNull()
        expect(storeUpdateToRequest('0.0.5.25', '0.0.5.26', '0.0.5.27', now - 1000, now)).toBeNull()
        expect(storeUpdateToRequest('0.0.5.25', '0.0.5.27', '0.0.5.26', now - 1000, now)).toBe('0.0.5.27')
        // the store's update service can lag its listing, or the check be throttled
        expect(storeUpdateToRequest('0.0.5.25', '0.0.5.26', '0.0.5.26', now - UPDATE_CHECK_RETRY_MS, now)).toBe(
            '0.0.5.26',
        )
        // an ask recorded in the future (a clock set back) doesn't hold off asking
        expect(storeUpdateToRequest('0.0.5.25', '0.0.5.26', '0.0.5.26', now + 3600 * 1000, now)).toBe('0.0.5.26')
    })

    it('ignores a missing or malformed store version, and a malformed record of the last ask', () => {
        expect(storeUpdateToRequest('0.0.5.25', undefined, undefined)).toBeNull()
        expect(storeUpdateToRequest('0.0.5.25', 'v0.0.5.26', undefined)).toBeNull()
        expect(storeUpdateToRequest('0.0.5.25', 26, undefined)).toBeNull()
        expect(storeUpdateToRequest('0.0.5.25', '0.0.5.26', { version: 1 })).toBe('0.0.5.26')
    })
})

// Chrome's store is ahead of Edge's, as when Edge's review is slower
const FEED = {
    messages: [],
    store_versions: { chrome: '0.0.5.26', edge: '0.0.5.25', firefox: '0.0.5.26' },
}

describe('requestStoreUpdateIfBehind', () => {
    beforeEach(async () => {
        __resetStorage({}, { [NEWS_CACHE_KEY]: { feed: structuredClone(FEED), lastFetched: Date.now() } })
        // dlog mirrors every line to the console; keep test output readable
        vi.spyOn(console, 'log').mockImplementation(() => {})
        await clearDiagLog()
        globalThis.__STORE__ = 'chrome'
        chrome.runtime.getManifest = () => ({ version: '0.0.5.25' })
        chrome.runtime.requestUpdateCheck = vi.fn(async () => ({ status: 'update_available', version: '0.0.5.26' }))
    })

    afterEach(() => {
        globalThis.__STORE__ = 'chrome'
        delete chrome.runtime.getManifest
        delete chrome.runtime.requestUpdateCheck
        vi.restoreAllMocks()
    })

    it('asks once for a newer version in its store, remembers it, and logs the answer', async () => {
        await requestStoreUpdateIfBehind()
        await requestStoreUpdateIfBehind()
        expect(chrome.runtime.requestUpdateCheck).toHaveBeenCalledTimes(1)
        expect(__getLocalStorage()[UPDATE_CHECK_REQUESTED_KEY]).toBe('0.0.5.26')
        expect(Date.now() - __getLocalStorage()[UPDATE_CHECK_ASKED_AT_KEY]).toBeLessThan(5000)
        expect(await loggedLines()).toContain(
            '[reveddit] chrome store has 0.0.5.26, running 0.0.5.25: update check update_available (0.0.5.26)',
        )
    })

    it("compares with its own store's version: the Edge build is current here", async () => {
        globalThis.__STORE__ = 'edge'
        await requestStoreUpdateIfBehind()
        expect(chrome.runtime.requestUpdateCheck).not.toHaveBeenCalled()
    })

    it('never asks in the Firefox build, which has no update check to ask for', async () => {
        globalThis.__STORE__ = 'firefox'
        await requestStoreUpdateIfBehind()
        expect(chrome.runtime.requestUpdateCheck).not.toHaveBeenCalled()
        expect(__getLocalStorage()[UPDATE_CHECK_REQUESTED_KEY]).toBeUndefined()
    })

    it('a throttled check still counts, so the next alarm tick does not ask again', async () => {
        chrome.runtime.requestUpdateCheck = vi.fn(async () => ({ status: 'throttled' }))
        await requestStoreUpdateIfBehind()
        await requestStoreUpdateIfBehind()
        expect(chrome.runtime.requestUpdateCheck).toHaveBeenCalledTimes(1)
        expect((await loggedLines()).some(m => m.endsWith(': update check throttled'))).toBe(true)
    })

    it('asks again for the same version once the retry interval has passed, while still behind', async () => {
        chrome.runtime.requestUpdateCheck = vi.fn(async () => ({ status: 'no_update' }))
        await requestStoreUpdateIfBehind()
        __getLocalStorage()[UPDATE_CHECK_ASKED_AT_KEY] = Date.now() - UPDATE_CHECK_RETRY_MS - 1000
        await requestStoreUpdateIfBehind()
        expect(chrome.runtime.requestUpdateCheck).toHaveBeenCalledTimes(2)
    })

    it('asks again when its store moves on to a newer version', async () => {
        await requestStoreUpdateIfBehind()
        __getLocalStorage()[NEWS_CACHE_KEY].feed.store_versions.chrome = '0.0.5.27'
        await requestStoreUpdateIfBehind()
        expect(chrome.runtime.requestUpdateCheck).toHaveBeenCalledTimes(2)
        expect(__getLocalStorage()[UPDATE_CHECK_REQUESTED_KEY]).toBe('0.0.5.27')
    })

    it('ignores latest_version: a feed without store versions asks nothing', async () => {
        __resetStorage(
            {},
            { [NEWS_CACHE_KEY]: { feed: { messages: [], latest_version: '0.0.5.26' }, lastFetched: Date.now() } },
        )
        await requestStoreUpdateIfBehind()
        expect(chrome.runtime.requestUpdateCheck).not.toHaveBeenCalled()
    })

    it('does nothing in a browser without requestUpdateCheck', async () => {
        delete chrome.runtime.requestUpdateCheck
        await requestStoreUpdateIfBehind()
        expect(__getLocalStorage()[UPDATE_CHECK_REQUESTED_KEY]).toBeUndefined()
    })

    it('logs a failing check instead of throwing', async () => {
        chrome.runtime.requestUpdateCheck = vi.fn(async () => {
            throw new Error('boom')
        })
        await expect(requestStoreUpdateIfBehind()).resolves.toBeUndefined()
        expect(await loggedLines()).toContain('[reveddit] update check error: boom')
    })
})

describe('fetchNews store versions and throttle', () => {
    let fetchMock

    beforeEach(() => {
        __resetStorage({}, {})
        vi.spyOn(console, 'log').mockImplementation(() => {})
        fetchMock = vi.fn(async () => ({
            ok: true,
            json: async () => ({
                messages: [],
                store_versions: { chrome: '0.0.5.26', edge: 'v0.0.5.26', firefox: 26, opera: '1.0' },
            }),
        }))
        vi.stubGlobal('fetch', fetchMock)
    })

    afterEach(() => {
        vi.unstubAllGlobals()
        vi.restoreAllMocks()
    })

    it('keeps only well-formed versions of known stores', async () => {
        await fetchNews({ force: true })
        expect(__getLocalStorage()[NEWS_CACHE_KEY].feed.store_versions).toEqual({ chrome: '0.0.5.26' })
    })

    it('leaves store_versions out when the feed has none', async () => {
        fetchMock.mockImplementation(async () => ({ ok: true, json: async () => ({ messages: [] }) }))
        await fetchNews({ force: true })
        expect(__getLocalStorage()[NEWS_CACHE_KEY].feed).not.toHaveProperty('store_versions')
    })

    it('after a failed fetch waits before trying again, unless forced', async () => {
        fetchMock.mockImplementation(async () => ({ ok: false, status: 503 }))
        await fetchNews()
        await fetchNews()
        expect(fetchMock).toHaveBeenCalledTimes(1)
        await fetchNews({ force: true })
        expect(fetchMock).toHaveBeenCalledTimes(2)
        __getLocalStorage()[NEWS_FETCH_FAILED_AT_KEY] = Date.now() - FAILED_FETCH_RETRY_MS - 1000
        fetchMock.mockImplementation(async () => {
            throw new TypeError('Failed to fetch')
        })
        await fetchNews()
        await fetchNews()
        expect(fetchMock).toHaveBeenCalledTimes(3)
    })

    it('fetches again after an hour, not before', async () => {
        const now = Date.now()
        __resetStorage({}, { [NEWS_CACHE_KEY]: { feed: { messages: [] }, lastFetched: now - 50 * 60 * 1000 } })
        await fetchNews()
        expect(fetchMock).not.toHaveBeenCalled()
        __getLocalStorage()[NEWS_CACHE_KEY].lastFetched = now - 61 * 60 * 1000
        await fetchNews()
        expect(fetchMock).toHaveBeenCalledTimes(1)
    })
})
