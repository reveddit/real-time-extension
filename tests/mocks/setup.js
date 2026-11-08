// Runs before every test file. Mocks and stubbed globals are restored by the
// config (restoreMocks, unstubGlobals); fake timers are not, so they end here.
import { afterEach, vi } from 'vitest'
import { locks, __resetLocks } from './locks.js'

// The extension's contexts share one origin's Web Locks (one-at-a-time.ts).
// Node 20 has no navigator; an extension page's (extension-page.js) keeps these.
globalThis.navigator ??= { userAgent: '' }
Object.defineProperty(globalThis.navigator, 'locks', { value: locks, configurable: true })

afterEach(() => {
    vi.useRealTimers()
    __resetLocks()
})
