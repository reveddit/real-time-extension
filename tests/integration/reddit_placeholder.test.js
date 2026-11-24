// Reddit's own "[ Removed by Reddit ]" stands in for an item's text as [removed]
// and [deleted] do (common.ts isPlaceholderText). Others see it with the author
// kept, as archived copies of reddit's answers show, so the bridge passes it on
// as it is.

// Install chrome global BEFORE any source import
import '../mocks/chrome-api.js'

import { describe, it, expect } from 'vitest'
import { toPublicView } from '../../src/src/bridge.ts'

const BY_REDDIT = '[ Removed by Reddit ]'

describe("the bridge's public view", () => {
    it('leaves a comment reddit removed as others see it, though monitoring knows it was removed', () => {
        const comment = { kind: 't1', data: { name: 't1_r', author: 'someone', author_fullname: 't2_abc', body: BY_REDDIT } }
        toPublicView({ kind: 'Listing', data: { children: [comment] } }, { knownRemoved: new Set(['t1_r']), me: '', verifiedLive: new Set() })
        expect(comment.data).toMatchObject({ body: BY_REDDIT, author: 'someone', author_fullname: 't2_abc' })
    })
})
