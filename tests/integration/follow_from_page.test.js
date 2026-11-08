// Following from a page that knows more than reddit's read does: reveddit shows
// a removed comment's recovered text, and the record the follow's first check
// stores has only [removed]. The page's text goes on that record, so the follow
// has to wait for it.

// Install chrome global BEFORE any source import
import '../mocks/chrome-api.js'

import { describe, it, expect, afterEach, vi } from 'vitest'
import { parseHTML } from 'linkedom'
import browserMock, { __resetStorage, __getLocalStorage } from '../mocks/webextension-polyfill.js'

// content-common.ts asks where it's running as it loads
globalThis.location.hostname = 'www.reveddit.com'
const { setTextAndFunction_subscribe } = await import('../../src/src/content-common')

const ID = 't1_recover'
const REMOVED_VIEW = { name: ID, author: '[deleted]', body: '[removed]', created_utc: 1700000000, link_id: 't3_abc' }

const realSendMessage = browserMock.runtime.sendMessage
afterEach(() => {
    browserMock.runtime.sendMessage = realSendMessage
})

describe('following a comment from reveddit', () => {
    it('keeps the text the page shows on the record of a comment already removed', async () => {
        __resetStorage({
            options: { removal_status: { track: true }, lock_status: { track: true } },
            other_subscriptions: {},
        })
        // In a content script a lookup goes through the background
        vi.stubGlobal('location', { protocol: 'https:', hostname: 'www.reveddit.com' })
        vi.stubGlobal('window', { location: { href: 'https://www.reveddit.com/v/x/comments/abc/_/recover/' } })
        browserMock.runtime.sendMessage = async message =>
            message.action === 'get-reddit-items-by-id' ? { response: 'done', items: [{ data: REMOVED_VIEW }] } : undefined
        const { document } = parseHTML('<html><body><a></a></body></html>')
        const button = setTextAndFunction_subscribe(ID, document.querySelector('a'), 'the words it recovered', 't3_abc')
        button.onclick({ preventDefault() {}, stopPropagation() {} })
        await vi.waitFor(() => expect(__getLocalStorage().items_other?.[ID]?.t).toBe('the words it recovered'))
    })
})
