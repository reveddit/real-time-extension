// E2E tests: thread, search and profile scans on new reddit's comments.
// They load the real built extension in Chromium and verify what a user would see.
// Prerequisites: run `yarn build-chrome-dev` before running these tests.

import {
    test,
    expect,
    POST,
    THREAD,
    postElement,
    open,
    openNewReddit,
    settle,
    startRouter,
    visit,
    FIRST,
    REPLY,
    REMOVED,
    SCAN,
    RESTORE,
    RECOVERED,
    NOW,
    comment,
    removedWithReply,
    thread,
    stampRows,
    rowOf,
    entry,
    feed,
    threadFeed,
    userFeed,
    THREAD_FEED_PATH,
    THE_REMOVED_WORDS,
    removedAtTop,
} from './reddit.js'

test.describe("Scans on new reddit's comments", () => {
    const NEXT_POST = 't3_def456'
    const NEXT_THREAD = '/r/pics/comments/def456/b_title/'
    const nextThread = () => [
        postElement(NEXT_POST).replace('<shreddit-post', '<shreddit-post comment-count="5"'),
        `<shreddit-comment-tree id="comment-tree"><section>${comment('t1_next')}</section></shreddit-comment-tree>`,
    ]

    test('the thread scan places what it finds, and the filter keeps those branches', async ({ context, answerAs }) => {
        const LEAF = 't1_leaf'
        const OTHER = 't1_other'
        await answerAs({
            '/r/pics/comments/abc123/.rss?limit=500': threadFeed.replace(
                '</feed>',
                `${entry(OTHER, 'bystander', 'Words')}</feed>`,
            ),
            [userFeed('op')]: feed(),
            [userFeed('someone')]: feed(entry(REMOVED, 'someone', 'The removed words')),
            [userFeed('replier')]: feed(entry(LEAF, 'replier', 'A removed leaf')),
            [userFeed('bystander')]: feed(),
            // With no replies, a removed comment's feed ends at its parent
            '/comments/abc123/_/leaf/.rss?context=1': feed(entry(POST, 'op', 'The post'), entry(REPLY, 'replier', 'x')),
        })
        const page = await openNewReddit(
            context,
            THREAD,
            thread(comment(FIRST, { replies: removedWithReply }), comment(OTHER, { author: 'bystander' })),
        )
        await page.locator('.rev-scan-all-btn').click()

        const filled = page.locator(`[thingid="${REMOVED}"] > details > .grid > div > ${RECOVERED}`)
        await expect(filled).toContainText('The removed words')
        await expect(filled).toBeVisible()
        const leaf = page.locator(`[thingid="${REPLY}"] #comment-children ${RECOVERED}`)
        await expect(leaf).toContainText('A removed leaf')
        await expect(page.locator('.rev-scan-all-btn')).toContainText('2 comment(s) recovered')

        await expect(leaf).toBeVisible()
        await expect(page.locator(`[thingid="${FIRST}"]`)).toBeVisible()
        await expect(page.locator(`[thingid="${OTHER}"]`)).toBeHidden()
        await page.locator('.rev-thread-filter-btn', { hasText: 'all' }).click()
        await expect(page.locator(`[thingid="${OTHER}"]`)).toBeVisible()
    })

    test("a tombstone's restore link goes once a scan has filled it in", async ({ context, answerAs }) => {
        await answerAs(THE_REMOVED_WORDS)
        const page = await openNewReddit(context, THREAD, thread(comment(FIRST), removedAtTop))
        await expect(page.locator(RESTORE)).toHaveCount(1)
        await page.locator('.rev-scan-all-btn').click()
        await expect(page.locator(RECOVERED)).toContainText('The removed words')
        await expect(page.locator(RESTORE)).toBeHidden()
    })

    test('a tombstone in any language offers restore, not Scan-Rev', async ({ context }) => {
        const german = thread(comment(FIRST, { replies: removedWithReply })).replace(
            'Comment removed by moderator',
            'Von Moderator*innen entfernter Kommentar',
        )
        const page = await openNewReddit(context, THREAD, german)
        await expect(page.locator(RESTORE)).toHaveCount(1)
        await stampRows(page)
        await expect(rowOf(page, REMOVED).locator(SCAN)).toHaveCount(0)
    })

    test("a user's own deletion and a deleted account's live comment offer no restore", async ({ context }) => {
        const deletedByAuthor = comment(REMOVED, { author: '[deleted]' }).replace(
            '<shreddit-comment ',
            '<shreddit-comment is-comment-deleted ',
        )
        const deletedAccount = comment('t1_account', { text: 'Words' }).replace(
            'author="someone"',
            'author="[deleted]"',
        )
        const page = await openNewReddit(context, THREAD, thread(deletedByAuthor, deletedAccount))
        await expect(page.locator('.rev-scan-all-btn')).toHaveCount(1)
        await settle(page)
        await expect(page.locator(RESTORE)).toHaveCount(0)
    })

    test("the filter keeps one's own removed comment, and needs no parentid to find replies", async ({
        context,
        installed,
        answerAs,
        seedOwnRemoved,
    }) => {
        const OTHER = 't1_other'
        await installed()
        await seedOwnRemoved(OTHER)
        await answerAs(THE_REMOVED_WORDS)
        const page = await openNewReddit(
            context,
            THREAD,
            thread(
                comment(FIRST, { author: 'bystander', replies: removedWithReply }),
                comment(OTHER),
                comment('t1_quiet', { author: 'bystander' }),
            ).replaceAll('parentid=', 'parent-id='),
        )
        await page.locator('.rev-scan-all-btn').click()
        await expect(page.locator(RECOVERED)).toContainText('The removed words')

        await expect(page.locator(`[thingid="${OTHER}"]`)).toBeVisible()
        await expect(page.locator(`[thingid="${FIRST}"]`)).toBeVisible()
        await expect(page.locator('[thingid="t1_quiet"]')).toBeHidden()
    })

    test('Scan-Rev hides while it searches, and cancel stops the search', async ({ context, answerAs, askedFor }) => {
        await answerAs(THE_REMOVED_WORDS)
        const page = await openNewReddit(
            context,
            THREAD,
            thread(
                comment(FIRST, { author: 'bystander' }),
                comment('t1_b', { author: 'b' }),
                comment('t1_c', { author: 'c' }),
            ),
        )
        await stampRows(page)
        const button = rowOf(page, FIRST).locator(SCAN)
        await button.click()
        await expect(button).toBeHidden()
        // Dimmed stops the mouse, not the keyboard, which must leave the search running
        await page.locator('.rev-scan-all-btn').evaluate(btn => btn.click())
        await expect(page.locator('.rev-scan-all-btn')).not.toHaveText('Scanning...')
        await page.locator('.rev-restore-cancel').click()
        await expect(page.locator('.rev-restore-progress')).toContainText('Search cancelled.')
        await expect(button).toBeVisible()
        await expect(page.locator('.rev-scan-exhausted')).toHaveCount(0)

        const sent = (await askedFor()).length
        await page.waitForTimeout(2000)
        expect(await askedFor()).toHaveLength(sent)
    })

    test('a search dims the restore links, and a thread scan can be cancelled', async ({ context, answerAs }) => {
        await answerAs(THE_REMOVED_WORDS)
        const page = await openNewReddit(
            context,
            THREAD,
            thread(
                comment(FIRST, { author: 'bystander', replies: removedWithReply }),
                comment('t1_b', { author: 'b' }),
            ),
        )
        await page.locator('.rev-scan-all-btn').click()
        await expect(page.locator(`${RESTORE}.rev-scan-disabled`)).toHaveCount(1)
        // Dimmed stops the mouse, not the keyboard, which must leave the scan running
        await page.locator(RESTORE).evaluate(link => link.click())
        await expect(page.locator(RESTORE)).not.toHaveCSS('display', 'none')
        await expect(page.locator('.rev-scan-all-progress .rev-restore-cancel')).toBeVisible()
        await page.locator('.rev-scan-all-progress .rev-restore-cancel').click()
        await expect(page.locator('.rev-scan-all-progress')).toContainText('Scan cancelled.')
        await expect(page.locator(`${RESTORE}.rev-scan-disabled`)).toHaveCount(0)
        await expect(page.locator('.rev-scan-all-btn')).toBeEnabled()
        await expect(page.locator('.rev-scan-exhausted')).toHaveCount(0)
    })

    test('a scan left running stops, and leaves the next post alone', async ({
        context,
        worker,
        answerAs,
        askedFor,
    }) => {
        await answerAs(THE_REMOVED_WORDS)
        const page = await openNewReddit(context, THREAD, thread(comment(FIRST), removedAtTop))
        await startRouter(page)
        // The scan's first read is still out when the page changes
        await worker.evaluate(() => {
            const answered = self.fetch
            const held = new Promise(resolve => (self.answerNow = resolve))
            self.fetch = url => {
                self.readIsOut = true
                return held.then(() => answered(url))
            }
        })
        await page.locator('.rev-scan-all-btn').click()
        await expect.poll(() => worker.evaluate(() => self.readIsOut)).toBe(true)
        await visit(page, NEXT_THREAD, ...nextThread())
        await expect(page.locator('[thingid="t1_next"]')).toBeVisible()
        await stampRows(page)
        await worker.evaluate(() => self.answerNow())
        await page.waitForTimeout(2500)

        await expect(page.locator(RECOVERED)).toHaveCount(0)
        await expect(page.locator('[thingid="t1_next"]')).toBeVisible()
        await expect(page.locator('.rev-scan-exhausted')).toHaveCount(0)
        await expect(page.locator('.rev-scan-all-btn')).toBeEnabled()
        expect(await askedFor()).toEqual([THREAD_FEED_PATH])
    })

    test("a post's scan isn't answered from another post's reads", async ({ context, answerAs, askedFor }) => {
        await answerAs({
            ...THE_REMOVED_WORDS,
            '/r/pics/comments/def456/.rss?limit=500': feed(entry(NEXT_POST, 'op', 'The post')),
        })
        const page = await openNewReddit(context, THREAD, thread(comment(FIRST), removedAtTop))
        await startRouter(page)
        await page.locator('.rev-scan-all-btn').click()
        await expect(page.locator('.rev-scan-all-progress')).toContainText('Scan complete')
        await visit(page, NEXT_THREAD, ...nextThread())
        await expect(page.locator('[thingid="t1_next"]')).toBeVisible()

        await page.locator('.rev-scan-all-btn').click()
        await expect
            .poll(() => askedFor().then(asked => asked.filter(path => path === userFeed('someone')).length))
            .toBe(2)
    })

    test('a post on a profile gets no comment buttons, even after a thread', async ({ context }) => {
        const page = await openNewReddit(context, THREAD, thread(comment(FIRST)))
        await expect(page.locator('.rev-scan-all-btn')).toHaveCount(1)
        await settle(page)
        await startRouter(page)
        await visit(page, '/user/other/comments/abc123/a_title/', ...nextThread())
        await expect(page.locator('[thingid="t1_next"]')).toBeVisible()
        await settle(page)
        await stampRows(page)
        await settle(page)
        await expect(page.locator(SCAN)).toHaveCount(0)
    })

    const LOOKUP = '/comments/abc123/_/gone/.rss?context=1'
    const oneRemovedOnProfile = () => {
        const query = 'sort=new&limit=100'
        return {
            [`/user/other/comments/.rss?${query}`]: feed(entry('t1_gone', 'other', 'The removed words')),
            [`/user/other/comments.json?${query}`]: '{"data":{"children":[]}}',
            [`/user/other/submitted/.rss?${query}`]: feed(),
            [`/user/other/submitted.json?${query}`]: '{"data":{"children":[]}}',
            [LOOKUP]: feed(entry(POST, 'op', 'The post')),
        }
    }
    const thing = id => `<div class="thing" data-fullname="${id}"><div class="entry"><p>Words</p></div></div>`
    const oldProfile = (...things) =>
        `<!doctype html><html><body><div class="content" role="main"><div id="siteTable">${things.join('')}</div></div></body></html>`

    test('a removed item goes by date on a page that mixes posts and comments', async ({ context, answerAs }) => {
        const hoursAgo = hours => new Date(Date.now() - hours * 3600 * 1000).toISOString()
        const dated = (id, hours) => thing(id).replace('<p>', `<time datetime="${hoursAgo(hours)}"></time><p>`)
        const query = 'sort=new&limit=100'
        await answerAs({
            ...oneRemovedOnProfile(),
            [`/user/other/comments/.rss?${query}`]: feed(
                entry('t1_c1', 'other', 'Words'),
                entry('t1_gone', 'other', 'The removed words').replace(NOW, hoursAgo(4)),
                entry('t1_c2', 'other', 'Words'),
            ),
            [`/user/other/comments.json?${query}`]:
                '{"data":{"children":[{"data":{"name":"t1_c1"}},{"data":{"name":"t1_c2"}}]}}',
        })
        const url = 'https://old.reddit.com/user/other/'
        const page = await open(
            context,
            url,
            oldProfile(dated('t3_post1', 1), dated('t1_c1', 2), dated('t3_post2', 3), dated('t1_c2', 5)),
        )
        await page.locator('.rev-profile-scan-btn').click()
        await expect(page.locator(`#siteTable > ${RECOVERED}`)).toHaveCount(1, { timeout: 15000 })
        const order = await page
            .locator('#siteTable > [data-fullname]')
            .evaluateAll(items => items.map(item => item.getAttribute('data-fullname')))
        expect(order).toEqual(['t3_post1', 't1_c1', 't3_post2', 't1_gone', 't1_c2'])
    })

    test("a comment's search leaves the buttons of comments that need another sort", async ({ context, answerAs }) => {
        const eightMonthsAgo = new Date(Date.now() - 240 * 24 * 3600 * 1000).toISOString()
        const OLD = 't1_old'
        await answerAs({
            [THREAD_FEED_PATH]: feed(entry(POST, 'op', 'The post')),
            [userFeed('op')]: feed(),
            [userFeed('someone')]: feed(),
            [userFeed('bystander')]: feed(),
        })
        const page = await openNewReddit(
            context,
            THREAD,
            thread(comment(FIRST), comment(OLD, { author: 'bystander' }).replace(NOW, eightMonthsAgo)),
        )
        await stampRows(page)
        await rowOf(page, FIRST).locator(SCAN).click()
        await expect(page.locator('.rev-restore-progress')).toContainText('Not found', { timeout: 10000 })
        await expect(rowOf(page, FIRST).locator(SCAN)).toHaveClass(/rev-scan-exhausted/)
        await expect(rowOf(page, FIRST).locator(SCAN)).toHaveText('Scan-Rev')
        await expect(rowOf(page, OLD).locator(SCAN)).not.toHaveClass(/rev-scan-exhausted/)
        await expect(page.locator('.rev-scan-all-btn')).toBeEnabled()
    })

    test('a rescan reads again, and one that fails leaves the whole page showing', async ({
        context,
        answerAs,
        askedFor,
    }) => {
        await answerAs(oneRemovedOnProfile())
        const url = 'https://old.reddit.com/user/other/comments/'
        const page = await open(context, url, oldProfile(thing('t1_live')))
        const button = page.locator('.rev-profile-scan-btn')
        await button.click()
        await expect(page.locator(`#siteTable > ${RECOVERED}`)).toHaveCount(1, { timeout: 15000 })
        await expect(page.locator('[data-fullname="t1_live"]')).toBeHidden()

        await button.click()
        await expect(button).toHaveText('Rescan', { timeout: 15000 })
        expect((await askedFor()).filter(path => path === LOOKUP)).toHaveLength(2)

        await answerAs({})
        await button.click()
        await expect(page.locator('.rev-profile-scan-progress')).toHaveText('User not found.', { timeout: 15000 })
        await expect(page.locator('[data-fullname="t1_live"]')).toBeVisible()
    })

    test('a page left during a search comes back ready to search', async ({ context, answerAs }) => {
        await answerAs(THE_REMOVED_WORDS)
        const page = await openNewReddit(context, THREAD, thread(comment(FIRST), removedAtTop))
        await stampRows(page)
        await startRouter(page)
        await rowOf(page, FIRST).locator(SCAN).click()
        await visit(page, NEXT_THREAD, ...nextThread())
        await expect(page.locator('[thingid="t1_next"]')).toBeVisible()
        await page.waitForTimeout(2500)

        await page.goBack()
        await expect(rowOf(page, FIRST).locator(SCAN)).toBeVisible()
        await expect(page.locator('.rev-scan-disabled')).toHaveCount(0)
    })

    test('what each click recovers goes in one place for unattached comments', async ({ context, answerAs }) => {
        const orphan = (id, author, parent) => feed(entry(POST, 'op', 'The post'), entry(parent, author, 'A parent'))
        await answerAs({
            [THREAD_FEED_PATH]: feed(entry(POST, 'op', 'The post')),
            [userFeed('op')]: feed(),
            [userFeed('someone')]: feed(entry('t1_orphan1', 'someone', 'First')),
            [userFeed('bystander')]: feed(entry('t1_orphan2', 'bystander', 'Second')),
            '/comments/abc123/_/orphan1/.rss?context=1': orphan('t1_orphan1', 'someone', 't1_lost1'),
            '/comments/abc123/_/orphan2/.rss?context=1': orphan('t1_orphan2', 'bystander', 't1_lost2'),
        })
        const page = await openNewReddit(
            context,
            THREAD,
            thread(comment(FIRST), comment('t1_b', { author: 'bystander' })),
        )
        await page.locator('.rev-scan-all-btn').click()
        await expect(page.locator('.rev-unattached-area')).toContainText('First', { timeout: 10000 })
        await page.locator('.rev-scan-all-progress .rev-restore-cancel').click()
        await expect(page.locator('.rev-scan-all-progress')).toContainText('Scan cancelled.')

        await page.locator('.rev-scan-all-btn').click()
        await expect(page.locator('.rev-unattached-area')).toContainText('Second', { timeout: 10000 })
        await expect(page.locator('.rev-unattached-area')).toHaveCount(1)
    })

    test('placing unattached comments stops with its page', async ({ context, answerAs }) => {
        await answerAs({
            [THREAD_FEED_PATH]: feed(entry(POST, 'op', 'The post')),
            [userFeed('op')]: feed(),
            [userFeed('someone')]: feed(entry('t1_orphan', 'someone', 'First')),
            '/comments/abc123/_/orphan/.rss?context=1': feed(
                entry(POST, 'op', 'The post'),
                entry('t1_lost', 'someone', 'A parent'),
            ),
            '/comments/abc123/_/lost/.rss?context=1': feed(
                entry(POST, 'op', 'The post'),
                entry('t1_lost', 'someone', 'A parent'),
            ),
        })
        const page = await openNewReddit(context, THREAD, thread(comment(FIRST)))
        await startRouter(page)
        await page.locator('.rev-scan-all-btn').click()
        await expect(page.locator('.rev-unattached-area')).toContainText('First', { timeout: 10000 })
        await page.locator('.rev-place-unattached-btn').click()
        await visit(page, NEXT_THREAD, ...nextThread())
        await expect(page.locator('[thingid="t1_next"]')).toBeVisible()
        await page.waitForTimeout(2500)
        await expect(page.locator('shreddit-comment-tree [data-rev-id]')).toHaveCount(0)
    })

    test('a profile scan left running stops, and leaves the next page alone', async ({
        context,
        answerAs,
        askedFor,
    }) => {
        await answerAs(oneRemovedOnProfile())
        const page = await openNewReddit(context, '/user/other/', '<shreddit-feed></shreddit-feed>')
        await startRouter(page)
        await page.locator('.rev-profile-scan-btn').click()
        await visit(page, '/', '<article data-post-id="t3_home"><p>A post</p></article>')
        await expect(page.locator('[data-post-id="t3_home"]')).toBeVisible()
        await page.waitForTimeout(2500)

        await expect(page.locator('[data-post-id="t3_home"]')).toBeVisible()
        await expect(page.locator(RECOVERED)).toHaveCount(0)
        expect((await askedFor()).length).toBeLessThan(3)
    })

    test("one's own profile offers a scan for posts", async ({ context, worker, setOptions }) => {
        await setOptions({ show_scan_on_own_profile: true })
        await worker.evaluate(() => chrome.storage.local.set({ last_logged_in_user: 'someone' }))
        const page = await openNewReddit(context, '/user/someone/', '<shreddit-feed></shreddit-feed>')
        await expect(page.locator('.rev-profile-scan-btn')).toHaveText('Scan for removed posts')
    })

    test('a profile scan puts what it finds where the sort has it, on a page sorted by top', async ({
        context,
        answerAs,
    }) => {
        const query = 'sort=top&limit=100'
        await answerAs({
            [`/user/other/comments/.rss?${query}`]: feed(
                entry('t1_high', 'other', 'Words'),
                entry('t1_gone', 'other', 'The removed words'),
                entry('t1_low', 'other', 'Words'),
            ),
            [`/user/other/comments.json?${query}`]:
                '{"data":{"children":[{"data":{"name":"t1_high"}},{"data":{"name":"t1_low"}}]}}',
            [`/user/other/submitted/.rss?${query}`]: feed(),
            [`/user/other/submitted.json?${query}`]: '{"data":{"children":[]}}',
            [LOOKUP]: feed(entry(POST, 'op', 'The post')),
        })
        const url = 'https://old.reddit.com/user/other/comments/?sort=top'
        const page = await open(context, url, oldProfile(thing('t1_high'), thing('t1_low')))
        await page.locator('.rev-profile-scan-btn').click()
        await expect(page.locator(`#siteTable > ${RECOVERED}`)).toHaveCount(1, { timeout: 15000 })
        const order = await page
            .locator('#siteTable > [data-fullname]')
            .evaluateAll(items => items.map(item => item.getAttribute('data-fullname')))
        expect(order).toEqual(['t1_high', 't1_gone', 't1_low'])
    })

    test("one's own removed comment is highlighted, not the replies inside it", async ({ context, seedOwnRemoved }) => {
        await seedOwnRemoved(FIRST)
        const page = await openNewReddit(
            context,
            THREAD,
            thread(comment(FIRST, { replies: comment(REPLY, { parent: FIRST }) })),
        )
        await expect(page.locator(`[thingid="${FIRST}"] [slot="comment"].rev-removed-highlight`)).toHaveCount(1)
        await expect(page.locator('.rev-removed-highlight')).toHaveCount(1)
    })

    test('a logged-out browser is asked to sign in, and nothing is sent', async ({ context }) => {
        const page = await openNewReddit(context, THREAD, thread(comment(FIRST)))
        await page.locator('.rev-scan-all-btn').click()
        await expect(page.locator('.rev-scan-all-progress')).toContainText('Sign in to Reddit to scan')
    })
})
