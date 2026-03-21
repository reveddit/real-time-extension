// Webpack DefinePlugin global
declare const __BUILT_FOR__: 'chrome' | 'firefox' | 'edge'

// jQuery is loaded via <script> tag in extension pages (not imported)
declare const $: JQueryStatic
declare const jQuery: JQueryStatic

// webextension-polyfill
declare module 'webextension-polyfill' {
    const browser: typeof import('webextension-polyfill')
    export default browser
}

// arrive.js — adds .arrive() to jQuery/Document
interface JQuery {
    arrive(selector: string, callback: (element: HTMLElement) => void): void
}
interface Document {
    arrive(selector: string, callback: (element: HTMLElement) => void): void
}

// linkedom
declare module 'linkedom/worker' {
    export class DOMParser {
        parseFromString(string: string, type: string): Document
    }
}

// turndown
declare module 'turndown' {
    export default class TurndownService {
        turndown(html: string | Document): string
        addRule(key: string, rule: { filter: string; replacement: (content: string, node: Node, options: any) => string }): void
    }
}

// @worker-tools/html-rewriter
declare module '@worker-tools/html-rewriter' {
    export class HTMLRewriter {
        on(selector: string, handler: any): HTMLRewriter
        transform(response: Response): Response
    }
}
