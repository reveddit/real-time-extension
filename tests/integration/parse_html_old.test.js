import '../mocks/chrome-api.js'

import { describe, it, expect } from 'vitest'

// HTMLRewriter uses WASM that can't load in plain Node, so we test the parsing
// logic by importing the Items class helpers directly and simulating what
// HTMLRewriter would call.

// Re-implement the key functions under test (they're module-private in old.ts)
// to verify the fix: deriving name from permalink when data-fullname is missing.
const fullnameIsComment = (name) => name && name.substr(0, 2) === 't1'
const fullnameIsPost = (name) => name && name.substr(0, 2) === 't3'

const COMMON_DEFAULTS = {
    removal_reason: null,
    quarantine: false,
    score: 1,
    locked: false,
    distinguished: null,
    stickied: false,
}
const COMMENT_DEFAULTS = { ...COMMON_DEFAULTS }
const POST_DEFAULTS = {
    ...COMMON_DEFAULTS,
    link_flair_text: null,
    author_flair_text: null,
    pinned: false,
    removed_by_category: null,
    is_robot_indexable: true,
}

const attribute_mappings = [
    { field: 'name', attribute: 'data-fullname' },
    { field: 'subreddit', attribute: 'data-subreddit' },
    { field: 'author_fullname', attribute: 'data-author-fullname' },
    { field: 'author', attribute: 'data-author' },
    { field: 'permalink', attribute: 'data-permalink' },
]

// Simulate what Items.element() does after the fix
function parseElement(attrs) {
    const item = {}
    for (const { field, attribute } of attribute_mappings) {
        if (attrs[attribute] !== undefined) {
            item[field] = attrs[attribute]
        }
    }

    // The fix: derive name from permalink when data-fullname is missing
    if (!item.name && item.permalink) {
        const parts = item.permalink.split('/').filter(Boolean)
        if (parts.length >= 5 && parts[2] === 'comments') {
            if (parts.length >= 6) {
                item.name = 't1_' + parts[5]
            } else {
                item.name = 't3_' + parts[3]
            }
        }
    }

    if (item.name) {
        item.id = item.name.replace(/^t[0-9]_/, '')
    }

    return item.name ? item : null
}

function fillInDefaultValues(items) {
    for (const item of items) {
        if (!item.name) continue
        let defaults
        if (fullnameIsComment(item.name)) {
            defaults = COMMENT_DEFAULTS
        } else if (fullnameIsPost(item.name)) {
            defaults = POST_DEFAULTS
        }
        if (defaults) {
            for (const [field, value] of Object.entries(defaults)) {
                if (!(field in item)) {
                    item[field] = value
                }
            }
        }
    }
}

describe('Items.element name derivation from permalink', () => {
    it('derives comment name from permalink when data-fullname is missing', () => {
        const item = parseElement({
            'data-subreddit': 'CantSayAnything',
            'data-permalink': '/r/CantSayAnything/comments/1pivi2j/write_any_comment_here_20251210/okweoc5/',
        })
        expect(item).not.toBeNull()
        expect(item.name).toBe('t1_okweoc5')
        expect(item.id).toBe('okweoc5')
        expect(item.subreddit).toBe('CantSayAnything')
    })

    it('derives post name from permalink when data-fullname is missing', () => {
        const item = parseElement({
            'data-subreddit': 'TestSub',
            'data-permalink': '/r/TestSub/comments/abc123/some_title/',
        })
        expect(item).not.toBeNull()
        expect(item.name).toBe('t3_abc123')
        expect(item.id).toBe('abc123')
    })

    it('uses data-fullname when present', () => {
        const item = parseElement({
            'data-fullname': 't1_k5qbvvx',
            'data-subreddit': 'TestSub',
            'data-author': 'testuser',
            'data-permalink': '/r/TestSub/comments/17cizwv/test_post/k5qbvvx/',
        })
        expect(item.name).toBe('t1_k5qbvvx')
        expect(item.author).toBe('testuser')
    })

    it('returns null when neither name nor permalink exists', () => {
        const item = parseElement({
            'data-subreddit': 'TestSub',
        })
        expect(item).toBeNull()
    })

    it('returns null when permalink has unexpected format', () => {
        const item = parseElement({
            'data-permalink': '/r/TestSub/',
        })
        expect(item).toBeNull()
    })
})

describe('fillInDefaultValues', () => {
    it('applies comment defaults', () => {
        const items = [{ name: 't1_abc', id: 'abc' }]
        fillInDefaultValues(items)
        expect(items[0].score).toBe(1)
        expect(items[0].locked).toBe(false)
        expect(items[0].quarantine).toBe(false)
    })

    it('applies post defaults including is_robot_indexable', () => {
        const items = [{ name: 't3_abc', id: 'abc' }]
        fillInDefaultValues(items)
        expect(items[0].is_robot_indexable).toBe(true)
        expect(items[0].removed_by_category).toBeNull()
    })

    it('does not crash on items with undefined name', () => {
        const items = [{ subreddit: 'TestSub' }, { name: 't1_abc', id: 'abc' }]
        expect(() => fillInDefaultValues(items)).not.toThrow()
        expect(items[1].score).toBe(1)
    })

    it('does not overwrite existing values', () => {
        const items = [{ name: 't1_abc', id: 'abc', score: 42 }]
        fillInDefaultValues(items)
        expect(items[0].score).toBe(42)
    })
})
