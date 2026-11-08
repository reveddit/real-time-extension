// Monitoring doesn't keep track of the user's items older than the oldest one a
// full listing of theirs showed. Followed items have no such listing, so every
// one is tracked, however old.

// Install chrome global BEFORE any source import
import '../mocks/chrome-api.js'

import { describe, it, expect, beforeEach, vi } from 'vitest'
import browserMock, { __resetStorage, __getSyncStorage, __getLocalStorage } from '../mocks/webextension-polyfill.js'
import { _checkForChanges_thing_byId } from '../../src/src/monitoring'
import { getObjectNamesForThing, getOldestDateKey } from '../../src/src/storage'

const SUBSCRIBED_FROM_REVEDDIT = 1
const SUBSCRIBED_FROM_NA = 2
const NOW = Math.floor(Date.now() / 1000)
const comment = (name, created_utc, fields) => ({
    name,
    author: 'someone',
    body: 'words',
    created_utc,
    link_id: 't3_post',
    locked: false,
    ...fields,
})
const REMOVED = { author: '[deleted]', body: '[removed]' }
const other = getObjectNamesForThing('other', false)

// A full listing's worth of followed comments, and one far older that's removed
const followed = Array.from({ length: 99 }, (_, i) => comment(`t1_f${i}`, NOW - 3600 - i))
const OLDEST_FOLLOWED = NOW - 3600 - 98
const old = comment('t1_old', OLDEST_FOLLOWED - 30 * 86400, REMOVED)

beforeEach(() => {
    __resetStorage(
        {
            options: {
                seen_count: 2,
                removal_status: { track: true, notify: true },
                lock_status: { track: true, notify: true },
            },
            user_subscriptions: {},
            other_subscriptions: Object.fromEntries([...followed, old].map(({ name }) => [name, { t: 1 }])),
            ...Object.fromEntries(Object.values(other).map(key => [key, key.startsWith('changes') ? [] : {}])),
        },
        // What a full check of the follows stored before
        { [getOldestDateKey('other', false)]: OLDEST_FOLLOWED },
    )
})

const checkFollowed = (items, subscribedFrom = SUBSCRIBED_FROM_NA) =>
    _checkForChanges_thing_byId(
        items.map(item => item.name),
        'other',
        false,
        null,
        structuredClone(__getSyncStorage()),
        subscribedFrom,
        {},
        items.map(item => ({ data: { ...item } })),
    )

describe('a followed item', () => {
    it('is recorded removed, however old it is', async () => {
        for (let i = 0; i < 6; i++) await checkFollowed([old])
        expect(__getSyncStorage()[other.removed]).toMatchObject({ [old.name]: { u: true } })
    })

    it('followed from a reveddit page, already removed, is recorded seen, so no later check tells of it', async () => {
        const notify = vi.spyOn(chrome.notifications, 'create')
        await checkFollowed([old], SUBSCRIBED_FROM_REVEDDIT)
        expect(__getSyncStorage()[other.removed]).toMatchObject({ [old.name]: { u: false } })
        for (let i = 0; i < 6; i++) await checkFollowed([...followed, old])
        expect(__getSyncStorage()[other.removed]).toMatchObject({ [old.name]: { u: false } })
        expect(__getSyncStorage()[other.changes]).toEqual([])
        expect(notify).not.toHaveBeenCalled()
    })
})

describe("the user's full listing", () => {
    const USER = 'someuser'
    const keys = getObjectNamesForThing(USER, true)
    const listing = Array.from({ length: 100 }, (_, i) => comment(`t1_u${i}`, NOW - 3600 - i, { author: USER }))

    it('stores its oldest date once while it stays the same', async () => {
        __resetStorage({
            options: {
                seen_count: 2,
                removal_status: { track: true, notify: true },
                lock_status: { track: true, notify: true },
            },
            user_subscriptions: { [USER]: true },
            other_subscriptions: {},
            ...Object.fromEntries(Object.values(keys).map(key => [key, key.startsWith('changes') ? [] : {}])),
        })
        const set = vi.spyOn(browserMock.storage.local, 'set')
        for (let i = 0; i < 2; i++) {
            await _checkForChanges_thing_byId(
                listing.map(item => item.name),
                USER,
                true,
                null,
                structuredClone(__getSyncStorage()),
                SUBSCRIBED_FROM_NA,
                Object.fromEntries(listing.map(item => [item.name, item])),
                listing.map(item => ({ data: { ...item } })),
            )
        }
        const key = getOldestDateKey(USER, true)
        expect(set.mock.calls.filter(([items]) => key in items)).toHaveLength(1)
        expect(__getLocalStorage()[key]).toBe(NOW - 3600 - 99)
    })
})
