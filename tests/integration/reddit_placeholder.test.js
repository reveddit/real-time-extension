// Reddit's own "[ Removed by Reddit ]" stands in for an item's text as [removed]
// and [deleted] do (common.ts isPlaceholderText). Others see it with the author
// kept, as archived copies of reddit's answers show, so the bridge passes it on
// as it is, and a profile scan has nothing in it to show.

// Install chrome global BEFORE any source import
import '../mocks/chrome-api.js'

import { describe, it, expect, afterEach } from 'vitest'
import { DOMParser } from 'linkedom'
import browserMock, { __resetStorage } from '../mocks/webextension-polyfill.js'
import { entry, postEntry, feed, listing, withTimers, answerRead } from '../mocks/feeds.js'
import { toPublicView } from '../../src/src/bridge.ts'
import { scanUserProfile } from '../../src/src/profile-scan.ts'
import { commentFeedPath } from '../../src/src/scan-reads.ts'

const BY_REDDIT = '[ Removed by Reddit ]'

describe("the bridge's public view", () => {
    it('leaves a comment reddit removed as others see it, though monitoring knows it was removed', () => {
        const comment = { kind: 't1', data: { name: 't1_r', author: 'someone', author_fullname: 't2_abc', body: BY_REDDIT } }
        toPublicView({ kind: 'Listing', data: { children: [comment] } }, { knownRemoved: new Set(['t1_r']), me: '', verifiedLive: new Set() })
        expect(comment.data).toMatchObject({ body: BY_REDDIT, author: 'someone', author_fullname: 't2_abc' })
    })
})

describe('the profile scan', () => {
    const query = 'sort=new&limit=100'
    const savedSendMessage = browserMock.runtime.sendMessage
    afterEach(() => {
        browserMock.runtime.sendMessage = savedSendMessage
    })

    it("doesn't show a removed comment whose feed has only reddit's text in place of its own", async () => {
        globalThis.DOMParser = DOMParser
        __resetStorage({ options: { scan_reads_per_click: 50 } })
        const pages = {
            [`/user/someone/comments/.rss?${query}`]: feed(
                entry('t1_byreddit', 'someone', BY_REDDIT),
                entry('t1_gone', 'someone', 'the removed text'),
            ),
            [`/user/someone/comments.json?${query}`]: listing(),
            [`/user/someone/submitted/.rss?${query}`]: feed(),
            [`/user/someone/submitted.json?${query}`]: listing(),
        }
        // Both removed: each one's own feed ends at its parent
        for (const name of ['t1_byreddit', 't1_gone']) {
            pages[commentFeedPath({ name, link_id: 't3_post' })] = feed(postEntry(), entry('t1_parent', 'alice', 'live words'))
        }
        browserMock.runtime.sendMessage = async message =>
            message.action === 'fetch-with-login' ? answerRead(pages, [], message.path) : undefined
        const results = await withTimers(() => scanUserProfile('someone', () => {}))
        expect(results.map(r => r.id)).toEqual(['t1_gone'])
    })
})
