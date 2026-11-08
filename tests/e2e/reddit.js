// What the Reddit-page tests share: fixtures that need the service worker, stand-ins for Reddit's
// new pages, and the markup and feeds the comment-scan tests build on.

import { test as base } from './fixtures.js'

export { expect } from './fixtures.js'

export const test = base.extend({
    seedOwnRemoved: async ({ worker }, use) => {
        await use(id =>
            worker.evaluate(
                id =>
                    Promise.all([
                        chrome.storage.local.set({ last_logged_in_user: 'someone' }),
                        chrome.storage.sync.set({ removed_u_someone: { [id]: { a: 1 } } }),
                    ]),
                id,
            ),
        )
    },
    // A login, and reddit's answers in the background, which sends everything else away.
    // The answers go in first: the login starts a check, which mustn't reach reddit
    // and learn its refusals.
    answerAs: async ({ context, worker, setOptions }, use) => {
        await use(async answers => {
            await worker.evaluate(answers => {
                self.asked = []
                self.feedsAt = []
                self.fetch = async url => {
                    const path = String(url).replace('https://www.reddit.com', '')
                    self.asked.push(path)
                    if (path.includes('.rss')) self.feedsAt.push(Date.now())
                    const answer = answers[path]
                    return new Response(answer ?? '', { status: answer === undefined ? 404 : 200 })
                }
            }, answers)
            await context.addCookies([{ name: 'reddit_session', value: 'x', domain: '.reddit.com', path: '/' }])
            await setOptions({ scan_seconds_between_reads: 1, scan_reads_per_click: 50 })
        })
    },
    // What scans sent, not the login checks monitoring sends alongside them
    askedFor: async ({ worker }, use) => {
        await use(() =>
            worker.evaluate(() => self.asked.filter(path => /\.rss|\/(comments|submitted)\.json/.test(path))),
        )
    },
    followed: async ({ worker }, use) => {
        await use(async () => {
            const { other_subscriptions } = await worker.evaluate(() => chrome.storage.sync.get('other_subscriptions'))
            return Object.keys(other_subscriptions)
        })
    },
})

// Reddit's own pages turn headless browsers away, so these pages are stand-ins
// with the shape of real ones (read 2026-11-04). The content script can't tell.
export const POST = 't3_abc123'
export const THREAD = '/r/pics/comments/abc123/a_title/'
// The title is why a post's own words must not count
export const postElement = (id, { banner, author = 'someone' } = {}) =>
    `<shreddit-post id="${id}" author="${author}" permalink="/r/pics/comments/${id.slice(3)}/a_title/">` +
    `<h1 slot="title">Why was my post removed by moderators?</h1>` +
    (banner ? `<div slot="post-removed-banner"><span>${banner}</span></div>` : '') +
    `</shreddit-post>`
export const open = async (context, url, html) => {
    await context.route(url, route => route.fulfill({ contentType: 'text/html', body: html }))
    const page = await context.newPage()
    await page.goto(url)
    return page
}
export const openNewReddit = (context, path, main) =>
    open(
        context,
        `https://www.reddit.com${path}`,
        `<!doctype html><html device="desktop"><body><shreddit-app><div>` +
            `<main id="main-content">${main}</main></div></shreddit-app></body></html>`,
    )
// Long enough for the content script's first look
export const settle = page => page.waitForTimeout(700)

// Reddit's router, as measured 2026-11-04: the address changes first, then
// one element under shreddit-app is replaced whole, and on a first visit a
// post's comments arrive after it. Back and forward put the same elements back.
export const startRouter = page =>
    page.evaluate(() => {
        const app = document.querySelector('shreddit-app')
        const left = {}
        let shown = location.pathname
        const show = element => {
            left[shown] = app.firstElementChild
            shown = location.pathname
            app.replaceChildren(element)
        }
        window.addEventListener('popstate', () => setTimeout(() => show(left[location.pathname]), 20))
        window.visit = (path, main, comments) => {
            history.pushState({}, '', path)
            setTimeout(() => {
                const element = document.createElement('div')
                element.innerHTML = `<main id="main-content">${main}</main>`
                show(element)
                if (comments) setTimeout(() => element.querySelector('main').append(comments), 200)
            }, 20)
        }
    })
export const visit = (page, path, main, comments) =>
    page.evaluate(
        ([path, main, comments]) => {
            const late = comments && document.createRange().createContextualFragment(comments)
            window.visit(path, main, late)
        },
        [path, main, comments],
    )

export const FIRST = 't1_first'
export const REPLY = 't1_reply'
export const REMOVED = 't1_removed'
export const SCAN = '.rev-scan-comment-btn'
export const RESTORE = '.rev-restore-btn'
export const RECOVERED = '.rev-inserted-comment'
export const NOW = new Date().toISOString()

// The markup read 2026-11-04: a comment's parts sit deep inside <details>, its
// replies in its own #comment-children, and a removed comment has no slotted
// body and starts collapsed.
export const comment = (id, { author = 'someone', parent, text = 'Words', replies = '' } = {}) =>
    `<shreddit-comment thingid="${id}" postid="${POST}" author="${author}" created="${NOW}" ${parent ? `parentid="${parent}"` : ''}>` +
    `<details role="article" ${author === '[deleted]' ? '' : 'open'}><summary><div slot="commentMeta">${author}</div></summary><div class="grid">` +
    `<div class="col-start-2">${
        author === '[deleted]'
            ? '<div class="md"><div><p class="text-neutral-content-weak">Comment removed by moderator</p></div></div>'
            : `<div class="md" slot="comment"><div><p>${text}</p></div></div>`
    }</div>` +
    `<div class="col-start-2"><div class="min-h-xl" slot="actionRow"></div></div>` +
    `<div id="comment-children">${replies}</div></div></details></shreddit-comment>`
export const removedWithReply = comment(REMOVED, {
    author: '[deleted]',
    parent: FIRST,
    replies: comment(REPLY, { parent: REMOVED, author: 'replier' }),
})
export const thread = (...comments) =>
    postElement(POST, { author: 'op' }).replace('<shreddit-post', '<shreddit-post comment-count="5"') +
    `<shreddit-comment-tree id="comment-tree"><section>${comments.join('')}</section></shreddit-comment-tree>`

// Reddit stamps a comment's row when the comment comes into view
export const stampRows = page =>
    page.evaluate(() => {
        for (const place of document.querySelectorAll('shreddit-comment [slot="actionRow"]:empty')) {
            const row = document.createElement('shreddit-comment-action-row')
            row.setAttribute('slot', 'actionRow')
            row.innerHTML = '<button slot="comment-share">Share</button>'
            place.append(row)
        }
    })
export const buttonOf = (page, id) => page.locator(`shreddit-comment-action-row:has(> ${SCAN})`).and(rowOf(page, id))
export const rowOf = (page, id) =>
    page.locator(`[thingid="${id}"] > details > .grid > div > [slot="actionRow"] > shreddit-comment-action-row`)

export const entry = (id, author, body) =>
    `<entry>${author ? `<author><name>/u/${author}</name></author>` : ''}<content type="html">` +
    `&lt;div class=&quot;md&quot;&gt;&lt;p&gt;${body}&lt;/p&gt;&lt;/div&gt;</content><id>${id}</id>` +
    `<link href="https://www.reddit.com/r/pics/comments/abc123/a_title/${id.slice(3)}/"/>` +
    `<updated>${NOW}</updated><title>/u/${author} on A title</title></entry>`
export const feed = (...entries) => `<feed xmlns="http://www.w3.org/2005/Atom">${entries.join('')}</feed>`
export const threadFeed = feed(
    entry(POST, 'op', 'The post'),
    entry(FIRST, 'someone', 'Words'),
    entry(REMOVED, null, '[deleted]'),
    entry(REPLY, 'replier', 'Words'),
)
export const userFeed = name => `/user/${name}/comments/.rss?sort=new&limit=100`

export const THREAD_FEED_PATH = '/r/pics/comments/abc123/.rss?limit=500'
export const THE_REMOVED_WORDS = {
    [THREAD_FEED_PATH]: threadFeed,
    [userFeed('op')]: feed(),
    [userFeed('someone')]: feed(entry(REMOVED, 'someone', 'The removed words')),
    [userFeed('replier')]: feed(),
}
export const removedAtTop = comment(REMOVED, {
    author: '[deleted]',
    replies: comment(REPLY, { parent: REMOVED, author: 'replier' }),
})
