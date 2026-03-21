import { defineConfig } from '@playwright/test'

export default defineConfig({
    testDir: './tests/e2e',
    timeout: 30000,
    retries: 0,
    use: {
        // No default browser — tests launch with extension context
    },
    projects: [
        {
            name: 'chrome-extension',
            use: {
                // Playwright will launch Chromium with the extension loaded via fixtures
            },
        },
    ],
})
