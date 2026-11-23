import browser from 'webextension-polyfill'
import { dlogSummary, dlog } from './diaglog'
import { setWarningBadge } from './common'
import { getPublicLiveKey, OWN_ITEMS_CHECK_KEY } from './storage'
import { VIEWER_FAILURES_KEY, ViewerAccount, getViewer, isSignedInViewer } from './viewer'
import { isLoginWalled } from './www-fetcher'
import { readLocal, isFresh } from './request-gates'
import { fullnameValue } from './parse_html/new'
import { endPublicViewUnreadable } from './public-cookies'

export const www_reddit = 'https://www.reddit.com/'

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
    // Monitoring is counting this item's removal and can still record it, so a
    // cached 'removed' or 'held' isn't reused: its page is read again, and a
    // read that decides nothing is cached as 'unknown', paced like any other
    confirming?: boolean
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

// The author's own view already shows the post removed, which is final
export const authSaysPostRemoved = (id: string, meta: AuthItemMeta | undefined): boolean =>
    id.startsWith('t3_') && (meta?.is_robot_indexable === false || !!meta?.removed_by_category)

// Whether a post is young enough that its listing may still hold it back
export const isYoungPost = (meta: AuthItemMeta | undefined): boolean =>
    meta?.created_utc === undefined || Math.floor(Date.now() / 1000) - meta.created_utc <= POST_FEED_GRACE_SECONDS

// Whether a listing was walked far enough to show an item, if it were there
export const isCovered = (id: string, coverage: { t1: number; t3: number }): boolean => {
    const value = fullnameValue(id)
    return Number.isFinite(value) && value >= (id.startsWith('t3_') ? coverage.t3 : coverage.t1)
}

// Why the public view can't judge an item, '' when it can
export const publicViewUncheckedReason = (id: string, meta: AuthItemMeta | undefined): string =>
    postRemovedByCategory(id, meta) ? '' : publiclyInvisibleReason(meta)

export const PROFILE_PUBLICLY_EMPTY = 'profile_publicly_empty'

export const WWW_DETECT_FAILURES_KEY = 'www_detect_consecutive_failures'

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

const ABSENT_VERDICT_LIVE_TTL_MS = 6 * 3600 * 1000

// A young item's 'live' is read again sooner, since that's when removals
// happen: after an eighth of its age, at least 10 minutes, at most the 6 h
// above. A tab the owner hides lists nothing, so every item of it is checked
// this way, and a removal minutes after posting mustn't wait out 6 h.
const ABSENT_VERDICT_LIVE_MIN_TTL_MS = 10 * 60 * 1000

export const absentLiveTtl = (createdUtc: number | undefined, nowMs: number): number =>
    createdUtc === undefined
        ? ABSENT_VERDICT_LIVE_TTL_MS
        : Math.min(
              ABSENT_VERDICT_LIVE_TTL_MS,
              Math.max(ABSENT_VERDICT_LIVE_MIN_TTL_MS, (nowMs - createdUtc * 1000) / 8),
          )

// F4 (issue #14): consecutive cycles where absent-item verification fetched
// pages but resolved nothing — every page unreadable. Without this, that state
// is invisible: removals in profile-hidden subs simply stop being detected.
// Mirrors recordWwwDetectOutcome; any fresh definitive verdict from a page
// fetch resets the streak.
// Cycles that fetch nothing (all verdicts cached) are neutral.
export const ABSENT_VERIFY_UNAVAILABLE = 'absent_verify_unavailable'

const ABSENT_VERIFY_FAILURES_KEY = 'absent_verify_consecutive_failures'

// Whether verification has resolved nothing for enough cycles to warn. A
// processed monitoring pass clears error_status, and must keep this warning:
// only a cycle that resolves a verdict clears it (recordAbsentVerifyOutcome).
const isAbsentVerifyUnavailable = () => isStreakLong(ABSENT_VERIFY_FAILURES_KEY)

export const recordAbsentVerifyOutcome = (ok: boolean) =>
    recordStreak(
        ABSENT_VERIFY_FAILURES_KEY,
        ok,
        n => dlogSummary('verify', `[reveddit] absent verification resolved nothing — consecutive cycles: ${n}`),
        async () => setWarningBadge(await absentVerifyWarning()),
    )

// When the pages it checks (the comment partial, then the page) ask for a
// login, the warning says so: a second account helps then, not a tab
const absentVerifyWarning = async () =>
    (await isLoginWalled(['partial', 'page'])) ? LOGIN_REQUIRED : ABSENT_VERIFY_UNAVAILABLE

// Streaks of failures kept in storage. One failure is noise; a warning comes
// after STREAK_WARN_AT in a row.
export const STREAK_WARN_AT = 5

export const isStreakLong = async (key: string): Promise<boolean> => {
    return Number(await readLocal(key, 0)) >= STREAK_WARN_AT
}

// ok ends the streak. Else it grows by one, say logs it, and at STREAK_WARN_AT
// warn raises the warning. A storage failure anywhere in this stops it there,
// unreported.
export const recordStreak = async (
    key: string,
    ok: boolean,
    say?: (failures: number) => void,
    warn?: () => void | Promise<void>,
) => {
    try {
        if (ok) {
            await browser.storage.local.remove(key)
            return
        }
        const stored = (await browser.storage.local.get({ [key]: 0 })) as any
        const failures = Number(stored[key] || 0) + 1
        await browser.storage.local.set({ [key]: failures })
        say?.(failures)
        if (failures >= STREAK_WARN_AT) {
            await warn?.()
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

export const recordCheckOutcome = (checked: boolean) =>
    recordStreak(
        CHECK_FAILURES_KEY,
        checked,
        n => dlog('cycle', `[reveddit] nothing checked this cycle — consecutive failures: ${n}`),
        async () => {
            const { error_status } = (await browser.storage.local.get({ error_status: '' })) as any
            if (!error_status || PARTIAL_WARNINGS.has(error_status)) {
                setWarningBadge(CHECKS_FAILING)
            }
        },
    )

// OWN_ITEMS_CHECK_KEY is when a check last read the user's items, and since
// when the checks after it have read none. Not the streak above: a lookup
// that fails after the listing came back isn't counted there.

// A check of the user's items ended, having read them or not. Rewritten on
// each read; on a failure, only at the first of a run, or for another user.
export const noteItemsCheck = async (user: string, read: boolean) => {
    try {
        const name = user.toLowerCase()
        if (read) {
            await browser.storage.local.set({ [OWN_ITEMS_CHECK_KEY]: { user: name, ok: Date.now() } })
            return
        }
        const stored: any = await readLocal(OWN_ITEMS_CHECK_KEY, null)
        const same = stored?.user === name
        if (!same || !stored.failing) {
            await browser.storage.local.set({
                [OWN_ITEMS_CHECK_KEY]: { user: name, ...(same && stored.ok && { ok: stored.ok }), failing: Date.now() },
            })
        }
    } catch {
        /* ignored */
    }
}

export const getItemsCheckStatus = async (): Promise<{ itemsCheckedAt: number; itemsFailingSince: number }> => {
    const stored: any = await readLocal(OWN_ITEMS_CHECK_KEY, null)
    return { itemsCheckedAt: Number(stored?.ok) || 0, itemsFailingSince: Number(stored?.failing) || 0 }
}

// Track consecutive failures of the www public-view path. One failure is noise
// (deploys, blips); persistent failure means the detection path is broken and
// the user should know — without it they'd assume monitoring still works. The
// line carries the reason: issue #27's log showed thousands of failures and
// nothing about why. When reddit asks for a login, the warning says so
// instead, since opening a tab doesn't help with that.
export const LOGIN_REQUIRED = 'login_required'

// The warning when the failure was a page reddit sent that couldn't be read,
// not a refusal or no answer: the same advice in other words (2026-11-17)
export const PUBLIC_VIEW_UNREADABLE = 'public_view_unreadable'

// The failed lookups in a row that had a www.reddit.com tab open. The popup
// gives a tab a few of them to clear the public view's warning before it puts
// the second account first. A lookup with no tab starts the count again.
export const WWW_TAB_FAILURES_KEY = 'www_detect_tab_failures'

export const recordWwwDetectOutcome = async (
    ok: boolean,
    { reason = '', loginWall = false, withTab = false, unreadable = false } = {},
) => {
    // First, since the streak below raises the warning: the popup never shows it with an old count
    await recordStreak(WWW_TAB_FAILURES_KEY, ok || !withTab)
    // A lookup that read one tab while the other came back unreadable stands,
    // but the unreadable pages go on (public-cookies.ts)
    if (ok && !unreadable) {
        await endPublicViewUnreadable()
    }
    await recordStreak(
        WWW_DETECT_FAILURES_KEY,
        ok,
        n =>
            dlog(
                'feed',
                `[reveddit] www public-view lookup failed — consecutive failures: ${n}` +
                    (reason ? ` (${reason})` : ''),
            ),
        // The latest failure picks the words: both offer a tab, then a second account
        () =>
            setWarningBadge(
                loginWall ? LOGIN_REQUIRED : unreadable ? PUBLIC_VIEW_UNREADABLE : 'public_view_unavailable',
            ),
    )
}

// The logged-in user's profile is publicly empty or missing (the shadowban
// signature), as the last lookup found it. The bridge reads it so reveddit.com
// shows that user's own profile as logged-out visitors see it, not as their
// login does.
export const PUBLIC_PROFILE_UNAVAILABLE_KEY = 'public_profile_unavailable'

const PUBLIC_PROFILE_UNAVAILABLE_MAX_AGE_MS = 24 * 3600 * 1000

export const notePublicProfileUnavailable = async (username: string | null) => {
    try {
        if (username) {
            await browser.storage.local.set({ [PUBLIC_PROFILE_UNAVAILABLE_KEY]: { user: username, t: Date.now() } })
        } else if (await readLocal(PUBLIC_PROFILE_UNAVAILABLE_KEY, null)) {
            // Removed only when set: this runs on every good lookup
            await browser.storage.local.remove(PUBLIC_PROFILE_UNAVAILABLE_KEY)
        }
    } catch {
        /* ignored */
    }
}

export const isPublicProfileUnavailable = async (username: string): Promise<boolean> => {
    const stored: any = await readLocal(PUBLIC_PROFILE_UNAVAILABLE_KEY, null)
    return (
        String(stored?.user || '').toLowerCase() === username.toLowerCase() &&
        isFresh(Number(stored?.t), PUBLIC_PROFILE_UNAVAILABLE_MAX_AGE_MS, Date.now())
    )
}

// The shadowban signature, as one warning instead of N removal alerts. Thrown
// (not returned) so monitoring skips this cycle without clearing the warning.
// missing: the profile is a 404 logged out, which the bridge then answers for
// it too; an empty profile still exists, so the bridge keeps serving it.
export const reportPublicProfileShadowban = async (
    username: string,
    what: string,
    missing: boolean,
): Promise<never> => {
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
export const PROFILE_CONTROL_USER = 'reddit'

// Consecutive lookups whose profile pagination stopped short of the items
// monitoring needed (every route refused a partial page, a network error).
// Items below where it stopped are omitted as unknown, so their removals go
// unseen; a streak gets its own warning, kept at the end of a pass like
// absent_verify_unavailable.
const PROFILE_PAGINATION_UNAVAILABLE = 'profile_pagination_unavailable'

const PAGINATION_SHORTFALL_KEY = 'profile_pagination_consecutive_shortfalls'

export const isProfilePaginationShort = () => isStreakLong(PAGINATION_SHORTFALL_KEY)

export const recordPaginationOutcome = (stopped: string | undefined) =>
    recordStreak(
        PAGINATION_SHORTFALL_KEY,
        !stopped,
        n => dlogSummary('feed', `[reveddit] profile pagination stopped short — consecutive lookups: ${n}`),
        async () => setWarningBadge(await paginationWarning()),
    )

// When the profile's older pages ask for a login, the warning says so
const paginationWarning = async () =>
    (await isLoginWalled(['profile-partial'])) ? LOGIN_REQUIRED : PROFILE_PAGINATION_UNAVAILABLE

// Consecutive lookups that read one profile tab while the other came back
// unreadable (getPublicProfileItems' unreadableKind): that kind's items go
// unchecked and the other's are checked. Each tab's streak has its own
// warning, kept at the end of a pass like pagination's. The line keeps the
// words "www public-view lookup failed … consecutive failures: N (reason)",
// which the extension canary looks for.
const TAB_UNREADABLE = {
    t1: { key: 'comments_tab_unreadable_consecutive', warning: 'profile_comments_unreadable', tab: 'comments' },
    t3: { key: 'posts_tab_unreadable_consecutive', warning: 'profile_posts_unreadable', tab: 'posts' },
} as const

// After a lookup that read the profile: kind is the tab that couldn't be read, if one
export const recordUnreadableTabOutcome = async (kind: 't1' | 't3' | undefined, reason = '') => {
    for (const k of ['t1', 't3'] as const) {
        const { key, warning, tab } = TAB_UNREADABLE[k]
        await recordStreak(
            key,
            kind !== k,
            n =>
                dlog(
                    'feed',
                    `[reveddit] www public-view lookup failed for the ${tab} tab, the other one was checked; ` +
                        `consecutive failures: ${n}` +
                        (reason ? ` (${reason})` : ''),
                ),
            () => setWarningBadge(warning),
        )
    }
}

const unreadableTabWarning = async (): Promise<string | null> => {
    for (const k of ['t3', 't1'] as const) {
        if (await isStreakLong(TAB_UNREADABLE[k].key)) {
            return TAB_UNREADABLE[k].warning
        }
    }
    return null
}

// The items the last lookup couldn't judge because nobody logged out can see
// them (publicViewUncheckedReason), for the copied log's header. Written when
// the set changes, else every half hour, so the header's time says how
// current it is.
export const PUBLIC_VIEW_UNCHECKED_KEY = 'public_view_unchecked'

const PUBLIC_VIEW_UNCHECKED_REFRESH_MS = 30 * 60 * 1000

export const notePublicViewUnchecked = async (unchecked: Record<string, string>) => {
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
        return formatPublicViewUnchecked(await readLocal(PUBLIC_VIEW_UNCHECKED_KEY, null), includeIds)
    } catch {
        return formatPublicViewUnchecked(null)
    }
}

export const threadItemUrl = (id: string, postId: string): string => {
    const post = postId.replace(/^t3_/, '')
    return id.startsWith('t3_')
        ? `${www_reddit}comments/${post}.json?limit=1&raw_json=1`
        : `${www_reddit}comments/${post}/_/${id.slice(3)}.json?limit=1&depth=1&raw_json=1`
}

export const threadItemOf = (json: any, id: string): any => {
    const data = id.startsWith('t3_') ? json?.[0]?.data?.children?.[0]?.data : json?.[1]?.data?.children?.[0]?.data
    return data?.name === id ? data : undefined
}

export const VIEWER_SIGNED_OUT = 'viewer_signed_out'

export const VIEWER_UNAVAILABLE = 'viewer_unavailable'

// Consecutive failed lookups through the second account, warned about after a
// streak like the public view's (recordWwwDetectOutcome)
export const recordViewerOutcome = (ok: boolean, reason = '') =>
    recordStreak(
        VIEWER_FAILURES_KEY,
        ok,
        n => dlog('feed', `[reveddit] second-account lookup failed — consecutive failures: ${n} (${reason})`),
        () => setWarningBadge(VIEWER_UNAVAILABLE),
    )

// Consecutive cycles whose thread reads as the second account all came back
// without a verdict (block pages, unreadable answers), warned about like the
// logged-out view's page checks (recordAbsentVerifyOutcome): a removed comment
// drops out of the listings, so it goes unseen without its thread read. A
// fresh verdict ends the streak, and so does nothing being left without one;
// a cycle that reads no thread while items wait leaves it as it is. Kept per
// connected account (its token), so another starts afresh.
export const VIEWER_THREAD_FAILURES_KEY = 'viewer_thread_consecutive_failures'

const viewerThreadFailures = async (viewer: ViewerAccount): Promise<number> => {
    const stored: any = await readLocal(VIEWER_THREAD_FAILURES_KEY, null)
    return stored?.token === viewer.token ? Number(stored.failures) || 0 : 0
}

export const recordViewerThreadOutcome = async (
    viewer: ViewerAccount,
    read: number,
    resolved: number,
    pending: number,
) => {
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
        if (failures >= STREAK_WARN_AT) {
            setWarningBadge(VIEWER_UNAVAILABLE)
        }
    } catch {
        /* ignored */
    }
}

// Which view last checked each user's items (lookupItemsByID),
// so the pass's end keeps that view's warnings (lookupWarningToKeep)
export const viewerCheckedLast = new Map<string, boolean>()

// Warnings about part of the check. A cycle that read nothing takes over from
// them (recordCheckOutcome), and the next pass puts back the one still true.
const PARTIAL_WARNINGS = new Set<string>([
    VIEWER_UNAVAILABLE,
    ABSENT_VERIFY_UNAVAILABLE,
    PROFILE_PAGINATION_UNAVAILABLE,
    TAB_UNREADABLE.t1.warning,
    TAB_UNREADABLE.t3.warning,
])

// The warning a processed monitoring pass keeps, though a pass otherwise
// clears error_status: the outage of a check a pass completes without, which
// only that check's own recovery ends. With a second account checking, that's
// its thread reads; in the logged-out view, an unreadable tab, page checks
// and pagination.
export const lookupWarningToKeep = async (username: string): Promise<string | null> => {
    const viewer = await getViewer()
    const viaViewer = viewerCheckedLast.get(username.toLowerCase()) ?? !isSignedInViewer(viewer?.name || '', username)
    if (viewer && viaViewer) {
        return (await viewerThreadFailures(viewer)) >= STREAK_WARN_AT ? VIEWER_UNAVAILABLE : null
    }
    const tabWarning = await unreadableTabWarning()
    if (tabWarning) {
        return tabWarning
    }
    if (await isAbsentVerifyUnavailable()) {
        return absentVerifyWarning()
    }
    if (await isProfilePaginationShort()) {
        return paginationWarning()
    }
    return null
}
