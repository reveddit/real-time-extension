// A legacy page read while the page parser's WASM is still loading. The parser's
// stream waits for it, and so does an abort of that stream, so the read's own
// deadline has to end the read. The parser's default build fetches its WASM, and
// the fetch here never answers that.

// Install chrome global BEFORE any source import
import '../mocks/chrome-api.js'

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { __resetStorage } from '../mocks/webextension-polyfill.js'

import { getItemsById_fromOldHTML, getPost_fromOld } from '../../src/src/parse_html/old'

describe('a legacy page read while the parser is still loading', () => {
    const savedFetch = globalThis.fetch
    beforeEach(() => {
        __resetStorage()
        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    })
    afterEach(() => {
        globalThis.fetch = savedFetch
    })

    // The page loads, and like a real fetch's, its body fails when the request is aborted
    const loading = async (url, init) => {
        if (String(url).endsWith('.wasm')) return new Promise(() => {})
        const body = new ReadableStream({
            start: controller => {
                controller.enqueue(new TextEncoder().encode('<html><body><div id="siteTable"></div></body></html>'))
                init.signal?.addEventListener('abort', () => controller.error(init.signal.reason))
            },
        })
        return new Response(body, { status: 200, headers: { 'content-type': 'text/html' } })
    }

    it.each([
        ['a post page', () => getPost_fromOld('/comments/abc/')],
        ['the listing', () => getItemsById_fromOldHTML(['t1_c1'])],
    ])('is given up on at its deadline, and not read as a page with nothing on it: %s', async (_, read) => {
        globalThis.fetch = vi.fn(loading)
        const reading = read().catch(err => err.name)
        await vi.advanceTimersByTimeAsync(15 * 1000)
        expect(await reading).toBe('AbortError')
    })
})
