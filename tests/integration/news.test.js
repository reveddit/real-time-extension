import { describe, it, expect } from 'vitest'

import { resolveMechanismDisabled, getRemoteMechanism, MECHANISM_LEGACY } from '../../src/src/news'

// Remote options resolution: dev override → remote state → build default.
describe('resolveMechanismDisabled', () => {
    it('dev override wins in both directions, over any remote state', () => {
        expect(resolveMechanismDisabled(true, 'on', false)).toBe(true)
        expect(resolveMechanismDisabled(false, 'off', true)).toBe(false)
    })

    it('remote off/on decides when no dev override, regardless of build default', () => {
        expect(resolveMechanismDisabled(null, 'off', false)).toBe(true)
        expect(resolveMechanismDisabled(null, 'off', true)).toBe(true)
        expect(resolveMechanismDisabled(null, 'on', false)).toBe(false)
        expect(resolveMechanismDisabled(null, 'on', true)).toBe(false)
    })

    it('remote auto defers to the build default', () => {
        expect(resolveMechanismDisabled(null, 'auto', false)).toBe(false)
        expect(resolveMechanismDisabled(null, 'auto', true)).toBe(true)
    })
})

describe('getRemoteMechanism', () => {
    it('fails safe to auto when the cache is unreadable (no chrome in this env)', async () => {
        expect(await getRemoteMechanism(MECHANISM_LEGACY)).toBe('auto')
    })
})
