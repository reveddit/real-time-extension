// Integration tests for common.js utility functions.
// These test pure logic with no browser dependency.

// Install chrome global BEFORE any source import that references __BUILT_FOR__
import '../mocks/chrome-api.js'

import { describe, it, expect, vi } from 'vitest'
import browserMock, { __resetStorage } from '../mocks/webextension-polyfill.js'
import {
    getFullIDsFromPath,
    getFullIDsFromURL,
    goToOptions,
    showsWhatsNew,
    reformatRedditText,
    isRemovedItem,
    isRemovedComment,
    isRemovedPost,
    isRemovedByCategory,
    isUserDeletedComment,
    isUserDeletedPost,
    isComment,
    trimDict_by_numberValuedAttribute,
    getPrettyTimeLength,
    ItemForStorage,
    ChangeForStorage,
    LocalStorageItem,
} from '../../src/src/common.ts'
import { getTestNotificationMessage, updateBadgeUnseenCount, getObjectNamesForThing } from '../../src/src/storage.ts'

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

    it('reads a post link that ends at its id, or has only a query or fragment after it', () => {
        const post = ['t3_abc123', undefined, undefined, 'pics']
        expect(getFullIDsFromPath('/r/pics/comments/abc123')).toEqual(post)
        expect(getFullIDsFromPath('/r/pics/comments/abc123?utm_source=share')).toEqual(post)
        expect(getFullIDsFromPath('/r/pics/comments/abc123#top')).toEqual(post)
        expect(getFullIDsFromPath('/r/pics/comments/abc123.json')).toEqual(post)
        expect(getFullIDsFromPath('/user/bob/comments/abc123')).toEqual(['t3_abc123', undefined, 'bob', undefined])
    })

    it('reads a post link with a slash after its id as before', () => {
        const post = ['t3_abc123', undefined, undefined, 'pics']
        expect(getFullIDsFromPath('/r/pics/comments/abc123/')).toEqual(post)
        expect(getFullIDsFromPath('/r/pics/comments/abc123/?utm_source=share')).toEqual(post)
        expect(getFullIDsFromPath('/r/pics/comments/abc123/title/?context=3')).toEqual(post)
        expect(getFullIDsFromPath('/r/pics/comments/abc123/comment/def456/?context=3')[1]).toBe('t1_def456')
    })

    it('finds no post in a profile or subreddit comments tab, which has no id', () => {
        const profile = [undefined, undefined, 'bob', undefined]
        expect(getFullIDsFromPath('/user/bob/comments')).toEqual(profile)
        expect(getFullIDsFromPath('/user/bob/comments/')).toEqual(profile)
        expect(getFullIDsFromPath('/user/bob/comments/?sort=new')).toEqual(profile)
        expect(getFullIDsFromPath('/user/bob/comments/.rss?sort=new')).toEqual(profile)
        expect(getFullIDsFromPath('/r/pics/comments/')).toEqual([undefined, undefined, undefined, undefined])
        expect(getFullIDsFromPath('/r/pics/comments/?sort=new')).toEqual([undefined, undefined, undefined, undefined])
    })
})

describe('goToOptions', () => {
    it("opens the options page from a service worker, which has no window, so a message's answer still goes out", () => {
        const opened = vi.fn()
        vi.stubGlobal('chrome', { ...chrome, runtime: { ...chrome.runtime, openOptionsPage: opened } })
        expect(typeof window).toBe('undefined')
        goToOptions()
        expect(opened).toHaveBeenCalledTimes(1)
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

    it("a post's removed_by_category counts unless it says the author deleted it", () => {
        expect(isRemovedByCategory({ removed_by_category: 'moderator' })).toBe(true)
        expect(isRemovedByCategory({ removed_by_category: 'deleted' })).toBe(false)
        expect(isRemovedByCategory({ removed_by_category: null })).toBe(false)
        expect(isRemovedByCategory({})).toBe(false)
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

// A moderator's logged-in view of a removal in their subreddit keeps the text
// and sets the moderation flags (shape verified on r/pushshift 2026-10-17)
describe("removal detection in a moderator's view", () => {
    const modView = (name, flags) => ({
        name,
        author: 'someone',
        body: 'still readable',
        title: 'still readable',
        created_utc: 1,
        is_robot_indexable: true,
        removal_reason: null,
        approved: false,
        removed: false,
        spam: false,
        banned_by: null,
        ...flags,
    })

    it('reads removed, spam or banned_by as removed, for comments and posts', () => {
        for (const name of ['t1_c1', 't3_p1']) {
            expect(isRemovedItem(modView(name, { removed: true, banned_by: 'a_mod' }))).toBe(true)
            expect(isRemovedItem(modView(name, { removed: true }))).toBe(true)
            expect(isRemovedItem(modView(name, { spam: true, banned_by: true }))).toBe(true)
            expect(isRemovedItem(modView(name, { banned_by: 'AutoModerator' }))).toBe(true)
        }
    })

    it('leaves approved and untouched items live', () => {
        for (const name of ['t1_c1', 't3_p1']) {
            expect(isRemovedItem(modView(name, {}))).toBe(false)
            expect(isRemovedItem(modView(name, { approved: true, approved_by: 'a_mod' }))).toBe(false)
        }
        // other views carry no flags at all
        expect(isRemovedItem({ name: 't1_c2', author: 'someone', body: 'hi', created_utc: 1 })).toBe(false)
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
        expect(item.c).toBe(1000)
        expect(item.u).toBe(true)
    })

    it('stores post_id for comments', () => {
        const item = new ItemForStorage(1000, true, 't3_abc')
        expect(item.p).toBe('t3_abc')
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
        expect(item.getCount('n')).toBe(0)
        expect(item.getCount('r')).toBe(0)
        expect(item.getPostID()).toBe('t3_post1')
    })

    it('creates from a post item', () => {
        const item = new LocalStorageItem({
            item: { name: 't3_xyz', title: 'My Post Title', created_utc: 3000 },
            observed_utc: 4000,
        })
        expect(item.getText()).toBe('My Post Title')
    })

    it('counts each of its counts apart', () => {
        const item = new LocalStorageItem({
            item: { name: 't1_x', body: 'test', created_utc: 1, link_id: 't3_p' },
            observed_utc: 2,
        })
        for (const count of ['n', 'r', 'ln', 'lr']) {
            expect(item.getCount(count)).toBe(0)
            expect(item.incrementCount(count)).toBe(1)
            expect(item.incrementCount(count)).toBe(2)
            expect(item.getCount(count)).toBe(2)
            item.resetCount(count)
            expect(item.getCount(count)).toBe(0)
        }
    })

    it('reconstructs from serialized object', () => {
        const item = new LocalStorageItem({
            object: { t: 'saved text', o: 100, c: 50, n: 5, r: 2, ln: 1, lr: 7, p: 't3_post' },
        })
        expect(item.getText()).toBe('saved text')
        expect(item.getCount('n')).toBe(5)
        expect(item.getCount('r')).toBe(2)
        expect(item.getCount('ln')).toBe(1)
        expect(item.getCount('lr')).toBe(7)
        expect(item.getPostID()).toBe('t3_post')
    })

    it('adds nothing to a record lock tracking has not counted', () => {
        const item = new LocalStorageItem({ object: { t: 'saved text', o: 100, c: 50, n: 5, r: 2 } })
        expect(JSON.parse(JSON.stringify(item))).toEqual({ t: 'saved text', o: 100, c: 50, n: 5, r: 2 })
    })
})

describe('getTestNotificationMessage', () => {
    const base = 'If you see this, notifications are working.'

    it('plain message when all notification types are on', () => {
        const msg = getTestNotificationMessage({
            removal_status: { track: true, notify: true },
            lock_status: { track: true, notify: true },
        })
        expect(msg).toBe(base)
    })

    it('defaults to on when options are missing', () => {
        expect(getTestNotificationMessage({})).toBe(base)
    })

    it('notes a single disabled type', () => {
        const msg = getTestNotificationMessage({
            removal_status: { track: true, notify: false },
            lock_status: { track: true, notify: true },
        })
        expect(msg).toContain('notifications are working')
        expect(msg).toContain('removed content')
        expect(msg).not.toContain('locked')
    })

    it('treats untracked ("off") the same as notify-off', () => {
        const msg = getTestNotificationMessage({
            removal_status: { track: true, notify: true },
            lock_status: { track: false, notify: false },
        })
        expect(msg).toContain('locked content')
        expect(msg).not.toContain('removed content')
    })

    it('notes both disabled types', () => {
        const msg = getTestNotificationMessage({
            removal_status: { track: true, notify: false },
            lock_status: { track: false },
        })
        expect(msg).toContain('removed and locked content')
    })
})

describe('showsWhatsNew', () => {
    it('shows on an update from an older generation', () => {
        expect(showsWhatsNew('0.0.4.9', '0.0.5.31')).toBe(true)
    })
    it("doesn't show within a generation", () => {
        expect(showsWhatsNew('0.0.5.30', '0.0.5.31')).toBe(false)
    })
    it("doesn't show when there's no earlier version", () => {
        expect(showsWhatsNew(undefined, '0.0.5.31')).toBe(false)
    })
})

describe('updateBadgeUnseenCount', () => {
    it("asks the background from a content script on Firefox, where a promise-style chrome.runtime.sendMessage returns undefined", () => {
        vi.stubGlobal('location', { protocol: 'https:' })
        vi.spyOn(chrome.runtime, 'sendMessage').mockReturnValue(undefined)
        const send = vi.spyOn(browserMock.runtime, 'sendMessage')
        updateBadgeUnseenCount()
        expect(send).toHaveBeenCalledWith({ action: 'update-badge' })
    })
    it('totals unseen items across an account and followed items', async () => {
        const USER = 'someuser'
        const keys = getObjectNamesForThing(USER, true)
        const other = getObjectNamesForThing('other', false)
        __resetStorage({
            options: {},
            user_subscriptions: { [USER]: true },
            other_subscriptions: {},
            [keys.removed]: { t1_a: { u: true }, t1_b: { u: false } },
            [other.removed]: { t1_c: { u: true } },
        })
        vi.stubGlobal('location', { protocol: 'chrome-extension:' })
        const badge = vi.spyOn(chrome.action, 'setBadgeText')
        updateBadgeUnseenCount()
        await vi.waitFor(() => expect(badge).toHaveBeenCalled())
        expect(badge.mock.calls.at(-1)[0]).toEqual({ text: '2' })
    })
})
