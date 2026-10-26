import { describe, it, expect, afterEach } from 'vitest'
import { setChallengeConfig, resetChallengeConfig, sanitizeChallengeConfig } from '../../src/src/challenge-config'
import { sanitizeMarkupConfig, setMarkupConfig, getMarkupConfig } from '../../src/src/markup-config'

import {
    parseProfileHtml,
    getPublicProfileItems,
    solveChallenge,
    buildTabUrl,
    buildPartialUrl,
    buildPostPageUrl,
    classifyPostPage,
    buildCommentPageUrl,
    buildCommentThreadUrl,
    buildCommentPartialUrl,
    classifyCommentPage,
    describePageForDiag,
    fullnameValue,
    isCaptchaPage,
    isSolvedChallengeUrl,
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

// Shape served since 2026-08-31: hidden GET form, token renamed jsc_token, plus
// an (empty) jsc_orig_r field that must be echoed back.
const challengePageJsc =
    `<script nonce="n">const solution = await(async e=>e+e)("c0d4");</script>` +
    `<form hidden method="GET" action="/user/x/comments/">` +
    `<input type="hidden" name="solution" />` +
    `<input type="hidden" name="js_challenge" value="1"/>` +
    `<input type="hidden" name="jsc_token" value="7afd7253"/>` +
    `<input type="hidden" name="jsc_orig_r" value=""/></form>`

// The logged-out front page, trimmed from one served 2026-10-17. Issue #14's
// log had reddit serve it in place of a permalink. An ad's overflow menu comes
// first, the feed lists other posts as <shreddit-post> items, and there is no
// comment tree.
const frontPage =
    `<html><head><link rel="canonical" href="https://www.reddit.com/">` +
    `<title>Reddit - The heart of the internet</title></head><body>` +
    `<shreddit-post-overflow-menu is-desktop-viewport is-ad post-id="t3_ad1" placement="sidebars">` +
    `</shreddit-post-overflow-menu>` +
    `<shreddit-feed><article><shreddit-post permalink="/r/delta/comments/feed1/a_title/" ` +
    `view-context="AggregateFeed" feedIndex="0" created-timestamp="2026-10-17T18:55:37.273000+0000" ` +
    `id="t3_feed1" post-title="A feed post" post-type="image" author="someone" subreddit-name="delta">` +
    `<shreddit-post-flair></shreddit-post-flair></shreddit-post></article>` +
    `<article><shreddit-post permalink="/r/pics/comments/feed2/b_title/" view-context="AggregateFeed" ` +
    `feedIndex="1" id="t3_feed2" post-title="Another" author="someone_else" subreddit-name="pics">` +
    `</shreddit-post></article></shreddit-feed></body></html>`

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

    it('solves the jsc_token form shape and echoes jsc_orig_r', () => {
        const url = solveChallenge(challengePageJsc, 'https://www.reddit.com/user/x/comments/?sort=new')
        expect(url).toBe(
            'https://www.reddit.com/user/x/comments/?sort=new&solution=c0d4c0d4&js_challenge=1' +
                '&jsc_token=7afd7253&jsc_orig_r=',
        )
    })

    it('returns null when the puzzle is present but no token field is', () => {
        const noToken = challengePageJsc.replace(/<input[^>]*jsc_token[^>]*>/, '')
        expect(solveChallenge(noToken, 'https://www.reddit.com/user/x/comments/')).toBe(null)
    })
})

describe('url builders', () => {
    it('builds tab and partial urls', () => {
        expect(buildTabUrl('some_user', 'comments')).toBe('https://www.reddit.com/user/some_user/comments/?sort=new')
        expect(buildTabUrl('some_user', 'posts')).toBe('https://www.reddit.com/user/some_user/submitted/?sort=new')
        expect(buildPartialUrl('some_user', 'comments', 'dDFfYWJj=')).toBe(
            'https://www.reddit.com/svc/shreddit/profiles/profile_comments-more-posts/new/' +
                '?sort=new&after=dDFfYWJj%3D&name=some_user&feedLength=8',
        )
        expect(buildPartialUrl('some_user', 'posts', 'x')).toContain('profile_posts-more-posts')
    })
})

describe('classifyPostPage', () => {
    // Modeled on the live held post page (verified 2026-07-01, and again
    // 2026-10-26): the banner is publicly visible inside the <shreddit-post>
    // element, in its own slot, after the title heading and the flair.
    const postPage = (bannerHtml, title = 'testtest', body = 'some body') =>
        `<html><body><shreddit-post class="block" permalink="/r/CantSayAnything/comments/1ukv6vb/testtest/" ` +
        `created-timestamp="2026-07-01T19:18:40.732000+0000" id="t3_1ukv6vb" post-title="${title}" ` +
        `score="1" subreddit-prefixed-name="r/CantSayAnything" author="GiveUsNetNeutrality" ` +
        `subreddit-name="CantSayAnything" moderation-verdict="">` +
        `<h1 id="post-title-t3_1ukv6vb" slot="title" aria-label="Post Title: ${title}"> ${title} </h1>` +
        `<shreddit-post-flair slot="post-flair" post-id="t3_1ukv6vb"></shreddit-post-flair>` +
        (bannerHtml ? `<div slot="post-removed-banner">${bannerHtml}</div>` : '') +
        `<shreddit-post-text-body slot="text-body" post-id="t3_1ukv6vb"><div class="text-neutral-content" slot="text-body">` +
        `<div class="md"><p>${body}</p></div></div></shreddit-post-text-body></shreddit-post>` +
        `<shreddit-comment-tree><p>unrelated comment text</p></shreddit-comment-tree></body></html>`

    const POST = 't3_1ukv6vb'

    it('classifies a held post (awaiting moderator approval)', () => {
        const result = classifyPostPage(postPage('<div><span>Post is awaiting moderator approval.</span></div>'), POST)
        expect(result.status).toBe('held')
        expect(result.author).toBe('GiveUsNetNeutrality')
        expect(result.title).toBe('testtest')
        expect(result.subreddit).toBe('CantSayAnything')
        expect(result.created_utc).toBe(Math.floor(Date.parse('2026-07-01T19:18:40.732000+0000') / 1000))
    })

    it('classifies removed-by-moderators and spam-filtered posts', () => {
        expect(
            classifyPostPage(postPage('<div>Sorry, this post was removed by the moderators.</div>'), POST).status,
        ).toBe('removed')
        expect(classifyPostPage(postPage("<div>Removed by Reddit's spam filters.</div>"), POST).status).toBe('removed')
    })

    it('classifies a normal post page as live', () => {
        expect(classifyPostPage(postPage(''), POST).status).toBe('live')
    })

    it('ignores banner-like phrases in the comments below the post', () => {
        const html = postPage('') // live post
        const withComment = html.replace('unrelated comment text', 'my comment was removed by the moderators once')
        expect(classifyPostPage(withComment, POST).status).toBe('live')
    })

    it("reads a live post as live although its own title or body uses a banner's words", () => {
        // Reveddit users write exactly these posts. 0.0.5.27 read the title
        // attribute and the body and sent a false removal alert.
        for (const title of [
            'Why was my post removed by moderators?',
            'Removed by Reddit with no reason given',
            'Is my post awaiting moderator approval forever?',
            'Deleted by user, or removed by the moderators?',
        ]) {
            expect(classifyPostPage(postPage('', title), POST).status).toBe('live')
        }
        for (const body of ['I got banned from this community', 'this community is private now', "reddit's spam filters ate it"]) {
            expect(classifyPostPage(postPage('', 'a question', body), POST).status).toBe('live')
        }
    })

    it('still reads the banner when the title uses its words too', () => {
        const page = postPage('<span> Post is awaiting moderator approval. </span>', 'Why was my post removed by moderators?')
        expect(classifyPostPage(page, POST).status).toBe('held')
    })

    it('reads any removal wording in the banner, so a reworded one still reads removed', () => {
        for (const banner of [
            'Sorry, this post has been removed by the moderators of r/x.',
            'This post was removed for violating the rules.',
            "Removed by Reddit's filters",
            'Sorry, this post was deleted by the person who originally posted it.',
        ]) {
            expect(classifyPostPage(postPage(`<span>${banner}</span>`), POST).status).toBe('removed')
        }
    })

    it('reads a banner nested several elements deep in its slot', () => {
        const banner =
            '<span class="flex"><svg><path d="M0"></path></svg>' +
            '<span class="flex"><div><div>Sorry, this post was removed by the moderators of r/x.</div></div></span></span>'
        expect(classifyPostPage(postPage(banner), POST).status).toBe('removed')
    })

    it('returns unknown for pages without a shreddit-post element', () => {
        expect(classifyPostPage('<html><body>error page</body></html>', POST).status).toBe('unknown')
    })

    it('returns unknown when the page is another post', () => {
        expect(classifyPostPage(postPage(''), 't3_other1').status).toBe('unknown')
    })

    it('returns unknown, not live, for the front page served in place of the post', () => {
        expect(classifyPostPage(frontPage, POST).status).toBe('unknown')
    })

    it('reads a post from its own element, never an overflow menu or flair', () => {
        // a post that is on the front page is read from its feed item
        const result = classifyPostPage(frontPage, 't3_feed1')
        expect(result.status).toBe('live')
        expect(result.author).toBe('someone')
        expect(classifyPostPage(frontPage, 't3_ad1').status).toBe('unknown')
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

    it('returns unknown, not removed, for the front page served in place of the permalink', () => {
        expect(classifyCommentPage(frontPage, 't1_target1')).toBe('unknown')
    })

    it('reads absence as removed only on the thread served for that comment', () => {
        // the tree names t1_target1, so it says nothing about another comment
        expect(classifyCommentPage(commentsPage(''), 't1_elsewhere')).toBe('unknown')
    })

    // The /svc partial as served 2026-10-17: no <shreddit-post> and no
    // canonical link; the tree names the focal comment, a removed one too.
    const partial = inner =>
        `<faceplate-loader name="TopCommentsPermalink" loading="eager"></faceplate-loader>` +
        `<shreddit-comment-tree-ads></shreddit-comment-tree-ads>` +
        `<shreddit-comment-tree-stats total-comments="20" sort="CONFIDENCE"></shreddit-comment-tree-stats>` +
        `<shreddit-comment-tree id="comment-tree" thingId="t1_target1" post-id="t3_abc123" totalComments="20" ` +
        `permalink="/r/test/comments/abc123/title/" ui="desktop">${inner}</shreddit-comment-tree>`

    it('reads the /svc partial like the full page', () => {
        expect(classifyCommentPage(partial(commentEl('t1_target1', 'SomeUser')), 't1_target1')).toBe('live')
        expect(classifyCommentPage(partial(commentEl('t1_target1', '[deleted]')), 't1_target1')).toBe('removed')
        expect(classifyCommentPage(partial(commentEl('t1_other11', 'SomeoneElse')), 't1_target1')).toBe('removed')
        expect(classifyCommentPage(partial(''), 't1_target1', 'unknown')).toBe('unknown')
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

    it('a refused pagination partial stops pagination with what was collected, and says so', async () => {
        const page1 = thingIdEl(newestComment) + loadMoreObserver(newestComment)
        const fetchHtml = async url => {
            if (url.includes('/svc/')) throw new Error('www.reddit.com request refused: captcha (refused: ...)')
            if (url.includes('/comments/?sort=new')) return page1
            return emptyStatePage('posts')
        }
        const result = await getPublicProfileItems('user1', fetchHtml, [newestComment, olderComment])
        expect(result.valid).toBe(true)
        expect(result.items.has(newestComment)).toBe(true)
        // coverage ends where pagination stopped
        expect(result.coverage.t1).toBe(fullnameValue(newestComment))
        expect(result.paginationStopped).toMatch(/^comments pagination stopped: .*captcha/)
    })

    it('a partial no route could read (the page the fetcher hands back) stops pagination and says so', async () => {
        const page1 = thingIdEl(newestComment) + loadMoreObserver(newestComment)
        const fetchHtml = async url => {
            if (url.includes('/svc/')) return frontPage
            if (url.includes('/comments/?sort=new')) return page1
            return emptyStatePage('posts')
        }
        const result = await getPublicProfileItems('user1', fetchHtml, [newestComment, olderComment])
        expect(result.valid).toBe(true)
        expect(result.coverage.t1).toBe(fullnameValue(newestComment))
        expect(result.paginationStopped).toMatch(/^comments pagination stopped: unreadable page: /)
    })

    it("the small fragment that ends a profile isn't a stop", async () => {
        const page1 = thingIdEl(newestComment) + loadMoreObserver(newestComment)
        const fetchHtml = async url => {
            if (url.includes('/svc/')) return '<div></div>'
            if (url.includes('/comments/?sort=new')) return page1
            return emptyStatePage('posts')
        }
        const result = await getPublicProfileItems('user1', fetchHtml, [newestComment, olderComment])
        expect(result.paginationStopped).toBeUndefined()
    })

    it("a 429 on either tab reaches the caller when the other tab failed another way", async () => {
        const fetchHtml = async url => {
            if (url.includes('/comments/?sort=new')) throw new Error('www.reddit.com request failed: 404')
            throw new Error('www.reddit.com request failed: 429')
        }
        const result = await getPublicProfileItems('user1', fetchHtml, [newestComment])
        expect(result.valid).toBe(false)
        expect(result.error).toMatch(/request failed: 429/)
        expect(result.missing).toBeUndefined()
    })

    it('both tabs a 404: the profile is missing', async () => {
        const fetchHtml = async () => {
            throw new Error('www.reddit.com request failed: 404')
        }
        expect((await getPublicProfileItems('user1', fetchHtml, [newestComment])).missing).toBe(true)
    })

    it('a 429 on a pagination partial still fails the lookup, so monitoring backs off', async () => {
        const page1 = thingIdEl(newestComment) + loadMoreObserver(newestComment)
        const fetchHtml = async url => {
            if (url.includes('/svc/')) throw new Error('www.reddit.com request failed: 429')
            if (url.includes('/comments/?sort=new')) return page1
            return emptyStatePage('posts')
        }
        const result = await getPublicProfileItems('user1', fetchHtml, [newestComment, olderComment])
        expect(result.valid).toBe(false)
        expect(result.error).toMatch(/429/)
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

    it('says why a tab is invalid, for the diagnostic log', async () => {
        const unsolvable = await getPublicProfileItems(
            'user1',
            makeFetcher([
                ['/comments/?sort=new', '<html><head><title>Reddit</title></head><body>something else</body></html>'],
                ['/submitted/?sort=new', emptyStatePage('posts')],
            ]),
            ['t1_abc'],
        )
        expect(unsolvable.error).toMatch(/^comments page unrecognized: bytes=\d+ challenge=0 scaffold=0 title="Reddit"/)

        const walledAfterSolve = await getPublicProfileItems(
            'user1',
            async url => {
                if (!url.includes('/submitted/')) return emptyStatePage('comments')
                return url.includes('js_challenge=1') ? '<html>still something else</html>' : challengePage
            },
            ['t1_abc'],
        )
        expect(walledAfterSolve.valid).toBe(false)
        expect(walledAfterSolve.error).toMatch(/^posts page unrecognized after challenge solve: bytes=\d+/)
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

describe('buildCommentPartialUrl', () => {
    it('builds the svc partial URL from a standard comment permalink', () => {
        const url = buildCommentPartialUrl(
            '/r/CantSayAnything/comments/1u1u4am/write_any_comment_here_20260610/p36brqf/',
            't1_p36brqf',
        )
        expect(url).toBe(
            'https://www.reddit.com/svc/shreddit/comments/r/CantSayAnything/1u1u4am/p36brqf?render-mode=partial',
        )
    })

    it('returns null for permalinks that do not carry a subreddit thread path', () => {
        expect(buildCommentPartialUrl('/user/someone/comments/abc/title/', 't1_x')).toBe(null)
        expect(buildCommentPartialUrl('', 't1_x')).toBe(null)
    })
})

// What the API's comment permalink form returned on 2026-10-17, trimmed: a
// script redirect to the site's form, with no comment tree and no post
const redirectShell =
    `<html><head><title>Reddit - The heart of the internet</title></head><body>` +
    `<div id="canonical-url-updater" value="https://www.reddit.com/r/delta/comments/1x8b2za/a_title/"></div>` +
    `<div id="shreddit-redirect"><ac-call delay="0" ` +
    `method="location.replace(&quot;/r/delta/comments/1x8b2za/comment/phb7gaf/&quot;)" target="window" ` +
    `trigger="init"></ac-call></div></body></html>`

describe('buildCommentThreadUrl', () => {
    it("builds the site's comment page URL from the API's permalink form", () => {
        expect(
            buildCommentThreadUrl(
                '/r/CantSayAnything/comments/1u1u4am/write_any_comment_here_20260610/p36brqf/',
                't1_p36brqf',
            ),
        ).toBe('https://www.reddit.com/r/CantSayAnything/comments/1u1u4am/comment/p36brqf/')
    })

    it("keeps a permalink already in the site's form", () => {
        expect(buildCommentThreadUrl('/r/delta/comments/1x8b2za/comment/phb7gaf/', 't1_phb7gaf')).toBe(
            'https://www.reddit.com/r/delta/comments/1x8b2za/comment/phb7gaf/',
        )
    })

    it('returns null for permalinks that do not carry a subreddit thread path', () => {
        expect(buildCommentThreadUrl('/user/someone/comments/abc/title/', 't1_x')).toBe(null)
        expect(buildCommentThreadUrl('', 't1_x')).toBe(null)
    })

    it("can't read a comment from the API permalink's redirect shell", () => {
        expect(classifyCommentPage(redirectShell, 't1_phb7gaf')).toBe('unknown')
    })
})

describe('describePageForDiag wall tags', () => {
    it('tags a redirect shell without logging where it points', () => {
        const d = describePageForDiag(redirectShell)
        expect(d).toContain('shell=redirect')
        expect(d).toContain('scaffold=0')
        expect(d).not.toContain('1x8b2za')
    })

    it('names the captcha interstitial', () => {
        const d = describePageForDiag('<html><title>Reddit - Prove your humanity</title></html>')
        expect(d).toContain('wall=captcha')
    })

    it('shows which page was served, so a front page in place of a permalink reads canonical="/"', () => {
        const d = describePageForDiag(
            '<html><head><link rel="canonical" href="https://www.reddit.com/"/>' +
                '<title>Reddit - The heart of the internet</title></head></html>',
        )
        expect(d).toContain('canonical="/"')
    })

    it("doesn't take reddit's generic title for the front page", () => {
        // by 2026-10 real thread pages carried the front page's title too
        const d = describePageForDiag(
            '<html><head><title>Reddit - The heart of the internet</title>' +
                '<link href="https://www.reddit.com/r/sub/comments/abc/t/" rel="canonical"></head>' +
                '<shreddit-post></shreddit-post></html>',
        )
        expect(d).not.toContain('wall=')
        expect(d).toContain('canonical="/r/sub/comments/abc/t/"')
    })

    it('adds no wall tag to ordinary pages', () => {
        const d = describePageForDiag('<html><title>Some thread title</title><shreddit-post></shreddit-post></html>')
        expect(d).not.toContain('wall=')
        expect(d).not.toContain('shell=')
        expect(d).toContain('scaffold=1')
    })
})

// Reddit renamed the challenge's token field once; the id attributes the page
// classifiers read can come from the news feed too (options.markup)
describe('markup config', () => {
    afterEach(() => setMarkupConfig({}))

    it('sanitizes the feed object: valid attribute names only, each once', () => {
        expect(
            sanitizeMarkupConfig({
                comment_id_attributes: ['data-fullname', 'bad name', 'data-fullname', 3, '<x>'],
                post_id_attributes: 'id',
            }),
        ).toEqual({ commentIdAttributes: ['data-fullname'] })
        expect(sanitizeMarkupConfig(null)).toEqual({})
        expect(
            sanitizeMarkupConfig({
                comment_id_attributes: Array(20)
                    .fill(0)
                    .map((_, i) => `a${i}`),
            }).commentIdAttributes,
        ).toHaveLength(8)
    })

    it('adds names to the built-in ones, which always stay', () => {
        setMarkupConfig({ commentIdAttributes: ['data-fullname'] })
        expect(getMarkupConfig().commentIdAttributes).toEqual(['data-fullname', 'thingId', 'thing-id'])
        expect(getMarkupConfig().postIdAttributes).toEqual(['id'])
        setMarkupConfig({})
        expect(getMarkupConfig().commentIdAttributes).toEqual(['thingId', 'thing-id'])
    })

    it('a renamed id attribute reads once the feed names it', () => {
        const page =
            `<html><body><shreddit-post id="t3_abc123" author="someone"></shreddit-post>` +
            `<shreddit-comment-tree data-fullname="t1_target1" post-id="t3_abc123">` +
            `<shreddit-comment data-fullname="t1_target1" author="SomeUser"></shreddit-comment>` +
            `</shreddit-comment-tree></body></html>`
        expect(classifyCommentPage(page, 't1_target1')).toBe('unknown')
        setMarkupConfig({ commentIdAttributes: ['data-fullname'] })
        expect(classifyCommentPage(page, 't1_target1')).toBe('live')
    })

    it('reads a post by a renamed id attribute too', () => {
        const page =
            `<html><body><shreddit-post post-id="t3_abc123" author="someone" subreddit-name="s">` +
            `<div slot="post-removed-banner">Post is awaiting moderator approval.</div></shreddit-post></body></html>`
        expect(classifyPostPage(page, 't3_abc123').status).toBe('unknown')
        setMarkupConfig({ postIdAttributes: ['post-id'] })
        expect(classifyPostPage(page, 't3_abc123').status).toBe('held')
    })

    it('reads a banner from a renamed slot too', () => {
        const page =
            `<html><body><shreddit-post id="t3_abc123" author="someone" subreddit-name="s">` +
            `<div slot="post-status-banner">Post is awaiting moderator approval.</div></shreddit-post></body></html>`
        expect(classifyPostPage(page, 't3_abc123').status).toBe('live')
        setMarkupConfig(sanitizeMarkupConfig({ post_banner_slots: ['post-status-banner'] }))
        expect(classifyPostPage(page, 't3_abc123').status).toBe('held')
    })
})

// Fixes from the 0.0.5.27 review (2026-10-22), applied 2026-10-24
describe('0.0.5.27 review fixes', () => {
    afterEach(() => setMarkupConfig({}))

    it('an id matches under any configured name, not only the first one present', () => {
        setMarkupConfig({ commentIdAttributes: ['data-x'] })
        const page =
            `<html><body><shreddit-comment-tree thingId="t1_target1">` +
            `<shreddit-comment data-x="something-else" thingId="t1_target1" author="SomeUser"></shreddit-comment>` +
            `</shreddit-comment-tree></body></html>`
        expect(classifyCommentPage(page, 't1_target1')).toBe('live')
    })

    it("a configured name such as 'constructor' doesn't shadow the built-in names", () => {
        setMarkupConfig({ commentIdAttributes: ['constructor'] })
        const page =
            `<html><body><shreddit-comment-tree thingId="t1_target1">` +
            `<shreddit-comment thingId="t1_target1" author="SomeUser"></shreddit-comment>` +
            `</shreddit-comment-tree></body></html>`
        expect(classifyCommentPage(page, 't1_target1')).toBe('live')
    })

    it('only a page whose first title is the captcha counts as the captcha', () => {
        expect(isCaptchaPage('<html><head><title>Reddit - Prove your humanity</title></head></html>')).toBe(true)
        expect(isCaptchaPage('<title>\n  Prove your humanity\n</title>')).toBe(true)
        expect(isCaptchaPage('<title>Prove your humanity in 5 steps : r/test</title>')).toBe(false)
        expect(isCaptchaPage('<title>A thread</title><svg><title>Prove your humanity</title></svg>')).toBe(false)
    })

    it('knows a URL the challenge solver produced', () => {
        expect(isSolvedChallengeUrl('https://www.reddit.com/user/x/?sort=new&solution=aa&js_challenge=1&token=t')).toBe(
            true,
        )
        expect(isSolvedChallengeUrl('https://www.reddit.com/user/x/?sort=new')).toBe(false)
    })

    it('accepts the small empty fragment that can end a profile, and not a whole page without items', async () => {
        const judged = []
        const fetchHtml = async (url, accept) => {
            let html
            if (url.includes('/comments/?sort=new')) html = thingIdEl('t1_zz999') + loadMoreObserver('t1_zz999')
            else if (url.includes('/submitted/?sort=new')) html = thingIdEl('t3_pp900')
            else html = url.includes('after=') && judged.length ? '<html><body>front page</body></html>' : ''
            if (url.includes('/svc/') && accept) judged.push(accept(html))
            return html
        }
        await getPublicProfileItems('u', fetchHtml, ['t1_aa100'], 1)
        expect(judged[0]).toBe(true)
    })
})
