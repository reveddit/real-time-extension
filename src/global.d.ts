// Webpack DefinePlugin global
declare const __BUILT_FOR__: 'chrome' | 'firefox' | 'edge'
// The store this build is for. Unlike __BUILT_FOR__, which is 'chrome' in the
// Edge build too, this tells the two apart.
declare const __STORE__: 'chrome' | 'edge' | 'firefox'
declare const __DEV__: boolean
// Dev and staging builds: the local website (localhost:8080) may use the bridge
declare const __LOCAL_SITE__: boolean
declare const __SIMULATE_DEPRECATION__: boolean

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
