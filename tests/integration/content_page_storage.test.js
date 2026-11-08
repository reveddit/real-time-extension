// What the content script writes to a page's own localStorage. The website reads
// it, and reddit.com can read what's written to its pages, so nothing goes there,
// and what older versions left there goes: it shouldn't learn the extension is
// installed.

import { describe, it, expect, vi } from 'vitest'

const REDDIT = 'https://www.reddit.com/r/pics/'
const OLD_REDDIT = 'https://old.reddit.com/r/pics/'
const REVEDDIT = 'https://www.reveddit.com/v/pics/'

const open = async (href, users, stored = {}) => {
    vi.resetModules()
    vi.doMock('../../src/src/content-reddit', () => ({ redditModifications: vi.fn() }))
    vi.doMock('../../src/src/content-revddit', () => ({ revdditModifications: vi.fn() }))
    const page = new Map(Object.entries(stored))
    const localStorage = {
        setItem: (key, value) => page.set(key, value),
        removeItem: key => page.delete(key),
    }
    vi.stubGlobal('window', { location: new URL(href), localStorage, addEventListener() {} })
    vi.stubGlobal('document', { readyState: 'complete' })
    // Fresh modules, so chrome and browser share the storage the script reads
    await import('../mocks/chrome-api.js')
    const { default: browser, __resetStorage } = await import('../mocks/webextension-polyfill.js')
    __resetStorage({ user_subscriptions: users, other_subscriptions: {}, options: {} })
    browser.runtime.onMessage = { addListener() {} }
    browser.runtime.getManifest = () => ({ version: '1.2.3' })
    await import('../../src/src/content.ts')
    return page
}

describe('a page the content script runs on', () => {
    it.each([[REDDIT], [OLD_REDDIT]])('leaves %s with nothing in its storage', async href => {
        expect([...(await open(href, {})).keys()]).toEqual([])
        expect([...(await open(href, { alice: true })).keys()]).toEqual([])
    })

    it.each([[REDDIT], [OLD_REDDIT]])('clears from %s what older versions left there, and only that', async href => {
        const left = {
            hasSeenLanguageModal: 'true',
            extensionSaysNoSubscriptions: 'true',
            hasNotifierExtension: 'true',
            notifierExtensionVersion: '0.0.5.20',
            reddit_own: 'kept',
        }
        expect(Object.fromEntries(await open(href, { alice: true }, left))).toEqual({ reddit_own: 'kept' })
    })

    it('tells the website the extension is there, and whether it has anyone to follow', async () => {
        const none = await open(REVEDDIT, {})
        expect(Object.fromEntries(none)).toEqual({
            hasNotifierExtension: 'true',
            notifierExtensionVersion: '1.2.3',
            extensionSaysNoSubscriptions: 'true',
        })
        const some = await open(REVEDDIT, { alice: true }, { extensionSaysNoSubscriptions: 'true' })
        expect(some.has('extensionSaysNoSubscriptions')).toBe(false)
    })
})
