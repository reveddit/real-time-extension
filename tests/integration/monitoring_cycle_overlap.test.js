// A cycle slowed past the overlap window lets the next alarm's start, and only
// the newest cycle's end says none is running any more. A trigger that comes
// while a cycle starts is skipped, and one skipped before its cycle starts
// holds up nothing.

// Install chrome global BEFORE any source import
import '../mocks/chrome-api.js'

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import browserMock, { __resetStorage, __getSyncStorage, __getLocalStorage } from '../mocks/webextension-polyfill.js'
import { res } from '../mocks/responses.js'
import { fill, cookiesApi } from '../mocks/cookies.js'
import { getDiagEntries } from '../mocks/diag-entries.js'
import { checkForChanges, isCycleInFlight } from '../../src/src/monitoring'
import { clearDiagLog } from '../../src/src/diaglog'
import { VIEWER_CONNECT_KEY } from '../../src/src/viewer'

const lines = async text => (await getDiagEntries()).filter(entry => entry.m.includes(text)).length

beforeEach(async () => {
    await clearDiagLog()
    // With a client id of their own, each cycle first asks reddit for a token
    __resetStorage({
        options: { custom_clientid: 'someclient', removal_status: { track: true }, lock_status: { track: true } },
        user_subscriptions: {},
        other_subscriptions: {},
    })
    // No login, so nothing else is sent
    fill([])
    browserMock.cookies = cookiesApi
})

afterEach(() => {
    delete browserMock.cookies
})

describe('a cycle that ends while a newer one runs', () => {
    it("doesn't let a third start meanwhile", async () => {
        vi.useFakeTimers({ toFake: ['Date'] })
        const answers = []
        vi.stubGlobal('fetch', () => new Promise(resolve => answers.push(resolve)))
        await checkForChanges()
        await vi.waitFor(() => expect(answers).toHaveLength(1))
        vi.setSystemTime(Date.now() + 3 * 60 * 1000)
        await checkForChanges()
        await vi.waitFor(() => expect(answers).toHaveLength(2))

        vi.setSystemTime(Date.now() + 1000)
        answers[0](res(500, ''))
        await vi.waitFor(async () => expect(await lines('cycle done')).toBe(1))
        // The next alarm
        vi.setSystemTime(Date.now() + 60 * 1000)
        await checkForChanges()
        expect(await lines('cycle start')).toBe(2)
        expect(await lines('previous cycle still running')).toBe(1)

        answers[1](res(500, ''))
        await vi.waitFor(async () => expect(await lines('cycle done')).toBe(2))
        expect(__getSyncStorage().last_check).toBeDefined()
    })
})

describe('the start of a cycle', () => {
    // A millisecond on with every reading, so no two cycles start in the same
    // one. The cycle's times outlive a test, so each test starts an hour on,
    // past whatever a test before it left running.
    let clock = Date.now()
    beforeEach(() => {
        clock += 60 * 60 * 1000
        vi.spyOn(Date, 'now').mockImplementation(() => ++clock)
        // The token request answers at once
        vi.stubGlobal('fetch', async () => res(500, ''))
    })

    it("leaves none running once over, when a manual check comes during an alarm's first reads", async () => {
        // The alarm's jitter, past the manual check's end
        vi.spyOn(Math, 'random').mockReturnValue(0.01)
        const alarm = checkForChanges(true)
        const manual = checkForChanges(false, { bypassBackoff: true })
        await Promise.all([alarm, manual])
        await vi.waitFor(async () => expect(await lines('cycle done')).toBe(await lines('cycle start')))
        expect(isCycleInFlight()).toBe(false)
    })

    it.each([
        ['a second account signs in', () => ({ [VIEWER_CONNECT_KEY]: { started: Date.now(), main: [] } })],
        ['a rate-limit backoff runs', () => ({ rate_limit_until: Date.now() + 60 * 1000 })],
    ])("skipped while %s, leaves none running and doesn't hold up the next trigger", async (_, skipFor) => {
        const reason = skipFor()
        Object.assign(__getLocalStorage(), reason)
        await checkForChanges(true)
        expect(await lines('skipping')).toBe(1)
        expect(isCycleInFlight()).toBe(false)
        for (const key of Object.keys(reason)) delete __getLocalStorage()[key]
        await checkForChanges()
        expect(await lines('cycle start')).toBe(1)
        await vi.waitFor(async () => expect(await lines('cycle done')).toBe(1))
    })
})
