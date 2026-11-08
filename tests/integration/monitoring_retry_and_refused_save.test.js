// Paths in checkForChanges_thing_byId that no test pinned: the retry of a
// pending notification on a cycle with no new changes, the log line left when
// the browser refuses the cycle's sync save (issue #15), and a save that follows
// a lookup long enough for the user to have acted.

// Install chrome global BEFORE any source import
import '../mocks/chrome-api.js'

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import browserMock, { __resetStorage, __getSyncStorage, __getLocalStorage } from '../mocks/webextension-polyfill.js'

import { _checkForChanges_thing_byId } from '../../src/src/monitoring'
import { getObjectNamesForThing, markThingAsSeen, unsubscribeId } from '../../src/src/storage'
import { getDiagTiers, clearDiagLog } from '../../src/src/diaglog'

const USER = 'someuser'
const keys = getObjectNamesForThing(USER, true)
const ID = 't1_livecomm'
const NOW = Math.floor(Date.now() / 1000)
const item = {
    name: ID,
    author: USER,
    body: 'my comment',
    created_utc: NOW - 600,
    link_id: 't3_1abcdefxxxxxx',
    locked: false,
}
const OPTIONS = {
    seen_count: 2,
    interval: 1,
    removal_status: { track: true, notify: true },
    lock_status: { track: true, notify: true },
}
const MIN_RETRY_DELAY_MS = 2 * 60 * 1000

const seed = (options = OPTIONS) =>
    __resetStorage({
        options,
        user_subscriptions: { [USER]: true },
        other_subscriptions: {},
        [keys.removed]: {},
        [keys.approved]: {},
        [keys.locked]: {},
        [keys.unlocked]: {},
        [keys.changes]: [],
    })

// A cycle in which the one comment is live and nothing changes
const quietCycle = async () => {
    await _checkForChanges_thing_byId([ID], USER, true, null, structuredClone(__getSyncStorage()), 2, { [ID]: item }, [
        { data: { ...item } },
    ])
    for (let i = 0; i < 5; i++) await new Promise(r => setTimeout(r, 0))
}

const pendingFor = (overrides = {}) => ({
    thing: USER,
    count: 2,
    types: ['mod removed', 'locked'],
    itemIds: ['t1_a', 't1_b'],
    firstAttemptAt: Date.now() - MIN_RETRY_DELAY_MS - 1000,
    attempts: 1,
    ...overrides,
})
const setPending = pending =>
    __resetStorage(__getSyncStorage(), pending ? { pending_notifications: { [USER]: pending } } : {})
const pendingNow = () => (__getLocalStorage().pending_notifications || {})[USER]
const log = () => __getLocalStorage().notification_log || []

describe('retry of a pending notification', () => {
    let created
    let realCreate
    beforeEach(() => {
        seed()
        created = []
        realCreate = chrome.notifications.create
        chrome.notifications.create = (id, options, cb) => {
            created.push(options.message)
            cb(id)
        }
    })
    afterEach(() => {
        chrome.notifications.create = realCreate
    })

    it('shows it again, counts the attempt and logs it as a retry; success clears the entry', async () => {
        setPending(pendingFor())
        await quietCycle()
        expect(created).toEqual(['2 new [mod removed, locked] actions, click to view'])
        expect(log()).toHaveLength(1)
        expect(log()[0]).toMatchObject({
            id: USER,
            title: USER,
            message: '2 new [mod removed, locked] actions, click to view',
            itemIds: ['t1_a', 't1_b'],
            source: 'retry',
        })
        expect(pendingNow()).toBeUndefined()
    })

    it('keeps the entry, one attempt higher, when the notification fails to show', async () => {
        chrome.notifications.create = (id, options, cb) => {
            created.push(options.message)
            chrome.runtime.lastError = { message: 'no' }
            try {
                cb(id)
            } finally {
                chrome.runtime.lastError = null
            }
        }
        setPending(pendingFor({ attempts: 3 }))
        await quietCycle()
        expect(created).toHaveLength(1)
        expect(pendingNow()).toMatchObject({ attempts: 4, count: 2, itemIds: ['t1_a', 't1_b'] })
        expect(log()[0].source).toBe('retry')
    })

    it('gives up after 5 attempts', async () => {
        setPending(pendingFor({ attempts: 5 }))
        await quietCycle()
        expect(created).toEqual([])
        expect(log()).toEqual([])
        expect(pendingNow().attempts).toBe(5)
    })

    it('waits two minutes from the first attempt', async () => {
        setPending(pendingFor({ firstAttemptAt: Date.now() - MIN_RETRY_DELAY_MS + 30000 }))
        await quietCycle()
        expect(created).toEqual([])
        expect(log()).toEqual([])
        expect(pendingNow().attempts).toBe(1)
    })

    it('drops the entry without a notification once both kinds are turned off', async () => {
        seed({
            ...OPTIONS,
            removal_status: { track: true, notify: false },
            lock_status: { track: true, notify: false },
        })
        setPending(pendingFor())
        await quietCycle()
        expect(created).toEqual([])
        expect(log()).toEqual([])
        expect(pendingNow()).toBeUndefined()
    })

    it('does nothing without an entry', async () => {
        setPending(null)
        await quietCycle()
        expect(created).toEqual([])
        expect(log()).toEqual([])
    })
})

describe('a refused sync save', () => {
    let realSet
    beforeEach(async () => {
        await clearDiagLog()
        seed()
        realSet = chrome.storage.sync.set
    })
    afterEach(() => {
        chrome.storage.sync.set = realSet
    })

    const diagLines = async () => {
        const { summary, details } = await getDiagTiers()
        return [...summary, ...details].map(entry => entry.m)
    }

    it('logs the message and each list with its size, then goes on to the badge and local items', async () => {
        chrome.storage.sync.set = (items, callback) => {
            chrome.runtime.lastError = { message: 'QUOTA_BYTES_PER_ITEM quota exceeded' }
            try {
                if (callback) callback()
            } finally {
                chrome.runtime.lastError = null
            }
            return Promise.resolve()
        }
        await quietCycle()
        const refused = (await diagLines()).filter(line => line.includes('sync save refused'))
        expect(refused).toHaveLength(1)
        expect(refused[0]).toMatch(/^\[reveddit\] sync save refused \(QUOTA_BYTES_PER_ITEM quota exceeded\): /)
        expect(refused[0]).toContain(
            ': removed_u_someuser 20, approved_u_someuser 84, locked_u_someuser 19, unlocked_u_someuser 84, changes_u_someuser 20',
        )
        // The local copy is still written
        expect(__getLocalStorage()['items_u_' + USER]).toMatchObject({ [ID]: { t: 'my comment' } })
    })

    it('logs nothing when the save goes through', async () => {
        await quietCycle()
        expect((await diagLines()).filter(line => line.includes('sync save refused'))).toEqual([])
    })
})

describe('the end of a check', () => {
    it('waits for the sync save and then the local copy', async () => {
        seed()
        const realSet = chrome.storage.sync.set
        chrome.storage.sync.set = (items, callback) => {
            setTimeout(() => realSet(items, callback), 1)
        }
        try {
            await _checkForChanges_thing_byId([ID], USER, true, null, structuredClone(__getSyncStorage()), 2, { [ID]: item }, [
                { data: { ...item } },
            ])
        } finally {
            chrome.storage.sync.set = realSet
        }
        expect(__getSyncStorage()[keys.approved][ID]).toBeDefined()
        expect(__getLocalStorage()['items_u_' + USER]).toMatchObject({ [ID]: { t: 'my comment' } })
    })
})

describe('a save after the user acted during the lookup', () => {
    const other = getObjectNamesForThing('other', false)
    const followed = { ...item, name: 't1_followed', author: 'someone' }
    const SEEN = { c: NOW - 600, u: false }
    const UNSEEN = { c: NOW - 600, u: true }

    // A check whose storage was read before the user acted, as every check's is
    const checkFrom = (copy, thing, isUser, view, itemLookup = {}) =>
        _checkForChanges_thing_byId([view.name], thing, isUser, null, copy, 2, itemLookup, [{ data: { ...view } }])
    const checkOfUser = copy => checkFrom(copy, USER, true, item, { [ID]: item })
    const unfollow = () => new Promise(resolve => unsubscribeId(followed.name, resolve))

    beforeEach(() => seed())

    it('keeps a mark of seen on every list', async () => {
        const sync = __getSyncStorage()
        Object.assign(sync, {
            [keys.approved]: { [ID]: { ...UNSEEN } },
            [keys.unlocked]: { [ID]: { ...UNSEEN } },
            [keys.removed]: { t1_gone: { ...UNSEEN } },
            [keys.locked]: { t1_shut: { ...UNSEEN } },
        })
        const copy = structuredClone(sync)
        markThingAsSeen(sync, USER, true)
        await checkOfUser(copy)
        expect(sync[keys.approved][ID].u).toBe(false)
        expect(sync[keys.unlocked][ID].u).toBe(false)
        expect(sync[keys.removed].t1_gone.u).toBe(false)
        expect(sync[keys.locked].t1_shut.u).toBe(false)
    })

    it('leaves a mark it finds no newer one for as it was', async () => {
        const sync = __getSyncStorage()
        sync[keys.approved] = { [ID]: { ...UNSEEN } }
        await checkOfUser(structuredClone(sync))
        expect(sync[keys.approved][ID].u).toBe(true)
    })

    it('keeps out an item unfollowed since, and what it found about it', async () => {
        const sync = __getSyncStorage()
        sync.other_subscriptions = { [followed.name]: { t: 1 } }
        Object.assign(sync, {
            [other.removed]: { [followed.name]: { ...UNSEEN } },
            [other.approved]: {},
            [other.locked]: {},
            [other.unlocked]: { [followed.name]: { ...SEEN } },
            [other.changes]: [],
        })
        const copy = structuredClone(sync)
        await unfollow()
        await checkFrom(copy, 'other', false, followed)
        for (const list of [other.removed, other.approved, other.locked, other.unlocked]) {
            expect(sync[list]).toEqual({})
        }
    })

    it('keeps out an unfollowed item this check would have moved to another list', async () => {
        const sync = __getSyncStorage()
        sync.other_subscriptions = { [followed.name]: { t: 1 } }
        Object.assign(sync, {
            [other.removed]: { [followed.name]: { ...UNSEEN } },
            [other.approved]: {},
            [other.locked]: {},
            [other.unlocked]: {},
            [other.changes]: [],
        })
        // One more sighting as live moves it from removed to approved
        __getLocalStorage().items_other = { [followed.name]: { t: 'words', o: 1, c: 1, n: 1, r: 0 } }
        const copy = structuredClone(sync)
        await unfollow()
        await checkFrom(copy, 'other', false, followed)
        expect(sync[other.approved]).toEqual({})
    })

    it('tells of a new change to an item marked seen on the list it left', async () => {
        const sync = __getSyncStorage()
        sync[keys.removed] = { [ID]: { ...UNSEEN } }
        __getLocalStorage()['items_u_' + USER] = { [ID]: { t: 'words', o: 1, c: 1, n: 1, r: 0 } }
        const copy = structuredClone(sync)
        markThingAsSeen(sync, USER, true)
        await checkOfUser(copy)
        expect(sync[keys.removed][ID]).toBeUndefined()
        expect(sync[keys.approved][ID].u).toBe(true)
    })

    it('keeps what this check found, on no list until now', async () => {
        const sync = __getSyncStorage()
        await checkOfUser(structuredClone(sync))
        expect(sync[keys.approved][ID]).toBeDefined()
        expect(sync[keys.unlocked][ID]).toBeDefined()
    })

    it('saves its copy as it stands when the lists can no longer be read', async () => {
        const sync = __getSyncStorage()
        sync[keys.approved] = { [ID]: { ...UNSEEN } }
        const copy = structuredClone(sync)
        vi.spyOn(browserMock.storage.sync, 'get').mockRejectedValue(new Error('unreadable'))
        await checkOfUser(copy)
        expect(sync[keys.approved][ID]).toBeDefined()
        expect(sync[keys.unlocked][ID]).toBeDefined()
    })
})
