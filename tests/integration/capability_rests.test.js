// Rests after Reddit refuses a method: they escalate with each refusal in a row.

// Install chrome global BEFORE any source import
import '../mocks/chrome-api.js'

import { describe, it, expect } from 'vitest'
import { __getLocalStorage } from '../mocks/webextension-polyfill.js'
import { CAPABILITY_REST_KEY } from '../../src/src/news'
import {
    CAPABILITY_MAX_REST_MS,
    CAPABILITY_FIRST_REST_MS,
    capabilityRestMs,
    dropRetiredRests,
    isCapabilityResting,
    noteCapabilityRefused,
    noteCapabilityWorked,
} from '../../src/src/request-gates'
import { usePublicLookupHooks } from '../mocks/public-profile.js'

usePublicLookupHooks()

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

    it('a rest of a method this version no longer has is dropped, and the others stay', async () => {
        const rest = { refusals: 1, until: Date.now() + 3600 * 1000, since: 1 }
        __getLocalStorage()[CAPABILITY_REST_KEY] = {
            legacy: rest,
            legacy_info: rest,
            oauth: rest,
            api_info: rest,
            thread_json: rest,
        }
        await dropRetiredRests()
        expect(Object.keys(__getLocalStorage()[CAPABILITY_REST_KEY])).toEqual(['api_info', 'thread_json'])
    })
})
