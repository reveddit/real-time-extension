// Held and spam-filtered posts linger in the public feed, so young ones get
// their own page read while a www tab can fetch: at the permalink, which
// doesn't redirect (a redirect drops a solved challenge), solving a challenge.

// Install chrome global BEFORE any source import
import '../mocks/chrome-api.js'

import { describe, it, expect } from 'vitest'
import browserMock, { __resetStorage, __getLocalStorage } from '../mocks/webextension-polyfill.js'
import { lookupItemsByID, lookupItemsByID_fromPublicProfile } from '../../src/src/requests'
import {
    USER,
    thingIdEl,
    emptyStatePage,
    commentsPage,
    FRONT_PAGE,
    GONE,
    FEED_OK,
    meta,
    installFetch,
    useLegacyStub,
} from '../mocks/public-profile.js'

useLegacyStub()

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

describe('post page verdicts and the backoff', () => {
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
        const results = await lookupItemsByID([FEED_OK, GONE, ...POSTS], 'none', false, USER, authItemsMeta)
        // the first post page's 429, then nothing more
        expect(pageCalls).toHaveLength(1)
        expect(__getLocalStorage().rate_limit_until).toBeGreaterThan(Date.now())
        expect(__getLocalStorage().rate_limit_level).toBe(1)
        // the absent comment got no verdict: no news
        expect(results.map(r => r.data.name)).not.toContain(GONE)
    })

    it("a post verdict 0.0.5.27's classifier cached as removed is read again, not reused", async () => {
        const YOUNG = 't3_young1'
        __resetStorage({}, { www_post_page_verdicts: { [YOUNG]: { v: 'removed', t: Date.now() - 60 * 1000 } } })
        const pageCalls = []
        globalThis.fetch = async url => {
            const u = String(url)
            if (u.includes(`/user/${USER}/comments/`))
                return { ok: true, status: 200, text: async () => emptyStatePage('comments') }
            if (u.includes(`/user/${USER}/submitted/`)) return { ok: true, status: 200, text: async () => thingIdEl(YOUNG) }
            pageCalls.push(u)
            return {
                ok: true,
                status: 200,
                text: async () =>
                    `<html><body><shreddit-post id="${YOUNG}" author="${USER}" subreddit-name="s" ` +
                    `post-title="Why was my post removed by moderators?"></shreddit-post></body></html>`,
            }
        }
        const results = await lookupItemsByID_fromPublicProfile([YOUNG], USER, {
            [YOUNG]: { locked: false, created_utc: now() - 3600 },
        })
        expect(pageCalls).toHaveLength(1)
        expect(results.find(r => r.data.name === YOUNG).data.is_robot_indexable).toBe(true)
        expect(__getLocalStorage().www_post_page_verdicts[YOUNG]).toMatchObject({ v: 'live', k: 2 })
    })
})
