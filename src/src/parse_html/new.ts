// Parser for logged-out www.reddit.com (Shreddit) profile pages.
//
// Reddit is deprecating unauthenticated old.reddit.com and .json access. The only
// remaining public view of a user's content is the server-rendered HTML on
// www.reddit.com. Removal detection works by comparing the authenticated view
// (all the user's items) against this public view: items missing from the public
// profile are removed. Removed items do not appear with an "[removed]" marker —
// they are simply absent.
//
// Only item IDs are load-bearing here. Bodies, scores, and permalinks for the
// user's own items come from the authenticated view, so parsing failures on
// those fields must never break detection. String/regex extraction (rather than
// HTMLRewriter) keeps this module free of WASM so it runs in vitest as-is.
//
// Page structure (verified live 2026-07-01):
// - items carry thing-id="t1_xxx" / thing-id="t3_xxx" attributes
// - <shreddit-comment-action-row comment-id="t1_xxx" score="91" permalink="...">
// - <shreddit-feed-load-more-observer cursor="base64(lastThingId)">
// - the initial SSR page holds only ~8 items; further pages come from partial
//   endpoints returning ~25 items each with the next cursor embedded:
//     /svc/shreddit/profiles/profile_comments-more-posts/new/?sort=new&after=<cursor>&name=<user>&feedLength=8
//     /svc/shreddit/profiles/profile_posts-more-posts/new/?sort=new&after=...
// - empty profiles show "u/<name> doesn't have any posts/comments yet"

import { newReddit } from './common'

export interface PublicItem {
    name: string
    author: string
    score?: number
    permalink?: string
}

export interface PublicProfileData {
    items: Map<string, PublicItem>
    // True only if every fetched page was recognizably a profile page (had items
    // or the explicit empty state). False means breakage (challenge page, HTML
    // change, outage) — callers must NOT interpret 0 items as "all removed".
    valid: boolean
    // True when the whole profile is publicly empty (both tabs show the empty
    // state). With authenticated items present, this is the shadowban signature.
    emptyProfile: boolean
    // Coverage floors per item type: an id is covered by the paginated window iff
    // fullnameValue(id) >= floor. 0 means the tab was enumerated to its end.
    // Items below the floor were never reachable this cycle — their status is
    // unknown and they must be omitted from results, not marked removed/approved.
    coverage: { t1: number; t3: number }
    error?: string
}

// Fetching is delegated so requests.ts can route through a www.reddit.com tab's
// content script (same-origin, no challenge) or the background worker
// (host_permissions CORS bypass; may hit the challenge). Must resolve to the
// response body text; must reject or throw on network/HTTP failure.
export type FetchHtml = (url: string) => Promise<string>

const THING_ID_REGEX = /\bthing-id="(t[13]_[a-z0-9]+)"/g
const ACTION_ROW_REGEX = /<shreddit-comment-action-row\b([^>]*)>/g
const CURSOR_REGEX = /<shreddit-feed-load-more-observer\b[^>]*\bcursor="([^"]+)"/g
const ATTR_REGEX = /([\w-]+)="([^"]*)"/g
// Apostrophe in "doesn't" may be ', ’, or an HTML entity depending on encoding
const EMPTY_STATE_REGEX = /have any (posts|comments) yet/i
const CHALLENGE_REGEX = /js_challenge/

export const fullnameValue = (fullname: string): number => parseInt(fullname.split('_')[1], 36)

const TAB_CONFIG = {
    comments: { path: 'comments', partialFeed: 'profile_comments-more-posts', typePrefix: 't1_' },
    posts: { path: 'submitted', partialFeed: 'profile_posts-more-posts', typePrefix: 't3_' },
} as const
type TabName = keyof typeof TAB_CONFIG

export const buildTabUrl = (username: string, tab: TabName): string =>
    `${newReddit}/user/${encodeURIComponent(username)}/${TAB_CONFIG[tab].path}/?sort=new`

export const buildPartialUrl = (username: string, tab: TabName, cursor: string): string =>
    `${newReddit}/svc/shreddit/profiles/${TAB_CONFIG[tab].partialFeed}/new/` +
    `?sort=new&after=${encodeURIComponent(cursor)}&name=${encodeURIComponent(username)}&feedLength=8`

export interface ParsedPage {
    ids: string[]
    rows: Map<string, { score?: number; permalink?: string }>
    cursor: string | null
    emptyState: boolean
    hasItems: boolean
}

export const parseProfileHtml = (html: string, typePrefix: string): ParsedPage => {
    const seen = new Set<string>()
    const ids: string[] = []
    const addId = (id: string) => {
        // The comments tab can also carry the parent posts' ids (and vice versa);
        // only ids of the tab's own type count toward its item list and coverage.
        if (id.startsWith(typePrefix) && !seen.has(id)) {
            seen.add(id)
            ids.push(id)
        }
    }
    for (const m of html.matchAll(THING_ID_REGEX)) {
        addId(m[1])
    }
    const rows = new Map<string, { score?: number; permalink?: string }>()
    for (const m of html.matchAll(ACTION_ROW_REGEX)) {
        const attrs: Record<string, string> = {}
        for (const a of m[1].matchAll(ATTR_REGEX)) {
            attrs[a[1]] = a[2]
        }
        const id = attrs['comment-id']
        if (id) {
            addId(id)
            rows.set(id, {
                ...(attrs['score'] !== undefined && attrs['score'] !== '' && { score: Number(attrs['score']) }),
                ...(attrs['permalink'] && { permalink: attrs['permalink'] }),
            })
        }
    }
    const cursors = [...html.matchAll(CURSOR_REGEX)].map(m => m[1])
    return {
        ids,
        rows,
        cursor: cursors.length ? cursors[cursors.length - 1] : null,
        emptyState: EMPTY_STATE_REGEX.test(html),
        hasItems: ids.length > 0,
    }
}

// ---------------------------------------------------------------------------
// Individual post-page classification.
//
// "Present in the profile feed" is NOT a reliable liveness signal for posts the
// way it is for comments: held ("awaiting moderator approval") and spam-removed
// posts linger in the author's public feed for a grace period (verified live
// with a held post). The post's own logged-out page tells the truth via banner
// text inside the <shreddit-post> element — also verified: the held post's page
// shows "Post is awaiting moderator approval." even to logged-out visitors.
// ---------------------------------------------------------------------------

export type PostPageStatus = 'live' | 'held' | 'removed' | 'unknown'
export interface PostPageResult {
    status: PostPageStatus
    author?: string
    title?: string
    created_utc?: number
    subreddit?: string
}

const POST_HELD_REGEX = /awaiting moderator approval/i
const POST_REMOVED_REGEX =
    /(removed by (the )?moderators?|removed by reddit|reddit'?s? spam filters?|deleted by (the )?(author|user)|banned from this community|community is private)/i

export const buildPostPageUrl = (postId: string): string => `${newReddit}/comments/${postId.replace(/^t3_/, '')}/`

export const classifyPostPage = (html: string): PostPageResult => {
    const postTag = html.match(/<shreddit-post\b([^>]*)>/)
    if (!postTag) {
        return { status: 'unknown' }
    }
    const attrs: Record<string, string> = {}
    for (const a of postTag[1].matchAll(ATTR_REGEX)) {
        attrs[a[1]] = a[2]
    }
    const createdMs = attrs['created-timestamp'] ? Date.parse(attrs['created-timestamp']) : NaN
    const meta = {
        ...(attrs['author'] && { author: attrs['author'] }),
        ...(attrs['post-title'] && { title: attrs['post-title'] }),
        ...(Number.isFinite(createdMs) && { created_utc: Math.floor(createdMs / 1000) }),
        ...(attrs['subreddit-name'] && { subreddit: attrs['subreddit-name'] }),
    }
    // Search banners only within the post element — comment text further down
    // the page could legitimately contain these phrases.
    const start = postTag.index || 0
    const end = html.indexOf('</shreddit-post>', start)
    const postRegion = html.slice(start, end === -1 ? Math.min(html.length, start + 100000) : end)
    if (POST_HELD_REGEX.test(postRegion)) {
        return { status: 'held', ...meta }
    }
    if (POST_REMOVED_REGEX.test(postRegion)) {
        return { status: 'removed', ...meta }
    }
    return { status: 'live', ...meta }
}

// ---------------------------------------------------------------------------
// Individual comment-page classification.
//
// Since ~2026-07, the public profile feed also omits items from subreddits the
// user has hidden from their profile ("curate your profile") — for every
// viewer, not just profile visitors. Feed absence therefore no longer proves a
// comment was removed. The comment's own logged-out permalink page is
// authoritative (verified live 2026-07-20):
// - a live comment renders as <shreddit-comment ... thingId="t1_x"> with the
//   real author name, including comments from profile-hidden subreddits
// - a removed/deleted comment without replies is absent from its own page
// - a removed/deleted comment kept for its reply tree renders a placeholder
//   element with author="[deleted]"
// ---------------------------------------------------------------------------

export type CommentPageStatus = 'live' | 'removed' | 'unknown'

export const buildCommentPageUrl = (commentId: string, linkId: string): string =>
    `${newReddit}/comments/${linkId.replace(/^t3_/, '')}/comment/${commentId.replace(/^t1_/, '')}/`

// (?![\w-]) so this can't match <shreddit-comment-tree ...>, which carries the
// focal comment's thingId even when that comment is removed (verified live).
const COMMENT_TAG_REGEX = /<shreddit-comment(?![\w-])([^>]*)>/g
// A page qualifies as a real comments page (vs challenge/error/interstitial)
// only if the thread scaffolding rendered.
const COMMENT_PAGE_VALID_REGEX = /<shreddit-comment-tree\b|<shreddit-post\b/

export const classifyCommentPage = (html: string, commentId: string): CommentPageStatus => {
    for (const m of html.matchAll(COMMENT_TAG_REGEX)) {
        const attrs: Record<string, string> = {}
        for (const a of m[1].matchAll(ATTR_REGEX)) {
            attrs[a[1]] = a[2]
        }
        // Comment pages use thingId=; profile feeds use thing-id=. Accept both
        // in case the SSR attribute style changes.
        if ((attrs['thingId'] || attrs['thing-id']) === commentId) {
            const author = attrs['author']
            if (!author) {
                // Element matched but no author attribute: SSR structure changed.
                // Unknown (not removed) so a markup change can't fire false alerts.
                return 'unknown'
            }
            // No real username starts with '[' — same signal isRemovedComment
            // relies on, language-indifferent.
            return author.startsWith('[') ? 'removed' : 'live'
        }
    }
    return COMMENT_PAGE_VALID_REGEX.test(html) ? 'removed' : 'unknown'
}

// The challenge is a string-doubling puzzle served instead of the real page:
// solution string in await(async e=>e+e)("..."), token in a hidden input.
// Best-effort fallback for background-worker fetches — the primary content
// script path is verified to never receive it.
export const solveChallenge = (html: string, originalUrl: string): string | null => {
    if (!CHALLENGE_REGEX.test(html)) {
        return null
    }
    const stringMatch = html.match(/await\(async e=>e\+e\)\("([^"]*)"\)/)
    const tokenMatch = html.match(/<input[^>]*\bname="token"[^>]*\bvalue="([^"]*)"/)
    if (!stringMatch || !tokenMatch) {
        return null
    }
    const solution = stringMatch[1] + stringMatch[1]
    const sep = originalUrl.includes('?') ? '&' : '?'
    return `${originalUrl}${sep}solution=${encodeURIComponent(solution)}&js_challenge=1&token=${encodeURIComponent(tokenMatch[1])}`
}

const decodeCursorValue = (cursor: string): number | null => {
    try {
        const value = fullnameValue(atob(cursor))
        return Number.isFinite(value) ? value : null
    } catch {
        return null
    }
}

interface TabResult {
    items: Map<string, PublicItem>
    valid: boolean
    emptyState: boolean
    floor: number
}

const fetchTab = async (
    username: string,
    tab: TabName,
    fetchHtml: FetchHtml,
    neededValues: number[],
    maxPartialPages: number,
): Promise<TabResult> => {
    const { typePrefix } = TAB_CONFIG[tab]
    const items = new Map<string, PublicItem>()
    const invalid: TabResult = { items, valid: false, emptyState: false, floor: Infinity }

    const url = buildTabUrl(username, tab)
    let html = await fetchHtml(url)
    let page = parseProfileHtml(html, typePrefix)
    if (!page.hasItems && !page.emptyState) {
        // Not recognizable — try the challenge solver once, then give up
        const solutionUrl = solveChallenge(html, url)
        if (!solutionUrl) {
            return invalid
        }
        html = await fetchHtml(solutionUrl)
        page = parseProfileHtml(html, typePrefix)
        if (!page.hasItems && !page.emptyState) {
            return invalid
        }
    }

    // Track the smallest id value actually seen: everything at or above it was
    // reachable, so a needed id in that range that's absent is genuinely gone.
    // The cursor decodes to the last item's id, but deriving the floor from
    // collected ids also survives a cursor-format change.
    let floor = 0
    const collect = (p: ParsedPage) => {
        for (const id of p.ids) {
            items.set(id, { name: id, author: username, ...p.rows.get(id) })
            const value = fullnameValue(id)
            if (Number.isFinite(value)) {
                floor = floor === 0 ? value : Math.min(floor, value)
            }
        }
    }
    collect(page)

    let cursor = page.cursor
    if (cursor !== null && floor === 0) {
        // Items parsed but none decodable (unexpected): fall back to the cursor
        floor = decodeCursorValue(cursor) ?? Infinity
    }
    let partialPages = 0
    while (cursor !== null && partialPages < maxPartialPages && neededValues.some(v => v < floor)) {
        const partialHtml = await fetchHtml(buildPartialUrl(username, tab, cursor))
        const partialPage = parseProfileHtml(partialHtml, typePrefix)
        if (!partialPage.hasItems) {
            // Partial pages have no empty-state message; a page with no items
            // means the format changed or we were blocked. Keep what we have —
            // the floor already reflects how deep we actually got.
            break
        }
        collect(partialPage)
        cursor = partialPage.cursor
        partialPages++
    }
    if (cursor === null) {
        // Enumerated to the end of the profile — everything is covered
        floor = 0
    }
    return { items, valid: true, emptyState: page.emptyState, floor }
}

// Fetch the public (logged-out) view of a user's profile: the comments and
// submitted tabs, paginated until `neededIds` are covered or the page budget is
// exhausted. The overview tab is intentionally NOT used — it omits items that
// the individual tabs show (verified).
export const getPublicProfileItems = async (
    username: string,
    fetchHtml: FetchHtml,
    neededIds: string[] = [],
    maxPartialPages = 4,
): Promise<PublicProfileData> => {
    const neededValues = (prefix: string) =>
        neededIds
            .filter(id => id.startsWith(prefix))
            .map(fullnameValue)
            .filter(Number.isFinite)
    try {
        const [comments, posts] = await Promise.all([
            fetchTab(username, 'comments', fetchHtml, neededValues('t1_'), maxPartialPages),
            fetchTab(username, 'posts', fetchHtml, neededValues('t3_'), maxPartialPages),
        ])
        const items = new Map([...comments.items, ...posts.items])
        return {
            items,
            valid: comments.valid && posts.valid,
            emptyProfile: comments.emptyState && posts.emptyState && items.size === 0,
            coverage: { t1: comments.floor, t3: posts.floor },
        }
    } catch (error: any) {
        return {
            items: new Map(),
            valid: false,
            emptyProfile: false,
            coverage: { t1: Infinity, t3: Infinity },
            error: String(error?.message || error),
        }
    }
}
