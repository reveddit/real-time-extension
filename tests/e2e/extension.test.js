// E2E tests for the extension's popup, options, history, and welcome pages, and its note on reddit pages.
// These tests load the real built extension in Chromium and verify what a user would see.
// They know NOTHING about jQuery, storage internals, or implementation details.
//
// Prerequisites: run `yarn build-chrome-dev` before running these tests.

import { test, expect } from './fixtures.js'

test.describe('Popup page', () => {
    test('renders the popup with expected elements', async ({ context, extensionId }) => {
        const page = await context.newPage()
        await page.goto(`chrome-extension://${extensionId}/src/popup.html`)

        // The root container should exist
        await expect(page.locator('#root')).toBeVisible()

        // Should have History and Options action buttons
        await expect(page.getByRole('button', { name: 'History' })).toBeVisible()
        await expect(page.getByRole('button', { name: 'Options' })).toBeVisible()

        // Should have "mark all as seen" link in subscriptions card
        await expect(page.locator('text=mark all as seen')).toBeVisible()

        await expect(page.getByRole('link', { name: 'report a problem' })).toBeVisible()
    })

    // Pages under test: tabs they'd open are recorded instead, the popup
    // doesn't close, and copies are caught (Chromium grants no clipboard
    // access to extension pages under test)
    const recordOpens = page =>
        page.evaluate(() => {
            window.__opened = []
            chrome.tabs.create = opts => window.__opened.push(opts.url)
            window.close = () => {}
            navigator.clipboard.writeText = async text => {
                window.__copied = text
            }
        })
    const opened = async page => {
        await expect.poll(() => page.evaluate(() => window.__opened.length)).toBe(1)
        return new URL(await page.evaluate(() => window.__opened[0]))
    }

    test("logged out: says so, and a button opens reddit's login page", async ({ context, extensionId }) => {
        const [worker] = context.serviceWorkers()
        await worker.evaluate(() =>
            chrome.storage.local.set({ error_status: 'needs_user', last_logged_in_user: 'someone' }),
        )
        const page = await context.newPage()
        await page.goto(`chrome-extension://${extensionId}/src/popup.html`)

        await expect(page.getByText("You don't seem to be logged in to Reddit")).toBeVisible()
        await recordOpens(page)
        await page.getByRole('button', { name: 'Log in to Reddit' }).click()
        expect((await opened(page)).href).toBe('https://www.reddit.com/login')
    })

    test("reddit's login wall: offers a second account, then says why", async ({ context, extensionId }) => {
        // What monitoring leaves behind after five lookups that landed on
        // reddit's login page
        const [worker] = context.serviceWorkers()
        await worker.evaluate(() =>
            chrome.storage.local.set({ error_status: 'login_required', last_logged_in_user: 'someone' }),
        )
        const page = await context.newPage()
        await page.goto(`chrome-extension://${extensionId}/src/popup.html`)

        await expect(
            page.getByText('To keep checking your posts and comments, connect a second Reddit account.'),
        ).toBeVisible()
        await expect(page.getByRole('link', { name: 'Why?' })).toHaveAttribute(
            'href',
            'https://www.reveddit.com/about/reddit-login/',
        )
        await recordOpens(page)
        await page.getByRole('button', { name: 'Connect a second account' }).click()
        const url = await opened(page)
        expect(url.href).toBe(`chrome-extension://${extensionId}/src/options.html#second-account`)
    })

    test("reddit's public view not loading: a reddit tab first, then a second account", async ({
        context,
        extensionId,
    }) => {
        // A login wall that doesn't redirect to the login page lands here too
        const [worker] = context.serviceWorkers()
        await worker.evaluate(() =>
            chrome.storage.local.set({ error_status: 'public_view_unavailable', last_logged_in_user: 'someone' }),
        )
        const page = await context.newPage()
        await page.goto(`chrome-extension://${extensionId}/src/popup.html`)
        await expect(page.getByText('If it keeps up, connect a second Reddit account.')).toBeVisible()
        await expect(page.getByRole('button', { name: 'Open www.reddit.com' })).toBeVisible()
        await recordOpens(page)
        await page.getByRole('button', { name: 'Connect a second account' }).click()
        expect((await opened(page)).hash).toBe('#second-account')
    })

    test('signed in as the second account itself: asks for a different one', async ({ context, extensionId }) => {
        const [worker] = context.serviceWorkers()
        await worker.evaluate(() =>
            chrome.storage.local.set({
                error_status: 'login_required',
                last_logged_in_user: 'bob',
                viewer_account: { name: 'Bob', token: 'ab'.repeat(16), cookies: [], connectedAt: Date.now() },
            }),
        )
        const page = await context.newPage()
        await page.goto(`chrome-extension://${extensionId}/src/popup.html`)
        await expect(page.getByText("You're signed in to Reddit with your second account")).toBeVisible()
        await recordOpens(page)
        await page.getByRole('button', { name: 'Connect a different account' }).click()
        expect((await opened(page)).hash).toBe('#second-account')

        const options = await context.newPage()
        await options.goto(`chrome-extension://${extensionId}/src/options.html#second-account`)
        await expect(options.getByText("it's also the account you're signed in to Reddit with")).toBeVisible()
        await options.getByRole('button', { name: 'connect a different account' }).click()
        await expect(options.getByRole('dialog', { name: 'Connect a second account' })).toBeVisible()
    })

    test('report a problem copies the log and opens the issue form with the version filled in', async ({
        context,
        extensionId,
    }) => {
        const page = await context.newPage()
        await page.goto(`chrome-extension://${extensionId}/src/popup.html`)
        await recordOpens(page)
        await page.evaluate(() => {
            const send = chrome.runtime.sendMessage.bind(chrome.runtime)
            window.__sent = []
            chrome.runtime.sendMessage = (message, callback) => {
                window.__sent.push(message)
                return send(message, callback)
            }
        })
        await page.getByRole('link', { name: 'report a problem' }).click()
        const url = await opened(page)
        expect(`${url.origin}${url.pathname}`).toBe('https://github.com/reveddit/real-time-extension/issues/new')
        expect(url.searchParams.get('template')).toBe('problem.yml')
        // Headless Chromium calls itself HeadlessChrome, which names no browser
        expect(url.searchParams.get('version')).toMatch(/^\d+\.\d+\.\d+\.\d+(, Chrome \d+)?$/)
        expect(url.searchParams.has('log')).toBe(false)
        expect(await page.evaluate(() => window.__copied)).toMatch(/^reveddit real-time diagnostic log\n/)

        // GitHub turns away an issue past 65,536 characters: the log is cut to fit
        const asked = await page.evaluate(() => window.__sent.find(m => m.action === 'get-diag-log'))
        expect(asked).toMatchObject({ includeUsername: false, maxChars: 50000 })
        const cut = await page.evaluate(
            () =>
                new Promise(resolve =>
                    chrome.runtime.sendMessage(
                        { action: 'get-diag-log', includeUsername: false, maxChars: 1 },
                        resolve,
                    ),
                ),
        )
        expect(cut.text).toMatch(/^reveddit real-time diagnostic log\n/)
        expect(cut.text).toContain('trimmed to fit')
    })
})

test.describe('Options page: second account', () => {
    test('offers to connect one, and shows a connected one with a way to disconnect it', async ({
        context,
        extensionId,
    }) => {
        const page = await context.newPage()
        await page.goto(`chrome-extension://${extensionId}/src/options.html#second-account`)
        await expect(page.getByRole('heading', { name: 'Second account' })).toBeVisible()
        await expect(page.getByRole('button', { name: 'connect a second account' })).toBeVisible()

        // Connecting first says the user is signed out for a moment; cancel starts nothing
        await page.getByRole('button', { name: 'connect a second account' }).click()
        const dialog = page.getByRole('dialog', { name: 'Connect a second account' })
        await expect(dialog).toBeVisible()
        await expect(dialog).toContainText(
            "You'll be briefly signed out of Reddit while you sign in to the second account. But you'll be signed back in",
        )
        await dialog.getByRole('button', { name: 'cancel' }).click()
        await expect(dialog).toBeHidden()
        const [worker] = context.serviceWorkers()
        expect(await worker.evaluate(() => chrome.storage.local.get('viewer_connect'))).toEqual({})
        await page.getByRole('button', { name: 'connect a second account' }).click()
        await page.keyboard.press('Escape')
        await expect(dialog).toBeHidden()

        await worker.evaluate(() =>
            chrome.storage.local.set({
                viewer_account: { name: 'bob', token: 'ab'.repeat(16), cookies: [], connectedAt: Date.now() },
            }),
        )
        await expect(page.getByText('Connected: u/bob')).toBeVisible()
        await page.getByRole('button', { name: 'disconnect' }).click()
        await expect(page.getByRole('button', { name: 'connect a second account' })).toBeVisible()
        expect(await worker.evaluate(() => chrome.storage.local.get('viewer_account'))).toEqual({})
    })

    test('a second account reddit signed out: says so, and offers to connect it again', async ({
        context,
        extensionId,
    }) => {
        const token = 'ab'.repeat(16)
        const [worker] = context.serviceWorkers()
        await worker.evaluate(
            token =>
                chrome.storage.local.set({
                    last_logged_in_user: 'someone',
                    viewer_account: { name: 'bob', token, cookies: [], connectedAt: Date.now() },
                    viewer_identity: { token, result: 'signed_out', t: Date.now() },
                }),
            token,
        )
        const page = await context.newPage()
        await page.goto(`chrome-extension://${extensionId}/src/options.html#second-account`)
        await expect(page.getByText("u/bob was signed out of Reddit, so your posts and comments aren't")).toBeVisible()
        await expect(page.getByText('Connected: u/bob')).toBeHidden()
        await page.getByRole('button', { name: 'connect it again' }).click()
        await expect(page.getByRole('dialog', { name: 'Connect a second account' })).toBeVisible()
        await page.keyboard.press('Escape')

        // Connected again: a new token, which that sign-out was not about
        await worker.evaluate(() =>
            chrome.storage.local.set({
                viewer_account: { name: 'bob', token: 'cd'.repeat(16), cookies: [], connectedAt: Date.now() },
            }),
        )
        await expect(page.getByText('Connected: u/bob')).toBeVisible()
    })

    test('in an incognito window: points to a normal one, where a sign-in can work', async ({
        context,
        extensionId,
    }) => {
        const page = await context.newPage()
        // As the incognito windows' own copy of the extension sees itself (Chrome, Edge)
        await page.addInitScript(() => {
            Object.defineProperty(chrome.extension, 'inIncognitoContext', { value: true })
        })
        await page.goto(`chrome-extension://${extensionId}/src/options.html#second-account`)
        await expect(page.getByText('open these options in a normal window')).toBeVisible()
        await expect(page.getByRole('button', { name: 'connect a second account' })).toBeHidden()
    })

    test('the confirm dialog opens over its button, even in a frame as tall as the page', async ({
        context,
        extensionId,
    }) => {
        // Firefox shows options inside about:addons in a frame sized to the
        // whole page, where a dialog in the middle of the frame is off screen
        const page = await context.newPage()
        await page.goto(`chrome-extension://${extensionId}/src/options.html`)
        await expect(page.locator('h2', { hasText: 'Appearance' })).toBeVisible({ timeout: 10000 })
        const button = page.getByRole('button', { name: 'connect a second account' })
        await page.setViewportSize({
            width: 800,
            height: await page.evaluate(() => document.documentElement.scrollHeight),
        })
        await button.click()
        const dialog = page.getByRole('dialog', { name: 'Connect a second account' })
        await expect(dialog).toBeVisible()
        const b = await button.boundingBox()
        const d = await dialog.boundingBox()
        expect(d.y).toBeLessThanOrEqual(b.y)
        expect(d.y + d.height).toBeGreaterThanOrEqual(b.y + b.height)
    })
})

test.describe('Background: a reddit tab finishing a load', () => {
    // When a reddit page loads, the background asks reddit who's signed in.
    // Here reddit answers that someone is, once the install's own login check
    // has given up (it tries for a few seconds, then says nobody is signed
    // in). Reddit's other pages don't answer, so no check starts meanwhile.
    const signedIn = async worker => {
        await expect
            .poll(() => worker.evaluate(() => chrome.storage.local.get('error_status')), { timeout: 15000 })
            .toEqual({ error_status: 'needs_user' })
        await worker.evaluate(async () => {
            await chrome.cookies.set({ url: 'https://www.reddit.com/', name: 'reddit_session', value: 'test' })
            const realFetch = globalThis.fetch.bind(globalThis)
            globalThis.fetch = (url, init) =>
                String(url).includes('/api/me.json')
                    ? Promise.resolve(new Response(JSON.stringify({ data: { name: 'someone' } })))
                    : String(url).includes('reddit.com')
                      ? new Promise(() => {})
                      : realFetch(url, init)
        })
    }
    // A reddit tab, served here rather than by reddit
    const loadRedditTab = async context => {
        const tab = await context.newPage()
        await tab.route('https://www.reddit.com/**', route =>
            route.fulfill({ contentType: 'text/html', body: '<html><body>reddit</body></html>' }),
        )
        await tab.goto('https://www.reddit.com/')
    }

    test('clears the signed-out warning once someone is signed in', async ({ context, extensionId }) => {
        expect(extensionId).toBeTruthy()
        const [worker] = context.serviceWorkers()
        await signedIn(worker)
        await loadRedditTab(context)
        await expect.poll(() => worker.evaluate(() => chrome.storage.local.get('error_status'))).toEqual({})
    })

    test("leaves a warning that being signed in doesn't fix", async ({ context, extensionId }) => {
        expect(extensionId).toBeTruthy()
        const [worker] = context.serviceWorkers()
        await signedIn(worker)
        await worker.evaluate(() => chrome.storage.local.set({ error_status: 'login_required' }))
        await loadRedditTab(context)
        // The signed-out warning clears well within this
        await new Promise(resolve => setTimeout(resolve, 2000))
        expect(await worker.evaluate(() => chrome.storage.local.get('error_status'))).toEqual({
            error_status: 'login_required',
        })
    })
})

test.describe('Options page', () => {
    test('renders all settings with default values', async ({ context, extensionId }) => {
        const page = await context.newPage()
        await page.goto(`chrome-extension://${extensionId}/src/options.html`)

        // Wait for async storage load to complete (Subscriptions heading appears)
        await expect(page.locator('h2', { hasText: 'Subscriptions' }).first()).toBeVisible({ timeout: 10000 })

        // Tracking & Notification header
        await expect(page.locator('h2', { hasText: 'Tracking & notification' })).toBeVisible()

        // Tracking section should have a three-state picker per type,
        // defaulting to badge + notifications
        await expect(page.getByText('removed content', { exact: true })).toBeVisible()
        await expect(page.getByText('locked content', { exact: true })).toBeVisible()
        const pickers = page.locator('select').filter({ hasText: 'badge + notifications' })
        await expect(pickers).toHaveCount(2)
        // No reload needed: the page stays on its loading screen until the
        // background's install-time initStorage has written the defaults.
        await expect(pickers.first()).toHaveValue('notify')
        await expect(pickers.nth(1)).toHaveValue('notify')
        // "turn off all notifications" macro drops both pickers to badge only,
        // then hides itself
        const turnOffAll = page.getByText('turn off all notifications')
        await expect(turnOffAll).toBeVisible()
        await turnOffAll.click()
        await expect(pickers.first()).toHaveValue('badge')
        await expect(pickers.nth(1)).toHaveValue('badge')
        await expect(turnOffAll).not.toBeVisible()

        // Polling section with interval input
        await expect(page.locator('h2', { hasText: 'Polling' })).toBeVisible()
        await expect(page.locator('text=minutes between Reddit checks')).toBeVisible()

        // Appearance section
        await expect(page.locator('h2', { hasText: 'Appearance' })).toBeVisible()

        // Save button
        await expect(page.getByRole('button', { name: 'save' }).first()).toBeVisible()

        // Reset link
        await expect(page.locator('text=reset to defaults')).toBeVisible()

        // Advanced section should be hidden initially
        const advancedHeading = page.locator('h2', { hasText: 'Advanced' })
        await expect(advancedHeading).not.toBeVisible()

        // Click advanced to reveal it
        await page.locator('a', { hasText: 'advanced' }).click()
        await expect(advancedHeading).toBeVisible()
        await expect(page.locator('text=custom client id')).toBeVisible()
    })
})

test.describe('Options page: diagnostics', () => {
    test('copying the log keeps post and comment ids unless asked to hide them', async ({ context, extensionId }) => {
        const page = await context.newPage()
        await page.goto(`chrome-extension://${extensionId}/src/options.html`)
        await expect(page.locator('h2', { hasText: 'Diagnostics' })).toBeVisible({ timeout: 10000 })
        await page.evaluate(() => {
            navigator.clipboard.writeText = async text => {
                window.__copied = text
            }
        })
        const copied = async () => {
            await page.evaluate(() => (window.__copied = undefined))
            await page.getByRole('button', { name: 'copy log' }).click()
            await expect.poll(() => page.evaluate(() => typeof window.__copied)).toBe('string')
            return page.evaluate(() => window.__copied)
        }
        const hide = page
            .locator('label', { hasText: 'hide post and comment ids' })
            .locator('xpath=following-sibling::input[1]')
        await expect(hide).not.toBeChecked()
        expect(await copied()).not.toContain('ids: hidden')
        await hide.check()
        // The background marks a copy whose ids it hid
        expect(await copied()).toContain('ids: hidden; c_ and p_ are stand-ins for comment and post ids')
    })
})

test.describe('History page', () => {
    test('renders history page structure', async ({ context, extensionId }) => {
        const page = await context.newPage()
        await page.goto(`chrome-extension://${extensionId}/src/history.html`)

        // Should have a History heading
        await expect(page.locator('h1')).toContainText('History')

        // The root container should be in the DOM
        await expect(page.locator('#root')).toBeAttached()
    })
})

// Reddit's own pages turn headless browsers away, so these pages are stand-ins
// with the shape of real ones (read 2026-11-04). The content script can't tell.
test.describe('Post removal note on reddit pages', () => {
    const POST = 't3_abc123'
    const THREAD = '/r/pics/comments/abc123/a_title/'
    const HELD = 'Post is awaiting moderator approval.'
    const NOTE = '.rev-new-reddit-message-wrap'
    // The title is why a post's own words must not count
    const postElement = (id, { banner, author = 'someone' } = {}) =>
        `<shreddit-post id="${id}" author="${author}" permalink="/r/pics/comments/${id.slice(3)}/a_title/">` +
        `<h1 slot="title">Why was my post removed by moderators?</h1>` +
        (banner ? `<div slot="post-removed-banner"><span>${banner}</span></div>` : '') +
        `</shreddit-post>`
    const open = async (context, url, html) => {
        await context.route(url, route => route.fulfill({ contentType: 'text/html', body: html }))
        const page = await context.newPage()
        await page.goto(url)
        return page
    }
    const openNewReddit = (context, path, main) =>
        open(
            context,
            `https://www.reddit.com${path}`,
            `<!doctype html><html device="desktop"><body><main id="main-content">${main}</main></body></html>`,
        )
    // Long enough for the content script's first look
    const settle = page => page.waitForTimeout(700)

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
        extensionId, // eslint-disable-line no-unused-vars -- waits for the service worker
    }) => {
        const [worker] = context.serviceWorkers()
        await worker.evaluate(
            id =>
                Promise.all([
                    chrome.storage.local.set({ last_logged_in_user: 'someone' }),
                    chrome.storage.sync.set({ removed_u_someone: { [id]: { a: 1 } } }),
                ]),
            POST,
        )
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

test.describe('Welcome page', () => {
    test('renders welcome UI with connection check', async ({ context, extensionId }) => {
        // The rendered state depends on the connection check: "Getting started"
        // only appears after /api/me.json resolves with no user. Stub it so the
        // test exercises the UI deterministically — against live Reddit this
        // request can 403, challenge, or stall for automation traffic, which
        // left this test red regardless of code changes.
        await context.route('**/api/me.json*', route =>
            route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }),
        )
        const page = await context.newPage()
        await page.goto(`chrome-extension://${extensionId}/src/welcome.html`)

        // Welcome header
        await expect(page.locator('h1')).toContainText('Welcome to reveddit real-time')

        // Status message area
        await expect(page.locator('h1 ~ *')).toBeVisible()

        // Check connection button
        await expect(page.getByRole('button', { name: /check connection/i })).toBeVisible()

        // Getting Started instructions
        await expect(page.getByRole('heading', { name: /getting started/i })).toBeVisible()

        // Logo image
        await expect(page.locator('img[alt="Reveddit"]')).toBeVisible()
    })
})
