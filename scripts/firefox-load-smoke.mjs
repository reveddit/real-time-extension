#!/usr/bin/env node
// Loads the built Firefox background script (dist-firefox) the way Firefox
// would, with Firefox's API behavior simulated, and fails if it throws,
// rejects, or never registers the listeners it needs. No browser, login or
// reddit involved, so it runs in the preflight.
//
// The simulation follows Firefox's MV2 extension APIs: browser.* methods
// return promises, chrome.* methods take a callback and return undefined, and
// a namespace exists when Firefox gives it to an MV2 background: always, by
// the manifest (browserAction), or by a permission (chrome.action, MV3's, is
// undefined; Firefox 153 exposes chrome.declarativeNetRequest without the
// permission). A top-level .catch on a chrome.* call is the shape of the bug
// that killed the Firefox background at startup in 0.0.5.21, which no Chrome
// test could see. After loading, each kind of event is delivered once, so a
// handler's own misuse of the API fails too.
//
//   node scripts/firefox-load-smoke.mjs [path/to/background.js]

import fs from 'fs'
import path from 'path'
import vm from 'vm'

const file = process.argv[2] || path.join(process.cwd(), 'dist-firefox', 'background.js')
const manifest = JSON.parse(fs.readFileSync(path.join(path.dirname(file), 'manifest.json'), 'utf8'))
const SETTLE_MS = 2500

const listeners = {}
const failures = []
const handles = []
const alarmNames = new Set()

const permissions = manifest.permissions || []
const NAMESPACES = new Set([
    'runtime',
    'extension',
    'i18n',
    'tabs',
    'windows',
    'permissions',
    'management',
    'contentScripts',
    'declarativeNetRequest',
    ...(manifest.browser_action ? ['browserAction'] : []),
    ...(manifest.page_action ? ['pageAction'] : []),
    ...(manifest.commands ? ['commands'] : []),
    ...permissions.filter(p => /^[a-zA-Z]+$/.test(p)),
    ...(permissions.includes('contextMenus') || permissions.includes('menus') ? ['contextMenus', 'menus'] : []),
])

// Storage keeps what's set, as the background expects of it (initStorage
// writes the defaults the rest reads)
const stores = { local: {}, sync: {}, session: {} }
const storageGet = area => args => {
    const store = stores[area]
    const keys = args[0]
    if (keys === undefined || keys === null) return structuredClone(store)
    if (typeof keys === 'string') return keys in store ? { [keys]: structuredClone(store[keys]) } : {}
    if (Array.isArray(keys)) return Object.fromEntries(keys.filter(k => k in store).map(k => [k, structuredClone(store[k])]))
    return Object.fromEntries(Object.entries(keys).map(([k, d]) => [k, k in store ? structuredClone(store[k]) : d]))
}
const storageSet = area => args => {
    Object.assign(stores[area], structuredClone(args[0] || {}))
}
const storageRemove = area => args => {
    for (const k of [].concat(args[0] ?? [])) delete stores[area][k]
}

// Answers for the calls a background makes; anything else answers undefined
const answers = {
    ...Object.fromEntries(
        ['local', 'sync', 'session'].flatMap(area => [
            [`storage.${area}.get`, storageGet(area)],
            [`storage.${area}.set`, storageSet(area)],
            [`storage.${area}.remove`, storageRemove(area)],
            [`storage.${area}.clear`, () => void (stores[area] = {})],
        ]),
    ),
    'tabs.query': () => [],
    'cookies.get': () => null,
    'cookies.getAll': () => [],
    'alarms.getAll': () => [],
    'alarms.create': args => {
        alarmNames.add(typeof args[0] === 'string' ? args[0] : '')
    },
    'permissions.getAll': () => ({ permissions: manifest.permissions, origins: [] }),
}
// A menu item's id comes back at once, a callback (if any) once it exists
const menuCreate = args => {
    const callback = args.find(a => typeof a === 'function')
    if (callback) handles.push(setTimeout(callback, 0))
    return args[0]?.id ?? 1
}
const SYNC = {
    'contextMenus.create': menuCreate,
    'menus.create': menuCreate,
    'runtime.getManifest': () => manifest,
    'runtime.getURL': args => `moz-extension://smoke/${String(args[0] || '').replace(/^\//, '')}`,
    'extension.getURL': args => `moz-extension://smoke/${String(args[0] || '').replace(/^\//, '')}`,
    'i18n.getMessage': () => '',
}
const VALUES = {
    'runtime.id': manifest.browser_specific_settings?.gecko?.id || 'smoke@test',
    'runtime.lastError': undefined,
    'extension.inIncognitoContext': false,
}

// Plain objects of the script's own realm: webextension-polyfill hands back
// Firefox's own browser only when its prototype is that realm's
// Object.prototype, as Firefox's is
let realmObjectPrototype = Object.prototype
const makeApi = flavor => {
    // The namespaces are plain objects; the methods under them are callable
    const node = apiPath =>
        new Proxy(apiPath ? function () {} : {}, {
            getPrototypeOf: t => (apiPath ? Object.getPrototypeOf(t) : realmObjectPrototype),
            get(_t, prop) {
                // Not an API: a module loader's interop check, and promise detection
                if (typeof prop === 'symbol' || prop === 'then' || prop === '__esModule') return undefined
                if (!apiPath && !NAMESPACES.has(prop)) return undefined
                const p = apiPath ? `${apiPath}.${prop}` : prop
                if (p in VALUES) return VALUES[p]
                if (/^on[A-Z]/.test(prop)) {
                    return {
                        addListener: fn => {
                            ;(listeners[p] ||= []).push(fn)
                        },
                        removeListener: () => {},
                        hasListener: () => false,
                    }
                }
                return node(p)
            },
            apply(_t, _this, args) {
                if (apiPath in SYNC) return SYNC[apiPath](args)
                const value = answers[apiPath] ? answers[apiPath](args) : undefined
                if (flavor === 'browser') return Promise.resolve(value)
                const callback = args[args.length - 1]
                if (typeof callback === 'function') handles.push(setTimeout(() => callback(value), 0))
                return undefined
            },
        })
    return node('')
}

const response = () => ({
    ok: false,
    status: 503,
    headers: { get: () => null },
    text: async () => '',
    json: async () => {
        throw new Error('no body')
    },
})
const sandbox = {
    console: { log() {}, info() {}, debug() {}, warn() {}, error() {} },
    fetch: async () => response(),
    setTimeout: (fn, ms, ...a) => {
        const h = setTimeout(fn, Math.min(ms || 0, SETTLE_MS * 4), ...a)
        handles.push(h)
        return h
    },
    clearTimeout,
    setInterval: (fn, ms) => {
        const h = setInterval(fn, Math.max(ms || 0, 1000))
        handles.push(h)
        return h
    },
    clearInterval,
    queueMicrotask,
    URL,
    URLSearchParams,
    TextEncoder,
    TextDecoder,
    AbortController,
    atob,
    btoa,
    navigator: { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:153.0) Gecko/20100101 Firefox/153.0', language: 'en-US' },
    document: { addEventListener() {}, createElement: () => ({ style: {} }), visibilityState: 'visible' },
    location: { href: 'moz-extension://smoke/_generated_background_page.html', protocol: 'moz-extension:' },
    addEventListener() {},
    removeEventListener() {},
}
sandbox.window = sandbox
sandbox.self = sandbox
const context = vm.createContext(sandbox)
realmObjectPrototype = vm.runInContext('Object.prototype', context)
sandbox.browser = makeApi('browser')
sandbox.chrome = makeApi('chrome')

// The bundle is minified onto one line, so a stack would print all of it
const describe = err => String(err?.message || err).slice(0, 300)
const onRejection = reason => failures.push(`unhandled rejection: ${describe(reason)}`)
const onException = err => failures.push(`uncaught exception: ${describe(err)}`)
process.on('unhandledRejection', onRejection)
process.on('uncaughtException', onException)

try {
    vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file })
} catch (err) {
    failures.push(`threw at load: ${describe(err)}`)
}
await new Promise(r => setTimeout(r, SETTLE_MS))

// Each kind of event once, as Firefox delivers them
const deliver = (name, ...args) => {
    for (const fn of listeners[name] || []) {
        try {
            const result = fn(...args)
            if (result && typeof result.then === 'function') result.then(undefined, onRejection)
        } catch (err) {
            failures.push(`${name} handler threw: ${describe(err)}`)
        }
    }
}
// An install, which is what empty storage is; its alarms exist once it has run
deliver('runtime.onInstalled', { reason: 'install' })
await new Promise(r => setTimeout(r, SETTLE_MS))
for (const name of alarmNames) deliver('alarms.onAlarm', { name, scheduledTime: Date.now() })
deliver('runtime.onMessage', { action: 'firefox-load-smoke' }, { id: VALUES['runtime.id'] }, () => {})
deliver('webRequest.onBeforeSendHeaders', {
    url: 'https://www.reddit.com/r/sub/about.json',
    originUrl: 'https://www.reveddit.com/v/sub/',
    tabId: 1,
    requestHeaders: [],
})
await new Promise(r => setTimeout(r, SETTLE_MS))
for (const h of handles) {
    clearTimeout(h)
    clearInterval(h)
}
process.off('unhandledRejection', onRejection)
process.off('uncaughtException', onException)

// What the background must register at startup to work at all
const REQUIRED = ['runtime.onMessage', 'runtime.onInstalled', 'alarms.onAlarm', 'webRequest.onBeforeSendHeaders']
const registered = Object.keys(listeners).sort()
const missing = REQUIRED.filter(name => !registered.includes(name))
for (const name of missing) failures.push(`no ${name} listener registered`)

console.log(`firefox load smoke: ${path.relative(process.cwd(), file)} (version ${manifest.version})`)
console.log(`listeners: ${registered.join(', ') || 'none'}; alarms delivered: ${[...alarmNames].join(', ') || 'none'}`)
if (failures.length) {
    console.error(`FAILED:\n  ${failures.join('\n  ')}`)
    process.exit(1)
}
console.log('ok: loaded without errors and registered its listeners')
