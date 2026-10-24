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

import { newReddit, isRateLimitError } from './common'
import { getChallengeConfig } from '../challenge-config'
import { getMarkupConfig } from '../markup-config'

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
    // Why pagination ended early, when a page past the first failed. The
    // lookup stays valid with the coverage reached.
    paginationStopped?: string
}

// Fetching is delegated so requests.ts can route through a www.reddit.com tab's
// content script (same-origin, no challenge) or the background worker
// (host_permissions CORS bypass; may hit the challenge). Must resolve to the
// response body text; must reject or throw on network/HTTP failure. accept
// says whether a page is one the caller can read: the fetcher counts any other
// page (the front page served in place of a permalink, a shell, a challenge
// shape the solver doesn't know) as its route being refused, and tries the
// next route.
export type FetchHtml = (url: string, accept?: (html: string) => boolean) => Promise<string>

const THING_ID_REGEX = /\bthing-id="(t[13]_[a-z0-9]+)"/g
const ACTION_ROW_REGEX = /<shreddit-comment-action-row\b([^>]*)>/g
const CURSOR_REGEX = /<shreddit-feed-load-more-observer\b[^>]*\bcursor="([^"]+)"/g
const ATTR_REGEX = /([\w-]+)="([^"]*)"/g
// Apostrophe in "doesn't" may be ', ’, or an HTML entity depending on encoding
const EMPTY_STATE_REGEX = /have any (posts|comments) yet/i
const CHALLENGE_REGEX = /js_challenge/
// The captcha interstitial is a 200 titled "Reddit - Prove your humanity".
// The page's first <title> must be exactly that, so neither a post titled
// with the phrase nor a <title> further down (an SVG's) counts.
const FIRST_TITLE_REGEX = /<title[^>]*>([^<]*)<\/title>/i
const CAPTCHA_TITLE_REGEX = /^\s*(?:Reddit\s*-\s*)?Prove your humanity\s*$/i

export const isCaptchaPage = (html: string): boolean => {
    const title = html.match(FIRST_TITLE_REGEX)
    return Boolean(title && CAPTCHA_TITLE_REGEX.test(title[1]))
}

export const fullnameValue = (fullname: string): number => parseInt(fullname.split('_')[1], 36)

// Whether an element carries this id under any of the attribute names the
// markup config lists. Any name, not the first one present: a feed-added name
// can hold some other value on the same element. Own properties only, since a
// configured name like 'constructor' would otherwise read Object's.
const hasId = (attrs: Record<string, string>, names: string[], id: string): boolean =>
    names.some(name => Object.prototype.hasOwnProperty.call(attrs, name) && attrs[name] === id)

const parseAttrs = (tagAttrs: string): Record<string, string> => {
    const attrs: Record<string, string> = {}
    for (const a of tagAttrs.matchAll(ATTR_REGEX)) {
        attrs[a[1]] = a[2]
    }
    return attrs
}

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
//
// Only the requested post's own element decides. Reddit has served its front
// page in place of a permalink (issue #14's 2026-08-17 log), and the logged-out
// front page lists other posts as <shreddit-post> feed items, which read as
// 'live' (verified 2026-10-17). That page names itself with <link
// rel="canonical" href="https://www.reddit.com/">, but thread pages carry no
// such link to compare, so the element's id is the check.
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

// (?![\w-]) as in COMMENT_TAG_REGEX: <shreddit-post-overflow-menu> and
// <shreddit-post-flair> match a bare \b, and on the front page the first
// match is an ad's overflow menu.
const POST_TAG_REGEX = /<shreddit-post(?![\w-])([^>]*)>/g

// postId is the fullname (t3_…), the form the element's id attribute carries
export const classifyPostPage = (html: string, postId: string): PostPageResult => {
    const { postIdAttributes } = getMarkupConfig()
    const postTag = [...html.matchAll(POST_TAG_REGEX)].find(m => hasId(parseAttrs(m[1]), postIdAttributes, postId))
    if (!postTag) {
        return { status: 'unknown' }
    }
    const attrs = parseAttrs(postTag[1])
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

// Subreddit and post of a thread permalink, in the API's form
// (/r/<sub>/comments/<post>/<slug>/<comment>/) and the site's
// (/r/<sub>/comments/<post>/comment/<comment>/)
const THREAD_PERMALINK_REGEX = /^\/r\/([^/]+)\/comments\/([^/]+)\//

// The comment's own page in the form the site links to. The API's permalink
// form now comes back as a shell that only redirects here in the browser, with
// no comment tree and no post (3 of 3 samples, live and removed, 2026-10-17).
// buildCommentPageUrl's form 301s here instead, and a cookie-less background
// fetch can't follow that: the redirect drops the solved challenge and lands
// on a new one (2026-10-17). This form gets neither.
export const buildCommentThreadUrl = (permalink: string, commentId: string): string | null => {
    const m = permalink.match(THREAD_PERMALINK_REGEX)
    if (!m) {
        return null
    }
    return `${newReddit}/r/${m[1]}/comments/${m[2]}/comment/${commentId.replace(/^t1_/, '')}/`
}

// The /svc partial is the XHR route the site itself lazy-loads comment trees
// with. Verified live 2026-08-17 (logged-out, clean client: 200, no redirect,
// no challenge): a live comment renders <shreddit-comment thingId= author=>,
// a removed one returns the tree scaffold without the comment element — the
// exact signals classifyCommentPage already reads on full pages. Because the
// route is XHR-native (Sec-Fetch-Dest: empty is normal there, and walling it
// would break Reddit's own logged-in clients), it may stay readable for
// clients whose full permalink pages are walled (issue #14: front page or
// captcha served instead). Needs the subreddit, so it requires a permalink.
export const buildCommentPartialUrl = (permalink: string, commentId: string): string | null => {
    const m = permalink.match(THREAD_PERMALINK_REGEX)
    if (!m) {
        return null
    }
    return `${newReddit}/svc/shreddit/comments/r/${m[1]}/${m[2]}/${commentId.replace(/^t1_/, '')}?render-mode=partial`
}

// (?![\w-]) so this can't match <shreddit-comment-tree ...>, which carries the
// focal comment's thingId even when that comment is removed (verified live).
const COMMENT_TAG_REGEX = /<shreddit-comment(?![\w-])([^>]*)>/g
// That thingId is what says a page or /svc partial was served for the
// requested comment (partial verified 2026-10-17), so a missing comment
// counts only where it matches. The front page, served in place of
// permalinks in issue #14, has <shreddit-post> feed items but no comment tree
// (verified 2026-10-17), and neither thread pages nor the partial carry a
// <link rel="canonical"> to compare instead.
const COMMENT_TREE_TAG_REGEX = /<shreddit-comment-tree(?![\w-])([^>]*)>/g
// Whether any thread scaffolding rendered, for the diagnostic line. It doesn't
// say which page: the front page's feed items match it too.
const COMMENT_PAGE_VALID_REGEX = /<shreddit-comment-tree\b|<shreddit-post\b/

// scaffoldAbsence: what the comment's own thread lacking it means.
// 'removed' (default) is the ordinary reading; 'unknown' is the remote
// safety valve for a markup rename (MECHANISM_ABSENT_UNVERIFIED_UNKNOWN).
export const classifyCommentPage = (
    html: string,
    commentId: string,
    scaffoldAbsence: 'removed' | 'unknown' = 'removed',
): CommentPageStatus => {
    // Comment pages use thingId=, profile feeds thing-id=; the news feed can
    // add names (markup-config.ts)
    const { commentIdAttributes } = getMarkupConfig()
    for (const m of html.matchAll(COMMENT_TAG_REGEX)) {
        const attrs = parseAttrs(m[1])
        if (hasId(attrs, commentIdAttributes, commentId)) {
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
    const servedForComment = [...html.matchAll(COMMENT_TREE_TAG_REGEX)].some(m =>
        hasId(parseAttrs(m[1]), commentIdAttributes, commentId),
    )
    return servedForComment ? scaffoldAbsence : 'unknown'
}

// The challenge is a string-doubling puzzle served instead of the real page:
// solution string in await(async e=>e+e)("..."), token in a hidden input.
// Best-effort fallback for background-worker fetches — the primary content
// script path is verified to never receive it.
//
// Two page shapes exist. The original form carried the token as
// name="token". Since 2026-08-31 reddit serves a hidden GET form with
// name="jsc_token" plus a "jsc_orig_r" field (empty in the wild); the solved
// request must echo each field under its own name or reddit re-serves the
// challenge. Verified live 2026-09-03: the jsc_token shape solved this way
// returns the real profile page (thing-ids + cursors) from a challenged IP.
// Field names and the puzzle regex come from challenge-config.ts (defaults
// there; overridable from the news feed).
// A URL solveChallenge produced: the same challenge in answer to one means the
// route rejected the solve
const SOLVED_CHALLENGE_PARAM = /[?&]js_challenge=1(&|$)/
export const isSolvedChallengeUrl = (url: string): boolean => SOLVED_CHALLENGE_PARAM.test(url)

export const solveChallenge = (html: string, originalUrl: string): string | null => {
    if (!CHALLENGE_REGEX.test(html)) {
        return null
    }
    const config = getChallengeConfig()
    const matchSolution = (): RegExpMatchArray | null => {
        try {
            return html.match(new RegExp(config.solutionRegex))
        } catch {
            return null
        }
    }
    const stringMatch = matchSolution()
    if (!stringMatch || stringMatch[1] === undefined) {
        return null
    }
    const hiddenInput = (name: string): string | null => {
        const m = html.match(new RegExp(`<input[^>]*\\bname="${name}"[^>]*\\bvalue="([^"]*)"`))
        return m ? m[1] : null
    }
    let tokenField: string | null = null
    let token: string | null = null
    for (const field of config.tokenFields) {
        token = hiddenInput(field)
        if (token !== null) {
            tokenField = field
            break
        }
    }
    if (tokenField === null || token === null) {
        return null
    }
    const solution = stringMatch[1] + stringMatch[1]
    const sep = originalUrl.includes('?') ? '&' : '?'
    let solved =
        `${originalUrl}${sep}solution=${encodeURIComponent(solution)}` +
        `&js_challenge=1&${tokenField}=${encodeURIComponent(token)}`
    const origR = hiddenInput('jsc_orig_r')
    if (origR !== null) {
        solved += `&jsc_orig_r=${encodeURIComponent(origR)}`
    }
    return solved
}

// Compact page-shape line for the diagnostic log: enough to tell a challenge
// page, an SSR shell, and a block page apart without recording page content.
// (Issue #14's log had verdicts but no reason — this is the missing "why".)
export const describePageForDiag = (html: string): string => {
    const title = (html.match(/<title[^>]*>([^<]{0,60})/) || [])[1] || ''
    // Which page reddit actually served, from its canonical URL rather than
    // its title. Issue #14's 2026-08-17 log had the front page served in place
    // of a permalink (even after an accepted challenge solve); that shows as
    // canonical="/". The old test matched the front page's title, and by
    // 2026-10 reddit gave every page that title.
    const canonicalTag = (html.match(/<link\b[^>]*\brel="canonical"[^>]*>/) || [])[0]
    const canonical = canonicalTag && (canonicalTag.match(/\bhref="(?:https?:\/\/[^/"]+)?([^"]{0,80})"/) || [])[1]
    // The captcha interstitial is still named by its title, which the log
    // keeps either way. (challenge= is a plain substring test: full pages
    // embed "js_challenge" incidentally, so only the solver's puzzle regexes
    // prove a real one.)
    const wall = isCaptchaPage(html) ? ' wall=captcha' : ''
    // A page whose only job is a script redirect, as the API's comment
    // permalinks came back on 2026-10-17 (see buildCommentThreadUrl). Tagged
    // rather than logging the target, whose path names the thread.
    const shell = /\bid="shreddit-redirect"/.test(html) ? ' shell=redirect' : ''
    return (
        `bytes=${html.length} challenge=${CHALLENGE_REGEX.test(html) ? 1 : 0} ` +
        `scaffold=${COMMENT_PAGE_VALID_REGEX.test(html) ? 1 : 0} title=${JSON.stringify(title)}` +
        (canonical !== undefined ? ` canonical=${JSON.stringify(canonical)}` : '') +
        wall +
        shell
    )
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
    // Why the tab is invalid, for the diagnostic log
    error?: string
    // Why pagination stopped before reaching what was needed
    stopped?: string
}

// A pagination fragment the fetcher should accept: one with items, or the
// small empty fragment that can end a profile (no items, no cursor, not a
// whole page). Anything else counts against the route.
const EMPTY_FRAGMENT_MAX_BYTES = 4096
const isPartialPageFor = (typePrefix: string) => (h: string) => {
    const p = parseProfileHtml(h, typePrefix)
    return p.hasItems || (p.cursor === null && !/<html\b/i.test(h) && h.length < EMPTY_FRAGMENT_MAX_BYTES)
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
    const invalid = (error: string): TabResult => ({ items, valid: false, emptyState: false, floor: Infinity, error })

    const isProfilePage = (h: string) => {
        const p = parseProfileHtml(h, typePrefix)
        return p.hasItems || p.emptyState
    }
    const isPartialPage = isPartialPageFor(typePrefix)
    const url = buildTabUrl(username, tab)
    let html = await fetchHtml(url, isProfilePage)
    let page = parseProfileHtml(html, typePrefix)
    if (!page.hasItems && !page.emptyState) {
        // Not recognizable — try the challenge solver once, then give up
        const solutionUrl = solveChallenge(html, url)
        if (!solutionUrl) {
            return invalid(`${tab} page unrecognized: ${describePageForDiag(html)}`)
        }
        html = await fetchHtml(solutionUrl, isProfilePage)
        page = parseProfileHtml(html, typePrefix)
        if (!page.hasItems && !page.emptyState) {
            return invalid(`${tab} page unrecognized after challenge solve: ${describePageForDiag(html)}`)
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
    let stopped: string | undefined
    while (cursor !== null && partialPages < maxPartialPages && neededValues.some(v => v < floor)) {
        let partialHtml: string
        try {
            partialHtml = await fetchHtml(buildPartialUrl(username, tab, cursor), isPartialPage)
        } catch (err: any) {
            // A 429 means the client is rate limited, and the caller must back
            // off. Anything else (every route refused, a network failure) only
            // ends the pagination: what the first pages showed still stands.
            if (isRateLimitError(err)) {
                throw err
            }
            stopped = `${tab} pagination stopped: ${String(err?.message || err).slice(0, 160)}`
            break
        }
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
    return { items, valid: true, emptyState: page.emptyState, floor, ...(stopped && { stopped }) }
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
    const failed = (error: string): PublicProfileData => ({
        items: new Map(),
        valid: false,
        emptyProfile: false,
        coverage: { t1: Infinity, t3: Infinity },
        error,
    })
    try {
        const [commentsResult, postsResult] = await Promise.allSettled([
            fetchTab(username, 'comments', fetchHtml, neededValues('t1_'), maxPartialPages),
            fetchTab(username, 'posts', fetchHtml, neededValues('t3_'), maxPartialPages),
        ])
        if (commentsResult.status === 'rejected' || postsResult.status === 'rejected') {
            const why = (r: PromiseSettledResult<TabResult>) =>
                r.status === 'rejected' ? String(r.reason?.message || r.reason) : ''
            const is404 = (r: PromiseSettledResult<TabResult>) => /request failed: 404\b/.test(why(r))
            // The first failing tab's message, as callers and the diagnostic
            // log read it. A missing profile 404s on both tabs; one tab's 404
            // says something about that tab, so its message loses the shape
            // callers read as the shadowban signature. A 429 keeps its shape
            // for the backoff.
            const error = why(commentsResult.status === 'rejected' ? commentsResult : postsResult)
            if (is404(commentsResult) && is404(postsResult)) {
                return failed(error)
            }
            return failed(error.replace(/request failed: 404\b/g, 'answered 404 (the other tab did not)'))
        }
        const comments = commentsResult.value
        const posts = postsResult.value
        const items = new Map([...comments.items, ...posts.items])
        const error = comments.error || posts.error
        const paginationStopped = [comments.stopped, posts.stopped].filter(Boolean).join('; ')
        return {
            items,
            valid: comments.valid && posts.valid,
            emptyProfile: comments.emptyState && posts.emptyState && items.size === 0,
            coverage: { t1: comments.floor, t3: posts.floor },
            ...(error && { error }),
            ...(paginationStopped && { paginationStopped }),
        }
    } catch (error: any) {
        return failed(String(error?.message || error))
    }
}
