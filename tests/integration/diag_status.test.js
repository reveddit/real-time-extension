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
})
