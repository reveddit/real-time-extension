// Integration tests for the feed-absent verification path in
// lookupItemsByID_fromPublicProfile: since ~2026-07 Reddit omits items from
// profile-hidden subreddits from the logged-out profile feed, so feed absence
// must be verified against the item's own page before concluding removal.

// Install chrome global BEFORE any source import
import '../mocks/chrome-api.js'

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import browserMock, { __resetStorage, __getLocalStorage, __getSyncStorage } from '../mocks/webextension-polyfill.js'

import {
    lookupItemsByID,
    lookupItemsByID_fromPublicProfile,
    _legacyLookups,
    _wwwRouteTiming,
    isPublicProfileUnavailable,
    isLegacyResting,
    noteLegacyRefusal,
    CAPABILITY_REST_KEY,
    CAPABILITY_MAX_REST_MS,
    CAPABILITY_FIRST_REST_MS,
    capabilityRestMs,
    isCapabilityResting,
    noteCapabilityRefused,
    noteCapabilityWorked,
    _followedTiming,
    isProfilePaginationShort,
} from '../../src/src/requests'
import { getDiagEntries } from '../../src/src/diaglog'
import { _loggedInFetchState } from '../../src/src/logged-in-fetch'

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
                    `<div slot="post-removed-banner">Sorry, this post was removed by the moderators.</div></shreddit-post></body></html>`,
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

    // u/reddit stands in for "a profile known to exist" (controlProfileLoads)
    const withControl = (control, rest) => async url => {
        const u = String(url)
        if (u.includes('/user/reddit/')) {
            calls.control++
            return control(u)
        }
        return rest(u)
    }
    const calls = { control: 0 }
    const controlLoads = u => ({
        ok: true,
        status: 200,
        text: async () => emptyStatePage(u.includes('/submitted/') ? 'posts' : 'comments'),
    })
    const notFound = () => ({ ok: false, status: 404, text: async () => 'Not Found' })

    it('a missing (404) public profile while the logged-in view lists items is the same signature', async () => {
        calls.control = 0
        globalThis.fetch = withControl(controlLoads, notFound)
        await expect(lookupItemsByID_fromPublicProfile([GONE], USER, { [GONE]: meta(GONE) })).rejects.toThrow(
            'profile_publicly_empty',
        )
        // the control loaded once, and its answer is remembered
        expect(calls.control).toBe(2)
        await expect(lookupItemsByID_fromPublicProfile([GONE], USER, { [GONE]: meta(GONE) })).rejects.toThrow(
            'profile_publicly_empty',
        )
        expect(calls.control).toBe(2)
        expect(__getLocalStorage().error_status).toBe('profile_publicly_empty')
        // for the bridge, which then answers 404 for this profile as reddit does logged out
        expect(await isPublicProfileUnavailable(USER)).toBe(true)
        expect(await isPublicProfileUnavailable('someone_else')).toBe(false)

        installFetch(defaultRoutes())
        await lookupItemsByID_fromPublicProfile([FEED_OK], USER, { [FEED_OK]: meta(FEED_OK) })
        expect(await isPublicProfileUnavailable(USER)).toBe(false)
    })

    it('a 404 is no shadowban when the control profile is missing too', async () => {
        calls.control = 0
        globalThis.fetch = withControl(notFound, notFound)
        await expect(lookupItemsByID_fromPublicProfile([GONE], USER, { [GONE]: meta(GONE) })).rejects.toThrow(
            'www profile lookup invalid: www.reddit.com request failed: 404',
        )
        expect(__getLocalStorage().error_status).not.toBe('profile_publicly_empty')
        expect(await isPublicProfileUnavailable(USER)).toBe(false)
    })

    it("one tab's 404 is no shadowban", async () => {
        globalThis.fetch = withControl(controlLoads, u =>
            u.includes('/comments/')
                ? notFound()
                : { ok: true, status: 200, text: async () => emptyStatePage('posts') },
        )
        await expect(lookupItemsByID_fromPublicProfile([GONE], USER, { [GONE]: meta(GONE) })).rejects.toThrow(
            'answered 404 (the other tab did not)',
        )
        expect(__getLocalStorage().error_status).not.toBe('profile_publicly_empty')
        expect(await isPublicProfileUnavailable(USER)).toBe(false)
    })

    it('an empty profile warns, but the bridge keeps serving it (only a 404 profile is missing)', async () => {
        installFetch(emptyRoutes())
        await expect(lookupItemsByID_fromPublicProfile([GONE], USER, { [GONE]: meta(GONE) })).rejects.toThrow(
            'profile_publicly_empty',
        )
        expect(await isPublicProfileUnavailable(USER)).toBe(false)
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

// Reddit refused the legacy endpoints in every cache mode on 2026-10-21, and
// each failed public-view lookup still sent them two refused requests
describe('legacy refusal memory', () => {
    beforeEach(() => {
        __resetStorage()
        stubLegacy()
    })
    afterEach(() => {
        Object.assign(_legacyLookups, originalLegacyLookups)
    })

    it('after a real 403, the legacy listing rests instead of being refused again each cycle', async () => {
        const calls = []
        globalThis.fetch = async url => {
            calls.push(String(url))
            return { ok: false, status: 403, text: async () => 'BLOCK' }
        }
        const lookup = () => lookupItemsByID([GONE], 'none', false, false, [], USER, { [GONE]: meta(GONE) })
        await expect(lookup()).rejects.toThrow(/legacy fallback: legacy reddit HTML request failed: 403$/)
        expect(await isLegacyResting('legacy_info')).toBe(true)
        // the legacy pages answer separately and keep going
        expect(await isLegacyResting()).toBe(false)
        const legacyCalls = () => calls.filter(u => u.includes('api/info')).length
        // the HTML request; the JSON one behind it rests already
        expect(legacyCalls()).toBe(1)
        await expect(lookup()).rejects.toThrow(
            /legacy fallback: legacy reddit HTML skipped: resting after reddit refused it$/,
        )
        expect(legacyCalls()).toBe(1)
        // neither is reported as rate limiting or a block: the public view's failure is what reports
        expect(__getLocalStorage().error_status).toBeUndefined()
    })

    it("the simulated deprecation's 403 and other statuses start no rest", async () => {
        noteLegacyRefusal(new Error('legacy reddit HTML request failed: 403 (legacy endpoints disabled)'))
        noteLegacyRefusal(new Error('legacy reddit HTML request failed: 500'))
        expect(await isLegacyResting()).toBe(false)
    })

    it('a rest recorded further ahead than the longest rest (a clock set back) is ignored', async () => {
        __getLocalStorage()[CAPABILITY_REST_KEY] = {
            legacy: { refusals: 1, until: Date.now() + 4 * CAPABILITY_MAX_REST_MS, since: Date.now() },
        }
        expect(await isLegacyResting()).toBe(false)
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
        `<div slot="post-removed-banner">Post is awaiting moderator approval.</div></shreddit-post></body></html>`
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

    it('checks young posts page by page without a www tab too', async () => {
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

    it("paces a post page it can't read instead of fetching it every cycle", async () => {
        const calls = installFetch([
            [`/user/${USER}/comments/?sort=new`, emptyStatePage('comments')],
            [`/user/${USER}/submitted/?sort=new`, thingIdEl(POST)],
            [POST_PERMALINK, FRONT_PAGE],
        ])
        const authMeta = {
            [POST]: { locked: false, created_utc: Math.floor(Date.now() / 1000) - 3600, permalink: POST_PERMALINK },
        }
        const first = await lookupItemsByID_fromPublicProfile([POST], USER, authMeta)
        // nothing says otherwise, so the feed's presence stands
        expect(first.find(r => r.data.name === POST).data.is_robot_indexable).toBe(true)
        const pageFetches = () => calls.filter(u => u.includes('/comments/post11/')).length
        const afterFirst = pageFetches()
        expect(afterFirst).toBeGreaterThan(0)
        await lookupItemsByID_fromPublicProfile([POST], USER, authMeta)
        expect(pageFetches()).toBe(afterFirst)
    })

    it('fetches at most 10 post pages per cycle', async () => {
        const posts = Array.from({ length: 12 }, (_, i) => `t3_pp${i.toString(36).padStart(4, '0')}`)
        const permalink = id => `/r/somesub/comments/${id.slice(3)}/t/`
        const calls = installFetch([
            [`/user/${USER}/comments/?sort=new`, emptyStatePage('comments')],
            [`/user/${USER}/submitted/?sort=new`, posts.map(thingIdEl).join('')],
            ...posts.map(id => [
                permalink(id),
                `<html><body><shreddit-post id="${id}" author="${USER}" post-title="t" subreddit-name="somesub">` +
                    `<div slot="post-removed-banner">Post is awaiting moderator approval.</div></shreddit-post></body></html>`,
            ]),
        ])
        const created = Math.floor(Date.now() / 1000) - 3600
        await lookupItemsByID_fromPublicProfile(
            posts,
            USER,
            Object.fromEntries(
                posts.map(id => [id, { locked: false, created_utc: created, permalink: permalink(id) }]),
            ),
        )
        const fetched = new Set(calls.filter(u => u.includes('/r/somesub/comments/')).map(u => u.split('/')[6]))
        expect(fetched.size).toBe(10)
    })
})

// Fixes from the 0.0.5.27 review (2026-10-22), applied 2026-10-24
describe('0.0.5.27 review fixes: warning streaks and public-live hints', () => {
    beforeEach(() => {
        __resetStorage()
        stubLegacy()
    })
    afterEach(() => {
        Object.assign(_legacyLookups, originalLegacyLookups)
    })

    it('a lookup with nothing absent to verify clears the verification warning streak', async () => {
        __resetStorage({}, { absent_verify_consecutive_failures: 7 })
        installFetch(defaultRoutes())
        await lookupItemsByID_fromPublicProfile([FEED_OK], USER, { [FEED_OK]: meta(FEED_OK) })
        expect(__getLocalStorage().absent_verify_consecutive_failures).toBeUndefined()
    })

    it('pagination that keeps stopping short warns after five lookups, and a full one clears it', async () => {
        // the first page ends with a cursor, GONE lies below it, and no route serves the next page
        const cursor = `<shreddit-feed-load-more-observer cursor="${Buffer.from(FEED_OK).toString('base64')}"></shreddit-feed-load-more-observer>`
        installFetch([
            [`/user/${USER}/comments/?sort=new`, commentsPage('') + thingIdEl(FEED_OK) + cursor],
            [`/user/${USER}/submitted/?sort=new`, emptyStatePage('posts')],
        ])
        const ids = [FEED_OK, GONE]
        const authItemsMeta = Object.fromEntries(ids.map(id => [id, meta(id)]))
        for (let i = 0; i < 5; i++) {
            await lookupItemsByID_fromPublicProfile(ids, USER, authItemsMeta)
        }
        expect(__getLocalStorage().profile_pagination_consecutive_shortfalls).toBe(5)
        expect(__getLocalStorage().error_status).toBe('profile_pagination_unavailable')
        expect(await isProfilePaginationShort()).toBe(true)

        installFetch(defaultRoutes())
        await lookupItemsByID_fromPublicProfile([FEED_OK], USER, { [FEED_OK]: meta(FEED_OK) })
        expect(await isProfilePaginationShort()).toBe(false)
    })

    it("a young feed-present post without a 'live' page verdict is not reported publicly live", async () => {
        const YOUNG = 't3_young1'
        const OLD = 't3_old1'
        installFetch([
            [`/user/${USER}/comments/?sort=new`, emptyStatePage('comments')],
            [`/user/${USER}/submitted/?sort=new`, thingIdEl(YOUNG) + thingIdEl(OLD)],
            // its own page is unreadable, so no verdict
            ['/comments/young1', '<html><body>please wait</body></html>'],
        ])
        const now = Math.floor(Date.now() / 1000)
        const results = await lookupItemsByID_fromPublicProfile([YOUNG, OLD], USER, {
            [YOUNG]: { locked: false, created_utc: now - 3600 },
            [OLD]: { locked: false, created_utc: now - 30 * 86400 },
        })
        const byId = Object.fromEntries(results.map(r => [r.data.name, r.data]))
        expect(byId[YOUNG]._public_view_unverified).toBe(true)
        expect(byId[OLD]._public_view_unverified).toBeUndefined()
    })
})

describe('0.0.5.27 review fixes: feed-present post verification', () => {
    const POSTS = ['t3_young1', 't3_young2']
    const now = () => Math.floor(Date.now() / 1000)
    const youngMeta = () => Object.fromEntries(POSTS.map(id => [id, { locked: false, created_utc: now() - 3600 }]))
    const servePosts = postPage => {
        const pageCalls = []
        globalThis.fetch = async url => {
            const u = String(url)
            if (u.includes(`/user/${USER}/comments/`))
                return { ok: true, status: 200, text: async () => emptyStatePage('comments') }
            if (u.includes(`/user/${USER}/submitted/`))
                return { ok: true, status: 200, text: async () => POSTS.map(thingIdEl).join('') }
            pageCalls.push(u)
            return postPage(u)
        }
        return pageCalls
    }
    beforeEach(() => {
        __resetStorage()
        stubLegacy()
    })
    afterEach(() => {
        Object.assign(_legacyLookups, originalLegacyLookups)
    })

    it('a 429 on a post page ends the verification loop', async () => {
        const pageCalls = servePosts(() => ({ ok: false, status: 429, text: async () => '' }))
        await lookupItemsByID_fromPublicProfile(POSTS, USER, youngMeta())
        expect(pageCalls).toHaveLength(1)
        expect(__getLocalStorage().error_status).toBe('rate_limited')
    })

    it('a post once seen held keeps that history when its page later reads unknown', async () => {
        __resetStorage({}, { www_post_page_verdicts: { t3_young1: { v: 'held', t: Date.now() - 3 * 3600 * 1000 } } })
        servePosts(() => ({ ok: true, status: 200, text: async () => '<html><body>please wait</body></html>' }))
        const old = { t3_young1: { locked: false, created_utc: now() - 30 * 86400 } }
        await lookupItemsByID_fromPublicProfile(['t3_young1'], USER, old)
        const entry = __getLocalStorage().www_post_page_verdicts.t3_young1
        expect(entry.v).toBe('unknown')
        expect(entry.adverse).toBe(true)
    })
})

// Methods reddit refuses outright rest longer with each refusal in a row, up to
// a week, and are tried again after every rest: none is given up for good.
describe('the escalating rest after a refusal', () => {
    beforeEach(() => __resetStorage())

    it('doubles from 6 hours to a weekly cap', () => {
        const hours = [1, 2, 3, 4, 5, 6, 7, 20].map(n => capabilityRestMs(n) / 3600000)
        expect(hours).toEqual([6, 12, 24, 48, 96, 168, 168, 168])
        expect(capabilityRestMs(1)).toBe(CAPABILITY_FIRST_REST_MS)
    })

    it('escalates only on tries the rest allowed, and one success ends it', async () => {
        await noteCapabilityRefused('api_info', 'block page')
        expect(await isCapabilityResting('api_info')).toBe(true)
        // a refusal while resting (a path that ignores the rest) adds nothing
        await noteCapabilityRefused('api_info', 'block page')
        expect(__getLocalStorage()[CAPABILITY_REST_KEY].api_info.refusals).toBe(1)
        // the rest runs out, the next try is refused: twice as long
        __getLocalStorage()[CAPABILITY_REST_KEY].api_info.until = Date.now() - 1000
        expect(await isCapabilityResting('api_info')).toBe(false)
        await noteCapabilityRefused('api_info', 'block page')
        const rest = __getLocalStorage()[CAPABILITY_REST_KEY].api_info
        expect(rest.refusals).toBe(2)
        expect(rest.until - Date.now()).toBeGreaterThan(2 * CAPABILITY_FIRST_REST_MS - 5000)
        await noteCapabilityWorked('api_info')
        expect(__getLocalStorage()[CAPABILITY_REST_KEY].api_info).toBeUndefined()
        expect(await isCapabilityResting('api_info')).toBe(false)
    })
})

// Followed items (other people's posts and comments the user tracks) were
// read 100 at a time through api/info.json, which reddit refuses since
// 2026-10-24. While it rests, each is read through its thread's JSON.
describe('followed items while api/info is refused', () => {
    const COMMENT = 't1_folc1'
    const COMMENT2 = 't1_folc2'
    const NOPOST = 't1_folc3'
    const POSTF = 't3_folp1'
    const json = (status, data, type = 'application/json; charset=UTF-8') => ({
        ok: status >= 200 && status < 300,
        status,
        headers: { get: name => (name.toLowerCase() === 'content-type' ? type : null) },
        json: async () => data,
        text: async () => JSON.stringify(data),
    })
    const blockPage = () => json(403, null, 'text/html; charset=utf-8')
    const thread = (post, comment) => [
        { kind: 'Listing', data: { children: [{ kind: 't3', data: post }] } },
        { kind: 'Listing', data: { children: comment ? [{ kind: 't1', data: comment }] : [] } },
    ]
    let calls
    const serve = ({ apiInfo }) => {
        calls = []
        globalThis.fetch = async url => {
            const u = String(url)
            calls.push(u)
            if (u.includes('/api/info.json')) return apiInfo()
            if (u.includes(`/comments/p1/_/folc1.json`))
                return json(200, thread({ name: 't3_p1' }, { name: COMMENT, author: '[deleted]', body: '[removed]' }))
            if (u.includes(`/comments/p2/_/folc2.json`))
                return json(200, thread({ name: 't3_p2' }, { name: COMMENT2, author: 'someone', body: 'still here' }))
            if (u.includes(`/comments/folp1.json`))
                return json(
                    200,
                    thread({ name: POSTF, author: 'someone', is_robot_indexable: false, selftext: '[removed]' }),
                )
            throw new Error(`unexpected url: ${u}`)
        }
    }
    const lookupFollowed = ids => lookupItemsByID(ids, 'none', false, false, [], '', {})
    // The followed list (storage.sync), which the rotation's maps are pruned to
    const following = ids => Object.fromEntries(ids.map(id => [id, { t: 1 }]))
    const savedCookies = browserMock.cookies
    let loggedIn
    beforeEach(() => {
        __resetStorage(
            { other_subscriptions: following([COMMENT, COMMENT2, POSTF, NOPOST]) },
            { followed_post_ids: { [COMMENT]: 'p1', [COMMENT2]: 'p2' } },
        )
        stubLegacy()
        _followedTiming.delayMs = 0
        _loggedInFetchState.preferredCacheMode = 0
        _loggedInFetchState.doubleBlockUntil = 0
        loggedIn = true
        browserMock.cookies = { get: async ({ name }) => (loggedIn ? { name, value: 'x' } : null) }
    })
    afterEach(() => {
        Object.assign(_legacyLookups, originalLegacyLookups)
        _followedTiming.delayMs = 700
        browserMock.cookies = savedCookies
    })

    it('a block page rests api/info and reads each followed item through its thread instead', async () => {
        serve({ apiInfo: blockPage })
        const results = await lookupFollowed([COMMENT, COMMENT2, POSTF, NOPOST])
        const byId = Object.fromEntries(results.map(r => [r.data.name, r.data]))
        expect(byId[COMMENT].body).toBe('[removed]')
        expect(byId[COMMENT2].body).toBe('still here')
        expect(byId[POSTF].is_robot_indexable).toBe(false)
        // a comment with no known post can't be read this way: no news, no false removal
        expect(byId[NOPOST]).toBeUndefined()
        expect(await isCapabilityResting('api_info')).toBe(true)

        // the next cycle doesn't ask api/info while it rests
        calls.length = 0
        await lookupFollowed([COMMENT, COMMENT2, POSTF])
        expect(calls.some(u => u.includes('/api/info.json'))).toBe(false)
    })

    it('reads a few per cycle, the ones read longest ago first', async () => {
        serve({ apiInfo: blockPage })
        const ids = [COMMENT, COMMENT2, POSTF]
        const many = Array.from({ length: 8 }, (_, i) => `t3_x${i}`)
        __getSyncStorage().other_subscriptions = following([...ids, ...many])
        globalThis.fetch = (orig => async url => {
            const m = String(url).match(/comments\/(x\d)\.json/)
            if (m) return json(200, thread({ name: `t3_${m[1]}`, author: 'someone' }))
            return orig(url)
        })(globalThis.fetch)
        const first = await lookupFollowed([...ids, ...many])
        expect(first).toHaveLength(5)
        const second = await lookupFollowed([...ids, ...many])
        const firstIds = new Set(first.map(r => r.data.name))
        expect(second.some(r => firstIds.has(r.data.name))).toBe(false)
    })

    it("follows from before 0.0.5.27 are read through the post their cached item names (its fullname)", async () => {
        const OLD = 't1_oldc1'
        __getSyncStorage().other_subscriptions = following([OLD])
        __getLocalStorage().items_other = { [OLD]: { p: 't3_pold1' } }
        serve({ apiInfo: blockPage })
        globalThis.fetch = (orig => async url => {
            if (String(url).includes('/comments/pold1/_/oldc1.json'))
                return json(200, thread({ name: 't3_pold1' }, { name: OLD, author: '[deleted]', body: '[removed]' }))
            return orig(url)
        })(globalThis.fetch)
        const results = await lookupFollowed([OLD])
        expect(results.map(r => r.data.name)).toEqual([OLD])
        expect(calls.some(u => u.includes('t3_'))).toBe(false)
        // copied over, so the next cycle needn't read the item cache
        expect(__getLocalStorage().followed_post_ids[OLD]).toBe('pold1')
    })

    it('a follow (one id) leaves the rotation of the others alone', async () => {
        serve({ apiInfo: blockPage })
        const many = Array.from({ length: 10 }, (_, i) => `t3_x${i}`)
        __getSyncStorage().other_subscriptions = following([...many, 't3_new1'])
        globalThis.fetch = (orig => async url => {
            const m = String(url).match(/comments\/(x\d|new1)\.json/)
            if (m) return json(200, thread({ name: `t3_${m[1]}`, author: 'someone' }))
            return orig(url)
        })(globalThis.fetch)
        const first = await lookupFollowed(many)
        await lookupFollowed(['t3_new1'])
        const second = await lookupFollowed(many)
        const firstIds = new Set(first.map(r => r.data.name))
        expect(second.some(r => firstIds.has(r.data.name))).toBe(false)
        expect(Object.keys(__getLocalStorage().followed_checked_at)).toContain('t3_new1')
    })

    it('reads nothing without a reddit login, and rests the thread reads after a block page in both modes', async () => {
        serve({ apiInfo: blockPage })
        loggedIn = false
        expect(await lookupFollowed([COMMENT, COMMENT2])).toEqual([])
        expect(calls.filter(u => !u.includes('/api/info.json'))).toEqual([])

        loggedIn = true
        globalThis.fetch = async url => {
            calls.push(String(url))
            return blockPage()
        }
        // api/info's block page in both modes skips the retry for a while: a
        // block page in one mode stops this cycle's reads but rests nothing
        calls.length = 0
        expect(await lookupFollowed([COMMENT, COMMENT2, POSTF])).toEqual([])
        expect(calls).toHaveLength(1)
        expect(await isCapabilityResting('thread_json')).toBe(false)

        _loggedInFetchState.doubleBlockUntil = 0
        calls.length = 0
        expect(await lookupFollowed([COMMENT, COMMENT2, POSTF])).toEqual([])
        // the first read's two cache modes, then the batch stops
        expect(calls).toHaveLength(2)
        expect(await isCapabilityResting('thread_json')).toBe(true)
        calls.length = 0
        expect(await lookupFollowed([COMMENT, COMMENT2, POSTF])).toEqual([])
        expect(calls).toEqual([])
    })

    it("leaves out a followed comment whose author blocked the user: [unavailable] isn't a removal", async () => {
        serve({ apiInfo: blockPage })
        globalThis.fetch = (orig => async url => {
            if (String(url).includes('/comments/p1/_/folc1.json'))
                return json(200, thread({ name: 't3_p1' }, { name: COMMENT, author: '[unavailable]', body: '[unavailable]' }))
            return orig(url)
        })(globalThis.fetch)
        const results = await lookupFollowed([COMMENT, COMMENT2])
        expect(results.map(r => r.data.name)).toEqual([COMMENT2])
    })

    it('once the rest runs out and api/info answers again, the rest ends', async () => {
        serve({ apiInfo: blockPage })
        await lookupFollowed([COMMENT])
        __getLocalStorage()[CAPABILITY_REST_KEY].api_info.until = Date.now() - 1000
        serve({
            apiInfo: () =>
                json(200, { data: { children: [{ kind: 't1', data: { name: COMMENT, body: 'x', author: 'a' } }] } }),
        })
        const results = await lookupFollowed([COMMENT])
        expect(results.map(r => r.data.name)).toEqual([COMMENT])
        expect(await isCapabilityResting('api_info')).toBe(false)
        expect(__getLocalStorage()[CAPABILITY_REST_KEY].api_info).toBeUndefined()
    })
})

// Fixes from the 0.0.5.27 release review (2026-10-25)
describe('0.0.5.27 release review fixes: rate limits, the legacy queue, the public-live set', () => {
    const POSTS = ['t3_young1', 't3_young2']
    const now = () => Math.floor(Date.now() / 1000)
    const savedQuery = browserMock.tabs.query
    beforeEach(() => {
        __resetStorage()
        stubLegacy()
    })
    afterEach(() => {
        Object.assign(_legacyLookups, originalLegacyLookups)
        browserMock.tabs.query = savedQuery
    })

    it("a post page's 429 keeps its backoff through the whole lookup, and the absent items wait for it", async () => {
        const pageCalls = []
        globalThis.fetch = async url => {
            const u = String(url)
            if (u.includes(`/user/${USER}/comments/`))
                return { ok: true, status: 200, text: async () => commentsPage('') + thingIdEl(FEED_OK) }
            if (u.includes(`/user/${USER}/submitted/`))
                return { ok: true, status: 200, text: async () => POSTS.map(thingIdEl).join('') }
            pageCalls.push(u)
            return { ok: false, status: 429, text: async () => '' }
        }
        const authItemsMeta = {
            [FEED_OK]: meta(FEED_OK),
            [GONE]: meta(GONE),
            ...Object.fromEntries(POSTS.map(id => [id, { locked: false, created_utc: now() - 3600 }])),
        }
        const results = await lookupItemsByID([FEED_OK, GONE, ...POSTS], 'none', false, false, [], USER, authItemsMeta)
        // the first post page's 429, then nothing more
        expect(pageCalls).toHaveLength(1)
        expect(__getLocalStorage().rate_limit_until).toBeGreaterThan(Date.now())
        expect(__getLocalStorage().rate_limit_level).toBe(1)
        // the absent comment got no verdict: no news
        expect(results.map(r => r.data.name)).not.toContain(GONE)
    })

    it('a profile 429 ends the lookup without the legacy chain', async () => {
        const calls = []
        globalThis.fetch = async url => {
            calls.push(String(url))
            return { ok: false, status: 429, text: async () => '' }
        }
        await expect(
            lookupItemsByID([GONE, 't3_q1'], 'none', false, false, [], USER, { [GONE]: meta(GONE) }),
        ).rejects.toThrow(/429/)
        expect(__getLocalStorage().rate_limit_until).toBeGreaterThan(Date.now())
        // the chain would queue the post first, then ask the legacy hosts
        expect(__getLocalStorage().pending_post_lookups).toBeUndefined()
        expect(calls.every(u => u.includes(`/user/${USER}/`))).toBe(true)
    })

    it("posts go to the pending-post queue even while reddit refuses the legacy listing", async () => {
        // the public view is down: every route gets a page that isn't the profile
        globalThis.fetch = async () => ({ ok: true, status: 200, text: async () => FRONT_PAGE })
        __getLocalStorage()[CAPABILITY_REST_KEY] = {
            legacy_info: { refusals: 1, until: Date.now() + 3600 * 1000, since: Date.now() },
        }
        await expect(
            lookupItemsByID(['t3_queued1', GONE], 'none', false, false, [], USER, { [GONE]: meta(GONE) }),
        ).rejects.toThrow()
        expect(__getLocalStorage().pending_post_lookups).toEqual(['t3_queued1'])
    })

    it('an empty profile forgets which items were seen publicly, so the bridge stops vouching for them', async () => {
        __resetStorage({}, { [`public_live_u_${USER}`]: { ids: [GONE], t: Date.now() } })
        installFetch([
            [`/user/${USER}/comments/?sort=new`, emptyStatePage('comments')],
            [`/user/${USER}/submitted/?sort=new`, emptyStatePage('posts')],
        ])
        await expect(lookupItemsByID_fromPublicProfile([GONE], USER, { [GONE]: meta(GONE) })).rejects.toThrow(
            'profile_publicly_empty',
        )
        expect(__getLocalStorage()[`public_live_u_${USER}`]).toBeUndefined()
    })

    it("remembers a control profile that didn't load, so a reddit-wide 404 doesn't fetch it every cycle", async () => {
        let controlCalls = 0
        globalThis.fetch = async url => {
            if (String(url).includes('/user/reddit/')) controlCalls++
            return { ok: false, status: 404, text: async () => 'Not Found' }
        }
        await expect(lookupItemsByID_fromPublicProfile([GONE], USER, { [GONE]: meta(GONE) })).rejects.toThrow(/404/)
        const first = controlCalls
        expect(first).toBeGreaterThan(0)
        await expect(lookupItemsByID_fromPublicProfile([GONE], USER, { [GONE]: meta(GONE) })).rejects.toThrow(/404/)
        expect(controlCalls).toBe(first)
    })

    it('after the clock was set back, a refusal starts a new rest instead of finding the old one running', async () => {
        __getLocalStorage()[CAPABILITY_REST_KEY] = {
            api_info: { refusals: 6, until: Date.now() + CAPABILITY_MAX_REST_MS + 24 * 3600 * 1000, since: 1 },
        }
        expect(await isCapabilityResting('api_info')).toBe(false)
        await noteCapabilityRefused('api_info', 'block page')
        expect(await isCapabilityResting('api_info')).toBe(true)
        expect(__getLocalStorage()[CAPABILITY_REST_KEY].api_info.refusals).toBe(7)
    })
})
