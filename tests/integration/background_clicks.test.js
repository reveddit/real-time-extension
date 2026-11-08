// Clicks the background answers, as built for Firefox, whose background page
// has a window: on its notifications, on the options link it puts on reddit's
// pages, and the welcome page's check of the login. Also what an update clears.

// Install chrome global BEFORE any source import
import '../mocks/chrome-api.js'

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import browserMock, { __resetStorage, __getSyncStorage, __getLocalStorage } from '../mocks/webextension-polyfill.js'
import { loadBackground } from '../mocks/background.js'

let background

beforeAll(async () => {
    background = await loadBackground()
})

beforeEach(() => {
    __resetStorage({
        options: {},
        user_subscriptions: {
            someuser: true,
            test: true,
            subscribe_failed: true,
            backlog_summary: true,
            foo_backlog: true,
            other: true,
        },
        other_subscriptions: { t1_z: { t: 1 } },
        removed_u_foo_backlog: { t1_x: { c: 1700000000, u: true } },
        removed_u_other: { t1_y: { c: 1700000000, u: true } },
        removed_other: { t1_z: { c: 1700000000, u: true } },
    })
    vi.spyOn(browserMock.storage.sync, 'set')
    vi.spyOn(chrome.tabs, 'create')
    vi.spyOn(chrome.notifications, 'clear')
})

// Long enough for the click's storage reads and tab opening to run
const settle = () => new Promise(resolve => setTimeout(resolve, 0))

describe('a notification click', () => {
    it.each([
        ["the note that a link couldn't be followed", 'reveddit:subscribe_failed|1700000000000'],
        ["the popup's test notification", 'reveddit:test|1700000000000'],
        ["any other of the extension's own", 'reveddit:anything_new|1700000000000'],
    ])('on %s only closes it', async (_, id) => {
        background.clickNotification(id)
        await settle()
        expect(chrome.notifications.clear).toHaveBeenCalledWith(id)
        expect(browserMock.storage.sync.set).not.toHaveBeenCalled()
        expect(chrome.tabs.create).not.toHaveBeenCalled()
    })

    // An account's notification is named for it, whatever its name is
    it.each(['someuser', 'test', 'subscribe_failed', 'backlog_summary', 'foo_backlog', 'other'])(
        "on u/%s's opens its history",
        async user => {
            background.clickNotification(`${user}|1700000000000`)
            await settle()
            expect(chrome.tabs.create).toHaveBeenCalledWith(
                expect.objectContaining({ url: chrome.runtime.getURL('src/history.html') }),
            )
        },
    )

    it("on u/foo_backlog's marks that account's items seen", async () => {
        background.clickNotification('foo_backlog|1700000000000')
        await settle()
        const saved = browserMock.storage.sync.set.mock.calls.at(-1)?.[0]
        expect(saved?.removed_u_foo_backlog?.t1_x?.u).toBe(false)
    })

    it("on followed items' opens them and marks them seen, apart from u/other's", async () => {
        __getLocalStorage().pending_notifications = { 'reveddit:followed': {}, other: {} }
        background.clickNotification('reveddit:followed|1700000000000')
        await settle()
        expect(chrome.tabs.create).toHaveBeenCalledWith(
            expect.objectContaining({ url: 'https://www.reveddit.com/info?id=t1_z&removal_status=all' }),
        )
        expect(__getSyncStorage().removed_other.t1_z.u).toBe(false)
        expect(__getSyncStorage().removed_u_other.t1_y.u).toBe(true)
        expect(Object.keys(__getLocalStorage().pending_notifications)).toEqual(['other'])
    })

    it('keeps what a check saved after the click read storage', async () => {
        const get = chrome.storage.sync.get
        vi.spyOn(chrome.storage.sync, 'get').mockImplementationOnce((keys, callback) =>
            get(keys, read => {
                // A check of followed items finds a removal
                Object.assign(__getSyncStorage(), {
                    removed_other: { t1_z: { c: 1700000000, u: true }, t1_new: { c: 1700000000, u: true } },
                    changes_other: [{ i: 't1_new', g: 1, o: 1700000000 }],
                })
                callback(read)
            }),
        )
        __getSyncStorage().changes_other = []
        background.clickNotification('foo_backlog|1700000000000')
        await settle()
        expect(__getSyncStorage().removed_u_foo_backlog.t1_x.u).toBe(false)
        expect(Object.keys(__getSyncStorage().removed_other)).toEqual(['t1_z', 't1_new'])
        expect(__getSyncStorage().changes_other).toHaveLength(1)
    })

    it('on the digest of older removals opens history filtered to them', async () => {
        background.clickNotification('reveddit:backlog_summary|1700000000000')
        await settle()
        expect(chrome.tabs.create).toHaveBeenCalledWith(
            expect.objectContaining({ url: chrome.runtime.getURL('src/history.html?filter=removed') }),
        )
    })
})

describe("the welcome page's login check", () => {
    it("is the background's, which sends nothing while a second account signs in", async () => {
        const fetch = vi.spyOn(globalThis, 'fetch')
        __getLocalStorage().viewer_connect = { started: Date.now(), mainUser: 'someuser', main: [] }
        expect(await background.send({ action: 'get-logged-in-user' })).toEqual({
            user: null,
            indeterminate: true,
            reason: 'a second account is signing in',
        })
        delete __getLocalStorage().viewer_connect
        // No login cookie, so nobody, without asking reddit
        expect(await background.send({ action: 'get-logged-in-user' })).toEqual({ user: null, indeterminate: false })
        expect(fetch).not.toHaveBeenCalled()
    })
})

describe("the options link on reddit's pages", () => {
    it('opens the options page and leaves the background page open', async () => {
        const close = vi.fn()
        vi.stubGlobal('window', { close })
        chrome.runtime.openOptionsPage = vi.fn()
        expect(await background.send({ action: 'open-options' })).toEqual({ response: 'done' })
        expect(chrome.runtime.openOptionsPage).toHaveBeenCalledTimes(1)
        expect(close).not.toHaveBeenCalled()
    })
})

describe('an update', () => {
    it('drops what older versions kept under names it no longer reads', async () => {
        Object.assign(__getLocalStorage(), {
            oldest_date_other: 1700000000,
            pending_notifications: { other: { count: 1 }, someuser: { count: 1 } },
        })
        background.install({ reason: 'update', previousVersion: '0.0.5.29' })
        await settle()
        expect(__getLocalStorage()).not.toHaveProperty('oldest_date_other')
        expect(Object.keys(__getLocalStorage().pending_notifications)).toEqual(['someuser'])
    })
})
