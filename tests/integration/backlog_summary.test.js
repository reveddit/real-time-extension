// Integration tests for the two-phase backlog notification flow.
// Phase 1: one notification as soon as backlog items are found after install.
// Phase 2: one summary after BACKLOG_SUMMARY_DELAY_MS covering only items found
// since phase 1 — an unreviewed backlog must not be re-announced.

// Install chrome global BEFORE any source import
import '../mocks/chrome-api.js'

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { __resetStorage, __getLocalStorage } from '../mocks/webextension-polyfill.js'

import { maybeFireBacklogSummary, getUnseenBacklogItemIds } from '../../src/src/monitoring.ts'
import { BACKLOG_SUMMARY_DELAY_MS, getNotificationLog } from '../../src/src/storage.ts'

const nowSec = () => Math.floor(Date.now() / 1000)
const OLD_UTC = () => nowSec() - 30 * 24 * 3600 // well past the 48h backlog threshold
const RECENT_UTC = () => nowSec() - 3600

function makeSyncStorage(overrides = {}) {
    return {
        user_subscriptions: { alice: true },
        options: {
            removal_status: { track: true, notify: true },
            lock_status: { track: true, notify: true },
        },
        removed_u_alice: {},
        locked_u_alice: {},
        removed_other: {},
        locked_other: {},
        ...overrides,
    }
}

describe('getUnseenBacklogItemIds', () => {
    it('returns only unseen items older than the backlog threshold', () => {
        const storage = makeSyncStorage({
            removed_u_alice: {
                t3_old_unseen: { c: OLD_UTC(), u: true },
                t3_old_seen: { c: OLD_UTC(), u: false },
                t1_recent_unseen: { c: RECENT_UTC(), u: true },
            },
            locked_other: {
                t3_locked_old: { c: OLD_UTC(), u: true },
            },
        })
        expect(getUnseenBacklogItemIds(storage).sort()).toEqual(['t3_locked_old', 't3_old_unseen'])
    })

    it('respects track settings', () => {
        const storage = makeSyncStorage({
            removed_u_alice: { t3_removed: { c: OLD_UTC(), u: true } },
            locked_u_alice: { t3_locked: { c: OLD_UTC(), u: true } },
        })
        storage.options.lock_status = { track: false }
        expect(getUnseenBacklogItemIds(storage)).toEqual(['t3_removed'])
    })
})

describe('maybeFireBacklogSummary', () => {
    let notifySpy

    beforeEach(() => {
        __resetStorage({}, {})
        notifySpy = vi.spyOn(chrome.notifications, 'create')
    })

    afterEach(() => {
        notifySpy.mockRestore()
    })

    it('phase 1: notifies when backlog items first appear and records their ids', async () => {
        __resetStorage({}, { backlog_summary: { installedAt: Date.now() } })
        const storage = makeSyncStorage({
            removed_u_alice: {
                t3_a: { c: OLD_UTC(), u: true },
                t1_b: { c: OLD_UTC(), u: true },
            },
            removed_other: { t1_c: { c: OLD_UTC(), u: true } },
        })

        await maybeFireBacklogSummary(storage)

        expect(notifySpy).toHaveBeenCalledTimes(1)
        expect(notifySpy.mock.calls[0][1].message).toMatch(/^3 older removed\/locked/)

        const state = __getLocalStorage().backlog_summary
        expect(state.initialBacklogNotified).toBe(true)
        expect(state.initialNotifiedIds.sort()).toEqual(['t1_b', 't1_c', 't3_a'])
        expect(state.summarySent).toBeFalsy()

        const log = await getNotificationLog()
        expect(log).toHaveLength(1)
        expect(log[0].source).toBe('backlog_summary')
        expect(log[0].itemIds.sort()).toEqual(['t1_b', 't1_c', 't3_a'])
    })

    it('phase 1: stays quiet until backlog items exist', async () => {
        __resetStorage({}, { backlog_summary: { installedAt: Date.now() } })

        await maybeFireBacklogSummary(makeSyncStorage())

        expect(notifySpy).not.toHaveBeenCalled()
        expect(__getLocalStorage().backlog_summary.initialBacklogNotified).toBeFalsy()
    })

    it('phase 2: does not re-announce an unreviewed backlog already covered by phase 1', async () => {
        const storage = makeSyncStorage({
            removed_u_alice: {
                t3_a: { c: OLD_UTC(), u: true },
                t1_b: { c: OLD_UTC(), u: true },
            },
        })
        __resetStorage(
            {},
            {
                backlog_summary: {
                    installedAt: Date.now() - BACKLOG_SUMMARY_DELAY_MS - 60000,
                    initialBacklogNotified: true,
                    initialNotifiedIds: ['t3_a', 't1_b'],
                },
            },
        )

        await maybeFireBacklogSummary(storage)

        expect(notifySpy).not.toHaveBeenCalled()
        expect(__getLocalStorage().backlog_summary.summarySent).toBe(true)
        expect(await getNotificationLog()).toHaveLength(0)
    })

    it('phase 2: reports only items gathered since phase 1', async () => {
        const storage = makeSyncStorage({
            removed_u_alice: {
                t3_a: { c: OLD_UTC(), u: true },
                t1_b: { c: OLD_UTC(), u: true },
                t1_new: { c: OLD_UTC(), u: true },
            },
        })
        __resetStorage(
            {},
            {
                backlog_summary: {
                    installedAt: Date.now() - BACKLOG_SUMMARY_DELAY_MS - 60000,
                    initialBacklogNotified: true,
                    initialNotifiedIds: ['t3_a', 't1_b'],
                },
            },
        )

        await maybeFireBacklogSummary(storage)

        expect(notifySpy).toHaveBeenCalledTimes(1)
        expect(notifySpy.mock.calls[0][1].message).toMatch(/^1 more older removed\/locked/)
        expect(__getLocalStorage().backlog_summary.summarySent).toBe(true)

        const log = await getNotificationLog()
        expect(log).toHaveLength(1)
        expect(log[0].itemIds).toEqual(['t1_new'])
    })

    it('phase 2: waits out the delay', async () => {
        const storage = makeSyncStorage({
            removed_u_alice: { t3_a: { c: OLD_UTC(), u: true } },
        })
        __resetStorage(
            {},
            {
                backlog_summary: {
                    installedAt: Date.now(),
                    initialBacklogNotified: true,
                    initialNotifiedIds: [],
                },
            },
        )

        await maybeFireBacklogSummary(storage)

        expect(notifySpy).not.toHaveBeenCalled()
        expect(__getLocalStorage().backlog_summary.summarySent).toBeFalsy()
    })

    it('does nothing once the summary was sent', async () => {
        const storage = makeSyncStorage({
            removed_u_alice: { t3_a: { c: OLD_UTC(), u: true } },
        })
        __resetStorage(
            {},
            {
                backlog_summary: {
                    installedAt: Date.now() - BACKLOG_SUMMARY_DELAY_MS - 60000,
                    initialBacklogNotified: true,
                    initialNotifiedIds: [],
                    summarySent: true,
                },
            },
        )

        await maybeFireBacklogSummary(storage)

        expect(notifySpy).not.toHaveBeenCalled()
    })

    it('full install flow: phase 1 fires, unchanged backlog stays silent at the 12h mark', async () => {
        __resetStorage({}, { backlog_summary: { installedAt: Date.now() } })
        const storage = makeSyncStorage({
            removed_u_alice: {
                t3_a: { c: OLD_UTC(), u: true },
                t1_b: { c: OLD_UTC(), u: true },
                t1_c: { c: OLD_UTC(), u: true },
            },
        })

        // Shortly after install: first check cycle finds the backlog
        await maybeFireBacklogSummary(storage)
        expect(notifySpy).toHaveBeenCalledTimes(1)

        // 12h later, nothing new found and nothing reviewed
        __getLocalStorage().backlog_summary.installedAt = Date.now() - BACKLOG_SUMMARY_DELAY_MS - 60000
        await maybeFireBacklogSummary(storage)

        expect(notifySpy).toHaveBeenCalledTimes(1)
        expect(__getLocalStorage().backlog_summary.summarySent).toBe(true)
    })
})
