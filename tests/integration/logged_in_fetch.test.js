// fetchJsonLoggedIn's deadline (logged-in-fetch.ts): the monitoring cycle waits
// for these reads, so a stall has to end in a failed read, not a hang.

import { describe, it, expect, beforeEach, vi } from 'vitest'

import { fetchJsonLoggedIn, WWW_FETCH_TIMEOUT_MS, _loggedInFetchState } from '../../src/src/logged-in-fetch'
import { untilAborted } from '../mocks/responses.js'

const FAILED = { ok: false, status: 0, blocked: false, refused: false }
const url = 'https://www.reddit.com/api/info.json?id=t1_c1'
const answer = json => ({ ok: true, status: 200, headers: new Headers(), json })

beforeEach(() => {
    vi.useFakeTimers()
    Object.assign(_loggedInFetchState, { preferredCacheMode: 0, doubleBlockUntil: 0 })
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
