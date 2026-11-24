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

describe('a save', () => {
    it('writes every option under its stored name', async () => {
        const stored = {
            seen_count: 3,
            interval: 5,
            removal_status: { track: true, notify: false },
            lock_status: { track: false, notify: false },
            hide_subscribe: true,
            highlight_own_profile_status: false,
        }
        const { sync, save } = await open(stored)
        await save()
        expect(sync.options).toEqual(stored)
    })
})
