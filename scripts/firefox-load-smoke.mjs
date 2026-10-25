#!/usr/bin/env node
// Loads the built Firefox background script (dist-firefox) the way Firefox
// would, with Firefox's API behavior simulated, and fails if it throws,
// rejects, or never registers the listeners it needs. No browser, login or
// reddit involved, so it runs in the preflight.
//
// The simulation follows Firefox's MV2 extension APIs: browser.* methods
// return promises, chrome.* methods take a callback and return undefined, and
// every namespace exists (Firefox 153 exposes chrome.declarativeNetRequest
// without the permission). That is the shape of the bug that killed the
// Firefox background at startup in 0.0.5.21 (a top-level .catch on a chrome.*
// call), which no Chrome test could see.
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

// Answers for the calls a background makes at startup; anything else answers undefined
const answers = {
    'storage.local.get': args => (args[0] && typeof args[0] === 'object' && !Array.isArray(args[0]) ? { ...args[0] } : {}),
    'storage.sync.get': args => (args[0] && typeof args[0] === 'object' && !Array.isArray(args[0]) ? { ...args[0] } : {}),
    'storage.session.get': () => ({}),
    'tabs.query': () => [],
    'cookies.get': () => null,
    'cookies.getAll': () => [],
    'alarms.getAll': () => [],
    'permissions.getAll': () => ({ permissions: manifest.permissions, origins: [] }),
}
const SYNC = {
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
console.log(`listeners: ${registered.join(', ') || 'none'}`)
if (failures.length) {
    console.error(`FAILED:\n  ${failures.join('\n  ')}`)
    process.exit(1)
}
console.log('ok: loaded without errors and registered its listeners')
