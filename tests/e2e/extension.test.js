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

    test('a login reddit keeps refusing: says so, and offers to log in', async ({ context, extensionId }) => {
        const [worker] = context.serviceWorkers()
        await worker.evaluate(() =>
            chrome.storage.local.set({ error_status: 'logged_in_view_unavailable', last_logged_in_user: 'someone' }),
        )
        const page = await context.newPage()
        await page.goto(`chrome-extension://${extensionId}/src/popup.html`)

        await expect(page.getByText("Reddit isn't accepting your login")).toBeVisible()
        await expect(page.getByRole('button', { name: 'Log in to Reddit' })).toBeVisible()
    })

    test("checks that keep failing: says nothing's being checked, even with no user to name", async ({
        context,
        extensionId,
    }) => {
        const [worker] = context.serviceWorkers()
        await worker.evaluate(() => chrome.storage.local.set({ error_status: 'checks_failing' }))
        const page = await context.newPage()
        await page.goto(`chrome-extension://${extensionId}/src/popup.html`)

        await expect(page.getByText("aren't being checked right now")).toBeVisible()
        await expect(page.getByRole('button', { name: 'Log in to Reddit' })).toHaveCount(0)
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

test.describe('Header rules', () => {
    test("reach only the extension's own background requests", async ({ context, extensionId }) => {
        const [worker] = context.serviceWorkers()
        const rules = () => worker.evaluate(() => chrome.declarativeNetRequest.getSessionRules())
        await expect.poll(async () => (await rules()).length).toBeGreaterThan(0)
        for (const { condition } of await rules()) {
            expect(condition).toMatchObject({ tabIds: [-1], initiatorDomains: [extensionId] })
        }
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

    test('its link opens the options page once, whatever put the note there', async ({ context, extensionId }) => {
        expect(extensionId).toBeTruthy()
        const [worker] = context.serviceWorkers()
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
    const THREAD_SCAN = '.rev-scan-all-btn'
    const PROFILE_SCAN = '.rev-profile-scan-container'
    const OWN_BAR = '.rev-own-filter-bar'
    const post = postElement(POST)
    const feed = (...items) => `<div><hr><shreddit-feed>${items.join('')}</shreddit-feed></div>`
    const comment = id => `<shreddit-comment thingid="${id}"><details open><p>Words</p></details></shreddit-comment>`
    const tree = `<shreddit-comment-tree id="comment-tree">${comment(OWN)}${comment(OTHERS)}</shreddit-comment-tree>`
    const profileComment = id => `<shreddit-profile-comment comment-id="${id}"><p>Words</p></shreddit-profile-comment>`
    const ownComment = page => page.locator(`[thingid="${OWN}"].rev-removed-highlight`)

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
        await expect(page.locator('.buttons a:not(.rev-scan-comment-btn)')).toHaveText('subscribe-rev')
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

    test("old reddit's buttons from the extension's last run give way to working ones", async ({ context }) => {
        const dead = '<li><a class="rev-comment-action">dead</a></li><li><a class="rev-scan-comment-btn rev-comment-action">dead</a></li>'
        const page = await open(
            context,
            `https://old.reddit.com${THREAD}`,
            `<!doctype html><html><body><div id="header"></div><div class="content" role="main">` +
                `<div class="commentarea"><div class="menuarea"><button class="rev-scan-all-btn">dead</button></div>` +
                `${thing(OTHERS, 'comment').replace('<li>permalink</li>', dead)}</div></div></body></html>`,
        )
        await expect(page.locator(`${THREAD_SCAN}[data-rev-subscribe-run]`)).toHaveCount(1)
        await expect(page.locator(THREAD_SCAN)).toHaveCount(1)
        await expect(page.locator('.rev-scan-comment-btn')).toHaveText('scan-rev')
        await expect(page.locator('.buttons a:not(.rev-scan-comment-btn)')).toHaveText('subscribe-rev')
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
        `<shreddit-comment thingid="${id}" postid="${POST}" author="${author}" created="${NOW}" ${parent ? `parentid="${parent}"` : ''}>` +
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
        await context
            .serviceWorkers()[0]
            .evaluate(
                options => chrome.storage.sync.set({ options: { ...options, scan_seconds_between_reads: 1, scan_reads_per_click: 50 } }),
                await installed(context),
            )
        await context.serviceWorkers()[0].evaluate(answers => {
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
    }
    // What scans sent, not the login checks monitoring sends alongside them
    const askedFor = context =>
        context
            .serviceWorkers()[0]
            .evaluate(() => self.asked.filter(path => /\.rss|\/(comments|submitted)\.json/.test(path)))
    const THREAD_FEED_PATH = '/r/pics/comments/abc123/.rss?limit=500'
    const THE_REMOVED_WORDS = {
        [THREAD_FEED_PATH]: threadFeed,
        [userFeed('op')]: feed(),
        [userFeed('someone')]: feed(entry(REMOVED, 'someone', 'The removed words')),
        [userFeed('replier')]: feed(),
    }
    const removedAtTop = comment(REMOVED, {
        author: '[deleted]',
        replies: comment(REPLY, { parent: REMOVED, author: 'replier' }),
    })
    const NEXT_POST = 't3_def456'
    const NEXT_THREAD = '/r/pics/comments/def456/b_title/'
    const nextThread = () => [
        postElement(NEXT_POST).replace('<shreddit-post', '<shreddit-post comment-count="5"'),
        `<shreddit-comment-tree id="comment-tree"><section>${comment('t1_next')}</section></shreddit-comment-tree>`,
    ]

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

    test("reddit's own size for every button leaves the text of ours centered", async ({
        context,
        extensionId, // eslint-disable-line no-unused-vars -- waits for the service worker
    }) => {
        const page = await openNewReddit(context, THREAD, thread(comment(FIRST)))
        await expect(page.locator('.rev-scan-all-btn')).toHaveCount(1)
        // As measured on www.reddit.com, 2026-11-05
        await page.addStyleTag({ content: 'button { box-sizing: border-box; height: 32px; line-height: 30px }' })

        for (const className of ['rev-btn rev-btn-solid', 'rev-btn rev-filter-btn', 'rev-btn rev-newreddit-action']) {
            expect((await buttonWith(page, className)).offCenter).toBeLessThanOrEqual(1)
        }
        await expect(page.locator('.rev-scan-all-btn')).toHaveCSS('line-height', '16px')
    })

    test('solid and outlined buttons are one height where reddit sets none', async ({
        context,
        extensionId, // eslint-disable-line no-unused-vars -- waits for the service worker
    }) => {
        const page = await openNewReddit(context, THREAD, thread(comment(FIRST)))
        await expect(page.locator('.rev-scan-all-btn')).toHaveCount(1)
        const solid = await buttonWith(page, 'rev-btn rev-btn-solid')
        const outlined = await buttonWith(page, 'rev-btn rev-filter-btn')
        expect(solid.height).toBe(outlined.height)
    })

    test('a disabled button stays as it is under the mouse', async ({
        context,
        extensionId, // eslint-disable-line no-unused-vars -- waits for the service worker
    }) => {
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

    test('RES night mode leaves the selected pill readable and every border dark', async ({
        context,
        extensionId, // eslint-disable-line no-unused-vars -- waits for the service worker
    }) => {
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

    // The install writes the default options, and the lists of what's followed
    const installed = async context => {
        const options = () =>
            context
                .serviceWorkers()[0]
                .evaluate(() => chrome.storage.sync.get(['options']).then(sync => sync.options))
        await expect.poll(options).toBeTruthy()
        return options()
    }

    const followed = async context => {
        const worker = context.serviceWorkers()[0]
        const { other_subscriptions } = await worker.evaluate(() => chrome.storage.sync.get('other_subscriptions'))
        return Object.keys(other_subscriptions)
    }
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

    test('a comment and its post get a bell that follows them', async ({
        context,
        extensionId, // eslint-disable-line no-unused-vars -- waits for the service worker
    }) => {
        await installed(context)
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
        expect(await followed(context)).toEqual(expect.arrayContaining([POST, FIRST]))
        await bell.click()
        await expect(bell).toHaveAttribute('aria-label', 'subscribe-rev')
    })

    test('a comment on a profile can be followed', async ({
        context,
        extensionId, // eslint-disable-line no-unused-vars -- waits for the service worker
    }) => {
        await installed(context)
        const page = await onProfile(context, '/user/another/comments/')
        const bell = page.locator('.rev-comment-action')
        await bell.click()
        await expect(bell).toHaveAttribute('aria-label', 'unsubscribe-rev')
        expect(await followed(context)).toContain(REPLY)
        const postOf = () =>
            context
                .serviceWorkers()[0]
                .evaluate(id => chrome.storage.local.get('followed_post_ids').then(l => l.followed_post_ids?.[id]), REPLY)
        await expect.poll(postOf).toContain('abc123')
    })

    test("a row reddit draws again says what's followed now", async ({
        context,
        extensionId, // eslint-disable-line no-unused-vars -- waits for the service worker
    }) => {
        await installed(context)
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
        await context.serviceWorkers()[0].evaluate(() => chrome.storage.sync.set({ other_subscriptions: {} }))
        await expect(bell).toHaveAttribute('aria-label', 'subscribe-rev')
    })

    test("a bell left by the extension's last run gives way to a working one", async ({
        context,
        extensionId, // eslint-disable-line no-unused-vars -- waits for the service worker
    }) => {
        await installed(context)
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
        extensionId, // eslint-disable-line no-unused-vars -- waits for the service worker
    }) => {
        await context.serviceWorkers()[0].evaluate(() => chrome.storage.local.set({ last_logged_in_user: 'someone' }))
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
        await context.serviceWorkers()[0].evaluate(() => chrome.storage.local.set({ last_logged_in_user: 'another' }))
        const bell = rowOf(page, FIRST).locator('.rev-comment-action')
        await expect(bell).not.toHaveAttribute('aria-disabled', 'true')
        await expect(bell).toHaveCSS('opacity', '1')
    })

    test("a restore link and a profile's scan from the extension's last run give way to working ones", async ({
        context,
        extensionId, // eslint-disable-line no-unused-vars -- waits for the service worker
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

    test("unfollowing one's own comment leaves its bell disabled", async ({
        context,
        extensionId, // eslint-disable-line no-unused-vars -- waits for the service worker
    }) => {
        await installed(context)
        await context
            .serviceWorkers()[0]
            .evaluate(
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
        extensionId, // eslint-disable-line no-unused-vars -- waits for the service worker
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

    test('the option to hide subscribe buttons hides them', async ({
        context,
        extensionId, // eslint-disable-line no-unused-vars -- waits for the service worker
    }) => {
        await context
            .serviceWorkers()[0]
            .evaluate(
                options => chrome.storage.sync.set({ options: { ...options, hide_subscribe: true } }),
                await installed(context),
            )
        const page = await openNewReddit(context, THREAD, thread(comment(FIRST)))
        await expect(page.locator('.rev-scan-all-btn')).toHaveCount(1)
        await stampRows(page)
        await expect(rowOf(page, FIRST).locator(SCAN)).toHaveCount(1)
        await expect(page.locator('.rev-comment-action')).toHaveCount(0)
    })

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

    test('a scan keeps to the pace the options set', async ({
        context,
        extensionId, // eslint-disable-line no-unused-vars -- waits for the service worker
    }) => {
        await answerAs(context, THE_REMOVED_WORDS)
        const page = await openNewReddit(context, THREAD, thread(removedAtTop))
        await page.locator('.rev-scan-all-btn').click()
        await expect.poll(() => askedFor(context).then(asked => asked.length)).toBeGreaterThan(2)
        const feedsAt = await context.serviceWorkers()[0].evaluate(() => self.feedsAt)
        const gaps = feedsAt.slice(1).map((at, i) => at - feedsAt[i])
        expect(Math.min(...gaps)).toBeGreaterThan(900)
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

    test("a tombstone's restore link goes once a scan has filled it in", async ({
        context,
        extensionId, // eslint-disable-line no-unused-vars -- waits for the service worker
    }) => {
        await answerAs(context, THE_REMOVED_WORDS)
        const page = await openNewReddit(context, THREAD, thread(comment(FIRST), removedAtTop))
        await expect(page.locator(RESTORE)).toHaveCount(1)
        await page.locator('.rev-scan-all-btn').click()
        await expect(page.locator(RECOVERED)).toContainText('The removed words')
        await expect(page.locator(RESTORE)).toBeHidden()
    })

    test('a tombstone in any language offers restore, not Scan-Rev', async ({
        context,
        extensionId, // eslint-disable-line no-unused-vars -- waits for the service worker
    }) => {
        const german = thread(comment(FIRST, { replies: removedWithReply })).replace(
            'Comment removed by moderator',
            'Von Moderator*innen entfernter Kommentar',
        )
        const page = await openNewReddit(context, THREAD, german)
        await expect(page.locator(RESTORE)).toHaveCount(1)
        await stampRows(page)
        await expect(rowOf(page, REMOVED).locator(SCAN)).toHaveCount(0)
    })

    test("a user's own deletion and a deleted account's live comment offer no restore", async ({
        context,
        extensionId, // eslint-disable-line no-unused-vars -- waits for the service worker
    }) => {
        const deletedByAuthor = comment(REMOVED, { author: '[deleted]' }).replace(
            '<shreddit-comment ',
            '<shreddit-comment is-comment-deleted ',
        )
        const deletedAccount = comment('t1_account', { text: 'Words' }).replace('author="someone"', 'author="[deleted]"')
        const page = await openNewReddit(context, THREAD, thread(deletedByAuthor, deletedAccount))
        await expect(page.locator('.rev-scan-all-btn')).toHaveCount(1)
        await settle(page)
        await expect(page.locator(RESTORE)).toHaveCount(0)
    })

    test("the filter keeps one's own removed comment, and needs no parentid to find replies", async ({
        context,
        extensionId, // eslint-disable-line no-unused-vars -- waits for the service worker
    }) => {
        const OTHER = 't1_other'
        await installed(context)
        await seedOwnRemoved(context, OTHER)
        await answerAs(context, THE_REMOVED_WORDS)
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

    test('Scan-Rev hides while it searches, and cancel stops the search', async ({
        context,
        extensionId, // eslint-disable-line no-unused-vars -- waits for the service worker
    }) => {
        await answerAs(context, THE_REMOVED_WORDS)
        const page = await openNewReddit(
            context,
            THREAD,
            thread(comment(FIRST, { author: 'bystander' }), comment('t1_b', { author: 'b' }), comment('t1_c', { author: 'c' })),
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

        const sent = (await askedFor(context)).length
        await page.waitForTimeout(2000)
        expect(await askedFor(context)).toHaveLength(sent)
    })

    test('a search dims the restore links, and a thread scan can be cancelled', async ({
        context,
        extensionId, // eslint-disable-line no-unused-vars -- waits for the service worker
    }) => {
        await answerAs(context, THE_REMOVED_WORDS)
        const page = await openNewReddit(
            context,
            THREAD,
            thread(comment(FIRST, { author: 'bystander', replies: removedWithReply }), comment('t1_b', { author: 'b' })),
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
        extensionId, // eslint-disable-line no-unused-vars -- waits for the service worker
    }) => {
        await answerAs(context, THE_REMOVED_WORDS)
        const page = await openNewReddit(context, THREAD, thread(comment(FIRST), removedAtTop))
        await startRouter(page)
        // The scan's first read is still out when the page changes
        const [worker] = context.serviceWorkers()
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
        expect(await askedFor(context)).toEqual([THREAD_FEED_PATH])
    })

    test("a post's scan isn't answered from another post's reads", async ({
        context,
        extensionId, // eslint-disable-line no-unused-vars -- waits for the service worker
    }) => {
        await answerAs(context, {
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
            .poll(() => askedFor(context).then(asked => asked.filter(path => path === userFeed('someone')).length))
            .toBe(2)
    })

    test('a post on a profile gets no comment buttons, even after a thread', async ({
        context,
        extensionId, // eslint-disable-line no-unused-vars -- waits for the service worker
    }) => {
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

    test('a removed item goes by date on a page that mixes posts and comments', async ({
        context,
        extensionId, // eslint-disable-line no-unused-vars -- waits for the service worker
    }) => {
        const hoursAgo = hours => new Date(Date.now() - hours * 3600 * 1000).toISOString()
        const dated = (id, hours) => thing(id).replace('<p>', `<time datetime="${hoursAgo(hours)}"></time><p>`)
        const query = 'sort=new&limit=100'
        await answerAs(context, {
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

    test("a comment's search leaves the buttons of comments that need another sort", async ({
        context,
        extensionId, // eslint-disable-line no-unused-vars -- waits for the service worker
    }) => {
        const eightMonthsAgo = new Date(Date.now() - 240 * 24 * 3600 * 1000).toISOString()
        const OLD = 't1_old'
        await answerAs(context, {
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
        extensionId, // eslint-disable-line no-unused-vars -- waits for the service worker
    }) => {
        await answerAs(context, oneRemovedOnProfile())
        const url = 'https://old.reddit.com/user/other/comments/'
        const page = await open(context, url, oldProfile(thing('t1_live')))
        const button = page.locator('.rev-profile-scan-btn')
        await button.click()
        await expect(page.locator(`#siteTable > ${RECOVERED}`)).toHaveCount(1, { timeout: 15000 })
        await expect(page.locator('[data-fullname="t1_live"]')).toBeHidden()

        await button.click()
        await expect(button).toHaveText('Rescan', { timeout: 15000 })
        expect((await askedFor(context)).filter(path => path === LOOKUP)).toHaveLength(2)

        await answerAs(context, {})
        await button.click()
        await expect(page.locator('.rev-profile-scan-progress')).toHaveText('User not found.', { timeout: 15000 })
        await expect(page.locator('[data-fullname="t1_live"]')).toBeVisible()
    })

    test('a page left during a search comes back ready to search', async ({
        context,
        extensionId, // eslint-disable-line no-unused-vars -- waits for the service worker
    }) => {
        await answerAs(context, THE_REMOVED_WORDS)
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

    test('what each click recovers goes in one place for unattached comments', async ({
        context,
        extensionId, // eslint-disable-line no-unused-vars -- waits for the service worker
    }) => {
        const orphan = (id, author, parent) => feed(entry(POST, 'op', 'The post'), entry(parent, author, 'A parent'))
        await answerAs(context, {
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

    test('placing unattached comments stops with its page', async ({
        context,
        extensionId, // eslint-disable-line no-unused-vars -- waits for the service worker
    }) => {
        await answerAs(context, {
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
        extensionId, // eslint-disable-line no-unused-vars -- waits for the service worker
    }) => {
        await answerAs(context, oneRemovedOnProfile())
        const page = await openNewReddit(context, '/user/other/', '<shreddit-feed></shreddit-feed>')
        await startRouter(page)
        await page.locator('.rev-profile-scan-btn').click()
        await visit(page, '/', '<article data-post-id="t3_home"><p>A post</p></article>')
        await expect(page.locator('[data-post-id="t3_home"]')).toBeVisible()
        await page.waitForTimeout(2500)

        await expect(page.locator('[data-post-id="t3_home"]')).toBeVisible()
        await expect(page.locator(RECOVERED)).toHaveCount(0)
        expect((await askedFor(context)).length).toBeLessThan(3)
    })

    test("one's own profile offers a scan for posts", async ({
        context,
        extensionId, // eslint-disable-line no-unused-vars -- waits for the service worker
    }) => {
        const [worker] = context.serviceWorkers()
        // The install writes the default options
        const options = () => worker.evaluate(() => chrome.storage.sync.get(['options']).then(sync => sync.options))
        await expect.poll(options).toBeTruthy()
        await worker.evaluate(
            options =>
                Promise.all([
                    chrome.storage.local.set({ last_logged_in_user: 'someone' }),
                    chrome.storage.sync.set({ options: { ...options, show_scan_on_own_profile: true } }),
                ]),
            await options(),
        )
        const page = await openNewReddit(context, '/user/someone/', '<shreddit-feed></shreddit-feed>')
        await expect(page.locator('.rev-profile-scan-btn')).toHaveText('Scan for removed posts')
    })

    test('a profile scan puts what it finds where the sort has it, on a page sorted by top', async ({
        context,
        extensionId, // eslint-disable-line no-unused-vars -- waits for the service worker
    }) => {
        const query = 'sort=top&limit=100'
        await answerAs(context, {
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

test.describe('Reddit thread pages', () => {
    // Before 0.0.4.0, a scan meant for spans read the text of every element,
    // <html> included, a few times per page view. Threads froze for seconds at
    // a time (the survey's reports of 2026-02-21 and 2026-03-05).
    test('a long thread is not held up by the content script', async ({ context, extensionId }) => {
        // extensionId waits for the worker. The page's removal check stays off reddit.
        const [worker] = context.serviceWorkers()
        await worker.evaluate(() => {
            self.fetch = async () => new Response('', { status: 404 })
        })
        // As on Reddit, comments sit under nested wrappers, each holding all of their text
        const comment = `<div><span>someone</span>${' '.repeat(300)}<p>${'words in a comment '.repeat(20)}</p></div>`
        const thread = Array.from({ length: 12 }).reduce(html => `<div>${html}</div>`, comment.repeat(1000))
        await context.route('https://www.reddit.com/**', route =>
            route.fulfill({
                status: 200,
                contentType: 'text/html',
                body: `<html device="desktop"><body><shreddit-comment-tree>${thread}</shreddit-comment-tree></body></html>`,
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
        await expect(page.locator('.rev-scan-all-btn')).toBeAttached()
        await page.waitForTimeout(1500)
        expect(await page.evaluate(() => window.blockedMs)).toBeLessThan(1000)
    })
})
