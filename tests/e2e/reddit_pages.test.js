// E2E tests: the extension's notes, highlights and buttons on reddit pages.
// They load the real built extension in Chromium and verify what a user would see.
// Prerequisites: run `yarn build-chrome-dev` before running these tests.

import { test, expect, POST, THREAD, postElement, open, openNewReddit, settle, startRouter, visit } from './reddit.js'

test.describe('Post removal note on reddit pages', () => {
    const HELD = 'Post is awaiting moderator approval.'
    const NOTE = '.rev-new-reddit-message-wrap'

    test('shows under a removed post, whatever language the page is in', async ({ context }) => {
        const page = await openNewReddit(context, THREAD, postElement(POST, { banner: HELD }))
        const note = page.locator(`shreddit-post + ${NOTE}.rev-mod-removed`)
        await expect(note).toContainText('This post is unapproved.')
        await expect(note).toContainText('It is not currently visible in r/pics')
        await expect(note.getByRole('link', { name: 'View the post on Reveddit.com' })).toHaveAttribute(
            'href',
            `https://www.reveddit.com${THREAD}`,
        )

        const german = await openNewReddit(
            context,
            '/r/pics/comments/abc456/a_title/',
            postElement('t3_abc456', { banner: 'Beitrag muss durch eine*n Moderator*in zugelassen werden.' }),
        )
        await expect(german.locator(NOTE)).toHaveCount(1)
    })

    test('stays away from a live post until reddit shows the banner', async ({ context }) => {
        const page = await openNewReddit(context, THREAD, postElement(POST))
        await settle(page)
        await expect(page.locator(NOTE)).toHaveCount(0)

        await page.evaluate(text => {
            const banner = document.createElement('div')
            banner.slot = 'post-removed-banner'
            banner.textContent = text
            document.querySelector('shreddit-post').append(banner)
        }, HELD)
        await expect(page.locator(NOTE)).toHaveCount(1)
    })

    test('shows on a post reached from a list, which loads no new page', async ({ context }) => {
        const page = await openNewReddit(context, '/r/pics/', postElement(POST, { banner: HELD }))
        await settle(page)
        await expect(page.locator(NOTE)).toHaveCount(0)

        await page.evaluate(
            ([path, html]) => {
                history.pushState({}, '', path)
                document.querySelector('main').innerHTML = html
            },
            [THREAD, postElement(POST, { banner: HELD })],
        )
        await expect(page.locator(NOTE)).toHaveCount(1)
    })

    test('stays one note when reddit puts a page back or moves its post', async ({ context }) => {
        const page = await openNewReddit(context, THREAD, postElement(POST, { banner: HELD }))
        await expect(page.locator(NOTE)).toHaveCount(1)

        await page.evaluate(() => {
            const main = document.querySelector('main')
            const kept = [...main.children]
            main.replaceChildren()
            main.replaceChildren(...kept)
            const wrapper = document.createElement('div')
            main.append(wrapper)
            wrapper.append(document.querySelector('shreddit-post'))
        })
        await settle(page)
        await expect(page.locator(NOTE)).toHaveCount(1)
    })

    test("shows on the author's post that monitoring found removed, which reddit can hide from them", async ({
        context,
        seedOwnRemoved,
    }) => {
        await seedOwnRemoved(POST)
        const page = await openNewReddit(context, THREAD, postElement(POST))
        await expect(page.locator(NOTE)).toHaveCount(1)

        const other = await openNewReddit(context, '/r/pics/comments/abc456/a_title/', postElement('t3_abc456'))
        await settle(other)
        await expect(other.locator(NOTE)).toHaveCount(0)
    })

    test("tells a deleted post from a deleted account's live one", async ({ context }) => {
        const deleted = await openNewReddit(
            context,
            THREAD,
            postElement(POST, {
                author: '[deleted]',
                banner: 'Sorry, this post was deleted by the person who posted it.',
            }),
        )
        await expect(deleted.locator(`${NOTE}.rev-user-deleted`)).toContainText('deleted by the person who posted it')

        const live = await openNewReddit(
            context,
            '/r/pics/comments/abc456/a_title/',
            postElement('t3_abc456', { author: '[deleted]' }),
        )
        await settle(live)
        await expect(live.locator(NOTE)).toHaveCount(0)
    })

    test("names the profile on a profile's post", async ({ context }) => {
        const page = await openNewReddit(
            context,
            '/user/someone/comments/abc123/a_title/',
            postElement(POST, { banner: HELD }),
        )
        await expect(page.locator(NOTE)).toContainText("It is not currently visible in u/someone's profile")
    })

    test('its link opens the options page once, whatever put the note there', async ({ context, worker }) => {
        await worker.evaluate(() => {
            self.opened = 0
            chrome.runtime.openOptionsPage = () => self.opened++
        })
        const page = await openNewReddit(context, THREAD, postElement(POST, { banner: HELD }))
        await page.locator(`${NOTE} a`, { hasText: 'Reveddit Real-Time' }).click()
        await page.waitForTimeout(300)
        expect(await worker.evaluate(() => self.opened)).toBe(1)
    })

    test("old reddit still reads the page's robots tag", async ({ context }) => {
        const page = await open(
            context,
            `https://old.reddit.com${THREAD}`,
            `<!doctype html><html><head><meta name="robots" content="noindex,nofollow"></head>` +
                `<body><div id="header"></div><div class="content" role="main"></div></body></html>`,
        )
        await expect(page.locator('.reddit-infobar.rev-mod-removed')).toContainText('This post is unapproved.')
    })
})

test.describe('Reddit pages reached without a new document', () => {
    const LIST = '/r/pics/'
    const OWN = 't1_own'
    const OTHERS = 't1_others'
    const OWN_BAR = '.rev-own-filter-bar'
    const post = postElement(POST)
    const feed = (...items) => `<div><hr><shreddit-feed>${items.join('')}</shreddit-feed></div>`
    const comment = id => `<shreddit-comment thingid="${id}"><details open><p>Words</p></details></shreddit-comment>`
    const tree = `<shreddit-comment-tree id="comment-tree">${comment(OWN)}${comment(OTHERS)}</shreddit-comment-tree>`
    const profileComment = id => `<shreddit-profile-comment comment-id="${id}"><p>Words</p></shreddit-profile-comment>`
    const ownComment = page => page.locator(`[thingid="${OWN}"].rev-removed-highlight`)

    test('a post reached from a list gets its own highlights, also after back and forward', async ({
        context,
        seedOwnRemoved,
    }) => {
        await seedOwnRemoved(OWN)
        const page = await openNewReddit(context, LIST, feed(post))
        await startRouter(page)
        await settle(page)

        await visit(page, THREAD, post, tree)
        await expect(ownComment(page)).toHaveCount(1)
        await expect(page.locator('.rev-removed-highlight')).toHaveCount(1)

        await page.goBack()
        await expect(page.locator('shreddit-feed')).toHaveCount(1)
        await page.goForward()
        await expect(ownComment(page)).toHaveCount(1)
        await settle(page)
        await expect(page.locator('.rev-removed-highlight')).toHaveCount(1)
    })

    test('the next post gets its own highlights, from records newer than the document', async ({
        context,
        seedOwnRemoved,
    }) => {
        await seedOwnRemoved(OTHERS)
        const page = await openNewReddit(context, THREAD, post + tree)
        await startRouter(page)
        await expect(page.locator(`[thingid="${OTHERS}"].rev-removed-highlight`)).toHaveCount(1)

        await seedOwnRemoved(OWN)
        await visit(page, '/r/pics/comments/abc456/a_title/', postElement('t3_abc456'), tree)
        await expect(ownComment(page)).toHaveCount(1)
    })

    test("one's own profile gets its highlights and filter bar, and pages after it stay out of them", async ({
        context,
        seedOwnRemoved,
    }) => {
        await seedOwnRemoved(OWN)
        const page = await openNewReddit(context, LIST, feed(post))
        await startRouter(page)

        await visit(page, '/user/someone/', feed(profileComment(OWN), profileComment(OTHERS)))
        await expect(page.locator(`[comment-id="${OWN}"].rev-removed-highlight`)).toHaveCount(1)
        const bar = page.locator(OWN_BAR)
        await expect(bar).toHaveCount(1)
        await bar.getByRole('button', { name: 'removed' }).click()
        await expect(page.locator(`[comment-id="${OTHERS}"]`)).toBeHidden()

        await visit(page, THREAD, post)
        await expect(page.locator('shreddit-post')).toBeVisible()
        await settle(page)
        await expect(page.locator('shreddit-post')).not.toHaveAttribute('data-rev-status')

        await page.goBack()
        await expect(bar).toHaveCount(1)
        await settle(page)
        await expect(bar.locator('.rev-filter-active')).toHaveText('removed')
        await expect(page.locator(`[comment-id="${OWN}"]`)).toBeVisible()
        await expect(page.locator(`[comment-id="${OTHERS}"]`)).toBeHidden()
    })

    // Old reddit loads a new document for each page, through the same functions
    const thing = (id, kind = '') =>
        `<div class="thing ${kind}" data-fullname="${id}"><div class="entry"><ul class="buttons"><li>permalink</li></ul></div></div>`

    test("old reddit's comments get a subscribe link", async ({ context }) => {
        const page = await open(
            context,
            `https://old.reddit.com${THREAD}`,
            `<!doctype html><html><body><div id="header"></div><div class="content" role="main">` +
                `<div class="commentarea"><div class="menuarea"></div>${thing(OTHERS, 'comment')}</div></div></body></html>`,
        )
        await expect(page.locator('.buttons a')).toHaveText('subscribe-rev')
    })

    test("old reddit's posts get a subscribe link, among the buttons under the title", async ({ context }) => {
        const page = await open(
            context,
            `https://old.reddit.com/r/pics/`,
            `<!doctype html><html><body><div id="header"></div><div class="content" role="main">` +
                `<div class="thing link" data-fullname="${POST}"><div class="entry"><div class="top-matter">` +
                `<ul class="buttons"><li>comments</li></ul></div></div></div></div></body></html>`,
        )
        await expect(page.locator('.top-matter .buttons a')).toHaveText('subscribe-rev')
    })

    test("old reddit's subscribe link from the extension's last run gives way to a working one", async ({ context }) => {
        // A 0.0.5.37 run's scan-rev link has the subscribe link's class too, and can sit ahead of it
        const dead =
            '<li><a class="rev-scan-comment-btn rev-comment-action">dead</a></li><li><a class="rev-comment-action">dead</a></li>'
        const page = await open(
            context,
            `https://old.reddit.com${THREAD}`,
            `<!doctype html><html><body><div id="header"></div><div class="content" role="main">` +
                `<div class="commentarea"><div class="menuarea"></div>` +
                `${thing(OTHERS, 'comment').replace('<li>permalink</li>', dead)}</div></div></body></html>`,
        )
        const subscribe = page.locator('.buttons a:not(.rev-scan-comment-btn)')
        await expect(subscribe).toHaveText('subscribe-rev')
        await expect(subscribe).toHaveCount(1)
    })

    test("old reddit's own profile keeps its filter", async ({ context, seedOwnRemoved }) => {
        await seedOwnRemoved(OWN)
        const page = await open(
            context,
            'https://old.reddit.com/user/someone/',
            `<!doctype html><html><body><div id="header"></div><div class="content" role="main">` +
                `<div id="siteTable">${thing(OWN)}${thing(OTHERS)}</div></div></body></html>`,
        )
        await page.locator(OWN_BAR).getByRole('button', { name: 'removed' }).click()
        await expect(page.locator(`[data-fullname="${OTHERS}"]`)).toBeHidden()
        await expect(page.locator(`[data-fullname="${OWN}"]`)).toBeVisible()
    })
})

test.describe('Reddit thread pages', () => {
    // Before 0.0.4.0, a scan meant for spans read the text of every element,
    // <html> included, a few times per page view. Threads froze for seconds at
    // a time (the survey's reports of 2026-02-21 and 2026-03-05).
    test('a long thread is not held up by the content script', async ({ context, worker, seedOwnRemoved }) => {
        // The page's removal check stays off reddit
        await worker.evaluate(() => {
            self.fetch = async () => new Response('', { status: 404 })
        })
        await seedOwnRemoved('t1_own')
        // As on Reddit, comments sit under nested wrappers, each holding all of their text
        const comment = `<div><span>someone</span>${' '.repeat(300)}<p>${'words in a comment '.repeat(20)}</p></div>`
        const thread = Array.from({ length: 12 }).reduce(html => `<div>${html}</div>`, comment.repeat(1000))
        // One of the user's own removed comments, whose mark shows the content script has read the page
        const own = '<shreddit-comment thingid="t1_own"><details open><p>Words</p></details></shreddit-comment>'
        await context.route('https://www.reddit.com/**', route =>
            route.fulfill({
                status: 200,
                contentType: 'text/html',
                body: `<html device="desktop"><body><shreddit-comment-tree>${thread}${own}</shreddit-comment-tree></body></html>`,
            }),
        )
        const page = await context.newPage()
        await page.addInitScript(() => {
            window.blockedMs = 0
            new PerformanceObserver(list => {
                for (const task of list.getEntries()) window.blockedMs += task.duration
            }).observe({ type: 'longtask', buffered: true })
        })
        await page.goto('https://www.reddit.com/r/test/comments/abc123/title/')

        // The content script is done with the page, and its rescan a second later has run
        await expect(page.locator('[thingid="t1_own"].rev-removed-highlight')).toBeAttached()
        await page.waitForTimeout(1500)
        expect(await page.evaluate(() => window.blockedMs)).toBeLessThan(1000)
    })
})
