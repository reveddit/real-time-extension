// The shared logged-in fetch (logged-in-fetch.ts): fetchJsonLoggedIn's deadline,
// as the monitoring cycle waits for these reads, so a stall has to end in a failed
// read, not a hang; and the request style it learns, which every list of cache
// modes and every worker shares.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

import browserMock, { makeStorageArea } from '../mocks/webextension-polyfill.js'
import {
    fetchJsonLoggedIn,
    fetchLoggedIn,
    WWW_FETCH_TIMEOUT_MS,
    _loggedInFetchState,
} from '../../src/src/logged-in-fetch'
import { res, untilAborted } from '../mocks/responses.js'

const FAILED = { ok: false, status: 0, blocked: false, refused: false }
const url = 'https://www.reddit.com/api/info.json?id=t1_c1'
const answer = json => ({ ok: true, status: 200, headers: new Headers(), json })
const blockPage = res(403, 'network security', 'text/html')
// Reddit's edge refusing one cache mode, or every one
const refusing = mode => vi.fn(async (_, { cache }) => (!mode || cache === mode ? blockPage : answer(async () => ({}))))
const modesSent = () => fetch.mock.calls.map(([, init]) => init.cache)

beforeEach(() => {
    vi.useFakeTimers()
    Object.assign(_loggedInFetchState, { preferredCacheMode: undefined, doubleBlockUntil: 0 })
})

describe('fetchJsonLoggedIn', () => {
    it('gives up on a request that never answers, as a failed read', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn((_, { signal }) => untilAborted(signal)),
        )
        const reading = fetchJsonLoggedIn(url)
        await vi.advanceTimersByTimeAsync(WWW_FETCH_TIMEOUT_MS)
        expect(await reading).toEqual(FAILED)
    })

    it('gives up on a body that stalls, at the same deadline', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async (_, { signal }) => answer(() => untilAborted(signal))),
        )
        const reading = fetchJsonLoggedIn(url)
        await vi.advanceTimersByTimeAsync(WWW_FETCH_TIMEOUT_MS)
        expect(await reading).toEqual(FAILED)
    })

    it('ends its timer with a read that finishes', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => answer(async () => ({ data: 1 }))),
        )
        expect(await fetchJsonLoggedIn(url)).toEqual({
            ok: true,
            status: 200,
            blocked: false,
            refused: false,
            json: { data: 1 },
        })
        expect(vi.getTimerCount()).toBe(0)
    })
})

describe('the mode a request got past the edge in', () => {
    it("starts another list of modes in it, wherever that list has it, and at the list's own first where it hasn't", async () => {
        vi.stubGlobal('fetch', refusing('default'))
        await fetchLoggedIn(url)
        await fetchLoggedIn(url, { modes: ['no-cache', 'no-store'] })
        await fetchLoggedIn(url, { modes: ['reload', 'no-store'] })
        expect(modesSent()).toEqual(['default', 'no-cache', 'no-cache', 'reload'])
    })
})

// The tests above have no session storage, as Chrome 101 and Firefox before 115
describe('a worker that stops and starts again, where the browser has session storage', () => {
    let session
    beforeEach(() => {
        session = {}
        browserMock.storage.session = makeStorageArea(() => session)
    })
    afterEach(() => {
        delete browserMock.storage.session
    })

    // The module as a new worker loads it, over the same session storage
    const restarted = async () => {
        vi.resetModules()
        const polyfill = await import('../mocks/webextension-polyfill.js')
        polyfill.default.storage.session = polyfill.makeStorageArea(() => session)
        return import('../../src/src/logged-in-fetch')
    }

    it('starts in the mode the last one learned', async () => {
        vi.stubGlobal('fetch', refusing('default'))
        await fetchJsonLoggedIn(url)
        const after = await restarted()
        expect(await after.fetchJsonLoggedIn(url)).toMatchObject({ ok: true })
        expect(modesSent()).toEqual(['default', 'no-cache', 'no-cache'])
    })

    it('skips the retry while both modes are known to be blocked', async () => {
        vi.stubGlobal('fetch', refusing())
        expect(await fetchJsonLoggedIn(url)).toMatchObject({ blocked: true, refused: true })
        const after = await restarted()
        expect(await after.fetchJsonLoggedIn(url)).toMatchObject({ blocked: true, refused: false })
        expect(fetch).toHaveBeenCalledTimes(3)
    })

    // The welcome page's login check goes out with the page's own headers
    it("doesn't take in what an extension page's reads learned", async () => {
        vi.stubGlobal('fetch', refusing())
        vi.stubGlobal('window', globalThis)
        await fetchJsonLoggedIn(url)
        expect(session).toEqual({})
        vi.stubGlobal('window', undefined)
        const after = await restarted()
        expect(await after.fetchJsonLoggedIn(url)).toMatchObject({ blocked: true, refused: true })
        expect(fetch).toHaveBeenCalledTimes(4)
    })
})
