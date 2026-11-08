// The second Reddit account ("viewer") that checks the user's posts and
// comments the way other people see them, for when reddit stops showing
// profiles to logged-out visitors (login-wall-config.ts).
//
// Connecting: the user signs in to it on reddit's own login page, so passwords,
// two-factor codes and Google or Apple sign-in all stay with reddit. Before
// that, the user's own reddit cookies are saved and taken out of the browser
// (locally: reddit's log-out would end that session). Once the second account
// is signed in, its cookies are saved for the extension, taken out of the
// browser in turn, and the user's own cookies go back. Monitoring, the bridge
// and the stored-cookie helpers stand still meanwhile (isViewerConnecting), so
// nothing mistakes the second account for the user.
//
// Using it: its cookies never go back into the browser's cookie store. They
// ride only on the extension's own GET requests that carry a secret marker
// (rv_viewer=<token>, a new token each time it connects), through a header
// rule: declarativeNetRequest on Chrome and Edge (installViewerHeaderRule),
// webRequest on Firefox (header-rules.ts). Those requests omit the browser's
// cookies, so reddit's answers can't write into the user's cookie store, and
// the rule matches no other request, so pages can't borrow the login. It only
// reads: the rule matches GETs only.
//
// No username or cookie value goes into the diagnostic log from here.
import browser from 'webextension-polyfill'
import { dlogSummary } from './diaglog'
import { isBlockPage, LOGGED_IN_CACHE_MODES, withDeadline } from './logged-in-fetch'
import { getRemoteLoginCookies } from './news'
import { readLocal, isFresh } from './request-gates'

export const VIEWER_KEY = 'viewer_account'
export const VIEWER_CONNECT_KEY = 'viewer_connect'
export const VIEWER_CONNECT_RESULT_KEY = 'viewer_connect_result'
export const VIEWER_LOGIN_URL = 'https://www.reddit.com/login/'
// A sign-in left open longer than this ends, and the user's own login goes back
export const VIEWER_CONNECT_TIMEOUT_MS = 15 * 60 * 1000
// The alarm that ends it on time (background.ts), rather than at the next
// monitoring tick, which can come much later
export const VIEWER_CONNECT_ALARM = 'viewer-connect-timeout'
// How long after reddit sets its login cookie the sign-in counts as done, so
// the cookies reddit sets right after it (token_v2) are saved too
export const VIEWER_SETTLE_MS = 3000
export const VIEWER_RULE_ID = 9005
const MARKER_NAME = 'rv_viewer'

export interface StoredCookie {
    name: string
    value: string
    domain: string
    path: string
    secure: boolean
    httpOnly: boolean
    hostOnly: boolean
    sameSite?: string
    expirationDate?: number
    storeId?: string
}
export interface ViewerAccount {
    name: string
    token: string
    cookies: StoredCookie[]
    connectedAt: number
}
interface ViewerConnect {
    started: number
    mainUser: string
    main: StoredCookie[]
    tabId?: number
}
export interface ViewerConnectResult {
    ok: boolean
    // why it didn't connect: 'same_account', 'not_signed_in', 'unconfirmed'
    // (reddit didn't say who signed in), 'cancelled', 'timed_out', 'no_tab'
    error?: string
    t: number
}

export const toStoredCookie = (c: any): StoredCookie => ({
    name: String(c.name),
    value: String(c.value),
    domain: String(c.domain),
    path: String(c.path || '/'),
    secure: !!c.secure,
    httpOnly: !!c.httpOnly,
    hostOnly: !!c.hostOnly,
    ...(c.sameSite && { sameSite: String(c.sameSite) }),
    ...(!c.session && Number(c.expirationDate) > 0 && { expirationDate: Number(c.expirationDate) }),
    ...(c.storeId && { storeId: String(c.storeId) }),
})

const cookieUrl = (c: StoredCookie) => `https://${c.domain.replace(/^\./, '')}${c.path || '/'}`

// What cookies.set needs to put a saved cookie back as it was: a host-only
// cookie gets no domain (one would make it a domain cookie), a session cookie
// no expiry, and an unspecified SameSite stays unspecified.
export const settableCookie = (c: StoredCookie) => ({
    url: cookieUrl(c),
    name: c.name,
    value: c.value,
    path: c.path,
    secure: c.secure,
    httpOnly: c.httpOnly,
    ...(!c.hostOnly && { domain: c.domain }),
    ...(c.sameSite && c.sameSite !== 'unspecified' && { sameSite: c.sameSite }),
    ...(c.expirationDate && { expirationDate: c.expirationDate }),
    ...(c.storeId && { storeId: c.storeId }),
})

// A saved cookie at or past its expiry (a session cookie has none)
export const isExpired = (c: StoredCookie, nowSec = Date.now() / 1000): boolean =>
    !!c.expirationDate && c.expirationDate <= nowSec

// The Cookie header a www.reddit.com request would carry from the second
// account's cookies: those for that host and path /, unexpired
export const viewerCookieHeader = (cookies: StoredCookie[], nowSec = Date.now() / 1000): string =>
    cookies
        .filter(c => {
            const host = c.domain.replace(/^\./, '').toLowerCase()
            const forWww = c.hostOnly ? host === 'www.reddit.com' : host === 'reddit.com' || host === 'www.reddit.com'
            return forWww && (c.path || '/') === '/' && !isExpired(c, nowSec)
        })
        .map(c => `${c.name}=${c.value}`)
        .join('; ')

// Firefox: the Cookie header a marked request gets, made when it's sent so a
// cookie that has expired since stays off. None unless the marker carries the
// account's current token.
export const viewerCookieHeaderFor = (
    url: string,
    viewer: Pick<ViewerAccount, 'token' | 'cookies'> | null,
    nowSec = Date.now() / 1000,
): string => (viewer && isViewerRequestUrl(url, viewer.token) ? viewerCookieHeader(viewer.cookies, nowSec) : '')

export const viewerUrl = (url: string, token: string): string =>
    `${url}${url.includes('?') ? '&' : '?'}${MARKER_NAME}=${token}`
// The token is hex, so it needs no escaping. RE2 syntax, for Chrome's rule too.
const viewerUrlPattern = (token: string): string => `^https://www\\.reddit\\.com/[^#]*[?&]${MARKER_NAME}=${token}(&|$)`
export const isViewerRequestUrl = (url: string, token: string): boolean =>
    /^[0-9a-f]{32}$/.test(token) && new RegExp(viewerUrlPattern(token)).test(url)

const newToken = (): string =>
    Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('')

// Whether the second account is also the one signed in to Reddit in the
// browser. It can't check its own items then: its view of them is the
// author's, where removals look live.
export const isSignedInViewer = (viewerName: string, signedIn: string): boolean =>
    !!viewerName && !!signedIn && viewerName.toLowerCase() === signedIn.toLowerCase()

export const getViewer = async (): Promise<ViewerAccount | null> => {
    const viewer: any = await readLocal(VIEWER_KEY, null)
    return viewer &&
        typeof viewer.name === 'string' &&
        /^[0-9a-f]{32}$/.test(viewer.token) &&
        Array.isArray(viewer.cookies)
        ? viewer
        : null
}

const readConnect = async (): Promise<ViewerConnect | null> => {
    const pending: any = await readLocal(VIEWER_CONNECT_KEY, null)
    return pending && Number(pending.started) > 0 && Array.isArray(pending.main) ? pending : null
}

// Whether a sign-in is under way. The user's own cookies are out of the
// browser meanwhile, so nothing may read or write reddit cookies, or act as
// whoever the browser is logged in as.
export const isViewerConnecting = async (): Promise<boolean> => !!(await readConnect())

// Chrome and Edge run a second copy of the extension for incognito windows
// (incognito: 'split'), with its own cookies and tabs but the same storage. A
// sign-in sets aside and puts back the normal windows' cookies and watches a
// normal window's tab, so only the normal copy starts, finishes or ends one:
// the incognito copy would clear and restore the wrong cookies, or end a
// sign-in whose tab it can't see. The options page says so there.
export const inIncognitoContext = (): boolean => {
    try {
        return !!(globalThis as any).chrome?.extension?.inIncognitoContext
    } catch {
        return false
    }
}

const redditCookies = async (): Promise<any[]> => {
    try {
        return ((await browser.cookies.getAll({ domain: 'reddit.com' })) as any[]) || []
    } catch {
        return []
    }
}
// Whether the browser holds a reddit login, by the login cookie names
// (getRemoteLoginCookies: the news feed's, in case reddit renames its session
// cookie). A sign-in that ends, grace mode and the bridge ask.
export const hasRedditLoginCookie = async (): Promise<boolean> => {
    try {
        for (const name of await getRemoteLoginCookies()) {
            if (await browser.cookies.get({ url: 'https://www.reddit.com/', name })) {
                return true
            }
        }
    } catch {
        // unreadable: no login known
    }
    return false
}
const clearRedditCookies = async () => {
    for (const c of await redditCookies()) {
        const stored = toStoredCookie(c)
        await browser.cookies
            .remove({ url: cookieUrl(stored), name: stored.name, ...(stored.storeId && { storeId: stored.storeId }) })
            .catch(() => null)
    }
}
export const restoreCookies = async (cookies: StoredCookie[]) => {
    for (const c of cookies) {
        await browser.cookies.set(settableCookie(c) as any).catch(() => null)
    }
}

const setResult = (result: Omit<ViewerConnectResult, 't'>) =>
    browser.storage.local.set({ [VIEWER_CONNECT_RESULT_KEY]: { ...result, t: Date.now() } })

// Where the sign-in tab goes when it's over: the options page's account section
const VIEWER_OPTIONS_PATH = 'src/options.html#second-account'
const leaveLoginTab = async (tabId: number | undefined) => {
    if (tabId == null) {
        return
    }
    try {
        await browser.tabs.update(tabId, { url: browser.runtime.getURL(VIEWER_OPTIONS_PATH) })
    } catch {
        // the tab is gone
    }
}

export const startViewerConnect = async (mainUser: string): Promise<{ ok: boolean; error?: string }> => {
    if (inIncognitoContext()) {
        return { ok: false, error: 'incognito' }
    }
    if (await readConnect()) {
        return { ok: false, error: 'already_connecting' }
    }
    const main = (await redditCookies()).map(toStoredCookie)
    // Saved before anything leaves the browser, so a worker that stops halfway
    // can put the user's login back (recoverViewerConnect)
    await browser.storage.local.set({ [VIEWER_CONNECT_KEY]: { started: Date.now(), mainUser, main } })
    await browser.storage.local.remove(VIEWER_CONNECT_RESULT_KEY)
    try {
        // A little past the timeout, so recoverViewerConnect finds it over
        void Promise.resolve(
            (globalThis as any).chrome?.alarms?.create(VIEWER_CONNECT_ALARM, {
                delayInMinutes: VIEWER_CONNECT_TIMEOUT_MS / 60000 + 0.5,
            }),
        ).catch(() => {})
    } catch {
        /* no alarms here */
    }
    await clearRedditCookies()
    dlogSummary(
        'ui',
        `[reveddit] second account: sign-in started; ${main.length} reddit cookies of the main login set aside`,
    )
    try {
        const tab = await browser.tabs.create({ url: VIEWER_LOGIN_URL, active: true })
        const pending = await readConnect()
        if (pending) {
            await browser.storage.local.set({ [VIEWER_CONNECT_KEY]: { ...pending, tabId: tab.id } })
        }
    } catch {
        await cancelViewerConnect('no_tab')
        return { ok: false, error: 'no_tab' }
    }
    return { ok: true }
}

// One step of a sign-in at a time: a finish or a cancel that comes while
// another is under way waits for it, then looks again, since that one may have
// ended the sign-in. So a cancel never lands in the middle of a finish saving
// the second account's cookies, and a finish never drops a cancel.
let step: Promise<void> = Promise.resolve()
const inTurn = (run: () => Promise<void>): Promise<void> => {
    const next = step.then(run, run)
    step = next.catch(() => {})
    return next
}

// Puts the user's own login back and records why the sign-in ended
export const cancelViewerConnect = (why: string): Promise<void> => inTurn(() => endConnect(why))
const endConnect = async (why: string) => {
    const pending = inIncognitoContext() ? null : await readConnect()
    if (!pending) {
        return
    }
    await clearRedditCookies()
    await restoreCookies(pending.main)
    await browser.storage.local.remove(VIEWER_CONNECT_KEY)
    await setResult({ ok: false, error: why })
    dlogSummary('ui', `[reveddit] second account: sign-in ended without connecting (${why}); the main login is back`)
    await leaveLoginTab(pending.tabId)
}

// Ends a sign-in: whoever the browser is logged in as now (whoAmI, the
// background's login detection) becomes the second account, unless that's the
// user's own account or nobody. orCancel ends it either way; without it, a
// sign-in nobody completed yet keeps waiting. Finishes without orCancel that
// come while one waits its turn or runs are that same finish.
let finishing: Promise<void> | null = null
// How long a finish waits for reddit to say who's signed in, so a stalled
// answer can't hold up the steps behind it (a cancel, the tab closing). No
// answer in time, or no clean one (whoAmI rejects), is unsure: nobody yet for
// now, but a sign-in it ends says reddit didn't confirm, not that nobody
// signed in.
export const VIEWER_WHO_AM_I_TIMEOUT_MS = 20 * 1000
const askWhoAmI = (whoAmI: () => Promise<string | null>): Promise<{ name: string | null; unsure: boolean }> =>
    new Promise(resolve => {
        const timer = setTimeout(() => resolve({ name: null, unsure: true }), VIEWER_WHO_AM_I_TIMEOUT_MS)
        whoAmI().then(
            name => {
                clearTimeout(timer)
                resolve({ name, unsure: false })
            },
            () => {
                clearTimeout(timer)
                resolve({ name: null, unsure: true })
            },
        )
    })
export const finishViewerConnect = (
    whoAmI: () => Promise<string | null>,
    orCancel: string | false = false,
): Promise<void> => {
    if (inIncognitoContext()) {
        return Promise.resolve()
    }
    if (!orCancel && finishing) {
        return finishing
    }
    const run = inTurn(async () => {
        const pending = await readConnect()
        if (!pending) {
            return
        }
        // Ending with no login cookie in the browser: nobody signed in, and
        // reddit isn't asked, while the user's own login is still set aside.
        // Reddit can answer a logged-out check with a block page anyway.
        if (orCancel && !(await hasRedditLoginCookie())) {
            await endConnect(orCancel === 'timed_out' ? 'timed_out' : 'not_signed_in')
            return
        }
        const { name, unsure } = await askWhoAmI(whoAmI)
        if (!name) {
            if (orCancel) {
                await endConnect(orCancel === 'timed_out' ? 'timed_out' : unsure ? 'unconfirmed' : 'not_signed_in')
            }
            return
        }
        if (pending.mainUser && name.toLowerCase() === pending.mainUser.toLowerCase()) {
            await endConnect('same_account')
            return
        }
        const account: ViewerAccount = {
            name,
            token: newToken(),
            cookies: (await redditCookies()).map(toStoredCookie),
            connectedAt: Date.now(),
        }
        await browser.storage.local.set({ [VIEWER_KEY]: account })
        await forgetViewerWarnings()
        await clearRedditCookies()
        await restoreCookies(pending.main)
        await browser.storage.local.remove(VIEWER_CONNECT_KEY)
        await setResult({ ok: true })
        dlogSummary(
            'ui',
            `[reveddit] second account connected (${account.cookies.length} cookies kept for the extension); ` +
                'the main login is back',
        )
        await installViewerHeaderRule()
        await leaveLoginTab(pending.tabId)
    })
    if (!orCancel) {
        finishing = run
        run.finally(() => {
            if (finishing === run) {
                finishing = null
            }
        }).catch(() => {})
    }
    return run
}

// After the worker starts, and on each monitoring tick: a sign-in whose tab is
// gone, or that has run too long, ends now
export const recoverViewerConnect = async (whoAmI: () => Promise<string | null>) => {
    const pending = inIncognitoContext() ? null : await readConnect()
    if (!pending) {
        return
    }
    if (Date.now() - pending.started > VIEWER_CONNECT_TIMEOUT_MS) {
        await finishViewerConnect(whoAmI, 'timed_out')
        return
    }
    if (pending.tabId != null) {
        const tab = await browser.tabs.get(pending.tabId).catch(() => null)
        if (!tab) {
            await finishViewerConnect(whoAmI, 'not_signed_in')
        }
    }
}

// The browser events a sign-in waits on, wired in background.ts
export const isLoginTab = async (tabId: number): Promise<boolean> => (await readConnect())?.tabId === tabId

export const disconnectViewer = async () => {
    await browser.storage.local.remove([VIEWER_KEY, VIEWER_CONNECT_RESULT_KEY, VIEWER_IDENTITY_KEY])
    await forgetViewerWarnings()
    dlogSummary('ui', '[reveddit] second account disconnected')
    await installViewerHeaderRule()
}

// The warning and failure count a second account left (lookup-status.ts), which
// say nothing about the next one, or about none
export const VIEWER_FAILURES_KEY = 'viewer_lookup_consecutive_failures'
const forgetViewerWarnings = async () => {
    try {
        const status = ((await browser.storage.local.get({ error_status: '' })) as any).error_status
        await browser.storage.local.remove([
            VIEWER_FAILURES_KEY,
            ...(String(status).startsWith('viewer_') ? ['error_status'] : []),
        ])
    } catch {
        /* ignored */
    }
}

// Chrome and Edge: the rule that puts the second account's cookies on the
// extension's own marked GET requests (tabId -1: not from any tab). Replaced
// whenever the account changes, on every worker start, since session rules
// don't outlive the browser, and before each lookup through the account
// (viewer-lookup.ts), so a cookie that has expired since drops off. Firefox does
// this in header-rules.ts.
export const installViewerHeaderRule = async () => {
    if (typeof __BUILT_FOR__ !== 'undefined' && __BUILT_FOR__ !== 'chrome') {
        return
    }
    const dnr = (globalThis as any).chrome?.declarativeNetRequest
    if (!dnr?.updateSessionRules) {
        return
    }
    const viewer = await getViewer()
    const header = viewer ? viewerCookieHeader(viewer.cookies) : ''
    try {
        await dnr.updateSessionRules({
            removeRuleIds: [VIEWER_RULE_ID],
            addRules:
                viewer && header
                    ? [
                          {
                              id: VIEWER_RULE_ID,
                              priority: 3,
                              action: {
                                  type: 'modifyHeaders',
                                  requestHeaders: [{ header: 'cookie', operation: 'set', value: header }],
                              },
                              condition: {
                                  regexFilter: viewerUrlPattern(viewer.token),
                                  resourceTypes: ['xmlhttprequest', 'other'],
                                  tabIds: [-1],
                                  initiatorDomains: [chrome.runtime.id],
                                  requestMethods: ['get'],
                              },
                          },
                      ]
                    : [],
        })
    } catch (e: any) {
        dlogSummary('ui', `[reveddit] second account: header rule not installed: ${String(e?.message || e)}`)
    }
}

// A GET as the second account: its marker on the URL, the browser's own
// cookies left off. Like the user's own logged-in reads (logged-in-fetch.ts),
// after the edge's block page it tries once more with the other cache mode and
// keeps the mode that got past the edge. blocked means both modes got the
// block page, or one did while that kind of request was refused in both a few
// minutes ago: the retry is skipped for a while then. That memory is per
// account and kind of request (me.json, each listing, thread reads), so one
// refused kind doesn't keep another from finding the mode that works. The
// lookup rests a second account refused outright (restViewer in viewer-lookup.ts).
interface ViewerJson {
    ok: boolean
    status: number
    blocked: boolean
    json?: any
}
export const VIEWER_FETCH_TIMEOUT_MS = 20 * 1000
const VIEWER_DOUBLE_BLOCK_MEMORY_MS = 5 * 60 * 1000
// Mutable for tests, like _loggedInFetchState. Per account and kind of
// request: the mode that last got past the edge, and when both modes last got
// the block page (a time it happened, so a clock put right can't stretch it).
// A kind with no mode of its own yet starts from the account's latest, since
// reddit has refused a request style across every kind of page at once.
export const _viewerFetchState = {
    preferredCacheMode: {} as Record<string, number>,
    latestMode: {} as Record<string, number>,
    doubleBlockAt: {} as Record<string, number>,
}
// A request's kind: its path, with the user and the thread left out
const requestKind = (url: string): string =>
    url
        .replace(/^https?:\/\/[^/]+/, '')
        .split('?')[0]
        .replace(/^\/user\/[^/]+/, '/user')
        .replace(/^\/comments\/.*/, '/comments')
export const fetchJsonAsViewer = async (url: string, viewer: ViewerAccount): Promise<ViewerJson> => {
    // The body is read under the same deadline as the request, so an answer
    // that stalls partway can't hold up the monitoring cycle
    const once = (cache: RequestCache): Promise<ViewerJson> =>
        withDeadline(VIEWER_FETCH_TIMEOUT_MS, async signal => {
            try {
                const response = await fetch(viewerUrl(url, viewer.token), {
                    credentials: 'omit',
                    cache,
                    headers: { 'Accept-Language': 'en' },
                    signal,
                })
                const blocked = isBlockPage(response)
                if (blocked || !response.ok) {
                    return { ok: false, status: response.status, blocked }
                }
                try {
                    return { ok: true, status: response.status, blocked: false, json: await response.json() }
                } catch {
                    // not JSON (a challenge or some other page), or out of time
                    return { ok: false, status: response.status, blocked: false }
                }
            } catch {
                return { ok: false, status: 0, blocked: false }
            }
        })
    const kind = `${viewer.token}:${requestKind(url)}`
    // Past the edge, whatever the resource said: keep that mode. No answer at
    // all (status 0) says nothing about it.
    // An answer past the edge also ends any memory of both modes refused.
    // A 200 that isn't JSON is a challenge or some other page in its place,
    // not the edge letting the request through.
    const keep = (answer: ViewerJson, used: number) => {
        if (!answer.blocked && answer.status && (answer.ok || answer.status !== 200)) {
            _viewerFetchState.preferredCacheMode[kind] = used
            _viewerFetchState.latestMode[viewer.token] = used
            delete _viewerFetchState.doubleBlockAt[kind]
        }
    }
    const own = _viewerFetchState.preferredCacheMode[kind]
    const mode = own ?? _viewerFetchState.latestMode[viewer.token] ?? 0
    const first = await once(LOGGED_IN_CACHE_MODES[mode])
    keep(first, mode)
    if (!first.blocked) {
        return first
    }
    const sinceDoubleBlock = Date.now() - (_viewerFetchState.doubleBlockAt[kind] ?? -Infinity)
    if (sinceDoubleBlock < 0) {
        // Dated ahead by a clock since put right: it says nothing
        delete _viewerFetchState.doubleBlockAt[kind]
    }
    // Only a kind that has found its own working mode skips the retry for a
    // while; one that hasn't keeps looking
    if (own !== undefined && sinceDoubleBlock >= 0 && sinceDoubleBlock < VIEWER_DOUBLE_BLOCK_MEMORY_MS) {
        return first
    }
    const other = (mode + 1) % LOGGED_IN_CACHE_MODES.length
    const second = await once(LOGGED_IN_CACHE_MODES[other])
    keep(second, other)
    if (second.blocked) {
        _viewerFetchState.doubleBlockAt[kind] = Date.now()
    }
    return second
}

// Whether the second account is still signed in, from its /api/me.json:
// 'ok', 'signed_out' (an answer with no user, or another user) or 'unknown'
// (no clean answer). 'ok' is remembered for half an hour, and so is 'unknown',
// so a me.json reddit refuses isn't asked again every cycle. A 429 throws, for
// the shared backoff.
export const VIEWER_IDENTITY_KEY = 'viewer_identity'
const IDENTITY_TTL_MS = 30 * 60 * 1000
type ViewerIdentity = 'ok' | 'signed_out' | 'unknown'
export const checkViewerIdentity = async (viewer: ViewerAccount): Promise<ViewerIdentity> => {
    // Once its login cookie has expired the account is signed out, though
    // reddit may answer that with a block page rather than a me.json with no user
    const loginNames = await getRemoteLoginCookies()
    if (!viewer.cookies.some(c => loginNames.includes(c.name) && !isExpired(c))) {
        return rememberIdentity(viewer, 'signed_out')
    }
    const stored: any = await readLocal(VIEWER_IDENTITY_KEY, null)
    if (
        stored?.token === viewer.token &&
        (stored?.result === 'ok' || stored?.result === 'unknown') &&
        isFresh(Number(stored?.t), IDENTITY_TTL_MS, Date.now())
    ) {
        return stored.result
    }
    const r = await fetchJsonAsViewer('https://www.reddit.com/api/me.json', viewer)
    if (r.status === 429) {
        throw new Error('www.reddit.com request failed: 429')
    }
    const name = r.json?.data?.name
    return rememberIdentity(
        viewer,
        !r.ok || !r.json || typeof r.json !== 'object'
            ? 'unknown'
            : typeof name === 'string' && name.toLowerCase() === viewer.name.toLowerCase()
              ? 'ok'
              : 'signed_out',
    )
}
const rememberIdentity = async (viewer: ViewerAccount, result: ViewerIdentity): Promise<ViewerIdentity> => {
    await browser.storage.local
        .set({ [VIEWER_IDENTITY_KEY]: { token: viewer.token, result, t: Date.now() } })
        .catch(() => null)
    return result
}
