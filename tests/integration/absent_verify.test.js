// Absent-item verification hardening (issue #14), in page-verify.ts: unknown
// verdicts are cached briefly and paced instead of re-fetched every cycle,
// unreadable pages log a page fingerprint, the legacy tiebreak logs its result,
// and a persistently dead channel raises the absent_verify_unavailable badge.

// Install chrome global BEFORE any source import
import '../mocks/chrome-api.js'

import { describe, it, expect, vi } from 'vitest'
import { __resetStorage, __getLocalStorage } from '../mocks/webextension-polyfill.js'
import { verifyFeedAbsentItems } from '../../src/src/page-verify'
import { _legacyLookups, isLegacyResting } from '../../src/src/legacy-lookup'
import { ABSENT_VERIFY_UNAVAILABLE } from '../../src/src/lookup-status'
import { isLegacyPageUrl } from '../../src/src/parse_html/common'
import { SHELL_HTML, livePage, useFetcherHooks } from '../mocks/www-fetch-hooks.js'
import { commentsPage, commentEl } from '../mocks/public-profile.js'

useFetcherHooks()

const CACHE_KEY = 'www_absent_item_verdicts'
const FAILURES_KEY = 'absent_verify_consecutive_failures'

const meta = ids => Object.fromEntries(ids.map(id => [id, { permalink: `/r/sub/comments/abc/comment/${id}/` }]))
// The comment's own thread, without the comment
const removedPage = id => commentsPage(commentEl('t1_other', 'someone'), id)

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

    it('a 429 on the partial ends the checks after that item, with one hit in the backoff', async () => {
        const ids = ['t1_a', 't1_b', 't1_c', 't1_d']
        const fetchHtml = vi.fn(async url => {
            if (url.includes('/svc/')) throw new Error('www.reddit.com request failed: 429')
            return livePage('t1_a')
        })
        await verifyFeedAbsentItems(ids, meta(ids), fetchHtml)
        expect(fetchHtml).toHaveBeenCalledTimes(2)
        expect(__getLocalStorage().rate_limit_level).toBe(1)
    })

    it('a 429 on both the partial and the page is one hit, so the first wait stays at two minutes', async () => {
        const limited = vi.fn(async () => {
            throw new Error('www.reddit.com request failed: 429')
        })
        await verifyFeedAbsentItems(['t1_a'], meta(['t1_a']), limited)
        expect(limited).toHaveBeenCalledTimes(2)
        expect(__getLocalStorage().rate_limit_level).toBe(1)
        expect(__getLocalStorage().rate_limit_until).toBeLessThanOrEqual(Date.now() + 2 * 60 * 1000)
    })

    it('a 429 on the partial ends the checks when the page then fails some other way too', async () => {
        const ids = ['t1_a', 't1_b']
        const fetchHtml = vi.fn(async url => {
            throw new Error(`www.reddit.com request failed: ${url.includes('/svc/') ? 429 : 403}`)
        })
        await verifyFeedAbsentItems(ids, meta(ids), fetchHtml)
        expect(fetchHtml).toHaveBeenCalledTimes(2)
        expect(__getLocalStorage().rate_limit_level).toBe(1)
    })
})

describe('a comment missing from its own thread page', () => {
    it('reads as unknown under the remote valve, without any step before this one', async () => {
        __resetStorage(
            {},
            {
                news_cache: {
                    feed: { messages: [], options: { mechanisms: { absentUnverifiedIsUnknown: 'on' } } },
                    lastFetched: Date.now(),
                },
            },
        )
        const fetchHtml = vi.fn(async () => removedPage('t1_a'))
        expect(await verifyFeedAbsentItems(['t1_a'], meta(['t1_a']), fetchHtml)).toEqual({})
        expect(__getLocalStorage()[CACHE_KEY].t1_a.v).toBe('unknown')
    })
})

describe('a removal monitoring is counting', () => {
    // As monitoring marks an item whose removal it's counting and can still record
    const counting = ids => Object.fromEntries(ids.map(id => [id, { ...meta([id])[id], confirming: true }]))
    const cachedRemoved = ids => {
        __getLocalStorage()[CACHE_KEY] = Object.fromEntries(ids.map(id => [id, { v: 'removed', t: Date.now() }]))
    }
    const wall = async () => {
        throw new Error('www.reddit.com request failed: 403 (refused: background:no-store 403)')
    }

    it('is read again each cycle, so one read cannot fill the count', async () => {
        cachedRemoved(['t1_a'])
        const fetchHtml = vi.fn(async () => livePage('t1_a'))
        expect(await verifyFeedAbsentItems(['t1_a'], counting(['t1_a']), fetchHtml)).toEqual({ t1_a: 'live' })
        expect(fetchHtml).toHaveBeenCalledTimes(1)
    })

    it('so is a post its page showed held', async () => {
        __getLocalStorage()[CACHE_KEY] = { t3_p: { v: 'held', t: Date.now(), k: 2 } }
        const live = `<html><body><shreddit-post id="t3_p" author="alice" post-title="t"></shreddit-post></body></html>`
        const fetchHtml = vi.fn(async () => live)
        expect(await verifyFeedAbsentItems(['t3_p'], { t3_p: { confirming: true } }, fetchHtml)).toEqual({
            t3_p: 'live',
        })
    })

    it("a read that decides nothing leaves the cached verdict and gives none, and the next waits as long as an unknown's", async () => {
        vi.useFakeTimers({ toFake: ['Date'] })
        for (const undecided of [async () => SHELL_HTML, wall]) {
            cachedRemoved(['t1_a'])
            expect(await verifyFeedAbsentItems(['t1_a'], counting(['t1_a']), undecided)).toEqual({})
            expect(__getLocalStorage()[CACHE_KEY].t1_a.v).toBe('removed')
            const next = vi.fn(async () => removedPage('t1_a'))
            vi.setSystemTime(Date.now() + 30 * 60 * 1000 - 1)
            expect(await verifyFeedAbsentItems(['t1_a'], counting(['t1_a']), next)).toEqual({})
            expect(next).not.toHaveBeenCalled()
            vi.setSystemTime(Date.now() + 1)
            expect(await verifyFeedAbsentItems(['t1_a'], counting(['t1_a']), next)).toEqual({ t1_a: 'removed' })
            expect(next).toHaveBeenCalledTimes(1)
        }
    })

    it("is reused when monitoring isn't counting it: recorded already, or one it can't record", async () => {
        cachedRemoved(['t1_a'])
        const fetchHtml = vi.fn(async () => livePage('t1_a'))
        expect(await verifyFeedAbsentItems(['t1_a'], meta(['t1_a']), fetchHtml)).toEqual({ t1_a: 'removed' })
        expect(fetchHtml).not.toHaveBeenCalled()
    })

    it('a removal the legacy listing found follows the same rule', async () => {
        _legacyLookups.commentsById = vi.fn(async () => [{ data: { name: 't1_canary', author: 'bob' } }])
        const fetchHtml = vi.fn(async () => SHELL_HTML)
        const verify = m => verifyFeedAbsentItems(['t1_a'], m, fetchHtml, ['t1_canary'])
        expect(await verify(meta(['t1_a']))).toEqual({ t1_a: 'removed' })
        expect(await verify(meta(['t1_a']))).toEqual({ t1_a: 'removed' })
        // the svc partial and the page, once
        expect(fetchHtml).toHaveBeenCalledTimes(2)
        expect(_legacyLookups.commentsById).toHaveBeenCalledTimes(1)
        await verify(counting(['t1_a']))
        expect(fetchHtml).toHaveBeenCalledTimes(4)
    })

    it('stays inside the cycle budget, and the items behind get their first reads in order', async () => {
        const pause = vi.spyOn(globalThis, 'setTimeout').mockImplementation(fn => {
            fn()
            return 0
        })
        try {
            const ids = Array.from({ length: 22 }, (_, i) => `t1_c${i}`)
            const counted = ids.slice(0, 20)
            cachedRemoved(counted)
            const read = []
            const fetchHtml = vi.fn(async url => {
                const id = `t1_${url.match(/\/(c\d+)\?/)[1]}`
                read.push(id)
                return removedPage(id)
            })
            await verifyFeedAbsentItems(ids, { ...meta(ids), ...counting(counted) }, fetchHtml)
            expect(read).toEqual(counted)
            // Recorded by then, so their cached verdicts stand
            read.length = 0
            await verifyFeedAbsentItems(ids, meta(ids), fetchHtml)
            expect(read).toEqual(ids.slice(20))
        } finally {
            pause.mockRestore()
        }
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

describe('absent-item verification loop', () => {
    it('a 429 during absent-item verification ends the loop and enters the backoff; a 403 sets no warning', async () => {
        const ids = ['t1_a', 't1_b', 't1_c']
        const limited = vi.fn(async () => {
            throw new Error('www.reddit.com request failed: 429')
        })
        await verifyFeedAbsentItems(ids, meta(ids), limited)
        // the svc partial, then the full page, of the first item only
        expect(limited).toHaveBeenCalledTimes(2)
        expect(__getLocalStorage().error_status).toBe('rate_limited')

        __resetStorage()
        const blocked = vi.fn(async () => {
            throw new Error('www.reddit.com request failed: 403 (refused: background:no-store 403)')
        })
        await verifyFeedAbsentItems(ids, meta(ids), blocked)
        expect(blocked).toHaveBeenCalledTimes(6)
        expect(__getLocalStorage().error_status).toBeUndefined()
    })

    it('a check that failed outright (a wall on every route) is paced as unknown, not retried next cycle', async () => {
        const ids = ['t1_a', 't1_b']
        const blocked = vi.fn(async () => {
            throw new Error('www.reddit.com request failed: 403 (refused: background:no-store 403)')
        })
        expect(await verifyFeedAbsentItems(ids, meta(ids), blocked)).toEqual({})
        expect(blocked).toHaveBeenCalledTimes(4)
        expect(Object.fromEntries(Object.entries(__getLocalStorage()[CACHE_KEY]).map(([id, e]) => [id, e.v]))).toEqual({
            t1_a: 'unknown',
            t1_b: 'unknown',
        })
        const again = vi.fn(async () => SHELL_HTML)
        await verifyFeedAbsentItems(ids, meta(ids), again)
        expect(again).not.toHaveBeenCalled()
    })

    it('stops at the cycle budget: twenty items a cycle, ten after a recent 429, the rest left for the next cycle', async () => {
        const pause = vi.spyOn(globalThis, 'setTimeout').mockImplementation(fn => {
            fn()
            return 0
        })
        try {
            const ids = Array.from({ length: 22 }, (_, i) => `t1_c${i}`)
            const fetchHtml = vi.fn(async () => SHELL_HTML)
            await verifyFeedAbsentItems(ids, meta(ids), fetchHtml)
            // each unreadable item takes the svc partial and the full page
            expect(fetchHtml).toHaveBeenCalledTimes(40)
            expect(Object.keys(__getLocalStorage()[CACHE_KEY]).sort()).toEqual(ids.slice(0, 20).sort())

            __resetStorage({}, { rate_limit_last_hit: Date.now() - 1000 })
            const slower = vi.fn(async () => SHELL_HTML)
            await verifyFeedAbsentItems(ids, meta(ids), slower)
            expect(slower).toHaveBeenCalledTimes(20)
            expect(Object.keys(__getLocalStorage()[CACHE_KEY])).toHaveLength(10)
        } finally {
            pause.mockRestore()
        }
    })

    it('a cached verdict dated in the future (a clock set back) counts as expired', async () => {
        __getLocalStorage()[CACHE_KEY] = { t1_a: { v: 'live', t: Date.now() + 3600 * 1000 } }
        const fetchHtml = vi.fn(async () => livePage('t1_a'))
        await verifyFeedAbsentItems(['t1_a'], meta(['t1_a']), fetchHtml)
        expect(fetchHtml).toHaveBeenCalled()
    })
})

describe('absent verification and the legacy paths', () => {
    it('a 403 on a legacy post page ends the tiebreak and rests the legacy pages', async () => {
        _legacyLookups.postByPath = vi.fn(async () => ({
            error: 'legacy reddit HTML request failed: 403',
            status: 403,
        }))
        const ids = ['t3_a', 't3_b', 't3_c']
        // no page verdicts, so all three reach the post tiebreak
        await verifyFeedAbsentItems(
            ids,
            {},
            vi.fn(async () => SHELL_HTML),
        )
        expect(_legacyLookups.postByPath).toHaveBeenCalledTimes(1)
        expect(await isLegacyResting()).toBe(true)
    })

    it('the challenge page reddit sends for every legacy page ends the tiebreak and rests the legacy pages', async () => {
        _legacyLookups.postByPath = vi.fn(async () => ({
            error: 'challenge page: reddit refuses legacy pages',
            refused: true,
        }))
        await verifyFeedAbsentItems(
            ['t3_a', 't3_b', 't3_c'],
            {},
            vi.fn(async () => SHELL_HTML),
        )
        expect(_legacyLookups.postByPath).toHaveBeenCalledTimes(1)
        expect(await isLegacyResting()).toBe(true)
    })

    it('the legacy marker matches only as a whole query parameter', () => {
        expect(isLegacyPageUrl('https://www.reddit.com/user/x/?rv_legacy=1')).toBe(true)
        expect(isLegacyPageUrl('https://www.reddit.com/comments/a/?sort=new&rv_legacy=1&x=2')).toBe(true)
        expect(isLegacyPageUrl('https://www.reddit.com/user/x/?rv_legacy=10')).toBe(false)
        expect(isLegacyPageUrl('https://www.reddit.com/user/x/?xrv_legacy=1')).toBe(false)
    })
})
