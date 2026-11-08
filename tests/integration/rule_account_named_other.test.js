// Followed items are kept under the thing "other", and an account can be named
// "other" too. Everything that groups, counts, names or marks items keeps the
// two apart: lists and records go by getObjectNamesForThing(thing, isUser), and
// anything keyed by name, such as a notification, its pending entry or an entry
// in the popup's, the badge's or history's maps, by notificationName(thing,
// isUser), which is FOLLOWED_NOTIFICATION for followed items. One place after
// another mixed the two up: notifications, then the popup's and the badge's
// maps, history and the website's count.
//
// Each row below is one place that groups, counts, names or marks items, run on
// one install that has both. A new such place gets a row in the table.

// Install chrome global BEFORE any source import
import '../mocks/chrome-api.js'

import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest'
import { parseHTML } from 'linkedom'
import browserMock, { __resetStorage, __getSyncStorage, __getLocalStorage } from '../mocks/webextension-polyfill.js'
import { loadBackground } from '../mocks/background.js'
import { cookie, fill } from '../mocks/cookies.js'
import { json, blockPage } from '../mocks/responses.js'
import { openPage } from '../mocks/extension-page.js'
import { REMOVED } from '../../src/src/common'
import {
    FOLLOWED_NOTIFICATION,
    getObjectNamesForThing,
    getOldestDateKey,
    getSubscribedUsers_withSeenAndUnseenIDs,
    updateBadgeUnseenCount,
    getAllChanges,
    markEverythingAsSeen,
    unsubscribeId,
} from '../../src/src/storage'
import {
    _checkForChanges_thing_byId,
    _processPendingPosts,
    _pendingPostTiming,
    getUnseenBacklogItemIds,
} from '../../src/src/monitoring'
import { handleBridgeFetch } from '../../src/src/bridge'
import { lookupItemsByID } from '../../src/src/requests'
import { NO_AUTH } from '../../src/src/reddit-auth'
import { _resetLoggedInFetchState } from '../../src/src/logged-in-fetch'
import { loadOwnRemovedSets } from '../../src/src/own-status'

// The legacy page reader runs HTMLRewriter (WASM), which can't load here. The
// pending-post queue reads a post's legacy page through it.
const legacyPosts = {}
const legacyReads = []
vi.mock('../../src/src/parse_html/old', () => ({
    getPost_fromOld: async path => {
        legacyReads.push(path)
        return legacyPosts[path] || { error: 'no page', status: 404 }
    },
    getItemsById_fromOldHTML: async () => [],
}))

// content-common.ts asks where it's running as it loads: on reveddit.com
globalThis.location.hostname = 'www.reveddit.com'
const { setTextAndFunction_subscribe } = await import('../../src/src/content-common')
delete globalThis.location.hostname

// --- The install: u/other, signed in, and followed items ---

const NOW = Math.floor(Date.now() / 1000)
const ACCOUNT = 'other'
const MINE = 't1_mine'
const MINE2 = 't1_mine2'
const FOLLOWED = 't1_followed'
// The account's lists, and followed items', both under "other"
const mine = getObjectNamesForThing(ACCOUNT, true)
const followed = getObjectNamesForThing('other', false)
// Their records in local storage, which getObjectNamesForThing doesn't name
const MY_RECORDS = 'items_u_other'
const FOLLOWED_RECORDS = 'items_other'

const unseenItem = () => ({ c: NOW - 600, u: true, p: 't3_post' })
const record = t => ({ t, c: NOW - 600, p: 't3_post', o: NOW - 300, n: 0, r: 0 })
const emptyLists = keys => ({ [keys.approved]: {}, [keys.locked]: {}, [keys.unlocked]: {} })
// A notification that didn't show, old enough to be shown again
const pendingEntry = (name, itemIds) => ({
    thing: name,
    count: itemIds.length,
    types: ['mod removed'],
    itemIds,
    firstAttemptAt: Date.now() - 3 * 60 * 1000,
    attempts: 1,
})

// The account has two unseen removals and followed items one, so a count
// shows which side it read
const SYNC = {
    options: {
        seen_count: 2,
        interval: 1,
        removal_status: { track: true, notify: true },
        lock_status: { track: true, notify: true },
    },
    user_subscriptions: { [ACCOUNT]: true },
    user_unsubscriptions: {},
    other_subscriptions: { [FOLLOWED]: { t: NOW - 3600 } },
    [mine.removed]: { [MINE]: unseenItem(), [MINE2]: unseenItem() },
    ...emptyLists(mine),
    [mine.changes]: [{ i: MINE, o: NOW - 300, g: REMOVED, n: 0 }],
    [followed.removed]: { [FOLLOWED]: unseenItem() },
    ...emptyLists(followed),
    [followed.changes]: [{ i: FOLLOWED, o: NOW - 200, g: REMOVED, n: 0 }],
}
const LOCAL = {
    last_logged_in_user: ACCOUNT,
    [MY_RECORDS]: { [MINE]: record('words of mine'), [MINE2]: record('more words of mine') },
    [FOLLOWED_RECORDS]: { [FOLLOWED]: record('words I follow') },
    pending_notifications: {
        [ACCOUNT]: pendingEntry(ACCOUNT, [MINE, MINE2]),
        [FOLLOWED_NOTIFICATION]: pendingEntry(FOLLOWED_NOTIFICATION, [FOLLOWED]),
    },
}

const HISTORY = 'src/history.html'
const FOLLOWED_ON_REVEDDIT = `https://www.reveddit.com/info?id=${FOLLOWED}&removal_status=all`

// --- Reading the results ---

// Which removed items are still unseen, the account's and followed items'
const unseenOf = sync => ({
    account: Object.keys(sync[mine.removed] || {}).filter(id => sync[mine.removed][id].u),
    followed: Object.keys(sync[followed.removed] || {}).filter(id => sync[followed.removed][id].u),
})
const pendingNames = local => Object.keys(local.pending_notifications || {}).sort()
const bodies = document => Array.from(document.querySelectorAll('.md-body')).map(body => body.textContent.trim())
const ticks = async () => {
    for (let i = 0; i < 5; i++) await new Promise(resolve => setTimeout(resolve, 0))
}

// An item on one side's removed list, records and changes, and on none of the other side's
const expectOnlyOn = (side, id) => {
    const sync = __getSyncStorage()
    const local = __getLocalStorage()
    for (const [keys, records] of [
        [mine, MY_RECORDS],
        [followed, FOLLOWED_RECORDS],
    ]) {
        const here = keys === side
        expect(id in sync[keys.removed], keys.removed).toBe(here)
        expect(
            sync[keys.changes].some(change => change.i === id),
            keys.changes,
        ).toBe(here)
        expect(id in (local[records] || {}), records).toBe(here)
    }
}

// The names of the notifications shown, which a click hands back. One that
// fails to show stays pending.
const notifications = ({ failing = false } = {}) => {
    const names = []
    vi.spyOn(chrome.notifications, 'create').mockImplementation((id, options, callback) => {
        names.push(id.split('|')[0])
        if (failing) chrome.runtime.lastError = { message: 'not shown' }
        try {
            callback(id)
        } finally {
            chrome.runtime.lastError = null
        }
    })
    return names
}

// --- Driving it ---

// An item as reddit shows it removed, and as its author still sees it
const removedView = name => ({
    name,
    author: '[deleted]',
    body: '[removed]',
    created_utc: NOW - 600,
    link_id: 't3_post',
    locked: false,
})
const authorsView = name => ({ ...removedView(name), author: ACCOUNT, body: 'words of mine' })

// One item checked as the cycle checks the account (isUser) or followed items,
// finding it removed. 2: followed from neither reddit nor reveddit.
const check = async (isUser, name) => {
    const lookup = isUser ? { [name]: authorsView(name) } : {}
    const storage = structuredClone(__getSyncStorage())
    await _checkForChanges_thing_byId([name], 'other', isUser, null, storage, 2, lookup, [{ data: removedView(name) }])
    // The pending entry and a retry's notification are written after the check ends
    await ticks()
}

// A removed post the pending-post queue finds: its legacy page says removed,
// and its thread, read with the login, names its author
const findQueuedRemovedPost = async author => {
    fill([cookie('reddit_session', 'S1')])
    __getLocalStorage().pending_post_lookups = ['t3_queued']
    legacyPosts['/comments/queued/'] = { is_removed: true }
    const post = { name: 't3_queued', author, title: 'a post', created_utc: NOW - 600, is_robot_indexable: true }
    vi.stubGlobal('fetch', async () =>
        json(200, [{ kind: 'Listing', data: { children: [{ kind: 't3', data: post }] } }]),
    )
    const shown = notifications({ failing: true })
    await _processPendingPosts(structuredClone(__getSyncStorage()))
    await ticks()
    return shown
}

// The popup over the install, as popup_page.test.js opens it
const openPopup = () =>
    openPage(
        () => {
            vi.stubGlobal('__LATEST_RELEASE__', null)
            vi.stubGlobal('fetch', () => new Promise(() => {}))
            chrome.tabs.query = (query, callback) => (query.active ? callback([]) : Promise.resolve([]).then(callback))
            chrome.tabs.create = vi.fn()
            chrome.runtime.openOptionsPage = vi.fn()
            return import('../../src/src/popup.tsx')
        },
        SYNC,
        LOCAL,
    )
// Its two rows that read "other": the account's, then followed items'
const otherRows = document =>
    Array.from(document.querySelectorAll('a')).filter(a => a.firstElementChild?.textContent === 'other')
const clickPopupRow = async index => {
    const page = await openPopup()
    await vi.waitFor(() => expect(otherRows(page.document)).toHaveLength(2))
    otherRows(page.document)[index].click()
    await vi.waitFor(() => expect(chrome.tabs.create).toHaveBeenCalled())
    return page
}

// History, as history_page.test.js opens it, with the welcome banner dismissed
const openHistory = () =>
    openPage(
        () => {
            globalThis.window.location = { search: '' }
            vi.stubGlobal('localStorage', { getItem: () => '1' })
            return import('../../src/src/history.tsx')
        },
        SYNC,
        LOCAL,
    )

const REVEDDIT = 'https://www.reveddit.com/v/pics/'
const REDDIT = 'https://www.reddit.com/r/pics/'

// The content script on a page, loaded as content_page_storage.test.js loads it:
// fresh modules, with reddit's and reveddit's page changes replaced by mocks
// that keep what they were handed. stored: the page's own localStorage.
const openContentScript = async (href, sync = SYNC, stored = {}) => {
    vi.resetModules()
    vi.doMock('../../src/src/content-reddit', () => ({ redditModifications: vi.fn() }))
    vi.doMock('../../src/src/content-revddit', () => ({ revdditModifications: vi.fn() }))
    const page = new Map(Object.entries(stored))
    vi.stubGlobal('window', {
        location: new URL(href),
        addEventListener: vi.fn(),
        localStorage: { setItem: (key, value) => page.set(key, value), removeItem: key => page.delete(key) },
    })
    vi.stubGlobal('document', { readyState: 'complete' })
    // Fresh modules, so chrome and browser share the storage the script reads
    await import('../mocks/chrome-api.js')
    const extension = await import('../mocks/webextension-polyfill.js')
    extension.__resetStorage(sync, LOCAL)
    extension.default.runtime.onMessage = { addListener: vi.fn() }
    extension.default.runtime.getManifest = () => ({ version: '1.2.3' })
    await import('../../src/src/content.ts')
    return {
        page,
        sync: extension.__getSyncStorage,
        storage: await import('../../src/src/storage'),
        reddit: (await import('../../src/src/content-reddit')).redditModifications,
        revddit: (await import('../../src/src/content-revddit')).revdditModifications,
    }
}
// What a reveddit page does once its items load (content-revddit.ts
// findIDsForUserAndMark): it marks those shown removed seen, for the user and
// kind of page content.ts handed it
const markShownSeen = ({ storage, revddit }, ids) => {
    const [, user, isUserPage] = revddit.mock.calls[0]
    const shown = Object.fromEntries(ids.map(id => [id, NOW - 600]))
    return new Promise(resolve => storage.markIDsAsSeenIfSubscribed(user, isUserPage, shown, {}, {}, {}, resolve))
}

// --- The table ---

const rows = [
    // Lists of what's unseen, and counts of it
    [
        "the popup's map lists the account's unseen items under its name and followed items' under theirs",
        async () => {
            const users = await new Promise(resolve => getSubscribedUsers_withSeenAndUnseenIDs(resolve))
            expect(Object.keys(users)).toEqual([ACCOUNT, FOLLOWED_NOTIFICATION])
            expect(users[ACCOUNT].unseen).toEqual([MINE, MINE2])
            expect(users[FOLLOWED_NOTIFICATION].unseen).toEqual([FOLLOWED])
        },
    ],
    [
        "the popup shows the account's count with a link to history, and followed items' with a link to them alone",
        async () => {
            const { document } = await openPopup()
            const shown = () => otherRows(document).map(a => [a.getAttribute('href'), a.children[1].textContent])
            await vi.waitFor(() =>
                expect(shown()).toEqual([
                    [chrome.runtime.getURL(HISTORY), '2'],
                    [FOLLOWED_ON_REVEDDIT, '1 / 1'],
                ]),
            )
        },
    ],
    [
        "the toolbar badge counts both: the account's two and followed items' one",
        async () => {
            const badge = vi.spyOn(chrome.action, 'setBadgeText')
            updateBadgeUnseenCount()
            await vi.waitFor(() => expect(badge).toHaveBeenCalled())
            expect(badge.mock.calls.at(-1)[0]).toEqual({ text: '3' })
        },
    ],
    [
        "the digest of older removals counts the account's and followed items'",
        async () => {
            const storage = structuredClone(SYNC)
            for (const list of [mine.removed, followed.removed]) {
                for (const item of Object.values(storage[list])) item.c = NOW - 3 * 24 * 3600
            }
            expect(getUnseenBacklogItemIds(storage)).toEqual([MINE, MINE2, FOLLOWED])
        },
    ],
    [
        "history's changes come under the account's name and under followed items'",
        async () => {
            const changes = await new Promise(resolve => getAllChanges(resolve))
            const ids = Object.fromEntries(Object.entries(changes).map(([name, list]) => [name, list.map(c => c.i)]))
            expect(ids).toEqual({ [ACCOUNT]: [MINE], [FOLLOWED_NOTIFICATION]: [FOLLOWED] })
        },
    ],
    [
        'the history page shows each change with the words its own side kept',
        async () => {
            const { document } = await openHistory()
            // Newest first
            await vi.waitFor(() => expect(bodies(document)).toEqual(['words I follow', 'words of mine']))
        },
    ],
    [
        'the website hears there is an account to follow in the one named other, and of none in followed items alone',
        async () => {
            const both = await openContentScript(REVEDDIT, SYNC, { extensionSaysNoSubscriptions: 'true' })
            expect(both.page.has('extensionSaysNoSubscriptions')).toBe(false)
            const followedOnly = await openContentScript(REVEDDIT, { ...SYNC, user_subscriptions: {} })
            expect(followedOnly.page.get('extensionSaysNoSubscriptions')).toBe('true')
        },
    ],
    [
        "reddit's pages, which subscribe whoever is signed in, count u/other among the accounts and followed items as none",
        async () => {
            const { reddit } = await openContentScript(REDDIT)
            expect(reddit.mock.calls[0][2]).toEqual([ACCOUNT])
        },
    ],

    // Marking items seen
    [
        "a click on the popup's row for the account marks only its items seen and clears only its notification",
        async () => {
            const page = await clickPopupRow(0)
            await vi.waitFor(() => expect(pendingNames(page.__getLocalStorage())).toEqual([FOLLOWED_NOTIFICATION]))
            expect(unseenOf(page.__getSyncStorage())).toEqual({ account: [], followed: [FOLLOWED] })
        },
    ],
    [
        "a click on the popup's row for followed items marks only theirs seen and clears only theirs",
        async () => {
            const page = await clickPopupRow(1)
            await vi.waitFor(() => expect(pendingNames(page.__getLocalStorage())).toEqual([ACCOUNT]))
            expect(unseenOf(page.__getSyncStorage())).toEqual({ account: [MINE, MINE2], followed: [] })
        },
    ],
    [
        "Mark all seen marks the account's items and followed items' seen",
        async () => {
            await markEverythingAsSeen()
            expect(unseenOf(__getSyncStorage())).toEqual({ account: [], followed: [] })
        },
    ],
    [
        "u/other's page on reveddit.com marks the account's items seen, and no followed item",
        async () => {
            const page = await openContentScript('https://www.reveddit.com/user/other/')
            await markShownSeen(page, [MINE, MINE2])
            expect(unseenOf(page.sync())).toEqual({ account: [], followed: [FOLLOWED] })
        },
    ],
    [
        "an info page on reveddit.com marks followed items seen, and none of the account's",
        async () => {
            const page = await openContentScript(`https://www.reveddit.com/info?id=${MINE},${MINE2},${FOLLOWED}`)
            await markShownSeen(page, [MINE, MINE2, FOLLOWED])
            expect(unseenOf(page.sync())).toEqual({ account: [MINE, MINE2], followed: [] })
            // Nor are the account's items added to followed items' lists
            expect(Object.keys(page.sync()[followed.removed])).toEqual([FOLLOWED])
        },
    ],

    // Notifications: their names, pending entries, retries and clicks
    [
        "a removal the account's check finds is told, and kept pending, under the account's name",
        async () => {
            const shown = notifications({ failing: true })
            await check(true, 't1_new')
            expect(shown).toEqual([ACCOUNT])
            const pending = __getLocalStorage().pending_notifications
            expect(pending[ACCOUNT].itemIds).toEqual(['t1_new'])
            expect(pending[FOLLOWED_NOTIFICATION]).toEqual(LOCAL.pending_notifications[FOLLOWED_NOTIFICATION])
        },
    ],
    [
        "a removal followed items' check finds is told, and kept pending, under theirs",
        async () => {
            __getSyncStorage().other_subscriptions.t1_new = { t: NOW }
            const shown = notifications({ failing: true })
            await check(false, 't1_new')
            expect(shown).toEqual([FOLLOWED_NOTIFICATION])
            const pending = __getLocalStorage().pending_notifications
            expect(pending[FOLLOWED_NOTIFICATION].itemIds).toEqual(['t1_new'])
            expect(pending[ACCOUNT]).toEqual(LOCAL.pending_notifications[ACCOUNT])
        },
    ],
    [
        "a check of the account that finds nothing new shows its pending notification again, and leaves followed items'",
        async () => {
            const shown = notifications()
            await check(true, MINE)
            expect(shown).toEqual([ACCOUNT])
            await vi.waitFor(() => expect(pendingNames(__getLocalStorage())).toEqual([FOLLOWED_NOTIFICATION]))
            expect(__getLocalStorage().pending_notifications[FOLLOWED_NOTIFICATION].attempts).toBe(1)
        },
    ],
    [
        "a check of followed items that finds nothing new shows theirs again, and leaves the account's",
        async () => {
            const shown = notifications()
            await check(false, FOLLOWED)
            expect(shown).toEqual([FOLLOWED_NOTIFICATION])
            await vi.waitFor(() => expect(pendingNames(__getLocalStorage())).toEqual([ACCOUNT]))
            expect(__getLocalStorage().pending_notifications[ACCOUNT].attempts).toBe(1)
        },
    ],
    [
        "a click on the account's notification opens history, marks only its items seen and clears only its entry",
        async () => {
            const open = vi.spyOn(chrome.tabs, 'create')
            background.clickNotification(`${ACCOUNT}|1700000000000`)
            await vi.waitFor(() =>
                expect(open).toHaveBeenCalledWith(expect.objectContaining({ url: chrome.runtime.getURL(HISTORY) })),
            )
            await vi.waitFor(() => expect(pendingNames(__getLocalStorage())).toEqual([FOLLOWED_NOTIFICATION]))
            expect(unseenOf(__getSyncStorage())).toEqual({ account: [], followed: [FOLLOWED] })
        },
    ],
    [
        "a click on followed items' notification opens them on reveddit, marks only theirs seen and clears only theirs",
        async () => {
            const open = vi.spyOn(chrome.tabs, 'create')
            background.clickNotification(`${FOLLOWED_NOTIFICATION}|1700000000000`)
            await vi.waitFor(() =>
                expect(open).toHaveBeenCalledWith(expect.objectContaining({ url: FOLLOWED_ON_REVEDDIT })),
            )
            await vi.waitFor(() => expect(pendingNames(__getLocalStorage())).toEqual([ACCOUNT]))
            expect(unseenOf(__getSyncStorage())).toEqual({ account: [MINE, MINE2], followed: [] })
        },
    ],

    // Where what's found is kept
    [
        "a removal the account's check finds goes on the account's lists, records and changes",
        async () => {
            await check(true, 't1_new')
            expectOnlyOn(mine, 't1_new')
        },
    ],
    [
        "a removal followed items' check finds goes on theirs",
        async () => {
            __getSyncStorage().other_subscriptions.t1_new = { t: NOW }
            await check(false, 't1_new')
            expectOnlyOn(followed, 't1_new')
        },
    ],
    [
        "a removed post the pending-post queue finds by u/other goes on the account's lists, told under its name",
        async () => {
            expect(await findQueuedRemovedPost(ACCOUNT)).toEqual([ACCOUNT])
            expectOnlyOn(mine, 't3_queued')
        },
    ],
    [
        "one the queue finds by anyone else goes on followed items' lists, told under theirs",
        async () => {
            expect(await findQueuedRemovedPost('someone')).toEqual([FOLLOWED_NOTIFICATION])
            expectOnlyOn(followed, 't3_queued')
        },
    ],
    [
        'the pending-post queue skips a post either side already has as removed',
        async () => {
            __getSyncStorage()[mine.removed].t3_mine = unseenItem()
            __getSyncStorage()[followed.removed].t3_followed = unseenItem()
            __getLocalStorage().pending_post_lookups = ['t3_mine', 't3_followed']
            await _processPendingPosts(structuredClone(__getSyncStorage()))
            expect(legacyReads).toEqual([])
            expect(__getLocalStorage().pending_post_lookups).toEqual([])
        },
    ],
    [
        "following an item from reveddit keeps it, with the words the page shows, among followed items and not the account's",
        async () => {
            // In a content script the check's read goes through the background
            vi.stubGlobal('location', { protocol: 'https:', hostname: 'www.reveddit.com' })
            vi.stubGlobal('window', { location: { href: 'https://www.reveddit.com/v/x/comments/post/_/gone/' } })
            vi.spyOn(browserMock.runtime, 'sendMessage').mockImplementation(async message =>
                message.action === 'get-reddit-items-by-id'
                    ? { response: 'done', items: [{ data: removedView('t1_gone') }] }
                    : undefined,
            )
            const { document } = parseHTML('<html><body><a></a></body></html>')
            const button = setTextAndFunction_subscribe(
                't1_gone',
                document.querySelector('a'),
                'the words it recovered',
            )
            button.onclick({ preventDefault() {}, stopPropagation() {} })
            await vi.waitFor(() =>
                expect(__getLocalStorage()[FOLLOWED_RECORDS].t1_gone?.t).toBe('the words it recovered'),
            )
            expect(__getSyncStorage()[followed.removed].t1_gone).toBeDefined()
            expect(__getSyncStorage()[mine.removed]).toEqual(SYNC[mine.removed])
            expect(__getLocalStorage()[MY_RECORDS]).toEqual(LOCAL[MY_RECORDS])
        },
    ],
    [
        "unfollowing an item the account wrote too takes it off followed items' lists and leaves the account's",
        async () => {
            // The popup's switch follows any comment, the account's own too
            __getSyncStorage().other_subscriptions[MINE] = { t: NOW }
            __getSyncStorage()[followed.removed][MINE] = unseenItem()
            await new Promise(resolve => unsubscribeId(MINE, resolve))
            expect(Object.keys(__getSyncStorage()[followed.removed])).toEqual([FOLLOWED])
            expect(__getSyncStorage()[mine.removed]).toEqual(SYNC[mine.removed])
        },
    ],

    // Reading one side's lists or records
    [
        "the website's reads through the bridge, signed in as u/other, mark both the account's and followed items' removals",
        async () => {
            fill([cookie('reddit_session', 'S1')])
            const children = [
                [MINE, ACCOUNT],
                [FOLLOWED, 'someone'],
            ].map(([name, author]) => ({ kind: 't1', data: { name, author, body: 'text' } }))
            vi.stubGlobal('fetch', async () => json(200, { kind: 'Listing', data: { children } }))
            const answer = await handleBridgeFetch({
                url: `https://www.reddit.com/api/info.json?id=${MINE},${FOLLOWED}`,
            })
            expect(answer.data.data.children.map(child => child.data.body)).toEqual(['[removed]', '[removed]'])
        },
    ],
    [
        "signed in as u/other, reddit's pages mark the account's removed items as its own, and no followed item",
        async () => {
            const removed = await new Promise(resolve => loadOwnRemovedSets(resolve))
            expect([...removed]).toEqual([MINE, MINE2])
        },
    ],
    [
        'the followed items page shows them with their own words, and links to them alone on reveddit',
        async () => {
            const { document } = await openPage(() => import('../../src/src/other.tsx'), SYNC, LOCAL)
            await vi.waitFor(() => expect(bodies(document)).toEqual(['words I follow']))
            const viewAll = Array.from(document.querySelectorAll('a')).find(a =>
                a.textContent.startsWith('View all current statuses'),
            )
            expect(viewAll.getAttribute('href')).toBe(FOLLOWED_ON_REVEDDIT)
        },
    ],
    [
        'a followed comment with no post on file is read through the post its followed record names',
        async () => {
            fill([cookie('reddit_session', 'S1')])
            const reads = []
            vi.stubGlobal('fetch', async url => {
                reads.push(String(url))
                if (String(url).includes('/api/info.json')) return blockPage()
                return json(200, [
                    { kind: 'Listing', data: { children: [{ kind: 't3', data: { name: 't3_post' } }] } },
                    { kind: 'Listing', data: { children: [{ kind: 't1', data: removedView(FOLLOWED) }] } },
                ])
            })
            const found = await lookupItemsByID([FOLLOWED], NO_AUTH, false, '', {})
            expect(found.map(item => item.data.name)).toEqual([FOLLOWED])
            expect(reads.filter(url => !url.includes('/api/info.json'))).toEqual([
                expect.stringContaining('/comments/post/_/followed.json'),
            ])
        },
    ],

    // An update from a version that kept followed items' entries under "other"
    [
        "an update from 0.0.5.31 or earlier drops what followed items left under the name other, and nothing of the account's",
        async () => {
            Object.assign(__getLocalStorage(), {
                // 0.0.5.31 kept followed items' pending entry under the account's name
                pending_notifications: { other: pendingEntry('other', [FOLLOWED]) },
                [getOldestDateKey('other', false)]: NOW - 1e6,
                [getOldestDateKey(ACCOUNT, true)]: NOW - 1e6,
            })
            background.install({ reason: 'update', previousVersion: '0.0.5.31' })
            await vi.waitFor(() => expect(pendingNames(__getLocalStorage())).toEqual([]))
            await vi.waitFor(() => expect(__getLocalStorage()).not.toHaveProperty(getOldestDateKey('other', false)))
            expect(__getLocalStorage()[getOldestDateKey(ACCOUNT, true)]).toBe(NOW - 1e6)
            expect(__getLocalStorage()[MY_RECORDS]).toEqual(LOCAL[MY_RECORDS])
            expect(__getSyncStorage()[mine.removed]).toEqual(SYNC[mine.removed])
        },
    ],
    [
        "an update from a later version keeps u/other's pending notification",
        async () => {
            background.install({ reason: 'update', previousVersion: '0.0.5.32' })
            await ticks()
            expect(pendingNames(__getLocalStorage())).toEqual([ACCOUNT, FOLLOWED_NOTIFICATION])
        },
    ],
]

// --- Running it ---

let background
// The pages and the content script load fresh modules over a chrome of their
// own. Every other row runs on this one, which the background listens on.
const CHROME = globalThis.chrome
const LOCATION = globalThis.location
const BUILD_FLAGS = ['__BUILT_FOR__', '__STORE__', '__DEV__', '__LOCAL_SITE__']
let buildFlags

beforeAll(async () => {
    background = await loadBackground()
    buildFlags = Object.fromEntries(BUILD_FLAGS.map(name => [name, globalThis[name]]))
    _pendingPostTiming.delayMs = 0
})

beforeEach(() => {
    __resetStorage(SYNC, LOCAL)
    fill([])
    _resetLoggedInFetchState()
    legacyReads.length = 0
    for (const path of Object.keys(legacyPosts)) delete legacyPosts[path]
})

afterEach(() => {
    globalThis.chrome = CHROME
    // linkedom's window sets what it doesn't have on the global, so the history
    // page's window.location replaces the extension's location
    globalThis.location = LOCATION
    Object.assign(globalThis, buildFlags)
})

describe('an account named other and followed items', () => {
    it.each(rows)('%s', async (_, run) => {
        await run()
    })
})
