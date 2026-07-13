// Remote news feed + remote options fetched from reveddit.com. Lets us push
// messages — and adjust detection behavior — on installed extensions without
// shipping a new version (a store republish can take days). The feed starts
// empty; when messages are added, the popup renders them in a banner.

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
}

// Remote options: an optional "options" block in the same JSON. Each mechanism
// switch is three-state — 'auto' (compiled default decides), 'on' (force-enable),
// 'off' (force-disable). Anything missing or malformed resolves to 'auto', so a
// feed outage or bad edit can never break detection.
export type RemoteMechanismState = 'auto' | 'on' | 'off'
export interface RemoteOptions {
    mechanisms: Record<string, RemoteMechanismState>
}
// The unauthenticated legacy paths (old.reddit HTML, unauth www .json). Flip to
// 'off' once Reddit's deprecation actually lands, to stop the doomed attempts.
export const MECHANISM_LEGACY = 'legacyOldReddit'

export interface NewsFeed {
    messages: NewsMessage[]
    options?: RemoteOptions
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

export const getUnreadMessages = async (): Promise<NewsMessage[]> => {
    const [cache, readIds] = await Promise.all([getCachedNews(), getReadIds()])
    const feed = cache?.feed || emptyFeed()
    return feed.messages.filter(m => !readIds[m.id]).sort((a, b) => (b.published_utc || 0) - (a.published_utc || 0))
}

// Current remote state of a mechanism switch, from the cached feed. 'auto' when
// unset, unfetched, or unreadable — the caller falls back to its compiled default.
export const getRemoteMechanism = async (name: string): Promise<RemoteMechanismState> => {
    const cache = await getCachedNews()
    const value = cache?.feed?.options?.mechanisms?.[name]
    return value === 'on' || value === 'off' ? value : 'auto'
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
        if (!res.ok) return
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
                })),
            options: { mechanisms },
        }
        const newCache: NewsCache = { feed: sanitized, lastFetched: now }
        chrome.storage.local.set({ [NEWS_CACHE_KEY]: newCache })
    } catch {
        // Silent — network failures are expected and cached feed keeps working.
    }
}
