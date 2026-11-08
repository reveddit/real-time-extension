// The background script as built for Firefox, over the extension API fakes.
// It returns what the script listens to, so a test can send it messages and
// click its notifications. Call it once per file, before anything imports
// the script.
import browserMock from './webextension-polyfill.js'
import { cookiesApi } from './cookies.js'

const event = listeners => ({ addListener: fn => listeners?.push(fn), removeListener() {}, hasListener: () => false })

export const loadBackground = async () => {
    globalThis.__BUILT_FOR__ = 'firefox'
    globalThis.__STORE__ = 'firefox'
    const c = globalThis.chrome
    const messages = []
    const clicks = []
    for (const name of ['onMessageExternal', 'onInstalled', 'onStartup', 'onUpdateAvailable']) c.runtime[name] = event()
    c.runtime.onMessage = event(messages)
    c.runtime.getManifest = () => ({ version: '0.0.5.30' })
    for (const name of ['onUpdated', 'onRemoved', 'onActivated']) c.tabs[name] = event()
    c.alarms.onAlarm = event()
    c.alarms.get = (name, callback) => callback?.(null)
    c.alarms.getAll = callback => callback?.([])
    c.cookies = {
        onChanged: event(),
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
    c.storage.onChanged = event()
    browserMock.cookies = cookiesApi
    browserMock.storage.onChanged = event()
    browserMock.webRequest = { onBeforeSendHeaders: event(), onHeadersReceived: event() }
    browserMock.runtime = { ...browserMock.runtime, onInstalled: event() }
    // Nothing the script sends goes out, at load or in any test that doesn't stub
    // fetch itself. Not stubGlobal, which the config undoes before every test.
    globalThis.fetch = () => new Promise(() => {})
    await import('../../src/background.ts')
    return {
        // The first listener that takes the message answers it
        send: (request, sender = {}) =>
            new Promise(resolve => {
                for (const listener of messages) {
                    if (listener(request, sender, resolve)) return
                }
            }),
        clickNotification: id => clicks.forEach(listener => listener(id)),
    }
}
