// An extension page as a person sees it: the real page over a fake DOM, with
// fresh modules, so chrome and browser share the storage the page reads. load
// imports the page, after any fakes it needs. Returns the DOM and the storage
// mock's helpers.
import { vi } from 'vitest'
import { parseHTML } from 'linkedom'

export const openPage = async (load, sync = {}, local = {}) => {
    vi.resetModules()
    const { document, window } = parseHTML('<html><head></head><body><div id="root"></div></body></html>')
    window.close = vi.fn()
    // What react and emotion look for when they load
    document.oninput = null
    vi.stubGlobal('document', document)
    vi.stubGlobal('window', window)
    vi.stubGlobal('HTMLElement', window.HTMLElement)
    // With the origin's locks, which the page shares with the background
    vi.stubGlobal('navigator', { userAgent: '', locks: navigator.locks })
    await import('./chrome-api.js')
    const storage = await import('./webextension-polyfill.js')
    storage.__resetStorage(sync, local)
    chrome.storage.onChanged = { addListener() {}, removeListener() {} }
    await load()
    return { document, window, ...storage }
}
