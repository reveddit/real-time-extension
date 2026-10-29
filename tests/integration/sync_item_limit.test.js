// Chrome and Firefox refuse a storage.sync item over 8,192 bytes (its key's
// length plus its value's JSON) and refuse the whole set() call that carries
// it. Issue #15: a user's unlocked list sat 5 bytes under that limit. The
// monitoring save carries every list in one call, so once a new comment pushed
// that list over, the save that recorded a removal was refused too. Each later
// check found no record of the removal and announced it again. Both browsers
// refuse the same way a set() that would take the whole store past 102,400
// bytes, which five accounts with full lists pass.

// Install chrome global BEFORE any source import
import '../mocks/chrome-api.js'

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { __resetStorage, __getSyncStorage, __getLocalStorage } from '../mocks/webextension-polyfill.js'

import { _checkForChanges_thing_byId } from '../../src/src/monitoring'
import {
    getObjectNamesForThing,
    REMOVED,
    APPROVED,
    trimDict_toFitSyncItem,
    fitDicts_toSyncTotal,
    markIDsAsSeenIfSubscribed,
    formatSyncUsage,
} from '../../src/src/storage'
import { trimDict_by_numberValuedAttribute } from '../../src/src/common'

const LIMIT = 8192
const TOTAL_LIMIT = 102400
const SUBSCRIBED_FROM_NA = 2
const itemBytes = (key, value) => key.length + JSON.stringify(value).length
// Firefox measures the total as the JSON of the whole store, a few bytes a key
// more than Chrome's sum of item sizes
const storeBytes = storage => JSON.stringify(storage).length

const USER = 'someuser'
const keys = getObjectNamesForThing(USER, true)
const ID = 't1_newcomm'
const LINK = 't3_1abcdefxxxxxx'
const NOW = Math.floor(Date.now() / 1000)
const CREATED = NOW - 600
const OLD = NOW - 30 * 24 * 3600

const OPTIONS = {
    seen_count: 2,
    interval: 1,
    removal_status: { track: true, notify: true },
    lock_status: { track: true, notify: true },
}

// The reporter's unlocked list: 130 entries, 8,187 bytes. The oldest entry is
// a post's, which has no post id, so the new comment's entry in its place is
// longer. The comments' post ids are padded to land on 8,187.
const unlockedAtReportersSize = () => {
    const dict = { t3_oldpost: { c: OLD, u: false } }
    const ids = []
    for (let i = 1; i < 130; i++) {
        const id = `t1_c${String(i).padStart(6, '0')}`
        dict[id] = { c: OLD + i, u: false, p: 't3_1abcdef' }
        ids.push(id)
    }
    for (let i = 0; itemBytes(keys.unlocked, dict) < 8187; i = (i + 1) % ids.length) {
        dict[ids[i]].p += 'x'
    }
    return dict
}

// n comments' entries, a minute apart, the newest first
const entries = (prefix, n, newest) => {
    const dict = {}
    for (let i = 0; i < n; i++) {
        dict[`t1_${prefix}${String(i).padStart(7 - prefix.length, '0')}`] = {
            c: newest - i * 60,
            u: false,
            p: 't3_1abcdef',
        }
    }
    return dict
}

const authItem = { name: ID, author: USER, body: 'my comment', created_utc: CREATED, link_id: LINK, locked: false }
const removedView = { ...authItem, author: '[deleted]', body: '[removed]' }

// One monitoring check of the comment: storage is read fresh, as each cycle does
const check = async view => {
    const storage = structuredClone(__getSyncStorage())
    await _checkForChanges_thing_byId(
        [ID],
        USER,
        true,
        null,
        storage,
        SUBSCRIBED_FROM_NA,
        { [ID]: authItem },
        [],
        [{ data: { ...view } }],
    )
    for (let i = 0; i < 5; i++) await new Promise(r => setTimeout(r, 0))
}

const announced = () => (__getLocalStorage().notification_log || []).map(entry => entry.message)
const recorded = type => (__getSyncStorage()[keys.changes] || []).filter(change => change.i === ID && change.g === type)

// Removed, then approved, then removed again: each is announced and recorded once
const removeApproveRemove = async () => {
    await check(authItem)

    // Removed: announced after the confirmation checks (3 to 5), and recorded
    for (let i = 0; i < 5 && !recorded(REMOVED).length; i++) await check(removedView)
    expect(recorded(REMOVED)).toHaveLength(1)
    expect(__getSyncStorage()[keys.removed][ID]).toBeDefined()
    // Still removed for a while: no new announcement
    for (let i = 0; i < 6; i++) await check(removedView)
    expect(announced()).toEqual(['1 new [mod removed] actions, click to view'])

    // Approved: announced after two live checks
    await check(authItem)
    await check(authItem)
    expect(recorded(APPROVED)).toHaveLength(1)
    expect(__getSyncStorage()[keys.removed][ID]).toBeUndefined()

    // Removed again: announced again
    for (let i = 0; i < 5 && recorded(REMOVED).length < 2; i++) await check(removedView)
    expect(recorded(REMOVED)).toHaveLength(2)
    expect(announced()).toEqual([
        '1 new [mod removed] actions, click to view',
        '1 new [approved] actions, click to view',
        '1 new [mod removed] actions, click to view',
    ])
}

// As the browsers do it: one item over the limit, or a store over the total,
// refuses the whole call
let refusals
let restoreSet
beforeEach(() => {
    refusals = []
    const set = chrome.storage.sync.set
    chrome.storage.sync.set = (items, callback) => {
        const tooBig = Object.entries(items).some(([key, value]) => itemBytes(key, value) > LIMIT)
        if (!tooBig && storeBytes({ ...__getSyncStorage(), ...items }) <= TOTAL_LIMIT) {
            return set(items, callback)
        }
        const message = tooBig ? 'QUOTA_BYTES_PER_ITEM quota exceeded' : 'QUOTA_BYTES quota exceeded'
        refusals.push(message)
        chrome.runtime.lastError = { message }
        try {
            if (callback) callback()
        } finally {
            chrome.runtime.lastError = null
        }
        return Promise.resolve()
    }
    restoreSet = () => {
        chrome.storage.sync.set = set
    }
})
afterEach(() => restoreSet())

describe('sync storage item limit (issue #15)', () => {
    beforeEach(() => {
        __resetStorage({
            options: OPTIONS,
            user_subscriptions: { [USER]: true },
            other_subscriptions: {},
            [keys.removed]: {},
            [keys.approved]: {},
            [keys.locked]: {},
            [keys.unlocked]: unlockedAtReportersSize(),
            [keys.changes]: [],
        })
    })

    it("starts from the reporter's case: keeping 130 entries carries the unlocked list over the limit", () => {
        const stored = __getSyncStorage()[keys.unlocked]
        expect(itemBytes(keys.unlocked, stored)).toBe(8187)
        const kept = trimDict_by_numberValuedAttribute({ ...stored, [ID]: { c: CREATED, u: false, p: LINK } }, 130, 'c')
        expect(itemBytes(keys.unlocked, kept)).toBeGreaterThan(LIMIT)
    })

    it('records a removal once, then its approval, then a second removal, each announced once', async () => {
        await removeApproveRemove()

        expect(refusals).toEqual([])
        for (const [key, value] of Object.entries(__getSyncStorage())) {
            expect(itemBytes(key, value)).toBeLessThanOrEqual(LIMIT)
        }
    })
})

// Five accounts in use for a while. The four not logged in fill most of the
// store, and the logged-in account's lists take the rest, to 20 bytes short.
const ALTS = ['alt1', 'alt2', 'alt3', 'alt4']
const otherKeys = getObjectNamesForThing('other', false)
const nearlyFullStore = () => {
    const storage = {
        options: OPTIONS,
        user_subscriptions: Object.fromEntries([USER, ...ALTS].map(user => [user, true])),
        user_unsubscriptions: {},
        user_initial_lookup_done: {},
        other_subscriptions: {},
        last_check: NOW,
        last_check_quarantined: NOW,
        [otherKeys.removed]: {},
        [otherKeys.approved]: {},
        [otherKeys.locked]: {},
        [otherKeys.unlocked]: {},
        [otherKeys.changes]: [],
        [keys.removed]: {},
        [keys.approved]: entries('a', 125, OLD),
        [keys.locked]: {},
        [keys.unlocked]: entries('a', 125, OLD),
        [keys.changes]: [],
    }
    for (const alt of ALTS) {
        const altKeys = getObjectNamesForThing(alt, true)
        storage[altKeys.removed] = {}
        storage[altKeys.approved] = entries('a', 125, OLD)
        storage[altKeys.locked] = {}
        storage[altKeys.unlocked] = entries('a', 125, OLD)
        storage[altKeys.changes] = Array.from({ length: 100 }, (_, i) => ({
            i: `t1_c${String(i).padStart(6, '0')}`,
            o: OLD + i,
            g: REMOVED,
            n: null,
        }))
    }
    let n = 0
    for (const alt of ALTS) {
        const removed = storage[getObjectNamesForThing(alt, true).removed]
        while (Object.keys(removed).length < 100 && storeBytes(storage) + 60 < TOTAL_LIMIT - 20) {
            removed[`t1_r${String(n++).padStart(6, '0')}`] = { c: OLD - n * 60, u: false, p: 't3_1abcdef' }
        }
    }
    const padded = Object.values(storage[getObjectNamesForThing(ALTS[0], true).removed])[0]
    while (storeBytes(storage) < TOTAL_LIMIT - 20) padded.p += 'x'
    return storage
}

describe('sync storage total limit', () => {
    let initial
    beforeEach(() => {
        initial = nearlyFullStore()
        __resetStorage(initial)
    })

    it("starts from a store 20 bytes short of the total: the new comment's entries carry it over", () => {
        expect(storeBytes(initial)).toBe(TOTAL_LIMIT - 20)
        const entry = { c: CREATED, u: false, p: LINK }
        const after = {
            ...initial,
            [keys.approved]: { ...initial[keys.approved], [ID]: entry },
            [keys.unlocked]: { ...initial[keys.unlocked], [ID]: entry },
        }
        expect(storeBytes(after)).toBeGreaterThan(TOTAL_LIMIT)
    })

    it('records a removal once, then its approval, then a second removal, giving up only old approved and unlocked entries', async () => {
        await removeApproveRemove()

        expect(refusals).toEqual([])
        const stored = __getSyncStorage()
        expect(storeBytes(stored)).toBeLessThanOrEqual(TOTAL_LIMIT)
        // The other accounts' lists are as they were
        for (const alt of ALTS) {
            for (const key of Object.values(getObjectNamesForThing(alt, true))) {
                expect(stored[key]).toEqual(initial[key])
            }
        }
        // The logged-in account's approved and unlocked lists gave up their oldest entries
        for (const key of [keys.approved, keys.unlocked]) {
            const kept = Object.keys(stored[key]).filter(id => id !== ID)
            expect(kept.length).toBeLessThan(125)
            expect(kept).toEqual(Object.keys(initial[key]).slice(0, kept.length))
        }
    })
})

describe('trimming a list to fit one sync item', () => {
    it('keeps exactly what the 130-entry cap keeps when the list fits', () => {
        const dict = { a: { c: 1, u: true }, b: { c: 3, u: false, p: 't3_x' }, c: { c: 2, u: false } }
        expect(JSON.stringify(trimDict_toFitSyncItem(dict, 130, 'c', keys.removed))).toBe(
            JSON.stringify(trimDict_by_numberValuedAttribute(dict, 130, 'c')),
        )
        expect(Object.keys(trimDict_toFitSyncItem(dict, 2, 'c', keys.removed))).toEqual(['b', 'c'])
    })

    it('drops the oldest entries that would carry the list over the limit', () => {
        const dict = { ...unlockedAtReportersSize(), [ID]: { c: CREATED, u: false, p: LINK } }
        const fitted = trimDict_toFitSyncItem(dict, 130, 'c', keys.unlocked)
        expect(itemBytes(keys.unlocked, fitted)).toBeLessThanOrEqual(LIMIT - 256)
        expect(fitted[ID]).toBeDefined()
        expect(fitted.t3_oldpost).toBeUndefined()
        // the newest part of what the cap keeps
        const capped = Object.keys(trimDict_by_numberValuedAttribute(dict, 130, 'c'))
        expect(Object.keys(fitted)).toEqual(capped.slice(0, Object.keys(fitted).length))
    })
})

describe('fitting a save under the total', () => {
    // Twelve full items of other accounts
    const others = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`stale_${i}`, 'x'.repeat(7900)]))
    const toSave = {
        [keys.removed]: entries('r', 20, OLD),
        [keys.approved]: entries('a', 125, OLD),
        [keys.unlocked]: entries('u', 10, OLD),
        [keys.changes]: [],
    }

    it('leaves a save that fits as it is', () => {
        const fitted = fitDicts_toSyncTotal(toSave, { stale: 'x' }, [keys.approved, keys.unlocked], 'c')
        expect(JSON.stringify(fitted)).toBe(JSON.stringify(toSave))
    })

    it('cuts the larger dict, keeping its newest entries, and leaves the others whole', () => {
        const fitted = fitDicts_toSyncTotal(toSave, others, [keys.approved, keys.unlocked], 'c')
        const used = [others, fitted].reduce(
            (sum, items) => sum + Object.entries(items).reduce((s, [key, value]) => s + itemBytes(key, value), 0),
            0,
        )
        expect(used).toBeLessThanOrEqual(TOTAL_LIMIT - 1024)
        expect(fitted[keys.removed]).toBe(toSave[keys.removed])
        expect(fitted[keys.unlocked]).toBe(toSave[keys.unlocked])
        const kept = Object.keys(fitted[keys.approved])
        expect(kept.length).toBeLessThan(125)
        expect(kept).toEqual(Object.keys(toSave[keys.approved]).slice(0, kept.length))
    })
})

describe('marking items seen from a reveddit page', () => {
    // The newest three of the account's 125 entries are unseen. The page shows
    // them and 40 older items, which the page's mark adds.
    let newest
    let pageIds
    beforeEach(() => {
        const approved = entries('a', 125, OLD)
        newest = Object.keys(approved).slice(0, 3)
        newest.forEach(id => (approved[id].u = true))
        pageIds = Object.fromEntries(newest.map(id => [id, String(approved[id].c)]))
        for (let i = 0; i < 40; i++) {
            pageIds[`t1_o${String(i).padStart(6, '0')}`] = String(OLD - (125 + i) * 60)
        }
        __resetStorage({
            options: OPTIONS,
            user_subscriptions: { [USER]: true },
            other_subscriptions: {},
            [keys.removed]: {},
            [keys.approved]: approved,
            [keys.locked]: {},
            [keys.unlocked]: structuredClone(approved),
            [keys.changes]: [],
        })
    })

    it('marks the newest seen though the added entries would carry the lists over the limit', async () => {
        const added = { ...__getSyncStorage()[keys.approved] }
        for (const [id, c] of Object.entries(pageIds)) if (!(id in added)) added[id] = { c, u: false }
        expect(itemBytes(keys.approved, added)).toBeGreaterThan(LIMIT)

        await new Promise(resolve => markIDsAsSeenIfSubscribed(USER, true, {}, pageIds, {}, pageIds, resolve))

        expect(refusals).toEqual([])
        const stored = __getSyncStorage()
        for (const key of [keys.approved, keys.unlocked]) {
            for (const id of newest) expect(stored[key][id].u).toBe(false)
            expect(itemBytes(key, stored[key])).toBeLessThanOrEqual(LIMIT - 256)
        }
    })

    it('keeps what a check saved after the page read storage', async () => {
        // The page opens, then a check records the comment's removal before
        // the page's items load. The comment isn't among them.
        await check(authItem)
        for (let i = 0; i < 5 && !recorded(REMOVED).length; i++) await check(removedView)
        expect(recorded(REMOVED)).toHaveLength(1)
        const checkSaved = structuredClone(__getSyncStorage())

        await new Promise(resolve => markIDsAsSeenIfSubscribed(USER, true, {}, pageIds, {}, pageIds, resolve))

        const stored = __getSyncStorage()
        expect(stored[keys.removed]).toEqual(checkSaved[keys.removed])
        expect(stored[keys.changes]).toEqual(checkSaved[keys.changes])
        for (const id of newest) expect(stored[keys.approved][id].u).toBe(false)
        // Still removed: not announced again
        for (let i = 0; i < 6; i++) await check(removedView)
        expect(announced()).toEqual(['1 new [mod removed] actions, click to view'])
        expect(recorded(REMOVED)).toHaveLength(1)
    })

    it('saves only the lists it marks', async () => {
        const otherKeys = getObjectNamesForThing('other', false)
        __getSyncStorage()[otherKeys.removed] = { t1_otheritem: { c: OLD, u: true } }
        __getSyncStorage().last_check = NOW
        const saved = []
        const set = chrome.storage.sync.set
        chrome.storage.sync.set = (items, callback) => {
            saved.push(Object.keys(items).sort())
            return set(items, callback)
        }

        await new Promise(resolve => markIDsAsSeenIfSubscribed(USER, true, {}, pageIds, {}, pageIds, resolve))

        expect(saved).toEqual([[keys.approved, keys.locked, keys.removed, keys.unlocked].sort()])
    })
})

describe('the diagnostic log line on sync storage', () => {
    it('gives the total and the largest items against the limits', () => {
        const storage = {
            last_check: 1761689400,
            [keys.unlocked]: unlockedAtReportersSize(),
            options: { seen_count: 2 },
        }
        expect(formatSyncUsage(storage)).toBe(
            `sync storage: 8230 bytes in 3 items, largest ${keys.unlocked} 8187, options 23, last_check 20 (limits 8192 per item, 102400 in all)`,
        )
        expect(formatSyncUsage({})).toBe(
            'sync storage: 0 bytes in 0 items, largest none (limits 8192 per item, 102400 in all)',
        )
    })
})
