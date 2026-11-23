import { DOMParser } from 'linkedom/worker'
import TurndownService from 'turndown'

const turndownService = new TurndownService()
const domParser = new DOMParser()

export const htmlToMarkdown = (string: string): string => {
    // Must specify text/html. Without specifying, parser does not include links and messes up spacing
    return turndownService.turndown(domParser.parseFromString(string, 'text/html'))
}

turndownService.addRule('listItem', {
    filter: 'li',

    replacement: function (content, node, options) {
        content = content
            .replace(/^\n+/, '') // remove leading newlines
            .replace(/\n+$/, '\n') // replace trailing newlines with just a single one
            .replace(/\n/gm, '\n    ') // indent
        let prefix = options.bulletListMarker + ' '
        const parent = node.parentNode as Element
        if (parent.nodeName === 'OL') {
            const start = parent.getAttribute('start')
            const index = Array.prototype.indexOf.call(parent.children, node)
            prefix = (start ? Number(start) + index : index + 1) + '. '
        }
        return prefix + content + (node.nextSibling && !/\n$/.test(content) ? '\n' : '')
    },
})
