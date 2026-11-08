// The user's items whose removal monitoring tells its lookup it's confirming:
// counted as removed at least once, not recorded yet, and still recordable.
// The lookup reads their pages again rather than reuse a cached removal, and a
// read that decides nothing is cached as 'unknown', paced like any other.

// Install chrome global BEFORE any source import
import '../mocks/chrome-api.js'

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import browserMock, { __resetStorage, __getSyncStorage, __getLocalStorage } from '../mocks/webextension-polyfill.js'

import { _checkForChanges_thing_byId } from '../../src/src/monitoring'
import { lookupItemsByID_fromPublicProfile } from '../../src/src/requests'
import { getObjectNamesForThing, getOldestDateKey, getPublicLiveKey } from '../../src/src/storage'
import { installFetch, thingIdEl, emptyStatePage, FRONT_PAGE } from '../mocks/public-profile.js'

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
        return typeof answer === 'function' ? answer(message) : answer
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

const check = (names, items = Object.fromEntries(names.map(name => [name, item(name)]))) =>
    _checkForChanges_thing_byId(names, USER, true, null, structuredClone(__getSyncStorage()), 2, items)

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

    it('come from a read of the records before the lookup, which the check reads again after it', async () => {
        seed({ records: { t1_a: record(1) } })
        // Its result held back, so there's nothing to save either
        answer = { items: [] }
        const get = vi.spyOn(browserMock.storage.local, 'get')
        await check(['t1_a'])
        expect(confirming()).toEqual({ t1_a: true })
        expect(get.mock.calls.filter(([keys]) => 'items_u_' + USER in Object(keys))).toHaveLength(2)
    })

    it('are counted from the records as an overlapping check saved them', async () => {
        seed({ records: { t1_a: record(4) } })
        const answers = []
        answer = () => new Promise(resolve => answers.push(resolve))
        const first = check(['t1_a'])
        const second = check(['t1_a'])
        await vi.waitFor(() => expect(answers).toHaveLength(2))
        // The first reads it live, which starts its count over, and the second reads it removed
        answers[0]({ items: [{ data: item('t1_a') }] })
        await first
        answers[1]({ items: [{ data: { ...item('t1_a'), author: '[deleted]', body: '[removed]' } }] })
        await second
        expect(__getSyncStorage()[keys.removed]).toEqual({})
        expect(__getSyncStorage()[keys.changes]).toEqual([])
        expect(__getLocalStorage()['items_u_' + USER].t1_a.r).toBe(1)
    })

    it.each([
        ['while removals go untracked', { track: false }, null],
        ['for a pending post, whose lookup is done', {}, [{ data: item('t1_a') }]],
    ])('need nothing read before the lookup %s', async (_, options, preFetched) => {
        seed({ records: { t1_a: record(0) }, ...options })
        answer = { items: [{ data: item('t1_a') }] }
        const get = vi.spyOn(browserMock.storage.local, 'get')
        const storage = structuredClone(__getSyncStorage())
        await _checkForChanges_thing_byId(['t1_a'], USER, true, null, storage, 2, { t1_a: item('t1_a') }, preFetched)
        // Once each, after the lookup
        const reads = key => get.mock.calls.filter(([keys]) => key in Object(keys)).length
        expect(reads('items_u_' + USER)).toBe(1)
        expect(reads(getOldestDateKey(USER, true))).toBe(1)
    })
})

describe('a post more than two days old whose removal is counted', () => {
    const POST = 't3_mature1'
    const OLD = NOW - 5 * 86400
    const post = { name: POST, author: USER, title: 'words', created_utc: OLD, locked: false }

    it("keeps its count while its page decides nothing, and the bridge isn't told it's live", async () => {
        seed({ records: { [POST]: { ...record(1), o: OLD, c: OLD } } })
        // Its page read it held a cycle ago
        __getLocalStorage().www_post_page_verdicts = { [POST]: { v: 'held', t: Date.now(), k: 2 } }
        const calls = installFetch([
            [`/user/${USER}/comments/?sort=new`, emptyStatePage('comments')],
            [`/user/${USER}/submitted/?sort=new`, thingIdEl(POST)],
            ['/comments/mature1/', FRONT_PAGE],
        ])
        const pageReads = []
        answer = message => lookupItemsByID_fromPublicProfile(message.ids, message.username, message.authItemsMeta)
        // A read that decides nothing, then a cycle that waits it out
        for (let cycle = 0; cycle < 2; cycle++) {
            await check([POST], { [POST]: post })
            expect(confirming()).toEqual({ [POST]: true })
            expect(__getLocalStorage()['items_u_' + USER][POST].r).toBe(1)
            pageReads.push(calls.filter(url => url.includes('/comments/mature1/')).length)
        }
        // The second cycle sends no page read
        expect(pageReads[0]).toBeGreaterThan(0)
        expect(pageReads[1]).toBe(pageReads[0])
        expect(__getLocalStorage()[getPublicLiveKey(USER)]).toBeUndefined()
    })
})
