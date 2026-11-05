// Scans read reddit's feeds (restore.ts). A person's feed keeps the comments
// moderators removed, with their text, a thread's feed shows those with replies
// as [deleted], and a comment's feed names its parent. Shapes from 2026-11-04.

// Install chrome global BEFORE any source import
import '../mocks/chrome-api.js'

import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest'
import browserMock, { __resetStorage } from '../mocks/webextension-polyfill.js'
import { parseHTML, DOMParser } from 'linkedom'
import { setMarkupConfig } from '../../src/src/markup-config'
import { POST, NOW, entry, postEntry, feed, listing } from '../mocks/feeds.js'

const comment = (id, author, parent, inner = '<div slot="comment"><p>live words</p></div>') =>
    `<shreddit-comment thingid="${id}" author="${author}" ${parent ? `parentid="${parent}"` : ''} ` +
    `created="${NOW}"><details open>${inner}<div id="comment-children"></div></details></shreddit-comment>`

// alice and bob are on the page. t1_tomb is a removed comment kept for its reply
const PAGE =
    '<html><body><shreddit-post comment-count="6"></shreddit-post><shreddit-comment-tree><section>' +
    comment('t1_alice1', 'alice') +
    comment('t1_tomb', '[deleted]', 't1_alice1', '<p>Comment removed by moderator</p>') +
    comment('t1_bob1', 'bob', 't1_tomb') +
    '</section></shreddit-comment-tree></body></html>'

const THREAD_FEED = feed(
    postEntry(),
    entry('t1_alice1', 'alice', 'live words'),
    entry('t1_tomb', null, '[deleted]'),
    entry('t1_bob1', 'bob', 'live words'),
)

let pages
let asked
const answer = path => {
    asked.push(path)
    const page = pages[path]
    if (page === undefined) return { ok: false, status: 404, text: '' }
    return typeof page === 'string' ? { ok: true, status: 200, text: page } : page
}
const threadPath = '/r/sub/comments/post/.rss?limit=500'
const authorPath = name => `/user/${name}/comments/.rss?sort=new&limit=100`
const commentPath = id => `/comments/post/_/${id.slice(3)}/.rss?context=1`

// The lookups are spaced 1.5 s apart
const withTimers = async run => {
    vi.useFakeTimers()
    let done = false
    const running = run().finally(() => (done = true))
    for (let i = 0; i < 100 && !done; i++) await vi.advanceTimersByTimeAsync(2000)
    return running
}

let restore
const savedSendMessage = browserMock.runtime.sendMessage
beforeAll(async () => {
    globalThis.DOMParser = DOMParser
    restore = await import('../../src/src/restore.ts')
})
beforeEach(() => {
    __resetStorage()
    globalThis.document = parseHTML(PAGE).document
    asked = []
    pages = {
        [threadPath]: THREAD_FEED,
        [authorPath('alice')]: feed(
            entry('t1_alice1', 'alice', 'live words'),
            entry('t1_tomb', 'alice', 'the removed text'),
        ),
        [authorPath('bob')]: feed(entry('t1_bob1', 'bob', 'live words')),
        [authorPath('op_user')]: feed(),
    }
    browserMock.runtime.sendMessage = async message =>
        message.action === 'fetch-with-login' ? answer(message.path) : undefined
})
afterEach(() => {
    browserMock.runtime.sendMessage = savedSendMessage
    vi.useRealTimers()
})

const scan = async (pageReads = new Map(), limiter, isNewReddit = true) => {
    const found = []
    const progress = []
    const recovered = await withTimers(() =>
        restore.scanThreadForRemovedComments(
            POST,
            'sub',
            isNewReddit,
            pageReads,
            p => progress.push(p),
            rc => found.push(rc),
            limiter,
        ),
    )
    return { recovered, found, last: progress.at(-1) }
}

describe('parseFeed', () => {
    it('reads a comment from a person feed', () => {
        const [item] = restore.parseFeed(feed(entry('t1_abc', 'some-one', 'the &amp;amp; text', 'p0st', 'science')))
        expect(item.kind).toBe('t1')
        expect(item.data).toMatchObject({
            name: 't1_abc',
            author: 'some-one',
            subreddit: 'science',
            body: 'the & text',
            link_title: 'A title',
            created_utc: Math.floor(Date.parse(NOW) / 1000),
            permalink: '/r/science/comments/p0st/a_title/abc/',
            link_id: 't3_p0st',
        })
        expect(item.data.body_html).toContain('<p>')
    })

    it('reads a removed comment in a thread feed, which has no author', () => {
        const [item] = restore.parseFeed(feed(entry('t1_abc', null, '[deleted]')))
        expect(item.data).toMatchObject({ author: '[deleted]', body: '[deleted]' })
    })

    it('reads a post', () => {
        const [item] = restore.parseFeed(feed(postEntry('t3_p0st')))
        expect(item.kind).toBe('t3')
        expect(item.data).toMatchObject({ name: 't3_p0st', title: '/u/op_user on A title', link_id: 't3_p0st' })
    })

    it('finds nothing in an empty feed', () => {
        expect(restore.parseFeed(feed())).toEqual([])
    })

    it('tells a page in place of a feed from a feed with nothing in it', () => {
        for (const page of ['<html><body>challenge</body></html>', '']) {
            expect(() => restore.parseFeed(page)).toThrow(expect.objectContaining({ refused: true }))
        }
    })
})

describe('extractCommentTree_newReddit', () => {
    it('reads who replied to whom from the attributes, however deep the markup', () => {
        const tree = restore.extractCommentTree_newReddit(POST)
        expect(tree.get('t1_alice1')).toMatchObject({
            parent_id: POST,
            author: 'alice',
            created_utc: Math.floor(Date.parse(NOW) / 1000),
        })
        expect(tree.get('t1_tomb').parent_id).toBe('t1_alice1')
        expect(tree.get('t1_alice1').children.map(c => c.id)).toEqual(['t1_tomb'])
        expect(tree.get('t1_tomb').children.map(c => c.id)).toEqual(['t1_bob1'])
    })
})

describe('the thread scan', () => {
    it('recovers a removed comment on the page from its author feed, with no more requests', async () => {
        const { recovered, found } = await scan()
        expect(recovered).toHaveLength(1)
        expect(found[0]).toMatchObject({
            id: 't1_tomb',
            author: 'alice',
            body: 'the removed text',
            parent_id: 't1_alice1',
            link_id: POST,
        })
        expect(asked).not.toContain(commentPath('t1_tomb'))
    })

    it("asks a comment's own feed for one the thread leaves out, which names the parent", async () => {
        pages[authorPath('bob')] = feed(
            entry('t1_bob1', 'bob', 'live words'),
            entry('t1_leaf', 'bob', 'a removed leaf'),
        )
        // With no replies, a removed comment's feed ends at its parent
        pages[commentPath('t1_leaf')] = feed(postEntry(), entry('t1_alice1', 'alice', 'live words'))
        const { found } = await scan()
        expect(found.find(rc => rc.id === 't1_leaf')).toMatchObject({ parent_id: 't1_alice1', body: 'a removed leaf' })
    })

    it("leaves out a live comment only cut off from the thread's feed", async () => {
        pages[authorPath('bob')] = feed(entry('t1_bob1', 'bob', 'live words'), entry('t1_cutoff', 'bob', 'still live'))
        pages[commentPath('t1_cutoff')] = feed(
            postEntry(),
            entry('t1_alice1', 'alice', 'live words'),
            entry('t1_cutoff', 'bob', 'still live'),
        )
        const { found } = await scan()
        expect(found.map(rc => rc.id)).toEqual(['t1_tomb'])
    })

    it("leaves out comments from other threads in an author's feed", async () => {
        pages[authorPath('alice')] = feed(entry('t1_other', 'alice', 'elsewhere', 'other'))
        const { found } = await scan()
        expect(found).toEqual([])
    })

    it('passes over an author reddit has no feed for', async () => {
        delete pages[authorPath('alice')]
        pages[authorPath('bob')] = feed(entry('t1_tomb', 'bob', 'the removed text'))
        const { found } = await scan()
        expect(found.map(rc => rc.id)).toEqual(['t1_tomb'])
    })

    it('stops at a rate limit and keeps what it found', async () => {
        pages[authorPath('bob')] = { ok: false, status: 429 }
        const { recovered, last } = await scan()
        expect(recovered).toHaveLength(1)
        expect(asked.filter(path => path.startsWith('/user/'))).toHaveLength(2)
        expect(last).toMatchObject({ status: 'error' })
        expect(last.message).toMatch(/^Reddit is rate limiting this browser.* 1 recovered\.$/)
    })

    it('asks a logged-out browser to sign in, since the feeds allow it one request a minute', async () => {
        pages[threadPath] = { ok: false, status: 0, needsLogin: true }
        const { recovered, last } = await scan()
        expect(recovered).toEqual([])
        expect(asked).toHaveLength(1)
        expect(last).toMatchObject({ status: 'error' })
        expect(last.message).toMatch(/^Sign in to Reddit to scan/)
    })

    it("doesn't take a live comment that opens with a bracket for a tombstone", async () => {
        pages[threadPath] = THREAD_FEED.replace(
            entry('t1_alice1', 'alice', 'live words'),
            entry('t1_alice1', 'alice', '[Serious] my take'),
        )
        pages[authorPath('alice')] = feed(entry('t1_alice1', 'alice', '[Serious] my take'))
        const { found } = await scan()
        expect(found).toEqual([])
    })

    it('does the same on old reddit, where the page has the text', async () => {
        const live = (id, words) =>
            `<div class="thing comment" data-fullname="${id}" data-author="alice">` +
            `<div class="entry"><div class="usertext-body"><div class="md">${words}</div></div></div></div>`
        globalThis.document = parseHTML(
            '<div id="siteTable"><div class="thing link" data-comments-count="3"></div></div>' +
                `<div class="commentarea"><div class="sitetable">${live('t1_a', '[Serious] my take')}${live('t1_b', 'Words')}</div></div>`,
        ).document
        pages[threadPath] = feed(postEntry())
        pages[authorPath('alice')] = feed(entry('t1_a', 'alice', '[Serious] my take'), entry('t1_b', 'alice', 'Words'))
        const { found } = await scan(new Map(), undefined, false)
        expect(found).toEqual([])
    })

    it('counts AutoModerator as live, and leaves its feed alone', async () => {
        document.querySelector('shreddit-post').setAttribute('comment-count', '3')
        document.querySelector('[thingid="t1_tomb"]').setAttribute('author', 'AutoModerator')
        pages[threadPath] = feed(postEntry(), entry('t1_alice1', 'alice', 'x'), entry('t1_bob1', 'bob', 'x'))
        const { last } = await scan()
        expect(last.message).toBe('All comments are visible — nothing removed.')

        document.querySelector('shreddit-post').setAttribute('comment-count', '4')
        await scan()
        expect(asked).toContain(authorPath('alice'))
        expect(asked).not.toContain(authorPath('AutoModerator'))
    })

    it("doesn't claim a removal on a page that gives no count, with nobody to search", async () => {
        globalThis.document = parseHTML('<shreddit-post></shreddit-post><shreddit-comment-tree></shreddit-comment-tree>').document
        pages[threadPath] = feed(postEntry('t3_post', '[deleted]'))
        const { last } = await scan()
        expect(last.message).toBe('No visible authors to search.')
    })

    it('reads ids and replies by whatever reddit calls them, through the news feed', () => {
        globalThis.document = parseHTML(
            '<shreddit-comment comment-id="t1_a" author="a"><div><shreddit-comment comment-id="t1_b" author="b">' +
                '</shreddit-comment></div></shreddit-comment>',
        ).document
        setMarkupConfig({ commentIdAttributes: ['comment-id'] })
        const tree = restore.extractCommentTree_newReddit(POST)
        setMarkupConfig({})
        expect([...tree.keys()]).toEqual(['t1_a', 't1_b'])
        expect(tree.get('t1_b').parent_id).toBe('t1_a')
    })

    it('keeps a tombstone the page shows, whatever a feed says', async () => {
        pages[threadPath] = THREAD_FEED.replace(entry('t1_tomb', null, '[deleted]'), entry('t1_tomb', 'alice', 'text'))
        const { found } = await scan()
        expect(found.map(rc => rc.id)).toEqual(['t1_tomb'])
    })

    it("doesn't report again what a scan already put on the page", async () => {
        document.body.insertAdjacentHTML('beforeend', '<div data-rev-id="t1_tomb"></div>')
        const { found, last } = await scan()
        expect(found).toEqual([])
        expect(last.message).toMatch(/^Scan complete: 1 recovered/)
    })

    it("can't say everything's visible on a page that gives no count", async () => {
        document.querySelector('shreddit-post').removeAttribute('comment-count')
        document.querySelector('[thingid="t1_tomb"]').remove()
        pages[threadPath] = feed(postEntry(), entry('t1_alice1', 'alice', 'x'), entry('t1_bob1', 'bob', 'x'))
        const { last } = await scan()
        expect(last.message).toBe('Scan complete: 0 recovered')
        expect(asked).toContain(authorPath('alice'))
    })

    it('leaves the rest for the next click once it has sent 50 requests', async () => {
        const authors = Array.from({ length: 60 }, (_, i) => `author${i}`)
        const comments = authors.map(name => comment(`t1_${name}`, name)).join('')
        globalThis.document = parseHTML(
            `<shreddit-post comment-count="70"></shreddit-post><shreddit-comment-tree>${comments}</shreddit-comment-tree>`,
        ).document
        pages[threadPath] = feed(postEntry())
        for (const name of authors) pages[authorPath(name)] = feed(entry(`t1_${name}`, name, 'x'))
        pages[authorPath('op_user')] = feed(entry('t1_op', 'op_user', 'x', 'elsewhere'))

        const pageReads = new Map()
        const first = await scan(pageReads)
        expect(asked).toHaveLength(50)
        expect(first.last.status).toBe('partial')
        expect(first.last.message).toBe('0 recovered so far, 12 left to check. Click again to continue.')

        asked.length = 0
        const second = await scan(pageReads)
        expect(asked).toHaveLength(13)
        expect(second.last.status).toBe('not_found')
    })

    it("doesn't measure the next page when its own went during the first read", async () => {
        document.querySelector('shreddit-post').setAttribute('comment-count', '2')
        document.querySelector('[thingid="t1_tomb"]').remove()
        pages[threadPath] = feed(postEntry(), entry('t1_alice1', 'alice', 'x'), entry('t1_bob1', 'bob', 'x'))
        let gone = false
        const send = browserMock.runtime.sendMessage
        browserMock.runtime.sendMessage = async message => {
            gone = true
            return send(message)
        }
        const { last } = await scan(new Map(), new restore.RateLimiter(undefined, () => !gone))
        expect(last).toMatchObject({ status: 'cancelled', message: 'Scan cancelled. 0 recovered.' })
    })

    it('stops when its page goes, or when cancelled, and says nothing was finished', async () => {
        for (const limiter of [
            new restore.RateLimiter(undefined, () => false),
            Object.assign(new restore.RateLimiter(), { cancelled: true }),
        ]) {
            asked.length = 0
            const { last } = await scan(new Map(), limiter)
            expect(asked).toEqual([threadPath])
            expect(last).toMatchObject({ status: 'cancelled', message: 'Scan cancelled. 0 recovered.' })
        }
    })

    it('has nothing to scan when every comment is live', async () => {
        document.querySelector('shreddit-post').setAttribute('comment-count', '2')
        pages[threadPath] = feed(postEntry(), entry('t1_alice1', 'alice', 'x'), entry('t1_bob1', 'bob', 'x'))
        document.querySelector('[thingid="t1_tomb"]').remove()
        const { last } = await scan()
        expect(last.message).toBe('All comments are visible — nothing removed.')
        expect(asked).toEqual([threadPath])
    })
})

describe('restoring one comment', () => {
    const run = async (id, pageReads = new Map(), limiter) => {
        const progress = []
        const others = []
        const result = await withTimers(() =>
            restore.restoreComment(
                id,
                POST,
                'sub',
                true,
                p => progress.push(p),
                pageReads,
                rc => others.push(rc),
                limiter,
            ),
        )
        return { result, others, last: progress.at(-1) }
    }

    it('finds a removed comment near the top of the search and stops', async () => {
        const { result } = await run('t1_tomb')
        expect(result).toMatchObject({ found: true, author: 'alice', body: 'the removed text' })
        expect(asked).not.toContain(authorPath('bob'))
    })

    it("a live comment's button reports removed comments around it", async () => {
        const { result, others } = await run('t1_bob1')
        expect(result.found).toBe(false)
        expect(others.map(rc => rc.id)).toEqual(['t1_tomb'])
    })

    it("doesn't call a live comment found, whatever its text", async () => {
        pages[threadPath] = THREAD_FEED.replace(
            entry('t1_alice1', 'alice', 'live words'),
            entry('t1_alice1', 'alice', '[1] a footnote'),
        )
        pages[authorPath('alice')] = feed(entry('t1_alice1', 'alice', '[1] a footnote'))
        const { result } = await run('t1_alice1')
        expect(result.found).toBe(false)
    })

    it("answers as soon as it has the comment, and the rest keep for the next click", async () => {
        pages[authorPath('alice')] = feed(
            entry('t1_tomb', 'alice', 'the removed text'),
            entry('t1_offpage', 'alice', 'not in the thread feed'),
        )
        const { result } = await run('t1_tomb')
        expect(result.found).toBe(true)
        expect(asked).not.toContain(commentPath('t1_offpage'))
    })

    it("says what it couldn't read, keeps the buttons, and the next click tries it", async () => {
        const pageReads = new Map()
        pages[authorPath('bob')] = { ok: false, status: 500 }
        await run('t1_bob1', pageReads)
        const { result, last } = await run('t1_bob1', pageReads)
        expect(result).toMatchObject({ found: false, exhausted: false, remaining: 1 })
        expect(last.message).toContain("1 feed(s) couldn't be read. Click again to try them.")

        pages[authorPath('bob')] = feed(entry('t1_bob1', 'bob', 'live words'))
        asked.length = 0
        const third = await run('t1_bob1', pageReads)
        expect(third.result).toMatchObject({ exhausted: true, remaining: 0 })
        expect(asked).toEqual([threadPath, authorPath('bob')])
    })

    it('leaves a failed feed to read again, and the next click reads only that', async () => {
        const pageReads = new Map()
        pages[authorPath('bob')] = { ok: false, status: 500 }
        const { result, last } = await run('t1_bob1', pageReads)
        expect(result).toMatchObject({ found: false, exhausted: false, remaining: 1 })
        expect(last.message).toBe('No match yet — 1 left to check; click again to continue.')

        pages[authorPath('bob')] = feed(entry('t1_bob1', 'bob', 'live words'))
        asked.length = 0
        const again = await run('t1_bob1', pageReads)
        expect(again.result).toMatchObject({ found: false, exhausted: true, remaining: 0 })
        expect(asked).toEqual([threadPath, authorPath('bob')])
    })

    it('counts the comments its limit left out, and goes on from there', async () => {
        const offPage = Array.from({ length: 45 }, (_, i) => `t1_off${i}`)
        pages[authorPath('alice')] = feed(...offPage.map(id => entry(id, 'alice', 'not in the thread feed')))
        for (const id of offPage) pages[commentPath(id)] = feed(postEntry(), entry(id, 'alice', 'x'))

        const pageReads = new Map()
        const { result } = await run('t1_alice1', pageReads)
        expect(result).toMatchObject({ exhausted: false, remaining: 8 })
        expect(asked.filter(path => path.startsWith('/comments/'))).toHaveLength(37)

        asked.length = 0
        const again = await run('t1_alice1', pageReads)
        expect(again.result).toMatchObject({ exhausted: true, remaining: 0 })
        expect(asked.filter(path => path.startsWith('/comments/'))).toHaveLength(8)
    })

    it("reads a person's feed again for a comment that needs another sort", async () => {
        const pageReads = new Map()
        await run('t1_bob1', pageReads)
        const eightMonthsAgo = new Date(Date.now() - 240 * 24 * 3600 * 1000).toISOString()
        document.querySelector('[thingid="t1_tomb"]').setAttribute('created', eightMonthsAgo)
        await run('t1_tomb', pageReads)
        expect(asked).toContain('/user/alice/comments/.rss?sort=controversial&limit=100&t=year')
    })

    it("says when a person's list leaves other comments on the page to search", async () => {
        const { result } = await run('t1_bob1')
        expect(result).toMatchObject({ exhausted: true, otherSorts: false })

        const eightMonthsAgo = new Date(Date.now() - 240 * 24 * 3600 * 1000).toISOString()
        document.querySelector('[thingid="t1_tomb"]').setAttribute('created', eightMonthsAgo)
        const mixed = await run('t1_bob1')
        expect(mixed.result).toMatchObject({ exhausted: true, otherSorts: true })
    })

    it('a cancelled search says so and retires nothing', async () => {
        const { result, last } = await run('t1_bob1', new Map(), new restore.RateLimiter(undefined, () => false))
        expect(result).toEqual({ found: false })
        expect(last).toMatchObject({ status: 'cancelled', message: 'Search cancelled.' })
    })
})

describe("a comment's own feed", () => {
    const lookup = async (name = 't1_x', link_id = POST) => {
        const reads = new restore.ScanReads(new restore.RateLimiter(1))
        const { looked } = await restore.lookupCommentsByIds([{ name, link_id }], reads)
        return { info: looked.get(name), reads }
    }

    it('reads a comment left out of its post and parent as removed', async () => {
        pages[commentPath('t1_x')] = feed(postEntry(), entry('t1_parent', 'alice', 'x'))
        expect((await lookup()).info).toMatchObject({ removed: true, parent_id: 't1_parent' })
    })

    it('reads a tombstone as removed, and a live comment with the same words as live', async () => {
        pages[commentPath('t1_x')] = feed(postEntry(), entry('t1_x', null, '[deleted]'))
        expect((await lookup()).info.removed).toBe(true)
        pages[commentPath('t1_x')] = feed(postEntry(), entry('t1_x', 'alice', '[removed]'))
        expect((await lookup()).info.removed).toBe(false)
    })

    it('says nothing about a comment from an answer about something else', async () => {
        for (const wrong of [
            feed(postEntry('t3_other'), entry('t1_elsewhere', 'alice', 'x', 'other')),
            feed(postEntry(), entry('t1_a', 'alice', 'x'), entry('t1_b', 'bob', 'x'), entry('t1_c', 'bob', 'x')),
            feed(),
        ]) {
            pages[commentPath('t1_x')] = wrong
            const { info, reads } = await lookup()
            expect(info).toBeUndefined()
            expect(reads.unread).toBe(1)
        }
    })
})

describe('reads that fail', () => {
    const refused = { ok: false, status: 403, blockPage: true }

    it("passes over a person whose feed alone is refused, and doesn't call the scan finished", async () => {
        pages[authorPath('alice')] = refused
        pages[authorPath('bob')] = feed(entry('t1_tomb', 'bob', 'the removed text'))
        const { found, last } = await scan()
        expect(found.map(rc => rc.id)).toEqual(['t1_tomb'])
        expect(last).toMatchObject({ status: 'partial' })
    })

    it("doesn't take a page in place of a feed for a person with no comments, and reads it again", async () => {
        const pageReads = new Map()
        pages[authorPath('alice')] = '<html><body>Prove your humanity</body></html>'
        const { last } = await scan(pageReads)
        expect(last).toMatchObject({ status: 'partial' })
        expect(last.message).toContain('1 left to check')
        expect(pageReads.has(authorPath('alice'))).toBe(false)
    })

    it('counts a read the block page made two requests of, as a click promises', async () => {
        for (const answered of [
            { ...refused, retried: true },
            { ok: true, status: 200, text: feed(), retried: true },
        ]) {
            pages['/a'] = pages['/b'] = answered
            const reads = new restore.ScanReads(new restore.RateLimiter(1), 4)
            await withTimers(() => reads.feed('/a'))
            expect(reads.canRead('/c')).toBe(true)
            await withTimers(() => reads.feed('/b'))
            expect(reads.canRead('/c')).toBe(false)
        }
    })

    it('stops after three failures in a row of any kind, and says it could not read', async () => {
        for (const name of ['alice', 'bob', 'op_user']) pages[authorPath(name)] = { ok: false, status: 503 }
        const { last } = await scan()
        expect(last).toMatchObject({ status: 'error' })
        expect(last.message).toMatch(/^Couldn't read reddit's feeds/)
    })

    const authorsPage = names => {
        const comments = names.map(name => comment(`t1_${name}`, name)).join('')
        globalThis.document = parseHTML(
            `<shreddit-post comment-count="9"></shreddit-post><shreddit-comment-tree>${comments}</shreddit-comment-tree>`,
        ).document
        pages[threadPath] = feed(postEntry())
        pages[authorPath('op_user')] = feed(entry('t1_op', 'op_user', 'x', 'elsewhere'))
        for (const name of names) pages[authorPath(name)] = feed(entry(`t1_${name}`, name, 'x'))
    }

    it("doesn't add up failures with reads between them, on any click", async () => {
        authorsPage(['a', 'b', 'c', 'd', 'e'])
        for (const name of ['a', 'c', 'e']) pages[authorPath(name)] = refused
        const pageReads = new Map()
        const first = await scan(pageReads)
        expect(first.last.status).toBe('partial')
        const second = await scan(pageReads)
        expect(second.last.status).toBe('partial')
        expect(second.last.message).toContain("3 feed(s) couldn't be read.")
    })

    it("after two clicks says it couldn't read a feed, hasn't finished, and tries it on the next", async () => {
        authorsPage(['a', 'b'])
        pages[authorPath('b')] = refused
        const pageReads = new Map()
        expect((await scan(pageReads)).last.message).toContain('1 left to check. Click again to continue.')

        const second = await scan(pageReads)
        expect(second.last).toMatchObject({
            status: 'partial',
            message: "0 recovered. 1 feed(s) couldn't be read. Click again to try them.",
        })

        pages[authorPath('b')] = feed(entry('t1_gone', 'b', 'the removed text'))
        pages[commentPath('t1_gone')] = feed(postEntry())
        asked.length = 0
        const third = await scan(pageReads)
        expect(asked).toEqual([threadPath, authorPath('b'), commentPath('t1_gone')])
        expect(third.found.map(rc => rc.id)).toEqual(['t1_gone'])
    })

    it('tries a feed that goes on failing once on each click after that, saying the same', async () => {
        authorsPage(['a', 'b'])
        pages[authorPath('b')] = refused
        const pageReads = new Map()
        await scan(pageReads)
        await scan(pageReads)
        for (let i = 0; i < 2; i++) {
            asked.length = 0
            const { last } = await scan(pageReads)
            expect(asked).toEqual([threadPath, authorPath('b')])
            expect(last).toMatchObject({ status: 'partial', message: expect.stringContaining("couldn't be read") })
        }
    })

    it('gets past failing feeds next to each other, rather than stopping there on every click', async () => {
        authorsPage(['a', 'b', 'c', 'd'])
        for (const name of ['a', 'b', 'c']) pages[authorPath(name)] = refused
        pages[authorPath('d')] = feed(entry('t1_gone', 'd', 'the removed text'))
        pages[commentPath('t1_gone')] = feed(postEntry())
        const pageReads = new Map()
        expect((await scan(pageReads)).last.status).toBe('error')
        expect((await scan(pageReads)).last.status).toBe('error')
        const third = await scan(pageReads)
        expect(third.found.map(rc => rc.id)).toEqual(['t1_gone'])
    })

    it("reads a comment's feed again when it said nothing, then gives up on it", async () => {
        pages[authorPath('bob')] = feed(entry('t1_shell', 'bob', 'a comment'))
        pages[commentPath('t1_shell')] = feed()
        const pageReads = new Map()
        const first = await scan(pageReads)
        expect(first.last.status).toBe('partial')

        asked.length = 0
        const second = await scan(pageReads)
        expect(asked).toContain(commentPath('t1_shell'))
        expect(second.last.message).toContain("1 feed(s) couldn't be read.")
    })

    it('goes on past a read that heals on the next click', async () => {
        pages[authorPath('bob')] = feed(entry('t1_shell', 'bob', 'a comment'))
        pages[commentPath('t1_shell')] = feed()
        const pageReads = new Map()
        await scan(pageReads)
        pages[commentPath('t1_shell')] = feed(postEntry(), entry('t1_parent', 'alice', 'x'))
        const { found } = await scan(pageReads)
        expect(found.map(rc => rc.id)).toContain('t1_shell')
    })

    it('a person with no feed is an answer, read once', async () => {
        delete pages[authorPath('alice')]
        const pageReads = new Map()
        const { last } = await scan(pageReads)
        expect(last.status).toBe('not_found')
        asked.length = 0
        await scan(pageReads)
        expect(asked).not.toContain(authorPath('alice'))
    })

    it('stops on a second account signing in, a backoff, or a private window, and says which', async () => {
        for (const [answer, words] of [
            [{ ok: false, status: 0, busy: true }, /^A second account is signing in/],
            [{ ok: false, status: 0, resting: true }, /^Reddit is rate limiting this browser/],
            [{ ok: false, status: 0, otherIdentity: true }, /^Scans need a regular window/],
        ]) {
            pages[authorPath('alice')] = answer
            asked.length = 0
            const { last } = await scan()
            expect(asked.filter(path => path.startsWith('/user/'))).toHaveLength(1)
            expect(last).toMatchObject({ status: 'error' })
            expect(last.message).toMatch(words)
        }
    })
})

describe("the page's comment count", () => {
    const threadOf = count =>
        parseHTML(
            `<shreddit-post comment-count="${count}"></shreddit-post><shreddit-comment-tree>` +
                comment('t1_alice1', 'alice') +
                comment('t1_bob1', 'bob') +
                '</shreddit-comment-tree>',
        ).document
    const onPage = [entry('t1_alice1', 'alice', 'live words'), entry('t1_bob1', 'bob', 'live words')]

    beforeEach(() => {
        globalThis.document = threadOf(3)
        pages[authorPath('alice')] = feed(onPage[0], entry('t1_leaf', 'alice', 'the removed text'))
        pages[authorPath('carol')] = feed()
        pages[commentPath('t1_leaf')] = feed(postEntry(), onPage[0])
    })

    const later = new Date(Date.now() + 3600 * 1000).toISOString()
    const seenAt = at => document.querySelector('shreddit-post').setAttribute('data-rev-seen', String(at))

    it("doesn't say what's missing when the thread is bigger than its feed holds", async () => {
        globalThis.document = threadOf(3000)
        pages[threadPath] = feed(postEntry(), ...onPage)
        const { found, last } = await scan()
        expect(found.map(rc => rc.id)).toEqual(['t1_leaf'])
        expect(last.message).toBe('Scan complete: 1 recovered')
    })

    it('goes by the count up to what the feed holds', async () => {
        globalThis.document = threadOf(500)
        pages[threadPath] = feed(postEntry(), ...onPage)
        const { last } = await scan()
        expect(last.message).toBe('Scan complete: 1 recovered (497 not found)')
    })

    it("isn't taken to include a comment posted since the page loaded", async () => {
        pages[threadPath] = feed(postEntry(), ...onPage, entry('t1_new', 'carol', 'just posted').replace(NOW, later))
        const { found } = await scan()
        expect(found.map(rc => rc.id)).toEqual(['t1_leaf'])
    })

    it('includes one the feed has from before then, which the page may just not have loaded', async () => {
        pages[threadPath] = feed(postEntry(), ...onPage, entry('t1_unloaded', 'carol', 'further down'))
        const { last } = await scan()
        expect(last.message).toBe('All comments are visible — nothing removed.')
    })

    it('goes by when the count was seen, which on a page reached without a load is after the document', async () => {
        seenAt(Math.floor(Date.parse(later) / 1000) + 60)
        pages[threadPath] = feed(postEntry(), ...onPage, entry('t1_unloaded', 'carol', 'further down').replace(NOW, later))
        const { last } = await scan()
        expect(last.message).toBe('All comments are visible — nothing removed.')
    })

    it("doesn't let what it recovers from after the count stand in for what the count has missing", async () => {
        seenAt(Math.floor(Date.now() / 1000))
        pages[threadPath] = feed(postEntry(), ...onPage)
        pages[authorPath('alice')] = feed(onPage[0], entry('t1_late', 'alice', 'posted and removed since').replace(NOW, later))
        pages[authorPath('bob')] = feed(onPage[1], entry('t1_leaf', 'bob', 'the removed text'))
        pages[commentPath('t1_late')] = feed(postEntry(), onPage[0])
        const { found, last } = await scan()
        expect(found.map(rc => rc.id).sort()).toEqual(['t1_late', 't1_leaf'])
        expect(last.message).toBe('Scan complete: 2 recovered')
    })

    it('counts a tombstone posted since on both sides, so finding it all reads as finding it all', async () => {
        const tombstone = (id, created) =>
            comment(id, '[deleted]', 't1_alice1', '<p>Comment removed by moderator</p>').replace(NOW, created)
        globalThis.document = threadOf(3)
        seenAt(Math.floor(Date.now() / 1000))
        document.querySelector('[thingid="t1_bob1"]').insertAdjacentHTML('afterend', tombstone('t1_tomb', NOW) + tombstone('t1_late', later))
        pages[threadPath] = feed(postEntry(), ...onPage, entry('t1_tomb', null, '[deleted]'), entry('t1_late', null, '[deleted]').replace(NOW, later))
        pages[authorPath('alice')] = feed(onPage[0], entry('t1_tomb', 'alice', 'words'), entry('t1_late', 'alice', 'more words').replace(NOW, later))
        const { found, last } = await scan()
        expect(found.map(rc => rc.id).sort()).toEqual(['t1_late', 't1_tomb'])
        expect(last.message).toBe('Scan complete: 2 recovered')
        expect(asked).not.toContain(authorPath('bob'))
    })

    it("goes on for what the count has missing, past a tombstone posted since", async () => {
        const tombstone = (id, created) =>
            comment(id, '[deleted]', 't1_alice1', '<p>Comment removed by moderator</p>').replace(NOW, created)
        globalThis.document = threadOf(4)
        seenAt(Math.floor(Date.now() / 1000))
        document.querySelector('[thingid="t1_bob1"]').insertAdjacentHTML('afterend', tombstone('t1_tomb', NOW) + tombstone('t1_late', later))
        pages[threadPath] = feed(postEntry(), ...onPage, entry('t1_tomb', null, '[deleted]'), entry('t1_late', null, '[deleted]').replace(NOW, later))
        pages[authorPath('alice')] = feed(onPage[0], entry('t1_tomb', 'alice', 'words'), entry('t1_late', 'alice', 'more words').replace(NOW, later))
        pages[authorPath('bob')] = feed(onPage[1], entry('t1_leaf', 'bob', 'the removed text'))
        pages[commentPath('t1_leaf')] = feed(postEntry(), onPage[1])
        const { found } = await scan()
        expect(found.map(rc => rc.id).sort()).toEqual(['t1_late', 't1_leaf', 't1_tomb'])
    })

    it('still says what the count has missing, when all it recovered came after the count', async () => {
        seenAt(Math.floor(Date.now() / 1000))
        pages[threadPath] = feed(postEntry(), ...onPage)
        pages[authorPath('alice')] = feed(onPage[0], entry('t1_late', 'alice', 'posted and removed since').replace(NOW, later))
        pages[authorPath('bob')] = feed(onPage[1])
        pages[commentPath('t1_late')] = feed(postEntry(), onPage[0])
        const { last } = await scan()
        expect(last.message).toBe('Scan complete: 1 recovered (1 not found)')
    })

    it("isn't taken to include one on the page itself that came after the count did", async () => {
        seenAt(Math.floor(Date.now() / 1000))
        document.querySelector('[thingid="t1_bob1"]').insertAdjacentHTML('afterend', comment('t1_reply', 'carol').replace(NOW, later))
        pages[threadPath] = feed(postEntry(), ...onPage, entry('t1_reply', 'carol', 'just replied').replace(NOW, later))
        const { found } = await scan()
        expect(found.map(rc => rc.id)).toEqual(['t1_leaf'])
    })
})

describe('comments a scan already placed on the page', () => {
    const placed = (id, classes) => `<div class="thing comment rev-inserted-comment ${classes}" data-rev-id="${id}"></div>`
    const pageWith = (count, ...extras) => {
        globalThis.document = parseHTML(
            PAGE.replace('comment-count="6"', `comment-count="${count}"`).replace(
                '</section>',
                `</section>${extras.join('')}`,
            ),
        ).document
    }

    it('count as recovered only if they are: a live comment placed for context is not', async () => {
        pageWith(4, placed('t1_ctx1', 'rev-context'), placed('t1_ctx2', 'rev-context'))
        const { found, last } = await scan()
        expect(found.map(rc => rc.id)).toEqual(['t1_tomb'])
        expect(last.message).toBe('Scan complete: 1 recovered (1 not found)')
    })

    it('count as recovered only if they are: one placed without its text is not', async () => {
        pageWith(3, placed('t1_ph', 'rev-removed-highlight rev-placeholder'))
        const { found } = await scan()
        expect(found.map(rc => rc.id)).toEqual(['t1_tomb'])
    })

    it('that are recovered do count, so a scan with nothing left to find stops', async () => {
        pageWith(3, placed('t1_tomb', 'rev-removed-highlight'))
        const { found, last } = await scan()
        expect(found).toEqual([])
        expect(last.message).toBe('Scan complete: 1 recovered')
        expect(asked).toEqual([threadPath])
    })

    it("aren't looked up again when live, and are when their text is still wanted", async () => {
        pageWith(6, placed('t1_ctx', 'rev-context'), placed('t1_ph', 'rev-removed-highlight rev-placeholder'))
        pages[authorPath('bob')] = feed(entry('t1_ctx', 'bob', 'live'), entry('t1_ph', 'bob', 'the removed text'))
        pages[commentPath('t1_ph')] = feed(postEntry())
        const { found } = await scan()
        expect(found.map(rc => rc.id)).toContain('t1_ph')
        expect(asked).not.toContain(commentPath('t1_ctx'))
    })
})

describe('a comment by someone who blocked the viewer', () => {
    const blocked = comment('t1_blk', '[unavailable]', 't1_alice1', '<p>Unavailable</p>')
    const threadWith = (...extras) => {
        globalThis.document = parseHTML(
            '<shreddit-post comment-count="2"></shreddit-post><shreddit-comment-tree>' +
                comment('t1_alice1', 'alice') +
                extras.join('') +
                '</shreddit-comment-tree>',
        ).document
    }
    const live = entry('t1_alice1', 'alice', 'live words')

    it('reads as live when the page masks it, whatever the feed says', async () => {
        for (const inFeed of [entry('t1_blk', null, '[deleted]'), entry('t1_blk', '[unavailable]', '[unavailable]')]) {
            threadWith(blocked)
            pages[threadPath] = feed(postEntry(), live, inFeed)
            const { last } = await scan()
            expect(last.message).toBe('All comments are visible — nothing removed.')
        }
    })

    it('reads as live when only the feed masks it', async () => {
        for (const inFeed of [entry('t1_blk', '[unavailable]', '[unavailable]'), entry('t1_blk', null, '[unavailable]')]) {
            threadWith(comment('t1_blk', 'blocker', 't1_alice1'))
            pages[threadPath] = feed(postEntry(), live, inFeed)
            const { last } = await scan()
            expect(last.message).toBe('All comments are visible — nothing removed.')
        }
    })

    it("isn't reported as removed when their own feed lists it", async () => {
        threadWith(blocked, comment('t1_gone', '[deleted]', 't1_alice1', '<p>removed</p>'))
        document.querySelector('shreddit-post').setAttribute('comment-count', '3')
        pages[threadPath] = feed(postEntry(), live, entry('t1_blk', null, '[unavailable]'), entry('t1_gone', null, '[deleted]'))
        pages[authorPath('op_user')] = feed(entry('t1_blk', 'op_user', 'their words'))
        const { found } = await scan()
        expect(found).toEqual([])
    })
})

describe('the profile scan', () => {
    const query = 'sort=new&limit=100'
    const removedPost = { name: 't3_gone', is_robot_indexable: false }
    const scanProfile = async (options, pageReads) => {
        const progress = []
        const results = await withTimers(() =>
            restore.scanUserProfile('someone', p => progress.push(p), options, undefined, pageReads),
        )
        return { results, last: progress.at(-1) }
    }
    beforeEach(() => {
        pages[`/user/someone/comments/.rss?${query}`] = feed(
            entry('t1_live', 'someone', 'live words'),
            entry('t1_gone', 'someone', 'the removed text'),
            entry('t1_hidden', 'someone', 'in a subreddit they hid'),
        )
        pages[`/user/someone/comments.json?${query}`] = listing({ data: { name: 't1_live' } })
        pages[`/user/someone/submitted/.rss?${query}`] = feed(
            postEntry('t3_gone', 'someone', 'the removed post'),
            postEntry('t3_fine', 'someone', 'a live post'),
        )
        pages[`/user/someone/submitted.json?${query}`] = listing({ data: removedPost }, { data: { name: 't3_fine' } })
        pages[commentPath('t1_gone')] = feed(postEntry(), entry('t1_parent', 'alice', 'live words'))
        pages[commentPath('t1_hidden')] = feed(postEntry(), entry('t1_hidden', 'someone', 'in a subreddit they hid'))
    })

    it('finds comments the listing leaves out and their feed confirms, and posts it marks', async () => {
        const { results, last } = await scanProfile()
        expect(results.map(r => r.id)).toEqual(['t1_gone', 't3_gone'])
        expect(results[0]).toMatchObject({ type: 'comment', body: 'the removed text', parent_id: 't1_parent' })
        expect(last).toMatchObject({ status: 'found', message: 'Found 2 removed item(s).' })
    })

    it('gives each result the item before it in the feed', async () => {
        const { results } = await scanProfile()
        expect(results.map(r => r.after)).toEqual(['t1_live', undefined])
    })

    it("says so when a comment feed stops it, and doesn't call the rest clear", async () => {
        pages[commentPath('t1_gone')] = { ok: false, status: 429 }
        const { results, last } = await scanProfile()
        expect(asked).not.toContain(commentPath('t1_hidden'))
        expect(results.map(r => r.id)).toEqual(['t3_gone'])
        expect(last).toMatchObject({
            status: 'error',
            message:
                'Reddit is rate limiting this browser. Removal monitoring is paused too. Try again in a few minutes. Found 1 removed item(s).',
        })
    })

    it('says how many it could not check', async () => {
        pages[commentPath('t1_gone')] = { ok: false, status: 500 }
        pages[commentPath('t1_hidden')] = { ok: false, status: 500 }
        pages[`/user/someone/submitted.json?${query}`] = listing({ data: { name: 't3_fine' } })
        const { last } = await scanProfile()
        expect(last).toMatchObject({
            status: 'partial',
            message: 'No removed items found so far. 2 comment(s) not checked yet; scan again to go on.',
        })
    })

    it('says how far its limit went, and the next scan goes on from there', async () => {
        const ids = Array.from({ length: 60 }, (_, i) => `t1_gone${i}`)
        pages[`/user/someone/comments/.rss?${query}`] = feed(...ids.map(id => entry(id, 'someone', 'the text')))
        for (const id of ids) pages[commentPath(id)] = feed(postEntry(), entry('t1_parent', 'alice', 'x'))

        const pageReads = new Map()
        const first = await scanProfile(undefined, pageReads)
        expect(asked.filter(path => path.startsWith('/comments/'))).toHaveLength(45)
        expect(first.results.filter(r => r.type === 'comment')).toHaveLength(45)
        expect(first.last).toMatchObject({
            status: 'partial',
            message: 'Found 46 removed item(s). 15 comment(s) not checked yet; scan again to go on.',
        })

        asked.length = 0
        const second = await scanProfile(undefined, pageReads)
        expect(asked.filter(path => path.startsWith('/comments/'))).toHaveLength(15)
        expect(second.last).toMatchObject({ status: 'found', message: 'Found 61 removed item(s).' })
    })

    const OWN_VIEW = "Found 1 removed item(s). Reddit shows you your own comments as live, so a scan can't check them."
    const listAll = () => {
        pages[`/user/someone/comments.json?${query}`] = listing(
            { data: { name: 't1_live' } },
            { data: { name: 't1_gone' } },
            { data: { name: 't1_hidden' } },
        )
    }

    it("on one's own profile, says comments can't be checked", async () => {
        listAll()
        const { results, last } = await scanProfile({ ownProfile: true })
        expect(results.map(r => r.id)).toEqual(['t3_gone'])
        expect(last).toMatchObject({ status: 'noted', message: OWN_VIEW })
    })

    it("asks who's signed in when every comment is listed, since the stored name can be out of date", async () => {
        listAll()
        pages['/api/me.json'] = JSON.stringify({ data: { name: 'Someone' } })
        const own = await scanProfile()
        expect(own.last).toMatchObject({ status: 'noted', message: OWN_VIEW })

        pages['/api/me.json'] = JSON.stringify({ data: { name: 'another' } })
        const other = await scanProfile()
        expect(other.last).toMatchObject({ status: 'found', message: 'Found 1 removed item(s).' })
    })

    it("doesn't take a read that failed for someone else's profile: the caveat stays", async () => {
        listAll()
        for (const failed of [
            '<html>a challenge</html>',
            { ok: false, status: 403, blockPage: true },
            { ok: false, status: 503 },
            { ok: false, status: 0, resting: true },
        ]) {
            pages['/api/me.json'] = failed
            const { last } = await scanProfile()
            expect(last).toMatchObject({
                status: 'noted',
                message:
                    "Found 1 removed item(s). If this is your own profile, a scan can't check its comments: Reddit shows them to you as live.",
            })
        }
    })

    it('reads the list the page shows, whichever part of it that is', async () => {
        const sent = options => {
            const shown = new URLSearchParams(options)
            for (const tab of ['comments', 'submitted']) {
                pages[`/user/someone/${tab}/.rss?${shown}`] = pages[`/user/someone/${tab}/.rss?${query}`]
                pages[`/user/someone/${tab}.json?${shown}`] = pages[`/user/someone/${tab}.json?${query}`]
            }
            return shown
        }
        const firstOnPage = { t1: 't1_first', t3: 't3_first' }
        const above = name => `sort=new&limit=1&before=${name}`
        pages[`/user/someone/submitted/.rss?${above('t3_first')}`] = feed(postEntry('t3_above'))
        pages[`/user/someone/comments/.rss?${above('t1_first')}`] = feed(entry('t1_above', 'someone', 'words'))
        for (const [options, comments, posts, oneAbove] of [
            [{ sort: 'top', t: 'month', firstOnPage }, { sort: 'top', limit: '100', t: 'month' }],
            [{ after: 't1_x', firstOnPage }, { sort: 'new', limit: '100', after: 't1_x' }, { sort: 'new', limit: '100', after: 't3_above' }, 'submitted/.rss?' + above('t3_first')],
            [{ after: 't3_x', firstOnPage }, { sort: 'new', limit: '100', after: 't1_above' }, { sort: 'new', limit: '100', after: 't3_x' }, 'comments/.rss?' + above('t1_first')],
            [{ before: 't1_x', firstOnPage }, { sort: 'new', limit: '100', before: 't1_x' }, { sort: 'new', limit: '100', after: 't3_above' }, 'submitted/.rss?' + above('t3_first')],
            [{ after: 't1_x' }, { sort: 'new', limit: '100', after: 't1_x' }, { sort: 'new', limit: '100' }],
        ]) {
            const c = sent(comments)
            const p = sent(posts || comments)
            asked.length = 0
            await scanProfile(options)
            const read = asked.slice(0, oneAbove ? 5 : 4)
            if (oneAbove) expect(read.splice(oneAbove.startsWith('comments') ? 0 : 2, 1)).toEqual([`/user/someone/${oneAbove}`])
            expect(read).toEqual([
                `/user/someone/comments/.rss?${c}`,
                `/user/someone/comments.json?${c}`,
                `/user/someone/submitted/.rss?${p}`,
                `/user/someone/submitted.json?${p}`,
            ])
        }
    })

    it("reads a tab from the top when the page's first of it has nothing above", async () => {
        pages[`/user/someone/submitted/.rss?sort=new&limit=1&before=t3_first`] = feed()
        const c = 'sort=new&limit=100&after=t1_x'
        pages[`/user/someone/comments/.rss?${c}`] = pages[`/user/someone/comments/.rss?${query}`]
        pages[`/user/someone/comments.json?${c}`] = pages[`/user/someone/comments.json?${query}`]
        await scanProfile({ after: 't1_x', firstOnPage: { t3: 't3_first' } })
        expect(asked).toContain(`/user/someone/submitted/.rss?${query}`)
    })

    it('leaves room in the click for the read above the page', async () => {
        const unlisted = Array.from({ length: 60 }, (_, i) => `t1_off${i}`)
        const c = 'sort=new&limit=100&after=t1_x'
        pages[`/user/someone/comments/.rss?${c}`] = feed(...unlisted.map(id => entry(id, 'someone', 'words')))
        pages[`/user/someone/comments.json?${c}`] = listing()
        pages[`/user/someone/submitted/.rss?sort=new&limit=1&before=t3_first`] = feed()
        for (const id of unlisted) pages[commentPath(id)] = feed(postEntry(), entry(id, 'someone', 'words'))
        await scanProfile({ after: 't1_x', firstOnPage: { t3: 't3_first' } })
        expect(asked.filter(path => !path.includes('me.json'))).toHaveLength(50)
    })

    it("says when it's the viewer's own profile, which the page can't know from a stale name", async () => {
        listAll()
        pages['/api/me.json'] = JSON.stringify({ data: { name: 'someone' } })
        expect((await scanProfile()).last.own).toBe(true)
        pages['/api/me.json'] = JSON.stringify({ data: { name: 'another' } })
        expect((await scanProfile()).last.own).toBe(false)
    })

    it('says a scan stopped by leaving the page did not finish', async () => {
        const left = await withTimers(() => {
            const progress = []
            let reads = 0
            const send = browserMock.runtime.sendMessage
            browserMock.runtime.sendMessage = async message => {
                reads++
                return send(message)
            }
            const limiter = new restore.RateLimiter(undefined, () => reads < 4)
            return restore.scanUserProfile('someone', p => progress.push(p), undefined, limiter).then(() => progress.at(-1))
        })
        expect(left).toMatchObject({ status: 'cancelled' })
        expect(left.message).toMatch(/^Scan cancelled\./)
    })

    it("says so when it can't check a comment even after trying again", async () => {
        pages[commentPath('t1_gone')] = feed()
        const pageReads = new Map()
        expect((await scanProfile(undefined, pageReads)).last.status).toBe('partial')
        const { last } = await scanProfile(undefined, pageReads)
        expect(last).toMatchObject({
            status: 'noted',
            message: "Found 1 removed item(s). 1 comment(s) couldn't be checked.",
        })
    })

    it("goes by the flags a moderator's listing and a post's category carry", async () => {
        pages[`/user/someone/comments.json?${query}`] = listing(
            { data: { name: 't1_live', removed: true } },
            { data: { name: 't1_gone' } },
            { data: { name: 't1_hidden' } },
        )
        pages[`/user/someone/submitted.json?${query}`] = listing(
            { data: { name: 't3_gone', removed_by_category: 'moderator' } },
            { data: { name: 't3_fine', removed_by_category: 'deleted' } },
        )
        const { results } = await scanProfile()
        expect(results.map(r => r.id)).toEqual(['t1_live', 't3_gone'])
    })

    it('says so when the user is gone', async () => {
        delete pages[`/user/someone/comments/.rss?${query}`]
        const { results, last } = await scanProfile()
        expect(results).toEqual([])
        expect(last).toMatchObject({ status: 'error', message: 'User not found.' })
    })

    it('asks a logged-out browser to sign in', async () => {
        pages[`/user/someone/comments/.rss?${query}`] = { ok: false, status: 0, needsLogin: true }
        const { last } = await scanProfile()
        expect(last.message).toMatch(/^Sign in to Reddit to scan/)
    })
})
