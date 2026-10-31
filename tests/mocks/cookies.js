// A fake of the browser's cookies API over one in-memory jar, keyed by domain,
// path and name the way a browser keys cookies. cookies.set follows the rules
// the tests rely on: no domain makes a host-only cookie, no expiry a session
// cookie, and it resolves with the cookie it set.
import { vi } from 'vitest'

export const COOKIE_EXPIRES = 2000000000

// A cookie as the cookies API returns it
export const cookie = (name, value, extra = {}) => ({
    name,
    value,
    domain: '.reddit.com',
    path: '/',
    secure: true,
    httpOnly: true,
    hostOnly: false,
    sameSite: 'no_restriction',
    session: false,
    expirationDate: COOKIE_EXPIRES,
    storeId: '0',
    ...extra,
})

export const jar = new Map()
export const cookieKey = c => `${c.domain}|${c.path}|${c.name}`
export const fill = cookies => {
    jar.clear()
    for (const c of cookies) jar.set(cookieKey(c), { ...c })
}
export const find = name => [...jar.values()].find(c => c.name === name)

export const cookiesApi = {
    getAll: vi.fn(async ({ domain }) => [...jar.values()].filter(c => c.domain.replace(/^\./, '').endsWith(domain))),
    get: vi.fn(async ({ name, url }) => {
        const { hostname } = new URL(url)
        return [...jar.values()].find(c => c.name === name && hostname.endsWith(c.domain.replace(/^\./, ''))) || null
    }),
    remove: vi.fn(async ({ url, name }) => {
        const { hostname, pathname } = new URL(url)
        for (const [k, c] of jar) {
            if (c.name === name && c.domain.replace(/^\./, '') === hostname && c.path === pathname) jar.delete(k)
        }
    }),
    set: vi.fn(async d => {
        const { hostname } = new URL(d.url)
        const c = {
            name: d.name,
            value: d.value,
            domain: d.domain ?? hostname,
            path: d.path || '/',
            secure: !!d.secure,
            httpOnly: !!d.httpOnly,
            hostOnly: d.domain === undefined,
            sameSite: d.sameSite ?? 'unspecified',
            session: !d.expirationDate,
            ...(d.expirationDate && { expirationDate: d.expirationDate }),
            storeId: d.storeId,
        }
        jar.set(cookieKey(c), c)
        return c
    }),
}
