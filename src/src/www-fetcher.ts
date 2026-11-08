import { LOGIN_WALL_MESSAGE, loginWallLanding, isLoginWallPage } from './login-wall-config'
import {
    WwwRouteCache,
    WwwRoute,
    isWwwRoute,
    wwwRouteOrder,
    parseWwwRoute,
    publicViewInit,
    PUBLIC_VIEW_FETCH_INIT,
} from './www-routes'
import browser from 'webextension-polyfill'
import { isCaptchaPage, solveChallenge, isSolvedChallengeUrl, FetchHtml } from './parse_html/new'
import { getRemoteWwwRouteOrder } from './news'
import { dlog } from './diaglog'
import { WWW_FETCH_TIMEOUT_MS, withDeadline } from './logged-in-fetch'

declare const content: { fetch?: typeof fetch } | undefined

// How a route failed. Routing reads 'unavailable' (a leg that can't run isn't
// rested); how long a refused route rests comes from the status (6 h after a
// 403 block page, else 30 min). 'refused' and 'network' only label the log.
// The text keeps the 'request failed: N' shape flagIfRateLimited reads.
// - refused: reddit turned the route away (its 403 block page, the captcha, a
//   page the caller can't read, a challenge answered with another challenge)
// - network: no answer at all (a network error, or a stall the timeout ended)
// - unavailable: the tab legs can't run (no usable tab, injection refused)
// - login: reddit sent the fetch to its login page (login-wall-config.ts).
//   Every route is logged out alike, so no other route is tried and none rests.
type RouteFailure = 'refused' | 'network' | 'unavailable' | 'login'

class RouteError extends Error {
    constructor(
        message: string,
        readonly failure: RouteFailure,
        readonly status = 0,
    ) {
        super(message)
    }
}

const loginWallError = (where: string) => new RouteError(`${LOGIN_WALL_MESSAGE}: ${where}`, 'login')

// Checked before the status: the login page may answer with any of them
const throwIfLoginRedirect = (redirectedTo: unknown) => {
    const landing = typeof redirectedTo === 'string' && redirectedTo ? loginWallLanding(redirectedTo) : null
    if (landing) {
        throw loginWallError(`redirected to ${landing}`)
    }
}

// Rejects when the promise hasn't settled in WWW_FETCH_TIMEOUT_MS; an answer after that is ignored
export const withTimeout = async <T>(promise: Promise<T>, what: string): Promise<T> => {
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
        return await Promise.race([
            promise,
            new Promise<never>((_, reject) => {
                timer = setTimeout(
                    () => reject(new RouteError(`${what} timed out after ${WWW_FETCH_TIMEOUT_MS / 1000} s`, 'network')),
                    WWW_FETCH_TIMEOUT_MS,
                )
            }),
        ])
    } finally {
        clearTimeout(timer)
    }
}

// A tab that can answer a message or run an injected script. A discarded one
// (Chrome's Memory Saver unloads idle ones) has no page, and a frozen one may
// never answer, so both tab legs fail on them, likely the "Receiving end does
// not exist" and "Cannot access contents of the page" pair in issue #27's log.
export const canTabAnswer = (tab: { discarded?: boolean; frozen?: boolean }): boolean => !tab.discarded && !tab.frozen

// A tab on www.reddit.com or old.reddit.com, the subdomains user monitoring
// supports. Not one whose address is missing or won't parse.
export const isSupportedRedditTab = (tab: { url?: string }): boolean => {
    try {
        const { hostname } = new URL(tab.url!)
        return hostname === 'www.reddit.com' || hostname === 'old.reddit.com'
    } catch {
        return false
    }
}

// An HTTP failure from any leg. Reddit's block page comes with a 403, so that
// route was refused. Other statuses say nothing about the route (a 429 is rate
// limiting, which monitoring backs off from; a 404 is about the page), so they
// end the fetch.
const httpFailure = (status: number): Error => {
    const message = `www.reddit.com request failed: ${status}`
    return status === 403 ? new RouteError(message, 'refused', 403) : new Error(message)
}

const fetchWwwHtml_viaBackground = (url: string, cache: WwwRouteCache): Promise<string> =>
    withDeadline(WWW_FETCH_TIMEOUT_MS, async signal => {
        let response: Response
        try {
            response = await fetch(url, { ...publicViewInit(cache), signal })
        } catch (err: any) {
            throw new RouteError(`www.reddit.com request error: ${String(err?.message || err)}`, 'network')
        }
        throwIfLoginRedirect(response.redirected ? response.url : '')
        if (!response.ok) {
            throw httpFailure(response.status)
        }
        try {
            return await response.text()
        } catch (err: any) {
            throw new RouteError(`www.reddit.com response error: ${String(err?.message || err)}`, 'network')
        }
    })

// Fallback for a tab whose content script is orphaned (every extension update
// or reinstall severs content scripts in already-open tabs — issue #14's log
// showed "Receiving end does not exist" on each cycle): inject the fetch with
// scripting.executeScript instead. It runs same-origin inside the tab, so it
// keeps the challenge-free property the content-script path has. The injected
// function must be self-contained and must never reject — a rejected promise
// doesn't surface as an error consistently across browsers — so failures come
// back as a tagged object.
export const _fetchViaExecuteScript = async (
    tabId: number,
    url: string,
    init: RequestInit = PUBLIC_VIEW_FETCH_INIT,
): Promise<string> => {
    const scripting = (browser as any).scripting || (typeof chrome !== 'undefined' && (chrome as any).scripting)
    if (!scripting) {
        throw new RouteError('scripting API unavailable', 'unavailable')
    }
    let results: any[]
    try {
        results = (await withTimeout(
            scripting.executeScript({
                target: { tabId },
                func: async (u: string, init: RequestInit) => {
                    try {
                        // pageContextFetch, inlined: an injected function can't call out
                        const page =
                            typeof content !== 'undefined' && content && typeof content.fetch === 'function'
                                ? content
                                : null
                        const resp = await (page ? page.fetch!(u, init) : fetch(u, init))
                        return {
                            ok: resp.ok,
                            status: resp.status,
                            text: resp.ok ? await resp.text() : '',
                            redirectedTo: resp.redirected ? resp.url : '',
                        }
                    } catch (e) {
                        return { ok: false, status: 0, text: '', err: String(e) }
                    }
                },
                args: [url, init],
            }),
            'executeScript fetch',
        )) as any[]
    } catch (err: any) {
        // Injection itself failed: the tab closed or navigated, access was
        // refused, or a frozen tab never ran the script
        throw new RouteError(String(err?.message || err), 'unavailable')
    }
    const value = results && results[0] && results[0].result
    if (!value || typeof value.text !== 'string') {
        throw new RouteError('executeScript fetch returned no result', 'unavailable')
    }
    throwIfLoginRedirect(value.redirectedTo)
    if (!value.ok) {
        // Status 0: the injected fetch got no answer (a network error, or CORS
        // after the tab navigated to another origin). The route failed, not
        // the injection.
        if (!value.status) {
            throw new RouteError(`www.reddit.com tab request error: ${value.err || 'no answer'}`, 'network')
        }
        throw httpFailure(value.status)
    }
    return value.text
}

// Which route (www-routes.ts) makes a public-view fetch is learned, not fixed.
// A www.reddit.com tab's legs fetch same-origin: its content script, else a
// script injected into it. old.reddit.com and sh.reddit.com tabs cannot help,
// since content scripts follow the page's origin rules and cross-origin reads
// to www.reddit.com are CORS-blocked from them. The background reads www
// through host_permissions and gets the JS challenge on full pages, which
// parse_html/new.ts solves.
//
// Reddit's edge judges each leg's request headers separately and has reversed
// itself more than once, answering with the 190 KB "blocked by network
// security" 403 or the "Prove your humanity" captcha:
// - about 2026-09-14, Chrome: tab fetches (no cache headers) get the 403
// - 2026-10-17: background fetches get the 403 unless they send no-cache
//   headers (cache 'reload'), in Chrome and Firefox alike; Firefox's tab gets
//   the captcha with them and real pages without
// - 2026-10-21, Chrome: reversed in the background. 'reload' gets the 403 on
//   every solved page, /svc partial and legacy request, while 'no-store',
//   'default' and 'no-cache' read real pages. In the tab, 'default' gets the
//   403 or the captcha and 'no-cache' and 'reload' read real pages. Any route
//   still draws the odd captcha.
// Issue #27 was 0.0.5.25 still sending 'reload' from the background after
// that reversal, failing every lookup, while its tab legs failed too (likely
// a discarded tab).
//
// So a fetch tries routes in order. A refusal sends it to the next route and
// makes the refused route rest: six hours after a 403 (reddit's deliberate
// verdict on that request style), half an hour after a captcha, a network
// error or a page the caller can't read (often momentary). Routes that aren't
// resting go first, in order, so a route that never got a try (a tab route
// while no tab was open) is tried as soon as it can be, and a rested route
// gets its turn again on its own. When every route is resting, a fetch tries
// only the one that comes back soonest, so a client refused everywhere makes
// one request per page. A solved challenge's URL still works on the next route
// (verified 2026-10-21), so a refusal right after a solve costs one request,
// not a new challenge. Kinds of page keep separate memories, since reddit has
// refused them differently, and the memory survives restarts. Other failures
// (a 429, a 404) are about the client or the page, so they never switch
// routes. Nor does a login page (login-wall-config.ts): every route is logged
// out alike, so the fetch ends there, and that kind of page is fetched once an
// hour until one loads.
const WWW_PAGE_KINDS = ['profile', 'profile-partial', 'partial', 'page'] as const

type WwwPageKind = (typeof WWW_PAGE_KINDS)[number]

export const wwwPageKind = (url: string): WwwPageKind => {
    const path = url.replace(/^https?:\/\/[^/]+/, '')
    // A profile's tabs; a post in the profile (/user/<name>/comments/<post>/)
    // is a page like any other
    if (path.startsWith('/user/') && !/^\/user\/[^/]+\/comments\/[^/?#]+/.test(path)) {
        return 'profile'
    }
    if (path.startsWith('/svc/shreddit/profiles/')) {
        return 'profile-partial'
    }
    return path.startsWith('/svc/') ? 'partial' : 'page'
}

export const WWW_ROUTE_STATE_KEY = 'www_routes_v2'

// Earlier versions' route memory, removed when found
const OLD_ROUTE_STATE_KEYS = ['www_route_state', 'www_tab_refused_at']

export const WWW_HARD_REFUSAL_MS = 6 * 3600 * 1000

export const WWW_SOFT_REFUSAL_MS = 30 * 60 * 1000

// Pause before trying another route, so a refusal isn't answered with a burst
// (the captcha came in bursts during back-to-back requests, 2026-10-21).
// Mutable for tests, like _legacyLookups.
export const _wwwRouteTiming = { switchDelayMs: 500 }

// A route's last outcome for a kind of page: t is when it happened, and until
// (set only by a refusal) is when the route stops resting
interface RouteRecord {
    t: number
    until?: number
}

// A kind of page landing on reddit's login page: since is when that began, t
// the latest time, where what the log says about it. It holds until a page of
// the kind is served after t, and while it holds, a fetch of the kind goes out
// once an hour at most.
interface LoginWallRecord {
    since: number
    t: number
    where: string
}

interface KindState {
    routes: Partial<Record<WwwRoute, RouteRecord>>
    // The route that last served this kind of page
    served?: { route: WwwRoute; t: number }
    login?: LoginWallRecord
}

type WwwRouteState = Partial<Record<WwwPageKind, KindState>>

export const LOGIN_WALL_REST_MS = 60 * 60 * 1000

const loginWallOf = (own: KindState | undefined): LoginWallRecord | null =>
    own?.login && own.login.t > (own.served?.t || 0) ? own.login : null

// Stored state, kept to well-formed entries. A clock that ran ahead and was
// set back leaves times in the future; they're held to now, so a refusal
// never rests longer than the longest memory.
const readRouteState = (raw: any, now: number): WwwRouteState => {
    const state: WwwRouteState = {}
    for (const kind of WWW_PAGE_KINDS) {
        const stored = raw?.[kind]
        if (!stored || typeof stored !== 'object') {
            continue
        }
        const routes: KindState['routes'] = {}
        for (const [route, record] of Object.entries(stored.routes || {})) {
            const t = Number((record as any)?.t)
            if (!isWwwRoute(route) || !(t > 0)) {
                continue
            }
            const until = Number((record as any)?.until)
            routes[route] = {
                t: Math.min(t, now),
                ...(until > 0 && { until: Math.min(until, now + WWW_HARD_REFUSAL_MS) }),
            }
        }
        const servedT = Number(stored.served?.t)
        const loginT = Number(stored.login?.t)
        const loginSince = Number(stored.login?.since)
        state[kind] = {
            routes,
            ...(isWwwRoute(stored.served?.route) &&
                servedT > 0 && { served: { route: stored.served.route, t: Math.min(servedT, now) } }),
            ...(loginT > 0 &&
                loginSince > 0 &&
                typeof stored.login.where === 'string' && {
                    login: {
                        since: Math.min(loginSince, loginT, now),
                        t: Math.min(loginT, now),
                        where: stored.login.where.slice(0, 200),
                    },
                }),
        }
    }
    return state
}

// Another lookup's saved state merged into this one's, the newest record per
// route winning, so lookups that overlap don't undo each other's refusals
const mergeRouteState = (mine: WwwRouteState, theirs: WwwRouteState) => {
    for (const kind of WWW_PAGE_KINDS) {
        const other = theirs[kind]
        if (!other) {
            continue
        }
        const own = (mine[kind] ||= { routes: {} })
        for (const [route, record] of Object.entries(other.routes) as [WwwRoute, RouteRecord][]) {
            if (!own.routes[route] || own.routes[route]!.t < record.t) {
                own.routes[route] = record
            }
        }
        if (other.served && (!own.served || own.served.t < other.served.t)) {
            own.served = other.served
        }
        if (other.login && (!own.login || own.login.t < other.login.t)) {
            own.login = other.login
        }
    }
}

type PageVerdict = 'served' | 'step' | 'captcha' | 're-challenged' | 'login' | 'unrecognized'

// What a 200 from a route means. A page the caller accepts is served, whatever
// else it mentions: the wall tests come after. A challenge is a step toward
// the page, not proof the route reads pages, so it changes nothing; the same
// challenge in answer to an already-solved URL means the route rejected the
// solve. A login page served in place of the page asked for is known only by
// the news feed's markers.
const judgePage = (html: string, url: string, accept?: (html: string) => boolean): PageVerdict => {
    if (accept?.(html)) {
        return 'served'
    }
    if (isCaptchaPage(html)) {
        return 'captcha'
    }
    if (solveChallenge(html, url) !== null) {
        return isSolvedChallengeUrl(url) ? 're-challenged' : 'step'
    }
    if (accept && isLoginWallPage(html)) {
        return 'login'
    }
    return accept ? 'unrecognized' : 'served'
}

// What a route's refusal was, for the log: the HTTP status, else 'network'
// (unavailable legs are skipped, not logged)
const describeFailure = (err: RouteError): string => String(err.status || 'network')

// The copied log's header line: each kind of page that lands on reddit's login
// page, since when and where it landed
export const getLoginWallLine = async (): Promise<string> => {
    try {
        const now = Date.now()
        const stored = ((await browser.storage.local.get({ [WWW_ROUTE_STATE_KEY]: null })) as any)[WWW_ROUTE_STATE_KEY]
        const state = readRouteState(stored, now)
        const walls = WWW_PAGE_KINDS.flatMap(kind => {
            const wall = loginWallOf(state[kind])
            return wall
                ? [
                      `${kind} pages since ${new Date(wall.since).toISOString()}, ` +
                          `last ${new Date(wall.t).toISOString()} (${wall.where})`,
                  ]
                : []
        })
        return `login wall: ${walls.length ? walls.join('; ') : 'none seen'}`
    } catch {
        return 'login wall: unknown'
    }
}

// Whether reddit asks for a login on any of these kinds of page, until one of
// them loads again
export const isLoginWalled = async (kinds: WwwPageKind[]): Promise<boolean> => {
    try {
        const stored = ((await browser.storage.local.get({ [WWW_ROUTE_STATE_KEY]: null })) as any)[WWW_ROUTE_STATE_KEY]
        const state = readRouteState(stored, Date.now())
        return kinds.some(kind => !!loginWallOf(state[kind]))
    } catch {
        return false
    }
}

interface WwwHtmlFetcher {
    fetchHtml: FetchHtml
    // The route that last served each kind of page, for the lookup's log line
    servedRoutes: () => Partial<Record<WwwPageKind, WwwRoute>>
}

export const getWwwHtmlFetcher = async (): Promise<WwwHtmlFetcher> => {
    let tabs: any[] = []
    try {
        if (typeof chrome !== 'undefined' && chrome.tabs) {
            tabs = await browser.tabs.query({ url: ['https://www.reddit.com/*'] })
        }
    } catch {
        /* no tabs API in this context */
    }
    const tab = tabs.find(t => t.id != null && canTabAnswer(t))
    let contentScriptAlive = !!tab
    let injectionUsable = !!tab
    const tabUsable = () => contentScriptAlive || injectionUsable

    let state: WwwRouteState = {}
    try {
        const stored = (await browser.storage.local.get([WWW_ROUTE_STATE_KEY, ...OLD_ROUTE_STATE_KEYS])) as any
        state = readRouteState(stored[WWW_ROUTE_STATE_KEY], Date.now())
        if (OLD_ROUTE_STATE_KEYS.some(key => stored[key] !== undefined)) {
            await browser.storage.local.remove(OLD_ROUTE_STATE_KEYS)
        }
    } catch {
        /* ignored */
    }
    const order = wwwRouteOrder(await getRemoteWwwRouteOrder().catch(() => ({})))
    let dirty = false
    const saveState = async () => {
        if (!dirty) {
            return
        }
        dirty = false
        try {
            const stored = ((await browser.storage.local.get({ [WWW_ROUTE_STATE_KEY]: null })) as any)[
                WWW_ROUTE_STATE_KEY
            ]
            mergeRouteState(state, readRouteState(stored, Date.now()))
            await browser.storage.local.set({ [WWW_ROUTE_STATE_KEY]: state })
        } catch {
            /* ignored */
        }
    }
    const kindState = (kind: WwwPageKind): KindState => (state[kind] ||= { routes: {} })

    // Rejects with Reddit's HTTP failure when the tab got one, and with an
    // 'unavailable' RouteError when neither tab leg can run.
    const fetchViaTab = async (url: string, cache: WwwRouteCache): Promise<string> => {
        if (contentScriptAlive) {
            let response: any
            try {
                response = await withTimeout(
                    browser.tabs.sendMessage(tab.id, { action: 'fetch-www-profile-public', url, cache }),
                    'content-script fetch',
                )
            } catch (err: any) {
                response = undefined
                // No receiver (the tab predates the extension's install or
                // update, so its content script is orphaned) or no answer in
                // time. Logged because this transition decides which leg
                // produced every page — without it, "tab open but still
                // unknown" can't distinguish a dead tab leg from Reddit
                // serving the tab's same-origin fetches unreadable pages
                // (issue #14, 2nd paste).
                dlog(
                    'feed',
                    '[reveddit] content-script www fetch failed, trying an injected fetch:',
                    String(err?.message || err),
                )
            }
            if (response === undefined) {
                contentScriptAlive = false
            } else {
                // The content script answered, so Reddit answered the tab. The
                // injected fetch would make the same request and get the same
                // answer.
                throwIfLoginRedirect(response?.redirectedTo)
                if (response?.success && typeof response.html === 'string') {
                    return response.html
                }
                const status = Number(response?.status)
                if (status) {
                    throw httpFailure(status)
                }
                throw new RouteError(`www.reddit.com tab request error: ${response?.error || 'no answer'}`, 'network')
            }
        }
        if (injectionUsable) {
            try {
                return await _fetchViaExecuteScript(tab.id, url, publicViewInit(cache))
            } catch (err: any) {
                if (!(err instanceof RouteError) || err.failure !== 'unavailable') {
                    throw err
                }
                // Injection itself unavailable (tab closed/navigated mid-cycle,
                // API missing): no tab route is tried again this lookup.
                injectionUsable = false
                dlog('feed', '[reveddit] executeScript fetch unavailable, skipping tab routes:', err.message)
            }
        }
        throw new RouteError('www tab fetch unavailable', 'unavailable')
    }

    const fetchOnRoute = (route: WwwRoute, url: string): Promise<string> => {
        const { leg, cache } = parseWwwRoute(route)
        return leg === 'tab' ? fetchViaTab(url, cache) : fetchWwwHtml_viaBackground(url, cache)
    }

    const noteRefusal = (kind: WwwPageKind, route: WwwRoute, err: RouteError) => {
        const now = Date.now()
        kindState(kind).routes[route] = {
            t: now,
            until: now + (err.status === 403 ? WWW_HARD_REFUSAL_MS : WWW_SOFT_REFUSAL_MS),
        }
        dirty = true
    }
    // A served page also ends the kind's login wall: served moves past it
    const noteServed = (kind: WwwPageKind, route: WwwRoute, refused: string[]) => {
        const own = kindState(kind)
        const now = Date.now()
        const wall = loginWallOf(own)
        if (own.routes[route]?.until) {
            own.routes[route] = { t: now }
            dirty = true
        }
        if (own.served?.route !== route || wall) {
            const changed = own.served?.route !== route
            own.served = { route, t: now }
            dirty = true
            if (wall) {
                dlog(
                    'feed',
                    `[reveddit] www ${kind} pages load logged out again, after asking for a login since ` +
                        new Date(wall.since).toISOString(),
                )
            }
            if (changed) {
                dlog(
                    'feed',
                    `[reveddit] www route for ${kind} pages is now ${route}` +
                        (refused.length ? ` (refused: ${refused.join(', ')})` : ''),
                )
            }
        }
    }
    const noteLoginWall = (kind: WwwPageKind, route: WwwRoute, err: RouteError) => {
        const own = kindState(kind)
        const now = Date.now()
        const ongoing = loginWallOf(own)
        const where = err.message.replace(`${LOGIN_WALL_MESSAGE}: `, '')
        own.login = { since: ongoing?.since || now, t: now, where }
        dirty = true
        if (!ongoing) {
            dlog(
                'feed',
                `[reveddit] www ${kind} pages ask for a login (${route}: ${where}); no other route is tried, ` +
                    `and ${kind} pages are fetched once an hour until one loads`,
            )
        }
    }

    const failureLogged = new Set<WwwPageKind>()
    const fetchKind = async (kind: WwwPageKind, url: string, accept?: (html: string) => boolean) => {
        const routes = kindState(kind).routes
        const now = Date.now()
        const wall = loginWallOf(state[kind])
        if (wall && now - wall.t < LOGIN_WALL_REST_MS) {
            throw new RouteError(
                `${LOGIN_WALL_MESSAGE}: ${wall.where}, since ${new Date(wall.since).toISOString()} ` +
                    `(next try after ${new Date(wall.t + LOGIN_WALL_REST_MS).toISOString()})`,
                'login',
            )
        }
        const restingUntil = (route: WwwRoute) => routes[route]?.until || 0
        const usable = order.filter(route => !route.startsWith('tab:') || tabUsable())
        // Resting routes follow the rest, soonest back first. All stay
        // fallbacks, since one may turn out unable to run (a tab route with
        // its tab gone), but only the first that sends a request is tried.
        const resting = new Set(usable.filter(route => restingUntil(route) > now))
        const candidates = [
            ...usable.filter(route => !resting.has(route)),
            ...[...resting].sort((a, b) => restingUntil(a) - restingUntil(b)),
        ]
        const refused: string[] = []
        let failure: RouteError | null = null
        let unreadable: string | null = null
        let restingTried = false
        try {
            for (const route of candidates) {
                if (route.startsWith('tab:') && !tabUsable()) {
                    continue
                }
                if (resting.has(route)) {
                    if (restingTried) {
                        break
                    }
                }
                if (refused.length && _wwwRouteTiming.switchDelayMs > 0) {
                    await new Promise(r => setTimeout(r, _wwwRouteTiming.switchDelayMs))
                }
                let html: string
                try {
                    html = await fetchOnRoute(route, url)
                } catch (err: any) {
                    if (!(err instanceof RouteError)) {
                        throw err
                    }
                    if (err.failure === 'unavailable') {
                        continue
                    }
                    if (err.failure === 'login') {
                        noteLoginWall(kind, route, err)
                        throw err
                    }
                    restingTried ||= resting.has(route)
                    noteRefusal(kind, route, err)
                    refused.push(`${route} ${describeFailure(err)}`)
                    // A 403 decides what the whole fetch reports
                    if (!failure || (err.status === 403 && failure.status !== 403)) {
                        failure = err
                    }
                    continue
                }
                restingTried ||= resting.has(route)
                const verdict = judgePage(html, url, accept)
                if (verdict === 'step') {
                    return html
                }
                if (verdict === 'served') {
                    noteServed(kind, route, refused)
                    return html
                }
                if (verdict === 'login') {
                    const err = loginWallError('served a login page in place of the page asked for')
                    noteLoginWall(kind, route, err)
                    throw err
                }
                const err = new RouteError(`www.reddit.com request refused: ${verdict}`, 'refused')
                noteRefusal(kind, route, err)
                refused.push(`${route} ${verdict}`)
                if (verdict === 'unrecognized') {
                    unreadable = html
                }
                failure ||= err
            }
        } finally {
            await saveState()
        }
        if (refused.length > 1 && !failureLogged.has(kind)) {
            failureLogged.add(kind)
            dlog(
                'feed',
                `[reveddit] every www route tried for ${kind} pages failed (${refused.join(', ')}); ` +
                    `refused routes rest ${WWW_SOFT_REFUSAL_MS / 60000} min, or ${WWW_HARD_REFUSAL_MS / 3600000} h after a 403`,
            )
        }
        // A page no route could read goes back to the caller, which says why
        if (unreadable !== null) {
            return unreadable
        }
        if (!failure) {
            throw new RouteError('no www fetch route available', 'unavailable')
        }
        throw new RouteError(`${failure.message} (refused: ${refused.join(', ')})`, failure.failure, failure.status)
    }

    // One fetch at a time per kind of page, so the comments and posts feeds
    // (fetched in parallel) don't both try a refused route, and each fetch
    // starts from what the one before it learned. The queue keeps only the
    // settled outcome, not the page.
    const queues: Partial<Record<WwwPageKind, Promise<unknown>>> = {}
    const fetchHtml: FetchHtml = (url, accept) => {
        const kind = wwwPageKind(url)
        const run = (queues[kind] || Promise.resolve()).then(() => fetchKind(kind, url, accept))
        queues[kind] = run.then(
            () => undefined,
            () => undefined,
        )
        return run
    }
    return {
        fetchHtml,
        servedRoutes: () =>
            Object.fromEntries(
                WWW_PAGE_KINDS.filter(kind => state[kind]?.served).map(kind => [kind, state[kind]!.served!.route]),
            ),
    }
}
