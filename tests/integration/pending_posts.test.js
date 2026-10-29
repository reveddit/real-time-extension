// The pending-post queue (monitoring.ts processPendingPosts): fed by the legacy
// lookup chain while the public view is down, it reads each queued post's
// legacy page, and for a removed one its thread's JSON with the user's login.
// Reddit refusals, 429s and a missing login keep a post queued without using
// up its attempts; one post's 403 can be its own (a members-only community),
// so only two in a row rest the legacy pages.

// Install chrome global BEFORE any source import
import '../mocks/chrome-api.js'

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import browserMock, { __resetStorage, __getLocalStorage } from '../mocks/webextension-polyfill.js'

// The legacy page reader runs HTMLRewriter (WASM), which can't load here
const legacyPages = {}
vi.mock('../../src/src/parse_html/old', () => ({
    getPost_fromOld: async path => legacyPages[path] || { error: 'no page', status: 404 },
    getItemsById_fromOldHTML: async () => [],
    getItems_fromOld: async () => [],
}))

import { _processPendingPosts, _pendingPostTiming } from '../../src/src/monitoring'
import { isCapabilityResting, CAPABILITY_REST_KEY } from '../../src/src/requests'
import { _loggedInFetchState } from '../../src/src/logged-in-fetch'
import { getRateLimitBackoffRemainingMs } from '../../src/src/storage'

const page = id => `/comments/${id.slice(3)}/`
const json = (status, data, type = 'application/json; charset=UTF-8') => ({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: name => (name.toLowerCase() === 'content-type' ? type : null) },
    json: async () => data,
})
const blockPage = () => json(403, null, 'text/html; charset=utf-8')

describe('the pending-post queue', () => {
    const savedCookies = browserMock.cookies
    let loggedIn
    let fetches
    beforeEach(() => {
        for (const key of Object.keys(legacyPages)) delete legacyPages[key]
        _pendingPostTiming.delayMs = 0
        _loggedInFetchState.preferredCacheMode = 0
        _loggedInFetchState.doubleBlockUntil = 0
        loggedIn = true
        browserMock.cookies = { get: async ({ name }) => (loggedIn ? { name, value: 'x' } : null) }
        fetches = []
        globalThis.fetch = async url => {
            fetches.push(String(url))
            return blockPage()
        }
    })
    afterEach(() => {
        browserMock.cookies = savedCookies
        _pendingPostTiming.delayMs = 2000
    })
    const queue = ids => __resetStorage({}, { pending_post_lookups: ids })
    const storage = () => ({ user_subscriptions: {}, other_subscriptions: {} })

    it("one post's 403 sends it to the back, and the next post that answers keeps the legacy pages up", async () => {
        queue(['t3_priv1', 't3_pub2'])
        legacyPages[page('t3_priv1')] = { error: 'legacy reddit HTML request failed: 403', status: 403 }
        legacyPages[page('t3_pub2')] = { is_removed: false }
        await _processPendingPosts(storage())
        expect(__getLocalStorage().pending_post_lookups).toEqual(['t3_priv1'])
        expect(await isCapabilityResting('legacy')).toBe(false)
        expect(__getLocalStorage().pending_post_attempts).toMatchObject({ t3_priv1: 1, t3_pub2: 1 })
    })

    it('two posts refused in a row rest the legacy pages, and the queue waits', async () => {
        queue(['t3_a1', 't3_b2', 't3_c3'])
        for (const id of ['t3_a1', 't3_b2', 't3_c3']) {
            legacyPages[page(id)] = { error: 'legacy reddit HTML request failed: 403', status: 403 }
        }
        await _processPendingPosts(storage())
        expect(await isCapabilityResting('legacy')).toBe(true)
        // the first went to the back, the second waits where it was
        expect(__getLocalStorage().pending_post_lookups).toEqual(['t3_b2', 't3_c3', 't3_a1'])
        expect(__getLocalStorage().pending_post_attempts).toEqual({ t3_a1: 1 })
    })

    it("logged out, a removed post waits: no thread read, so nothing rests what followed items need", async () => {
        queue(['t3_gone1'])
        legacyPages[page('t3_gone1')] = { is_removed: true }
        loggedIn = false
        await _processPendingPosts(storage())
        expect(fetches).toEqual([])
        expect(__getLocalStorage().pending_post_lookups).toEqual(['t3_gone1'])
        expect(__getLocalStorage()[CAPABILITY_REST_KEY]?.thread_json).toBeUndefined()
        expect(__getLocalStorage().pending_post_attempts?.t3_gone1).toBeUndefined()
    })

    it('a thread read refused in both cache modes rests the thread reads, and the post keeps its place and attempts', async () => {
        queue(['t3_gone1', 't3_next2'])
        legacyPages[page('t3_gone1')] = { is_removed: true }
        await _processPendingPosts(storage())
        expect(fetches).toHaveLength(2)
        expect(await isCapabilityResting('thread_json')).toBe(true)
        expect(__getLocalStorage().pending_post_lookups).toEqual(['t3_gone1', 't3_next2'])
        expect(__getLocalStorage().pending_post_attempts?.t3_gone1).toBeUndefined()
    })

    it('the challenge page reddit sends for every legacy page rests them at once, and the post keeps its place and attempts', async () => {
        queue(['t3_a1', 't3_b2'])
        legacyPages[page('t3_a1')] = { error: 'challenge page: reddit refuses legacy pages', refused: true }
        await _processPendingPosts(storage())
        expect(await isCapabilityResting('legacy')).toBe(true)
        expect(__getLocalStorage().pending_post_lookups).toEqual(['t3_a1', 't3_b2'])
        expect(__getLocalStorage().pending_post_attempts?.t3_a1).toBeUndefined()
    })

    it('a 429 on a legacy page keeps the post, counts no attempt and starts the backoff', async () => {
        queue(['t3_a1', 't3_b2'])
        legacyPages[page('t3_a1')] = { error: 'legacy reddit HTML request failed: 429', status: 429 }
        await _processPendingPosts(storage())
        expect(__getLocalStorage().pending_post_lookups).toEqual(['t3_a1', 't3_b2'])
        expect(__getLocalStorage().pending_post_attempts?.t3_a1).toBeUndefined()
        expect(await getRateLimitBackoffRemainingMs()).toBeGreaterThan(0)
    })
})
