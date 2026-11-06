import {
    consume,
    getLegacyBase,
    legacyPageUrl,
    redditHTMLRequestOptions,
    fetchWithTimeout,
    LEGACY_CHALLENGE_SELECTOR,
    LEGACY_REFUSED_ERROR,
} from './common'
import { DOMParser } from 'linkedom/worker'
import TurndownService from 'turndown'
import { HTMLRewriter } from '@worker-tools/html-rewriter'

const turndownService = new TurndownService()
const domParser = new DOMParser()

const getMarkdownFromHTMLString = (string: string): string => {
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

class AttributeMapping {
    field: string
    attribute: string
    constructor(field: string, attribute: string) {
        this.field = field
        this.attribute = attribute
    }
}
const attribute_mappings = [
    new AttributeMapping('name', 'data-fullname'),
    new AttributeMapping('subreddit', 'data-subreddit'),
    new AttributeMapping('author_fullname', 'data-author-fullname'),
    new AttributeMapping('author', 'data-author'),
    new AttributeMapping('permalink', 'data-permalink'),
    new AttributeMapping('subreddit_id', 'data-subreddit-fullname'),
]

const WWW_REDDIT_COM = 'https://www.reddit.com'
const leftSpaceBoundary = '(^|\\s)',
    rightSpaceBoundary = '($|\\s)'
const regexWithSpaceOnLeftAndRight = (middle: string) => new RegExp(leftSpaceBoundary + middle + rightSpaceBoundary)
const match_controversial = regexWithSpaceOnLeftAndRight('controversial')
const match_stickied = regexWithSpaceOnLeftAndRight('stickied')
const COMMENT_DEFAULTS = {
    removal_reason: null,
    quarantine: false,
    score: 1, // score is not present when hidden
    locked: false,
    distinguished: null,
    stickied: false,
}
// classes whose presence indicate the field should be true, and false for their absence
const BINARY_FIELD_TO_CLASS_REGEXES = {
    locked: regexWithSpaceOnLeftAndRight('locked'), // only detects submission locks. comment locks will overwrite the value here
}

const fullnameIsComment = (name: string) => name.substr(0, 2) === 't1'

// keep track of items appearing on old reddit's HTML
// based on solution from: https://stackoverflow.com/questions/68114819/access-nested-elements-in-htmlrewriter-cloudflare-workers
class Items {
    items: Record<string, any>[] = []
    element(element: any) {
        const item: Record<string, any> = {}
        for (const att_map of attribute_mappings) {
            const value = element.getAttribute(att_map.attribute)
            if (value !== null) {
                item[att_map.field] = value
            }
        }
        const classes = element.getAttribute('class')
        for (const [field, regex] of Object.entries(BINARY_FIELD_TO_CLASS_REGEXES)) {
            item[field] = !!classes.match(regex)
        }
        if (!item.name && item.permalink) {
            const parts = item.permalink.split('/').filter(Boolean)
            // Comment permalinks: /r/<sub>/comments/<post_id>/<slug>/<comment_id>/
            // Post permalinks:    /r/<sub>/comments/<post_id>/<slug>/
            if (parts.length >= 5 && parts[2] === 'comments') {
                if (parts.length >= 6) {
                    item.name = 't1_' + parts[5]
                } else {
                    item.name = 't3_' + parts[3]
                }
            }
        }
        if (!item.name) {
            return
        }
        item.id = item.name.replace(/^t[0-9]_/, '')
        if (fullnameIsComment(item.name)) {
            if (item.permalink) {
                const permalink_parts = item.permalink.split('/')
                item.link_id = 't3_' + permalink_parts[4]
                item.link_permalink = WWW_REDDIT_COM + permalink_parts.slice(0, 6).join('/') + '/'
            }
            item.stickied = !!classes.match(match_stickied)
            if (classes.match(match_controversial)) {
                item.controversiality = 1
            } else {
                item.controversiality = 0
            }
        }
        this.items.push(item)
    }
    fillInDefaultValues() {
        for (const item of this.items) {
            if (fullnameIsComment(item.name)) {
                for (const [field, value] of Object.entries(COMMENT_DEFAULTS)) {
                    if (!(field in item)) {
                        item[field] = value
                    }
                }
            }
        }
    }
}
class ItemsMeta {
    items: Record<string, any>[]
    last: Record<string, any>
    constructor(itemsObj: Items) {
        this.items = itemsObj.items
        this.last = {}
    }
    // any extending class must call super.element(element) to define this.last
    element(_element: any) {
        if (this.items.length) {
            this.last = this.items[this.items.length - 1]
        }
    }
}
class OneField extends ItemsMeta {
    field_name: string
    value: any
    constructor(itemsObj: Items, field_name: string, value?: any) {
        super(itemsObj)
        this.field_name = field_name
        this.value = value
    }
    element(element: any, value = this.value) {
        super.element(element)
        this.last[this.field_name] = value
    }
}

// https://qwtel.com/posts/software/how-to-use-htmlrewriter-for-web-scraping/#extracting-html-subtrees
class InnerHTML extends ItemsMeta {
    field_name: string
    constructor(itemsObj: Items, field_name: string) {
        super(itemsObj)
        this.field_name = field_name
    }
    element(element: any) {
        super.element(element)
        if (!this.last[this.field_name]) {
            this.last[this.field_name] = ''
        }
        const attrs = [...element.attributes].map(([k, v]: [string, string]) => ` ${k}="${v}"`).join('')
        this.last[this.field_name] += `<${element.tagName}${attrs}>`
        // <br> tags can throw a "no end tag" error here.
        if (element.tagName !== 'br') {
            // If there are any other unclosed tags, it is better to ignore bad HTML w/try & catch than fail.
            try {
                element.onEndTag((endTag: any) => {
                    this.last[this.field_name] += `</${endTag.name}>`
                })
            } catch {
                /* ignored */
            }
        }
    }
    text({ text }: { text: string }) {
        this.last[this.field_name] += text
    }
}

class AuthorDeleted extends ItemsMeta {
    constructor(itemsObj: Items) {
        super(itemsObj)
    }
    element(element: any) {
        super.element(element)
        this.last['author'] = '[deleted]'
    }
}

class Score extends OneField {
    constructor(itemsObj: Items) {
        super(itemsObj, 'score')
    }
    element(element: any) {
        super.element(element, Number(element.getAttribute('title')))
    }
}

const getEpochTimeFromDate = (dateString: string): number => {
    return new Date(dateString).getTime() / 1000
}

const match_created = regexWithSpaceOnLeftAndRight('live-timestamp')
const match_edited = regexWithSpaceOnLeftAndRight('edited-timestamp')

class Times extends ItemsMeta {
    element(element: any) {
        super.element(element)
        const classes = element.getAttribute('class')
        let field
        if (classes.match(match_created)) {
            field = 'created_utc'
        } else if (classes.match(match_edited)) {
            field = 'edited'
        }
        if (field) {
            const epoch_seconds = getEpochTimeFromDate(element.getAttribute('datetime'))
            if (epoch_seconds) {
                this.last[field] = epoch_seconds
            }
        }
    }
}

class MetaRobots {
    is_removed = false
    element(_element: any) {
        this.is_removed = true
    }
}

class ThingCounter {
    count = 0
    element(_element: any) {
        this.count++
    }
}

class ThreadPageAuthor {
    author = ''
    text({ text }: { text: string }) {
        this.author += text.trim()
    }
}

// Parses the legacy /api/info HTML listing for the given ids. Removed comments
// are NOT rendered there (verified live), so absence is the removal signal;
// `valid` says whether the response was a real listing (#siteTable present),
// because a challenge or login page also answers 200 and would otherwise read
// as "everything removed". Posts render regardless of removal status, so a
// post's status needs its own page (getPost_fromOld).
interface LegacyInfoResult {
    valid: boolean
    items: Record<string, any>[]
}
const getInfoById_fromLegacyHTML = async (ids: string | string[]): Promise<LegacyInfoResult> => {
    const idsArray = Array.isArray(ids) ? ids : ids.split(',')
    const url = (await getLegacyBase()) + '/api/info?id=' + idsArray.join(',')
    const response = await fetch(url, { ...redditHTMLRequestOptions, credentials: 'omit' })
    if (!response.ok) {
        throw new Error(`legacy reddit HTML request failed: ${response.status}`)
    }
    const itemsObj = new Items()
    const tableObj = new ThingCounter()
    const rewriter = new HTMLRewriter()
        .on('#siteTable', tableObj)
        // Posts stay in the list until the end: the handlers below write to
        // the last thing, so a post's parts would land on the comment before it
        .on('#siteTable .thing', itemsObj)
        .on('#siteTable .thing.deleted', new AuthorDeleted(itemsObj))
        .on('#siteTable .thing .entry .usertext-body .md *', new InnerHTML(itemsObj, 'body'))
        .on('#siteTable .thing .tagline .score.unvoted', new Score(itemsObj))
        .on('#siteTable .thing .tagline time', new Times(itemsObj))
        .on('#siteTable .thing .tagline .locked-tagline', new OneField(itemsObj, 'locked', true))
    await consume(rewriter.transform(response).body!)
    itemsObj.fillInDefaultValues()
    itemsObj.items.forEach(item => {
        if (item.body) {
            item.body_html = item.body
            item.body = getMarkdownFromHTMLString(item.body)
        }
    })
    return { valid: tableObj.count > 0, items: itemsObj.items }
}

// Exported function for lookupItemsByID fallback - parses HTML from the legacy
// /api/info listing. Returns array of {data: item} to match JSON API format.
// Throws on a page that isn't a listing.
export const getItemsById_fromOldHTML = async (ids: string | string[]) => {
    const idsArray = Array.isArray(ids) ? ids : ids.split(',')
    const { valid, items } = await getInfoById_fromLegacyHTML(idsArray)
    if (!valid) {
        // A 200 that isn't a listing is a refusal, whether it's the challenge
        // or anything else. It's worded as a 403 because that's the shape
        // noteLegacyRefusal rests the listing on.
        throw new Error('legacy reddit HTML request failed: 403 (no listing: reddit refuses legacy pages)')
    }
    // Return only comments — posts are excluded because /api/info HTML cannot
    // determine post removal status. Posts are handled via the pending post
    // queue, which reads their own pages (requests.ts lookupItemsByID_legacy).
    return items.filter(item => !item.name || !item.name.startsWith('t3_')).map(item => ({ data: item }))
}

export const getPost_fromOld = async (path: string) => {
    const url = legacyPageUrl(await getLegacyBase(), path)
    const response = await fetchWithTimeout(url, redditHTMLRequestOptions)
    if (!response.ok) {
        // The status lets callers tell a refusal (403: the legacy paths rest)
        // from a missing page
        return { error: `legacy reddit HTML request failed: ${response.status}`, status: response.status }
    }
    const metaRobotsObj = new MetaRobots()
    const authorObj = new ThreadPageAuthor()
    const thingsObj = new ThingCounter()
    const challengeObj = new ThingCounter()
    const rewriter = new HTMLRewriter()
        .on('meta[name="robots"][content="noindex,nofollow"]', metaRobotsObj)
        .on('#siteTable .thing .tagline span', authorObj)
        .on('#siteTable .thing', thingsObj)
        .on(LEGACY_CHALLENGE_SELECTOR, challengeObj)
    await consume(rewriter.transform(response).body!)
    if (thingsObj.count === 0) {
        // Not a legacy thread page: the JS challenge, now reddit's answer to
        // every legacy page, or something else, such as a login wall's form.
        // Neither carries the meta-robots removal signal, so "not removed"
        // would be a false live verdict: report no page instead.
        return challengeObj.count
            ? { error: LEGACY_REFUSED_ERROR, refused: true }
            : { error: 'unrecognized page (no thread things)' }
    }
    return {
        is_removed: metaRobotsObj.is_removed,
        ...(authorObj.author && { author: authorObj.author }),
    }
}
