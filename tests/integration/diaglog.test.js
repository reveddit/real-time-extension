// Ring-buffer and formatter behavior for the user-copyable diagnostic log
// (src/src/diaglog.ts). Nothing here touches the network; persistence goes
// through the mocked storage.

// Install chrome global BEFORE any source import
import '../mocks/chrome-api.js'

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { __resetStorage, __getLocalStorage } from '../mocks/webextension-polyfill.js'

import {
    dlog,
    dlogSummary,
    getDiagEntries,
    getDiagTiers,
    clearDiagLog,
    formatDiagLog,
    formatTieredDiagLog,
    initDiagPersistence,
    DIAG_MAX_ENTRIES,
    DIAG_SUMMARY_MAX_ENTRIES,
    DIAG_MAX_DATA_CHARS,
    DIAG_LOG_KEY,
    SUMMARY_CHUNK_MS,
    SUMMARY_RETENTION_HOURS,
    summaryChunkKey,
} from '../../src/src/diaglog'

beforeEach(async () => {
    __resetStorage()
    // dlog mirrors every line to the console; keep test output readable
    vi.spyOn(console, 'log').mockImplementation(() => {})
    await clearDiagLog()
})

afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
})

describe('dlog buffer', () => {
    it('keeps at most DIAG_MAX_ENTRIES detail lines, dropping oldest', async () => {
        for (let i = 0; i < DIAG_MAX_ENTRIES + 50; i++) {
            dlog('verify', `line ${i}`)
        }
        const entries = await getDiagEntries()
        expect(entries.length).toBe(DIAG_MAX_ENTRIES)
        expect(entries[0].m).toBe('line 50')
        expect(entries[entries.length - 1].m).toBe(`line ${DIAG_MAX_ENTRIES + 49}`)
    })

    it('routes summary areas to the summary tier, retained by time not count', async () => {
        vi.useFakeTimers()
        vi.setSystemTime(Date.UTC(2026, 8, 3, 12, 0, 0))
        for (let i = 0; i < DIAG_MAX_ENTRIES + 10; i++) {
            dlog('cycle', `cycle ${i}`)
        }
        const tiers = await getDiagTiers()
        expect(tiers.summary.length).toBe(DIAG_MAX_ENTRIES + 10)
        expect(tiers.details.length).toBe(0)
    })

    it('drops summary lines older than the retention window as time passes', async () => {
        vi.useFakeTimers()
        const start = Date.UTC(2026, 8, 1, 0, 0, 0)
        vi.setSystemTime(start)
        dlog('cycle', 'old line')
        vi.setSystemTime(start + (SUMMARY_RETENTION_HOURS + 2) * SUMMARY_CHUNK_MS)
        dlog('cycle', 'new line')
        const tiers = await getDiagTiers()
        expect(tiers.summary.map(e => e.m)).toEqual(['new line'])
        expect(tiers.summary.length).toBeLessThanOrEqual(DIAG_SUMMARY_MAX_ENTRIES)
    })

    it('chatty per-item detail lines cannot evict the summary history', async () => {
        dlog('cycle', 'cycle start')
        dlog('auth', 'user detected')
        for (let i = 0; i < DIAG_MAX_ENTRIES * 2; i++) {
            dlog('verify', `absent item verdict t1_${i}: unknown`)
        }
        dlog('cycle', 'cycle done')
        const tiers = await getDiagTiers()
        expect(tiers.summary.map(e => e.m)).toEqual(['cycle start', 'user detected', 'cycle done'])
        expect(tiers.details.length).toBe(DIAG_MAX_ENTRIES)
    })

    it('dlogSummary opts a detail-area line into the summary tier', async () => {
        dlog('verify', 'per-item line')
        dlogSummary('verify', 'absent verify: 3 fetched, 0 paced, 2 resolved this cycle')
        const tiers = await getDiagTiers()
        expect(tiers.summary.map(e => e.m)).toEqual(['absent verify: 3 fetched, 0 paced, 2 resolved this cycle'])
        expect(tiers.details.map(e => e.m)).toEqual(['per-item line'])
    })

    it('truncates oversized data payloads', async () => {
        dlog('verify', 'msg', 'x'.repeat(DIAG_MAX_DATA_CHARS + 100))
        const entries = await getDiagEntries()
        // truncated to the cap plus the ellipsis marker
        expect(entries[0].d.length).toBe(DIAG_MAX_DATA_CHARS + 1)
        expect(entries[0].d.endsWith('…')).toBe(true)
    })

    it('serializes non-string data as JSON', async () => {
        dlog('feed', 'msg', { a: 1 })
        const entries = await getDiagEntries()
        expect(entries[0].d).toBe('{"a":1}')
    })

    it('mirrors the exact message to the console', () => {
        dlog('cycle', 'hello there')
        expect(console.log).toHaveBeenCalledWith('hello there')
        dlog('cycle', 'with data', 'payload')
        expect(console.log).toHaveBeenCalledWith('with data', 'payload')
    })
})

describe('formatDiagLog', () => {
    it('redacts given names case-insensitively while keeping ids and subreddits', () => {
        const entries = [{ t: 0, a: 'feed', m: 'www lookup BlueGoliath: t1_abc requested r/somesub', d: 'BLUEGOLIATH' }]
        const text = formatDiagLog(entries, ['my header'], ['BlueGoliath'])
        expect(text).not.toMatch(/bluegoliath/i)
        expect(text).toContain('────')
        expect(text).toContain('t1_abc')
        expect(text).toContain('r/somesub')
        expect(text).toContain('my header')
        expect(text).toContain('entries: 1')
    })

    it('escapes regex metacharacters in redacted names', () => {
        const entries = [{ t: 0, a: 'feed', m: 'user a.b+c did something' }]
        const text = formatDiagLog(entries, [], ['a.b+c'])
        expect(text).toContain('──── did something')
    })

    it('renders entries with ISO timestamp and area tag', () => {
        const entries = [{ t: Date.UTC(2026, 7, 7, 12, 0, 0), a: 'ratelimit', m: 'backing off' }]
        const text = formatDiagLog(entries, [])
        expect(text).toContain('2026-08-07T12:00:00.000Z [ratelimit] backing off')
    })
})

describe('formatTieredDiagLog', () => {
    it('prints coverage per tier and both sections, redacting names once', () => {
        const t0 = Date.UTC(2026, 8, 2, 1, 0, 0)
        const t1 = Date.UTC(2026, 8, 3, 2, 0, 0)
        const text = formatTieredDiagLog(
            {
                summary: [
                    { t: t0, a: 'cycle', m: 'cycle start' },
                    { t: t1, a: 'feed', m: 'www lookup BlueGoliath: 3 requested' },
                ],
                details: [{ t: t1, a: 'verify', m: 'absent item verdict t1_abc: removed' }],
            },
            ['header line'],
            ['BlueGoliath'],
        )
        expect(text).toContain('header line')
        expect(text).toContain(
            `summary tier: 2 entries (keeps last ${SUMMARY_RETENTION_HOURS} hours), 2026-09-02T01:00:00.000Z → 2026-09-03T02:00:00.000Z`,
        )
        expect(text).toContain(`detail tier: 1 entries (keeps last ${DIAG_MAX_ENTRIES} entries)`)
        expect(text.indexOf('==== summary')).toBeLessThan(text.indexOf('==== detail'))
        expect(text).toContain('[verify] absent item verdict t1_abc: removed')
        expect(text).not.toMatch(/bluegoliath/i)
        expect(text).toContain('www lookup ────: 3 requested')
    })

    it('says 0 entries for an empty tier', () => {
        const text = formatTieredDiagLog({ summary: [], details: [] }, [])
        expect(text).toContain('summary tier: 0 entries')
        expect(text).toContain('detail tier: 0 entries')
    })
})

describe('persistence', () => {
    it('flushes details and the current hourly summary chunk after the debounce', async () => {
        vi.useFakeTimers()
        const now = Date.UTC(2026, 8, 3, 12, 30, 0)
        vi.setSystemTime(now)
        await initDiagPersistence()
        dlog('cycle', 'persisted summary line')
        dlog('verify', 'persisted detail line')
        expect(__getLocalStorage()[DIAG_LOG_KEY]).toBeUndefined()
        expect(__getLocalStorage()[summaryChunkKey(now)]).toBeUndefined()
        await vi.advanceTimersByTimeAsync(2500)
        expect(__getLocalStorage()[summaryChunkKey(now)].some(e => e.m === 'persisted summary line')).toBe(true)
        expect(__getLocalStorage()[DIAG_LOG_KEY].some(e => e.m === 'persisted detail line')).toBe(true)
        expect(__getLocalStorage()[DIAG_LOG_KEY].some(e => e.m === 'persisted summary line')).toBe(false)
    })

    it('rewrites only the chunk that changed, not every hour of history', async () => {
        vi.useFakeTimers()
        const hour1 = Date.UTC(2026, 8, 3, 10, 0, 0)
        vi.setSystemTime(hour1)
        await initDiagPersistence()
        dlog('cycle', 'hour one line')
        await vi.advanceTimersByTimeAsync(2500)
        const hour2 = hour1 + SUMMARY_CHUNK_MS
        vi.setSystemTime(hour2)
        // Tamper with the stored hour-one chunk; an untouched chunk must not be rewritten
        __getLocalStorage()[summaryChunkKey(hour1)] = [{ t: hour1, a: 'cycle', m: 'marker' }]
        dlog('cycle', 'hour two line')
        await vi.advanceTimersByTimeAsync(2500)
        expect(__getLocalStorage()[summaryChunkKey(hour1)][0].m).toBe('marker')
        expect(__getLocalStorage()[summaryChunkKey(hour2)].map(e => e.m)).toEqual(['hour two line'])
    })

    it('reloads the retained hours on the next start and drops expired chunks', async () => {
        vi.useFakeTimers()
        const t = Date.UTC(2026, 8, 3, 12, 0, 0)
        const expired = t - (SUMMARY_RETENTION_HOURS + 3) * SUMMARY_CHUNK_MS
        const recent = t - 2 * SUMMARY_CHUNK_MS
        __getLocalStorage()[summaryChunkKey(expired)] = [{ t: expired, a: 'cycle', m: 'too old' }]
        __getLocalStorage()[summaryChunkKey(recent)] = [{ t: recent, a: 'cycle', m: 'two hours ago' }]
        vi.setSystemTime(t)
        await initDiagPersistence()
        const tiers = await getDiagTiers()
        expect(tiers.summary.map(e => e.m)).toEqual(['two hours ago'])
        dlog('cycle', 'now')
        await vi.advanceTimersByTimeAsync(2500)
        expect(__getLocalStorage()[summaryChunkKey(expired)]).toBeUndefined()
        expect(__getLocalStorage()[summaryChunkKey(recent)][0].m).toBe('two hours ago')
    })

    it('clearDiagLog empties both buffers and all storage keys', async () => {
        vi.useFakeTimers()
        const now = Date.UTC(2026, 8, 3, 12, 0, 0)
        vi.setSystemTime(now)
        await initDiagPersistence()
        dlog('cycle', 'to be cleared')
        dlog('verify', 'detail to be cleared')
        await vi.advanceTimersByTimeAsync(2500)
        expect(__getLocalStorage()[summaryChunkKey(now)].length).toBeGreaterThan(0)
        await clearDiagLog()
        expect(__getLocalStorage()[DIAG_LOG_KEY]).toBeUndefined()
        expect(__getLocalStorage()[summaryChunkKey(now)]).toBeUndefined()
        expect((await getDiagEntries()).length).toBe(0)
    })
})
