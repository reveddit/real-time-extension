// Runs before every test file. Mocks and stubbed globals are restored by the
// config (restoreMocks, unstubGlobals); fake timers are not, so they end here.
import { afterEach, vi } from 'vitest'

afterEach(() => vi.useRealTimers())
