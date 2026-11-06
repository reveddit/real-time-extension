// What every scan's read goes through in the background (requests.ts
// readWithLogin): one pace and one backoff across tabs, never the browser's
// cache, and the switches that turn scans away before anything is sent.

// Install chrome global BEFORE any source import
import '../mocks/chrome-api.js'

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import browserMock, { __resetStorage, __getLocalStorage, __getSyncStorage } from '../mocks/webextension-polyfill.js'
import { cookie, fill, cookiesApi } from '../mocks/cookies.js'

import { readWithLogin, _scanTurn } from '../../src/src/requests'
import { _loggedInFetchState } from '../../src/src/logged-in-fetch'
import { VIEWER_CONNECT_KEY } from '../../src/src/viewer'
import { NEWS_CACHE_KEY, MECHANISM_SCAN_FEEDS } from '../../src/src/news'
import { RECENT_RATE_LIMIT_WINDOW_MS } from '../../src/src/request-gates'

const PATH = '/user/alice/comments/.rss?sort=new&limit=100'
const answer = (status, type = 'application/atom+xml', body = '<feed/>') =>
    new Response(body, { status, headers: { 'content-type': type } })
const blockPage = () => answer(403, 'text/html', 'network security')

let fetchMock

beforeEach(() => {
    __resetStorage()
    fill([cookie('reddit_session', 'S1')])
    browserMock.cookies = cookiesApi
    _scanTurn.next = 0
    Object.assign(_loggedInFetchState, { preferredCacheMode: 0, doubleBlockUntil: 0 })
    fetchMock = vi.fn(async () => answer(200))
    vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
    delete browserMock.cookies
    vi.unstubAllGlobals()
    vi.useRealTimers()
})

describe('a read for a scan', () => {
    it("carries the login and never comes from the browser's cache, as feeds invite", async () => {
        expect(await readWithLogin(PATH)).toMatchObject({ ok: true, status: 200, text: '<feed/>' })
        expect(fetchMock.mock.calls[0][0]).toBe(`https://www.reddit.com${PATH}`)
        expect(fetchMock.mock.calls[0][1]).toMatchObject({ credentials: 'include', cache: 'no-store' })
    })

    it("leaves a block page's second try to the page, in the other mode, at no cost to other requests", async () => {
        fetchMock.mockImplementation(async () => blockPage())
        const first = await readWithLogin(PATH)
        expect(first).toMatchObject({ ok: false, status: 403, blockPage: true, otherMode: 1 })
        expect(fetchMock).toHaveBeenCalledTimes(1)
        _scanTurn.next = 0
        const second = await readWithLogin(PATH, first.otherMode)
        expect(second).toMatchObject({ ok: false, status: 403, blockPage: true, otherMode: undefined })
        expect(fetchMock.mock.calls.map(call => call[1].cache)).toEqual(['no-store', 'no-cache'])
        expect(_loggedInFetchState.doubleBlockUntil).toBe(0)
    })

    it('keeps the mode a second try got past the edge in', async () => {
        fetchMock.mockImplementation(async (url, { cache }) => (cache === 'no-cache' ? answer(200) : blockPage()))
        const { otherMode } = await readWithLogin(PATH)
        _scanTurn.next = 0
        expect(await readWithLogin(PATH, otherMode)).toMatchObject({ ok: true })
        _scanTurn.next = 0
        await readWithLogin(PATH)
        expect(fetchMock.mock.calls.at(-1)[1].cache).toBe('no-cache')
    })

    it('tries the mode its first try named, whatever another request has learned since', async () => {
        fetchMock.mockImplementation(async () => blockPage())
        const { otherMode } = await readWithLogin(PATH)
        _loggedInFetchState.preferredCacheMode = 1
        _scanTurn.next = 0
        await readWithLogin(PATH, otherMode)
        expect(fetchMock.mock.calls.map(call => call[1].cache)).toEqual(['no-store', 'no-cache'])
    })

    it('offers no second try while both modes are blocked for every request', async () => {
        _loggedInFetchState.doubleBlockUntil = Date.now() + 60000
        fetchMock.mockImplementation(async () => blockPage())
        expect(await readWithLogin(PATH)).toMatchObject({ blockPage: true, otherMode: undefined })
    })

    it('a 429 enters the backoff that monitoring and the bridge honor, once', async () => {
        fetchMock.mockImplementation(async () => answer(429))
        expect(await readWithLogin(PATH)).toMatchObject({ ok: false, status: 429 })
        await vi.waitFor(() => expect(__getLocalStorage().rate_limit_level).toBe(1))
        expect(__getLocalStorage().rate_limit_until).toBeGreaterThan(Date.now())
        expect(__getLocalStorage().error_status).toBe('rate_limited')
    })

    it('gets no answer past its deadline, so a stalled feed ends', async () => {
        vi.useFakeTimers()
        fetchMock.mockImplementation(
            (url, { signal }) =>
                new Promise((resolve, reject) => {
                    signal.addEventListener('abort', () => reject(new Error('aborted')))
                }),
        )
        const reading = readWithLogin(PATH).catch(err => err.message)
        await vi.advanceTimersByTimeAsync(21000)
        expect(await reading).toBe('aborted')
    })

})

describe('scans in several tabs', () => {
    it('hear how long until their turn, and nothing goes out', async () => {
        vi.useFakeTimers()
        const [first, second] = await Promise.all([readWithLogin(PATH), readWithLogin(PATH)])
        expect(first).toMatchObject({ ok: true })
        expect(second).toEqual({ ok: false, status: 0, waitMs: 3000 })
        expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it("take a turn for a block page's second try too", async () => {
        vi.useFakeTimers()
        fetchMock.mockImplementation(async () => blockPage())
        const { otherMode } = await readWithLogin(PATH)
        expect(await readWithLogin(PATH, otherMode)).toEqual({ ok: false, status: 0, waitMs: 3000 })
        expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    // Each read sent as soon as it may go, and when each went out
    const paceOf = async count => {
        vi.useFakeTimers()
        const sent = []
        fetchMock.mockImplementation(async () => {
            sent.push(Date.now())
            return answer(200)
        })
        for (let i = 0; i < count; i++) {
            const { waitMs } = await readWithLogin(PATH)
            if (!waitMs) continue
            await vi.advanceTimersByTimeAsync(waitMs)
            await readWithLogin(PATH)
        }
        return sent.map(at => at - sent[0])
    }

    it('take turns, every 3 seconds unless the options say otherwise', async () => {
        expect(await paceOf(3)).toEqual([0, 3000, 6000])
    })

    it("take the pace from the options, and ignore one they can't use", async () => {
        __getSyncStorage().options = { scan_seconds_between_reads: 1.5 }
        expect(await paceOf(3)).toEqual([0, 1500, 3000])
        _scanTurn.next = 0
        __getSyncStorage().options = { scan_seconds_between_reads: 0 }
        expect(await paceOf(2)).toEqual([0, 3000])
    })

    it('go at half that for an hour after a 429', async () => {
        __getLocalStorage().rate_limit_last_hit = Date.now() - RECENT_RATE_LIMIT_WINDOW_MS / 2
        expect(await paceOf(2)).toEqual([0, 6000])
        _scanTurn.next = 0
        __getLocalStorage().rate_limit_last_hit = Date.now() - RECENT_RATE_LIMIT_WINDOW_MS - 1000
        expect(await paceOf(2)).toEqual([0, 3000])
    })

    it("keep to the website's limit where that's slower than the options", async () => {
        __getLocalStorage()[NEWS_CACHE_KEY] = { feed: { options: { scan_limits: { seconds_between_reads: 5 } } } }
        expect(await paceOf(2)).toEqual([0, 5000])
    })

    it('count the gap from when a read really went out, however late it was', async () => {
        vi.useFakeTimers()
        await readWithLogin(PATH)
        await vi.advanceTimersByTimeAsync(10000)
        await readWithLogin(PATH)
        expect(await readWithLogin(PATH)).toEqual({ ok: false, status: 0, waitMs: 3000 })
    })

    it('keep a turn already set when the pace gets faster', async () => {
        vi.useFakeTimers()
        __getSyncStorage().options = { scan_seconds_between_reads: 10 }
        await readWithLogin(PATH)
        __getSyncStorage().options = { scan_seconds_between_reads: 1 }
        await vi.advanceTimersByTimeAsync(500)
        expect(await readWithLogin(PATH)).toEqual({ ok: false, status: 0, waitMs: 9500 })
    })

    it('give up on a turn further off than a gap can be, as a clock set back leaves', async () => {
        _scanTurn.next = Date.now() + 2 * 3600 * 1000
        expect(await readWithLogin(PATH)).toMatchObject({ ok: true })
    })

    it('spend no turn on a read turned away', async () => {
        vi.useFakeTimers()
        fill([])
        expect(await readWithLogin(PATH)).toMatchObject({ needsLogin: true })
        fill([cookie('reddit_session', 'S1')])
        expect(await readWithLogin(PATH)).toMatchObject({ ok: true })
    })
})

describe('a login reddit keeps refusing', () => {
    // What monitoring leaves after refused login checks, whatever cookie is held
    beforeEach(() => {
        __getLocalStorage().login_detect_consecutive_failures = 5
    })

    it('asks to sign in where a rate limit would read as a wait, and starts no backoff', async () => {
        __getLocalStorage().error_status = 'logged_in_view_unavailable'
        fetchMock.mockImplementation(async () => answer(429))
        expect(await readWithLogin(PATH)).toMatchObject({ ok: false, status: 0, needsLogin: true })
        expect(__getLocalStorage().rate_limit_until).toBeUndefined()
        expect(__getLocalStorage().error_status).toBe('logged_in_view_unavailable')
    })

    it('asks to sign in where both tries got a block page, which would read as try later', async () => {
        fetchMock.mockImplementation(async () => blockPage())
        const first = await readWithLogin(PATH)
        expect(first).toMatchObject({ ok: false, status: 403, otherMode: 1 })
        _scanTurn.next = 0
        expect(await readWithLogin(PATH, first.otherMode)).toMatchObject({ ok: false, status: 0, needsLogin: true })
    })

    it('reads on when the other mode gets past the edge, which says the login is fine', async () => {
        fetchMock.mockImplementation(async (url, { cache }) => (cache === 'no-cache' ? answer(200) : blockPage()))
        const { otherMode } = await readWithLogin(PATH)
        _scanTurn.next = 0
        expect(await readWithLogin(PATH, otherMode)).toMatchObject({ ok: true })
    })

    it("still reads what reddit answers: only a refusal is taken for the login's", async () => {
        expect(await readWithLogin(PATH)).toMatchObject({ ok: true, text: '<feed/>' })
    })
})

describe('turned away before anything is sent', () => {
    it('during a backoff', async () => {
        __getLocalStorage().rate_limit_until = Date.now() + 60000
        expect(await readWithLogin(PATH)).toEqual({ ok: false, status: 0, resting: true })
        expect(fetchMock).not.toHaveBeenCalled()
    })

    it('with no login', async () => {
        fill([])
        expect(await readWithLogin(PATH)).toEqual({ ok: false, status: 0, needsLogin: true })
        expect(fetchMock).not.toHaveBeenCalled()
    })

    it("while a second account signs in, which owns the browser's login until it ends", async () => {
        __getLocalStorage()[VIEWER_CONNECT_KEY] = { started: Date.now(), mainUser: 'alice', main: [] }
        expect(await readWithLogin(PATH)).toEqual({ ok: false, status: 0, busy: true })
        expect(fetchMock).not.toHaveBeenCalled()
    })

    it('when the news feed turns scans off, as a refusal', async () => {
        __getLocalStorage()[NEWS_CACHE_KEY] = {
            feed: { options: { mechanisms: { [MECHANISM_SCAN_FEEDS]: 'off' } } },
        }
        expect(await readWithLogin(PATH)).toEqual({ ok: false, status: 0, blockPage: true })
        expect(fetchMock).not.toHaveBeenCalled()
    })
})
