// Routes for public-view (logged-out) www.reddit.com fetches. A route is where
// the fetch runs (the extension's background, or a www.reddit.com tab) plus the
// fetch cache mode it uses, written 'leg:cache' (e.g. 'background:no-store') so
// it can be stored, logged and set from the news feed as is. The cache mode
// decides which cache headers go out, and the browsers differ. From Chrome's
// service worker (2026-10-21): 'default' and 'no-store' send none, 'no-cache'
// sends Cache-Control: max-age=0, 'reload' sends Pragma and Cache-Control:
// no-cache. Firefox follows the Fetch spec, under which 'no-store' sends the
// same two headers as 'reload'; its routes use 'default' for no headers.
// getWwwHtmlFetcher (requests.ts) explains why no route is fixed.
//
// Kept import-free: news.ts and requests.ts both import it.

export const WWW_ROUTE_LEGS = ['background', 'tab'] as const
export type WwwLeg = (typeof WWW_ROUTE_LEGS)[number]
export const WWW_ROUTE_CACHE_MODES = ['default', 'no-store', 'no-cache', 'reload'] as const
export type WwwRouteCache = (typeof WWW_ROUTE_CACHE_MODES)[number]
export type WwwRoute = `${WwwLeg}:${WwwRouteCache}`

export const isWwwRouteCache = (value: unknown): value is WwwRouteCache =>
    (WWW_ROUTE_CACHE_MODES as readonly unknown[]).includes(value)

export const isWwwRoute = (value: unknown): value is WwwRoute => {
    if (typeof value !== 'string') {
        return false
    }
    const [leg, cache, ...rest] = value.split(':')
    return rest.length === 0 && (WWW_ROUTE_LEGS as readonly string[]).includes(leg) && isWwwRouteCache(cache)
}

export const parseWwwRoute = (route: WwwRoute): { leg: WwwLeg; cache: WwwRouteCache } => {
    const [leg, cache] = route.split(':') as [WwwLeg, WwwRouteCache]
    return { leg, cache }
}

// The order routes are tried in, best first by the last measurements: Chrome's
// (the Edge build is the same) on 2026-10-21, Firefox's on 2026-10-17.
const ROUTES_CHROME: readonly WwwRoute[] = [
    'background:no-store',
    'background:no-cache',
    'tab:no-cache',
    'tab:reload',
    'background:reload',
    'tab:default',
]
const ROUTES_FIREFOX: readonly WwwRoute[] = [
    'tab:default',
    'background:reload',
    'background:no-cache',
    'background:default',
    'tab:reload',
    'tab:no-cache',
]

type Engine = 'chrome' | 'firefox'
const engine = (): Engine =>
    typeof __BUILT_FOR__ !== 'undefined' && __BUILT_FOR__ === 'firefox' ? 'firefox' : 'chrome'

// A fresh copy each time, so no caller can reorder the built-in list
export const defaultWwwRoutes = (): WwwRoute[] => [...(engine() === 'firefox' ? ROUTES_FIREFOX : ROUTES_CHROME)]

// The news feed's options.www_route_order, per browser engine (Edge is
// 'chrome'): routes to try first, and routes to skip.
//   { chrome: { order: [...], skip: [...] }, firefox: [...] }
// A bare list is an order with nothing skipped. 0.0.5.26 reads a bare list
// under options.www_routes, for every engine; this build ignores that key, so
// the feed can set both without one version misreading the other's.
export interface WwwRouteOrderEntry {
    order: WwwRoute[]
    skip: WwwRoute[]
}
export type WwwRouteOrderOption = Partial<Record<Engine, WwwRouteOrderEntry>>

// Known routes only, each once, so a bad edit can neither name a route that
// doesn't exist nor repeat one
const cleanRouteList = (raw: unknown): WwwRoute[] => (Array.isArray(raw) ? [...new Set(raw.filter(isWwwRoute))] : [])

export const sanitizeWwwRouteOrder = (raw: unknown): WwwRouteOrderOption => {
    const option: WwwRouteOrderOption = {}
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        return option
    }
    for (const name of ['chrome', 'firefox'] as const) {
        const value = (raw as any)[name]
        const entry: WwwRouteOrderEntry = Array.isArray(value)
            ? { order: cleanRouteList(value), skip: [] }
            : { order: cleanRouteList(value?.order), skip: cleanRouteList(value?.skip) }
        if (entry.order.length || entry.skip.length) {
            option[name] = entry
        }
    }
    return option
}

// The order this build tries routes in: the feed's order for its engine
// first, then the built-in routes it leaves out, less the ones it skips. No
// edit can leave a client without a background route: the tab routes need a
// www.reddit.com tab, which most users don't keep open.
export const wwwRouteOrder = (remote: WwwRouteOrderOption = {}): WwwRoute[] => {
    const { order = [], skip = [] } = remote[engine()] || {}
    const all = [...order, ...defaultWwwRoutes().filter(route => !order.includes(route))]
    const kept = all.filter(route => !skip.includes(route))
    if (!kept.some(route => route.startsWith('background:'))) {
        const background = all.find(route => route.startsWith('background:'))
        if (background) {
            kept.push(background)
        }
    }
    return kept
}
