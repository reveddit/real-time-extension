// The options page as a person sees it: the real options.tsx over a fake DOM.

import { describe, it, expect, vi } from 'vitest'
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
    const type = (input, value) => {
        Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, value)
        input.dispatchEvent(new window.Event('input', { bubbles: true }))
    }
    return {
        text,
        sync: __getSyncStorage(),
        // react tracks the input's value, so a change has to go round it
        typeClientId: value => type(document.querySelector('input[placeholder="<default is blank>"]'), value),
        type,
        inputLabelled: name =>
            Array.from(document.querySelectorAll('label'))
                .find(label => label.textContent.includes(name))
                .parentElement.querySelector('input'),
        clickSave: () => document.querySelector('button').click(),
        resetDefaults: () =>
            Array.from(document.querySelectorAll('a, button'))
                .find(el => el.textContent.includes('reset to defaults'))
                .click(),
        save: async () => {
            document.querySelector('button').click()
            await vi.waitFor(() => expect(window.close).toHaveBeenCalled())
        },
    }
}


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

describe('the scan settings', () => {
    const field = (page, name) => page.inputLabelled(name)
    const READS = 'most Reddit reads per scan click'
    const SECONDS = 'seconds between scan reads'

    it('start gentle, and a save keeps what the user chose', async () => {
        const page = await open({ custom_clientid: '' })
        expect(field(page, READS).value).toBe('20')
        expect(field(page, SECONDS).value).toBe('3')
        page.type(field(page, READS), '50')
        page.type(field(page, SECONDS), '1.5')
        await page.save()
        expect(page.sync.options).toMatchObject({ scan_reads_per_click: 50, scan_seconds_between_reads: 1.5 })
    })

    it('show what was saved, or the default in place of what the extension can\'t use', async () => {
        const page = await open({ scan_reads_per_click: 35, scan_seconds_between_reads: 0 })
        expect(field(page, READS).value).toBe('35')
        expect(field(page, SECONDS).value).toBe('3')
    })

    it('go back to gentle with "reset to defaults"', async () => {
        const page = await open({ scan_reads_per_click: 80, scan_seconds_between_reads: 1 })
        page.resetDefaults()
        await vi.waitFor(() => expect(field(page, READS).value).toBe('20'))
        expect(field(page, SECONDS).value).toBe('3')
    })

    it.each([
        [READS, '9', 'from 10 to 100'],
        [READS, '101', 'from 10 to 100'],
        [READS, '10.5', 'from 10 to 100'],
        [READS, '', 'from 10 to 100'],
        [SECONDS, '0.5', 'from 1 to 60'],
        [SECONDS, '61', 'from 1 to 60'],
        [SECONDS, 'fast', 'from 1 to 60'],
    ])('won\'t save %s as "%s"', async (name, value, message) => {
        const page = await open({ custom_clientid: '' })
        page.type(field(page, name), value)
        page.clickSave()
        await vi.waitFor(() => expect(page.text()).toContain(message))
        expect(page.sync.options.scan_reads_per_click).toBeUndefined()
    })
})
