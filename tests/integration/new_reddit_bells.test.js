// The bells on new reddit's comments (content-reddit.ts) as what's followed, or
// who's signed in, changes. The background tells Reddit tabs (background.ts
// BELLS_CHANGED): a tab listening to storage would be handed every write the
// extension makes. Only a real change may redraw every bell.

// Install chrome global BEFORE any source import
import '../mocks/chrome-api.js'

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { parseHTML } from 'linkedom'
import browserMock, { __resetStorage } from '../mocks/webextension-polyfill.js'
import { BELLS_CHANGED } from '../../src/src/common'

// content-common.ts asks where it's running as it loads
globalThis.location.hostname = 'www.reddit.com'
const { redditModifications } = await import('../../src/src/content-reddit')

const PAGE =
    '<html device="desktop"><body><shreddit-comment author="someone" thingid="t1_c1" postid="t3_abc">' +
    '<shreddit-comment-action-row></shreddit-comment-action-row></shreddit-comment></body></html>'

let listeners, bell, tell

const open = async followed => {
    const { document, window } = parseHTML(PAGE, { location: { pathname: '/' } })
    vi.stubGlobal('document', document)
    vi.stubGlobal('window', window)
    vi.stubGlobal(
        'MutationObserver',
        class {
            observe() {}
        },
    )
    await redditModifications(followed, false, [], [])
    await vi.advanceTimersByTimeAsync(0)
    bell = () => document.querySelector('shreddit-comment-action-row > .rev-comment-action')
}

beforeEach(() => {
    __resetStorage({}, { last_logged_in_user: 'me' })
    // Its later looks for removed comments have nothing to do here
    vi.useFakeTimers({ toFake: ['setTimeout'] })
    listeners = []
    browserMock.runtime.onMessage = { addListener: listener => listeners.push(listener) }
    // What the background sends
    tell = news => listeners.forEach(listener => listener({ action: BELLS_CHANGED, ...news }))
})

afterEach(() => {
    delete browserMock.runtime.onMessage
})

describe('the bells on new reddit', () => {
    it('stay as they are when told the name they have', async () => {
        await open({})
        const drawn = bell().firstChild
        tell({ me: 'me' })
        expect(bell().firstChild).toBe(drawn)
    })

    it('stay as they are when told what they already show is followed', async () => {
        await open({ t1_c1: { t: 1 } })
        const drawn = bell().firstChild
        tell({ followed: { t1_c1: { t: 1 } } })
        expect(bell().firstChild).toBe(drawn)
    })

    it('redraw for a new name: the comment turns out to be your own', async () => {
        await open({})
        expect(bell().getAttribute('aria-disabled')).toBeNull()
        tell({ me: 'someone' })
        expect(bell().getAttribute('aria-disabled')).toBe('true')
    })

    it('redraw for a comment newly followed, and for one no longer followed', async () => {
        await open({})
        expect(bell().title).toBe('Get told if this is removed')
        tell({ followed: { t1_c1: { t: 1 } } })
        expect(bell().title).toBe('Stop following this')
        tell({ followed: {} })
        expect(bell().title).toBe('Get told if this is removed')
    })

    it('ignore any other message', async () => {
        await open({})
        const drawn = bell().firstChild
        listeners.forEach(listener => listener({ action: 'fetch-www-profile-public', me: 'someone' }))
        expect(bell().firstChild).toBe(drawn)
    })

    // Every write once came to every Reddit tab, the cookie snapshot's with each
    // of Reddit's answers (survey lag reports, 2026-11-09)
    it("don't listen to storage", async () => {
        const storageListeners = []
        browserMock.storage.onChanged = { addListener: listener => storageListeners.push(listener) }
        try {
            await open({})
            expect(storageListeners).toEqual([])
        } finally {
            delete browserMock.storage.onChanged
        }
    })
})
