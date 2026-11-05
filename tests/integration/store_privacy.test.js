// STORE_PRIVACY.txt holds the answers to the stores' privacy forms: one for each
// permission the manifest asks for, each short enough for the form to take.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')
const manifest = JSON.parse(read('src/manifest.json'))
const FIELD_LIMIT = 1000

// A heading is a line of capitals and spaces, on its own between blank lines
const fields = {}
let heading
for (const line of read('STORE_PRIVACY.txt').split('\n')) {
    if (/^[A-Z][A-Z ]+$/.test(line)) {
        heading = line
        fields[heading] = ''
    } else if (heading) {
        fields[heading] += line + '\n'
    }
}

describe('the answers to the stores’ privacy forms', () => {
    it('have a field for every permission, and none for a permission the manifest dropped', () => {
        const permissions = [...manifest.permissions.map(name => name.toUpperCase()), 'HOST PERMISSIONS']
        expect(Object.keys(fields).sort()).toEqual([...permissions, 'SINGLE PURPOSE'].sort())
    })

    it('fit the forms, and none is left to fill in', () => {
        for (const [heading, answer] of Object.entries(fields)) {
            expect(answer.trim().length, heading).toBeGreaterThan(0)
            expect(answer.trim().length, heading).toBeLessThanOrEqual(FIELD_LIMIT)
            expect(answer, heading).not.toMatch(/Not recorded/)
        }
    })
})
