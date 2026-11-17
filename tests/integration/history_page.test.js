// The history page as a person sees it: the real history.tsx over a fake DOM.

// Install chrome global BEFORE any source import
import '../mocks/chrome-api.js'

import { describe, it, expect, vi } from 'vitest'
import { REMOVED } from '../../src/src/common'
import { openPage } from '../mocks/extension-page.js'

const openHistory = (sync, local) =>
    openPage(
        () => {
            globalThis.window.location = { search: '' }
            // The welcome banner was dismissed
            vi.stubGlobal('localStorage', { getItem: () => '1' })
            return import('../../src/src/history.tsx')
        },
        { user_subscriptions: {}, other_subscriptions: {}, ...sync },
        local,
    )

// Before the first changes, with the welcome banner still up
describe("the history page's first scan", () => {
    const openFresh = (sync, local) =>
        openPage(
            () => {
                globalThis.window.location = { search: '' }
                vi.stubGlobal('localStorage', { getItem: () => null, setItem() {}, removeItem() {} })
                return import('../../src/src/history.tsx')
            },
            { user_subscriptions: {}, other_subscriptions: {}, ...sync },
            local,
        )
    const SCANNING = 'Scanning your recent posts and comments…'
    const NONE = 'No actions observed since extension installation.'

    // A check whose lookup failed still ends, and writes last_check
    it("is scanning until a check has read the user's items, though checks have run", async () => {
        const { document, storageChanged, __getLocalStorage } = await openFresh(
            { last_check: 1700000000 },
            { last_logged_in_user: 'alice', own_items_check: { user: 'alice', failing: 1700000000000 } },
        )
        await vi.waitFor(() => expect(document.body.textContent).toContain(SCANNING))
        expect(document.body.textContent).not.toContain(NONE)

        const read = { user: 'alice', ok: Date.now() }
        __getLocalStorage().own_items_check = read
        storageChanged({ own_items_check: { newValue: read } }, 'local')
        await vi.waitFor(() => expect(document.body.textContent).toContain(NONE))
    })

    it('with nobody signed in to Reddit, a check that has run is enough', async () => {
        const { document } = await openFresh({ last_check: 1700000000 }, {})
        await vi.waitFor(() => expect(document.body.textContent).toContain(NONE))
    })
})

describe('the history page', () => {
    it("shows an account named other's changes with its words, apart from followed items'", async () => {
        const { document } = await openHistory(
            {
                user_subscriptions: { other: true },
                changes_u_other: [{ i: 't1_mine', o: 1, g: REMOVED, n: 0 }],
                changes_other: [{ i: 't1_followed', o: 2, g: REMOVED, n: 0 }],
            },
            {
                items_u_other: { t1_mine: { t: 'words of mine', c: 0, p: 't3_post' } },
                items_other: { t1_followed: { t: 'words I follow', c: 0, p: 't3_post' } },
            },
        )
        // Newest first
        const bodies = () => Array.from(document.querySelectorAll('.md-body')).map(body => body.textContent.trim())
        await vi.waitFor(() => expect(bodies()).toEqual(['words I follow', 'words of mine']))
    })
})
