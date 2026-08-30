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
// the content script (Firefox, which has no externally_connectable).
//
// The user's own monitoring always comes first:
// 1. Bridge requests fail fast — never queue — while a monitoring cycle is in
//    flight or the shared 429 backoff (storage.ts) is active. The page falls
//    back to its own JSONP, which spends the page's budget, not ours.
// 2. Requests serialize through one lane with spacing, and a rolling window
//    caps volume; the cap halves for an hour after any 429, mirroring
//    computeAbsentVerifyBudget.
// 3. A bridge 429 enters the same shared backoff via flagIfRateLimited: a hot
//    IP affects monitoring no matter who heated it, and the next cycle should
//    know.
//
// Fetches MUST keep credentials:'omit': rehydrateStoredRedditCookies() can put
// the user's real session in the browser jar, and sending it would turn this
// public view into the authenticated view (see fetchWwwHtml_viaBackground).

import { getRateLimitBackoffRemainingMs, getMsSinceLastRateLimitHit } from './storage'
import { flagIfRateLimited, RECENT_RATE_LIMIT_WINDOW_MS } from './requests'
import { isCycleInFlight } from './monitoring'
import { dlog } from './diaglog'

const www_reddit = 'https://www.reddit.com'

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
    /^\/user\/[\w-]{1,30}\/(comments|submitted|overview|gilded)\.json$/,
    /^\/user\/[\w-]{1,30}\/about\.json$/,
    /^\/user\/[\w-]{1,30}\/moderated_subreddits\.json$/,
]

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
    u.pathname = path
    u.searchParams.delete('jsonp')
    return www_reddit + u.pathname + u.search
}

const BRIDGE_WINDOW_MS = 10 * 60 * 1000
const BRIDGE_MAX_PER_WINDOW = 100
const BRIDGE_SPACING_MS = 300

export const computeBridgeBudget = (msSinceLastRateLimitHit: number | null): number =>
    msSinceLastRateLimitHit !== null && msSinceLastRateLimitHit < RECENT_RATE_LIMIT_WINDOW_MS
        ? Math.floor(BRIDGE_MAX_PER_WINDOW / 2)
        : BRIDGE_MAX_PER_WINDOW

let recentTimes: number[] = []
// single-lane serialization with spacing between fetches
let lane: Promise<void> = Promise.resolve()

export interface BridgeResponse {
    ok: boolean
    status: number
    data?: any
    error?: string
    retryAfterMs?: number
}

export const handleBridgeFetch = async (request: any): Promise<BridgeResponse> => {
    const url = validateBridgeUrl(request?.url)
    if (!url) {
        return { ok: false, status: 0, error: 'invalid url' }
    }
    const backoffMs = await getRateLimitBackoffRemainingMs()
    if (backoffMs > 0) {
        dlog('bridge', `[reveddit] bridge: refusing during rate-limit backoff (${Math.ceil(backoffMs / 1000)}s left)`)
        return { ok: false, status: 0, error: 'rate_limited', retryAfterMs: backoffMs }
    }
    if (isCycleInFlight()) {
        return { ok: false, status: 0, error: 'busy', retryAfterMs: 15000 }
    }
    const now = Date.now()
    recentTimes = recentTimes.filter(t => now - t < BRIDGE_WINDOW_MS)
    const budget = computeBridgeBudget(await getMsSinceLastRateLimitHit())
    if (recentTimes.length >= budget) {
        dlog('bridge', `[reveddit] bridge: window budget exhausted (${budget}/${BRIDGE_WINDOW_MS / 60000}min)`)
        return { ok: false, status: 0, error: 'budget_exhausted', retryAfterMs: 60 * 1000 }
    }
    recentTimes.push(now)
    const run = lane.then(async (): Promise<BridgeResponse> => {
        const r = await fetch(url, { credentials: 'omit', headers: { 'Accept-Language': 'en' } })
        const data = r.ok ? await r.json() : null
        if (!r.ok) {
            dlog('bridge', `[reveddit] bridge: ${url.split('?')[0]} -> ${r.status}`)
            // a bridge 429 must enter the shared backoff; monitoring's next
            // cycle needs to know the IP is hot (message shape matters, see
            // flagIfRateLimited)
            flagIfRateLimited(new Error(`www.reddit.com request failed: ${r.status}`))
        }
        return { ok: r.ok, status: r.status, data }
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
