import { describe, it, expect } from 'vitest'

import {
    parseProfileHtml,
    getPublicProfileItems,
    solveChallenge,
    buildTabUrl,
    buildPartialUrl,
    buildPostPageUrl,
    classifyPostPage,
    buildCommentPageUrl,
    classifyCommentPage,
    fullnameValue,
} from '../../src/src/parse_html/new'

// HTML fragments modeled on live www.reddit.com responses (verified 2026-07-01)

const b64 = s => Buffer.from(s).toString('base64')

const commentRow = (id, score, permalink) =>
    `<shreddit-comment-action-row class="block" comment-id="${id}" is-desktop-viewport="true" ` +
    `moderation-verdict="" permalink="${permalink}" score="${score}" slot="actionRow" ` +
    `telemetry-source="profile" user-id="" vote-state="NONE"></shreddit-comment-action-row>`

const thingIdEl = id => `<div thing-id="${id}" class="something"></div>`

const loadMoreObserver = cursorId =>
    `<shreddit-feed-load-more-observer cursor="${b64(cursorId)}"></shreddit-feed-load-more-observer>`

const emptyStatePage = type =>
    `<shreddit-feed navigation-session-id="x"><div>Welcome! u/someuser doesn&#x27;t have any ${type} yet, ` +
    `but check out their stats to learn more about them.</div></shreddit-feed>`

const challengePage =
    `<body class=theme-beta><form action="" method="get">` +
    `<input type="hidden" name="token" value="abc123token"/>` +
    `<input type="hidden" name="js_challenge" value="1"/></form>` +
    `<script>document.cookie; const solution = await(async e=>e+e)("dbl");</script></body>`

describe('parseProfileHtml', () => {
    it('extracts comment ids from thing-id attributes and action rows', () => {
        const html =
            thingIdEl('t1_aaa111') +
            commentRow('t1_aaa111', '91', '/r/test/comments/xyz/comment/aaa111/') +
            commentRow('t1_bbb222', '3', '/r/test/comments/xyz/comment/bbb222/')
        const page = parseProfileHtml(html, 't1_')
        expect(page.ids).toEqual(['t1_aaa111', 't1_bbb222'])
        expect(page.hasItems).toBe(true)
        expect(page.emptyState).toBe(false)
        expect(page.rows.get('t1_aaa111')).toEqual({
            score: 91,
            permalink: '/r/test/comments/xyz/comment/aaa111/',
        })
    })

    it('filters out ids of the wrong type (parent posts on the comments tab)', () => {
        const html = thingIdEl('t1_aaa111') + thingIdEl('t3_post11')
        expect(parseProfileHtml(html, 't1_').ids).toEqual(['t1_aaa111'])
        expect(parseProfileHtml(html, 't3_').ids).toEqual(['t3_post11'])
    })

    it('takes the last cursor on the page', () => {
        const html = thingIdEl('t1_aaa111') + loadMoreObserver('t1_zzz') + loadMoreObserver('t1_aaa111')
        expect(parseProfileHtml(html, 't1_').cursor).toBe(b64('t1_aaa111'))
    })

    it('recognizes the empty-profile state', () => {
        const page = parseProfileHtml(emptyStatePage('posts'), 't3_')
        expect(page.emptyState).toBe(true)
        expect(page.hasItems).toBe(false)
    })

    it('reports unrecognizable html as neither items nor empty state', () => {
        const page = parseProfileHtml('<html><body>error</body></html>', 't1_')
        expect(page.hasItems).toBe(false)
        expect(page.emptyState).toBe(false)
    })
})

describe('solveChallenge', () => {
    it('builds the solution url from the doubling puzzle and token', () => {
        const url = solveChallenge(challengePage, 'https://www.reddit.com/user/x/comments/?sort=new')
        expect(url).toBe(
            'https://www.reddit.com/user/x/comments/?sort=new&solution=dbldbl&js_challenge=1&token=abc123token',
        )
    })

    it('returns null for non-challenge pages', () => {
        expect(solveChallenge('<html>regular page</html>', 'https://www.reddit.com/')).toBe(null)
    })
})

describe('url builders', () => {
    it('builds tab and partial urls', () => {
        expect(buildTabUrl('some_user', 'comments')).toBe(
            'https://www.reddit.com/user/some_user/comments/?sort=new',
        )
        expect(buildTabUrl('some_user', 'posts')).toBe('https://www.reddit.com/user/some_user/submitted/?sort=new')
        expect(buildPartialUrl('some_user', 'comments', 'dDFfYWJj=')).toBe(
            'https://www.reddit.com/svc/shreddit/profiles/profile_comments-more-posts/new/' +
                '?sort=new&after=dDFfYWJj%3D&name=some_user&feedLength=8',
        )
        expect(buildPartialUrl('some_user', 'posts', 'x')).toContain('profile_posts-more-posts')
    })
})

describe('classifyPostPage', () => {
    // Modeled on the live held post page (verified 2026-07-01): the banner is
    // publicly visible inside the <shreddit-post> element.
    const postPage = (bannerHtml, title = 'testtest') =>
        `<html><body><shreddit-post class="block" permalink="/r/CantSayAnything/comments/1ukv6vb/testtest/" ` +
        `created-timestamp="2026-07-01T19:18:40.732000+0000" id="t3_1ukv6vb" post-title="${title}" ` +
        `score="1" subreddit-prefixed-name="r/CantSayAnything" author="GiveUsNetNeutrality" ` +
        `subreddit-name="CantSayAnything" moderation-verdict="">` +
        `<div slot="post-body">some body</div>${bannerHtml}</shreddit-post>` +
        `<shreddit-comment-tree><p>unrelated comment text</p></shreddit-comment-tree></body></html>`

    it('classifies a held post (awaiting moderator approval)', () => {
        const result = classifyPostPage(postPage('<div><span>Post is awaiting moderator approval.</span></div>'))
        expect(result.status).toBe('held')
        expect(result.author).toBe('GiveUsNetNeutrality')
        expect(result.title).toBe('testtest')
        expect(result.subreddit).toBe('CantSayAnything')
        expect(result.created_utc).toBe(Math.floor(Date.parse('2026-07-01T19:18:40.732000+0000') / 1000))
    })

    it('classifies removed-by-moderators and spam-filtered posts', () => {
        expect(classifyPostPage(postPage('<div>Sorry, this post was removed by the moderators.</div>')).status).toBe(
            'removed',
        )
        expect(classifyPostPage(postPage("<div>Removed by Reddit's spam filters.</div>")).status).toBe('removed')
    })

    it('classifies a normal post page as live', () => {
        expect(classifyPostPage(postPage('')).status).toBe('live')
    })

    it('ignores banner-like phrases in the comments below the post', () => {
        const html = postPage('') // live post
        const withComment = html.replace(
            'unrelated comment text',
            'my comment was removed by the moderators once',
        )
        expect(classifyPostPage(withComment).status).toBe('live')
    })

    it('returns unknown for pages without a shreddit-post element', () => {
        expect(classifyPostPage('<html><body>error page</body></html>').status).toBe('unknown')
    })

    it('builds post page urls from fullnames', () => {
        expect(buildPostPageUrl('t3_1ukv6vb')).toBe('https://www.reddit.com/comments/1ukv6vb/')
    })
})

describe('classifyCommentPage', () => {
    // Modeled on live comment permalink pages (verified 2026-07-20): live
    // comments render with the real author; removed/deleted comments are absent
    // from their own page, or present as an author="[deleted]" placeholder when
    // kept for their reply tree.
    const commentEl = (id, author) =>
        `<shreddit-comment created="2019-10-12T00:53:40.750000+0000" author="${author}" ` +
        `thingId="${id}" depth="0" comment-position="0" comment-parent-positions="[]" ` +
        `permalink="/r/test/comments/abc123/comment/${id.slice(3)}/" ` +
        `reload-url="/svc/shreddit/comment/${id}?depth=0&amp;subredditName=test" score="1">` +
        `<div slot="comment">some text</div></shreddit-comment>`

    // The tree element carries the focal comment's thingId even when that
    // comment is removed (live removed-page shape) — it must never be mistaken
    // for the comment element itself.
    const commentsPage = inner =>
        `<html><body><shreddit-post class="block" id="t3_abc123" author="someone" ` +
        `subreddit-name="test" permalink="/r/test/comments/abc123/title/"></shreddit-post>` +
        `<shreddit-comment-tree-stats total-comments="8" sort="NEW">` +
        `<shreddit-comment-tree id="comment-tree" thingId="t1_target1" post-id="t3_abc123" ` +
        `permalink="/r/test/comments/abc123/title/">${inner}</shreddit-comment-tree></body></html>`

    it('classifies a rendered comment with a real author as live', () => {
        const html = commentsPage(commentEl('t1_target1', 'SomeUser'))
        expect(classifyCommentPage(html, 't1_target1')).toBe('live')
    })

    it('classifies an author="[deleted]" placeholder as removed', () => {
        const html = commentsPage(commentEl('t1_target1', '[deleted]'))
        expect(classifyCommentPage(html, 't1_target1')).toBe('removed')
    })

    it('classifies absence from a valid comments page as removed', () => {
        // The page rendered (other comments present) but the target is gone —
        // matches the live removed-comment page: no element for the comment.
        const html = commentsPage(commentEl('t1_other11', 'SomeoneElse'))
        expect(classifyCommentPage(html, 't1_target1')).toBe('removed')
        expect(classifyCommentPage(commentsPage(''), 't1_target1')).toBe('removed')
    })

    it('accepts the thing-id attribute form', () => {
        const html = commentsPage(commentEl('t1_target1', 'SomeUser').replace('thingId=', 'thing-id='))
        expect(classifyCommentPage(html, 't1_target1')).toBe('live')
    })

    it('does not match a different comment id', () => {
        // t1_target1 must not match t1_target11's element
        const html = commentsPage(commentEl('t1_target11', 'SomeUser'))
        expect(classifyCommentPage(html, 't1_target1')).toBe('removed')
    })

    it('returns unknown for challenge or unrecognizable pages', () => {
        expect(classifyCommentPage(challengePage, 't1_target1')).toBe('unknown')
        expect(classifyCommentPage('<html><body>error page</body></html>', 't1_target1')).toBe('unknown')
    })

    it('returns unknown when the element matches but has no author attribute', () => {
        const html = commentsPage(`<shreddit-comment thingId="t1_target1" depth="0"></shreddit-comment>`)
        expect(classifyCommentPage(html, 't1_target1')).toBe('unknown')
    })

    it('builds comment page urls from fullnames', () => {
        expect(buildCommentPageUrl('t1_ouz0d47', 't3_1u1u4am')).toBe(
            'https://www.reddit.com/comments/1u1u4am/comment/ouz0d47/',
        )
    })
})

describe('getPublicProfileItems', () => {
    // ids chosen so base36 ordering is meaningful: newer ids have higher values
    const newestComment = 't1_zz999'
    const olderComment = 't1_mm500'
    const oldestComment = 't1_aa100'
    const post = 't3_pp900'

    const makeFetcher = pagesByUrlSubstring => {
        const calls = []
        const fetchHtml = async url => {
            calls.push(url)
            for (const [substr, html] of pagesByUrlSubstring) {
                if (url.includes(substr)) return html
            }
            throw new Error(`unexpected url: ${url}`)
        }
        fetchHtml.calls = calls
        return fetchHtml
    }

    it('collects items from both tabs and reports full coverage when enumerated to the end', async () => {
        const fetchHtml = makeFetcher([
            ['/comments/?sort=new', thingIdEl(newestComment) + commentRow(newestComment, '5', '/r/a/x/')],
            ['/submitted/?sort=new', thingIdEl(post)],
        ])
        const result = await getPublicProfileItems('user1', fetchHtml, [newestComment, post])
        expect(result.valid).toBe(true)
        expect(result.emptyProfile).toBe(false)
        expect([...result.items.keys()].sort()).toEqual([newestComment, post].sort())
        expect(result.items.get(newestComment).author).toBe('user1')
        expect(result.items.get(newestComment).score).toBe(5)
        // no cursor on either tab → fully enumerated
        expect(result.coverage).toEqual({ t1: 0, t3: 0 })
    })

    it('paginates through partials until needed ids are covered', async () => {
        const page1 = thingIdEl(newestComment) + loadMoreObserver(newestComment)
        const partial1 = thingIdEl(olderComment) + loadMoreObserver(olderComment)
        const fetchHtml = makeFetcher([
            ['/comments/?sort=new', page1],
            [`after=${encodeURIComponent(b64(newestComment))}`, partial1],
            ['/submitted/?sort=new', emptyStatePage('posts')],
        ])
        const result = await getPublicProfileItems('user1', fetchHtml, [newestComment, olderComment])
        expect(result.valid).toBe(true)
        expect(result.items.has(olderComment)).toBe(true)
        // stopped with a cursor still present → floor is the smallest id seen
        expect(result.coverage.t1).toBe(fullnameValue(olderComment))
        // posts tab empty-state → enumerated → covered
        expect(result.coverage.t3).toBe(0)
        // needed ids were covered after one partial → no further partial fetches
        expect(fetchHtml.calls.filter(u => u.includes('/svc/')).length).toBe(1)
    })

    it('leaves uncovered ids below the floor when the page budget runs out', async () => {
        const page1 = thingIdEl(newestComment) + loadMoreObserver(newestComment)
        const partial = thingIdEl(olderComment) + loadMoreObserver(olderComment)
        const fetchHtml = makeFetcher([
            ['/comments/?sort=new', page1],
            ['/svc/', partial], // every partial returns the same page (cursor never advances past olderComment)
            ['/submitted/?sort=new', emptyStatePage('posts')],
        ])
        const result = await getPublicProfileItems('user1', fetchHtml, [oldestComment], 2)
        expect(result.valid).toBe(true)
        // oldestComment value < floor → not covered
        expect(fullnameValue(oldestComment)).toBeLessThan(result.coverage.t1)
        expect(result.items.has(oldestComment)).toBe(false)
    })

    it('flags a fully empty profile (shadowban signature)', async () => {
        const fetchHtml = makeFetcher([
            ['/comments/?sort=new', emptyStatePage('comments')],
            ['/submitted/?sort=new', emptyStatePage('posts')],
        ])
        const result = await getPublicProfileItems('user1', fetchHtml, ['t1_abc'])
        expect(result.valid).toBe(true)
        expect(result.emptyProfile).toBe(true)
        expect(result.items.size).toBe(0)
        expect(result.coverage).toEqual({ t1: 0, t3: 0 })
    })

    it('reports invalid when a page is unrecognizable and the challenge cannot be solved', async () => {
        const fetchHtml = makeFetcher([
            ['/comments/?sort=new', '<html><body>totally different page</body></html>'],
            ['/submitted/?sort=new', emptyStatePage('posts')],
        ])
        const result = await getPublicProfileItems('user1', fetchHtml, ['t1_abc'])
        expect(result.valid).toBe(false)
    })

    it('solves the js challenge and retries once', async () => {
        let commentsCalls = 0
        const fetchHtml = async url => {
            if (url.includes('/comments/')) {
                commentsCalls++
                if (url.includes('js_challenge=1')) {
                    expect(url).toContain('solution=dbldbl')
                    return thingIdEl(newestComment)
                }
                return challengePage
            }
            return emptyStatePage('posts')
        }
        const result = await getPublicProfileItems('user1', fetchHtml, [newestComment])
        expect(result.valid).toBe(true)
        expect(result.items.has(newestComment)).toBe(true)
        expect(commentsCalls).toBe(2)
    })

    it('returns invalid (not empty-approved) when fetch throws', async () => {
        const fetchHtml = async () => {
            throw new Error('network down')
        }
        const result = await getPublicProfileItems('user1', fetchHtml, ['t1_abc'])
        expect(result.valid).toBe(false)
        expect(result.error).toContain('network down')
        expect(result.coverage.t1).toBe(Infinity)
    })

    it('reports a feed-present post so the caller can apply the auth removal signal', async () => {
        // Regression: a held/spam-removed post lingers in the public feed. The
        // parser must still report it present (name/author only); the caller
        // decides removal from the authenticated is_robot_indexable signal.
        const fetchHtml = makeFetcher([
            ['/comments/?sort=new', emptyStatePage('comments')],
            ['/submitted/?sort=new', thingIdEl(post)],
        ])
        const result = await getPublicProfileItems('user1', fetchHtml, [post])
        expect(result.valid).toBe(true)
        expect(result.items.has(post)).toBe(true)
        expect(result.items.get(post).author).toBe('user1')
    })
})
