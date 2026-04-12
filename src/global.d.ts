// Webpack DefinePlugin global
declare const __BUILT_FOR__: 'chrome' | 'firefox' | 'edge'
declare const __DEV__: boolean

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
        addRule(
            key: string,
            rule: { filter: string; replacement: (content: string, node: Node, options: any) => string },
        ): void
    }
}

// @worker-tools/html-rewriter
declare module '@worker-tools/html-rewriter' {
    export class HTMLRewriter {
        on(selector: string, handler: any): HTMLRewriter
        transform(response: Response): Response
    }
}
