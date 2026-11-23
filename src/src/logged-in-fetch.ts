// A fetch with the user's reddit login, shared by the bridge and the
// background's own logged-in reads (followed items, the login
// check, the user's listing, scans), so all learn which request style reddit's
// edge lets through.
//
// Reddit's edge refuses some request-header combinations with its HTML block
// page and accepts others, and it reversed which on 2026-10-21 (www-routes.ts).
// A block page, unlike a resource's own JSON 403, gets one retry in the other
// cache mode, and the mode that answers is kept. After both modes got the block
// page, the retry is skipped for a while, or until that kind gets through, so a
// blocked client doesn't send every request twice. Both are kept per kind of
// request, as reddit has refused one kind (api/info) while the rest answered.
//
// It imports none of the extension's own modules: bridge.ts, requests.ts,
// www-fetcher.ts, followed-lookup.ts, reddit-auth.ts, viewer.ts and
// request-gates.ts import it.
import browser from 'webextension-polyfill'

export const LOGGED_IN_CACHE_MODES: RequestCache[] = ['default', 'no-cache']
// Feeds send max-age=3600, so a scan's read must never come from the browser's
// cache, and nor may the login check or the user's listing. On Chrome's wire
// no-store is the same as default (reddit.md).
export const UNCACHED_MODES: RequestCache[] = ['no-store', 'no-cache']
const DOUBLE_BLOCK_MEMORY_MS = 5 * 60 * 1000

// A cache entry still within its time to live; a time in the future (a clock
// set back) counts as expired
export const isFresh = (t: number, ttl: number, now: number): boolean => now - t >= 0 && now - t < ttl

// A request's kind: its host and path, with any user, subreddit, thread and
// query left out. The host counts, as the login check asks old.reddit.com too.
export const requestKind = (url: string): string =>
    url
        .replace(/^https?:\/\//, '')
        .split('?')[0]
        .replace(/\/(user|r)\/[^/.]+/, '/$1/_')
        .replace(/\/comments\/[^.]+/, '/comments/_')

// Per kind of request: the mode that last got past the edge after a block page,
// by name, and when both modes of a list last got the block page (a time it
// happened, so a clock put right can't stretch it). A kind with no mode of its
// own starts in the latest one learned, where its list has it, since reddit has
// refused a request style across every kind at once. Mutable for tests, like
// _wwwRouteTiming.
interface FetchState {
    preferredCacheMode: Record<string, RequestCache>
    latestMode?: RequestCache
    doubleBlockAt: Record<string, number>
    // How many double blocks in a row each list has had
    doubleBlockRun: Record<string, number>
}
const freshState = (): FetchState => ({
    preferredCacheMode: {},
    latestMode: undefined,
    doubleBlockAt: {},
    doubleBlockRun: {},
})
export const _loggedInFetchState = freshState()
export const _resetLoggedInFetchState = () => Object.assign(_loggedInFetchState, freshState())
// A double block is kept per list of modes too: the user's listing and the
// bridge's profile reads are one kind with different lists, and Firefox's
// no-store isn't its default on the wire (reddit.md)
const doubleBlockKey = (kind: string, modes: RequestCache[]) => `${kind} ${modes.join(',')}`
// The retry is skipped for 5 minutes after a double block, twice as long after
// each one in a row, up to an hour: while reddit refuses every style, the login
// check would otherwise send a refused retry every 5 minutes for as long as that
// lasts (issue #28)
const DOUBLE_BLOCK_MAX_MS = 60 * 60 * 1000
const doubleBlockMemoryMs = (run = 1) =>
    Math.min(DOUBLE_BLOCK_MEMORY_MS * 2 ** Math.max(0, run - 1), DOUBLE_BLOCK_MAX_MS)
const forgetDoubleBlock = (key: string) => {
    delete _loggedInFetchState.doubleBlockAt[key]
    delete _loggedInFetchState.doubleBlockRun[key]
}

// Session storage, which outlives Chrome's worker. Only the worker, the one
// context with no window, uses it. A page's reads go out with the page's own
// headers, so what they learn mustn't reach the worker's: the popup's follow
// switch still reads from the popup. Firefox's background page keeps its
// memory. Chrome 101 has none.
export const workerSession = () => (typeof window === 'undefined' ? browser.storage.session : undefined)
// The state is kept there, so the worker, which stops between requests, doesn't
// spend a refused request learning a mode again. It's read once, before the
// worker's first request.
const STATE_KEY = 'logged_in_fetch'
let loaded: Promise<void> | undefined
const loadState = () =>
    (loaded ??= (async () => {
        const stored: Record<string, any> | undefined = await workerSession()
            ?.get(STATE_KEY)
            .catch(() => undefined)
        Object.assign(_loggedInFetchState, stored?.[STATE_KEY])
    })())
const keepState = () =>
    workerSession()
        ?.set({ [STATE_KEY]: _loggedInFetchState })
        .catch(() => {})
// Past the edge after a block page, whatever the resource said: keep this mode
const learn = (kind: string, modes: RequestCache[], mode: RequestCache) => {
    _loggedInFetchState.preferredCacheMode[kind] = _loggedInFetchState.latestMode = mode
    forgetDoubleBlock(doubleBlockKey(kind, modes))
    keepState()
}
const firstMode = (kind: string, modes: RequestCache[]): RequestCache =>
    [_loggedInFetchState.preferredCacheMode[kind], _loggedInFetchState.latestMode].find(
        mode => mode && modes.includes(mode),
    ) ?? modes[0]
// Each list has two modes
const otherOf = (modes: RequestCache[], mode: RequestCache) => (mode === modes[0] ? modes[1] : modes[0])

// A resource's own 403 (private subreddit) is JSON; the edge's block page isn't
export const isBlockPage = (res: Response): boolean =>
    res.status === 403 && !/json/i.test(res.headers.get('content-type') || '')

interface LoggedInFetchOptions {
    signal?: AbortSignal
    // The two cache modes to try, LOGGED_IN_CACHE_MODES unless given
    modes?: RequestCache[]
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
    const modes = opts.modes ?? LOGGED_IN_CACHE_MODES
    const kind = requestKind(url)
    const doubleBlock = doubleBlockKey(kind, modes)
    await loadState()
    const first = firstMode(kind, modes)
    let response = await fetchInMode(url, first, opts.signal)
    let blockPage = isBlockPage(response)
    let retried = false
    // The resource's own JSON answer (or a feed's XML), whatever its status, got
    // through. Not a page such as me.json's challenge: its solved request is the
    // same kind, and each check's challenge would reopen the retry that request
    // gets refused in.
    if (!blockPage && /json|xml/i.test(response.headers?.get?.('content-type') || '')) {
        if (doubleBlock in _loggedInFetchState.doubleBlockAt) {
            forgetDoubleBlock(doubleBlock)
            keepState()
        }
    }
    // Skipped for a kind with no mode of its own too, unlike in viewer.ts: its
    // retry would double the refused me.json reads the login check makes every
    // cycle (issue #28)
    const doubleBlocked = isFresh(
        _loggedInFetchState.doubleBlockAt[doubleBlock],
        doubleBlockMemoryMs(_loggedInFetchState.doubleBlockRun[doubleBlock]),
        Date.now(),
    )
    if (blockPage && !doubleBlocked && (opts.canRetry?.() ?? true)) {
        const other = otherOf(modes, first)
        opts.onRetry?.()
        retried = true
        response = await fetchInMode(url, other, opts.signal)
        blockPage = isBlockPage(response)
        if (!blockPage) {
            learn(kind, modes, other)
            opts.onSwitched?.(first, other, response.status)
        } else {
            _loggedInFetchState.doubleBlockAt[doubleBlock] = Date.now()
            _loggedInFetchState.doubleBlockRun[doubleBlock] = (_loggedInFetchState.doubleBlockRun[doubleBlock] || 0) + 1
            keepState()
        }
    }
    return { response, blockPage, retried }
}

// A scan's read: one request. After a block page it names the other mode for a
// second try, which the page sends on a turn of its own, where a cancel can stop
// it. That's always offered: another kind's double block says nothing about
// feeds, and a feed's may be about that one feed, so none is kept. The page stops
// asking in a click that saw both modes refused.
export const fetchForScan = async (url: string, signal: AbortSignal, secondTryMode?: RequestCache) => {
    const kind = requestKind(url)
    await loadState()
    const mode = secondTryMode ?? firstMode(kind, UNCACHED_MODES)
    const response = await fetchInMode(url, mode, signal)
    const blockPage = isBlockPage(response)
    if (secondTryMode && !blockPage) learn(kind, UNCACHED_MODES, mode)
    return { response, blockPage, otherMode: blockPage && !secondTryMode ? otherOf(UNCACHED_MODES, mode) : undefined }
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
