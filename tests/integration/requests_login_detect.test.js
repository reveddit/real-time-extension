// Tri-state logged-in-user detection (getLoggedinUserDetailed): a definite
// logged-out answer must be distinguishable from a broken detection channel
// (challenge page, 429, network error), the challenge solver must rescue a
// challenged /api/me.json, and an indeterminate primary host must fall back to
// the other host. Also covers the login-failure badge counter and the
// post-429 verification budget helper.

// Install chrome global BEFORE any source import
import '../mocks/chrome-api.js'

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { __resetStorage, __getLocalStorage } from '../mocks/webextension-polyfill.js'

import {
    getLoggedinUserDetailed,
    getLoggedinUser,
    recordLoginDetectOutcome,
    LOGGED_IN_VIEW_UNAVAILABLE,
    computeAbsentVerifyBudget,
    RECENT_RATE_LIMIT_WINDOW_MS,
} from '../../src/src/requests'

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
    vi.spyOn(console, 'log').mockImplementation(() => {})
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
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
