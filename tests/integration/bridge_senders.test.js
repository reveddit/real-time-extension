// Only www.reveddit.com may use the bridge, which fetches with the user's
// reddit login: in Chrome and Edge through externally_connectable, in Firefox
// through the content script's relay. Every other name that serves the site
// redirects to www, so a page anywhere else on reveddit.com is an old deploy or
// someone else's site.

// Install chrome global BEFORE any source import
import '../mocks/chrome-api.js'

import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { loadBackground } from '../mocks/background.js'

// Answer every request at once, so the bridge reaches its own checks. Not
// loadBackground's fetch that never answers.
Object.defineProperty(globalThis, 'fetch', {
    configurable: true,
    get: () => async () => new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } }),
    set() {},
})
// Chrome's path, which loadBackground doesn't keep
const external = []
Object.defineProperty(chrome.runtime, 'onMessageExternal', {
    configurable: true,
    get: () => ({ addListener: fn => external.push(fn), removeListener() {}, hasListener: () => false }),
    set() {},
})
const fromPageInChrome = (message, url) =>
    new Promise(resolve => external.forEach(listener => listener(message, { url }, resolve)))

const BRIDGE = { action: 'bridge-fetch', url: 'https://www.reddit.com/user/spez/about/.json' }
const WWW_PAGE = 'https://www.reveddit.com/v/spez/'
const OTHER_PAGES = [
    'https://dev.reveddit.com/v/spez/',
    'https://reveddit.com/v/spez/',
    'https://any-name.reveddit.com/',
    'https://www.reveddit.com.example.net/',
]
const FORBIDDEN = { ok: false, status: 0, error: 'forbidden' }

let background
beforeAll(async () => {
    background = await loadBackground()
})

describe('who may use the bridge', () => {
    it.each(OTHER_PAGES)('refuses %s in Chrome', async url => {
        expect(await fromPageInChrome(BRIDGE, url)).toEqual(FORBIDDEN)
    })

    it.each(OTHER_PAGES)("refuses %s through Firefox's relay", async url => {
        expect(await background.send(BRIDGE, { tab: { id: 9, url }, url })).toEqual(FORBIDDEN)
    })

    it('lets www.reveddit.com through to the bridge, which then wants a login', async () => {
        const expected = { ok: false, status: 0, error: 'not_logged_in' }
        expect(await fromPageInChrome(BRIDGE, WWW_PAGE)).toEqual(expected)
        expect(await background.send(BRIDGE, { tab: { id: 9, url: WWW_PAGE }, url: WWW_PAGE })).toEqual(expected)
    })

    it('lists only www.reveddit.com in the manifest', () => {
        const manifest = JSON.parse(readFileSync(new URL('../../src/manifest.json', import.meta.url), 'utf8'))
        expect(manifest.externally_connectable.matches).toEqual(['https://www.reveddit.com/*'])
    })
})
