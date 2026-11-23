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
//   carry reveddit_unverified when monitoring's last pass could have seen them
//   in the logged-out view and didn't, since only that can tell (the website
//   can say so).
// - Moderators see removed items in their subreddits with the text intact and
//   removed: true or banned_by (the remover) set, verified 2026-10-17 on
//   r/pushshift; spam marks spam-filter removals.
// - Fields that only a logged-in viewer gets (votes, saves, reports, the
//   viewer's standing in a subreddit) are set to their logged-out values.
// - Items by authors who blocked the user read [unavailable]; they carry
//   reveddit_viewer_blocked, so they aren't taken for removals.
// - Private communities' items are left out, and a private community's about
//   or thread is answered 403, as reddit does logged out.
// - While monitoring finds the user's own profile missing from the logged-out
//   view (the shadowban signature, lookup-status.ts), the bridge answers 404 for
//   it, as reddit does logged out.
// Monitoring's own public-view fetches stay logged out.
//
// reveddit.com's user pages also read a person's comment feed, which still has
// the comments moderators removed, with their text, and each comment the
// profile listing leaves out, on its permalink, to tell removed from hidden
// (website data_processing/user.ts). Those two read like scans (requests.ts
// scanTurnIn): at the scans' pace, never under CHECK_MIN_GAP_MS apart, skipping
// the browser's cache, within half the window, and not at all while the
// scanFeeds remote option is off. The feed is answered as a comments listing
// (feed-listing.ts) and isn't rewritten: Reddit shows it the same to everyone,
// removed comments included. A permalink read carries the second account's
// verdict on its comment (viewerVerdictOf).

import browser from 'webextension-polyfill'
import {
    getRateLimitBackoffRemainingMs,
    getMsSinceLastRateLimitHit,
    getObjectNamesForThing,
    getOldestDateKey,
    getPublicLiveKey,
    getScanSettings,
} from './storage'
import { flagIfRateLimited, RECENT_RATE_LIMIT_WINDOW_MS, readLocal, isFresh } from './request-gates'
import { isPublicProfileUnavailable, publicViewUncheckedReason } from './lookup-status'
import { isCycleInFlight } from './monitoring'
import { isPlaceholderText, isRemovedInModView, isViewerBlockedItem } from './common'
import { dlog } from './diaglog'
import { getPublicModlogsFeed } from './bridge-config'
import { fetchLoggedIn, withDeadline, UNCACHED_MODES, workerSession } from './logged-in-fetch'
import { isViewerConnecting, hasRedditLoginCookie } from './viewer'
import { getRemoteMechanism, MECHANISM_SCAN_FEEDS } from './news'
import { scanTurnIn } from './requests'
import { feedListing, NOT_A_FEED } from './feed-listing'
import { viewerVerdictOf } from './viewer-lookup'

const www_reddit = 'https://www.reddit.com'

// A user's listings and abouts, as the website requests them: the overview
// (/user/<name>/.json, normalized below to /user/<name>.json), a tab, the
// about, the moderated subreddits. Group 1 is the name.
const USER_PATH =
    /^\/user\/([\w-]{1,30})(?:\.json|\/(?:comments|submitted|overview|gilded|about|moderated_subreddits)\.json)$/

// A person's comment feed and one comment's permalink, as the user pages read
// them: the forms scans and followed items were measured with
const USER_COMMENT_FEED = /^\/user\/([\w-]{1,30})\/comments\/\.rss$/
const COMMENT_PERMALINK = /^\/comments\/([a-z0-9]{1,20})\/_\/([a-z0-9]{1,20})\.json$/
const T1_FULLNAME = /^t1_[a-z0-9]{1,20}$/
// Each parameter at most once, with these values only, and the permalink's
// all three. Reddit's private feeds take feed and user parameters, so a read
// with the login must never carry one.
const CHECK_PARAMS: [RegExp, Record<string, RegExp>, string[]][] = [
    [
        USER_COMMENT_FEED,
        {
            sort: /^(new|top|controversial|hot)$/,
            t: /^(hour|day|week|month|year|all)$/,
            limit: /^([1-9][0-9]?|100)$/,
            after: T1_FULLNAME,
            before: T1_FULLNAME,
        },
        [],
    ],
    [COMMENT_PERMALINK, { limit: /^1$/, depth: /^1$/, raw_json: /^1$/ }, ['limit', 'depth', 'raw_json']],
]
const isCheckPath = (path: string): boolean => CHECK_PARAMS.some(([path_]) => path_.test(path))
const checkParamsAllowed = (path: string, params: URLSearchParams): boolean => {
    const rule = CHECK_PARAMS.find(([path_]) => path_.test(path))
    if (!rule) {
        return true
    }
    const [, allowed, required] = rule
    const keys = [...params.keys()]
    return (
        new Set(keys).size === keys.length &&
        !(params.has('after') && params.has('before')) &&
        keys.every(key => allowed[key]?.test(params.get(key) || '')) &&
        required.every(key => params.has(key))
    )
}

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
    USER_COMMENT_FEED,
    COMMENT_PERMALINK,
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
    if (!ALLOWED_PATHS.some(re => re.test(path)) || !checkParamsAllowed(path, u.searchParams)) {
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

interface PublicViewContext {
    // Fullnames monitoring has confirmed removed
    knownRemoved: Set<string>
    // The logged-in user, lowercased; '' when unknown
    me: string
    // The user's items monitoring's last pass saw in the logged-out view
    verifiedLive: Set<string>
    // While that record is fresh, the created_utc of the oldest item its one
    // listing page covers (0: all of them). Unset, no item is flagged.
    liveSince?: number
}

// Whether monitoring's record could have seen the user's item live: one it
// covers, in a community the logged-out view shows
const couldBeSeenLive = (data: any, liveSince: number | undefined): boolean =>
    liveSince !== undefined &&
    Number(data.created_utc) >= liveSince &&
    !publicViewUncheckedReason(String(data.name || ''), data)

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
            const live: any = await readLocal(liveKey, null)
            if (Array.isArray(live?.ids) && isFresh(Number(live?.t), PUBLIC_LIVE_MAX_AGE_MS, Date.now())) {
                live.ids.forEach((id: string) => context.verifiedLive.add(id))
                // Written only from a full page: fewer items, and it covers all
                context.liveSince = Number(await readLocal(getOldestDateKey(me, true), 0)) || 0
            }
        }
    } catch {
        // storage unreadable: nothing known
    }
    return context
}

const REMOVED_BODY_HTML = '&lt;div class="md"&gt;&lt;p&gt;[removed]&lt;/p&gt;\n&lt;/div&gt;'
const REMOVED_SELFTEXT_HTML = '&lt;!-- SC_OFF --&gt;' + REMOVED_BODY_HTML + '&lt;!-- SC_ON --&gt;'

// A removed comment's author as logged-out JSON hides it: [deleted], with no
// account id, flair or badges (a moderator's view keeps them all)
const REMOVED_COMMENT_AUTHOR_FIELDS = /^author_(?:fullname|flair_\w+|premium|patreon_flair|cakeday)$/

// One item rewritten to what logged-out visitors see, in the shape the
// website reads (its utils.tsx commentIsRemoved and itemIsRemovedOrDeleted).
// Items their authors deleted already read [deleted] in every view and are
// left alone. So are comments reddit removed, which others see as
// "[ Removed by Reddit ]" with the author kept (archived copies): the website
// reads that as reddit's removal, not a moderator's.
const markPubliclyRemoved = (kind: string, item: any) => {
    if (kind === 't1') {
        if (!isPlaceholderText(item.body ?? '')) {
            // Trusted where '[removed]' isn't: an author can type that
            item.reveddit_removed = true
            item.body = '[removed]'
            item.author = '[deleted]'
            if ('body_html' in item) {
                item.body_html = REMOVED_BODY_HTML
            }
            for (const key of Object.keys(item)) {
                if (REMOVED_COMMENT_AUTHOR_FIELDS.test(key)) {
                    delete item[key]
                }
            }
            if ('is_submitter' in item) {
                item.is_submitter = false
            }
        }
    } else if (item.author !== '[deleted]') {
        item.reveddit_removed = true
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
    is_blocked: false,
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

// Communities only their members can read: logged out, reddit answers 403
// for them and leaves their items out of listings. (Quarantined ones are
// readable logged out with the opt-in, which reveddit gets.)
const MEMBERS_ONLY_SUBREDDIT_TYPES = new Set(['private', 'employees_only'])
const isMembersOnly = (data: any): boolean => MEMBERS_ONLY_SUBREDDIT_TYPES.has(data?.subreddit_type)

// An answer that is wholly a members-only community's: its about, or a
// thread whose post is in one. The bridge answers those as reddit does
// logged out.
const isMembersOnlyAnswer = (json: any): boolean =>
    (json?.kind === 't5' && isMembersOnly(json.data)) ||
    (Array.isArray(json) && json[0]?.kind === 'Listing' && isMembersOnly(json[0].data?.children?.[0]?.data))
const MEMBERS_ONLY_ANSWER = { reason: 'private', message: 'Forbidden', error: 403 }

// The logged-in view rewritten to the public one (see the top). Walks the
// shapes the allowlisted endpoints return: listings, a thread's [post,
// comments] pair, nested replies, crossposts' parents, morechildren's
// json.data.things, subreddit and account abouts, and moderated_subreddits'
// plain array.
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
                !context.verifiedLive.has(data.name) &&
                couldBeSeenLive(data, context.liveSince)
            ) {
                data.reveddit_unverified = true
            }
            if (isViewerBlockedItem(data)) {
                data.reveddit_viewer_blocked = true
            }
            resetViewerFields(data)
            visit(data.replies)
            // A crosspost carries its parent posts whole, without a kind
            if (Array.isArray(data.crosspost_parent_list)) {
                data.crosspost_parent_list = data.crosspost_parent_list.filter((parent: any) => !isMembersOnly(parent))
                data.crosspost_parent_list.forEach((parent: any) => visit({ kind: 't3', data: parent }))
            }
        } else if (node.kind === 't2' && data && typeof data === 'object') {
            resetViewerFields(data)
            // The account's profile subreddit: whether the viewer follows,
            // moderates or is banned from it
            if (data.subreddit && typeof data.subreddit === 'object') {
                resetViewerFields(data.subreddit)
            }
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
            if (Array.isArray(data?.children)) {
                data.children = data.children.filter((child: any) => !isMembersOnly(child?.data))
            }
            visit(data?.children)
        } else if (node.kind === 'ModeratedList' && Array.isArray(data)) {
            node.data = data.filter(entry => !isMembersOnly(entry))
            node.data.forEach((entry: any) => entry && typeof entry === 'object' && resetViewerFields(entry))
        } else if (Array.isArray(node.json?.data?.things)) {
            node.json.data.things = node.json.data.things.filter((thing: any) => !isMembersOnly(thing?.data))
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

// The feed and permalink reads' half of the window, and how long Reddit's rate
// headers asked them to stop. Kept in the worker's session storage too: the
// page waits seconds between these reads, and Chrome stops an idle worker,
// memory and all. Mutable for tests.
export const _bridgeChecks = { times: [] as number[], restUntil: 0 }
const BRIDGE_CHECKS_KEY = 'bridge_checks'
// The user pages' pace never comes under this, whatever the scans are set to
const CHECK_MIN_GAP_MS = 3000
// Reddit's rate headers, where it sends them (a flagged account had 100 per
// 10 minutes at 4 a read, 2026-11-05): at this many left, these reads stop
const RATE_REMAINING_FLOOR = 20
const RATE_REST_MAX_MS = BRIDGE_WINDOW_MS

const loadChecks = async () => {
    const session = workerSession()
    if (!session || _bridgeChecks.times.length || _bridgeChecks.restUntil) {
        return
    }
    const read: Record<string, any> = await session.get(BRIDGE_CHECKS_KEY).catch(() => ({}))
    const stored = read?.[BRIDGE_CHECKS_KEY]
    if (Array.isArray(stored?.times)) {
        _bridgeChecks.times = stored.times.filter((t: unknown) => Number.isFinite(t))
    }
    _bridgeChecks.restUntil = Number(stored?.restUntil) || 0
}
const saveChecks = () => {
    workerSession()
        ?.set({ [BRIDGE_CHECKS_KEY]: { times: _bridgeChecks.times, restUntil: _bridgeChecks.restUntil } })
        .catch(() => {})
}
const noteCheckRead = () => {
    _bridgeChecks.times.push(Date.now())
    saveChecks()
}
const noteRateHeaders = (r: Response) => {
    const remaining = r.headers?.get?.('x-ratelimit-remaining')
    if (remaining == null || !(Number(remaining) < RATE_REMAINING_FLOOR)) {
        return
    }
    const reset = Number(r.headers.get('x-ratelimit-reset'))
    const restMs = reset > 0 ? Math.min(reset * 1000, RATE_REST_MAX_MS) : RATE_REST_MAX_MS
    _bridgeChecks.restUntil = Date.now() + restMs
    saveChecks()
    dlog(
        'bridge',
        `[reveddit] bridge: reddit's rate headers say ${remaining} left, so user-page reads stop for ${Math.ceil(restMs / 1000)}s`,
    )
}
// single-lane serialization with spacing between fetches
let lane: Promise<void> = Promise.resolve()

interface BridgeResponse {
    ok: boolean
    status: number
    data?: any
    error?: string
    retryAfterMs?: number
    // Fetched with the user's login and rewritten to the public view (above)
    view?: 'logged_in'
    // A comment feed's: whether it's the account the bridge reads as, and the
    // reads a click may spend checking (the scans' setting)
    own?: boolean
    readsPerClick?: number
    // A permalink read's
    verdict?: 'live' | 'removed' | 'unknown'
}

const busy = (): BridgeResponse => ({ ok: false, status: 0, error: 'busy', retryAfterMs: BUSY_RETRY_AFTER_MS })

// The user's own listings and abouts, under /user/<name>
const ownProfileUser = (url: string, me: string): boolean => {
    const path = new URL(url).pathname
    const name = (path.match(USER_PATH) || path.match(USER_COMMENT_FEED))?.[1]
    return Boolean(me && name && name.toLowerCase() === me.toLowerCase())
}

export const handleBridgeFetch = async (request: any): Promise<BridgeResponse> => {
    const deadline = Date.now() + BRIDGE_DEADLINE_MS
    const url = validateBridgeUrl(request?.url)
    if (!url) {
        return { ok: false, status: 0, error: 'invalid url' }
    }
    const path = new URL(url).pathname
    const check = isCheckPath(path)
    if (check && (await getRemoteMechanism(MECHANISM_SCAN_FEEDS)) === 'off') {
        return { ok: false, status: 0, error: 'feeds_off' }
    }
    // A second account is signing in (viewer.ts): the browser's login isn't
    // the user's for that minute
    if (await isViewerConnecting()) {
        return busy()
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
    if (check) {
        await loadChecks()
        _bridgeChecks.times = _bridgeChecks.times.filter(t => now - t >= 0 && now - t < BRIDGE_WINDOW_MS)
        if (_bridgeChecks.restUntil > now + RATE_REST_MAX_MS) {
            // a clock set back
            _bridgeChecks.restUntil = 0
        }
        if (_bridgeChecks.restUntil > now) {
            return { ok: false, status: 0, error: 'reddit_limit', retryAfterMs: _bridgeChecks.restUntil - now }
        }
        // Not logged: a page that keeps asking would fill the saved log, and the
        // page says it itself
        if (_bridgeChecks.times.length >= Math.floor(budget / 2)) {
            const freesAt = Math.min(..._bridgeChecks.times) + BRIDGE_WINDOW_MS
            return { ok: false, status: 0, error: 'budget_exhausted', retryAfterMs: Math.max(1000, freesAt - now) }
        }
    }
    const me = await getLoggedInUser()
    if (ownProfileUser(url, me) && (await isPublicProfileUnavailable(me))) {
        return { ok: false, status: 404 }
    }
    if (check) {
        // Takes the scans' turn, so these and scans share one pace. Too soon,
        // the page waits and asks again: nothing is sent, counted or logged.
        const waitMs = await scanTurnIn(CHECK_MIN_GAP_MS)
        if (waitMs > 0) {
            return { ok: false, status: 0, error: 'wait', retryAfterMs: waitMs }
        }
        noteCheckRead()
    }
    recentTimes.push(now)
    const run = lane.then(async (): Promise<BridgeResponse> => {
        // Queued behind other requests past the point an answer could arrive in
        // time, or while a second account began signing in
        if (deadline - Date.now() < MIN_FETCH_MS || (await isViewerConnecting())) {
            return busy()
        }
        return withDeadline(deadline - Date.now(), async signal => {
            try {
                const { response: r, blockPage } = await fetchLoggedIn(url, {
                    signal,
                    // Feeds say the browser may keep them an hour
                    ...(check && { modes: UNCACHED_MODES }),
                    canRetry: () => deadline - Date.now() >= MIN_FETCH_MS,
                    // the retry is a request too
                    onRetry: () => {
                        recentTimes.push(Date.now())
                        if (check) {
                            noteCheckRead()
                        }
                    },
                    onSwitched: (blocked, answered, status) =>
                        dlog(
                            'bridge',
                            `[reveddit] bridge: block page in cache mode ${blocked}, ${answered} got through (${status})`,
                        ),
                })
                if (check) {
                    noteRateHeaders(r)
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
                    // The edge's page in both modes says nothing of this feed,
                    // comment or profile, where Reddit's own 403 (a suspended
                    // account) or 404 does
                    return {
                        ok: false,
                        status: r.status,
                        data: null,
                        ...(blockPage && { error: 'block_page' }),
                    }
                }
                if (USER_COMMENT_FEED.test(path)) {
                    let data
                    try {
                        data = feedListing(await r.text())
                    } catch {
                        dlog('bridge', `[reveddit] bridge: ${url.split('?')[0]} -> a page in place of the feed`)
                        return { ok: false, status: r.status, error: NOT_A_FEED }
                    }
                    const { readsPerClick } = await getScanSettings()
                    return {
                        ok: true,
                        status: r.status,
                        data,
                        view: 'logged_in',
                        readsPerClick,
                        ...(ownProfileUser(url, me) && { own: true }),
                    }
                }
                const json = await r.json()
                if (isMembersOnlyAnswer(json)) {
                    dlog('bridge', `[reveddit] bridge: ${url.split('?')[0]} -> members-only community, answered 403`)
                    return { ok: false, status: 403, data: MEMBERS_ONLY_ANSWER }
                }
                const data = toPublicView(json, await getPublicViewContext(me))
                const comment = path.match(COMMENT_PERMALINK)
                return {
                    ok: true,
                    status: r.status,
                    data,
                    view: 'logged_in',
                    ...(comment && { verdict: viewerVerdictOf(`t1_${comment[2]}`, comment[1], data) }),
                }
            } catch (err: any) {
                return { ok: false, status: 0, error: signal.aborted ? 'timeout' : String(err?.message || err) }
            }
        })
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
