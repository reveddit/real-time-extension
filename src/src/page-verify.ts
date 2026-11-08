import { getRemoteMechanism, MECHANISM_ABSENT_UNVERIFIED_UNKNOWN, MECHANISM_ABSENT_VERIFICATION } from './news'
import {
    PostPageStatus,
    FetchHtml,
    buildCommentThreadUrl,
    sitePermalink,
    buildPostPageUrl,
    buildCommentPageUrl,
    classifyPostPage,
    classifyCommentPage,
    buildCommentPartialUrl,
    describePageForDiag,
    solveChallenge,
} from './parse_html/new'
import browser from 'webextension-polyfill'
import { getMsSinceLastRateLimitHit } from './storage'
import { dlog, dlogSummary } from './diaglog'
import { newReddit } from './parse_html/common'
import {
    AuthItemsMeta,
    isYoungPost,
    authSaysPostRemoved,
    AuthItemMeta,
    absentLiveTtl,
    ABSENT_VERDICT_LIVE_TTL_MS,
    recordAbsentVerifyOutcome,
} from './lookup-status'
import {
    noteRateLimited,
    isRateLimitedNow,
    RECENT_RATE_LIMIT_WINDOW_MS,
    readLocal,
    isFresh,
    isMechanismDisabled,
} from './request-gates'
import { legacyTiebreakAbsent } from './legacy-lookup'

export const isAbsentUnverifiedUnknown = async (): Promise<boolean> =>
    (await getRemoteMechanism(MECHANISM_ABSENT_UNVERIFIED_UNKNOWN).catch(() => 'auto')) === 'on'

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
    // See isConfirmingPaced
    u?: number
}

// Which post-page classifier a cached post verdict came from. 2 (0.0.5.28)
// reads only the banner's slot; the one before read the post's own title and
// body too, so its 'removed' or 'held' may have been the author's words. Such
// a verdict is read again rather than reused.
const POST_CLASSIFIER = 2

const isStalePostVerdict = (id: string, entry: { v: PostPageStatus; k?: number }): boolean =>
    id.startsWith('t3_') && (entry.v === 'removed' || entry.v === 'held') && entry.k !== POST_CLASSIFIER

const classifierMark = (id: string) => (id.startsWith('t3_') ? { k: POST_CLASSIFIER } : {})

// A post once seen held or removed, or read 'unknown' since then (adverse):
// such a post is re-verified at any age, and its entry kept while there's room
const isAdverseVerdict = (e: PostVerdictEntry | undefined): boolean =>
    Boolean(e && (e.adverse || e.v === 'held' || e.v === 'removed'))

const postVerdictTtl = (e: PostVerdictEntry): number =>
    e.v === 'unknown' ? POST_VERDICT_UNKNOWN_TTL_MS : POST_VERDICT_TTL_MS

// Monitoring reports a removal once 3 to 5 cycles in a row read it, to ride
// out a stray answer, and marks each item it's counting and can still record
// (confirming). Every one of those cycles needs a read of its own, so for such
// an item a cached 'removed' or 'held' isn't reused, and a read that decides
// nothing leaves it in place and gives no verdict that cycle. Both caches here
// and the second account's (viewer-lookup.ts) work this way.
export const isConfirmingRemoval = (entry: { v: string } | undefined, meta: AuthItemMeta | undefined): boolean =>
    !!meta?.confirming && (entry?.v === 'removed' || entry?.v === 'held')

// Such a read also marks the entry with when it was (u), and the item isn't
// read again sooner than an 'unknown' would be, so a removal counted while
// reddit refuses isn't asked for every cycle. Until then it gets no verdict.
export const isConfirmingPaced = (
    entry: { v: string; u?: number } | undefined,
    meta: AuthItemMeta | undefined,
    unknownTtl: number,
    now: number,
): boolean => isConfirmingRemoval(entry, meta) && isFresh(Number(entry?.u), unknownTtl, now)

export const verifyFeedPresentPosts = async (
    ids: string[],
    presentIds: Set<string>,
    authItemsMeta: AuthItemsMeta,
    fetchHtml: FetchHtml,
): Promise<Record<string, PostPageStatus>> => {
    const nowMs = Date.now()
    let cache = await readLocal<Record<string, PostVerdictEntry>>(POST_VERDICT_CACHE_KEY, {})
    const verdicts: Record<string, PostPageStatus> = {}
    const toFetch: string[] = []
    for (const id of ids) {
        if (!id.startsWith('t3_') || !presentIds.has(id)) {
            continue
        }
        const m = authItemsMeta[id]
        // Auth view already flags it removed → the caller uses that directly; no
        // page fetch needed.
        if (authSaysPostRemoved(id, m)) {
            continue
        }
        const cached = cache[id]
        // Mature + no adverse history → the feed is trustworthy, skip the page.
        // An adverse cached verdict — or a removal already recorded in storage
        // (which a fresh verdict cache knows nothing about) — forces
        // re-verification at any age so a post once seen as held/removed can't
        // silently flip back to approved.
        if (!isYoungPost(m) && !isAdverseVerdict(cached) && !m?.known_removed) {
            continue
        }
        if (isConfirmingPaced(cached, m, POST_VERDICT_UNKNOWN_TTL_MS, nowMs)) {
            continue
        }
        if (cached && !isStalePostVerdict(id, cached) && !isConfirmingRemoval(cached, m)) {
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
        // What a read that decides nothing leaves: an 'unknown', or while the
        // removal is counted the cached verdict, marked (isConfirmingPaced)
        const undecided: PostVerdictEntry = isConfirmingRemoval(cache[id], authItemsMeta[id])
            ? { ...cache[id], u: nowMs }
            : { v: 'unknown', t: nowMs, k: POST_CLASSIFIER, ...(wasAdverse(id) && { adverse: true }) }
        try {
            const verdict = await fetchAndClassifyItemPage(id, authItemsMeta[id] || {}, fetchHtml)
            dlog('verify', `[reveddit] post page verdict ${id}: ${verdict}`)
            cache[id] = verdict === 'unknown' ? undecided : { v: verdict, t: nowMs, k: POST_CLASSIFIER }
            if (verdict !== 'unknown') {
                verdicts[id] = verdict
            }
        } catch (err: any) {
            dlog('verify', `[reveddit] post page fetch failed ${id}:`, String(err?.message || err))
            cache[id] = undecided
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
    // See isConfirmingPaced
    u?: number
}

// Remote gate for the whole feed-absent verification path. Default: enabled
// (no extension-news.json entry needed). Remotely flipping the mechanism 'off'
// reverts to the pre-0.0.5.14 classification — feed absence within coverage
// counts as removed, no page fetches — as field insurance against a Reddit
// markup change the classifier misreads. Dev override (highest priority):
//   chrome.storage.local.set({ dev_disable_absent_verification: true })  // or false
//   chrome.storage.local.remove('dev_disable_absent_verification')       // defaults
const DEV_DISABLE_ABSENT_VERIFICATION_KEY = 'dev_disable_absent_verification'

export const isAbsentVerificationDisabled = () =>
    isMechanismDisabled(DEV_DISABLE_ABSENT_VERIFICATION_KEY, MECHANISM_ABSENT_VERIFICATION, false)

// An item's own logged-out page, classified: for feed-absent items of either
// kind, and for young feed-present posts (verifyFeedPresentPosts). scaffoldAbsence
// is what a comment's thread page without the comment reads as.
const fetchAndClassifyItemPage = async (
    id: string,
    meta: AuthItemMeta,
    fetchHtml: FetchHtml,
    scaffoldAbsence: 'removed' | 'unknown' = 'removed',
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
        id.startsWith('t3_') ? classifyPostPage(html, id).status : classifyCommentPage(html, id, scaffoldAbsence)
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
                const verdict = classifyCommentPage(partial, id, scaffoldAbsence)
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

export const verifyFeedAbsentItems = async (
    ids: string[],
    authItemsMeta: AuthItemsMeta,
    fetchHtml: FetchHtml,
    canaryCommentIds: string[] = [],
): Promise<Record<string, PostPageStatus>> => {
    const nowMs = Date.now()
    let cache = await readLocal<Record<string, AbsentVerdictEntry>>(ABSENT_VERDICT_CACHE_KEY, {})
    const verdicts: Record<string, PostPageStatus> = {}
    const toFetch: string[] = []
    let recentUnknownSkipped = 0
    for (const id of ids) {
        const cached = cache[id]
        if (isConfirmingPaced(cached, authItemsMeta[id], ABSENT_VERDICT_UNKNOWN_TTL_MS, nowMs)) {
            recentUnknownSkipped++
            continue
        }
        if (cached && !isStalePostVerdict(id, cached) && !isConfirmingRemoval(cached, authItemsMeta[id])) {
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
    const scaffoldAbsence = (await isAbsentUnverifiedUnknown()) ? 'unknown' : 'removed'
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
        // What a read that decides nothing leaves: an 'unknown', or while the
        // removal is counted the cached verdict, marked (isConfirmingPaced)
        const undecided: AbsentVerdictEntry = isConfirmingRemoval(cache[id], authItemsMeta[id])
            ? { ...cache[id], u: nowMs }
            : { v: 'unknown', t: nowMs, ...classifierMark(id) }
        try {
            const verdict = await fetchAndClassifyItemPage(id, authItemsMeta[id] || {}, fetchHtml, scaffoldAbsence)
            dlog('verify', `[reveddit] absent item verdict ${id}: ${verdict}`)
            cache[id] = verdict === 'unknown' ? undecided : { v: verdict, t: nowMs, ...classifierMark(id) }
            if (verdict !== 'unknown') {
                verdicts[id] = verdict
                freshDefinitive++
            }
        } catch (err: any) {
            dlog('verify', `[reveddit] absent item verification failed ${id}:`, String(err?.message || err))
            // Paced like an unreadable page. A wall on every route (the
            // captcha, the block page) must not be retried every cycle.
            cache[id] = undecided
            // One hit an item: a 429 on its partial has already started the
            // backoff, and two would double the wait
            if (!(await isRateLimitedNow())) {
                noteRateLimited(err)
            }
        }
        // A 429 on any of the item's reads ends this cycle's checks: without
        // this, a rate-limited client burns the whole verification budget every
        // cycle producing silent unknowns (no alert, no Paused banner).
        if (await isRateLimitedNow()) {
            break
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
