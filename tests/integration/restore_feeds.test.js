// Scans read reddit's feeds (restore.ts). A person's feed keeps the comments
// moderators removed, with their text, a thread's feed shows those with replies
// as [deleted], and a comment's feed names its parent. Shapes from 2026-11-04.

// Install chrome global BEFORE any source import
import '../mocks/chrome-api.js'

import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest'
import browserMock, { __resetStorage } from '../mocks/webextension-polyfill.js'
import { parseHTML, DOMParser } from 'linkedom'

const POST = 't3_post'
// A thread's age picks the sort, so these stay young
const NOW = new Date().toISOString()
const entry = (id, author, body, post = 'post', sub = 'sub') =>
    `<entry>${author ? `<author><name>/u/${author}</name><uri>https://www.reddit.com/user/${author}</uri></author>` : ''}` +
    `<category term="${sub}" label="r/${sub}" />` +
    `<content type="html">&lt;!-- SC_OFF --&gt;&lt;div class=&quot;md&quot;&gt;&lt;p&gt;${body}&lt;/p&gt; &lt;/div&gt;&lt;!-- SC_ON --&gt;</content>` +
    `<id>${id}</id><link href="https://www.reddit.com/r/${sub}/comments/${post}/a_title/${id.slice(3)}/"/>` +
    `<updated>${NOW}</updated><title>/u/${author || '[deleted]'} on A title</title></entry>`
const postEntry = (id = POST, author = 'op_user', body = 'the post', extra = '') =>
    entry(id, author, body, id.slice(3)).replace('</title>', `</title>${extra}`)
const feed = (...entries) =>
    `<?xml version="1.0" encoding="UTF-8"?><feed xmlns="http://www.w3.org/2005/Atom"><id>/x/.rss</id>${entries.join('')}</feed>`
const listing = (...children) => JSON.stringify({ data: { children } })

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

const scan = async () => {
    const found = []
    const progress = []
    const recovered = await withTimers(() =>
        restore.scanThreadForRemovedComments(
            POST,
            'sub',
            true,
            new Map(),
            p => progress.push(p),
            rc => found.push(rc),
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

    it('finds nothing in a page that is no feed', () => {
        expect(restore.parseFeed('<html><body>challenge</body></html>')).toEqual([])
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
        expect(last.message).toMatch(/^Rate limited by Reddit.* 1 recovered\.$/)
    })

    it('asks a logged-out browser to sign in, since the feeds allow it one request a minute', async () => {
        pages[threadPath] = { ok: false, status: 0, needsLogin: true }
        const { recovered, last } = await scan()
        expect(recovered).toEqual([])
        expect(asked).toHaveLength(1)
        expect(last).toMatchObject({ status: 'error' })
        expect(last.message).toMatch(/^Sign in to Reddit to scan/)
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
    const run = async id => {
        const progress = []
        const others = []
        const result = await withTimers(() =>
            restore.restoreComment(
                id,
                POST,
                'sub',
                true,
                p => progress.push(p),
                new Map(),
                rc => others.push(rc),
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
})

describe('the profile scan', () => {
    const query = 'sort=new&limit=100'
    const removedPost = { name: 't3_gone', is_robot_indexable: false }
    const scanProfile = async () => {
        const progress = []
        const results = await withTimers(() => restore.scanUserProfile('someone', p => progress.push(p)))
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
