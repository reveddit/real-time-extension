// Remote news feed + remote options fetched from reveddit.com. Lets us push
// messages — and adjust detection behavior — on installed extensions without
// shipping a new version (a store republish can take days). The feed starts
// empty; when messages are added, the popup renders them in a banner.

import { dlog } from './diaglog'
import { sanitizeChallengeConfig, setChallengeConfig, ChallengeConfig } from './challenge-config'
import { sanitizeMarkupConfig, setMarkupConfig, MarkupConfig } from './markup-config'
import { sanitizeWwwRouteOrder, WwwRouteOrderOption } from './www-routes'
import { sanitizePublicModlogsFeed, setPublicModlogsFeed } from './bridge-config'
import { sanitizeNameList } from './name-list'

export const NEWS_URL = 'https://www.reveddit.com/extension-news.json'
export const NEWS_CACHE_KEY = 'news_cache'
export const NEWS_READ_IDS_KEY = 'news_read_ids'
// Hourly, so a newly published version is noticed within the hour
// (requestStoreUpdateIfBehind, Chrome and Edge) and remote options reach every
// build within the hour. The feed is a small static file behind Cloudflare.
const MIN_FETCH_INTERVAL_MS = 60 * 60 * 1000
// After a failed fetch, so a feed outage doesn't mean a retry every minute
export const FAILED_FETCH_RETRY_MS = 10 * 60 * 1000
export const NEWS_FETCH_FAILED_AT_KEY = 'news_fetch_failed_at'

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
    // Solver inputs for the logged-out challenge page (challenge-config.ts):
    // { token_fields: string[], solution_regex: string }. Sanitized field by
    // field; stored in camelCase.
    challenge?: Partial<ChallengeConfig>
    // Order of the public-view fetch routes ('leg:cache' strings, see
    // www-routes.ts), per engine, with routes to skip:
    // { chrome: { order: [...], skip: [...] }, firefox: [...] } (Edge is
    // chrome). Listed routes go first, the built-in ones follow, and a
    // background route always stays. Only known routes survive sanitization.
    // (options.www_routes is 0.0.5.26's bare list, which this build ignores.)
    www_route_order?: WwwRouteOrderOption
    // The publicmodlogs feed token the bridge reads mod logs through
    // (bridge-config.ts), if reddit ever replaces it
    publicmodlogs_feed?: string
    // Extra id attribute names for the page classifiers (markup-config.ts):
    // { comment_id_attributes: string[], post_id_attributes: string[] }.
    // Added to the built-in names; stored in camelCase.
    markup?: Partial<MarkupConfig>
    // Names of reddit's login cookie, for the bridge's and grace mode's
    // logged-in check (requests.ts hasRedditLoginCookie), in case reddit
    // renames reddit_session.
    login_cookies?: string[]
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
// Safety valve for a comment-markup rename: when 'on', a feed-absent item that
// no page verified (verification off, or its page rendered the thread scaffold
// without the comment) is omitted instead of reported removed. Can only
// suppress alerts, never cause false ones. Default off: absence within
// coverage keeps counting as removed. Cached verdicts (6 h) are unaffected.
export const MECHANISM_ABSENT_UNVERIFIED_UNKNOWN = 'absentUnverifiedIsUnknown'

export interface NewsFeed {
    messages: NewsMessage[]
    options?: RemoteOptions
    // Latest published store version and its release date (epoch ms). Lets a
    // client notice that its browser has failed to apply an update for days
    // (see the 0.0.5.14 stuck-cohort incident, Aug 2026).
    latest_version?: string
    latest_version_published_utc?: number
    // Each store's live version. Stores review at different speeds, so a build
    // compares with its own store's entry to update as soon as that store
    // publishes, rather than waiting for latest_version, the minimum across
    // stores. Both are written by the website's scripts/sync-store-version.py.
    store_versions?: StoreVersions
}

export const STORES = ['chrome', 'edge', 'firefox'] as const
export type StoreVersions = Partial<Record<(typeof STORES)[number], string>>

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

export const UPDATE_CHECK_REQUESTED_KEY = 'update_check_requested_version'
export const UPDATE_CHECK_ASKED_AT_KEY = 'update_check_asked_at'
// How long before asking again for a version already asked for. The browser
// can answer no_update while the store's update service lags its listing (the
// feed reads Edge's listing), or throttled; asking once would end the faster
// update for that version.
export const UPDATE_CHECK_RETRY_MS = 3 * 3600 * 1000

// Pure, unit-tested. The version to ask the browser for: this store's version
// in the feed, when it is newer than the running version, and either newer
// than the last one asked for or asked for at least UPDATE_CHECK_RETRY_MS ago.
// Otherwise null.
export const storeUpdateToRequest = (
    ownVersion: string,
    storeVersion: unknown,
    lastRequested: unknown,
    lastAskedAtMs = 0,
    nowMs = Date.now(),
): string | null => {
    if (!isValidVersion(storeVersion) || compareVersions(ownVersion, storeVersion) >= 0) {
        return null
    }
    if (isValidVersion(lastRequested) && compareVersions(storeVersion, lastRequested) <= 0) {
        const sinceAsked = nowMs - lastAskedAtMs
        if (sinceAsked >= 0 && sinceAsked < UPDATE_CHECK_RETRY_MS) {
            return null
        }
    }
    return storeVersion
}

const getRequested = (): Promise<{ version: unknown; askedAt: number }> =>
    new Promise(resolve => {
        try {
            chrome.storage.local.get([UPDATE_CHECK_REQUESTED_KEY, UPDATE_CHECK_ASKED_AT_KEY], res => {
                resolve({
                    version: res && res[UPDATE_CHECK_REQUESTED_KEY],
                    askedAt: Number(res && res[UPDATE_CHECK_ASKED_AT_KEY]) || 0,
                })
            })
        } catch {
            resolve({ version: undefined, askedAt: 0 })
        }
    })

// When the cached feed shows a newer version in this build's store, ask the
// browser to check for updates now instead of on its own schedule (about every
// 5 hours in Chrome and Edge). The onUpdateAvailable listener in background.ts
// then applies the download right away. Chrome throttles extra checks to about
// one per update period, so this asks once per new version, and again only
// every UPDATE_CHECK_RETRY_MS while still behind. Firefox has no
// requestUpdateCheck; reveddit.com tells its users how to update by hand.
export const requestStoreUpdateIfBehind = async (): Promise<void> => {
    if (__STORE__ === 'firefox' || typeof chrome.runtime?.requestUpdateCheck !== 'function') {
        return
    }
    try {
        const [cache, requested] = await Promise.all([getCachedNews(), getRequested()])
        const own = chrome.runtime.getManifest().version
        const target = storeUpdateToRequest(
            own,
            cache?.feed?.store_versions?.[__STORE__],
            requested.version,
            requested.askedAt,
        )
        if (!target) {
            return
        }
        // Remembered before asking, so a worker that stops mid-check doesn't ask again
        await new Promise<void>(resolve =>
            chrome.storage.local.set(
                { [UPDATE_CHECK_REQUESTED_KEY]: target, [UPDATE_CHECK_ASKED_AT_KEY]: Date.now() },
                () => resolve(),
            ),
        )
        const result: any = await chrome.runtime.requestUpdateCheck()
        dlog(
            'news',
            `[reveddit] ${__STORE__} store has ${target}, running ${own}: update check ${result?.status ?? result}${
                result?.version ? ` (${result.version})` : ''
            }`,
        )
    } catch (err: any) {
        dlog('news', `[reveddit] update check error: ${String(err?.message || err)}`)
    }
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

// Push the cached feed's options into the modules that read them on every
// page (the challenge solver, the page classifiers, the bridge's mod-log
// guard). Called on service-worker start: the cache outlives the worker, the
// modules don't. The markup names are sanitized again, since any version's
// cache can be read here.
export const applyRemoteConfig = async (): Promise<void> => {
    const options: any = (await getCachedNews())?.feed?.options || {}
    setChallengeConfig(options.challenge || {})
    setMarkupConfig(sanitizeMarkupConfig(options.markup))
    setPublicModlogsFeed(options.publicmodlogs_feed || '')
}

// Legacy-HTML host from the cached feed, else the compiled default. Lets the
// host move again without a store republish.
export const getRemoteLegacyHost = async (): Promise<string> => {
    const cache = await getCachedNews()
    const value = cache?.feed?.options?.legacy_host
    return (LEGACY_HOSTS as readonly string[]).includes(value || '') ? (value as string) : LEGACY_HOST_DEFAULT
}

// Public-view fetch route order from the cached feed, per engine; empty when
// unset, and the caller keeps its built-in order. Sanitized again on read.
export const getRemoteWwwRouteOrder = async (): Promise<WwwRouteOrderOption> => {
    const cache = await getCachedNews()
    return sanitizeWwwRouteOrder(cache?.feed?.options?.www_route_order)
}

const COOKIE_NAME = /^[A-Za-z0-9_.-]{1,64}$/
export const sanitizeLoginCookies = (raw: unknown): string[] => sanitizeNameList(raw, COOKIE_NAME, 4)

// Methods reddit refused outright rest for a while, longer with each refusal
// in a row (requests.ts noteCapabilityRefused), keyed by name ('legacy',
// 'legacy_info', 'api_info'). Kept here so a feed change to the legacy host or switch can end
// the legacy rest at once: the new setting deserves a try.
export const CAPABILITY_REST_KEY = 'capability_rest'

// The login cookie names (requests.ts hasRedditLoginCookie): the feed's, else reddit_session
export const getRemoteLoginCookies = async (): Promise<string[]> => {
    const cache = await getCachedNews()
    const names = sanitizeLoginCookies(cache?.feed?.options?.login_cookies)
    return names.length ? names : ['reddit_session']
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

// Fetch the feed with the hourly throttle. Silent on failure — missing/404 feed
// simply leaves the cache untouched so the popup shows no banner.
export const fetchNews = async (opts: { force?: boolean } = {}): Promise<void> => {
    const cache = await getCachedNews()
    const now = Date.now()
    const age = cache ? now - cache.lastFetched : Infinity
    if (!opts.force && age >= 0 && age < MIN_FETCH_INTERVAL_MS) {
        return
    }
    const noteFailure = () => chrome.storage.local.set({ [NEWS_FETCH_FAILED_AT_KEY]: now })
    if (!opts.force) {
        const failedAt = await new Promise<number>(resolve => {
            try {
                chrome.storage.local.get([NEWS_FETCH_FAILED_AT_KEY], res =>
                    resolve(Number(res?.[NEWS_FETCH_FAILED_AT_KEY]) || 0),
                )
            } catch {
                resolve(0)
            }
        })
        if (now - failedAt >= 0 && now - failedAt < FAILED_FETCH_RETRY_MS) {
            return
        }
    }
    try {
        const res = await fetch(NEWS_URL, { credentials: 'omit', cache: 'no-cache' })
        if (!res.ok) {
            dlog('news', `[reveddit] news fetch failed: ${res.status}`)
            noteFailure()
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
        const challenge = sanitizeChallengeConfig((feed.options as any)?.challenge)
        const wwwRouteOrder = sanitizeWwwRouteOrder((feed.options as any)?.www_route_order)
        const markup = sanitizeMarkupConfig((feed.options as any)?.markup)
        const loginCookies = sanitizeLoginCookies((feed.options as any)?.login_cookies)
        const publicModlogsFeed = sanitizePublicModlogsFeed((feed.options as any)?.publicmodlogs_feed)
        const storeVersions: StoreVersions = {}
        const rawStoreVersions = (feed as any).store_versions
        if (rawStoreVersions && typeof rawStoreVersions === 'object') {
            for (const store of STORES) {
                if (isValidVersion(rawStoreVersions[store])) {
                    storeVersions[store] = rawStoreVersions[store]
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
                ...(Object.keys(challenge).length ? { challenge } : {}),
                ...(Object.keys(wwwRouteOrder).length ? { www_route_order: wwwRouteOrder } : {}),
                ...(Object.keys(markup).length ? { markup } : {}),
                ...(loginCookies.length ? { login_cookies: loginCookies } : {}),
                ...(publicModlogsFeed ? { publicmodlogs_feed: publicModlogsFeed } : {}),
            },
            ...(isValidVersion(feed.latest_version) ? { latest_version: feed.latest_version } : {}),
            ...(Number(feed.latest_version_published_utc) > 0
                ? { latest_version_published_utc: Number(feed.latest_version_published_utc) }
                : {}),
            ...(Object.keys(storeVersions).length ? { store_versions: storeVersions } : {}),
        }
        const newCache: NewsCache = { feed: sanitized, lastFetched: now }
        chrome.storage.local.set({ [NEWS_CACHE_KEY]: newCache })
        setChallengeConfig(challenge)
        setMarkupConfig(markup)
        setPublicModlogsFeed(publicModlogsFeed)
        // A new legacy host or switch ends a refusal rest at once
        const before = cache?.feed?.options
        if (
            cache &&
            (before?.legacy_host !== sanitized.options?.legacy_host ||
                before?.mechanisms?.[MECHANISM_LEGACY] !== mechanisms[MECHANISM_LEGACY])
        ) {
            chrome.storage.local.get([CAPABILITY_REST_KEY], res => {
                const rests = { ...(res?.[CAPABILITY_REST_KEY] || {}) }
                if (rests.legacy || rests.legacy_info) {
                    delete rests.legacy
                    delete rests.legacy_info
                    chrome.storage.local.set({ [CAPABILITY_REST_KEY]: rests })
                }
            })
        }
        dlog(
            'news',
            `[reveddit] news fetch ok: ${sanitized.messages.length} messages, mechanisms=${JSON.stringify(mechanisms)}` +
                (Object.keys(wwwRouteOrder).length ? `, www_route_order=${JSON.stringify(wwwRouteOrder)}` : '') +
                (Object.keys(markup).length ? `, markup=${JSON.stringify(markup)}` : '') +
                (publicModlogsFeed ? ', publicmodlogs_feed set' : ''),
        )
    } catch (err: any) {
        // Network failures are expected and the cached feed keeps working, but
        // record them — remote-gate staleness matters when reading a diag log.
        dlog('news', `[reveddit] news fetch error: ${String(err?.message || err)}`)
        noteFailure()
    }
}
