import { StoredCookie, isViewerConnecting, toStoredCookie, isExpired, restoreCookies } from './viewer'
import { isSupportedRedditTab } from './www-fetcher'
import { countCookieSave } from './activity-counts'
import browser from 'webextension-polyfill'

// The expiry reddit gave its login cookie, read from the cookie: reddit_session
// is a JWT whose exp claim is the cookie's expiry. Versions before 0.0.5.30
// wrote the login back without one, so it ended when the browser closed. An exp
// already past counts too, so an expired login is never put back. 0 when the
// cookie isn't such a JWT or the claim is too far off.
const LOGIN_EXPIRY_MAX_S = 400 * 24 * 3600

const loginCookieExpiry = (c: { name: string; value: string }): number => {
    const payload = c.name === 'reddit_session' ? String(c.value).split('.')[1] : ''
    if (!payload) {
        return 0
    }
    try {
        const b64 = payload.replace(/-/g, '+').replace(/_/g, '/')
        const exp = Number(JSON.parse(atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4))).exp)
        return exp < Date.now() / 1000 + LOGIN_EXPIRY_MAX_S ? exp : 0
    } catch {
        return 0
    }
}

// A saved cookie given the expiry its login JWT carries, when it has none
const withLoginExpiry = (c: StoredCookie): StoredCookie => {
    const exp = c.expirationDate ? 0 : loginCookieExpiry(c)
    return exp ? { ...c, expirationDate: exp } : c
}

// A domain copy ('.www.reddit.com') of a host-only cookie, which versions
// before 0.0.5.30 made when they put one back with its domain. Never saved or
// put back, so the copy lapses with the browser session.
const isOldDomainCopy = (c: { domain: string }) => /^\.[^.]+\.reddit\.com$/.test(c.domain)

// Store Reddit cookies for later use when no tabs are open. Not while a second
// account signs in (viewer.ts): the browser holds that account's cookies then,
// which must never be saved as the user's.
//
// Asked for at each check and Reddit page load, at each change to a login
// cookie and whenever a cookie goes (background.ts). Not at Reddit's other
// cookie changes: it replaces one cookie with most of its answers, its own
// pages' requests included (74 of 96 on 2026-11-09), and a save for each slowed
// browsers down with several Reddit tabs open. So a saved value that isn't a
// login's is as old as the last check or page load.
//
// Those ask in bursts. One save runs at a time, and the calls made meanwhile
// share one more after it, which reads the cookies as they are by then.
let latestSave: Promise<unknown> = Promise.resolve()
let queuedSave: Promise<unknown> | undefined

export const storeRedditCookies = (): Promise<unknown> => {
    if (!queuedSave) {
        const save = () => {
            queuedSave = undefined
            return isViewerConnecting().then(connecting => (connecting ? false : storeRedditCookiesNow()))
        }
        queuedSave = latestSave = latestSave.then(save, save)
    }
    return queuedSave
}

const SNAPSHOT_KEY = 'stored_reddit_cookie_objects'
const readSnapshot = (): Promise<unknown> =>
    new Promise(resolve => chrome.storage.local.get([SNAPSHOT_KEY], result => resolve(result?.[SNAPSHOT_KEY])))
// By content: storage needn't hand a cookie's fields back in the order they were saved
const snapshotText = (cookies: any[]) => JSON.stringify(cookies.map(c => Object.entries(c ?? {}).sort()))

const storeRedditCookiesNow = async () => {
    // undefined when the read fails, as for the cookies below
    const tabs = await new Promise<chrome.tabs.Tab[] | undefined>(resolve =>
        chrome.tabs.query({ url: ['*://*.reddit.com/*'] }, resolve),
    )
    if (!tabs?.some(isSupportedRedditTab)) {
        return false
    }

    // Get cookies for the Reddit parent domain so we include domain-scoped and host-only cookies
    const cookies = await new Promise<chrome.cookies.Cookie[] | undefined>(resolve =>
        chrome.cookies.getAll({ domain: 'reddit.com' }, resolve),
    )
    const cookieObjects: StoredCookie[] = []
    const repaired: StoredCookie[] = []
    ;(cookies || [])
        .filter(c => !isOldDomainCopy(c))
        .forEach(cookie => {
            // Save each cookie as it was, expiry and host-only flag
            // included, for rehydration. A login left session-only
            // gets the expiry its JWT carries, in the browser too
            // while that's still ahead.
            const stored = toStoredCookie(cookie)
            const saved = withLoginExpiry(stored)
            if (saved !== stored && !isExpired(saved)) {
                repaired.push(saved)
            }
            cookieObjects.push(saved)
        })

    if (!cookieObjects.length) {
        return false
    }
    await repairLogins(repaired)
    const stored = await readSnapshot()
    if (Array.isArray(stored) && snapshotText(stored) === snapshotText(cookieObjects)) {
        return true
    }
    countCookieSave()
    return new Promise<boolean>(resolve =>
        chrome.storage.local.set({ [SNAPSHOT_KEY]: cookieObjects }, () => resolve(true)),
    )
}

// Puts logins back with the expiry their JWT carries (storeRedditCookiesNow).
// Each login once per worker: the saves its own writes set off would each
// repeat it, and against anything that keeps the cookie session-only they'd
// never stop. Not once a second account's sign-in has started, which owns the
// jar.
const repairedLogins = new Set<string>()

const repairLogins = async (logins: StoredCookie[]) => {
    const todo = logins.filter(c => !repairedLogins.has(c.value))
    todo.forEach(c => repairedLogins.add(c.value))
    if (!todo.length || (await isViewerConnecting())) {
        todo.forEach(c => repairedLogins.delete(c.value))
        return
    }
    await restoreCookies(todo)
}

// Rehydrate stored cookies back into the browser's cookie jar for reddit.com:
// only those the browser no longer holds. One it holds is as new or newer
// (reddit refreshes them), and may be another account's the user switched to.
// Not while a second account signs in (viewer.ts), which owns the jar then.
// Resolves whether it put any back.
export const rehydrateStoredRedditCookies = (): Promise<unknown> =>
    isViewerConnecting().then(connecting => (connecting ? false : rehydrateStoredRedditCookiesNow()))

// Saved before 0.0.5.30: cookies.set details, with no expiry or host-only flag
const fromSnapshot = (c: any): StoredCookie =>
    withLoginExpiry(
        typeof c.hostOnly === 'boolean' ? c : { ...toStoredCookie(c), hostOnly: !String(c.domain).startsWith('.') },
    )

const rehydrateStoredRedditCookiesNow = async () => {
    const cookieObjects = await readSnapshot()
    if (!Array.isArray(cookieObjects) || !cookieObjects.length) {
        return false
    }
    return browser.cookies
        .getAll({ domain: 'reddit.com' })
        .then(async jar => {
            const held = new Set(jar.map(c => `${c.domain}|${c.path}|${c.name}`))
            const missing = cookieObjects
                .filter(c => c && typeof c.name === 'string' && typeof c.domain === 'string')
                .map(fromSnapshot)
                .filter(
                    c => !isOldDomainCopy(c) && !isExpired(c) && !held.has(`${c.domain}|${c.path || '/'}|${c.name}`),
                )
            // A sign-in that started since owns the jar
            if (!missing.length || (await isViewerConnecting())) {
                return false
            }
            await restoreCookies(missing)
            return true
        })
        .catch(() => false)
}
