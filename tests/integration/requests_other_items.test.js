// Followed ("other") items are read from the user's own logged-in /api/info.
// For a moderator, removals in subreddits they moderate come back with the
// text intact and only the moderation flags set (verified on r/pushshift
// 2026-10-17), so monitoring's isRemovedItem must read the flags.

// Install chrome global BEFORE any source import
import '../mocks/chrome-api.js'

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { __resetStorage } from '../mocks/webextension-polyfill.js'

import { lookupItemsByID } from '../../src/src/requests'
import { isRemovedItem } from '../../src/src/common'

const child = (name, data) => ({
    kind: name.slice(0, 2),
    data: { name, author: 'someone', body: 'still readable', created_utc: 1, removal_reason: null, ...data },
})

describe("followed items in a moderator's view", () => {
    beforeEach(() => __resetStorage())
    afterEach(() => vi.restoreAllMocks())

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
