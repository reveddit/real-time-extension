// Following from a page that knows more than reddit's read does: reveddit shows
// a removed comment's recovered text, and the record the follow's first check
// stores has only [removed]. The page's text goes on that record, so the follow
// has to wait for it. Only there: a comment reddit still gives keeps its
// markdown, which the page's text has lost.

// Install chrome global BEFORE any source import
import '../mocks/chrome-api.js'

import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest'
import { parseHTML } from 'linkedom'
import browserMock, { __resetStorage, __getLocalStorage } from '../mocks/webextension-polyfill.js'
import { loadBackground } from '../mocks/background.js'
import { cookie, fill } from '../mocks/cookies.js'
import { PAGE_WRITE } from '../../src/src/storage'

// content-common.ts asks where it's running as it loads
globalThis.location.hostname = 'www.reveddit.com'
const { setTextAndFunction_subscribe } = await import('../../src/src/content-common')

let background
beforeAll(async () => {
    background = await loadBackground()
})

const ID = 't1_recover'
const VIEW = { name: ID, author: 'someone', body: 'its words', created_utc: 1700000000, link_id: 't3_abc' }

const realSendMessage = browserMock.runtime.sendMessage
afterEach(() => {
    browserMock.runtime.sendMessage = realSendMessage
})

// Clicks the comment's button on a page that shows pageText, where reddit's read gives view
const follow = (view, pageText) => {
    __resetStorage({
        options: { removal_status: { track: true }, lock_status: { track: true } },
        user_subscriptions: {},
        other_subscriptions: {},
    })
    // A content script's follow is the background's, which reads reddit with the login
    vi.stubGlobal('location', { protocol: 'https:', hostname: 'www.reveddit.com' })
    vi.stubGlobal('window', { location: { href: 'https://www.reveddit.com/v/x/comments/abc/_/recover/' } })
    browserMock.runtime.sendMessage = async message =>
        message.action === PAGE_WRITE
            ? background.send(message, { tab: { id: 9, url: 'https://www.reveddit.com/' } })
            : undefined
    fill([cookie('reddit_session', 'S1')])
    vi.stubGlobal(
        'fetch',
        vi.fn(async () => new Response(JSON.stringify({ data: { children: [{ kind: 't1', data: view }] } }))),
    )
    const { document } = parseHTML('<html><body><a></a></body></html>')
    const button = setTextAndFunction_subscribe(ID, document.querySelector('a'), pageText, 't3_abc')
    button.onclick({ preventDefault() {}, stopPropagation() {} })
}
const storedText = () => __getLocalStorage().items_other?.[ID]?.t

describe('following a comment from reveddit', () => {
    it.each(['[removed]', '[deleted]', '[ Removed by Reddit ]'])(
        'keeps the text the page shows on the record of a comment reddit gives as %s',
        async gone => {
            follow({ ...VIEW, author: '[deleted]', body: gone }, 'the words it recovered')
            await vi.waitFor(() => expect(storedText()).toBe('the words it recovered'))
        },
    )

    it("keeps reddit's own text, markdown and all, for a comment it still gives", async () => {
        const body = 'see [the rules](https://example.com/rules) and **read** them'
        follow({ ...VIEW, body }, 'see the rules and read them')
        await vi.waitFor(() => expect(storedText()).toBeDefined())
        await new Promise(resolve => setTimeout(resolve, 0))
        expect(storedText()).toBe(body)
    })
})
