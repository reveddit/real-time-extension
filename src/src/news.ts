// Remote news feed + remote options fetched from reveddit.com. Lets us push
// messages — and adjust detection behavior — on installed extensions without
// shipping a new version (a store republish can take days). The feed starts
// empty; when messages are added, the popup renders them in a banner.

import { dlog } from './diaglog'

export const NEWS_URL = 'https://www.reveddit.com/extension-news.json'
export const NEWS_CACHE_KEY = 'news_cache'
export const NEWS_READ_IDS_KEY = 'news_read_ids'
const MIN_FETCH_INTERVAL_MS = 6 * 60 * 60 * 1000 // 6 hours

export interface NewsMessage {
    id: string
    published_utc: number
    title: string
    body_markdown: string
    severity?: 'info' | 'warning' | 'success'
    // Optional version targeting: the message only shows to installs inside
    // the range, so e.g. a "you're stuck on an old version" notice never
    // nags people who already updated.
    min_version?: string
    max_version?: string
}

// Remote options: an optional "options" block in the same JSON. Each mechanism
// switch is three-state — 'auto' (compiled default decides), 'on' (force-enable),
// 'off' (force-disable). Anything missing or malformed resolves to 'auto', so a
// feed outage or bad edit can never break detection.
export type RemoteMechanismState = 'auto' | 'on' | 'off'
export interface RemoteOptions {
    mechanisms: Record<string, RemoteMechanismState>
    // Host that serves reddit's legacy (pre-Shreddit) HTML logged out. Set to
    // www.reddit.com on 2026-08-31 when old.reddit.com began requiring login
    // while the same renderer stayed reachable on www for legacy-only routes
    // (/api/info?id=, and user/post pages with the redesign_optout cookie).
    // Allowlisted: only LEGACY_HOSTS values survive sanitization.
    legacy_host?: string
}
export const LEGACY_HOSTS = ['www.reddit.com', 'old.reddit.com'] as const
export const LEGACY_HOST_DEFAULT = 'www.reddit.com'
// The unauthenticated legacy paths (old.reddit HTML, unauth www .json). Flip to
// 'off' once Reddit's deprecation actually lands, to stop the doomed attempts.
export const MECHANISM_LEGACY = 'legacyOldReddit'
// Verification of feed-absent items against their own logged-out pages (the
// profile-hidden-subreddit false-alert fix, v0.0.5.14). Enabled by default;
// flip to 'off' to fall back to the older feed-absence-only classification if
// the page classifier ever misbehaves against a Reddit markup change.
export const MECHANISM_ABSENT_VERIFICATION = 'absentPageVerification'
// Challenge-solve retry when /api/me.json returns the string-doubling challenge
// instead of JSON (login detection would otherwise read it as "not logged in").
// Enabled by default; flip to 'off' if the retry ever misbehaves.
export const MECHANISM_ME_CHALLENGE = 'meJsonChallengeSolve'

export interface NewsFeed {
    messages: NewsMessage[]
    options?: RemoteOptions
    // Latest published store version and its release date (epoch ms). Lets a
    // client notice that its browser has failed to apply an update for days
    // (see the 0.0.5.14 stuck-cohort incident, Aug 2026).
    latest_version?: string
    latest_version_published_utc?: number
}

export interface NewsCache {
    feed: NewsFeed
    lastFetched: number
}

const emptyFeed = (): NewsFeed => ({ messages: [] })

export const getCachedNews = (): Promise<NewsCache | null> =>
    new Promise(resolve => {
        try {
            chrome.storage.local.get([NEWS_CACHE_KEY], res => {
                resolve((res && res[NEWS_CACHE_KEY]) || null)
            })
        } catch {
            resolve(null)
        }
    })

export const getReadIds = (): Promise<Record<string, true>> =>
    new Promise(resolve => {
        try {
            chrome.storage.local.get([NEWS_READ_IDS_KEY], res => {
                resolve((res && res[NEWS_READ_IDS_KEY]) || {})
            })
        } catch {
            resolve({})
        }
    })

export const markNewsRead = (id: string): Promise<void> =>
    new Promise(resolve => {
        try {
            chrome.storage.local.get([NEWS_READ_IDS_KEY], res => {
                const readIds = (res && res[NEWS_READ_IDS_KEY]) || {}
                readIds[id] = true
                chrome.storage.local.set({ [NEWS_READ_IDS_KEY]: readIds }, () => resolve())
            })
        } catch {
            resolve()
        }
    })

const VERSION_RE = /^\d+(\.\d+){0,3}$/

export const isValidVersion = (v: unknown): v is string => typeof v === 'string' && VERSION_RE.test(v)

// Numeric dotted-version compare: negative when a < b, zero when equal.
export const compareVersions = (a: string, b: string): number => {
    const pa = a.split('.').map(n => parseInt(n, 10) || 0)
    const pb = b.split('.').map(n => parseInt(n, 10) || 0)
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        const d = (pa[i] || 0) - (pb[i] || 0)
        if (d !== 0) {
            return d
        }
    }
    return 0
}

// Pure, unit-tested: applies each message's min/max_version range.
export const filterMessagesForVersion = (messages: NewsMessage[], ownVersion: string): NewsMessage[] =>
    messages.filter(m => {
        if (isValidVersion(m.min_version) && compareVersions(ownVersion, m.min_version) < 0) {
            return false
        }
        if (isValidVersion(m.max_version) && compareVersions(ownVersion, m.max_version) > 0) {
            return false
        }
        return true
    })

// Grace window before the "your browser hasn't installed the update" notice:
// store review and rollout normally take days, so only a client still behind
// this long after the release date is worth alerting.
export const UPDATE_NOTICE_GRACE_MS = 5 * 24 * 60 * 60 * 1000

// Pure, unit-tested. True when latest_version is valid, newer than the
// running version, and released at least the grace window ago. A missing or
// invalid release date never alerts: without it there is no way to tell a
// stuck client from a normal rollout in progress.
export const shouldShowUpdateNotice = (
    ownVersion: string,
    latestVersion: unknown,
    latestPublishedUtcMs: unknown,
    nowMs: number,
    graceMs: number = UPDATE_NOTICE_GRACE_MS,
): boolean => {
    if (!isValidVersion(latestVersion)) {
        return false
    }
    const published = Number(latestPublishedUtcMs)
    if (!published || !Number.isFinite(published)) {
        return false
    }
    if (compareVersions(ownVersion, latestVersion) >= 0) {
        return false
    }
    return nowMs - published >= graceMs
}

// The newer version the store should have delivered by now, or null when up
// to date, unknown, or still within the rollout grace window.
export const getPendingUpdateVersion = async (): Promise<string | null> => {
    try {
        const cache = await getCachedNews()
        const feed = cache?.feed
        const own = chrome.runtime.getManifest().version
        if (feed && shouldShowUpdateNotice(own, feed.latest_version, feed.latest_version_published_utc, Date.now())) {
            return feed.latest_version as string
        }
    } catch {
        /* ignored */
    }
    return null
}

export const getUnreadMessages = async (): Promise<NewsMessage[]> => {
    const [cache, readIds] = await Promise.all([getCachedNews(), getReadIds()])
    const feed = cache?.feed || emptyFeed()
    let ownVersion = ''
    try {
        ownVersion = chrome.runtime.getManifest().version
    } catch {
        /* ignored: no chrome in tests; empty version skips targeting */
    }
    const targeted = ownVersion ? filterMessagesForVersion(feed.messages, ownVersion) : feed.messages
    return targeted.filter(m => !readIds[m.id]).sort((a, b) => (b.published_utc || 0) - (a.published_utc || 0))
}

// Current remote state of a mechanism switch, from the cached feed. 'auto' when
// unset, unfetched, or unreadable — the caller falls back to its compiled default.
export const getRemoteMechanism = async (name: string): Promise<RemoteMechanismState> => {
    const cache = await getCachedNews()
    const value = cache?.feed?.options?.mechanisms?.[name]
    return value === 'on' || value === 'off' ? value : 'auto'
}

// Legacy-HTML host from the cached feed, else the compiled default. Lets the
// host move again without a store republish.
export const getRemoteLegacyHost = async (): Promise<string> => {
    const cache = await getCachedNews()
    const value = cache?.feed?.options?.legacy_host
    return (LEGACY_HOSTS as readonly string[]).includes(value || '') ? (value as string) : LEGACY_HOST_DEFAULT
}

// Resolution for a three-state mechanism switch, returning whether the mechanism
// is DISABLED: an explicit dev override wins, then the remote state ('off' →
// disabled, 'on' → enabled), then the compiled default. Pure, for testability.
export const resolveMechanismDisabled = (
    devOverride: boolean | null,
    remote: RemoteMechanismState,
    buildDefaultDisabled: boolean,
): boolean => {
    if (devOverride !== null) return devOverride
    if (remote === 'off') return true
    if (remote === 'on') return false
    return buildDefaultDisabled
}

// Fetch the feed with the 6h throttle. Silent on failure — missing/404 feed
// simply leaves the cache untouched so the popup shows no banner.
export const fetchNews = async (opts: { force?: boolean } = {}): Promise<void> => {
    const cache = await getCachedNews()
    const now = Date.now()
    if (!opts.force && cache && now - cache.lastFetched < MIN_FETCH_INTERVAL_MS) {
        return
    }
    try {
        const res = await fetch(NEWS_URL, { credentials: 'omit', cache: 'no-cache' })
        if (!res.ok) {
            dlog('news', `[reveddit] news fetch failed: ${res.status}`)
            return
        }
        const feed = (await res.json()) as NewsFeed
        if (!feed || !Array.isArray(feed.messages)) return
        // Only recognized mechanism values survive sanitization; anything else is
        // dropped so a typo in the served JSON degrades to 'auto', never to a flip.
        const mechanisms: Record<string, RemoteMechanismState> = {}
        const rawMechanisms = (feed.options as any)?.mechanisms
        if (rawMechanisms && typeof rawMechanisms === 'object') {
            for (const [name, value] of Object.entries(rawMechanisms)) {
                if (value === 'auto' || value === 'on' || value === 'off') {
                    mechanisms[name] = value
                }
            }
        }
        const sanitized: NewsFeed = {
            messages: feed.messages
                .filter(
                    m =>
                        m &&
                        typeof m.id === 'string' &&
                        typeof m.title === 'string' &&
                        typeof m.body_markdown === 'string',
                )
                .map(m => ({
                    id: m.id,
                    published_utc: Number(m.published_utc) || 0,
                    title: m.title,
                    body_markdown: m.body_markdown,
                    severity: m.severity,
                    ...(isValidVersion(m.min_version) ? { min_version: m.min_version } : {}),
                    ...(isValidVersion(m.max_version) ? { max_version: m.max_version } : {}),
                })),
            options: {
                mechanisms,
                ...((LEGACY_HOSTS as readonly string[]).includes((feed.options as any)?.legacy_host)
                    ? { legacy_host: (feed.options as any).legacy_host }
                    : {}),
            },
            ...(isValidVersion(feed.latest_version) ? { latest_version: feed.latest_version } : {}),
            ...(Number(feed.latest_version_published_utc) > 0
                ? { latest_version_published_utc: Number(feed.latest_version_published_utc) }
                : {}),
        }
        const newCache: NewsCache = { feed: sanitized, lastFetched: now }
        chrome.storage.local.set({ [NEWS_CACHE_KEY]: newCache })
        dlog(
            'news',
            `[reveddit] news fetch ok: ${sanitized.messages.length} messages, mechanisms=${JSON.stringify(mechanisms)}`,
        )
    } catch (err: any) {
        // Network failures are expected and the cached feed keeps working, but
        // record them — remote-gate staleness matters when reading a diag log.
        dlog('news', `[reveddit] news fetch error: ${String(err?.message || err)}`)
    }
}
