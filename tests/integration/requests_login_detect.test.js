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
import { json, res, untilAborted, blockPage, refusing } from '../mocks/responses.js'
import { cookie, fill, cookiesApi } from '../mocks/cookies.js'
import { thingIdEl, emptyStatePage } from '../mocks/public-profile.js'
import { getDiagEntries } from '../mocks/diag-entries.js'

import {
    getLoggedinUserDetailed,
    getLoggedinUser,
    lookupItemsByLoggedInUserWithAuth,
    whoIsSignedIn,
    recordLoginDetectOutcome,
    isSettledByLogin,
    LOGGED_IN_VIEW_UNAVAILABLE,
} from '../../src/src/reddit-auth'
import { CHECKS_FAILING, getItemsCheckStatus } from '../../src/src/lookup-status'
import { computeAbsentVerifyBudget } from '../../src/src/page-verify'
import { RECENT_RATE_LIMIT_WINDOW_MS } from '../../src/src/request-gates'
import { checkForChanges } from '../../src/src/monitoring'
import { getUserInit, getObjectNamesForThing } from '../../src/src/storage'
import { readWithLogin, _scanTurn } from '../../src/src/requests'
import { WWW_FETCH_TIMEOUT_MS, _resetLoggedInFetchState } from '../../src/src/logged-in-fetch'
import { clearDiagLog } from '../../src/src/diaglog'

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
    // A check with a reddit tab open saves the cookie snapshot
    globalThis.chrome.cookies = { getAll: (q, cb) => cb([]) }
    // The request style the login check and the listing learned
    _resetLoggedInFetchState()
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
    delete browserMock.cookies
    delete globalThis.chrome.cookies
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

// Neither comes from the browser's cache, and a block page gets a try in the other
// style (logged-in-fetch.ts). On 2026-10-21 the edge refused 'reload' from the
// background, and 0.0.5.25 failed every lookup sending it.
describe("the login check and the user's listing, where reddit's edge refuses one request style", () => {
    const reads = {
        'who is signed in': [getLoggedinUserDetailed, { user: 'alice', indeterminate: false }],
        "the user's listing": [lookupItemsByLoggedInUserWithAuth, []],
    }
    const answer = url =>
        String(url).includes('/user/me.json') ? json(200, { data: { children: [] } }) : res(200, USER_JSON)

    it.each([
        ['who is signed in', 'reload', ['no-store']],
        ['who is signed in', 'no-store', ['no-store', 'no-cache']],
        ["the user's listing", 'reload', ['no-store']],
        ["the user's listing", 'no-store', ['no-store', 'no-cache']],
    ])('reads %s past a block page for %s', async (read, style, sent) => {
        const [run, expected] = reads[read]
        fetchMock.mockImplementation(refusing(style, answer))
        expect(await run()).toEqual(expected)
        expect(fetchMock.mock.calls.map(([, init]) => init.cache)).toEqual(sent)
    })

    // Its edge may refuse what www's lets through
    it('reads who is signed in from www when old.reddit.com, asked first for its open tab, refuses both', async () => {
        vi.spyOn(chrome.tabs, 'query').mockImplementation((query, callback) =>
            callback([{ id: 1, url: 'https://old.reddit.com/' }]),
        )
        const old = refusing()
        const www = refusing('no-store', answer)
        fetchMock.mockImplementation((url, init) => (String(url).startsWith('https://old.') ? old : www)(url, init))
        expect(await getLoggedinUserDetailed()).toEqual({ user: 'alice', indeterminate: false })
        expect(fetchMock.mock.calls.map(([url, init]) => `${new URL(url).host} ${init.cache}`)).toEqual([
            'old.reddit.com no-store',
            'old.reddit.com no-cache',
            'www.reddit.com no-store',
            'www.reddit.com no-cache',
        ])
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

describe("a scan's read when the count of login refusals can't be read", () => {
    it('still answers, and a 429 still enters the backoff', async () => {
        const get = browserMock.storage.local.get
        vi.spyOn(browserMock.storage.local, 'get').mockImplementation(async keys => {
            if ('login_detect_consecutive_failures' in Object(keys)) throw new Error('unreadable')
            return get(keys)
        })
        _scanTurn.next = 0
        fetchMock.mockResolvedValue(new Response('', { status: 429 }))
        expect(await readWithLogin('/user/bob/comments/.rss')).toMatchObject({ ok: false, status: 429 })
        await vi.waitFor(() => expect(__getLocalStorage().rate_limit_until).toBeGreaterThan(Date.now()))
    })
})

describe('a check for a remembered user', () => {
    const LISTING = { ok: true, status: 200, json: async () => ({ data: { children: [] } }) }
    const listingBy = author => ({
        ok: true,
        status: 200,
        json: async () => ({ data: { children: [{ kind: 't1', data: { name: 't1_a', author, body: 'b' } }] } }),
    })
    const keys = getObjectNamesForThing('alice', true)
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
        Object.assign(__getSyncStorage(), subscriptions, { options }, structuredClone(getUserInit('alice')))
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
        fetchMock.mockResolvedValue(blockPage())
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
        vi.spyOn(browserMock.tabs, 'sendMessage').mockRejectedValue(
            new Error('Could not establish connection. Receiving end does not exist.'),
        )
        fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
        await check()
        expect(__getLocalStorage().error_status).not.toBe('needs_user')
    })

    it('gives up in time on a login check and a listing whose bodies stall, and takes that for an outage', async () => {
        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
        // The headers come, and the body only ends when the read is given up on
        fetchMock.mockImplementation(async (url, init) => ({
            ok: true,
            status: 200,
            text: () => untilAborted(init.signal),
            json: () => untilAborted(init.signal),
        }))
        delete __getSyncStorage().last_check
        await checkForChanges()
        // The login check on each host, then the listing
        for (let i = 0; i < 3; i++) await vi.advanceTimersByTimeAsync(WWW_FETCH_TIMEOUT_MS)
        await vi.waitFor(() => expect(__getSyncStorage().last_check).toBeDefined())
        expect(__getLocalStorage().check_consecutive_failures).toBe(1)
        expect(__getLocalStorage().login_detect_consecutive_failures).toBeUndefined()
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

    describe('when no cycle reads the listing', () => {
        const local = () => __getLocalStorage()
        const ME = res(200, USER_JSON)
        const listingIs = answer => async url => (String(url).includes('/user/me.json') ? answer() : ME)
        const fiveCycles = async () => {
            for (let i = 0; i < 4; i++) await check()
            expect(local().error_status).toBeUndefined()
            await check()
        }

        it('warns on the fifth, blaming nobody, and a listing that comes back ends it', async () => {
            for (const answer of [
                () => Promise.reject(new TypeError('Failed to fetch')),
                async () => res(503, 'down'),
                async () => res(404, 'gone'),
            ]) {
                fetchMock.mockImplementation(answer)
                await fiveCycles()
                expect(local().error_status).toBe(CHECKS_FAILING)
                fetchMock.mockImplementation(listingIs(async () => LISTING))
                await check()
                await vi.waitFor(() => expect(local().error_status).toBeUndefined())
                expect(local().check_consecutive_failures).toBeUndefined()
            }
        })

        it('counts the listing failing on its own, with the login check answering', async () => {
            fetchMock.mockImplementation(listingIs(async () => res(503, 'down')))
            await fiveCycles()
            expect(local().error_status).toBe(CHECKS_FAILING)
        })

        it('leaves a rate limit to say it is the reason', async () => {
            fetchMock.mockImplementation(async () => res(429, 'slow down'))
            for (let i = 0; i < 6; i++) {
                await check()
                delete local().rate_limit_until
            }
            expect(local().error_status).toBe('rate_limited')
            expect(local().check_consecutive_failures).toBeUndefined()
        })

        it("doesn't talk over a warning already up", async () => {
            local().error_status = 'reddit_blocked'
            fetchMock.mockImplementation(async () => res(503, 'down'))
            for (let i = 0; i < 6; i++) await check()
            expect(local().error_status).toBe('reddit_blocked')
        })

        const takesOverFrom = async warning => {
            local().error_status = warning
            fetchMock.mockImplementation(async () => res(503, 'down'))
            for (let i = 0; i < 5; i++) await check()
            expect(local().error_status).toBe(CHECKS_FAILING)
        }

        it.each([
            ['profile_pagination_unavailable', 'profile_pagination_consecutive_shortfalls'],
            ['absent_verify_unavailable', 'absent_verify_consecutive_failures'],
        ])('takes over from a warning about part of the check, %s, and a good pass puts that back', async (warning, failures) => {
            local()[failures] = 5
            await takesOverFrom(warning)
            fetchMock.mockImplementation(listingIs(async () => LISTING))
            await check()
            await vi.waitFor(() => expect(local().error_status).toBe(warning))
        })

        // Not put back here: a pass with no items to check ends this warning
        it('takes over from a warning about part of the check, viewer_unavailable', () =>
            takesOverFrom('viewer_unavailable'))
    })

    it("takes a login check that names the user as the end of the refusals, whatever the listing does", async () => {
        __getLocalStorage().login_detect_consecutive_failures = 7
        fetchMock.mockImplementation(async url =>
            String(url).includes('/user/me.json') ? res(503, 'down') : res(200, USER_JSON),
        )
        await check()
        expect(__getLocalStorage().login_detect_consecutive_failures).toBeUndefined()
    })

    it("doesn't check another account's listing under the remembered name", async () => {
        const local = __getLocalStorage()
        // The login check doesn't answer, so all there is to go on is the name
        const listing = answer => async url => (String(url).includes('/user/me.json') ? answer : res(503, 'down'))
        fetchMock.mockImplementation(listing(listingBy('bob')))
        await check()
        expect(local.check_consecutive_failures).toBe(1)
        // Theirs, in any case: this one's checked, so it adds no failure
        fetchMock.mockImplementation(listing(listingBy('Alice')))
        await check()
        expect(local.check_consecutive_failures).toBe(1)
    })

    it('takes an empty listing under the remembered name as no news, neither a pass nor a failure', async () => {
        const local = __getLocalStorage()
        // The login check doesn't answer, and a user who has posted nothing
        // gets this listing as much as another account would
        fetchMock.mockImplementation(async url => (String(url).includes('/user/me.json') ? LISTING : res(503, 'down')))
        for (let i = 0; i < 5; i++) await check()
        expect(local.error_status).toBeUndefined()
        expect(local.check_consecutive_failures).toBeUndefined()
        const before = {
            error_status: 'reddit_blocked',
            check_consecutive_failures: 2,
            login_detect_consecutive_failures: 3,
        }
        Object.assign(local, before)
        await check()
        expect(local).toMatchObject(before)
    })

    describe('when the login check names the user', () => {
        const listingIs = answer => async url => (String(url).includes('/user/me.json') ? answer : res(200, USER_JSON))

        it("doesn't check a listing with none of their items", async () => {
            fetchMock.mockImplementation(listingIs(listingBy('bob')))
            await check()
            expect(__getLocalStorage().check_consecutive_failures).toBe(1)
            expect(__getSyncStorage()[keys.approved]).toEqual({})
            expect(fetchMock.mock.calls.filter(([url]) => String(url).includes('/user/alice/'))).toEqual([])
        })

        it('checks a listing whose author differs only in letter case', async () => {
            fetchMock.mockImplementation(listingIs(listingBy('ALICE')))
            await check()
            expect(__getLocalStorage().check_consecutive_failures).toBeUndefined()
            expect(fetchMock.mock.calls.filter(([url]) => String(url).includes('/user/alice/'))).not.toEqual([])
        })

        it('takes an empty listing for a clean pass: a new account has no items', async () => {
            __getLocalStorage().check_consecutive_failures = 2
            fetchMock.mockImplementation(listingIs(LISTING))
            await check()
            expect(__getLocalStorage().check_consecutive_failures).toBeUndefined()
        })
    })

    it('leaves the stored options alone, so a save during a cycle with a quarantined item stands', async () => {
        const saved = { ...__getSyncStorage().options, interval: 9 }
        const children = [{ kind: 't1', data: { name: 't1_q', author: 'alice', body: 'b', quarantine: true } }]
        const quarantined = {
            ok: true,
            status: 200,
            json: async () => {
                // The options page saves while the cycle runs on its older copy
                __getSyncStorage().options = saved
                return { data: { children } }
            },
        }
        fetchMock.mockImplementation(async url =>
            String(url).includes('/user/me.json') ? quarantined : res(503, 'down'),
        )
        await check()
        expect(__getSyncStorage().options).toEqual(saved)
    })

    describe('with a reddit tab open', () => {
        const container = { id: 1, url: 'https://www.reddit.com/', cookieStoreId: 'firefox-container-1' }
        const privateWindow = { id: 2, url: 'https://old.reddit.com/', incognito: true }
        const regular = { id: 3, url: 'https://www.reddit.com/', cookieStoreId: 'firefox-default' }
        let send
        const withTabs = tabs => vi.spyOn(chrome.tabs, 'query').mockImplementation((query, callback) => callback(tabs))

        beforeEach(() => {
            fetchMock.mockImplementation(async url => (String(url).includes('/user/me.json') ? LISTING : res(200, USER_JSON)))
            send = vi.spyOn(browserMock.tabs, 'sendMessage').mockResolvedValue([])
        })

        it("in Firefox, doesn't read the user's listing through another identity's tab", async () => {
            vi.stubGlobal('__BUILT_FOR__', 'firefox')
            withTabs([container, privateWindow, regular])
            await check()
            expect(send.mock.calls.map(call => call[0])).toEqual([regular.id])
        })

        it('in Firefox, reads it from the background when only such tabs are open', async () => {
            vi.stubGlobal('__BUILT_FOR__', 'firefox')
            withTabs([container, privateWindow])
            await check()
            expect(send).not.toHaveBeenCalled()
            expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/user/me.json'))).toBe(true)
        })

        it("in Chrome, an incognito tab's content script runs in its own instance's world, so it stays in use", async () => {
            withTabs([privateWindow])
            await check()
            expect(send.mock.calls.map(call => call[0])).toEqual([privateWindow.id])
        })

        it("passes over tabs that can't answer: a discarded one has no page, and a frozen one runs nothing", async () => {
            withTabs([{ ...regular, id: 4, discarded: true }, { ...regular, id: 5, frozen: true }, regular])
            await check()
            expect(send.mock.calls.map(call => call[0])).toEqual([regular.id])
        })

        it('reads from the background when no tab can answer, and still saves the cookies', async () => {
            globalThis.chrome.cookies = { getAll: (q, cb) => cb([cookie('reddit_session', 'S1')]) }
            withTabs([{ ...regular, discarded: true }, { ...regular, id: 5, frozen: true }])
            await check()
            expect(send).not.toHaveBeenCalled()
            expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/user/me.json'))).toBe(true)
            await vi.waitFor(() => expect(__getLocalStorage().stored_reddit_cookie_objects).toHaveLength(1))
        })

        it("reads from the background when the tab's content script doesn't answer", async () => {
            withTabs([regular])
            send.mockRejectedValue(new Error('Could not establish connection. Receiving end does not exist.'))
            await check()
            expect(send).toHaveBeenCalledTimes(1)
            expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/user/me.json'))).toBe(true)
        })

        it("reads from the background when the browser can't list its tabs", async () => {
            withTabs(undefined)
            await check()
            expect(send).not.toHaveBeenCalled()
            expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/user/me.json'))).toBe(true)
        })

        describe('that never answers', () => {
            let answerLate
            const listingReads = () => fetchMock.mock.calls.filter(([url]) => String(url).includes('/user/me.json'))
            const logged = async () => (await getDiagEntries()).map(entry => entry.m)
            const startCheck = async () => {
                delete __getSyncStorage().last_check
                await checkForChanges()
                await vi.waitFor(() => expect(send).toHaveBeenCalled())
            }

            beforeEach(() => {
                vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
                send.mockImplementation(
                    () =>
                        new Promise(resolve => {
                            answerLate = resolve
                        }),
                )
                withTabs([regular])
            })

            it('gives up on it in time, and the stored cookies read the listing', async () => {
                await startCheck()
                await vi.advanceTimersByTimeAsync(WWW_FETCH_TIMEOUT_MS - 1000)
                expect(listingReads()).toEqual([])
                await vi.advanceTimersByTimeAsync(1000)
                await vi.waitFor(() => expect(__getSyncStorage().last_check).toBeDefined())
                expect(listingReads()).toHaveLength(1)
            })

            it('does nothing with an answer that comes after that', async () => {
                await startCheck()
                await vi.advanceTimersByTimeAsync(WWW_FETCH_TIMEOUT_MS)
                await vi.waitFor(() => expect(__getSyncStorage().last_check).toBeDefined())
                await clearDiagLog()
                const before = structuredClone(__getSyncStorage())
                answerLate([{ kind: 't1', data: { name: 't1_late', author: 'alice', body: 'b' } }])
                await vi.advanceTimersByTimeAsync(0)
                expect(await logged()).toEqual([])
                expect(__getSyncStorage()).toEqual(before)
                expect(listingReads()).toHaveLength(1)
            })

            it('calls the deadline off when it does answer', async () => {
                await clearDiagLog()
                await startCheck()
                answerLate([])
                await vi.waitFor(() => expect(__getSyncStorage().last_check).toBeDefined())
                await vi.advanceTimersByTimeAsync(WWW_FETCH_TIMEOUT_MS)
                expect(listingReads()).toEqual([])
                expect((await logged()).filter(line => line.startsWith('No answer'))).toEqual([])
            })
        })
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
        fetchMock.mockResolvedValue(blockPage())
        for (let i = 0; i < 4; i++) await check()
        fetchMock.mockImplementation(async url => {
            if (String(url).includes('/user/me.json')) return listingBy('alice')
            if (String(url).includes('/user/alice/comments/')) return res(200, thingIdEl('t1_a'))
            return String(url).includes('/user/alice/submitted/') ? res(200, emptyStatePage('posts')) : blockPage()
        })
        await check()
        expect(__getLocalStorage().login_detect_consecutive_failures).toBeUndefined()
        fetchMock.mockResolvedValue(blockPage())
        await check()
        expect(__getLocalStorage().error_status).not.toBe(LOGGED_IN_VIEW_UNAVAILABLE)
    })

    // 2026-11-17: the status line said "last check 7:51 AM" while no lookup
    // after a listing that came back had read anything since 4:03 (diag-status.ts)
    it("keeps when a check last read the user's items, and since when none has", async () => {
        const UNREADABLE = '<html><body><shreddit-post id="t3_x1" author="someone"></shreddit-post></body></html>'
        let comments = thingIdEl('t1_a')
        let posts = emptyStatePage('posts')
        fetchMock.mockImplementation(async url => {
            if (String(url).includes('/user/me.json')) return listingBy('alice')
            if (String(url).includes('/user/alice/comments/')) return res(200, comments)
            return String(url).includes('/user/alice/submitted/') ? res(200, posts) : blockPage()
        })
        await check()
        const { itemsCheckedAt } = await getItemsCheckStatus()
        expect(itemsCheckedAt).toBeGreaterThan(Date.now() - 60 * 1000)

        // The listing comes back, so it's no failed check, but the lookup reads
        // nothing: neither tab can be read
        comments = UNREADABLE
        posts = UNREADABLE
        await check()
        expect(__getLocalStorage().check_consecutive_failures).toBeUndefined()
        const failing = await getItemsCheckStatus()
        expect(failing.itemsCheckedAt).toBe(itemsCheckedAt)
        expect(failing.itemsFailingSince).toBeGreaterThanOrEqual(itemsCheckedAt)
        await check()
        expect(await getItemsCheckStatus()).toEqual(failing)

        comments = thingIdEl('t1_a')
        posts = emptyStatePage('posts')
        await check()
        expect((await getItemsCheckStatus()).itemsFailingSince).toBe(0)
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
            'public_view_unreadable',
            'profile_posts_unreadable',
            'profile_comments_unreadable',
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
