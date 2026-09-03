// Comment-tree extraction from a fetched legacy (old-markup) thread page,
// the replacement for the thread .json fetch that is 403 logged out.
import '../mocks/chrome-api.js'
import { describe, it, expect } from 'vitest'
import { DOMParser } from 'linkedom'
import { extractCommentTree_fromHTML } from '../../src/src/restore'

const parse = html => new DOMParser().parseFromString(html, 'text/html')

const thing = (fullname, author, body, children = '') =>
    `<div class="thing comment" data-fullname="${fullname}" data-author="${author}" ` +
    `data-permalink="/r/sub/comments/p0stid/slug/${fullname.slice(3)}/">` +
    `<div class="entry"><div class="usertext-body"><div class="md">${body}</div></div>` +
    `<p class="tagline"><time datetime="2026-09-03T12:00:00+00:00"></time></p></div>` +
    `<div class="child">${children}</div></div>`

const page =
    `<div id="siteTable"><div class="thing link" data-fullname="t3_p0stid" data-author="op_user" ` +
    `data-comments-count="42" data-timestamp="1756900800000"></div></div>` +
    `<div class="commentarea">` +
    thing('t1_aaa', 'alice', 'top level', thing('t1_bbb', 'bob', 'reply to alice')) +
    thing('t1_ccc', '[deleted]', '[removed]') +
    `</div>`

describe('extractCommentTree_fromHTML', () => {
    it('builds parent links and reads the post author from the link thing', () => {
        const { map, postAuthor, postNumComments, postCreatedUtc } = extractCommentTree_fromHTML(
            page,
            't3_p0stid',
            parse,
        )
        expect(postAuthor).toBe('op_user')
        expect(postNumComments).toBe(42)
        expect(postCreatedUtc).toBe(1756900800)
        expect([...map.keys()].sort()).toEqual(['t1_aaa', 't1_bbb', 't1_ccc'])
        expect(map.get('t1_aaa').parent_id).toBe('t3_p0stid')
        expect(map.get('t1_bbb').parent_id).toBe('t1_aaa')
        expect(map.get('t1_aaa').children.map(c => c.id)).toEqual(['t1_bbb'])
        expect(map.get('t1_bbb').body).toBe('reply to alice')
        expect(map.get('t1_bbb').link_id).toBe('t3_p0stid')
        expect(map.get('t1_ccc').author).toBe('[deleted]')
    })

    it('throws on a page that is not a legacy thread (challenge or login page)', () => {
        expect(() => extractCommentTree_fromHTML('<html><body>js_challenge</body></html>', 't3_x', parse)).toThrow(
            /unreadable/,
        )
    })
})
