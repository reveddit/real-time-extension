// What a feed's messages carry: the order they show in, the picture beside the
// title, and links that open in a new tab. The popup's side of each is in
// popup_page.test.js.

// Install chrome global BEFORE any source import
import '../mocks/chrome-api.js'

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { __resetStorage, __getLocalStorage } from '../mocks/webextension-polyfill.js'

import { fetchNews, getUnreadMessages, NEWS_CACHE_KEY } from '../../src/src/news'
import { markdownToHTML } from '../../src/src/ui/markdown'

const serve = feed =>
    vi.stubGlobal(
        'fetch',
        vi.fn(async () => ({ ok: true, status: 200, json: async () => feed })),
    )
const message = (id, extra = {}) => ({ id, title: id, body_markdown: id, published_utc: 1, ...extra })
const keptMessage = async extra => {
    serve({ messages: [message('a', extra)] })
    await fetchNews({ force: true })
    return __getLocalStorage()[NEWS_CACHE_KEY].feed.messages[0]
}
// A 1 x 1 picture
const PNG =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg=='

beforeEach(() => __resetStorage({}, {}))

describe('a message in the order it shows', () => {
    const unreadIds = async messages => {
        serve({ messages })
        await fetchNews({ force: true })
        return (await getUnreadMessages()).map(m => m.id)
    }

    it('puts the newest first', async () => {
        expect(await unreadIds([message('old', { published_utc: 1 }), message('new', { published_utc: 2 })])).toEqual([
            'new',
            'old',
        ])
    })

    it('puts a higher priority before a newer message', async () => {
        const messages = [message('newer', { published_utc: 9 }), message('first', { published_utc: 1, priority: 5 })]
        expect(await unreadIds(messages)).toEqual(['first', 'newer'])
    })

    it('puts a lower priority after, and breaks a tie by date', async () => {
        const messages = [
            message('last', { published_utc: 9, priority: -1 }),
            message('b', { published_utc: 1, priority: 2 }),
            message('a', { published_utc: 2, priority: 2 }),
            message('plain', { published_utc: 5 }),
        ]
        expect(await unreadIds(messages)).toEqual(['a', 'b', 'plain', 'last'])
    })
})

describe('a message priority the cache keeps', () => {
    it.each([
        [5, 5],
        ['3', 3],
        [-1, -1],
    ])('keeps %j as %j', async (given, kept) => {
        expect((await keptMessage({ priority: given })).priority).toBe(kept)
    })

    // Left out, so a message with none looks as it did before there were any
    it.each([undefined, 0, null, 'soon', {}, []])('leaves it out for %j', async given => {
        expect(await keptMessage({ priority: given })).not.toHaveProperty('priority')
    })
})

describe('a message icon the cache keeps', () => {
    it('keeps a small PNG sent in the feed', async () => {
        expect((await keptMessage({ icon: PNG })).icon).toBe(PNG)
    })

    it('keeps one at the size limit, and drops one a character over', async () => {
        const head = 'data:image/png;base64,'
        expect((await keptMessage({ icon: head + 'A'.repeat(8000 - head.length) })).icon).toHaveLength(8000)
        expect(await keptMessage({ icon: head + 'A'.repeat(8001 - head.length) })).not.toHaveProperty('icon')
    })

    // Showing an icon must ask no other site for anything, and carry no markup
    it.each([
        ['a web address', 'https://twisitter.com/icon.png'],
        ['a web address with a data: path', 'https://example.com/data:image/png;base64,AAAA'],
        ['a picture of another kind', PNG.replace('image/png', 'image/svg+xml')],
        ['a picture that is not base64', 'data:image/png,AAAA'],
        ['a script', 'javascript:alert(1)'],
        ['a picture with something after it', `${PNG}" onerror="alert(1)`],
        ['a picture on two lines', `${PNG}\nAAAA`],
        ['something that is not text', 5],
        ['an empty picture', 'data:image/png;base64,'],
    ])('drops %s', async (_what, icon) => {
        expect(await keptMessage({ icon })).not.toHaveProperty('icon')
    })
})

describe('links in a message the popup shows', () => {
    const links = html => Array.from(html.matchAll(/<a href="([^"]*)"([^>]*)>/g), m => [m[1], /target="_blank"/.test(m[2])])

    it('open in a new tab, whether written as a link or as an address', () => {
        const html = markdownToHTML('[Get it free →](https://twisitter.com) or https://example.com/x', true)
        expect(links(html)).toEqual([
            ['https://twisitter.com', true],
            ['https://example.com/x', true],
        ])
    })

    it("still reach reddit.com from a reddit link, and the words don't change", () => {
        const plain = markdownToHTML('see [r/reveddit](/r/reveddit) now')
        const newTab = markdownToHTML('see [r/reveddit](/r/reveddit) now', true)
        expect(links(newTab)).toEqual([['https://www.reddit.com/r/reveddit', true]])
        expect(newTab.replace(' target="_blank"', '')).toBe(plain)
    })

    // The history and other pages show recovered comments the same way as before
    it('are left as they were everywhere else', () => {
        expect(links(markdownToHTML('[x](https://example.com)'))).toEqual([['https://example.com', false]])
    })
})
