// What a login wall looks like to the public-view (logged-out) fetches. Reddit
// said on 2026-10-29 that it will become "a primarily logged-in experience",
// tested first in some markets outside the U.S., and old.reddit.com has sent
// logged-out requests to /login/?reason=lor2 since 2026-08-31. A public-view
// fetch that lands on a login page is a login wall: never a removal, and not a
// refusal of the route that made it, since every route is logged out alike.
//
// paths: where a redirect lands, as path prefixes on any reddit.com host.
// markers: text that identifies a login page served in place of the page asked
// for, with no redirect. Markers are read only on pages the caller couldn't
// read, so a "Log In" button on an ordinary page can't trip them. None are
// built in: nobody has seen reddit's wall on www yet.
// The news feed (options.login_wall) adds to both without a store release; the
// built-in paths always stay.
//
// Imports only name-list.ts, which is import-free: news.ts, requests.ts,
// www-fetcher.ts and parse_html/new.ts import this module.
import { sanitizeNameList } from './name-list'

export interface LoginWallConfig {
    paths: string[]
    markers: string[]
}

const DEFAULT_LOGIN_WALL_CONFIG: LoginWallConfig = {
    paths: ['/login', '/account/login', '/register', '/account/register'],
    markers: [],
}

const PATH = /^\/[A-Za-z0-9_/-]{1,63}$/
// Printable ASCII: markup and phrases, nothing that needs escaping in a log
const MARKER = /^[\x20-\x7e]{6,120}$/

let current: LoginWallConfig = {
    paths: [...DEFAULT_LOGIN_WALL_CONFIG.paths],
    markers: [...DEFAULT_LOGIN_WALL_CONFIG.markers],
}

// Accepts the feed's untrusted object; anything malformed is ignored field by
// field. A path keeps no trailing slash, so '/login/' and '/login' are one.
const withoutTrailingSlash = (value: unknown) => (typeof value === 'string' ? value.replace(/\/+$/, '') : value)

export const sanitizeLoginWallConfig = (raw: any): Partial<LoginWallConfig> => {
    const out: Partial<LoginWallConfig> = {}
    if (raw && typeof raw === 'object') {
        const paths = sanitizeNameList(Array.isArray(raw.paths) ? raw.paths.map(withoutTrailingSlash) : [], PATH, 8)
        const markers = sanitizeNameList(raw.markers, MARKER, 4)
        if (paths.length) out.paths = paths
        if (markers.length) out.markers = markers
    }
    return out
}

export const setLoginWallConfig = (partial: Partial<LoginWallConfig>) => {
    current = {
        paths: [...new Set([...(partial.paths || []), ...DEFAULT_LOGIN_WALL_CONFIG.paths])],
        markers: [...new Set([...(partial.markers || []), ...DEFAULT_LOGIN_WALL_CONFIG.markers])],
    }
}

// Where a redirect landed, for the log, when that's a login page: its path and
// its reason parameter (old.reddit's is lor2). Never the rest of the query,
// which carries the URL asked for, and so the username. null otherwise.
export const loginWallLanding = (url: string): string | null => {
    let parsed: URL
    try {
        parsed = new URL(url)
    } catch {
        return null
    }
    if (!/(^|\.)reddit\.com$/i.test(parsed.hostname)) {
        return null
    }
    const path = parsed.pathname.replace(/\/+$/, '') || '/'
    if (!current.paths.some(p => path === p || path.startsWith(p + '/'))) {
        return null
    }
    const reason = parsed.searchParams.get('reason')
    return parsed.pathname + (reason && /^[A-Za-z0-9_-]{1,24}$/.test(reason) ? `?reason=${reason}` : '')
}

export const isLoginWallPage = (html: string): boolean => current.markers.some(marker => html.includes(marker))

// Every login-wall error message starts with this, so callers that only see a
// message (getPublicProfileItems, the fallback chain) can tell
export const LOGIN_WALL_MESSAGE = 'www.reddit.com asks for a login'
export const isLoginWallMessage = (text: unknown): boolean => String(text ?? '').includes(LOGIN_WALL_MESSAGE)
