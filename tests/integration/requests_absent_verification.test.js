// Integration tests for the feed-absent verification path in
// lookupItemsByID_fromPublicProfile: since ~2026-07 Reddit omits items from
// profile-hidden subreddits from the logged-out profile feed, so feed absence
// must be verified against the item's own page before concluding removal.

// Install chrome global BEFORE any source import
import '../mocks/chrome-api.js'

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import browserMock, { __resetStorage, __getLocalStorage } from '../mocks/webextension-polyfill.js'

import {
    lookupItemsByID,
    lookupItemsByID_fromPublicProfile,
    _legacyLookups,
    _wwwRouteTiming,
} from '../../src/src/requests'
import { getDiagEntries } from '../../src/src/diaglog'

// The real legacy parsers run HTMLRewriter (WASM) which cannot load under
// vitest — always stub the seam so no test can reach them.
const originalLegacyLookups = { ..._legacyLookups }
const stubLegacy = (commentsById, postByPath) => {
    _legacyLookups.commentsById = commentsById || (async () => [])
    _legacyLookups.postByPath = postByPath || (async () => ({ error: 'stubbed' }))
}

const USER = 'testuser'

// no pause between fetch routes in these tests
_wwwRouteTiming.switchDelayMs = 0

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

// focalId: the comment the thread page was served for, which its tree names
// even when that comment is gone
const commentsPage = (inner, focalId) =>
    `<html><body><shreddit-post class="block" id="t3_abc123" author="someone" ` +
    `subreddit-name="test" permalink="/r/test/comments/abc123/title/"></shreddit-post>` +
    `<shreddit-comment-tree id="comment-tree"${focalId ? ` thingId="${focalId}"` : ''} post-id="t3_abc123">` +
    `${inner}</shreddit-comment-tree></body></html>`

// The logged-out front page (trimmed), which reddit has served in place of
// permalinks: feed items, no comment tree
const FRONT_PAGE =
    `<html><head><link rel="canonical" href="https://www.reddit.com/"></head><body><shreddit-feed>` +
    `<shreddit-post id="t3_feed1" author="someone" post-title="A feed post" subreddit-name="pics" ` +
    `permalink="/r/pics/comments/feed1/a/"></shreddit-post></shreddit-feed></body></html>`

// Absent from the feed, but live on its own page (profile-hidden subreddit)
const HIDDEN = 't1_hidden1'
// Absent from the feed and from its own page (genuinely removed)
const GONE = 't1_gone11'
// Present in the feed
const FEED_OK = 't1_feedok1'

// The auth view's permalinks, in the API's form
const PERMALINKS = {
    [HIDDEN]: `/r/hiddensub/comments/abc123/title/${HIDDEN.slice(3)}/`,
    [GONE]: `/r/somesub/comments/abc123/title/${GONE.slice(3)}/`,
}
// The comments' own pages, in the site's form: the API's form is only a
// redirect shell now (2026-10-17)
const THREAD_PAGES = {
    [HIDDEN]: `/r/hiddensub/comments/abc123/comment/${HIDDEN.slice(3)}/`,
    [GONE]: `/r/somesub/comments/abc123/comment/${GONE.slice(3)}/`,
}
// What the API's form returned, trimmed
const REDIRECT_SHELL =
    `<html><body><div id="shreddit-redirect"><ac-call delay="0" ` +
    `method="location.replace(&quot;${THREAD_PAGES[GONE]}&quot;)" target="window" trigger="init">` +
    `</ac-call></div></body></html>`

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
    [THREAD_PAGES[HIDDEN], commentsPage(commentEl(HIDDEN, USER), HIDDEN)],
    // the comment's own thread page without the comment → removed
    [THREAD_PAGES[GONE], commentsPage(commentEl('t1_other11', 'SomeoneElse'), GONE)],
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

    it('leaves items unresolved when reddit serves its front page for their pages', async () => {
        const POST = 't3_post22'
        installFetch([
            [`/user/${USER}/comments/?sort=new`, commentsPage('') + thingIdEl(FEED_OK)],
            [`/user/${USER}/submitted/?sort=new`, emptyStatePage('posts')],
            [THREAD_PAGES[GONE], FRONT_PAGE],
            [`/comments/${POST.slice(3)}/`, FRONT_PAGE],
        ])
        const ids = [FEED_OK, GONE, POST]
        const authItemsMeta = {
            [FEED_OK]: meta(FEED_OK),
            [GONE]: meta(GONE),
            [POST]: { locked: false, created_utc: 1700000000 },
        }
        const results = await lookupItemsByID_fromPublicProfile(ids, USER, authItemsMeta)
        const names = results.map(r => r.data.name)
        expect(names).toContain(FEED_OK)
        // the front page's feed items once made the comment read removed and
        // the post live
        expect(names).not.toContain(GONE)
        expect(names).not.toContain(POST)
    })

    it('reads comment and post pages at URLs reddit answers without a redirect', async () => {
        const POST = 't3_post33'
        const POST_PERMALINK = '/r/somesub/comments/post33/a_title/'
        const calls = installFetch([
            [`/user/${USER}/comments/?sort=new`, commentsPage('') + thingIdEl(FEED_OK)],
            [`/user/${USER}/submitted/?sort=new`, emptyStatePage('posts')],
            [PERMALINKS[GONE], REDIRECT_SHELL],
            [THREAD_PAGES[GONE], commentsPage(commentEl('t1_other11', 'SomeoneElse'), GONE)],
            [
                POST_PERMALINK,
                `<html><body><shreddit-post id="${POST}" author="${USER}" permalink="${POST_PERMALINK}">` +
                    `<div>Sorry, this post was removed by the moderators.</div></shreddit-post></body></html>`,
            ],
        ])
        const ids = [FEED_OK, GONE, POST]
        const authItemsMeta = {
            [FEED_OK]: meta(FEED_OK),
            [GONE]: meta(GONE),
            [POST]: { locked: false, created_utc: 1700000000, permalink: POST_PERMALINK },
        }
        const results = await lookupItemsByID_fromPublicProfile(ids, USER, authItemsMeta)
        const byId = Object.fromEntries(results.map(r => [r.data.name, r.data]))
        expect(byId[GONE].author).toBe('[deleted]')
        expect(byId[POST].is_robot_indexable).toBe(false)
        // not the API's comment permalink (a redirect shell), and not
        // /comments/<id>/, whose 301 costs a background fetch its solved challenge
        expect(calls).not.toContain('https://www.reddit.com' + PERMALINKS[GONE])
        expect(calls).not.toContain(`https://www.reddit.com/comments/${POST.slice(3)}/`)
    })

    it('omits an absent comment whose page is unrecognizable (no false alert)', async () => {
        installFetch([
            [`/user/${USER}/comments/?sort=new`, commentsPage('') + thingIdEl(FEED_OK)],
            [`/user/${USER}/submitted/?sort=new`, emptyStatePage('posts')],
            // challenge/error page, no solvable puzzle → verdict unknown
            [THREAD_PAGES[HIDDEN], '<html><body>please wait</body></html>'],
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
            [THREAD_PAGES[HIDDEN], '<html><body>shell</body></html>'],
            [THREAD_PAGES[GONE], '<html><body>shell</body></html>'],
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
            [THREAD_PAGES[GONE], '<html><body>shell</body></html>'],
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
            [THREAD_PAGES[GONE], '<html><body>shell</body></html>'],
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

// Remote safety valve (MECHANISM_ABSENT_UNVERIFIED_UNKNOWN): an absent comment
// that no page explicitly confirmed is omitted, never reported removed.
describe('absentUnverifiedIsUnknown remote option', () => {
    const cacheWith = mechanisms => ({
        news_cache: { feed: { messages: [], options: { mechanisms } }, lastFetched: 1 },
    })
    beforeEach(() => stubLegacy())
    afterEach(() => {
        Object.assign(_legacyLookups, originalLegacyLookups)
    })

    it('downgrades a scaffold-only page to unknown while a live page still counts', async () => {
        __resetStorage({}, cacheWith({ absentUnverifiedIsUnknown: 'on' }))
        installFetch(defaultRoutes())
        const ids = [FEED_OK, HIDDEN, GONE]
        const authItemsMeta = Object.fromEntries(ids.map(id => [id, meta(id)]))
        const results = await lookupItemsByID_fromPublicProfile(ids, USER, authItemsMeta)
        const names = results.map(r => r.data.name)
        expect(names).toContain(FEED_OK)
        expect(names).toContain(HIDDEN)
        expect(names).not.toContain(GONE)
    })

    it('also omits absent items when page verification is switched off', async () => {
        __resetStorage({}, cacheWith({ absentPageVerification: 'off', absentUnverifiedIsUnknown: 'on' }))
        installFetch(defaultRoutes())
        const ids = [FEED_OK, GONE]
        const authItemsMeta = Object.fromEntries(ids.map(id => [id, meta(id)]))
        const results = await lookupItemsByID_fromPublicProfile(ids, USER, authItemsMeta)
        expect(results.map(r => r.data.name)).toEqual([FEED_OK])
    })
})

// A publicly empty profile is only a shadowban signal when something on it
// could have been public: an all-NSFW / quarantined / private account is
// empty by design and must keep being monitored.
describe('publicly empty profile versus NSFW-only accounts', () => {
    const emptyRoutes = () => [
        [`/user/${USER}/comments/?sort=new`, emptyStatePage('comments')],
        [`/user/${USER}/submitted/?sort=new`, emptyStatePage('posts')],
    ]
    beforeEach(() => {
        __resetStorage()
        stubLegacy()
    })
    afterEach(() => {
        Object.assign(_legacyLookups, originalLegacyLookups)
    })

    it('still flags a shadowban when an item could have been public', async () => {
        installFetch(emptyRoutes())
        const authItemsMeta = { [GONE]: meta(GONE) }
        await expect(lookupItemsByID_fromPublicProfile([GONE], USER, authItemsMeta)).rejects.toThrow(
            'profile_publicly_empty',
        )
        expect(__getLocalStorage().error_status).toBe('profile_publicly_empty')
    })

    it('does not flag an account whose every item is NSFW, quarantined or private', async () => {
        installFetch(emptyRoutes())
        const authItemsMeta = {
            [GONE]: meta(GONE, { over_18: true }),
            [HIDDEN]: meta(HIDDEN, { subreddit_type: 'private' }),
        }
        await expect(lookupItemsByID_fromPublicProfile([GONE, HIDDEN], USER, authItemsMeta)).resolves.toBeDefined()
        expect(__getLocalStorage().error_status).toBeUndefined()
    })
})

// Issue #27's log had thousands of "www public-view lookup failed" lines and
// nothing about why; its last error named only the legacy fallback's 403.
describe('lookup failure reasons', () => {
    const blockAll = () => {
        globalThis.fetch = async () => ({ ok: false, status: 403, text: async () => 'BLOCK' })
    }
    beforeEach(() => {
        __resetStorage()
        stubLegacy()
    })
    afterEach(() => {
        Object.assign(_legacyLookups, originalLegacyLookups)
    })

    it('the failure streak line says why the public view failed', async () => {
        blockAll()
        await expect(lookupItemsByID_fromPublicProfile([GONE], USER, { [GONE]: meta(GONE) })).rejects.toThrow(
            'www profile lookup invalid: www.reddit.com request failed: 403 (refused: background:no-store 403',
        )
        const lines = (await getDiagEntries()).map(e => e.m)
        expect(
            lines.some(l =>
                l.startsWith(
                    '[reveddit] www public-view lookup failed — consecutive failures: 1 (www.reddit.com request failed: 403',
                ),
            ),
        ).toBe(true)
    })

    it('when the legacy fallback fails too, the error names both', async () => {
        blockAll()
        __getLocalStorage().dev_simulate_endpoint_deprecation = true
        await expect(lookupItemsByID([GONE], 'none', false, false, [], USER, { [GONE]: meta(GONE) })).rejects.toThrow(
            /^www profile lookup invalid: www\.reddit\.com request failed: 403 \(refused: .*\); legacy fallback: legacy reddit HTML request failed: 403 \(legacy endpoints disabled\)$/,
        )
    })
})

// Held and spam-filtered posts linger in the public feed, so young ones get
// their own page read while a www tab can fetch: at the permalink, which
// doesn't redirect (a redirect drops a solved challenge), solving a challenge.
describe('feed-present post verification', () => {
    const POST = 't3_post11'
    const POST_PERMALINK = '/r/somesub/comments/post11/a_title/'
    const heldPostPage =
        `<html><body><shreddit-post id="${POST}" author="${USER}" post-title="t" subreddit-name="somesub">` +
        `<div>Post is awaiting moderator approval.</div></shreddit-post></body></html>`
    const challenge =
        `<script>const solution = await(async e=>e+e)("ab");</script>` +
        `<form hidden method="GET"><input type="hidden" name="js_challenge" value="1"/>` +
        `<input type="hidden" name="jsc_token" value="tok1"/><input type="hidden" name="jsc_orig_r" value=""/></form>`
    const savedQuery = browserMock.tabs.query
    beforeEach(() => {
        __resetStorage()
        stubLegacy()
    })
    afterEach(() => {
        Object.assign(_legacyLookups, originalLegacyLookups)
        browserMock.tabs.query = savedQuery
    })

    it("reads a young post's page at its permalink and solves the challenge", async () => {
        browserMock.tabs.query = async () => [{ id: 7 }]
        const calls = installFetch([
            [`/user/${USER}/comments/?sort=new`, emptyStatePage('comments')],
            [`/user/${USER}/submitted/?sort=new`, thingIdEl(POST)],
            [`${POST_PERMALINK}?solution=abab&js_challenge=1&jsc_token=tok1`, heldPostPage],
            [POST_PERMALINK, challenge],
        ])
        const results = await lookupItemsByID_fromPublicProfile([POST], USER, {
            [POST]: { locked: false, created_utc: Math.floor(Date.now() / 1000) - 3600, permalink: POST_PERMALINK },
        })
        expect(results.find(r => r.data.name === POST).data.is_robot_indexable).toBe(false)
        expect(calls.filter(u => u.includes('/comments/post11/'))).toHaveLength(2)
    })

    it('without a www tab, posts are not checked page by page', async () => {
        const calls = installFetch([
            [`/user/${USER}/comments/?sort=new`, emptyStatePage('comments')],
            [`/user/${USER}/submitted/?sort=new`, thingIdEl(POST)],
        ])
        const results = await lookupItemsByID_fromPublicProfile([POST], USER, {
            [POST]: { locked: false, created_utc: Math.floor(Date.now() / 1000) - 3600, permalink: POST_PERMALINK },
        })
        expect(results.find(r => r.data.name === POST).data.is_robot_indexable).toBe(true)
        expect(calls.filter(u => u.includes('/comments/post11/'))).toHaveLength(0)
    })
})
