// Playwright fixture that launches Chromium with the extension loaded.
// See: https://playwright.dev/docs/chrome-extensions

import { test as base, chromium } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Path to the dev build output (must run `yarn build-chrome-dev` first)
const extensionPath = path.join(__dirname, '..', '..', 'dist-dev-chrome')

export const test = base.extend({
    // eslint-disable-next-line no-empty-pattern
    context: async ({}, use) => {
        const context = await chromium.launchPersistentContext('', {
            // No window: the `chromium` channel runs Chromium's new headless mode, which
            // (unlike the default headless shell) loads extensions. E2E_HEADED=1 shows it.
            channel: 'chromium',
            headless: !process.env.E2E_HEADED,
            args: [
                `--disable-extensions-except=${extensionPath}`,
                `--load-extension=${extensionPath}`,
                '--no-first-run',
                '--disable-gpu',
            ],
        })
        // Nothing reaches a live site: what a test doesn't answer itself gets a 404,
        // from the extension's pages and its worker alike. Routes added later win.
        await context.route(/^https?:\/\//, r => r.fulfill({ status: 404, body: '' }))
        await use(context)
        await context.close()
    },
    // Auto: every test waits for the service worker to register, and gets it here
    worker: [
        async ({ context }, use) => {
            const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'))
            await use(worker)
        },
        { auto: true },
    ],
    extensionId: async ({ worker }, use) => {
        await use(worker.url().split('/')[2])
    },
    // A new tab on one of the extension's own pages, e.g. openPage('options.html#second-account')
    openPage: async ({ context, extensionId }, use) => {
        await use(async file => {
            const page = await context.newPage()
            await page.goto(`chrome-extension://${extensionId}/src/${file}`)
            return page
        })
    },
    // The install writes the default options, and the lists of what's followed
    installed: async ({ worker }, use) => {
        const options = () => worker.evaluate(() => chrome.storage.sync.get(['options']).then(sync => sync.options))
        await use(async () => {
            await expect.poll(options, { timeout: 15000 }).toBeTruthy()
            return options()
        })
    },
    setOptions: async ({ worker, installed }, use) => {
        await use(async changes =>
            worker.evaluate(options => chrome.storage.sync.set({ options }), { ...(await installed()), ...changes }),
        )
    },
})

export const expect = test.expect
