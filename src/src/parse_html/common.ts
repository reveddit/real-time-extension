import { getRemoteLegacyHost, LEGACY_HOST_DEFAULT } from '../news'

// consume() from https://qwtel.com/posts/software/how-to-use-htmlrewriter-for-web-scraping/
// also handy: https://blog.csdn.net/wk3368/article/details/129483898

export const consume = async (stream: ReadableStream) => {
    const reader = stream.getReader()
    while (!(await reader.read()).done) {
        /* NOOP */
    }
}

// Reddit's rate limiting, the one failure every request loop stops on and
// monitoring backs off from. Other statuses are about a route or a page.
export const isRateLimitError = (err: any): boolean => /request failed: 429\b/.test(String(err?.message || err))

export const oldReddit = 'https://old.reddit.com'
export const newReddit = 'https://www.reddit.com'

// Base URL for reddit's legacy (pre-Shreddit) HTML, fetched logged out. On
// 2026-08-31 old.reddit.com started 302ing logged-out requests to /login
// (reason=lor2), but www.reddit.com still runs the same renderer for
// legacy-only routes such as /api/info?id= with no login and no JS challenge,
// so the legacy parsers keep working with just the host swapped. The host is
// remotely adjustable via the news feed (news.ts legacy_host) so the next move
// needs no store republish.
// Legacy user and post pages on www need the redesign_optout cookie or the
// Shreddit challenge comes back instead. The extension can't set a Cookie
// header from fetch(), so background.ts injects it (DNR on Chrome/Edge,
// webRequest on Firefox) on background requests carrying this query marker.
// /api/info needs no cookie and carries no marker.
export const LEGACY_PAGE_MARKER = 'rv_legacy=1'
export const legacyPageUrl = (base: string, path: string): string =>
    base + path + (path.includes('?') ? '&' : '?') + LEGACY_PAGE_MARKER
// The marker as a whole query parameter: the Firefox header rule tests URLs
// with the predicate, and Chrome's DNR rule matches the same pattern (RE2)
export const LEGACY_PAGE_MARKER_PATTERN = '[?&]' + LEGACY_PAGE_MARKER + '(&|$)'
const LEGACY_PAGE_MARKER_REGEX = new RegExp(LEGACY_PAGE_MARKER_PATTERN)
export const isLegacyPageUrl = (url: string): boolean => LEGACY_PAGE_MARKER_REGEX.test(url)
// Since 2026-10-28 www answers every legacy page with that challenge, cookie or
// not, and solving it brings the Shreddit page (checked 2026-10-29 on posts and
// user pages, every cache mode). A legacy page that is the challenge means
// reddit refuses the legacy pages, not that the page is empty: callers rest
// them, as after a 403, and try again later.
export const LEGACY_CHALLENGE_SELECTOR = 'input[name="js_challenge"]'
export const isLegacyChallengeHtml = (html: string): boolean => /<input[^>]*\bname="js_challenge"/.test(html)
export const LEGACY_REFUSED_ERROR = 'challenge page: reddit refuses legacy pages'

export const getLegacyBase = async (): Promise<string> => {
    try {
        return 'https://' + (await getRemoteLegacyHost())
    } catch {
        return 'https://' + LEGACY_HOST_DEFAULT
    }
}

// old.reddit serves logged-out pages with Cache-Control: private, max-age=3600.
// Without 'reload', polls re-read the disk cache and a removal can go unseen for
// up to an hour (until the id list changes or the entry expires).
export const redditHTMLRequestOptions: RequestInit = {
    headers: {
        'Accept-Language': 'en',
        Cookie: 'over18=1;',
        'User-Agent': 'extension',
    },
    cache: 'reload',
}

export const REDDIT_HTML_FETCH_TIMEOUT_MS = 15000

// fetch() never times out on its own; a stalled old.reddit response would hang
// the pending-post loop indefinitely (a "stuck scanning" cause). Abort after a
// bounded time so the loop always makes progress.
export const fetchWithTimeout = async (
    url: string,
    options: Parameters<typeof fetch>[1] = {},
    timeoutMs: number = REDDIT_HTML_FETCH_TIMEOUT_MS,
): Promise<Response> => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
        return await fetch(url, { ...options, signal: controller.signal })
    } finally {
        clearTimeout(timer)
    }
}

export class ErrorCollector {
    errors: Record<string, number>
    url: string
    constructor(url: string) {
        this.errors = {}
        this.url = url
    }
    addError(error_name: string) {
        this.errors[error_name] = (this.errors[error_name] || 0) + 1
    }
    printErrors() {
        for (const [field, numErrors] of Object.entries(this.errors)) {
            if (numErrors) {
                console.error('ERROR:', '[' + field + ']', numErrors, 'times on', this.url)
            }
        }
    }
}
