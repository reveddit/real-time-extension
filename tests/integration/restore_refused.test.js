// Restore and the thread scan on an old reddit thread while reddit answers every
// author's feed with its block page: they stop at the first author instead of
// fetching everyone's feed, and don't call the thread searched.

// Install chrome global BEFORE any source import
import '../mocks/chrome-api.js'

import { describe, it, expect, beforeAll, afterEach } from 'vitest'
import browserMock, { __resetStorage } from '../mocks/webextension-polyfill.js'
import { parseHTML, DOMParser } from 'linkedom'
import { withTimers } from '../mocks/feeds.js'

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

const THREAD_FEED =
    '<feed xmlns="http://www.w3.org/2005/Atom"><entry><author><name>/u/opuser</name></author>' +
    '<id>t3_post</id><updated>2026-11-03T02:17:21+00:00</updated></entry></feed>'

const savedSendMessage = browserMock.runtime.sendMessage
afterEach(() => {
    browserMock.runtime.sendMessage = savedSendMessage
})

// The thread's feed reads, and every author's is refused; returns the feeds asked for
const refuseUserPages = () => {
    const asked = []
    browserMock.runtime.sendMessage = async message => {
        if (message.action !== 'fetch-with-login') return undefined
        if (message.path.startsWith('/r/')) {
            return { ok: true, status: 200, text: THREAD_FEED }
        }
        asked.push(message.path)
        return { ok: false, status: 403, blockPage: true }
    }
    return asked
}

describe("restore and the thread scan when reddit refuses authors' feeds", () => {
    it('restore stops after three refused feeds and leaves the thread unsearched', async () => {
        __resetStorage()
        const asked = refuseUserPages()
        const progress = []
        const result = await withTimers(() =>
            restoreComment('t1_target', 't3_post', 'sub', false, p => progress.push(p), new Map()),
        )
        expect(new Set(asked).size).toBe(3)
        expect(result.found).toBe(false)
        // exhausted would disable every scan button in the thread
        expect(result.exhausted).toBeFalsy()
        expect(progress.at(-1)).toMatchObject({
            status: 'error',
            message: 'Reddit is refusing the feeds a scan reads. Try again later.',
        })
    })

    it('the thread scan stops after three refused feeds and says why', async () => {
        __resetStorage()
        const asked = refuseUserPages()
        const progress = []
        const recovered = await withTimers(() =>
            scanThreadForRemovedComments('t3_post', 'sub', false, new Map(), p => progress.push(p)),
        )
        expect(new Set(asked).size).toBe(3)
        expect(recovered).toEqual([])
        expect(progress.at(-1)).toMatchObject({ status: 'error' })
        expect(progress.at(-1).message).toMatch(/^Reddit is refusing the feeds a scan reads/)
    })

    it('never calls the scan finished, however many clicks reddit refuses', async () => {
        __resetStorage()
        refuseUserPages()
        const pageReads = new Map()
        const statuses = []
        for (let click = 0; click < 7; click++) {
            await withTimers(() =>
                scanThreadForRemovedComments('t3_post', 'sub', false, pageReads, p => statuses.push(p.status)),
            )
        }
        expect(statuses).not.toContain('not_found')
        expect(statuses).not.toContain('found')
    })
})
