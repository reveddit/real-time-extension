// How monitoring reads one lookup result. Quarantined, NSFW and
// private-community items never show logged out, so the public-view
// comparison can't judge them: a removal already recorded must stay recorded
// instead of reading as approved, and a post's own author view still says
// when it was removed, and when that removal ends.

// Install chrome global BEFORE any source import
import '../mocks/chrome-api.js'

import { describe, it, expect, beforeEach } from 'vitest'
import { __resetStorage, __getSyncStorage, __getLocalStorage } from '../mocks/webextension-polyfill.js'
import { readLookupResult, _checkForChanges_thing_byId } from '../../src/src/monitoring.ts'
import { getObjectNamesForThing, getUnseenIDs_thing, getPublicLiveKey } from '../../src/src/storage.ts'

// The lookup's synthetic removed shape (requests.ts syntheticRemoved)
const synthetic = name => ({
    name,
    author: '[deleted]',
    body: '[removed]',
    is_robot_indexable: false,
    _public_view: true,
})
const liveComment = name => ({ name, author: 'me', body: 'text', _public_view: true })
// A recorded removal's entry, and one recorded while the author view showed it
const KNOWN = { c: 1, u: false }
const KNOWN_FROM_AUTHOR_VIEW = { c: 1, u: false, a: 1 }

describe('readLookupResult', () => {
    it('counts what nobody logged out can see as approved, but leaves a recorded removal as it is', () => {
        for (const flags of [{ over_18: true }, { quarantine: true }, { subreddit_type: 'private' }]) {
            const authItem = { name: 't1_a', ...flags }
            expect(readLookupResult(synthetic('t1_a'), authItem, undefined)).toBe('unchecked')
            expect(readLookupResult(synthetic('t1_a'), authItem, KNOWN)).toBe('skip')
        }
    })

    it("a post's own author view says it was removed, whoever else can see it", () => {
        const authItem = { name: 't3_p', over_18: true, removed_by_category: 'moderator' }
        expect(readLookupResult(synthetic('t3_p'), authItem, undefined)).toBe('removed')
        expect(readLookupResult(synthetic('t3_p'), authItem, KNOWN)).toBe('removed')
    })

    it('a removal the author view showed ends when that view stops showing it', () => {
        const authItem = { name: 't3_p', over_18: true, is_robot_indexable: false }
        expect(readLookupResult(synthetic('t3_p'), authItem, KNOWN_FROM_AUTHOR_VIEW)).toBe('unchecked')
        // recorded some other way, it stays until it can be checked
        expect(readLookupResult(synthetic('t3_p'), authItem, KNOWN)).toBe('skip')
    })

    it('is_robot_indexable alone does not make an NSFW post removed', () => {
        const authItem = { name: 't3_p', over_18: true, is_robot_indexable: false }
        expect(readLookupResult(synthetic('t3_p'), authItem, undefined)).toBe('unchecked')
        expect(readLookupResult(synthetic('t3_p'), authItem, KNOWN)).toBe('skip')
    })

    it('a comment has no author-side removal signal', () => {
        const authItem = { name: 't1_a', over_18: true, removed_by_category: 'moderator' }
        expect(readLookupResult(synthetic('t1_a'), authItem, KNOWN)).toBe('skip')
    })

    it('reads publicly visible results by their shape', () => {
        const authItem = { name: 't1_a', subreddit_type: 'restricted' }
        expect(readLookupResult(synthetic('t1_a'), authItem, undefined)).toBe('removed')
        expect(readLookupResult(liveComment('t1_a'), authItem, KNOWN)).toBe('approved')
    })

    it('reads results the legacy paths returned as they are, since those can see this content', () => {
        const legacy = { ...synthetic('t1_a'), _public_view: undefined }
        expect(readLookupResult(legacy, { name: 't1_a', over_18: true }, undefined)).toBe('removed')
        // followed items have no author view
        expect(readLookupResult(synthetic('t1_a'), null, undefined)).toBe('removed')
    })
})

describe('lookup results through whole checks', () => {
    const USER = 'someuser'
    const keys = getObjectNamesForThing(USER, true)
    const CREATED = Math.floor(Date.now() / 1000) - 600
    const SUBSCRIBED_FROM_NA = 2

    beforeEach(() => {
        __resetStorage({
            options: {
                seen_count: 2,
                interval: 1,
                removal_status: { track: true, notify: true },
                lock_status: { track: true, notify: true },
            },
            user_subscriptions: { [USER]: true },
            other_subscriptions: {},
            [keys.removed]: {},
            [keys.approved]: {},
            [keys.locked]: {},
            [keys.unlocked]: {},
            [keys.changes]: [],
        })
    })

    // One check of the author's items, given the lookup's results; storage is
    // read fresh, as each cycle does
    const check = async (authItem, result) => {
        await _checkForChanges_thing_byId(
            [authItem.name],
            USER,
            true,
            null,
            structuredClone(__getSyncStorage()),
            SUBSCRIBED_FROM_NA,
            { [authItem.name]: authItem },
            [],
            [{ data: { ...result } }],
        )
        for (let i = 0; i < 5; i++) await new Promise(r => setTimeout(r, 0))
    }
    const announced = () => (__getLocalStorage().notification_log || []).map(entry => entry.message)
    const publiclyLive = () => __getLocalStorage()[getPublicLiveKey(USER)]?.ids || []
    const nsfwComment = name => ({
        name,
        author: USER,
        body: 'text',
        created_utc: CREATED,
        link_id: 't3_post',
        over_18: true,
        locked: false,
    })

    it('leaves a recorded removal of what nobody logged out can see as it is: not approved, announced or live', async () => {
        __getSyncStorage()[keys.removed] = { t1_nsfw: { c: CREATED, u: false, p: 't3_post' } }
        for (let i = 0; i < 4; i++) await check(nsfwComment('t1_nsfw'), synthetic('t1_nsfw'))
        expect(__getSyncStorage()[keys.removed].t1_nsfw).toBeDefined()
        expect(__getSyncStorage()[keys.approved].t1_nsfw).toBeUndefined()
        expect(announced()).toEqual([])
        expect(publiclyLive()).not.toContain('t1_nsfw')
    })

    it('counts what nobody logged out can see as approved, without an announcement or a live mark', async () => {
        await check(nsfwComment('t1_nsfw'), synthetic('t1_nsfw'))
        expect(__getSyncStorage()[keys.approved].t1_nsfw).toBeDefined()
        expect(__getSyncStorage()[keys.removed].t1_nsfw).toBeUndefined()
        expect(announced()).toEqual([])
        expect(publiclyLive()).not.toContain('t1_nsfw')
    })

    it("records an NSFW post's removal from its author view, and its approval when that view clears", async () => {
        const ID = 't3_nsfwpost'
        const post = removed_by_category => ({
            name: ID,
            author: USER,
            title: 'a title',
            created_utc: CREATED,
            over_18: true,
            locked: false,
            is_robot_indexable: false,
            removed_by_category,
        })
        const removedList = () => __getSyncStorage()[keys.removed]
        await check(post(null), synthetic(ID))

        for (let i = 0; i < 5 && !removedList()[ID]; i++) await check(post('moderator'), synthetic(ID))
        expect(removedList()[ID]).toMatchObject({ a: 1 })
        expect(announced()).toEqual(['1 new [mod removed] actions, click to view'])

        // A moderator approves it: its author view stops showing the removal
        for (let i = 0; i < 4 && removedList()[ID]; i++) await check(post(null), synthetic(ID))
        expect(removedList()[ID]).toBeUndefined()
        expect(announced()).toEqual([
            '1 new [mod removed] actions, click to view',
            '1 new [approved] actions, click to view',
        ])

        // The approval stays unseen on later checks, until it's viewed
        await check(post(null), synthetic(ID))
        await check(post(null), synthetic(ID))
        expect(__getSyncStorage()[keys.approved][ID].u).toBe(true)
        expect(getUnseenIDs_thing(USER, true, __getSyncStorage())).toContain(ID)
    })
})
