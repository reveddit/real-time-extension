// The popup's follow switch as a person uses it: the real popup.tsx over a fake
// DOM. A follow's first check can take as long as a read does, and the switch
// shows what's followed, so it can't wait for that.

import { describe, it, expect, vi } from 'vitest'
import { parseHTML } from 'linkedom'

const POST_URL = 'https://www.reddit.com/r/pics/comments/abc123/a_title/'

describe('the follow switch', () => {
    it("shows the follow at once, whether or not reddit's read ever answers", async () => {
        vi.resetModules()
        const { document, window } = parseHTML('<html><head></head><body><div id="root"></div></body></html>')
        // What react and emotion look for when they load
        document.oninput = null
        vi.stubGlobal('document', document)
        vi.stubGlobal('window', window)
        vi.stubGlobal('HTMLElement', window.HTMLElement)
        vi.stubGlobal('navigator', { userAgent: '' })
        vi.stubGlobal('__LATEST_RELEASE__', null)
        vi.stubGlobal('fetch', () => new Promise(() => {}))
        // Fresh modules, so chrome and browser share the storage the page reads
        await import('../mocks/chrome-api.js')
        const { __resetStorage, __getSyncStorage } = await import('../mocks/webextension-polyfill.js')
        const options = { removal_status: { track: true }, lock_status: { track: true } }
        __resetStorage({ options, user_subscriptions: {}, other_subscriptions: {} })
        chrome.storage.onChanged = { addListener() {}, removeListener() {} }
        chrome.tabs.query = (query, callback) => callback(query.active ? [{ url: POST_URL }] : [])
        await import('../../src/src/popup.tsx')
        const text = () => document.body.textContent
        await vi.waitFor(() => expect(text()).toContain('subscribe to post'))

        const label = Array.from(document.querySelectorAll('span')).find(el => el.textContent === 'subscribe to post')
        label.click()

        await vi.waitFor(() => expect(text()).toContain('subscribed to post'))
        expect(Object.keys(__getSyncStorage().other_subscriptions)).toEqual(['t3_abc123'])
    })
})
