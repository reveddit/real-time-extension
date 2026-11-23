// The options page as a person sees it: the real options.tsx over a fake DOM.

import { describe, it, expect, vi } from 'vitest'
import { openPage } from '../mocks/extension-page.js'

const open = async (stored, local) => {
    const { document, window, __getSyncStorage } = await openPage(
        () => import('../../src/src/options.tsx'),
        { options: stored },
        local,
    )
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


describe('the retired client id and quarantined-content options', () => {
    it('are not on the page, whatever is stored', async () => {
        const { text } = await open({ custom_clientid: 'mine', monitor_quarantined: true })
        expect(text()).not.toContain('client id')
        expect(text()).not.toContain('quarantined')
        expect(text()).not.toContain('Advanced')
    })

    it('are left out of a save', async () => {
        const { sync, save } = await open({ custom_clientid: 'mine', monitor_quarantined: true })
        await save()
        expect(sync.options).not.toHaveProperty('custom_clientid')
        expect(sync.options).not.toHaveProperty('monitor_quarantined')
    })
})

describe('the scan settings', () => {
    const field = (page, name) => page.inputLabelled(name)
    const READS = 'most Reddit reads per scan click'
    const SECONDS = 'seconds between scan reads'

    it('start gentle, and a save keeps what the user chose', async () => {
        const page = await open({ interval: 5 })
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

    it("say the website's limits as they apply, and scans wait no more than 60 seconds", async () => {
        const scan_limits = { reads_per_click: 12, seconds_between_reads: 120 }
        const page = await open({ interval: 5 }, { news_cache: { feed: { options: { scan_limits } } } })
        await vi.waitFor(() => expect(page.text()).toContain('holds every scan to at most 12 reads a click'))
        expect(page.text()).toContain('at least 60 seconds between reads')
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
        const page = await open({ interval: 5 })
        page.type(field(page, name), value)
        page.clickSave()
        await vi.waitFor(() => expect(page.text()).toContain(message))
        expect(page.sync.options.scan_reads_per_click).toBeUndefined()
    })
})

describe('a save', () => {
    it('writes every option under its stored name', async () => {
        const stored = {
            seen_count: 3,
            interval: 5,
            removal_status: { track: true, notify: false },
            lock_status: { track: false, notify: false },
            hide_subscribe: true,
            show_scan_on_own_profile: true,
            show_scan_on_other_profiles: false,
            show_thread_scan_buttons: false,
            highlight_own_profile_status: false,
            auto_filter_removed_threads: false,
            scan_reads_per_click: 50,
            scan_seconds_between_reads: 1.5,
        }
        const { sync, save } = await open(stored)
        await save()
        expect(sync.options).toEqual(stored)
    })
})
