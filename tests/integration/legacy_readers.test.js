// The legacy page readers (parse_html/old.ts), run through the real
// HTMLRewriter. Its default build fetches its WASM, which vitest can't; the
// package's base64 build carries it inline.

// Install chrome global BEFORE any source import
import '../mocks/chrome-api.js'

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { __resetStorage, __getLocalStorage } from '../mocks/webextension-polyfill.js'

vi.mock('@worker-tools/html-rewriter', () => import('@worker-tools/html-rewriter/base64'))

import { getItemsById_fromOldHTML, getPost_fromOld } from '../../src/src/parse_html/old'
import { LEGACY_REFUSED_ERROR } from '../../src/src/parse_html/common'
import { CAPABILITY_REST_KEY } from '../../src/src/news'
import { isLegacyResting, noteLegacyRefusal } from '../../src/src/legacy-lookup'
import { lookupItemsByID } from '../../src/src/requests'

// The shape reddit answers every legacy page with since 2026-10-28 (trimmed)
const challenge =
    '<html><head><title>Reddit</title></head><body>' +
    '<script nonce="n">const solution = await(async e=>e+e)("c0d4");</script>' +
    '<form hidden method="GET" action="/comments/abc/"><input type="hidden" name="solution" />' +
    '<input type="hidden" name="js_challenge" value="1"/><input type="hidden" name="jsc_token" value="t"/>' +
    '</form></body></html>'
const loginPage = '<html><body><form action="/login"></form></body></html>'
const legacyThread =
    '<html><body><div id="siteTable"><div class=" thing id-t3_abc link" data-fullname="t3_abc">' +
    '<p class="tagline"><span>submitted by</span> <a class="author">someone</a></p></div></div></body></html>'
// A listing's things, trimmed from a saved page. A post's score, time and text
// sit where a comment's do.
const thingBody = (score, datetime, body) =>
    '<div class="entry unvoted"><p class="tagline">' +
    `<span class="score unvoted" title="${score}">${score} points</span> ` +
    `<time datetime="${datetime}" class="live-timestamp">long ago</time></p>` +
    `<div class="usertext-body"><div class="md">${body}</div></div></div>`
const commentThing = (id, body) =>
    `<div class=" thing id-t1_${id} noncollapsed comment " data-fullname="t1_${id}" data-subreddit="sub" ` +
    'data-subreddit-fullname="t5_s" data-author="someone" data-author-fullname="t2_a" ' +
    `data-permalink="/r/sub/comments/abc/title/${id}/">${thingBody(7, '2021-01-28T19:22:12+00:00', body)}</div>`
const postThing =
    '<div class=" thing id-t3_abc self link " data-fullname="t3_abc" data-author="op" data-score="99" ' +
    'data-timestamp="978307200000" data-permalink="/r/sub/comments/abc/title/">' +
    `${thingBody(99, '2001-01-01T00:00:00+00:00', '<p>the post</p>')}</div>`
const listing = things => `<html><body><div id="siteTable">${things}</div></body></html>`
const page = html => new Response(html, { status: 200, headers: { 'content-type': 'text/html' } })
const readListing = async html => {
    globalThis.fetch = vi.fn(async () => page(html))
    return (await getItemsById_fromOldHTML(['t1_c1'])).map(wrap => wrap.data)
}

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

    it('still reads a legacy thread page', async () => {
        globalThis.fetch = vi.fn(async () => page(legacyThread))
        expect(await getPost_fromOld('/comments/abc/')).toEqual({ is_removed: false })
    })

    it('reads a post page logged out, like the listing', async () => {
        globalThis.fetch = vi.fn(async () => page(legacyThread))
        await getPost_fromOld('/comments/abc/')
        expect(globalThis.fetch.mock.calls[0][1].credentials).toBe('omit')
    })

    it.each([
        ['the challenge', challenge],
        ['some other page', loginPage],
    ])('fails a listing that is %s, as a refusal that rests the listing alone', async (_, html) => {
        const error = await readListing(html).catch(e => e)
        expect(error.message).toContain('request failed: 403')
        await noteLegacyRefusal(error, 'legacy_info')
        expect(await isLegacyResting('legacy_info')).toBe(true)
        expect(await isLegacyResting('legacy')).toBe(false)
    })

    it("doesn't take the challenge for the listing working, on a followed item's lookup", async () => {
        // A rest that has run out: a reading that worked would end the run of refusals
        const since = Date.now() - 1000
        __resetStorage({}, { [CAPABILITY_REST_KEY]: { legacy_info: { refusals: 1, until: Date.now() - 1, since } } })
        globalThis.fetch = vi.fn(async () => page(challenge))
        await expect(lookupItemsByID(['t1_c1'], 'none')).rejects.toThrow('request failed: 403')
        await vi.waitFor(() =>
            expect(__getLocalStorage()[CAPABILITY_REST_KEY].legacy_info).toMatchObject({ refusals: 2, since }),
        )
    })

    it("stops a followed item's lookup at one logged-out request when the listing is some other page", async () => {
        globalThis.fetch = vi.fn(async () => page(loginPage))
        await expect(lookupItemsByID(['t1_c1'], 'none')).rejects.toThrow('request failed: 403')
        const loggedOut = globalThis.fetch.mock.calls.filter(([, init]) => init?.credentials === 'omit')
        expect(loggedOut).toHaveLength(1)
    })
})

describe('a legacy page that stalls after its headers', () => {
    const savedFetch = globalThis.fetch
    beforeEach(() => {
        __resetStorage()
        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    })
    afterEach(() => {
        globalThis.fetch = savedFetch
    })

    // Like a real fetch, its body fails when the request is aborted
    const stalled = async (_, init) =>
        page(
            new ReadableStream({
                start: controller => {
                    controller.enqueue(new TextEncoder().encode('<html><body>'))
                    init.signal?.addEventListener('abort', () => controller.error(init.signal.reason))
                },
            }),
        )

    it.each([
        ['a post page', () => getPost_fromOld('/comments/abc/')],
        ['the listing', () => getItemsById_fromOldHTML(['t1_c1'])],
    ])('is given up on: %s', async (_, read) => {
        globalThis.fetch = vi.fn(stalled)
        const reading = read().catch(err => err.name)
        await vi.advanceTimersByTimeAsync(15 * 1000)
        expect(await reading).toBe('AbortError')
    })
})

describe('the legacy listing', () => {
    const savedFetch = globalThis.fetch
    beforeEach(() => __resetStorage())
    afterEach(() => {
        globalThis.fetch = savedFetch
    })

    it.each([
        ['a post', postThing],
        ['a post with no name attribute', postThing.replace('data-fullname="t3_abc" ', '')],
    ])('reads each comment whole, with nothing of %s landing on the comment before it', async (_, post) => {
        const items = await readListing(
            listing(commentThing('c1', '<p>hello</p>') + post + commentThing('c2', '<p>there</p>')),
        )
        expect(items.map(item => item.name)).toEqual(['t1_c1', 't1_c2'])
        expect(items[0]).toMatchObject({
            id: 'c1',
            subreddit: 'sub',
            subreddit_id: 't5_s',
            author: 'someone',
            author_fullname: 't2_a',
            permalink: '/r/sub/comments/abc/title/c1/',
            link_id: 't3_abc',
            link_permalink: 'https://www.reddit.com/r/sub/comments/abc/title/',
            body: 'hello',
            score: 7,
            created_utc: 1611861732,
            locked: false,
            stickied: false,
            controversiality: 0,
            quarantine: false,
            distinguished: null,
            removal_reason: null,
        })
    })

    it('names a comment from its permalink, and skips a thing with neither', async () => {
        const deleted =
            '<div class=" thing collapsed deleted comment " data-subreddit="sub" ' +
            'data-permalink="/r/sub/comments/abc/title/c3/"></div>'
        const nameless = '<div class=" thing comment " data-subreddit="sub"></div>'
        const items = await readListing(listing(nameless + deleted))
        expect(items).toHaveLength(1)
        expect(items[0]).toMatchObject({ name: 't1_c3', author: '[deleted]', link_id: 't3_abc', score: 1 })
    })

    it('takes the name from data-fullname when the permalink says another', async () => {
        const thing = commentThing('c1', '<p>hi</p>').replace('title/c1/', 'title/zz9/')
        const [item] = await readListing(listing(thing))
        expect(item).toMatchObject({ name: 't1_c1', id: 'c1', author: 'someone' })
    })

    it('reads on past an element that has no end tag', async () => {
        const [item] = await readListing(listing(commentThing('c1', '<p>one</p><hr/><p>two</p>')))
        expect(item.body).toContain('one')
        expect(item.body).toContain('two')
    })

    it('reads a listing with nothing in it as no items', async () => {
        expect(await readListing(listing(''))).toEqual([])
    })
})
