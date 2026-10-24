// Typed reddit-data bridge: lets reveddit.com pages fetch public reddit JSON
// through the extension. The website's own transport is reddit's legacy JSONP
// support (it serves most pages that way with no extension installed); the
// bridge exists for the endpoints JSONP cannot serve (moderated_subreddits,
// user_data_by_account_ids, username_available, publicmodlogs, morechildren)
// and as the durable fallback if reddit removes JSONP. Background fetches run
// under host_permissions, so neither page CORS nor reddit's blocks on
// website-origin requests apply here.
//
// Reaches the page two ways, one handler: chrome.runtime.sendMessage from the
// page (externally_connectable, Chrome/Edge) and a window.postMessage relay in
// the content script (Firefox, which has no externally_connectable). The
// background checks who is asking on both (background.ts).
//
// The user's own monitoring always comes first:
// 1. While a monitoring cycle's requests run, bridge requests wait for it to
//    finish (BUSY_WAIT_MAX_MS at most); during the shared 429 backoff
//    (storage.ts) they are refused. The page then falls back to its own JSONP,
//    which spends the page's budget, not ours.
// 2. Requests serialize through one lane with spacing, and a rolling window
//    caps volume; the cap halves for an hour after any 429, mirroring
//    computeAbsentVerifyBudget.
// 3. A bridge 429 enters the same shared backoff via flagIfRateLimited: a hot
//    IP affects monitoring no matter who heated it, and the next cycle should
//    know.
// Every answer arrives inside the page's 10 s timeout (BRIDGE_DEADLINE_MS):
// an answer after it is thrown away, and its fetch would be wasted.
//
// Identity: the user's own reddit login. By 2026-10 reddit's edge answered
// every logged-out .json fetch from the extension with its 189 KB "network
// security" 403 page, in Chrome and Firefox alike, whatever cookies or headers
// it carried (the browser's loid alone had got through since 2026-09).
// Requests carrying the user's session still pass, so bridge fetches send the
// browser's reddit cookies, and without a login cookie (hasRedditLoginCookie)
// the bridge refuses with not_logged_in, which the website explains.
//
// The logged-in view is the user's, not the public's, and toPublicView turns
// it back into what logged-out visitors see:
// - Reddit shows authors their own removed items as if nothing happened. The
//   items the extension's own monitoring has confirmed removed are marked
//   removed, which costs no extra reddit requests. The user's other own items
//   carry reveddit_unverified unless monitoring's last pass saw them in the
//   logged-out view, since only that can tell (the website can say so).
// - Moderators see removed items in their subreddits with the text intact and
//   removed: true or banned_by (the remover) set, verified 2026-10-17 on
//   r/pushshift; spam marks spam-filter removals.
// - Fields that only a logged-in viewer gets (votes, saves, reports, the
//   viewer's standing in a subreddit) are set to their logged-out values.
// - Items by authors who blocked the user read [unavailable]; they carry
//   reveddit_viewer_blocked, so they aren't taken for removals.
// - While monitoring finds the user's own profile missing from the logged-out
//   view (the shadowban signature, requests.ts), the bridge answers 404 for
//   it, as reddit does logged out.
// Monitoring's own public-view fetches stay logged out.

import browser from 'webextension-polyfill'
import {
    getRateLimitBackoffRemainingMs,
    getMsSinceLastRateLimitHit,
    getObjectNamesForThing,
    getPublicLiveKey,
} from './storage'
import {
    flagIfRateLimited,
    RECENT_RATE_LIMIT_WINDOW_MS,
    hasRedditLoginCookie,
    isPublicProfileUnavailable,
} from './requests'
import { isCycleInFlight } from './monitoring'
import { isRemovedInModView } from './common'
import { dlog } from './diaglog'
import { getPublicModlogsFeed } from './bridge-config'

const www_reddit = 'https://www.reddit.com'

// A user's listings and abouts, as the website requests them: the overview
// (/user/<name>/.json, normalized below to /user/<name>.json), a tab, the
// about, the moderated subreddits. Group 1 is the name.
const USER_PATH =
    /^\/user\/([\w-]{1,30})(?:\.json|\/(?:comments|submitted|overview|gilded|about|moderated_subreddits)\.json)$/

// Public JSON the website is allowed to request — a closed list, not a URL
// proxy. Anything else (including any non-reddit host) is refused.
const ALLOWED_PATHS = [
    /^\/api\/info\.json$/,
    /^\/api\/morechildren\.json$/,
    /^\/api\/username_available\.json$/,
    /^\/api\/user_data_by_account_ids\.json$/,
    /^\/search\.json$/,
    /^\/comments\/[a-z0-9]{1,20}\.json$/,
    /^\/r\/[\w+.-]{1,60}\/(new|hot|top|rising|controversial)\.json$/,
    /^\/r\/[\w+.-]{1,60}\/comments(\/[a-z0-9]{1,20})?\.json$/,
    /^\/r\/[\w+.-]{1,60}\/about\.json$/,
    /^\/r\/[\w+.-]{1,60}\/about\/(log|spam)\.json$/,
    /^\/r\/[\w+.-]{1,60}\/search\.json$/,
    USER_PATH,
]

// Listings whose content depends on who is logged in: /user/me is the viewer,
// r/mod the subreddits they moderate, r/friends their friends' posts
const VIEWER_USER = /^\/user\/me(\/|\.json$)/i
const VIEWER_SUBREDDITS = new Set(['mod', 'friends'])

// null = refused. Returns the normalized URL string to fetch.
export const validateBridgeUrl = (raw: any): string | null => {
    let u: URL
    try {
        u = new URL(String(raw))
    } catch {
        return null
    }
    if (u.protocol !== 'https:' || u.hostname !== 'www.reddit.com') {
        return null
    }
    // the website uses both the '/.json' and '.json' forms
    const path = u.pathname.replace(/\/{2,}/g, '/').replace(/\/\.json$/, '.json')
    if (!ALLOWED_PATHS.some(re => re.test(path))) {
        return null
    }
    if (VIEWER_USER.test(path)) {
        return null
    }
    const subreddits = path.match(/^\/r\/([^/]+)\//)?.[1]
    if (subreddits && subreddits.split('+').some(name => VIEWER_SUBREDDITS.has(name.toLowerCase()))) {
        return null
    }
    // A mod log or spam queue only as reddit publishes it: the publicmodlogs
    // feed, under its one token. Any other feed, or a second feed or user
    // parameter reddit might read instead, would let the user's login read a
    // log they moderate.
    if (/\/about\/(log|spam)\.json$/.test(path)) {
        const feeds = u.searchParams.getAll('feed')
        const users = u.searchParams.getAll('user')
        if (
            feeds.length !== 1 ||
            users.length !== 1 ||
            users[0] !== 'publicmodlogs' ||
            feeds[0] !== getPublicModlogsFeed()
        ) {
            return null
        }
    }
    u.pathname = path
    u.searchParams.delete('jsonp')
    return www_reddit + u.pathname + u.search
}

// The account the bridge's cookies belong to, as monitoring last saw it
const getLoggedInUser = async (): Promise<string> => {
    try {
        const local = (await browser.storage.local.get({ last_logged_in_user: '' })) as any
        return String(local.last_logged_in_user || '')
    } catch {
        return ''
    }
}

// Only a pass this recent counts as having seen an item live
const PUBLIC_LIVE_MAX_AGE_MS = 2 * 3600 * 1000

export interface PublicViewContext {
    // Fullnames monitoring has confirmed removed
    knownRemoved: Set<string>
    // The logged-in user, lowercased; '' when unknown
    me: string
    // The user's items monitoring's last pass saw in the logged-out view
    verifiedLive: Set<string>
}

const getPublicViewContext = async (me: string): Promise<PublicViewContext> => {
    const context: PublicViewContext = { knownRemoved: new Set(), me: me.toLowerCase(), verifiedLive: new Set() }
    try {
        // The logged-in account's removed hash is the one monitoring keeps
        // current; other subscribed accounts' hashes go stale while it's
        // logged in as someone else. Followed items ('other') are checked
        // whoever is logged in.
        const keys = [getObjectNamesForThing('other', false).removed]
        if (me) {
            keys.push(getObjectNamesForThing(me, true).removed)
        }
        const stored = (await browser.storage.sync.get(keys)) as Record<string, any>
        keys.forEach(key => Object.keys(stored[key] || {}).forEach(id => context.knownRemoved.add(id)))
        if (me) {
            const liveKey = getPublicLiveKey(me)
            const live = ((await browser.storage.local.get({ [liveKey]: null })) as any)[liveKey]
            const age = Date.now() - Number(live?.t || 0)
            if (Array.isArray(live?.ids) && age >= 0 && age < PUBLIC_LIVE_MAX_AGE_MS) {
                live.ids.forEach((id: string) => context.verifiedLive.add(id))
            }
        }
    } catch {
        // storage unreadable: nothing known
    }
    return context
}

const PLACEHOLDER = /^\[(removed|deleted)\]$/
const REMOVED_BODY_HTML = '&lt;div class="md"&gt;&lt;p&gt;[removed]&lt;/p&gt;\n&lt;/div&gt;'
const REMOVED_SELFTEXT_HTML = '&lt;!-- SC_OFF --&gt;' + REMOVED_BODY_HTML + '&lt;!-- SC_ON --&gt;'
const VIEWER_BLOCKED = '[unavailable]'

// One item rewritten to what logged-out visitors see, in the shape the
// website reads (its utils.tsx commentIsRemoved and itemIsRemovedOrDeleted).
// Items their authors deleted already read [deleted] in every view and are
// left alone.
const markPubliclyRemoved = (kind: string, item: any) => {
    if (kind === 't1') {
        if (!PLACEHOLDER.test(item.body ?? '')) {
            item.body = '[removed]'
            item.author = '[deleted]'
            if ('body_html' in item) {
                item.body_html = REMOVED_BODY_HTML
            }
        }
    } else if (item.author !== '[deleted]') {
        item.is_robot_indexable = false
        if (item.is_self) {
            item.selftext = '[removed]'
            if ('selftext_html' in item) {
                item.selftext_html = REMOVED_SELFTEXT_HTML
            }
        }
    }
}

// Fields only a logged-in viewer gets, with the values logged-out JSON has.
// Read after the removal check: moderators' removed/spam/banned_by are what
// isRemovedInModView reads.
const LOGGED_OUT_VALUES: Record<string, any> = {
    // the logged-in session's anti-forgery token
    modhash: '',
    likes: null,
    saved: false,
    hidden: false,
    visited: false,
    removed_by: null,
    is_friend: false,
    author_is_blocked: false,
    can_mod_post: false,
    mod_reports: [],
    user_reports: [],
    num_reports: null,
    report_reasons: null,
    banned_by: null,
    banned_at_utc: null,
    approved_by: null,
    approved_at_utc: null,
    mod_note: null,
    mod_reason_by: null,
    mod_reason_title: null,
    user_is_banned: null,
    user_is_moderator: null,
    user_is_subscriber: null,
    user_is_contributor: null,
    user_is_muted: null,
    user_has_favorited: null,
    user_can_flair_in_sr: null,
    user_flair_enabled_in_sr: null,
    user_sr_flair_enabled: null,
    user_sr_theme_enabled: null,
    user_flair_text: null,
    user_flair_css_class: null,
    user_flair_richtext: [],
    user_flair_template_id: null,
    user_flair_background_color: null,
    user_flair_text_color: null,
}
// What reddit adds to the logged-in account's own about (its identity:
// inbox, subscriptions, settings), absent from what anyone else sees
const OWN_ACCOUNT_ONLY = [
    'has_mail',
    'has_mod_mail',
    'inbox_count',
    'new_modmail_exists',
    'coins',
    'gold_creddits',
    'gold_expiration',
    'has_gold_subscription',
    'has_subscribed_to_premium',
    'has_android_subscription',
    'has_ios_subscription',
    'has_paypal_subscription',
    'has_stripe_subscription',
    'has_external_account',
    'password_set',
    'force_password_reset',
    'can_create_subreddit',
    'can_edit_name',
    'linked_identities',
    'num_friends',
    'oauth_client_id',
    'features',
    'in_beta',
    'in_chat',
    'in_redesign_beta',
    'has_visited_new_profile',
    'suspension_expiration_utc',
    'email',
]
// Settings and onboarding flags; pref_show_snoovatar is public
const OWN_ACCOUNT_PREFIX = /^(?:seen_|pref_(?!show_snoovatar$))/

// Moderator-only fields, absent from logged-out JSON
const MODERATOR_ONLY = [
    'removed',
    'approved',
    'spam',
    'ignore_reports',
    'mod_reports_dismissed',
    'user_reports_dismissed',
]

const resetViewerFields = (data: any) => {
    for (const key of Object.keys(LOGGED_OUT_VALUES)) {
        if (key in data) {
            const value = LOGGED_OUT_VALUES[key]
            data[key] = Array.isArray(value) ? [] : value
        }
    }
    for (const key of MODERATOR_ONLY) {
        delete data[key]
    }
}

// The logged-in view rewritten to the public one (see the top). Walks the
// shapes the allowlisted endpoints return: listings, a thread's [post,
// comments] pair, nested replies, morechildren's json.data.things, subreddit
// and account abouts, and moderated_subreddits' plain array.
export const toPublicView = (json: any, context: PublicViewContext): any => {
    const visit = (node: any): void => {
        if (!node || typeof node !== 'object') {
            return
        }
        if (Array.isArray(node)) {
            node.forEach(visit)
            return
        }
        const data = node.data
        if ((node.kind === 't1' || node.kind === 't3') && data && typeof data === 'object') {
            if (context.knownRemoved.has(data.name) || isRemovedInModView(data)) {
                markPubliclyRemoved(node.kind, data)
            } else if (
                context.me &&
                String(data.author || '').toLowerCase() === context.me &&
                !context.verifiedLive.has(data.name)
            ) {
                data.reveddit_unverified = true
            }
            if (data.author === VIEWER_BLOCKED || data.body === VIEWER_BLOCKED || data.selftext === VIEWER_BLOCKED) {
                data.reveddit_viewer_blocked = true
            }
            resetViewerFields(data)
            visit(data.replies)
        } else if (node.kind === 't2' && data && typeof data === 'object') {
            resetViewerFields(data)
            for (const key of Object.keys(data)) {
                if (OWN_ACCOUNT_ONLY.includes(key) || OWN_ACCOUNT_PREFIX.test(key)) {
                    delete data[key]
                }
            }
        } else if (node.kind === 't5' && data && typeof data === 'object') {
            resetViewerFields(data)
        } else if (node.kind === 'Listing') {
            if (data && typeof data === 'object' && 'modhash' in data) {
                data.modhash = ''
            }
            visit(data?.children)
        } else if (node.kind === 'ModeratedList' && Array.isArray(data)) {
            data.forEach(entry => entry && typeof entry === 'object' && resetViewerFields(entry))
        } else if (node.json?.data?.things) {
            visit(node.json.data.things)
        }
    }
    visit(json)
    return json
}

const BRIDGE_WINDOW_MS = 10 * 60 * 1000
const BRIDGE_MAX_PER_WINDOW = 100
const BRIDGE_SPACING_MS = 300

export const computeBridgeBudget = (msSinceLastRateLimitHit: number | null): number =>
    msSinceLastRateLimitHit !== null && msSinceLastRateLimitHit < RECENT_RATE_LIMIT_WINDOW_MS
        ? Math.floor(BRIDGE_MAX_PER_WINDOW / 2)
        : BRIDGE_MAX_PER_WINDOW

// A monitoring cycle takes seconds (about 6 s in a 2026-10-17 Firefox log).
// Waiting it out beats refusing at once, which made the page sit out a flat
// 15 s before its one retry. Every request answers within BRIDGE_DEADLINE_MS
// of arriving, inside the page's 10 s timeout (website bridge.ts
// BRIDGE_TIMEOUT_MS), and starts no fetch with less than MIN_FETCH_MS left.
const BRIDGE_DEADLINE_MS = 9000
const MIN_FETCH_MS = 2000
const BUSY_WAIT_MAX_MS = 6000
const BUSY_POLL_MS = 250
const BUSY_RETRY_AFTER_MS = 5000

// Resolves true once isBusy() turns false, or false when maxMs runs out first
export const waitUntilIdle = async (isBusy: () => boolean, maxMs: number, pollMs: number): Promise<boolean> => {
    const deadline = Date.now() + maxMs
    while (isBusy()) {
        if (Date.now() >= deadline) {
            return false
        }
        await new Promise(resolve => setTimeout(resolve, pollMs))
    }
    return true
}

let recentTimes: number[] = []
// single-lane serialization with spacing between fetches
let lane: Promise<void> = Promise.resolve()

// Reddit's edge refuses some request-header combinations with its HTML block
// page and accepts others, and it reversed which on 2026-10-21 (www-routes.ts).
// A block page, unlike a resource's own JSON 403, gets one retry in the other
// cache mode, and the mode that answers is kept for this worker's life.
// Mutable for tests, like _wwwRouteTiming.
const CACHE_MODES: RequestCache[] = ['default', 'no-cache']
// After both modes got the block page, the retry is skipped for this long, so
// a blocked client doesn't send every request twice
const DOUBLE_BLOCK_MEMORY_MS = 5 * 60 * 1000
export const _bridgeState = { preferredCacheMode: 0, doubleBlockUntil: 0 }

export interface BridgeResponse {
    ok: boolean
    status: number
    data?: any
    error?: string
    retryAfterMs?: number
    // Fetched with the user's login and rewritten to the public view (above)
    view?: 'logged_in'
}

const busy = (): BridgeResponse => ({ ok: false, status: 0, error: 'busy', retryAfterMs: BUSY_RETRY_AFTER_MS })

// The user's own listings and abouts, under /user/<name>
const ownProfileUser = (url: string, me: string): boolean => {
    const name = new URL(url).pathname.match(USER_PATH)?.[1]
    return Boolean(me && name && name.toLowerCase() === me.toLowerCase())
}

export const handleBridgeFetch = async (request: any): Promise<BridgeResponse> => {
    const deadline = Date.now() + BRIDGE_DEADLINE_MS
    const url = validateBridgeUrl(request?.url)
    if (!url) {
        return { ok: false, status: 0, error: 'invalid url' }
    }
    // Before any wait: someone logged out shouldn't wait to be told so
    if (!(await hasRedditLoginCookie())) {
        return { ok: false, status: 0, error: 'not_logged_in' }
    }
    // Before the backoff check: a cycle that ends in a 429 starts one
    if (isCycleInFlight()) {
        const waitStart = Date.now()
        const maxWait = Math.min(BUSY_WAIT_MAX_MS, deadline - Date.now() - MIN_FETCH_MS)
        const idle = await waitUntilIdle(isCycleInFlight, maxWait, BUSY_POLL_MS)
        dlog(
            'bridge',
            `[reveddit] bridge: ${idle ? 'waited' : 'gave up after'} ${Date.now() - waitStart}ms for a monitoring cycle`,
        )
        if (!idle) {
            return busy()
        }
    }
    const backoffMs = await getRateLimitBackoffRemainingMs()
    if (backoffMs > 0) {
        dlog('bridge', `[reveddit] bridge: refusing during rate-limit backoff (${Math.ceil(backoffMs / 1000)}s left)`)
        return { ok: false, status: 0, error: 'rate_limited', retryAfterMs: backoffMs }
    }
    const now = Date.now()
    recentTimes = recentTimes.filter(t => now - t < BRIDGE_WINDOW_MS)
    const budget = computeBridgeBudget(await getMsSinceLastRateLimitHit())
    if (recentTimes.length >= budget) {
        dlog('bridge', `[reveddit] bridge: window budget exhausted (${budget}/${BRIDGE_WINDOW_MS / 60000}min)`)
        return { ok: false, status: 0, error: 'budget_exhausted', retryAfterMs: 60 * 1000 }
    }
    const me = await getLoggedInUser()
    if (ownProfileUser(url, me) && (await isPublicProfileUnavailable(me))) {
        return { ok: false, status: 404 }
    }
    recentTimes.push(now)
    const run = lane.then(async (): Promise<BridgeResponse> => {
        // Queued behind other requests past the point an answer could arrive in time
        if (deadline - Date.now() < MIN_FETCH_MS) {
            return busy()
        }
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), deadline - Date.now())
        try {
            const fetchIn = (mode: number) =>
                fetch(url, {
                    credentials: 'include',
                    cache: CACHE_MODES[mode],
                    headers: { 'Accept-Language': 'en' },
                    signal: controller.signal,
                })
            // A resource's own 403 (private subreddit) is JSON; the edge's block page isn't
            const isBlockPage = (res: Response) =>
                res.status === 403 && !/json/i.test(res.headers.get('content-type') || '')
            let mode = _bridgeState.preferredCacheMode
            let r = await fetchIn(mode)
            let blockPage = isBlockPage(r)
            if (blockPage && Date.now() >= _bridgeState.doubleBlockUntil && deadline - Date.now() >= MIN_FETCH_MS) {
                const blockedMode = mode
                mode = (mode + 1) % CACHE_MODES.length
                // the retry is a request too
                recentTimes.push(Date.now())
                r = await fetchIn(mode)
                blockPage = isBlockPage(r)
                if (blockPage) {
                    _bridgeState.doubleBlockUntil = Date.now() + DOUBLE_BLOCK_MEMORY_MS
                } else {
                    // Past the edge, whatever the resource said: keep this mode
                    dlog(
                        'bridge',
                        `[reveddit] bridge: block page in cache mode ${CACHE_MODES[blockedMode]}, ${CACHE_MODES[mode]} got through (${r.status})`,
                    )
                    _bridgeState.preferredCacheMode = mode
                }
            }
            if (!r.ok) {
                dlog(
                    'bridge',
                    `[reveddit] bridge: ${url.split('?')[0]} -> ${r.status}${blockPage ? ' (block page)' : ''}`,
                )
                // A bridge 429 must enter the shared backoff; monitoring's
                // next cycle needs to know the IP is hot (message shape
                // matters, see flagIfRateLimited). Other statuses are about
                // one resource and leave the user's warning alone.
                if (r.status === 429) {
                    flagIfRateLimited(new Error(`www.reddit.com request failed: ${r.status}`))
                }
                return { ok: false, status: r.status, data: null }
            }
            const json = await r.json()
            return {
                ok: true,
                status: r.status,
                data: toPublicView(json, await getPublicViewContext(me)),
                view: 'logged_in',
            }
        } catch (err: any) {
            return { ok: false, status: 0, error: controller.signal.aborted ? 'timeout' : String(err?.message || err) }
        } finally {
            clearTimeout(timer)
        }
    })
    lane = run
        .then(
            () => undefined,
            () => undefined,
        )
        .then(() => new Promise<void>(resolve => setTimeout(resolve, BRIDGE_SPACING_MS)))
    try {
        return await run
    } catch (err: any) {
        return { ok: false, status: 0, error: String(err?.message || err) }
    }
}
