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

        // The popup container should exist
        await expect(page.locator('#popup')).toBeVisible()

        // Should have an "options" link
        await expect(page.locator('text=options')).toBeVisible()

        // Should have a "clear notifications" link
        await expect(page.locator('text=clear notifications')).toBeVisible()
    })
})

test.describe('Options page', () => {
    test('renders all settings with default values', async ({ context, extensionId }) => {
        const page = await context.newPage()
        await page.goto(`chrome-extension://${extensionId}/src/options.html`)

        // Wait for the page to fully load and populate
        await page.waitForLoadState('domcontentloaded')

        // Subscription section header
        await expect(page.locator('text=Subscriptions')).toBeVisible()

        // Tracking & Notification header
        await expect(page.locator('text=Tracking & Notification')).toBeVisible()

        // Checkboxes should exist for removed/locked tracking
        await expect(page.locator('#removed_track')).toBeVisible()
        await expect(page.locator('#removed_notify')).toBeVisible()
        await expect(page.locator('#locked_track')).toBeVisible()
        await expect(page.locator('#locked_notify')).toBeVisible()

        // Interval input should exist
        await expect(page.locator('#interval')).toBeVisible()

        // Hide subscribe checkbox
        await expect(page.locator('#hide_subscribe')).toBeVisible()

        // Monitor quarantined checkbox
        await expect(page.locator('#monitor_quarantined')).toBeVisible()

        // Save button (there are two — top and bottom)
        await expect(page.locator('.rr-opt-save').first()).toBeVisible()

        // Reset link
        await expect(page.locator('#reset')).toBeVisible()

        // Advanced section should be hidden initially
        await expect(page.locator('#advanced')).not.toBeVisible()

        // Click advanced to reveal it
        await page.locator('#advanced-btn').click()
        await expect(page.locator('#advanced')).toBeVisible()
        await expect(page.locator('#clientid')).toBeVisible()
    })
})

test.describe('History page', () => {
    test('renders history page structure', async ({ context, extensionId }) => {
        const page = await context.newPage()
        await page.goto(`chrome-extension://${extensionId}/src/history.html`)

        // Should have a History heading
        await expect(page.locator('h1')).toContainText('History')

        // The history container and tables div should be in the DOM
        await expect(page.locator('#history')).toBeAttached()
        await expect(page.locator('#tables')).toBeAttached()
    })
})

test.describe('Welcome page', () => {
    test('renders welcome UI with connection check', async ({ context, extensionId }) => {
        const page = await context.newPage()
        await page.goto(`chrome-extension://${extensionId}/src/welcome.html`)

        // Welcome header
        await expect(page.locator('h1')).toContainText('Welcome to Reveddit Real-Time')

        // Status message area
        await expect(page.locator('#status-message')).toBeVisible()

        // Check Connection button
        await expect(page.locator('#check-connection')).toBeVisible()
        await expect(page.locator('#check-connection')).toContainText('Check Connection')

        // Getting Started instructions
        await expect(page.locator('text=Getting Started')).toBeVisible()

        // Logo image
        await expect(page.locator('.logo')).toBeVisible()
    })
})
