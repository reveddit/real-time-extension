// Integration tests for lookupItemsByID_fromPublicProfile: since ~2026-07
// Reddit omits items from profile-hidden subreddits from the logged-out profile
// feed, so feed absence must be verified against the item's own page before
// concluding removal. Also the profile-level signals: shadowbans, empty and
// hidden profiles, failure reasons and rate limits.

// Install chrome global BEFORE any source import
import '../mocks/chrome-api.js'

import { describe, it, expect } from 'vitest'
import { __resetStorage, __getLocalStorage } from '../mocks/webextension-polyfill.js'
import { lookupItemsByID, lookupItemsByID_fromPublicProfile } from '../../src/src/requests'
import {
    isPublicProfileUnavailable,
    isProfilePaginationShort,
    PUBLIC_VIEW_UNCHECKED_KEY,
    formatPublicViewUnchecked,
    getPublicViewUncheckedLine,
} from '../../src/src/lookup-status'
import { getDiagEntries } from '../mocks/diag-entries.js'
import {
    stubLegacy,
    USER,
    thingIdEl,
    emptyStatePage,
    commentEl,
    commentsPage,
    FRONT_PAGE,
    HIDDEN,
    GONE,
    FEED_OK,
    PERMALINKS,
    THREAD_PAGES,
    REDIRECT_SHELL,
    meta,
    installFetch,
    defaultRoutes,
    useLegacyStub,
} from '../mocks/public-profile.js'

useLegacyStub()

describe('lookupItemsByID_fromPublicProfile feed-absent verification', () => {
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

    it("reads a post in the user's profile at /user/<name>/, not the API's /r/u_<name>/", async () => {
        const POST = 't3_post44'
        const API_PERMALINK = `/r/u_${USER}/comments/post44/a_title/`
        const SITE_PERMALINK = `/user/${USER}/comments/post44/a_title/`
        const calls = installFetch([
            [`/user/${USER}/comments/?sort=new`, commentsPage('') + thingIdEl(FEED_OK)],
            [`/user/${USER}/submitted/?sort=new`, emptyStatePage('posts')],
            [
                SITE_PERMALINK,
                `<html><body><shreddit-post id="${POST}" author="${USER}" permalink="${SITE_PERMALINK}">` +
                    `<div slot="post-removed-banner">Sorry, this post was removed by the moderators.</div></shreddit-post></body></html>`,
            ],
        ])
        const results = await lookupItemsByID_fromPublicProfile([FEED_OK, POST], USER, {
            [FEED_OK]: meta(FEED_OK),
            [POST]: { locked: false, created_utc: 1700000000, permalink: API_PERMALINK },
        })
        expect(results.find(r => r.data.name === POST).data.is_robot_indexable).toBe(false)
        // The API's form 301s to the /user/ one, and the redirect costs a
        // background fetch its solved challenge (verified live 2026-10-28)
        expect(calls).toContain('https://www.reddit.com' + SITE_PERMALINK)
        expect(calls.some(u => u.includes('/r/u_'))).toBe(false)
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
        // reads it as unchecked (readLookupResult)
        expect(results.length).toBe(1)
        expect(results[0].data.author).toBe('[deleted]')
        expect(results[0].data._public_view).toBe(true)
    })

    // Issue #27: four comments were in a "100 requested, 100 returned (5
    // removed ...)" line without page verdicts, and the log named none of them
    const NSFW_COMMENT = 't1_nsfw1111'
    const NSFW_POST_REMOVED = 't3_nsfwrm11'
    const NSFW_POST_NOINDEX = 't3_nsfwni11'
    const mixedLookup = () => {
        const ids = [FEED_OK, HIDDEN, GONE, NSFW_COMMENT, NSFW_POST_REMOVED, NSFW_POST_NOINDEX]
        const authItemsMeta = {
            ...Object.fromEntries([FEED_OK, HIDDEN, GONE].map(id => [id, meta(id)])),
            [NSFW_COMMENT]: meta(NSFW_COMMENT, { over_18: true }),
            // the author's own view says it was removed
            [NSFW_POST_REMOVED]: {
                locked: false,
                created_utc: 1700000000,
                over_18: true,
                removed_by_category: 'moderator',
            },
            [NSFW_POST_NOINDEX]: { locked: false, created_utc: 1700000000, over_18: true, is_robot_indexable: false },
        }
        return lookupItemsByID_fromPublicProfile(ids, USER, authItemsMeta)
    }
    // the latest: the diagnostic log outlives each test's storage reset
    const lookupLine = async () =>
        (await getDiagEntries())
            .map(e => e.m)
            .filter(l => l.startsWith(`[reveddit] www lookup ${USER}:`))
            .at(-1)

    it("the lookup line counts what can't be checked logged out apart from removals and names only verdicts that aren't live", async () => {
        installFetch(defaultRoutes())
        await mixedLookup()
        const line = await lookupLine()
        expect(line).toContain(
            "6 requested, 6 returned (2 removed, 2 can't be checked logged out, 0 omitted/uncovered)",
        )
        expect(line).toContain(`absentVerdicts={"${GONE}":"removed"} +1 live, routes=`)
        expect(line).not.toContain(HIDDEN)
    })

    it("names what can't be checked once, in the copied log's header, by id only with the username", async () => {
        installFetch(defaultRoutes())
        await mixedLookup()
        expect(__getLocalStorage()[PUBLIC_VIEW_UNCHECKED_KEY].ids).toEqual({
            [NSFW_COMMENT]: 'NSFW',
            [NSFW_POST_NOINDEX]: 'NSFW',
        })
        // The default copy leaves the username out, and an id would lead back to it
        expect(await getPublicViewUncheckedLine()).toMatch(/^can't be checked logged out: 2 NSFW; as of \d{4}-/)
        expect(await getPublicViewUncheckedLine(true)).toMatch(
            new RegExp(
                `^can't be checked logged out: ${NSFW_COMMENT} \\(NSFW\\), ${NSFW_POST_NOINDEX} \\(NSFW\\); as of \\d{4}-`,
            ),
        )
    })

    it("rewrites the header's set only when it changes, or after half an hour", async () => {
        installFetch(defaultRoutes())
        await mixedLookup()
        const earlier = Date.now() - 60 * 1000
        __getLocalStorage()[PUBLIC_VIEW_UNCHECKED_KEY].t = earlier
        await mixedLookup()
        expect(__getLocalStorage()[PUBLIC_VIEW_UNCHECKED_KEY].t).toBe(earlier)

        __getLocalStorage()[PUBLIC_VIEW_UNCHECKED_KEY].t = Date.now() - 31 * 60 * 1000
        await mixedLookup()
        expect(__getLocalStorage()[PUBLIC_VIEW_UNCHECKED_KEY].t).toBeGreaterThan(earlier)

        await lookupItemsByID_fromPublicProfile([HIDDEN], USER, { [HIDDEN]: meta(HIDDEN) })
        expect(__getLocalStorage()[PUBLIC_VIEW_UNCHECKED_KEY].ids).toEqual({})
        expect(await getPublicViewUncheckedLine()).toMatch(/^can't be checked logged out: none; as of /)
    })

    it('the header says when no lookup has recorded anything yet', () => {
        expect(formatPublicViewUnchecked(null)).toBe("can't be checked logged out: no lookup recorded")
        const stored = { ids: { t1_a: 'private', t1_b: 'NSFW', t3_c: 'private' }, t: 0 }
        expect(formatPublicViewUnchecked(stored)).toBe(
            "can't be checked logged out: 2 private, 1 NSFW; as of 1970-01-01T00:00:00.000Z",
        )
        expect(formatPublicViewUnchecked(stored, true)).toBe(
            "can't be checked logged out: t1_a (private), t1_b (NSFW), t3_c (private); as of 1970-01-01T00:00:00.000Z",
        )
    })
})

// Remote safety valve (MECHANISM_ABSENT_UNVERIFIED_UNKNOWN): an absent comment
// that no page explicitly confirmed is omitted, never reported removed.
describe('absentUnverifiedIsUnknown remote option', () => {
    const cacheWith = mechanisms => ({
        news_cache: { feed: { messages: [], options: { mechanisms } }, lastFetched: 1 },
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
        await expect(lookupItemsByID([GONE], 'none', false, USER, { [GONE]: meta(GONE) })).rejects.toThrow(
            /^www profile lookup invalid: www\.reddit\.com request failed: 403 \(refused: .*\); legacy fallback: legacy reddit HTML request failed: 403 \(legacy endpoints disabled\)$/,
        )
    })
})

// A profile whose comments tab is hidden from logged-out visitors (reported
// 2026-10-25: every check stopped at "comments page unrecognized")
describe('a profile that hides its comments from logged-out visitors', () => {
    const hiddenStatePage = type =>
        `<shreddit-feed navigation-session-id="x"><div class="text-body-1">u/${USER} likes to keep their ${type} ` +
        `hidden, but check out their stats to learn more about them.</div></shreddit-feed>`

    it("checks each comment on its own page, and doesn't take the hidden tab for a shadowban", async () => {
        const calls = installFetch([
            [`/user/${USER}/comments/?sort=new`, hiddenStatePage('comments')],
            [`/user/${USER}/submitted/?sort=new`, emptyStatePage('posts')],
            [THREAD_PAGES[HIDDEN], commentsPage(commentEl(HIDDEN, USER), HIDDEN)],
            [THREAD_PAGES[GONE], commentsPage(commentEl('t1_other11', 'SomeoneElse'), GONE)],
        ])
        const results = await lookupItemsByID_fromPublicProfile([HIDDEN, GONE], USER, {
            [HIDDEN]: meta(HIDDEN),
            [GONE]: meta(GONE),
        })
        const byId = Object.fromEntries(results.map(r => [r.data.name, r.data]))
        expect(byId[HIDDEN].author).toBe(USER)
        expect(byId[GONE].author).toBe('[deleted]')
        expect(calls.some(u => u.includes(THREAD_PAGES[GONE]))).toBe(true)
        expect(__getLocalStorage().error_status).toBeUndefined()
    })

    it('with page verification switched off, a hidden kind is omitted, never reported removed', async () => {
        __resetStorage(
            {},
            { news_cache: { feed: { messages: [], options: { mechanisms: { absentPageVerification: 'off' } } }, lastFetched: 1 } },
        )
        installFetch([
            [`/user/${USER}/comments/?sort=new`, hiddenStatePage('comments')],
            [`/user/${USER}/submitted/?sort=new`, emptyStatePage('posts')],
        ])
        const results = await lookupItemsByID_fromPublicProfile([HIDDEN, GONE], USER, {
            [HIDDEN]: meta(HIDDEN),
            [GONE]: meta(GONE),
        })
        expect(results).toEqual([])
    })

    it("re-reads a young comment's 'live' soon, an old one's only after hours", async () => {
        const nowSec = Math.floor(Date.now() / 1000)
        const twentyMinutesAgo = Date.now() - 20 * 60 * 1000
        __resetStorage(
            {},
            {
                www_absent_item_verdicts: {
                    [HIDDEN]: { v: 'live', t: twentyMinutesAgo },
                    [GONE]: { v: 'live', t: twentyMinutesAgo },
                },
            },
        )
        const calls = installFetch([
            [`/user/${USER}/comments/?sort=new`, hiddenStatePage('comments')],
            [`/user/${USER}/submitted/?sort=new`, emptyStatePage('posts')],
            [THREAD_PAGES[HIDDEN], commentsPage(commentEl(HIDDEN, USER), HIDDEN)],
            [THREAD_PAGES[GONE], commentsPage(commentEl('t1_other11', 'SomeoneElse'), GONE)],
        ])
        const results = await lookupItemsByID_fromPublicProfile([HIDDEN, GONE], USER, {
            // a day old: its 'live' lasts 3 h
            [HIDDEN]: meta(HIDDEN, { created_utc: nowSec - 24 * 3600 }),
            // an hour old: its 'live' lasts 10 minutes, so it's read again, and is gone
            [GONE]: meta(GONE, { created_utc: nowSec - 3600 }),
        })
        expect(calls.some(u => u.includes(THREAD_PAGES[HIDDEN]))).toBe(false)
        expect(calls.some(u => u.includes(THREAD_PAGES[GONE]))).toBe(true)
        const byId = Object.fromEntries(results.map(r => [r.data.name, r.data]))
        expect(byId[HIDDEN].author).toBe(USER)
        expect(byId[GONE].author).toBe('[deleted]')
    })

    it("gives the legacy tiebreak canaries from comments recently read live, when none is in the feed", async () => {
        const asked = []
        stubLegacy(async ids => {
            asked.push(...ids)
            return []
        })
        __resetStorage({}, { www_absent_item_verdicts: { t1_known1: { v: 'live', t: Date.now() - 60 * 1000 } } })
        installFetch([
            [`/user/${USER}/comments/?sort=new`, hiddenStatePage('comments')],
            [`/user/${USER}/submitted/?sort=new`, emptyStatePage('posts')],
            // the comment's own page can't be read: the tiebreak decides
            [THREAD_PAGES[GONE], FRONT_PAGE],
        ])
        await lookupItemsByID_fromPublicProfile([GONE], USER, { [GONE]: meta(GONE) })
        expect(asked).toEqual([GONE, 't1_known1'])
    })
})

describe('profile lookup warnings and limits', () => {
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

    it('a profile 429 ends the lookup without the legacy chain', async () => {
        const calls = []
        globalThis.fetch = async url => {
            calls.push(String(url))
            return { ok: false, status: 429, text: async () => '' }
        }
        await expect(
            lookupItemsByID([GONE, 't3_q1'], 'none', false, USER, { [GONE]: meta(GONE) }),
        ).rejects.toThrow(/429/)
        expect(__getLocalStorage().rate_limit_until).toBeGreaterThan(Date.now())
        // the chain would queue the post first, then ask the legacy hosts
        expect(__getLocalStorage().pending_post_lookups).toBeUndefined()
        expect(calls.every(u => u.includes(`/user/${USER}/`))).toBe(true)
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
})
