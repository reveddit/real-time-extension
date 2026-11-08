// A fetch with the user's reddit login, shared by the bridge and the
// background's own logged-in reads (followed items, pending posts), so both
// learn which request style reddit's edge lets through.
//
// Reddit's edge refuses some request-header combinations with its HTML block
// page and accepts others, and it reversed which on 2026-10-21 (www-routes.ts).
// A block page, unlike a resource's own JSON 403, gets one retry in the other
// cache mode, and the mode that answers is kept for this worker's life. After
// both modes got the block page, the retry is skipped for a while, so a
// blocked client doesn't send every request twice.
//
// Import-free: bridge.ts, requests.ts, www-fetcher.ts, followed-lookup.ts,
// monitoring.ts, viewer.ts and parse_html/old.ts import it.

export const LOGGED_IN_CACHE_MODES: RequestCache[] = ['default', 'no-cache']
// Feeds send max-age=3600, so a scan's read must never come from the browser's
// cache. On Chrome's wire no-store is the same as default (reddit.md).
const SCAN_CACHE_MODES: RequestCache[] = ['no-store', 'no-cache']
const DOUBLE_BLOCK_MEMORY_MS = 5 * 60 * 1000
// Mutable for tests, like _wwwRouteTiming
export const _loggedInFetchState = { preferredCacheMode: 0, doubleBlockUntil: 0 }

// A resource's own 403 (private subreddit) is JSON; the edge's block page isn't
export const isBlockPage = (res: Response): boolean =>
    res.status === 403 && !/json/i.test(res.headers.get('content-type') || '')

interface LoggedInFetchOptions {
    signal?: AbortSignal
    // Whether the retry may still go out (the bridge's deadline)
    canRetry?: () => boolean
    // Just before the retry goes out: the bridge counts it as a request
    onRetry?: () => void
    // The other mode got past the edge after a block page
    onSwitched?: (blocked: RequestCache, answered: RequestCache, status: number) => void
}

const fetchInMode = (url: string, cache: RequestCache, signal?: AbortSignal) =>
    fetch(url, { credentials: 'include', cache, headers: { 'Accept-Language': 'en' }, signal })

// blockPage: the answer is still the edge's block page. retried: both modes
// got it in this request (rather than the retry being skipped), which is what
// a caller can count as reddit refusing the request outright.
export const fetchLoggedIn = async (
    url: string,
    opts: LoggedInFetchOptions = {},
): Promise<{ response: Response; blockPage: boolean; retried: boolean }> => {
    const fetchIn = (mode: number) => fetchInMode(url, LOGGED_IN_CACHE_MODES[mode], opts.signal)
    let mode = _loggedInFetchState.preferredCacheMode
    let response = await fetchIn(mode)
    let blockPage = isBlockPage(response)
    let retried = false
    if (blockPage && Date.now() >= _loggedInFetchState.doubleBlockUntil && (opts.canRetry?.() ?? true)) {
        const blockedMode = mode
        mode = (mode + 1) % LOGGED_IN_CACHE_MODES.length
        opts.onRetry?.()
        retried = true
        response = await fetchIn(mode)
        blockPage = isBlockPage(response)
        if (!blockPage) {
            // Past the edge, whatever the resource said: keep this mode
            _loggedInFetchState.preferredCacheMode = mode
            opts.onSwitched?.(LOGGED_IN_CACHE_MODES[blockedMode], LOGGED_IN_CACHE_MODES[mode], response.status)
        } else {
            _loggedInFetchState.doubleBlockUntil = Date.now() + DOUBLE_BLOCK_MEMORY_MS
        }
    }
    return { response, blockPage, retried }
}

// A scan's read: one request. After a block page it names the mode for a second
// try, which the page sends on a turn of its own, where a cancel can stop it. A
// block page may be about that one feed, so unlike above it says nothing about
// other requests.
export const fetchForScan = async (url: string, signal: AbortSignal, secondTryMode?: number) => {
    const isSecondTry = secondTryMode !== undefined
    const mode = secondTryMode ?? _loggedInFetchState.preferredCacheMode
    const response = await fetchInMode(url, SCAN_CACHE_MODES[mode], signal)
    const blockPage = isBlockPage(response)
    // Past the edge, whatever the resource said: keep this mode
    if (isSecondTry && !blockPage) _loggedInFetchState.preferredCacheMode = mode
    const retry = blockPage && !isSecondTry && Date.now() >= _loggedInFetchState.doubleBlockUntil
    return { response, blockPage, otherMode: retry ? (mode + 1) % SCAN_CACHE_MODES.length : undefined }
}

// A fetch, tab message or injected script that never settles (a stalled
// response, a frozen tab) is given up on, so one stall can't hang a lookup
export const WWW_FETCH_TIMEOUT_MS = 20 * 1000

// Runs a request under a deadline: its signal aborts after ms, and the timer
// ends when run does. Whatever run awaits is inside the deadline, so a caller
// that reads the body in run has the body under it too.
export const withDeadline = async <T>(ms: number, run: (signal: AbortSignal) => Promise<T>): Promise<T> => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), ms)
    try {
        return await run(controller.signal)
    } finally {
        clearTimeout(timer)
    }
}

// A JSON read with the user's login from the background, through the bridge's
// fetch (logged-in-fetch.ts: the cache mode that gets past reddit's edge, one
// retry in the other mode on its block page). Timed out like the public-view
// fetches, since the monitoring cycle waits for it.
interface LoggedInJson {
    ok: boolean
    status: number
    // the answer was the edge's block page; refused: in both cache modes
    blocked: boolean
    refused: boolean
    json?: any
}

export const fetchJsonLoggedIn = (url: string): Promise<LoggedInJson> =>
    withDeadline(WWW_FETCH_TIMEOUT_MS, async signal => {
        try {
            const { response, blockPage, retried } = await fetchLoggedIn(url, { signal })
            if (blockPage) {
                return { ok: false, status: 403, blocked: true, refused: retried }
            }
            if (!response.ok) {
                return { ok: false, status: response.status, blocked: false, refused: false }
            }
            return { ok: true, status: response.status, blocked: false, refused: false, json: await response.json() }
        } catch {
            return { ok: false, status: 0, blocked: false, refused: false }
        }
    })
