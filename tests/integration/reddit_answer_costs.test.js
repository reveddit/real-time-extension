// What the background does for each of Reddit's answers. Reddit replaces its
// session_tracker cookie with most of them, its pages' own requests included
// (74 of 96 on 2026-11-09), so work done per cookie change is done per answer.
// Survey reports of lag came down to that: a save of the whole cookie snapshot
// at every change, handed by the browser to every Reddit tab that listened to
// storage. Now a new value for a cookie that isn't a login's is only counted,
// the saved copy takes it at the next check or page load, and the tabs hear
// only of what their bells show.

// Install chrome global BEFORE any source import
import '../mocks/chrome-api.js'

import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest'
import browserMock, { __resetStorage, __getLocalStorage } from '../mocks/webextension-polyfill.js'
import { loadBackground } from '../mocks/background.js'
import { cookie, fill, jar } from '../mocks/cookies.js'
import { getDiagEntries } from '../mocks/diag-entries.js'
import { clearDiagLog } from '../../src/src/diaglog'
import { logActivityHourly, _resetActivityCounts } from '../../src/src/activity-counts'
import { BELLS_CHANGED, FEEDBACK_FORM } from '../../src/src/common'

let background

beforeAll(async () => {
    background = await loadBackground()
    // What it does as it starts, so none of that is taken for a test's own work
    await new Promise(resolve => setTimeout(resolve, 50))
})

const REDDIT_TAB = { id: 5, url: 'https://www.reddit.com/r/x/' }

beforeEach(() => {
    __resetStorage({ options: {}, user_subscriptions: {}, other_subscriptions: {} })
    vi.useFakeTimers()
    // A Reddit tab is open, without which nothing is saved, and the browser's
    // cookies are the jar's
    vi.spyOn(chrome.tabs, 'query').mockImplementation((query, callback) => callback([REDDIT_TAB]))
    vi.spyOn(chrome.cookies, 'getAll').mockImplementation((query, callback) => callback([...jar.values()]))
})

afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
})

// Reddit gives a cookie a new value: the old one's removal, then the new one
const changed = c => {
    background.cookieChanged({ removed: true, cause: 'overwrite', cookie: c })
    background.cookieChanged({ removed: false, cause: 'explicit', cookie: c })
}
const saved = name => __getLocalStorage().stored_reddit_cookie_objects?.find(c => c.name === name)?.value

describe("Reddit's cookie changes", () => {
    const answer = tracker => {
        fill([cookie('reddit_session', 'S1'), cookie('session_tracker', tracker)])
        changed(cookie('session_tracker', tracker))
    }

    it('are only counted when a cookie that is not a login gets a new value', async () => {
        // The login cookies' names are read once, then remembered (background.ts)
        answer('a')
        await vi.advanceTimersByTimeAsync(0)
        const storage = [chrome.storage.local, browserMock.storage.local].flatMap(area => [
            vi.spyOn(area, 'get'),
            vi.spyOn(area, 'set'),
        ])
        for (let i = 0; i < 50; i++) answer(`t${i}`)
        await vi.advanceTimersByTimeAsync(60 * 1000)
        expect(chrome.tabs.query).not.toHaveBeenCalled()
        expect(chrome.cookies.getAll).not.toHaveBeenCalled()
        for (const call of storage) expect(call).not.toHaveBeenCalled()
        expect(saved('session_tracker')).toBeUndefined()
    })

    it('are saved when a Reddit page loads', async () => {
        answer('a')
        await vi.advanceTimersByTimeAsync(0)
        expect(saved('session_tracker')).toBeUndefined()
        background.pageLoaded(REDDIT_TAB.id, REDDIT_TAB.url)
        await vi.advanceTimersByTimeAsync(0)
        expect(saved('session_tracker')).toBe('a')
    })

    // A check that puts missing cookies back mustn't sign back in a user who
    // just signed out
    it('save a login that comes or goes at once', async () => {
        fill([cookie('reddit_session', 'S2'), cookie('session_tracker', 'b')])
        changed(cookie('reddit_session', 'S2'))
        await vi.advanceTimersByTimeAsync(0)
        expect(saved('reddit_session')).toBe('S2')
        fill([cookie('session_tracker', 'c')])
        background.cookieChanged({ removed: true, cause: 'explicit', cookie: cookie('reddit_session', 'S2') })
        await vi.advanceTimersByTimeAsync(0)
        expect(saved('reddit_session')).toBeUndefined()
    })

    // Nor may such a check bring back any other cookie Reddit took away
    it("save any cookie's going at once", async () => {
        fill([cookie('reddit_session', 'S1'), cookie('session_tracker', 'a'), cookie('loid', 'L1')])
        background.pageLoaded(REDDIT_TAB.id, REDDIT_TAB.url)
        await vi.advanceTimersByTimeAsync(0)
        expect(saved('loid')).toBe('L1')
        fill([cookie('reddit_session', 'S1'), cookie('session_tracker', 'a')])
        background.cookieChanged({ removed: true, cause: 'expired_overwrite', cookie: cookie('loid', 'L1') })
        await vi.advanceTimersByTimeAsync(0)
        expect(saved('loid')).toBeUndefined()
        expect(saved('reddit_session')).toBe('S1')
    })

    // The background counts, and the check cycle writes the line (activity-counts.ts)
    it("are in the hour's line of the saved log: each new value once, each save, and what was written", async () => {
        const START = Date.UTC(2026, 10, 9, 14, 2)
        vi.setSystemTime(START)
        _resetActivityCounts()
        await clearDiagLog()
        for (const tracker of ['a', 'b', 'c']) answer(tracker)
        fill([cookie('reddit_session', 'S2'), cookie('session_tracker', 'c')])
        changed(cookie('reddit_session', 'S2'))
        // 2 KB as JSON, with its quotes
        background.storageChanged({ a: { newValue: 'x'.repeat(2046) } }, 'local')
        await vi.advanceTimersByTimeAsync(0)
        vi.setSystemTime(START + 60 * 60 * 1000)
        await logActivityHourly()
        const lines = (await getDiagEntries()).map(e => e.m).filter(m => m.startsWith('[reveddit] activity'))
        expect(lines).toEqual([
            '[reveddit] activity since 2026-11-09T14:02Z: Reddit cookie changes 4, cookie copies saved 1, storage written 2 KB',
        ])
    })
})

describe('what Reddit tabs are told', () => {
    let sent
    beforeEach(() => {
        sent = []
        vi.spyOn(browserMock.tabs, 'query').mockResolvedValue([REDDIT_TAB, { id: 6, url: 'https://old.reddit.com/' }])
        vi.spyOn(browserMock.tabs, 'sendMessage').mockImplementation(async (tabId, message) => {
            sent.push([tabId, message])
        })
    })

    it('what is followed now, and who is signed in, when either changes', async () => {
        background.storageChanged({ other_subscriptions: { oldValue: {}, newValue: { t1_a: { t: 1 } } } }, 'sync')
        background.storageChanged({ last_logged_in_user: { oldValue: 'alice', newValue: 'bob' } }, 'local')
        background.storageChanged({ last_logged_in_user: { oldValue: 'bob' } }, 'local')
        await vi.advanceTimersByTimeAsync(0)
        expect(sent).toEqual([
            [5, { action: BELLS_CHANGED, followed: { t1_a: { t: 1 } } }],
            [6, { action: BELLS_CHANGED, followed: { t1_a: { t: 1 } } }],
            [5, { action: BELLS_CHANGED, me: 'bob' }],
            [6, { action: BELLS_CHANGED, me: 'bob' }],
            [5, { action: BELLS_CHANGED, me: '' }],
            [6, { action: BELLS_CHANGED, me: '' }],
        ])
    })

    it('nothing for a write that changes nothing (Firefox reports one), or for anything else', async () => {
        background.storageChanged({ last_logged_in_user: { oldValue: 'alice', newValue: 'alice' } }, 'local')
        background.storageChanged(
            { other_subscriptions: { oldValue: { t1_a: { t: 1 } }, newValue: { t1_a: { t: 1 } } } },
            'sync',
        )
        background.storageChanged({ stored_reddit_cookie_objects: { newValue: [cookie('session_tracker', 'x')] } }, 'local')
        background.storageChanged({ last_logged_in_user: { newValue: 'bob' } }, 'sync')
        await vi.advanceTimersByTimeAsync(0)
        expect(sent).toEqual([])
    })
})

describe('the survey after an uninstall', () => {
    // Its manifest says the extension collects nothing (common.ts feedbackFormLink)
    it('is the plain form on Firefox, set at install, update and browser start', () => {
        const setUninstallURL = vi.fn()
        chrome.runtime.setUninstallURL = setUninstallURL
        try {
            background.install({ reason: 'install' })
            background.install({ reason: 'update', previousVersion: '0.0.5.29' })
            background.startUp()
            expect(setUninstallURL.mock.calls).toEqual([[FEEDBACK_FORM], [FEEDBACK_FORM], [FEEDBACK_FORM]])
        } finally {
            delete chrome.runtime.setUninstallURL
        }
    })
})
