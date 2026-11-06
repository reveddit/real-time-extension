// Rests after Reddit refuses a method: the legacy listing and the legacy pages
// rest apart, and the capability rests escalate with each refusal in a row.

// Install chrome global BEFORE any source import
import '../mocks/chrome-api.js'

import { describe, it, expect, vi } from 'vitest'
import { __getLocalStorage } from '../mocks/webextension-polyfill.js'
import { verifyFeedAbsentItems } from '../../src/src/page-verify'
import { _legacyLookups, isLegacyResting, noteLegacyRefusal } from '../../src/src/legacy-lookup'
import { lookupItemsByID } from '../../src/src/requests'
import { CAPABILITY_REST_KEY } from '../../src/src/news'
import {
    CAPABILITY_MAX_REST_MS,
    CAPABILITY_FIRST_REST_MS,
    capabilityRestMs,
    isCapabilityResting,
    noteCapabilityRefused,
    noteCapabilityWorked,
} from '../../src/src/request-gates'
import { SHELL_HTML } from '../mocks/www-fetch-hooks.js'
import { USER, FRONT_PAGE, GONE, meta, useLegacyStub } from '../mocks/public-profile.js'

useLegacyStub()

describe('legacy listing and legacy pages rest apart', () => {
    // seen in Firefox on 2026-10-25: reddit refused the /api/info listing while
    // the post pages answered, and one shared rest made each undo the other
    it('a refused listing keeps resting when a post page answers in the same cycle', async () => {
        _legacyLookups.commentsById = vi.fn(async () => {
            throw new Error('legacy reddit HTML request failed: 403')
        })
        _legacyLookups.postByPath = vi.fn(async () => ({ is_removed: false }))
        await verifyFeedAbsentItems(
            ['t1_a', 't3_b'],
            {},
            vi.fn(async () => SHELL_HTML),
            ['t1_canary'],
        )
        expect(await isLegacyResting('legacy_info')).toBe(true)
        expect(await isLegacyResting()).toBe(false)
        // the next cycle skips the listing but still reads post pages
        _legacyLookups.commentsById.mockClear()
        _legacyLookups.postByPath.mockClear()
        __getLocalStorage().www_absent_item_verdicts = {}
        await verifyFeedAbsentItems(
            ['t1_a', 't3_b'],
            {},
            vi.fn(async () => SHELL_HTML),
            ['t1_canary'],
        )
        expect(_legacyLookups.commentsById).not.toHaveBeenCalled()
        expect(_legacyLookups.postByPath).toHaveBeenCalled()
    })
})

// Reddit refused the legacy endpoints in every cache mode on 2026-10-21, and
// each failed public-view lookup still sent them two refused requests
describe('legacy refusal memory', () => {

    it('after a real 403, the legacy listing rests instead of being refused again each cycle', async () => {
        const calls = []
        globalThis.fetch = async url => {
            calls.push(String(url))
            return { ok: false, status: 403, text: async () => 'BLOCK' }
        }
        const lookup = () => lookupItemsByID([GONE], 'none', false, USER, { [GONE]: meta(GONE) })
        await expect(lookup()).rejects.toThrow(/legacy fallback: legacy reddit HTML request failed: 403$/)
        expect(await isLegacyResting('legacy_info')).toBe(true)
        // the legacy pages answer separately and keep going
        expect(await isLegacyResting()).toBe(false)
        const legacyCalls = () => calls.filter(u => u.includes('api/info')).length
        // the HTML request; the JSON one behind it rests already
        expect(legacyCalls()).toBe(1)
        await expect(lookup()).rejects.toThrow(
            /legacy fallback: legacy reddit HTML skipped: resting after reddit refused it$/,
        )
        expect(legacyCalls()).toBe(1)
        // neither is reported as rate limiting or a block: the public view's failure is what reports
        expect(__getLocalStorage().error_status).toBeUndefined()
    })

    it("the simulated deprecation's 403 and other statuses start no rest", async () => {
        noteLegacyRefusal(new Error('legacy reddit HTML request failed: 403 (legacy endpoints disabled)'))
        noteLegacyRefusal(new Error('legacy reddit HTML request failed: 500'))
        expect(await isLegacyResting()).toBe(false)
    })

    it('a rest recorded further ahead than the longest rest (a clock set back) is ignored', async () => {
        __getLocalStorage()[CAPABILITY_REST_KEY] = {
            legacy: { refusals: 1, until: Date.now() + 4 * CAPABILITY_MAX_REST_MS, since: Date.now() },
        }
        expect(await isLegacyResting()).toBe(false)
    })

    it("posts go to the pending-post queue even while reddit refuses the legacy listing", async () => {
        // the public view is down: every route gets a page that isn't the profile
        globalThis.fetch = async () => ({ ok: true, status: 200, text: async () => FRONT_PAGE })
        __getLocalStorage()[CAPABILITY_REST_KEY] = {
            legacy_info: { refusals: 1, until: Date.now() + 3600 * 1000, since: Date.now() },
        }
        await expect(
            lookupItemsByID(['t3_queued1', 't3_private1', 't3_quar1', GONE], 'none', false, USER, {
                [GONE]: meta(GONE),
                // their legacy pages answer 403 logged out, which reads like reddit refusing every page
                t3_private1: { locked: false, subreddit_type: 'private' },
                t3_quar1: { locked: false, quarantine: true },
            }),
        ).rejects.toThrow()
        expect(__getLocalStorage().pending_post_lookups).toEqual(['t3_queued1'])
    })
})

// Methods reddit refuses outright rest longer with each refusal in a row, up to
// a week, and are tried again after every rest: none is given up for good.
describe('the escalating rest after a refusal', () => {
    it('doubles from 6 hours to a weekly cap', () => {
        const hours = [1, 2, 3, 4, 5, 6, 7, 20].map(n => capabilityRestMs(n) / 3600000)
        expect(hours).toEqual([6, 12, 24, 48, 96, 168, 168, 168])
        expect(capabilityRestMs(1)).toBe(CAPABILITY_FIRST_REST_MS)
    })

    it('escalates only on tries the rest allowed, and one success ends it', async () => {
        await noteCapabilityRefused('api_info', 'block page')
        expect(await isCapabilityResting('api_info')).toBe(true)
        // a refusal while resting (a path that ignores the rest) adds nothing
        await noteCapabilityRefused('api_info', 'block page')
        expect(__getLocalStorage()[CAPABILITY_REST_KEY].api_info.refusals).toBe(1)
        // the rest runs out, the next try is refused: twice as long
        __getLocalStorage()[CAPABILITY_REST_KEY].api_info.until = Date.now() - 1000
        expect(await isCapabilityResting('api_info')).toBe(false)
        await noteCapabilityRefused('api_info', 'block page')
        const rest = __getLocalStorage()[CAPABILITY_REST_KEY].api_info
        expect(rest.refusals).toBe(2)
        expect(rest.until - Date.now()).toBeGreaterThan(2 * CAPABILITY_FIRST_REST_MS - 5000)
        await noteCapabilityWorked('api_info')
        expect(__getLocalStorage()[CAPABILITY_REST_KEY].api_info).toBeUndefined()
        expect(await isCapabilityResting('api_info')).toBe(false)
    })

    it('after the clock was set back, a refusal starts a new rest instead of finding the old one running', async () => {
        __getLocalStorage()[CAPABILITY_REST_KEY] = {
            api_info: { refusals: 6, until: Date.now() + CAPABILITY_MAX_REST_MS + 24 * 3600 * 1000, since: 1 },
        }
        expect(await isCapabilityResting('api_info')).toBe(false)
        await noteCapabilityRefused('api_info', 'block page')
        expect(await isCapabilityResting('api_info')).toBe(true)
        expect(__getLocalStorage()[CAPABILITY_REST_KEY].api_info.refusals).toBe(7)
    })
})
