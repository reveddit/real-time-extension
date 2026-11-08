// The welcome page as a person sees it: the real welcome.tsx over a fake DOM.
// It polls the background's Connect, whose reads carry the background's request
// headers, and which subscribes the user and starts their first check itself
// (background_clicks.test.js).

// Install chrome global BEFORE any source import
import '../mocks/chrome-api.js'

import { describe, it, expect, vi } from 'vitest'
import { openPage } from '../mocks/extension-page.js'

describe('the welcome page', () => {
    it('asks the background to connect, quietly, and goes to history once it has', async () => {
        const sent = []
        const { document, window, __getSyncStorage } = await openPage(
            async () => {
                globalThis.window.location = { href: '' }
                vi.stubGlobal('fetch', vi.fn())
                const { default: browser } = await import('../mocks/webextension-polyfill.js')
                browser.runtime.sendMessage = async message => {
                    sent.push(message)
                    return message.action === 'try-reconnect' ? { success: true, user: 'alice' } : undefined
                }
                chrome.runtime.sendMessage = message => sent.push(message)
                return import('../../src/src/welcome.tsx')
            },
            { user_subscriptions: {}, other_subscriptions: {} },
        )
        await vi.waitFor(() => expect(document.body.textContent).toContain('Connected as alice! Redirecting...'))
        const history = 'chrome-extension://fakeidsrc/history.html?welcome=1'
        await vi.waitFor(() => expect(window.location.href).toBe(history), { timeout: 2000 })
        expect(sent).toEqual([{ action: 'try-reconnect', quiet: true }])
        expect(__getSyncStorage().user_subscriptions).toEqual({})
        expect(fetch).not.toHaveBeenCalled()
    })
})
