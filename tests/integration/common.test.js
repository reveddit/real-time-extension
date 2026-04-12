// Integration tests for common.js utility functions.
// These test pure logic with no browser dependency.

// Install chrome global BEFORE any source import that references __BUILT_FOR__
import '../mocks/chrome-api.js'

import { describe, it, expect } from 'vitest'
import {
    getFullIDsFromPath,
    getFullIDsFromURL,
    reformatRedditText,
    isRemovedComment,
    isRemovedPost,
    isUserDeletedComment,
    isUserDeletedPost,
    isComment,
    trimDict_by_numberValuedAttribute,
    getPrettyTimeLength,
    ItemForStorage,
    ChangeForStorage,
    LocalStorageItem,
} from '../../src/src/common.ts'

describe('getFullIDsFromPath', () => {
    it('extracts post ID from a subreddit post URL', () => {
        const [postID, commentID, user, subreddit] = getFullIDsFromPath('/r/politics/comments/abc123/some_title/')
        expect(postID).toBe('t3_abc123')
        expect(commentID).toBeUndefined()
        expect(user).toBeUndefined()
        expect(subreddit).toBe('politics')
    })

    it('extracts both post and comment IDs', () => {
        const [postID, commentID, user] = getFullIDsFromPath('/r/test/comments/abc123/title/def456')
        expect(postID).toBe('t3_abc123')
        expect(commentID).toBe('t1_def456')
    })

    it('extracts user from user page URL', () => {
        const [postID, commentID, user] = getFullIDsFromPath('/user/someuser/')
        expect(user).toBe('someuser')
        expect(postID).toBeUndefined()
        expect(commentID).toBeUndefined()
    })

    it('extracts user from /u/ URL', () => {
        const [, , user] = getFullIDsFromPath('/u/testuser')
        expect(user).toBe('testuser')
    })

    it('extracts user from /y/ URL', () => {
        const [, , user] = getFullIDsFromPath('/y/testuser')
        expect(user).toBe('testuser')
    })

    it('handles user comment page', () => {
        const [postID, commentID, user] = getFullIDsFromPath('/user/someuser/comments/abc123/title/def456')
        expect(user).toBe('someuser')
        expect(postID).toBe('t3_abc123')
        expect(commentID).toBe('t1_def456')
    })

    it('handles reveddit-style /v/ prefix', () => {
        const [postID, commentID, user, subreddit] = getFullIDsFromPath('/v/politics/comments/abc123/title/')
        expect(postID).toBe('t3_abc123')
        expect(subreddit).toBe('politics')
    })
})

describe('getFullIDsFromURL', () => {
    it('extracts IDs from full reddit URL', () => {
        const [postID] = getFullIDsFromURL('https://www.reddit.com/r/test/comments/abc123/title/')
        expect(postID).toBe('t3_abc123')
    })

    it('extracts IDs from reveddit URL', () => {
        const [postID] = getFullIDsFromURL('https://www.reveddit.com/r/test/comments/abc123/title/')
        expect(postID).toBe('t3_abc123')
    })
})

describe('reformatRedditText', () => {
    it('decodes HTML entities', () => {
        expect(reformatRedditText('hello &amp; world &gt; &lt;')).toBe('hello & world > <')
    })

    it('collapses horizontal whitespace but preserves newlines', () => {
        expect(reformatRedditText('hello   \n  world')).toBe('hello \n world')
        expect(reformatRedditText('a   b')).toBe('a b')
        expect(reformatRedditText('* item1\n* item2')).toBe('* item1\n* item2')
    })

    it('truncates at maxRedditContentLength', () => {
        const long = 'a'.repeat(10001)
        expect(reformatRedditText(long).length).toBe(10000)
    })
})

describe('removal detection', () => {
    it('detects removed comment by author and body', () => {
        expect(isRemovedComment({ author: '[removed]', body: '[removed]' })).toBe(true)
    })

    it('does not flag non-removed comment', () => {
        expect(isRemovedComment({ author: 'realuser', body: 'hello world' })).toBe(false)
    })

    it('detects removed post by is_robot_indexable', () => {
        expect(isRemovedPost({ is_robot_indexable: false })).toBe(true)
    })

    it('does not flag indexable post as removed', () => {
        expect(isRemovedPost({ is_robot_indexable: true })).toBe(false)
    })

    it('detects user-deleted comment', () => {
        expect(isUserDeletedComment({ author: '[deleted]', body: '[deleted]' })).toBe(true)
    })

    it('detects user-deleted post', () => {
        expect(isUserDeletedPost({ is_robot_indexable: false, author: '[deleted]' })).toBe(true)
    })

    it('does not flag removed-by-mod post as user-deleted', () => {
        expect(isUserDeletedPost({ is_robot_indexable: false, author: 'realuser' })).toBe(false)
    })
})

describe('isComment', () => {
    it('identifies t1_ as comment', () => {
        expect(isComment('t1_abc123')).toBe(true)
    })

    it('identifies t3_ as not comment', () => {
        expect(isComment('t3_abc123')).toBe(false)
    })
})

describe('trimDict_by_numberValuedAttribute', () => {
    it('trims dictionary to max size keeping highest values', () => {
        const dict = {
            a: { c: 100 },
            b: { c: 300 },
            c: { c: 200 },
        }
        const result = trimDict_by_numberValuedAttribute(dict, 2, 'c')
        expect(Object.keys(result)).toHaveLength(2)
        expect(result.b).toBeDefined()
        expect(result.c).toBeDefined()
        expect(result.a).toBeUndefined()
    })

    it('returns all items when under max', () => {
        const dict = { a: { c: 1 }, b: { c: 2 } }
        const result = trimDict_by_numberValuedAttribute(dict, 5, 'c')
        expect(Object.keys(result)).toHaveLength(2)
    })
})

describe('getPrettyTimeLength', () => {
    it('formats seconds', () => {
        expect(getPrettyTimeLength(30)).toBe('30 seconds')
    })

    it('formats minutes', () => {
        const result = getPrettyTimeLength(90)
        expect(result).toMatch(/1 minute/)
    })

    it('formats hours', () => {
        const result = getPrettyTimeLength(3600)
        expect(result).toMatch(/1 hour/)
    })

    it('formats days', () => {
        const result = getPrettyTimeLength(86400)
        expect(result).toMatch(/1 day/)
    })
})

describe('ItemForStorage', () => {
    it('stores created_utc and unseen flag', () => {
        const item = new ItemForStorage(1000, true)
        expect(item.getCreatedUTC()).toBe(1000)
        expect(item.getUnseen()).toBe(true)
    })

    it('reconstructs from serialized object', () => {
        const item = new ItemForStorage(null, null, null, { c: 2000, u: false })
        expect(item.getCreatedUTC()).toBe(2000)
        expect(item.getUnseen()).toBe(false)
    })

    it('stores post_id for comments', () => {
        const item = new ItemForStorage(1000, true, 't3_abc')
        expect(item.getPostID()).toBe('t3_abc')
    })
})

describe('ChangeForStorage', () => {
    it('stores change details', () => {
        const change = new ChangeForStorage({ id: 't1_x', observed_utc: 5000, change_type: 1 })
        expect(change.getID()).toBe('t1_x')
        expect(change.getObservedUTC()).toBe(5000)
        expect(change.getChangeType()).toBe('mod removed')
    })

    it('maps all change type labels', () => {
        expect(new ChangeForStorage({ change_type: 1 }).getChangeType()).toBe('mod removed')
        expect(new ChangeForStorage({ change_type: 2 }).getChangeType()).toBe('approved')
        expect(new ChangeForStorage({ change_type: 3 }).getChangeType()).toBe('locked')
        expect(new ChangeForStorage({ change_type: 4 }).getChangeType()).toBe('unlocked')
        expect(new ChangeForStorage({ change_type: 6 }).getChangeType()).toBe('user deleted')
    })

    it('reconstructs from serialized object', () => {
        const change = new ChangeForStorage({ object: { i: 't1_y', o: 6000, g: 2, n: 3 } })
        expect(change.getID()).toBe('t1_y')
        expect(change.getChangeType()).toBe('approved')
        expect(change.getSeenCount()).toBe(3)
    })
})

describe('LocalStorageItem', () => {
    it('creates from a comment item', () => {
        const item = new LocalStorageItem({
            item: { name: 't1_abc', body: 'hello &amp; world', created_utc: 1000, link_id: 't3_post1' },
            observed_utc: 2000,
        })
        expect(item.getText()).toBe('hello & world')
        expect(item.getCreatedUTC()).toBe(1000)
        expect(item.getObservedUTC()).toBe(2000)
        expect(item.getSeenCount()).toBe(0)
        expect(item.getRemovalCount()).toBe(0)
        expect(item.getPostID()).toBe('t3_post1')
    })

    it('creates from a post item', () => {
        const item = new LocalStorageItem({
            item: { name: 't3_xyz', title: 'My Post Title', created_utc: 3000 },
            observed_utc: 4000,
        })
        expect(item.getText()).toBe('My Post Title')
    })

    it('tracks seen count increments', () => {
        const item = new LocalStorageItem({
            item: { name: 't1_x', body: 'test', created_utc: 1, link_id: 't3_p' },
            observed_utc: 2,
        })
        expect(item.incrementSeenCount()).toBe(1)
        expect(item.incrementSeenCount()).toBe(2)
        expect(item.getSeenCount()).toBe(2)
        item.resetSeenCount()
        expect(item.getSeenCount()).toBe(0)
    })

    it('tracks removal count increments', () => {
        const item = new LocalStorageItem({
            item: { name: 't1_x', body: 'test', created_utc: 1, link_id: 't3_p' },
            observed_utc: 2,
        })
        expect(item.incrementRemovalCount()).toBe(1)
        expect(item.incrementRemovalCount()).toBe(2)
        item.resetRemovalCount()
        expect(item.getRemovalCount()).toBe(0)
    })

    it('reconstructs from serialized object', () => {
        const item = new LocalStorageItem({
            object: { t: 'saved text', o: 100, c: 50, n: 5, r: 2, p: 't3_post' },
        })
        expect(item.getText()).toBe('saved text')
        expect(item.getSeenCount()).toBe(5)
        expect(item.getRemovalCount()).toBe(2)
        expect(item.getPostID()).toBe('t3_post')
    })
})
