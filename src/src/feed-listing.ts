// A person's comment feed as the bridge answers it to reveddit.com's user pages
// (bridge.ts): Reddit's Atom read into a comments listing's shape, each body in
// markdown, which the site renders as it renders every comment. The feed is
// what the site lines up with the profile listing to find removed comments.
import { DOMParser } from 'linkedom/worker'
import { parseFeed } from './parse_html/feed'
import { htmlToMarkdown } from './parse_html/markdown'

export const NOT_A_FEED = 'not_a_feed'

const notAFeed = () => Object.assign(new Error(NOT_A_FEED), { notAFeed: true })

export const feedListing = (xml: string) => {
    // linkedom doesn't report a broken document the way browsers do, so a
    // cut-off feed would read as a short one
    if (!/<\/feed>\s*$/.test(xml)) {
        throw notAFeed()
    }
    let items: any[]
    try {
        items = parseFeed(xml, new DOMParser())
    } catch {
        throw notAFeed()
    }
    const children = items
        .filter(item => item.kind === 't1')
        .map(({ data }) => ({
            kind: 't1',
            data: {
                name: data.name,
                id: data.name.slice(3),
                author: data.author,
                subreddit: data.subreddit,
                body: data.body_html ? htmlToMarkdown(data.body_html) : data.body,
                link_id: data.link_id,
                link_title: data.link_title,
                permalink: data.permalink,
                created_utc: data.created_utc,
            },
        }))
    return {
        kind: 'Listing',
        data: { children, after: children.length ? children[children.length - 1].data.name : null },
    }
}
