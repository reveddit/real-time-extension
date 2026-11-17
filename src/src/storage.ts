import {
    actionApi,
    ItemForStorage,
    LocalStorageItem,
    sortDict_by_numberValuedAttribute,
    trimDict_by_numberValuedAttribute,
    setWarningBadge,
    isPlaceholderText,
} from './common'
import { getRemoteScanLimits } from './news'
import { oneAtATime, afterWrites } from './one-at-a-time'
import browser from 'webextension-polyfill'

export const INTERVAL_DEFAULT = 1
export const SEEN_COUNT_DEFAULT = 2

// These limits are set with consideration for Chrome's sync & local storage limits,
// and for the objects stored by the extension
export const MAX_SUBSCRIPTIONS = 5
const MAX_LOCAL_STORAGE_ITEMS_PER_OBJECT = 1000
const MAX_SYNC_STORAGE_ITEMS_PER_OBJECT = 130
export const MAX_SYNC_STORAGE_CHANGES = 100
export const MAX_OTHER_SUBSCRIPTIONS = 100

// Chrome and Firefox refuse a storage.sync item whose key and value JSON pass
// 8,192 bytes, and refuse the whole set() call that carries it. 130 entries of
// about 63 bytes reach that, so the writers that add entries also trim each
// list to fit (issue #15). The margin leaves room for the writers that mark
// everything seen without trimming: "u":false is a byte longer than "u":true.
const SYNC_QUOTA_BYTES_PER_ITEM = 8192
const SYNC_ITEM_MARGIN_BYTES = 256
// Both also refuse a set() that would take all of sync storage past 102,400
// bytes, which five accounts with full lists pass. Firefox counts a few bytes
// more per key than Chrome does; the margin covers that too.
const SYNC_QUOTA_BYTES = 102400
const SYNC_TOTAL_MARGIN_BYTES = 1024

export const syncItemBytes = (key: string, value: any) => key.length + (JSON.stringify(value) ?? '').length

const syncItemValueBudget = (storageKey: string) =>
    SYNC_QUOTA_BYTES_PER_ITEM - SYNC_ITEM_MARGIN_BYTES - storageKey.length

// The entries trimDict_by_numberValuedAttribute keeps (the maxNumItems highest
// values), cut further where needed so the dict fits in one sync item, or in
// maxItemBytes when that is given
export const trimDict_toFitSyncItem = (
    dict: Record<string, any>,
    maxNumItems: number,
    numberValuedAttribute: string,
    storageKey: string,
    maxItemBytes?: number,
): Record<string, any> => {
    const budget = maxItemBytes === undefined ? syncItemValueBudget(storageKey) : maxItemBytes - storageKey.length
    const newDict: Record<string, any> = {}
    let bytes = 2 // {}
    let count = 0
    for (const [key, value] of sortDict_by_numberValuedAttribute(dict, numberValuedAttribute)) {
        if (count === maxNumItems) break
        const entryBytes = (count ? 1 : 0) + JSON.stringify(key).length + 1 + JSON.stringify(value).length
        if (bytes + entryBytes > budget) break
        newDict[key] = value
        bytes += entryBytes
        count++
    }
    return newDict
}

// Gives the dicts at trimKeys only the room under the total that the rest of
// toSave and the rest of storage leave, the smaller dict first. A set() that
// fits already is unchanged.
export const fitDicts_toSyncTotal = (
    toSave: Record<string, any>,
    storage: Record<string, any>,
    trimKeys: string[],
    numberValuedAttribute: string,
): Record<string, any> => {
    let room = SYNC_QUOTA_BYTES - SYNC_TOTAL_MARGIN_BYTES
    for (const key of Object.keys(storage)) {
        if (!(key in toSave)) room -= syncItemBytes(key, storage[key])
    }
    for (const key of Object.keys(toSave)) {
        if (!trimKeys.includes(key)) room -= syncItemBytes(key, toSave[key])
    }
    const fitted = { ...toSave }
    const bySize = trimKeys
        .filter(key => key in toSave)
        .sort((a, b) => syncItemBytes(a, toSave[a]) - syncItemBytes(b, toSave[b]))
    bySize.forEach((key, i) => {
        const share = Math.floor(room / (bySize.length - i))
        if (syncItemBytes(key, fitted[key]) > share) {
            fitted[key] = trimDict_toFitSyncItem(fitted[key], Infinity, numberValuedAttribute, key, share)
        }
        room -= syncItemBytes(key, fitted[key])
    })
    return fitted
}

// A save of status lists, each trimmed to fit one sync item, with the entries
// of alongside added as they are. Approved and unlocked get only the room left
// under the total: losing their oldest entries announces nothing, while a known
// removal dropped from removed would be announced again.
export const fitStatusLists = (
    lists: Record<string, any>,
    storage: Record<string, any>,
    keys: Record<string, string>,
    alongside: Record<string, any> = {},
): Record<string, any> => {
    const toSave: Record<string, any> = {}
    for (const [key, list] of Object.entries(lists)) {
        toSave[key] = trimDict_toFitSyncItem(list, MAX_SYNC_STORAGE_ITEMS_PER_OBJECT, 'c', key)
    }
    Object.assign(toSave, alongside)
    return fitDicts_toSyncTotal(toSave, storage, [keys['approved'], keys['unlocked']], 'c')
}

// For the diagnostic log's header: how full sync storage is, and its largest
// items, against the limits
export const formatSyncUsage = (storage: Record<string, any>): string => {
    const sizes = Object.keys(storage).map(key => ({ key, bytes: syncItemBytes(key, storage[key]) }))
    const total = sizes.reduce((sum, { bytes }) => sum + bytes, 0)
    const largest = sizes
        .sort((a, b) => b.bytes - a.bytes)
        .slice(0, 4)
        .map(({ key, bytes }) => `${key} ${bytes}`)
        .join(', ')
    return `sync storage: ${total} bytes in ${sizes.length} items, largest ${largest || 'none'} (limits ${SYNC_QUOTA_BYTES_PER_ITEM} per item, ${SYNC_QUOTA_BYTES} in all)`
}

export const getSyncUsageLine = async (): Promise<string> => {
    try {
        return formatSyncUsage(((await browser.storage.sync.get(null)) as Record<string, any>) || {})
    } catch (err: any) {
        return `sync storage: unreadable (${String(err?.message || err)})`
    }
}

const trackTypes: Record<string, any[] | Record<string, any>> = {
    changes: [],
    removed: {},
    approved: {},
    locked: {},
    unlocked: {},
}

const getObjectName = (type: string, thing: string, isUser: boolean): string => type + (isUser ? '_u_' : '_') + thing

const addTrackTypes = (object: Record<string, any>, thing: string, isUser = true) => {
    Object.keys(trackTypes).forEach(type => {
        object[getObjectName(type, thing, isUser)] = trackTypes[type]
    })
}

export const getObjectNamesForThing = (thing: string, isUser = true): Record<string, string> => {
    const names: Record<string, string> = {}
    Object.keys(trackTypes).forEach(type => {
        names[type] = getObjectName(type, thing, isUser)
    })
    return names
}

// The status lists of an account or of followed items, without its changes
const getStatusListKeys = (thing: string, isUser: boolean): Record<string, string> => {
    const keys = getObjectNamesForThing(thing, isUser)
    delete keys['changes']
    return keys
}

// Each subscribed account, then followed items
export const subscribedThings = (users: Record<string, unknown>): { thing: string; isUser: boolean }[] => [
    ...Object.keys(users).map(thing => ({ thing, isUser: true })),
    { thing: 'other', isUser: false },
]

// The user's items monitoring's last pass saw in the logged-out view,
// { ids, t } in local storage (bridge.ts reads it)
export const getPublicLiveKey = (user: string): string => getObjectName('public_live', user, true)

// When a check last read the logged-in user's items, and since when the
// checks after it have read none (lookup-status.ts noteItemsCheck), for the
// status line and the history page's first scan. Not named items_…: the
// history page reloads at any change of a key so named.
export const OWN_ITEMS_CHECK_KEY = 'own_items_check'

export const getOldestDateKey = (thing: string, isUser: boolean): string => getObjectName('oldest_date', thing, isUser)

// A scan reads feeds with the user's login, and Reddit can ask an account to verify
// it's human after a lot of automated activity, as it did a test account in 2026-11.
// So scans start gentle, and people can speed them up in options at their own risk.
export const SCAN_READS_DEFAULT = 20
// The fewest the options take. A scan doesn't need this many: what a click reads
// carries over to the next (scan-reads.ts), and the website's floor is 2 (news.ts)
export const SCAN_READS_MIN = 10
export const SCAN_READS_MAX = 100
export const SCAN_SECONDS_DEFAULT = 3
export const SCAN_SECONDS_MIN = 1
export const SCAN_SECONDS_MAX = 60
const isNumberBetween = (value: unknown, min: number, max: number) =>
    ['number', 'string'].includes(typeof value) && Number(value) >= min && Number(value) <= max
export const isScanReads = (value: unknown) =>
    isNumberBetween(value, SCAN_READS_MIN, SCAN_READS_MAX) && Number.isInteger(Number(value))
export const isScanSeconds = (value: unknown) => isNumberBetween(value, SCAN_SECONDS_MIN, SCAN_SECONDS_MAX)
// What the options say, or the default in place of what can't be used
export const scanSettingsFrom = (options: any) => ({
    readsPerClick: isScanReads(options?.scan_reads_per_click)
        ? Number(options.scan_reads_per_click)
        : SCAN_READS_DEFAULT,
    seconds: isScanSeconds(options?.scan_seconds_between_reads)
        ? Number(options.scan_seconds_between_reads)
        : SCAN_SECONDS_DEFAULT,
})
// The user's choice, held to the website's limits
export const getScanSettings = async () => {
    const chosen = scanSettingsFrom(await getOptions(options => options))
    const { reads_per_click = Infinity, seconds_between_reads = 0 } = await getRemoteScanLimits()
    return {
        readsPerClick: Math.min(chosen.readsPerClick, reads_per_click),
        gapMs: 1000 * Math.min(Math.max(chosen.seconds, seconds_between_reads), SCAN_SECONDS_MAX),
    }
}

export const getUserInit = (user: string): Record<string, any> => {
    const result = {}
    addTrackTypes(result, user, true)
    return result
}

const getStorageInit = () => {
    const result = {
        user_subscriptions: {},
        user_unsubscriptions: {}, // tracks if username has ever been manually unsubscribed, so it doesn't auto-subscribe again
        other_subscriptions: {},
        options: {
            interval: INTERVAL_DEFAULT,
            seen_count: SEEN_COUNT_DEFAULT,
            custom_clientid: '',
            removal_status: { track: true, notify: true },
            lock_status: { track: true, notify: true },
            monitor_quarantined: false,
            show_scan_on_own_profile: false,
            show_scan_on_other_profiles: true,
            show_thread_scan_buttons: true,
            highlight_own_profile_status: true,
            auto_filter_removed_threads: true,
        },
        last_check: null,
    }
    addTrackTypes(result, 'other', false)
    return result
}

// Each thing's lists in their turn (markThingSeen)
export const markEverythingAsSeen = async () => {
    const { user_subscriptions } = (await browser.storage.sync.get('user_subscriptions')) as Record<string, any>
    for (const { thing, isUser } of subscribedThings(user_subscriptions)) {
        await markThingSeen(thing, isUser)
    }
    updateBadgeUnseenCount()
}

// One key of local storage, with what it holds when nothing is stored there.
// Rejects when storage fails, unlike request-gates' readLocal, so a caller
// that writes back doesn't overwrite what it couldn't read.
// pick shapes the answer inside the same .then: callers depend on its timing.
const readLocal = <T, R = T>(
    key: string,
    empty: T,
    pick: (value: T) => R = value => value as unknown as R,
): Promise<R> => browser.storage.local.get({ [key]: empty }).then((r: any) => pick(r[key] || empty))

// update changes the value in place, or returns its replacement. One update of
// a key at a time, in every context (one-at-a-time.ts), as each rewrites it whole.
const updateLocal = <T>(key: string, empty: T, update: (value: T) => T | void): Promise<void> =>
    oneAtATime(key, async () => {
        const value = await readLocal(key, empty)
        await browser.storage.local.set({ [key]: update(value) ?? value })
    })

// chrome.storage.sync as the writers below have long used it, as a promise: a
// read that fails answers undefined, and a write calls back even when refused
const syncGet = (keys: any) => new Promise<Record<string, any>>(resolve => chrome.storage.sync.get(keys, resolve))
const syncSet = (items: Record<string, any>) =>
    new Promise<void>(resolve => chrome.storage.sync.set(items, () => resolve()))

// A content script runs in reddit's or reveddit's origin, which doesn't share
// the extension's locks, so the background makes its writes of what other
// contexts write too: background.ts runs each of these by name (PAGE_WRITES),
// through its ...Here version
export const PAGE_WRITE = 'page-write'
export const inContentScript = () => /^http/.test(location.protocol)
export const byBackground = (write: string, ...args: unknown[]): Promise<any> =>
    browser.runtime
        .sendMessage({ action: PAGE_WRITE, write, args })
        .then((r: any) => (r?.ok ? r.answer : Promise.reject(new Error(r?.error || 'no answer'))))

// Followed items' notification and its pending entry, and their entry beside the
// accounts' in the popup's, the badge's and history's lists. An account's are
// named for it, and an account can be named "other".
export const FOLLOWED_NOTIFICATION = 'reveddit:followed'
export const notificationName = (thing: string, isUser: boolean) => (isUser ? thing : FOLLOWED_NOTIFICATION)

// The turn of a thing's status lists, and for followed items their list too:
// a check's save, marking seen, following and unfollowing, subscribing an
// account. Each reads them in its turn, so none undoes another's save.
export const statusListsLock = (thing: string, isUser: boolean) => `lists:${notificationName(thing, isUser)}`

const PENDING_NOTIFICATIONS_KEY = 'pending_notifications'

type PendingNotification = {
    thing: string
    count: number
    types: string[]
    itemIds?: string[]
    firstAttemptAt: number
    attempts: number
}

export type PendingNotificationData = Omit<PendingNotification, 'thing'>

export const getPendingNotification = (thing: string): Promise<PendingNotification | null> =>
    readLocal<Record<string, PendingNotification>, PendingNotification | null>(
        PENDING_NOTIFICATIONS_KEY,
        {},
        all => all[thing] || null,
    )

export const setPendingNotification = (thing: string, data: PendingNotificationData) =>
    updateLocal<Record<string, any>>(PENDING_NOTIFICATIONS_KEY, {}, all => {
        all[thing] = { thing, ...data }
    })

export const clearPendingNotification = (thing: string) =>
    updateLocal<Record<string, any>>(PENDING_NOTIFICATIONS_KEY, {}, all => {
        delete all[thing]
    })

const NOTIFICATION_LOG_KEY = 'notification_log'
const NOTIFICATION_LOG_MAX = 50

export type NotificationLogEntry = {
    ts: number
    id: string
    title: string
    message: string
    itemIds?: string[]
    source: 'recent' | 'retry' | 'backlog_summary'
}

export const getNotificationLog = (): Promise<NotificationLogEntry[]> =>
    readLocal<NotificationLogEntry[]>(NOTIFICATION_LOG_KEY, [])

export const appendNotificationLog = (entry: NotificationLogEntry): Promise<void> =>
    updateLocal<NotificationLogEntry[]>(NOTIFICATION_LOG_KEY, [], log => {
        log.push(entry)
        if (log.length > NOTIFICATION_LOG_MAX) {
            log.splice(0, log.length - NOTIFICATION_LOG_MAX)
        }
    })

const BACKLOG_SUMMARY_KEY = 'backlog_summary'
export const BACKLOG_SUMMARY_DELAY_MS = 12 * 60 * 60 * 1000

type BacklogSummaryState = {
    installedAt: number | null
    initialBacklogNotified: boolean
    initialNotifiedIds: string[]
    summarySent: boolean
}

export const getBacklogSummaryState = (): Promise<BacklogSummaryState> =>
    readLocal<Record<string, any>, BacklogSummaryState>(BACKLOG_SUMMARY_KEY, {}, state => ({
        installedAt: state.installedAt ?? null,
        initialBacklogNotified: !!state.initialBacklogNotified,
        initialNotifiedIds: Array.isArray(state.initialNotifiedIds) ? state.initialNotifiedIds : [],
        summarySent: !!state.summarySent,
    }))

const updateBacklogSummary = (fields: Record<string, any>): Promise<void> =>
    updateLocal<Record<string, any>>(BACKLOG_SUMMARY_KEY, {}, state => {
        Object.assign(state, fields)
    })

export const setBacklogSummaryInstalledAt = (ts: number): Promise<void> => updateBacklogSummary({ installedAt: ts })

export const markBacklogInitialNotified = (notifiedIds: string[]): Promise<void> =>
    updateBacklogSummary({ initialBacklogNotified: true, initialNotifiedIds: notifiedIds })

export const markBacklogSummarySent = (): Promise<void> =>
    updateBacklogSummary({ initialBacklogNotified: true, summarySent: true })

// Returns the lists it marked, the only ones to save: a save of all of storage
// would undo whatever a check saved since it was read, and announce again a
// removal that save recorded
export const markThingAsSeen = (storage: Record<string, any>, thing: string, isUser: boolean) => {
    const marked: Record<string, any> = {}
    // An account unsubscribed since its notification, or since the popup
    // opened, no longer has lists
    Object.values(getStatusListKeys(thing, isUser)).forEach(fullKeyname => {
        if (!storage[fullKeyname]) return
        Object.values(storage[fullKeyname]).forEach((item: any) => {
            item.u = false
        })
        marked[fullKeyname] = storage[fullKeyname]
    })
    return marked
}

// A thing's lists marked seen, read and saved in their turn: a check that saves
// meanwhile waits, rather than having its new removal undone. Answers with the
// ids that were unseen, even when the save is refused (onRefused).
export const markThingSeen = (
    thing: string,
    isUser: boolean,
    onRefused: (err: any) => void = () => {},
): Promise<string[]> =>
    oneAtATime(statusListsLock(thing, isUser), async () => {
        const storage = (await browser.storage.sync.get(null)) as Record<string, any>
        const unseen = getUnseenIDs_thing(thing, isUser, storage)
        await browser.storage.sync.set(markThingAsSeen(storage, thing, isUser)).catch(onRefused)
        return unseen
    })

const markSeenForStorageKey = (
    storage: Record<string, any>,
    storage_keys: Record<string, string>,
    key: string,
    ids: Record<string, any>,
    is_user: boolean,
) => {
    const storage_item = storage[storage_keys[key]]
    if (!storage_item) return
    Object.keys(ids).forEach(id => {
        if (id in storage_item) {
            storage_item[id].u = false
        } else if (is_user) {
            storage_item[id] = new ItemForStorage(ids[id], false)
        }
    })
}

// A reveddit page's items load well after the page read sync storage, and a
// check may save in between. So marking reads storage again, in the lists'
// turn, and saves only the lists it marks: the page's copy would undo that
// save, and announce again a removal the save recorded. Answers whether it saved.
export const markIDsAsSeenHere = (
    user: string,
    is_user: boolean,
    removed_ids: Record<string, any>,
    approved_ids: Record<string, any>,
    locked_ids: Record<string, any>,
    unlocked_ids: Record<string, any>,
): Promise<boolean> =>
    oneAtATime(statusListsLock(user, is_user), async () => {
        const storage_keys = getStatusListKeys(user, is_user)
        const storage = await syncGet(undefined)
        const user_subscribed = storage?.user_subscriptions?.[user]
        if (!storage || !(user_subscribed || !is_user)) {
            return false
        }
        markSeenForStorageKey(storage, storage_keys, 'removed', removed_ids, is_user)
        markSeenForStorageKey(storage, storage_keys, 'approved', approved_ids, is_user)
        markSeenForStorageKey(storage, storage_keys, 'locked', locked_ids, is_user)
        markSeenForStorageKey(storage, storage_keys, 'unlocked', unlocked_ids, is_user)
        // The entries added here have to fit like the monitoring save's
        const lists = Object.fromEntries(
            Object.values(storage_keys)
                .filter(key => storage[key])
                .map(key => [key, storage[key]]),
        )
        await syncSet(fitStatusLists(lists, storage, storage_keys))
        return true
    })

export const markIDsAsSeenIfSubscribed = (
    user: string,
    is_user: boolean,
    removed_ids: Record<string, any>,
    approved_ids: Record<string, any>,
    locked_ids: Record<string, any>,
    unlocked_ids: Record<string, any>,
    callback: () => void = () => {},
) => {
    const args = [user, is_user, removed_ids, approved_ids, locked_ids, unlocked_ids] as const
    ;(inContentScript() ? byBackground('markIDsAsSeenIfSubscribed', ...args) : markIDsAsSeenHere(...args)).then(
        saved => saved && callback(),
        () => {},
    )
}

// Following and unfollowing, in followed items' turn (statusListsLock). A
// refused save still calls back, as the switches and buttons show what's saved.
export const subscribeIdHere = (id: string): Promise<void> =>
    oneAtATime(statusListsLock('other', false), async () => {
        const key = 'other_subscriptions'
        const result = await syncGet(key)
        result[key][id] = { t: Math.floor(new Date().getTime() / 1000) }
        const itemsToSave = trimDict_by_numberValuedAttribute(result[key], MAX_OTHER_SUBSCRIPTIONS, 't')
        await syncSet({ [key]: itemsToSave })
    })
export const subscribeId = (id: string, callback: () => void = () => {}) => {
    ;(inContentScript() ? byBackground('subscribeId', id) : subscribeIdHere(id)).then(
        () => callback(),
        () => {},
    )
}
export const unsubscribeIdHere = (id: string): Promise<void> =>
    oneAtATime(statusListsLock('other', false), async () => {
        const mainKey = 'other_subscriptions'
        const otherKeys = getStatusListKeys('other', false)
        const result = await syncGet(Object.values(otherKeys).concat(mainKey))
        delete result[mainKey][id]
        Object.values(otherKeys).forEach(fullKeyname => {
            if (id in result[fullKeyname]) {
                delete result[fullKeyname][id]
            }
        })
        // In place: run for a content script, the background can't message itself
        await browser.storage.sync.set(result).then(updateBadgeUnseenCount, () => {})
    })
export const unsubscribeId = (id: string, callback: () => void = () => {}) => {
    ;(inContentScript() ? byBackground('unsubscribeId', id) : unsubscribeIdHere(id)).then(
        () => callback(),
        () => {},
    )
}

// An account's status lists that aren't stored yet, empty as an account starts
// them, added in the account's turn. Monitoring keeps lists for whoever is
// logged in, subscribed or not, and its check may save their first ones
// meanwhile: empty ones in their place would forget the account's recorded
// removals, and announce them again.
export const addMissingUserLists = (user: string): Promise<void> =>
    oneAtATime(statusListsLock(user, true), async () => {
        const userInit = getUserInit(user)
        const stored = await syncGet(Object.keys(userInit))
        const missing = Object.fromEntries(Object.entries(userInit).filter(([key]) => !(key in stored)))
        if (Object.keys(missing).length) {
            await syncSet(missing)
        }
    })

// Answers with why it didn't subscribe, when it didn't. The subscription and
// the account's lists each in their own turn, so it never waits on two.
export const subscribeUserHere = async (user: string): Promise<string | undefined> => {
    const why = await oneAtATime('user_subscriptions', async () => {
        const { user_subscriptions } = await syncGet('user_subscriptions')
        if (user in user_subscriptions) {
            return 'already subscribed to this user'
        }
        if (Object.keys(user_subscriptions).length >= MAX_SUBSCRIPTIONS) {
            return 'maximum number of subscriptions reached'
        }
        user_subscriptions[user] = true
        await syncSet({ user_subscriptions })
    })
    if (!why) {
        await addMissingUserLists(user)
    }
    return why
}

// Every caller hears back: one that failed hears why
export const subscribeUser = (
    user: string,
    callbackSuccess: () => void = () => {},
    callbackError: (msg: string) => void = () => {},
) => {
    ;(inContentScript() ? byBackground('subscribeUser', user) : subscribeUserHere(user)).then(
        why => (why ? callbackError(why) : callbackSuccess()),
        err => callbackError(String(err?.message || err)),
    )
}

export const initStorage = (callback: () => void) => {
    chrome.storage.sync.get(undefined as any, storage => {
        if (Object.keys(storage).length === 0) {
            chrome.storage.sync.set(getStorageInit(), callback)
        } else {
            callback()
        }
    })
}

export const getSubscribedUsers_withSeenAndUnseenIDs = (
    callback: (users_withIDs: Record<string, any>, storage: Record<string, any>) => void,
) => {
    chrome.storage.sync.get(undefined as any, storage => {
        // Defensive check: ensure storage has required properties
        if (!storage || !storage.user_subscriptions) {
            storage = storage || {}
            storage.user_subscriptions = storage.user_subscriptions || {}
            storage.other_subscriptions = storage.other_subscriptions || {}
            storage.options = storage.options || { removal_status: { track: true }, lock_status: { track: true } }
        }
        const users_withIDs: Record<string, any> = {}
        subscribedThings(storage.user_subscriptions).forEach(({ thing, isUser }) => {
            users_withIDs[notificationName(thing, isUser)] = getIDs_thing(thing, isUser, storage)
        })
        callback(users_withIDs, storage)
    })
}

const getSubscribedUsers_withUnseenIDs = (callback: (users_withIDs: Record<string, any>) => void) => {
    chrome.storage.sync.get(undefined as any, storage => {
        const users_withIDs: Record<string, any> = {}
        subscribedThings(storage.user_subscriptions).forEach(({ thing, isUser }) => {
            users_withIDs[notificationName(thing, isUser)] = getUnseenIDs_thing(thing, isUser, storage)
        })
        callback(users_withIDs)
    })
}

export const getUnseenIDs_thing = (thing: string, isUser: boolean, storage: Record<string, any>) => {
    return getIDs_thing(thing, isUser, storage)['unseen']
}

// Get IDs of items whose status has changed
export const getIDs_thing = (thing: string, isUser: boolean, storage: Record<string, any>) => {
    // Defensive checks for options
    const options = storage.options || {}
    const removal_status = options.removal_status || {}
    const lock_status = options.lock_status || {}
    const track_removal = removal_status.track !== false
    const track_lock = lock_status.track !== false
    const unseenIDs: Record<string, boolean> = {}
    const seenIDs: Record<string, boolean> = {}
    let types = []
    const keys = getObjectNamesForThing(thing, isUser)
    if (track_removal) types.push(keys['removed'], keys['approved'])
    if (track_lock) types.push(keys['locked'], keys['unlocked'])

    types.forEach(type => {
        const storageType = storage[type] || {}
        Object.keys(storageType).forEach(id => {
            const item = storageType[id]
            if (item && item.u) unseenIDs[id] = true
            else seenIDs[id] = true
        })
    })
    return { unseen: Object.keys(unseenIDs), seen: Object.keys(seenIDs) }
}

export const getLocalStorageItems = (thing: string, isUser: boolean) => {
    const key_localStorage = getObjectName('items', thing, isUser)
    return browser.storage.local.get({ [key_localStorage]: {} }).then(localStorageItems => {
        return localStorageItems[key_localStorage]
    })
}

// A write rewrites the whole object, up to 1,000 items with their text, and
// most checks have nothing to add
export const addLocalStorageItems = async (items: Record<string, any>, thing: string, isUser: boolean) => {
    if (!Object.keys(items).length) {
        return
    }
    await updateLocal<Record<string, any>>(getObjectName('items', thing, isUser), {}, storedItems => {
        Object.assign(storedItems, items)
        if (Object.keys(storedItems).length > MAX_LOCAL_STORAGE_ITEMS_PER_OBJECT) {
            return trimDict_by_numberValuedAttribute(storedItems, MAX_LOCAL_STORAGE_ITEMS_PER_OBJECT, 'o')
        }
    })
}

// The words a page shows for a followed comment, on its record in place of
// text reddit no longer gives: what reddit gave keeps its markdown, which the
// page's text has lost
export const keepPageTextHere = (id: string, text: string): Promise<void> => {
    const key = getObjectName('items', 'other', false)
    return oneAtATime(key, async () => {
        const storedItems = await readLocal<Record<string, any>>(key, {})
        const item = storedItems[id]
        if (item && isPlaceholderText(item.t)) {
            const itemObj = new LocalStorageItem({ object: item })
            itemObj.setText(text)
            storedItems[id] = itemObj
            await browser.storage.local.set({ [key]: storedItems })
        }
    })
}
export const keepPageText = (id: string, text: string): Promise<void> =>
    inContentScript() ? byBackground('keepPageText', id, text) : keepPageTextHere(id, text)

export const getItemFromLocalStorage = (
    thing: string,
    isUser: boolean,
    id: string,
    localStorage: Record<string, any>,
) => {
    const key = getObjectName('items', thing, isUser)
    if (key in localStorage) {
        if (id in localStorage[key]) {
            return new LocalStorageItem({ object: localStorage[key][id] })
        }
    }
    return ''
}

export const getAllChanges = (callback: (changesByUser: Record<string, any[]>) => void) => {
    chrome.storage.sync.get('user_subscriptions', result => {
        const otherKey = getObjectName('changes', 'other', false)
        const keys = [otherKey]
        const keyToUser_lookup: Record<string, string> = { [otherKey]: FOLLOWED_NOTIFICATION }

        Object.keys(result.user_subscriptions).forEach(user => {
            const key = getObjectName('changes', user, true)
            keys.push(key)
            keyToUser_lookup[key] = user
        })
        chrome.storage.sync.get(keys, res2 => {
            const changesByUser: Record<string, any[]> = {}
            keys.forEach(key => {
                if (key in res2 && res2[key].length) {
                    changesByUser[keyToUser_lookup[key]] = res2[key]
                }
            })
            callback(changesByUser)
        })
    })
}

// Per-type notification eligibility: a change type can produce system
// notifications only when it is both tracked and notify-enabled. Track alone
// still records changes for the badge and history. Missing settings default
// to enabled, matching the stored defaults.
export const getNotifyFlags = (options: Record<string, any>): { removal: boolean; lock: boolean } => {
    const removal = (options || {}).removal_status || {}
    const lock = (options || {}).lock_status || {}
    return {
        removal: removal.track !== false && removal.notify !== false,
        lock: lock.track !== false && lock.notify !== false,
    }
}

export const getOptions = (callback: (options: Record<string, any>) => any) => {
    return browser.storage.sync
        .get(['options'])
        .then((result: Record<string, any>) => callback((result || {}).options))
        .catch(err => {
            console.log(err)
            return callback({})
        })
}

// Every option under its stored name, so the options page can't leave one out:
// saveOptions replaces the whole stored object, so one left out would be lost.
// A new default in getStorageInit is one the page has to save too.
type SavedOptions = ReturnType<typeof getStorageInit>['options'] & {
    hide_subscribe: boolean
    scan_reads_per_click: number
    scan_seconds_between_reads: number
}

export const saveOptions = (options: SavedOptions, callback: () => void) => {
    const { scan_reads_per_click, scan_seconds_between_reads, ...rest } = options
    chrome.storage.sync.set(
        {
            options: {
                ...rest,
                // Left out at the default, so a later, gentler one reaches them
                ...(scan_reads_per_click !== SCAN_READS_DEFAULT && { scan_reads_per_click }),
                ...(scan_seconds_between_reads !== SCAN_SECONDS_DEFAULT && { scan_seconds_between_reads }),
            },
        },
        callback,
    )
}

// Pending post queue for throttled HTML lookups when JSON API fails
const PENDING_POSTS_KEY = 'pending_post_lookups'

export const addToPendingPostQueue = async (postIds: string[]) => {
    // Don't re-enqueue posts that have already been attempted the maximum number
    // of times without resolving — otherwise a failing lookup keeps refilling the
    // queue every cycle and the scan banner never clears.
    const attempts = await getPendingPostAttempts()
    const allowed = postIds.filter(id => (attempts[id] || 0) < MAX_PENDING_POST_ATTEMPTS)
    if (allowed.length === 0) return
    await updateLocal<string[]>(PENDING_POSTS_KEY, [], queue => [...new Set([...queue, ...allowed])])
}

const readPendingPosts = () => readLocal<string[]>(PENDING_POSTS_KEY, [])

export const getNextPendingPosts = async (count: number) => {
    const queue = await readPendingPosts()
    return { posts: queue.slice(0, count), totalRemaining: queue.length }
}

export const getPendingPostQueueSize = async () => (await readPendingPosts()).length

export const removeMultipleFromPendingPostQueue = (postIds: string[]) => {
    const idsToRemove = new Set(postIds)
    return updateLocal<string[]>(PENDING_POSTS_KEY, [], queue => queue.filter(id => !idsToRemove.has(id)))
}

export const removeFromPendingPostQueue = (postId: string) => removeMultipleFromPendingPostQueue([postId])

// Per-post attempt tracking so a post that never resolves (e.g. Reddit keeps
// returning a non-removed status, or the lookup keeps failing) can't be
// re-enqueued by the lookup fallback forever and keep the scan banner stuck.
const PENDING_POST_ATTEMPTS_KEY = 'pending_post_attempts'
export const MAX_PENDING_POST_ATTEMPTS = 3

export const clearPendingPostQueue = async () => {
    await browser.storage.local.remove([PENDING_POSTS_KEY, 'pending_post_progress', PENDING_POST_ATTEMPTS_KEY])
}

// Empties the queue and its progress but keeps the attempts, which stop the
// lookup fallback from queueing a post that never resolves again and again
export const emptyPendingPostQueue = async () => {
    await browser.storage.local.remove([PENDING_POSTS_KEY, 'pending_post_progress'])
}

export const getPendingPostAttempts = () => readLocal<Record<string, number>>(PENDING_POST_ATTEMPTS_KEY, {})

export const recordPendingPostAttempt = async (postId: string): Promise<number> => {
    const attempts = await getPendingPostAttempts()
    attempts[postId] = (attempts[postId] || 0) + 1
    await browser.storage.local.set({ [PENDING_POST_ATTEMPTS_KEY]: attempts })
    return attempts[postId]
}

export const clearPendingPostAttempt = async (postId: string) => {
    const attempts = await getPendingPostAttempts()
    if (postId in attempts) {
        delete attempts[postId]
        await browser.storage.local.set({ [PENDING_POST_ATTEMPTS_KEY]: attempts })
    }
}

// --- Rate-limit backoff (shared across the monitoring alarm) ---
// Reddit returns 403/429 when too many requests come from one client in a short
// window, which on old.reddit can lock the user out of browsing for minutes.
// Instead of hammering at the fixed poll interval, back off exponentially and
// skip cycles until the cooldown expires.
const RATE_LIMIT_UNTIL_KEY = 'rate_limit_until'
const RATE_LIMIT_LEVEL_KEY = 'rate_limit_level'
// Last 429 timestamp, kept across clearRateLimitBackoff: the backoff keys reset
// on the first success, but the verification budget stays reduced for a while
// after (see computeAbsentVerifyBudget) so a recovered cycle doesn't burst
// straight back into the limiter.
const RATE_LIMIT_LAST_HIT_KEY = 'rate_limit_last_hit'
const RATE_LIMIT_BASE_MS = 2 * 60 * 1000 // 2 minutes
const RATE_LIMIT_MAX_MS = 30 * 60 * 1000 // 30 minutes

// Hits and clears run one at a time, in the order they're called, in every
// context (the popup's follow lookup sees 429s too): callers don't await a hit
// (flagIfRateLimited), and a clear that started before the hit was written
// would otherwise erase it
const BACKOFF_LOCK = 'rate_limit_backoff'

export const recordRateLimitHit = (): Promise<number> =>
    oneAtATime(BACKOFF_LOCK, async () => {
        const result = await browser.storage.local.get({ [RATE_LIMIT_LEVEL_KEY]: 0 })
        const level = (result[RATE_LIMIT_LEVEL_KEY] as number) || 0
        const waitMs = Math.min(RATE_LIMIT_BASE_MS * Math.pow(2, level), RATE_LIMIT_MAX_MS)
        await browser.storage.local.set({
            [RATE_LIMIT_UNTIL_KEY]: Date.now() + waitMs,
            [RATE_LIMIT_LEVEL_KEY]: level + 1,
            [RATE_LIMIT_LAST_HIT_KEY]: Date.now(),
        })
        return waitMs
    })

export const getMsSinceLastRateLimitHit = async (): Promise<number | null> => {
    const result = await browser.storage.local.get({ [RATE_LIMIT_LAST_HIT_KEY]: 0 })
    const last = (result[RATE_LIMIT_LAST_HIT_KEY] as number) || 0
    return last > 0 ? Math.max(0, Date.now() - last) : null
}

// A lookup that answered ends the backoff, but only once it has run out. A
// lookup that hit a 429 stops its own loop and still answers with what it
// read, and a later lookup in the same cycle answers too; neither may erase
// the backoff that 429 started, or the next cycle runs straight back into the
// limiter and the level never climbs.
export const clearRateLimitBackoff = (): Promise<void> =>
    oneAtATime(BACKOFF_LOCK, async () => {
        const result = await browser.storage.local.get({ [RATE_LIMIT_LEVEL_KEY]: 0, [RATE_LIMIT_UNTIL_KEY]: 0 })
        const until = Number(result[RATE_LIMIT_UNTIL_KEY]) || 0
        if (until > Date.now()) {
            return
        }
        if (result[RATE_LIMIT_LEVEL_KEY] || until) {
            await browser.storage.local.set({ [RATE_LIMIT_UNTIL_KEY]: 0, [RATE_LIMIT_LEVEL_KEY]: 0 })
        }
    })

// After any hit still being written, so a loop that just saw a 429 reads it
export const getRateLimitBackoffRemainingMs = (): Promise<number> =>
    afterWrites(BACKOFF_LOCK, async () => {
        const result = await browser.storage.local.get({ [RATE_LIMIT_UNTIL_KEY]: 0 })
        const until = (result[RATE_LIMIT_UNTIL_KEY] as number) || 0
        return Math.max(0, until - Date.now())
    })

// Message for the popup's "send a test notification" link: confirms the
// system-level pipeline works, and flags any notification types turned off in
// options so a quiet extension isn't mistaken for a broken one.
export const getTestNotificationMessage = (options: Record<string, any>): string => {
    const flags = getNotifyFlags(options)
    const base = 'If you see this, notifications are working.'
    if (!flags.removal && !flags.lock) {
        return 'If you see this, notifications are working, but notifications for removed and locked content are turned off in options.'
    }
    if (!flags.removal) return base + ' Note: notifications for removed content are turned off in options.'
    if (!flags.lock) return base + ' Note: notifications for locked content are turned off in options.'
    return base
}

export const updateBadgeUnseenCount = () => {
    if (inContentScript()) {
        browser.runtime
            .sendMessage({
                action: 'update-badge',
            })
            .catch(() => {})
    } else {
        getSubscribedUsers_withUnseenIDs(usersUnseenIDs => {
            let total = 0
            Object.values(usersUnseenIDs).forEach(ids => {
                total += ids.length
            })
            const setCount = (text: string) => {
                actionApi().setBadgeBackgroundColor({ color: 'red' })
                actionApi().setBadgeText({ text })
            }
            if (total > 0) {
                setCount(total.toString())
                return
            }
            // A warning still standing keeps its mark: every check ends up here
            chrome.storage.local.get(['error_status'], local => {
                if (local?.error_status) setWarningBadge()
                else setCount('')
            })
        })
    }
}
