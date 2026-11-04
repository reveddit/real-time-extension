// Tri-state logged-in-user detection (getLoggedinUserDetailed): a definite
// logged-out answer must be distinguishable from a broken detection channel
// (challenge page, 429, network error), the challenge solver must rescue a
// challenged /api/me.json, and an indeterminate primary host must fall back to
// the other host. Also covers the login-failure badge counter and the
// post-429 verification budget helper.

// Install chrome global BEFORE any source import
import '../mocks/chrome-api.js'

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import browserMock, { __resetStorage, __getLocalStorage, __getSyncStorage } from '../mocks/webextension-polyfill.js'
import { cookie, fill, cookiesApi } from '../mocks/cookies.js'

import {
    getLoggedinUserDetailed,
    getLoggedinUser,
    whoIsSignedIn,
    recordLoginDetectOutcome,
    isSettledByLogin,
    LOGGED_IN_VIEW_UNAVAILABLE,
    computeAbsentVerifyBudget,
    RECENT_RATE_LIMIT_WINDOW_MS,
} from '../../src/src/requests'
import { checkForChanges } from '../../src/src/monitoring'
import { getUserInit } from '../../src/src/storage'

const res = (status, body) => ({
    ok: status >= 200 && status < 300,
    status,
    text: async () => body,
})

const USER_JSON = JSON.stringify({ data: { name: 'alice' } })

// Matches parse_html/new.ts solveChallenge: needs the js_challenge marker, the
// string-doubling puzzle, and a token input.
const CHALLENGE_HTML =
    '<html><body>js_challenge <script>await(async e=>e+e)("abc")</script>' +
    '<input type="hidden" name="token" value="tok123"></body></html>'

let fetchMock

beforeEach(() => {
    __resetStorage()
    fill([cookie('reddit_session', 'S1')])
    browserMock.cookies = cookiesApi
    vi.spyOn(console, 'log').mockImplementation(() => {})
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
    delete browserMock.cookies
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
})

describe('whoIsSignedIn, for the second account’s sign-in', () => {
    it('names the user, says nobody on a clean logged-out answer, and rejects when reddit says nothing clear', async () => {
        fetchMock.mockResolvedValue(res(200, USER_JSON))
        expect(await whoIsSignedIn()).toBe('alice')
        fetchMock.mockResolvedValue(res(200, '{}'))
        expect(await whoIsSignedIn()).toBe(null)
        fetchMock.mockResolvedValue(res(200, '<html>some interstitial</html>'))
        await expect(whoIsSignedIn()).rejects.toThrow("reddit didn't say who's signed in")
    })
})

describe('getLoggedinUserDetailed', () => {
    it('resolves the username from clean JSON', async () => {
        fetchMock.mockResolvedValue(res(200, USER_JSON))
        const result = await getLoggedinUserDetailed()
        expect(result).toEqual({ user: 'alice', indeterminate: false })
    })

    it('classifies clean JSON without a name as definite logged-out', async () => {
        fetchMock.mockResolvedValue(res(200, '{}'))
        const result = await getLoggedinUserDetailed()
        expect(result.user).toBe(null)
        expect(result.indeterminate).toBe(false)
    })

    it('classifies HTML responses on every host as indeterminate, not logged-out', async () => {
        fetchMock.mockResolvedValue(res(200, '<html>some interstitial</html>'))
        const result = await getLoggedinUserDetailed()
        expect(result.user).toBe(null)
        expect(result.indeterminate).toBe(true)
        expect(result.reason).toContain('non-JSON')
        // primary www + fallback old.reddit were both probed
        const urls = fetchMock.mock.calls.map(c => String(c[0]))
        expect(urls.some(u => u.includes('www.reddit.com/api/me.json'))).toBe(true)
        expect(urls.some(u => u.includes('old.reddit.com/api/me.json'))).toBe(true)
    })

    it('falls back to the other host when the primary is rate-limited', async () => {
        fetchMock.mockImplementation(async url => {
            if (String(url).includes('www.reddit.com')) {
                return res(429, '')
            }
            return res(200, USER_JSON)
        })
        const result = await getLoggedinUserDetailed()
        expect(result).toEqual({ user: 'alice', indeterminate: false })
    })

    it('solves the me.json challenge and retries with the solution URL', async () => {
        fetchMock.mockImplementation(async url => {
            const u = String(url)
            if (u.includes('js_challenge=1')) {
                expect(u).toContain('solution=abcabc')
                expect(u).toContain('token=tok123')
                return res(200, USER_JSON)
            }
            return res(200, CHALLENGE_HTML)
        })
        const result = await getLoggedinUserDetailed()
        expect(result).toEqual({ user: 'alice', indeterminate: false })
    })

    it('classifies network failures as indeterminate', async () => {
        fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
        const result = await getLoggedinUserDetailed()
        expect(result.user).toBe(null)
        expect(result.indeterminate).toBe(true)
    })

    it('getLoggedinUser keeps the legacy username-or-null shape', async () => {
        fetchMock.mockResolvedValue(res(200, USER_JSON))
        expect(await getLoggedinUser()).toBe('alice')
        fetchMock.mockResolvedValue(res(200, '{}'))
        expect(await getLoggedinUser()).toBe(null)
    })
})

describe('a browser with no Reddit login', () => {
    beforeEach(() => fill([cookie('token_v2', 'T1')]))

    it("is signed out without asking reddit, which would only refuse", async () => {
        expect(await getLoggedinUserDetailed()).toEqual({ user: null, indeterminate: false })
        expect(fetchMock).not.toHaveBeenCalled()
    })

    it('gets a login it lost back first, then asks', async () => {
        __getLocalStorage().stored_reddit_cookie_objects = [cookie('reddit_session', 'S1')]
        fetchMock.mockResolvedValue(res(200, USER_JSON))
        expect(await getLoggedinUserDetailed()).toEqual({ user: 'alice', indeterminate: false })
    })
})

describe('a check for a remembered user', () => {
    const REFUSED = res(403, 'blocked')
    const LISTING = { ok: true, status: 200, json: async () => ({ data: { children: [] } }) }
    // The check's work finishes after checkForChanges returns
    const check = async () => {
        const sync = __getSyncStorage()
        delete sync.last_check
        await checkForChanges()
        await vi.waitFor(() => expect(sync.last_check).toBeDefined())
    }

    beforeEach(() => {
        const options = { removal_status: { track: true }, lock_status: { track: true } }
        const subscriptions = { user_subscriptions: {}, other_subscriptions: {} }
        Object.assign(__getSyncStorage(), subscriptions, { options }, getUserInit('alice'))
        __getLocalStorage().last_logged_in_user = 'alice'
    })

    it('with no login, asks the user to log in in place of any earlier warning, and sends nothing', async () => {
        fill([])
        __getLocalStorage().error_status = 'reddit_blocked'
        await check()
        expect(__getLocalStorage().error_status).toBe('needs_user')
        expect(fetchMock).not.toHaveBeenCalled()
    })

    it("says the login isn't working once reddit has refused the login check and the listing five times", async () => {
        fetchMock.mockResolvedValue(REFUSED)
        for (let i = 0; i < 4; i++) await check()
        expect(__getLocalStorage().error_status).toBe('reddit_blocked')
        await check()
        expect(__getLocalStorage().error_status).toBe(LOGGED_IN_VIEW_UNAVAILABLE)
    })

    it("doesn't take an outage or a rate limit for a lost login", async () => {
        for (const answer of [
            () => Promise.reject(new TypeError('Failed to fetch')),
            async () => res(503, 'down'),
            async () => res(429, 'slow down'),
        ]) {
            fetchMock.mockImplementation(answer)
            for (let i = 0; i < 6; i++) {
                await check()
                delete __getLocalStorage().rate_limit_until
            }
            expect(__getLocalStorage().error_status).not.toBe(LOGGED_IN_VIEW_UNAVAILABLE)
            expect(__getLocalStorage().login_detect_consecutive_failures).toBeUndefined()
        }
    })

    it("doesn't call a reddit tab that can't answer a lost login during an outage", async () => {
        vi.spyOn(chrome.tabs, 'query').mockImplementation((query, callback) =>
            callback([{ id: 1, url: 'https://www.reddit.com/' }]),
        )
        vi.spyOn(chrome.tabs, 'sendMessage').mockImplementation((id, message, callback) => {
            chrome.runtime.lastError = { message: 'Receiving end does not exist.' }
            callback()
            delete chrome.runtime.lastError
        })
        fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
        await check()
        expect(__getLocalStorage().error_status).not.toBe('needs_user')
    })

    it('counts a challenge on both reads as a refusal: nothing is being checked', async () => {
        const challenge = {
            ...res(200, '<html>js_challenge</html>'),
            json: () => Promise.reject(new SyntaxError('Unexpected token <')),
        }
        fetchMock.mockResolvedValue(challenge)
        for (let i = 0; i < 5; i++) await check()
        expect(__getLocalStorage().error_status).toBe(LOGGED_IN_VIEW_UNAVAILABLE)
    })

    it("doesn't take an outage for a lost login with no remembered user either", async () => {
        delete __getLocalStorage().last_logged_in_user
        fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
        for (let i = 0; i < 6; i++) await check()
        expect(__getLocalStorage().error_status).not.toBe(LOGGED_IN_VIEW_UNAVAILABLE)
    })

    it('keeps the warning mark through the pass over followed items', async () => {
        fill([])
        __getSyncStorage().other_subscriptions = { t1_followed: true }
        fetchMock.mockResolvedValue(LISTING)
        // The background, where the badge is set directly
        vi.stubGlobal('location', { protocol: 'chrome-extension:' })
        const badge = vi.spyOn(chrome.action, 'setBadgeText')
        await check()
        await vi.waitFor(() => expect(badge.mock.calls.length).toBeGreaterThan(1))
        expect(__getLocalStorage().error_status).toBe('needs_user')
        await vi.waitFor(() => expect(badge.mock.calls.at(-1)[0]).toEqual({ text: '!' }))
    })

    it('a listing that comes back ends the count: the login works, whatever the login check says', async () => {
        fetchMock.mockResolvedValue(REFUSED)
        for (let i = 0; i < 4; i++) await check()
        fetchMock.mockImplementation(async url => (String(url).includes('/user/me.json') ? LISTING : REFUSED))
        await check()
        expect(__getLocalStorage().login_detect_consecutive_failures).toBeUndefined()
        fetchMock.mockResolvedValue(REFUSED)
        await check()
        expect(__getLocalStorage().error_status).not.toBe(LOGGED_IN_VIEW_UNAVAILABLE)
    })
})

describe('recordLoginDetectOutcome', () => {
    it('sets the warning badge status after five consecutive indeterminates', async () => {
        for (let i = 0; i < 4; i++) {
            await recordLoginDetectOutcome(true)
        }
        expect(__getLocalStorage().error_status).toBeUndefined()
        await recordLoginDetectOutcome(true)
        expect(__getLocalStorage().error_status).toBe(LOGGED_IN_VIEW_UNAVAILABLE)
        expect(__getLocalStorage().login_detect_consecutive_failures).toBe(5)
    })

    it('a definite outcome resets the streak', async () => {
        await recordLoginDetectOutcome(true)
        await recordLoginDetectOutcome(true)
        await recordLoginDetectOutcome(false)
        expect(__getLocalStorage().login_detect_consecutive_failures).toBeUndefined()
    })

    it('finding the user signed in settles only the warnings about being signed in', () => {
        expect(isSettledByLogin('needs_user')).toBe(true)
        expect(isSettledByLogin(LOGGED_IN_VIEW_UNAVAILABLE)).toBe(true)
        for (const status of [
            'login_required',
            'viewer_signed_out',
            'viewer_unavailable',
            'public_view_unavailable',
            'absent_verify_unavailable',
            undefined,
        ]) {
            expect(isSettledByLogin(status)).toBe(false)
        }
    })
})

describe('computeAbsentVerifyBudget', () => {
    it('uses the full budget when no rate limit was ever hit', () => {
        expect(computeAbsentVerifyBudget(null)).toEqual({ maxPerCycle: 20, delayMs: 500 })
    })

    it('halves the burst and doubles the spacing within the recent window', () => {
        expect(computeAbsentVerifyBudget(RECENT_RATE_LIMIT_WINDOW_MS - 1)).toEqual({
            maxPerCycle: 10,
            delayMs: 1000,
        })
    })

    it('restores the full budget after the window passes', () => {
        expect(computeAbsentVerifyBudget(RECENT_RATE_LIMIT_WINDOW_MS + 1)).toEqual({
            maxPerCycle: 20,
            delayMs: 500,
        })
    })
})
