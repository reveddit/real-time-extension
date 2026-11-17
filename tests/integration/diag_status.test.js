import { describe, it, expect } from 'vitest'
import { formatDiagStatus } from '../../src/src/diag-status'

describe('formatDiagStatus', () => {
    const now = Date.UTC(2026, 8, 11, 12, 0, 0)
    it('shows last and next check when nothing is paused', () => {
        const line = formatDiagStatus({ lastCheck: now / 1000 - 60, nextCheck: now + 4 * 60000 }, now)
        expect(line).toMatch(/^last check .+ · next ~.+$/)
    })
    it('prefers the pause countdown over the next check', () => {
        const line = formatDiagStatus({ lastCheck: now / 1000, backoffRemainingMs: 150000, nextCheck: now + 60000 }, now)
        expect(line).toContain('paused ~3 min (Reddit rate limit)')
        expect(line).not.toContain('next ~')
    })
    it('drops a next check that is already in the past and is empty with nothing to say', () => {
        expect(formatDiagStatus({ nextCheck: now - 1 }, now)).toBe('')
        expect(formatDiagStatus({}, now)).toBe('')
    })
    // 2026-11-17: the header said "last check 7:51 AM" while no check had read
    // the user's items since 4:03 AM, since a cycle that reads none still ends
    describe('while checks read none of the user’s items', () => {
        // Local times, so the day is the same in any time zone
        const noon = new Date(2026, 10, 17, 12, 0, 0).getTime()
        const time = ms => new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
        const earlier = noon - 3 * 3600 * 1000

        it('names the last check that read them, not the last cycle', () => {
            const line = formatDiagStatus(
                {
                    lastCheck: noon / 1000 - 30,
                    itemsCheckedAt: earlier,
                    itemsFailingSince: earlier + 60000,
                    nextCheck: noon + 60000,
                },
                noon,
            )
            expect(line).toBe(`last good check ${time(earlier)} · next ~${time(noon + 60000)}`)
        })

        it('gives the day when it was another day', () => {
            const twoDaysAgo = noon - 2 * 86400 * 1000
            const line = formatDiagStatus(
                { lastCheck: noon / 1000, itemsCheckedAt: twoDaysAgo, itemsFailingSince: earlier },
                noon,
            )
            expect(line).toMatch(/^last good check .+, /)
            expect(line).toContain(new Date(twoDaysAgo).toLocaleDateString([], { month: 'short', day: 'numeric' }))
        })

        it('says since when, when no check that read them is on record', () => {
            expect(formatDiagStatus({ lastCheck: noon / 1000, itemsFailingSince: earlier }, noon)).toBe(
                `checks failing since ${time(earlier)}`,
            )
        })

        it('is the plain last check again once one reads them', () => {
            const line = formatDiagStatus({ lastCheck: noon / 1000, itemsCheckedAt: noon }, noon)
            expect(line).toBe(`last check ${time(noon)}`)
        })
    })
})
