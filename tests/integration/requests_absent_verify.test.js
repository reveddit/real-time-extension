// Absent-item verification hardening (issue #14): unknown verdicts are cached
// briefly and paced instead of re-fetched every cycle, unreadable pages log a
// page fingerprint, the legacy tiebreak logs its result, a persistently dead
// channel raises the absent_verify_unavailable badge, and a tab whose content
// script is orphaned falls back to scripting.executeScript before resorting to
// the challengeable background fetch.

// Install chrome global BEFORE any source import
import '../mocks/chrome-api.js'

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import browserMock, { __resetStorage, __getLocalStorage } from '../mocks/webextension-polyfill.js'

import {
    verifyFeedAbsentItems,
    getWwwHtmlFetcher,
    _fetchViaExecuteScript,
    _legacyLookups,
    ABSENT_VERIFY_UNAVAILABLE,
} from '../../src/src/requests'

const CACHE_KEY = 'www_absent_item_verdicts'
const FAILURES_KEY = 'absent_verify_consecutive_failures'

// No scaffolding, no challenge marker: classifyCommentPage → 'unknown'.
const SHELL_HTML = '<html><head><title>Reddit</title></head><body>nothing here</body></html>'
// Scaffolding present, comment tag present with a real author → 'live'.
const livePage = id =>
    `<html><body><shreddit-comment-tree></shreddit-comment-tree>` +
    `<shreddit-comment thingId="${id}" author="alice"></shreddit-comment></body></html>`

const meta = ids => Object.fromEntries(ids.map(id => [id, { permalink: `/r/sub/comments/abc/comment/${id}/` }]))

const res = (status, body) => ({
    ok: status >= 200 && status < 300,
    status,
    text: async () => body,
})

const savedLookups = { commentsById: _legacyLookups.commentsById, postByPath: _legacyLookups.postByPath }
const savedTabs = { query: browserMock.tabs.query, sendMessage: browserMock.tabs.sendMessage }

beforeEach(() => {
    __resetStorage()
    // The real legacy parsers run HTMLRewriter (WASM) — unavailable under
    // vitest, so every test routes through the seam.
    _legacyLookups.commentsById = vi.fn(async () => [])
    _legacyLookups.postByPath = vi.fn(async () => null)
    globalThis.fetch = vi.fn(async () => {
        throw new Error('unexpected network call')
    })
})

afterEach(() => {
    _legacyLookups.commentsById = savedLookups.commentsById
    _legacyLookups.postByPath = savedLookups.postByPath
    browserMock.tabs.query = savedTabs.query
    browserMock.tabs.sendMessage = savedTabs.sendMessage
    delete browserMock.scripting
    vi.restoreAllMocks()
})

describe('verifyFeedAbsentItems unknown caching', () => {
    it('caches an unknown verdict and paces the retry instead of re-fetching next cycle', async () => {
        const fetchHtml = vi.fn(async () => SHELL_HTML)
        const first = await verifyFeedAbsentItems(['t1_a'], meta(['t1_a']), fetchHtml)
        expect(first).toEqual({})
        // svc partial + full page, both unreadable
        expect(fetchHtml).toHaveBeenCalledTimes(2)
        expect(__getLocalStorage()[CACHE_KEY].t1_a.v).toBe('unknown')

        const fetchHtml2 = vi.fn(async () => SHELL_HTML)
        const second = await verifyFeedAbsentItems(['t1_a'], meta(['t1_a']), fetchHtml2)
        expect(second).toEqual({})
        expect(fetchHtml2).not.toHaveBeenCalled()
    })

    it('re-fetches once the unknown TTL has expired', async () => {
        __getLocalStorage()[CACHE_KEY] = { t1_a: { v: 'unknown', t: Date.now() - 31 * 60 * 1000 } }
        const fetchHtml = vi.fn(async () => SHELL_HTML)
        await verifyFeedAbsentItems(['t1_a'], meta(['t1_a']), fetchHtml)
        expect(fetchHtml).toHaveBeenCalledTimes(2)
    })

    it('still returns cached definitive verdicts without fetching', async () => {
        __getLocalStorage()[CACHE_KEY] = { t1_a: { v: 'live', t: Date.now() } }
        const fetchHtml = vi.fn(async () => SHELL_HTML)
        const verdicts = await verifyFeedAbsentItems(['t1_a'], meta(['t1_a']), fetchHtml)
        expect(verdicts).toEqual({ t1_a: 'live' })
        expect(fetchHtml).not.toHaveBeenCalled()
    })

    it('a paced unknown can still be settled by the legacy tiebreak', async () => {
        __getLocalStorage()[CACHE_KEY] = { t1_a: { v: 'unknown', t: Date.now() } }
        _legacyLookups.commentsById = vi.fn(async () => [
            { data: { name: 't1_canary', author: 'bob' } },
            { data: { name: 't1_a', author: 'alice' } },
        ])
        const fetchHtml = vi.fn(async () => SHELL_HTML)
        const verdicts = await verifyFeedAbsentItems(['t1_a'], meta(['t1_a']), fetchHtml, ['t1_canary'])
        expect(fetchHtml).not.toHaveBeenCalled()
        expect(verdicts).toEqual({ t1_a: 'live' })
        expect(__getLocalStorage()[CACHE_KEY].t1_a.v).toBe('live')
    })
})

describe('unreadable-page diagnostics', () => {
    it('logs a page fingerprint when a fetched page yields unknown', async () => {
        const spy = vi.spyOn(console, 'log')
        await verifyFeedAbsentItems(['t1_a'], meta(['t1_a']), async () => SHELL_HTML)
        const call = spy.mock.calls.find(c => String(c[0]).includes('page unreadable (no solvable challenge)'))
        expect(call).toBeTruthy()
        expect(String(call[1])).toContain(`bytes=${SHELL_HTML.length}`)
        expect(String(call[1])).toContain('challenge=0')
        expect(String(call[1])).toContain('scaffold=0')
        expect(String(call[1])).toContain('Reddit')
        // The svc partial attempt gets its own fingerprint line too
        expect(spy.mock.calls.some(c => String(c[0]).includes('svc partial unreadable'))).toBe(true)
    })

    it('logs the legacy tiebreak result including the silent-empty case', async () => {
        const spy = vi.spyOn(console, 'log')
        await verifyFeedAbsentItems(['t1_a'], meta(['t1_a']), async () => SHELL_HTML, ['t1_canary'])
        const line = spy.mock.calls.find(c => String(c[0]).includes('legacy comment tiebreak:'))
        expect(line).toBeTruthy()
        expect(String(line[0])).toContain('0/2 rendered')
        expect(String(line[0])).toContain('canaryRendered=false')
    })

    it('logs a per-cycle pacing summary', async () => {
        const spy = vi.spyOn(console, 'log')
        __getLocalStorage()[CACHE_KEY] = { t1_b: { v: 'unknown', t: Date.now() } }
        await verifyFeedAbsentItems(['t1_a', 't1_b'], meta(['t1_a', 't1_b']), async () => SHELL_HTML)
        const line = spy.mock.calls.find(c => String(c[0]).includes('absent verify:'))
        expect(line).toBeTruthy()
        expect(String(line[0])).toContain('1 fetched')
        expect(String(line[0])).toContain('1 paced')
        expect(String(line[0])).toContain('0 resolved')
    })
})

describe('svc partial-first verification', () => {
    it('resolves via the svc partial without fetching the full page', async () => {
        const fetchHtml = vi.fn(async url => {
            if (url.includes('/svc/shreddit/comments/')) return livePage('t1_a')
            throw new Error(`unexpected full-page fetch: ${url}`)
        })
        const verdicts = await verifyFeedAbsentItems(['t1_a'], meta(['t1_a']), fetchHtml)
        expect(verdicts).toEqual({ t1_a: 'live' })
        expect(fetchHtml).toHaveBeenCalledTimes(1)
        expect(fetchHtml.mock.calls[0][0]).toContain('/svc/shreddit/comments/r/sub/abc/a?render-mode=partial')
    })

    it('falls back to the full page when the partial is unreadable', async () => {
        const fetchHtml = vi.fn(async url => (url.includes('/svc/') ? SHELL_HTML : livePage('t1_a')))
        const verdicts = await verifyFeedAbsentItems(['t1_a'], meta(['t1_a']), fetchHtml)
        expect(verdicts).toEqual({ t1_a: 'live' })
        expect(fetchHtml).toHaveBeenCalledTimes(2)
        expect(fetchHtml.mock.calls[0][0]).toContain('/svc/')
        expect(fetchHtml.mock.calls[1][0]).not.toContain('/svc/')
    })

    it('a 429 on the partial flags the shared rate limit even when the page fallback succeeds', async () => {
        const fetchHtml = vi.fn(async url => {
            if (url.includes('/svc/')) throw new Error('www.reddit.com request failed: 429')
            return livePage('t1_a')
        })
        const verdicts = await verifyFeedAbsentItems(['t1_a'], meta(['t1_a']), fetchHtml)
        expect(verdicts).toEqual({ t1_a: 'live' })
        expect(__getLocalStorage().rate_limit_until).toBeGreaterThan(Date.now())
    })
})

describe('absent_verify_unavailable badge (F4)', () => {
    it('sets the badge after 5 consecutive fetching cycles that resolve nothing', async () => {
        for (let i = 1; i <= 5; i++) {
            const id = `t1_x${i}`
            await verifyFeedAbsentItems([id], meta([id]), async () => SHELL_HTML)
            expect(__getLocalStorage()[FAILURES_KEY]).toBe(i)
        }
        expect(__getLocalStorage().error_status).toBe(ABSENT_VERIFY_UNAVAILABLE)
    })

    it('any fresh definitive verdict resets the streak', async () => {
        __getLocalStorage()[FAILURES_KEY] = 4
        await verifyFeedAbsentItems(['t1_ok'], meta(['t1_ok']), async () => livePage('t1_ok'))
        expect(__getLocalStorage()[FAILURES_KEY]).toBeUndefined()
        expect(__getLocalStorage().error_status).toBeUndefined()
    })

    it('cycles that fetch nothing are neutral', async () => {
        __getLocalStorage()[FAILURES_KEY] = 4
        __getLocalStorage()[CACHE_KEY] = { t1_a: { v: 'unknown', t: Date.now() } }
        await verifyFeedAbsentItems(['t1_a'], meta(['t1_a']), async () => SHELL_HTML)
        expect(__getLocalStorage()[FAILURES_KEY]).toBe(4)
        expect(__getLocalStorage().error_status).toBeUndefined()
    })
})

describe('getWwwHtmlFetcher executeScript fallback', () => {
    const openTab = () => {
        browserMock.tabs.query = vi.fn(async () => [{ id: 7 }])
    }

    it('uses the content script when it answers', async () => {
        openTab()
        browserMock.tabs.sendMessage = vi.fn(async () => ({ success: true, html: 'CSPAGE' }))
        browserMock.scripting = { executeScript: vi.fn() }
        const { fetchHtml, viaTab } = await getWwwHtmlFetcher()
        expect(viaTab).toBe(true)
        expect(await fetchHtml('https://www.reddit.com/x')).toBe('CSPAGE')
        expect(browserMock.scripting.executeScript).not.toHaveBeenCalled()
    })

    it('falls back to executeScript when the content script is orphaned', async () => {
        openTab()
        browserMock.scripting = {
            executeScript: vi.fn(async () => [{ result: { ok: true, status: 200, text: 'TABPAGE' } }]),
        }
        const { fetchHtml, viaTab } = await getWwwHtmlFetcher()
        expect(viaTab).toBe(true)
        expect(await fetchHtml('https://www.reddit.com/x')).toBe('TABPAGE')
        expect(browserMock.scripting.executeScript).toHaveBeenCalledTimes(1)
        expect(browserMock.scripting.executeScript.mock.calls[0][0].target).toEqual({ tabId: 7 })
    })

    it('surfaces HTTP failures from the injected fetch (rate-limit flagging depends on the message shape)', async () => {
        openTab()
        browserMock.scripting = {
            executeScript: vi.fn(async () => [{ result: { ok: false, status: 429, text: '' } }]),
        }
        const { fetchHtml } = await getWwwHtmlFetcher()
        await expect(fetchHtml('https://www.reddit.com/x')).rejects.toThrow('request failed: 429')
    })

    it('falls back to the background fetch when injection itself is unavailable', async () => {
        openTab()
        browserMock.scripting = {
            executeScript: vi.fn(async () => {
                throw new Error('No tab with id: 7')
            }),
        }
        globalThis.fetch = vi.fn(async () => res(200, 'BGPAGE'))
        const { fetchHtml } = await getWwwHtmlFetcher()
        expect(await fetchHtml('https://www.reddit.com/x')).toBe('BGPAGE')
        expect(globalThis.fetch).toHaveBeenCalledTimes(1)
    })

    it('skips discarded tabs when a live one exists', async () => {
        browserMock.tabs.query = vi.fn(async () => [{ id: 3, discarded: true }, { id: 9 }])
        browserMock.scripting = {
            executeScript: vi.fn(async () => [{ result: { ok: true, status: 200, text: 'TABPAGE' } }]),
        }
        const { fetchHtml } = await getWwwHtmlFetcher()
        await fetchHtml('https://www.reddit.com/x')
        expect(browserMock.scripting.executeScript.mock.calls[0][0].target).toEqual({ tabId: 9 })
    })
})

describe('_fetchViaExecuteScript contract', () => {
    it('throws when no scripting API exists', async () => {
        await expect(_fetchViaExecuteScript(1, 'u')).rejects.toThrow('scripting API unavailable')
    })

    it('the injected function returns a tagged object and never rejects', async () => {
        browserMock.scripting = { executeScript: vi.fn(async () => [{ result: { ok: true, status: 200, text: '' } }]) }
        await _fetchViaExecuteScript(1, 'u')
        const func = browserMock.scripting.executeScript.mock.calls[0][0].func

        globalThis.fetch = vi.fn(async () => res(200, 'X'))
        expect(await func('u')).toEqual({ ok: true, status: 200, text: 'X' })

        globalThis.fetch = vi.fn(async () => res(500, 'boom'))
        expect(await func('u')).toEqual({ ok: false, status: 500, text: '' })

        globalThis.fetch = vi.fn(async () => {
            throw new Error('net down')
        })
        const failed = await func('u')
        expect(failed.ok).toBe(false)
        expect(failed.status).toBe(0)
        expect(failed.err).toContain('net down')
    })
})
