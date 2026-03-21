// Global chrome API mock for vitest.
// Backs onto the same in-memory stores as the webextension-polyfill mock.

import { __getSyncStorage, __getLocalStorage } from './webextension-polyfill.js'

function applyDefaults(keys, storage) {
    if (keys === null) return { ...storage }
    if (typeof keys === 'string') {
        return { [keys]: storage[keys] }
    }
    // Array of key names — return value for each key that exists
    if (Array.isArray(keys)) {
        const result = {}
        for (const key of keys) {
            if (key in storage) result[key] = storage[key]
        }
        return result
    }
    // Object with defaults
    const result = {}
    for (const [key, defaultValue] of Object.entries(keys)) {
        result[key] = key in storage ? storage[key] : defaultValue
    }
    return result
}

globalThis.chrome = {
    storage: {
        sync: {
            get(keys, callback) {
                const result = applyDefaults(keys, __getSyncStorage())
                if (callback) callback(result)
                return Promise.resolve(result)
            },
            set(items, callback) {
                Object.assign(__getSyncStorage(), items)
                if (callback) callback()
                return Promise.resolve()
            },
            remove(keys, callback) {
                const storage = __getSyncStorage()
                const arr = Array.isArray(keys) ? keys : [keys]
                arr.forEach((k) => delete storage[k])
                if (callback) callback()
                return Promise.resolve()
            },
        },
        local: {
            get(keys, callback) {
                const result = applyDefaults(keys, __getLocalStorage())
                if (callback) callback(result)
                return Promise.resolve(result)
            },
            set(items, callback) {
                Object.assign(__getLocalStorage(), items)
                if (callback) callback()
                return Promise.resolve()
            },
            remove(keys, callback) {
                const storage = __getLocalStorage()
                const arr = Array.isArray(keys) ? keys : [keys]
                arr.forEach((k) => delete storage[k])
                if (callback) callback()
                return Promise.resolve()
            },
        },
    },
    alarms: {
        clear() {},
        create() {},
    },
    tabs: {
        create(opts, cb) {
            if (cb) cb({ id: 1, windowId: 1 })
        },
        query(query, cb) {
            if (cb) cb([])
        },
        sendMessage(tabId, msg, cb) {
            if (cb) cb(null)
        },
    },
    windows: {
        create(opts, cb) {
            if (cb) cb({ id: 1 })
        },
        update() {},
    },
    action: {
        setBadgeText() {},
        setBadgeBackgroundColor() {},
    },
    browserAction: {
        setBadgeText() {},
        setBadgeBackgroundColor() {},
    },
    runtime: {
        sendMessage(msg, cb) {
            if (cb) cb()
            return Promise.resolve()
        },
        getURL(path) {
            return `chrome-extension://fakeid${path}`
        },
        openOptionsPage() {},
        lastError: null,
    },
    notifications: {
        create(id, options, cb) {
            if (cb) cb(id)
        },
    },
    contextMenus: {
        create() {},
        onClicked: { addListener() {} },
    },
}

// Needed by common.js for the __BUILT_FOR__ DefinePlugin variable
globalThis.__BUILT_FOR__ = 'chrome'

// Needed by common.js location checks
if (typeof globalThis.location === 'undefined') {
    globalThis.location = { protocol: 'chrome-extension:' }
}
