// E2E tests for the extension's popup, options, history, and welcome pages.
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
        // The page reads options once on mount and can beat the background's
        // install-time initStorage in this fresh profile — reload so it reads
        // the initialized defaults.
        await page.reload()
        await expect(page.locator('h2', { hasText: 'Subscriptions' }).first()).toBeVisible({ timeout: 10000 })
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
