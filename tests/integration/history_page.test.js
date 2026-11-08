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
