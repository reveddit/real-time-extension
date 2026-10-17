// Bridge URL validation and budget: the bridge is a closed allowlist of public
// reddit JSON endpoints, never a URL proxy, and its window budget halves for
// an hour after a 429 (mirroring computeAbsentVerifyBudget).

// Install chrome global BEFORE any source import
import '../mocks/chrome-api.js'

import { describe, it, expect } from 'vitest'

import { validateBridgeUrl, computeBridgeBudget, toPublicView } from '../../src/src/bridge.ts'
import { RECENT_RATE_LIMIT_WINDOW_MS } from '../../src/src/requests.ts'

describe('validateBridgeUrl', () => {
    it('accepts the endpoints the website uses', () => {
        for (const url of [
            'https://www.reddit.com/api/info.json?id=t3_abc,t1_def&raw_json=1',
            'https://www.reddit.com/user/spez/comments.json?limit=100&sort=new',
            'https://www.reddit.com/user/spez/.json?sort=new&limit=100&t=all', // the user page's overview
            'https://www.reddit.com/user/spez/about/.json',
            'https://www.reddit.com/user/spez/moderated_subreddits/.json',
            'https://www.reddit.com/api/user_data_by_account_ids.json?ids=t2_abc',
            'https://www.reddit.com/api/username_available.json?user=spez',
            'https://www.reddit.com/r/CantSayAnything/new.json?limit=100',
            'https://www.reddit.com/r/CantSayAnything/about/.json',
            'https://www.reddit.com/r/sub/about/log.json?feed=abc&user=publicmodlogs',
            'https://www.reddit.com/comments/abc123.json?limit=500',
            'https://www.reddit.com/r/sub/comments/abc123.json?sort=old',
            'https://www.reddit.com/search.json?q=url:x',
        ]) {
            expect(validateBridgeUrl(url), url).toBeTruthy()
        }
    })
    it('normalizes the /.json form and strips jsonp', () => {
        expect(validateBridgeUrl('https://www.reddit.com/user/spez/about/.json?jsonp=cb_1&raw_json=1')).toBe(
            'https://www.reddit.com/user/spez/about.json?raw_json=1',
        )
    })
    it('refuses other hosts, protocols, and paths', () => {
        for (const url of [
            'https://oauth.reddit.com/api/info.json?id=t3_abc', // page must rewrite first
            'https://old.reddit.com/api/info.json?id=t3_abc',
            'http://www.reddit.com/api/info.json?id=t3_abc',
            'https://www.reddit.com.evil.com/api/info.json',
            'https://www.reddit.com/api/v1/access_token',
            'https://www.reddit.com/api/submit.json',
            'https://www.reddit.com/user/spez/comments', // no .json
            'https://example.com/api/info.json',
            'not a url',
        ]) {
            expect(validateBridgeUrl(url), url).toBeNull()
        }
    })
})

describe('computeBridgeBudget', () => {
    it('halves the window budget after a recent 429', () => {
        const normal = computeBridgeBudget(null)
        expect(computeBridgeBudget(RECENT_RATE_LIMIT_WINDOW_MS + 1)).toBe(normal)
        expect(computeBridgeBudget(RECENT_RATE_LIMIT_WINDOW_MS - 1)).toBe(Math.floor(normal / 2))
    })
})

// Bridge fetches carry the user's reddit login, and reddit shows authors their
// own removed items intact. toPublicView marks the ones monitoring knows were
// removed, in the form the website reads.
describe('toPublicView', () => {
    const comment = (name: string, body: string, author = 'someone') => ({
        kind: 't1',
        data: { name, body, author, replies: '' as any },
    })
    const post = (name: string, extra: Record<string, any> = {}) => ({
        kind: 't3',
        data: { name, author: 'someone', is_self: true, selftext: 'text', is_robot_indexable: true, ...extra },
    })
    const listing = (children: any[]) => ({ kind: 'Listing', data: { children } })

    it('marks known-removed comments removed wherever they sit in a thread', () => {
        const reply = comment('t1_reply', 'my reply')
        const top = comment('t1_top', 'my comment')
        top.data.replies = listing([reply])
        const other = comment('t1_other', 'their comment')
        const thread = [listing([post('t3_post')]), listing([top, other])]
        toPublicView(thread, new Set(['t1_top', 't1_reply']))
        expect(top.data).toMatchObject({ body: '[removed]', author: '[deleted]' })
        expect(reply.data).toMatchObject({ body: '[removed]', author: '[deleted]' })
        expect(other.data).toMatchObject({ body: 'their comment', author: 'someone' })
        expect(thread[0].data.children[0].data.is_robot_indexable).toBe(true)
    })
    it('marks known-removed posts the way the public view shows them', () => {
        const self = post('t3_self')
        const link = post('t3_link', { is_self: false, selftext: '' })
        toPublicView(listing([self, link]), new Set(['t3_self', 't3_link']))
        expect(self.data).toMatchObject({ is_robot_indexable: false, selftext: '[removed]', author: 'someone' })
        expect(link.data).toMatchObject({ is_robot_indexable: false, selftext: '' })
    })
    it('leaves items their authors deleted as they are', () => {
        const gone = comment('t1_gone', '[deleted]', '[deleted]')
        const gonePost = post('t3_gone', { author: '[deleted]', selftext: '[deleted]', is_robot_indexable: false })
        toPublicView(listing([gone, gonePost]), new Set(['t1_gone', 't3_gone']))
        expect(gone.data).toMatchObject({ body: '[deleted]', author: '[deleted]' })
        expect(gonePost.data.selftext).toBe('[deleted]')
    })
    it('marks what a moderator sees as removed, and leaves approved items alone', () => {
        // shapes seen through a moderator login on r/pushshift
        const byMod = comment('t1_mod', 'Unrelated question')
        Object.assign(byMod.data, { removed: true, banned_by: 'Watchful1', spam: false })
        const bySpamFilter = comment('t1_spam', 'buy now')
        Object.assign(bySpamFilter.data, { removed: false, banned_by: true, spam: true })
        const modPost = post('t3_mod', { removed: true, banned_by: 'Watchful1', removed_by_category: 'moderator' })
        const approved = comment('t1_ok', 'fine')
        Object.assign(approved.data, { removed: false, banned_by: null, spam: false, approved_by: 'Watchful1' })
        toPublicView(listing([byMod, bySpamFilter, modPost, approved]), new Set())
        expect(byMod.data).toMatchObject({ body: '[removed]', author: '[deleted]' })
        expect(bySpamFilter.data).toMatchObject({ body: '[removed]', author: '[deleted]' })
        expect(modPost.data).toMatchObject({ selftext: '[removed]', is_robot_indexable: false })
        expect(approved.data).toMatchObject({ body: 'fine', author: 'someone' })
    })
    it('covers morechildren results', () => {
        const more = { json: { errors: [], data: { things: [comment('t1_more', 'loaded later')] } } }
        toPublicView(more, new Set(['t1_more']))
        expect(more.json.data.things[0].data).toMatchObject({ body: '[removed]', author: '[deleted]' })
    })
})
