// Routes for public-view (logged-out) www.reddit.com fetches. A route is where
// the fetch runs (the extension's background, or a www.reddit.com tab) plus the
// fetch cache mode it uses, written 'leg:cache' (e.g. 'background:no-store') so
// it can be stored, logged and set from the news feed as is. The cache mode
// decides which cache headers go out; from Chrome's service worker
// (2026-10-21): 'default' and 'no-store' send none, 'no-cache' sends
// Cache-Control: max-age=0, 'reload' sends Pragma and Cache-Control: no-cache.
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

// The order routes are tried in until one serves the page, best first by the
// last measurements: Chrome's (the Edge build is the same) on 2026-10-21,
// Firefox's on 2026-10-17. Routes left out are tried only if the news feed
// lists them.
const ROUTES_CHROME: WwwRoute[] = [
    'background:no-store',
    'background:no-cache',
    'tab:no-cache',
    'tab:reload',
    'background:reload',
    'tab:default',
]
const ROUTES_FIREFOX: WwwRoute[] = [
    'tab:default',
    'background:reload',
    'background:no-cache',
    'background:no-store',
    'tab:reload',
    'tab:no-cache',
]
export const defaultWwwRoutes = (): WwwRoute[] =>
    typeof __BUILT_FOR__ !== 'undefined' && __BUILT_FOR__ === 'firefox' ? [...ROUTES_FIREFOX] : [...ROUTES_CHROME]

// For the news feed's options.www_routes: known routes only, each once, so a
// bad edit can neither name a route that doesn't exist nor repeat one.
export const sanitizeWwwRoutes = (raw: unknown): WwwRoute[] => {
    if (!Array.isArray(raw)) {
        return []
    }
    const routes: WwwRoute[] = []
    for (const r of raw) {
        if (isWwwRoute(r) && !routes.includes(r)) {
            routes.push(r)
        }
    }
    return routes
}
