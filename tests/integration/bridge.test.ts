// Bridge URL validation and budget: the bridge is a closed allowlist of public
// reddit JSON endpoints, never a URL proxy, and its window budget halves for
// an hour after a 429 (mirroring computeAbsentVerifyBudget). Its fetches carry
// the user's login, so what it returns is rewritten to the logged-out view.

// Install chrome global BEFORE any source import
import '../mocks/chrome-api.js'

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import browserMock, { __resetStorage, __getLocalStorage } from '../mocks/webextension-polyfill.js'

// A monitoring cycle in flight, as the bridge sees it
let cycleBusy = false
vi.mock('../../src/src/monitoring', () => ({ isCycleInFlight: () => cycleBusy }))

import {
    validateBridgeUrl,
    computeBridgeBudget,
    toPublicView,
    waitUntilIdle,
    handleBridgeFetch,
} from '../../src/src/bridge.ts'
import { _loggedInFetchState } from '../../src/src/logged-in-fetch.ts'
import { RECENT_RATE_LIMIT_WINDOW_MS, PUBLIC_PROFILE_UNAVAILABLE_KEY } from '../../src/src/requests.ts'

describe('validateBridgeUrl', () => {
    it('accepts the endpoints the website uses', () => {
        for (const url of [
            'https://www.reddit.com/api/info.json?id=t3_abc,t1_def&raw_json=1',
            'https://www.reddit.com/user/spez/comments.json?limit=100&sort=new',
            'https://www.reddit.com/user/spez/.json?sort=new&limit=100&t=all', // the user page's overview
            'https://www.reddit.com/user/spez/about/.json',
            'https://www.reddit.com/user/spez/moderated_subreddits/.json',
            'https://www.reddit.com/api/user_data_by_account_ids.json?ids=t2_abc',
            'https://www.reddit.com/api/username_available.json?user=spez',
            'https://www.reddit.com/r/CantSayAnything/new.json?limit=100',
            'https://www.reddit.com/r/CantSayAnything/about/.json',
            'https://www.reddit.com/r/sub/about/log.json?feed=7e9b27126097f51ae6c9cd5b049af34891da6ba6&user=publicmodlogs',
            'https://www.reddit.com/r/sub/about/spam.json?feed=7e9b27126097f51ae6c9cd5b049af34891da6ba6&user=publicmodlogs&limit=100',
            'https://www.reddit.com/r/pics+funny/new.json',
            'https://www.reddit.com/comments/abc123.json?limit=500',
            'https://www.reddit.com/r/sub/comments/abc123.json?sort=old',
            'https://www.reddit.com/search.json?q=url:x',
        ]) {
            expect(validateBridgeUrl(url), url).toBeTruthy()
        }
    })
    it('normalizes the /.json form and strips jsonp', () => {
        expect(validateBridgeUrl('https://www.reddit.com/user/spez/about/.json?jsonp=cb_1&raw_json=1')).toBe(
            'https://www.reddit.com/user/spez/about.json?raw_json=1',
        )
    })
    it('refuses other hosts, protocols, and paths', () => {
        for (const url of [
            'https://oauth.reddit.com/api/info.json?id=t3_abc', // page must rewrite first
            'https://old.reddit.com/api/info.json?id=t3_abc',
            'http://www.reddit.com/api/info.json?id=t3_abc',
            'https://www.reddit.com.evil.com/api/info.json',
            'https://www.reddit.com/api/v1/access_token',
            'https://www.reddit.com/api/submit.json',
            'https://www.reddit.com/user/spez/comments', // no .json
            'https://example.com/api/info.json',
            'not a url',
        ]) {
            expect(validateBridgeUrl(url), url).toBeNull()
        }
    })
    it('refuses paths whose answer depends on who is logged in', () => {
        for (const url of [
            'https://www.reddit.com/user/me.json',
            'https://www.reddit.com/user/me/.json',
            'https://www.reddit.com/user/me/comments.json',
            'https://www.reddit.com/user/ME/about.json',
            'https://www.reddit.com/r/mod/new.json',
            'https://www.reddit.com/r/friends/new.json',
            'https://www.reddit.com/r/pics+Mod/hot.json',
            'https://www.reddit.com/r/mod/about/log.json?feed=abc&user=publicmodlogs',
            // a mod log only through the publicmodlogs feed
            'https://www.reddit.com/r/sub/about/log.json',
            'https://www.reddit.com/r/sub/about/log.json?feed=abc',
            'https://www.reddit.com/r/sub/about/spam.json?feed=abc&user=someone',
        ]) {
            expect(validateBridgeUrl(url), url).toBeNull()
        }
    })
})

// A bridge request that arrives during a monitoring cycle waits for the cycle
// instead of being refused outright, up to a cap
describe('waitUntilIdle', () => {
    it('resolves true as soon as the cycle ends', async () => {
        let polls = 0
        const started = Date.now()
        expect(await waitUntilIdle(() => ++polls < 3, 1000, 10)).toBe(true)
        expect(polls).toBe(3)
        expect(Date.now() - started).toBeLessThan(500)
    })
    it('resolves false when the cycle outlasts the cap', async () => {
        const started = Date.now()
        expect(await waitUntilIdle(() => true, 60, 10)).toBe(false)
        expect(Date.now() - started).toBeGreaterThanOrEqual(55)
    })
    it('resolves true at once when nothing is running', async () => {
        expect(await waitUntilIdle(() => false, 0, 10)).toBe(true)
    })
})

describe('computeBridgeBudget', () => {
    it('halves the window budget after a recent 429', () => {
        const normal = computeBridgeBudget(null)
        expect(computeBridgeBudget(RECENT_RATE_LIMIT_WINDOW_MS + 1)).toBe(normal)
        expect(computeBridgeBudget(RECENT_RATE_LIMIT_WINDOW_MS - 1)).toBe(Math.floor(normal / 2))
    })
})

// Bridge fetches carry the user's reddit login, and reddit shows authors their
// own removed items intact. toPublicView marks the ones monitoring knows were
// removed, in the form the website reads, and turns the rest of the logged-in
// view back into the logged-out one.
describe('toPublicView', () => {
    const comment = (name: string, body: string, author = 'someone') => ({
        kind: 't1',
        data: { name, body, author, replies: '' as any } as Record<string, any>,
    })
    const post = (name: string, extra: Record<string, any> = {}) => ({
        kind: 't3',
        data: {
            name,
            author: 'someone',
            is_self: true,
            selftext: 'text',
            is_robot_indexable: true,
            ...extra,
        } as Record<string, any>,
    })
    const listing = (children: any[]) => ({ kind: 'Listing', data: { children } })
    const context = (knownRemoved: string[] = [], me = '', verifiedLive: string[] = []) => ({
        knownRemoved: new Set(knownRemoved),
        me,
        verifiedLive: new Set(verifiedLive),
    })

    it('marks known-removed comments removed wherever they sit in a thread', () => {
        const reply = comment('t1_reply', 'my reply')
        const top = comment('t1_top', 'my comment')
        top.data.replies = listing([reply])
        const other = comment('t1_other', 'their comment')
        const thread = [listing([post('t3_post')]), listing([top, other])]
        toPublicView(thread, context(['t1_top', 't1_reply']))
        expect(top.data).toMatchObject({ body: '[removed]', author: '[deleted]' })
        expect(reply.data).toMatchObject({ body: '[removed]', author: '[deleted]' })
        expect(other.data).toMatchObject({ body: 'their comment', author: 'someone' })
        expect(thread[0].data.children[0].data.is_robot_indexable).toBe(true)
    })
    it('marks known-removed posts the way the public view shows them', () => {
        const self = post('t3_self')
        const link = post('t3_link', { is_self: false, selftext: '' })
        toPublicView(listing([self, link]), context(['t3_self', 't3_link']))
        expect(self.data).toMatchObject({ is_robot_indexable: false, selftext: '[removed]', author: 'someone' })
        expect(link.data).toMatchObject({ is_robot_indexable: false, selftext: '' })
    })
    it('replaces the rendered text of what it marks removed', () => {
        const c = comment('t1_c', 'secret words')
        c.data.body_html = '&lt;div class="md"&gt;&lt;p&gt;secret words&lt;/p&gt;\n&lt;/div&gt;'
        const p = post('t3_p', { selftext_html: '&lt;!-- SC_OFF --&gt;secret&lt;!-- SC_ON --&gt;' })
        toPublicView(listing([c, p]), context(['t1_c', 't3_p']))
        expect(c.data.body_html).not.toContain('secret')
        expect(c.data.body_html).toContain('[removed]')
        expect(p.data.selftext_html).not.toContain('secret')
        expect(p.data.selftext_html).toContain('[removed]')
    })
    it('leaves items their authors deleted as they are', () => {
        const gone = comment('t1_gone', '[deleted]', '[deleted]')
        const gonePost = post('t3_gone', { author: '[deleted]', selftext: '[deleted]', is_robot_indexable: false })
        toPublicView(listing([gone, gonePost]), context(['t1_gone', 't3_gone']))
        expect(gone.data).toMatchObject({ body: '[deleted]', author: '[deleted]' })
        expect(gonePost.data.selftext).toBe('[deleted]')
    })
    it('marks what a moderator sees as removed, and leaves approved items alone', () => {
        // shapes seen through a moderator login on r/pushshift
        const byMod = comment('t1_mod', 'Unrelated question')
        Object.assign(byMod.data, { removed: true, banned_by: 'Watchful1', spam: false })
        const bySpamFilter = comment('t1_spam', 'buy now')
        Object.assign(bySpamFilter.data, { removed: false, banned_by: true, spam: true })
        const modPost = post('t3_mod', { removed: true, banned_by: 'Watchful1', removed_by_category: 'moderator' })
        const approved = comment('t1_ok', 'fine')
        Object.assign(approved.data, { removed: false, banned_by: null, spam: false, approved_by: 'Watchful1' })
        toPublicView(listing([byMod, bySpamFilter, modPost, approved]), context())
        expect(byMod.data).toMatchObject({ body: '[removed]', author: '[deleted]' })
        expect(bySpamFilter.data).toMatchObject({ body: '[removed]', author: '[deleted]' })
        expect(modPost.data).toMatchObject({ selftext: '[removed]', is_robot_indexable: false })
        expect(approved.data).toMatchObject({ body: 'fine', author: 'someone' })
    })
    it('gives fields only a logged-in viewer gets their logged-out values', () => {
        const c = comment('t1_c', 'hi')
        Object.assign(c.data, {
            likes: true,
            saved: true,
            mod_reports: [['spam', 'mod1']],
            user_reports: [['rude', 1]],
            num_reports: 2,
            approved_by: 'mod1',
            removed: false,
            approved: true,
            spam: false,
            ignore_reports: true,
            author_is_blocked: true,
            removal_reason: 'legal',
        })
        const sub = { kind: 't5', data: { display_name: 'pics', user_is_banned: true, user_is_moderator: true } }
        const account = { kind: 't2', data: { name: 'bob', is_friend: true } }
        const moderated = { kind: 'ModeratedList', data: [{ sr: 'pics', user_is_subscriber: true }] }
        toPublicView([listing([c]), sub, account, moderated], context())
        expect(c.data).toMatchObject({
            likes: null,
            saved: false,
            mod_reports: [],
            user_reports: [],
            num_reports: null,
            approved_by: null,
            author_is_blocked: false,
            // public: reddit shows it logged out too
            removal_reason: 'legal',
        })
        for (const key of ['removed', 'approved', 'spam', 'ignore_reports']) {
            expect(c.data, key).not.toHaveProperty(key)
        }
        expect(sub.data).toMatchObject({ display_name: 'pics', user_is_banned: null, user_is_moderator: null })
        expect(account.data.is_friend).toBe(false)
        expect(moderated.data[0]).toMatchObject({ sr: 'pics', user_is_subscriber: null })
        // fields the logged-in view didn't have aren't added
        expect(sub.data).not.toHaveProperty('likes')
    })
    it("flags the user's own items monitoring hasn't seen live, and no one else's", () => {
        const seen = comment('t1_seen', 'mine', 'Alice')
        const unseen = comment('t1_unseen', 'mine too', 'alice')
        const removed = comment('t1_removed', 'gone', 'alice')
        const theirs = comment('t1_theirs', 'not mine', 'bob')
        toPublicView(listing([seen, unseen, removed, theirs]), context(['t1_removed'], 'alice', ['t1_seen']))
        expect(seen.data.reveddit_unverified).toBeUndefined()
        expect(unseen.data.reveddit_unverified).toBe(true)
        expect(removed.data).toMatchObject({ body: '[removed]' })
        expect(removed.data.reveddit_unverified).toBeUndefined()
        expect(theirs.data.reveddit_unverified).toBeUndefined()
    })
    it('flags items by authors who blocked the user, so they are not taken for removals', () => {
        const blocked = comment('t1_blocked', '[unavailable]', '[unavailable]')
        const fine = comment('t1_fine', 'hello')
        toPublicView(listing([blocked, fine]), context())
        expect(blocked.data.reveddit_viewer_blocked).toBe(true)
        expect(fine.data.reveddit_viewer_blocked).toBeUndefined()
    })
    it('covers morechildren results', () => {
        const more = { json: { errors: [], data: { things: [comment('t1_more', 'loaded later')] } } }
        toPublicView(more, context(['t1_more']))
        expect(more.json.data.things[0].data).toMatchObject({ body: '[removed]', author: '[deleted]' })
    })
})

describe('handleBridgeFetch', () => {
    const URL_INFO = 'https://www.reddit.com/api/info.json?id=t1_a,t1_b'
    const savedCookies = (browserMock as any).cookies
    const json = (status: number, data: any, contentType = 'application/json; charset=UTF-8') => ({
        ok: status >= 200 && status < 300,
        status,
        headers: { get: (name: string) => (name.toLowerCase() === 'content-type' ? contentType : null) },
        json: async () => data,
    })
    const listingOf = (...items: any[]) => ({
        kind: 'Listing',
        data: { children: items.map(([name, author]) => ({ kind: 't1', data: { name, author, body: 'text' } })) },
    })
    const loggedIn = (names = ['reddit_session']) => {
        ;(browserMock as any).cookies = {
            get: vi.fn(async ({ name }: { name: string }) => (names.includes(name) ? { name, value: 'x' } : null)),
        }
    }

    beforeEach(() => {
        __resetStorage(
            {
                user_subscriptions: { alice: true, bob: true },
                removed_u_alice: { t1_a: { c: 1 } },
                removed_u_bob: { t1_b: { c: 1 } },
            },
            { last_logged_in_user: 'alice' },
        )
        cycleBusy = false
        _loggedInFetchState.preferredCacheMode = 0
        _loggedInFetchState.doubleBlockUntil = 0
        loggedIn()
        globalThis.fetch = vi.fn(async () => json(200, listingOf(['t1_a', 'alice'], ['t1_b', 'bob'])))
    })
    afterEach(() => {
        ;(browserMock as any).cookies = savedCookies
        vi.useRealTimers()
        vi.restoreAllMocks()
    })

    it("fetches with the user's cookies and returns the public view, marking the logged-in account's removals", async () => {
        const resp = await handleBridgeFetch({ url: URL_INFO })
        expect(resp.ok).toBe(true)
        expect(globalThis.fetch).toHaveBeenCalledWith(
            expect.stringContaining('https://www.reddit.com/api/info.json?id=t1_a'),
            expect.objectContaining({ credentials: 'include', cache: 'default' }),
        )
        const [a, b] = resp.data.data.children.map((c: any) => c.data)
        expect(a).toMatchObject({ body: '[removed]', author: '[deleted]' })
        // another subscribed account's record goes stale while alice is logged in
        expect(b).toMatchObject({ body: 'text', author: 'bob' })
    })

    it('refuses without a login cookie, before waiting on a monitoring cycle', async () => {
        loggedIn([])
        cycleBusy = true
        const started = Date.now()
        expect(await handleBridgeFetch({ url: URL_INFO })).toMatchObject({ ok: false, error: 'not_logged_in' })
        expect(Date.now() - started).toBeLessThan(1000)
        expect(globalThis.fetch).not.toHaveBeenCalled()
    })

    it('reads the login cookie names from the news feed', async () => {
        loggedIn(['session_v2'])
        expect(await handleBridgeFetch({ url: URL_INFO })).toMatchObject({ error: 'not_logged_in' })
        __getLocalStorage().news_cache = {
            feed: { messages: [], options: { mechanisms: {}, login_cookies: ['session_v2'] } },
            lastFetched: Date.now(),
        }
        expect((await handleBridgeFetch({ url: URL_INFO })).ok).toBe(true)
    })

    it('refuses what is not on the list without fetching', async () => {
        expect(await handleBridgeFetch({ url: 'https://www.reddit.com/user/me.json' })).toMatchObject({
            ok: false,
            error: 'invalid url',
        })
        expect(globalThis.fetch).not.toHaveBeenCalled()
    })

    it("answers 404 for the user's own profile while monitoring finds it missing logged out", async () => {
        __getLocalStorage()[PUBLIC_PROFILE_UNAVAILABLE_KEY] = { user: 'alice', t: Date.now() }
        for (const url of [
            'https://www.reddit.com/user/Alice/comments.json',
            'https://www.reddit.com/user/alice/.json',
            'https://www.reddit.com/user/alice/about.json',
            'https://www.reddit.com/user/alice/moderated_subreddits.json',
        ]) {
            expect(await handleBridgeFetch({ url }), url).toMatchObject({ ok: false, status: 404 })
        }
        expect(globalThis.fetch).not.toHaveBeenCalled()
        // someone else's profile is fetched as usual
        expect((await handleBridgeFetch({ url: 'https://www.reddit.com/user/bob/comments.json' })).ok).toBe(true)
    })

    it("a 429 enters the shared backoff; a resource's own 403 leaves the user's warning alone", async () => {
        globalThis.fetch = vi.fn(async () => json(403, { reason: 'private', message: 'Forbidden', error: 403 }))
        expect(await handleBridgeFetch({ url: URL_INFO })).toMatchObject({ ok: false, status: 403 })
        expect(globalThis.fetch).toHaveBeenCalledTimes(1)
        expect(__getLocalStorage().error_status).toBeUndefined()

        globalThis.fetch = vi.fn(async () => json(429, {}))
        expect(await handleBridgeFetch({ url: URL_INFO })).toMatchObject({ ok: false, status: 429 })
        expect(__getLocalStorage().error_status).toBe('rate_limited')
        expect(await handleBridgeFetch({ url: URL_INFO })).toMatchObject({ ok: false, error: 'rate_limited' })
    })

    it('retries a block page once in the other cache mode, and keeps the mode that answered', async () => {
        globalThis.fetch = vi.fn(async (_url: string, init: any) =>
            init.cache === 'default'
                ? json(403, null, 'text/html; charset=utf-8')
                : json(200, listingOf(['t1_c', 'carol'])),
        )
        expect((await handleBridgeFetch({ url: URL_INFO })).ok).toBe(true)
        expect((globalThis.fetch as any).mock.calls.map((c: any) => c[1].cache)).toEqual(['default', 'no-cache'])
        ;(globalThis.fetch as any).mockClear()
        await new Promise(r => setTimeout(r, 350))
        expect((await handleBridgeFetch({ url: URL_INFO })).ok).toBe(true)
        expect((globalThis.fetch as any).mock.calls.map((c: any) => c[1].cache)).toEqual(['no-cache'])
    })

    it('waits for a monitoring cycle, but answers busy rather than after the page has given up', async () => {
        vi.useFakeTimers()
        cycleBusy = true
        const pending = handleBridgeFetch({ url: URL_INFO })
        await vi.advanceTimersByTimeAsync(7000)
        expect(await pending).toMatchObject({ ok: false, error: 'busy' })
        expect(globalThis.fetch).not.toHaveBeenCalled()
    })

    it('a request that waited for a cycle is fetched once it ends', async () => {
        vi.useFakeTimers()
        cycleBusy = true
        const pending = handleBridgeFetch({ url: URL_INFO })
        await vi.advanceTimersByTimeAsync(2000)
        cycleBusy = false
        await vi.advanceTimersByTimeAsync(500)
        expect((await pending).ok).toBe(true)
        // the lane's spacing, so later tests' requests aren't queued behind a fake timer
        await vi.advanceTimersByTimeAsync(1000)
    })

    it('gives up on a fetch that would answer after the page has given up', async () => {
        vi.useFakeTimers()
        globalThis.fetch = vi.fn(
            (_url: string, init: any) =>
                new Promise((_, reject) =>
                    init.signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError'))),
                ),
        )
        const pending = handleBridgeFetch({ url: URL_INFO })
        await vi.advanceTimersByTimeAsync(9000)
        expect(await pending).toMatchObject({ ok: false, error: 'timeout' })
        await vi.advanceTimersByTimeAsync(1000)
    })
})

// Fixes from the 0.0.5.27 review (2026-10-22), applied 2026-10-24
describe('0.0.5.27 review fixes: the bridge', () => {
    const FEED = '7e9b27126097f51ae6c9cd5b049af34891da6ba6'
    const json = (status: number, data: any, contentType = 'application/json; charset=UTF-8') => ({
        ok: status >= 200 && status < 300,
        status,
        headers: { get: (name: string) => (name.toLowerCase() === 'content-type' ? contentType : null) },
        json: async () => data,
    })
    const savedCookies = (browserMock as any).cookies
    beforeEach(() => {
        __resetStorage({}, { last_logged_in_user: 'alice' })
        cycleBusy = false
        _loggedInFetchState.preferredCacheMode = 0
        _loggedInFetchState.doubleBlockUntil = 0
        ;(browserMock as any).cookies = { get: vi.fn(async () => ({ name: 'reddit_session', value: 'x' })) }
    })
    afterEach(() => {
        ;(browserMock as any).cookies = savedCookies
        vi.restoreAllMocks()
    })

    it('reads a mod log only through the one publicmodlogs feed, with one feed and one user', () => {
        const log = (q: string) => validateBridgeUrl(`https://www.reddit.com/r/sub/about/log.json?${q}`)
        expect(log(`feed=${FEED}&user=publicmodlogs&limit=100`)).not.toBeNull()
        expect(log(`feed=abc&user=publicmodlogs`)).toBeNull()
        expect(log(`feed=${FEED}&user=publicmodlogs&user=me`)).toBeNull()
        expect(log(`feed=${FEED}&feed=abc&user=publicmodlogs`)).toBeNull()
        expect(log(`feed=${FEED}&user=someone`)).toBeNull()
    })

    it("blanks the session's modhash and drops the account's own private fields", () => {
        const view = toPublicView(
            {
                kind: 'Listing',
                data: {
                    modhash: 'secret',
                    children: [
                        {
                            kind: 't3',
                            data: { name: 't3_x', author: 'bob', hidden: true, visited: true, removed_by: 'mod' },
                        },
                    ],
                },
            },
            { knownRemoved: new Set(), me: 'alice', verifiedLive: new Set() },
        )
        expect(view.data.modhash).toBe('')
        expect(view.data.children[0].data).toMatchObject({ hidden: false, visited: false, removed_by: null })

        const about = toPublicView(
            {
                kind: 't2',
                data: {
                    name: 'alice',
                    has_mail: true,
                    inbox_count: 4,
                    pref_nightmode: true,
                    seen_layout_switch: true,
                    pref_show_snoovatar: false,
                    has_verified_email: true,
                    removal_reason: null,
                },
            },
            { knownRemoved: new Set(), me: 'alice', verifiedLive: new Set() },
        )
        expect(about.data).toEqual({
            name: 'alice',
            pref_show_snoovatar: false,
            has_verified_email: true,
            removal_reason: null,
        })
    })

    it('counts the block-page retry as a request, remembers a double block, and keeps a mode that got past the edge', async () => {
        const URL = 'https://www.reddit.com/r/sub/about.json'
        // both modes blocked: the retry is skipped for a while
        globalThis.fetch = vi.fn(async () => json(403, null, 'text/html'))
        expect(await handleBridgeFetch({ url: URL })).toMatchObject({ ok: false, status: 403 })
        expect(globalThis.fetch).toHaveBeenCalledTimes(2)
        expect(_loggedInFetchState.doubleBlockUntil).toBeGreaterThan(Date.now())
        ;(globalThis.fetch as any).mockClear()
        await new Promise(r => setTimeout(r, 350))
        await handleBridgeFetch({ url: URL })
        expect(globalThis.fetch).toHaveBeenCalledTimes(1)

        // the other mode gets the resource's own JSON 403: past the edge, so that mode stays
        _loggedInFetchState.doubleBlockUntil = 0
        globalThis.fetch = vi.fn(async (_u: string, init: any) =>
            init.cache === 'default' ? json(403, null, 'text/html') : json(403, { reason: 'private' }),
        )
        await new Promise(r => setTimeout(r, 350))
        expect(await handleBridgeFetch({ url: URL })).toMatchObject({ ok: false, status: 403 })
        expect(_loggedInFetchState.preferredCacheMode).toBe(1)
    })

    it('says the answer is the logged-in view rewritten', async () => {
        globalThis.fetch = vi.fn(async () => json(200, { kind: 't5', data: { display_name: 'sub' } }))
        expect(await handleBridgeFetch({ url: 'https://www.reddit.com/r/sub/about.json' })).toMatchObject({
            ok: true,
            view: 'logged_in',
        })
    })
})

// Fixes from the 0.0.5.27 release review (2026-10-25)
describe('0.0.5.27 release review fixes: the public view', () => {
    const context = { knownRemoved: new Set<string>(), me: 'alice', verifiedLive: new Set<string>() }

    it("rewrites a crosspost's parents like any post", () => {
        const view = toPublicView(
            {
                kind: 'Listing',
                data: {
                    children: [
                        {
                            kind: 't3',
                            data: {
                                name: 't3_cross',
                                author: 'bob',
                                crosspost_parent_list: [
                                    {
                                        name: 't3_parent',
                                        author: 'carol',
                                        is_self: true,
                                        selftext: 'the original text',
                                        removed: true,
                                        banned_by: 'a_mod',
                                        mod_reports: [['spam', 'a_mod']],
                                        mod_note: 'note',
                                        likes: true,
                                        saved: true,
                                    },
                                ],
                            },
                        },
                    ],
                },
            },
            context,
        )
        const parent = view.data.children[0].data.crosspost_parent_list[0]
        expect(parent).toMatchObject({
            selftext: '[removed]',
            is_robot_indexable: false,
            banned_by: null,
            mod_reports: [],
            mod_note: null,
            likes: null,
            saved: false,
        })
        expect('removed' in parent).toBe(false)
    })

    it("resets the viewer's standing nested in an account's about", () => {
        const view = toPublicView(
            {
                kind: 't2',
                data: {
                    name: 'dave',
                    is_blocked: true,
                    subreddit: {
                        display_name: 'u_dave',
                        user_is_subscriber: true,
                        user_is_banned: false,
                        user_is_muted: false,
                        user_is_moderator: false,
                    },
                },
            },
            context,
        )
        expect(view.data.is_blocked).toBe(false)
        expect(view.data.subreddit).toEqual({
            display_name: 'u_dave',
            user_is_subscriber: null,
            user_is_banned: null,
            user_is_muted: null,
            user_is_moderator: null,
        })
    })

    it("hides a removed comment's author the way logged-out JSON does", () => {
        const view = toPublicView(
            {
                kind: 'Listing',
                data: {
                    children: [
                        {
                            kind: 't1',
                            data: {
                                name: 't1_x',
                                author: 'troll123',
                                author_fullname: 't2_9xyz',
                                author_flair_text: 'flair',
                                author_flair_richtext: [{ t: 'flair' }],
                                author_premium: true,
                                is_submitter: true,
                                body: 'the text',
                                removed: true,
                            },
                        },
                    ],
                },
            },
            context,
        )
        const comment = view.data.children[0].data
        expect(comment).toMatchObject({ author: '[deleted]', body: '[removed]', is_submitter: false })
        expect(Object.keys(comment).filter(k => k.startsWith('author_'))).toEqual([])
    })

    it("leaves private communities' items out, and answers their abouts and threads 403", async () => {
        const view = toPublicView(
            {
                kind: 'Listing',
                data: {
                    children: [
                        { kind: 't3', data: { name: 't3_pub', author: 'bob', subreddit_type: 'public' } },
                        { kind: 't3', data: { name: 't3_priv', author: 'bob', subreddit_type: 'private' } },
                        { kind: 't1', data: { name: 't1_priv', author: 'bob', body: 'x', subreddit_type: 'private' } },
                    ],
                },
            },
            context,
        )
        expect(view.data.children.map((c: any) => c.data.name)).toEqual(['t3_pub'])

        const more = toPublicView(
            {
                json: {
                    data: {
                        things: [
                            { kind: 't1', data: { name: 't1_pub', author: 'bob', body: 'x', subreddit_type: 'public' } },
                            { kind: 't1', data: { name: 't1_priv', author: 'bob', body: 'x', subreddit_type: 'private' } },
                        ],
                    },
                },
            },
            context,
        )
        expect(more.json.data.things.map((t: any) => t.data.name)).toEqual(['t1_pub'])
        const moderated = toPublicView(
            {
                kind: 'ModeratedList',
                data: [
                    { sr: 'pics', subreddit_type: 'public' },
                    { sr: 'secret', subreddit_type: 'private' },
                ],
            },
            context,
        )
        expect(moderated.data.map((e: any) => e.sr)).toEqual(['pics'])

        const savedCookies = (browserMock as any).cookies
        ;(browserMock as any).cookies = { get: vi.fn(async () => ({ name: 'reddit_session', value: 'x' })) }
        cycleBusy = false
        const ok = (data: any) => ({
            ok: true,
            status: 200,
            headers: { get: () => 'application/json; charset=UTF-8' },
            json: async () => data,
        })
        try {
            globalThis.fetch = vi.fn(async () => ok({ kind: 't5', data: { display_name: 'secret', subreddit_type: 'private' } }))
            expect(await handleBridgeFetch({ url: 'https://www.reddit.com/r/secret/about.json' })).toMatchObject({
                ok: false,
                status: 403,
                data: { reason: 'private' },
            })
            await new Promise(r => setTimeout(r, 350))
            globalThis.fetch = vi.fn(async () =>
                ok([
                    { kind: 'Listing', data: { children: [{ kind: 't3', data: { name: 't3_s', subreddit_type: 'private' } }] } },
                    { kind: 'Listing', data: { children: [] } },
                ]),
            )
            expect(await handleBridgeFetch({ url: 'https://www.reddit.com/r/secret/comments/s.json' })).toMatchObject({
                ok: false,
                status: 403,
            })
        } finally {
            ;(browserMock as any).cookies = savedCookies
        }
    })
})
