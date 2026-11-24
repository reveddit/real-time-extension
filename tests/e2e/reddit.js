// What the Reddit-page tests share: a fixture that needs the service worker, and
// stand-ins for Reddit's new pages.

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
