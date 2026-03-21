// Integration tests for storage.js.
// Mock the chrome.storage API at the boundary and test storage operations.

// Install chrome global BEFORE any source import
import '../mocks/chrome-api.js'

import { describe, it, expect, beforeEach } from 'vitest'
import { __resetStorage, __getSyncStorage, __getLocalStorage } from '../mocks/webextension-polyfill.js'

import {
    REMOVED,
    APPROVED,
    LOCKED,
    UNLOCKED,
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
    getSubscribedIds,
    markThingAsSeen,
    getIDs_thing,
    getUnseenIDs_thing,
    getOptions,
    saveOptions,
    addToPendingPostQueue,
    getNextPendingPost,
    removeFromPendingPostQueue,
} from '../../src/src/storage.js'

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
const getSubscribedIdsP = () =>
    new Promise((resolve) => getSubscribedIds(resolve))
const saveOptionsP = (...args) =>
    new Promise((resolve) => saveOptions(...args, resolve))

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
        last_check_quarantined: null,
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

describe('subscribeId / unsubscribeId / getSubscribedIds', () => {
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

    it('getSubscribedIds returns all subscribed IDs', async () => {
        __resetStorage(
            makeStorageInit({
                other_subscriptions: { t3_a: { t: 1 }, t1_b: { t: 2 } },
            }),
        )
        const ids = await getSubscribedIdsP()
        expect(ids.sort()).toEqual(['t1_b', 't3_a'])
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
        const next = await getNextPendingPost()
        expect(next).toBe('t3_a')
    })

    it('removes from queue', async () => {
        await addToPendingPostQueue(['t3_a', 't3_b', 't3_c'])
        await removeFromPendingPostQueue('t3_a')
        const next = await getNextPendingPost()
        expect(next).toBe('t3_b')
    })

    it('returns null for empty queue', async () => {
        const next = await getNextPendingPost()
        expect(next).toBeNull()
    })

    it('deduplicates entries', async () => {
        await addToPendingPostQueue(['t3_a', 't3_b'])
        await addToPendingPostQueue(['t3_b', 't3_c'])
        const local = __getLocalStorage()
        const queue = local.pending_post_lookups
        expect(queue).toEqual(['t3_a', 't3_b', 't3_c'])
    })
})

describe('getOptions / saveOptions', () => {
    beforeEach(() => __resetStorage(makeStorageInit()))

    it('retrieves current options', async () => {
        await getOptions((users, others, options) => {
            expect(options.interval).toBe(INTERVAL_DEFAULT)
            expect(options.removal_status.track).toBe(true)
            expect(options.lock_status.notify).toBe(true)
        })
    })

    it('saves options and persists', async () => {
        await saveOptionsP(3, 5, 'my_client', true, false, false, true, true, false)
        const storage = __getSyncStorage()
        expect(storage.options.seen_count).toBe(3)
        expect(storage.options.interval).toBe(5)
        expect(storage.options.custom_clientid).toBe('my_client')
        expect(storage.options.removal_status.track).toBe(true)
        expect(storage.options.removal_status.notify).toBe(false)
        expect(storage.options.lock_status.track).toBe(false)
        expect(storage.options.lock_status.notify).toBe(true)
        expect(storage.options.hide_subscribe).toBe(true)
        expect(storage.options.monitor_quarantined).toBe(false)
    })
})
