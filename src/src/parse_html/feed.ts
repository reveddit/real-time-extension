// Reddit's Atom feeds, read into the items the scans and the bridge use. A
// person's feed still has the comments moderators removed, with their text,
// and leaves out what the person deleted (verified 2026-11-04). Content scripts
// parse with the browser's DOMParser; Chrome's service worker has none, so the
// bridge passes linkedom's (feed-listing.ts).

interface DomParser {
    parseFromString(text: string, type: any): any
}

export function parseFeed(xml: string, parser: DomParser = new DOMParser()): any[] {
    const feed = parser.parseFromString(xml, 'text/xml')
    // A challenge, a login page, an empty body or a cut-off feed isn't a person
    // with no comments. Browsers differ on what survives a parse error.
    if (feed.documentElement?.localName !== 'feed' || feed.querySelector('parsererror')) {
        throw Object.assign(new Error('a page in place of the feed'), { refused: true })
    }
    return Array.from(feed.querySelectorAll('entry')).map((entry: any) => {
        const name = entry.querySelector('id')?.textContent || ''
        const isCommentItem = name.startsWith('t1_')
        const href = entry.querySelector('link')?.getAttribute('href') || ''
        const permalink = href.replace(/^https:\/\/[^/]+/, '')
        const post = permalink.match(/\/comments\/([a-z0-9]+)/i)?.[1]
        const content = entry.querySelector('content')?.textContent || ''
        const bodyEl = parser.parseFromString(content, 'text/html').querySelector('.md')
        const title = entry.querySelector('title')?.textContent || ''
        const date = entry.querySelector('published')?.textContent || entry.querySelector('updated')?.textContent
        return {
            kind: isCommentItem ? 't1' : 't3',
            data: {
                name,
                author: entry.querySelector('author name')?.textContent?.replace(/^\/u\//, '') || '[deleted]',
                subreddit: entry.querySelector('category')?.getAttribute('term') || '',
                body: (bodyEl?.textContent || '').trim(),
                body_html: bodyEl?.innerHTML || '',
                title: isCommentItem ? undefined : title,
                // A comment's title reads "/u/name on the post's title"
                link_title: isCommentItem ? title.replace(/^\/u\/\S+ on /, '') : undefined,
                created_utc: Math.floor(Date.parse(date || '') / 1000) || 0,
                permalink,
                link_id: post ? 't3_' + post : undefined,
            },
        }
    })
}
