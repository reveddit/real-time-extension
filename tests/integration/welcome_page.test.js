// The welcome page as a person sees it: the real welcome.tsx over a fake DOM.
// It asks the background who's logged in, whose reads carry the background's
// request headers.

// Install chrome global BEFORE any source import
import '../mocks/chrome-api.js'

import { describe, it, expect, vi } from 'vitest'
import { openPage } from '../mocks/extension-page.js'

describe('the welcome page', () => {
    it('subscribes the user the background names, starts their first check and goes to history', async () => {
        const sent = []
        const { document, window, __getSyncStorage } = await openPage(
            async () => {
                globalThis.window.location = { href: '' }
                vi.stubGlobal('fetch', vi.fn())
                const { default: browser } = await import('../mocks/webextension-polyfill.js')
                browser.runtime.sendMessage = async message =>
                    message.action === 'get-logged-in-user' ? { user: 'alice', indeterminate: false } : undefined
                chrome.runtime.sendMessage = message => sent.push(message)
                return import('../../src/src/welcome.tsx')
            },
            { user_subscriptions: {}, other_subscriptions: {} },
        )
        await vi.waitFor(() => expect(document.body.textContent).toContain('Connected as alice! Redirecting...'))
        expect(__getSyncStorage().user_subscriptions).toEqual({ alice: true })
        expect(sent).toEqual([{ action: 'immediate-user-lookup', user: 'alice' }])
        const history = 'chrome-extension://fakeidsrc/history.html?welcome=1'
        await vi.waitFor(() => expect(window.location.href).toBe(history), { timeout: 2000 })
        expect(fetch).not.toHaveBeenCalled()
    })
})
