// Firefox runs one background for every window and container, so a scan from a
// private window or a container tab would read as the default container's login
// (reddit.md). The real listener, as built for Firefox.

// Install chrome global BEFORE any source import
import '../mocks/chrome-api.js'

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { __resetStorage, __getSyncStorage } from '../mocks/webextension-polyfill.js'
import { cookie, fill } from '../mocks/cookies.js'
import { loadBackground } from '../mocks/background.js'

let background

beforeAll(async () => {
    background = await loadBackground()
})

const send = sender => background.send({ action: 'fetch-with-login', path: '/r/x/comments/abc/.rss' }, sender)
const tab = extra => ({ tab: { id: 7, url: 'https://www.reddit.com/r/x/comments/abc/t/', ...extra } })

beforeEach(() => {
    __resetStorage()
    fill([cookie('reddit_session', 'S1')])
    vi.stubGlobal(
        'fetch',
        vi.fn(async () => new Response('<feed/>', { status: 200 })),
    )
})

describe('a scan in Firefox', () => {
    it('goes ahead from a regular window', async () => {
        expect(await send(tab({ cookieStoreId: 'firefox-default' }))).toMatchObject({ ok: true })
        expect(fetch).toHaveBeenCalledTimes(1)
    })

    it('is refused from a private window or a container tab, before anything is sent', async () => {
        for (const extra of [{ incognito: true }, { cookieStoreId: 'firefox-container-3' }]) {
            expect(await send(tab(extra))).toEqual({ ok: false, status: 0, otherIdentity: true })
        }
        expect(fetch).not.toHaveBeenCalled()
    })
})

describe("a content script's item lookup", () => {
    const lookup = () => background.send({ action: 'get-reddit-items-by-id', ids: ['t1_a'] }, tab())
    const urls = () => fetch.mock.calls.map(([url]) => String(url))

    beforeEach(() => {
        const answer = JSON.stringify({ access_token: 't', data: { children: [] } })
        fetch.mockImplementation(async () => new Response(answer, { status: 200 }))
    })

    it('reads with the login and asks for no token with no client id, even with no options stored', async () => {
        expect(await lookup()).toEqual({ response: 'done', items: [] })
        expect(urls()).toEqual(['https://www.reddit.com/api/info.json?id=t1_a&raw_json=1'])
    })

    it('reads through the API with a token with a client id', async () => {
        __getSyncStorage().options = { custom_clientid: 'mine' }
        expect(await lookup()).toEqual({ response: 'done', items: [] })
        expect(urls()).toEqual([
            'https://www.reddit.com/api/v1/access_token',
            'https://oauth.reddit.com/api/info?id=t1_a&raw_json=1',
        ])
    })
})
