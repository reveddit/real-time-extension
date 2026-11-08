// Held and spam-filtered posts linger in the public feed, so young ones get
// their own page read while a www tab can fetch: at the permalink, which
// doesn't redirect (a redirect drops a solved challenge), solving a challenge.

// Install chrome global BEFORE any source import
import '../mocks/chrome-api.js'

import { describe, it, expect, vi } from 'vitest'
import browserMock, { __resetStorage, __getLocalStorage } from '../mocks/webextension-polyfill.js'
import { res } from '../mocks/responses.js'
import { lookupItemsByID, lookupItemsByID_fromPublicProfile } from '../../src/src/requests'
import { verifyFeedPresentPosts } from '../../src/src/page-verify'
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
            if (u.includes(`/user/${USER}/comments/`)) return res(200, emptyStatePage('comments'))
            if (u.includes(`/user/${USER}/submitted/`)) return res(200, POSTS.map(thingIdEl).join(''))
            pageCalls.push(u)
            return postPage(u)
        }
        return pageCalls
    }

    it('a 429 on a post page ends the verification loop', async () => {
        const pageCalls = servePosts(() => res(429, ''))
        await lookupItemsByID_fromPublicProfile(POSTS, USER, youngMeta())
        expect(pageCalls).toHaveLength(1)
        expect(__getLocalStorage().error_status).toBe('rate_limited')
    })

    it('a post once seen held keeps that history when its page later reads unknown', async () => {
        __resetStorage({}, { www_post_page_verdicts: { t3_young1: { v: 'held', t: Date.now() - 3 * 3600 * 1000 } } })
        servePosts(() => res(200, '<html><body>please wait</body></html>'))
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
            if (u.includes(`/user/${USER}/comments/`)) return res(200, commentsPage('') + thingIdEl(FEED_OK))
            if (u.includes(`/user/${USER}/submitted/`)) return res(200, POSTS.map(thingIdEl).join(''))
            pageCalls.push(u)
            return res(429, '')
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
            if (u.includes(`/user/${USER}/comments/`)) return res(200, emptyStatePage('comments'))
            if (u.includes(`/user/${USER}/submitted/`)) return res(200, thingIdEl(YOUNG))
            pageCalls.push(u)
            return res(
                200,
                `<html><body><shreddit-post id="${YOUNG}" author="${USER}" subreddit-name="s" ` +
                    `post-title="Why was my post removed by moderators?"></shreddit-post></body></html>`,
            )
        }
        const results = await lookupItemsByID_fromPublicProfile([YOUNG], USER, {
            [YOUNG]: { locked: false, created_utc: now() - 3600 },
        })
        expect(pageCalls).toHaveLength(1)
        expect(results.find(r => r.data.name === YOUNG).data.is_robot_indexable).toBe(true)
        expect(__getLocalStorage().www_post_page_verdicts[YOUNG]).toMatchObject({ v: 'live', k: 2 })
    })
})

describe('a post whose removal monitoring is counting', () => {
    const POST = 't3_young1'
    const page = banner =>
        `<html><body><shreddit-post id="${POST}" author="${USER}" post-title="t" subreddit-name="s">${banner}` +
        `</shreddit-post></body></html>`
    const HELD = page('<div slot="post-removed-banner">Post is awaiting moderator approval.</div>')
    const young = extra => ({ [POST]: { locked: false, created_utc: Math.floor(Date.now() / 1000) - 3600, ...extra } })
    const verify = async (authItemsMeta, fetchHtml) =>
        (await verifyFeedPresentPosts([POST], new Set([POST]), authItemsMeta, fetchHtml)).verdicts
    const cachedHeld = () =>
        __resetStorage({}, { www_post_page_verdicts: { [POST]: { v: 'held', t: Date.now(), k: 2 } } })
    // Past the 48 hours in which a listing may still show a held post
    const MATURE = 't3_mature1'
    const mature = extra => ({
        [MATURE]: { locked: false, created_utc: Math.floor(Date.now() / 1000) - 5 * 86400, ...extra },
    })
    const matureFeed = (...routes) =>
        installFetch([
            [`/user/${USER}/comments/?sort=new`, emptyStatePage('comments')],
            [`/user/${USER}/submitted/?sort=new`, thingIdEl(MATURE)],
            ...routes,
        ])

    it('is read again each cycle, so one held page cannot fill the count', async () => {
        cachedHeld()
        const fetchHtml = vi.fn(async () => page(''))
        expect(await verify(young({ confirming: true }), fetchHtml)).toEqual({ [POST]: 'live' })
        expect(fetchHtml).toHaveBeenCalledTimes(1)
    })

    it("a read that decides nothing is cached as unknown, so the held isn't counted again, and the next read waits half an hour", async () => {
        vi.useFakeTimers({ toFake: ['Date'] })
        const failed = async () => {
            throw new Error('www.reddit.com request failed: 403')
        }
        for (const undecided of [async () => FRONT_PAGE, failed]) {
            cachedHeld()
            expect(await verify(young({ confirming: true }), undecided)).toEqual({})
            expect(__getLocalStorage().www_post_page_verdicts[POST]).toMatchObject({ v: 'unknown', adverse: true })
            const next = vi.fn(async () => HELD)
            // Nor once monitoring has stopped counting it
            expect(await verify(young(), next)).toEqual({})
            vi.setSystemTime(Date.now() + 30 * 60 * 1000 - 1)
            expect(await verify(young({ confirming: true }), next)).toEqual({})
            expect(next).not.toHaveBeenCalled()
            vi.setSystemTime(Date.now() + 1)
            expect(await verify(young({ confirming: true }), next)).toEqual({ [POST]: 'held' })
            expect(next).toHaveBeenCalledTimes(1)
        }
    })

    it('names the posts it owed a read and could not decide: undecided, paced, or past the reads of a cycle', async () => {
        vi.spyOn(globalThis, 'setTimeout').mockImplementation(fn => {
            fn()
            return 0
        })
        const ids = Array.from({ length: 12 }, (_, i) => `t3_p${i}`)
        const authItemsMeta = { ...Object.fromEntries(ids.map(id => [id, young()[POST]])), ...mature() }
        // The first waits out an unknown, and of the ten read, the second's page decides nothing
        __resetStorage({}, { www_post_page_verdicts: { t3_p0: { v: 'unknown', t: Date.now(), k: 2 } } })
        const fetchHtml = vi.fn(async url => {
            const id = `t3_${url.match(/\/comments\/(\w+)\//)[1]}`
            return id === 't3_p2' ? FRONT_PAGE : page('').replaceAll(POST, id)
        })
        const all = [...ids, MATURE]
        const { verdicts, owed } = await verifyFeedPresentPosts(all, new Set(all), authItemsMeta, fetchHtml)
        expect(fetchHtml).toHaveBeenCalledTimes(10)
        expect(Object.keys(verdicts)).toHaveLength(9)
        expect([...owed].sort()).toEqual(['t3_p0', 't3_p11', 't3_p2'])
    })

    it("a mature one this path owes no read is live by the feed's presence, wherever its count began", async () => {
        const calls = matureFeed()
        const [result] = await lookupItemsByID_fromPublicProfile([MATURE], USER, mature({ confirming: true }))
        expect(result.data).toMatchObject({ name: MATURE, is_robot_indexable: true })
        expect(result.data._public_view_unverified).toBeUndefined()
        expect(calls.some(u => u.includes('/comments/mature1/'))).toBe(false)
    })

    it('in the feed with no page verdict this cycle, gets no result, so the count neither grows nor starts over', async () => {
        installFetch([
            [`/user/${USER}/comments/?sort=new`, emptyStatePage('comments')],
            [`/user/${USER}/submitted/?sort=new`, thingIdEl(POST)],
            ['/comments/young1/', FRONT_PAGE],
        ])
        expect(await lookupItemsByID_fromPublicProfile([POST], USER, young({ confirming: true }))).toEqual([])
        // Not counting it: the feed's presence stands
        __resetStorage()
        const [result] = await lookupItemsByID_fromPublicProfile([POST], USER, young())
        expect(result.data).toMatchObject({ name: POST, is_robot_indexable: true, _public_view_unverified: true })
    })

    it("is reused when monitoring isn't counting it", async () => {
        cachedHeld()
        const fetchHtml = vi.fn(async () => page(''))
        expect(await verify(young(), fetchHtml)).toEqual({ [POST]: 'held' })
        expect(fetchHtml).not.toHaveBeenCalled()
    })
})
