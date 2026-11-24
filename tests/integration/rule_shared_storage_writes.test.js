// Some objects in storage are read, changed and written back whole. When two
// writes of one overlap, the second drops the first one's change. So every
// object that more than one path writes, or that one path can write twice at
// once, either has its writes made one at a time through a shared chain
// (storage.ts oneAtATime, viewer.ts inTurn, reddit-cookies.ts's save queue),
// or is written by only one context, in sequence. Then no update is lost
// however the writes interleave. Parallel clearPendingNotification calls once
// lost each other's deletes this way, and the same pattern sits under other
// keys.
//
// Each row is one object and two of its writers, run so they overlap: the
// first is held at its read of the object while the second runs, and then
// writes what it read. A row passes when both changes survive. A writer that
// waits its turn behind the first (a chain) can't run meanwhile, so the read
// goes on after a while and the second runs after it. Where a writer is a
// page's (the popup, a content script), it comes from the page's own copy of
// the modules, as a page loads them: a chain in the background's copy can't
// order the page's writes. The row's `page` names that module, loaded before
// the writers start, as a page is loaded before anyone clicks in it: an import
// during the overlap can outlast its wait, and the page's writer then runs
// after the row is checked. Add a row for a new object that's rewritten
// whole, or a new writer of one. An object only one context may write gets a
// row that checks the guard that keeps the others out.

// Install chrome global BEFORE any source import
import '../mocks/chrome-api.js'

import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest'
import browserMock, { __resetStorage, __getSyncStorage, __getLocalStorage } from '../mocks/webextension-polyfill.js'
import { loadBackground } from '../mocks/background.js'
import { cookie, fill, jar, cookiesApi } from '../mocks/cookies.js'
import { json, res, blockPage } from '../mocks/responses.js'
import {
    FOLLOWED_NOTIFICATION,
    getObjectNamesForThing,
    getUserInit,
    setPendingNotification,
    clearPendingNotification,
    appendNotificationLog,
    getNotificationLog,
    setBacklogSummaryInstalledAt,
    markBacklogInitialNotified,
    markBacklogSummarySent,
    getBacklogSummaryState,
    addLocalStorageItems,
    subscribeId,
    unsubscribeId,
    subscribeUser,
    recordRateLimitHit,
    clearRateLimitBackoff,
    keepPageText,
    markIDsAsSeenIfSubscribed,
    PAGE_WRITE,
} from '../../src/src/storage'
import { noteCapabilityRefused, noteCapabilityWorked, dropRetiredRests } from '../../src/src/request-gates'
import { CAPABILITY_REST_KEY } from '../../src/src/news'
import { setCurrentStateForId, _checkForChanges_thing_byId, checkForChanges } from '../../src/src/monitoring'
import { FOLLOWED_POST_IDS_KEY, _followedTiming } from '../../src/src/followed-lookup'
import { lookupItemsByID } from '../../src/src/requests'
import { _resetLoggedInFetchState } from '../../src/src/logged-in-fetch'
import {
    VIEWER_CONNECT_KEY,
    startViewerConnect,
    cancelViewerConnect,
    finishViewerConnect,
    recoverViewerConnect,
} from '../../src/src/viewer'
import { storeRedditCookies } from '../../src/src/reddit-cookies'
import { getWwwHtmlFetcher, WWW_ROUTE_STATE_KEY } from '../../src/src/www-fetcher'
import { PUBLIC_COOKIES_KEY } from '../../src/src/public-cookies'

// --- The install ---

const NOW = Math.floor(Date.now() / 1000)
const USER = 'alice'
const mine = getObjectNamesForThing(USER, true)
const SYNC = {
    options: {
        seen_count: 2,
        interval: 1,
        removal_status: { track: true, notify: true },
        lock_status: { track: true, notify: true },
    },
    user_subscriptions: { [USER]: true },
    user_unsubscriptions: {},
    other_subscriptions: { t1_followed: { t: NOW - 3600 } },
    ...getUserInit(USER),
    [mine.removed]: { t1_old: { c: NOW - 600, u: true, p: 't3_post' } },
    // Followed items' lists, as an install starts them
    ...Object.fromEntries(
        Object.entries(getObjectNamesForThing('other', false)).map(([type, key]) => [
            key,
            type === 'changes' ? [] : {},
        ]),
    ),
}
const pendingEntry = (thing, itemIds) => ({
    thing,
    count: itemIds.length,
    types: ['mod removed'],
    itemIds,
    firstAttemptAt: Date.now() - 3 * 60 * 1000,
    attempts: 1,
})
const pendingData = itemIds => {
    const { thing, ...data } = pendingEntry('', itemIds)
    return data
}
const logEntry = id => ({ ts: Date.now(), id, title: id, message: '1 new [mod removed] actions', source: 'recent' })
const record = t => ({ t, c: NOW - 600, p: 't3_post', o: NOW - 300, n: 0, r: 0 })
const rest = () => ({ refusals: 1, until: Date.now() + 3600 * 1000, since: Date.now() })
const callback = run => () => new Promise(resolve => run(resolve))

// An item as reddit shows it removed, and as its author still sees it
const removedView = name => ({
    name,
    author: '[deleted]',
    body: '[removed]',
    created_utc: NOW - 600,
    link_id: 't3_post',
    locked: false,
})
const authorsView = name => ({ ...removedView(name), author: USER, body: 'words of mine' })
// The cycle's check of the account finding a new removal, recorded at once,
// without the count of confirming checks
const checkFindsRemoval = (name, user = USER) =>
    _checkForChanges_thing_byId(
        [name],
        user,
        true,
        structuredClone(__getSyncStorage()),
        2,
        { [name]: authorsView(name) },
        [{ data: removedView(name) }],
        true,
    )

// A followed comment's thread, as reddit answers it with the user's login
const threadOf = (post, comment) =>
    json(200, [
        { kind: 'Listing', data: { children: [{ kind: 't3', data: { name: post } }] } },
        { kind: 'Listing', data: { children: [{ kind: 't1', data: { name: comment, author: 'bob', body: 'text' } }] } },
    ])

// --- Contexts ---

// A page's own copy of a module, as the popup or a content script loads its
// own: its module-level state, such as a chain of writes, isn't the
// background's, and its storage is the same
const inPage = async path => {
    vi.resetModules()
    const pageBrowser = (await import('../mocks/webextension-polyfill.js')).default
    Object.assign(pageBrowser, { storage: browserMock.storage, cookies: cookiesApi })
    return import(path)
}

// --- Overlapping two writers ---

const turns = async (n = 20) => {
    for (let i = 0; i < n; i++) await new Promise(resolve => setImmediate(resolve))
}

// The read a row holds: the nth read, once the row starts, that takes in one
// of its keys. It's answered with what was stored when it was made, once
// until() is done.
let held = null
const keyNames = keys =>
    keys == null ? null : typeof keys === 'string' ? [keys] : Array.isArray(keys) ? keys : Object.keys(keys)
const holdingReads = area => {
    const get = area.get
    vi.spyOn(area, 'get').mockImplementation((keys, done) => {
        const names = keyNames(keys)
        if (held && !held.reached && (!names || names.some(name => held.keys.includes(name)))) {
            if (++held.seen === held.nth) {
                held.reached = true
                const stored = get.call(area, keys)
                return held
                    .until()
                    .then(() => stored)
                    .then(result => {
                        done?.(result)
                        return result
                    })
            }
        }
        return get.call(area, keys, done)
    })
}

// first runs to its nth read of the object, then second runs while that read
// waits, so both start before either writes. A second that waits its turn
// behind first doesn't finish meanwhile, and the read goes on after a while.
const overlap = async ({ keys, nth = 1, first, second }) => {
    let secondDone = null
    held = {
        keys: [].concat(keys),
        nth,
        seen: 0,
        reached: false,
        until: () => {
            secondDone = Promise.resolve().then(second)
            return Promise.race([secondDone.then(turns, turns), turns(100)])
        },
    }
    const firstDone = Promise.resolve().then(first)
    await Promise.race([firstDone.then(turns, turns), turns(400)])
    expect(held.reached, "the first writer's read of the object").toBe(true)
    await Promise.race([Promise.allSettled([firstDone, secondDone]), turns(400)])
    // And the writes neither waits for, such as a follow's save
    await turns()
    held = null
}

// --- The table ---

const pendingNames = () => Object.keys(__getLocalStorage().pending_notifications || {}).sort()

const overlaps = [
    // pending_notifications (storage.ts updateLocal): the cycle's announce and
    // retry, a click on a notification, the popup's rows, an update
    {
        name: "the account's and followed items' notifications, each cleared once it shows, both leave pending",
        local: {
            pending_notifications: {
                [USER]: pendingEntry(USER, ['t1_old']),
                [FOLLOWED_NOTIFICATION]: pendingEntry(FOLLOWED_NOTIFICATION, ['t1_followed']),
            },
        },
        keys: 'pending_notifications',
        first: () => clearPendingNotification(USER),
        second: () => clearPendingNotification(FOLLOWED_NOTIFICATION),
        expect: () => expect(pendingNames()).toEqual([]),
    },
    {
        name: "followed items' notification kept pending while a click clears the account's",
        local: { pending_notifications: { [USER]: pendingEntry(USER, ['t1_old']) } },
        keys: 'pending_notifications',
        first: () => setPendingNotification(FOLLOWED_NOTIFICATION, pendingData(['t1_followed'])),
        second: () => background.clickNotification(`${USER}|1700000000000`),
        expect: () => expect(pendingNames()).toEqual([FOLLOWED_NOTIFICATION]),
    },
    {
        name: "the cycle's notification kept pending while the popup's row for the account clears its own",
        local: { pending_notifications: { [USER]: pendingEntry(USER, ['t1_old']) } },
        keys: 'pending_notifications',
        page: '../../src/src/storage',
        first: () => setPendingNotification(FOLLOWED_NOTIFICATION, pendingData(['t1_followed'])),
        second: ({ page }) => page.clearPendingNotification(USER),
        expect: () => expect(pendingNames()).toEqual([FOLLOWED_NOTIFICATION]),
    },

    // notification_log (storage.ts appendNotificationLog)
    {
        name: "the notification log keeps the account's and followed items' announcements",
        keys: 'notification_log',
        first: () => appendNotificationLog(logEntry(USER)),
        second: () => appendNotificationLog(logEntry(FOLLOWED_NOTIFICATION)),
        expect: async () =>
            expect((await getNotificationLog()).map(e => e.id).sort()).toEqual([USER, FOLLOWED_NOTIFICATION].sort()),
    },

    // backlog_summary (storage.ts updateBacklogSummary)
    {
        name: "the backlog summary's state keeps an update's summary sent and the first check's backlog",
        keys: 'backlog_summary',
        first: () => markBacklogInitialNotified(['t1_old']),
        second: () => markBacklogSummarySent(),
        expect: async () =>
            expect(await getBacklogSummaryState()).toMatchObject({
                initialBacklogNotified: true,
                initialNotifiedIds: ['t1_old'],
                summarySent: true,
            }),
    },
    {
        name: "the backlog summary's state keeps the install time and the first check's backlog",
        keys: 'backlog_summary',
        first: () => setBacklogSummaryInstalledAt(1700000000000),
        second: () => markBacklogInitialNotified(['t1_old']),
        expect: async () =>
            expect(await getBacklogSummaryState()).toMatchObject({
                installedAt: 1700000000000,
                initialNotifiedIds: ['t1_old'],
            }),
    },

    // The items caches (storage.ts addLocalStorageItems): every check's save,
    // and a follow's check, which runs beside the cycle's
    {
        name: "followed items' cache keeps what a follow's check and the cycle's check each save",
        keys: 'items_other',
        first: () => addLocalStorageItems({ t1_a: record('words a') }, 'other', false),
        second: () => addLocalStorageItems({ t1_b: record('words b') }, 'other', false),
        expect: () => expect(Object.keys(__getLocalStorage().items_other).sort()).toEqual(['t1_a', 't1_b']),
    },
    {
        name: "followed items' cache keeps the cycle's save and the popup's follow check's save",
        keys: 'items_other',
        page: '../../src/src/storage',
        first: () => addLocalStorageItems({ t1_a: record('words a') }, 'other', false),
        second: ({ page }) => page.addLocalStorageItems({ t1_b: record('words b') }, 'other', false),
        expect: () => expect(Object.keys(__getLocalStorage().items_other).sort()).toEqual(['t1_a', 't1_b']),
    },

    // other_subscriptions: follow buttons (content scripts), the popup's
    // switches, the link menu (background), the followed items page
    {
        name: "following a comment and its post with the popup's two switches follows both",
        keys: 'other_subscriptions',
        first: callback(done => subscribeId('t1_a', done)),
        second: callback(done => subscribeId('t3_b', done)),
        expect: () =>
            expect(Object.keys(__getSyncStorage().other_subscriptions).sort()).toEqual(['t1_a', 't1_followed', 't3_b']),
    },
    {
        name: 'following one item from a page while another is unfollowed elsewhere keeps both changes',
        keys: 'other_subscriptions',
        page: '../../src/src/storage',
        first: callback(done => unsubscribeId('t1_followed', done)),
        second: ({ page }) => new Promise(resolve => page.subscribeId('t1_a', resolve)),
        expect: () => expect(Object.keys(__getSyncStorage().other_subscriptions)).toEqual(['t1_a']),
    },

    // user_subscriptions (storage.ts subscribeUser): Connect and install
    // (background), the link menu (background), reddit's pages (content script)
    {
        name: "an account followed from the link menu while a reddit page subscribes whoever's signed in",
        keys: 'user_subscriptions',
        page: '../../src/src/storage',
        first: callback(done => subscribeUser('bob', done, done)),
        second: ({ page }) => new Promise(resolve => page.subscribeUser('carol', resolve, resolve)),
        expect: () => expect(Object.keys(__getSyncStorage().user_subscriptions).sort()).toEqual([USER, 'bob', 'carol']),
    },

    // followed_post_ids: every follow (setCurrentStateForId: the popup, a
    // content script, the link menu) and the cycle's followed lookup
    // (followed-lookup.ts saveFollowedMaps)
    {
        name: "two follows from the link menu, each saving its comment's post",
        // A sign-in under way, so each follow saves and stops there, before its check
        local: { [VIEWER_CONNECT_KEY]: { started: Date.now(), mainUser: USER, main: [] } },
        keys: FOLLOWED_POST_IDS_KEY,
        first: () => setCurrentStateForId('t1_a', 'https://www.reddit.com/r/pics/comments/apost/t/a/'),
        second: () => setCurrentStateForId('t1_b', 'https://www.reddit.com/r/pics/comments/bpost/t/b/'),
        expect: () => expect(__getLocalStorage()[FOLLOWED_POST_IDS_KEY]).toEqual({ t1_a: 'apost', t1_b: 'bpost' }),
    },
    {
        name: "the cycle's followed lookup saving a post it found in the cache while the popup follows a comment",
        sync: { other_subscriptions: { t1_x: { t: NOW - 3600 }, t1_y: { t: NOW - 60 } } },
        local: { items_other: { t1_x: record('words x') } },
        setup: () => {
            __getLocalStorage().items_other.t1_x.p = 't3_xpost'
            fill([cookie('reddit_session', 'S1')])
            vi.stubGlobal('fetch', async url =>
                String(url).includes('/api/info.json') ? blockPage() : threadOf('t3_xpost', 't1_x'),
            )
        },
        // Its second read of the followed maps, as it saves them
        keys: FOLLOWED_POST_IDS_KEY,
        nth: 2,
        page: '../../src/src/monitoring',
        first: () => lookupItemsByID(['t1_x'], '', {}),
        second: ({ page }) => page.setCurrentStateForId('t1_y', 'https://www.reddit.com/r/pics/comments/ypost/t/y/'),
        expect: () => expect(__getLocalStorage()[FOLLOWED_POST_IDS_KEY]).toEqual({ t1_x: 'xpost', t1_y: 'ypost' }),
    },

    // Capability rests (request-gates.ts noteCapabilityRefused,
    // noteCapabilityWorked and dropRetiredRests)
    {
        name: "the capability rests keep a refusal of the thread reads and the api/info read's success",
        local: { [CAPABILITY_REST_KEY]: { api_info: rest() } },
        keys: CAPABILITY_REST_KEY,
        first: () => noteCapabilityRefused('thread_json', 'block page'),
        second: () => noteCapabilityWorked('api_info'),
        expect: () => expect(Object.keys(__getLocalStorage()[CAPABILITY_REST_KEY])).toEqual(['thread_json']),
    },
    {
        name: "the capability rests keep a refusal a check notes while an update drops the retired rests",
        local: { [CAPABILITY_REST_KEY]: { legacy: rest() } },
        keys: CAPABILITY_REST_KEY,
        first: () => dropRetiredRests(),
        second: () => noteCapabilityRefused('thread_json', 'block page'),
        expect: () => expect(Object.keys(__getLocalStorage()[CAPABILITY_REST_KEY])).toEqual(['thread_json']),
    },

    // The account's status lists in sync storage: every check's save, a click
    // on a notification and the popup's rows (markThingAsSeen), a reveddit
    // page's items (markIDsAsSeenIfSubscribed)
    {
        name: "a click on the account's notification marks its items seen while the cycle's check records a removal",
        keys: mine.removed,
        first: () => background.clickNotification(`${USER}|1700000000000`),
        second: () => checkFindsRemoval('t1_new'),
        expect: () => {
            const removed = __getSyncStorage()[mine.removed]
            expect(Object.keys(removed).sort()).toEqual(['t1_new', 't1_old'])
            expect(removed.t1_old.u).toBe(false)
        },
    },
    {
        name: "the account's page on reveddit marks its items seen while the cycle's check records a removal",
        keys: mine.removed,
        page: '../../src/src/storage',
        first: ({ page }) =>
            new Promise(resolve =>
                page.markIDsAsSeenIfSubscribed(USER, true, { t1_old: NOW - 600 }, {}, {}, {}, resolve),
            ),
        second: () => checkFindsRemoval('t1_new'),
        expect: () => {
            const removed = __getSyncStorage()[mine.removed]
            expect(Object.keys(removed).sort()).toEqual(['t1_new', 't1_old'])
            expect(removed.t1_old.u).toBe(false)
        },
    },

    // A new account's lists: its check's first save, and the steps that start
    // whatever lists it doesn't have yet (storage.ts addMissingUserLists): a
    // subscribe, and the cycle's for whoever is signed in
    {
        name: 'a new account subscribed from a reddit page keeps the removal its first check saves meanwhile',
        keys: getObjectNamesForThing('bob', true).removed,
        first: callback(done => subscribeUser('bob', done, done)),
        second: () => checkFindsRemoval('t1_new', 'bob'),
        expect: () => {
            expect(Object.keys(__getSyncStorage()[getObjectNamesForThing('bob', true).removed])).toEqual(['t1_new'])
            expect(__getSyncStorage().user_subscriptions).toHaveProperty('bob')
        },
    },
    {
        name: 'the cycle starting the lists of an account just signed in keeps the removal a check saves meanwhile',
        setup: () => {
            fill([cookie('reddit_session', 'S1')])
            // Reddit says bob is signed in, and has nothing else to say
            vi.stubGlobal(
                'fetch',
                async () =>
                    new Response(JSON.stringify({ kind: 't2', data: { name: 'bob' } }), {
                        headers: { 'content-type': 'application/json' },
                    }),
            )
        },
        keys: getObjectNamesForThing('bob', true).removed,
        // After the cycle's read of all of sync storage
        nth: 2,
        first: () => checkForChanges(),
        second: () => checkFindsRemoval('t1_new', 'bob'),
        expect: () =>
            expect(Object.keys(__getSyncStorage()[getObjectNamesForThing('bob', true).removed])).toEqual(['t1_new']),
    },

    // The rate-limit backoff (storage.ts oneAtATime): a lookup that answered
    // clears a backoff that has run out, and a 429 starts one
    {
        name: "the backoff keeps a 429's hit that comes while a lookup clears the last one",
        local: { rate_limit_level: 2, rate_limit_until: Date.now() - 1000 },
        keys: 'rate_limit_until',
        first: () => clearRateLimitBackoff(),
        second: () => recordRateLimitHit(),
        expect: () => expect(__getLocalStorage().rate_limit_until).toBeGreaterThan(Date.now()),
    },
    {
        name: "the backoff keeps a 429 in the popup's follow lookup that comes while the cycle's lookup clears the last one",
        local: { rate_limit_level: 2, rate_limit_until: Date.now() - 1000 },
        keys: 'rate_limit_until',
        page: '../../src/src/storage',
        first: () => clearRateLimitBackoff(),
        second: ({ page }) => page.recordRateLimitHit(),
        expect: () => expect(__getLocalStorage().rate_limit_until).toBeGreaterThan(Date.now()),
    },

    // The cookie snapshot (reddit-cookies.ts's save queue)
    {
        name: "the cookie snapshot ends with the jar's last cookies when two saves overlap",
        setup: () => {
            fill([cookie('reddit_session', 'S1')])
            vi.spyOn(chrome.tabs, 'query').mockImplementation((query, done) =>
                done([{ id: 3, url: 'https://www.reddit.com/' }]),
            )
            vi.spyOn(chrome.cookies, 'getAll').mockImplementation((query, done) => done([...jar.values()]))
        },
        keys: 'stored_reddit_cookie_objects',
        first: () => storeRedditCookies(),
        second: () => {
            fill([cookie('reddit_session', 'S2')])
            return storeRedditCookies()
        },
        expect: () => expect(__getLocalStorage().stored_reddit_cookie_objects.map(c => c.value)).toEqual(['S2']),
    },

    // viewer_connect: a sign-in starts, saves its tab, and ends (viewer.ts)
    {
        name: 'a sign-in cancelled as its tab opens is over, and stays over once the start saves the tab',
        setup: () => {
            fill([cookie('reddit_session', 'S1')])
            browserMock.tabs.create = vi.fn(async () => ({ id: 7 }))
            browserMock.tabs.update = vi.fn(async () => ({}))
        },
        // The start's second read of the sign-in, to add the tab
        keys: VIEWER_CONNECT_KEY,
        nth: 2,
        first: () => startViewerConnect(USER),
        second: () => cancelViewerConnect('cancelled'),
        expect: () => expect(__getLocalStorage()).not.toHaveProperty(VIEWER_CONNECT_KEY),
    },

    // The www route memory (www-fetcher.ts getWwwHtmlFetcher): one lookup's
    // fetcher, whose kinds of page are fetched in parallel, merges each save
    // into what's stored
    {
        name: 'the www route memory keeps what a profile page and a post page, fetched at once, each learned',
        setup: async context => {
            vi.stubGlobal('fetch', async () => res(200, '<html><body>a page</body></html>'))
            context.fetcher = await getWwwHtmlFetcher()
        },
        keys: WWW_ROUTE_STATE_KEY,
        first: context => context.fetcher.fetchHtml('https://www.reddit.com/user/alice/comments/'),
        second: context => context.fetcher.fetchHtml('https://www.reddit.com/r/pics/comments/abc/t/'),
        expect: () => {
            const state = __getLocalStorage()[WWW_ROUTE_STATE_KEY]
            expect(state.profile?.served?.route).toBeDefined()
            expect(state.page?.served?.route).toBeDefined()
        },
    },
]

// --- Running it ---

let background
const savedTabs = { ...browserMock.tabs }

beforeAll(async () => {
    background = await loadBackground()
    _followedTiming.delayMs = 0
})

beforeEach(() => {
    held = null
    fill([])
    _resetLoggedInFetchState()
    for (const area of [
        browserMock.storage.local,
        browserMock.storage.sync,
        chrome.storage.local,
        chrome.storage.sync,
    ]) {
        holdingReads(area)
    }
})

afterEach(() => {
    held = null
    delete browserMock.tabs.create
    delete browserMock.tabs.update
    Object.assign(browserMock.tabs, savedTabs)
    chrome.extension.inIncognitoContext = false
})

// The keys each set or remove names, in both areas, as chrome.* and browser.* write them
const keysWritten = areas => {
    const keys = new Set()
    for (const area of areas) {
        for (const method of ['set', 'remove']) {
            const write = area[method]
            vi.spyOn(area, method).mockImplementation((items, ...rest) => {
                for (const key of method === 'set' ? Object.keys(items) : [].concat(items)) keys.add(key)
                return write.call(area, items, ...rest)
            })
        }
    }
    return keys
}
const SYNC_AREAS = () => [browserMock.storage.sync, chrome.storage.sync]
const LOCAL_AREAS = () => [browserMock.storage.local, chrome.storage.local]

const startRow = async row => {
    __resetStorage({ ...SYNC, ...row.sync }, row.local ?? {})
    const context = {}
    await row.setup?.(context)
    if (row.page) context.page = await inPage(row.page)
    return context
}

describe('two writes of one object at once both survive', () => {
    it.each(overlaps)('$name', async row => {
        const context = await startRow(row)
        await overlap({
            keys: row.keys,
            nth: row.nth,
            first: () => row.first(context),
            second: () => row.second(context),
        })
        await row.expect()
    })
})

// So a row above can only fail for the overlap: each change shows once the
// two writers run one after the other. The options are saved whole by the
// options page alone (saveOptions), so none of these writers may write them.
describe('the same two writes one after the other', () => {
    it.each(overlaps)('$name', async row => {
        const context = await startRow(row)
        const synced = keysWritten(SYNC_AREAS())
        await row.first(context)
        await turns()
        await row.second(context)
        await turns()
        await row.expect()
        expect(synced).not.toContain('options')
    })
})

// What only the background's checks keep: the www route memory, the page
// verdicts, the failure streaks, the profile control, the second account's
// verdicts and its sign-in, and the cookie snapshot. One check runs at a time
// (rule_check_cycles), so each is written in sequence. The logged-out reads'
// cookies are the background's alone too: it holds them in memory and saves
// them, and a page only reads their marker (public-cookies.ts).
const BACKGROUND_ONLY = [
    WWW_ROUTE_STATE_KEY,
    PUBLIC_COOKIES_KEY,
    'www_post_page_verdicts',
    'www_absent_item_verdicts',
    'www_detect_consecutive_failures',
    'www_detect_tab_failures',
    'absent_verify_consecutive_failures',
    'check_consecutive_failures',
    'own_items_check',
    'posts_tab_unreadable_consecutive',
    'comments_tab_unreadable_consecutive',
    'public_view_unreadable_since',
    'profile_pagination_consecutive_shortfalls',
    'login_detect_consecutive_failures',
    'viewer_lookup_consecutive_failures',
    'viewer_thread_consecutive_failures',
    'viewer_item_verdicts',
    'public_profile_control',
    `public_live_u_${USER}`,
    'stored_reddit_cookie_objects',
    VIEWER_CONNECT_KEY,
]

describe('objects only one context writes', () => {
    // The popup's follow switch runs its own lookup, in the popup (a content
    // script's goes through the background)
    it("a follow's lookup in the popup writes none of what only the background's checks keep", async () => {
        __resetStorage(
            { ...SYNC, other_subscriptions: { t1_x: { t: NOW } } },
            {
                items_other: { t1_x: { ...record('words x'), p: 't3_xpost' } },
                // The background's logged-out cookies, whose marker the page reads
                [PUBLIC_COOKIES_KEY]: { token: 'ab'.repeat(16), cookies: [] },
            },
        )
        fill([cookie('reddit_session', 'S1')])
        vi.stubGlobal('fetch', async url =>
            String(url).includes('/api/info.json') ? blockPage() : threadOf('t3_xpost', 't1_x'),
        )
        const written = keysWritten(LOCAL_AREAS())
        const page = await inPage('../../src/src/requests')
        const found = await page.lookupItemsByID(['t1_x'], '', {})
        expect(found.map(item => item.data.name)).toEqual(['t1_x'])
        expect(written.size).toBeGreaterThan(0)
        expect([...written].filter(key => BACKGROUND_ONLY.includes(key))).toEqual([])
    })

    // A sign-in sets aside and puts back the normal windows' cookies, so only
    // the normal windows' copy of the extension writes viewer_connect: Chrome
    // and Edge's incognito copy (incognito: 'split') shares its storage

    it("the incognito copy doesn't start, end, finish or recover a sign-in", async () => {
        const pending = { started: Date.now() - 20 * 60 * 1000, mainUser: USER, main: [], tabId: 7 }
        __resetStorage(SYNC, { [VIEWER_CONNECT_KEY]: pending })
        chrome.extension.inIncognitoContext = true
        expect(await startViewerConnect(USER)).toEqual({ ok: false, error: 'incognito' })
        await cancelViewerConnect('cancelled')
        await finishViewerConnect(async () => 'helper', 'not_signed_in')
        await recoverViewerConnect(async () => 'helper')
        expect(__getLocalStorage()[VIEWER_CONNECT_KEY]).toEqual(pending)
    })
})

// A content script runs in reddit's or reveddit's origin, which doesn't share
// the extension's locks. So it writes none of these objects itself: each write
// goes to the background (storage.ts byBackground), which makes it in turn with
// the background's and the extension pages' writes.
const PAGE = { protocol: 'https:', hostname: 'www.reveddit.com', href: `https://www.reveddit.com/user/${USER}/` }
const FROM_PAGE = { tab: { id: 9, url: PAGE.href }, url: PAGE.href }
const pageWrites = [
    {
        name: "the follow button's follow",
        write: () => new Promise(resolve => subscribeId('t1_a', resolve)),
        expect: () => expect(__getSyncStorage().other_subscriptions).toHaveProperty('t1_a'),
    },
    {
        name: 'the unfollow button',
        write: () => new Promise(resolve => unsubscribeId('t1_followed', resolve)),
        expect: () => expect(__getSyncStorage().other_subscriptions).not.toHaveProperty('t1_followed'),
    },
    {
        name: "a reddit page subscribing whoever's signed in",
        write: () => new Promise(resolve => subscribeUser('carol', resolve, resolve)),
        expect: () => expect(__getSyncStorage().user_subscriptions).toHaveProperty('carol'),
    },
    {
        name: "the follow button's words, on the record of a comment reddit gives as removed",
        local: { items_other: { t1_followed: record('[removed]') } },
        write: () => keepPageText('t1_followed', 'the words it recovered'),
        expect: () => expect(__getLocalStorage().items_other.t1_followed.t).toBe('the words it recovered'),
    },
    {
        name: "the follow's post, and its first check",
        // A sign-in under way, so the check stops once the post is saved
        local: { [VIEWER_CONNECT_KEY]: { started: Date.now(), mainUser: USER, main: [] } },
        write: () => setCurrentStateForId('t1_a', 'https://www.reveddit.com/v/pics/comments/apost/t/a/'),
        expect: () => expect(__getLocalStorage()[FOLLOWED_POST_IDS_KEY]).toEqual({ t1_a: 'apost' }),
    },
    {
        name: "the account's page on reveddit marking its items seen",
        write: () =>
            new Promise(resolve =>
                markIDsAsSeenIfSubscribed(USER, true, { t1_old: String(NOW - 600) }, {}, {}, {}, resolve),
            ),
        expect: () => expect(__getSyncStorage()[mine.removed].t1_old.u).toBe(false),
    },
]

describe('what a content script writes, the background makes', () => {
    it.each(pageWrites)('$name', async row => {
        __resetStorage(SYNC, row.local ?? {})
        const extension = globalThis.location
        const asked = []
        vi.spyOn(browserMock.runtime, 'sendMessage').mockImplementation(
            message => new Promise(answer => asked.push({ message, answer })),
        )
        const written = keysWritten([...SYNC_AREAS(), ...LOCAL_AREAS()])
        vi.stubGlobal('location', PAGE)
        const done = row.write()
        await turns()
        expect(asked.map(({ message }) => message.action)).toEqual([PAGE_WRITE])
        expect([...written]).toEqual([])
        // In the background
        vi.stubGlobal('location', extension)
        const [{ message, answer }] = asked
        answer(await background.send(message, FROM_PAGE))
        await done
        await turns()
        await row.expect()
    })

    it("refuses a write it doesn't take, or arguments its pages don't send", async () => {
        __resetStorage(SYNC, {})
        const written = keysWritten([...SYNC_AREAS(), ...LOCAL_AREAS()])
        for (const [write, args] of [
            ['saveOptions', [{}]],
            ['constructor', []],
            ['subscribeId', ['options']],
            ['subscribeUser', ['two words']],
            ['keepPageText', ['t1_followed', { t: 'words' }]],
            ['setCurrentStateForId', ['t1_a', 'javascript:alert(1)']],
            ['markIDsAsSeenIfSubscribed', [USER, true, { options: 1 }, {}, {}, {}]],
            ['subscribeId', 't1_a'],
        ]) {
            expect(await background.send({ action: PAGE_WRITE, write, args }, FROM_PAGE)).toEqual({
                ok: false,
                error: 'forbidden',
            })
        }
        expect([...written]).toEqual([])
    })
})
