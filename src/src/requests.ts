import {
    getOptions,
    addToPendingPostQueue,
    removeMultipleFromPendingPostQueue,
    recordRateLimitHit,
    clearRateLimitBackoff,
    getMsSinceLastRateLimitHit,
} from './storage'
import browser from 'webextension-polyfill'
import { dlog } from './diaglog'
import { getItemsById_fromOldHTML, getPost_fromOld } from './parse_html/old'
import {
    getPublicProfileItems,
    fullnameValue,
    FetchHtml,
    buildPostPageUrl,
    classifyPostPage,
    PostPageStatus,
    buildCommentPageUrl,
    classifyCommentPage,
    solveChallenge,
    describePageForDiag,
} from './parse_html/new'
import { newReddit } from './parse_html/common'
import { setWarningBadge, isRemovedComment } from './common'
import {
    getRemoteMechanism,
    resolveMechanismDisabled,
    MECHANISM_LEGACY,
    MECHANISM_ABSENT_VERIFICATION,
    MECHANISM_ME_CHALLENGE,
} from './news'

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

const RATE_LIMIT_STATUSES = new Set([403, 429])
const flagIfRateLimited = (err: Error) => {
    const m = err.message.match(/request failed: (\d+)/)
    if (!m) return
    const status = Number(m[1])
    if (RATE_LIMIT_STATUSES.has(status)) {
        setWarningBadge('rate_limited')
    }
    // Only a real 429 means rate-limited. A 403 is Reddit's structural block on
    // unauthenticated JSON requests (it happens every cycle now), so it must NOT
    // trigger backoff — otherwise the alarm would needlessly pause monitoring.
    if (status === 429) {
        dlog('ratelimit', '[reveddit] 429 from Reddit — scheduling monitoring backoff')
        recordRateLimitHit()
    }
}

const clientID = 'SEw1uvRd6kxFEw'
const oauth_reddit = 'https://oauth.reddit.com/'
const www_reddit = 'https://www.reddit.com/'
const OAUTH_REVEDDIT = 'https://cred2.reveddit.com/'
const WWW_REVEDDIT = 'https://wred.reveddit.com/'

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
    // feed-absence removal (invisibleToPublicView). Used to skip verification.
    quarantine?: boolean
    over_18?: boolean
    subreddit_type?: string
    // Already recorded as removed in extension storage. Removed posts can linger
    // in the public feed well past creation age (verified live: a 3.5-week-old
    // post, removed a day earlier, still listed), so feed presence must never
    // flip a recorded removal back to approved without a page verdict.
    known_removed?: boolean
}
export type AuthItemsMeta = Record<string, AuthItemMeta>

export const lookupItemsByID = (
    ids: string | string[],
    auth: any,
    monitor_quarantined = false,
    monitor_quarantined_remote = false,
    quarantined_subreddits: string[] = [],
    username = '',
    authItemsMeta: AuthItemsMeta = {},
) => {
    const params: Record<string, any> = { id: ids, raw_json: 1 }
    if (monitor_quarantined_remote) {
        params.quarantined_subreddits = quarantined_subreddits.join(',')
    }
    const search =
        '?' +
        Object.keys(params)
            .map(k => `${k}=${params[k]}`)
            .join('&')

    return lookupItemsByID_withFallback(
        'api/info',
        search,
        auth,
        monitor_quarantined,
        monitor_quarantined_remote,
        ids,
        username,
        authItemsMeta,
    )
}

// The public fetch MUST omit credentials: rehydrateStoredRedditCookies() can put
// the user's real session in the browser jar, and sending it would turn this
// "public" view into the authenticated view — removals would never be detected.
const fetchWwwHtml_viaBackground: FetchHtml = async (url: string) => {
    const response = await fetch(url, { credentials: 'omit', headers: { 'Accept-Language': 'en' } })
    if (!response.ok) {
        throw new Error(`www.reddit.com request failed: ${response.status}`)
    }
    return response.text()
}

// Fallback for a tab whose content script is orphaned (every extension update
// or reinstall severs content scripts in already-open tabs — issue #14's log
// showed "Receiving end does not exist" on each cycle): inject the fetch with
// scripting.executeScript instead. It runs same-origin inside the tab, so it
// keeps the challenge-free property the content-script path has. The injected
// function must be self-contained and must never reject — a rejected promise
// doesn't surface as an error consistently across browsers — so failures come
// back as a tagged object.
export const _fetchViaExecuteScript = async (tabId: number, url: string): Promise<string> => {
    const scripting = (browser as any).scripting || (typeof chrome !== 'undefined' && (chrome as any).scripting)
    if (!scripting) {
        throw new Error('scripting API unavailable')
    }
    const results = (await scripting.executeScript({
        target: { tabId },
        func: async (u: string) => {
            try {
                const resp = await fetch(u, { credentials: 'omit', headers: { 'Accept-Language': 'en' } })
                return { ok: resp.ok, status: resp.status, text: resp.ok ? await resp.text() : '' }
            } catch (e) {
                return { ok: false, status: 0, text: '', err: String(e) }
            }
        },
        args: [url],
    })) as any[]
    const value = results && results[0] && results[0].result
    if (!value || typeof value.text !== 'string') {
        throw new Error('executeScript fetch returned no result')
    }
    if (!value.ok) {
        // Same message shape as fetchWwwHtml_viaBackground so flagIfRateLimited
        // still recognizes 429s arriving through this path.
        throw new Error(`www.reddit.com request failed: ${value.status}${value.err ? ` (${value.err})` : ''}`)
    }
    return value.text
}

// Prefer fetching through a www.reddit.com tab's content script: a same-origin
// fetch there is verified to never receive Reddit's JS challenge. old.reddit.com
// and sh.reddit.com tabs cannot help — content scripts follow the page's origin
// rules, so cross-origin reads to www.reddit.com are CORS-blocked from them.
// Without a www tab, the background fetch works via host_permissions (bypasses
// CORS) but may hit the challenge; parse_html/new.ts carries a best-effort solver.
export const getWwwHtmlFetcher = async (): Promise<{ fetchHtml: FetchHtml; viaTab: boolean }> => {
    let tabs: any[] = []
    try {
        if (typeof chrome !== 'undefined' && chrome.tabs) {
            tabs = await browser.tabs.query({ url: ['https://www.reddit.com/*'] })
        }
    } catch {
        /* no tabs API in this context */
    }
    // A discarded tab can't answer messages or run injected scripts.
    const tab = tabs.find(t => t.id != null && !t.discarded) || tabs.find(t => t.id != null)
    if (!tab) {
        return { fetchHtml: fetchWwwHtml_viaBackground, viaTab: false }
    }
    let contentScriptAlive = true
    let injectionUsable = true
    const fetchHtml: FetchHtml = async (url: string) => {
        if (contentScriptAlive) {
            try {
                const response = (await browser.tabs.sendMessage(tab.id, {
                    action: 'fetch-www-profile-public',
                    url,
                })) as any
                if (response && response.success && typeof response.html === 'string') {
                    return response.html
                }
                throw new Error(response?.error || 'content-script www fetch failed')
            } catch (err: any) {
                // The tab may predate the extension install/update (orphaned
                // content script); stop retrying it this cycle. Logged because
                // this transition decides which fetch leg produced every page
                // this cycle — without it, "tab open but still unknown" can't
                // distinguish a dead tab leg from Reddit serving the tab's
                // same-origin fetches unreadable pages (issue #14, 2nd paste).
                contentScriptAlive = false
                dlog(
                    'feed',
                    '[reveddit] content-script www fetch failed, trying next fetch mode:',
                    String(err?.message || err),
                )
            }
        }
        if (injectionUsable) {
            try {
                return await _fetchViaExecuteScript(tab.id, url)
            } catch (err: any) {
                // An HTTP failure from inside the tab is a real outcome (the
                // background fetch would fare no better) — let callers see it.
                if (/request failed: \d/.test(String(err?.message))) {
                    throw err
                }
                // Injection itself unavailable (tab closed/navigated mid-cycle,
                // API missing): stop trying it this cycle.
                injectionUsable = false
                dlog(
                    'feed',
                    '[reveddit] executeScript fetch unavailable, using background fetch:',
                    String(err?.message || err),
                )
            }
        }
        return fetchWwwHtml_viaBackground(url)
    }
    return { fetchHtml, viaTab: true }
}

export const PROFILE_PUBLICLY_EMPTY = 'profile_publicly_empty'
const WWW_DETECT_FAILURES_KEY = 'www_detect_consecutive_failures'
const WWW_DETECT_FAILURE_WARN_THRESHOLD = 5

// Feed presence is not a liveness signal for POSTS: held ("awaiting moderator
// approval") and spam-removed posts linger in the author's public feed for a
// grace period (verified live — same anomaly as is_robot_indexable staying true
// for the author for ~24h). Young feed-present posts are verified against their
// own logged-out page, where the true status shows. Verdicts are cached so each
// young post costs one page fetch per TTL, not per cycle.
const POST_FEED_GRACE_SECONDS = 48 * 3600
const POST_VERDICT_CACHE_KEY = 'www_post_page_verdicts'
const POST_VERDICT_TTL_MS = 2 * 3600 * 1000
const POST_VERDICT_CACHE_MAX = 50

interface PostVerdictEntry {
    v: PostPageStatus
    t: number // epoch ms of verification
}

const verifyFeedPresentPosts = async (
    ids: string[],
    presentIds: Set<string>,
    authItemsMeta: AuthItemsMeta,
    fetchHtml: FetchHtml,
    viaTab: boolean,
): Promise<Record<string, PostPageStatus>> => {
    // Post pages reliably 200 with real HTML only via a content-script tab; the
    // background gets the JS challenge (unsolvable without leaking auth cookies).
    // Without a tab, skip per-post verification and lean on the authenticated
    // removal signal + feed presence instead of hammering the challenge.
    if (!viaTab) {
        return {}
    }
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
        if (isMature && (!cached || cached.v === 'live') && !m?.known_removed) {
            continue
        }
        if (cached && nowMs - cached.t < POST_VERDICT_TTL_MS) {
            verdicts[id] = cached.v
            continue
        }
        toFetch.push(id)
    }
    if (toFetch.length) {
        await Promise.all(
            toFetch.map(async id => {
                try {
                    const html = await fetchHtml(buildPostPageUrl(id))
                    const page = classifyPostPage(html)
                    verdicts[id] = page.status
                    console.log(`[reveddit] post page verdict ${id}: ${page.status} (html ${html.length}b)`)
                    if (page.status !== 'unknown') {
                        cache[id] = { v: page.status, t: nowMs }
                    }
                } catch (err: any) {
                    console.log(`[reveddit] post page fetch failed ${id}:`, String(err?.message || err))
                    verdicts[id] = 'unknown'
                }
            }),
        )
        // Prune oldest entries and persist
        const entries = Object.entries(cache).sort((a, b) => b[1].t - a[1].t)
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

const recordAbsentVerifyOutcome = async (ok: boolean) => {
    try {
        if (ok) {
            await browser.storage.local.remove(ABSENT_VERIFY_FAILURES_KEY)
            return
        }
        const stored = (await browser.storage.local.get({ [ABSENT_VERIFY_FAILURES_KEY]: 0 })) as any
        const failures = Number(stored[ABSENT_VERIFY_FAILURES_KEY] || 0) + 1
        await browser.storage.local.set({ [ABSENT_VERIFY_FAILURES_KEY]: failures })
        dlog('verify', `[reveddit] absent verification resolved nothing — consecutive cycles: ${failures}`)
        if (failures >= ABSENT_VERIFY_FAILURE_WARN_THRESHOLD) {
            setWarningBadge(ABSENT_VERIFY_UNAVAILABLE)
        }
    } catch {
        /* ignored */
    }
}

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

const fetchAndClassifyAbsentItem = async (
    id: string,
    meta: AuthItemMeta,
    fetchHtml: FetchHtml,
): Promise<PostPageStatus> => {
    let url: string
    if (id.startsWith('t3_')) {
        url = buildPostPageUrl(id)
    } else if (meta.permalink) {
        url = newReddit + meta.permalink
    } else if (meta.link_id) {
        url = buildCommentPageUrl(id, meta.link_id)
    } else {
        return 'unknown'
    }
    const classify = (html: string): PostPageStatus =>
        id.startsWith('t3_') ? classifyPostPage(html).status : classifyCommentPage(html, id)
    let html = await fetchHtml(url)
    let verdict = classify(html)
    if (verdict === 'unknown') {
        const firstPage = describePageForDiag(html)
        const solutionUrl = solveChallenge(html, url)
        if (solutionUrl) {
            html = await fetchHtml(solutionUrl)
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
): Promise<void> => {
    const unresolved = ids.filter(id => !(id in verdicts))
    if (!unresolved.length || (await isLegacyDisabled())) {
        return
    }
    const commentIds = unresolved.filter(id => id.startsWith('t1_'))
    const postIds = unresolved.filter(id => id.startsWith('t3_'))
    if (commentIds.length) {
        try {
            // old.reddit /api/info HTML DROPS removed comments instead of
            // rendering [removed] markers (verified live), so absence is the
            // removal signal — but only when the response is provably healthy.
            // Feed-present comments are live by definition; batching a few in as
            // canaries proves the endpoint returned real things this cycle.
            const batch = [...commentIds, ...canaryCommentIds]
            const results = (await _legacyLookups.commentsById(batch, null)) as any[]
            const byName: Record<string, any> = {}
            for (const wrap of results || []) {
                if (wrap?.data?.name) {
                    byName[wrap.data.name] = wrap.data
                }
            }
            const canaryRendered = canaryCommentIds.some(id => byName[id])
            // The "healthy call, zero items" case was invisible in issue #14's
            // log — it must be distinguishable from "tiebreak resolved things".
            dlog(
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
            const page = (await _legacyLookups.postByPath('/comments/' + id.substring(3) + '/')) as any
            if (page && !page.error) {
                record(id, page.is_removed ? 'removed' : 'live')
            } else {
                dlog('legacy', `[reveddit] legacy post tiebreak ${id}: no page${page?.error ? ` (${page.error})` : ''}`)
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
        if (cached) {
            const ttl =
                cached.v === 'live'
                    ? ABSENT_VERDICT_LIVE_TTL_MS
                    : cached.v === 'removed'
                      ? ABSENT_VERDICT_ADVERSE_TTL_MS
                      : ABSENT_VERDICT_UNKNOWN_TTL_MS
            if (nowMs - cached.t < ttl) {
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
            const verdict = await fetchAndClassifyAbsentItem(id, authItemsMeta[id] || {}, fetchHtml)
            dlog('verify', `[reveddit] absent item verdict ${id}: ${verdict}`)
            cache[id] = { v: verdict, t: nowMs }
            if (verdict !== 'unknown') {
                verdicts[id] = verdict
                freshDefinitive++
            }
        } catch (err: any) {
            dlog('verify', `[reveddit] absent item verification failed ${id}:`, String(err?.message || err))
            // A 429 here must enter the shared backoff: without this, a
            // rate-limited client burns the whole verification budget every
            // cycle producing silent unknowns (no alert, no Paused banner).
            flagIfRateLimited(err)
        }
    }
    let cacheMutated = fetched > 0
    await legacyTiebreakAbsent(ids, canaryCommentIds, verdicts, (id, v) => {
        verdicts[id] = v
        cache[id] = { v, t: nowMs }
        cacheMutated = true
        freshDefinitive++
    })
    if (fetched > 0 || recentUnknownSkipped > 0) {
        dlog(
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

// Consecutive-failure tracking for the logged-in detection path, mirroring
// recordWwwDetectOutcome below: one indeterminate probe is noise, a streak
// means the extension is blind and the user should see a badge instead of
// silently getting zero detections. Definite outcomes (a username, or a clean
// logged-out response) reset the streak. Only the monitoring cycle records
// outcomes — content-script probes have different fetch conditions.
export const LOGGED_IN_VIEW_UNAVAILABLE = 'logged_in_view_unavailable'
const LOGIN_DETECT_FAILURES_KEY = 'login_detect_consecutive_failures'
const LOGIN_DETECT_FAILURE_WARN_THRESHOLD = 5

export const recordLoginDetectOutcome = async (indeterminate: boolean) => {
    try {
        if (!indeterminate) {
            await browser.storage.local.remove(LOGIN_DETECT_FAILURES_KEY)
            return
        }
        const stored = (await browser.storage.local.get({ [LOGIN_DETECT_FAILURES_KEY]: 0 })) as any
        const failures = Number(stored[LOGIN_DETECT_FAILURES_KEY] || 0) + 1
        await browser.storage.local.set({ [LOGIN_DETECT_FAILURES_KEY]: failures })
        dlog('auth', `[reveddit] login detection indeterminate — consecutive failures: ${failures}`)
        if (failures >= LOGIN_DETECT_FAILURE_WARN_THRESHOLD) {
            setWarningBadge(LOGGED_IN_VIEW_UNAVAILABLE)
        }
    } catch {
        /* ignored */
    }
}

// Track consecutive failures of the www public-view path. One failure is noise
// (deploys, blips); persistent failure means the detection path is broken and
// the user should know — without it they'd assume monitoring still works.
const recordWwwDetectOutcome = async (ok: boolean) => {
    try {
        if (ok) {
            await browser.storage.local.remove(WWW_DETECT_FAILURES_KEY)
            return
        }
        const stored = (await browser.storage.local.get({ [WWW_DETECT_FAILURES_KEY]: 0 })) as any
        const failures = Number(stored[WWW_DETECT_FAILURES_KEY] || 0) + 1
        await browser.storage.local.set({ [WWW_DETECT_FAILURES_KEY]: failures })
        dlog('feed', `[reveddit] www public-view lookup failed — consecutive failures: ${failures}`)
        if (failures >= WWW_DETECT_FAILURE_WARN_THRESHOLD) {
            setWarningBadge('public_view_unavailable')
        }
    } catch {
        /* ignored */
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
    const { fetchHtml, viaTab } = await getWwwHtmlFetcher()
    const profile = await getPublicProfileItems(username, fetchHtml, ids)
    if (!profile.valid) {
        await recordWwwDetectOutcome(false)
        throw new Error(`www profile lookup invalid: ${profile.error || 'unrecognized response'}`)
    }
    await recordWwwDetectOutcome(true)
    if (profile.emptyProfile && ids.length) {
        // The whole profile is publicly empty while the authenticated view has
        // items — the shadowban signature. One dedicated warning instead of N
        // removal alerts. Thrown (not returned) so the fallback chain doesn't
        // run the legacy paths, and so monitoring skips this cycle without
        // clearing the warning.
        dlog('feed', `[reveddit] public profile for ${username} is empty - possible shadowban`)
        setWarningBadge(PROFILE_PUBLICLY_EMPTY)
        throw new Error(PROFILE_PUBLICLY_EMPTY)
    }
    const postVerdicts = await verifyFeedPresentPosts(
        ids,
        new Set(profile.items.keys()),
        authItemsMeta,
        fetchHtml,
        viaTab,
    )
    // Feed-absent items within coverage can be profile-hidden rather than
    // removed — verify against their own pages before concluding anything.
    // Skipped: auth-confirmed removals, and publicly-invisible classes whose
    // pages are gated logged-out (monitoring exempts those from removal anyway).
    const absentVerificationDisabled = await isAbsentVerificationDisabled()
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
        if (meta.quarantine || meta.over_18 || meta.subreddit_type === 'private') {
            return false
        }
        const floor = id.startsWith('t3_') ? profile.coverage.t3 : profile.coverage.t1
        const value = fullnameValue(id)
        return Number.isFinite(value) && value >= floor
    })
    const canaryCommentIds = [...profile.items.keys()].filter(id => id.startsWith('t1_')).slice(0, 3)
    const absentVerdicts = absentToVerify.length
        ? await verifyFeedAbsentItems(absentToVerify, authItemsMeta, fetchHtml, canaryCommentIds)
        : {}
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
                    results.push({ data: { ...publicItem, is_robot_indexable: true, ...carried } })
                }
            }
        } else {
            const floor = isPost ? profile.coverage.t3 : profile.coverage.t1
            const value = fullnameValue(id)
            const covered = Number.isFinite(value) && value >= floor
            const publiclyInvisible = meta.quarantine || meta.over_18 || meta.subreddit_type === 'private'
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
                // The auth view already flags it removed — authoritative.
                results.push(syntheticRemoved)
            } else if (covered && publiclyInvisible) {
                // Never publicly visible; same synthetic shape as before — the
                // classification loop reclassifies these as approved
                // (invisibleToPublicView), which also refreshes the body cache.
                results.push(syntheticRemoved)
            } else if (covered) {
                if (absentVerificationDisabled) {
                    // Remote fallback: pre-verification behavior — absence
                    // within coverage counts as removed.
                    results.push(syntheticRemoved)
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
    const removedCount = results.filter(
        r => r.data.author === '[deleted]' || r.data.is_robot_indexable === false,
    ).length
    dlog(
        'feed',
        `[reveddit] www lookup ${username}: ${ids.length} requested, ${results.length} returned ` +
            `(${removedCount} removed, ${ids.length - results.length} omitted/uncovered), ` +
            `coverage t1=${profile.coverage.t1} t3=${profile.coverage.t3}, verdicts=${JSON.stringify(postVerdicts)}, ` +
            // via=tab means a www tab existed at cycle start, not that it served
            // every fetch — the "fetch failed, trying next fetch mode" lines
            // record any mid-cycle handoff.
            `absentVerdicts=${JSON.stringify(absentVerdicts)}, via=${viaTab ? 'tab' : 'background'}`,
    )
    return results
}

// Legacy paths, kept as fallback until Reddit's deprecation lands:
// old.reddit HTML -> www JSON -> OAuth. All unauthenticated-legacy fetches are
// gated by the dev deprecation switch so post-deprecation behavior is testable.
const lookupItemsByID_legacy = (
    path: string,
    search: string,
    auth: any,
    monitor_quarantined: boolean,
    monitor_quarantined_remote: boolean,
    ids: string | string[],
) => {
    return throwIfLegacyDisabled('old.reddit.com HTML')
        .then(() => getItemsById_fromOldHTML(ids, addToPendingPostQueue))
        .then(result => {
            clearRateLimitBackoff()
            return result
        })
        .catch(htmlError => {
            console.log('old.reddit.com HTML fallback failed:', htmlError.message)

            // Second: try www.reddit.com JSON (sometimes works after rate-limit clears)
            const wwwUrl = www_reddit + path + '.json' + search
            const wwwOptions = { credentials: 'omit' as const }

            return throwIfLegacyDisabled('www.reddit.com JSON')
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
                .catch(wwwError => {
                    console.log('www.reddit.com JSON failed:', wwwError.message)

                    // Fall back to OAuth if available
                    if (auth && auth !== 'none') {
                        console.log('Trying OAuth fallback')
                        return fetch_forReddit(
                            ...getFetchParams(path, search, auth, monitor_quarantined_remote),
                            monitor_quarantined,
                        )
                    } else {
                        flagIfRateLimited(wwwError)
                        throw htmlError
                    }
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

const lookupOtherItemsByID_authed = async (ids: string[], auth: any, monitor_quarantined: boolean) => {
    const useOAuth = auth && auth !== NO_AUTH
    if (!useOAuth) {
        // Put the user's harvested session back in the cookie jar so credentials
        // 'include' yields the authenticated view (mirrors lookupItemsByLoggedInUserWithAuth).
        await rehydrateStoredRedditCookies()
    }
    const children: any[] = []
    for (let i = 0; i < ids.length; i += OTHER_APIINFO_CHUNK) {
        const chunk = ids.slice(i, i + OTHER_APIINFO_CHUNK)
        const search = `?id=${chunk.join(',')}&raw_json=1`
        let batch: any
        if (useOAuth) {
            // getFetchParams returns [url, auth] here, so the spread is well-formed.
            batch = await fetch_forReddit(...getFetchParams('api/info', search, auth, false), monitor_quarantined)
        } else {
            const response = await fetch(`${www_reddit}api/info.json${search}`, {
                credentials: 'include',
                cache: 'reload',
                headers: { 'Accept-Language': 'en' },
            })
            if (!response.ok) {
                throw new Error(`authenticated api/info request failed: ${response.status}`)
            }
            const json = await response.json()
            batch = json?.data?.children
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
    return children
}

// Primary: compare against the logged-out www.reddit.com profile (survives the
// deprecation). Falls back to the legacy chain while that still exists.
export const lookupItemsByID_withFallback = (
    path: string,
    search: string,
    auth: any,
    monitor_quarantined = false,
    monitor_quarantined_remote = false,
    ids: string | string[] = '',
    username = '',
    authItemsMeta: AuthItemsMeta = {},
) => {
    const idsArray = (Array.isArray(ids) ? ids : String(ids).split(',')).filter(x => x)
    const legacy = () =>
        lookupItemsByID_legacy(path, search, auth, monitor_quarantined, monitor_quarantined_remote, ids)
    if (!idsArray.length) {
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
                return legacy()
            })
    }
    return lookupItemsByID_fromPublicProfile(idsArray, username, authItemsMeta)
        .then(result => {
            clearRateLimitBackoff()
            return result
        })
        .catch((publicError: Error) => {
            if (publicError.message === PROFILE_PUBLICLY_EMPTY) {
                throw publicError
            }
            console.log('www.reddit.com public profile lookup failed:', publicError.message)
            return legacy()
        })
}

const cookieDetails_redditSession = { name: 'reddit_session', url: 'https://reddit.com' }

const acceptable_setCookieDetails = ['name', 'value', 'domain', 'path', 'secure', 'httpOnly', 'storeId']

const getSettableCookie = (cookie: any, url = 'https://reddit.com') => {
    if (!cookie) {
        return cookie
    }
    const filtered = Object.keys(cookie)
        .filter(key => acceptable_setCookieDetails.includes(key))
        .reduce(
            (obj, key) => {
                return {
                    ...obj,
                    [key]: cookie[key],
                }
            },
            {} as Record<string, any>,
        )
    filtered.url = url
    return filtered
}

//monitor_quarantined -> when true, client sets cookie (used for every look up)
//monitor_quarantined_remote -> when true, remote server sets cookie (used once in awhile)
const fetch_forReddit = async (url: string, options?: any, monitor_quarantined = false) => {
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
    if (!options) {
        options = { credentials: 'omit' }
    }
    options['cache'] = 'reload'
    if (!options.headers) {
        options.headers = {}
    }
    if (options.headers['Accept-Language'] !== 'en') {
        options.headers['Accept-Language'] = 'en'
    }
    const result = fetch(url, options).then(handleFetchErrors).then(getRedditData).catch(console.log)
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
    monitor_quarantined_remote: boolean,
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
    return fetch_forReddit(...getFetchParams(path, search, auth, monitor_quarantined_remote), monitor_quarantined)
}

export const lookupItemsByLoggedInUser = (
    after: string,
    sort: string,
    timeSpan: string,
    monitor_quarantined: boolean,
    monitor_quarantined_remote: boolean,
    auth: any,
) => {
    const params: Record<string, any> = { limit: 100, sort, raw_json: 1 }
    if (after) params.after = after
    if (timeSpan) params.t = timeSpan
    const path = `user/me.json`
    const search =
        '?' +
        Object.keys(params)
            .map(k => `${k}=${params[k]}`)
            .join('&')
    return fetch_forReddit(...getFetchParams(path, search, auth, monitor_quarantined_remote), monitor_quarantined)
}

// Alternative approach: use the same method as getLoggedinUser but with proper authentication
export const lookupItemsByLoggedInUserWithAuth = (
    after: string,
    sort: string,
    timeSpan: string,
    monitor_quarantined: boolean,
    monitor_quarantined_remote: boolean,
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
            .catch(error => {
                console.log('www.reddit.com request failed, trying OAuth fallback:', error.message)

                // Fall back to OAuth if www.reddit.com fails and auth is available
                if (auth && auth !== 'none') {
                    return lookupItemsByUser(
                        'me',
                        after,
                        sort,
                        timeSpan,
                        monitor_quarantined,
                        monitor_quarantined_remote,
                        auth,
                    )
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
    if (data && data.user && data.user.items) {
        // format from cred2.reveddit.com
        return data
    }
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

export const getAuth = (monitor_quarantined_remote = false) => {
    return getOptions((users: string[], others: string[], options: Record<string, any>) => {
        let use_this_clientID = clientID
        if (options.custom_clientid) {
            use_this_clientID = options.custom_clientid
            if (use_this_clientID === 'testing') {
                return NO_AUTH
            }
        } else if (!monitor_quarantined_remote) {
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

const getFetchParams = (
    path: string,
    search: string,
    auth: any,
    monitor_quarantined_remote: boolean,
): [string, any?] => {
    if (!auth || auth === NO_AUTH) {
        let url = (monitor_quarantined_remote ? WWW_REVEDDIT : www_reddit) + path
        if (path === 'api/info') {
            url += '.json'
        }
        url += search
        return [url]
    } else {
        let host = oauth_reddit
        let path_and_search = path + search
        if (monitor_quarantined_remote) {
            host = OAUTH_REVEDDIT
            path_and_search += '&give_it_to_me=1'
        }
        const url = host + path_and_search
        return [url, auth]
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

// Store Reddit cookies for later use when no tabs are open
export const storeRedditCookies = () => {
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
                    const cookieObjects: any[] = []
                    cookies.forEach(cookie => {
                        // Save a simple map for backwards compatibility
                        cookieMap[cookie.name] = cookie.value
                        // Save full settable cookie details for rehydration
                        const host =
                            cookie.domain && cookie.domain.startsWith('.')
                                ? cookie.domain.slice(1)
                                : cookie.domain || 'reddit.com'
                        const url = `https://${host}`
                        cookieObjects.push(getSettableCookie(cookie, url))
                    })

                    if (cookies.length > 0) {
                        chrome.storage.local.set(
                            {
                                stored_reddit_cookies: cookieMap,
                                stored_reddit_cookie_objects: cookieObjects,
                                stored_reddit_domain: 'reddit.com',
                            },
                            () => {
                                resolve(true)
                            },
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

// Rehydrate stored cookies back into the browser's cookie jar for reddit.com
const rehydrateStoredRedditCookies = () => {
    return new Promise(resolve => {
        chrome.storage.local.get(['stored_reddit_cookie_objects'], result => {
            const cookieObjects = result.stored_reddit_cookie_objects
            if (Array.isArray(cookieObjects) && cookieObjects.length) {
                Promise.all(cookieObjects.map(c => browser.cookies.set(c).catch(() => null)))
                    .then(() => resolve(true))
                    .catch(() => resolve(false))
            } else {
                resolve(false)
            }
        })
    })
}
