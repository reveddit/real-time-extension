// How monitoring reads one lookup result. Quarantined, NSFW and
// private-community items never show logged out, so the public-view
// comparison can't judge them: a removal already recorded must stay recorded
// instead of reading as approved, and a post's own author view still says
// when it was removed.

// Install chrome global BEFORE any source import
import '../mocks/chrome-api.js'

import { describe, it, expect } from 'vitest'
import { readLookupResult } from '../../src/src/monitoring.ts'

// The lookup's synthetic removed shape (requests.ts syntheticRemoved)
const synthetic = name => ({
    name,
    author: '[deleted]',
    body: '[removed]',
    is_robot_indexable: false,
    _public_view: true,
})
const liveComment = name => ({ name, author: 'me', body: 'text', _public_view: true })

describe('readLookupResult', () => {
    it('counts what nobody logged out can see as approved, but leaves a recorded removal as it is', () => {
        for (const flags of [{ over_18: true }, { quarantine: true }, { subreddit_type: 'private' }]) {
            const authItem = { name: 't1_a', ...flags }
            expect(readLookupResult(synthetic('t1_a'), authItem, false)).toBe('unchecked')
            expect(readLookupResult(synthetic('t1_a'), authItem, true)).toBe('skip')
        }
    })

    it("a post's own author view says it was removed, whoever else can see it", () => {
        const authItem = { name: 't3_p', over_18: true, removed_by_category: 'moderator' }
        expect(readLookupResult(synthetic('t3_p'), authItem, false)).toBe('removed')
        expect(readLookupResult(synthetic('t3_p'), authItem, true)).toBe('removed')
    })

    it('is_robot_indexable alone does not make an NSFW post removed', () => {
        const authItem = { name: 't3_p', over_18: true, is_robot_indexable: false }
        expect(readLookupResult(synthetic('t3_p'), authItem, false)).toBe('unchecked')
        expect(readLookupResult(synthetic('t3_p'), authItem, true)).toBe('skip')
    })

    it('a comment has no author-side removal signal', () => {
        const authItem = { name: 't1_a', over_18: true, removed_by_category: 'moderator' }
        expect(readLookupResult(synthetic('t1_a'), authItem, true)).toBe('skip')
    })

    it('reads publicly visible results by their shape', () => {
        const authItem = { name: 't1_a', subreddit_type: 'restricted' }
        expect(readLookupResult(synthetic('t1_a'), authItem, false)).toBe('removed')
        expect(readLookupResult(liveComment('t1_a'), authItem, true)).toBe('approved')
    })

    it('reads results the legacy paths returned as they are, since those can see this content', () => {
        const legacy = { ...synthetic('t1_a'), _public_view: undefined }
        expect(readLookupResult(legacy, { name: 't1_a', over_18: true }, false)).toBe('removed')
        // followed items have no author view
        expect(readLookupResult(synthetic('t1_a'), null, false)).toBe('removed')
    })
})
