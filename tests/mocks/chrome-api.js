// Global chrome API mock for vitest.
// Backs onto the same in-memory stores as the webextension-polyfill mock.

import { __getSyncStorage, __getLocalStorage, makeStorageArea } from './webextension-polyfill.js'

globalThis.chrome = {
    storage: {
        sync: makeStorageArea(__getSyncStorage),
        local: makeStorageArea(__getLocalStorage),
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
    action: {
        setBadgeText() {},
        setBadgeBackgroundColor() {},
    },
    runtime: {
        id: 'fakeid',
        sendMessage(msg, cb) {
            if (cb) cb()
            return Promise.resolve()
        },
        getURL(path) {
            return `chrome-extension://fakeid${path}`
        },
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
globalThis.__STORE__ = 'chrome'
globalThis.__DEV__ = globalThis.__DEV__ ?? false
globalThis.__LOCAL_SITE__ = false

// Needed by common.js location checks
if (typeof globalThis.location === 'undefined') {
    globalThis.location = { protocol: 'chrome-extension:' }
}
