import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        include: ['tests/**/*.test.{js,ts}'],
        exclude: ['tests/e2e/**'],
        globals: true,
        environment: 'node',
    },
    resolve: {
        alias: {
            'webextension-polyfill': new URL('tests/mocks/webextension-polyfill.js', import.meta.url).pathname,
        },
    },
})
