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
    __resetStorage({
        options: {},
        user_subscriptions: {
            someuser: true,
            test: true,
            subscribe_failed: true,
            backlog_summary: true,
            foo_backlog: true,
        },
        other_subscriptions: {},
        removed_u_foo_backlog: { t1_x: { c: 1700000000, u: true } },
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
    ])('on %s only closes it', async (_, id) => {
        background.clickNotification(id)
        await settle()
        expect(chrome.notifications.clear).toHaveBeenCalledWith(id)
        expect(browserMock.storage.sync.set).not.toHaveBeenCalled()
        expect(chrome.tabs.create).not.toHaveBeenCalled()
    })

    // An account's notification is named for it, whatever its name is
    it.each(['someuser', 'test', 'subscribe_failed', 'backlog_summary', 'foo_backlog'])(
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

    it('on the digest of older removals opens history filtered to them', async () => {
        background.clickNotification('reveddit:backlog_summary|1700000000000')
        await settle()
        expect(chrome.tabs.create).toHaveBeenCalledWith(
            expect.objectContaining({ url: chrome.runtime.getURL('src/history.html?filter=removed') }),
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
