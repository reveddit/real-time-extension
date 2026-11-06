// E2E tests: scan buttons, bells and restore on new reddit's comments.
// They load the real built extension in Chromium and verify what a user would see.
// Prerequisites: run `yarn build-chrome-dev` before running these tests.

import {
    test,
    expect,
    POST,
    THREAD,
    openNewReddit,
    settle,
    FIRST,
    REPLY,
    REMOVED,
    SCAN,
    RESTORE,
    RECOVERED,
    comment,
    removedWithReply,
    thread,
    stampRows,
    buttonOf,
    rowOf,
    entry,
    feed,
    threadFeed,
    userFeed,
    THE_REMOVED_WORDS,
    removedAtTop,
} from './reddit.js'

test.describe("Scans on new reddit's comments", () => {
    const buttonWith = (page, className) =>
        page.evaluate(className => {
            const button = document.createElement('button')
            button.className = className
            button.textContent = 'Scan'
            document.body.append(button)
            const box = button.getBoundingClientRect()
            const text = document.createRange()
            text.selectNodeContents(button)
            const { top, bottom } = text.getBoundingClientRect()
            return { height: box.height, offCenter: Math.abs(top - box.top - (box.bottom - bottom)) }
        }, className)

    test("reddit's own size for every button leaves the text of ours centered", async ({ context }) => {
        const page = await openNewReddit(context, THREAD, thread(comment(FIRST)))
        await expect(page.locator('.rev-scan-all-btn')).toHaveCount(1)
        // As measured on www.reddit.com, 2026-11-05
        await page.addStyleTag({ content: 'button { box-sizing: border-box; height: 32px; line-height: 30px }' })

        for (const className of ['rev-btn rev-btn-solid', 'rev-btn rev-filter-btn', 'rev-btn rev-newreddit-action']) {
            expect((await buttonWith(page, className)).offCenter).toBeLessThanOrEqual(1)
        }
        await expect(page.locator('.rev-scan-all-btn')).toHaveCSS('line-height', '16px')
    })

    test('solid and outlined buttons are one height where reddit sets none', async ({ context }) => {
        const page = await openNewReddit(context, THREAD, thread(comment(FIRST)))
        await expect(page.locator('.rev-scan-all-btn')).toHaveCount(1)
        const solid = await buttonWith(page, 'rev-btn rev-btn-solid')
        const outlined = await buttonWith(page, 'rev-btn rev-filter-btn')
        expect(solid.height).toBe(outlined.height)
    })

    test('a disabled button stays as it is under the mouse', async ({ context }) => {
        const page = await openNewReddit(context, THREAD, thread(comment(FIRST)))
        const button = page.locator('.rev-scan-all-btn')
        await expect(button).toHaveCount(1)
        await button.evaluate(el => {
            el.disabled = true
            el.classList.add('rev-scan-all-loading')
        })
        await button.hover({ force: true })
        await expect(button).toHaveCSS('background-color', 'rgb(120, 124, 126)')
    })

    test('RES night mode leaves the selected pill readable and every border dark', async ({ context }) => {
        const page = await openNewReddit(context, THREAD, thread(comment(FIRST)))
        await expect(page.locator('.rev-scan-all-btn')).toHaveCount(1)

        const styles = await page.evaluate(() => {
            const night = document.createElement('div')
            night.className = 'res-nightmode'
            night.innerHTML =
                '<div class="rev-profile-scan-container"></div>' +
                '<div class="rev-own-filter-bar rev-filter-bar"></div>' +
                '<div class="rev-rec-children"></div>' +
                '<button class="rev-btn rev-filter-btn"></button>' +
                '<button class="rev-btn rev-filter-btn rev-filter-active"></button>'
            document.body.append(night)
            const style = selector => getComputedStyle(night.querySelector(selector))
            return {
                box: style('.rev-profile-scan-container').borderTopColor,
                bar: style('.rev-own-filter-bar').borderTopColor,
                rail: style('.rev-rec-children').borderLeftColor,
                pill: style('.rev-filter-btn').color,
                selected: style('.rev-filter-active').color,
            }
        })
        const dark = 'rgb(52, 53, 54)'
        expect(styles).toEqual({
            box: dark,
            bar: dark,
            rail: dark,
            pill: 'rgb(129, 131, 132)',
            selected: 'rgb(255, 255, 255)',
        })
    })

    const profileRow =
        `<shreddit-comment-action-row slot="actionRow"><button slot="comment-share">Share</button>` +
        `</shreddit-comment-action-row>`
    const onProfile = (context, path) =>
        openNewReddit(
            context,
            path,
            `<shreddit-profile-comment comment-id="${REPLY}" href="/r/pics/comments/abc123/comment/reply/">` +
                `${profileRow}</shreddit-profile-comment>`,
        )

    test('a comment and its post get a bell that follows them', async ({ context, installed, followed }) => {
        await installed()
        const page = await openNewReddit(context, THREAD, thread(comment(FIRST)))
        const postBell = page.locator('shreddit-post > .rev-comment-action')
        await expect(postBell).toHaveAttribute('slot', 'action-row-whitespace')
        await postBell.click()
        await expect(postBell).toHaveAttribute('aria-label', 'unsubscribe-rev')
        await stampRows(page)
        const bell = rowOf(page, FIRST).locator('.rev-comment-action')
        await expect(bell).toHaveAttribute('slot', 'comment-share')
        await expect(bell).toHaveAttribute('title', 'Get told if this is removed')
        await bell.click()
        await expect(bell).toHaveAttribute('aria-label', 'unsubscribe-rev')
        await expect(bell).toHaveAttribute('title', 'Stop following this')
        expect(await followed()).toEqual(expect.arrayContaining([POST, FIRST]))
        await bell.click()
        await expect(bell).toHaveAttribute('aria-label', 'subscribe-rev')
    })

    test('a comment on a profile can be followed', async ({ context, worker, installed, followed }) => {
        await installed()
        const page = await onProfile(context, '/user/another/comments/')
        const bell = page.locator('.rev-comment-action')
        await bell.click()
        await expect(bell).toHaveAttribute('aria-label', 'unsubscribe-rev')
        expect(await followed()).toContain(REPLY)
        const postOf = () =>
            worker.evaluate(
                id => chrome.storage.local.get('followed_post_ids').then(l => l.followed_post_ids?.[id]),
                REPLY,
            )
        await expect.poll(postOf).toContain('abc123')
    })

    test("a row reddit draws again says what's followed now", async ({ context, worker, installed }) => {
        await installed()
        const page = await openNewReddit(context, THREAD, thread(comment(FIRST)))
        await expect(page.locator('shreddit-post > .rev-comment-action')).toHaveCount(1)
        await stampRows(page)
        await rowOf(page, FIRST).locator('.rev-comment-action').click()
        await expect(rowOf(page, FIRST).locator('.rev-comment-action')).toHaveAttribute('aria-label', 'unsubscribe-rev')
        await rowOf(page, FIRST).evaluate(row => row.remove())
        await stampRows(page)
        const bell = rowOf(page, FIRST).locator('.rev-comment-action')
        await expect(bell).toHaveAttribute('aria-label', 'unsubscribe-rev')

        // Unfollowed elsewhere, such as the popup, with the bell on the page
        await worker.evaluate(() => chrome.storage.sync.set({ other_subscriptions: {} }))
        await expect(bell).toHaveAttribute('aria-label', 'subscribe-rev')
    })

    test("a bell left by the extension's last run gives way to a working one", async ({ context, installed }) => {
        await installed()
        const page = await openNewReddit(context, THREAD, thread(comment(FIRST)))
        await expect(page.locator('shreddit-post > .rev-comment-action')).toHaveCount(1)
        await page.evaluate(() => {
            const place = document.querySelector('shreddit-comment [slot="actionRow"]:empty')
            const row = document.createElement('shreddit-comment-action-row')
            row.innerHTML = '<button class="rev-comment-action" data-rev-subscribe-run="last">dead</button>'
            place.append(row)
        })
        const bell = rowOf(page, FIRST).locator('.rev-comment-action')
        await expect(bell).toHaveCount(1)
        await expect(bell).not.toHaveAttribute('data-rev-subscribe-run', 'last')
        await bell.click()
        await expect(bell).toHaveAttribute('aria-label', 'unsubscribe-rev')
    })

    test("one's own comment can't be followed, on a thread or one's profile, but others' saved ones can", async ({
        context,
        worker,
    }) => {
        await worker.evaluate(() => chrome.storage.local.set({ last_logged_in_user: 'someone' }))
        const page = await openNewReddit(context, THREAD, thread(comment(FIRST)))
        await expect(page.locator('.rev-scan-all-btn')).toHaveCount(1)
        await stampRows(page)
        await expect(rowOf(page, FIRST).locator('.rev-comment-action')).toHaveAttribute('aria-disabled', 'true')

        const own = (await onProfile(context, '/user/someone/comments/')).locator('.rev-comment-action')
        await expect(own).toHaveAttribute('aria-disabled', 'true')
        for (const path of ['/user/another/comments/', '/user/someone/saved/']) {
            const bell = (await onProfile(context, path)).locator('.rev-comment-action')
            await expect(bell).toHaveAttribute('aria-label', 'subscribe-rev')
            await expect(bell).not.toHaveAttribute('aria-disabled', 'true')
        }

        // The browser signs in as someone else, with the thread still open
        await worker.evaluate(() => chrome.storage.local.set({ last_logged_in_user: 'another' }))
        const bell = rowOf(page, FIRST).locator('.rev-comment-action')
        await expect(bell).not.toHaveAttribute('aria-disabled', 'true')
        await expect(bell).toHaveCSS('opacity', '1')
    })

    test("a restore link and a profile's scan from the extension's last run give way to working ones", async ({
        context,
    }) => {
        const removed = comment(REMOVED, { author: '[deleted]' }).replace(
            '</p></div></div>',
            '</p></div><div class="rev-restore-wrap"><a class="rev-restore-btn">dead</a></div></div>',
        )
        const page = await openNewReddit(context, THREAD, thread(removed))
        await expect(page.locator(RESTORE)).toHaveText('restore')
        await expect(page.locator(RESTORE)).toHaveCount(1)

        const profile = await openNewReddit(
            context,
            '/user/another/',
            '<div class="rev-profile-scan-container">dead</div><shreddit-feed>' +
                '<article data-post-id="t3_x" style="display: none">Hidden by the last run</article></shreddit-feed>',
        )
        await expect(profile.locator('.rev-profile-scan-btn')).toHaveCount(1)
        await expect(profile.locator('.rev-profile-scan-container')).toHaveCount(1)
        await expect(profile.locator('article')).toBeVisible()
    })

    test("unfollowing one's own comment leaves its bell disabled", async ({ context, worker, installed }) => {
        await installed()
        await worker.evaluate(
            id =>
                Promise.all([
                    chrome.storage.local.set({ last_logged_in_user: 'someone' }),
                    chrome.storage.sync.set({ other_subscriptions: { [id]: { t: 1 } } }),
                ]),
            FIRST,
        )
        const page = await openNewReddit(context, THREAD, thread(comment(FIRST)))
        await expect(page.locator('shreddit-post > .rev-comment-action')).toHaveCount(1)
        await stampRows(page)
        const bell = rowOf(page, FIRST).locator('.rev-comment-action')
        await expect(bell).toHaveAttribute('aria-label', 'unsubscribe-rev')
        await bell.click()
        await expect(bell).toHaveAttribute('aria-disabled', 'true')
        await page.waitForTimeout(500)
        await expect(bell).toHaveAttribute('aria-disabled', 'true')
    })

    test("Scan-Rev gives up its label where a row runs out of room, and a bell stays above a post's link", async ({
        context,
    }) => {
        const page = await openNewReddit(
            context,
            THREAD,
            thread(comment(FIRST), comment(REPLY).replace('<shreddit-comment ', '<shreddit-comment depth="4" ')),
        )
        await expect(page.locator('shreddit-post > .rev-comment-action')).toHaveCSS('position', 'relative')
        await stampRows(page)
        await expect(rowOf(page, FIRST).locator(`${SCAN} span`)).toBeVisible()
        await expect(rowOf(page, REPLY).locator(`${SCAN} span`)).toBeHidden()
        await page.setViewportSize({ width: 400, height: 800 })
        await expect(rowOf(page, FIRST).locator(`${SCAN} span`)).toBeHidden()
    })

    test('the option to hide subscribe buttons hides them', async ({ context, setOptions }) => {
        await setOptions({ hide_subscribe: true })
        const page = await openNewReddit(context, THREAD, thread(comment(FIRST)))
        await expect(page.locator('.rev-scan-all-btn')).toHaveCount(1)
        await stampRows(page)
        await expect(rowOf(page, FIRST).locator(SCAN)).toHaveCount(1)
        await expect(page.locator('.rev-comment-action')).toHaveCount(0)
    })

    test('a comment gets its button when reddit stamps its row, inline with Share', async ({ context }) => {
        const page = await openNewReddit(
            context,
            THREAD,
            thread(comment(FIRST, { replies: comment(REPLY, { parent: FIRST }) })),
        )
        await expect(page.locator('.rev-scan-all-btn')).toHaveCount(1)
        await settle(page)
        await expect(page.locator(SCAN)).toHaveCount(0)

        await stampRows(page)
        await expect(buttonOf(page, FIRST)).toHaveCount(1)
        await expect(buttonOf(page, REPLY)).toHaveCount(1)
        await expect(page.locator(SCAN)).toHaveCount(2)
        await expect(rowOf(page, FIRST).locator(SCAN)).toHaveAttribute('slot', 'comment-share')
    })

    test('a row reddit puts back keeps one button, and a comment rendered again gets one', async ({ context }) => {
        const page = await openNewReddit(context, THREAD, thread(comment(FIRST)))
        await expect(page.locator('.rev-scan-all-btn')).toHaveCount(1)
        await settle(page)
        await stampRows(page)
        await expect(page.locator(SCAN)).toHaveCount(1)

        await page.evaluate(() => {
            const row = document.querySelector('shreddit-comment-action-row')
            const place = row.parentElement
            row.remove()
            place.append(row)
        })
        await settle(page)
        await expect(page.locator(SCAN)).toHaveCount(1)

        await page.evaluate(html => {
            document.querySelector('shreddit-comment').outerHTML = html
        }, comment(FIRST))
        await stampRows(page)
        await expect(page.locator(SCAN)).toHaveCount(1)
    })

    test('a removed comment offers restore, and its reply still gets a scan button', async ({ context }) => {
        const page = await openNewReddit(context, THREAD, thread(comment(FIRST, { replies: removedWithReply })))
        await expect(page.locator(RESTORE)).toHaveCount(1)
        await stampRows(page)
        await expect(buttonOf(page, REPLY)).toHaveCount(1)
        await expect(buttonOf(page, FIRST)).toHaveCount(1)
        await expect(rowOf(page, REMOVED).locator(SCAN)).toHaveCount(0)
    })

    test('restore shows the text under the removed comment, above its replies', async ({ context, answerAs }) => {
        await answerAs({
            '/r/pics/comments/abc123/.rss?limit=500': threadFeed,
            [userFeed('op')]: feed(),
            [userFeed('someone')]: feed(entry(REMOVED, 'someone', 'The removed words')),
        })
        const page = await openNewReddit(context, THREAD, thread(comment(FIRST, { replies: removedWithReply })))
        await stampRows(page)
        await page.locator(`[thingid="${REMOVED}"] > details > summary`).click()
        await page.locator(RESTORE).click()

        const restored = page.locator(`[thingid="${REMOVED}"] > details > .grid > div > ${RECOVERED}`)
        await expect(restored).toContainText('The removed words')
        await expect(page.locator(RESTORE)).toBeHidden()
        const above = await restored.evaluate(el => {
            const reply = document.querySelector('[thingid="t1_reply"]')
            return !!(el.compareDocumentPosition(reply) & Node.DOCUMENT_POSITION_FOLLOWING)
        })
        expect(above).toBe(true)
    })

    test("a scan button's progress stays by its comment, above the replies", async ({ context, answerAs }) => {
        await answerAs({
            '/r/pics/comments/abc123/.rss?limit=500': threadFeed,
            [userFeed('op')]: feed(),
            [userFeed('someone')]: feed(),
            [userFeed('replier')]: feed(),
        })
        const page = await openNewReddit(context, THREAD, thread(comment(FIRST, { replies: removedWithReply })))
        await stampRows(page)
        await rowOf(page, FIRST).locator(SCAN).click()

        const message = page.locator(`[thingid="${FIRST}"] > details > .grid > div > .rev-restore-progress`)
        await expect(message).toContainText('Not found')
        await expect(rowOf(page, FIRST).locator(SCAN)).toBeVisible()
    })

    test('a scan keeps to the pace the options set', async ({ context, worker, answerAs, askedFor }) => {
        await answerAs(THE_REMOVED_WORDS)
        const page = await openNewReddit(context, THREAD, thread(removedAtTop))
        await page.locator('.rev-scan-all-btn').click()
        await expect.poll(() => askedFor().then(asked => asked.length)).toBeGreaterThan(2)
        const feedsAt = await worker.evaluate(() => self.feedsAt)
        const gaps = feedsAt.slice(1).map((at, i) => at - feedsAt[i])
        expect(Math.min(...gaps)).toBeGreaterThan(900)
    })

    test("a block page's second try goes out in the other mode", async ({ context, worker, answerAs }) => {
        await answerAs(THE_REMOVED_WORDS)
        await worker.evaluate(path => {
            const answered = self.fetch
            self.modes = []
            self.fetch = (url, init) => {
                if (!String(url).endsWith(path)) return answered(url)
                self.modes.push(init.cache)
                if (init.cache === 'no-cache') return answered(url)
                return new Response('blocked', { status: 403, headers: { 'content-type': 'text/html' } })
            }
        }, userFeed('someone'))
        const page = await openNewReddit(context, THREAD, thread(removedAtTop))
        await page.locator('.rev-scan-all-btn').click()
        await expect(page.locator(RECOVERED)).toHaveCount(1)
        expect(await worker.evaluate(() => self.modes)).toEqual(['no-store', 'no-cache'])
    })
})
