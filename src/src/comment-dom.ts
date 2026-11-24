import { getMarkupConfig } from './markup-config'

// A comment's replies sit inside it, so a plain lookup can land on a reply's part
export function ownPart(comment: Element, selector: string): HTMLElement | undefined {
    return Array.from(comment.querySelectorAll(selector)).find(el => el.closest('shreddit-comment') === comment) as
        | HTMLElement
        | undefined
}

// Reddit has spelled this thingId and thing-id. Attribute names on a page read lowercase.
const commentIdAttributes = () => getMarkupConfig().commentIdAttributes.map(name => name.toLowerCase())

export const commentIdOf = (comment: Element | null | undefined): string => {
    for (const name of commentIdAttributes()) {
        const id = comment?.getAttribute(name)
        if (id) return id
    }
    return ''
}

export const commentSelector = (id?: string): string =>
    commentIdAttributes()
        .map(name => `shreddit-comment[${name}${id ? `="${id}"` : ''}]`)
        .join(', ')
