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
