import {
    lookupItemsByID,
    lookupItemsByLoggedInUserWithAuth,
    getAuth,
    getLoggedinUser,
    storeRedditCookies,
} from './requests'
import {
    REMOVED,
    DELETED,
    APPROVED,
    LOCKED,
    UNLOCKED,
    addLocalStorageItems,
    getLocalStorageItems,
    getPendingNotification,
    setPendingNotification,
    clearPendingNotification,
    appendNotificationLog,
    MAX_SYNC_STORAGE_ITEMS_PER_OBJECT,
    MAX_SYNC_STORAGE_CHANGES,
    SEEN_COUNT_DEFAULT,
    getObjectNamesForThing,
    getUserInit,
    getOldestDateKey,
    getNextPendingPosts,
    removeFromPendingPostQueue,
    getBacklogSummaryState,
    markBacklogInitialNotified,
    markBacklogSummarySent,
    BACKLOG_SUMMARY_DELAY_MS,
} from './storage'
import {
    createNotification,
    updateBadgeUnseenCount,
    trimDict_by_numberValuedAttribute,
    isUserDeletedItem,
    isRemovedItem,
    isComment,
    ItemForStorage,
    LocalStorageItem,
    ChangeForStorage,
    setWarningBadge,
} from './common'
import browser from 'webextension-polyfill'
import { getPost_fromOld } from './parse_html/old'

const SUBSCRIBED_FROM_REDDIT = 0
const SUBSCRIBED_FROM_REVEDDIT = 1
const SUBSCRIBED_FROM_NA = 2

const TARGET_SEEN_COUNT_FOR_PREVIOUSLY_RECORDED_CHANGE = Math.floor(Math.random() * 60) + 60

// Require multiple consecutive observations of "removed" status before alerting,
// to prevent false removal notifications from transient API failures or intermittent responses.
// Randomized per extension instance (3-5 cycles) to thwart potential anti-extension fingerprinting.
const REMOVAL_CONFIRMATION_THRESHOLD = Math.floor(Math.random() * 3) + 3

const FULL_RESPONSE_ITEM_COUNT = 100

const BACKLOG_AGE_THRESHOLD_SECONDS = 48 * 60 * 60

interface MarkChangesResult {
    num_changes: number
    realtimeChanges: { count: number; changeTypes: string[]; ids: string[] }
    backlogChanges: { count: number; changeTypes: string[]; ids: string[]; ageRange: { min: number; max: number } }
}

const updateOldestDateThreshold = (items: any[], itemLookup: Record<string, any>, thing: string, isUser: boolean) => {
    if (items.length < FULL_RESPONSE_ITEM_COUNT) {
        return Promise.resolve(null)
    }

    const timestamps = items
        .map(itemWrap => {
            const item = itemWrap.data || itemLookup[itemWrap.name] || itemWrap
            return item.created_utc
        })
        .filter(ts => typeof ts === 'number' && ts > 0)

    if (timestamps.length === 0) {
        return Promise.resolve(null)
    }

    timestamps.sort((a, b) => a - b)
    const oldestDate = timestamps[0]

    const key = getOldestDateKey(thing, isUser)
    return browser.storage.local.set({ [key]: oldestDate }).then(() => oldestDate)
}

const getOldestDateThreshold = (thing: string, isUser: boolean) => {
    const key = getOldestDateKey(thing, isUser)
    return browser.storage.local.get({ [key]: null }).then(result => result[key])
}

const fetchItemFromApiInfo = async (id: string) => {
    try {
        const response = await fetch(`https://www.reddit.com/api/info.json?id=${id}`)
        const json = await response.json()
        return json.data.children[0].data
    } catch {
        return null
    }
}

const PENDING_POST_BATCH_SIZE = 3
const PENDING_POST_DELAY_MS = 2000

const processPendingPosts = async (storage: Record<string, any>) => {
    const { posts, totalRemaining } = await getNextPendingPosts(PENDING_POST_BATCH_SIZE)
    if (posts.length === 0) {
        await browser.storage.local.remove('pending_post_progress')
        return
    }

    const totalAtStart = totalRemaining
    let processed = 0

    for (const postId of posts) {
        const isAlreadyKnownRemoved = (() => {
            const users = storage.user_subscriptions ? Object.keys(storage.user_subscriptions) : []
            const things = [...users.map(u => ({ thing: u, isUser: true })), { thing: 'other', isUser: false }]
            for (const { thing, isUser } of things) {
                const keys = getObjectNamesForThing(thing, isUser)
                if (postId in (storage[keys['removed']] || {})) return true
            }
            return false
        })()

        if (isAlreadyKnownRemoved) {
            await removeFromPendingPostQueue(postId)
            processed++
            continue
        }

        try {
            const postPath = '/comments/' + postId.substring(3) + '/'
            const result = await getPost_fromOld(postPath)

            if (result && 'is_removed' in result && result.is_removed) {
                const itemData = await fetchItemFromApiInfo(postId)
                if (itemData) {
                    itemData.is_robot_indexable = false

                    const author = itemData.author
                    const isUser = storage.user_subscriptions && author in storage.user_subscriptions
                    const thing = isUser ? author : 'other'

                    console.log(`Detected removed post ${postId} (author: ${author}), updating status...`)

                    const itemLookup = { [postId]: itemData }

                    await checkForChanges_thing_byId(
                        [postId],
                        thing,
                        isUser,
                        null,
                        storage,
                        SUBSCRIBED_FROM_NA,
                        itemLookup,
                        [],
                        [{ data: itemData }],
                        true,
                    )
                }
            } else {
                console.log(`Pending post lookup: ${postId} is not removed.`)
            }
        } catch {
            /* ignored */
        }

        await removeFromPendingPostQueue(postId)
        processed++

        await browser.storage.local.set({
            pending_post_progress: {
                processed: totalAtStart - totalRemaining + processed,
                total: totalAtStart,
                lastUpdated: Date.now(),
            },
        })

        if (processed < posts.length) {
            await new Promise(r => setTimeout(r, PENDING_POST_DELAY_MS))
        }
    }

    const remainingAfter = totalRemaining - processed
    if (remainingAfter <= 0) {
        await browser.storage.local.remove('pending_post_progress')
    }
}

export const setCurrentStateForId = (id: string, subscribedFromURL: string) => {
    let subscribedFrom = SUBSCRIBED_FROM_REDDIT
    if (subscribedFromURL.match(/^https:\/\/www.reveddit.com/)) {
        subscribedFrom = SUBSCRIBED_FROM_REVEDDIT
    }
    return chrome.storage.sync.get(undefined as any, function (storage: Record<string, any>) {
        getAuth().then((auth: any) => {
            return checkForChanges_thing_byId([id], 'other', false, auth, storage, subscribedFrom, {})
        })
    })
}

const MIN_QUARANTINED_CHECK_INTERVAL_IN_SECONDS = 20 * (60 * 60 * 24)

export const checkForChanges = () => {
    chrome.storage.sync.get(undefined as any, function (storage: Record<string, any>) {
        const other = Object.keys(storage.other_subscriptions)
        const now = Math.floor(Date.now() / 1000)

        // check for quarantined content once in awhile and enable monitor_quarantined if some is found
        // because users may not know to enable this option
        // the option is off by default because it can appear to cause an occasional logout
        if (
            !storage.last_check_quarantined ||
            now - storage.last_check_quarantined > MIN_QUARANTINED_CHECK_INTERVAL_IN_SECONDS
        ) {
            storage.tempVar_monitor_quarantined = true
        }

        // Only get OAuth auth if user has provided a custom client ID
        const needsOAuth = storage.options.custom_clientid && storage.options.custom_clientid !== ''
        const authPromise = needsOAuth ? getAuth(storage.tempVar_monitor_quarantined) : Promise.resolve('none')

        let cachedAuth: any
        authPromise
            .then((auth: any) => {
                cachedAuth = auth
                // Always check for logged-in user, regardless of subscription status
                return checkForChanges_loggedInUser(auth, storage)
            })
            .then(() => {
                // Also check other subscriptions if any exist
                if (other.length) {
                    return checkForChanges_other(cachedAuth, storage)
                }
            })
            .then(() => {
                // Process one pending post per alarm cycle (throttled)
                return processPendingPosts(storage)
            })
            .then(() => {
                const newStorage: Record<string, any> = { last_check: now }
                if (storage.tempVar_monitor_quarantined) {
                    newStorage.last_check_quarantined = now
                }
                if (storage.tempVar_quarantined_content_found) {
                    newStorage.options = storage.options
                    newStorage.options.monitor_quarantined = true
                }
                chrome.storage.sync.set(newStorage)
                return maybeFireBacklogSummary(storage)
            })
            .catch(error => {
                console.log('Error in checkForChanges:', error)
                // Clear warning badge on error
                updateBadgeUnseenCount()
            })
    })
}

const checkForChanges_loggedInUser = async (auth: any, storage: Record<string, any>) => {
    // First get the current logged-in user
    return getLoggedinUser()
        .then((loggedInUser: any) => {
            if (!loggedInUser) {
                console.log('No logged-in user found, skipping user monitoring')
                return
            }
            // Remember the last detected logged-in user for popup display without extra network calls
            try {
                chrome.storage.local.set({ last_logged_in_user: loggedInUser })
            } catch {
                /* ignored */
            }

            // Always monitor the currently logged-in user, regardless of subscription status
            // Ensure storage keys exist for the logged-in user
            const userInit = getUserInit(loggedInUser)
            chrome.storage.sync.get(Object.keys(userInit), existingKeys => {
                const keysToCreate: Record<string, any> = {}
                Object.keys(userInit).forEach(key => {
                    if (!(key in existingKeys)) {
                        keysToCreate[key] = userInit[key]
                    }
                })
                if (Object.keys(keysToCreate).length > 0) {
                    chrome.storage.sync.set(keysToCreate)
                }
            })

            // Use message passing to get items from content script context
            return new Promise(resolve => {
                // Try to find a Reddit tab to make the request from
                chrome.tabs.query({ url: ['*://*.reddit.com/*'] }, tabs => {
                    if (tabs.length === 0) {
                        // Use stored cookies as fallback
                        resolve('use_stored_cookies')
                        return
                    }

                    // Check if we have a supported subdomain (www.reddit.com or old.reddit.com)
                    const supportedTabs = tabs.filter(tab => {
                        const hostname = new URL(tab.url!).hostname
                        return hostname === 'www.reddit.com' || hostname === 'old.reddit.com'
                    })

                    if (supportedTabs.length === 0) {
                        console.log('No supported Reddit subdomains found (www.reddit.com or old.reddit.com)')
                        // Try to use stored cookies as fallback
                        resolve('use_stored_cookies')
                        return
                    }

                    // Use the first supported Reddit tab
                    const tab = supportedTabs[0]

                    // Store cookies for future use when no tabs are open
                    storeRedditCookies()
                    ;(chrome.tabs.sendMessage as any)(
                        tab.id!,
                        { action: 'get-logged-in-user-items' },
                        (response: any) => {
                            if ((chrome.runtime as any).lastError) {
                                // Receiving end does not exist, fall back gracefully and set warning badge
                                console.log(
                                    'Error sending message to content script:',
                                    (chrome.runtime as any).lastError,
                                )
                                setWarningBadge('needs_user')
                                resolve('use_stored_cookies')
                                return
                            }
                            resolve(response)
                        },
                    )
                })
            })
                .then(items => {
                    if (!items) return // handle expected errors

                    // Handle stored cookies case
                    if (items === 'use_stored_cookies') {
                        // Try to fetch items using stored cookies
                        return lookupItemsByLoggedInUserWithAuth(
                            '',
                            'new',
                            '',
                            storage.options.monitor_quarantined,
                            storage.tempVar_monitor_quarantined,
                            auth,
                        ).then(storedItems => {
                            if (!storedItems) {
                                // Stored cookies also failed → keep yellow badge to indicate attention needed
                                setWarningBadge('needs_user')
                                return // handle expected errors
                            }
                            const ids: string[] = []
                            let quarantined_subreddits = new Set()
                            const itemLookup: Record<string, any> = {}
                            if ((storedItems as any).user && (storedItems as any).user.items) {
                                // format from cred2.reveddit.com
                                storedItems = (storedItems as any).user.items
                            }
                            ;(storedItems as any[]).forEach((item: any) => {
                                if (item.data && item.data.name) {
                                    // format from reddit
                                    item = item.data
                                }
                                ids.push(item.name)
                                itemLookup[item.name] = item
                                if (item.quarantine) {
                                    quarantined_subreddits.add(item.subreddit)
                                    storage.tempVar_quarantined_content_found = true
                                }
                            })
                            return checkForChanges_thing_byId(
                                ids,
                                loggedInUser,
                                true,
                                auth,
                                storage,
                                SUBSCRIBED_FROM_NA,
                                itemLookup,
                                Array.from(quarantined_subreddits) as string[],
                            )
                        })
                    }

                    const ids: string[] = []
                    let quarantined_subreddits = new Set()
                    const itemLookup: Record<string, any> = {}
                    if ((items as any).user && (items as any).user.items) {
                        // format from cred2.reveddit.com
                        items = (items as any).user.items
                    }
                    ;(items as any[]).forEach((item: any) => {
                        if (item.data && item.data.name) {
                            // format from reddit
                            item = item.data
                        }
                        ids.push(item.name)
                        itemLookup[item.name] = item
                        if (item.quarantine) {
                            quarantined_subreddits.add(item.subreddit)
                            storage.tempVar_quarantined_content_found = true
                        }
                    })
                    return checkForChanges_thing_byId(
                        ids,
                        loggedInUser,
                        true,
                        auth,
                        storage,
                        SUBSCRIBED_FROM_NA,
                        itemLookup,
                        Array.from(quarantined_subreddits) as string[],
                    )
                })
                .then(() => {
                    // Clear warning badge and error state if we successfully processed items
                    chrome.storage.local.remove('error_status', () => {
                        updateBadgeUnseenCount()
                    })
                })
        })
        .catch(error => {
            console.log('Error in checkForChanges_loggedInUser:', error)
        })
}

function checkForChanges_other(auth: any, storage: Record<string, any>) {
    const ids = Object.keys(storage.other_subscriptions)
    if (ids.length) {
        checkForChanges_thing_byId(ids, 'other', false, auth, storage, SUBSCRIBED_FROM_NA)
    }
}

const checkForChanges_thing_byId = async (
    ids: string[],
    thing: string,
    isUser: boolean,
    auth: any,
    storage: Record<string, any>,
    subscribedFrom: number,
    itemLookup: Record<string, any> = {},
    quarantined_subreddits: string[] = [],
    preFetchedItems: any[] | null = null,
    skipConfirmationThreshold = false,
) => {
    let promise
    const monitor_quarantined = storage.options.monitor_quarantined
    if (preFetchedItems) {
        promise = Promise.resolve(preFetchedItems)
    } else if (location.protocol.match(/^http/)) {
        // this condition is for when the code is activated via a content script (e.g. the subscribe button) and browser.cookies is unavailable
        promise = browser.runtime.sendMessage({ action: 'get-reddit-items-by-id', ids, monitor_quarantined })
    } else {
        promise = lookupItemsByID(
            ids,
            auth,
            monitor_quarantined,
            storage.tempVar_monitor_quarantined,
            quarantined_subreddits,
        )
    }
    return promise.then(result => {
        if (!result) return // handle expected errors
        const items = Array.isArray(result) ? result : result.items
        if (!items) return // handle expected errors from obj
        const removal_status = storage.options.removal_status
        const lock_status = storage.options.lock_status
        const target_seen_count = storage.options.seen_count || SEEN_COUNT_DEFAULT
        const keys = getObjectNamesForThing(thing, isUser)

        const known_removed = storage[keys['removed']] || {}
        const known_approved = storage[keys['approved']] || {}
        const known_locked = storage[keys['locked']] || {}
        const known_unlocked = storage[keys['unlocked']] || {}
        const changes = storage[keys['changes']] || []
        if (!isUser) {
            itemLookup = {}
        }
        const removed: string[] = [],
            approved: string[] = [],
            locked: string[] = [],
            unlocked: string[] = []
        items.forEach((itemWrap: any) => {
            const item = itemWrap.data
            if (!isUser) {
                itemLookup[item.name] = item
            }
            if (isRemovedItem(item)) {
                removed.push(item.name)
            } else {
                approved.push(item.name)
            }
            if (item.locked) {
                locked.push(item.name)
            } else {
                unlocked.push(item.name)
            }
        })

        updateOldestDateThreshold(items, itemLookup, thing, isUser)

        // mark items that do not exist in arrays
        // change happens if:
        //      tracking removals && item is removed
        //      tracking removals && item was in removed, now in approved
        const newLocalStorageItems: Record<string, any> = {}

        const changeTypes: string[] = []
        let num_changes = 0
        const mergedRealtime: { count: number; changeTypes: string[]; ids: string[] } = {
            count: 0,
            changeTypes: [],
            ids: [],
        }
        const mergedBacklog: {
            count: number
            changeTypes: string[]
            ids: string[]
            ageRange: { min: number; max: number }
        } = {
            count: 0,
            changeTypes: [],
            ids: [],
            ageRange: { min: Infinity, max: 0 },
        }
        const mergeResult = (r: MarkChangesResult) => {
            num_changes += r.num_changes
            mergedRealtime.count += r.realtimeChanges.count
            mergedRealtime.ids.push(...r.realtimeChanges.ids)
            mergedBacklog.count += r.backlogChanges.count
            mergedBacklog.ids.push(...r.backlogChanges.ids)
            for (const t of r.realtimeChanges.changeTypes) {
                if (!mergedRealtime.changeTypes.includes(t)) mergedRealtime.changeTypes.push(t)
            }
            for (const t of r.backlogChanges.changeTypes) {
                if (!mergedBacklog.changeTypes.includes(t)) mergedBacklog.changeTypes.push(t)
            }
            if (r.backlogChanges.count > 0) {
                mergedBacklog.ageRange.min = Math.min(mergedBacklog.ageRange.min, r.backlogChanges.ageRange.min)
                mergedBacklog.ageRange.max = Math.max(mergedBacklog.ageRange.max, r.backlogChanges.ageRange.max)
            }
        }
        return Promise.all([getLocalStorageItems(thing, isUser), getOldestDateThreshold(thing, isUser)]).then(
            ([existingLocalStorageItems, oldestDateThreshold]: [any, any]) => {
                if (removal_status.track) {
                    mergeResult(
                        markChanges(
                            removed,
                            REMOVED,
                            'mod removed',
                            known_removed,
                            approved,
                            APPROVED,
                            'approved',
                            known_approved,
                            changes,
                            itemLookup,
                            removal_status.notify,
                            newLocalStorageItems,
                            changeTypes,
                            isUser,
                            subscribedFrom,
                            existingLocalStorageItems,
                            target_seen_count,
                            oldestDateThreshold,
                            skipConfirmationThreshold,
                        ),
                    )
                }
                if (lock_status.track) {
                    mergeResult(
                        markChanges(
                            locked,
                            LOCKED,
                            'locked',
                            known_locked,
                            unlocked,
                            UNLOCKED,
                            'unlocked',
                            known_unlocked,
                            changes,
                            itemLookup,
                            lock_status.notify,
                            newLocalStorageItems,
                            changeTypes,
                            isUser,
                            subscribedFrom,
                            existingLocalStorageItems,
                            target_seen_count,
                            oldestDateThreshold,
                            skipConfirmationThreshold,
                        ),
                    )
                }
                console.log('[debug] post-markChanges', {
                    thing,
                    isUser,
                    subscribedFrom,
                    removed: removed.length,
                    approved: approved.length,
                    locked: locked.length,
                    unlocked: unlocked.length,
                    known_removed: Object.keys(known_removed).length,
                    known_approved: Object.keys(known_approved).length,
                    existingLS: Object.keys(existingLocalStorageItems || {}).length,
                    num_changes,
                    changeTypes,
                    realtimeCount: mergedRealtime.count,
                    backlogCount: mergedBacklog.count,
                })
                if (mergedRealtime.count > 0 && mergedRealtime.changeTypes.length) {
                    const msg = `${mergedRealtime.count} new [${mergedRealtime.changeTypes.join(', ')}] actions, click to view`
                    console.log(
                        `Creating realtime notification for ${thing}: ${mergedRealtime.count} changes of type ${mergedRealtime.changeTypes.join(', ')}`,
                    )
                    createNotification({
                        notificationId: thing,
                        title: thing,
                        message: msg,
                    }).then(success => {
                        if (success) clearPendingNotification(thing).catch(() => {})
                    })
                    setPendingNotification(thing, {
                        count: mergedRealtime.count,
                        types: mergedRealtime.changeTypes,
                        itemIds: mergedRealtime.ids,
                        firstAttemptAt: Date.now(),
                        attempts: 1,
                    }).catch(() => {})
                    appendNotificationLog({
                        ts: Date.now(),
                        id: thing,
                        title: thing,
                        message: msg,
                        itemIds: mergedRealtime.ids,
                        source: 'recent',
                    }).catch(() => {})
                }
                if (mergedBacklog.count > 0) {
                    console.log(
                        `Backlog for ${thing}: ${mergedBacklog.count} older changes collected (badge-only, no notification)`,
                    )
                }
                if (num_changes === 0) {
                    // No new changes this cycle — but retry any pending
                    // notification from a prior cycle that may have silently
                    // failed to display (e.g. install-time on Firefox Android).
                    getPendingNotification(thing)
                        .then(pending => {
                            if (!pending) return
                            const MAX_RETRY_ATTEMPTS = 5
                            if (pending.attempts >= MAX_RETRY_ATTEMPTS) return
                            const MIN_RETRY_DELAY_MS = 2 * 60 * 1000
                            if (Date.now() - pending.firstAttemptAt < MIN_RETRY_DELAY_MS) return
                            const retryMsg = `${pending.count} new [${pending.types.join(', ')}] actions, click to view`
                            console.log(`Retrying pending notification for ${thing} (attempt ${pending.attempts + 1})`)
                            createNotification({
                                notificationId: thing,
                                title: thing,
                                message: retryMsg,
                            }).then(success => {
                                if (success) clearPendingNotification(thing).catch(() => {})
                            })
                            setPendingNotification(thing, {
                                ...pending,
                                attempts: pending.attempts + 1,
                            }).catch(() => {})
                            appendNotificationLog({
                                ts: Date.now(),
                                id: thing,
                                title: thing,
                                message: retryMsg,
                                itemIds: pending.itemIds,
                                source: 'retry',
                            }).catch(() => {})
                        })
                        .catch(() => {})
                }
                return chrome.storage.sync.set(
                    {
                        [keys['removed']]: trimDict_by_numberValuedAttribute(
                            known_removed,
                            MAX_SYNC_STORAGE_ITEMS_PER_OBJECT,
                            'c',
                        ),
                        [keys['approved']]: trimDict_by_numberValuedAttribute(
                            known_approved,
                            MAX_SYNC_STORAGE_ITEMS_PER_OBJECT,
                            'c',
                        ),
                        [keys['locked']]: trimDict_by_numberValuedAttribute(
                            known_locked,
                            MAX_SYNC_STORAGE_ITEMS_PER_OBJECT,
                            'c',
                        ),
                        [keys['unlocked']]: trimDict_by_numberValuedAttribute(
                            known_unlocked,
                            MAX_SYNC_STORAGE_ITEMS_PER_OBJECT,
                            'c',
                        ),
                        [keys['changes']]: changes.slice(-MAX_SYNC_STORAGE_CHANGES),
                    },
                    () => {
                        updateBadgeUnseenCount()
                        console.log('[debug] addLocalStorageItems', {
                            thing,
                            isUser,
                            keys: Object.keys(newLocalStorageItems),
                            sample: Object.keys(newLocalStorageItems)
                                .slice(0, 2)
                                .map(k => ({
                                    id: k,
                                    t: newLocalStorageItems[k]?.t?.slice(0, 60),
                                })),
                        })
                        return addLocalStorageItems(newLocalStorageItems, thing, isUser)
                    },
                )
            },
        )
    })
}

const changeIsPreviouslyRecorded = (name: string, change_type: number | string, changes: any[]) => {
    for (const change of changes) {
        let change_obj = change
        if (!(change_obj instanceof ChangeForStorage)) {
            change_obj = new ChangeForStorage({ object: change })
        }
        if (change_obj.getID() === name && change_type === change_obj.getChangeTypeInternal()) {
            return true
        }
    }
    return false
}

// newLocalStorageItems operates as a return value
function markChanges(
    alert_current_list: string[],
    alert_type: number,
    alert_text: string,
    alert_known_hash: Record<string, any>,
    normal_current_list: string[],
    normal_type: number,
    normal_text: string,
    normal_known_hash: Record<string, any>,
    changes: any[],
    itemLookup: Record<string, any>,
    notify: boolean,
    newLocalStorageItems: Record<string, any>,
    changeTypes: string[],
    isUser: boolean,
    subscribedFrom: number,
    existingLocalStorageItems: Record<string, any>,
    target_seen_count: number,
    oldestDateThreshold: number | null,
    skipConfirmationThreshold = false,
) {
    const alert_unseen_ids: string[] = [],
        normal_unseen_ids: string[] = [],
        alert_userDeleted_unseen_ids: string[] = [],
        now = Math.floor(Date.now() / 1000)

    alert_current_list.forEach(name => {
        const item = itemLookup[name]
        // 1. in the case of a non-userpage-tracked (isUser=false) removed comment, don't overwrite local storage b/c
        // if it were overwritten, body would appear on history page as [removed]
        // 2. in the case of userpage tracking (isUser=true), only need to save the text in local storage
        // when there is a change. user page lookup (itemLookup) will have original text
        const existingLocalStorageItem = existingLocalStorageItems[name]
        if (!isUser && !existingLocalStorageItem) {
            newLocalStorageItems[name] = new LocalStorageItem({ item: item, observed_utc: now })
        } else if (existingLocalStorageItem) {
            // reset seen_count so that items observed as approved/normal must be consecutively seen w/that state
            // Note: The var seen_count is really a 'seen as normal' count, but we don't need an alert_seen_count
            const newLocalStorageItem = new LocalStorageItem({ object: existingLocalStorageItem })
            newLocalStorageItem.resetSeenCount()
            // Track how many consecutive times this item has been observed as removed.
            // Only fire a removal alert after REMOVAL_CONFIRMATION_THRESHOLD consecutive observations,
            // which prevents false alerts from transient API failures or intermittent data.
            const removal_count = newLocalStorageItem.incrementRemovalCount()
            newLocalStorageItems[name] = newLocalStorageItem
            if (
                !skipConfirmationThreshold &&
                removal_count < REMOVAL_CONFIRMATION_THRESHOLD &&
                !(name in alert_known_hash)
            ) {
                return // skip this item — not yet confirmed as genuinely removed
            }
        }
        const itemCreatedUtc = item.created_utc
        const isTooOld = oldestDateThreshold && itemCreatedUtc && itemCreatedUtc < oldestDateThreshold

        if (!(name in alert_known_hash) && !isTooOld) {
            // markUnseen is always true except when subscribing via a reddit (not reveddit) page to a new ID for 'other'
            // subscriptions. As long as the item is not 'removed', the current state is stored as 'seen' (unseen=false).
            // It is assumed that users subscribing from reveddit pages will already have seen all the current mod actions,
            // and users subscribing from a reddit page will already know about locked items
            let markUnseen = true
            if (
                (subscribedFrom === SUBSCRIBED_FROM_REDDIT && alert_type !== REMOVED) ||
                subscribedFrom === SUBSCRIBED_FROM_REVEDDIT
            ) {
                markUnseen = false
            }
            alert_known_hash[name] = new ItemForStorage(
                item.created_utc,
                markUnseen,
                isComment(item.name) && item.link_id ? item.link_id : undefined,
            )
            delete normal_known_hash[name]
            if (markUnseen) {
                let alert_type_var = alert_type
                if (isUserDeletedItem(item)) {
                    alert_type_var = DELETED
                    alert_userDeleted_unseen_ids.push(name)
                } else {
                    alert_unseen_ids.push(name)
                }
                changes.push(new ChangeForStorage({ id: name, observed_utc: now, change_type: alert_type_var }))
            }
            if (isUser) {
                newLocalStorageItems[name] = new LocalStorageItem({ item: item, observed_utc: now })
            }
        }
    })
    normal_current_list.forEach(name => {
        const item = itemLookup[name]
        // save original text for all non-userpage-tracked items since comment text can disappear
        if (!isUser && !existingLocalStorageItems[name]) {
            newLocalStorageItems[name] = new LocalStorageItem({ item: item, observed_utc: now })
        }
        // Reset removal confirmation count when item appears approved,
        // so transient false removals don't accumulate across separate incidents
        if (existingLocalStorageItems[name]) {
            const lsi = new LocalStorageItem({ object: existingLocalStorageItems[name] })
            if (lsi.getRemovalCount() > 0) {
                lsi.resetRemovalCount()
                // Preserve this in newLocalStorageItems so it gets saved
                if (!newLocalStorageItems[name]) {
                    newLocalStorageItems[name] = lsi
                }
            }
        }
        if (name in alert_known_hash) {
            const this_localStorageItem = new LocalStorageItem({ object: existingLocalStorageItems[name] })
            // Track the seen count, aka 'observed same status' count
            // Doing so allows sending an alert only after N times a new status has been observed.
            // See: https://www.reddit.com/r/reveddit/comments/zc7tcm/reveddit_sending_repetitive_notifications/
            const seen_count = this_localStorageItem.incrementSeenCount()
            if (seen_count >= target_seen_count) {
                const change_is_previously_recorded = changeIsPreviouslyRecorded(name, normal_type, changes)
                // To prevent repeat notifications, whose non-deterministic cause I haven't yet figured out,
                // only notify about the second observed change in status back to 'normal' (approved/unlocked)
                // if a higher threshold of consecutive normal statuses has been observed
                if (!change_is_previously_recorded || seen_count >= TARGET_SEEN_COUNT_FOR_PREVIOUSLY_RECORDED_CHANGE) {
                    normal_known_hash[name] = new ItemForStorage(
                        item.created_utc,
                        true,
                        isComment(item.name) && item.link_id ? item.link_id : undefined,
                    )
                    delete alert_known_hash[name]

                    changes.push(
                        new ChangeForStorage({ id: name, observed_utc: now, change_type: normal_type, seen_count }),
                    )
                    normal_unseen_ids.push(name)

                    newLocalStorageItems[name] = new LocalStorageItem({ item: item, observed_utc: now })
                } else {
                    newLocalStorageItems[name] = this_localStorageItem
                }
            } else {
                newLocalStorageItems[name] = this_localStorageItem
            }
        } else {
            const itemCreatedUtc = item.created_utc
            const isTooOld = oldestDateThreshold && itemCreatedUtc && itemCreatedUtc < oldestDateThreshold
            if (!isTooOld) {
                normal_known_hash[name] = new ItemForStorage(
                    item.created_utc,
                    false,
                    isComment(item.name) && item.link_id ? item.link_id : undefined,
                )
            }
        }
    })
    const allUnseenIds = [...alert_unseen_ids, ...normal_unseen_ids, ...alert_userDeleted_unseen_ids]
    const num_changes = allUnseenIds.length
    if (notify && num_changes) {
        if (alert_unseen_ids.length) changeTypes.push(alert_text)
        if (alert_userDeleted_unseen_ids.length) changeTypes.push('user deleted')
        if (normal_unseen_ids.length) changeTypes.push(normal_text)
    }

    const realtimeChangeTypes: string[] = []
    const backlogChangeTypes: string[] = []
    const backlogAges: number[] = []
    const realtimeIds: string[] = []
    const backlogIds: string[] = []
    let realtimeCount = 0
    let backlogCount = 0

    for (const id of allUnseenIds) {
        const item = itemLookup[id]
        const age = item?.created_utc ? now - item.created_utc : 0
        if (age > BACKLOG_AGE_THRESHOLD_SECONDS) {
            backlogCount++
            backlogAges.push(age)
            backlogIds.push(id)
        } else {
            realtimeCount++
            realtimeIds.push(id)
        }
    }
    if (realtimeCount > 0) {
        realtimeChangeTypes.push(...changeTypes)
    }
    if (backlogCount > 0) {
        backlogChangeTypes.push(...changeTypes)
    }

    return {
        num_changes,
        realtimeChanges: { count: realtimeCount, changeTypes: realtimeChangeTypes, ids: realtimeIds },
        backlogChanges: {
            count: backlogCount,
            changeTypes: backlogChangeTypes,
            ids: backlogIds,
            ageRange: backlogAges.length
                ? { min: Math.min(...backlogAges), max: Math.max(...backlogAges) }
                : { min: 0, max: 0 },
        },
    } as MarkChangesResult
}

export const countUnseenBacklogItems = (storage: Record<string, any>): number => {
    const now = Math.floor(Date.now() / 1000)
    const options = storage.options || {}
    const trackRemoval = (options.removal_status || {}).track !== false
    const trackLock = (options.lock_status || {}).track !== false

    const things: { thing: string; isUser: boolean }[] = [
        ...Object.keys(storage.user_subscriptions || {}).map(u => ({ thing: u, isUser: true })),
        { thing: 'other', isUser: false },
    ]

    let count = 0
    for (const { thing, isUser } of things) {
        const keys = getObjectNamesForThing(thing, isUser)
        const typesToCount: string[] = []
        if (trackRemoval) typesToCount.push(keys['removed'])
        if (trackLock) typesToCount.push(keys['locked'])

        for (const key of typesToCount) {
            const obj = storage[key] || {}
            for (const id of Object.keys(obj)) {
                const item = obj[id]
                if (item && item.u === true && item.c && now - item.c > BACKLOG_AGE_THRESHOLD_SECONDS) {
                    count++
                }
            }
        }
    }
    return count
}

const maybeFireBacklogSummary = async (storage: Record<string, any>): Promise<void> => {
    const state = await getBacklogSummaryState()
    if (state.summarySent) return
    if (state.installedAt == null) return

    const count = countUnseenBacklogItems(storage)

    if (!state.initialBacklogNotified) {
        if (count === 0) return
        await markBacklogInitialNotified()
        const msg = `${count} older removed/locked posts or comments found in your history. Click to review.`
        createNotification({
            notificationId: 'backlog_summary',
            title: 'reveddit real-time',
            message: msg,
        })
        appendNotificationLog({
            ts: Date.now(),
            id: 'backlog_summary',
            title: 'reveddit real-time',
            message: msg,
            source: 'backlog_summary',
        }).catch(() => {})
        return
    }

    if (Date.now() - state.installedAt < BACKLOG_SUMMARY_DELAY_MS) return

    await markBacklogSummarySent()
    if (count === 0) return

    const msg = `${count} older removed/locked posts or comments found in your history. Click to review.`
    createNotification({
        notificationId: 'backlog_summary',
        title: 'reveddit real-time',
        message: msg,
    })
    appendNotificationLog({
        ts: Date.now(),
        id: 'backlog_summary',
        title: 'reveddit real-time',
        message: msg,
        source: 'backlog_summary',
    }).catch(() => {})
}
