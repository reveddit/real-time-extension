import '../mocks/chrome-api.js'

import { describe, it, expect, vi } from 'vitest'
import { __resetStorage } from '../mocks/webextension-polyfill.js'
import {
    getCandidateAuthors,
    extractCommentTree_fromJSON,
    commentFullnameFromPermalink,
    RateLimiter,
    monitoringBackoffGate,
    scanDelayMs,
} from '../../src/src/restore.ts'

// Helper to build a CommentTreeNode
function node(id, author, parent_id, created_utc = 0) {
    return {
        id,
        author,
        parent_id,
        body: `comment by ${author}`,
        created_utc,
        link_id: 't3_post1',
        children: [],
    }
}

// Helper to build a tree map and link children
function buildTreeMap(nodes) {
    const map = new Map()
    for (const n of nodes) {
        map.set(n.id, { ...n, children: [] })
    }
    for (const n of map.values()) {
        const parent = map.get(n.parent_id)
        if (parent) parent.children.push(n)
    }
    return map
}

describe('getCandidateAuthors', () => {
    it('returns grandparent first, then grandchild, then OP', () => {
        const nodes = [
            node('t1_gp', 'grandparent_user', 't3_post1', 100),
            node('t1_p', 'parent_user', 't1_gp', 200),
            node('t1_target', '[removed]', 't1_p', 300),
            node('t1_child', 'child_user', 't1_target', 400),
            node('t1_gc', 'grandchild_user', 't1_child', 500),
        ]
        const map = buildTreeMap(nodes)
        const result = getCandidateAuthors('t1_target', map, 'op_user')

        expect(result[0]).toBe('grandparent_user')
        expect(result[1]).toBe('grandchild_user')
        expect(result[2]).toBe('op_user')
    })

    it('puts parent last in tree traversal', () => {
        const nodes = [
            node('t1_gp', 'grandparent_user', 't3_post1', 100),
            node('t1_p', 'parent_user', 't1_gp', 200),
            node('t1_target', '[removed]', 't1_p', 300),
        ]
        const map = buildTreeMap(nodes)
        const result = getCandidateAuthors('t1_target', map, 'op_user')

        expect(result.indexOf('parent_user')).toBeGreaterThan(result.indexOf('grandparent_user'))
        expect(result.indexOf('parent_user')).toBeGreaterThan(result.indexOf('op_user'))
    })

    it('skips invalid authors', () => {
        const nodes = [
            node('t1_gp', '[deleted]', 't3_post1', 100),
            node('t1_p', 'AutoModerator', 't1_gp', 200),
            node('t1_target', '[removed]', 't1_p', 300),
            node('t1_child', '', 't1_target', 400),
        ]
        const map = buildTreeMap(nodes)
        const result = getCandidateAuthors('t1_target', map, '')

        expect(result).not.toContain('[deleted]')
        expect(result).not.toContain('AutoModerator')
        expect(result).not.toContain('')
    })

    it('never repeats authors', () => {
        const nodes = [
            node('t1_gp', 'same_user', 't3_post1', 100),
            node('t1_p', 'same_user', 't1_gp', 200),
            node('t1_target', '[removed]', 't1_p', 300),
            node('t1_child', 'same_user', 't1_target', 400),
            node('t1_gc', 'same_user', 't1_child', 500),
        ]
        const map = buildTreeMap(nodes)
        const result = getCandidateAuthors('t1_target', map, 'same_user')

        const unique = new Set(result)
        expect(result.length).toBe(unique.size)
        expect(result.filter(a => a === 'same_user').length).toBe(1)
    })

    it('includes siblings', () => {
        const nodes = [
            node('t1_p', 'parent_user', 't3_post1', 100),
            node('t1_target', '[removed]', 't1_p', 200),
            node('t1_sibling', 'sibling_user', 't1_p', 250),
        ]
        const map = buildTreeMap(nodes)
        const result = getCandidateAuthors('t1_target', map, 'op_user')

        expect(result).toContain('sibling_user')
    })

    it('fans out by timestamp after tree traversal', () => {
        const nodes = [
            node('t1_far_before', 'far_before_user', 't3_post1', 10),
            node('t1_near_before', 'near_before_user', 't3_post1', 290),
            node('t1_target', '[removed]', 't3_post1', 300),
            node('t1_near_after', 'near_after_user', 't3_post1', 310),
            node('t1_far_after', 'far_after_user', 't3_post1', 1000),
        ]
        const map = buildTreeMap(nodes)
        const result = getCandidateAuthors('t1_target', map, 'op_user')

        const nearBeforeIdx = result.indexOf('near_before_user')
        const nearAfterIdx = result.indexOf('near_after_user')
        const farBeforeIdx = result.indexOf('far_before_user')
        const farAfterIdx = result.indexOf('far_after_user')

        // Near should come before far in timestamp ordering
        expect(nearBeforeIdx).toBeLessThan(farBeforeIdx)
        expect(nearAfterIdx).toBeLessThan(farAfterIdx)
    })

    it('respects maxAuthors limit', () => {
        const nodes = []
        for (let i = 0; i < 30; i++) {
            nodes.push(node(`t1_c${i}`, `user${i}`, 't3_post1', i * 100))
        }
        // Make t1_c15 the target
        nodes[15] = node('t1_c15', '[removed]', 't3_post1', 1500)
        const map = buildTreeMap(nodes)
        const result = getCandidateAuthors('t1_c15', map, 'op_user', 5)

        expect(result.length).toBeLessThanOrEqual(5)
    })

    it('handles target with no tree context', () => {
        const nodes = [
            node('t1_target', '[removed]', 't3_post1', 300),
        ]
        const map = buildTreeMap(nodes)
        const result = getCandidateAuthors('t1_target', map, '')

        expect(result).toEqual([])
    })

    it('handles deep ancestor/descendant pairs', () => {
        // Build a chain: ggp -> gp -> p -> target -> child -> gc -> ggc
        const nodes = [
            node('t1_ggp', 'ggp_user', 't3_post1', 50),
            node('t1_gp', 'gp_user', 't1_ggp', 100),
            node('t1_p', 'p_user', 't1_gp', 200),
            node('t1_target', '[removed]', 't1_p', 300),
            node('t1_child', 'child_user', 't1_target', 400),
            node('t1_gc', 'gc_user', 't1_child', 500),
            node('t1_ggc', 'ggc_user', 't1_gc', 600),
        ]
        const map = buildTreeMap(nodes)
        const result = getCandidateAuthors('t1_target', map, 'op_user')

        // Order: gp(2up), gc(2down), OP, ggp(3up)+ggc(3down), p(1up=last tree)
        expect(result[0]).toBe('gp_user')
        expect(result[1]).toBe('gc_user')
        expect(result[2]).toBe('op_user')
        expect(result[3]).toBe('ggp_user')
        expect(result[4]).toBe('ggc_user')
        // parent_user should come after all deeper ancestor/descendant pairs
        expect(result.indexOf('p_user')).toBeGreaterThan(result.indexOf('ggp_user'))
    })
})

describe('extractCommentTree_fromJSON', () => {
    it('parses standard Reddit thread JSON', () => {
        const jsonData = [
            { data: { children: [{ data: { author: 'poster', name: 't3_post1' } }] } },
            {
                data: {
                    children: [
                        {
                            kind: 't1',
                            data: {
                                name: 't1_a',
                                author: 'user_a',
                                parent_id: 't3_post1',
                                body: 'hello',
                                created_utc: 1000,
                                link_id: 't3_post1',
                                replies: {
                                    data: {
                                        children: [
                                            {
                                                kind: 't1',
                                                data: {
                                                    name: 't1_b',
                                                    author: 'user_b',
                                                    parent_id: 't1_a',
                                                    body: 'reply',
                                                    created_utc: 2000,
                                                    link_id: 't3_post1',
                                                    replies: '',
                                                },
                                            },
                                        ],
                                    },
                                },
                            },
                        },
                    ],
                },
            },
        ]

        const { map, postAuthor } = extractCommentTree_fromJSON(jsonData)

        expect(postAuthor).toBe('poster')
        expect(map.size).toBe(2)
        expect(map.get('t1_a').author).toBe('user_a')
        expect(map.get('t1_b').author).toBe('user_b')
        expect(map.get('t1_a').children).toHaveLength(1)
        expect(map.get('t1_a').children[0].id).toBe('t1_b')
    })

    it('skips non-comment items (kind !== t1)', () => {
        const jsonData = [
            { data: { children: [{ data: { author: 'poster' } }] } },
            {
                data: {
                    children: [
                        { kind: 'more', data: { name: 't1_more', children: ['id1'] } },
                        { kind: 't1', data: { name: 't1_real', author: 'user', parent_id: 't3_p', body: 'hi', created_utc: 1, link_id: 't3_p' } },
                    ],
                },
            },
        ]

        const { map } = extractCommentTree_fromJSON(jsonData)
        expect(map.size).toBe(1)
        expect(map.has('t1_real')).toBe(true)
    })

    it('handles empty comment listing', () => {
        const jsonData = [
            { data: { children: [{ data: { author: 'poster' } }] } },
            { data: { children: [] } },
        ]

        const { map, postAuthor } = extractCommentTree_fromJSON(jsonData)
        expect(map.size).toBe(0)
        expect(postAuthor).toBe('poster')
    })
})

describe('commentFullnameFromPermalink', () => {
    it('extracts t1_ fullname from a comment permalink', () => {
        expect(
            commentFullnameFromPermalink(
                '/r/CantSayAnything/comments/1t8z25a/write_any_comment_here_20260510/om7qgnl/',
            ),
        ).toBe('t1_om7qgnl')
    })

    it('works without a trailing slash', () => {
        expect(
            commentFullnameFromPermalink('/r/sub/comments/abc123/some_slug/def456'),
        ).toBe('t1_def456')
    })

    it('returns empty string for a post permalink (no comment id)', () => {
        expect(commentFullnameFromPermalink('/r/sub/comments/abc123/some_slug/')).toBe('')
    })

    it('returns empty string for null/empty input', () => {
        expect(commentFullnameFromPermalink(null)).toBe('')
        expect(commentFullnameFromPermalink('')).toBe('')
    })
})

describe('RateLimiter', () => {
    it('executes functions', async () => {
        const limiter = new RateLimiter(10)
        const result = await limiter.schedule(() => Promise.resolve(42))
        expect(result).toBe(42)
    })

    it('can be cancelled', async () => {
        const limiter = new RateLimiter(10)
        limiter.cancel()
        expect(limiter.isCancelled()).toBe(true)
        await expect(limiter.schedule(() => Promise.resolve())).rejects.toThrow('Cancelled')
    })

    it('propagates errors from scheduled function', async () => {
        const limiter = new RateLimiter(10)
        await expect(
            limiter.schedule(() => Promise.reject(new Error('test error')))
        ).rejects.toThrow('test error')
    })
})

describe('scans defer to monitoring rate-limit state', () => {
    it('monitoringBackoffGate declines the scan while monitoring backoff is active', async () => {
        __resetStorage({}, { rate_limit_until: Date.now() + 120000 })
        const onProgress = vi.fn()
        expect(await monitoringBackoffGate(onProgress)).toBe(false)
        const p = onProgress.mock.calls[0][0]
        expect(p.status).toBe('rate_limited')
        expect(p.message).toContain('monitoring is paused too')
    })

    it('monitoringBackoffGate lets scans run when no backoff is active', async () => {
        __resetStorage({}, {})
        const onProgress = vi.fn()
        expect(await monitoringBackoffGate(onProgress)).toBe(true)
        expect(onProgress).not.toHaveBeenCalled()
    })

    it('scanDelayMs halves scan speed within the recent-429 window and not after', async () => {
        __resetStorage({}, { rate_limit_last_hit: Date.now() - 1000 })
        expect(await scanDelayMs()).toBe(3000)
        __resetStorage({}, { rate_limit_last_hit: Date.now() - 61 * 60 * 1000 })
        expect(await scanDelayMs()).toBe(1500)
        __resetStorage({}, {})
        expect(await scanDelayMs()).toBe(1500)
    })
})
