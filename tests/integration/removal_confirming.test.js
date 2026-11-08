// The user's items whose removal monitoring tells its lookup it's confirming:
// counted as removed at least once, not recorded yet, and still recordable.
// The lookup reads their pages afresh every cycle until then.

// Install chrome global BEFORE any source import
import '../mocks/chrome-api.js'

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import browserMock, { __resetStorage, __getSyncStorage, __getLocalStorage } from '../mocks/webextension-polyfill.js'

import { _checkForChanges_thing_byId } from '../../src/src/monitoring'
import { getObjectNamesForThing, getOldestDateKey } from '../../src/src/storage'

const USER = 'someuser'
const keys = getObjectNamesForThing(USER, true)
const NOW = Math.floor(Date.now() / 1000)
const CREATED = NOW - 600
const item = name => ({ name, author: USER, body: 'words', created_utc: CREATED, link_id: 't3_1abcdefxxxxxx' })
// Its record, removal count r
const record = r => ({ t: 'words', o: CREATED, c: CREATED, n: 0, r })

const realSendMessage = browserMock.runtime.sendMessage
let lookups
let answer
beforeEach(() => {
    // From a page, the lookup goes through the background, which sees what it's told
    vi.stubGlobal('location', { protocol: 'https:' })
    lookups = []
    answer = undefined
    browserMock.runtime.sendMessage = async message => {
        if (message.action !== 'get-reddit-items-by-id') return undefined
        lookups.push(message)
        return answer
    }
})
afterEach(() => {
    browserMock.runtime.sendMessage = realSendMessage
})

const seed = ({ removed = {}, records = {}, oldest = null, track = true } = {}) =>
    __resetStorage(
        {
            options: { removal_status: { track, notify: true }, lock_status: { track: true, notify: true } },
            user_subscriptions: { [USER]: true },
            other_subscriptions: {},
            [keys.removed]: removed,
            [keys.approved]: {},
            [keys.locked]: {},
            [keys.unlocked]: {},
            [keys.changes]: [],
        },
        { ['items_u_' + USER]: records, ...(oldest && { [getOldestDateKey(USER, true)]: oldest }) },
    )

const check = names =>
    _checkForChanges_thing_byId(
        names,
        USER,
        true,
        null,
        structuredClone(__getSyncStorage()),
        2,
        Object.fromEntries(names.map(name => [name, item(name)])),
    )

// What the last lookup was told about each item
const confirming = () =>
    Object.fromEntries(Object.entries(lookups.at(-1).authItemsMeta).map(([id, m]) => [id, m.confirming]))

describe('the removals monitoring is confirming', () => {
    it('are of items counted as removed that it can still record', async () => {
        seed({ records: { t1_counted: record(2), t1_uncounted: record(0) } })
        await check(['t1_counted', 't1_uncounted', 't1_new'])
        expect(confirming()).toEqual({ t1_counted: true, t1_uncounted: false, t1_new: false })
    })

    it('leave out one already recorded, one too old to be recorded, and all while removals go untracked', async () => {
        seed({ removed: { t1_recorded: { c: CREATED, u: true } }, records: { t1_recorded: record(5) } })
        await check(['t1_recorded'])
        expect(confirming()).toEqual({ t1_recorded: false })

        seed({ records: { t1_old: record(1) }, oldest: CREATED + 60 })
        await check(['t1_old'])
        expect(confirming()).toEqual({ t1_old: false })

        seed({ records: { t1_counted: record(1) }, track: false })
        await check(['t1_counted'])
        expect(confirming()).toEqual({ t1_counted: false })
    })

    it('start with the check after the first that reads the item removed', async () => {
        seed({ records: { t1_a: record(0) } })
        answer = { items: [{ data: { ...item('t1_a'), author: '[deleted]', body: '[removed]' } }] }
        await check(['t1_a'])
        expect(confirming()).toEqual({ t1_a: false })
        expect(__getLocalStorage()['items_u_' + USER].t1_a.r).toBe(1)
        await check(['t1_a'])
        expect(confirming()).toEqual({ t1_a: true })
    })
})
