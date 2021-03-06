import {lookupItemsByID, lookupItemsByUser, getAuth} from './requests.js'
import {REMOVED, DELETED, APPROVED, LOCKED, UNLOCKED, EDITED,
        addLocalStorageItems, getLocalStorageItems,
        MAX_SYNC_STORAGE_ITEMS_PER_OBJECT, MAX_SYNC_STORAGE_CHANGES,
        getObjectNamesForThing } from './storage.js'
import {createNotification, updateBadgeUnseenCount, trimDict_by_numberValuedAttribute,
        isUserDeletedItem, isRemovedItem,
        ItemForStorage, LocalStorageItem, ChangeForStorage} from './common.js'
import browser from 'webextension-polyfill'


const SUBSCRIBED_FROM_REDDIT = 0
const SUBSCRIBED_FROM_REVEDDIT = 1
const SUBSCRIBED_FROM_NA = 2

export const setCurrentStateForId = (id, subscribedFromURL, callback = () => {}) => {
    let subscribedFrom = SUBSCRIBED_FROM_REDDIT
    if (subscribedFromURL.match(/^https:\/\/www.reveddit.com/)) {
        subscribedFrom = SUBSCRIBED_FROM_REVEDDIT
    }
    chrome.storage.sync.get(null, function (storage) {
        getAuth()
        .then((auth) => {
            checkForChanges_thing_byId([id], 'other', false, auth, storage, subscribedFrom, {}, callback)
        })
    })
}


export const checkForChanges = () => {
    chrome.storage.sync.get(null, function (storage) {
        var users = Object.keys(storage.user_subscriptions)
        var other = Object.keys(storage.other_subscriptions)
        if (users.length || other.length) {
            getAuth()
            .then((auth) => {
                checkForChanges_other(auth, storage)
                checkForChanges_users(users, auth, storage)
            })
        }
    })
}

function checkForChanges_users(users, auth, storage) {
    if (users.length) {
        const user = users[0]

        lookupItemsByUser(user, '', 'new', '', auth)
        .then(items => {
            if (! items) return // handle expected errors
            var ids = []
            const itemLookup = {}
            items.forEach(item => {
                ids.push(item.data.name)
                itemLookup[item.data.name] = item.data
            })
            checkForChanges_thing_byId(ids, user, true, auth, storage, SUBSCRIBED_FROM_NA, itemLookup, () => {
                checkForChanges_users(users.slice(1), auth, storage)
            })
        })
    }
}

function checkForChanges_other(auth, storage) {
    const ids = Object.keys(storage.other_subscriptions)
    if (ids.length) {
        checkForChanges_thing_byId(ids, 'other', false, auth, storage, SUBSCRIBED_FROM_NA)
    }
}

function checkForChanges_thing_byId (ids, thing, isUser, auth, storage, subscribedFrom, itemLookup = {}, callback = () => {}) {
    lookupItemsByID(ids, auth)
    .then(items => {
        if (! items) return // handle expected errors
        const removal_status = storage.options.removal_status
        const lock_status = storage.options.lock_status

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
        getLocalStorageItems(thing, isUser)
        .then(existingLocalStorageItems => {
            if (removal_status.track) {
                num_changes += markChanges(removed, REMOVED, 'mod removed', known_removed,
                                           approved, APPROVED, 'approved', known_approved,
                                           changes, itemLookup, removal_status.notify,
                                           newLocalStorageItems, changeTypes, isUser, subscribedFrom,
                                           existingLocalStorageItems)
            }
            if (lock_status.track) {
                num_changes += markChanges(locked, LOCKED, 'locked', known_locked,
                                           unlocked, UNLOCKED, 'unlocked', known_unlocked,
                                           changes, itemLookup, lock_status.notify,
                                           newLocalStorageItems, changeTypes, isUser, subscribedFrom,
                                           existingLocalStorageItems)
            }

            if (num_changes && changeTypes.length) {
                createNotification(
                    {notificationId: thing,
                     title: thing,
                     message: `${num_changes} new [${changeTypes.join(', ')}] actions, click to view`})
            }
            chrome.storage.sync.set({[keys['removed']]: trimDict_by_numberValuedAttribute(known_removed, MAX_SYNC_STORAGE_ITEMS_PER_OBJECT, 'c'),
                                     [keys['approved']]: trimDict_by_numberValuedAttribute(known_approved, MAX_SYNC_STORAGE_ITEMS_PER_OBJECT, 'c'),
                                     [keys['locked']]: trimDict_by_numberValuedAttribute(known_locked, MAX_SYNC_STORAGE_ITEMS_PER_OBJECT, 'c'),
                                     [keys['unlocked']]: trimDict_by_numberValuedAttribute(known_unlocked, MAX_SYNC_STORAGE_ITEMS_PER_OBJECT, 'c'),
                                     [keys['changes']]: changes.slice(-MAX_SYNC_STORAGE_CHANGES)
                                    }, () => {
                updateBadgeUnseenCount()
                addLocalStorageItems(newLocalStorageItems, thing, isUser, callback)
            })
        })
    })
}

// newLocalStorageItems operates as a return value
function markChanges (alert_current_list, alert_type, alert_text, alert_known_hash,
                      normal_current_list, normal_type, normal_text, normal_known_hash,
                      changes, itemLookup, notify, newLocalStorageItems, changeTypes,
                      isUser, subscribedFrom, existingLocalStorageItems) {
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
        if (! isUser && ! existingLocalStorageItems[name]) {
            newLocalStorageItems[name] = new LocalStorageItem({item: item, observed_utc: now})
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
            normal_known_hash[name] = new ItemForStorage(item.created_utc, true)
            delete alert_known_hash[name]

            changes.push(new ChangeForStorage({id: name, observed_utc: now, change_type: normal_type}))
            normal_unseen_ids.push(name)

            newLocalStorageItems[name] = new LocalStorageItem({item: item, observed_utc: now})
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
