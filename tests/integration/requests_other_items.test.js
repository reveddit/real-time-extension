// Followed ("other") items are read from the user's own logged-in /api/info.
// For a moderator, removals in subreddits they moderate come back with the
// text intact and only the moderation flags set (verified on r/pushshift
// 2026-10-17), so monitoring's isRemovedItem must read the flags.

// Install chrome global BEFORE any source import
import '../mocks/chrome-api.js'

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { __resetStorage, __getLocalStorage, __getSyncStorage } from '../mocks/webextension-polyfill.js'

import { lookupItemsByID } from '../../src/src/requests'
import { isRemovedItem } from '../../src/src/common'
import { setCurrentStateForId } from '../../src/src/monitoring'
import { getObjectNamesForThing } from '../../src/src/storage'

const child = (name, data) => ({
    kind: name.slice(0, 2),
    data: { name, author: 'someone', body: 'still readable', created_utc: 1, removal_reason: null, ...data },
})

describe("followed items in a moderator's view", () => {
    beforeEach(() => __resetStorage())

    it('reads removals the moderator can still read as removed, keeping their text', async () => {
        const children = [
            child('t1_modrm1', { removed: true, banned_by: 'a_mod' }),
            child('t1_spam11', { removed: false, spam: true, banned_by: true }),
            child('t3_modrm2', { removed: true, banned_by: 'a_mod', is_robot_indexable: true }),
            child('t1_live11', { removed: false, spam: false, banned_by: null, approved_by: 'a_mod' }),
        ]
        globalThis.fetch = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ data: { children } }) }))
        const result = await lookupItemsByID(
            children.map(c => c.data.name),
            'none',
        )
        // the user's own logged-in view, which is why the flags appear
        const [url, init] = globalThis.fetch.mock.calls[0]
        expect(url).toContain('https://www.reddit.com/api/info.json?id=t1_modrm1,')
        expect(init.credentials).toBe('include')
        expect(Object.fromEntries(result.map(c => [c.data.name, isRemovedItem(c.data)]))).toEqual({
            t1_modrm1: true,
            t1_spam11: true,
            t3_modrm2: true,
            t1_live11: false,
        })
        // the text comes through, for the history page to keep
        expect(result[0].data.body).toBe('still readable')
    })
})

describe('the first check of an item just followed', () => {
    it('settles once the item is saved, so what the page knows can be added to its record', async () => {
        const options = { removal_status: { track: true }, lock_status: { track: true } }
        __resetStorage({ options, user_subscriptions: {}, other_subscriptions: { t1_liveit: { t: 1 } } })
        const children = [child('t1_liveit', { removed: false, link_id: 't3_abc' })]
        globalThis.fetch = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ data: { children } }) }))
        await setCurrentStateForId('t1_liveit', 'https://www.reddit.com/r/x/comments/abc/_/liveit/')
        expect(__getLocalStorage().items_other.t1_liveit.t).toBe('still readable')
        expect(__getSyncStorage()[getObjectNamesForThing('other', false).approved].t1_liveit).toBeDefined()
    })
})
