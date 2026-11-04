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
const POST = 't3_abc123'
const THREAD = '/r/pics/comments/abc123/a_title/'
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
        `<!doctype html><html device="desktop"><body><shreddit-app><div>` +
            `<main id="main-content">${main}</main></div></shreddit-app></body></html>`,
    )
// Long enough for the content script's first look
const settle = page => page.waitForTimeout(700)
// Needs the extensionId fixture, which waits for the service worker
const seedOwnRemoved = (context, id) =>
    context
        .serviceWorkers()[0]
        .evaluate(
            id =>
                Promise.all([
                    chrome.storage.local.set({ last_logged_in_user: 'someone' }),
                    chrome.storage.sync.set({ removed_u_someone: { [id]: { a: 1 } } }),
                ]),
            id,
        )

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
        extensionId, // eslint-disable-line no-unused-vars -- waits for the service worker
    }) => {
        await seedOwnRemoved(context, POST)
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

test.describe('Reddit pages reached without a new document', () => {
    const LIST = '/r/pics/'
    const OWN = 't1_own'
    const OTHERS = 't1_others'
    const THREAD_SCAN = '.rev-scan-all-btn'
    const PROFILE_SCAN = '.rev-profile-scan-container'
    const OWN_BAR = '.rev-own-filter-bar'
    const post = postElement(POST)
    const feed = (...items) => `<div><hr><shreddit-feed>${items.join('')}</shreddit-feed></div>`
    const comment = id => `<shreddit-comment thingid="${id}"><details open><p>Words</p></details></shreddit-comment>`
    const tree = `<shreddit-comment-tree id="comment-tree">${comment(OWN)}${comment(OTHERS)}</shreddit-comment-tree>`
    const profileComment = id => `<shreddit-profile-comment comment-id="${id}"><p>Words</p></shreddit-profile-comment>`
    const ownComment = page => page.locator(`[thingid="${OWN}"].rev-removed-highlight`)

    // Reddit's router, as measured 2026-11-04: the address changes first, then
    // one element under shreddit-app is replaced whole, and on a first visit a
    // post's comments arrive after it. Back and forward put the same elements back.
    const startRouter = page =>
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
    const visit = (page, path, main, comments) =>
        page.evaluate(
            ([path, main, comments]) => {
                const late = comments && document.createRange().createContextualFragment(comments)
                window.visit(path, main, late)
            },
            [path, main, comments],
        )

    test('a post reached from a list gets its scan button and own highlights, once', async ({
        context,
        extensionId, // eslint-disable-line no-unused-vars -- waits for the service worker
    }) => {
        await seedOwnRemoved(context, OWN)
        const page = await openNewReddit(context, LIST, feed(post))
        await startRouter(page)
        await settle(page)
        await expect(page.locator(THREAD_SCAN)).toHaveCount(0)

        await visit(page, THREAD, post, tree)
        await expect(page.locator(THREAD_SCAN)).toHaveCount(1)
        await expect(ownComment(page)).toHaveCount(1)
        await expect(page.locator('.rev-removed-highlight')).toHaveCount(1)

        await page.goBack()
        await expect(page.locator(THREAD_SCAN)).toHaveCount(0)
        await page.goForward()
        await expect(ownComment(page)).toHaveCount(1)
        await settle(page)
        await expect(page.locator(THREAD_SCAN)).toHaveCount(1)
    })

    test('the next post gets its own scan button, and records newer than the document count', async ({
        context,
        extensionId, // eslint-disable-line no-unused-vars -- waits for the service worker
    }) => {
        await seedOwnRemoved(context, OTHERS)
        const page = await openNewReddit(context, THREAD, post + tree)
        await startRouter(page)
        await expect(page.locator(`[thingid="${OTHERS}"].rev-removed-highlight`)).toHaveCount(1)

        await seedOwnRemoved(context, OWN)
        await visit(page, '/r/pics/comments/abc456/a_title/', postElement('t3_abc456'), tree)
        await expect(ownComment(page)).toHaveCount(1)
        await expect(page.locator(THREAD_SCAN)).toHaveCount(1)
    })

    test('a profile reached from a post gets its scan button, once', async ({ context }) => {
        const page = await openNewReddit(context, THREAD, post + tree)
        await startRouter(page)
        await expect(page.locator(THREAD_SCAN)).toHaveCount(1)

        await visit(page, '/user/other/', feed())
        await expect(page.locator(PROFILE_SCAN)).toHaveCount(1)

        await page.goBack()
        await expect(page.locator(PROFILE_SCAN)).toHaveCount(0)
        await expect(page.locator(THREAD_SCAN)).toHaveCount(1)
        await page.goForward()
        await expect(page.locator('shreddit-feed')).toHaveCount(1)
        await settle(page)
        await expect(page.locator(PROFILE_SCAN)).toHaveCount(1)
    })

    test('a profile with no feed gets its scan button too', async ({ context }) => {
        const page = await openNewReddit(context, LIST, feed(post))
        await startRouter(page)
        await visit(page, '/user/other/', '<div><div data-testid="profile-main"></div></div>')
        await expect(page.locator(PROFILE_SCAN)).toHaveCount(1)
    })

    test('a scan button leaves with its profile', async ({
        context,
        extensionId, // eslint-disable-line no-unused-vars -- waits for the service worker
    }) => {
        await seedOwnRemoved(context, OWN)
        const page = await openNewReddit(context, '/user/other/', feed())
        await startRouter(page)
        await expect(page.locator(PROFILE_SCAN)).toHaveCount(1)

        // The scan is off for one's own profile unless the options turn it on
        await visit(page, '/user/someone/', feed(profileComment(OWN)))
        await expect(page.locator(OWN_BAR)).toHaveCount(1)
        await settle(page)
        await expect(page.locator(PROFILE_SCAN)).toHaveCount(0)
    })

    test("one's own profile gets its highlights and filter bar, and pages after it stay out of them", async ({
        context,
        extensionId, // eslint-disable-line no-unused-vars -- waits for the service worker
    }) => {
        await seedOwnRemoved(context, OWN)
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

    test('a post on a profile gets no thread scan, which needs a subreddit', async ({ context }) => {
        const page = await openNewReddit(context, THREAD, post + tree)
        await startRouter(page)
        await expect(page.locator(THREAD_SCAN)).toHaveCount(1)

        await visit(page, '/user/other/comments/abc123/a_title/', post, tree)
        await expect(page.locator('shreddit-comment-tree')).toHaveCount(1)
        await settle(page)
        await expect(page.locator(THREAD_SCAN)).toHaveCount(0)
    })

    // Old reddit loads a new document for each page, through the same functions
    const thing = (id, kind = '') =>
        `<div class="thing ${kind}" data-fullname="${id}"><div class="entry"><ul class="buttons"><li>permalink</li></ul></div></div>`

    test("old reddit's threads keep their scan buttons", async ({ context }) => {
        const page = await open(
            context,
            `https://old.reddit.com${THREAD}`,
            `<!doctype html><html><body><div id="header"></div><div class="content" role="main">` +
                `<div class="commentarea"><div class="menuarea"></div>${thing(OTHERS, 'comment')}</div></div></body></html>`,
        )
        await expect(page.locator(THREAD_SCAN)).toHaveCount(1)
        await expect(page.locator('.rev-scan-comment-btn')).toHaveCount(1)
    })

    test("old reddit's own profile keeps its filter", async ({
        context,
        extensionId, // eslint-disable-line no-unused-vars -- waits for the service worker
    }) => {
        await seedOwnRemoved(context, OWN)
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

test.describe("Scans on new reddit's comments", () => {
    const FIRST = 't1_first'
    const REPLY = 't1_reply'
    const REMOVED = 't1_removed'
    const SCAN = '.rev-scan-comment-btn'
    const RESTORE = '.rev-restore-btn'
    const RECOVERED = '.rev-inserted-comment'
    const NOW = new Date().toISOString()

    // The markup read 2026-11-04: a comment's parts sit deep inside <details>, its
    // replies in its own #comment-children, and a removed comment has no slotted
    // body and starts collapsed.
    const comment = (id, { author = 'someone', parent, text = 'Words', replies = '' } = {}) =>
        `<shreddit-comment thingid="${id}" author="${author}" created="${NOW}" ${parent ? `parentid="${parent}"` : ''}>` +
        `<details role="article" ${author === '[deleted]' ? '' : 'open'}><summary><div slot="commentMeta">${author}</div></summary><div class="grid">` +
        `<div class="col-start-2">${
            author === '[deleted]'
                ? '<div class="md"><div><p class="text-neutral-content-weak">Comment removed by moderator</p></div></div>'
                : `<div class="md" slot="comment"><div><p>${text}</p></div></div>`
        }</div>` +
        `<div class="col-start-2"><div class="min-h-xl" slot="actionRow"></div></div>` +
        `<div id="comment-children">${replies}</div></div></details></shreddit-comment>`
    const removedWithReply = comment(REMOVED, {
        author: '[deleted]',
        parent: FIRST,
        replies: comment(REPLY, { parent: REMOVED, author: 'replier' }),
    })
    const thread = (...comments) =>
        postElement(POST, { author: 'op' }).replace('<shreddit-post', '<shreddit-post comment-count="5"') +
        `<shreddit-comment-tree id="comment-tree"><section>${comments.join('')}</section></shreddit-comment-tree>`

    // Reddit stamps a comment's row when the comment comes into view
    const stampRows = page =>
        page.evaluate(() => {
            for (const place of document.querySelectorAll('shreddit-comment [slot="actionRow"]:empty')) {
                const row = document.createElement('shreddit-comment-action-row')
                row.setAttribute('slot', 'actionRow')
                row.innerHTML = '<button slot="comment-share">Share</button>'
                place.append(row)
            }
        })
    const buttonOf = (page, id) => page.locator(`shreddit-comment-action-row:has(> ${SCAN})`).and(rowOf(page, id))
    const rowOf = (page, id) =>
        page.locator(`[thingid="${id}"] > details > .grid > div > [slot="actionRow"] > shreddit-comment-action-row`)

    const entry = (id, author, body) =>
        `<entry>${author ? `<author><name>/u/${author}</name></author>` : ''}<content type="html">` +
        `&lt;div class=&quot;md&quot;&gt;&lt;p&gt;${body}&lt;/p&gt;&lt;/div&gt;</content><id>${id}</id>` +
        `<link href="https://www.reddit.com/r/pics/comments/abc123/a_title/${id.slice(3)}/"/>` +
        `<updated>${NOW}</updated><title>/u/${author} on A title</title></entry>`
    const feed = (...entries) => `<feed xmlns="http://www.w3.org/2005/Atom">${entries.join('')}</feed>`
    const threadFeed = feed(
        entry(POST, 'op', 'The post'),
        entry(FIRST, 'someone', 'Words'),
        entry(REMOVED, null, '[deleted]'),
        entry(REPLY, 'replier', 'Words'),
    )
    const userFeed = name => `/user/${name}/comments/.rss?sort=new&limit=100`

    // A login, and reddit's answers in the background, which sends everything else away
    const answerAs = async (context, answers) => {
        await context.addCookies([{ name: 'reddit_session', value: 'x', domain: '.reddit.com', path: '/' }])
        await context.serviceWorkers()[0].evaluate(answers => {
            self.fetch = async url => {
                const answer = answers[String(url).replace('https://www.reddit.com', '')]
                return new Response(answer ?? '', { status: answer === undefined ? 404 : 200 })
            }
        }, answers)
    }

    test('a comment gets its button when reddit stamps its row, inline with Share', async ({
        context,
        extensionId, // eslint-disable-line no-unused-vars -- waits for the service worker
    }) => {
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

    test('a row reddit puts back keeps one button, and a comment rendered again gets one', async ({
        context,
        extensionId, // eslint-disable-line no-unused-vars -- waits for the service worker
    }) => {
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

    test('a removed comment offers restore, and its reply still gets a scan button', async ({
        context,
        extensionId, // eslint-disable-line no-unused-vars -- waits for the service worker
    }) => {
        const page = await openNewReddit(context, THREAD, thread(comment(FIRST, { replies: removedWithReply })))
        await expect(page.locator(RESTORE)).toHaveCount(1)
        await stampRows(page)
        await expect(buttonOf(page, REPLY)).toHaveCount(1)
        await expect(buttonOf(page, FIRST)).toHaveCount(1)
        await expect(rowOf(page, REMOVED).locator(SCAN)).toHaveCount(0)
    })

    test('restore shows the text under the removed comment, above its replies', async ({
        context,
        extensionId, // eslint-disable-line no-unused-vars -- waits for the service worker
    }) => {
        await answerAs(context, {
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

    test("a scan button's progress stays by its comment, above the replies", async ({
        context,
        extensionId, // eslint-disable-line no-unused-vars -- waits for the service worker
    }) => {
        await answerAs(context, {
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

    test('the thread scan places what it finds, and the filter keeps those branches', async ({
        context,
        extensionId, // eslint-disable-line no-unused-vars -- waits for the service worker
    }) => {
        const LEAF = 't1_leaf'
        const OTHER = 't1_other'
        await answerAs(context, {
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

    test("one's own removed comment is highlighted, not the replies inside it", async ({
        context,
        extensionId, // eslint-disable-line no-unused-vars -- waits for the service worker
    }) => {
        await seedOwnRemoved(context, FIRST)
        const page = await openNewReddit(
            context,
            THREAD,
            thread(comment(FIRST, { replies: comment(REPLY, { parent: FIRST }) })),
        )
        await expect(page.locator(`[thingid="${FIRST}"] [slot="comment"].rev-removed-highlight`)).toHaveCount(1)
        await expect(page.locator('.rev-removed-highlight')).toHaveCount(1)
    })

    test('a logged-out browser is asked to sign in, and nothing is sent', async ({
        context,
        extensionId, // eslint-disable-line no-unused-vars -- waits for the service worker
    }) => {
        const page = await openNewReddit(context, THREAD, thread(comment(FIRST)))
        await page.locator('.rev-scan-all-btn').click()
        await expect(page.locator('.rev-scan-all-progress')).toContainText('Sign in to Reddit to scan')
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
