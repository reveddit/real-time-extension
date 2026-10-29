// Restore and the thread scan on an old reddit thread while reddit answers every
// legacy user page with its challenge (the background's fetch-userpage-html
// says refused, since 2026-10-28): they stop at the first author instead of
// fetching everyone's page, and don't call the thread searched.

// Install chrome global BEFORE any source import
import '../mocks/chrome-api.js'

import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest'
import browserMock, { __resetStorage } from '../mocks/webextension-polyfill.js'
import { parseHTML, DOMParser } from 'linkedom'

const AUTHORS = 30
let restoreComment
let scanThreadForRemovedComments
beforeAll(async () => {
    let html =
        '<html><body><div id="siteTable"><div class="thing link" data-comments-count="40">' +
        '<div class="top-matter"><a class="author">opuser</a></div></div></div>' +
        '<div class="commentarea"><div class="sitetable">'
    for (let i = 0; i < AUTHORS; i++) {
        html +=
            `<div class="thing comment" data-fullname="t1_c${i}" data-author="author${i}">` +
            `<div class="entry"><div class="usertext-body"><div class="md">hi ${i}</div></div></div></div>`
    }
    html +=
        '<div class="thing comment" data-fullname="t1_target" data-author="[deleted]">' +
        '<div class="entry"><div class="usertext-body"><div class="md">[removed]</div></div></div></div>' +
        '</div></div></body></html>'
    globalThis.document = parseHTML(html).document
    globalThis.DOMParser = DOMParser
    ;({ restoreComment, scanThreadForRemovedComments } = await import('../../src/src/restore.ts'))
})

const savedSendMessage = browserMock.runtime.sendMessage
afterEach(() => {
    browserMock.runtime.sendMessage = savedSendMessage
    vi.useRealTimers()
})

// Every author's page is refused; returns the pages asked for
const refuseUserPages = () => {
    const asked = []
    browserMock.runtime.sendMessage = async message => {
        if (message.action === 'fetch-userpage-html') {
            asked.push(message.path)
            return { ok: false, status: 200, error: 'challenge page: reddit refuses legacy pages', refused: true }
        }
        return undefined
    }
    return asked
}

// The lookups are spaced 1.5 s apart
const withTimers = async run => {
    vi.useFakeTimers()
    let done = false
    const running = run().finally(() => (done = true))
    for (let i = 0; i < 100 && !done; i++) await vi.advanceTimersByTimeAsync(2000)
    return running
}

describe('restore and the thread scan when reddit refuses the legacy user pages', () => {
    it('restore stops at the first refused page and leaves the thread unsearched', async () => {
        __resetStorage()
        const asked = refuseUserPages()
        const progress = []
        const result = await withTimers(() =>
            restoreComment('t1_target', 't3_post', 'sub', false, p => progress.push(p), new Map()),
        )
        expect(asked).toHaveLength(1)
        expect(result.found).toBe(false)
        // exhausted would disable every scan button in the thread
        expect(result.exhausted).toBeFalsy()
        expect(progress.at(-1)).toMatchObject({
            status: 'error',
            message: 'Reddit is refusing the pages restore reads. Try again later.',
        })
    })

    it('the thread scan stops at the first refused page and says why', async () => {
        __resetStorage()
        const asked = refuseUserPages()
        const progress = []
        const recovered = await withTimers(() =>
            scanThreadForRemovedComments('t3_post', 'sub', false, new Map(), p => progress.push(p)),
        )
        expect(asked).toHaveLength(1)
        expect(recovered).toEqual([])
        expect(progress.at(-1)).toMatchObject({ status: 'error' })
        expect(progress.at(-1).message).toMatch(/^Reddit is refusing the pages this scan reads/)
    })
})
