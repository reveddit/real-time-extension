// The token reddit publishes subreddit mod logs to u/publicmodlogs under, and
// the only feed the bridge reads a mod log through (bridge.ts
// validateBridgeUrl). It's the website's (website api/reddit
// u_publicmodlogs_feed). The news feed can replace it (options
// publicmodlogs_feed) if reddit ever issues a new one. Import-free: news.ts
// and bridge.ts both import it.
export const DEFAULT_PUBLICMODLOGS_FEED = '7e9b27126097f51ae6c9cd5b049af34891da6ba6'
const FEED_TOKEN = /^[0-9a-f]{40}$/

let current = DEFAULT_PUBLICMODLOGS_FEED

export const getPublicModlogsFeed = (): string => current

// '' unless the value is a well-formed token
export const sanitizePublicModlogsFeed = (raw: unknown): string =>
    typeof raw === 'string' && FEED_TOKEN.test(raw) ? raw : ''

export const setPublicModlogsFeed = (token: string) => {
    current = sanitizePublicModlogsFeed(token) || DEFAULT_PUBLICMODLOGS_FEED
}
