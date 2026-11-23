// The version history the news page shows, read from STORE_DESCRIPTION.txt by the build.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { parseReleaseHistory } from '../../release-history.js'

const read = file => readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8')

describe('parseReleaseHistory', () => {
    it('lists each release newest first, with its date and each of its notes', () => {
        const text = [
            'A listing',
            '- a line before the history is not a note',
            'VERSION HISTORY:',
            '',
            '2026/11/17 - 0.0.5.37',
            '- first note',
            '',
            '2026/11/15 - 0.0.5.36',
            '- one',
            '- two',
            '',
        ].join('\n')
        expect(parseReleaseHistory(text)).toEqual([
            { version: '0.0.5.37', date: '2026/11/17', notes: ['first note'] },
            { version: '0.0.5.36', date: '2026/11/15', notes: ['one', 'two'] },
        ])
    })

    it('reads the older entries, which write their dates with dashes', () => {
        const text = 'VERSION HISTORY:\n\n2020-11-01 - 0.0.1.3\n- prepare for manifest v3\n'
        expect(parseReleaseHistory(text)).toEqual([
            { version: '0.0.1.3', date: '2020/11/01', notes: ['prepare for manifest v3'] },
        ])
    })

    it('reads one-digit months and days, and writes them with two digits', () => {
        const text = 'VERSION HISTORY:\n\n2026/4/12 - 0.0.5.2\n- b\n\n2026/4/1 - 0.0.5.1\n- a\n\n2026-5-3 - 0.0.5.3\n- c\n'
        expect(parseReleaseHistory(text)).toEqual([
            { version: '0.0.5.2', date: '2026/04/12', notes: ['b'] },
            { version: '0.0.5.1', date: '2026/04/01', notes: ['a'] },
            { version: '0.0.5.3', date: '2026/05/03', notes: ['c'] },
        ])
    })

    // Skipping it would file its notes under the release above, with nothing to show it
    it("refuses a dated line it can't read as a release header", () => {
        const text = 'VERSION HISTORY:\n\n2026/11/17 - 0.0.5.37\n- a\n\n2026/11/15 - 0.0.5.36 (hotfix)\n- b\n'
        expect(() => parseReleaseHistory(text)).toThrow("can't read this VERSION HISTORY header")
    })

    it('refuses a file with no VERSION HISTORY, as the build does', () => {
        expect(() => parseReleaseHistory('2026/11/17 - 0.0.5.37\n- a note')).toThrow('VERSION HISTORY')
    })
})

// The page lists these as they are, so a drift in the file's format shows here
describe("this repo's STORE_DESCRIPTION.txt", () => {
    const releases = parseReleaseHistory(read('STORE_DESCRIPTION.txt'))

    it('has a version, a date and a note for every release, each version once', () => {
        expect(releases.length).toBeGreaterThan(10)
        for (const release of releases) {
            expect(release.version).toMatch(/^\d+(\.\d+)+$/)
            expect(release.date).toMatch(/^\d{4}\/\d{2}\/\d{2}$/)
            expect(release.notes.length, release.version).toBeGreaterThan(0)
        }
        expect(new Set(releases.map(release => release.version)).size).toBe(releases.length)
    })

    // Counted without the parser's own header rule, which once skipped three of them
    it('reads a release for every dated header line, each with its own notes', () => {
        const text = read('STORE_DESCRIPTION.txt')
        const history = text.slice(text.indexOf('VERSION HISTORY')).split('\n')
        const headers = history.filter(line => /^\d{4}[/-]\d{1,2}[/-]\d{1,2}\s*-/.test(line.trim()))
        const bullets = history.filter(line => line.trim().startsWith('- '))
        expect(releases).toHaveLength(headers.length)
        expect(releases.flatMap(release => release.notes)).toHaveLength(bullets.length)
    })

    // What the build needs, found here before it fails there
    it("has an entry for the manifest's version", () => {
        const { version } = JSON.parse(read('src/manifest.json'))
        expect(releases.map(release => release.version)).toContain(version)
    })
})
