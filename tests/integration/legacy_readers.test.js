// The legacy page readers (parse_html/old.ts) on reddit's challenge page, run
// through the real HTMLRewriter. Its default build fetches its WASM, which
// vitest can't; the package's base64 build carries it inline.

// Install chrome global BEFORE any source import
import '../mocks/chrome-api.js'

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { __resetStorage } from '../mocks/webextension-polyfill.js'

vi.mock('@worker-tools/html-rewriter', () => import('@worker-tools/html-rewriter/base64'))

import { getPost_fromOld, getItems_fromOld } from '../../src/src/parse_html/old'
import { LEGACY_REFUSED_ERROR } from '../../src/src/parse_html/common'

// The shape reddit answers every legacy page with since 2026-10-28 (trimmed)
const challenge =
    '<html><head><title>Reddit</title></head><body>' +
    '<script nonce="n">const solution = await(async e=>e+e)("c0d4");</script>' +
    '<form hidden method="GET" action="/comments/abc/"><input type="hidden" name="solution" />' +
    '<input type="hidden" name="js_challenge" value="1"/><input type="hidden" name="jsc_token" value="t"/>' +
    '</form></body></html>'
const legacyThread =
    '<html><body><div id="siteTable"><div class=" thing id-t3_abc link" data-fullname="t3_abc">' +
    '<p class="tagline"><span>submitted by</span> <a class="author">someone</a></p></div></div></body></html>'
const page = html => new Response(html, { status: 200, headers: { 'content-type': 'text/html' } })

describe("the legacy readers on reddit's challenge", () => {
    const savedFetch = globalThis.fetch
    beforeEach(() => __resetStorage())
    afterEach(() => {
        globalThis.fetch = savedFetch
    })

    it("reads a post page that is the challenge as a refusal, not 'unrecognized'", async () => {
        globalThis.fetch = vi.fn(async () => page(challenge))
        expect(await getPost_fromOld('/comments/abc/')).toEqual({ error: LEGACY_REFUSED_ERROR, refused: true })
    })

    it('reads a user page that is the challenge as a refusal, not an empty profile, and asks nothing more', async () => {
        globalThis.fetch = vi.fn(async () => page(challenge))
        expect(await getItems_fromOld('/user/someone/')).toEqual({ error: LEGACY_REFUSED_ERROR, refused: true })
        expect(globalThis.fetch).toHaveBeenCalledTimes(1)
    })

    it('still reads a legacy thread page', async () => {
        globalThis.fetch = vi.fn(async () => page(legacyThread))
        const result = await getPost_fromOld('/comments/abc/')
        expect(result.refused).toBeUndefined()
        expect(result.is_removed).toBe(false)
    })
})
