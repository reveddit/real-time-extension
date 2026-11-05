// The options page as a person sees it: the real options.tsx over a fake DOM.

import { describe, it, expect, vi, afterEach } from 'vitest'
import { parseHTML } from 'linkedom'

const FIELD = 'monitor quarantined content'
const NOTE = 'may appear to cause an occasional logout'

const open = async stored => {
    vi.resetModules()
    const { document, window } = parseHTML('<html><head></head><body><div id="root"></div></body></html>')
    window.close = vi.fn()
    // What react and emotion look for when they load
    document.oninput = null
    vi.stubGlobal('document', document)
    vi.stubGlobal('window', window)
    vi.stubGlobal('HTMLElement', window.HTMLElement)
    vi.stubGlobal('navigator', { userAgent: '' })
    // Fresh modules, so chrome and browser share the storage the page will read
    await import('../mocks/chrome-api.js')
    const { __resetStorage, __getSyncStorage } = await import('../mocks/webextension-polyfill.js')
    __resetStorage({ options: stored })
    chrome.storage.onChanged = { addListener() {}, removeListener() {} }
    await import('../../src/src/options.tsx')
    const text = () => document.body.textContent
    await vi.waitFor(() => expect(text()).toContain('Polling'))
    return {
        text,
        sync: __getSyncStorage(),
        // react tracks the input's value, so a change has to go round it
        typeClientId: value => {
            const input = document.querySelector('input[placeholder="<default is blank>"]')
            Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, value)
            input.dispatchEvent(new window.Event('input', { bubbles: true }))
        },
        save: async () => {
            document.querySelector('button').click()
            await vi.waitFor(() => expect(window.close).toHaveBeenCalled())
        },
    }
}

afterEach(() => vi.unstubAllGlobals())

describe('monitor quarantined content', () => {
    it('is hidden with no client id, whatever is stored', async () => {
        const { text } = await open({ custom_clientid: '', monitor_quarantined: true })
        expect(text()).not.toContain(FIELD)
        expect(text()).not.toContain(NOTE)
    })

    it('shows with a client id, with its note only when it is on', async () => {
        const on = await open({ custom_clientid: 'mine', monitor_quarantined: true })
        expect(on.text()).toContain(FIELD)
        expect(on.text()).toContain(NOTE)
        const off = await open({ custom_clientid: 'mine', monitor_quarantined: false })
        expect(off.text()).toContain(FIELD)
        expect(off.text()).not.toContain(NOTE)
    })

    it('follows the field as it is typed in, and spaces count as blank', async () => {
        const { text, typeClientId } = await open({ custom_clientid: '' })
        typeClientId('mine')
        await vi.waitFor(() => expect(text()).toContain(FIELD))
        typeClientId('   ')
        await vi.waitFor(() => expect(text()).not.toContain(FIELD))
    })

    it('keeps the stored value through a save while hidden', async () => {
        const { sync, save } = await open({ custom_clientid: '', monitor_quarantined: true })
        await save()
        expect(sync.options.monitor_quarantined).toBe(true)
    })
})

describe('custom client id', () => {
    it("says what the field takes, with nothing built in for it to override", async () => {
        const { text } = await open({ custom_clientid: '' })
        expect(text()).toContain('"installed app" client id from reddit > preferences > apps')
        expect(text()).toContain("Checks then also use Reddit's API with it.")
        expect(text()).not.toContain('overrides')
    })
})
