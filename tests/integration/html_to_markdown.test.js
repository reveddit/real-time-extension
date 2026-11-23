// htmlToMarkdown (parse_html/markdown.ts) turns the HTML of a comment's words
// into the markdown they were written in. Kept from the legacy readers for the
// feed parser that comes next.

import { describe, it, expect } from 'vitest'
import { htmlToMarkdown } from '../../src/src/parse_html/markdown'

describe('htmlToMarkdown', () => {
    it('keeps links and emphasis', () => {
        expect(htmlToMarkdown('<p>see <a href="https://example.com/a">this</a> and <strong>that</strong></p>')).toBe(
            'see [this](https://example.com/a) and **that**',
        )
    })

    it('indents a nested list under its item, by four spaces', () => {
        expect(htmlToMarkdown('<ul><li>one<ul><li>inner</li></ul></li><li>two</li></ul>')).toBe(
            '* one\n    * inner\n* two',
        )
    })

    it('numbers an ordered list from its start attribute', () => {
        expect(htmlToMarkdown('<ol start="3"><li>c</li><li>d</li></ol>')).toBe('3. c\n4. d')
    })
})
