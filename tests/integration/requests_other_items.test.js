// Followed ("other") items are read from the user's own logged-in /api/info.
// For a moderator, removals in subreddits they moderate come back with the
// text intact and only the moderation flags set (verified on r/pushshift
// 2026-10-17), so monitoring's isRemovedItem must read the flags.

// Install chrome global BEFORE any source import
import '../mocks/chrome-api.js'

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import browserMock, { __resetStorage, __getLocalStorage, __getSyncStorage } from '../mocks/webextension-polyfill.js'
import { json, res } from '../mocks/responses.js'
import { cookiesApi, fill } from '../mocks/cookies.js'

import { lookupItemsByID } from '../../src/src/requests'
import { isRemovedItem } from '../../src/src/common'
import { setCurrentStateForId } from '../../src/src/monitoring'
import { getObjectNamesForThing } from '../../src/src/storage'
import { getAuth, NO_AUTH } from '../../src/src/reddit-auth'
import { isCapabilityResting } from '../../src/src/request-gates'
import { CAPABILITY_REST_KEY } from '../../src/src/news'

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
        globalThis.fetch = vi.fn(async () => json(200, { data: { children } }))
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
        globalThis.fetch = vi.fn(async () => json(200, { data: { children } }))
        await setCurrentStateForId('t1_liveit', 'https://www.reddit.com/r/x/comments/abc/_/liveit/')
        expect(__getLocalStorage().items_other.t1_liveit.t).toBe('still readable')
        expect(__getSyncStorage()[getObjectNamesForThing('other', false).approved].t1_liveit).toBeDefined()
    })
})

// The optional custom client id reads followed items with an OAuth token, and
// reddit starts turning unregistered apps away on 2027-01-12. When the token or
// its read fails, the login reads them, as without the option, and a refusal
// rests the client id instead of meeting another at every check.
describe('followed items with a custom client id', () => {
    const TOKEN = 'https://www.reddit.com/api/v1/access_token'
    const TOKEN_READ = 'https://oauth.reddit.com/api/info?id=t1_follow1&raw_json=1'
    const LOGIN_READ = 'https://www.reddit.com/api/info.json?id=t1_follow1&raw_json=1'
    const listing = () => json(200, { data: { children: [child('t1_follow1', { removed: true })] } })
    // reddit's answers to the token request, the token's read and the login's read
    const reddit = ({ token = () => json(200, { access_token: 't' }), tokenRead = listing }) =>
        (globalThis.fetch = vi.fn(async url => {
            url = String(url)
            if (url === TOKEN) return token()
            return url.startsWith('https://oauth.reddit.com/') ? tokenRead() : listing()
        }))
    const urls = () => globalThis.fetch.mock.calls.map(([url]) => String(url))
    const check = async () => (await lookupItemsByID(['t1_follow1'], await getAuth())).map(c => c.data.name)

    beforeEach(() => {
        __resetStorage({ options: { custom_clientid: 'mine' } })
        // the token's read sets the cookie that opts in to quarantined content
        fill([])
        browserMock.cookies = cookiesApi
    })
    afterEach(() => {
        delete browserMock.cookies
    })

    it("reads them with the login in the same check when reddit refuses the token's read, then rests it", async () => {
        reddit({ tokenRead: () => res(403, 'Forbidden') })
        expect(await check()).toEqual(['t1_follow1'])
        expect(urls()).toEqual([TOKEN, TOKEN_READ, LOGIN_READ])
        expect(await isCapabilityResting('oauth')).toBe(true)
        // the next check asks for no token
        globalThis.fetch.mockClear()
        expect(await check()).toEqual(['t1_follow1'])
        expect(urls()).toEqual([LOGIN_READ])
    })

    it('rests it when reddit refuses the token, and the login reads them', async () => {
        reddit({ token: () => res(401, 'Unauthorized') })
        expect(await getAuth()).toBe(NO_AUTH)
        expect(await isCapabilityResting('oauth')).toBe(true)
        globalThis.fetch.mockClear()
        expect(await check()).toEqual(['t1_follow1'])
        expect(urls()).toEqual([LOGIN_READ])
    })

    it("reads them with the login when the token's read meets an outage, which rests nothing", async () => {
        reddit({ tokenRead: () => res(500, '') })
        expect(await check()).toEqual(['t1_follow1'])
        expect(urls()).toEqual([TOKEN, TOKEN_READ, LOGIN_READ])
        expect(await isCapabilityResting('oauth')).toBe(false)
    })

    it("reads them with the login when the token's read fails before it's sent", async () => {
        // its cookie step throws, here for want of a cookies API
        delete browserMock.cookies
        reddit({})
        expect(await check()).toEqual(['t1_follow1'])
        expect(urls()).toEqual([TOKEN, LOGIN_READ])
    })

    it('ends the rest once a read with the token works again', async () => {
        __getLocalStorage()[CAPABILITY_REST_KEY] = { oauth: { refusals: 2, until: Date.now() - 1000, since: 1 } }
        reddit({})
        expect(await check()).toEqual(['t1_follow1'])
        expect(urls()).toEqual([TOKEN, TOKEN_READ])
        expect(__getLocalStorage()[CAPABILITY_REST_KEY].oauth).toBeUndefined()
    })
})
