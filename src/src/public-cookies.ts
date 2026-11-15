// The cookies of the extension's logged-out ("public view") reads, kept the
// way a logged-out browser keeps them, and apart from the user's own.
//
// Since 2026-11-11 reddit refuses a profile's older pages (its "load more"
// partials) to a logged-out request that carries no cookies, while a
// logged-out browser reads them all: it sends back what reddit gave it.
// Verified 2026-11-15 in a logged-out tab: the same request got a 200 with
// the tab's cookies and the 403 block page without, and token_v2, which
// reddit hands any visitor that lacks one, was the cookie it needed. The
// public-view fetches leave the browser's cookies off (www-routes.ts
// PUBLIC_VIEW_FETCH_INIT), since the user's own would make them the author's
// view.
//
// So the extension keeps a jar of its own: what reddit sets in its answers to
// the public-view requests, read through webRequest, which sees the
// Set-Cookie headers no page and no fetch() does. The cookies go back on
// those requests only, through a header rule, as the second account's do
// (viewer.ts): declarativeNetRequest on Chrome and Edge, webRequest on
// Firefox (header-rules.ts). A request is one of them when its URL carries
// the jar's secret marker (rv_public=<token>), whichever route sent it: the
// background, or the content script or injected fetch in a www.reddit.com
// tab. The requests omit credentials, so reddit's answers never reach the
// browser's own cookies, and nothing here reads them.
//
// Nothing here names a cookie: one reddit adds, renames or gives another
// lifetime is kept, expired and sent the way its answer says. A profile page
// refused with the jar on every route empties it, and the next answers fill
// it again. The news feed's publicViewCookies switch turns it all off.
//
// The background holds the jar and is its only writer. The popup's lookups
// read the token from storage to mark their requests, and the background's
// listener takes in their answers. Chrome and Edge's incognito copy
// (incognito: 'split') shares the storage, so it keeps no jar and marks
// nothing. No cookie value goes into the diagnostic log from here.
import browser from 'webextension-polyfill'
import { dlog } from './diaglog'
import { getRemoteMechanism, MECHANISM_PUBLIC_COOKIES } from './news'
import { readLocal } from './request-gates'
import {
    StoredCookie,
    isExpired,
    wwwCookieHeader,
    markedUrl,
    markerPattern,
    isMarkedUrl,
    newMarkerToken,
    inIncognitoContext,
} from './viewer'

export const PUBLIC_COOKIES_KEY = 'public_view_cookies'
export const PUBLIC_COOKIES_RULE_ID = 9006
const MARKER_NAME = 'rv_public'
const MARKER_REGEX = new RegExp(`[?&]${MARKER_NAME}=[0-9a-f]{32}(&|$)`)
// Far more than reddit sets, so a flood of new names can't grow the jar
const MAX_COOKIES = 50

// settleMs: how long a fetch waits for its answer's cookies to reach the jar
// and the rule, so the next request carries them. saveDelayMs: how long a
// save waits for more answers, since reddit replaces a cookie in nearly every
// one; the rule and Firefox's listener use the jar in memory at once.
// Mutable for tests, like _wwwRouteTiming.
export const _publicCookieTiming = { settleMs: 1500, saveDelayMs: 2000 }

export interface PublicJar {
    token: string
    cookies: StoredCookie[]
}

const isJar = (raw: any): raw is PublicJar =>
    !!raw && typeof raw.token === 'string' && /^[0-9a-f]{32}$/.test(raw.token) && Array.isArray(raw.cookies)

// RFC 6265's default path: the request's path up to its last slash
const defaultPath = (pathname: string): string => {
    const last = pathname.lastIndexOf('/')
    return last > 0 ? pathname.slice(0, last) : '/'
}

// A Set-Cookie header's cookie as a browser keeps it from an answer to url, or
// null for one a browser ignores: no name, or a domain the answer's host isn't
// in. A cookie dated in the past (Max-Age 0, an old Expires) comes back
// expired, which only removes the one it replaces.
export const parseSetCookie = (line: string, url: string, nowSec = Date.now() / 1000): StoredCookie | null => {
    let host: string
    let pathname: string
    try {
        ;({ hostname: host, pathname } = new URL(url))
    } catch {
        return null
    }
    const [pair, ...attributes] = line.split(';')
    const eq = pair.indexOf('=')
    const name = pair.slice(0, eq).trim()
    if (eq < 0 || !name) {
        return null
    }
    const cookie: StoredCookie = {
        name,
        value: pair.slice(eq + 1).trim(),
        domain: host,
        path: defaultPath(pathname),
        secure: false,
        httpOnly: false,
        hostOnly: true,
    }
    let maxAge: number | undefined
    let expires: number | undefined
    for (const attribute of attributes) {
        const at = attribute.indexOf('=')
        const key = (at < 0 ? attribute : attribute.slice(0, at)).trim().toLowerCase()
        const value = at < 0 ? '' : attribute.slice(at + 1).trim()
        if (key === 'domain' && value) {
            const domain = value.replace(/^\./, '').toLowerCase()
            if (!domain.includes('.') || (host !== domain && !host.endsWith('.' + domain))) {
                return null
            }
            cookie.domain = '.' + domain
            cookie.hostOnly = false
        } else if (key === 'path' && value.startsWith('/')) {
            cookie.path = value
        } else if (key === 'max-age' && /^-?\d+$/.test(value)) {
            maxAge = Number(value)
        } else if (key === 'expires') {
            const t = Date.parse(value)
            if (!Number.isNaN(t)) {
                expires = t / 1000
            }
        } else if (key === 'secure') {
            cookie.secure = true
        } else if (key === 'httponly') {
            cookie.httpOnly = true
        }
    }
    // Max-Age wins over Expires. A date in the past is kept as 1, since an
    // expiry of 0 reads as none.
    const expirationDate = maxAge !== undefined ? nowSec + maxAge : expires
    if (expirationDate !== undefined) {
        cookie.expirationDate = Math.max(1, expirationDate)
    }
    return cookie
}

// The jar after an answer's Set-Cookie headers, as a browser keeps it: a
// cookie replaces the one with its name, domain and path, an expired one only
// removes it, and cookies past their expiry drop out
export const withSetCookies = (
    cookies: StoredCookie[],
    lines: string[],
    url: string,
    nowSec = Date.now() / 1000,
): StoredCookie[] => {
    let jar = cookies.filter(c => !isExpired(c, nowSec))
    for (const line of lines) {
        const cookie = parseSetCookie(line, url, nowSec)
        if (!cookie) {
            continue
        }
        jar = jar.filter(c => c.name !== cookie.name || c.domain !== cookie.domain || c.path !== cookie.path)
        if (!isExpired(cookie, nowSec)) {
            jar.push(cookie)
        }
    }
    return jar.slice(-MAX_COOKIES)
}

// An answer's Set-Cookie lines as webRequest gives them: a header each on
// Chrome, joined by newlines on Firefox
export const setCookieLines = (headers: { name: string; value?: string }[] | undefined): string[] =>
    (headers || [])
        .filter(h => String(h.name).toLowerCase() === 'set-cookie')
        .flatMap(h => String(h.value || '').split('\n'))
        .filter(line => line.trim())

// A URL some public-view fetch marked, whatever its token
export const isPublicViewUrl = (url: string): boolean => MARKER_REGEX.test(url)

// --- The background's jar ---

// This context holds the jar: the background, once installPublicCookies ran
let holder = false
let jar: PublicJar | null = null
let loading: Promise<void> | null = null
const load = () =>
    (loading ||= readLocal<any>(PUBLIC_COOKIES_KEY, null).then(raw => {
        if (isJar(raw)) {
            jar = { token: raw.token, cookies: raw.cookies }
        }
    }))

let saveTimer: ReturnType<typeof setTimeout> | undefined
const saveNow = async () => {
    clearTimeout(saveTimer)
    saveTimer = undefined
    try {
        if (jar) {
            await browser.storage.local.set({ [PUBLIC_COOKIES_KEY]: jar })
        } else {
            await browser.storage.local.remove(PUBLIC_COOKIES_KEY)
        }
    } catch {
        /* the jar in memory still serves this worker */
    }
}
const saveSoon = () => {
    saveTimer ||= setTimeout(saveNow, _publicCookieTiming.saveDelayMs)
}

// Chrome and Edge: the rule that puts the jar's cookies on GETs carrying its
// marker. Unlike the second account's, it has no tabIds condition, since the
// tab routes fetch from inside a www.reddit.com tab: the secret marker keeps
// it to the extension's own requests. Made again from the jar whenever the
// jar changes, one at a time. Firefox does this in header-rules.ts.
const installRule = async () => {
    if (typeof __BUILT_FOR__ !== 'undefined' && __BUILT_FOR__ !== 'chrome') {
        return
    }
    const dnr = (globalThis as any).chrome?.declarativeNetRequest
    if (!dnr?.updateSessionRules) {
        return
    }
    const header = jar ? wwwCookieHeader(jar.cookies) : ''
    try {
        await dnr.updateSessionRules({
            removeRuleIds: [PUBLIC_COOKIES_RULE_ID],
            addRules:
                jar && header
                    ? [
                          {
                              id: PUBLIC_COOKIES_RULE_ID,
                              priority: 3,
                              action: {
                                  type: 'modifyHeaders',
                                  requestHeaders: [{ header: 'cookie', operation: 'set', value: header }],
                              },
                              condition: {
                                  regexFilter: markerPattern(MARKER_NAME, jar.token),
                                  resourceTypes: ['xmlhttprequest', 'other'],
                                  requestMethods: ['get'],
                              },
                          },
                      ]
                    : [],
        })
    } catch (e: any) {
        console.log('[reveddit] logged-out cookie rule not installed:', String(e?.message || e))
    }
}
let ruling: Promise<void> = Promise.resolve()
const updateRule = (): Promise<void> => (ruling = ruling.then(installRule))

// When each marked URL's latest answer was taken in, so a fetch can wait for
// its own
const answered = new Map<string, number>()
const waiting = new Set<{ key: string; done: () => void }>()
const urlKey = (url: string): string => {
    try {
        return new URL(url).href
    } catch {
        return url
    }
}
const noteAnswered = (url: string) => {
    const key = urlKey(url)
    answered.delete(key)
    answered.set(key, Date.now())
    if (answered.size > 100) {
        answered.delete(answered.keys().next().value!)
    }
    for (const waiter of [...waiting]) {
        if (waiter.key === key) {
            waiter.done()
        }
    }
}

const takeAnswer = async (details: { url?: string; responseHeaders?: { name: string; value?: string }[] }) => {
    await load()
    const url = String(details.url || '')
    if (jar && isMarkedUrl(MARKER_NAME, url, jar.token)) {
        const lines = setCookieLines(details.responseHeaders)
        const before = jar.cookies
        const cookies = lines.length ? withSetCookies(before, lines, url) : before
        if (JSON.stringify(cookies) !== JSON.stringify(before)) {
            jar = { token: jar.token, cookies }
            saveSoon()
            await updateRule()
            if (!before.length && cookies.length) {
                dlog(
                    'feed',
                    `[reveddit] logged-out reads now send back the cookies reddit gives them (${cookies.map(c => c.name).join(', ')})`,
                )
            }
        }
    }
    noteAnswered(url)
}

// The background's part, called synchronously at its top level, so the
// listener is in place before the worker's first await. It sees only marked
// requests: every other request the user's reddit tabs make passes it by.
export const installPublicCookies = () => {
    const webRequest = (browser as any).webRequest
    if (inIncognitoContext() || !webRequest?.onHeadersReceived) {
        return
    }
    holder = true
    const onChrome = typeof __BUILT_FOR__ !== 'undefined' && __BUILT_FOR__ === 'chrome'
    webRequest.onHeadersReceived.addListener(
        (details: any) => {
            takeAnswer(details).catch(() => {})
        },
        { urls: [`https://www.reddit.com/*${MARKER_NAME}=*`] },
        // Chrome shows Set-Cookie only with extraHeaders, which Firefox doesn't take
        onChrome ? ['responseHeaders', 'extraHeaders'] : ['responseHeaders'],
    )
    // Session rules don't outlive the browser
    load().then(updateRule)
}

const dropJar = async () => {
    jar = null
    await saveNow()
    await updateRule()
    dlog('feed', '[reveddit] logged-out reads keep no cookies: the news feed turned that off')
}

// What a public-view fetch puts on its URLs: the jar's marker, or nothing
// while the news feed's switch is off, in the incognito copy, or in a page
// before the background has made a jar. In the background, the first call
// makes the jar, a switch turned off drops it, and cookies that have expired
// since go from it and the rule.
export const publicViewMarking = async (): Promise<(url: string) => string> => {
    const unmarked = (url: string) => url
    if (inIncognitoContext()) {
        return unmarked
    }
    const on = (await getRemoteMechanism(MECHANISM_PUBLIC_COOKIES).catch(() => 'auto')) !== 'off'
    if (!holder) {
        const stored = on ? await readLocal<any>(PUBLIC_COOKIES_KEY, null) : null
        return isJar(stored) ? url => markedUrl(MARKER_NAME, url, stored.token) : unmarked
    }
    await load()
    if (!on) {
        if (jar) {
            await dropJar()
        }
        return unmarked
    }
    if (!jar) {
        jar = { token: newMarkerToken(), cookies: [] }
        await saveNow()
    } else if (jar.cookies.some(c => isExpired(c))) {
        jar = { token: jar.token, cookies: jar.cookies.filter(c => !isExpired(c)) }
        saveSoon()
        await updateRule()
    }
    const { token } = jar
    return url => markedUrl(MARKER_NAME, url, token)
}

// Resolves once the answer to a marked request sent at `since` is in the jar
// and the rule, or after settleMs: the next request then carries what reddit
// just set. At once outside the background, which takes the answers in.
export const publicCookiesSettled = (url: string, since: number): Promise<void> => {
    const key = urlKey(url)
    if (!holder || !isPublicViewUrl(url) || (answered.get(key) || 0) >= since) {
        return Promise.resolve()
    }
    return new Promise(resolve => {
        const waiter = {
            key,
            done: () => {
                clearTimeout(timer)
                waiting.delete(waiter)
                resolve()
            },
        }
        const timer = setTimeout(waiter.done, _publicCookieTiming.settleMs)
        waiting.add(waiter)
    })
}

// Firefox: the Cookie header a marked request gets, made from the jar as it
// is when the request goes out. None unless the marker carries its token.
export const publicCookieHeaderFor = async (url: string): Promise<string> => {
    await load()
    return jar && isMarkedUrl(MARKER_NAME, url, jar.token) ? wwwCookieHeader(jar.cookies) : ''
}

// A profile page refused with the jar on every route: reddit may be refusing
// this visitor, so the jar starts over, and the next answers fill it again
export const emptyPublicCookies = async (why: string): Promise<void> => {
    if (!holder) {
        return
    }
    await load()
    if (!jar?.cookies.length) {
        return
    }
    jar = { token: jar.token, cookies: [] }
    await saveNow()
    await updateRule()
    dlog('feed', `[reveddit] logged-out cookies dropped, to start over: ${why}`)
}

// Tests: forget the jar in memory and what the background set up
export const _resetPublicCookies = (asHolder = false) => {
    clearTimeout(saveTimer)
    saveTimer = undefined
    holder = asHolder
    jar = null
    loading = null
    answered.clear()
    waiting.clear()
    ruling = Promise.resolve()
}
