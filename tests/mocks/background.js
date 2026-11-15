// The background script as built for Firefox, over the extension API fakes.
// It returns what the script listens to, so a test can send it messages, click
// its notifications and install or update it. Call it once per file, before
// anything imports the script.
import browserMock from './webextension-polyfill.js'
import { cookiesApi } from './cookies.js'

const event = listeners => ({ addListener: fn => listeners?.push(fn), removeListener() {}, hasListener: () => false })

export const loadBackground = async () => {
    globalThis.__BUILT_FOR__ = 'firefox'
    globalThis.__STORE__ = 'firefox'
    const c = globalThis.chrome
    const messages = []
    const clicks = []
    const installs = []
    const startups = []
    const cookieChanges = []
    const storageChanges = []
    const tabUpdates = []
    for (const name of ['onMessageExternal', 'onUpdateAvailable']) c.runtime[name] = event()
    c.runtime.onStartup = event(startups)
    c.runtime.onInstalled = event(installs)
    c.runtime.onMessage = event(messages)
    c.runtime.getManifest = () => ({ version: '0.0.5.30' })
    c.tabs.onUpdated = event(tabUpdates)
    for (const name of ['onRemoved', 'onActivated']) c.tabs[name] = event()
    c.alarms.onAlarm = event()
    c.alarms.get = (name, callback) => callback?.(null)
    c.alarms.getAll = callback => callback?.([])
    c.cookies = {
        onChanged: event(cookieChanges),
        getAll: (query, callback) => callback([]),
        get: (query, callback) => callback(null),
    }
    c.extension = { inIncognitoContext: false }
    c.notifications.onClicked = event(clicks)
    for (const name of ['onClosed', 'onButtonClicked']) c.notifications[name] = event()
    c.notifications.clear = () => {}
    // Manifest V2's name for the toolbar button
    c.browserAction = c.action
    c.contextMenus.removeAll = callback => callback?.()
    c.storage.onChanged = event(storageChanges)
    browserMock.cookies = cookiesApi
    browserMock.storage.onChanged = event(storageChanges)
    const sendingHeaders = []
    const headersReceived = []
    browserMock.webRequest = { onBeforeSendHeaders: event(sendingHeaders), onHeadersReceived: event(headersReceived) }
    browserMock.runtime = { ...browserMock.runtime, onInstalled: event() }
    // Nothing the script sends goes out, at load or in any test that doesn't stub
    // fetch itself. Not stubGlobal, which the config undoes before every test.
    globalThis.fetch = () => new Promise(() => {})
    await import('../../src/background.ts')
    // The fakes report no answers to webRequest, so a fetch doesn't wait for
    // its answer's cookies; a test that reports answers sets this back
    const { _publicCookieTiming } = await import('../../src/src/public-cookies')
    _publicCookieTiming.settleMs = 0
    return {
        // What webRequest would report: a request about to go out (the
        // background's blocking listener answers with its headers, or a
        // promise of them) and an answer's headers arriving
        beforeSendHeaders: details => sendingHeaders.map(listener => listener(details)).find(Boolean),
        headersReceived: details => headersReceived.forEach(listener => listener(details)),
        // The first listener that takes the message answers it
        send: (request, sender = {}) =>
            new Promise(resolve => {
                for (const listener of messages) {
                    if (listener(request, sender, resolve)) return
                }
            }),
        clickNotification: id => clicks.forEach(listener => listener(id)),
        install: details => installs.forEach(listener => listener(details)),
        startUp: () => startups.forEach(listener => listener()),
        // What the browser reports: a cookie set or removed, a storage write and
        // a page that finished loading in a tab (the fakes report none themselves)
        cookieChanged: info => cookieChanges.forEach(listener => listener(info)),
        storageChanged: (changes, area) => storageChanges.forEach(listener => listener(changes, area)),
        pageLoaded: (tabId, url) =>
            tabUpdates.forEach(listener => listener(tabId, { status: 'complete' }, { id: tabId, url })),
    }
}
