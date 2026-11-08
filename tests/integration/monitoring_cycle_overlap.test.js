// A cycle slowed past the overlap window lets the next alarm's start, and only
// the newest cycle's end says none is running any more.

// Install chrome global BEFORE any source import
import '../mocks/chrome-api.js'

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import browserMock, { __resetStorage, __getSyncStorage } from '../mocks/webextension-polyfill.js'
import { res } from '../mocks/responses.js'
import { fill, cookiesApi } from '../mocks/cookies.js'
import { getDiagEntries } from '../mocks/diag-entries.js'
import { checkForChanges } from '../../src/src/monitoring'
import { clearDiagLog } from '../../src/src/diaglog'

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
