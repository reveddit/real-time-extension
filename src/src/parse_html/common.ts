// consume() from https://qwtel.com/posts/software/how-to-use-htmlrewriter-for-web-scraping/
// also handy: https://blog.csdn.net/wk3368/article/details/129483898

export const consume = async (stream: ReadableStream) => {
    const reader = stream.getReader()
    while (!(await reader.read()).done) {
        /* NOOP */
    }
}

export const oldReddit = 'https://old.reddit.com'
export const newReddit = 'https://www.reddit.com'

export const redditHTMLRequestOptions = {
    headers: {
        'Accept-Language': 'en',
        Cookie: 'over18=1;',
        'User-Agent': 'extension',
    },
}

export const REDDIT_HTML_FETCH_TIMEOUT_MS = 15000

// fetch() never times out on its own; a stalled old.reddit response would hang
// the pending-post loop indefinitely (a "stuck scanning" cause). Abort after a
// bounded time so the loop always makes progress.
export const fetchWithTimeout = async (
    url: string,
    options: Parameters<typeof fetch>[1] = {},
    timeoutMs: number = REDDIT_HTML_FETCH_TIMEOUT_MS,
): Promise<Response> => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
        return await fetch(url, { ...options, signal: controller.signal })
    } finally {
        clearTimeout(timer)
    }
}

export class ErrorCollector {
    errors: Record<string, number>
    url: string
    constructor(url: string) {
        this.errors = {}
        this.url = url
    }
    addError(error_name: string) {
        this.errors[error_name] = (this.errors[error_name] || 0) + 1
    }
    printErrors() {
        for (const [field, numErrors] of Object.entries(this.errors)) {
            if (numErrors) {
                console.error('ERROR:', '[' + field + ']', numErrors, 'times on', this.url)
            }
        }
    }
}
