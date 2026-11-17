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
// Firefox (header-rules.ts). A request is one of them when it is a GET whose
// URL carries the jar's secret marker (rv_public=<token>), whichever route
// sent it: the background, or the content script or injected fetch in a
// www.reddit.com tab. It carries the jar's cookies or none: its own, if any
// reach it, are taken off. The requests omit credentials, so reddit's answers
// never reach the browser's own cookies, and nothing here reads them.
//
// Nothing here names a cookie: one reddit adds, renames or gives another
// lifetime is kept, expired and sent the way its answer says, if a request to
// any www.reddit.com page would carry it (wwwCookieHeader). When reddit
// refuses the monitored profile's pages on every route that tries them, the
// next lookup starts the jar over, with a new marker, at most once per
// identity's START_OVER_MIN_MS; the ask is saved with the jar, so a worker
// Chrome stops in between doesn't lose it. When the profile's page comes back unreadable
// for long enough, the jar starts over too (notePublicViewUnreadable). The news
// feed's publicViewCookies switch turns it all off.
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
    sendsToWww,
    wwwCookieHeader,
    markedUrl,
    markerPattern,
    isMarkedUrl,
    isMarkerToken,
    newMarkerToken,
    inIncognitoContext,
    installMarkerCookieRule,
} from './viewer'

export const PUBLIC_COOKIES_KEY = 'public_view_cookies'
export const PUBLIC_COOKIES_RULE_ID = 9006
const MARKER_NAME = 'rv_public'
// The webRequest filter for marked requests (match patterns test the query
// string too), shared with Firefox's header listener
export const PUBLIC_VIEW_URL_FILTER = `https://www.reddit.com/*${MARKER_NAME}=*`
const ANY_MARKED_URL = new RegExp(markerPattern(MARKER_NAME, '[0-9a-f]{32}'))
// Far more than reddit sets, so a flood of new names can't grow the jar
const MAX_COOKIES = 50
// How long an identity lasts before a refusal may start it over: the hours a
// 403 rests a route (www-fetcher.ts WWW_HARD_REFUSAL_MS), so starting over
// can't run faster than reddit's verdicts change
export const START_OVER_MIN_MS = 6 * 3600 * 1000
// Since when the monitored profile's page has come back unreadable, and the
// start-overs that has led to: kept in storage, since Chrome stops the worker
// between checks. A good lookup ends it (lookup-status.ts).
export const UNREADABLE_KEY = 'public_view_unreadable_since'
// How long the page is unreadable before the first of those start-overs. Each
// one after waits twice as long as the last, up to START_OVER_MIN_MS, so a
// cause the cookies don't decide can't start the jar over every half hour.
export const UNREADABLE_START_OVER_AFTER_MS = 30 * 60 * 1000

// settleMs: how long a fetch waits for its answer's cookies to reach the jar
// and the rule, so the next request carries them. A save waits for saveDelayMs
// without a change, since reddit replaces a cookie in nearly every answer,
// but no longer than saveEveryMs after the first unsaved one; the rule and
// Firefox's listener use the jar in memory at once. Mutable for tests, like
// _wwwRouteTiming.
export const _publicCookieTiming = { settleMs: 1500, saveDelayMs: 5000, saveEveryMs: 30000 }

// since: when this identity began, the time its marker was made. startOver:
// why the next lookup should start it over, if a refusal asked
interface PublicJar {
    token: string
    cookies: StoredCookie[]
    since: number
    startOver?: string
}

const isStoredCookie = (c: any): c is StoredCookie =>
    !!c &&
    typeof c.name === 'string' &&
    typeof c.value === 'string' &&
    typeof c.domain === 'string' &&
    typeof c.path === 'string' &&
    (c.expirationDate === undefined || typeof c.expirationDate === 'number')

// A stored jar, kept to well-formed cookies a request would carry, or null. A
// start time ahead of the clock (one set back since) reads as long ago.
const readJar = (raw: any): PublicJar | null => {
    if (!raw || !isMarkerToken(raw.token) || !Array.isArray(raw.cookies)) {
        return null
    }
    const since = Number(raw.since)
    return {
        token: raw.token,
        cookies: raw.cookies.filter((c: any) => isStoredCookie(c) && sendsToWww(c)).slice(-MAX_COOKIES),
        since: since > 0 && since <= Date.now() ? since : 0,
        ...(typeof raw.startOver === 'string' && raw.startOver && { startOver: raw.startOver.slice(0, 500) }),
    }
}

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

// The jar's cookies after an answer's Set-Cookie headers, as a browser keeps
// them: a cookie replaces the one with its name, domain and path, an expired
// one only removes it, and cookies past their expiry drop out. One that no
// request to a www.reddit.com page would carry isn't kept, so it can't take
// the place of one that is.
export const withSetCookies = (
    cookies: StoredCookie[],
    lines: string[],
    url: string,
    nowSec = Date.now() / 1000,
): StoredCookie[] => {
    let kept = cookies.filter(c => !isExpired(c, nowSec))
    for (const line of lines) {
        const cookie = parseSetCookie(line, url, nowSec)
        if (!cookie) {
            continue
        }
        kept = kept.filter(c => c.name !== cookie.name || c.domain !== cookie.domain || c.path !== cookie.path)
        if (!isExpired(cookie, nowSec) && sendsToWww(cookie)) {
            kept.push(cookie)
        }
    }
    return kept.slice(-MAX_COOKIES)
}

// An answer's Set-Cookie lines as webRequest gives them: a header each on
// Chrome, joined by newlines on Firefox
export const setCookieLines = (headers: { name: string; value?: string }[] | undefined): string[] =>
    (headers || [])
        .filter(h => String(h.name).toLowerCase() === 'set-cookie')
        .flatMap(h => String(h.value || '').split('\n'))
        .filter(line => line.trim())

// A URL some public-view fetch marked, whatever its token
export const isPublicViewUrl = (url: string): boolean => ANY_MARKED_URL.test(url)

// --- The background's jar ---

// This context holds the jar: the background, once installPublicCookies ran
let holder = false
let jar: PublicJar | null = null
let loading: Promise<void> | null = null
const load = () =>
    (loading ||= readLocal<any>(PUBLIC_COOKIES_KEY, null).then(raw => {
        jar = readJar(raw)
    }))

let saveTimer: ReturnType<typeof setTimeout> | undefined
let unsavedSince = 0
const saveNow = async () => {
    clearTimeout(saveTimer)
    saveTimer = undefined
    unsavedSince = 0
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
    clearTimeout(saveTimer)
    unsavedSince ||= Date.now()
    const overdue = Date.now() - unsavedSince >= _publicCookieTiming.saveEveryMs
    saveTimer = setTimeout(saveNow, overdue ? 0 : _publicCookieTiming.saveDelayMs)
}

// Chrome and Edge: unlike the second account's, the rule has no tabIds
// condition, since the tab routes fetch from inside a www.reddit.com tab: the
// secret marker keeps it to the extension's own requests. One at a time, and
// a failed one never stops the next.
const installRule = () =>
    installMarkerCookieRule({
        id: PUBLIC_COOKIES_RULE_ID,
        marker: MARKER_NAME,
        holder: jar,
        removeWhenEmpty: true,
        onError: message => console.log('[reveddit] logged-out cookie rule not installed:', message),
    })
let ruling: Promise<void> = Promise.resolve()
const updateRule = (): Promise<void> => (ruling = ruling.then(installRule, installRule))

// Every change of the jar goes through here, so memory, storage (at once, or
// at the next quiet moment) and Chrome's rule stay in step
const setJar = async (next: PublicJar | null, saveAtOnce: boolean) => {
    jar = next
    if (saveAtOnce) {
        await saveNow()
    } else {
        saveSoon()
    }
    await updateRule()
}
const newJar = (): PublicJar => ({ token: newMarkerToken(), cookies: [], since: Date.now() })

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

// Only the extension's own reads are taken in: GETs carrying the jar's token.
// A request of another kind with the marker isn't one of them.
const takeAnswer = async (details: {
    url?: string
    method?: string
    responseHeaders?: { name: string; value?: string }[]
}) => {
    await load()
    const url = String(details.url || '')
    if (jar && details.method === 'GET' && isMarkedUrl(MARKER_NAME, url, jar.token)) {
        const lines = setCookieLines(details.responseHeaders)
        const before = jar.cookies
        const cookies = lines.length ? withSetCookies(before, lines, url) : before
        if (JSON.stringify(cookies) !== JSON.stringify(before)) {
            await setJar({ ...jar, cookies }, false)
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
        { urls: [PUBLIC_VIEW_URL_FILTER] },
        // Chrome shows Set-Cookie only with extraHeaders, which Firefox doesn't take
        onChrome ? ['responseHeaders', 'extraHeaders'] : ['responseHeaders'],
    )
    // Session rules don't outlive the browser
    load().then(updateRule, () => {})
}

// Reddit refused the monitored profile's own page on every route that tried
// it: the next lookup starts the jar over, with a new marker, unless this
// identity began less than START_OVER_MIN_MS ago. Not at once, so the rest of
// this lookup keeps the cookies its other pages were read with. The ask is
// saved with the jar at once: Chrome can stop the worker before that lookup.
// The first ask stands. Memory changes before this returns.
export const requestPublicCookiesStartOver = (why: string): Promise<void> =>
    holder && jar && !jar.startOver ? setJar({ ...jar, startOver: why }, true) : Promise.resolve()

// A lookup of the monitored profile got a page it couldn't read. Reddit picks
// some layouts by the cookies and keeps sending one while they stay
// (2026-11-17), so once that has gone on long enough, the jar starts over. At
// once, unlike a refusal's start-over: this lookup is done with the cookies,
// and an ask kept in memory for the next one would be lost when Chrome stops
// the worker between checks.
export const notePublicViewUnreadable = async () => {
    if (!holder) {
        return
    }
    try {
        await load()
        if (!jar) {
            return
        }
        const now = Date.now()
        const stored: any = await readLocal(UNREADABLE_KEY, null)
        // A time to come, from a clock set back, starts the count again
        const valid = (t: unknown) => Number(t) > 0 && Number(t) <= now
        const since = valid(stored?.since) ? Number(stored.since) : now
        const startOvers = since === now ? 0 : Math.max(0, Math.floor(Number(stored?.startOvers) || 0))
        const from = startOvers && valid(stored?.startedOverAt) ? Number(stored.startedOverAt) : since
        if (now - from < Math.min(UNREADABLE_START_OVER_AFTER_MS * 2 ** startOvers, START_OVER_MIN_MS)) {
            if (since === now) {
                await browser.storage.local.set({ [UNREADABLE_KEY]: { since } })
            }
            return
        }
        await setJar(newJar(), true)
        await browser.storage.local.set({
            [UNREADABLE_KEY]: { since, startOvers: startOvers + 1, startedOverAt: now },
        })
        dlog(
            'feed',
            '[reveddit] logged-out reads start over with new cookies and a new marker: ' +
                `the profile's page has been unreadable since ${new Date(since).toISOString()}`,
        )
    } catch {
        /* ignored */
    }
}

// A good lookup: the profile's page reads again. Removed only when set, since
// this runs on every one
export const endPublicViewUnreadable = async () => {
    try {
        if (await readLocal(UNREADABLE_KEY, null)) {
            await browser.storage.local.remove(UNREADABLE_KEY)
        }
    } catch {
        /* ignored */
    }
}

// What a public-view fetch puts on its URLs: the jar's marker, or nothing
// while the news feed's switch is off, in the incognito copy, or in a page
// before the background has made a jar. In the background, the first call
// makes the jar, a switch turned off drops it, a start-over asked for since
// the last lookup happens here, cookies that have expired go from it and the
// rule, and the marker is the jar's as each request goes out.
export const publicViewMarking = async (): Promise<(url: string) => string> => {
    const unmarked = (url: string) => url
    if (inIncognitoContext()) {
        return unmarked
    }
    const on = (await getRemoteMechanism(MECHANISM_PUBLIC_COOKIES).catch(() => 'auto')) !== 'off'
    if (!holder) {
        const stored = on ? readJar(await readLocal<any>(PUBLIC_COOKIES_KEY, null)) : null
        return stored ? url => markedUrl(MARKER_NAME, url, stored.token) : unmarked
    }
    await load()
    if (!on) {
        if (jar) {
            await setJar(null, true)
            dlog('feed', '[reveddit] logged-out reads keep no cookies: the news feed turned that off')
        }
        return unmarked
    }
    if (!jar) {
        await setJar(newJar(), true)
    } else if (jar.startOver && Date.now() - jar.since >= START_OVER_MIN_MS) {
        const why = jar.startOver
        await setJar(newJar(), true)
        dlog('feed', `[reveddit] logged-out reads start over with new cookies and a new marker: ${why}`)
    } else if (jar.startOver || jar.cookies.some(c => isExpired(c))) {
        // An identity too young to start over keeps its cookies, and the ask goes
        await setJar({ ...jar, startOver: undefined, cookies: jar.cookies.filter(c => !isExpired(c)) }, false)
    }
    return url => (jar ? markedUrl(MARKER_NAME, url, jar.token) : url)
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
// is when the request goes out: its cookies, or '' for none. null for a URL
// that doesn't carry the jar's token, which may be a page's own request and
// keeps its cookies.
export const publicCookieHeaderFor = async (url: string): Promise<string | null> => {
    await load()
    return jar && isMarkedUrl(MARKER_NAME, url, jar.token) ? wwwCookieHeader(jar.cookies) : null
}

// Tests: forget the jar in memory and what the background set up
export const _resetPublicCookies = (asHolder = false) => {
    clearTimeout(saveTimer)
    saveTimer = undefined
    unsavedSince = 0
    holder = asHolder
    jar = null
    loading = null
    answered.clear()
    waiting.clear()
    ruling = Promise.resolve()
}
