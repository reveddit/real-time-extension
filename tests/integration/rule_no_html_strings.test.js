// No code puts an HTML string on a page. Firefox's linter warns about each one,
// and the add-on store's reviewers read those warnings; a string with words from
// a page or a feed in it could also carry script onto reddit.com. Words go in
// with textContent or element(), icons with icon(), and the comments Reddit
// rendered with setRedditHTML (all in src/src/dom-helpers.ts). The extension's
// own pages render markdown through React and markdownToHTML, which escapes
// what people type.
import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'fs'

const SRC = new URL('../../src/', import.meta.url)
const HTML_WRITE = /\.(inner|outer)HTML\s*\+?=(?!=)|insertAdjacentHTML\s*\(|createContextualFragment\s*\(|document\.write(ln)?\s*\(/

describe('HTML strings', () => {
    it('no source file writes one into a page', () => {
        const files = readdirSync(SRC, { recursive: true }).filter(file => /\.tsx?$/.test(file))
        expect(files.length).toBeGreaterThan(50)
        const writes = files.flatMap(file =>
            readFileSync(new URL(file, SRC), 'utf8')
                .split('\n')
                .flatMap((line, i) => (HTML_WRITE.test(line) ? [`${file}:${i + 1}: ${line.trim()}`] : [])),
        )
        expect(writes).toEqual([])
    })

    it('the check sees each way of writing one', () => {
        for (const line of [
            'el.innerHTML = html',
            'el.outerHTML = html',
            'el.innerHTML += html',
            "el.insertAdjacentHTML('beforeend', html)",
            'range.createContextualFragment(html)',
            'document.write(html)',
        ]) {
            expect(HTML_WRITE.test(line), line).toBe(true)
        }
        expect(HTML_WRITE.test("body_html: bodyEl?.innerHTML || ''")).toBe(false)
        expect(HTML_WRITE.test('if (el.innerHTML === html) return')).toBe(false)
    })
})
