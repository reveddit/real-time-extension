// The snapshot of the user's Reddit cookies that checks run with when no
// Reddit tab is open (requests.ts storeRedditCookies and
// rehydrateStoredRedditCookies): each cookie saved as it was, expiry
// included, and put back only where the browser no longer holds it. One put
// back without its expiry lasts only until the browser closes, which signs the
// user out of Reddit.

// Install chrome global BEFORE any source import
import '../mocks/chrome-api.js'

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import browserMock, { __resetStorage, __getLocalStorage } from '../mocks/webextension-polyfill.js'
import { cookie, jar, fill, find, cookiesApi, COOKIE_EXPIRES as EXPIRES } from '../mocks/cookies.js'

import { storeRedditCookies, rehydrateStoredRedditCookies } from '../../src/src/reddit-cookies'
import { lookupItemsByUser } from '../../src/src/reddit-auth'
import { VIEWER_CONNECT_KEY } from '../../src/src/viewer'

const CSRF = cookie('csrf_token', 'C1', {
    domain: 'www.reddit.com',
    hostOnly: true,
    httpOnly: false,
    sameSite: 'strict',
    session: true,
    expirationDate: undefined,
})

// The browser's cookies as chrome.cookies.getAll hands them to the save
const jarForChrome = (q, cb) => cb([...jar.values()].map(c => ({ ...c })))
// A second account's sign-in starting (viewer.ts startViewerConnect)
const startSignIn = () => {
    __getLocalStorage()[VIEWER_CONNECT_KEY] = { started: Date.now(), mainUser: 'alice', main: [] }
}

const saved = { tabs: globalThis.chrome.tabs.query, cookies: globalThis.chrome.cookies, fetch: globalThis.fetch }

beforeEach(() => {
    __resetStorage()
    fill([cookie('reddit_session', 'S1'), cookie('token_v2', 'T1', { sameSite: 'unspecified' }), CSRF])
    browserMock.cookies = cookiesApi
    // storeRedditCookies reads through chrome.*, and only with a Reddit tab open
    globalThis.chrome.tabs.query = (q, cb) => cb([{ id: 1, url: 'https://www.reddit.com/' }])
    globalThis.chrome.cookies = { getAll: jarForChrome }
})

afterEach(() => {
    delete browserMock.cookies
    globalThis.chrome.tabs.query = saved.tabs
    globalThis.chrome.cookies = saved.cookies
    globalThis.fetch = saved.fetch
})

describe('the cookie snapshot', () => {
    it('saves each cookie with its expiry, SameSite and host-only flag', async () => {
        expect(await storeRedditCookies()).toBe(true)
        const snapshot = __getLocalStorage().stored_reddit_cookie_objects
        const session = snapshot.find(c => c.name === 'reddit_session')
        expect(session.expirationDate).toBe(EXPIRES)
        expect(session.hostOnly).toBe(false)
        expect(session.sameSite).toBe('no_restriction')
        const csrf = snapshot.find(c => c.name === 'csrf_token')
        expect(csrf.hostOnly).toBe(true)
        expect(csrf.expirationDate).toBeUndefined()
        expect(__getLocalStorage().stored_reddit_cookie_objects.find(c => c.name === 'reddit_session').value).toBe('S1')
    })

    it('puts a missing login back with its expiry, and a host-only cookie host-only', async () => {
        await storeRedditCookies()
        jar.clear()
        expect(await rehydrateStoredRedditCookies()).toBe(true)
        const session = find('reddit_session')
        expect(session.value).toBe('S1')
        expect(session.session).toBe(false)
        expect(session.expirationDate).toBe(EXPIRES)
        const csrf = find('csrf_token')
        expect(csrf.domain).toBe('www.reddit.com')
        expect(csrf.hostOnly).toBe(true)
        expect(csrf.session).toBe(true)
    })

    it('never replaces a cookie the browser holds, which may be newer or another account', async () => {
        await storeRedditCookies()
        fill([cookie('reddit_session', 'S2', { expirationDate: EXPIRES + 99 }), CSRF])
        cookiesApi.set.mockClear()
        await rehydrateStoredRedditCookies()
        expect(find('reddit_session').value).toBe('S2')
        expect(find('reddit_session').expirationDate).toBe(EXPIRES + 99)
        expect(find('token_v2').value).toBe('T1')
        expect(cookiesApi.set.mock.calls.map(([d]) => d.name)).toEqual(['token_v2'])
    })

    it('says whether it put anything back', async () => {
        await storeRedditCookies()
        cookiesApi.set.mockClear()
        expect(await rehydrateStoredRedditCookies()).toBe(false)
        expect(cookiesApi.set).not.toHaveBeenCalled()
        jar.clear()
        expect(await rehydrateStoredRedditCookies()).toBe(true)
    })

    it('fills gaps from a snapshot saved before 0.0.5.30 without replacing what the browser holds', async () => {
        __resetStorage(
            {},
            {
                stored_reddit_cookie_objects: [
                    { name: 'reddit_session', value: 'OLD', domain: '.reddit.com', path: '/', secure: true, httpOnly: true, storeId: '0', url: 'https://reddit.com' },
                    { name: 'csrf_token', value: 'C0', domain: 'www.reddit.com', path: '/', secure: true, httpOnly: false, storeId: '0', url: 'https://www.reddit.com' },
                ],
            },
        )
        fill([cookie('reddit_session', 'S2')])
        await rehydrateStoredRedditCookies()
        expect(find('reddit_session').value).toBe('S2')
        expect(find('reddit_session').session).toBe(false)
        const csrf = find('csrf_token')
        expect(csrf.value).toBe('C0')
        expect(csrf.hostOnly).toBe(true)
        expect(csrf.domain).toBe('www.reddit.com')
    })

    it('leaves out a saved cookie that has expired', async () => {
        __resetStorage({}, { stored_reddit_cookie_objects: [{ ...cookie('token_v2', 'T0'), expirationDate: 1000 }] })
        jar.clear()
        await rehydrateStoredRedditCookies()
        expect(find('token_v2')).toBeUndefined()
    })

    it("leaves out the '.www.reddit.com' copies older versions made of host-only cookies", async () => {
        fill([cookie('reddit_session', 'S1'), CSRF, { ...CSRF, value: 'OLD', domain: '.www.reddit.com', hostOnly: false }])
        await storeRedditCookies()
        expect(__getLocalStorage().stored_reddit_cookie_objects.map(c => c.domain)).not.toContain('.www.reddit.com')
        // nor puts back one an older snapshot holds
        __resetStorage(
            {},
            {
                stored_reddit_cookie_objects: [
                    { name: 'csrf_token', value: 'OLD', domain: '.www.reddit.com', path: '/', secure: true, httpOnly: false, url: 'https://www.reddit.com' },
                ],
            },
        )
        jar.clear()
        expect(await rehydrateStoredRedditCookies()).toBe(false)
        expect(find('csrf_token')).toBeUndefined()
    })

    it("puts nothing back once a second account's sign-in starts, which owns the browser's cookies", async () => {
        await storeRedditCookies()
        jar.clear()
        cookiesApi.getAll.mockImplementationOnce(async () => {
            startSignIn()
            return []
        })
        expect(await rehydrateStoredRedditCookies()).toBe(false)
        expect(jar.size).toBe(0)
    })

    // reddit_session is a JWT whose exp is the expiry reddit gave the cookie.
    // Each test's login is a new one: a login is given its expiry back once.
    let logins = 0
    const jwt = exp => ['eyJhbGciOiJSUzI1NiJ9', Buffer.from(JSON.stringify({ sub: `t2_${++logins}`, exp })).toString('base64url'), 'sig'].join('.')
    const inDays = days => Math.floor(Date.now() / 1000) + days * 86400
    const sessionOnly = value => cookie('reddit_session', value, { session: true, expirationDate: undefined })

    it('gives a login left session-only the expiry reddit gave it, in the browser and the snapshot', async () => {
        const exp = inDays(30)
        const value = jwt(exp)
        fill([sessionOnly(value), CSRF])
        await storeRedditCookies()
        expect(find('reddit_session')).toMatchObject({ value, session: false, expirationDate: exp })
        expect(__getLocalStorage().stored_reddit_cookie_objects.find(c => c.name === 'reddit_session').expirationDate).toBe(exp)
        expect(find('csrf_token').session).toBe(true)
    })

    it('gives a login its expiry back once, though several saves run together', async () => {
        fill([sessionOnly(jwt(inDays(30)))])
        cookiesApi.set.mockClear()
        await Promise.all([storeRedditCookies(), storeRedditCookies(), storeRedditCookies()])
        expect(cookiesApi.set).toHaveBeenCalledTimes(1)
    })

    it("doesn't give a login its expiry back once a second account's sign-in starts", async () => {
        fill([sessionOnly(jwt(inDays(30)))])
        globalThis.chrome.cookies = {
            getAll: (q, cb) => {
                startSignIn()
                jarForChrome(q, cb)
            },
        }
        cookiesApi.set.mockClear()
        await storeRedditCookies()
        expect(cookiesApi.set).not.toHaveBeenCalled()
    })

    it("leaves a session-only login alone when its value isn't a JWT or its expiry is too far off", async () => {
        for (const value of ['not-a-jwt', jwt(inDays(5 * 365))]) {
            fill([sessionOnly(value)])
            cookiesApi.set.mockClear()
            await storeRedditCookies()
            expect(find('reddit_session').session).toBe(true)
            expect(cookiesApi.set).not.toHaveBeenCalled()
        }
    })

    it('saves a session-only login whose JWT has expired with that expiry, so it is never put back', async () => {
        fill([sessionOnly(jwt(inDays(-3)))])
        cookiesApi.set.mockClear()
        await storeRedditCookies()
        expect(cookiesApi.set).not.toHaveBeenCalled()
        jar.clear()
        await rehydrateStoredRedditCookies()
        expect(find('reddit_session')).toBeUndefined()
    })

    it('fills a missing login from an older snapshot with the expiry its JWT carries, unless that has passed', async () => {
        const exp = inDays(30)
        const entry = value => ({ name: 'reddit_session', value, domain: '.reddit.com', path: '/', secure: true, httpOnly: true, url: 'https://reddit.com' })
        __resetStorage({}, { stored_reddit_cookie_objects: [entry(jwt(exp))] })
        jar.clear()
        await rehydrateStoredRedditCookies()
        expect(find('reddit_session')).toMatchObject({ session: false, expirationDate: exp })

        __resetStorage({}, { stored_reddit_cookie_objects: [entry(jwt(inDays(-3)))] })
        jar.clear()
        expect(await rehydrateStoredRedditCookies()).toBe(false)
        expect(find('reddit_session')).toBeUndefined()
    })

    it('the quarantined-content check takes the login out for its request and puts it back with its expiry', async () => {
        let loginDuringRequest
        globalThis.fetch = vi.fn(async () => {
            loginDuringRequest = find('reddit_session')
            return { ok: true, json: async () => ({ data: { children: [] } }) }
        })
        // Its only callers pass OAuth details (the fallback after www fails)
        const auth = { headers: { Authorization: 'bearer x' } }
        await lookupItemsByUser('alice', '', 'new', '', true, auth)
        expect(globalThis.fetch).toHaveBeenCalledWith(
            'https://oauth.reddit.com/user/alice/overview.json?limit=100&sort=new&raw_json=1',
            { ...auth, cache: 'reload' },
        )
        expect(loginDuringRequest).toBeUndefined()
        expect(find('reddit_session')).toMatchObject({
            value: 'S1',
            session: false,
            expirationDate: EXPIRES,
            sameSite: 'no_restriction',
        })
    })
})
