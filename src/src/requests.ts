import {
    getOptions,
    addToPendingPostQueue,
    removeMultipleFromPendingPostQueue,
    getPublicLiveKey,
    getLocalStorageItems,
    recordRateLimitHit,
    clearRateLimitBackoff,
    getMsSinceLastRateLimitHit,
    getScanSettings,
    getRateLimitBackoffRemainingMs,
} from './storage'
import browser from 'webextension-polyfill'
import { dlog, dlogSummary } from './diaglog'
import { getItemsById_fromOldHTML, getPost_fromOld } from './parse_html/old'
import {
    getPublicProfileItems,
    PublicProfileData,
    fullnameValue,
    FetchHtml,
    buildPostPageUrl,
    classifyPostPage,
    PostPageStatus,
    buildCommentPageUrl,
    buildCommentThreadUrl,
    buildCommentPartialUrl,
    classifyCommentPage,
    solveChallenge,
    isSolvedChallengeUrl,
    describePageForDiag,
    isCaptchaPage,
    sitePermalink,
} from './parse_html/new'
import { newReddit, isRateLimitError } from './parse_html/common'
import {
    setWarningBadge,
    isRemovedComment,
    isRemovedItem,
    isViewerBlockedItem,
    isUserDeletedComment,
    RedditItem,
} from './common'
import { fetchForScan, fetchLoggedIn } from './logged-in-fetch'
import {
    getRemoteMechanism,
    resolveMechanismDisabled,
    MECHANISM_LEGACY,
    MECHANISM_ABSENT_VERIFICATION,
    MECHANISM_ABSENT_UNVERIFIED_UNKNOWN,
    MECHANISM_ME_CHALLENGE,
    MECHANISM_SCAN_FEEDS,
    getRemoteWwwRouteOrder,
    CAPABILITY_REST_KEY,
} from './news'
import { isWwwRoute, parseWwwRoute, wwwRouteOrder, WwwRoute, WwwRouteCache } from './www-routes'
import { loginWallLanding, isLoginWallPage, isLoginWallMessage, LOGIN_WALL_MESSAGE } from './login-wall-config'
import {
    isViewerConnecting,
    getViewer,
    checkViewerIdentity,
    fetchJsonAsViewer,
    isSignedInViewer,
    ViewerAccount,
    VIEWER_FAILURES_KEY,
    StoredCookie,
    toStoredCookie,
    settableCookie,
    restoreCookies,
    isExpired,
    hasRedditLoginCookie,
    installViewerHeaderRule,
} from './viewer'

// Gate for the unauthenticated legacy paths: old.reddit.com HTML and unauth www
// .json — the endpoints Reddit's announced deprecation removes. Gates exactly the
// unauthenticated legacy call sites; authenticated calls (credentials:'include')
// and the www SSR HTML public path survive the real change, so they are never gated.
//
// Resolution, highest priority first:
// 1. Dev storage override (dev options checkbox, or from the service-worker console):
//      chrome.storage.local.set({ dev_simulate_endpoint_deprecation: true })   // or false
//      chrome.storage.local.remove('dev_simulate_endpoint_deprecation')        // back to defaults
// 2. Remote option MECHANISM_LEGACY from the news feed (see news.ts) — lets the
//    legacy paths be turned off fleet-wide when the deprecation actually lands,
//    without waiting on a store republish. 'auto' defers to the build.
// 3. Build default (SIMULATE_DEPRECATION=true → dist-*-nolegacy folders). The
//    extension checks for removals immediately on load, so this is what's in
//    effect before the first news fetch completes.
export const DEV_SIMULATE_DEPRECATION_KEY = 'dev_simulate_endpoint_deprecation'
const SIMULATE_DEPRECATION_BUILD_DEFAULT =
    typeof __SIMULATE_DEPRECATION__ !== 'undefined' ? __SIMULATE_DEPRECATION__ : false
export const isLegacyDisabled = (): Promise<boolean> =>
    browser.storage.local
        .get({ [DEV_SIMULATE_DEPRECATION_KEY]: null })
        .then(async (r: any) => {
            const dev = r[DEV_SIMULATE_DEPRECATION_KEY]
            const remote = await getRemoteMechanism(MECHANISM_LEGACY)
            return resolveMechanismDisabled(dev === null ? null : !!dev, remote, SIMULATE_DEPRECATION_BUILD_DEFAULT)
        })
        .catch(() => SIMULATE_DEPRECATION_BUILD_DEFAULT)

// Message shape matches flagIfRateLimited's /request failed: (\d+)/ — a 403 does
// not trigger rate-limit backoff, mirroring how the real deprecation responds.
export const throwIfLegacyDisabled = async (label: string) => {
    if (await isLegacyDisabled()) {
        throw new Error(`${label} request failed: 403 (legacy endpoints disabled)`)
    }
}

// Methods reddit can refuse outright with its block page, each resting on its
// own: 'api_info' (api/info.json with the user's login, refused everywhere
// tried on 2026-10-24), 'legacy_info' (the legacy /api/info HTML listing,
// refused with it), 'legacy' (the legacy post pages, which still
// answered then) and 'thread_json' (a thread's JSON with the user's login,
// which followed items and pending posts read while api/info rests). One
// kind's refusal says nothing about another's, so they don't share a rest. A
// refused method rests, and each refusal in a row doubles the rest, up to a
// week. A blocked method then costs almost nothing, yet is tried again at
// least weekly, in case reddit restores it; one success ends the rest. Nothing
// gives up for good. (The remote option legacyOldReddit 'off' is the switch
// that stops the legacy paths outright.)
export { CAPABILITY_REST_KEY }
export type RestingCapability = 'legacy' | 'legacy_info' | 'api_info' | 'thread_json'
export type LegacyKind = 'legacy' | 'legacy_info'
export const CAPABILITY_FIRST_REST_MS = 6 * 3600 * 1000
export const CAPABILITY_MAX_REST_MS = 7 * 24 * 3600 * 1000
interface CapabilityRest {
    // refusals in a row
    refusals: number
    until: number
    // when the first of them came
    since: number
}
export const capabilityRestMs = (refusals: number): number =>
    Math.min(CAPABILITY_FIRST_REST_MS * 2 ** Math.max(0, refusals - 1), CAPABILITY_MAX_REST_MS)
const readCapabilityRests = async (): Promise<Partial<Record<RestingCapability, CapabilityRest>>> => {
    try {
        return ((await browser.storage.local.get({ [CAPABILITY_REST_KEY]: {} })) as any)[CAPABILITY_REST_KEY] || {}
    } catch {
        return {}
    }
}
// A rest further ahead than the longest one (the clock was set back) is
// ignored, so the next refusal starts a new rest rather than finding the old
// one still running
const isRestActive = (rest: CapabilityRest | undefined, now: number): boolean => {
    const left = Number(rest?.until) - now
    return left > 0 && left <= CAPABILITY_MAX_REST_MS
}
export const isCapabilityResting = async (capability: RestingCapability): Promise<boolean> =>
    isRestActive((await readCapabilityRests())[capability], Date.now())
const hoursText = (ms: number) => `${Math.round(ms / 3600000)} h`
export const noteCapabilityRefused = async (capability: RestingCapability, why: string) => {
    try {
        const rests = await readCapabilityRests()
        const now = Date.now()
        const before = rests[capability]
        // Already resting: a path that doesn't honor the rest (a restore the
        // user started) adds no refusal; only the tries the rest allows count
        if (isRestActive(before, now)) {
            return
        }
        const refusals = (before?.refusals || 0) + 1
        const restMs = capabilityRestMs(refusals)
        rests[capability] = { refusals, until: now + restMs, since: before?.since || now }
        await browser.storage.local.set({ [CAPABILITY_REST_KEY]: rests })
        dlogSummary(
            'cycle',
            `[reveddit] ${capability} refused (${why}): resting ${hoursText(restMs)}, ` +
                `refusal ${refusals} in a row since ${new Date(rests[capability]!.since).toISOString()}`,
        )
    } catch {
        /* ignored */
    }
}
export const noteCapabilityWorked = async (capability: RestingCapability) => {
    try {
        const rests = await readCapabilityRests()
        const before = rests[capability]
        if (!before) {
            return
        }
        delete rests[capability]
        await browser.storage.local.set({ [CAPABILITY_REST_KEY]: rests })
        dlogSummary(
            'cycle',
            `[reveddit] ${capability} works again, after ${before.refusals} refusals since ${new Date(before.since).toISOString()}`,
        )
    } catch {
        /* ignored */
    }
}

export const isLegacyResting = (kind: LegacyKind = 'legacy'): Promise<boolean> => isCapabilityResting(kind)
// Off for now: disabled (dev switch, remote option, build), or resting after a
// refusal. Monitoring and page views honor both.
export const isLegacyOff = async (kind: LegacyKind = 'legacy'): Promise<boolean> =>
    (await isLegacyDisabled()) || (await isLegacyResting(kind))
const throwIfLegacyOff = async (label: string, kind: LegacyKind) => {
    await throwIfLegacyDisabled(label)
    if (await isLegacyResting(kind)) {
        throw new Error(`${label} skipped: resting after reddit refused it`)
    }
}

// A real 403 (not the simulated one above) rests that kind of legacy request
export const noteLegacyRefusal = (err: any, kind: LegacyKind = 'legacy'): Promise<void> => {
    const message = String(err?.message || err)
    if (/request failed: 403\b/.test(message) && !message.includes('legacy endpoints disabled')) {
        return noteCapabilityRefused(kind, 'HTTP 403')
    }
    return Promise.resolve()
}

// Only a 429 is rate limiting. A 403 is a block (challenge page, structural
// block on unauthenticated JSON) and gets its own status so the popup and
// support triage stop calling it rate limiting. The synthetic '(legacy
// endpoints disabled)' 403 is a build-time simulation, not a live block.
const RATE_LIMIT_STATUSES = new Set([429])
export const flagIfRateLimited = (err: Error) => {
    const m = err.message.match(/request failed: (\d+)/)
    if (!m) return
    const status = Number(m[1])
    if (RATE_LIMIT_STATUSES.has(status)) {
        setWarningBadge('rate_limited')
    } else if (status === 403 && !err.message.includes('legacy endpoints disabled')) {
        setWarningBadge('reddit_blocked')
    }
    // Only a real 429 means rate-limited. A 403 is Reddit's structural block on
    // unauthenticated JSON requests (it happens every cycle now), so it must NOT
    // trigger backoff — otherwise the alarm would needlessly pause monitoring.
    if (status === 429) {
        dlog('ratelimit', '[reveddit] 429 from Reddit — scheduling monitoring backoff')
        recordRateLimitHit()
    }
}

const oauth_reddit = 'https://oauth.reddit.com/'
const www_reddit = 'https://www.reddit.com/'

const NO_AUTH = 'none'

// Per-item data the public-view lookup needs from the authenticated view.
// - locked/created_utc: the public HTML omits both; without them items would
//   misclassify as unlocked / never-too-old.
// - is_robot_indexable/removed_by_category: the author's own view often reveals a
//   post removal (e.g. modqueue/spam) that the public profile feed still shows
//   during a grace period. is_robot_indexable===false is a reliable POSITIVE
//   removal signal (only its "true" is unreliable, per the 24h grace window), so
//   it's used only to confirm removal, never to override one.
export interface AuthItemMeta {
    locked?: boolean
    created_utc?: number
    is_robot_indexable?: boolean
    removed_by_category?: string | null
    // permalink/link_id: for building a comment's own logged-out page URL when
    // it's absent from the public feed (see verifyFeedAbsentItems).
    permalink?: string
    link_id?: string
    // Publicly-invisible classes: their own pages are gated logged-out, so feed
    // absence can't be verified — and monitoring.ts already exempts them from
    // feed-absence removal (readLookupResult). Used to skip verification.
    quarantine?: boolean
    over_18?: boolean
    subreddit_type?: string
    // Already recorded as removed in extension storage. Removed posts can linger
    // in the public feed well past creation age (verified live: a 3.5-week-old
    // post, removed a day earlier, still listed), so feed presence must never
    // flip a recorded removal back to approved without a page verdict.
    known_removed?: boolean
    // Who the author's own view says wrote it: whoever the browser is signed
    // in as, even when login detection fell back to the cached username
    author?: string
}
export type AuthItemsMeta = Record<string, AuthItemMeta>

// Why nobody logged out can see an item, '' when they can: quarantined, NSFW
// (on a comment, its post or community is marked 18+) or in a private
// community. 'restricted' communities only limit posting; their content is
// publicly viewable.
export const publiclyInvisibleReason = (meta: AuthItemMeta | undefined): string => {
    if (meta?.quarantine) return 'quarantined'
    if (meta?.over_18) return 'NSFW'
    if (meta?.subreddit_type === 'private') return 'private'
    return ''
}

// A post whose author's own view says it was removed. It needs no public view
// to judge, and monitoring marks such a recorded removal (a: 1) so that view
// can end it. is_robot_indexable === false alone doesn't count here: it hasn't
// been checked on NSFW posts that weren't removed.
export const postRemovedByCategory = (id: string, meta: AuthItemMeta | undefined): boolean =>
    id.startsWith('t3_') && !!meta?.removed_by_category

// Why the public view can't judge an item, '' when it can
export const publicViewUncheckedReason = (id: string, meta: AuthItemMeta | undefined): string =>
    postRemovedByCategory(id, meta) ? '' : publiclyInvisibleReason(meta)

export const lookupItemsByID = (
    ids: string | string[],
    auth: any,
    monitor_quarantined = false,
    username = '',
    authItemsMeta: AuthItemsMeta = {},
) => {
    const params: Record<string, any> = { id: ids, raw_json: 1 }
    const search =
        '?' +
        Object.keys(params)
            .map(k => `${k}=${params[k]}`)
            .join('&')

    return lookupItemsByID_withFallback('api/info', search, auth, monitor_quarantined, ids, username, authItemsMeta)
}

// Options every public-view (logged-out) www fetch starts from, whichever
// route makes it. credentials MUST be omitted: rehydrateStoredRedditCookies()
// can put the user's real session in the browser jar, and sending it would turn
// this "public" view into the authenticated view — removals would never be
// detected.
export const PUBLIC_VIEW_FETCH_INIT: RequestInit = {
    credentials: 'omit',
    headers: { 'Accept-Language': 'en' },
}

// A route's cache mode on top of the public-view options ('default' adds none)
export const publicViewInit = (cache: WwwRouteCache = 'default'): RequestInit =>
    cache === 'default' ? PUBLIC_VIEW_FETCH_INIT : { ...PUBLIC_VIEW_FETCH_INIT, cache }

// Firefox's (MV2) content scripts get a privileged fetch(): reddit sees it as an
// extension request, identical on the wire to a background fetch (tabId -1, no
// Referer), so it gets the JS challenge too, and the solved request got the 403
// block page. content.fetch is the page's own fetch, which acts like a Chrome
// content script's: same-origin with the tab, Referer set, no challenge
// (verified 2026-10-17). Chrome has no `content` global and keeps its fetch.
declare const content: { fetch?: typeof fetch } | undefined
export const pageContextFetch = (url: string, init: RequestInit): Promise<Response> => {
    const page = typeof content !== 'undefined' && content && typeof content.fetch === 'function' ? content : null
    return page ? page.fetch!(url, init) : fetch(url, init)
}

// How a route failed. Routing reads 'unavailable' (a leg that can't run isn't
// rested); how long a refused route rests comes from the status (6 h after a
// 403 block page, else 30 min). 'refused' and 'network' only label the log.
// The text keeps the 'request failed: N' shape flagIfRateLimited reads.
// - refused: reddit turned the route away (its 403 block page, the captcha, a
//   page the caller can't read, a challenge answered with another challenge)
// - network: no answer at all (a network error, or a stall the timeout ended)
// - unavailable: the tab legs can't run (no usable tab, injection refused)
// - login: reddit sent the fetch to its login page (login-wall-config.ts).
//   Every route is logged out alike, so no other route is tried and none rests.
export type RouteFailure = 'refused' | 'network' | 'unavailable' | 'login'
class RouteError extends Error {
    constructor(
        message: string,
        readonly failure: RouteFailure,
        readonly status = 0,
    ) {
        super(message)
    }
}

const loginWallError = (where: string) => new RouteError(`${LOGIN_WALL_MESSAGE}: ${where}`, 'login')
// Checked before the status: the login page may answer with any of them
const throwIfLoginRedirect = (redirectedTo: unknown) => {
    const landing = typeof redirectedTo === 'string' && redirectedTo ? loginWallLanding(redirectedTo) : null
    if (landing) {
        throw loginWallError(`redirected to ${landing}`)
    }
}

// A fetch, tab message or injected script that never settles (a stalled
// response, a frozen tab) is given up on, so one stall can't hang a lookup
export const WWW_FETCH_TIMEOUT_MS = 20 * 1000
const withTimeout = async <T>(promise: Promise<T>, what: string): Promise<T> => {
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
        return await Promise.race([
            promise,
            new Promise<never>((_, reject) => {
                timer = setTimeout(
                    () => reject(new RouteError(`${what} timed out after ${WWW_FETCH_TIMEOUT_MS / 1000} s`, 'network')),
                    WWW_FETCH_TIMEOUT_MS,
                )
            }),
        ])
    } finally {
        clearTimeout(timer)
    }
}

// An HTTP failure from any leg. Reddit's block page comes with a 403, so that
// route was refused. Other statuses say nothing about the route (a 429 is rate
// limiting, which monitoring backs off from; a 404 is about the page), so they
// end the fetch.
const httpFailure = (status: number): Error => {
    const message = `www.reddit.com request failed: ${status}`
    return status === 403 ? new RouteError(message, 'refused', 403) : new Error(message)
}

const fetchWwwHtml_viaBackground = async (url: string, cache: WwwRouteCache): Promise<string> => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), WWW_FETCH_TIMEOUT_MS)
    try {
        let response: Response
        try {
            response = await fetch(url, { ...publicViewInit(cache), signal: controller.signal })
        } catch (err: any) {
            throw new RouteError(`www.reddit.com request error: ${String(err?.message || err)}`, 'network')
        }
        throwIfLoginRedirect(response.redirected ? response.url : '')
        if (!response.ok) {
            throw httpFailure(response.status)
        }
        try {
            return await response.text()
        } catch (err: any) {
            throw new RouteError(`www.reddit.com response error: ${String(err?.message || err)}`, 'network')
        }
    } finally {
        clearTimeout(timer)
    }
}

// Fallback for a tab whose content script is orphaned (every extension update
// or reinstall severs content scripts in already-open tabs — issue #14's log
// showed "Receiving end does not exist" on each cycle): inject the fetch with
// scripting.executeScript instead. It runs same-origin inside the tab, so it
// keeps the challenge-free property the content-script path has. The injected
// function must be self-contained and must never reject — a rejected promise
// doesn't surface as an error consistently across browsers — so failures come
// back as a tagged object.
export const _fetchViaExecuteScript = async (
    tabId: number,
    url: string,
    init: RequestInit = PUBLIC_VIEW_FETCH_INIT,
): Promise<string> => {
    const scripting = (browser as any).scripting || (typeof chrome !== 'undefined' && (chrome as any).scripting)
    if (!scripting) {
        throw new RouteError('scripting API unavailable', 'unavailable')
    }
    let results: any[]
    try {
        results = (await withTimeout(
            scripting.executeScript({
                target: { tabId },
                func: async (u: string, init: RequestInit) => {
                    try {
                        // pageContextFetch, inlined: an injected function can't call out
                        const page =
                            typeof content !== 'undefined' && content && typeof content.fetch === 'function'
                                ? content
                                : null
                        const resp = await (page ? page.fetch!(u, init) : fetch(u, init))
                        return {
                            ok: resp.ok,
                            status: resp.status,
                            text: resp.ok ? await resp.text() : '',
                            redirectedTo: resp.redirected ? resp.url : '',
                        }
                    } catch (e) {
                        return { ok: false, status: 0, text: '', err: String(e) }
                    }
                },
                args: [url, init],
            }),
            'executeScript fetch',
        )) as any[]
    } catch (err: any) {
        // Injection itself failed: the tab closed or navigated, access was
        // refused, or a frozen tab never ran the script
        throw new RouteError(String(err?.message || err), 'unavailable')
    }
    const value = results && results[0] && results[0].result
    if (!value || typeof value.text !== 'string') {
        throw new RouteError('executeScript fetch returned no result', 'unavailable')
    }
    throwIfLoginRedirect(value.redirectedTo)
    if (!value.ok) {
        // Status 0: the injected fetch got no answer (a network error, or CORS
        // after the tab navigated to another origin). The route failed, not
        // the injection.
        if (!value.status) {
            throw new RouteError(`www.reddit.com tab request error: ${value.err || 'no answer'}`, 'network')
        }
        throw httpFailure(value.status)
    }
    return value.text
}

// Which route (www-routes.ts) makes a public-view fetch is learned, not fixed.
// A www.reddit.com tab's legs fetch same-origin: its content script, else a
// script injected into it. old.reddit.com and sh.reddit.com tabs cannot help,
// since content scripts follow the page's origin rules and cross-origin reads
// to www.reddit.com are CORS-blocked from them. The background reads www
// through host_permissions and gets the JS challenge on full pages, which
// parse_html/new.ts solves.
//
// Reddit's edge judges each leg's request headers separately and has reversed
// itself more than once, answering with the 190 KB "blocked by network
// security" 403 or the "Prove your humanity" captcha:
// - about 2026-09-14, Chrome: tab fetches (no cache headers) get the 403
// - 2026-10-17: background fetches get the 403 unless they send no-cache
//   headers (cache 'reload'), in Chrome and Firefox alike; Firefox's tab gets
//   the captcha with them and real pages without
// - 2026-10-21, Chrome: reversed in the background. 'reload' gets the 403 on
//   every solved page, /svc partial and legacy request, while 'no-store',
//   'default' and 'no-cache' read real pages. In the tab, 'default' gets the
//   403 or the captcha and 'no-cache' and 'reload' read real pages. Any route
//   still draws the odd captcha.
// Issue #27 was 0.0.5.25 still sending 'reload' from the background after
// that reversal, failing every lookup, while its tab legs failed too (likely
// a discarded tab).
//
// So a fetch tries routes in order. A refusal sends it to the next route and
// makes the refused route rest: six hours after a 403 (reddit's deliberate
// verdict on that request style), half an hour after a captcha, a network
// error or a page the caller can't read (often momentary). Routes that aren't
// resting go first, in order, so a route that never got a try (a tab route
// while no tab was open) is tried as soon as it can be, and a rested route
// gets its turn again on its own. When every route is resting, a fetch tries
// only the one that comes back soonest, so a client refused everywhere makes
// one request per page. A solved challenge's URL still works on the next route
// (verified 2026-10-21), so a refusal right after a solve costs one request,
// not a new challenge. Kinds of page keep separate memories, since reddit has
// refused them differently, and the memory survives restarts. Other failures
// (a 429, a 404) are about the client or the page, so they never switch
// routes. Nor does a login page (login-wall-config.ts): every route is logged
// out alike, so the fetch ends there, and that kind of page is fetched once an
// hour until one loads.
export const WWW_PAGE_KINDS = ['profile', 'profile-partial', 'partial', 'page'] as const
export type WwwPageKind = (typeof WWW_PAGE_KINDS)[number]
export const wwwPageKind = (url: string): WwwPageKind => {
    const path = url.replace(/^https?:\/\/[^/]+/, '')
    // A profile's tabs; a post in the profile (/user/<name>/comments/<post>/)
    // is a page like any other
    if (path.startsWith('/user/') && !/^\/user\/[^/]+\/comments\/[^/?#]+/.test(path)) {
        return 'profile'
    }
    if (path.startsWith('/svc/shreddit/profiles/')) {
        return 'profile-partial'
    }
    return path.startsWith('/svc/') ? 'partial' : 'page'
}
export const WWW_ROUTE_STATE_KEY = 'www_routes_v2'
// Earlier versions' route memory, removed when found
const OLD_ROUTE_STATE_KEYS = ['www_route_state', 'www_tab_refused_at']
export const WWW_HARD_REFUSAL_MS = 6 * 3600 * 1000
export const WWW_SOFT_REFUSAL_MS = 30 * 60 * 1000
// Pause before trying another route, so a refusal isn't answered with a burst
// (the captcha came in bursts during back-to-back requests, 2026-10-21).
// Mutable for tests, like _legacyLookups.
export const _wwwRouteTiming = { switchDelayMs: 500 }

// A route's last outcome for a kind of page: t is when it happened, and until
// (set only by a refusal) is when the route stops resting
interface RouteRecord {
    t: number
    until?: number
}
// A kind of page landing on reddit's login page: since is when that began, t
// the latest time, where what the log says about it. It holds until a page of
// the kind is served after t, and while it holds, a fetch of the kind goes out
// once an hour at most.
interface LoginWallRecord {
    since: number
    t: number
    where: string
}
interface KindState {
    routes: Partial<Record<WwwRoute, RouteRecord>>
    // The route that last served this kind of page
    served?: { route: WwwRoute; t: number }
    login?: LoginWallRecord
}
export type WwwRouteState = Partial<Record<WwwPageKind, KindState>>
export const LOGIN_WALL_REST_MS = 60 * 60 * 1000
const loginWallOf = (own: KindState | undefined): LoginWallRecord | null =>
    own?.login && own.login.t > (own.served?.t || 0) ? own.login : null

// Stored state, kept to well-formed entries. A clock that ran ahead and was
// set back leaves times in the future; they're held to now, so a refusal
// never rests longer than the longest memory.
const readRouteState = (raw: any, now: number): WwwRouteState => {
    const state: WwwRouteState = {}
    for (const kind of WWW_PAGE_KINDS) {
        const stored = raw?.[kind]
        if (!stored || typeof stored !== 'object') {
            continue
        }
        const routes: KindState['routes'] = {}
        for (const [route, record] of Object.entries(stored.routes || {})) {
            const t = Number((record as any)?.t)
            if (!isWwwRoute(route) || !(t > 0)) {
                continue
            }
            const until = Number((record as any)?.until)
            routes[route] = {
                t: Math.min(t, now),
                ...(until > 0 && { until: Math.min(until, now + WWW_HARD_REFUSAL_MS) }),
            }
        }
        const servedT = Number(stored.served?.t)
        const loginT = Number(stored.login?.t)
        const loginSince = Number(stored.login?.since)
        state[kind] = {
            routes,
            ...(isWwwRoute(stored.served?.route) &&
                servedT > 0 && { served: { route: stored.served.route, t: Math.min(servedT, now) } }),
            ...(loginT > 0 &&
                loginSince > 0 &&
                typeof stored.login.where === 'string' && {
                    login: {
                        since: Math.min(loginSince, loginT, now),
                        t: Math.min(loginT, now),
                        where: stored.login.where.slice(0, 200),
                    },
                }),
        }
    }
    return state
}

// Another lookup's saved state merged into this one's, the newest record per
// route winning, so lookups that overlap don't undo each other's refusals
const mergeRouteState = (mine: WwwRouteState, theirs: WwwRouteState) => {
    for (const kind of WWW_PAGE_KINDS) {
        const other = theirs[kind]
        if (!other) {
            continue
        }
        const own = (mine[kind] ||= { routes: {} })
        for (const [route, record] of Object.entries(other.routes) as [WwwRoute, RouteRecord][]) {
            if (!own.routes[route] || own.routes[route]!.t < record.t) {
                own.routes[route] = record
            }
        }
        if (other.served && (!own.served || own.served.t < other.served.t)) {
            own.served = other.served
        }
        if (other.login && (!own.login || own.login.t < other.login.t)) {
            own.login = other.login
        }
    }
}

type PageVerdict = 'served' | 'step' | 'captcha' | 're-challenged' | 'login' | 'unrecognized'
// What a 200 from a route means. A page the caller accepts is served, whatever
// else it mentions: the wall tests come after. A challenge is a step toward
// the page, not proof the route reads pages, so it changes nothing; the same
// challenge in answer to an already-solved URL means the route rejected the
// solve. A login page served in place of the page asked for is known only by
// the news feed's markers.
const judgePage = (html: string, url: string, accept?: (html: string) => boolean): PageVerdict => {
    if (accept?.(html)) {
        return 'served'
    }
    if (isCaptchaPage(html)) {
        return 'captcha'
    }
    if (solveChallenge(html, url) !== null) {
        return isSolvedChallengeUrl(url) ? 're-challenged' : 'step'
    }
    if (accept && isLoginWallPage(html)) {
        return 'login'
    }
    return accept ? 'unrecognized' : 'served'
}

// What a route's refusal was, for the log: the HTTP status, else 'network'
// (unavailable legs are skipped, not logged)
const describeFailure = (err: RouteError): string => String(err.status || 'network')

// The copied log's header line: each kind of page that lands on reddit's login
// page, since when and where it landed
export const getLoginWallLine = async (): Promise<string> => {
    try {
        const now = Date.now()
        const stored = ((await browser.storage.local.get({ [WWW_ROUTE_STATE_KEY]: null })) as any)[WWW_ROUTE_STATE_KEY]
        const state = readRouteState(stored, now)
        const walls = WWW_PAGE_KINDS.flatMap(kind => {
            const wall = loginWallOf(state[kind])
            return wall
                ? [
                      `${kind} pages since ${new Date(wall.since).toISOString()}, ` +
                          `last ${new Date(wall.t).toISOString()} (${wall.where})`,
                  ]
                : []
        })
        return `login wall: ${walls.length ? walls.join('; ') : 'none seen'}`
    } catch {
        return 'login wall: unknown'
    }
}

// Whether reddit asks for a login on any of these kinds of page, until one of
// them loads again
const isLoginWalled = async (kinds: WwwPageKind[]): Promise<boolean> => {
    try {
        const stored = ((await browser.storage.local.get({ [WWW_ROUTE_STATE_KEY]: null })) as any)[WWW_ROUTE_STATE_KEY]
        const state = readRouteState(stored, Date.now())
        return kinds.some(kind => !!loginWallOf(state[kind]))
    } catch {
        return false
    }
}

export interface WwwHtmlFetcher {
    fetchHtml: FetchHtml
    // The route that last served each kind of page, for the lookup's log line
    servedRoutes: () => Partial<Record<WwwPageKind, WwwRoute>>
}

export const getWwwHtmlFetcher = async (): Promise<WwwHtmlFetcher> => {
    let tabs: any[] = []
    try {
        if (typeof chrome !== 'undefined' && chrome.tabs) {
            tabs = await browser.tabs.query({ url: ['https://www.reddit.com/*'] })
        }
    } catch {
        /* no tabs API in this context */
    }
    // A discarded tab (Chrome's Memory Saver unloads idle ones) has no page to
    // message or inject into, and a frozen one may never answer, so both tab
    // legs fail on them, likely the "Receiving end does not exist" and "Cannot
    // access contents of the page" pair in issue #27's log.
    const tab = tabs.find(t => t.id != null && !t.discarded && !t.frozen)
    let contentScriptAlive = !!tab
    let injectionUsable = !!tab
    const tabUsable = () => contentScriptAlive || injectionUsable

    let state: WwwRouteState = {}
    try {
        const stored = (await browser.storage.local.get([WWW_ROUTE_STATE_KEY, ...OLD_ROUTE_STATE_KEYS])) as any
        state = readRouteState(stored[WWW_ROUTE_STATE_KEY], Date.now())
        if (OLD_ROUTE_STATE_KEYS.some(key => stored[key] !== undefined)) {
            await browser.storage.local.remove(OLD_ROUTE_STATE_KEYS)
        }
    } catch {
        /* ignored */
    }
    const order = wwwRouteOrder(await getRemoteWwwRouteOrder().catch(() => ({})))
    let dirty = false
    const saveState = async () => {
        if (!dirty) {
            return
        }
        dirty = false
        try {
            const stored = ((await browser.storage.local.get({ [WWW_ROUTE_STATE_KEY]: null })) as any)[
                WWW_ROUTE_STATE_KEY
            ]
            mergeRouteState(state, readRouteState(stored, Date.now()))
            await browser.storage.local.set({ [WWW_ROUTE_STATE_KEY]: state })
        } catch {
            /* ignored */
        }
    }
    const kindState = (kind: WwwPageKind): KindState => (state[kind] ||= { routes: {} })

    // Rejects with Reddit's HTTP failure when the tab got one, and with an
    // 'unavailable' RouteError when neither tab leg can run.
    const fetchViaTab = async (url: string, cache: WwwRouteCache): Promise<string> => {
        if (contentScriptAlive) {
            let response: any
            try {
                response = await withTimeout(
                    browser.tabs.sendMessage(tab.id, { action: 'fetch-www-profile-public', url, cache }),
                    'content-script fetch',
                )
            } catch (err: any) {
                response = undefined
                // No receiver (the tab predates the extension's install or
                // update, so its content script is orphaned) or no answer in
                // time. Logged because this transition decides which leg
                // produced every page — without it, "tab open but still
                // unknown" can't distinguish a dead tab leg from Reddit
                // serving the tab's same-origin fetches unreadable pages
                // (issue #14, 2nd paste).
                dlog(
                    'feed',
                    '[reveddit] content-script www fetch failed, trying an injected fetch:',
                    String(err?.message || err),
                )
            }
            if (response === undefined) {
                contentScriptAlive = false
            } else {
                // The content script answered, so Reddit answered the tab. The
                // injected fetch would make the same request and get the same
                // answer.
                throwIfLoginRedirect(response?.redirectedTo)
                if (response?.success && typeof response.html === 'string') {
                    return response.html
                }
                const status = Number(response?.status)
                if (status) {
                    throw httpFailure(status)
                }
                throw new RouteError(`www.reddit.com tab request error: ${response?.error || 'no answer'}`, 'network')
            }
        }
        if (injectionUsable) {
            try {
                return await _fetchViaExecuteScript(tab.id, url, publicViewInit(cache))
            } catch (err: any) {
                if (!(err instanceof RouteError) || err.failure !== 'unavailable') {
                    throw err
                }
                // Injection itself unavailable (tab closed/navigated mid-cycle,
                // API missing): no tab route is tried again this lookup.
                injectionUsable = false
                dlog('feed', '[reveddit] executeScript fetch unavailable, skipping tab routes:', err.message)
            }
        }
        throw new RouteError('www tab fetch unavailable', 'unavailable')
    }

    const fetchOnRoute = (route: WwwRoute, url: string): Promise<string> => {
        const { leg, cache } = parseWwwRoute(route)
        return leg === 'tab' ? fetchViaTab(url, cache) : fetchWwwHtml_viaBackground(url, cache)
    }

    const noteRefusal = (kind: WwwPageKind, route: WwwRoute, err: RouteError) => {
        const now = Date.now()
        kindState(kind).routes[route] = {
            t: now,
            until: now + (err.status === 403 ? WWW_HARD_REFUSAL_MS : WWW_SOFT_REFUSAL_MS),
        }
        dirty = true
    }
    // A served page also ends the kind's login wall: served moves past it
    const noteServed = (kind: WwwPageKind, route: WwwRoute, refused: string[]) => {
        const own = kindState(kind)
        const now = Date.now()
        const wall = loginWallOf(own)
        if (own.routes[route]?.until) {
            own.routes[route] = { t: now }
            dirty = true
        }
        if (own.served?.route !== route || wall) {
            const changed = own.served?.route !== route
            own.served = { route, t: now }
            dirty = true
            if (wall) {
                dlog(
                    'feed',
                    `[reveddit] www ${kind} pages load logged out again, after asking for a login since ` +
                        new Date(wall.since).toISOString(),
                )
            }
            if (changed) {
                dlog(
                    'feed',
                    `[reveddit] www route for ${kind} pages is now ${route}` +
                        (refused.length ? ` (refused: ${refused.join(', ')})` : ''),
                )
            }
        }
    }
    const noteLoginWall = (kind: WwwPageKind, route: WwwRoute, err: RouteError) => {
        const own = kindState(kind)
        const now = Date.now()
        const ongoing = loginWallOf(own)
        const where = err.message.replace(`${LOGIN_WALL_MESSAGE}: `, '')
        own.login = { since: ongoing?.since || now, t: now, where }
        dirty = true
        if (!ongoing) {
            dlog(
                'feed',
                `[reveddit] www ${kind} pages ask for a login (${route}: ${where}); no other route is tried, ` +
                    `and ${kind} pages are fetched once an hour until one loads`,
            )
        }
    }

    const failureLogged = new Set<WwwPageKind>()
    const fetchKind = async (kind: WwwPageKind, url: string, accept?: (html: string) => boolean) => {
        const routes = kindState(kind).routes
        const now = Date.now()
        const wall = loginWallOf(state[kind])
        if (wall && now - wall.t < LOGIN_WALL_REST_MS) {
            throw new RouteError(
                `${LOGIN_WALL_MESSAGE}: ${wall.where}, since ${new Date(wall.since).toISOString()} ` +
                    `(next try after ${new Date(wall.t + LOGIN_WALL_REST_MS).toISOString()})`,
                'login',
            )
        }
        const restingUntil = (route: WwwRoute) => routes[route]?.until || 0
        const usable = order.filter(route => !route.startsWith('tab:') || tabUsable())
        // Resting routes follow the rest, soonest back first. All stay
        // fallbacks, since one may turn out unable to run (a tab route with
        // its tab gone), but only the first that sends a request is tried.
        const resting = new Set(usable.filter(route => restingUntil(route) > now))
        const candidates = [
            ...usable.filter(route => !resting.has(route)),
            ...[...resting].sort((a, b) => restingUntil(a) - restingUntil(b)),
        ]
        const refused: string[] = []
        let failure: RouteError | null = null
        let unreadable: string | null = null
        let restingTried = false
        try {
            for (const route of candidates) {
                if (route.startsWith('tab:') && !tabUsable()) {
                    continue
                }
                if (resting.has(route)) {
                    if (restingTried) {
                        break
                    }
                }
                if (refused.length && _wwwRouteTiming.switchDelayMs > 0) {
                    await new Promise(r => setTimeout(r, _wwwRouteTiming.switchDelayMs))
                }
                let html: string
                try {
                    html = await fetchOnRoute(route, url)
                } catch (err: any) {
                    if (!(err instanceof RouteError)) {
                        throw err
                    }
                    if (err.failure === 'unavailable') {
                        continue
                    }
                    if (err.failure === 'login') {
                        noteLoginWall(kind, route, err)
                        throw err
                    }
                    restingTried ||= resting.has(route)
                    noteRefusal(kind, route, err)
                    refused.push(`${route} ${describeFailure(err)}`)
                    // A 403 decides what the whole fetch reports
                    if (!failure || (err.status === 403 && failure.status !== 403)) {
                        failure = err
                    }
                    continue
                }
                restingTried ||= resting.has(route)
                const verdict = judgePage(html, url, accept)
                if (verdict === 'step') {
                    return html
                }
                if (verdict === 'served') {
                    noteServed(kind, route, refused)
                    return html
                }
                if (verdict === 'login') {
                    const err = loginWallError('served a login page in place of the page asked for')
                    noteLoginWall(kind, route, err)
                    throw err
                }
                const err = new RouteError(`www.reddit.com request refused: ${verdict}`, 'refused')
                noteRefusal(kind, route, err)
                refused.push(`${route} ${verdict}`)
                if (verdict === 'unrecognized') {
                    unreadable = html
                }
                failure ||= err
            }
        } finally {
            await saveState()
        }
        if (refused.length > 1 && !failureLogged.has(kind)) {
            failureLogged.add(kind)
            dlog(
                'feed',
                `[reveddit] every www route tried for ${kind} pages failed (${refused.join(', ')}); ` +
                    `refused routes rest ${WWW_SOFT_REFUSAL_MS / 60000} min, or ${WWW_HARD_REFUSAL_MS / 3600000} h after a 403`,
            )
        }
        // A page no route could read goes back to the caller, which says why
        if (unreadable !== null) {
            return unreadable
        }
        if (!failure) {
            throw new RouteError('no www fetch route available', 'unavailable')
        }
        throw new RouteError(`${failure.message} (refused: ${refused.join(', ')})`, failure.failure, failure.status)
    }

    // One fetch at a time per kind of page, so the comments and posts feeds
    // (fetched in parallel) don't both try a refused route, and each fetch
    // starts from what the one before it learned. The queue keeps only the
    // settled outcome, not the page.
    const queues: Partial<Record<WwwPageKind, Promise<unknown>>> = {}
    const fetchHtml: FetchHtml = (url, accept) => {
        const kind = wwwPageKind(url)
        const run = (queues[kind] || Promise.resolve()).then(() => fetchKind(kind, url, accept))
        queues[kind] = run.then(
            () => undefined,
            () => undefined,
        )
        return run
    }
    return {
        fetchHtml,
        servedRoutes: () =>
            Object.fromEntries(
                WWW_PAGE_KINDS.filter(kind => state[kind]?.served).map(kind => [kind, state[kind]!.served!.route]),
            ),
    }
}

export const PROFILE_PUBLICLY_EMPTY = 'profile_publicly_empty'

// Set per lookup from the remote option; read by the page classifier calls
// below so a scaffold-only page can be downgraded to 'unknown' remotely.
let scaffoldAbsenceVerdict: 'removed' | 'unknown' = 'removed'
const isAbsentUnverifiedUnknown = async (): Promise<boolean> =>
    (await getRemoteMechanism(MECHANISM_ABSENT_UNVERIFIED_UNKNOWN).catch(() => 'auto')) === 'on'
const WWW_DETECT_FAILURES_KEY = 'www_detect_consecutive_failures'
const WWW_DETECT_FAILURE_WARN_THRESHOLD = 5

// Feed presence is not a liveness signal for POSTS: held ("awaiting moderator
// approval") and spam-removed posts linger in the author's public feed for a
// grace period (verified live — same anomaly as is_robot_indexable staying true
// for the author for ~24h). Young feed-present posts are verified against their
// own logged-out page, where the true status shows, through whichever route
// reads pages. Verdicts are cached so each young post costs one page fetch per
// TTL, not per cycle: an unreadable page ('unknown', e.g. the front page served
// in place of the post) is paced like the feed-absent path's, and no cycle
// fetches more than POST_VERIFY_MAX_PER_CYCLE pages.
const POST_FEED_GRACE_SECONDS = 48 * 3600
const POST_VERDICT_CACHE_KEY = 'www_post_page_verdicts'
const POST_VERDICT_TTL_MS = 2 * 3600 * 1000
const POST_VERDICT_UNKNOWN_TTL_MS = 30 * 60 * 1000
const POST_VERDICT_CACHE_MAX = 200
const POST_VERIFY_MAX_PER_CYCLE = 10

interface PostVerdictEntry {
    v: PostPageStatus
    t: number // epoch ms of verification
    // Once held or removed: an 'unknown' since keeps the post re-verified at any age
    adverse?: boolean
    // POST_CLASSIFIER, when it was a post page's
    k?: number
}

// Which post-page classifier a cached post verdict came from. 2 (0.0.5.28)
// reads only the banner's slot; the one before read the post's own title and
// body too, so its 'removed' or 'held' may have been the author's words. Such
// a verdict is read again rather than reused.
const POST_CLASSIFIER = 2
const isStalePostVerdict = (id: string, entry: { v: PostPageStatus; k?: number }): boolean =>
    id.startsWith('t3_') && (entry.v === 'removed' || entry.v === 'held') && entry.k !== POST_CLASSIFIER
const classifierMark = (id: string) => (id.startsWith('t3_') ? { k: POST_CLASSIFIER } : {})

// A cache entry still within its time to live; a time in the future (a clock
// set back) counts as expired
const isFresh = (t: number, ttl: number, now: number): boolean => now - t >= 0 && now - t < ttl

// Reddit is rate limiting: a 429 started a backoff that hasn't run out. A 429
// stops the loop that saw it (noteRateLimited); the later steps of the cycle
// ask this before sending anything.
export const isRateLimitedNow = async (): Promise<boolean> => (await getRateLimitBackoffRemainingMs()) > 0

// A 429 enters the shared backoff and tells the caller to stop its loop. Only
// a 429: a 403 is about one route, which the fetcher already moved off.
export const noteRateLimited = (err: any): boolean => {
    if (!isRateLimitError(err)) {
        return false
    }
    flagIfRateLimited(err instanceof Error ? err : new Error(String(err)))
    return true
}

// A post once seen held or removed, or read 'unknown' since then (adverse):
// such a post is re-verified at any age, and its entry kept while there's room
const isAdverseVerdict = (e: PostVerdictEntry | undefined): boolean =>
    Boolean(e && (e.adverse || e.v === 'held' || e.v === 'removed'))
const postVerdictTtl = (e: PostVerdictEntry): number =>
    e.v === 'unknown' ? POST_VERDICT_UNKNOWN_TTL_MS : POST_VERDICT_TTL_MS

const verifyFeedPresentPosts = async (
    ids: string[],
    presentIds: Set<string>,
    authItemsMeta: AuthItemsMeta,
    fetchHtml: FetchHtml,
): Promise<Record<string, PostPageStatus>> => {
    const nowSec = Math.floor(Date.now() / 1000)
    const nowMs = Date.now()
    let cache: Record<string, PostVerdictEntry> = {}
    try {
        cache =
            ((await browser.storage.local.get({ [POST_VERDICT_CACHE_KEY]: {} })) as any)[POST_VERDICT_CACHE_KEY] || {}
    } catch {
        /* ignored */
    }
    const verdicts: Record<string, PostPageStatus> = {}
    const toFetch: string[] = []
    for (const id of ids) {
        if (!id.startsWith('t3_') || !presentIds.has(id)) {
            continue
        }
        const m = authItemsMeta[id]
        // Auth view already flags it removed → the caller uses that directly; no
        // page fetch needed.
        if (m && (m.is_robot_indexable === false || m.removed_by_category)) {
            continue
        }
        const created = m?.created_utc
        const isMature = created !== undefined && nowSec - created > POST_FEED_GRACE_SECONDS
        const cached = cache[id]
        // Mature + no adverse history → the feed is trustworthy, skip the page.
        // An adverse cached verdict — or a removal already recorded in storage
        // (which a fresh verdict cache knows nothing about) — forces
        // re-verification at any age so a post once seen as held/removed can't
        // silently flip back to approved.
        if (isMature && !isAdverseVerdict(cached) && !m?.known_removed) {
            continue
        }
        if (cached && !isStalePostVerdict(id, cached)) {
            if (isFresh(cached.t, postVerdictTtl(cached), nowMs)) {
                // A recent 'unknown' is paced, not returned: callers treat a
                // missing verdict as unresolved
                if (cached.v !== 'unknown') {
                    verdicts[id] = cached.v
                }
                continue
            }
        }
        toFetch.push(id)
    }
    // Paced like absent-item verification, and slower after a recent 429
    const budget = computeAbsentVerifyBudget(await getMsSinceLastRateLimitHit())
    const batch = toFetch.slice(0, Math.min(POST_VERIFY_MAX_PER_CYCLE, budget.maxPerCycle))
    const wasAdverse = (id: string) => isAdverseVerdict(cache[id])
    let fetched = 0
    for (const id of batch) {
        if (fetched > 0) {
            await new Promise(r => setTimeout(r, budget.delayMs))
        }
        fetched++
        try {
            const verdict = await fetchAndClassifyItemPage(id, authItemsMeta[id] || {}, fetchHtml)
            dlog('verify', `[reveddit] post page verdict ${id}: ${verdict}`)
            cache[id] = {
                v: verdict,
                t: nowMs,
                k: POST_CLASSIFIER,
                ...(verdict === 'unknown' && wasAdverse(id) && { adverse: true }),
            }
            if (verdict !== 'unknown') {
                verdicts[id] = verdict
            }
        } catch (err: any) {
            dlog('verify', `[reveddit] post page fetch failed ${id}:`, String(err?.message || err))
            cache[id] = { v: 'unknown', t: nowMs, k: POST_CLASSIFIER, ...(wasAdverse(id) && { adverse: true }) }
            if (noteRateLimited(err)) {
                break
            }
        }
    }
    if (fetched) {
        // Expired entries go first (an adverse one stays while there's room,
        // since it decides whether a mature post is verified), then the oldest
        const entries = Object.entries(cache)
            .filter(([, e]) => isAdverseVerdict(e) || isFresh(e.t, postVerdictTtl(e), nowMs))
            .sort((a, b) => b[1].t - a[1].t)
        cache = Object.fromEntries(entries.slice(0, POST_VERDICT_CACHE_MAX))
        try {
            await browser.storage.local.set({ [POST_VERDICT_CACHE_KEY]: cache })
        } catch {
            /* ignored */
        }
    }
    return verdicts
}

// Feed absence stopped being a sufficient removal signal in ~2026-07: Reddit now
// also omits items from profile-hidden subreddits ("curate your profile") from
// the logged-out feed, so an unverified "missing" would flag every hidden-sub
// item as mod-removed. A feed-absent item's own logged-out page is authoritative:
// live items render there (profile-hidden included), removed ones don't (see
// classifyCommentPage / classifyPostPage). Verdicts are cached so each hidden
// item costs one page fetch per TTL, not per cycle; 'live' entries get a longer
// TTL since their only interesting transition (a later real removal) just waits
// for the next expiry. The challenge solve works without cookies (verified live
// 2026-07-20), so this runs in both tab and background modes.
const ABSENT_VERDICT_CACHE_KEY = 'www_absent_item_verdicts'
const ABSENT_VERDICT_LIVE_TTL_MS = 6 * 3600 * 1000
// A young item's 'live' is read again sooner, since that's when removals
// happen: after an eighth of its age, at least 10 minutes, at most the 6 h
// above. A tab the owner hides lists nothing, so every item of it is checked
// this way, and a removal minutes after posting mustn't wait out 6 h.
const ABSENT_VERDICT_LIVE_MIN_TTL_MS = 10 * 60 * 1000
const absentLiveTtl = (createdUtc: number | undefined, nowMs: number): number =>
    createdUtc === undefined
        ? ABSENT_VERDICT_LIVE_TTL_MS
        : Math.min(
              ABSENT_VERDICT_LIVE_TTL_MS,
              Math.max(ABSENT_VERDICT_LIVE_MIN_TTL_MS, (nowMs - createdUtc * 1000) / 8),
          )
const ABSENT_VERDICT_ADVERSE_TTL_MS = 2 * 3600 * 1000
// 'unknown' is cached too, briefly: when the channel is dead (unreadable pages,
// issue #14) an uncached unknown means the same newest-N items are re-fetched
// every cycle forever (~29k requests/day at the 1-min interval) while items
// past the per-cycle budget are never attempted. Pacing retries lets the budget
// rotate through the whole absent set and stops the extension's own traffic
// from feeding whatever flagging causes the unreadable pages. Unknowns stay out
// of the returned verdicts — callers still treat them as unresolved.
const ABSENT_VERDICT_UNKNOWN_TTL_MS = 30 * 60 * 1000
const ABSENT_VERDICT_CACHE_MAX = 200
// Bounds the burst when a user newly hides a large subreddit: at most this many
// page fetches per cycle; the rest stay unverified (omitted) until later cycles.
const ABSENT_VERIFY_MAX_PER_CYCLE = 20
const ABSENT_VERIFY_DELAY_MS = 500

// Gentle resume after a 429: for a while after the last recorded hit, halve the
// verification burst and double its spacing, so the first cycle back from a
// backoff doesn't immediately re-trip the limiter (which for a heavy commenter
// turns into a permanent skip-verify-skip loop — issue #14's suspected shape).
export const RECENT_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000
export const computeAbsentVerifyBudget = (
    msSinceLastRateLimitHit: number | null,
): { maxPerCycle: number; delayMs: number } => {
    if (msSinceLastRateLimitHit !== null && msSinceLastRateLimitHit < RECENT_RATE_LIMIT_WINDOW_MS) {
        return {
            maxPerCycle: Math.max(3, Math.floor(ABSENT_VERIFY_MAX_PER_CYCLE / 2)),
            delayMs: ABSENT_VERIFY_DELAY_MS * 2,
        }
    }
    return { maxPerCycle: ABSENT_VERIFY_MAX_PER_CYCLE, delayMs: ABSENT_VERIFY_DELAY_MS }
}

interface AbsentVerdictEntry {
    v: PostPageStatus
    t: number // epoch ms of verification
    // POST_CLASSIFIER, for a post
    k?: number
}

// F4 (issue #14): consecutive cycles where absent-item verification fetched
// pages but resolved nothing — every page unreadable AND the legacy tiebreak
// silent. Without this, that state is invisible: removals in profile-hidden
// subs simply stop being detected. Mirrors recordWwwDetectOutcome; any fresh
// definitive verdict (from a page fetch or the tiebreak) resets the streak.
// Cycles that fetch nothing (all verdicts cached) are neutral.
export const ABSENT_VERIFY_UNAVAILABLE = 'absent_verify_unavailable'
const ABSENT_VERIFY_FAILURES_KEY = 'absent_verify_consecutive_failures'
const ABSENT_VERIFY_FAILURE_WARN_THRESHOLD = 5

// Whether verification has resolved nothing for enough cycles to warn. A
// processed monitoring pass clears error_status, and must keep this warning:
// only a cycle that resolves a verdict clears it (recordAbsentVerifyOutcome).
export const isAbsentVerifyUnavailable = async (): Promise<boolean> => {
    try {
        const stored = (await browser.storage.local.get({ [ABSENT_VERIFY_FAILURES_KEY]: 0 })) as any
        return Number(stored[ABSENT_VERIFY_FAILURES_KEY] || 0) >= ABSENT_VERIFY_FAILURE_WARN_THRESHOLD
    } catch {
        return false
    }
}

const recordAbsentVerifyOutcome = async (ok: boolean) => {
    try {
        if (ok) {
            const stored = (await browser.storage.local.get({ [ABSENT_VERIFY_FAILURES_KEY]: 0 })) as any
            if (Number(stored[ABSENT_VERIFY_FAILURES_KEY] || 0) > 0) {
                await browser.storage.local.remove(ABSENT_VERIFY_FAILURES_KEY)
            }
            return
        }
        const stored = (await browser.storage.local.get({ [ABSENT_VERIFY_FAILURES_KEY]: 0 })) as any
        const failures = Number(stored[ABSENT_VERIFY_FAILURES_KEY] || 0) + 1
        await browser.storage.local.set({ [ABSENT_VERIFY_FAILURES_KEY]: failures })
        dlogSummary('verify', `[reveddit] absent verification resolved nothing — consecutive cycles: ${failures}`)
        if (failures >= ABSENT_VERIFY_FAILURE_WARN_THRESHOLD) {
            setWarningBadge(await absentVerifyWarning())
        }
    } catch {
        /* ignored */
    }
}
// When the pages it checks (the comment partial, then the page) ask for a
// login, the warning says so: a second account helps then, not a tab
const absentVerifyWarning = async () =>
    (await isLoginWalled(['partial', 'page'])) ? LOGIN_REQUIRED : ABSENT_VERIFY_UNAVAILABLE

// Remote gate for the whole feed-absent verification path. Default: enabled
// (no extension-news.json entry needed). Remotely flipping the mechanism 'off'
// reverts to the pre-0.0.5.14 classification — feed absence within coverage
// counts as removed, no page fetches — as field insurance against a Reddit
// markup change the classifier misreads. Dev override (highest priority):
//   chrome.storage.local.set({ dev_disable_absent_verification: true })  // or false
//   chrome.storage.local.remove('dev_disable_absent_verification')       // defaults
export const DEV_DISABLE_ABSENT_VERIFICATION_KEY = 'dev_disable_absent_verification'

const isAbsentVerificationDisabled = (): Promise<boolean> =>
    browser.storage.local
        .get({ [DEV_DISABLE_ABSENT_VERIFICATION_KEY]: null })
        .then(async (r: any) => {
            const dev = r[DEV_DISABLE_ABSENT_VERIFICATION_KEY]
            const remote = await getRemoteMechanism(MECHANISM_ABSENT_VERIFICATION)
            return resolveMechanismDisabled(dev === null ? null : !!dev, remote, false)
        })
        .catch(() => false)

// An item's own logged-out page, classified: for feed-absent items of either
// kind, and for young feed-present posts (verifyFeedPresentPosts)
const fetchAndClassifyItemPage = async (
    id: string,
    meta: AuthItemMeta,
    fetchHtml: FetchHtml,
): Promise<PostPageStatus> => {
    // URLs reddit answers without a redirect. A background fetch loses its
    // solved challenge on one and gets a new challenge (2026-10-17), so
    // /comments/<id>/ is the fallback for posts: it 301s to the permalink.
    // A profile post's /r/u_<name>/ permalink 301s too, so it's read at
    // /user/<name>/ (sitePermalink). Comments get the site's form, since the
    // API's permalink form is a redirect shell (see buildCommentThreadUrl).
    const threadUrl = !id.startsWith('t3_') && meta.permalink ? buildCommentThreadUrl(meta.permalink, id) : null
    let url: string
    if (id.startsWith('t3_')) {
        url =
            meta.permalink && /^\/(r|user)\//.test(meta.permalink)
                ? newReddit + sitePermalink(meta.permalink)
                : buildPostPageUrl(id)
    } else if (threadUrl) {
        url = threadUrl
    } else if (meta.link_id) {
        url = buildCommentPageUrl(id, meta.link_id)
    } else if (meta.permalink) {
        url = newReddit + sitePermalink(meta.permalink)
    } else {
        return 'unknown'
    }
    const classify = (html: string): PostPageStatus =>
        id.startsWith('t3_') ? classifyPostPage(html, id).status : classifyCommentPage(html, id, scaffoldAbsenceVerdict)
    // A page that doesn't decide this item is a route the fetcher should move
    // off (see FetchHtml). Judged on the page itself: a thread served without
    // the comment is a real answer, even while the remote valve
    // (MECHANISM_ABSENT_UNVERIFIED_UNKNOWN) turns its verdict into 'unknown'.
    const readable = (html: string) =>
        (id.startsWith('t3_') ? classifyPostPage(html, id).status : classifyCommentPage(html, id, 'removed')) !==
        'unknown'
    // Comments: try the site's own /svc comment-tree partial first — same
    // classifier signals, a fraction of the page weight, and the route most
    // likely to stay readable for clients whose full permalink pages are
    // walled (see buildCommentPartialUrl). Unreadable or failed → fall through
    // to the full page exactly as before.
    if (!id.startsWith('t3_') && meta.permalink) {
        const partialUrl = buildCommentPartialUrl(meta.permalink, id)
        if (partialUrl) {
            try {
                const partial = await fetchHtml(partialUrl, readable)
                const verdict = classifyCommentPage(partial, id, scaffoldAbsenceVerdict)
                if (verdict !== 'unknown') {
                    return verdict
                }
                dlog(
                    'verify',
                    `[reveddit] ${id} svc partial unreadable, trying full page`,
                    describePageForDiag(partial),
                )
            } catch (err: any) {
                // A 429 on the partial is a real client-level signal even if
                // the full-page fallback below happens to be served. Only a
                // 429: a 403 is about the route, which the fetcher moved off.
                noteRateLimited(err)
                dlog(
                    'verify',
                    `[reveddit] ${id} svc partial fetch failed, trying full page:`,
                    String(err?.message || err),
                )
            }
        }
    }
    let html = await fetchHtml(url, readable)
    let verdict = classify(html)
    if (verdict === 'unknown') {
        const firstPage = describePageForDiag(html)
        const solutionUrl = solveChallenge(html, url)
        if (solutionUrl) {
            html = await fetchHtml(solutionUrl, readable)
            verdict = classify(html)
            if (verdict === 'unknown') {
                dlog(
                    'verify',
                    `[reveddit] ${id} page unreadable after challenge solve`,
                    `${firstPage} → ${describePageForDiag(html)}`,
                )
            }
        } else {
            dlog('verify', `[reveddit] ${id} page unreadable (no solvable challenge)`, firstPage)
        }
    }
    return verdict
}

// Seam for tests: the legacy parsers run HTMLRewriter (WASM), which cannot load
// under vitest, so the tiebreaker routes its calls through this replaceable
// object rather than calling the parse_html/old functions directly.
export const _legacyLookups = {
    commentsById: getItemsById_fromOldHTML,
    postByPath: getPost_fromOld,
}

const LEGACY_TIEBREAK_POST_MAX_PER_CYCLE = 5
const LEGACY_TIEBREAK_POST_DELAY_MS = 500

// old.reddit tiebreaker for ids the www page lottery left unverdicted. The www
// SSR variants sometimes serve comment-less shells for extended stretches
// (observed live: 12/12 shells), which would leave feed-absent items undetected
// indefinitely. old.reddit is not subject to those variants and remains the
// pre-Shreddit truth source until the deprecation lands — this call site is
// gated with the rest of the legacy paths. Comments resolve in one batched
// /api/info HTML request; posts need their own page (meta-robots signal).
const legacyTiebreakAbsent = async (
    ids: string[],
    canaryCommentIds: string[],
    verdicts: Record<string, PostPageStatus>,
    record: (id: string, v: Exclude<PostPageStatus, 'unknown'>) => void,
    authItemsMeta: AuthItemsMeta = {},
): Promise<void> => {
    const unresolved = ids.filter(id => !(id in verdicts))
    // Not after a 429 (the verification loop above stops on one)
    if (!unresolved.length || (await isRateLimitedNow())) {
        return
    }
    // Comments read the legacy /api/info listing, posts their own legacy pages
    const commentIds = (await isLegacyOff('legacy_info')) ? [] : unresolved.filter(id => id.startsWith('t1_'))
    const postIds = (await isLegacyOff('legacy')) ? [] : unresolved.filter(id => id.startsWith('t3_'))
    if (commentIds.length) {
        try {
            // old.reddit /api/info HTML DROPS removed comments instead of
            // rendering [removed] markers (verified live), so absence is the
            // removal signal — but only when the response is provably healthy.
            // Feed-present comments are live by definition; batching a few in as
            // canaries proves the endpoint returned real things this cycle.
            const batch = [...commentIds, ...canaryCommentIds]
            const results = (await _legacyLookups.commentsById(batch)) as any[]
            const byName: Record<string, any> = {}
            for (const wrap of results || []) {
                if (wrap?.data?.name) {
                    byName[wrap.data.name] = wrap.data
                }
            }
            const canaryRendered = canaryCommentIds.some(id => byName[id])
            if (canaryRendered) {
                await noteCapabilityWorked('legacy_info')
            }
            // The "healthy call, zero items" case was invisible in issue #14's
            // log — it must be distinguishable from "tiebreak resolved things".
            dlogSummary(
                'legacy',
                `[reveddit] legacy comment tiebreak: ${Object.keys(byName).length}/${batch.length} rendered, canaryRendered=${canaryRendered}`,
            )
            for (const id of commentIds) {
                const item = byName[id]
                if (item && item.author) {
                    record(id, isRemovedComment(item) ? 'removed' : 'live')
                } else if (!item && canaryRendered) {
                    // Absent while known-live canaries rendered. /api/info is not
                    // a profile view, so profile-hiding cannot explain absence
                    // here (verified: a profile-hidden live comment renders) →
                    // the comment is removed or deleted.
                    record(id, 'removed')
                }
            }
        } catch (err: any) {
            dlog('legacy', '[reveddit] legacy comment tiebreak failed:', String(err?.message || err))
            if (noteRateLimited(err)) {
                return
            }
            await noteLegacyRefusal(err, 'legacy_info')
        }
    }
    let postFetches = 0
    for (const id of postIds) {
        if (postFetches >= LEGACY_TIEBREAK_POST_MAX_PER_CYCLE) {
            break
        }
        if (postFetches > 0) {
            await new Promise(r => setTimeout(r, LEGACY_TIEBREAK_POST_DELAY_MS))
        }
        postFetches++
        try {
            // Canonical permalink when the auth view supplied one: /comments/<id>/
            // answers with a redirect to it
            const permalink = authItemsMeta[id]?.permalink
            const path = permalink && permalink.startsWith('/r/') ? permalink : '/comments/' + id.substring(3) + '/'
            const page = (await _legacyLookups.postByPath(path)) as any
            if (page && !page.error) {
                record(id, page.is_removed ? 'removed' : 'live')
                await noteCapabilityWorked('legacy')
            } else {
                dlog('legacy', `[reveddit] legacy post tiebreak ${id}: no page${page?.error ? ` (${page.error})` : ''}`)
                if (page?.status === 403 || page?.refused) {
                    // Refused: the legacy pages rest (the listing rests on its
                    // own), starting with the rest of this loop
                    await noteCapabilityRefused('legacy', page.refused ? 'challenge page' : 'HTTP 403')
                    break
                }
                if (page?.status === 429) {
                    noteRateLimited(new Error(String(page.error)))
                    break
                }
            }
        } catch (err: any) {
            dlog('legacy', `[reveddit] legacy post tiebreak failed ${id}:`, String(err?.message || err))
        }
    }
}

export const verifyFeedAbsentItems = async (
    ids: string[],
    authItemsMeta: AuthItemsMeta,
    fetchHtml: FetchHtml,
    canaryCommentIds: string[] = [],
): Promise<Record<string, PostPageStatus>> => {
    const nowMs = Date.now()
    let cache: Record<string, AbsentVerdictEntry> = {}
    try {
        cache =
            ((await browser.storage.local.get({ [ABSENT_VERDICT_CACHE_KEY]: {} })) as any)[ABSENT_VERDICT_CACHE_KEY] ||
            {}
    } catch {
        /* ignored */
    }
    const verdicts: Record<string, PostPageStatus> = {}
    const toFetch: string[] = []
    let recentUnknownSkipped = 0
    for (const id of ids) {
        const cached = cache[id]
        if (cached && !isStalePostVerdict(id, cached)) {
            const ttl =
                cached.v === 'live'
                    ? absentLiveTtl(authItemsMeta[id]?.created_utc, nowMs)
                    : cached.v === 'removed'
                      ? ABSENT_VERDICT_ADVERSE_TTL_MS
                      : ABSENT_VERDICT_UNKNOWN_TTL_MS
            if (isFresh(cached.t, ttl, nowMs)) {
                if (cached.v === 'unknown') {
                    // Recently confirmed unreadable — pace instead of retrying
                    // every cycle. Stays out of `verdicts` (callers treat it as
                    // unresolved, fail-open) but still reaches the legacy
                    // tiebreak below, which may settle it definitively.
                    recentUnknownSkipped++
                } else {
                    verdicts[id] = cached.v
                }
                continue
            }
        }
        toFetch.push(id)
    }
    const budget = computeAbsentVerifyBudget(await getMsSinceLastRateLimitHit())
    if (toFetch.length && budget.maxPerCycle < ABSENT_VERIFY_MAX_PER_CYCLE) {
        dlog('ratelimit', `[reveddit] absent verification budget reduced to ${budget.maxPerCycle}/cycle (recent 429)`)
    }
    let fetched = 0
    let freshDefinitive = 0
    for (const id of toFetch) {
        if (fetched >= budget.maxPerCycle) {
            break
        }
        if (fetched > 0) {
            await new Promise(r => setTimeout(r, budget.delayMs))
        }
        fetched++
        try {
            const verdict = await fetchAndClassifyItemPage(id, authItemsMeta[id] || {}, fetchHtml)
            dlog('verify', `[reveddit] absent item verdict ${id}: ${verdict}`)
            cache[id] = { v: verdict, t: nowMs, ...classifierMark(id) }
            if (verdict !== 'unknown') {
                verdicts[id] = verdict
                freshDefinitive++
            }
        } catch (err: any) {
            dlog('verify', `[reveddit] absent item verification failed ${id}:`, String(err?.message || err))
            // Paced like an unreadable page. A wall on every route (the
            // captcha, the block page) must not be retried every cycle.
            cache[id] = { v: 'unknown', t: nowMs, ...classifierMark(id) }
            // A 429 enters the shared backoff and ends this cycle's checks:
            // without this, a rate-limited client burns the whole verification
            // budget every cycle producing silent unknowns (no alert, no
            // Paused banner).
            if (noteRateLimited(err)) {
                break
            }
        }
    }
    let cacheMutated = fetched > 0
    // The tiebreak's canaries are comments known live. None is in the feed when
    // the owner hides their comments: then comments their own pages showed
    // live, recently. Without canaries the listing can only say 'live'.
    const canaries = canaryCommentIds.length
        ? canaryCommentIds
        : Object.entries(cache)
              .filter(
                  ([id, e]) =>
                      id.startsWith('t1_') &&
                      !ids.includes(id) &&
                      e.v === 'live' &&
                      isFresh(e.t, ABSENT_VERDICT_LIVE_TTL_MS, nowMs),
              )
              .slice(0, 3)
              .map(([id]) => id)
    await legacyTiebreakAbsent(
        ids,
        canaries,
        verdicts,
        (id, v) => {
            verdicts[id] = v
            cache[id] = { v, t: nowMs, ...classifierMark(id) }
            cacheMutated = true
            freshDefinitive++
        },
        authItemsMeta,
    )
    if (fetched > 0 || recentUnknownSkipped > 0) {
        dlogSummary(
            'verify',
            `[reveddit] absent verify: ${fetched} fetched, ${recentUnknownSkipped} paced (recent unknown), ${freshDefinitive} resolved this cycle`,
        )
    }
    if (fetched > 0) {
        await recordAbsentVerifyOutcome(freshDefinitive > 0)
    }
    if (cacheMutated) {
        const entries = Object.entries(cache).sort((a, b) => b[1].t - a[1].t)
        cache = Object.fromEntries(entries.slice(0, ABSENT_VERDICT_CACHE_MAX))
        try {
            await browser.storage.local.set({ [ABSENT_VERDICT_CACHE_KEY]: cache })
        } catch {
            /* ignored */
        }
    }
    return verdicts
}

// Consecutive refusals of the logged-in detection path, mirroring
// recordWwwDetectOutcome below: one is noise, a streak means reddit isn't
// accepting the login. Definite outcomes (a username, or a clean logged-out
// response) reset the streak. Only the monitoring cycle records outcomes —
// content-script probes have different fetch conditions.
export const LOGGED_IN_VIEW_UNAVAILABLE = 'logged_in_view_unavailable'
// The warnings that finding the user signed in settles: nobody was signed in,
// or the login check wasn't answering. The rest are about checks a login
// doesn't fix (the logged-out view, a login wall, the second account), which
// only their own recovery ends.
export const isSettledByLogin = (status: unknown): boolean =>
    status === 'needs_user' || status === LOGGED_IN_VIEW_UNAVAILABLE
const LOGIN_DETECT_FAILURES_KEY = 'login_detect_consecutive_failures'
const LOGIN_DETECT_FAILURE_WARN_THRESHOLD = 5

// Reddit turned a login check or a listing away. A network error, an outage or a
// rate limit is no such answer, and says nothing about the login.
export const isLoginRefusal = (failure = ''): boolean => /(status|request failed:) 40[13]\b|non-JSON/.test(failure)

// One more failure in a streak kept in storage
const countFailure = async (key: string): Promise<number> => {
    const stored = (await browser.storage.local.get({ [key]: 0 })) as any
    const failures = Number(stored[key] || 0) + 1
    await browser.storage.local.set({ [key]: failures })
    return failures
}

// Reddit keeps refusing the login check and the user's listing
const isLoginKeptOut = async (): Promise<boolean> => {
    const stored = (await browser.storage.local.get({ [LOGIN_DETECT_FAILURES_KEY]: 0 })) as any
    return Number(stored[LOGIN_DETECT_FAILURES_KEY]) >= LOGIN_DETECT_FAILURE_WARN_THRESHOLD
}

export const recordLoginDetectOutcome = async (indeterminate: boolean) => {
    try {
        if (!indeterminate) {
            await browser.storage.local.remove(LOGIN_DETECT_FAILURES_KEY)
            return
        }
        const failures = await countFailure(LOGIN_DETECT_FAILURES_KEY)
        dlog('auth', `[reveddit] login detection indeterminate — consecutive failures: ${failures}`)
        if (failures >= LOGIN_DETECT_FAILURE_WARN_THRESHOLD) {
            setWarningBadge(LOGGED_IN_VIEW_UNAVAILABLE)
        }
    } catch {
        /* ignored */
    }
}

// Cycles in a row that checked none of the user's items, for any reason. A
// refusal, a rate limit or a block says so in its own words. This is for the
// rest, such as an outage, so a check that read nothing can't pass for a clean one.
export const CHECKS_FAILING = 'checks_failing'
const CHECK_FAILURES_KEY = 'check_consecutive_failures'
export const recordCheckOutcome = async (checked: boolean) => {
    try {
        if (checked) {
            await browser.storage.local.remove(CHECK_FAILURES_KEY)
            return
        }
        const failures = await countFailure(CHECK_FAILURES_KEY)
        dlog('cycle', `[reveddit] nothing checked this cycle — consecutive failures: ${failures}`)
        const { error_status } = (await browser.storage.local.get({ error_status: '' })) as any
        if (failures >= LOGIN_DETECT_FAILURE_WARN_THRESHOLD && (!error_status || PARTIAL_WARNINGS.has(error_status))) {
            setWarningBadge(CHECKS_FAILING)
        }
    } catch {
        /* ignored */
    }
}

// Track consecutive failures of the www public-view path. One failure is noise
// (deploys, blips); persistent failure means the detection path is broken and
// the user should know — without it they'd assume monitoring still works. The
// line carries the reason: issue #27's log showed thousands of failures and
// nothing about why. When reddit asks for a login, the warning says so
// instead, since opening a tab doesn't help with that.
export const LOGIN_REQUIRED = 'login_required'
const recordWwwDetectOutcome = async (ok: boolean, reason = '', loginWall = false) => {
    try {
        if (ok) {
            await browser.storage.local.remove(WWW_DETECT_FAILURES_KEY)
            return
        }
        const failures = await countFailure(WWW_DETECT_FAILURES_KEY)
        dlog(
            'feed',
            `[reveddit] www public-view lookup failed — consecutive failures: ${failures}` +
                (reason ? ` (${reason})` : ''),
        )
        if (failures >= WWW_DETECT_FAILURE_WARN_THRESHOLD) {
            setWarningBadge(loginWall ? LOGIN_REQUIRED : 'public_view_unavailable')
        }
    } catch {
        /* ignored */
    }
}

// The logged-in user's profile is publicly empty or missing (the shadowban
// signature), as the last lookup found it. The bridge reads it so reveddit.com
// shows that user's own profile as logged-out visitors see it, not as their
// login does.
export const PUBLIC_PROFILE_UNAVAILABLE_KEY = 'public_profile_unavailable'
const PUBLIC_PROFILE_UNAVAILABLE_MAX_AGE_MS = 24 * 3600 * 1000
const notePublicProfileUnavailable = async (username: string | null) => {
    try {
        if (username) {
            await browser.storage.local.set({ [PUBLIC_PROFILE_UNAVAILABLE_KEY]: { user: username, t: Date.now() } })
        } else if (
            ((await browser.storage.local.get({ [PUBLIC_PROFILE_UNAVAILABLE_KEY]: null })) as any)[
                PUBLIC_PROFILE_UNAVAILABLE_KEY
            ]
        ) {
            // Removed only when set: this runs on every good lookup
            await browser.storage.local.remove(PUBLIC_PROFILE_UNAVAILABLE_KEY)
        }
    } catch {
        /* ignored */
    }
}
export const isPublicProfileUnavailable = async (username: string): Promise<boolean> => {
    try {
        const stored = ((await browser.storage.local.get({ [PUBLIC_PROFILE_UNAVAILABLE_KEY]: null })) as any)[
            PUBLIC_PROFILE_UNAVAILABLE_KEY
        ]
        const age = Date.now() - Number(stored?.t)
        return (
            String(stored?.user || '').toLowerCase() === username.toLowerCase() &&
            age >= 0 &&
            age < PUBLIC_PROFILE_UNAVAILABLE_MAX_AGE_MS
        )
    } catch {
        return false
    }
}

// The shadowban signature, as one warning instead of N removal alerts. Thrown
// (not returned) so the fallback chain doesn't run the legacy paths, and so
// monitoring skips this cycle without clearing the warning. missing: the
// profile is a 404 logged out, which the bridge then answers for it too; an
// empty profile still exists, so the bridge keeps serving it.
const reportPublicProfileShadowban = async (username: string, what: string, missing: boolean): Promise<never> => {
    dlog('feed', `[reveddit] public profile for ${username} is ${what} - possible shadowban`)
    await notePublicProfileUnavailable(missing ? username : null)
    // Missing or empty, none of the user's items shows logged out: the bridge
    // must not keep presenting the last pass's as seen publicly
    try {
        await browser.storage.local.remove(getPublicLiveKey(username))
    } catch {
        /* ignored */
    }
    setWarningBadge(PROFILE_PUBLICLY_EMPTY)
    throw new Error(PROFILE_PUBLICLY_EMPTY)
}

// A missing profile reads as a shadowban only while reddit serves a profile
// known to exist: a 404 for every profile (a route or markup change, an
// outage) would otherwise put every user behind the banner. A good answer is
// remembered for 6 hours, a bad one for half an hour, so a reddit-wide 404
// doesn't fetch the control's two tabs on every cycle.
const PROFILE_CONTROL_USER = 'reddit'
const PROFILE_CONTROL_KEY = 'public_profile_control'
const PROFILE_CONTROL_TTL_MS = 6 * 3600 * 1000
const PROFILE_CONTROL_FAILED_TTL_MS = 30 * 60 * 1000
const controlProfileLoads = async (fetchHtml: FetchHtml): Promise<boolean> => {
    const now = Date.now()
    try {
        const stored = ((await browser.storage.local.get({ [PROFILE_CONTROL_KEY]: null })) as any)[PROFILE_CONTROL_KEY]
        const t = Number(stored?.t || 0)
        if (stored?.ok === true && isFresh(t, PROFILE_CONTROL_TTL_MS, now)) {
            return true
        }
        if (stored?.ok === false && isFresh(t, PROFILE_CONTROL_FAILED_TTL_MS, now)) {
            return false
        }
    } catch {
        /* ignored */
    }
    const control: PublicProfileData = await getPublicProfileItems(PROFILE_CONTROL_USER, fetchHtml, [], 0)
    if (!control.valid) {
        dlog(
            'feed',
            `[reveddit] control profile u/${PROFILE_CONTROL_USER} did not load: ${control.error || 'unrecognized'}`,
        )
    }
    try {
        await browser.storage.local.set({ [PROFILE_CONTROL_KEY]: { ok: control.valid, t: now } })
    } catch {
        /* ignored */
    }
    return control.valid
}

// Consecutive lookups whose profile pagination stopped short of the items
// monitoring needed (every route refused a partial page, a network error).
// Items below where it stopped are omitted as unknown, so their removals go
// unseen; a streak gets its own warning, kept at the end of a pass like
// absent_verify_unavailable.
export const PROFILE_PAGINATION_UNAVAILABLE = 'profile_pagination_unavailable'
const PAGINATION_SHORTFALL_KEY = 'profile_pagination_consecutive_shortfalls'
const PAGINATION_SHORTFALL_WARN_THRESHOLD = 5
export const isProfilePaginationShort = async (): Promise<boolean> => {
    try {
        const stored = (await browser.storage.local.get({ [PAGINATION_SHORTFALL_KEY]: 0 })) as any
        return Number(stored[PAGINATION_SHORTFALL_KEY] || 0) >= PAGINATION_SHORTFALL_WARN_THRESHOLD
    } catch {
        return false
    }
}
const recordPaginationOutcome = async (stopped: string | undefined) => {
    try {
        const stored = (await browser.storage.local.get({ [PAGINATION_SHORTFALL_KEY]: 0 })) as any
        const before = Number(stored[PAGINATION_SHORTFALL_KEY] || 0)
        if (!stopped) {
            if (before > 0) {
                await browser.storage.local.remove(PAGINATION_SHORTFALL_KEY)
            }
            return
        }
        const shortfalls = before + 1
        await browser.storage.local.set({ [PAGINATION_SHORTFALL_KEY]: shortfalls })
        dlogSummary('feed', `[reveddit] profile pagination stopped short — consecutive lookups: ${shortfalls}`)
        if (shortfalls >= PAGINATION_SHORTFALL_WARN_THRESHOLD) {
            setWarningBadge(await paginationWarning())
        }
    } catch {
        /* ignored */
    }
}
// When the profile's older pages ask for a login, the warning says so
const paginationWarning = async () =>
    (await isLoginWalled(['profile-partial'])) ? LOGIN_REQUIRED : PROFILE_PAGINATION_UNAVAILABLE

// The items the last lookup couldn't judge because nobody logged out can see
// them (publicViewUncheckedReason), for the copied log's header. Written when
// the set changes, else every half hour, so the header's time says how
// current it is.
export const PUBLIC_VIEW_UNCHECKED_KEY = 'public_view_unchecked'
const PUBLIC_VIEW_UNCHECKED_REFRESH_MS = 30 * 60 * 1000
const notePublicViewUnchecked = async (unchecked: Record<string, string>) => {
    try {
        const stored = ((await browser.storage.local.get({ [PUBLIC_VIEW_UNCHECKED_KEY]: null })) as any)[
            PUBLIC_VIEW_UNCHECKED_KEY
        ]
        const storedIds: Record<string, string> = stored?.ids || {}
        const same =
            Object.keys(storedIds).length === Object.keys(unchecked).length &&
            Object.entries(unchecked).every(([id, reason]) => storedIds[id] === reason)
        if (stored && same && isFresh(Number(stored.t), PUBLIC_VIEW_UNCHECKED_REFRESH_MS, Date.now())) {
            return
        }
        await browser.storage.local.set({ [PUBLIC_VIEW_UNCHECKED_KEY]: { ids: unchecked, t: Date.now() } })
    } catch {
        /* ignored */
    }
}

// The copied log's header line for them. It names ids only in a copy that
// includes the username: anyone can look an id up, and the list says which of
// the reporter's items are NSFW or in a private community. The default copy
// counts them by reason.
export const formatPublicViewUnchecked = (stored: any, includeIds = false): string => {
    const label = "can't be checked logged out"
    if (!stored?.ids || typeof stored.ids !== 'object') {
        return `${label}: no lookup recorded`
    }
    const entries = Object.entries(stored.ids as Record<string, string>)
    let list = 'none'
    if (entries.length && includeIds) {
        list = entries.map(([id, reason]) => `${id} (${reason})`).join(', ')
    } else if (entries.length) {
        const counts: Record<string, number> = {}
        for (const [, reason] of entries) {
            counts[reason] = (counts[reason] || 0) + 1
        }
        list = Object.entries(counts)
            .map(([reason, n]) => `${n} ${reason}`)
            .join(', ')
    }
    return `${label}: ${list}; as of ${new Date(Number(stored.t) || 0).toISOString()}`
}
export const getPublicViewUncheckedLine = async (includeIds = false): Promise<string> => {
    try {
        const r = (await browser.storage.local.get({ [PUBLIC_VIEW_UNCHECKED_KEY]: null })) as any
        return formatPublicViewUnchecked(r[PUBLIC_VIEW_UNCHECKED_KEY], includeIds)
    } catch {
        return formatPublicViewUnchecked(null)
    }
}

// Primary detection path: compare the requested (authenticated) ids against the
// logged-out www.reddit.com profile. Present → not removed. Missing within the
// paginated coverage window → removed. Missing below the window → status unknown,
// omitted entirely so the caller neither alerts nor resets removal counts.
export const lookupItemsByID_fromPublicProfile = async (
    ids: string[],
    username: string,
    authItemsMeta: AuthItemsMeta = {},
) => {
    const fetcher = await getWwwHtmlFetcher()
    const { fetchHtml } = fetcher
    const profile = await getPublicProfileItems(username, fetchHtml, ids)
    if (!profile.valid) {
        const reason = profile.error || 'unrecognized response'
        // Both profile tabs are a 404 while the logged-in view lists items:
        // logged out, the account doesn't exist, which is how a site-wide
        // shadowban (or a suspension) looks. Same warning as an empty profile,
        // once a profile known to exist still loads.
        if (ids.length && profile.missing) {
            if (await controlProfileLoads(fetchHtml)) {
                await recordWwwDetectOutcome(true)
                return reportPublicProfileShadowban(username, 'missing (404)', true)
            }
            dlog('feed', `[reveddit] public profile for ${username} is a 404, but so is the control; not a shadowban`)
        }
        await recordWwwDetectOutcome(false, reason, !!profile.loginWall)
        // A 429 enters the shared backoff. Refusals don't touch the status:
        // recordWwwDetectOutcome reports a persistent failure itself.
        noteRateLimited(new Error(reason))
        throw new Error(`www profile lookup invalid: ${reason}`)
    }
    await recordWwwDetectOutcome(true)
    if (profile.hidden) {
        const tabs = [profile.hidden.t1 && 'comments', profile.hidden.t3 && 'posts'].filter(Boolean).join(' and ')
        dlog(
            'feed',
            `[reveddit] u/${username} hides their ${tabs} from logged-out visitors; each is checked on its own page`,
        )
    }
    if (profile.emptyProfile && ids.length) {
        // An account whose every item is NSFW, quarantined or in a private
        // subreddit is publicly empty by design, not shadowbanned: fall through
        // so the classification loop reads those (readLookupResult) instead
        // of parking the account behind a permanent banner. An id with
        // no meta could be visible, so it keeps the shadowban reading.
        const anyPubliclyVisibleClass = ids.some(id => !publiclyInvisibleReason(authItemsMeta[id]))
        if (!anyPubliclyVisibleClass) {
            dlog(
                'feed',
                `[reveddit] public profile for ${username} is empty, but every item is NSFW, quarantined or private; not treated as a shadowban`,
            )
        } else {
            // The whole profile is publicly empty while the authenticated view has
            // items — the shadowban signature
            await reportPublicProfileShadowban(username, 'empty', false)
        }
    }
    await notePublicProfileUnavailable(null)
    await recordPaginationOutcome(profile.paginationStopped)
    const postVerdicts = await verifyFeedPresentPosts(ids, new Set(profile.items.keys()), authItemsMeta, fetchHtml)
    // Feed-absent items within coverage can be profile-hidden rather than
    // removed — verify against their own pages before concluding anything.
    // Skipped: auth-confirmed removals, and publicly-invisible classes whose
    // pages are gated logged-out (monitoring exempts those from removal anyway).
    const absentVerificationDisabled = await isAbsentVerificationDisabled()
    const absentUnverifiedIsUnknown = await isAbsentUnverifiedUnknown()
    scaffoldAbsenceVerdict = absentUnverifiedIsUnknown ? 'unknown' : 'removed'
    const absentToVerify = ids.filter(id => {
        if (absentVerificationDisabled) {
            return false
        }
        if (profile.items.has(id)) {
            return false
        }
        const meta = authItemsMeta[id] || {}
        if (id.startsWith('t3_') && (meta.is_robot_indexable === false || meta.removed_by_category)) {
            return false
        }
        if (publiclyInvisibleReason(meta)) {
            return false
        }
        const floor = id.startsWith('t3_') ? profile.coverage.t3 : profile.coverage.t1
        const value = fullnameValue(id)
        return Number.isFinite(value) && value >= floor
    })
    const canaryCommentIds = [...profile.items.keys()].filter(id => id.startsWith('t1_')).slice(0, 3)
    // A post page's 429 (verifyFeedPresentPosts) ends this cycle's page
    // checks: the absent items get no verdict, which is no news
    const rateLimited = absentToVerify.length > 0 && (await isRateLimitedNow())
    if (rateLimited) {
        dlog('feed', `[reveddit] ${absentToVerify.length} feed-absent items not verified: rate limited`)
    }
    const absentVerdicts =
        absentToVerify.length && !rateLimited
            ? await verifyFeedAbsentItems(absentToVerify, authItemsMeta, fetchHtml, canaryCommentIds)
            : {}
    if (!absentToVerify.length) {
        // Nothing absent needs a page verdict (or verification is off), so the
        // "can't confirm removals" warning has nothing left to warn about
        await recordAbsentVerifyOutcome(true)
    }
    const results: { data: Record<string, any> }[] = []
    for (const id of ids) {
        const meta = authItemsMeta[id] || {}
        const carried = {
            locked: !!meta.locked,
            ...(meta.created_utc !== undefined && { created_utc: meta.created_utc }),
            // Marks results whose removed/approved status came from the public
            // profile comparison. Quarantined/NSFW/private-sub items are never
            // visible in that view, so their "missing" must not count as removed —
            // the classification loop uses this flag to exempt them.
            _public_view: true,
        }
        const isPost = id.startsWith('t3_')
        // The author's own view is authoritative when it already shows removal.
        const authSaysRemoved = isPost && (meta.is_robot_indexable === false || !!meta.removed_by_category)
        const publicItem = profile.items.get(id)
        if (publicItem) {
            if (!isPost) {
                // Present comment → live (removed comments vanish from the feed).
                results.push({ data: { ...publicItem, ...carried } })
            } else if (authSaysRemoved) {
                // In the public feed but the authenticated view already flags it
                // removed (modqueue/spam grace period). is_robot_indexable:false
                // makes isRemovedPost() fire.
                results.push({ data: { ...publicItem, is_robot_indexable: false, ...carried } })
            } else {
                const verdict = postVerdicts[id]
                if (verdict === 'held' || verdict === 'removed') {
                    // The post's own page shows it held/removed even though it
                    // lingers in the feed and the auth view hasn't caught up.
                    results.push({ data: { ...publicItem, is_robot_indexable: false, ...carried } })
                } else if (meta.known_removed && verdict !== 'live') {
                    // Recorded as removed, still lingering in the feed, and no
                    // page verdict landed this cycle (no tab, challenge, shell).
                    // Omit: feed presence alone must not flip a recorded removal
                    // back to approved on fetch luck — that oscillates. A real
                    // re-approval flips it once a 'live' page verdict arrives.
                } else {
                    // No removal signal from any source → live. (verdict 'live',
                    // 'unknown', or unfetched: the auth view says not-removed and
                    // it's publicly visible, so treat as live and cache the body.)
                    // A young post without a 'live' verdict may still be held or
                    // spam-filtered, so the bridge isn't told it's publicly live.
                    const young =
                        meta.created_utc === undefined ||
                        Math.floor(Date.now() / 1000) - meta.created_utc <= POST_FEED_GRACE_SECONDS
                    results.push({
                        data: {
                            ...publicItem,
                            is_robot_indexable: true,
                            ...carried,
                            ...(young && verdict !== 'live' && { _public_view_unverified: true }),
                        },
                    })
                }
            }
        } else {
            const floor = isPost ? profile.coverage.t3 : profile.coverage.t1
            const value = fullnameValue(id)
            const covered = Number.isFinite(value) && value >= floor
            const publiclyInvisible = !!publiclyInvisibleReason(meta)
            // The synthetic removed shape passes isRemovedComment (author+body
            // start with '[') and isRemovedPost (is_robot_indexable === false).
            const syntheticRemoved = {
                data: {
                    name: id,
                    author: '[deleted]',
                    body: '[removed]',
                    is_robot_indexable: false,
                    ...carried,
                },
            }
            if (authSaysRemoved) {
                // The auth view already flags it removed — authoritative. For a
                // post nobody logged out can see, only by removed_by_category
                // (publicViewUncheckedReason).
                results.push(syntheticRemoved)
            } else if (covered && publiclyInvisible) {
                // Never publicly visible, so nothing here can judge it; same
                // synthetic shape as before. Monitoring counts it approved, which
                // also refreshes the body cache, except a removal it already
                // recorded, which stays as recorded (readLookupResult).
                results.push(syntheticRemoved)
            } else if (covered) {
                if (absentVerificationDisabled) {
                    // Remote fallback: pre-verification behavior — absence
                    // within coverage counts as removed, unless the
                    // unverified-is-unknown valve says omit. Not for a kind the
                    // owner hides: nothing of it is listed, so absence says nothing.
                    const hiddenKind = isPost ? profile.hidden?.t3 : profile.hidden?.t1
                    if (!absentUnverifiedIsUnknown && !hiddenKind) results.push(syntheticRemoved)
                } else {
                    const verdict = absentVerdicts[id]
                    if (verdict === 'live') {
                        // Renders on its own page → not removed; it's absent from
                        // the feed because its subreddit is hidden from the profile.
                        results.push({ data: { name: id, author: username, is_robot_indexable: true, ...carried } })
                    } else if (verdict === 'removed' || verdict === 'held') {
                        results.push(syntheticRemoved)
                    }
                    // No verdict ('unknown' or over the per-cycle budget) → omit:
                    // feed absence alone is ambiguous, so neither alert nor reset.
                }
            }
        }
    }
    // The legacy pending-post queue may hold a conflicting verdict from a cycle
    // where the www path failed over to old.reddit — clear our ids from it so
    // the two paths can't alternate verdicts for the same post.
    const t3Requested = ids.filter(id => id.startsWith('t3_'))
    if (t3Requested.length) {
        removeMultipleFromPendingPostQueue(t3Requested).catch(() => {})
    }
    // Counted the way monitoring reads them (readLookupResult): what nobody
    // logged out can see is neither removed nor live, and is named once, in the
    // copied log's header, instead of on every cycle's line
    const unchecked: Record<string, string> = {}
    let removedCount = 0
    for (const { data } of results) {
        const reason = publicViewUncheckedReason(data.name, authItemsMeta[data.name])
        if (reason) {
            unchecked[data.name] = reason
        } else if (isRemovedItem(data as RedditItem)) {
            removedCount++
        }
    }
    await notePublicViewUnchecked(unchecked)
    // Only the page verdicts that aren't 'live' are named. Every item of a
    // profile that hides them is checked on its own page, so the whole map was
    // about 100 ids, 3 KB, on every cycle's line.
    const notLive = Object.fromEntries(Object.entries(absentVerdicts).filter(([, v]) => v !== 'live'))
    const liveCount = Object.keys(absentVerdicts).length - Object.keys(notLive).length
    dlog(
        'feed',
        `[reveddit] www lookup ${username}: ${ids.length} requested, ${results.length} returned ` +
            `(${removedCount} removed, ${Object.keys(unchecked).length} can't be checked logged out, ` +
            `${ids.length - results.length} omitted/uncovered), ` +
            `coverage t1=${profile.coverage.t1} t3=${profile.coverage.t3}, verdicts=${JSON.stringify(postVerdicts)}, ` +
            `absentVerdicts=${JSON.stringify(notLive)}${liveCount ? ` +${liveCount} live` : ''}, ` +
            // routes= names the route that last served each kind of page;
            // "www route for ... is now" lines record any change.
            `routes=${JSON.stringify(fetcher.servedRoutes())}` +
            (profile.paginationStopped ? `, ${profile.paginationStopped}` : ''),
    )
    return results
}

// Legacy paths, kept as fallback until Reddit's deprecation lands:
// old.reddit HTML -> www JSON -> OAuth. All unauthenticated-legacy fetches are
// gated by the dev deprecation switch so post-deprecation behavior is testable.
// Posts go to the pending-post queue, which reads each one's own legacy page
// ('legacy'), whatever becomes of the listing: the listing ('legacy_info')
// rests on its own, and reddit refuses it while the pages still answer. Not
// posts the logged-in view shows in a private or quarantined community: their
// pages answer 403 logged out, which reads like reddit refusing every page.
const queueLegacyPosts = async (ids: string | string[], authItemsMeta: AuthItemsMeta) => {
    const postIds = (Array.isArray(ids) ? ids : String(ids).split(',')).filter(id => {
        const meta = authItemsMeta[id]
        return id.startsWith('t3_') && !(meta?.quarantine || meta?.subreddit_type === 'private')
    })
    if (postIds.length && !(await isLegacyOff('legacy'))) {
        await addToPendingPostQueue(postIds)
    }
}

const lookupItemsByID_legacy = (
    path: string,
    search: string,
    auth: any,
    monitor_quarantined: boolean,
    ids: string | string[],
    authItemsMeta: AuthItemsMeta = {},
) => {
    return queueLegacyPosts(ids, authItemsMeta)
        .catch(() => {})
        .then(() => throwIfLegacyOff('legacy reddit HTML', 'legacy_info'))
        .then(() => getItemsById_fromOldHTML(ids))
        .then(result => {
            clearRateLimitBackoff()
            noteCapabilityWorked('legacy_info')
            return result
        })
        .catch(htmlError => {
            console.log('old.reddit.com HTML fallback failed:', htmlError.message)
            noteLegacyRefusal(htmlError, 'legacy_info')

            // Second: try www.reddit.com JSON (sometimes works after rate-limit clears)
            const wwwUrl = www_reddit + path + '.json' + search
            const wwwOptions = { credentials: 'omit' as const }

            return throwIfLegacyOff('www.reddit.com JSON', 'legacy_info')
                .then(() => fetch(wwwUrl, wwwOptions))
                .then(response => {
                    if (response.ok) {
                        clearRateLimitBackoff()
                        return response.json()
                    } else {
                        throw new Error(`www.reddit.com request failed: ${response.status}`)
                    }
                })
                .then(data => {
                    if (data && data.data && data.data.children) {
                        return data.data.children
                    }
                    throw new Error('Invalid data format from www.reddit.com')
                })
                .catch(async wwwError => {
                    console.log('www.reddit.com JSON failed:', wwwError.message)

                    // Fall back to OAuth if available
                    if (auth && auth !== 'none') {
                        console.log('Trying OAuth fallback')
                        const children = await fetch_forReddit(path + search, auth, monitor_quarantined)
                        // It swallows its own errors (returns undefined), which
                        // monitoring would read as a pass that found nothing
                        if (Array.isArray(children)) {
                            return children
                        }
                    }
                    // Only a 429 enters the backoff here. This chain runs
                    // when the public view already failed, and its refusal
                    // must not replace the status that failure reports.
                    noteRateLimited(wwwError)
                    throw htmlError
                })
        })
}

// "Other" (non-profile) items have no public profile to diff against, so removal
// is read from api/info instead. This is the deprecation-surviving primary for
// that case: an AUTHENTICATED api/info request (OAuth token if one exists, else
// the user's real session cookies) — both survive the unauth deprecation. It
// reveals removals for content the user did NOT author (Reddit's self-view only
// hides your OWN removals); self-authored items are handled separately via the
// logged-out thread view. Ids are batched to Reddit's 100-per-call api/info limit,
// one chunk at a time with a small gap, so a large watch list can't burst.
const OTHER_APIINFO_CHUNK = 100
const OTHER_APIINFO_CHUNK_DELAY_MS = 1000

// A JSON read with the user's login from the background, through the bridge's
// fetch (logged-in-fetch.ts: the cache mode that gets past reddit's edge, one
// retry in the other mode on its block page). Timed out like the public-view
// fetches, since the monitoring cycle waits for it.
interface LoggedInJson {
    ok: boolean
    status: number
    // the answer was the edge's block page; refused: in both cache modes
    blocked: boolean
    refused: boolean
    json?: any
}
const fetchJsonLoggedIn = async (url: string): Promise<LoggedInJson> => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), WWW_FETCH_TIMEOUT_MS)
    try {
        const { response, blockPage, retried } = await fetchLoggedIn(url, { signal: controller.signal })
        if (blockPage) {
            return { ok: false, status: 403, blocked: true, refused: retried }
        }
        if (!response.ok) {
            return { ok: false, status: response.status, blocked: false, refused: false }
        }
        return { ok: true, status: response.status, blocked: false, refused: false, json: await response.json() }
    } catch {
        return { ok: false, status: 0, blocked: false, refused: false }
    } finally {
        clearTimeout(timer)
    }
}

// One item through its thread's JSON with the user's login, which carries the
// fields api/info had (body [removed] or [deleted], removed_by_category,
// is_robot_indexable, locked): a comment through its permalink, where it comes
// first, a post through its thread. data is the item when reddit answered
// with it.
export interface ThreadItemRead {
    data?: any
    status: number
    blocked: boolean
    refused: boolean
}
const threadItemUrl = (id: string, postId: string): string => {
    const post = postId.replace(/^t3_/, '')
    return id.startsWith('t3_')
        ? `${www_reddit}comments/${post}.json?limit=1&raw_json=1`
        : `${www_reddit}comments/${post}/_/${id.slice(3)}.json?limit=1&depth=1&raw_json=1`
}
const threadItemOf = (json: any, id: string): any => {
    const data = id.startsWith('t3_') ? json?.[0]?.data?.children?.[0]?.data : json?.[1]?.data?.children?.[0]?.data
    return data?.name === id ? data : undefined
}
export const readThreadItemLoggedIn = async (id: string, postId: string): Promise<ThreadItemRead> => {
    const r = await fetchJsonLoggedIn(threadItemUrl(id, postId))
    return {
        data: r.ok ? threadItemOf(r.json, id) : undefined,
        status: r.status,
        blocked: r.blocked,
        refused: r.refused,
    }
}

// While api/info rests, each followed item is read through its thread's JSON
// (readThreadItemLoggedIn). One request per item, so a few per cycle,
// oldest-checked first: 100 followed items take about 20 cycles to go round.
// An item not read this cycle is left out of the result, which monitoring
// reads as no news. A comment's post id comes from the URL it was followed
// from (setCurrentStateForId) or from the item cache, whose p is the post's
// fullname; one found in the cache is copied over, so the cache isn't read
// every cycle. Both maps keep only followed items.
export const FOLLOWED_CHECKED_AT_KEY = 'followed_checked_at'
export const FOLLOWED_POST_IDS_KEY = 'followed_post_ids'
const FOLLOWED_THREAD_CHECKS_PER_CYCLE = 5
const FOLLOWED_THREAD_DELAY_MS = 700
export const _followedTiming = { delayMs: FOLLOWED_THREAD_DELAY_MS }

const readFollowedMaps = async (): Promise<{ checkedAt: Record<string, number>; postIds: Record<string, string> }> => {
    try {
        const stored = (await browser.storage.local.get({
            [FOLLOWED_CHECKED_AT_KEY]: {},
            [FOLLOWED_POST_IDS_KEY]: {},
        })) as any
        return { checkedAt: stored[FOLLOWED_CHECKED_AT_KEY] || {}, postIds: stored[FOLLOWED_POST_IDS_KEY] || {} }
    } catch {
        return { checkedAt: {}, postIds: {} }
    }
}

// Merged into what's stored now (a follow's lookup can run beside a cycle's)
// and pruned to the followed list, not to this call's ids: a follow looks up
// one id, and the rotation must not restart then
const saveFollowedMaps = async (checked: Record<string, number>, foundPostIds: Record<string, string>) => {
    try {
        const { checkedAt, postIds } = await readFollowedMaps()
        const followed = new Set(
            Object.keys(
                (((await browser.storage.sync.get({ other_subscriptions: {} })) as any).other_subscriptions ||
                    {}) as object,
            ),
        )
        const keep = (map: Record<string, unknown>) => {
            let dropped = false
            for (const id of Object.keys(map)) {
                if (!followed.has(id)) {
                    delete map[id]
                    dropped = true
                }
            }
            return dropped
        }
        Object.assign(checkedAt, checked)
        const postIdsChanged = Object.entries(foundPostIds).some(([id, post]) => postIds[id] !== post)
        Object.assign(postIds, foundPostIds)
        keep(checkedAt)
        const write: Record<string, unknown> = { [FOLLOWED_CHECKED_AT_KEY]: checkedAt }
        if (keep(postIds) || postIdsChanged) {
            write[FOLLOWED_POST_IDS_KEY] = postIds
        }
        await browser.storage.local.set(write)
    } catch {
        /* ignored */
    }
}

const lookupFollowedItemsByThread = async (ids: string[]): Promise<any[]> => {
    const skip = (why: string) => {
        dlogSummary('cycle', `[reveddit] followed items through their threads (api/info resting): ${why}`)
        return []
    }
    if (await isCapabilityResting('thread_json')) {
        return skip(`not read, the thread reads rest after reddit refused them`)
    }
    // Logged out, reddit answers every .json from the extension with its
    // block page (bridge.ts), so there's nothing to read
    if (!(await hasRedditLoginCookie())) {
        return skip('not read, no reddit login')
    }
    const { checkedAt, postIds } = await readFollowedMaps()
    const found: Record<string, string> = {}
    if (ids.some(id => !id.startsWith('t3_') && !postIds[id])) {
        try {
            const cached: Record<string, any> = ((await getLocalStorageItems('other', false)) as any) || {}
            for (const id of ids) {
                const p = cached[id]?.p
                if (!id.startsWith('t3_') && !postIds[id] && typeof p === 'string' && p) {
                    found[id] = p.replace(/^t3_/, '')
                }
            }
        } catch {
            /* ignored */
        }
    }
    const postOf = (id: string): string | undefined =>
        id.startsWith('t3_') ? id : postIds[id] || found[id] || undefined
    const readable = ids.filter(id => postOf(id))
    const noPost = ids.length - readable.length
    readable.sort((a, b) => (checkedAt[a] || 0) - (checkedAt[b] || 0))
    const batch = readable.slice(0, FOLLOWED_THREAD_CHECKS_PER_CYCLE)
    const results: { data: any }[] = []
    const checked: Record<string, number> = {}
    let answered = false
    let viewerBlocked = 0
    let note = ''
    for (const [i, id] of batch.entries()) {
        if (i > 0 && _followedTiming.delayMs > 0) {
            await new Promise(r => setTimeout(r, _followedTiming.delayMs))
        }
        const r = await readThreadItemLoggedIn(id, postOf(id)!)
        if (r.status === 429) {
            noteRateLimited(new Error('www.reddit.com request failed: 429'))
            note = ', stopped on a 429'
            break
        }
        if (r.blocked) {
            // Refused in both cache modes: the thread reads rest like api/info.
            // One mode only (the other was skipped after a recent double
            // block): just this cycle's reads stop.
            if (r.refused) {
                await noteCapabilityRefused('thread_json', 'block page')
            }
            note = ', stopped on a block page'
            break
        }
        checked[id] = Date.now()
        if (r.status === 200) {
            answered = true
        }
        if (r.data) {
            // The author blocked the user: the logged-in view reads
            // [unavailable], which would look like a removal
            if (isViewerBlockedItem(r.data)) {
                viewerBlocked++
            } else {
                results.push({ data: r.data })
            }
        }
    }
    if (answered) {
        await noteCapabilityWorked('thread_json')
    }
    await saveFollowedMaps(checked, found)
    dlogSummary(
        'cycle',
        `[reveddit] followed items through their threads (api/info resting): ${results.length} of ${batch.length} read` +
            note +
            (viewerBlocked ? `, ${viewerBlocked} hidden by their authors' block` : '') +
            (noPost ? `, ${noPost} comments with no known post skipped` : ''),
    )
    return results
}

const lookupOtherItemsByID_authed = async (ids: string[], auth: any, monitor_quarantined: boolean) => {
    // After a 429 earlier in the cycle (the user's own lookup): no news this time
    if (await isRateLimitedNow()) {
        dlog('cycle', `[reveddit] followed items not read: rate limited`)
        return []
    }
    const useOAuth = auth && auth !== NO_AUTH
    if (!useOAuth) {
        // Put the user's harvested session back in the cookie jar so credentials
        // 'include' yields the authenticated view (mirrors lookupItemsByLoggedInUserWithAuth).
        await rehydrateStoredRedditCookies()
        if (await isCapabilityResting('api_info')) {
            return lookupFollowedItemsByThread(ids)
        }
    }
    const children: any[] = []
    for (let i = 0; i < ids.length; i += OTHER_APIINFO_CHUNK) {
        const chunk = ids.slice(i, i + OTHER_APIINFO_CHUNK)
        const search = `?id=${chunk.join(',')}&raw_json=1`
        let batch: any
        if (useOAuth) {
            batch = await fetch_forReddit('api/info' + search, auth, monitor_quarantined)
        } else {
            const r = await fetchJsonLoggedIn(`${www_reddit}api/info.json${search}`)
            if (r.blocked) {
                await noteCapabilityRefused('api_info', 'block page')
                return lookupFollowedItemsByThread(ids)
            }
            if (!r.ok) {
                throw new Error(`authenticated api/info request failed: ${r.status}`)
            }
            batch = r.json?.data?.children
        }
        if (!Array.isArray(batch)) {
            // fetch_forReddit swallows its own errors (returns undefined); treat any
            // non-array as failure so the caller drops to the legacy chain.
            throw new Error('authenticated api/info returned no children')
        }
        children.push(...batch)
        if (i + OTHER_APIINFO_CHUNK < ids.length) {
            await new Promise(r => setTimeout(r, OTHER_APIINFO_CHUNK_DELAY_MS))
        }
    }
    if (!useOAuth) {
        await noteCapabilityWorked('api_info')
    }
    // Items whose authors blocked the user read [unavailable] logged in, which
    // would look like removals: no news about them
    const visible = children.filter(child => !isViewerBlockedItem(child?.data))
    if (visible.length < children.length) {
        dlog('cycle', `[reveddit] followed items: ${children.length - visible.length} hidden by their authors' block`)
    }
    return visible
}

// The second account's view of the user's own items (viewer.ts): what other
// logged-in people see, for when reddit asks for a login before it shows
// profiles. Read through reddit's JSON with that account's login:
// - The user's comments and posts listings, newest first, walked until they
//   reach the oldest item asked about or VIEWER_LISTING_PAGES pages. A listed
//   comment is visible to others. A listed post is too, except a young one or
//   one recorded as removed, which its own thread decides, since held and
//   filtered posts linger in listings.
// - An item missing from the part walked is read on its own thread: reddit
//   leaves out of listings the items in subreddits the user hides from their
//   profile, so missing isn't removed.
// - Older than the part walked, or not read this cycle: no verdict.
// A few thread reads per cycle, verdicts cached, like the public view's page
// checks. Items in NSFW, quarantined and private subreddits follow the public
// view's rules (_public_view), whatever the second account can see.
export const VIEWER_VERDICTS_KEY = 'viewer_item_verdicts'
export const VIEWER_SIGNED_OUT = 'viewer_signed_out'
export const VIEWER_UNAVAILABLE = 'viewer_unavailable'
const VIEWER_FAILURE_WARN_THRESHOLD = 5
const VIEWER_LISTING_PAGES = 3
const VIEWER_THREAD_READS_PER_CYCLE = 10
const VIEWER_VERDICTS_MAX = 300
export const _viewerTiming = { delayMs: 500 }
type ViewerVerdict = 'live' | 'removed' | 'unknown'
const VIEWER_VERDICT_TTL_MS: Record<ViewerVerdict, number> = {
    live: 6 * 3600 * 1000,
    removed: 2 * 3600 * 1000,
    unknown: 30 * 60 * 1000,
}

// Consecutive failed lookups through the second account, warned about after a
// streak like the public view's (recordWwwDetectOutcome)
const recordViewerOutcome = async (ok: boolean, reason = '') => {
    try {
        if (ok) {
            await browser.storage.local.remove(VIEWER_FAILURES_KEY)
            return
        }
        const stored = (await browser.storage.local.get({ [VIEWER_FAILURES_KEY]: 0 })) as any
        const failures = Number(stored[VIEWER_FAILURES_KEY] || 0) + 1
        await browser.storage.local.set({ [VIEWER_FAILURES_KEY]: failures })
        dlog('feed', `[reveddit] second-account lookup failed — consecutive failures: ${failures} (${reason})`)
        if (failures >= VIEWER_FAILURE_WARN_THRESHOLD) {
            setWarningBadge(VIEWER_UNAVAILABLE)
        }
    } catch {
        /* ignored */
    }
}

interface ViewerListing {
    items: Map<string, any>
    // ids at or above it were walked; 0 when the listing was walked to its end
    floor: number
    status?: number
    error?: string
}
const readViewerListing = async (
    viewer: ViewerAccount,
    username: string,
    tab: 'comments' | 'submitted',
    needed: number[],
): Promise<ViewerListing> => {
    const items = new Map<string, any>()
    let floor = Infinity
    let after = ''
    for (let page = 0; page < VIEWER_LISTING_PAGES; page++) {
        const r = await fetchJsonAsViewer(
            `${www_reddit}user/${encodeURIComponent(username)}/${tab}.json?sort=new&limit=100&raw_json=1` +
                (after ? `&after=${encodeURIComponent(after)}` : ''),
            viewer,
        )
        const children = r.json?.data?.children
        if (!r.ok || !Array.isArray(children)) {
            const error = r.blocked
                ? 'block page'
                : r.ok
                  ? 'unreadable answer'
                  : r.status === 200
                    ? 'a page in place of JSON'
                    : `request failed: ${r.status || 'network'}`
            // A later page failing only ends the walk, as in the logged-out
            // view's pagination: what the pages before it showed still stands,
            // and the floor says how far that reached. A 429 still ends the lookup.
            if (page > 0 && r.status !== 429) {
                dlog('feed', `[reveddit] second account: ${tab} listing stopped after ${page} pages: ${error}`)
                return { items, floor }
            }
            return { items, floor, status: r.status, error }
        }
        for (const child of children) {
            const name = child?.data?.name
            if (typeof name === 'string' && name.startsWith(tab === 'comments' ? 't1_' : 't3_')) {
                items.set(name, child.data)
                floor = Math.min(floor, fullnameValue(name))
            }
        }
        after = String(r.json?.data?.after || '')
        if (!after) {
            return { items, floor: 0 }
        }
        if (!needed.length || Math.min(...needed) >= floor) {
            break
        }
    }
    return { items, floor }
}

// An item's verdict from its thread's JSON as the second account. Another
// account doesn't get a removed comment that has no replies at all: its own
// permalink answers with the post and no comments, where the author's view has
// the comment intact (verified 2026-10-30 on two mod-removed comments). So a
// comment missing there is removed, when the post is the right one and nothing
// else came back in its place, which would mean the permalink's focus didn't take.
const viewerVerdictOf = (id: string, postId: string, json: any): ViewerVerdict => {
    const post = json?.[0]?.data?.children?.[0]?.data
    if (!post || post.name !== `t3_${postId.replace(/^t3_/, '')}`) {
        return 'unknown'
    }
    const data = id.startsWith('t3_') ? post : threadItemOf(json, id)
    if (!data) {
        const comments = json?.[1]?.data?.children
        return Array.isArray(comments) && comments.length === 0 ? 'removed' : 'unknown'
    }
    // The author's block, or the user deleting it since: no verdict
    if (isViewerBlockedItem(data) || (!id.startsWith('t3_') && isUserDeletedComment(data))) {
        return 'unknown'
    }
    if (
        isRemovedItem(data) ||
        (id.startsWith('t3_') && data.removed_by_category && data.removed_by_category !== 'deleted')
    ) {
        return 'removed'
    }
    return 'live'
}

// l: read while the item was listed
const readViewerVerdicts = async (): Promise<Record<string, { v: ViewerVerdict; t: number; l?: 1 }>> => {
    try {
        return ((await browser.storage.local.get({ [VIEWER_VERDICTS_KEY]: {} })) as any)[VIEWER_VERDICTS_KEY] || {}
    } catch {
        return {}
    }
}

// Consecutive cycles whose thread reads as the second account all came back
// without a verdict (block pages, unreadable answers), warned about like the
// logged-out view's page checks (recordAbsentVerifyOutcome): a removed comment
// drops out of the listings, so it goes unseen without its thread read. A
// fresh verdict ends the streak, and so does nothing being left without one;
// a cycle that reads no thread while items wait leaves it as it is. Kept per
// connected account (its token), so another starts afresh.
const VIEWER_THREAD_FAILURES_KEY = 'viewer_thread_consecutive_failures'
const viewerThreadFailures = async (viewer: ViewerAccount): Promise<number> => {
    try {
        const stored = ((await browser.storage.local.get({ [VIEWER_THREAD_FAILURES_KEY]: null })) as any)[
            VIEWER_THREAD_FAILURES_KEY
        ]
        return stored?.token === viewer.token ? Number(stored.failures) || 0 : 0
    } catch {
        return 0
    }
}
const recordViewerThreadOutcome = async (viewer: ViewerAccount, read: number, resolved: number, pending: number) => {
    if (!read && pending) {
        return
    }
    try {
        const before = await viewerThreadFailures(viewer)
        if (resolved || !pending) {
            if (before) {
                await browser.storage.local.remove(VIEWER_THREAD_FAILURES_KEY)
            }
            return
        }
        const failures = before + 1
        await browser.storage.local.set({ [VIEWER_THREAD_FAILURES_KEY]: { token: viewer.token, failures } })
        dlogSummary(
            'verify',
            `[reveddit] second-account thread reads resolved nothing — consecutive cycles: ${failures}`,
        )
        if (failures >= VIEWER_FAILURE_WARN_THRESHOLD) {
            setWarningBadge(VIEWER_UNAVAILABLE)
        }
    } catch {
        /* ignored */
    }
}

// After both listings come back as the edge's block page in both cache modes,
// the second account rests half an hour, as the logged-out view's refused
// routes rest (noteRefusal): every cycle would otherwise send reddit the same
// refused requests from that account. Resting cycles count as failed lookups,
// so the warning stays up. Kept per connected account (its token).
const VIEWER_REST_KEY = 'viewer_rest'
const VIEWER_BLOCK_REST_MS = 30 * 60 * 1000
// Kept as when the rest began, which must be in the past: a rest begun while
// the clock ran ahead then doesn't outlast its half hour once the clock is put
// right
const viewerRestUntil = async (viewer: ViewerAccount): Promise<number> => {
    try {
        const stored = ((await browser.storage.local.get({ [VIEWER_REST_KEY]: null })) as any)[VIEWER_REST_KEY]
        const began = Number(stored?.t)
        if (began > Date.now()) {
            // Dated ahead by a clock since put right: removed, so it doesn't
            // begin a rest of its own once real time reaches it
            await browser.storage.local.remove(VIEWER_REST_KEY)
            return 0
        }
        return stored?.token === viewer.token && began > 0 ? began + VIEWER_BLOCK_REST_MS : 0
    } catch {
        return 0
    }
}
const restViewer = async (viewer: ViewerAccount) => {
    const t = Date.now()
    await browser.storage.local.set({ [VIEWER_REST_KEY]: { token: viewer.token, t } }).catch(() => null)
    dlog(
        'feed',
        `[reveddit] second account: block pages on both listings; resting until ${new Date(t + VIEWER_BLOCK_REST_MS).toISOString()}`,
    )
}

// Which view last checked each user's items (lookupItemsByID_withFallback),
// so the pass's end keeps that view's warnings (lookupWarningToKeep)
const viewerCheckedLast = new Map<string, boolean>()

// Warnings about part of the check. A cycle that read nothing takes over from
// them (recordCheckOutcome), and the next pass puts back the one still true.
const PARTIAL_WARNINGS = new Set([VIEWER_UNAVAILABLE, ABSENT_VERIFY_UNAVAILABLE, PROFILE_PAGINATION_UNAVAILABLE])

// The warning a processed monitoring pass keeps, though a pass otherwise
// clears error_status: the outage of a check a pass completes without, which
// only that check's own recovery ends. With a second account checking, that's
// its thread reads; in the logged-out view, page checks and pagination.
export const lookupWarningToKeep = async (username: string): Promise<string | null> => {
    const viewer = await getViewer()
    const viaViewer = viewerCheckedLast.get(username.toLowerCase()) ?? !isSignedInViewer(viewer?.name || '', username)
    if (viewer && viaViewer) {
        return (await viewerThreadFailures(viewer)) >= VIEWER_FAILURE_WARN_THRESHOLD ? VIEWER_UNAVAILABLE : null
    }
    if (await isAbsentVerifyUnavailable()) {
        return absentVerifyWarning()
    }
    if (await isProfilePaginationShort()) {
        return paginationWarning()
    }
    return null
}

// Each item through its own thread, as the second account: cached verdicts
// first, then at most VIEWER_THREAD_READS_PER_CYCLE reads in the order given.
// read, resolved (fresh verdicts) and pending (items still without one) are
// for recordViewerThreadOutcome. A 'live' lasts as long as the logged-out
// view's does for a missing item (absentLiveTtl: sooner for young items, when
// removals happen), and ends when an item read live while listed drops out of
// the listing, which is how a removal shows.
const readViewerThreads = async (
    viewer: ViewerAccount,
    ids: string[],
    authItemsMeta: AuthItemsMeta,
    listed: Map<string, any>,
): Promise<{ verdicts: Record<string, ViewerVerdict>; read: number; resolved: number; pending: number }> => {
    const cache = await readViewerVerdicts()
    const verdicts: Record<string, ViewerVerdict> = {}
    const now = Date.now()
    const ttl = (id: string, entry: { v: ViewerVerdict; l?: 1 }) =>
        entry.v !== 'live'
            ? (VIEWER_VERDICT_TTL_MS[entry.v] ?? 0)
            : entry.l && !listed.has(id)
              ? 0
              : absentLiveTtl(authItemsMeta[id]?.created_utc, now)
    const due = ids.filter(id => {
        const entry = cache[id]
        const age = now - Number(entry?.t)
        if (entry && age >= 0 && age < ttl(id, entry)) {
            if (entry.v !== 'unknown') {
                verdicts[id] = entry.v
            }
            return false
        }
        return true
    })
    let read = 0
    let resolved = 0
    let note = ''
    for (const id of due) {
        if (read >= VIEWER_THREAD_READS_PER_CYCLE) {
            break
        }
        const postId = id.startsWith('t3_') ? id : authItemsMeta[id]?.link_id
        if (!postId) {
            continue
        }
        if (read > 0 && _viewerTiming.delayMs > 0) {
            await new Promise(r => setTimeout(r, _viewerTiming.delayMs))
        }
        read++
        const r = await fetchJsonAsViewer(threadItemUrl(id, postId), viewer)
        if (r.status === 429) {
            noteRateLimited(new Error('www.reddit.com request failed: 429'))
            note = ', stopped on a 429'
            // Rate limited isn't refused: no count toward the warning
            read--
            break
        }
        if (r.blocked || (r.status === 200 && !r.ok)) {
            // Paced like an unreadable answer, so the next cycle goes on to
            // the items after this one instead of asking for it again. A page
            // in place of the JSON (a challenge) stops the reads like the block
            // page, since the next would get the same.
            cache[id] = { v: 'unknown', t: Date.now() }
            note = r.blocked ? ', stopped on a block page' : ', stopped on a page in place of JSON'
            break
        }
        const v = viewerVerdictOf(id, postId, r.ok ? r.json : undefined)
        cache[id] = { v, t: Date.now(), ...(listed.has(id) && { l: 1 as const }) }
        if (v !== 'unknown') {
            verdicts[id] = v
            resolved++
        }
    }
    if (read) {
        const kept = Object.entries(cache)
            .filter(([, entry]) => Date.now() - Number(entry?.t) < (VIEWER_VERDICT_TTL_MS[entry?.v] ?? 0))
            .sort((a, b) => b[1].t - a[1].t)
            .slice(0, VIEWER_VERDICTS_MAX)
        await browser.storage.local.set({ [VIEWER_VERDICTS_KEY]: Object.fromEntries(kept) }).catch(() => null)
    }
    const counts = due
        .slice(0, read)
        .map(id => cache[id]?.v)
        .filter(Boolean)
    dlogSummary(
        'verify',
        `[reveddit] second account: ${read} thread reads of ${due.length} due (` +
            (['live', 'removed', 'unknown'] as const)
                .map(v => `${counts.filter(c => c === v).length} ${v}`)
                .join(', ') +
            `)${note}`,
    )
    return { verdicts, read, resolved, pending: ids.filter(id => !verdicts[id]).length }
}

export const lookupItemsByID_fromViewer = async (
    ids: string[],
    username: string,
    authItemsMeta: AuthItemsMeta,
    viewer: ViewerAccount,
) => {
    const rest = await viewerRestUntil(viewer)
    if (rest > Date.now()) {
        const reason = `resting after block pages until ${new Date(rest).toISOString()}`
        await recordViewerOutcome(false, reason)
        throw new Error(`second-account lookup skipped: ${reason}`)
    }
    // Chrome and Edge: the rule carrying its cookies dates from the worker's
    // start, and a cookie may have expired since. Made again, it leaves it out.
    await installViewerHeaderRule()
    // A 429 there enters the shared backoff like any other
    const identity = await checkViewerIdentity(viewer).catch(err => {
        noteRateLimited(err)
        throw err
    })
    if (identity === 'signed_out') {
        dlog('feed', '[reveddit] the second account is signed out; it can be connected again in options')
        setWarningBadge(VIEWER_SIGNED_OUT)
        throw new Error(VIEWER_SIGNED_OUT)
    }
    const needed = (prefix: string) =>
        ids
            .filter(id => id.startsWith(prefix))
            .map(fullnameValue)
            .filter(Number.isFinite)
    const rateLimited = (): never => {
        noteRateLimited(new Error('www.reddit.com request failed: 429'))
        throw new Error('www.reddit.com request failed: 429')
    }
    // A listing no item needs isn't walked: it has nothing to decide, and its
    // failing would stop every check. Both listings missing is the shadowban
    // signature, though, so a walked listing's 404 sends for the other too.
    const unwalked: ViewerListing = { items: new Map(), floor: 0 }
    const walk = (tab: 'comments' | 'submitted') =>
        readViewerListing(viewer, username, tab, needed(tab === 'comments' ? 't1_' : 't3_'))
    let comments = needed('t1_').length ? await walk('comments') : unwalked
    if (comments.status === 429) {
        rateLimited()
    }
    const posts = needed('t3_').length || comments.status === 404 ? await walk('submitted') : unwalked
    if (posts.status === 404 && comments === unwalked) {
        comments = await walk('comments')
    }
    const walked = [comments, posts].filter(listing => listing !== unwalked)
    const failed = walked.filter(listing => listing.error)
    if (failed.some(listing => listing.status === 429)) {
        rateLimited()
    }
    if (failed.length === 2 && failed.every(listing => listing.status === 404) && ids.length) {
        // Both listings missing: logged in or out, the account doesn't exist for
        // others, which is how a sitewide shadowban looks, while a profile known
        // to exist still loads
        const control = await fetchJsonAsViewer(
            `${www_reddit}user/${PROFILE_CONTROL_USER}/comments.json?limit=1`,
            viewer,
        )
        if (control.status === 429) {
            rateLimited()
        }
        if (control.ok) {
            await recordViewerOutcome(true)
            return reportPublicProfileShadowban(username, 'missing (404) to the second account', true)
        }
    }
    if (failed.length) {
        const reason = failed.map(listing => listing.error).join('; ')
        await recordViewerOutcome(false, reason)
        // Refused outright: every listing walked got the block page in both
        // cache modes, or a page in place of the JSON (a challenge)
        if (
            failed.length === walked.length &&
            failed.every(listing => listing.error === 'block page' || listing.error === 'a page in place of JSON')
        ) {
            await restViewer(viewer)
        }
        throw new Error(`second-account lookup failed: ${reason}`)
    }
    await recordViewerOutcome(true)
    // The logged-out view's own warnings outlive a pass until that view
    // recovers; it isn't used while a second account checks, so they end here.
    // So does a missing-profile reading: another account sees the profile. The
    // thread reads below keep their own streak.
    await recordAbsentVerifyOutcome(true)
    await recordPaginationOutcome(undefined)
    await recordWwwDetectOutcome(true)
    await notePublicProfileUnavailable(null)

    // An item the second account gets as [unavailable] (one of the accounts
    // blocked the other) says nothing about how others see it, and would read
    // as removed. It's left to its thread, which can't decide it either, so it
    // gets no verdict, and cycles of nothing else count toward the warning.
    const all = [...comments.items, ...posts.items]
    const listed = new Map(all.filter(([, item]) => !isViewerBlockedItem(item)))
    if (listed.size < all.length) {
        dlog('feed', `[reveddit] second account: ${all.length - listed.size} listed items read [unavailable] (a block)`)
    }
    const meta = (id: string) => authItemsMeta[id] || {}
    const covered = (id: string) => {
        const value = fullnameValue(id)
        return Number.isFinite(value) && value >= (id.startsWith('t3_') ? posts.floor : comments.floor)
    }
    const authSaysRemoved = (id: string) =>
        id.startsWith('t3_') && (meta(id).is_robot_indexable === false || !!meta(id).removed_by_category)
    const young = (id: string) => {
        const created = meta(id).created_utc
        return created === undefined || Math.floor(Date.now() / 1000) - created <= POST_FEED_GRACE_SECONDS
    }
    const listedRemoved = (id: string, item: any) =>
        isRemovedItem(item) ||
        (id.startsWith('t3_') && !!item.removed_by_category && item.removed_by_category !== 'deleted')
    // Missing items first, each a possible removal; then listed posts a
    // listing can't clear
    const threads = await readViewerThreads(
        viewer,
        [
            ...ids.filter(
                id => !listed.has(id) && covered(id) && !authSaysRemoved(id) && !publiclyInvisibleReason(meta(id)),
            ),
            ...ids.filter(
                id =>
                    id.startsWith('t3_') &&
                    listed.has(id) &&
                    !authSaysRemoved(id) &&
                    !listedRemoved(id, listed.get(id)) &&
                    (young(id) || meta(id).known_removed),
            ),
        ],
        authItemsMeta,
        listed,
    )
    await recordViewerThreadOutcome(viewer, threads.read, threads.resolved, threads.pending)
    const verdicts = threads.verdicts
    const results: { data: Record<string, any> }[] = []
    for (const id of ids) {
        const m = meta(id)
        // As the public view marks its results (lookupItemsByID_fromPublicProfile)
        const carried = {
            locked: !!m.locked,
            ...(m.created_utc !== undefined && { created_utc: m.created_utc }),
            _public_view: true,
        }
        const syntheticRemoved = {
            data: { name: id, author: '[deleted]', body: '[removed]', is_robot_indexable: false, ...carried },
        }
        const item = listed.get(id)
        const verdict = verdicts[id]
        if (authSaysRemoved(id) || (item && listedRemoved(id, item)) || verdict === 'removed') {
            results.push(syntheticRemoved)
        } else if (item) {
            if (!id.startsWith('t3_') || verdict === 'live') {
                results.push({ data: { ...item, ...carried } })
            } else if (!m.known_removed) {
                // No thread verdict yet: listed, so visible, but a young post
                // may still be held, so the bridge isn't told it's publicly live
                results.push({
                    data: {
                        ...item,
                        is_robot_indexable: true,
                        ...carried,
                        ...(young(id) && { _public_view_unverified: true }),
                    },
                })
            }
            // Recorded removed, still listed, no thread verdict: no news, so a
            // listing alone never flips a recorded removal back
        } else if (covered(id) && publiclyInvisibleReason(m)) {
            // Monitoring reads these as unchecked, as for the public view
            results.push(syntheticRemoved)
        } else if (covered(id) && verdict === 'live') {
            results.push({ data: { name: id, author: username, is_robot_indexable: true, ...carried } })
        }
        // Not read this cycle, unreadable, or older than the part walked: no news
    }
    dlog(
        'feed',
        `[reveddit] second-account lookup: ${ids.length} requested, ${results.length} returned, ` +
            `${listed.size} listed (floor t1 ${comments.floor}, t3 ${posts.floor})`,
    )
    return results
}

// Primary: compare against the logged-out www.reddit.com profile (survives the
// deprecation). Falls back to the legacy chain while that still exists. With a
// second account connected (viewer.ts), it checks the user's items instead,
// and the logged-out view isn't tried.
export const lookupItemsByID_withFallback = (
    path: string,
    search: string,
    auth: any,
    monitor_quarantined = false,
    ids: string | string[] = '',
    username = '',
    authItemsMeta: AuthItemsMeta = {},
) => {
    const idsArray = (Array.isArray(ids) ? ids : String(ids).split(',')).filter(x => x)
    const legacy = () => lookupItemsByID_legacy(path, search, auth, monitor_quarantined, ids, authItemsMeta)
    if (!idsArray.length) {
        if (username) {
            // None of the user's items left to check: nothing to ask reddit,
            // and a second account's thread reads have nothing left to warn
            // about (recordViewerThreadOutcome). No view checked, so the pass
            // keeps warnings by the usual rule (lookupWarningToKeep).
            viewerCheckedLast.delete(username.toLowerCase())
            return browser.storage.local
                .remove(VIEWER_THREAD_FAILURES_KEY)
                .catch(() => null)
                .then(() => [])
        }
        return legacy()
    }
    if (!username) {
        // "Other" (non-profile) subscriptions: no public profile to diff against.
        // Authenticated api/info is the deprecation-surviving primary; the legacy
        // chain stays as a fallback only while old.reddit/unauth-.json still work.
        return lookupOtherItemsByID_authed(idsArray, auth, monitor_quarantined)
            .then(result => {
                clearRateLimitBackoff()
                return result
            })
            .catch((authedError: Error) => {
                console.log('authenticated api/info lookup failed:', authedError.message)
                // A 429 on monitoring's own lookup enters the shared backoff,
                // and the legacy chain would only send more
                if (noteRateLimited(authedError)) {
                    throw authedError
                }
                return legacy()
            })
    }
    return getViewer().then(viewer => {
        // Signed in to the browser as the second account itself: its view of
        // its own items is the author's, where removals look live. The
        // logged-out view checks them while it can; when it can't, the popup
        // asks for a different second account (isSignedInViewer). When login
        // detection fell back to the cached username, the items' author says
        // who's signed in.
        const signedInAs = [username, ...Object.values(authItemsMeta).map(meta => meta.author || '')]
        if (viewer && signedInAs.some(name => isSignedInViewer(viewer!.name, name))) {
            dlog('feed', '[reveddit] the second account is the one signed in, so the logged-out view checks its items')
            viewer = null
        }
        viewerCheckedLast.set(username.toLowerCase(), !!viewer)
        return viewer
            ? lookupItemsByID_fromViewer(idsArray, username, authItemsMeta, viewer).then(result => {
                  clearRateLimitBackoff()
                  return result
              })
            : lookupItemsByID_publicThenLegacy(idsArray, username, authItemsMeta, legacy)
    })
}

const lookupItemsByID_publicThenLegacy = (
    idsArray: string[],
    username: string,
    authItemsMeta: AuthItemsMeta,
    legacy: () => Promise<any>,
) => {
    return lookupItemsByID_fromPublicProfile(idsArray, username, authItemsMeta)
        .then(result => {
            clearRateLimitBackoff()
            return result
        })
        .catch((publicError: Error) => {
            // A 429 (already in the backoff) ends the lookup: the legacy chain
            // would only send more. So does a login page: the legacy pages are
            // logged out too.
            if (
                publicError.message === PROFILE_PUBLICLY_EMPTY ||
                isRateLimitError(publicError) ||
                isLoginWallMessage(publicError.message)
            ) {
                throw publicError
            }
            console.log('www.reddit.com public profile lookup failed:', publicError.message)
            return legacy().catch((legacyError: any) => {
                // Name both failures. The legacy fallback's alone ("legacy reddit
                // HTML request failed: 403") hid the www failure behind it in
                // issue #27, which was filed about the legacy message.
                throw new Error(
                    `${publicError.message}; legacy fallback: ${String(legacyError?.message || legacyError)}`,
                )
            })
        })
}

// Whether the browser holds a reddit login (viewer.ts), for grace mode and the
// bridge, which import it from here
export { hasRedditLoginCookie }

// Every tab's scans take turns, so more of them don't mean a faster pace. The turn
// is taken when a read goes out, so its spacing is between real requests.
// Mutable for tests, like _wwwRouteTiming.
export const _scanTurn = { next: 0 }

// 0 once the turn is taken, or how long until it comes. The pace is the user's
// (options), and half that for a while after a 429, mirroring monitoring's own
// gentle resume (computeAbsentVerifyBudget).
const scanTurnIn = async (): Promise<number> => {
    const { gapMs } = await getScanSettings()
    const sinceHit = await getMsSinceLastRateLimitHit().catch(() => null)
    const gap = sinceHit !== null && sinceHit < RECENT_RATE_LIMIT_WINDOW_MS ? gapMs * 2 : gapMs
    const now = Date.now()
    // Further off than a gap, the clock went back
    if (_scanTurn.next > now && _scanTurn.next - now <= gap) return _scanTurn.next - now
    _scanTurn.next = now + gap
    return 0
}

// For a scan the user started (restore.ts). A login reads reddit's feeds at a
// scan's pace, where a logged-out browser gets one a minute (verified 2026-11-04).
// Every scan comes through here, so they share one pace and the backoff that
// monitoring and the bridge honor, whichever tab they run in. Too soon, it answers
// with waitMs: the page waits and asks again, where a cancel can take the read back.
export const readWithLogin = async (path: string, secondTry = false) => {
    if ((await getRemoteMechanism(MECHANISM_SCAN_FEEDS)) === 'off') {
        return { ok: false, status: 0, blockPage: true }
    }
    // The sign-in owns the browser's login until it ends (viewer.ts)
    if (await isViewerConnecting()) {
        return { ok: false, status: 0, busy: true }
    }
    if (!(await hasRedditLoginCookie())) {
        return { ok: false, status: 0, needsLogin: true }
    }
    if (await isRateLimitedNow()) {
        return { ok: false, status: 0, resting: true }
    }
    const waitMs = await scanTurnIn()
    if (waitMs > 0) {
        return { ok: false, status: 0, waitMs }
    }
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), WWW_FETCH_TIMEOUT_MS)
    try {
        const url = `https://www.reddit.com${path}`
        const { response, blockPage } = await fetchForScan(url, controller.signal, secondTry)
        // Reddit's logout leaves a short cookie of the login's name, so holding one
        // settles nothing, and no wait helps. Its answers to the login check do.
        if ((response.status === 429 || blockPage) && (await isLoginKeptOut())) {
            return { ok: false, status: 0, needsLogin: true }
        }
        if (response.status === 429) {
            noteRateLimited(new Error('www.reddit.com request failed: 429'))
        }
        return {
            ok: response.ok,
            status: response.status,
            blockPage,
            text: response.ok ? await response.text() : '',
        }
    } finally {
        clearTimeout(timer)
    }
}

const cookieDetails_redditSession = { name: 'reddit_session', url: 'https://reddit.com' }

// What cookies.set needs to put a cookie back as it was, expiry included: one
// put back without it lasts only until the browser closes, which signs the
// user out of Reddit (viewer.ts settableCookie)
const getSettableCookie = (cookie: any): any => (cookie ? settableCookie(toStoredCookie(cookie)) : cookie)

// The expiry reddit gave its login cookie, read from the cookie: reddit_session
// is a JWT whose exp claim is the cookie's expiry. Versions before 0.0.5.30
// wrote the login back without one, so it ended when the browser closed. An exp
// already past counts too, so an expired login is never put back. 0 when the
// cookie isn't such a JWT or the claim is too far off.
const LOGIN_EXPIRY_MAX_S = 400 * 24 * 3600
const loginCookieExpiry = (c: { name: string; value: string }): number => {
    const payload = c.name === 'reddit_session' ? String(c.value).split('.')[1] : ''
    if (!payload) {
        return 0
    }
    try {
        const b64 = payload.replace(/-/g, '+').replace(/_/g, '/')
        const exp = Number(JSON.parse(atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4))).exp)
        return exp < Date.now() / 1000 + LOGIN_EXPIRY_MAX_S ? exp : 0
    } catch {
        return 0
    }
}
// A saved cookie given the expiry its login JWT carries, when it has none
const withLoginExpiry = (c: StoredCookie): StoredCookie => {
    const exp = c.expirationDate ? 0 : loginCookieExpiry(c)
    return exp ? { ...c, expirationDate: exp } : c
}
// A domain copy ('.www.reddit.com') of a host-only cookie, which versions
// before 0.0.5.30 made when they put one back with its domain. Never saved or
// put back, so the copy lapses with the browser session.
const isOldDomainCopy = (c: { domain: string }) => /^\.[^.]+\.reddit\.com$/.test(c.domain)

// A request with a real OAuth token: only the token paths get here. The cookie
// that opts in to quarantined content is set every time. monitor_quarantined
// also takes reddit_session out as the request starts and puts it back right
// after, without waiting for the answer.
const fetch_forReddit = async (pathAndSearch: string, auth: any, monitor_quarantined: boolean) => {
    let cookie_redditSession
    await browser.cookies.set({
        domain: 'reddit.com',
        url: 'https://reddit.com',
        name: '_options',
        value: '{%22pref_quarantine_optin%22:true}',
    })
    if (monitor_quarantined) {
        cookie_redditSession = getSettableCookie(await browser.cookies.get(cookieDetails_redditSession))
        if (cookie_redditSession) {
            await browser.cookies.remove(cookieDetails_redditSession)
        }
    }
    const result = fetch(oauth_reddit + pathAndSearch, { ...auth, cache: 'reload' })
        .then(handleFetchErrors)
        .then(getRedditData)
        .catch(console.log)
    if (cookie_redditSession) {
        await browser.cookies.set(cookie_redditSession)
    }
    return result
}

export const lookupItemsByUser = (
    user: string,
    after: string,
    sort: string,
    timeSpan: string,
    monitor_quarantined: boolean,
    auth: any,
) => {
    const params: Record<string, any> = { limit: 100, sort, raw_json: 1 }
    if (after) params.after = after
    if (timeSpan) params.t = timeSpan
    const path = `user/${user}/overview.json`
    const search =
        '?' +
        Object.keys(params)
            .map(k => `${k}=${params[k]}`)
            .join('&')
    return fetch_forReddit(path + search, auth, monitor_quarantined)
}

// Alternative approach: use the same method as getLoggedinUser but with proper authentication
export const lookupItemsByLoggedInUserWithAuth = (
    after: string,
    sort: string,
    timeSpan: string,
    monitor_quarantined: boolean,
    auth: any,
) => {
    const params: Record<string, any> = { limit: 100, sort, raw_json: 1 }
    if (after) params.after = after
    if (timeSpan) params.t = timeSpan
    const search =
        '?' +
        Object.keys(params)
            .map(k => `${k}=${params[k]}`)
            .join('&')

    // First try www.reddit.com with rehydrated cookies
    return rehydrateStoredRedditCookies().then(() => {
        const url = `https://www.reddit.com/user/me.json${search}`
        const options = { credentials: 'include' as const, cache: 'reload' as const }
        return fetch(url, options)
            .then(response => {
                if (response.ok) {
                    // A challenge comes with a 200, and it's a refusal all the same
                    return response.json().catch(() => {
                        throw new Error('non-JSON listing from www.reddit.com')
                    })
                } else {
                    throw new Error(`www.reddit.com request failed: ${response.status}`)
                }
            })
            .then(data => {
                if (data && data.data && data.data.children) {
                    return data.data.children
                }
                throw new Error('Invalid data format from www.reddit.com')
            })
            .catch(error => {
                console.log('www.reddit.com request failed, trying OAuth fallback:', error.message)

                // Fall back to OAuth if www.reddit.com fails and auth is available
                if (auth && auth !== 'none') {
                    return lookupItemsByUser('me', after, sort, timeSpan, monitor_quarantined, auth)
                } else {
                    console.log('No OAuth auth available for fallback')
                    flagIfRateLimited(error)
                    throw error
                }
            })
    })
}

export const handleFetchErrors = (response: Response) => {
    if (!response.ok) {
        throw Error(response.statusText)
    }
    return response.json()
}

const getRedditData = (data: any) => {
    if (!data || !data.data || !data.data.children) {
        throw Error('reddit data is not defined')
    }
    return data.data.children
}

export const getRedditToken = (data: any) => {
    if (!data || !data.access_token) {
        throw Error('access token is not defined')
    }
    return data.access_token
}

export const getAuth = () => {
    return getOptions((users: string[], others: string[], options: Record<string, any>) => {
        const use_this_clientID = options.custom_clientid
        if (!use_this_clientID || use_this_clientID === 'testing') {
            return NO_AUTH
        }
        const tokenInit = {
            headers: {
                Authorization: `Basic ${btoa(`${use_this_clientID}:`)}`,
                'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
            },
            method: 'POST',
            body: `grant_type=${encodeURIComponent('https://oauth.reddit.com/grants/installed_client')}&device_id=DO_NOT_TRACK_THIS_DEVICE`,
        }

        return fetch('https://www.reddit.com/api/v1/access_token', tokenInit)
            .then(handleFetchErrors)
            .then(getRedditToken)
            .then(token => ({
                headers: {
                    Authorization: `bearer ${token}`,
                    'Accept-Language': 'en',
                },
            }))
            .catch(console.log)
    })
}

// code: https://github.com/toolbox-team/reddit-moderator-toolbox/blob/434ec0bb71ebba2fcf0cb5e4cad529035a1ae742/extension/data/background/handlers/webrequest.js#L34
// discussion: https://www.reddit.com/r/redditdev/comments/5jf4yg/api_new_modmail/dbfnw98/
export const getLocalAuth = () => {
    return fetch('https://mod.reddit.com/mail/all').then(_result => {
        getCookie({ url: 'https://mod.reddit.com', name: 'token' }).then(cookie => {
            if (cookie) {
                // remove invalid chars at the end per discussion
                const invalidChar = new RegExp('[^A-Za-z0-9+/].*?$')
                const base64Cookie = cookie.value.replace(invalidChar, '')
                const tokenData = atob(base64Cookie)
                const tokens = JSON.parse(tokenData)
                if ('accessToken' in tokens && tokens.accessToken) {
                    const auth = {
                        headers: {
                            Authorization: `bearer ${tokens.accessToken}`,
                            'Accept-Language': 'en',
                        },
                    }
                    return auth
                } else {
                    return null
                }
            } else {
                return null
            }
        })
    })
}

export const getCookie = ({ url, name }: { url: string; name: string }) => {
    if (location.protocol.match(/^http/)) {
        return browser.runtime
            .sendMessage({
                action: 'get-cookie',
                options: { url, name },
            })
            .then((response: any) => {
                return response.cookie
            })
            .catch(() => null)
    } else {
        return browser.cookies.get({ url, name })
    }
}

export const getLocalOrAppAuth = () => {
    return getLocalAuth()
        .then((auth: any) => {
            if (auth) return auth
            return getAuth()
        })
        .catch(console.log)
}

// --- Logged-in-user detection ---
// Tri-state so callers can tell "definitely logged out" from "couldn't
// determine" (challenge page, 429, network failure). The old boolean-null shape
// collapsed both into null, and monitoring silently skipped every cycle when a
// client's /api/me.json was WAF-challenged — zero detections, no visible error.
export interface LoginDetectResult {
    user: string | null
    // True when no probe produced a definite answer. Monitoring treats this as
    // "detection channel broken" (badge after a streak, grace mode), never as
    // "logged out".
    indeterminate: boolean
    reason?: string
}

// Retry-with-solution when me.json serves the string-doubling challenge, same
// solver as the absent-verification path. Remote-gated (MECHANISM_ME_CHALLENGE)
// with the usual dev override (highest priority):
//   chrome.storage.local.set({ dev_disable_me_challenge_solve: true })  // or false
//   chrome.storage.local.remove('dev_disable_me_challenge_solve')       // defaults
export const DEV_DISABLE_ME_CHALLENGE_KEY = 'dev_disable_me_challenge_solve'
const isMeChallengeSolveDisabled = (): Promise<boolean> =>
    browser.storage.local
        .get({ [DEV_DISABLE_ME_CHALLENGE_KEY]: null })
        .then(async (r: any) => {
            const dev = r[DEV_DISABLE_ME_CHALLENGE_KEY]
            const remote = await getRemoteMechanism(MECHANISM_ME_CHALLENGE)
            return resolveMechanismDisabled(dev === null ? null : !!dev, remote, false)
        })
        .catch(() => false)

type MeProbe =
    | { state: 'user'; user: string }
    | { state: 'loggedOut' }
    | { state: 'indeterminate'; reason: string; html?: string }

// One fetch of an /api/me.json URL, classified. Logged-out is only concluded
// from a clean 2xx JSON body without a username; every other shape (non-2xx,
// HTML/challenge, network error) is indeterminate.
const probeMeJson = async (url: string): Promise<MeProbe> => {
    let response: Response
    try {
        response = await fetch(url, { credentials: 'include', cache: 'reload' })
    } catch (err: any) {
        return { state: 'indeterminate', reason: `network error: ${String(err?.message || err)}` }
    }
    if (!response.ok) {
        return { state: 'indeterminate', reason: `status ${response.status}` }
    }
    let text: string
    try {
        text = await response.text()
    } catch (err: any) {
        return { state: 'indeterminate', reason: `body read failed: ${String(err?.message || err)}` }
    }
    try {
        const data = JSON.parse(text)
        const name = data?.data?.name
        return name ? { state: 'user', user: String(name) } : { state: 'loggedOut' }
    } catch {
        return { state: 'indeterminate', reason: 'non-JSON response (challenge or HTML page)', html: text }
    }
}

const probeMeJsonWithChallengeRetry = async (host: string): Promise<MeProbe> => {
    const targetUrl = `https://${host}/api/me.json`
    let probe = await probeMeJson(targetUrl)
    if (probe.state === 'indeterminate' && probe.html && !(await isMeChallengeSolveDisabled())) {
        const solutionUrl = solveChallenge(probe.html, targetUrl)
        if (solutionUrl) {
            dlog('auth', `[reveddit] me.json challenge detected on ${host} — retrying with solution`)
            probe = await probeMeJson(solutionUrl)
        }
    }
    if (probe.state === 'indeterminate') {
        // Keep the historical line shape: a challenge/HTML response is otherwise
        // indistinguishable from "not logged in" when debugging connect issues.
        dlog('auth', `getLoggedinUser direct fetch failed (${targetUrl}): ${probe.reason}`)
    }
    return probe
}

export const getLoggedinUserDetailed = async (): Promise<LoginDetectResult> => {
    const isContentContext = typeof chrome === 'undefined' || !chrome.tabs || typeof chrome.tabs.query !== 'function'
    // In a content script, chrome.tabs.query is not available. Use the current
    // page's host (same-origin fetch; verified to never receive the challenge).
    if (isContentContext && typeof window !== 'undefined' && window.location && window.location.hostname) {
        const probe = await probeMeJson(`https://${window.location.hostname}/api/me.json`)
        if (probe.state === 'user') {
            return { user: probe.user, indeterminate: false }
        }
        return {
            user: null,
            indeterminate: probe.state === 'indeterminate',
            reason: probe.state === 'indeterminate' ? probe.reason : undefined,
        }
    }

    // Reddit answers a browser with no login with a refusal, not a clean
    // "nobody", so with none there's nothing to ask it. A login the browser
    // lost is put back first.
    if (!(await hasRedditLoginCookie())) {
        await rehydrateStoredRedditCookies()
        if (!(await hasRedditLoginCookie())) {
            return { user: null, indeterminate: false }
        }
    }

    // Pick a host: prefer old.reddit.com if an old.reddit tab is open (quarantine
    // opt-in lives there), otherwise default to www.reddit.com. With `cookies`
    // permission + reddit host_permissions the browser includes the user's real
    // session cookies even with no tab open.
    const pickHost = (): Promise<string> =>
        new Promise(hostResolve => {
            try {
                chrome.tabs.query({ url: ['*://old.reddit.com/*'] }, tabs => {
                    hostResolve(tabs && tabs.length > 0 ? 'old.reddit.com' : 'www.reddit.com')
                })
            } catch {
                hostResolve('www.reddit.com')
            }
        })

    const primaryHost = await pickHost()

    let probe = await probeMeJsonWithChallengeRetry(primaryHost)
    if (probe.state === 'user') {
        return { user: probe.user, indeterminate: false }
    }
    let sawLoggedOut = probe.state === 'loggedOut'
    let lastReason: string | undefined = probe.state === 'indeterminate' ? probe.reason : undefined

    if (probe.state === 'indeterminate') {
        // Challenge/throttle flags are often per-host — a definite answer from
        // the other host is just as authoritative.
        const fallbackHost = primaryHost === 'www.reddit.com' ? 'old.reddit.com' : 'www.reddit.com'
        probe = await probeMeJsonWithChallengeRetry(fallbackHost)
        if (probe.state === 'user') {
            return { user: probe.user, indeterminate: false }
        }
        sawLoggedOut = sawLoggedOut || probe.state === 'loggedOut'
        lastReason = probe.state === 'indeterminate' ? probe.reason : lastReason
    }

    // Last resort (pre-existing behavior): rehydrate any previously-stored
    // cookies and retry the primary host once.
    if (!sawLoggedOut) {
        const rehydrated = await rehydrateStoredRedditCookies()
        if (rehydrated) {
            probe = await probeMeJsonWithChallengeRetry(primaryHost)
            if (probe.state === 'user') {
                return { user: probe.user, indeterminate: false }
            }
            if (probe.state === 'indeterminate') {
                dlog('auth', 'Failed to authenticate with stored cookies')
                lastReason = probe.reason
            }
            sawLoggedOut = sawLoggedOut || probe.state === 'loggedOut'
        }
    }

    if (sawLoggedOut) {
        return { user: null, indeterminate: false }
    }
    return { user: null, indeterminate: true, reason: lastReason || 'unknown' }
}

// Back-compat shape for callers that only care about the username (content
// scripts, popup reconnect, startup): resolves the username or null, never rejects.
export const getLoggedinUser = (): Promise<string | null> => getLoggedinUserDetailed().then(r => r.user)

// Who the browser is signed in to reddit as, for the second account's sign-in
// (viewer.ts): it rejects when reddit gave no clean answer, which isn't the
// same as nobody being signed in
export const whoIsSignedIn = (): Promise<string | null> =>
    getLoggedinUserDetailed().then(detail => {
        if (detail.indeterminate) {
            throw new Error(`reddit didn't say who's signed in (${detail.reason})`)
        }
        return detail.user
    })

// Store Reddit cookies for later use when no tabs are open. Not while a second
// account signs in (viewer.ts): the browser holds that account's cookies then,
// which must never be saved as the user's.
export const storeRedditCookies = (): Promise<unknown> =>
    isViewerConnecting().then(connecting => (connecting ? false : storeRedditCookiesNow()))
const storeRedditCookiesNow = () => {
    return new Promise(resolve => {
        // Only run this in background script context, not in content scripts
        if (typeof chrome === 'undefined' || !chrome.tabs || !chrome.cookies) {
            console.log('storeRedditCookies: Not available in this context (content script)')
            resolve(false)
            return
        }

        chrome.tabs.query({ url: ['*://*.reddit.com/*'] }, tabs => {
            const supportedTabs = tabs.filter(tab => {
                try {
                    const hostname = new URL(tab.url!).hostname
                    return hostname === 'www.reddit.com' || hostname === 'old.reddit.com'
                } catch {
                    return false
                }
            })

            if (supportedTabs.length > 0) {
                const tab = supportedTabs[0]
                try {
                    new URL(tab.url!)
                } catch {
                    console.log('storeRedditCookies: invalid tab url', tab && tab.url)
                    resolve(false)
                    return
                }

                // Get cookies for the Reddit parent domain so we include domain-scoped and host-only cookies
                chrome.cookies.getAll({ domain: 'reddit.com' }, cookies => {
                    const cookieMap: Record<string, string> = {}
                    const cookieObjects: StoredCookie[] = []
                    const repaired: StoredCookie[] = []
                    ;(cookies || [])
                        .filter(c => !isOldDomainCopy(c))
                        .forEach(cookie => {
                            // Save a simple map for backwards compatibility
                            cookieMap[cookie.name] = cookie.value
                            // Save each cookie as it was, expiry and host-only flag
                            // included, for rehydration. A login left session-only
                            // gets the expiry its JWT carries, in the browser too
                            // while that's still ahead.
                            const stored = toStoredCookie(cookie)
                            const saved = withLoginExpiry(stored)
                            if (saved !== stored && !isExpired(saved)) {
                                repaired.push(saved)
                            }
                            cookieObjects.push(saved)
                        })

                    if (cookieObjects.length > 0) {
                        repairLogins(repaired).then(() =>
                            chrome.storage.local.set(
                                {
                                    stored_reddit_cookies: cookieMap,
                                    stored_reddit_cookie_objects: cookieObjects,
                                    stored_reddit_domain: 'reddit.com',
                                },
                                () => {
                                    resolve(true)
                                },
                            ),
                        )
                    } else {
                        resolve(false)
                    }
                })
            } else {
                resolve(false)
            }
        })
    })
}

// Puts logins back with the expiry their JWT carries (storeRedditCookiesNow).
// Each login once per worker: the store runs that start together, and those
// its own writes set off, would each repeat it, and against anything that
// keeps the cookie session-only they'd never stop. Not once a second account's
// sign-in has started, which owns the jar.
const repairedLogins = new Set<string>()
const repairLogins = async (logins: StoredCookie[]) => {
    const todo = logins.filter(c => !repairedLogins.has(c.value))
    todo.forEach(c => repairedLogins.add(c.value))
    if (!todo.length || (await isViewerConnecting())) {
        todo.forEach(c => repairedLogins.delete(c.value))
        return
    }
    await restoreCookies(todo)
}

// Retrieve stored Reddit cookies
export const getStoredRedditCookies = () => {
    return new Promise(resolve => {
        chrome.storage.local.get(['stored_reddit_cookies', 'stored_reddit_domain'], result => {
            if (result.stored_reddit_cookies) {
                resolve(result.stored_reddit_cookies)
            } else {
                resolve(null)
            }
        })
    })
}

// Rehydrate stored cookies back into the browser's cookie jar for reddit.com:
// only those the browser no longer holds. One it holds is as new or newer
// (reddit refreshes them), and may be another account's the user switched to.
// Not while a second account signs in (viewer.ts), which owns the jar then.
// Resolves whether it put any back.
export const rehydrateStoredRedditCookies = (): Promise<unknown> =>
    isViewerConnecting().then(connecting => (connecting ? false : rehydrateStoredRedditCookiesNow()))
// Saved before 0.0.5.30: cookies.set details, with no expiry or host-only flag
const fromSnapshot = (c: any): StoredCookie =>
    withLoginExpiry(
        typeof c.hostOnly === 'boolean' ? c : { ...toStoredCookie(c), hostOnly: !String(c.domain).startsWith('.') },
    )
const rehydrateStoredRedditCookiesNow = () => {
    return new Promise(resolve => {
        chrome.storage.local.get(['stored_reddit_cookie_objects'], result => {
            const cookieObjects = result.stored_reddit_cookie_objects
            if (!Array.isArray(cookieObjects) || !cookieObjects.length) {
                resolve(false)
                return
            }
            browser.cookies
                .getAll({ domain: 'reddit.com' })
                .then(async jar => {
                    const held = new Set(jar.map(c => `${c.domain}|${c.path}|${c.name}`))
                    const missing = cookieObjects
                        .filter(c => c && typeof c.name === 'string' && typeof c.domain === 'string')
                        .map(fromSnapshot)
                        .filter(
                            c =>
                                !isOldDomainCopy(c) &&
                                !isExpired(c) &&
                                !held.has(`${c.domain}|${c.path || '/'}|${c.name}`),
                        )
                    // A sign-in that started since owns the jar
                    if (!missing.length || (await isViewerConnecting())) {
                        return false
                    }
                    await restoreCookies(missing)
                    return true
                })
                .then(resolve, () => resolve(false))
        })
    })
}
