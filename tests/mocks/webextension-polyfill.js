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

const browser = {
    storage: {
        sync: {
            get(keys) {
                return Promise.resolve(applyDefaults(keys, syncStorage))
            },
            set(items) {
                Object.assign(syncStorage, items)
                return Promise.resolve()
            },
            remove(keys) {
                const arr = Array.isArray(keys) ? keys : [keys]
                arr.forEach((k) => delete syncStorage[k])
                return Promise.resolve()
            },
        },
        local: {
            get(keys) {
                return Promise.resolve(applyDefaults(keys, localStorage))
            },
            set(items) {
                Object.assign(localStorage, items)
                return Promise.resolve()
            },
            remove(keys) {
                const arr = Array.isArray(keys) ? keys : [keys]
                arr.forEach((k) => delete localStorage[k])
                return Promise.resolve()
            },
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
