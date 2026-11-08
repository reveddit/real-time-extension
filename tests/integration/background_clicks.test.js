// Clicks the background answers, as built for Firefox, whose background page
// has a window: on its notifications, and on the options link it puts on
// reddit's pages.

// Install chrome global BEFORE any source import
import '../mocks/chrome-api.js'

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import browserMock, { __resetStorage } from '../mocks/webextension-polyfill.js'
import { loadBackground } from '../mocks/background.js'

let background

beforeAll(async () => {
    background = await loadBackground()
})

beforeEach(() => {
    // Nothing a click starts goes out
    vi.stubGlobal('fetch', () => new Promise(() => {}))
    __resetStorage({ options: {}, user_subscriptions: { someuser: true }, other_subscriptions: {} })
    vi.spyOn(browserMock.storage.sync, 'set')
    vi.spyOn(chrome.tabs, 'create')
    vi.spyOn(chrome.notifications, 'clear')
})

// Long enough for the click's storage reads and tab opening to run
const settle = () => new Promise(resolve => setTimeout(resolve, 0))

describe('a notification click', () => {
    it.each([
        ["the note that a link couldn't be followed", 'subscribe_failed|1700000000000'],
        ["the popup's test notification", 'test|1700000000000'],
    ])('on %s only closes it', async (_, id) => {
        background.clickNotification(id)
        await settle()
        expect(chrome.notifications.clear).toHaveBeenCalledWith(id)
        expect(browserMock.storage.sync.set).not.toHaveBeenCalled()
        expect(chrome.tabs.create).not.toHaveBeenCalled()
    })

    it("on a followed account's opens its history", async () => {
        background.clickNotification('someuser|1700000000000')
        await settle()
        expect(chrome.tabs.create).toHaveBeenCalledWith(
            expect.objectContaining({ url: chrome.runtime.getURL('src/history.html') }),
        )
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
