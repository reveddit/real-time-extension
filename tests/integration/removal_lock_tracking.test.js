// Removal tracking and lock tracking share one local record per item, and
// moderators often remove and lock together. Each must come out as if the other
// weren't there: an approval registers while the item stays locked, and a lock
// counts nothing toward a removal's confirmation.

// Install chrome global BEFORE any source import
import '../mocks/chrome-api.js'

import { describe, it, expect, beforeEach, vi } from 'vitest'
import browserMock, { __resetStorage, __getSyncStorage, __getLocalStorage } from '../mocks/webextension-polyfill.js'
import { _checkForChanges_thing_byId } from '../../src/src/monitoring.ts'
import { getObjectNamesForThing } from '../../src/src/storage.ts'
import { REMOVED, APPROVED, LOCKED, UNLOCKED, DELETED } from '../../src/src/common.ts'

const USER = 'someuser'
const OTHER = 'other'
const ID = 't1_item'
const CREATED = Math.floor(Date.now() / 1000) - 600
const SUBSCRIBED_FROM_REDDIT = 0
const SUBSCRIBED_FROM_NA = 2
const SEEN_COUNT = 2
// REMOVAL_CONFIRMATION_THRESHOLD is random for each extension instance
const MIN_CONFIRMATION = 3
const MAX_CONFIRMATION = 5
const STORED_ITEM = { t: 'text', o: 1, c: CREATED, n: 0, r: 0 }

const keysOf = thing => getObjectNamesForThing(thing, thing !== OTHER)
const localKey = thing => (thing === OTHER ? 'items_other' : `items_u_${thing}`)

const resetStorage = ({ removal = true, lock = true, notifyRemoval = true, notifyLock = true } = {}) => {
    const init = {
        options: {
            seen_count: SEEN_COUNT,
            interval: 1,
            removal_status: { track: removal, notify: notifyRemoval },
            lock_status: { track: lock, notify: notifyLock },
        },
        user_subscriptions: { [USER]: true },
        other_subscriptions: {},
    }
    for (const thing of [USER, OTHER]) {
        for (const key of Object.values(keysOf(thing))) init[key] = key.startsWith('changes') ? [] : {}
    }
    __resetStorage(init)
}

// The item is on these lists and has this saved record, as an earlier check left it
const seed = (lists, record = STORED_ITEM, thing = USER) => {
    for (const list of lists) __getSyncStorage()[keysOf(thing)[list]][ID] = { c: CREATED, u: false }
    __getLocalStorage()[localKey(thing)] = { [ID]: record }
}

// One check of these lookup results, reading storage fresh as each cycle does
const lookup = async (results, thing, subscribedFrom, itemLookup) => {
    await _checkForChanges_thing_byId(
        results.map(result => result.name),
        thing,
        thing !== OTHER,
        structuredClone(__getSyncStorage()),
        subscribedFrom,
        itemLookup,
        results.map(result => ({ data: { ...result } })),
    )
    await new Promise(resolve => setImmediate(resolve))
}

// The author's own view always shows the comment; the lookup's result shows
// what others see
const check = async ({ removed = false, locked = false }, thing = USER, subscribedFrom = SUBSCRIBED_FROM_NA) => {
    const authItem = { name: ID, author: USER, body: 'text', created_utc: CREATED, link_id: 't3_post', locked }
    const result = removed ? { ...authItem, author: '[deleted]', body: '[removed]' } : authItem
    await lookup([result], thing, subscribedFrom, thing === OTHER ? {} : { [ID]: authItem })
}

const list = (name, thing = USER) => Object.keys(__getSyncStorage()[keysOf(thing)[name]])
const announced = () => (__getLocalStorage().notification_log || []).map(entry => entry.message)

// Checks until the item reaches the list, and how many it took
const checksUntilListed = async (name, observation) => {
    let checks = 0
    while (!list(name).length && checks <= MAX_CONFIRMATION) {
        await check(observation)
        checks++
    }
    return checks
}

beforeEach(() => {
    resetStorage()
})

describe('an item both tracks are watching', () => {
    it('registers an approval while the item stays locked', async () => {
        seed(['removed', 'locked'])
        for (let i = 0; i < SEEN_COUNT; i++) await check({ locked: true })
        expect(list('removed')).toEqual([])
        expect(list('approved')).toEqual([ID])
        expect(list('locked')).toEqual([ID])
        expect(announced()).toEqual(['1 new [approved] actions, click to view'])
    })

    it('registers an approval that comes with a lock, then confirms the lock', async () => {
        seed(['removed'])
        for (let i = 0; i < SEEN_COUNT; i++) await check({ locked: true })
        expect(list('approved')).toEqual([ID])
        expect(list('locked')).toEqual([])
        expect(await checksUntilListed('locked', { locked: true })).toBeLessThanOrEqual(MAX_CONFIRMATION)
        expect(announced()).toEqual([
            '1 new [approved] actions, click to view',
            '1 new [locked] actions, click to view',
        ])
    })

    it('does not count checks of a locked, live item toward a removal', async () => {
        seed(['locked'])
        for (let i = 0; i < MAX_CONFIRMATION; i++) await check({ locked: true })
        await check({ removed: true, locked: true })
        expect(list('removed')).toEqual([])
        expect(announced()).toEqual([])
    })

    it('makes a locked item wait for the whole removal confirmation', async () => {
        seed(['locked'])
        for (let i = 0; i < MAX_CONFIRMATION; i++) await check({ locked: true })
        const checks = await checksUntilListed('removed', { removed: true, locked: true })
        expect(checks).toBeGreaterThanOrEqual(MIN_CONFIRMATION)
        expect(checks).toBeLessThanOrEqual(MAX_CONFIRMATION)
        expect(announced()).toEqual(['1 new [mod removed] actions, click to view'])
    })

    it('gives a lock its own confirmation while the item shows live', async () => {
        seed([])
        const checks = await checksUntilListed('locked', { locked: true })
        expect(checks).toBeGreaterThanOrEqual(MIN_CONFIRMATION)
        expect(checks).toBeLessThanOrEqual(MAX_CONFIRMATION)
    })

    it('announces a removal and a lock seen together in one notification', async () => {
        seed([])
        await checksUntilListed('removed', { removed: true, locked: true })
        expect(list('removed')).toEqual([ID])
        expect(list('locked')).toEqual([ID])
        expect(announced()).toEqual(['2 new [mod removed, locked] actions, click to view'])
    })

    it('announces an approval and an unlock seen together in one notification', async () => {
        seed(['removed', 'locked'])
        for (let i = 0; i < SEEN_COUNT; i++) await check({})
        expect(list('approved')).toEqual([ID])
        expect(list('unlocked')).toEqual([ID])
        expect(announced()).toEqual(['2 new [approved, unlocked] actions, click to view'])
    })

    it('unlocks an item that stays removed, then counts its approval from the start', async () => {
        seed(['removed', 'locked'])
        for (let i = 0; i < SEEN_COUNT; i++) await check({ removed: true })
        expect(list('unlocked')).toEqual([ID])
        expect(list('removed')).toEqual([ID])

        await check({})
        expect(list('removed')).toEqual([ID])
        await check({})
        expect(list('approved')).toEqual([ID])
    })

    it('starts an approval over when the removal shows again, and an unlock when the lock does', async () => {
        seed(['removed', 'locked'])
        await check({})
        await check({ removed: true, locked: true })
        await check({})
        expect(list('removed')).toEqual([ID])
        expect(list('locked')).toEqual([ID])
        expect(announced()).toEqual([])
    })

    it('saves the approved text when the lock pass runs after it', async () => {
        seed(['removed', 'locked'], { ...STORED_ITEM, t: 'text before the edit' })
        for (let i = 0; i < SEEN_COUNT; i++) await check({ locked: true })
        expect(__getLocalStorage()[localKey(USER)][ID].t).toBe('text')
    })

    it.each([USER, OTHER])(
        'writes nothing for %s when a recorded removal and lock read the same again, and counts nothing',
        async thing => {
            seed(['removed', 'locked'], { ...STORED_ITEM, r: 7, lr: 4 }, thing)
            const set = vi.spyOn(browserMock.storage.local, 'set')
            for (let i = 0; i < 3; i++) await check({ removed: true, locked: true }, thing)
            expect(set.mock.calls.filter(([items]) => localKey(thing) in items)).toEqual([])
            expect(__getLocalStorage()[localKey(thing)][ID]).toEqual({ ...STORED_ITEM, r: 7, lr: 4 })
        },
    )
})

describe('a followed item', () => {
    it('records the lock of an item followed from its own page on that first check, as already seen', async () => {
        await check({ locked: true }, OTHER, SUBSCRIBED_FROM_REDDIT)
        expect(__getSyncStorage()[keysOf(OTHER).locked][ID].u).toBe(false)
        await check({ locked: true }, OTHER)
        expect(announced()).toEqual([])
    })

    it('keeps the saved record of a removed comment when it is unlocked', async () => {
        const saved = { ...STORED_ITEM, t: 'the text before its removal', p: 't3_saved', s: 'saved' }
        seed(['removed', 'locked'], saved, OTHER)
        for (let i = 0; i < SEEN_COUNT; i++) await check({ removed: true }, OTHER)
        expect(list('unlocked', OTHER)).toEqual([ID])
        expect(announced()).toEqual(['1 new [unlocked] actions, click to view'])
        expect(__getLocalStorage()[localKey(OTHER)][ID]).toMatchObject({ t: saved.t, p: saved.p, s: saved.s })
    })

    it('saves the current text of a live comment when it is unlocked', async () => {
        seed(['locked'], { ...STORED_ITEM, t: 'text before the edit' }, OTHER)
        for (let i = 0; i < SEEN_COUNT; i++) await check({}, OTHER)
        expect(list('unlocked', OTHER)).toEqual([ID])
        expect(__getLocalStorage()[localKey(OTHER)][ID].t).toBe('text')
    })
})

describe('records saved by earlier versions', () => {
    it('carries on from a count an earlier version saved', async () => {
        seed(['removed'], { ...STORED_ITEM, n: SEEN_COUNT - 1 })
        await check({})
        expect(list('approved')).toEqual([ID])
    })

    it('loads a record with no counts at all', async () => {
        const { t, o, c } = STORED_ITEM
        seed(['removed', 'locked'], { t, o, c })
        for (let i = 0; i < SEEN_COUNT; i++) await check({ locked: true })
        expect(list('approved')).toEqual([ID])
    })

    it('finishes an unlock begun before the counts were separated', async () => {
        seed(['locked'], { ...STORED_ITEM, n: SEEN_COUNT - 1 })
        for (let i = 0; i < SEEN_COUNT; i++) await check({})
        expect(list('unlocked')).toEqual([ID])
    })

    it('drops a removal count that a lock inflated, the first time the item shows live', async () => {
        seed(['locked'], { ...STORED_ITEM, r: 40 })
        await check({ locked: true })
        expect(await checksUntilListed('removed', { removed: true, locked: true })).toBeGreaterThanOrEqual(
            MIN_CONFIRMATION,
        )
    })
})

describe('what a notification says', () => {
    const OLD_CREATED = CREATED - 5 * 24 * 60 * 60
    const comment = (name, created_utc, fields) => ({
        name,
        author: USER,
        body: 'text',
        created_utc,
        link_id: 't3_post',
        locked: false,
        ...fields,
    })
    const REMOVED_FIELDS = { author: '[deleted]', body: '[removed]' }
    const backlogRemoval = comment('t1_old', OLD_CREATED, REMOVED_FIELDS)
    const recentRemoval = comment('t1_removed', CREATED, REMOVED_FIELDS)
    const recentLock = comment('t1_locked', CREATED, { locked: true })
    const recentDeletion = comment('t1_deleted', CREATED, { author: '[deleted]', body: '[deleted]' })
    // First seen, so nothing waits for a confirmation
    const firstCheck = items => lookup(items, OTHER, SUBSCRIBED_FROM_NA, {})
    const notifiedIds = () => (__getLocalStorage().notification_log || []).map(entry => entry.itemIds)

    it('leaves out a backlog removal beside a recent lock', async () => {
        await firstCheck([backlogRemoval, recentLock])
        expect(announced()).toEqual(['1 new [locked] actions, click to view'])
        expect(list('removed', OTHER)).toEqual([backlogRemoval.name])
    })

    it('leaves out a backlog removal beside a recent deletion, which the same pass finds', async () => {
        await firstCheck([backlogRemoval, recentDeletion])
        expect(announced()).toEqual(['1 new [user deleted] actions, click to view'])
    })

    it('leaves out a backlog deletion beside a recent removal', async () => {
        await firstCheck([{ ...recentDeletion, created_utc: OLD_CREATED }, recentRemoval])
        expect(announced()).toEqual(['1 new [mod removed] actions, click to view'])
    })

    it('leaves out a backlog approval beside a recent removal', async () => {
        seed(['removed'], { ...STORED_ITEM, n: SEEN_COUNT - 1 }, OTHER)
        await firstCheck([comment(ID, OLD_CREATED), recentRemoval])
        expect(list('approved', OTHER)).toEqual([ID])
        expect(announced()).toEqual(['1 new [mod removed] actions, click to view'])
    })

    it('names and counts recent changes of both tracks', async () => {
        await firstCheck([recentRemoval, recentLock])
        expect(announced()).toEqual(['2 new [mod removed, locked] actions, click to view'])
        expect(notifiedIds()).toEqual([[recentRemoval.name, recentLock.name]])
    })

    it('does not count a lock whose notifications are off', async () => {
        resetStorage({ notifyLock: false })
        await firstCheck([recentRemoval, recentLock])
        expect(announced()).toEqual(['1 new [mod removed] actions, click to view'])
        expect(notifiedIds()).toEqual([[recentRemoval.name]])
    })

    it('does not count a removal whose notifications are off', async () => {
        resetStorage({ notifyRemoval: false })
        await firstCheck([recentRemoval, recentLock])
        expect(announced()).toEqual(['1 new [locked] actions, click to view'])
        expect(notifiedIds()).toEqual([[recentLock.name]])
    })

    it('stays quiet when the only recent change is one whose notifications are off', async () => {
        resetStorage({ notifyLock: false })
        await firstCheck([backlogRemoval, recentLock])
        expect(announced()).toEqual([])
        expect(list('locked', OTHER)).toEqual([recentLock.name])
    })

    it('calls a lock on a deleted comment a lock', async () => {
        await firstCheck([{ ...recentDeletion, locked: true }])
        expect(announced()).toEqual(['2 new [user deleted, locked] actions, click to view'])
        expect(__getSyncStorage()[keysOf(OTHER).changes].map(change => change.g)).toEqual([DELETED, LOCKED])
    })

    it('stays quiet about the backlog alone', async () => {
        await firstCheck([backlogRemoval, comment('t1_oldlock', OLD_CREATED, { locked: true })])
        expect(announced()).toEqual([])
    })
})

describe('each track compared with the other switched off', () => {
    const TRACKS = { removal: ['removed', 'approved'], lock: ['locked', 'unlocked'] }
    const CHANGE_TYPES = { removal: [REMOVED, APPROVED], lock: [LOCKED, UNLOCKED] }

    // Repeatable runs of each state, some shorter and some longer than any count
    const generator = seed => () => (seed = (seed * 48271) % 2147483647) / 2147483647
    const runs = (next, length) => {
        const states = []
        for (let state = next() < 0.5; states.length < length; state = !state) {
            states.push(...Array(1 + Math.floor(next() * 2 * MAX_CONFIRMATION)).fill(state))
        }
        return states.slice(0, length)
    }

    const trackState = (track, thing) => {
        const sync = __getSyncStorage()
        const keys = keysOf(thing)
        return {
            lists: TRACKS[track].map(name => sync[keys[name]]),
            changes: sync[keys.changes].filter(change => CHANGE_TYPES[track].includes(change.g)).map(c => [c.g, c.n]),
        }
    }
    const run = async (observations, thing, tracksOn) => {
        resetStorage(tracksOn)
        const states = []
        for (const observation of observations) {
            await check(observation, thing)
            states.push({ removal: trackState('removal', thing), lock: trackState('lock', thing) })
        }
        return states
    }
    const trail = (states, track) => states.map(state => state[track])

    it.each([USER, OTHER])('holds for repeatable histories of %s', async thing => {
        for (let history = 1; history <= 12; history++) {
            const next = generator(history)
            const length = 8 * MAX_CONFIRMATION
            const removedStates = runs(next, length)
            const lockedStates = runs(next, length)
            const observations = removedStates.map((removed, i) => ({ removed, locked: lockedStates[i] }))

            const both = await run(observations, thing, { removal: true, lock: true })
            const removalAlone = await run(observations, thing, { removal: true, lock: false })
            const lockAlone = await run(observations, thing, { removal: false, lock: true })

            expect(trail(both, 'removal')).toEqual(trail(removalAlone, 'removal'))
            expect(trail(both, 'lock')).toEqual(trail(lockAlone, 'lock'))
        }
    })
})
