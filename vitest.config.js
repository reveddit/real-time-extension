import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        // scripts/: the publish scripts' tests and the shared files' check, which run
        // the real scripts in scratch repos
        include: ['tests/**/*.test.{js,ts}', 'scripts/**/*.test.mjs'],
        exclude: ['tests/e2e/**'],
        globals: true,
        environment: 'node',
        restoreMocks: true,
        unstubGlobals: true,
        silent: true,
        setupFiles: ['tests/mocks/setup.js'],
    },
    resolve: {
        alias: {
            'webextension-polyfill': new URL('tests/mocks/webextension-polyfill.js', import.meta.url).pathname,
        },
    },
})
