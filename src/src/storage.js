import {alphaLowerSort, ItemForStorage, LocalStorageItem, trimDict_by_numberValuedAttribute} from './common.js'
import browser from 'webextension-polyfill'

export const INTERVAL_DEFAULT = 1;
export const SEEN_COUNT_DEFAULT = 2

// These limits are set with consideration for Chrome's sync & local storage limits,
// and for the objects stored by the extension
const MAX_SUBSCRIPTIONS = 5;
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

const trackTypes = {'changes': [], 'removed': {}, 'approved': {}, 'locked': {}, 'unlocked': {}};

const getObjectName = (type, thing, isUser) => {
    if (isUser) {
        return type+'_u_'+thing
    } else {
        return type+'_'+thing
    }
}

const addTrackTypes = (object, thing, isUser=true) => {
    Object.keys(trackTypes).forEach(type => {
        object[getObjectName(type, thing, isUser)] = trackTypes[type]
    })
}

export const getObjectNamesForThing = (thing, isUser=true) => {
    const names = {}
    Object.keys(trackTypes).forEach(type => {
        names[type] = getObjectName(type, thing, isUser)
    })
    return names
}

const getUserInit = (user) => {
    const result = {}
    addTrackTypes(result, user, true)
    return result
}

const getStorageInit = () => {
    const result = {
        user_subscriptions: {},
        other_subscriptions: {},
        options: {interval: INTERVAL_DEFAULT,
                  seen_count: SEEN_COUNT_DEFAULT,
                  custom_clientid: '',
                  removal_status: {track: true, notify: true},
                  lock_status: {track: true, notify: true},
                  monitor_quarantined: false,
              },
        last_check: null,
        last_check_quarantined: null,
    }
    addTrackTypes(result, 'other', false)
    return result;
}

export const markEverythingAsSeen = () => {
    return browser.storage.sync.get(null)
    .then(storage => {
        const users = Object.keys(storage.user_subscriptions);
        const allKeys = []
        users.forEach(user => {
            markThingAsSeen(storage, user, true)
        })
        markThingAsSeen(storage, 'other', false)
        return setStorageUpdateBadge(storage)
    })
}

export const markThingAsSeen = (storage, thing, isUser) => {
    const keys = getObjectNamesForThing(thing, isUser)
    delete keys['changes']
    const fullKeynames = []
    Object.values(keys).forEach(fullKeyname => {
        fullKeynames.push(fullKeyname)
    })
    fullKeynames.forEach(fullKeyname => {
        Object.values(storage[fullKeyname]).forEach(item => {
            item.u = false
        })
    })
}

export const setStorageUpdateBadge = (storage) => {
    return browser.storage.sync.set(storage)
    .then(res => {
        return browser.runtime.sendMessage({action: 'update-badge'})
    })
}

const markSeenForStorageKey = (storage, storage_keys, key, ids, is_user) => {
    const storage_item = storage[storage_keys[key]]
    Object.keys(ids).forEach(id => {
        if (id in storage_item) {
            storage_item[id].u = false
        } else if (is_user) {
            storage_item[id] = new ItemForStorage(ids[id], false)
        }
    })
}

export const markIDsAsSeenIfSubscribed = (storage, user, is_user, removed_ids, approved_ids, locked_ids, unlocked_ids, callback = () => {}) => {
    const storage_keys = getObjectNamesForThing(user, is_user)
    delete storage_keys['changes']
    const user_subscribed = storage.user_subscriptions[user]
    if (user_subscribed || ! is_user) {
        markSeenForStorageKey(storage, storage_keys, 'removed', removed_ids, is_user)
        markSeenForStorageKey(storage, storage_keys, 'approved', approved_ids, is_user)
        markSeenForStorageKey(storage, storage_keys, 'locked', locked_ids, is_user)
        markSeenForStorageKey(storage, storage_keys, 'unlocked', unlocked_ids, is_user)
        chrome.storage.sync.set(storage, callback)
    }

}

export const subscribeId = (id, callback = () => {}) => {
    const key = 'other_subscriptions'
    chrome.storage.sync.get(key, (result) => {
        result[key][id] = {t: Math.floor(new Date().getTime()/1000)}
        const itemsToSave = trimDict_by_numberValuedAttribute(result[key],
                                                              MAX_OTHER_SUBSCRIPTIONS,
                                                              't')
        chrome.storage.sync.set({[key]: itemsToSave}, callback)
    })
}
export const unsubscribeId = (id, callback = () => {}) => {
    const mainKey = 'other_subscriptions'
    const otherKeys = getObjectNamesForThing('other', false)
    delete otherKeys['changes']
    chrome.storage.sync.get(Object.values(otherKeys).concat(mainKey), (result) => {
        delete result[mainKey][id]
        Object.values(otherKeys).forEach(fullKeyname => {
            if (id in result[fullKeyname]) {
                delete result[fullKeyname][id]
            }
        })
        chrome.storage.sync.set(result, () => {
            chrome.runtime.sendMessage({action: 'update-badge'}, callback)
        })
    })
}
export const getSubscribedIds = (callback = () => {}) => {
    const key = 'other_subscriptions'
    chrome.storage.sync.get(key, (result) => {
        callback(Object.keys(result[key]))
    })
}

export const subscribeUser = (user, callbackSuccess = () => {}, callbackError = () => {}) => {
    const userInit = getUserInit(user)
    chrome.storage.sync.get('user_subscriptions', (result) => {
        const user_subscriptions = result.user_subscriptions
        if (! (user in user_subscriptions)) {
            if (Object.keys(user_subscriptions).length < MAX_SUBSCRIPTIONS) {
                user_subscriptions[user] = true
                chrome.storage.sync.set({user_subscriptions, ...userInit}, callbackSuccess)
            } else {
                callbackError('maximum number of subscriptions reached')
            }
        } else {
            callbackError('already subscribed to this user')
        }
    })
}

export const unsubscribeUser = (user, callback) => {
    const userKeys = Object.keys(getUserInit(user))
    chrome.storage.sync.get('user_subscriptions', (result) => {
        const user_subscriptions = result.user_subscriptions
        delete user_subscriptions[user]
        chrome.storage.sync.set({user_subscriptions}, () => {
            chrome.storage.sync.remove(userKeys, () => {
                const userKey_localStorage = getObjectName('items', user, true)
                chrome.runtime.sendMessage({action: 'update-badge'})
                chrome.storage.local.remove(userKey_localStorage, callback)
            })
        })
    })
}

export const initStorage = (callback) => {
    chrome.storage.sync.get(null, (storage) => {
        if (Object.keys(storage).length === 0) {
            chrome.storage.sync.set(getStorageInit(), callback)
        } else {
            callback()
        }
    })
}

export const getSubscribedUsers_withSeenAndUnseenIDs = (callback) => {
    chrome.storage.sync.get(null, (storage) => {
        const users = Object.keys(storage.user_subscriptions);
        const users_withIDs = {}
        users.forEach(user => {
            users_withIDs[user] = getIDs_thing(user, true, storage)
        })
        users_withIDs['other'] = getIDs_thing('other', false, storage)
        callback(users_withIDs, storage)
    })
}

export const getSubscribedUsers_withUnseenIDs = (callback) => {
    chrome.storage.sync.get(null, (storage) => {
        const users = Object.keys(storage.user_subscriptions);
        const users_withIDs = {}
        users.forEach(user => {
            users_withIDs[user] = getUnseenIDs_thing(user, true, storage)
        })
        users_withIDs['other'] = getUnseenIDs_thing('other', false, storage)
        callback(users_withIDs)
    })
}

export const getUnseenIDs_thing = (thing, isUser, storage) => {
    return getIDs_thing(thing, isUser, storage)['unseen']
}

// Get IDs of items whose status has changed
export const getIDs_thing = (thing, isUser, storage) => {
    const track_removal = storage.options.removal_status.track
    const track_lock = storage.options.lock_status.track
    const unseenIDs = {}
    const seenIDs = {}
    let types = []
    const keys = getObjectNamesForThing(thing, isUser)
    if (track_removal) types.push(keys['removed'], keys['approved'])
    if (track_lock) types.push(keys['locked'], keys['unlocked'])

    types.forEach(type => {
        Object.keys(storage[type]).forEach(id => {
            const item = storage[type][id]
            if (item.u) unseenIDs[id] = true
            else seenIDs[id] = true
        })
    })
    return {unseen: Object.keys(unseenIDs), seen: Object.keys(seenIDs)}
}

export const getLocalStorageItems = (thing, isUser) => {
    const key_localStorage = getObjectName('items', thing, isUser)
    return browser.storage.local.get({[key_localStorage]: {}})
    .then(localStorageItems => {
        return localStorageItems[key_localStorage]
    })
}

export const saveLocalStorageItems = (thing, isUser, itemsToSave) => {
    const key_localStorage = getObjectName('items', thing, isUser)
    return browser.storage.local.set({[key_localStorage]: itemsToSave})
}

export const addLocalStorageItems = (items, thing, isUser) => {
    const key_localStorage = getObjectName('items', thing, isUser)
    return chrome.storage.local.get({[key_localStorage]: {}}, (localStorageItems) => {
        const storedItems = localStorageItems[key_localStorage]
        Object.keys(items).forEach(id => {
            storedItems[id] = items[id]
        })
        let itemsToSave = storedItems
        if (Object.keys(storedItems).length > MAX_LOCAL_STORAGE_ITEMS_PER_OBJECT) {
            itemsToSave = trimDictOfItems_by_utcAttribute(storedItems, MAX_LOCAL_STORAGE_ITEMS_PER_OBJECT, 'o')
        }
        return browser.storage.local.set({[key_localStorage]: itemsToSave})
    })
}

export const getItemFromLocalStorage = (thing, isUser, id, localStorage) => {
    const key = getObjectName('items', thing, isUser)
    if (key in localStorage) {
        if (id in localStorage[key]) {
            return new LocalStorageItem({object: localStorage[key][id]})
        }
    }
    return ''
}

export const getAllChanges = (callback) => {
    chrome.storage.sync.get('user_subscriptions', (result) => {
        const keys = [getObjectName('changes', 'other', false)]
        const keyToUser_lookup = {changes_other: 'other'}

        Object.keys(result.user_subscriptions).forEach(user => {
            const key = getObjectName('changes', user, true)
            keys.push(key)
            keyToUser_lookup[key] = user
        })
        chrome.storage.sync.get(keys, (res2) => {
            const changesByUser = {}
            keys.forEach(key => {
                if ((key in res2) && res2[key].length) {
                    changesByUser[keyToUser_lookup[key]] = res2[key]
                }
            })
            callback(changesByUser)
        })
    })
}

export const getOptions = (callback) => {
    return browser.storage.sync.get(['user_subscriptions', 'other_subscriptions', 'options'])
    .then(result => {
        const users = Object.keys(result.user_subscriptions)
        const others = Object.keys(result.other_subscriptions)
        const options = result.options
        return callback(users, others, options)
    })
    .catch(console.log)
}
export const saveOptions = (seen_count, interval, custom_clientid, removed_track, removed_notify, locked_track, locked_notify,
                            hide_subscribe, monitor_quarantined, callback) => {
    chrome.storage.sync.set({options: {
                                seen_count,
                                interval,
                                custom_clientid,
                                removal_status: {track: removed_track, notify: removed_notify},
                                lock_status:    {track: locked_track,  notify: locked_notify},
                                hide_subscribe,
                                monitor_quarantined,
                            }},
                            callback)
}
