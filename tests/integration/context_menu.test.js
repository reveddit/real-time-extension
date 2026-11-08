// The "reveddit subscribe" link menu, which runs in the background: a service
// worker on Chrome and Edge, where alert doesn't exist, and a background page
// on Firefox, which shows no alert.

// Install chrome global BEFORE any source import
import '../mocks/chrome-api.js'

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { __resetStorage, __getSyncStorage } from '../mocks/webextension-polyfill.js'
import { setupContextualMenu } from '../../src/src/contextMenus'
import { setCurrentStateForId } from '../../src/src/monitoring'

vi.mock('../../src/src/monitoring', () => ({ setCurrentStateForId: vi.fn() }))

describe('the link menu', () => {
    let rightClick

    beforeEach(() => {
        __resetStorage({ other_subscriptions: {} })
        vi.spyOn(chrome.notifications, 'create')
        chrome.contextMenus.removeAll = callback => callback()
        vi.spyOn(chrome.contextMenus.onClicked, 'addListener').mockImplementation(listener => {
            rightClick = linkUrl => listener({ menuItemId: 'reveddit-subscribe', linkUrl })
        })
        setupContextualMenu()
    })

    it('says so in a notification when the link is no comment, post or user', () => {
        const url = 'https://www.reddit.com/r/pics/comments/?sort=new'
        rightClick(url)
        expect(chrome.notifications.create).toHaveBeenCalledTimes(1)
        expect(chrome.notifications.create.mock.calls[0][1].message).toContain(url)
        // The id the background knows only to close (background_clicks.test.js)
        expect(chrome.notifications.create.mock.calls[0][0]).toMatch(/^reveddit:subscribe_failed\|/)
    })

    it('follows a post from a link that ends at its id or has only a query after it', async () => {
        rightClick('https://www.reddit.com/r/pics/comments/abc123')
        rightClick('https://www.reddit.com/r/pics/comments/def456?utm_source=share')
        await vi.waitFor(() =>
            expect(Object.keys(__getSyncStorage().other_subscriptions).sort()).toEqual(['t3_abc123', 't3_def456']),
        )
        expect(setCurrentStateForId).toHaveBeenCalledTimes(2)
        expect(chrome.notifications.create).not.toHaveBeenCalled()
    })
})
