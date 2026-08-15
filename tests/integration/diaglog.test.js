// Ring-buffer and formatter behavior for the user-copyable diagnostic log
// (src/src/diaglog.ts). Nothing here touches the network; persistence goes
// through the mocked storage.

// Install chrome global BEFORE any source import
import '../mocks/chrome-api.js'

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { __resetStorage, __getLocalStorage } from '../mocks/webextension-polyfill.js'

import {
    dlog,
    getDiagEntries,
    clearDiagLog,
    formatDiagLog,
    initDiagPersistence,
    DIAG_MAX_ENTRIES,
    DIAG_MAX_DATA_CHARS,
    DIAG_LOG_KEY,
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
    it('keeps at most DIAG_MAX_ENTRIES, dropping oldest', async () => {
        for (let i = 0; i < DIAG_MAX_ENTRIES + 50; i++) {
            dlog('cycle', `line ${i}`)
        }
        const entries = await getDiagEntries()
        expect(entries.length).toBe(DIAG_MAX_ENTRIES)
        expect(entries[0].m).toBe('line 50')
        expect(entries[entries.length - 1].m).toBe(`line ${DIAG_MAX_ENTRIES + 49}`)
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
        const entries = [
            { t: 0, a: 'feed', m: 'www lookup BlueGoliath: t1_abc requested r/somesub', d: 'BLUEGOLIATH' },
        ]
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

describe('persistence', () => {
    it('flushes the buffer to storage.local after the debounce', async () => {
        vi.useFakeTimers()
        await initDiagPersistence()
        dlog('cycle', 'persisted line')
        expect(__getLocalStorage()[DIAG_LOG_KEY]).toBeUndefined()
        await vi.advanceTimersByTimeAsync(2500)
        const stored = __getLocalStorage()[DIAG_LOG_KEY]
        expect(Array.isArray(stored)).toBe(true)
        expect(stored.some(e => e.m === 'persisted line')).toBe(true)
    })

    it('clearDiagLog empties both buffer and storage', async () => {
        vi.useFakeTimers()
        await initDiagPersistence()
        dlog('cycle', 'to be cleared')
        await vi.advanceTimersByTimeAsync(2500)
        expect(__getLocalStorage()[DIAG_LOG_KEY].length).toBeGreaterThan(0)
        await clearDiagLog()
        expect(__getLocalStorage()[DIAG_LOG_KEY]).toBeUndefined()
        expect((await getDiagEntries()).length).toBe(0)
    })
})
