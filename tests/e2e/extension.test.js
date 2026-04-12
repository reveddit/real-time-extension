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

        // Wait for async storage load to complete (Subscriptions heading appears)
        await expect(page.locator('h2', { hasText: 'Subscriptions' }).first()).toBeVisible({ timeout: 10000 })

        // Tracking & Notification header
        await expect(page.locator('h2', { hasText: 'Tracking & notification' })).toBeVisible()

        // Tracking grid should have checkboxes for removed/locked
        await expect(page.locator('text=removed')).toBeVisible()
        await expect(page.locator('text=locked')).toBeVisible()
        const checkboxes = page.locator('input[type="checkbox"]')
        await expect(checkboxes.first()).toBeVisible()

        // Polling section with interval input
        await expect(page.locator('h2', { hasText: 'Polling' })).toBeVisible()
        await expect(page.locator('text=minutes between updates')).toBeVisible()

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
