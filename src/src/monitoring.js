import {lookupItemsByID, lookupItemsByUser, lookupItemsByLoggedInUser, lookupItemsByLoggedInUserWithAuth, getAuth, getLoggedinUser, storeRedditCookies} from './requests.js'
import {REMOVED, DELETED, APPROVED, LOCKED, UNLOCKED, EDITED,
        addLocalStorageItems, getLocalStorageItems,
        MAX_SYNC_STORAGE_ITEMS_PER_OBJECT, MAX_SYNC_STORAGE_CHANGES, SEEN_COUNT_DEFAULT,
        getObjectNamesForThing, getUserInit } from './storage.js'
import {createNotification, updateBadgeUnseenCount, trimDict_by_numberValuedAttribute,
        isUserDeletedItem, isRemovedItem,
        ItemForStorage, LocalStorageItem, ChangeForStorage, setWarningBadge} from './common.js'
import browser from 'webextension-polyfill'


const SUBSCRIBED_FROM_REDDIT = 0
const SUBSCRIBED_FROM_REVEDDIT = 1
const SUBSCRIBED_FROM_NA = 2

const TARGET_SEEN_COUNT_FOR_PREVIOUSLY_RECORDED_CHANGE = Math.floor(Math.random() * 60)+60

export const setCurrentStateForId = (id, subscribedFromURL) => {
    let subscribedFrom = SUBSCRIBED_FROM_REDDIT
    if (subscribedFromURL.match(/^https:\/\/www.reveddit.com/)) {
        subscribedFrom = SUBSCRIBED_FROM_REVEDDIT
    }
    return chrome.storage.sync.get(null, function (storage) {
        getAuth()
        .then((auth) => {
            return checkForChanges_thing_byId([id], 'other', false, auth, storage, subscribedFrom, {})
        })
    })
}

const MIN_QUARANTINED_CHECK_INTERVAL_IN_SECONDS = 20*(60*60*24)

export const checkForChanges = () => {
    chrome.storage.sync.get(null, function (storage) {
        var other = Object.keys(storage.other_subscriptions)
        const now = Math.floor(new Date()/1000)
        
        // check for quarantined content once in awhile and enable monitor_quarantined if some is found
        // because users may not know to enable this option
        // the option is off by default because it can appear to cause an occasional logout
        if (! storage.last_check_quarantined
            || (now - storage.last_check_quarantined) > MIN_QUARANTINED_CHECK_INTERVAL_IN_SECONDS ) {
            storage.tempVar_monitor_quarantined = true
        }
        
        // Only get OAuth auth if user has provided a custom client ID
        const needsOAuth = storage.options.custom_clientid && storage.options.custom_clientid !== ''
        const authPromise = needsOAuth ? getAuth(storage.tempVar_monitor_quarantined) : Promise.resolve('none')
        
        authPromise.then((auth) => {
            // Always check for logged-in user, regardless of subscription status
            return checkForChanges_loggedInUser(auth, storage)
        })
        .then(() => {
            // Also check other subscriptions if any exist
            if (other.length) {
                return checkForChanges_other(auth, storage)
            }
        })
        .then(() => {
            const newStorage = {last_check: now}
            if (storage.tempVar_monitor_quarantined) {
                newStorage.last_check_quarantined = now
            }
            if (storage.tempVar_quarantined_content_found) {
                newStorage.options = storage.options
                newStorage.options.monitor_quarantined = true
            }
            chrome.storage.sync.set(newStorage)
        })
        .catch(error => {
            console.log('Error in checkForChanges:', error)
            // Clear warning badge on error
            updateBadgeUnseenCount()
        })
    })
}

const checkForChanges_loggedInUser = async (auth, storage) => {
    // First get the current logged-in user
    return getLoggedinUser()
    .then(loggedInUser => {
        if (!loggedInUser) {
            console.log('No logged-in user found, skipping user monitoring')
            return
        }
        
        // Always monitor the currently logged-in user, regardless of subscription status
        // Ensure storage keys exist for the logged-in user
        const userInit = getUserInit(loggedInUser)
        chrome.storage.sync.get(Object.keys(userInit), (existingKeys) => {
            const keysToCreate = {}
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
        return new Promise((resolve, reject) => {
            // Try to find a Reddit tab to make the request from
            chrome.tabs.query({url: ['*://*.reddit.com/*']}, (tabs) => {
                if (tabs.length === 0) {
                    // Use stored cookies as fallback
                    resolve('use_stored_cookies')
                    return
                }
                
                // Check if we have a supported subdomain (www.reddit.com or old.reddit.com)
                const supportedTabs = tabs.filter(tab => {
                    const hostname = new URL(tab.url).hostname
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
                
                chrome.tabs.sendMessage(tab.id, {action: 'get-logged-in-user-items'}, (response) => {
                    if (chrome.runtime.lastError) {
                        // Receiving end does not exist, fall back gracefully and set warning badge
                        console.log('Error sending message to content script:', chrome.runtime.lastError)
                        setWarningBadge('needs_user')
                        resolve('use_stored_cookies')
                        return
                    }
                    resolve(response)
                })
            })
        })
        .then(items => {
            if (! items) return // handle expected errors
            
            // Handle stored cookies case
            if (items === 'use_stored_cookies') {
                // Try to fetch items using stored cookies
                return lookupItemsByLoggedInUserWithAuth('', 'new', '', storage.options.monitor_quarantined, storage.tempVar_monitor_quarantined, auth)
                .then(storedItems => {
                    if (! storedItems) {
                        // Stored cookies also failed → keep yellow badge to indicate attention needed
                        setWarningBadge('needs_user')
                        return // handle expected errors
                    }
                    var ids = []
                    let quarantined_subreddits = new Set()
                    const itemLookup = {}
                    if (storedItems.user && storedItems.user.items) { // format from cred2.reveddit.com
                        storedItems = storedItems.user.items
                    }
                    storedItems.forEach(item => {
                        if (item.data && item.data.name) { // format from reddit
                            item = item.data
                        }
                        ids.push(item.name)
                        itemLookup[item.name] = item
                        if (item.quarantine) {
                            quarantined_subreddits.add(item.subreddit)
                            storage.tempVar_quarantined_content_found = true
                        }
                    })
                    return checkForChanges_thing_byId(ids, loggedInUser, true, auth, storage, SUBSCRIBED_FROM_NA, itemLookup, Array.from(quarantined_subreddits))
                })
            }
            
            var ids = []
            let quarantined_subreddits = new Set()
            const itemLookup = {}
            if (items.user && items.user.items) { // format from cred2.reveddit.com
                items = items.user.items
            }
            items.forEach(item => {
                if (item.data && item.data.name) { // format from reddit
                    item = item.data
                }
                ids.push(item.name)
                itemLookup[item.name] = item
                if (item.quarantine) {
                    quarantined_subreddits.add(item.subreddit)
                    storage.tempVar_quarantined_content_found = true
                }
            })
            return checkForChanges_thing_byId(ids, loggedInUser, true, auth, storage, SUBSCRIBED_FROM_NA, itemLookup, Array.from(quarantined_subreddits))
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

function checkForChanges_other(auth, storage) {
    const ids = Object.keys(storage.other_subscriptions)
    if (ids.length) {
        checkForChanges_thing_byId(ids, 'other', false, auth, storage, SUBSCRIBED_FROM_NA)
    }
}

const checkForChanges_thing_byId = async (ids, thing, isUser, auth, storage, subscribedFrom, itemLookup = {}, quarantined_subreddits = []) => {
    let promise
    const monitor_quarantined = storage.options.monitor_quarantined
    if (location.protocol.match(/^http/)) {
        // this condition is for when the code is activated via a content script (e.g. the subscribe button) and browser.cookies is unavailable
        promise = browser.runtime.sendMessage({action: 'get-reddit-items-by-id', ids, monitor_quarantined})
    } else {
        promise = lookupItemsByID(ids, auth, monitor_quarantined, storage.tempVar_monitor_quarantined, quarantined_subreddits)
    }
    return promise
    .then(result => {
        if (! result) return // handle expected errors
        const items = Array.isArray(result) ? result : result.items
        if (! items) return // handle expected errors from obj
        const removal_status = storage.options.removal_status
        const lock_status = storage.options.lock_status
        const target_seen_count = storage.options.seen_count || SEEN_COUNT_DEFAULT
        const keys = getObjectNamesForThing(thing, isUser)

        const known_removed = storage[keys['removed']] || {}
        const known_approved = storage[keys['approved']] || {}
        const known_locked = storage[keys['locked']] || {}
        const known_unlocked = storage[keys['unlocked']] || {}
        const changes = storage[keys['changes']] || []
        if (! isUser) {
            itemLookup = {}
        }
        const removed = [], approved = [], locked = [], unlocked = []
        items.forEach(itemWrap => {
            const item = itemWrap.data
            if (! isUser) {
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
        // mark items that do not exist in arrays
        // change happens if:
        //      tracking removals && item is removed
        //      tracking removals && item was in removed, now in approved
        const newLocalStorageItems = {}

        const changeTypes = []
        let num_changes = 0
        return getLocalStorageItems(thing, isUser)
        .then(existingLocalStorageItems => {
            if (removal_status.track) {
                num_changes += markChanges(removed, REMOVED, 'mod removed', known_removed,
                                           approved, APPROVED, 'approved', known_approved,
                                           changes, itemLookup, removal_status.notify,
                                           newLocalStorageItems, changeTypes, isUser, subscribedFrom,
                                           existingLocalStorageItems, target_seen_count)
            }
            if (lock_status.track) {
                num_changes += markChanges(locked, LOCKED, 'locked', known_locked,
                                           unlocked, UNLOCKED, 'unlocked', known_unlocked,
                                           changes, itemLookup, lock_status.notify,
                                           newLocalStorageItems, changeTypes, isUser, subscribedFrom,
                                           existingLocalStorageItems, target_seen_count)
            }
            if (num_changes && changeTypes.length) {
                console.log(`Creating notification for ${thing}: ${num_changes} changes of type ${changeTypes.join(', ')}`)
                createNotification(
                    {notificationId: thing,
                     title: thing,
                     message: `${num_changes} new [${changeTypes.join(', ')}] actions, click to view`})
            }
            return chrome.storage.sync.set({
                                     [keys['removed']]: trimDict_by_numberValuedAttribute(known_removed, MAX_SYNC_STORAGE_ITEMS_PER_OBJECT, 'c'),
                                     [keys['approved']]: trimDict_by_numberValuedAttribute(known_approved, MAX_SYNC_STORAGE_ITEMS_PER_OBJECT, 'c'),
                                     [keys['locked']]: trimDict_by_numberValuedAttribute(known_locked, MAX_SYNC_STORAGE_ITEMS_PER_OBJECT, 'c'),
                                     [keys['unlocked']]: trimDict_by_numberValuedAttribute(known_unlocked, MAX_SYNC_STORAGE_ITEMS_PER_OBJECT, 'c'),
                                     [keys['changes']]: changes.slice(-MAX_SYNC_STORAGE_CHANGES)
                                    }, () => {
                updateBadgeUnseenCount()
                return addLocalStorageItems(newLocalStorageItems, thing, isUser)
            })
        })
    })
}

const changeIsPreviouslyRecorded = (name, change_type, changes) => {
    for (const change of changes) {
        let change_obj = change
        if (! (change_obj instanceof ChangeForStorage)) {
            change_obj = new ChangeForStorage({object: change})
        }
        if (change_obj.getID() === name && change_type === change_obj.getChangeTypeInternal()) {
            return true
        }
    }
    return false
}


// newLocalStorageItems operates as a return value
function markChanges (alert_current_list, alert_type, alert_text, alert_known_hash,
                      normal_current_list, normal_type, normal_text, normal_known_hash,
                      changes, itemLookup, notify, newLocalStorageItems, changeTypes,
                      isUser, subscribedFrom, existingLocalStorageItems, target_seen_count) {
    const alert_unseen_ids = [],
          normal_unseen_ids = [],
          alert_userDeleted_unseen_ids = [],
          now = Math.floor(new Date()/1000)

    alert_current_list.forEach(name => {
        const item = itemLookup[name]
        // 1. in the case of a non-userpage-tracked (isUser=false) removed comment, don't overwrite local storage b/c
        // if it were overwritten, body would appear on history page as [removed]
        // 2. in the case of userpage tracking (isUser=true), only need to save the text in local storage
        // when there is a change. user page lookup (itemLookup) will have original text
        const existingLocalStorageItem = existingLocalStorageItems[name]
        if (! isUser && ! existingLocalStorageItem) {
            newLocalStorageItems[name] = new LocalStorageItem({item: item, observed_utc: now})
        } else if (existingLocalStorageItem) {
            // reset seen_count so that items observed as approved/normal must be consecutively seen w/that state
            // Note: The var seen_count is really a 'seen as normal' count, but we don't need an alert_seen_count
            const newLocalStorageItem = new LocalStorageItem({object: existingLocalStorageItem})
            newLocalStorageItem.resetSeenCount()
            newLocalStorageItems[name] = newLocalStorageItem
        }
        if (! (name in alert_known_hash)) {
            // markUnseen is always true except when subscribing via a reddit (not reveddit) page to a new ID for 'other'
            // subscriptions. As long as the item is not 'removed', the current state is stored as 'seen' (unseen=false).
            // It is assumed that users subscribing from reveddit pages will already have seen all the current mod actions,
            // and users subscribing from a reddit page will already know about locked items
            let markUnseen = true
            if ((subscribedFrom === SUBSCRIBED_FROM_REDDIT && alert_type !== REMOVED) ||
                 subscribedFrom === SUBSCRIBED_FROM_REVEDDIT) {
                markUnseen = false
            }
            alert_known_hash[name] = new ItemForStorage(item.created_utc, markUnseen)
            delete normal_known_hash[name]
            if (markUnseen) {
                let alert_type_var = alert_type
                if (isUserDeletedItem(item)) {
                    alert_type_var = DELETED
                    alert_userDeleted_unseen_ids.push(name)
                } else {
                    alert_unseen_ids.push(name)
                }
                changes.push(new ChangeForStorage({id: name, observed_utc: now, change_type: alert_type_var}))
            }
            if (isUser) {
                newLocalStorageItems[name] = new LocalStorageItem({item: item, observed_utc: now})
            }
        }
    })
    normal_current_list.forEach(name => {
        const item = itemLookup[name]
        // save original text for all non-userpage-tracked items since comment text can disappear
        if (! isUser && ! existingLocalStorageItems[name]) {
            newLocalStorageItems[name] = new LocalStorageItem({item: item, observed_utc: now})
        }
        if (name in alert_known_hash) {
            const this_localStorageItem = new LocalStorageItem({object: existingLocalStorageItems[name]})
            // Track the seen count, aka 'observed same status' count
            // Doing so allows sending an alert only after N times a new status has been observed.
            // See: https://www.reddit.com/r/reveddit/comments/zc7tcm/reveddit_sending_repetitive_notifications/
            const seen_count = this_localStorageItem.incrementSeenCount()
            if (seen_count >= target_seen_count) {
                const change_is_previously_recorded = changeIsPreviouslyRecorded(name, normal_type, changes)
                // To prevent repeat notifications, whose non-deterministic cause I haven't yet figured out,
                // only notify about the second observed change in status back to 'normal' (approved/unlocked)
                // if a higher threshold of consecutive normal statuses has been observed
                if (! change_is_previously_recorded || seen_count >= TARGET_SEEN_COUNT_FOR_PREVIOUSLY_RECORDED_CHANGE) {
                    normal_known_hash[name] = new ItemForStorage(item.created_utc, true)
                    delete alert_known_hash[name]

                    changes.push(new ChangeForStorage({id: name, observed_utc: now, change_type: normal_type, seen_count}))
                    normal_unseen_ids.push(name)

                    newLocalStorageItems[name] = new LocalStorageItem({item: item, observed_utc: now})
                } else {
                    newLocalStorageItems[name] = this_localStorageItem
                }
            } else {
                newLocalStorageItems[name] = this_localStorageItem
            }
        } else {
            normal_known_hash[name] = new ItemForStorage(item.created_utc, false)
        }
    })
    const num_changes = alert_unseen_ids.length + normal_unseen_ids.length + alert_userDeleted_unseen_ids.length
    if (notify && num_changes) {
        if (alert_unseen_ids.length) changeTypes.push(alert_text)
        if (alert_userDeleted_unseen_ids.length) changeTypes.push('user deleted')
        if (normal_unseen_ids.length) changeTypes.push(normal_text)
    }
    return num_changes
}
