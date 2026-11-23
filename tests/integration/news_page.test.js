// The news page as a person sees it: the real news-page.tsx over a fake DOM.

// Install chrome global BEFORE any source import
import '../mocks/chrome-api.js'

import { describe, it, expect, vi } from 'vitest'
import { openPage } from '../mocks/extension-page.js'

const RELEASES = [
    { version: '0.0.5.37', date: '2026/11/17', notes: ['removal checks no longer pause'] },
    { version: '0.0.5.36', date: '2026/11/15', notes: ['older removals are checked again', 'a second note'] },
]
const PNG = 'data:image/png;base64,iVBORw0KGgo='
const message = (id, extra = {}) => ({
    id,
    title: `Title ${id}`,
    body_markdown: `Words of ${id}`,
    published_utc: 1,
    ...extra,
})
// What a fetch stored, a fresh one, so the page fetches nothing
const newsCache = (...messages) => ({ news_cache: { feed: { messages }, lastFetched: Date.now() } })

// fetched: the feed a fetch brings; without it the fetch never answers
const openNews = ({ local = {}, hash = '', fetched } = {}) =>
    openPage(
        () => {
            globalThis.window.location = { hash }
            vi.stubGlobal('__RELEASE_HISTORY__', RELEASES)
            vi.stubGlobal(
                'fetch',
                fetched
                    ? async () => ({ ok: true, status: 200, json: async () => fetched })
                    : () => new Promise(() => {}),
            )
            return import('../../src/src/news-page.tsx')
        },
        {},
        local,
    )
// A cache from over an hour ago, so the page fetches
const staleCache = (...messages) => ({ news_cache: { feed: { messages }, lastFetched: 0 } })

const tabs = document => Array.from(document.querySelectorAll('[role="tab"]'))
const selectedTab = document => tabs(document).find(tab => tab.getAttribute('aria-selected') === 'true')?.textContent
const headings = document => Array.from(document.querySelectorAll('h3')).map(h3 => h3.textContent)

describe('the news page', () => {
    it("opens on Other apps and lists every message, the ones dismissed in the popup too", async () => {
        const old = message('old', { published_utc: 1783512000000, icon: PNG })
        const recent = message('new', {
            published_utc: 1795000000000,
            body_markdown: '[Get it free](https://twisitter.com)',
        })
        const { document } = await openNews({ local: { ...newsCache(old, recent), news_read_ids: { old: true } } })

        await vi.waitFor(() => expect(headings(document)).toEqual(['Title new', 'Title old']))
        expect(tabs(document).map(tab => tab.textContent)).toEqual(['Other apps', 'Version history'])
        expect(selectedTab(document)).toBe('Other apps')
        // Each is dated, the icon is the message's own, and the link opens in a new tab
        expect(document.body.textContent).toContain('2026')
        expect(Array.from(document.querySelectorAll('img'), img => img.getAttribute('src'))).toEqual([PNG])
        const link = document.querySelector('.md-body a')
        expect([link.getAttribute('href'), link.getAttribute('target')]).toEqual(['https://twisitter.com', '_blank'])
    })

    it('lists them in the order the popup shows them', async () => {
        const local = newsCache(
            message('newer', { published_utc: 9 }),
            message('first', { published_utc: 1, priority: 5 }),
        )
        const { document } = await openNews({ local })
        await vi.waitFor(() => expect(headings(document)).toEqual(['Title first', 'Title newer']))
    })

    it('says so when there is nothing to list', async () => {
        const { document } = await openNews({ local: newsCache() })
        await vi.waitFor(() => expect(document.body.textContent).toContain('Nothing here yet.'))
    })

    it('shows the version history on its other tab, newest first, and takes the messages away', async () => {
        const { document } = await openNews({ local: newsCache(message('a')) })
        await vi.waitFor(() => expect(headings(document)).toEqual(['Title a']))

        tabs(document)[1].click()
        await vi.waitFor(() => expect(selectedTab(document)).toBe('Version history'))
        expect(headings(document)).toEqual(['v0.0.5.37', 'v0.0.5.36'])
        const notes = Array.from(document.querySelectorAll('li'), li => li.textContent)
        expect(notes).toEqual(['removal checks no longer pause', 'older removals are checked again', 'a second note'])
        expect(document.body.textContent).not.toContain('Words of a')

        tabs(document)[0].click()
        await vi.waitFor(() => expect(headings(document)).toEqual(['Title a']))
    })

    it('opens on the version history when its address says so', async () => {
        const { document } = await openNews({ hash: '#versions', local: newsCache(message('a')) })
        await vi.waitFor(() => expect(selectedTab(document)).toBe('Version history'))
        expect(headings(document)).toEqual(['v0.0.5.37', 'v0.0.5.36'])
    })

    // A fetch that stalls must not hold back what the cache already has
    it('lists the cached messages while the feed fetch is still waiting', async () => {
        const { document } = await openNews({ local: staleCache(message('a')) })
        await vi.waitFor(() => expect(headings(document)).toEqual(['Title a']))
    })

    it('replaces them with what the fetch brings', async () => {
        const fetched = { messages: [message('b'), message('c', { priority: 2 })] }
        const { document } = await openNews({ local: staleCache(message('a')), fetched })
        await vi.waitFor(() => expect(headings(document)).toEqual(['Title c', 'Title b']))
    })
})
