// The bells on new reddit's comments (content-reddit.ts) as storage changes.
// Firefox reports a write that changes nothing, and monitoring writes the
// user's name every cycle, so only a real change may redraw every bell.

// Install chrome global BEFORE any source import
import '../mocks/chrome-api.js'

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { parseHTML } from 'linkedom'
import browserMock, { __resetStorage } from '../mocks/webextension-polyfill.js'

// content-common.ts asks where it's running as it loads
globalThis.location.hostname = 'www.reddit.com'
const { redditModifications } = await import('../../src/src/content-reddit')

const PAGE =
    '<html device="desktop"><body><shreddit-comment author="someone" thingid="t1_c1" postid="t3_abc">' +
    '<shreddit-comment-action-row></shreddit-comment-action-row></shreddit-comment></body></html>'

let listeners, bell, change

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
    browserMock.storage.onChanged = { addListener: listener => listeners.push(listener) }
    change = (changes, area) => listeners.forEach(listener => listener(changes, area))
})

afterEach(() => {
    delete browserMock.storage.onChanged
})

describe('the bells on new reddit', () => {
    it('stay as they are when a write repeats the name', async () => {
        await open({})
        const drawn = bell().firstChild
        change({ last_logged_in_user: { oldValue: 'me', newValue: 'me' } }, 'local')
        expect(bell().firstChild).toBe(drawn)
    })

    it('stay as they are when a write repeats what is followed', async () => {
        await open({ t1_c1: { t: 1 } })
        const drawn = bell().firstChild
        change({ other_subscriptions: { oldValue: { t1_c1: { t: 1 } }, newValue: { t1_c1: { t: 1 } } } }, 'sync')
        expect(bell().firstChild).toBe(drawn)
    })

    it('redraw for a new name: the comment turns out to be your own', async () => {
        await open({})
        expect(bell().getAttribute('aria-disabled')).toBeNull()
        change({ last_logged_in_user: { oldValue: 'me', newValue: 'someone' } }, 'local')
        expect(bell().getAttribute('aria-disabled')).toBe('true')
    })

    it('redraw for a comment newly followed, and for one no longer followed', async () => {
        await open({})
        expect(bell().title).toBe('Get told if this is removed')
        change({ other_subscriptions: { newValue: { t1_c1: { t: 1 } } } }, 'sync')
        expect(bell().title).toBe('Stop following this')
        change({ other_subscriptions: { oldValue: { t1_c1: { t: 1 } } } }, 'sync')
        expect(bell().title).toBe('Get told if this is removed')
    })

    it('ignore a change to anything else, or in the other storage area', async () => {
        await open({})
        const drawn = bell().firstChild
        change({ other: { newValue: 1 } }, 'local')
        change({ last_logged_in_user: { newValue: 'someone' } }, 'sync')
        expect(bell().firstChild).toBe(drawn)
    })
})
