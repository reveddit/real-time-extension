// A removed comment goes back on the page through setRedditHTML, which keeps
// only what Reddit's markdown makes, and icons through icon()
import { describe, it, expect, beforeEach } from 'vitest'
import { parseHTML, DOMParser } from 'linkedom'
import { markdownToHTML } from '../../src/src/ui/markdown.ts'
import { icon, setRedditHTML } from '../../src/src/dom-helpers.ts'

beforeEach(() => {
    globalThis.document = parseHTML('<html><body></body></html>').document
    globalThis.DOMParser = DOMParser
})

const put = html => {
    const el = document.createElement('div')
    el.appendChild(document.createTextNode('what was there'))
    setRedditHTML(el, html)
    return el
}
// Tags, attributes and words, with attributes in any order (linkedom lists them backwards)
const attributes = el => [...el.attributes].map(a => `${a.name}=${a.value}`).sort()
const shape = node =>
    node.nodeType === node.TEXT_NODE
        ? node.textContent
        : [node.localName, attributes(node), ...[...node.childNodes].map(shape)]

describe('setRedditHTML', () => {
    it("keeps all that Reddit's markdown makes, as innerHTML would", () => {
        const markdown = [
            '# Head',
            '### Small head',
            '*em* **strong** ***both*** ~~gone~~ ^up `code` and a footnote^(note)',
            '> a quote',
            '>> nested',
            '',
            '* one',
            '* two',
            '    * three',
            '',
            '3. third',
            '4. fourth',
            '',
            '    a code block',
            '',
            '| left | right | middle |',
            '|:--|--:|:-:|',
            '| a | b | c |',
            '',
            '[a link](https://example.com/x?y=1&z=2 "a title"), [a relative one](/r/sub/wiki), /r/sub, u/someone, https://auto.example.com',
            '',
            '---',
            '',
            '>!a spoiler!< and a line  ',
            'broken & <b>typed</b> &lt;i&gt;',
        ].join('\n')
        const html = markdownToHTML(markdown)
        const direct = document.createElement('div')
        direct.innerHTML = html
        expect(html).toContain('<table>')
        expect(html).toContain('title="a title"')
        expect(shape(put(html))).toEqual(shape(direct))
    })

    it('takes what was there away', () => {
        expect(put('<p>new</p>').textContent).toBe('new')
    })

    it('leaves out script, styles, frames and drawings with all that is in them', () => {
        const el = put(
            '<p>a<script>alert(1)</script><style>p { display: none }</style><iframe src="https://example.com"></iframe>' +
                '<svg><text>drawn</text></svg><math><mi>x</mi></math><template><b>t</b></template><noscript>n</noscript>b</p>',
        )
        expect(el.innerHTML).toBe('<p>ab</p>')
    })

    it('keeps words and web addresses, and no handler, style or id', () => {
        const el = put(
            '<p id="x" class="c" style="position: fixed" onclick="alert(1)">t' +
                '<img src="https://i.redd.it/a.png" onerror="alert(1)" alt="a" srcset="https://x.example/b.png 2x"></p>',
        )
        expect(attributes(el.querySelector('p'))).toEqual(['class=c'])
        expect(attributes(el.querySelector('img'))).toEqual(['alt=a', 'src=https://i.redd.it/a.png'])
    })

    it("gives a link that isn't a web address its words but not its address", () => {
        const el = put(
            '<a href="javascript:alert(1)">a</a><a href=" java\tscript:alert(1)">b</a><a href="data:text/html,x">c</a>' +
                '<img src="javascript:alert(1)"><a href="/r/sub">d</a><a href="#s">e</a><a href="mailto:a@example.com">f</a>',
        )
        expect([...el.querySelectorAll('a')].map(a => `${a.textContent}:${a.getAttribute('href')}`)).toEqual([
            'a:null',
            'b:null',
            'c:null',
            'd:/r/sub',
            'e:#s',
            'f:mailto:a@example.com',
        ])
        expect(el.querySelector('img').getAttribute('src')).toBe(null)
    })

    it('lets other tags give way to their words, and leaves out comments', () => {
        const el = put(
            '<!-- SC_OFF --><div class="md"><form><button>press</button><input value="v"></form><custom-el>words</custom-el></div><!-- SC_ON -->',
        )
        expect(el.innerHTML).toBe('<div class="md">presswords</div>')
    })

    it('keeps escaped tags as words', () => {
        const el = put('<p>&lt;img src=x onerror=alert(1)&gt;</p>')
        expect(el.querySelector('img')).toBe(null)
        expect(el.textContent).toBe('<img src=x onerror=alert(1)>')
    })
})

describe('icon', () => {
    it('draws a path in the text color', () => {
        const svg = icon('M0 0h20v20H0z', true)
        expect(svg.namespaceURI).toBe('http://www.w3.org/2000/svg')
        expect(svg.getAttribute('fill')).toBe('currentColor')
        expect(svg.getAttribute('fill-rule')).toBe('evenodd')
        expect(svg.querySelector('path').getAttribute('d')).toBe('M0 0h20v20H0z')
        expect(icon('M0 0').getAttribute('fill-rule')).toBe(null)
    })
})
