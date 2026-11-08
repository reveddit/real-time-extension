// The Firefox background as tests load it (tests/mocks/background.js). The config
// undoes every stubGlobal before each test, so a fetch stubbed that way at load
// would be the real one again by the first test.

// Install chrome global BEFORE any source import
import '../mocks/chrome-api.js'

import { describe, it, expect, vi, beforeAll } from 'vitest'
import { loadBackground } from '../mocks/background.js'

beforeAll(() => loadBackground())

// A data: address, which a real fetch answers at once without going anywhere
const answered = () =>
    Promise.race([
        fetch('data:,x').then(
            () => 'answered',
            () => 'failed',
        ),
        new Promise(resolve => setTimeout(() => resolve('no answer'), 100)),
    ])

describe('the background as tests load it', () => {
    it("sends nothing from a test that doesn't stub fetch", async () => {
        expect(await answered()).toBe('no answer')
    })

    it("leaves a test's own stub working", async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => new Response('')),
        )
        expect(await answered()).toBe('answered')
    })

    it('sends nothing again in the test after one that stubbed fetch', async () => {
        expect(await answered()).toBe('no answer')
    })
})
