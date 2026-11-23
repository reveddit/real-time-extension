// Reddit's rate limiting, the one failure every request loop stops on and
// monitoring backs off from. Other statuses are about a route or a page.
export const isRateLimitError = (err: any): boolean => /request failed: 429\b/.test(String(err?.message || err))

export const newReddit = 'https://www.reddit.com'
