// Fixtures for the tests of lookupItemsByID_fromPublicProfile and the lookups
// around it (public_lookup, post_pages, capability_rests, followed_items):
// profile and comment pages modeled on live ones, a fetch that serves them by
// URL, and the seam that keeps the legacy parsers (HTMLRewriter, WASM) out.
import { beforeEach, afterEach } from 'vitest'
import browserMock, { __resetStorage } from './webextension-polyfill.js'
import { _legacyLookups } from '../../src/src/legacy-lookup'
import { _wwwRouteTiming } from '../../src/src/www-fetcher'

// The real legacy parsers run HTMLRewriter (WASM) which cannot load under
// vitest — always stub the seam so no test can reach them.
const originalLegacyLookups = { ..._legacyLookups }
export const stubLegacy = (commentsById, postByPath) => {
    _legacyLookups.commentsById = commentsById || (async () => [])
    _legacyLookups.postByPath = postByPath || (async () => ({ error: 'stubbed' }))
}

// Call once at the top of a test file: each test starts with empty storage and
// the stubbed seam, and leaves the seam and the tab query as it found them.
export const useLegacyStub = () => {
    const savedQuery = browserMock.tabs.query
    beforeEach(() => {
        __resetStorage()
        stubLegacy()
    })
    afterEach(() => {
        Object.assign(_legacyLookups, originalLegacyLookups)
        browserMock.tabs.query = savedQuery
    })
}

export const USER = 'testuser'

// no pause between fetch routes in these tests
_wwwRouteTiming.switchDelayMs = 0

// --- page fixtures (modeled on live pages, verified 2026-07-20) ---

export const thingIdEl = id => `<div thing-id="${id}" class="something"></div>`

export const emptyStatePage = type =>
    `<shreddit-feed navigation-session-id="x"><div>Welcome! u/${USER} doesn&#x27;t have any ${type} yet, ` +
    `but check out their stats to learn more about them.</div></shreddit-feed>`

export const commentEl = (id, author) =>
    `<shreddit-comment created="2019-10-12T00:53:40.750000+0000" author="${author}" ` +
    `thingId="${id}" depth="0" comment-position="0" comment-parent-positions="[]" ` +
    `permalink="/r/test/comments/abc123/comment/${id.slice(3)}/" score="1">` +
    `<div slot="comment">some text</div></shreddit-comment>`

// focalId: the comment the thread page was served for, which its tree names
// even when that comment is gone
export const commentsPage = (inner, focalId) =>
    `<html><body><shreddit-post class="block" id="t3_abc123" author="someone" ` +
    `subreddit-name="test" permalink="/r/test/comments/abc123/title/"></shreddit-post>` +
    `<shreddit-comment-tree id="comment-tree"${focalId ? ` thingId="${focalId}"` : ''} post-id="t3_abc123">` +
    `${inner}</shreddit-comment-tree></body></html>`

// The logged-out front page (trimmed), which reddit has served in place of
// permalinks: feed items, no comment tree
export const FRONT_PAGE =
    `<html><head><link rel="canonical" href="https://www.reddit.com/"></head><body><shreddit-feed>` +
    `<shreddit-post id="t3_feed1" author="someone" post-title="A feed post" subreddit-name="pics" ` +
    `permalink="/r/pics/comments/feed1/a/"></shreddit-post></shreddit-feed></body></html>`

// Absent from the feed, but live on its own page (profile-hidden subreddit)
export const HIDDEN = 't1_hidden1'
// Absent from the feed and from its own page (genuinely removed)
export const GONE = 't1_gone11'
// Present in the feed
export const FEED_OK = 't1_feedok1'

// The auth view's permalinks, in the API's form
export const PERMALINKS = {
    [HIDDEN]: `/r/hiddensub/comments/abc123/title/${HIDDEN.slice(3)}/`,
    [GONE]: `/r/somesub/comments/abc123/title/${GONE.slice(3)}/`,
}
// The comments' own pages, in the site's form: the API's form is only a
// redirect shell now (2026-10-17)
export const THREAD_PAGES = {
    [HIDDEN]: `/r/hiddensub/comments/abc123/comment/${HIDDEN.slice(3)}/`,
    [GONE]: `/r/somesub/comments/abc123/comment/${GONE.slice(3)}/`,
}
// What the API's form returned, trimmed
export const REDIRECT_SHELL =
    `<html><body><div id="shreddit-redirect"><ac-call delay="0" ` +
    `method="location.replace(&quot;${THREAD_PAGES[GONE]}&quot;)" target="window" trigger="init">` +
    `</ac-call></div></body></html>`

export const meta = (id, extra = {}) => ({
    locked: false,
    created_utc: 1700000000,
    permalink: PERMALINKS[id],
    link_id: 't3_abc123',
    ...extra,
})

export const installFetch = routes => {
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

export const defaultRoutes = () => [
    [`/user/${USER}/comments/?sort=new`, commentsPage('') + thingIdEl(FEED_OK)],
    [`/user/${USER}/submitted/?sort=new`, emptyStatePage('posts')],
    [THREAD_PAGES[HIDDEN], commentsPage(commentEl(HIDDEN, USER), HIDDEN)],
    // the comment's own thread page without the comment → removed
    [THREAD_PAGES[GONE], commentsPage(commentEl('t1_other11', 'SomeoneElse'), GONE)],
]
