// Ring-buffer and formatter behavior for the user-copyable diagnostic log
// (src/src/diaglog.ts). Nothing here touches the network; persistence goes
// through the mocked storage.

// Install chrome global BEFORE any source import
import '../mocks/chrome-api.js'

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { __resetStorage, __getLocalStorage } from '../mocks/webextension-polyfill.js'

import {
    dlog,
    dlogSummary,
    getDiagTiers,
    clearDiagLog,
    formatTieredDiagLog,
    browserOfUserAgent,
    buildDiagReport,
    idHider,
    initDiagPersistence,
    DIAG_MAX_ENTRIES,
    DIAG_SUMMARY_MAX_ENTRIES,
    DIAG_MAX_DATA_CHARS,
    DIAG_LOG_KEY,
    SUMMARY_CHUNK_MS,
    SUMMARY_RETENTION_HOURS,
    summaryChunkKey,
} from '../../src/src/diaglog'
import { getDiagEntries } from '../mocks/diag-entries.js'

beforeEach(async () => {
    __resetStorage()
    await clearDiagLog()
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
        vi.spyOn(console, 'log')
        dlog('cycle', 'hello there')
        expect(console.log).toHaveBeenCalledWith('hello there')
        dlog('cycle', 'with data', 'payload')
        expect(console.log).toHaveBeenCalledWith('with data', 'payload')
    })
})

describe('redaction in formatTieredDiagLog', () => {
    it('redacts given names case-insensitively while keeping ids and subreddits', () => {
        const entries = [{ t: 0, a: 'feed', m: 'www lookup BlueGoliath: t1_abc requested r/somesub', d: 'BLUEGOLIATH' }]
        const text = formatTieredDiagLog({ summary: [], details: entries }, ['my header'], ['BlueGoliath'])
        expect(text).not.toMatch(/bluegoliath/i)
        expect(text).toContain('────')
        expect(text).toContain('t1_abc')
        expect(text).toContain('r/somesub')
        expect(text).toContain('my header')
        expect(text).toContain('1 entries')
    })

    it('escapes regex metacharacters in redacted names', () => {
        const entries = [{ t: 0, a: 'feed', m: 'user a.b+c did something' }]
        const text = formatTieredDiagLog({ summary: [], details: entries }, [], ['a.b+c'])
        expect(text).toContain('──── did something')
    })

    it('renders entries with ISO timestamp and area tag', () => {
        const entries = [{ t: Date.UTC(2026, 7, 7, 12, 0, 0), a: 'ratelimit', m: 'backing off' }]
        const text = formatTieredDiagLog({ summary: [], details: entries }, [])
        expect(text).toContain('2026-08-07T12:00:00.000Z [ratelimit] backing off')
    })
})

describe('hiding post and comment ids', () => {
    it('gives each id one stand-in throughout, in fullnames and in reddit paths, made anew for each copy', () => {
        const hide = idHider()
        // The lookups' coverage floors are ids as numbers
        const floor = parseInt('abc123', 36)
        const text = hide(
            'absent item verdict t1_abc123: removed; id=t3_post9,t1_abc123\n' +
                'bridge: /r/sub/comments/post9/a_title/abc123/ -> members-only community, answered 403\n' +
                'thread /comments/post9/_/abc123.json, partial /svc/shreddit/comments/r/sub/post9/abc123?render-mode=partial\n' +
                'title="Kept my deposit : r/sub" canonical="/r/sub/comments/zzz7/kept_my_deposit/" removed_t1_def\n' +
                `www lookup: coverage t1=${floor} t3=0; second account: 3 listed (floor t1 ${floor}, t3 Infinity)\n` +
                `encoded ?id=t3_post9%2Ct1_abc123, json {"t1":${floor}}, path /comments/t3_post9/`,
        )
        const comment = text.match(/c_[0-9a-z]{8}/)[0]
        const post = text.match(/p_[0-9a-z]{8}/)[0]
        expect(text).not.toMatch(/abc123|post9|zzz7|t1_def|t[13]_|a_title|deposit/)
        expect(text).not.toContain(String(floor))
        expect(text).toContain(`coverage t1=${comment} t3=0; second account: 3 listed (floor t1 ${comment}, t3 Infinity)`)
        expect(text.split(comment)).toHaveLength(10)
        expect(text.split(post)).toHaveLength(7)
        // Slugs and titles would find the post by search
        expect(text).toContain(`/r/sub/comments/${post}/_/${comment}/ -> members-only`)
        expect(text).toContain('title=(hidden) canonical="/r/sub/comments/p_')
        expect(text).toContain(`/comments/${post}/_/${comment}.json`)
        expect(text).toContain(`/svc/shreddit/comments/r/sub/${post}/${comment}?render-mode=partial`)
        // A stand-in already in a path stays whole
        expect(text).toContain(`?id=${post}%2C${comment}, json {"t1":${comment}}, path /comments/${post}/`)
        expect(new Set(text.match(/[cp]_[0-9a-z]{8}/g)).size).toBe(4)
        // Another copy, other stand-ins: nothing ties one to the id
        expect(idHider()('t1_abc123')).not.toBe(comment)
    })

    it('hides ids before leaving names out, so a name inside "comments" or an id leaks nothing', () => {
        const tiers = {
            summary: [{ t: Date.UTC(2026, 9, 30), a: 'bridge', m: 'bridge: https://www.reddit.com/comments/1abc2de.json -> 404' }],
            details: [{ t: Date.UTC(2026, 9, 30, 0, 1), a: 'verify', m: 'absent item verdict t1_k9xyzq2: removed' }],
        }
        const text = formatTieredDiagLog(tiers, [], ['ments', 'xyz'], '', Infinity, true)
        expect(text).not.toContain('1abc2de')
        expect(text).not.toContain('────q2')
        expect(text).toMatch(/absent item verdict c_[0-9a-z────]{8,}: removed/)
        // and a name with something like an id in it still goes whole
        const named = formatTieredDiagLog(
            { summary: [{ t: Date.UTC(2026, 9, 30), a: 'feed', m: 'www lookup Mike_t1_abc: /user/Mike_t1_abc/comments/' }], details: [] },
            [],
            ['Mike_t1_abc'],
            '',
            Infinity,
            true,
        )
        expect(named).not.toContain('Mike')
        expect(named).toContain('www lookup ────: /user/────/comments/')
    })

    it('hides them alike in the header and the entries when the log is copied that way', async () => {
        __resetStorage({}, {})
        await clearDiagLog()
        dlog('verify', '[reveddit] absent item verdict t1_abc123: removed')
        const report = await buildDiagReport({ hideIds: true, extraHeaderLines: ['unchecked: t1_abc123 (nsfw)'] })
        expect(report).toContain('ids: hidden; c_ and p_ are stand-ins for comment and post ids')
        expect(report).not.toContain('abc123')
        const comment = report.match(/c_[0-9a-z]{8}/)[0]
        expect(report.split(comment)).toHaveLength(3)
        expect(await buildDiagReport({})).toContain('absent item verdict t1_abc123: removed')
    })
})

describe('buildDiagReport', () => {
    it('leaves out every account that has lists stored, not only the subscribed and logged-in ones', async () => {
        // Monitoring keeps lists for whoever is logged in, subscribed or not
        __resetStorage(
            {
                user_subscriptions: { MainAcct: true },
                user_unsubscriptions: { OldAcct: 1 },
                approved_u_MainAcct: {},
                approved_u_MainAcct_alt: {},
                unlocked_u_SixthAcct: {},
            },
            { last_logged_in_user: 'MainAcct' },
        )
        dlog('feed', '[reveddit] www lookup SixthAcct: 100 requested')
        const header = ['sync storage: largest approved_u_MainAcct_alt 7900, unlocked_u_SixthAcct 7800 (OldAcct)']
        const report = await buildDiagReport({ includeUsername: false, extraHeaderLines: header })
        // the alt goes whole, not as "────_alt"
        for (const name of ['MainAcct', 'SixthAcct', 'OldAcct', '_alt']) expect(report).not.toContain(name)
        const withNames = await buildDiagReport({ includeUsername: true, extraHeaderLines: header })
        expect(withNames).toContain('approved_u_MainAcct_alt 7900')
        expect(withNames).toContain('www lookup SixthAcct')
    })
})

describe('formatTieredDiagLog', () => {
    it('names the version and browser in each section heading, for a paste without the header', () => {
        const text = formatTieredDiagLog({ summary: [], details: [] }, ['version: 0.0.5.28'], [], '0.0.5.28, Chrome 145')
        expect(text).toContain('==== summary (0.0.5.28, Chrome 145): cycles')
        expect(text).toContain('==== detail (0.0.5.28, Chrome 145): per-item')
        expect(browserOfUserAgent('Mozilla/5.0 (Macintosh; rv:153.0) Gecko/20100101 Firefox/153.0')).toBe('Firefox 153')
        expect(
            browserOfUserAgent('Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0'),
        ).toBe('Edge 145')
        expect(browserOfUserAgent('Mozilla/5.0 AppleWebKit/537.36 Chrome/145.0.0.0 Safari/537.36')).toBe('Chrome 145')
    })

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

    it('past a size, keeps the newest entries of each tier that fit and says what the paste covers', () => {
        const at = i => Date.UTC(2026, 9, 30) + i * 1000
        const entry = (i, a) => ({ t: at(i), a, m: `line ${i} ${'x'.repeat(80)}` })
        const tiers = {
            summary: Array.from({ length: 2000 }, (_, i) => entry(i, 'cycle')),
            details: Array.from({ length: 600 }, (_, i) => entry(i, 'verify')),
        }
        const full = formatTieredDiagLog(tiers, ['header line'])
        expect(formatTieredDiagLog(tiers, ['header line'], [], '', full.length)).toBe(full)
        expect(full).not.toContain('trimmed')

        const text = formatTieredDiagLog(tiers, ['header line'], [], '', 50000)
        expect(text.length).toBeLessThanOrEqual(50000)
        expect(text.length).toBeGreaterThan(49000)
        expect(text.startsWith('header line\n')).toBe(true)
        expect(text).toContain('[cycle] line 1999 ')
        expect(text).toContain('[verify] line 599 ')
        expect(text).not.toContain('[cycle] line 0 ')
        const [, summaryOut, detailOut] = text.match(
            /trimmed to fit: the oldest (\d+) summary and (\d+) detail entries are left out/,
        )
        const kept = tier => text.split('\n').filter(line => line.includes(`[${tier}] line`)).length
        expect(kept('cycle') + Number(summaryOut)).toBe(2000)
        expect(kept('verify') + Number(detailOut)).toBe(600)
        expect(kept('verify')).toBeGreaterThan(100)
        // The coverage lines describe the entries kept, not the whole tiers
        const iso = i => new Date(at(i)).toISOString()
        expect(text).toContain(
            `summary tier: ${kept('cycle')} entries (keeps last ${SUMMARY_RETENTION_HOURS} hours), ` +
                `${iso(2000 - kept('cycle'))} → ${iso(1999)}`,
        )
        expect(text).toContain(
            `detail tier: ${kept('verify')} entries (keeps last ${DIAG_MAX_ENTRIES} entries), ` +
                `${iso(600 - kept('verify'))} → ${iso(599)}`,
        )
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
