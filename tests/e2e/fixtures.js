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
            headless: false,
            args: [
                `--disable-extensions-except=${extensionPath}`,
                `--load-extension=${extensionPath}`,
                '--no-first-run',
                '--disable-gpu',
            ],
        })
        await use(context)
        await context.close()
    },
    extensionId: async ({ context }, use) => {
        // Wait for the service worker to register
        let serviceWorker
        if (context.serviceWorkers().length > 0) {
            serviceWorker = context.serviceWorkers()[0]
        } else {
            serviceWorker = await context.waitForEvent('serviceworker')
        }
        const extensionId = serviceWorker.url().split('/')[2]
        await use(extensionId)
    },
})

export const expect = test.expect
