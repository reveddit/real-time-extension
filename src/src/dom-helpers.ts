/**
 * Observes the DOM for elements matching a selector being added.
 * Only fires for newly added elements, not existing ones.
 * Replaces arrive.js functionality.
 */
export function observe(
    parent: Element | Document,
    selector: string,
    callback: (element: Element) => void,
): MutationObserver {
    const observer = new MutationObserver(mutations => {
        for (const mutation of mutations) {
            for (const node of Array.from(mutation.addedNodes)) {
                if (node.nodeType !== Node.ELEMENT_NODE) continue
                const el = node as Element
                if (el.matches(selector)) callback(el)
                el.querySelectorAll(selector).forEach(child => callback(child))
            }
        }
    })
    observer.observe(parent, { childList: true, subtree: true })
    return observer
}

// Nothing goes on a page from an HTML string (tests/integration/rule_no_html_strings.test.js)
const HTML_NS = 'http://www.w3.org/1999/xhtml'
const SVG_NS = 'http://www.w3.org/2000/svg'

export function element(tag: string, className: string, ...children: (string | Node)[]): HTMLElement {
    const made = document.createElement(tag)
    if (className) made.className = className
    made.append(...children)
    return made
}

// A 16-pixel icon in the text's color
export function icon(path: string, evenOdd = false): SVGSVGElement {
    const svg = document.createElementNS(SVG_NS, 'svg')
    svg.setAttribute('fill', 'currentColor')
    if (evenOdd) svg.setAttribute('fill-rule', 'evenodd')
    svg.setAttribute('height', '16')
    svg.setAttribute('width', '16')
    svg.setAttribute('viewBox', '0 0 20 20')
    const shape = document.createElementNS(SVG_NS, 'path')
    shape.setAttribute('d', path)
    svg.appendChild(shape)
    return svg
}

// What Reddit's markdown makes
const MARKDOWN_TAGS = new Set(
    'a b blockquote br code del div em h1 h2 h3 h4 h5 h6 hr i img li ol p pre s span strike strong sub sup table tbody td tfoot th thead tr u ul'.split(
        ' ',
    ),
)
const MARKDOWN_ATTRIBUTES = new Set('align alt class colspan height href rel rowspan src start title width'.split(' '))
// Code and controls, not words, so what's inside goes too
const DROPPED_TAGS = new Set(
    'embed head iframe math noscript object script select style svg template textarea title'.split(' '),
)
const isWebAddress = (value: string) => {
    try {
        return ['http:', 'https:', 'mailto:'].includes(new URL(value, 'https://www.reddit.com/').protocol)
    } catch {
        return false
    }
}

// New nodes made of only what markdown makes: another tag gives way to its
// words, links and images keep only web addresses, and no other attribute
// (onerror, style) comes along
function markdownNodes(parent: Node): Node[] {
    return Array.from(parent.childNodes).flatMap((node): Node[] => {
        if (node.nodeType === node.TEXT_NODE) return [document.createTextNode(node.textContent || '')]
        if (node.nodeType !== node.ELEMENT_NODE) return []
        const el = node as Element
        if (el.namespaceURI !== HTML_NS || DROPPED_TAGS.has(el.localName)) return []
        const children = markdownNodes(el)
        if (!MARKDOWN_TAGS.has(el.localName)) return children
        const copy = document.createElement(el.localName)
        for (const { name, value } of Array.from(el.attributes)) {
            if (!MARKDOWN_ATTRIBUTES.has(name)) continue
            if ((name === 'href' || name === 'src') && !isWebAddress(value)) continue
            copy.setAttribute(name, value)
        }
        copy.append(...children)
        return [copy]
    })
}

// A comment's HTML as Reddit rendered it (its feeds, old pages and JSON).
// Reddit escapes what people type, and keeping only what markdown makes means
// a slip there still can't run script on reddit.com.
export function setRedditHTML(target: Element, html: string) {
    const parsed = new DOMParser().parseFromString(`<html><body>${html}`, 'text/html')
    target.replaceChildren(...markdownNodes(parsed.body))
}

/**
 * Find elements by tag name whose text content matches (case-insensitive).
 * Replaces the custom jQuery :equalsi selector.
 */
export function findByText(parent: Element | Document, tagName: string, text: string): Element[] {
    const lowerText = text.toLowerCase().trim()
    return Array.from(parent.querySelectorAll(tagName)).filter(
        el => (el.textContent || '').toLowerCase().trim() === lowerText,
    )
}
