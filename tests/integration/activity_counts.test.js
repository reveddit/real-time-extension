// The hourly line in the saved log (activity-counts.ts): how often Reddit
// changed its cookies, how often their copy was saved, and how much was written
// to storage, so a report of lag shows that work. Kept in session storage, as
// Chrome's worker stops between events, without a write for every count.

// Install chrome global BEFORE any source import
import '../mocks/chrome-api.js'

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import browserMock, { makeStorageArea } from '../mocks/webextension-polyfill.js'
import { getDiagEntries } from '../mocks/diag-entries.js'
import { clearDiagLog } from '../../src/src/diaglog'
import {
    countCookieChange,
    countCookieSave,
    countStorageWrites,
    logActivityHourly,
    _resetActivityCounts,
} from '../../src/src/activity-counts'

const HOUR = 60 * 60 * 1000
const START = Date.UTC(2026, 10, 9, 14, 2)
const LINE = '[reveddit] activity since 2026-11-09T14:02Z'
const lines = async () => (await getDiagEntries()).map(e => e.m).filter(m => m.startsWith('[reveddit] activity'))

beforeEach(async () => {
    vi.useFakeTimers()
    vi.setSystemTime(START)
    _resetActivityCounts()
    await clearDiagLog()
})

afterEach(() => {
    vi.useRealTimers()
    delete browserMock.storage.session
})

describe('the hourly activity line', () => {
    it("comes at the first check after an hour, with the hour's counts", async () => {
        countCookieChange()
        countCookieChange()
        countCookieChange()
        countCookieSave()
        countStorageWrites({ a: { newValue: 'x'.repeat(2046) } })
        await logActivityHourly()
        expect(await lines()).toEqual([])
        vi.setSystemTime(START + HOUR)
        await logActivityHourly()
        expect(await lines()).toEqual([`${LINE}: Reddit cookie changes 3, cookie copies saved 1, storage written 2 KB`])
        // And the next hour starts from nothing
        vi.setSystemTime(START + 2 * HOUR)
        await logActivityHourly()
        expect(await lines()).toHaveLength(1)
    })

    it("counts what a write stores, and neither a removal nor the counts' own write", async () => {
        countStorageWrites({ a: { oldValue: 'x'.repeat(5000) }, activity_counts: { newValue: 'y'.repeat(5000) } })
        countStorageWrites({ b: { oldValue: 1, newValue: 'z'.repeat(1022) } })
        vi.setSystemTime(START + HOUR)
        await logActivityHourly()
        expect(await lines()).toEqual([`${LINE}: Reddit cookie changes 0, cookie copies saved 0, storage written 1 KB`])
    })

    it('says nothing for an hour with nothing to count', async () => {
        vi.setSystemTime(START + HOUR)
        await logActivityHourly()
        expect(await lines()).toEqual([])
    })
})

describe('the counts in a worker that stops', () => {
    let session
    beforeEach(() => {
        session = {}
        browserMock.storage.session = makeStorageArea(() => session)
    })

    it('are written a couple of seconds after the last count, and once a minute while counts keep coming', async () => {
        const set = vi.spyOn(browserMock.storage.session, 'set')
        for (let i = 0; i < 20; i++) await countCookieChange()
        expect(set).toHaveBeenCalledTimes(1)
        await vi.advanceTimersByTimeAsync(2000)
        expect(set).toHaveBeenCalledTimes(2)
        expect(session.activity_counts.cookieChanges).toBe(20)
        // One a second for two minutes: never a quiet couple of seconds
        set.mockClear()
        for (let s = 0; s < 120; s++) {
            await vi.advanceTimersByTimeAsync(1000)
            await countCookieChange()
        }
        expect(set).toHaveBeenCalledTimes(2)
    })

    // Chrome stops the worker 30 s after its last event, about every minute at the
    // default interval when nothing else happens. Kept only at each worker's first
    // count, such an hour once read as nothing at all (review 2026-11-09, X23).
    it("add up over an hour of workers that each stop 30 s after the check's last count", async () => {
        let counts = { countCookieChange, countCookieSave, logActivityHourly }
        for (let minute = 0; minute < 60; minute++) {
            vi.setSystemTime(START + minute * 60 * 1000)
            for (let i = 0; i < 5; i++) await counts.countCookieChange()
            await counts.countCookieSave()
            await vi.advanceTimersByTimeAsync(30 * 1000)
            // The next minute's worker, over the same session storage
            vi.resetModules()
            const polyfill = await import('../mocks/webextension-polyfill.js')
            polyfill.default.storage.session = polyfill.makeStorageArea(() => session)
            counts = await import('../../src/src/activity-counts')
        }
        vi.setSystemTime(START + HOUR)
        const diag = await import('../mocks/diag-entries.js')
        await counts.logActivityHourly()
        const logged = (await diag.getDiagEntries()).map(e => e.m).filter(m => m.startsWith('[reveddit] activity'))
        expect(logged).toEqual([`${LINE}: Reddit cookie changes 300, cookie copies saved 60, storage written 0 KB`])
    })

    it('carry on in the next worker, from what the last one wrote', async () => {
        await countCookieChange()
        vi.setSystemTime(START + 61 * 1000)
        await countCookieSave()
        // A new worker, over the same session storage
        vi.resetModules()
        const polyfill = await import('../mocks/webextension-polyfill.js')
        polyfill.default.storage.session = polyfill.makeStorageArea(() => session)
        const after = await import('../../src/src/activity-counts')
        const diag = await import('../mocks/diag-entries.js')
        await after.countCookieChange()
        vi.setSystemTime(START + HOUR)
        await after.logActivityHourly()
        const logged = (await diag.getDiagEntries()).map(e => e.m).filter(m => m.startsWith('[reveddit] activity'))
        expect(logged).toEqual([`${LINE}: Reddit cookie changes 2, cookie copies saved 1, storage written 0 KB`])
    })
})
