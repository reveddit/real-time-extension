import { ItemForStorage, LocalStorageItem, trimDict_by_numberValuedAttribute } from './common'
import browser from 'webextension-polyfill'

export const INTERVAL_DEFAULT = 1
export const SEEN_COUNT_DEFAULT = 2

// These limits are set with consideration for Chrome's sync & local storage limits,
// and for the objects stored by the extension
export const MAX_SUBSCRIPTIONS = 5
const MAX_LOCAL_STORAGE_ITEMS_PER_OBJECT = 500
export const MAX_SYNC_STORAGE_ITEMS_PER_OBJECT = 130
export const MAX_SYNC_STORAGE_CHANGES = 100
export const MAX_OTHER_SUBSCRIPTIONS = 100

export const REMOVED = 1
export const APPROVED = 2
export const LOCKED = 3
export const UNLOCKED = 4
export const EDITED = 5
export const DELETED = 6

const trackTypes: Record<string, any[] | Record<string, any>> = {
    changes: [],
    removed: {},
    approved: {},
    locked: {},
    unlocked: {},
}

const getObjectName = (type: string, thing: string, isUser: boolean): string => {
    if (isUser) {
        return type + '_u_' + thing
    } else {
        return type + '_' + thing
    }
}

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

export const getOldestDateKey = (thing: string, isUser: boolean): string => {
    if (isUser) {
        return 'oldest_date_u_' + thing
    } else {
        return 'oldest_date_' + thing
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
        user_initial_lookup_done: {}, // tracks whether we've ever looked up a user's content
        other_subscriptions: {},
        options: {
            interval: INTERVAL_DEFAULT,
            seen_count: SEEN_COUNT_DEFAULT,
            custom_clientid: '',
            removal_status: { track: true, notify: true },
            lock_status: { track: true, notify: true },
            monitor_quarantined: false,
        },
        last_check: null,
        last_check_quarantined: null,
    }
    addTrackTypes(result, 'other', false)
    return result
}

export const markEverythingAsSeen = () => {
    return (browser.storage.sync.get as any)(null).then((storage: Record<string, any>) => {
        const users = Object.keys(storage.user_subscriptions)
        users.forEach(user => {
            markThingAsSeen(storage, user, true)
        })
        markThingAsSeen(storage, 'other', false)
        return setStorageUpdateBadge(storage)
    })
}

const PENDING_NOTIFICATIONS_KEY = 'pending_notifications'

type PendingNotification = {
    thing: string
    count: number
    types: string[]
    itemIds?: string[]
    firstAttemptAt: number
    attempts: number
}

export const getPendingNotification = (thing: string): Promise<PendingNotification | null> => {
    return browser.storage.local.get({ [PENDING_NOTIFICATIONS_KEY]: {} }).then((r: any) => {
        const all = r[PENDING_NOTIFICATIONS_KEY] || {}
        return all[thing] || null
    })
}

export const setPendingNotification = (thing: string, data: Omit<PendingNotification, 'thing'>) => {
    return browser.storage.local.get({ [PENDING_NOTIFICATIONS_KEY]: {} }).then((r: any) => {
        const all = r[PENDING_NOTIFICATIONS_KEY] || {}
        all[thing] = { thing, ...data }
        return browser.storage.local.set({ [PENDING_NOTIFICATIONS_KEY]: all })
    })
}

export const clearPendingNotification = (thing: string) => {
    return browser.storage.local.get({ [PENDING_NOTIFICATIONS_KEY]: {} }).then((r: any) => {
        const all = r[PENDING_NOTIFICATIONS_KEY] || {}
        delete all[thing]
        return browser.storage.local.set({ [PENDING_NOTIFICATIONS_KEY]: all })
    })
}

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

export const getNotificationLog = (): Promise<NotificationLogEntry[]> => {
    return browser.storage.local.get({ [NOTIFICATION_LOG_KEY]: [] }).then((r: any) => {
        return r[NOTIFICATION_LOG_KEY] || []
    })
}

export const appendNotificationLog = (entry: NotificationLogEntry): Promise<void> => {
    return browser.storage.local.get({ [NOTIFICATION_LOG_KEY]: [] }).then((r: any) => {
        const log: NotificationLogEntry[] = r[NOTIFICATION_LOG_KEY] || []
        log.push(entry)
        if (log.length > NOTIFICATION_LOG_MAX) {
            log.splice(0, log.length - NOTIFICATION_LOG_MAX)
        }
        return browser.storage.local.set({ [NOTIFICATION_LOG_KEY]: log }) as unknown as void
    })
}

const BACKLOG_SUMMARY_KEY = 'backlog_summary'
export const BACKLOG_SUMMARY_DELAY_MS = 12 * 60 * 60 * 1000

type BacklogSummaryState = { installedAt: number | null; initialBacklogNotified: boolean; summarySent: boolean }

export const getBacklogSummaryState = (): Promise<BacklogSummaryState> => {
    return browser.storage.local.get({ [BACKLOG_SUMMARY_KEY]: {} }).then((r: any) => {
        const state = r[BACKLOG_SUMMARY_KEY] || {}
        return {
            installedAt: state.installedAt ?? null,
            initialBacklogNotified: !!state.initialBacklogNotified,
            summarySent: !!state.summarySent,
        }
    })
}

export const setBacklogSummaryInstalledAt = (ts: number): Promise<void> => {
    return browser.storage.local.get({ [BACKLOG_SUMMARY_KEY]: {} }).then((r: any) => {
        const state = r[BACKLOG_SUMMARY_KEY] || {}
        state.installedAt = ts
        return browser.storage.local.set({ [BACKLOG_SUMMARY_KEY]: state }) as unknown as void
    })
}

export const markBacklogInitialNotified = (): Promise<void> => {
    return browser.storage.local.get({ [BACKLOG_SUMMARY_KEY]: {} }).then((r: any) => {
        const state = r[BACKLOG_SUMMARY_KEY] || {}
        state.initialBacklogNotified = true
        return browser.storage.local.set({ [BACKLOG_SUMMARY_KEY]: state }) as unknown as void
    })
}

export const markBacklogSummarySent = (): Promise<void> => {
    return browser.storage.local.get({ [BACKLOG_SUMMARY_KEY]: {} }).then((r: any) => {
        const state = r[BACKLOG_SUMMARY_KEY] || {}
        state.initialBacklogNotified = true
        state.summarySent = true
        return browser.storage.local.set({ [BACKLOG_SUMMARY_KEY]: state }) as unknown as void
    })
}

export const markThingAsSeen = (storage: Record<string, any>, thing: string, isUser: boolean) => {
    const keys = getObjectNamesForThing(thing, isUser)
    delete keys['changes']
    const fullKeynames: string[] = []
    Object.values(keys).forEach(fullKeyname => {
        fullKeynames.push(fullKeyname)
    })
    fullKeynames.forEach(fullKeyname => {
        Object.values(storage[fullKeyname]).forEach((item: any) => {
            item.u = false
        })
    })
}

export const setStorageUpdateBadge = (storage: Record<string, any>) => {
    return browser.storage.sync
        .set(storage)
        .then(() => {
            return browser.runtime.sendMessage({ action: 'update-badge' })
        })
        .catch(() => {})
}

const markSeenForStorageKey = (
    storage: Record<string, any>,
    storage_keys: Record<string, string>,
    key: string,
    ids: Record<string, any>,
    is_user: boolean,
) => {
    const storage_item = storage[storage_keys[key]]
    Object.keys(ids).forEach(id => {
        if (id in storage_item) {
            storage_item[id].u = false
        } else if (is_user) {
            storage_item[id] = new ItemForStorage(ids[id], false)
        }
    })
}

export const markIDsAsSeenIfSubscribed = (
    storage: Record<string, any>,
    user: string,
    is_user: boolean,
    removed_ids: Record<string, any>,
    approved_ids: Record<string, any>,
    locked_ids: Record<string, any>,
    unlocked_ids: Record<string, any>,
    callback: () => void = () => {},
) => {
    const storage_keys = getObjectNamesForThing(user, is_user)
    delete storage_keys['changes']
    const user_subscribed = storage.user_subscriptions[user]
    if (user_subscribed || !is_user) {
        markSeenForStorageKey(storage, storage_keys, 'removed', removed_ids, is_user)
        markSeenForStorageKey(storage, storage_keys, 'approved', approved_ids, is_user)
        markSeenForStorageKey(storage, storage_keys, 'locked', locked_ids, is_user)
        markSeenForStorageKey(storage, storage_keys, 'unlocked', unlocked_ids, is_user)
        chrome.storage.sync.set(storage, callback)
    }
}

export const subscribeId = (id: string, callback: () => void = () => {}) => {
    const key = 'other_subscriptions'
    chrome.storage.sync.get(key, result => {
        result[key][id] = { t: Math.floor(new Date().getTime() / 1000) }
        const itemsToSave = trimDict_by_numberValuedAttribute(result[key], MAX_OTHER_SUBSCRIPTIONS, 't')
        chrome.storage.sync.set({ [key]: itemsToSave }, callback)
    })
}
export const unsubscribeId = (id: string, callback: () => void = () => {}) => {
    const mainKey = 'other_subscriptions'
    const otherKeys = getObjectNamesForThing('other', false)
    delete otherKeys['changes']
    chrome.storage.sync.get(Object.values(otherKeys).concat(mainKey), result => {
        delete result[mainKey][id]
        Object.values(otherKeys).forEach(fullKeyname => {
            if (id in result[fullKeyname]) {
                delete result[fullKeyname][id]
            }
        })
        chrome.storage.sync.set(result, () => {
            chrome.runtime
                .sendMessage({ action: 'update-badge' })
                .then(callback)
                .catch(() => callback())
        })
    })
}
export const getSubscribedIds = (callback: (ids: string[]) => void = () => {}) => {
    const key = 'other_subscriptions'
    chrome.storage.sync.get(key, result => {
        callback(Object.keys(result[key]))
    })
}

export const subscribeUser = (
    user: string,
    callbackSuccess: () => void = () => {},
    callbackError: (msg: string) => void = () => {},
) => {
    const userInit = getUserInit(user)
    chrome.storage.sync.get('user_subscriptions', result => {
        const user_subscriptions = result.user_subscriptions
        if (!(user in user_subscriptions)) {
            if (Object.keys(user_subscriptions).length < MAX_SUBSCRIPTIONS) {
                user_subscriptions[user] = true
                chrome.storage.sync.set({ user_subscriptions, ...userInit }, callbackSuccess)
            } else {
                callbackError('maximum number of subscriptions reached')
            }
        } else {
            callbackError('already subscribed to this user')
        }
    })
}

export const unsubscribeUser = (user: string, callback: () => void) => {
    const userKeys = Object.keys(getUserInit(user))
    chrome.storage.sync.get(['user_subscriptions', 'user_unsubscriptions'], result => {
        const { user_subscriptions, user_unsubscriptions = {} } = result
        delete user_subscriptions[user]
        user_unsubscriptions[user] = Math.floor(Date.now() / 1000)
        chrome.storage.sync.set({ user_subscriptions, user_unsubscriptions }, () => {
            chrome.storage.sync.remove(userKeys, () => {
                const userKey_localStorage = getObjectName('items', user, true)
                chrome.runtime.sendMessage({ action: 'update-badge' })
                chrome.storage.local.remove(userKey_localStorage, callback)
            })
        })
    })
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
        const users = Object.keys(storage.user_subscriptions)
        const users_withIDs: Record<string, any> = {}
        users.forEach(user => {
            users_withIDs[user] = getIDs_thing(user, true, storage)
        })
        users_withIDs['other'] = getIDs_thing('other', false, storage)
        callback(users_withIDs, storage)
    })
}

export const getSubscribedUsers_withUnseenIDs = (callback: (users_withIDs: Record<string, any>) => void) => {
    chrome.storage.sync.get(undefined as any, storage => {
        const users = Object.keys(storage.user_subscriptions)
        const users_withIDs: Record<string, any> = {}
        users.forEach(user => {
            users_withIDs[user] = getUnseenIDs_thing(user, true, storage)
        })
        users_withIDs['other'] = getUnseenIDs_thing('other', false, storage)
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

export const saveLocalStorageItems = (thing: string, isUser: boolean, itemsToSave: Record<string, any>) => {
    const key_localStorage = getObjectName('items', thing, isUser)
    return browser.storage.local.set({ [key_localStorage]: itemsToSave })
}

export const addLocalStorageItems = (items: Record<string, any>, thing: string, isUser: boolean) => {
    const key_localStorage = getObjectName('items', thing, isUser)
    return chrome.storage.local.get({ [key_localStorage]: {} }, localStorageItems => {
        const storedItems = localStorageItems[key_localStorage]
        Object.keys(items).forEach(id => {
            storedItems[id] = items[id]
        })
        let itemsToSave = storedItems
        if (Object.keys(storedItems).length > MAX_LOCAL_STORAGE_ITEMS_PER_OBJECT) {
            itemsToSave = trimDict_by_numberValuedAttribute(storedItems, MAX_LOCAL_STORAGE_ITEMS_PER_OBJECT, 'o')
        }
        return browser.storage.local.set({ [key_localStorage]: itemsToSave })
    })
}

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
        const keys = [getObjectName('changes', 'other', false)]
        const keyToUser_lookup: Record<string, string> = { changes_other: 'other' }

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

export const getOptions = (callback: (users: string[], others: string[], options: Record<string, any>) => any) => {
    return browser.storage.sync
        .get(['user_subscriptions', 'other_subscriptions', 'options'])
        .then((result: Record<string, any>) => {
            const r = result || {}
            const users = Object.keys(r.user_subscriptions || {})
            const others = Object.keys(r.other_subscriptions || {})
            const options = r.options
            return callback(users, others, options)
        })
        .catch(err => {
            console.log(err)
            return callback([], [], {})
        })
}
export const saveOptions = (
    seen_count: number,
    interval: number,
    custom_clientid: string,
    removed_track: boolean,
    removed_notify: boolean,
    locked_track: boolean,
    locked_notify: boolean,
    hide_subscribe: boolean,
    monitor_quarantined: boolean,
    callback: () => void,
) => {
    chrome.storage.sync.set(
        {
            options: {
                seen_count,
                interval,
                custom_clientid,
                removal_status: { track: removed_track, notify: removed_notify },
                lock_status: { track: locked_track, notify: locked_notify },
                hide_subscribe,
                monitor_quarantined,
            },
        },
        callback,
    )
}

// Pending post queue for throttled HTML lookups when JSON API fails
const PENDING_POSTS_KEY = 'pending_post_lookups'

export const addToPendingPostQueue = async (postIds: string[]) => {
    const result = await browser.storage.local.get({ [PENDING_POSTS_KEY]: [] })
    const existingQueue = result[PENDING_POSTS_KEY] as string[]
    const newQueue = [...new Set([...existingQueue, ...postIds])]
    await browser.storage.local.set({ [PENDING_POSTS_KEY]: newQueue })
}

export const getNextPendingPost = async () => {
    const result = await browser.storage.local.get({ [PENDING_POSTS_KEY]: [] })
    const queue = result[PENDING_POSTS_KEY] as string[]
    if (queue.length === 0) return null
    return queue[0]
}

export const getNextPendingPosts = async (count: number) => {
    const result = await browser.storage.local.get({ [PENDING_POSTS_KEY]: [] })
    const queue = result[PENDING_POSTS_KEY] as string[]
    return { posts: queue.slice(0, count), totalRemaining: queue.length }
}

export const getPendingPostQueueSize = async () => {
    const result = await browser.storage.local.get({ [PENDING_POSTS_KEY]: [] })
    return (result[PENDING_POSTS_KEY] as string[]).length
}

export const removeFromPendingPostQueue = async (postId: string) => {
    const result = await browser.storage.local.get({ [PENDING_POSTS_KEY]: [] })
    const queue = result[PENDING_POSTS_KEY] as string[]
    const newQueue = queue.filter((id: string) => id !== postId)
    await browser.storage.local.set({ [PENDING_POSTS_KEY]: newQueue })
}

export const removeMultipleFromPendingPostQueue = async (postIds: string[]) => {
    const result = await browser.storage.local.get({ [PENDING_POSTS_KEY]: [] })
    const queue = result[PENDING_POSTS_KEY] as string[]
    const idsToRemove = new Set(postIds)
    const newQueue = queue.filter((id: string) => !idsToRemove.has(id))
    await browser.storage.local.set({ [PENDING_POSTS_KEY]: newQueue })
}
