// Paths in checkForChanges_thing_byId that no test pinned: the retry of a
// pending notification on a cycle with no new changes, the log line left when
// the browser refuses the cycle's sync save (issue #15), and a save that follows
// a lookup long enough for the user, a reveddit page or another check to have
// saved.

// Install chrome global BEFORE any source import
import '../mocks/chrome-api.js'

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import browserMock, { __resetStorage, __getSyncStorage, __getLocalStorage } from '../mocks/webextension-polyfill.js'

import { _checkForChanges_thing_byId } from '../../src/src/monitoring'
import {
    getObjectNamesForThing,
    markThingAsSeen,
    markEverythingAsSeen,
    markIDsAsSeenIfSubscribed,
    unsubscribeId,
} from '../../src/src/storage'
import { clearDiagLog } from '../../src/src/diaglog'
import { getDiagEntries } from '../mocks/diag-entries.js'

const USER = 'someuser'
const keys = getObjectNamesForThing(USER, true)
const ID = 't1_livecomm'
const NOW = Math.floor(Date.now() / 1000)
const SEEN = { c: NOW - 600, u: false }
const UNSEEN = { c: NOW - 600, u: true }
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
    await _checkForChanges_thing_byId([ID], USER, true, structuredClone(__getSyncStorage()), 2, { [ID]: item }, [
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
// The entry's items as the check that told of them left them: unseen
const seedWithPendingItems = options => {
    seed(options)
    Object.assign(__getSyncStorage(), {
        [keys.removed]: { t1_a: { ...UNSEEN } },
        [keys.locked]: { t1_b: { ...UNSEEN } },
    })
}

describe('retry of a pending notification', () => {
    let created
    let realCreate
    beforeEach(() => {
        seedWithPendingItems()
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
        seedWithPendingItems({
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

    it.each([
        ['Mark all seen', () => markEverythingAsSeen()],
        [
            'a reveddit page showing them',
            () =>
                new Promise(resolve =>
                    markIDsAsSeenIfSubscribed(USER, true, { t1_a: NOW - 600 }, {}, { t1_b: NOW - 600 }, {}, resolve),
                ),
        ],
    ])('drops the entry without a notification once %s marked its items seen', async (_, markSeen) => {
        setPending(pendingFor())
        await markSeen()
        await quietCycle()
        expect(created).toEqual([])
        expect(log()).toEqual([])
        expect(pendingNow()).toBeUndefined()
    })

    it('still shows it while one of its items is unseen', async () => {
        __getSyncStorage()[keys.removed].t1_a = { ...SEEN }
        setPending(pendingFor())
        await quietCycle()
        expect(created).toEqual(['2 new [mod removed, locked] actions, click to view'])
    })

    // Followed items' check, of a comment that shows as it is
    const followedCheck = async view => {
        await _checkForChanges_thing_byId([ID], 'other', false, structuredClone(__getSyncStorage()), 2, {}, [
            { data: { ...item, ...view } },
        ])
        for (let i = 0; i < 5; i++) await new Promise(r => setTimeout(r, 0))
    }

    it("leaves an account named other's entry to that account", async () => {
        __resetStorage(__getSyncStorage(), { pending_notifications: { other: pendingFor({ thing: 'other' }) } })
        await followedCheck({})
        expect(created).toEqual([])
        expect(__getLocalStorage().pending_notifications.other.attempts).toBe(1)
    })

    it("keeps followed items' own entry, apart from an account named other's", async () => {
        const ids = []
        chrome.notifications.create = (id, options, cb) => {
            ids.push(id.split('|')[0])
            chrome.runtime.lastError = { message: 'no' }
            try {
                cb(id)
            } finally {
                chrome.runtime.lastError = null
            }
        }
        await followedCheck({ author: '[deleted]', body: '[removed]' })
        expect(ids).toEqual(['reveddit:followed'])
        expect(Object.keys(__getLocalStorage().pending_notifications)).toEqual(['reveddit:followed'])
    })

    it('does nothing without an entry', async () => {
        setPending(null)
        await quietCycle()
        expect(created).toEqual([])
        expect(log()).toEqual([])
    })
})

describe('a refused sync save', () => {
    beforeEach(async () => {
        await clearDiagLog()
        seed()
    })

    const diagLines = async () => (await getDiagEntries()).map(entry => entry.m)

    it('logs the message and each list with its size, then goes on to the badge and local items', async () => {
        vi.spyOn(browserMock.storage.sync, 'set').mockRejectedValue(new Error('QUOTA_BYTES_PER_ITEM quota exceeded'))
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
        const realSet = browserMock.storage.sync.set
        vi.spyOn(browserMock.storage.sync, 'set').mockImplementation(
            items => new Promise(resolve => setTimeout(() => resolve(realSet(items)), 1)),
        )
        await _checkForChanges_thing_byId(
            [ID],
            USER,
            true,
            structuredClone(__getSyncStorage()),
            2,
            { [ID]: item },
            [{ data: { ...item } }],
        )
        expect(__getSyncStorage()[keys.approved][ID]).toBeDefined()
        expect(__getLocalStorage()['items_u_' + USER]).toMatchObject({ [ID]: { t: 'my comment' } })
    })
})

describe('marking all seen while a check saves', () => {
    it('keeps the change the check told of, and options saved meanwhile', async () => {
        seed()
        const sync = __getSyncStorage()
        sync[keys.approved] = { [ID]: { c: NOW - 600, u: true } }
        const get = browserMock.storage.sync.get
        vi.spyOn(browserMock.storage.sync, 'get').mockImplementationOnce(async wanted => {
            const read = await get(wanted)
            Object.assign(sync, {
                [keys.changes]: [{ i: 't1_gone', g: 1, o: NOW }],
                options: { ...OPTIONS, seen_count: 3 },
            })
            return read
        })
        await markEverythingAsSeen()
        expect(sync[keys.approved][ID].u).toBe(false)
        expect(sync[keys.changes]).toHaveLength(1)
        expect(sync.options.seen_count).toBe(3)
    })
})

describe('a save after storage changed during the lookup', () => {
    const other = getObjectNamesForThing('other', false)
    const followed = { ...item, name: 't1_followed', author: 'someone' }

    // A check whose storage was read before the change, as every check's is
    const checkFrom = (copy, thing, isUser, view, itemLookup = {}) =>
        _checkForChanges_thing_byId([view.name], thing, isUser, copy, 2, itemLookup, [{ data: { ...view } }])
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

    it('keeps what a reveddit page marked seen meanwhile, so finding it removed later tells nothing', async () => {
        const sync = __getSyncStorage()
        const copy = structuredClone(sync)
        await new Promise(resolve => markIDsAsSeenIfSubscribed(USER, true, { t1_gone: NOW - 600 }, {}, {}, {}, resolve))
        await checkOfUser(copy)
        expect(sync[keys.removed].t1_gone).toEqual({ c: NOW - 600, u: false })
        const gone = { ...item, name: 't1_gone', author: '[deleted]', body: '[removed]' }
        await checkFrom(structuredClone(sync), USER, true, gone, { t1_gone: gone })
        expect(sync[keys.changes]).toEqual([])
        expect(sync[keys.removed].t1_gone.u).toBe(false)
    })

    it('keeps what a reveddit page marked seen while the check read its records', async () => {
        const sync = __getSyncStorage()
        sync[keys.removed] = { t1_gone: { ...UNSEEN } }
        const copy = structuredClone(sync)
        const get = browserMock.storage.local.get
        let marked = false
        vi.spyOn(browserMock.storage.local, 'get').mockImplementation(async items => {
            // As the check reads its records, not as its own save reads them again
            if (!marked && 'items_u_' + USER in Object(items)) {
                marked = true
                await new Promise(resolve =>
                    markIDsAsSeenIfSubscribed(USER, true, { t1_gone: NOW - 600 }, {}, {}, {}, resolve),
                )
            }
            return get(items)
        })
        await checkOfUser(copy)
        expect(marked).toBe(true)
        expect(sync[keys.removed].t1_gone.u).toBe(false)
    })

    it('keeps what another check saved meanwhile and the change it told of, in the copy the cycle goes on with too', async () => {
        const sync = __getSyncStorage()
        sync.other_subscriptions = { [followed.name]: { t: 1 } }
        Object.assign(sync, {
            [other.removed]: {},
            [other.approved]: {},
            [other.locked]: {},
            [other.unlocked]: {},
            [other.changes]: [],
        })
        const copy = structuredClone(sync)
        // Followed while this check's lookup ran, and found removed by its own first check
        const justFollowed = { ...followed, name: 't1_justfollowed', author: '[deleted]', body: '[removed]' }
        sync.other_subscriptions[justFollowed.name] = { t: 2 }
        await checkFrom(structuredClone(sync), 'other', false, justFollowed)
        await checkFrom(copy, 'other', false, followed)
        expect(sync[other.removed][justFollowed.name]).toMatchObject({ u: true })
        expect(sync[other.approved][followed.name]).toBeDefined()
        expect(sync[other.changes].map(change => change.i)).toEqual([justFollowed.name])
        // The cycle's later checks size their saves by it
        expect(copy[other.removed]).toEqual(sync[other.removed])
        expect(copy[other.changes]).toEqual(sync[other.changes])
    })

    it('keeps out an item followed and unfollowed during its first check, and tells nothing of it', async () => {
        const sync = __getSyncStorage()
        sync.other_subscriptions = { [followed.name]: { t: 1 } }
        Object.assign(sync, {
            [other.removed]: {},
            [other.approved]: {},
            [other.locked]: {},
            [other.unlocked]: {},
            [other.changes]: [],
        })
        const copy = structuredClone(sync)
        await unfollow()
        const notify = vi.spyOn(chrome.notifications, 'create')
        await checkFrom(copy, 'other', false, { ...followed, author: '[deleted]', body: '[removed]' })
        for (const list of [other.removed, other.approved, other.locked, other.unlocked]) {
            expect(sync[list]).toEqual({})
        }
        expect(sync[other.changes]).toEqual([])
        expect(notify).not.toHaveBeenCalled()
        expect(__getLocalStorage().items_other).toBeUndefined()
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
