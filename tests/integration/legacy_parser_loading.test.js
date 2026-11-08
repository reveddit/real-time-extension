// A legacy page that stalls after its headers, read while the page parser's WASM
// is still loading. The parser's stream waits for it, and so does an abort of that
// stream, so the read's own deadline has to end the read. The parser's default
// build fetches its WASM, and the fetch here never answers that.

// Install chrome global BEFORE any source import
import '../mocks/chrome-api.js'

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { __resetStorage } from '../mocks/webextension-polyfill.js'
import { stallingBody } from '../mocks/responses.js'

import { getItemsById_fromOldHTML, getPost_fromOld, LEGACY_PAGE_TIMEOUT_MS } from '../../src/src/parse_html/old'

describe('a legacy page that stalls while the parser is still loading', () => {
    const savedFetch = globalThis.fetch
    beforeEach(() => {
        __resetStorage()
        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    })
    afterEach(() => {
        globalThis.fetch = savedFetch
    })

    const loading = async (url, init) => {
        if (String(url).endsWith('.wasm')) return new Promise(() => {})
        const body = stallingBody('<html><body><div id="siteTable"></div></body></html>', init.signal)
        return new Response(body, { status: 200, headers: { 'content-type': 'text/html' } })
    }

    it.each([
        ['a post page', () => getPost_fromOld('/comments/abc/')],
        ['the listing', () => getItemsById_fromOldHTML(['t1_c1'])],
    ])('is given up on at its deadline, and not read as a page with nothing on it: %s', async (_, read) => {
        globalThis.fetch = vi.fn(loading)
        const reading = read().catch(err => err.name)
        await vi.advanceTimersByTimeAsync(LEGACY_PAGE_TIMEOUT_MS)
        expect(await reading).toBe('AbortError')
    })
})
