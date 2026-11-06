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
// Import-free: bridge.ts and requests.ts both import it.

export const LOGGED_IN_CACHE_MODES: RequestCache[] = ['default', 'no-cache']
// Feeds send max-age=3600, so a scan's read must never come from the browser's
// cache. On Chrome's wire no-store is the same as default (reddit.md).
export const SCAN_CACHE_MODES: RequestCache[] = ['no-store', 'no-cache']
const DOUBLE_BLOCK_MEMORY_MS = 5 * 60 * 1000
// Mutable for tests, like _wwwRouteTiming
export const _loggedInFetchState = { preferredCacheMode: 0, doubleBlockUntil: 0 }

// A resource's own 403 (private subreddit) is JSON; the edge's block page isn't
export const isBlockPage = (res: Response): boolean =>
    res.status === 403 && !/json/i.test(res.headers.get('content-type') || '')

export interface LoggedInFetchOptions {
    signal?: AbortSignal
    // Whether the retry may still go out (the bridge's deadline)
    canRetry?: () => boolean
    // Just before the retry goes out: the bridge counts it as a request
    onRetry?: () => unknown
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
    const modes = LOGGED_IN_CACHE_MODES
    const fetchIn = (mode: number) => fetchInMode(url, modes[mode], opts.signal)
    let mode = _loggedInFetchState.preferredCacheMode
    let response = await fetchIn(mode)
    let blockPage = isBlockPage(response)
    let retried = false
    if (blockPage && Date.now() >= _loggedInFetchState.doubleBlockUntil && (opts.canRetry?.() ?? true)) {
        const blockedMode = mode
        mode = (mode + 1) % modes.length
        opts.onRetry?.()
        retried = true
        response = await fetchIn(mode)
        blockPage = isBlockPage(response)
        if (!blockPage) {
            // Past the edge, whatever the resource said: keep this mode
            _loggedInFetchState.preferredCacheMode = mode
            opts.onSwitched?.(modes[blockedMode], modes[mode], response.status)
        } else {
            _loggedInFetchState.doubleBlockUntil = Date.now() + DOUBLE_BLOCK_MEMORY_MS
        }
    }
    return { response, blockPage, retried }
}

// A scan's read: one request. After a block page, the page sends a second try on
// a turn of its own, in the other mode, and a cancel can stop it. A block page may
// be about that one feed, so unlike above it says nothing about other requests.
export const fetchForScan = async (url: string, signal: AbortSignal, secondTry: boolean) => {
    const mode = (_loggedInFetchState.preferredCacheMode + (secondTry ? 1 : 0)) % SCAN_CACHE_MODES.length
    const response = await fetchInMode(url, SCAN_CACHE_MODES[mode], signal)
    const blockPage = isBlockPage(response)
    // Past the edge, whatever the resource said: keep this mode
    if (secondTry && !blockPage) _loggedInFetchState.preferredCacheMode = mode
    return { response, blockPage }
}
