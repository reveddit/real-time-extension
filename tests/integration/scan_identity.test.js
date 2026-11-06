// Firefox runs one background for every window and container, so a scan from a
// private window or a container tab would read as the default container's login
// (reddit.md). The real listener, as built for Firefox.

// Install chrome global BEFORE any source import
import '../mocks/chrome-api.js'

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import browserMock, { __resetStorage, __getSyncStorage } from '../mocks/webextension-polyfill.js'
import { cookie, fill, cookiesApi } from '../mocks/cookies.js'

const listeners = []
const event = () => ({ addListener() {}, removeListener() {}, hasListener: () => false })

beforeAll(async () => {
    globalThis.__BUILT_FOR__ = 'firefox'
    globalThis.__STORE__ = 'firefox'
    const c = globalThis.chrome
    for (const name of ['onMessageExternal', 'onInstalled', 'onStartup', 'onUpdateAvailable']) c.runtime[name] = event()
    c.runtime.onMessage = { addListener: fn => listeners.push(fn) }
    c.runtime.getManifest = () => ({ version: '0.0.5.30' })
    for (const name of ['onUpdated', 'onRemoved', 'onActivated']) c.tabs[name] = event()
    c.alarms.onAlarm = event()
    c.alarms.get = (name, callback) => callback?.(null)
    c.alarms.getAll = callback => callback?.([])
    c.cookies = { onChanged: event(), getAll: (query, callback) => callback([]), get: (query, callback) => callback(null) }
    c.extension = { inIncognitoContext: false }
    for (const name of ['onClicked', 'onClosed', 'onButtonClicked']) c.notifications[name] = event()
    c.action.onClicked = event()
    c.action.setBadgeTextColor = () => {}
    c.contextMenus.removeAll = callback => callback?.()
    c.storage.onChanged = event()
    browserMock.cookies = cookiesApi
    browserMock.storage.onChanged = event()
    browserMock.webRequest = { onBeforeSendHeaders: event(), onHeadersReceived: event() }
    browserMock.runtime = { ...browserMock.runtime, onInstalled: event() }
    await import('../../src/background.ts')
})

const send = sender =>
    new Promise(resolve => {
        for (const listener of listeners) {
            if (listener({ action: 'fetch-with-login', path: '/r/x/comments/abc/.rss' }, sender, resolve)) return
        }
    })
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
    const lookup = () =>
        new Promise(resolve => {
            for (const listener of listeners) {
                if (listener({ action: 'get-reddit-items-by-id', ids: ['t1_a'] }, tab(), resolve)) return
            }
        })
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
