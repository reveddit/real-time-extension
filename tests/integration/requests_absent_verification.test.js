// Integration tests for the feed-absent verification path in
// lookupItemsByID_fromPublicProfile: since ~2026-07 Reddit omits items from
// profile-hidden subreddits from the logged-out profile feed, so feed absence
// must be verified against the item's own page before concluding removal.

// Install chrome global BEFORE any source import
import '../mocks/chrome-api.js'

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { __resetStorage, __getLocalStorage } from '../mocks/webextension-polyfill.js'

import { lookupItemsByID_fromPublicProfile, _legacyLookups } from '../../src/src/requests'

// The real legacy parsers run HTMLRewriter (WASM) which cannot load under
// vitest — always stub the seam so no test can reach them.
const originalLegacyLookups = { ..._legacyLookups }
const stubLegacy = (commentsById, postByPath) => {
    _legacyLookups.commentsById = commentsById || (async () => [])
    _legacyLookups.postByPath = postByPath || (async () => ({ error: 'stubbed' }))
}

const USER = 'testuser'

// --- page fixtures (modeled on live pages, verified 2026-07-20) ---

const thingIdEl = id => `<div thing-id="${id}" class="something"></div>`

const emptyStatePage = type =>
    `<shreddit-feed navigation-session-id="x"><div>Welcome! u/${USER} doesn&#x27;t have any ${type} yet, ` +
    `but check out their stats to learn more about them.</div></shreddit-feed>`

const commentEl = (id, author) =>
    `<shreddit-comment created="2019-10-12T00:53:40.750000+0000" author="${author}" ` +
    `thingId="${id}" depth="0" comment-position="0" comment-parent-positions="[]" ` +
    `permalink="/r/test/comments/abc123/comment/${id.slice(3)}/" score="1">` +
    `<div slot="comment">some text</div></shreddit-comment>`

const commentsPage = inner =>
    `<html><body><shreddit-post class="block" id="t3_abc123" author="someone" ` +
    `subreddit-name="test" permalink="/r/test/comments/abc123/title/"></shreddit-post>` +
    `<shreddit-comment-tree>${inner}</shreddit-comment-tree></body></html>`

// Absent from the feed, but live on its own page (profile-hidden subreddit)
const HIDDEN = 't1_hidden1'
// Absent from the feed and from its own page (genuinely removed)
const GONE = 't1_gone11'
// Present in the feed
const FEED_OK = 't1_feedok1'

const PERMALINKS = {
    [HIDDEN]: `/r/hiddensub/comments/abc123/title/${HIDDEN.slice(3)}/`,
    [GONE]: `/r/somesub/comments/abc123/title/${GONE.slice(3)}/`,
}

const meta = (id, extra = {}) => ({
    locked: false,
    created_utc: 1700000000,
    permalink: PERMALINKS[id],
    link_id: 't3_abc123',
    ...extra,
})

const installFetch = routes => {
    const calls = []
    globalThis.fetch = async url => {
        calls.push(url)
        for (const [substr, html] of routes) {
            if (url.includes(substr)) {
                return { ok: true, text: async () => html }
            }
        }
        throw new Error(`unexpected url: ${url}`)
    }
    return calls
}

const defaultRoutes = () => [
    [`/user/${USER}/comments/?sort=new`, commentsPage('') + thingIdEl(FEED_OK)],
    [`/user/${USER}/submitted/?sort=new`, emptyStatePage('posts')],
    [PERMALINKS[HIDDEN], commentsPage(commentEl(HIDDEN, USER))],
    // valid comments page without the target comment → removed
    [PERMALINKS[GONE], commentsPage(commentEl('t1_other11', 'SomeoneElse'))],
]

describe('lookupItemsByID_fromPublicProfile feed-absent verification', () => {
    beforeEach(() => {
        __resetStorage()
        stubLegacy()
    })
    afterEach(() => {
        Object.assign(_legacyLookups, originalLegacyLookups)
    })

    it('keeps a profile-hidden comment live and flags a page-absent comment removed', async () => {
        installFetch(defaultRoutes())
        const ids = [FEED_OK, HIDDEN, GONE]
        const authItemsMeta = Object.fromEntries(ids.map(id => [id, meta(id)]))
        const results = await lookupItemsByID_fromPublicProfile(ids, USER, authItemsMeta)
        const byId = Object.fromEntries(results.map(r => [r.data.name, r.data]))

        expect(byId[FEED_OK].author).toBe(USER)
        // hidden-sub comment: verified live on its own page → NOT removed
        expect(byId[HIDDEN].author).toBe(USER)
        expect(byId[HIDDEN].is_robot_indexable).toBe(true)
        // genuinely removed comment: synthetic removed shape
        expect(byId[GONE].author).toBe('[deleted]')
        expect(byId[GONE].body).toBe('[removed]')
    })

    it('caches verdicts so a second cycle does not refetch item pages', async () => {
        const calls = installFetch(defaultRoutes())
        const ids = [HIDDEN, GONE]
        const authItemsMeta = Object.fromEntries(ids.map(id => [id, meta(id)]))
        await lookupItemsByID_fromPublicProfile(ids, USER, authItemsMeta)
        // Full-page fetches only: the svc partial (also /r/<sub>-shaped) is
        // attempted first per item and is covered by the same verdict cache.
        const pageFetches = () =>
            calls.filter(u => !u.includes('/svc/') && (u.includes('/r/hiddensub/') || u.includes('/r/somesub/'))).length
        expect(pageFetches()).toBe(2)
        expect(__getLocalStorage().www_absent_item_verdicts[HIDDEN].v).toBe('live')
        expect(__getLocalStorage().www_absent_item_verdicts[GONE].v).toBe('removed')

        const results = await lookupItemsByID_fromPublicProfile(ids, USER, authItemsMeta)
        expect(pageFetches()).toBe(2) // cache hit, no new page fetches
        const byId = Object.fromEntries(results.map(r => [r.data.name, r.data]))
        expect(byId[HIDDEN].author).toBe(USER)
        expect(byId[GONE].author).toBe('[deleted]')
    })

    it('omits an absent comment whose page is unrecognizable (no false alert)', async () => {
        installFetch([
            [`/user/${USER}/comments/?sort=new`, commentsPage('') + thingIdEl(FEED_OK)],
            [`/user/${USER}/submitted/?sort=new`, emptyStatePage('posts')],
            // challenge/error page, no solvable puzzle → verdict unknown
            [PERMALINKS[HIDDEN], '<html><body>please wait</body></html>'],
        ])
        const ids = [FEED_OK, HIDDEN]
        const authItemsMeta = Object.fromEntries(ids.map(id => [id, meta(id)]))
        const results = await lookupItemsByID_fromPublicProfile(ids, USER, authItemsMeta)
        const names = results.map(r => r.data.name)
        expect(names).toContain(FEED_OK)
        expect(names).not.toContain(HIDDEN)
    })

    it('reverts to feed-absence classification when the remote mechanism is off', async () => {
        __resetStorage(
            {},
            {
                news_cache: {
                    feed: { messages: [], options: { mechanisms: { absentPageVerification: 'off' } } },
                    lastFetched: 1,
                },
            },
        )
        const calls = installFetch(defaultRoutes())
        const ids = [HIDDEN, GONE]
        const authItemsMeta = Object.fromEntries(ids.map(id => [id, meta(id)]))
        const results = await lookupItemsByID_fromPublicProfile(ids, USER, authItemsMeta)
        // no item pages fetched at all
        expect(calls.filter(u => u.includes('/r/hiddensub/') || u.includes('/r/somesub/')).length).toBe(0)
        // pre-verification behavior: absence within coverage counts as removed
        const byId = Object.fromEntries(results.map(r => [r.data.name, r.data]))
        expect(byId[HIDDEN].author).toBe('[deleted]')
        expect(byId[GONE].author).toBe('[deleted]')
    })

    it('honors the dev override over the remote state', async () => {
        __resetStorage(
            {},
            {
                dev_disable_absent_verification: true,
                news_cache: {
                    feed: { messages: [], options: { mechanisms: { absentPageVerification: 'on' } } },
                    lastFetched: 1,
                },
            },
        )
        const calls = installFetch(defaultRoutes())
        const authItemsMeta = { [HIDDEN]: meta(HIDDEN) }
        const results = await lookupItemsByID_fromPublicProfile([HIDDEN], USER, authItemsMeta)
        expect(calls.filter(u => u.includes('/r/hiddensub/')).length).toBe(0)
        expect(results[0].data.author).toBe('[deleted]')
    })

    it('resolves unknown www verdicts via the old.reddit tiebreaker', async () => {
        // www serves shells (unrecognizable) for both items; old.reddit knows
        // the truth: HIDDEN is live, GONE is removed.
        installFetch([
            [`/user/${USER}/comments/?sort=new`, commentsPage('') + thingIdEl(FEED_OK)],
            [`/user/${USER}/submitted/?sort=new`, emptyStatePage('posts')],
            [PERMALINKS[HIDDEN], '<html><body>shell</body></html>'],
            [PERMALINKS[GONE], '<html><body>shell</body></html>'],
        ])
        // old.reddit /api/info drops removed comments: GONE is absent from the
        // response; the feed-present canary (FEED_OK) and the hidden-but-live
        // comment render. Absence + rendered canary → removed.
        let requestedIds
        stubLegacy(async ids => {
            requestedIds = ids
            return [
                { data: { name: HIDDEN, author: USER, body: 'still here' } },
                { data: { name: FEED_OK, author: USER, body: 'canary' } },
            ]
        })
        const ids = [FEED_OK, HIDDEN, GONE]
        const authItemsMeta = Object.fromEntries(ids.map(id => [id, meta(id)]))
        const results = await lookupItemsByID_fromPublicProfile(ids, USER, authItemsMeta)
        const byId = Object.fromEntries(results.map(r => [r.data.name, r.data]))
        expect(byId[HIDDEN].author).toBe(USER)
        expect(byId[GONE].author).toBe('[deleted]')
        // the batch included the feed-present canary alongside the unresolved ids
        expect(requestedIds).toContain(FEED_OK)
        // tiebreaker verdicts are cached like www verdicts
        expect(__getLocalStorage().www_absent_item_verdicts[HIDDEN].v).toBe('live')
        expect(__getLocalStorage().www_absent_item_verdicts[GONE].v).toBe('removed')
    })

    it('does not treat absence from a canary-less or unhealthy legacy response as removed', async () => {
        installFetch([
            [`/user/${USER}/comments/?sort=new`, commentsPage('') + thingIdEl(FEED_OK)],
            [`/user/${USER}/submitted/?sort=new`, emptyStatePage('posts')],
            [PERMALINKS[GONE], '<html><body>shell</body></html>'],
        ])
        // Legacy response renders nothing (unhealthy/blocked) → no absence verdict
        stubLegacy(async () => [])
        const results = await lookupItemsByID_fromPublicProfile([FEED_OK, GONE], USER, {
            [FEED_OK]: meta(FEED_OK),
            [GONE]: meta(GONE),
        })
        expect(results.map(r => r.data.name)).not.toContain(GONE)
    })

    it('skips the tiebreaker when the legacy paths are disabled', async () => {
        __resetStorage({}, { dev_simulate_endpoint_deprecation: true })
        installFetch([
            [`/user/${USER}/comments/?sort=new`, commentsPage('') + thingIdEl(FEED_OK)],
            [`/user/${USER}/submitted/?sort=new`, emptyStatePage('posts')],
            [PERMALINKS[GONE], '<html><body>shell</body></html>'],
        ])
        let called = false
        stubLegacy(async () => {
            called = true
            return []
        })
        const results = await lookupItemsByID_fromPublicProfile([GONE], USER, { [GONE]: meta(GONE) })
        expect(called).toBe(false)
        expect(results.map(r => r.data.name)).not.toContain(GONE)
    })

    it('omits a known-removed feed-present post with no page verdict instead of approving it', async () => {
        const POST = 't3_post11'
        installFetch([
            [`/user/${USER}/comments/?sort=new`, emptyStatePage('comments') + commentsPage('')],
            // The removed post still lingers in the public submitted feed
            [`/user/${USER}/submitted/?sort=new`, thingIdEl(POST)],
        ])
        // Old post (mature), recorded as removed. In vitest there is no www tab,
        // so verifyFeedPresentPosts cannot produce a page verdict.
        const oldCreated = 1700000000
        const authItemsMeta = { [POST]: { locked: false, created_utc: oldCreated, known_removed: true } }
        const results = await lookupItemsByID_fromPublicProfile([POST], USER, authItemsMeta)
        expect(results.map(r => r.data.name)).not.toContain(POST)

        // Same post NOT known-removed → feed presence keeps it live (unchanged behavior)
        const results2 = await lookupItemsByID_fromPublicProfile([POST], USER, {
            [POST]: { locked: false, created_utc: oldCreated },
        })
        const item = results2.find(r => r.data.name === POST)
        expect(item.data.is_robot_indexable).toBe(true)
    })

    it('skips verification for publicly-invisible items and returns the exempt synthetic shape', async () => {
        const calls = installFetch(defaultRoutes())
        const authItemsMeta = { [HIDDEN]: meta(HIDDEN, { over_18: true }) }
        const results = await lookupItemsByID_fromPublicProfile([HIDDEN], USER, authItemsMeta)
        // no page fetch attempted for the NSFW item
        expect(calls.filter(u => u.includes('/r/hiddensub/')).length).toBe(0)
        // synthetic removed shape with _public_view so the classification loop
        // reclassifies it as approved (invisibleToPublicView)
        expect(results.length).toBe(1)
        expect(results[0].data.author).toBe('[deleted]')
        expect(results[0].data._public_view).toBe(true)
    })
})
