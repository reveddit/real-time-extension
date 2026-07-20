import {
    getOptions,
    addToPendingPostQueue,
    removeMultipleFromPendingPostQueue,
    recordRateLimitHit,
    clearRateLimitBackoff,
} from './storage'
import browser from 'webextension-polyfill'
import { getItemsById_fromOldHTML } from './parse_html/old'
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
} from './parse_html/new'
import { newReddit } from './parse_html/common'
import { setWarningBadge } from './common'
import { getRemoteMechanism, resolveMechanismDisabled, MECHANISM_LEGACY } from './news'

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

// Prefer fetching through a www.reddit.com tab's content script: a same-origin
// fetch there is verified to never receive Reddit's JS challenge. old.reddit.com
// and sh.reddit.com tabs cannot help — content scripts follow the page's origin
// rules, so cross-origin reads to www.reddit.com are CORS-blocked from them.
// Without a www tab, the background fetch works via host_permissions (bypasses
// CORS) but may hit the challenge; parse_html/new.ts carries a best-effort solver.
const getWwwHtmlFetcher = async (): Promise<{ fetchHtml: FetchHtml; viaTab: boolean }> => {
    let tabs: any[] = []
    try {
        if (typeof chrome !== 'undefined' && chrome.tabs) {
            tabs = await browser.tabs.query({ url: ['https://www.reddit.com/*'] })
        }
    } catch {
        /* no tabs API in this context */
    }
    const tab = tabs.find(t => t.id != null)
    if (!tab) {
        return { fetchHtml: fetchWwwHtml_viaBackground, viaTab: false }
    }
    let contentScriptAlive = true
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
            } catch {
                // The tab may predate the extension install (no content script);
                // stop retrying it this cycle and use the background instead.
                contentScriptAlive = false
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
        // An adverse cached verdict forces re-verification at any age so a post
        // once seen as held/removed can't silently flip back to approved.
        if (isMature && (!cached || cached.v === 'live')) {
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
const ABSENT_VERDICT_CACHE_MAX = 200
// Bounds the burst when a user newly hides a large subreddit: at most this many
// page fetches per cycle; the rest stay unverified (omitted) until later cycles.
const ABSENT_VERIFY_MAX_PER_CYCLE = 20
const ABSENT_VERIFY_DELAY_MS = 500

interface AbsentVerdictEntry {
    v: Exclude<PostPageStatus, 'unknown'>
    t: number // epoch ms of verification
}

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
        const solutionUrl = solveChallenge(html, url)
        if (solutionUrl) {
            html = await fetchHtml(solutionUrl)
            verdict = classify(html)
        }
    }
    return verdict
}

const verifyFeedAbsentItems = async (
    ids: string[],
    authItemsMeta: AuthItemsMeta,
    fetchHtml: FetchHtml,
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
    for (const id of ids) {
        const cached = cache[id]
        const ttl = cached && cached.v === 'live' ? ABSENT_VERDICT_LIVE_TTL_MS : ABSENT_VERDICT_ADVERSE_TTL_MS
        if (cached && nowMs - cached.t < ttl) {
            verdicts[id] = cached.v
        } else {
            toFetch.push(id)
        }
    }
    let fetched = 0
    for (const id of toFetch) {
        if (fetched >= ABSENT_VERIFY_MAX_PER_CYCLE) {
            break
        }
        if (fetched > 0) {
            await new Promise(r => setTimeout(r, ABSENT_VERIFY_DELAY_MS))
        }
        fetched++
        try {
            const verdict = await fetchAndClassifyAbsentItem(id, authItemsMeta[id] || {}, fetchHtml)
            console.log(`[reveddit] absent item verdict ${id}: ${verdict}`)
            if (verdict !== 'unknown') {
                verdicts[id] = verdict
                cache[id] = { v: verdict, t: nowMs }
            }
        } catch (err: any) {
            console.log(`[reveddit] absent item verification failed ${id}:`, String(err?.message || err))
        }
    }
    if (fetched) {
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
        console.log(`[reveddit] public profile for ${username} is empty - possible shadowban`)
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
    const absentToVerify = ids.filter(id => {
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
    const absentVerdicts = absentToVerify.length
        ? await verifyFeedAbsentItems(absentToVerify, authItemsMeta, fetchHtml)
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
    console.log(
        `[reveddit] www lookup ${username}: ${ids.length} requested, ${results.length} returned ` +
            `(${removedCount} removed, ${ids.length - results.length} omitted/uncovered), ` +
            `coverage t1=${profile.coverage.t1} t3=${profile.coverage.t3}, verdicts=${JSON.stringify(postVerdicts)}, ` +
            `absentVerdicts=${JSON.stringify(absentVerdicts)}`,
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

export const getLoggedinUser = () => {
    return new Promise(resolve => {
        const isContentContext =
            typeof chrome === 'undefined' || !chrome.tabs || typeof chrome.tabs.query !== 'function'
        // In a content script, chrome.tabs.query is not available. Use the current page's host.
        if (isContentContext && typeof window !== 'undefined' && window.location && window.location.hostname) {
            const currentHost = window.location.hostname
            const targetUrl = `https://${currentHost}/api/me.json`
            fetch(targetUrl, { credentials: 'include', cache: 'reload' })
                .then(handleFetchErrors)
                .then(getRedditUsername)
                .then(resolve)
                .catch(() => resolve(null))
            return
        }

        // Pick a host: prefer old.reddit.com if an old.reddit tab is open (quarantine
        // opt-in lives there), otherwise default to www.reddit.com.
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

        const fetchUser = (targetUrl: string) =>
            fetch(targetUrl, { credentials: 'include', cache: 'reload' })
                .then(handleFetchErrors)
                .then(getRedditUsername)

        pickHost().then(host => {
            const targetUrl = `https://${host}/api/me.json`
            // 1) Direct fetch. With `cookies` permission + reddit host_permissions the
            //    browser includes the user's real session cookies even with no tab open.
            fetchUser(targetUrl)
                .then(resolve)
                .catch(() => {
                    // 2) Fallback: rehydrate any previously-stored cookies and retry once.
                    rehydrateStoredRedditCookies().then(success => {
                        if (!success) {
                            resolve(null)
                            return
                        }
                        fetchUser(targetUrl)
                            .then(resolve)
                            .catch(() => {
                                console.log('Failed to authenticate with stored cookies')
                                resolve(null)
                            })
                    })
                })
        })
    })
}

const getRedditUsername = (data: any) => {
    if (!data || !data.data || !data.data.name) {
        throw Error('reddit username is not defined')
    }
    return data.data.name
}

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
