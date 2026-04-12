// Remote news feed fetched from reveddit.com. Lets us push messages to
// installed extensions without shipping a new version. The feed starts
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

export interface NewsFeed {
  messages: NewsMessage[]
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
  return feed.messages
    .filter(m => !readIds[m.id])
    .sort((a, b) => (b.published_utc || 0) - (a.published_utc || 0))
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
    const sanitized: NewsFeed = {
      messages: feed.messages
        .filter(
          m =>
            m &&
            typeof m.id === 'string' &&
            typeof m.title === 'string' &&
            typeof m.body_markdown === 'string'
        )
        .map(m => ({
          id: m.id,
          published_utc: Number(m.published_utc) || 0,
          title: m.title,
          body_markdown: m.body_markdown,
          severity: m.severity,
        })),
    }
    const newCache: NewsCache = { feed: sanitized, lastFetched: now }
    chrome.storage.local.set({ [NEWS_CACHE_KEY]: newCache })
  } catch {
    // Silent — network failures are expected and cached feed keeps working.
  }
}
