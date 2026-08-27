import { describe, it, expect } from 'vitest'

import {
    resolveMechanismDisabled,
    getRemoteMechanism,
    MECHANISM_LEGACY,
    compareVersions,
    filterMessagesForVersion,
    shouldShowUpdateNotice,
    UPDATE_NOTICE_GRACE_MS,
} from '../../src/src/news'

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

// Dotted-version compare used by message targeting and update notices.
describe('compareVersions', () => {
    it('orders numerically, not lexicographically', () => {
        expect(compareVersions('0.0.5.14', '0.0.5.15')).toBeLessThan(0)
        expect(compareVersions('0.0.10.0', '0.0.9.9')).toBeGreaterThan(0)
        expect(compareVersions('0.0.5.14', '0.0.5.14')).toBe(0)
    })

    it('treats missing segments as zero', () => {
        expect(compareVersions('1.0', '1.0.0')).toBe(0)
        expect(compareVersions('1', '1.0.0.1')).toBeLessThan(0)
    })
})

// Per-message version targeting: min/max_version bound who sees a message.
describe('filterMessagesForVersion', () => {
    const stuckNotice = { id: 'stuck', max_version: '0.0.5.14' }
    const newFeature = { id: 'feature', min_version: '0.0.5.20' }
    const everyone = { id: 'all' }
    const messages = [stuckNotice, newFeature, everyone]

    it('a stuck install sees the stuck notice but not the new-feature note', () => {
        expect(filterMessagesForVersion(messages, '0.0.5.14').map(m => m.id)).toEqual(['stuck', 'all'])
    })

    it('a current install sees neither bounded message', () => {
        expect(filterMessagesForVersion(messages, '0.0.5.19').map(m => m.id)).toEqual(['all'])
    })

    it('a future install sees the min_version message', () => {
        expect(filterMessagesForVersion(messages, '0.0.5.21').map(m => m.id)).toEqual(['feature', 'all'])
    })

    it('an invalid bound never hides a message', () => {
        expect(filterMessagesForVersion([{ id: 'x', max_version: 'not-a-version' }], '9.9.9').map(m => m.id)).toEqual(['x'])
    })
})

// Update notice: only alert when a newer version has been out past the grace
// window, so normal store-review and rollout lag never nags anyone.
describe('shouldShowUpdateNotice', () => {
    const DAY = 24 * 60 * 60 * 1000
    const now = 1787850000000

    it('alerts when behind and the release is older than the grace window', () => {
        expect(shouldShowUpdateNotice('0.0.5.14', '0.0.5.19', now - UPDATE_NOTICE_GRACE_MS - DAY, now)).toBe(true)
    })

    it('stays quiet during a normal rollout (inside the grace window)', () => {
        expect(shouldShowUpdateNotice('0.0.5.18', '0.0.5.19', now - DAY, now)).toBe(false)
    })

    it('stays quiet when current or ahead', () => {
        const old = now - UPDATE_NOTICE_GRACE_MS - DAY
        expect(shouldShowUpdateNotice('0.0.5.19', '0.0.5.19', old, now)).toBe(false)
        expect(shouldShowUpdateNotice('0.0.5.20', '0.0.5.19', old, now)).toBe(false)
    })

    it('never alerts without a valid release date or version', () => {
        expect(shouldShowUpdateNotice('0.0.5.14', '0.0.5.19', undefined, now)).toBe(false)
        expect(shouldShowUpdateNotice('0.0.5.14', '0.0.5.19', 0, now)).toBe(false)
        expect(shouldShowUpdateNotice('0.0.5.14', 'not-a-version', now - UPDATE_NOTICE_GRACE_MS - DAY, now)).toBe(false)
        expect(shouldShowUpdateNotice('0.0.5.14', undefined, now - UPDATE_NOTICE_GRACE_MS - DAY, now)).toBe(false)
    })

    it('honors a custom grace window', () => {
        expect(shouldShowUpdateNotice('0.0.5.14', '0.0.5.19', now - 2 * DAY, now, DAY)).toBe(true)
        expect(shouldShowUpdateNotice('0.0.5.14', '0.0.5.19', now - 2 * DAY, now, 3 * DAY)).toBe(false)
    })
})
