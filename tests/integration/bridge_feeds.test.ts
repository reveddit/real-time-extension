// reveddit.com's user pages read a person's comment feed and each comment
// missing from the profile through the bridge (bridge.ts): two more paths on
// its closed list, read at the scans' pace and within half the bridge's
// window, the feed answered as a comments listing and a check with a verdict.

// Install chrome global BEFORE any source import
import '../mocks/chrome-api.js'

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import browserMock, { __resetStorage, makeStorageArea } from '../mocks/webextension-polyfill.js'
import { json, res, blockPage } from '../mocks/responses.js'
import { entry, feed, postEntry } from '../mocks/feeds.js'

let cycleBusy = false
vi.mock('../../src/src/monitoring', () => ({ isCycleInFlight: () => cycleBusy }))

import { validateBridgeUrl, handleBridgeFetch, toPublicView, _bridgeChecks } from '../../src/src/bridge.ts'
import { feedListing } from '../../src/src/feed-listing.ts'
import { _resetLoggedInFetchState } from '../../src/src/logged-in-fetch.ts'
import { _scanTurn } from '../../src/src/requests.ts'
import { NEWS_CACHE_KEY, MECHANISM_SCAN_FEEDS } from '../../src/src/news.ts'
import { PUBLIC_PROFILE_UNAVAILABLE_KEY } from '../../src/src/lookup-status.ts'

const www = 'https://www.reddit.com'
const FEED_URL = `${www}/user/bob/comments/.rss?sort=new&limit=100`
const CHECK_URL = `${www}/comments/post/_/c2.json?limit=1&depth=1&raw_json=1`

// The feed's content is HTML escaped once into the XML, so bold comes as <strong>
const ATOM = feed(
    entry('t1_c1', 'bob', 'live words'),
    entry('t1_c2', 'bob', 'removed &lt;strong&gt;words&lt;/strong&gt;'),
)
const atom = (status = 200, body = ATOM, headers: Record<string, string> = {}) => ({
    ...res(status, body, 'application/atom+xml; charset=UTF-8'),
    headers: {
        get: (name: string) => ({ 'content-type': 'application/atom+xml', ...headers })[name.toLowerCase()] ?? null,
    },
})
const thread = (...comments: any[]) => [
    { kind: 'Listing', data: { children: [{ kind: 't3', data: { name: 't3_post', author: 'op' } }] } },
    { kind: 'Listing', data: { children: comments.map(data => ({ kind: 't1', data })) } },
]

const savedCookies = (browserMock as any).cookies
const loggedIn = () => {
    ;(browserMock as any).cookies = {
        get: vi.fn(async ({ name }: { name: string }) => (name === 'reddit_session' ? { name, value: 'x' } : null)),
    }
}

beforeEach(() => {
    __resetStorage({}, { last_logged_in_user: 'alice' })
    delete (browserMock as any).storage.session
    cycleBusy = false
    _scanTurn.next = 0
    _bridgeChecks.times = []
    _bridgeChecks.restUntil = 0
    _resetLoggedInFetchState()
    loggedIn()
    globalThis.fetch = vi.fn(async () => atom())
})
afterEach(() => {
    ;(browserMock as any).cookies = savedCookies
    vi.useRealTimers()
})

// The next ask comes after the scans' pace, as the site waits it out
const afterThePace = () => (_scanTurn.next = 0)

describe('the two paths on the closed list', () => {
    it("accepts a person's comment feed and a comment's permalink in their measured forms", () => {
        expect(validateBridgeUrl(FEED_URL)).toBe(FEED_URL)
        expect(validateBridgeUrl(`${www}/user/bob/comments/.rss?sort=top&t=month&limit=100&after=t1_abc`)).toBeTruthy()
        expect(validateBridgeUrl(`${www}/user/bob/comments/.rss`)).toBeTruthy()
        expect(validateBridgeUrl(CHECK_URL)).toBe(CHECK_URL)
    })

    it("refuses any other parameter, so a login read can't become a private feed", () => {
        for (const url of [
            `${FEED_URL}&feed=abc123&user=bob`,
            `${FEED_URL}&jsonp=cb`,
            `${www}/user/bob/comments/.rss?sort=new&sort=top`,
            `${www}/user/bob/comments/.rss?sort=best`,
            `${www}/user/bob/comments/.rss?limit=500`,
            `${www}/user/bob/comments/.rss?after=t3_post`,
            `${www}/user/bob/comments/.rss?after=t1_abc&before=t1_def`,
            `${www}/comments/post/_/c2.json?limit=1&depth=1`,
            `${www}/comments/post/_/c2.json?limit=1&depth=1&raw_json=1&context=8`,
            `${www}/comments/post/_/c2.json?limit=100&depth=1&raw_json=1`,
        ]) {
            expect(validateBridgeUrl(url), url).toBeNull()
        }
    })

    it("refuses the viewer's own feeds and other feeds", () => {
        for (const url of [
            `${www}/user/me/comments/.rss`,
            `${www}/user/bob/saved/.rss`,
            `${www}/user/bob/.rss`,
            `${www}/message/inbox/.rss`,
            `${www}/user/bob/comments/.rss/extra`,
            `https://old.reddit.com/user/bob/comments/.rss`,
        ]) {
            expect(validateBridgeUrl(url), url).toBeNull()
        }
    })
})

describe('the feed, read into a comments listing', () => {
    it('gives each comment its fields, the body as markdown, in the feed order', () => {
        const listing = feedListing(ATOM)
        expect(listing.kind).toBe('Listing')
        expect(listing.data.after).toBe('t1_c2')
        const [c1, c2] = listing.data.children.map((child: any) => child.data)
        expect(c1).toMatchObject({
            name: 't1_c1',
            id: 'c1',
            author: 'bob',
            subreddit: 'sub',
            link_id: 't3_post',
            link_title: 'A title',
            permalink: '/r/sub/comments/post/a_title/c1/',
        })
        expect(c1.created_utc).toBeGreaterThan(0)
        expect(c2.body).toBe('removed **words**')
    })

    it('leaves posts out, and has no after when empty', () => {
        const listing = feedListing(feed(postEntry()))
        expect(listing.data.children).toEqual([])
        expect(listing.data.after).toBeNull()
    })

    it("refuses a cut-off feed, a page that isn't one, and an empty body", () => {
        for (const text of [ATOM.slice(0, -20), '<html><body>challenge</body></html>', '']) {
            expect(() => feedListing(text)).toThrow('not_a_feed')
        }
    })
})

describe('reading the feed through the bridge', () => {
    it("answers the parsed listing, read with the login and the browser's cache skipped, with the scans' reads per click", async () => {
        const resp: any = await handleBridgeFetch({ url: FEED_URL })
        expect(resp).toMatchObject({ ok: true, status: 200, view: 'logged_in', readsPerClick: 20 })
        expect(resp.own).toBeFalsy()
        expect(resp.data.data.children.map((c: any) => c.data.name)).toEqual(['t1_c1', 't1_c2'])
        expect(globalThis.fetch).toHaveBeenCalledWith(
            FEED_URL,
            expect.objectContaining({ credentials: 'include', cache: 'no-store' }),
        )
    })

    it('says when the feed is the account the bridge reads as', async () => {
        const resp: any = await handleBridgeFetch({ url: `${www}/user/Alice/comments/.rss?sort=new&limit=100` })
        expect(resp.own).toBe(true)
    })

    it("answers 404 for the user's own feed while monitoring sees the shadowban signature", async () => {
        __resetStorage(
            {},
            { last_logged_in_user: 'alice', [PUBLIC_PROFILE_UNAVAILABLE_KEY]: { user: 'alice', t: Date.now() } },
        )
        const resp: any = await handleBridgeFetch({ url: `${www}/user/alice/comments/.rss?sort=new&limit=100` })
        expect(resp).toMatchObject({ ok: false, status: 404 })
        expect(globalThis.fetch).not.toHaveBeenCalled()
    })

    it("asks the page to wait out the scans' pace, without counting it or sending anything", async () => {
        await handleBridgeFetch({ url: FEED_URL })
        const second: any = await handleBridgeFetch({ url: FEED_URL })
        expect(second).toMatchObject({ ok: false, error: 'wait' })
        expect(second.retryAfterMs).toBeGreaterThan(0)
        expect(second.retryAfterMs).toBeLessThanOrEqual(3000)
        expect(globalThis.fetch).toHaveBeenCalledTimes(1)
        expect(_bridgeChecks.times).toHaveLength(1)
    })

    it('keeps at least 3 s between these reads, even when scans are set faster', async () => {
        __resetStorage({ options: { scan_seconds_between_reads: 1 } }, { last_logged_in_user: 'alice' })
        await handleBridgeFetch({ url: FEED_URL })
        const second: any = await handleBridgeFetch({ url: FEED_URL })
        expect(second.retryAfterMs).toBeGreaterThan(2000)
    })

    it('sends nothing while the remote option turns feeds off', async () => {
        __resetStorage(
            {},
            {
                last_logged_in_user: 'alice',
                [NEWS_CACHE_KEY]: {
                    t: Date.now(),
                    feed: { options: { mechanisms: { [MECHANISM_SCAN_FEEDS]: 'off' } } },
                },
            },
        )
        const resp: any = await handleBridgeFetch({ url: FEED_URL })
        expect(resp).toMatchObject({ ok: false, error: 'feeds_off' })
        expect(globalThis.fetch).not.toHaveBeenCalled()
    })

    it("uses at most half the bridge's window, kept where Chrome's worker stopping doesn't lose it", async () => {
        const session: Record<string, any> = {}
        ;(browserMock as any).storage.session = makeStorageArea(() => session)
        // 49 of these reads in the last ten minutes, then one more
        _bridgeChecks.times = Array.from({ length: 49 }, (_, i) => Date.now() - 60 * 1000 - i)
        expect((await handleBridgeFetch({ url: FEED_URL })).ok).toBe(true)
        // the worker stops: memory goes, the session's copy stays
        _bridgeChecks.times = []
        afterThePace()
        delete session.scan_turn_next
        const refused: any = await handleBridgeFetch({ url: FEED_URL })
        expect(refused).toMatchObject({ ok: false, error: 'budget_exhausted' })
        // until the oldest leaves the window
        expect(refused.retryAfterMs).toBeGreaterThan(8 * 60 * 1000)
        expect(globalThis.fetch).toHaveBeenCalledTimes(1)
    })

    it('forgets reads from a clock that was set back', async () => {
        _bridgeChecks.times = Array.from({ length: 60 }, () => Date.now() + 3600 * 1000)
        expect((await handleBridgeFetch({ url: FEED_URL })).ok).toBe(true)
    })

    it("stops these reads when Reddit's rate headers run low, until they reset", async () => {
        globalThis.fetch = vi.fn(async () =>
            atom(200, ATOM, { 'x-ratelimit-remaining': '12.0', 'x-ratelimit-reset': '240' }),
        )
        expect((await handleBridgeFetch({ url: FEED_URL })).ok).toBe(true)
        afterThePace()
        const stopped: any = await handleBridgeFetch({ url: FEED_URL })
        expect(stopped).toMatchObject({ ok: false, error: 'reddit_limit' })
        expect(stopped.retryAfterMs).toBeGreaterThan(200 * 1000)
        expect(globalThis.fetch).toHaveBeenCalledTimes(1)
    })

    it("answers not_a_feed for a page that isn't one, and block_page when both modes get the edge's page", async () => {
        globalThis.fetch = vi.fn(async () => atom(200, '<html>challenge</html>'))
        expect(await handleBridgeFetch({ url: FEED_URL })).toMatchObject({ ok: false, error: 'not_a_feed' })
        afterThePace()
        globalThis.fetch = vi.fn(async () => blockPage())
        expect(await handleBridgeFetch({ url: FEED_URL })).toMatchObject({ ok: false, error: 'block_page' })
        // the second mode was tried, and counted
        expect(globalThis.fetch).toHaveBeenCalledTimes(2)
    })

    it("lets a feed's own answer end a remembered block, so the next block page gets its retry", async () => {
        globalThis.fetch = vi.fn(async () => blockPage())
        await handleBridgeFetch({ url: FEED_URL })
        afterThePace()
        globalThis.fetch = vi.fn(async () => atom())
        expect((await handleBridgeFetch({ url: FEED_URL })).ok).toBe(true)
        afterThePace()
        globalThis.fetch = vi.fn(async () => blockPage())
        await handleBridgeFetch({ url: FEED_URL })
        expect(globalThis.fetch).toHaveBeenCalledTimes(2)
    })

    it("answers Reddit's own 403 for one person's feed as it came, so the page can tell it apart", async () => {
        globalThis.fetch = vi.fn(async () => json(403, { message: 'Forbidden', error: 403 }))
        const resp: any = await handleBridgeFetch({ url: FEED_URL })
        expect(resp).toMatchObject({ ok: false, status: 403 })
        expect(resp.error).toBeUndefined()
    })

    it('a 429 enters the shared backoff', async () => {
        globalThis.fetch = vi.fn(async () => res(429, ''))
        await handleBridgeFetch({ url: FEED_URL })
        afterThePace()
        expect(await handleBridgeFetch({ url: FEED_URL })).toMatchObject({ ok: false, error: 'rate_limited' })
    })
})

describe('checking one comment on its permalink', () => {
    const check = async (answer: any) => {
        globalThis.fetch = vi.fn(async () => answer)
        return (await handleBridgeFetch({ url: CHECK_URL })) as any
    }

    it('reads it removed when Reddit leaves it out and the post came back', async () => {
        const resp = await check(json(200, thread()))
        expect(resp).toMatchObject({ ok: true, verdict: 'removed' })
    })

    it('reads it removed when it shows [removed], and live when it shows its words', async () => {
        expect(
            (await check(json(200, thread({ name: 't1_c2', author: '[deleted]', body: '[removed]' })))).verdict,
        ).toBe('removed')
        afterThePace()
        expect((await check(json(200, thread({ name: 't1_c2', author: 'bob', body: 'words' })))).verdict).toBe('live')
    })

    it("reads it removed in a moderator's view, which the public view rewrites", async () => {
        const resp = await check(json(200, thread({ name: 't1_c2', author: 'bob', body: 'words', removed: true })))
        expect(resp.verdict).toBe('removed')
        expect(resp.data[1].data.children[0].data.body).toBe('[removed]')
    })

    it('has no verdict for the wrong post, another comment in its place, or one deleted by its author', async () => {
        const wrongPost = thread()
        wrongPost[0].data.children[0].data.name = 't3_other'
        expect((await check(json(200, wrongPost))).verdict).toBe('unknown')
        afterThePace()
        expect((await check(json(200, thread({ name: 't1_zz', author: 'x', body: 'y' })))).verdict).toBe('unknown')
        afterThePace()
        expect(
            (await check(json(200, thread({ name: 't1_c2', author: '[deleted]', body: '[deleted]' })))).verdict,
        ).toBe('unknown')
    })

    it("is paced and counted with the feed's reads", async () => {
        await check(json(200, thread()))
        const second: any = await handleBridgeFetch({ url: CHECK_URL })
        expect(second).toMatchObject({ ok: false, error: 'wait' })
        expect(_bridgeChecks.times).toHaveLength(1)
    })
})

describe('what the public view marks removed', () => {
    it('flags a known-removed post too', () => {
        const view = toPublicView(
            {
                kind: 'Listing',
                data: {
                    children: [{ kind: 't3', data: { name: 't3_p', author: 'bob', is_self: true, selftext: 'x' } }],
                },
            },
            { knownRemoved: new Set(['t3_p']), me: '', verifiedLive: new Set() },
        )
        expect(view.data.children[0].data.reveddit_removed).toBe(true)
    })

    it('carries a flag, so the page trusts it and not the text an author can type', () => {
        const view = toPublicView(
            {
                kind: 'Listing',
                data: {
                    children: [
                        { kind: 't1', data: { name: 't1_a', author: 'bob', body: 'words', removed: true } },
                        { kind: 't1', data: { name: 't1_b', author: 'bob', body: '[removed]' } },
                    ],
                },
            },
            { knownRemoved: new Set(), me: '', verifiedLive: new Set() },
        )
        const [a, b] = view.data.children.map((c: any) => c.data)
        expect(a.reveddit_removed).toBe(true)
        expect(b.reveddit_removed).toBeUndefined()
    })
})
