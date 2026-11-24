// Integration tests for storage.js.
// Mock the chrome.storage API at the boundary and test storage operations.

// Install chrome global BEFORE any source import
import '../mocks/chrome-api.js'

import { describe, it, expect, beforeEach, vi } from 'vitest'
import browserMock, { __resetStorage, __getSyncStorage, __getLocalStorage } from '../mocks/webextension-polyfill.js'
import { REMOVED, APPROVED, LOCKED, UNLOCKED } from '../../src/src/common'

import {
    INTERVAL_DEFAULT,
    SEEN_COUNT_DEFAULT,
    MAX_SUBSCRIPTIONS,
    addLocalStorageItems,
    MAX_OTHER_SUBSCRIPTIONS,
    getObjectNamesForThing,
    getUserInit,
    initStorage,
    subscribeUser,
    subscribeId,
    unsubscribeId,
    markThingAsSeen,
    getIDs_thing,
    getUnseenIDs_thing,
    getAllChanges,
    FOLLOWED_NOTIFICATION,
    getOptions,
    saveOptions,
    recordRateLimitHit,
    clearRateLimitBackoff,
    getRateLimitBackoffRemainingMs,
} from '../../src/src/storage.ts'

// Promisify callback-style functions for cleaner tests
const initStorageP = () => new Promise((resolve) => initStorage(resolve))
const subscribeUserP = (user) =>
    new Promise((resolve, reject) => subscribeUser(user, resolve, reject))
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
    removal_status: { track: true, notify: true },
    lock_status: { track: true, notify: true },
    hide_subscribe: false,
    highlight_own_profile_status: true,
    ...changes,
})

// Helper: create a full storage init matching what initStorage would produce
function makeStorageInit(overrides = {}) {
    return {
        user_subscriptions: {},
        user_unsubscriptions: {},
        other_subscriptions: {},
        options: {
            interval: INTERVAL_DEFAULT,
            seen_count: SEEN_COUNT_DEFAULT,
            removal_status: { track: true, notify: true },
            lock_status: { track: true, notify: true },
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

describe('subscribeUser', () => {
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
        const badge = vi.spyOn(chrome.action, 'setBadgeText')
        await unsubscribeIdP('t3_abc')
        expect(__getSyncStorage().other_subscriptions['t3_abc']).toBeUndefined()
        // Set in place: the background unfollows for a content script, and can't message itself
        await vi.waitFor(() => expect(badge).toHaveBeenCalledWith({ text: '' }))
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

describe('getAllChanges', () => {
    it('keeps an account named other apart from followed items', async () => {
        const mine = { i: 't1_mine', o: 1, g: REMOVED, n: 0 }
        const followed = { i: 't1_followed', o: 2, g: REMOVED, n: 0 }
        __resetStorage(
            makeStorageInit({
                user_subscriptions: { other: true },
                changes_u_other: [mine],
                changes_other: [followed],
            }),
        )
        const changes = await new Promise(resolve => getAllChanges(resolve))
        expect(changes).toEqual({ other: [mine], [FOLLOWED_NOTIFICATION]: [followed] })
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
                removal_status: { track: true, notify: false },
                lock_status: { track: false, notify: true },
                hide_subscribe: true,
                highlight_own_profile_status: false,
            }),
        )
        const storage = __getSyncStorage()
        expect(storage.options.seen_count).toBe(3)
        expect(storage.options.interval).toBe(5)
        expect(storage.options.removal_status.track).toBe(true)
        expect(storage.options.removal_status.notify).toBe(false)
        expect(storage.options.lock_status.track).toBe(false)
        expect(storage.options.lock_status.notify).toBe(true)
        expect(storage.options.hide_subscribe).toBe(true)
        expect(storage.options.highlight_own_profile_status).toBe(false)
    })
})

describe('addLocalStorageItems', () => {
    beforeEach(() => __resetStorage({}, { items_other: { t1_old: { t: 'kept', o: 1 } } }))

    it('adds to what is stored, and settles after the save', async () => {
        const set = browserMock.storage.local.set
        let saved = false
        vi.spyOn(browserMock.storage.local, 'set').mockImplementation(async items => {
            await new Promise(resolve => setTimeout(resolve, 1))
            saved = true
            return set(items)
        })
        await addLocalStorageItems({ t1_new: { t: 'added', o: 2 } }, 'other', false)
        expect(saved).toBe(true)
        expect(__getLocalStorage().items_other).toEqual({
            t1_old: { t: 'kept', o: 1 },
            t1_new: { t: 'added', o: 2 },
        })
    })

    it("doesn't write the whole object again with nothing to add", async () => {
        const set = vi.spyOn(browserMock.storage.local, 'set')
        await addLocalStorageItems({}, 'other', false)
        expect(set).not.toHaveBeenCalled()
    })

    it('keeps the 1,000 last seen when it goes over', async () => {
        const items = {}
        for (let i = 0; i < 1000; i++) items[`t1_${i}`] = { t: 'x', o: 10 + i }
        await addLocalStorageItems(items, 'other', false)
        const stored = __getLocalStorage().items_other
        expect(Object.keys(stored)).toHaveLength(1000)
        expect(stored.t1_old).toBeUndefined()
    })
})
