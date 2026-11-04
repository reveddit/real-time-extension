// What every scan's read goes through in the background (requests.ts
// readWithLogin): one pace and one backoff across tabs, never the browser's
// cache, and the switches that turn scans away before anything is sent.

// Install chrome global BEFORE any source import
import '../mocks/chrome-api.js'

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import browserMock, { __resetStorage, __getLocalStorage } from '../mocks/webextension-polyfill.js'
import { cookie, fill, cookiesApi } from '../mocks/cookies.js'

import { readWithLogin, _scanTurn } from '../../src/src/requests'
import { _loggedInFetchState } from '../../src/src/logged-in-fetch'
import { VIEWER_CONNECT_KEY } from '../../src/src/viewer'
import { NEWS_CACHE_KEY, MECHANISM_SCAN_FEEDS } from '../../src/src/news'
import { RECENT_RATE_LIMIT_WINDOW_MS } from '../../src/src/requests'

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

    it("a block page gets its retry, and doesn't cost other requests theirs", async () => {
        fetchMock.mockImplementation(async () => blockPage())
        expect(await readWithLogin(PATH)).toMatchObject({ ok: false, status: 403, blockPage: true })
        expect(fetchMock.mock.calls.map(call => call[1].cache)).toEqual(['no-store', 'no-cache'])
        expect(_loggedInFetchState.doubleBlockUntil).toBe(0)
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
    it('take turns at the pace measured', async () => {
        vi.useFakeTimers()
        const sent = []
        fetchMock.mockImplementation(async () => {
            sent.push(Date.now())
            return answer(200)
        })
        const reads = [readWithLogin(PATH), readWithLogin(PATH), readWithLogin(PATH)]
        await vi.advanceTimersByTimeAsync(4000)
        await Promise.all(reads)
        expect(sent.map(at => at - sent[0])).toEqual([0, 1500, 3000])
    })

    it('go at half that for a while after a 429', async () => {
        vi.useFakeTimers()
        __getLocalStorage().rate_limit_last_hit = Date.now() - RECENT_RATE_LIMIT_WINDOW_MS / 2
        const sent = []
        fetchMock.mockImplementation(async () => {
            sent.push(Date.now())
            return answer(200)
        })
        const reads = [readWithLogin(PATH), readWithLogin(PATH)]
        await vi.advanceTimersByTimeAsync(4000)
        await Promise.all(reads)
        expect(sent[1] - sent[0]).toBe(3000)
    })
})

describe('turned away before anything is sent', () => {
    it('during a backoff', async () => {
        __getLocalStorage().rate_limit_until = Date.now() + 60000
        expect(await readWithLogin(PATH)).toEqual({ ok: false, status: 0, resting: true })
        expect(fetchMock).not.toHaveBeenCalled()
    })

    it('when a backoff starts while it waits its turn', async () => {
        vi.useFakeTimers()
        const first = readWithLogin(PATH)
        const second = readWithLogin(PATH)
        await vi.advanceTimersByTimeAsync(100)
        expect(fetchMock).toHaveBeenCalledTimes(1)
        __getLocalStorage().rate_limit_until = Date.now() + 60000
        await vi.advanceTimersByTimeAsync(2000)
        await first
        expect(await second).toEqual({ ok: false, status: 0, resting: true })
        expect(fetchMock).toHaveBeenCalledTimes(1)
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
