// Followed items (other people's posts and comments the user tracks) were
// read 100 at a time through api/info.json, which reddit refuses since
// 2026-10-24. While it rests, each is read through its thread's JSON.

// Install chrome global BEFORE any source import
import '../mocks/chrome-api.js'

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import browserMock, {
    __resetStorage,
    __getLocalStorage,
    __getSyncStorage,
} from '../mocks/webextension-polyfill.js'
import { json as jsonResponse } from '../mocks/responses.js'
import { lookupItemsByID } from '../../src/src/requests'
import { CAPABILITY_REST_KEY } from '../../src/src/news'
import { isCapabilityResting } from '../../src/src/request-gates'
import { _followedTiming } from '../../src/src/followed-lookup'
import { _loggedInFetchState } from '../../src/src/logged-in-fetch'
import { useLegacyStub } from '../mocks/public-profile.js'

useLegacyStub()

describe('followed items while api/info is refused', () => {
    const COMMENT = 't1_folc1'
    const COMMENT2 = 't1_folc2'
    const NOPOST = 't1_folc3'
    const POSTF = 't3_folp1'
    const json = (status, data, type) => ({ ...jsonResponse(status, data, type), text: async () => JSON.stringify(data) })
    const blockPage = () => json(403, null, 'text/html; charset=utf-8')
    const thread = (post, comment) => [
        { kind: 'Listing', data: { children: [{ kind: 't3', data: post }] } },
        { kind: 'Listing', data: { children: comment ? [{ kind: 't1', data: comment }] : [] } },
    ]
    let calls
    const serve = ({ apiInfo }) => {
        calls = []
        globalThis.fetch = async url => {
            const u = String(url)
            calls.push(u)
            if (u.includes('/api/info.json')) return apiInfo()
            if (u.includes(`/comments/p1/_/folc1.json`))
                return json(200, thread({ name: 't3_p1' }, { name: COMMENT, author: '[deleted]', body: '[removed]' }))
            if (u.includes(`/comments/p2/_/folc2.json`))
                return json(200, thread({ name: 't3_p2' }, { name: COMMENT2, author: 'someone', body: 'still here' }))
            if (u.includes(`/comments/folp1.json`))
                return json(
                    200,
                    thread({ name: POSTF, author: 'someone', is_robot_indexable: false, selftext: '[removed]' }),
                )
            throw new Error(`unexpected url: ${u}`)
        }
    }
    const lookupFollowed = ids => lookupItemsByID(ids, 'none', false, '', {})
    // The followed list (storage.sync), which the rotation's maps are pruned to
    const following = ids => Object.fromEntries(ids.map(id => [id, { t: 1 }]))
    const savedCookies = browserMock.cookies
    let loggedIn
    beforeEach(() => {
        __resetStorage(
            { other_subscriptions: following([COMMENT, COMMENT2, POSTF, NOPOST]) },
            { followed_post_ids: { [COMMENT]: 'p1', [COMMENT2]: 'p2' } },
        )
        _followedTiming.delayMs = 0
        _loggedInFetchState.preferredCacheMode = 0
        _loggedInFetchState.doubleBlockUntil = 0
        loggedIn = true
        browserMock.cookies = { get: async ({ name }) => (loggedIn ? { name, value: 'x' } : null) }
    })
    afterEach(() => {
        _followedTiming.delayMs = 700
        browserMock.cookies = savedCookies
    })

    it('a block page rests api/info and reads each followed item through its thread instead', async () => {
        serve({ apiInfo: blockPage })
        const results = await lookupFollowed([COMMENT, COMMENT2, POSTF, NOPOST])
        const byId = Object.fromEntries(results.map(r => [r.data.name, r.data]))
        expect(byId[COMMENT].body).toBe('[removed]')
        expect(byId[COMMENT2].body).toBe('still here')
        expect(byId[POSTF].is_robot_indexable).toBe(false)
        // a comment with no known post can't be read this way: no news, no false removal
        expect(byId[NOPOST]).toBeUndefined()
        expect(await isCapabilityResting('api_info')).toBe(true)

        // the next cycle doesn't ask api/info while it rests
        calls.length = 0
        await lookupFollowed([COMMENT, COMMENT2, POSTF])
        expect(calls.some(u => u.includes('/api/info.json'))).toBe(false)
    })

    it('reads a few per cycle, the ones read longest ago first', async () => {
        serve({ apiInfo: blockPage })
        const ids = [COMMENT, COMMENT2, POSTF]
        const many = Array.from({ length: 8 }, (_, i) => `t3_x${i}`)
        __getSyncStorage().other_subscriptions = following([...ids, ...many])
        globalThis.fetch = (orig => async url => {
            const m = String(url).match(/comments\/(x\d)\.json/)
            if (m) return json(200, thread({ name: `t3_${m[1]}`, author: 'someone' }))
            return orig(url)
        })(globalThis.fetch)
        const first = await lookupFollowed([...ids, ...many])
        expect(first).toHaveLength(5)
        const second = await lookupFollowed([...ids, ...many])
        const firstIds = new Set(first.map(r => r.data.name))
        expect(second.some(r => firstIds.has(r.data.name))).toBe(false)
    })

    it("follows from before 0.0.5.27 are read through the post their cached item names (its fullname)", async () => {
        const OLD = 't1_oldc1'
        __getSyncStorage().other_subscriptions = following([OLD])
        __getLocalStorage().items_other = { [OLD]: { p: 't3_pold1' } }
        serve({ apiInfo: blockPage })
        globalThis.fetch = (orig => async url => {
            if (String(url).includes('/comments/pold1/_/oldc1.json'))
                return json(200, thread({ name: 't3_pold1' }, { name: OLD, author: '[deleted]', body: '[removed]' }))
            return orig(url)
        })(globalThis.fetch)
        const results = await lookupFollowed([OLD])
        expect(results.map(r => r.data.name)).toEqual([OLD])
        expect(calls.some(u => u.includes('t3_'))).toBe(false)
        // copied over, so the next cycle needn't read the item cache
        expect(__getLocalStorage().followed_post_ids[OLD]).toBe('pold1')
    })

    it('a follow (one id) leaves the rotation of the others alone', async () => {
        serve({ apiInfo: blockPage })
        const many = Array.from({ length: 10 }, (_, i) => `t3_x${i}`)
        __getSyncStorage().other_subscriptions = following([...many, 't3_new1'])
        globalThis.fetch = (orig => async url => {
            const m = String(url).match(/comments\/(x\d|new1)\.json/)
            if (m) return json(200, thread({ name: `t3_${m[1]}`, author: 'someone' }))
            return orig(url)
        })(globalThis.fetch)
        const first = await lookupFollowed(many)
        await lookupFollowed(['t3_new1'])
        const second = await lookupFollowed(many)
        const firstIds = new Set(first.map(r => r.data.name))
        expect(second.some(r => firstIds.has(r.data.name))).toBe(false)
        expect(Object.keys(__getLocalStorage().followed_checked_at)).toContain('t3_new1')
    })

    it('reads nothing without a reddit login, and rests the thread reads after a block page in both modes', async () => {
        serve({ apiInfo: blockPage })
        loggedIn = false
        expect(await lookupFollowed([COMMENT, COMMENT2])).toEqual([])
        expect(calls.filter(u => !u.includes('/api/info.json'))).toEqual([])

        loggedIn = true
        globalThis.fetch = async url => {
            calls.push(String(url))
            return blockPage()
        }
        // api/info's block page in both modes skips the retry for a while: a
        // block page in one mode stops this cycle's reads but rests nothing
        calls.length = 0
        expect(await lookupFollowed([COMMENT, COMMENT2, POSTF])).toEqual([])
        expect(calls).toHaveLength(1)
        expect(await isCapabilityResting('thread_json')).toBe(false)

        _loggedInFetchState.doubleBlockUntil = 0
        calls.length = 0
        expect(await lookupFollowed([COMMENT, COMMENT2, POSTF])).toEqual([])
        // the first read's two cache modes, then the batch stops
        expect(calls).toHaveLength(2)
        expect(await isCapabilityResting('thread_json')).toBe(true)
        calls.length = 0
        expect(await lookupFollowed([COMMENT, COMMENT2, POSTF])).toEqual([])
        expect(calls).toEqual([])
    })

    it("leaves out a followed comment whose author blocked the user: [unavailable] isn't a removal", async () => {
        serve({ apiInfo: blockPage })
        globalThis.fetch = (orig => async url => {
            if (String(url).includes('/comments/p1/_/folc1.json'))
                return json(200, thread({ name: 't3_p1' }, { name: COMMENT, author: '[unavailable]', body: '[unavailable]' }))
            return orig(url)
        })(globalThis.fetch)
        const results = await lookupFollowed([COMMENT, COMMENT2])
        expect(results.map(r => r.data.name)).toEqual([COMMENT2])
    })

    it('once the rest runs out and api/info answers again, the rest ends', async () => {
        serve({ apiInfo: blockPage })
        await lookupFollowed([COMMENT])
        __getLocalStorage()[CAPABILITY_REST_KEY].api_info.until = Date.now() - 1000
        serve({
            apiInfo: () =>
                json(200, { data: { children: [{ kind: 't1', data: { name: COMMENT, body: 'x', author: 'a' } }] } }),
        })
        const results = await lookupFollowed([COMMENT])
        expect(results.map(r => r.data.name)).toEqual([COMMENT])
        expect(await isCapabilityResting('api_info')).toBe(false)
        expect(__getLocalStorage()[CAPABILITY_REST_KEY].api_info).toBeUndefined()
    })
})
