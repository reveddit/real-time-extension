// Mock for webextension-polyfill used in integration tests.
// Provides a minimal chrome.storage / chrome.runtime mock backed by in-memory objects.

let syncStorage = {}
let localStorage = {}

export function __resetStorage(syncInit = {}, localInit = {}) {
    syncStorage = structuredClone(syncInit)
    localStorage = structuredClone(localInit)
}

export function __getSyncStorage() {
    return syncStorage
}

export function __getLocalStorage() {
    return localStorage
}

function applyDefaults(keys, storage) {
    if (keys === null || keys === undefined) return { ...storage }
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

// A storage area over one of the in-memory stores. It answers with a promise
// (browser.*) and also calls a callback when given one (chrome.*).
export function makeStorageArea(getStore) {
    return {
        get(keys, callback) {
            const result = applyDefaults(keys, getStore())
            if (callback) callback(result)
            return Promise.resolve(result)
        },
        set(items, callback) {
            Object.assign(getStore(), items)
            if (callback) callback()
            return Promise.resolve()
        },
        remove(keys, callback) {
            const storage = getStore()
            const arr = Array.isArray(keys) ? keys : [keys]
            arr.forEach((k) => delete storage[k])
            if (callback) callback()
            return Promise.resolve()
        },
    }
}

const browser = {
    storage: {
        sync: makeStorageArea(() => syncStorage),
        local: makeStorageArea(() => localStorage),
    },
    // Tests may override these per-case (and restore after): the default is the
    // no-tabs environment, which routes public fetches to the background path.
    tabs: {
        query() {
            return Promise.resolve([])
        },
        sendMessage() {
            return Promise.reject(new Error('Could not establish connection. Receiving end does not exist.'))
        },
    },
    runtime: {
        sendMessage() {
            return Promise.resolve()
        },
        getURL(path) {
            return `chrome-extension://fakeid${path}`
        },
    },
}

export default browser
