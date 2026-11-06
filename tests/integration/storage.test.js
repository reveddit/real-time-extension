// Integration tests for storage.js.
// Mock the chrome.storage API at the boundary and test storage operations.

// Install chrome global BEFORE any source import
import '../mocks/chrome-api.js'

import { describe, it, expect, beforeEach, vi } from 'vitest'
import browserMock, { __resetStorage, __getSyncStorage, __getLocalStorage } from '../mocks/webextension-polyfill.js'
import { fetchNews, NEWS_CACHE_KEY } from '../../src/src/news'
import { REMOVED, APPROVED, LOCKED, UNLOCKED } from '../../src/src/common'

import {
    INTERVAL_DEFAULT,
    SEEN_COUNT_DEFAULT,
    MAX_SUBSCRIPTIONS,
    MAX_OTHER_SUBSCRIPTIONS,
    getObjectNamesForThing,
    getUserInit,
    initStorage,
    subscribeUser,
    unsubscribeUser,
    subscribeId,
    unsubscribeId,
    markThingAsSeen,
    getIDs_thing,
    getUnseenIDs_thing,
    getOptions,
    getScanSettings,
    saveOptions,
    addToPendingPostQueue,
    getNextPendingPosts,
    removeFromPendingPostQueue,
    clearPendingPostQueue,
    recordPendingPostAttempt,
    clearPendingPostAttempt,
    getPendingPostAttempts,
    MAX_PENDING_POST_ATTEMPTS,
    recordRateLimitHit,
    clearRateLimitBackoff,
    getRateLimitBackoffRemainingMs,
} from '../../src/src/storage.ts'

// Promisify callback-style functions for cleaner tests
const initStorageP = () => new Promise((resolve) => initStorage(resolve))
const subscribeUserP = (user) =>
    new Promise((resolve, reject) => subscribeUser(user, resolve, reject))
const unsubscribeUserP = (user) =>
    new Promise((resolve) => unsubscribeUser(user, resolve))
const subscribeIdP = (id) =>
    new Promise((resolve) => subscribeId(id, resolve))
const unsubscribeIdP = (id) =>
    new Promise((resolve) => unsubscribeId(id, resolve))
const saveOptionsP = (options) =>
    new Promise((resolve) => saveOptions(options, resolve))
// An options object as the options page builds it; the changes override
const optionsToSave = (changes = {}) => ({
    seen_count: 2,
    interval: 1,
    custom_clientid: '',
    removal_status: { track: true, notify: true },
    lock_status: { track: true, notify: true },
    hide_subscribe: false,
    monitor_quarantined: false,
    show_scan_on_own_profile: false,
    show_scan_on_other_profiles: true,
    show_thread_scan_buttons: true,
    highlight_own_profile_status: true,
    auto_filter_removed_threads: true,
    scan_reads_per_click: 20,
    scan_seconds_between_reads: 3,
    ...changes,
})

// Helper: create a full storage init matching what initStorage would produce
function makeStorageInit(overrides = {}) {
    return {
        user_subscriptions: {},
        user_unsubscriptions: {},
        user_initial_lookup_done: {},
        other_subscriptions: {},
        options: {
            interval: INTERVAL_DEFAULT,
            seen_count: SEEN_COUNT_DEFAULT,
            custom_clientid: '',
            removal_status: { track: true, notify: true },
            lock_status: { track: true, notify: true },
            monitor_quarantined: false,
        },
        last_check: null,
        // "other" tracking keys
        changes_other: [],
        removed_other: {},
        approved_other: {},
        locked_other: {},
        unlocked_other: {},
        ...overrides,
    }
}

describe('constants', () => {
    it('has expected change type values', () => {
        expect(REMOVED).toBe(1)
        expect(APPROVED).toBe(2)
        expect(LOCKED).toBe(3)
        expect(UNLOCKED).toBe(4)
    })

    it('has expected defaults', () => {
        expect(INTERVAL_DEFAULT).toBe(1)
        expect(SEEN_COUNT_DEFAULT).toBe(2)
        expect(MAX_SUBSCRIPTIONS).toBe(5)
        expect(MAX_OTHER_SUBSCRIPTIONS).toBe(100)
    })
})

describe('getObjectNamesForThing', () => {
    it('generates correct keys for a user', () => {
        const keys = getObjectNamesForThing('testuser', true)
        expect(keys.changes).toBe('changes_u_testuser')
        expect(keys.removed).toBe('removed_u_testuser')
        expect(keys.approved).toBe('approved_u_testuser')
        expect(keys.locked).toBe('locked_u_testuser')
        expect(keys.unlocked).toBe('unlocked_u_testuser')
    })

    it('generates correct keys for "other"', () => {
        const keys = getObjectNamesForThing('other', false)
        expect(keys.changes).toBe('changes_other')
        expect(keys.removed).toBe('removed_other')
    })
})

describe('getUserInit', () => {
    it('creates tracking keys for a user', () => {
        const init = getUserInit('alice')
        expect(init).toHaveProperty('changes_u_alice')
        expect(init).toHaveProperty('removed_u_alice')
        expect(init).toHaveProperty('approved_u_alice')
        expect(init).toHaveProperty('locked_u_alice')
        expect(init).toHaveProperty('unlocked_u_alice')
        expect(init.changes_u_alice).toEqual([])
        expect(init.removed_u_alice).toEqual({})
    })
})

describe('initStorage', () => {
    beforeEach(() => __resetStorage())

    it('initializes empty storage with defaults', async () => {
        await initStorageP()
        const storage = __getSyncStorage()
        expect(storage.user_subscriptions).toEqual({})
        expect(storage.other_subscriptions).toEqual({})
        expect(storage.options.interval).toBe(INTERVAL_DEFAULT)
        expect(storage.options.removal_status.track).toBe(true)
        expect(storage.changes_other).toEqual([])
    })

    it('does not overwrite existing storage', async () => {
        __resetStorage({ user_subscriptions: { bob: true }, options: { interval: 5 } })
        await initStorageP()
        const storage = __getSyncStorage()
        expect(storage.user_subscriptions).toEqual({ bob: true })
        expect(storage.options.interval).toBe(5)
    })
})

describe('subscribeUser / unsubscribeUser', () => {
    beforeEach(() => __resetStorage(makeStorageInit()))

    it('subscribes a user and creates tracking keys', async () => {
        await subscribeUserP('alice')
        const storage = __getSyncStorage()
        expect(storage.user_subscriptions.alice).toBe(true)
        expect(storage.changes_u_alice).toEqual([])
        expect(storage.removed_u_alice).toEqual({})
    })

    it('keeps the lists monitoring already keeps for an account it subscribes', async () => {
        // Monitoring checks whoever is logged in, subscribed or not
        __resetStorage(
            makeStorageInit({
                removed_u_alice: { t1_a: { c: 1, u: false, p: 't3_p' } },
                changes_u_alice: [{ i: 't1_a', o: 2, g: 1 }],
            }),
        )
        await subscribeUserP('alice')
        const storage = __getSyncStorage()
        expect(storage.user_subscriptions.alice).toBe(true)
        expect(storage.removed_u_alice).toEqual({ t1_a: { c: 1, u: false, p: 't3_p' } })
        expect(storage.changes_u_alice).toEqual([{ i: 't1_a', o: 2, g: 1 }])
        expect(storage.approved_u_alice).toEqual({})
    })

    it('rejects when max subscriptions reached', async () => {
        __resetStorage(
            makeStorageInit({
                user_subscriptions: { u1: true, u2: true, u3: true, u4: true, u5: true },
            }),
        )
        await expect(subscribeUserP('u6')).rejects.toMatch(/maximum/)
    })

    it('rejects duplicate subscriptions', async () => {
        __resetStorage(makeStorageInit({ user_subscriptions: { alice: true } }))
        await expect(subscribeUserP('alice')).rejects.toMatch(/already subscribed/)
    })

    it('unsubscribes a user and records in unsubscriptions', async () => {
        __resetStorage(
            makeStorageInit({
                user_subscriptions: { alice: true },
                ...getUserInit('alice'),
            }),
        )
        await unsubscribeUserP('alice')
        const storage = __getSyncStorage()
        expect(storage.user_subscriptions.alice).toBeUndefined()
        expect(storage.user_unsubscriptions.alice).toBeGreaterThan(0)
    })
})

describe('subscribeId / unsubscribeId', () => {
    beforeEach(() => __resetStorage(makeStorageInit()))

    it('subscribes an item by ID', async () => {
        await subscribeIdP('t3_abc123')
        const storage = __getSyncStorage()
        expect(storage.other_subscriptions['t3_abc123']).toBeDefined()
        expect(storage.other_subscriptions['t3_abc123'].t).toBeGreaterThan(0)
    })

    it('unsubscribes an item by ID', async () => {
        __resetStorage(
            makeStorageInit({
                other_subscriptions: { t3_abc: { t: 1000 } },
            }),
        )
        await unsubscribeIdP('t3_abc')
        const storage = __getSyncStorage()
        expect(storage.other_subscriptions['t3_abc']).toBeUndefined()
    })

    it('finishes unsubscribing on Firefox, where a promise-style chrome.runtime.sendMessage returns undefined', async () => {
        __resetStorage(makeStorageInit({ other_subscriptions: { t3_abc: { t: 1000 } } }))
        vi.spyOn(chrome.runtime, 'sendMessage').mockReturnValue(undefined)
        const send = vi.spyOn(browserMock.runtime, 'sendMessage')
        await unsubscribeIdP('t3_abc')
        expect(__getSyncStorage().other_subscriptions['t3_abc']).toBeUndefined()
        expect(send).toHaveBeenCalledWith({ action: 'update-badge' })
    })

    it('finishes unsubscribing when the badge message fails', async () => {
        __resetStorage(makeStorageInit({ other_subscriptions: { t3_abc: { t: 1000 } } }))
        vi.spyOn(browserMock.runtime, 'sendMessage').mockRejectedValue(new Error('Receiving end does not exist.'))
        await unsubscribeIdP('t3_abc')
        expect(__getSyncStorage().other_subscriptions['t3_abc']).toBeUndefined()
    })
})

describe('markThingAsSeen', () => {
    it('marks all items for a thing as seen (u=false)', () => {
        const storage = makeStorageInit({
            removed_u_alice: {
                t1_a: { c: 1, u: true },
                t1_b: { c: 2, u: true },
            },
            approved_u_alice: {
                t1_c: { c: 3, u: true },
            },
            locked_u_alice: {},
            unlocked_u_alice: {},
            changes_u_alice: [],
        })
        markThingAsSeen(storage, 'alice', true)
        expect(storage.removed_u_alice.t1_a.u).toBe(false)
        expect(storage.removed_u_alice.t1_b.u).toBe(false)
        expect(storage.approved_u_alice.t1_c.u).toBe(false)
    })

    it('passes over an account without lists, as one unsubscribed since its notification', () => {
        const storage = makeStorageInit({})
        expect(() => markThingAsSeen(storage, 'alice', true)).not.toThrow()
        expect(storage.removed_u_alice).toBeUndefined()
    })
})

describe('getIDs_thing / getUnseenIDs_thing', () => {
    it('separates seen and unseen IDs', () => {
        const storage = makeStorageInit({
            removed_u_bob: {
                t1_x: { c: 1, u: true },
                t1_y: { c: 2, u: false },
            },
            approved_u_bob: {
                t1_z: { c: 3, u: true },
            },
            locked_u_bob: {},
            unlocked_u_bob: {},
        })
        const result = getIDs_thing('bob', true, storage)
        expect(result.unseen.sort()).toEqual(['t1_x', 't1_z'])
        expect(result.seen).toEqual(['t1_y'])
    })

    it('returns empty when no tracked items', () => {
        const storage = makeStorageInit({
            removed_u_empty: {},
            approved_u_empty: {},
            locked_u_empty: {},
            unlocked_u_empty: {},
        })
        const result = getUnseenIDs_thing('empty', true, storage)
        expect(result).toEqual([])
    })

    it('respects track settings — ignores lock tracking when disabled', () => {
        const storage = makeStorageInit({
            removed_u_x: {},
            approved_u_x: { t1_a: { c: 1, u: true } },
            locked_u_x: { t1_b: { c: 2, u: true } },
            unlocked_u_x: {},
        })
        storage.options.lock_status = { track: false }
        const result = getIDs_thing('x', true, storage)
        expect(result.unseen).toEqual(['t1_a'])
    })
})

describe('pending post queue', () => {
    beforeEach(() => __resetStorage({}, {}))

    it('adds to queue and retrieves next', async () => {
        await addToPendingPostQueue(['t3_a', 't3_b'])
        const { posts } = await getNextPendingPosts(1)
        expect(posts[0]).toBe('t3_a')
    })

    it('removes from queue', async () => {
        await addToPendingPostQueue(['t3_a', 't3_b', 't3_c'])
        await removeFromPendingPostQueue('t3_a')
        const { posts } = await getNextPendingPosts(1)
        expect(posts[0]).toBe('t3_b')
    })

    it('deduplicates entries', async () => {
        await addToPendingPostQueue(['t3_a', 't3_b'])
        await addToPendingPostQueue(['t3_b', 't3_c'])
        const local = __getLocalStorage()
        const queue = local.pending_post_lookups
        expect(queue).toEqual(['t3_a', 't3_b', 't3_c'])
    })
})

describe('pending post attempt cap', () => {
    beforeEach(() => __resetStorage({}, {}))

    it('records and increments attempts', async () => {
        expect(await recordPendingPostAttempt('t3_a')).toBe(1)
        expect(await recordPendingPostAttempt('t3_a')).toBe(2)
        const attempts = await getPendingPostAttempts()
        expect(attempts['t3_a']).toBe(2)
    })

    it('stops re-enqueuing a post once it hits the attempt cap', async () => {
        for (let i = 0; i < MAX_PENDING_POST_ATTEMPTS; i++) {
            await recordPendingPostAttempt('t3_stuck')
        }
        await addToPendingPostQueue(['t3_stuck', 't3_ok'])
        expect(__getLocalStorage().pending_post_lookups).toEqual(['t3_ok'])
    })

    it('clearPendingPostAttempt lets a post be enqueued again', async () => {
        for (let i = 0; i < MAX_PENDING_POST_ATTEMPTS; i++) {
            await recordPendingPostAttempt('t3_a')
        }
        await clearPendingPostAttempt('t3_a')
        await addToPendingPostQueue(['t3_a'])
        expect(__getLocalStorage().pending_post_lookups).toEqual(['t3_a'])
    })

    it('clearPendingPostQueue empties queue, progress, and attempts', async () => {
        await addToPendingPostQueue(['t3_a'])
        await recordPendingPostAttempt('t3_a')
        __getLocalStorage().pending_post_progress = { processed: 1, total: 5 }
        await clearPendingPostQueue()
        const local = __getLocalStorage()
        expect(local.pending_post_lookups).toBeUndefined()
        expect(local.pending_post_attempts).toBeUndefined()
        expect(local.pending_post_progress).toBeUndefined()
    })
})

describe('rate-limit backoff', () => {
    beforeEach(() => __resetStorage({}, {}))

    it('has no backoff initially', async () => {
        expect(await getRateLimitBackoffRemainingMs()).toBe(0)
    })

    it('backs off exponentially on repeated hits', async () => {
        const first = await recordRateLimitHit()
        const second = await recordRateLimitHit()
        expect(first).toBe(2 * 60 * 1000)
        expect(second).toBe(first * 2)
        expect(await getRateLimitBackoffRemainingMs()).toBeGreaterThan(0)
    })

    it('caps the backoff at the maximum', async () => {
        let wait = 0
        for (let i = 0; i < 12; i++) wait = await recordRateLimitHit()
        expect(wait).toBe(30 * 60 * 1000)
    })

    it('a success after the backoff ran out clears it and resets the level', async () => {
        await recordRateLimitHit()
        await recordRateLimitHit()
        __getLocalStorage().rate_limit_until = Date.now() - 1000
        await clearRateLimitBackoff()
        expect(await getRateLimitBackoffRemainingMs()).toBe(0)
        // next hit starts again from the base delay
        expect(await recordRateLimitHit()).toBe(2 * 60 * 1000)
    })

    it("a success doesn't end a backoff that hasn't run out, even one whose write is still pending", async () => {
        // after an earlier backoff ran out
        __getLocalStorage().rate_limit_level = 1
        __getLocalStorage().rate_limit_until = Date.now() - 1000
        // the way flagIfRateLimited calls it: not awaited
        recordRateLimitHit()
        await clearRateLimitBackoff()
        expect(await getRateLimitBackoffRemainingMs()).toBeGreaterThan(0)
        expect(__getLocalStorage().rate_limit_level).toBe(2)
    })
})

describe('getScanSettings', () => {
    it('is gentle with nothing saved', async () => {
        __resetStorage()
        expect(await getScanSettings()).toEqual({ readsPerClick: 20, gapMs: 3000 })
    })

    it('uses what was saved, the ends of the range included', async () => {
        for (const [reads, seconds] of [
            [10, 1],
            [100, 60],
            [35, 2.5],
        ]) {
            __resetStorage({ options: { scan_reads_per_click: reads, scan_seconds_between_reads: seconds } })
            expect(await getScanSettings()).toEqual({ readsPerClick: reads, gapMs: seconds * 1000 })
        }
    })

    it("uses the default for what it can't use, which a limit of 5 would be on a profile", async () => {
        for (const [reads, seconds] of [
            [9, 0.5],
            [101, 61],
            [20.5, 'fast'],
            [null, null],
            [[50], true],
        ]) {
            __resetStorage({ options: { scan_reads_per_click: reads, scan_seconds_between_reads: seconds } })
            expect(await getScanSettings()).toEqual({ readsPerClick: 20, gapMs: 3000 })
        }
    })

    it("uses the defaults when storage can't be read", async () => {
        vi.spyOn(browserMock.storage.sync, 'get').mockRejectedValueOnce(new Error('Extension context invalidated.'))
        expect(await getScanSettings()).toEqual({ readsPerClick: 20, gapMs: 3000 })
    })

    it("holds the user's choice to the website's limits, and only ever slower", async () => {
        const limits = scan_limits => (__getLocalStorage()[NEWS_CACHE_KEY] = { feed: { options: { scan_limits } } })
        __resetStorage({ options: { scan_reads_per_click: 50, scan_seconds_between_reads: 2 } })
        limits({ reads_per_click: 12, seconds_between_reads: 5 })
        expect(await getScanSettings()).toEqual({ readsPerClick: 12, gapMs: 5000 })
        limits({ reads_per_click: 80, seconds_between_reads: 1 })
        expect(await getScanSettings()).toEqual({ readsPerClick: 50, gapMs: 2000 })
    })

    it("applies a website limit past the options' range, up to the slowest pace the turns allow", async () => {
        __resetStorage({}, { [NEWS_CACHE_KEY]: { feed: { options: { scan_limits: { reads_per_click: 6, seconds_between_reads: 99 } } } } })
        expect(await getScanSettings()).toEqual({ readsPerClick: 6, gapMs: 60000 })
    })

    it('takes limits from the news feed, whole reads and sane numbers only', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => ({
                ok: true,
                json: async () => ({
                    messages: [],
                    options: { scan_limits: { reads_per_click: 12.5, seconds_between_reads: 'slow', other: 1 } },
                }),
            })),
        )
        __resetStorage()
        await fetchNews({ force: true })
        expect(__getLocalStorage()[NEWS_CACHE_KEY].feed.options.scan_limits).toEqual({ reads_per_click: 12 })
        expect(await getScanSettings()).toEqual({ readsPerClick: 12, gapMs: 3000 })
    })

    it('takes no limit under what a scan needs to start', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => ({ ok: true, json: async () => ({ messages: [], options: { scan_limits: { reads_per_click: 2 } } }) })),
        )
        __resetStorage()
        await fetchNews({ force: true })
        expect(await getScanSettings()).toEqual({ readsPerClick: 6, gapMs: 3000 })
    })

    it('leaves the defaults unset, so a gentler one later reaches those who never chose', async () => {
        __resetStorage()
        const save = (reads, seconds) =>
            saveOptionsP(optionsToSave({ scan_reads_per_click: reads, scan_seconds_between_reads: seconds }))
        await save(20, 3)
        expect(__getSyncStorage().options).not.toHaveProperty('scan_reads_per_click')
        expect(__getSyncStorage().options).not.toHaveProperty('scan_seconds_between_reads')
        await save(30, 3)
        expect(__getSyncStorage().options.scan_reads_per_click).toBe(30)
    })
})

describe('getOptions / saveOptions', () => {
    beforeEach(() => __resetStorage(makeStorageInit()))

    it('retrieves current options', async () => {
        await getOptions((options) => {
            expect(options.interval).toBe(INTERVAL_DEFAULT)
            expect(options.removal_status.track).toBe(true)
            expect(options.lock_status.notify).toBe(true)
        })
    })

    it('saves options and persists', async () => {
        await saveOptionsP(
            optionsToSave({
                seen_count: 3,
                interval: 5,
                custom_clientid: 'my_client',
                removal_status: { track: true, notify: false },
                lock_status: { track: false, notify: true },
                hide_subscribe: true,
                show_scan_on_own_profile: true,
                show_scan_on_other_profiles: false,
                show_thread_scan_buttons: false,
                auto_filter_removed_threads: false,
                scan_reads_per_click: 30,
                scan_seconds_between_reads: 2.5,
            }),
        )
        const storage = __getSyncStorage()
        expect(storage.options.seen_count).toBe(3)
        expect(storage.options.interval).toBe(5)
        expect(storage.options.scan_reads_per_click).toBe(30)
        expect(storage.options.scan_seconds_between_reads).toBe(2.5)
        expect(storage.options.custom_clientid).toBe('my_client')
        expect(storage.options.removal_status.track).toBe(true)
        expect(storage.options.removal_status.notify).toBe(false)
        expect(storage.options.lock_status.track).toBe(false)
        expect(storage.options.lock_status.notify).toBe(true)
        expect(storage.options.hide_subscribe).toBe(true)
        expect(storage.options.monitor_quarantined).toBe(false)
        expect(storage.options.show_scan_on_own_profile).toBe(true)
        expect(storage.options.show_scan_on_other_profiles).toBe(false)
        expect(storage.options.show_thread_scan_buttons).toBe(false)
        expect(storage.options.highlight_own_profile_status).toBe(true)
        expect(storage.options.auto_filter_removed_threads).toBe(false)
    })
})
