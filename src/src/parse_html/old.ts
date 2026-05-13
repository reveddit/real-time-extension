import { consume, oldReddit, redditHTMLRequestOptions, ErrorCollector } from './common'
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
    func?: (value: any) => any
    constructor(field: string, attribute: string, func?: (value: any) => any) {
        this.field = field
        this.attribute = attribute
        this.func = func
    }
}
const stringJavascriptEpochSecondsToNumericEpoch = (n: string): number => Number(n) / 1000
const attribute_mappings = [
    new AttributeMapping('name', 'data-fullname'),
    new AttributeMapping('subreddit', 'data-subreddit'),
    new AttributeMapping('author_fullname', 'data-author-fullname'),
    new AttributeMapping('author', 'data-author'),
    new AttributeMapping('permalink', 'data-permalink'),
    new AttributeMapping('subreddit_id', 'data-subreddit-fullname'),
    new AttributeMapping('created_utc', 'data-timestamp', stringJavascriptEpochSecondsToNumericEpoch),
    new AttributeMapping('url', 'data-url'),
    new AttributeMapping('domain', 'data-domain'),
    new AttributeMapping('num_comments', 'data-comments-count', Number),
    new AttributeMapping('num_crossposts', 'data-num-crossposts', Number),
    new AttributeMapping('score', 'data-score', Number),
]

const WWW_REDDIT_COM = 'https://www.reddit.com'
const leftSpaceBoundary = '(^|\\s)',
    rightSpaceBoundary = '($|\\s)'
const regexWithSpaceOnLeftAndRight = (middle: string) => new RegExp(leftSpaceBoundary + middle + rightSpaceBoundary)
const match_controversial = regexWithSpaceOnLeftAndRight('controversial')
const match_stickied = regexWithSpaceOnLeftAndRight('stickied')
const match_pinned = regexWithSpaceOnLeftAndRight('sticky-pinned')
const _match_locked = regexWithSpaceOnLeftAndRight('locked')
const NAME_UNDEFINED = 'name_undefined',
    LAST_UNDEFINED = 'last_undefined',
    PERMALINK_UNDEFINED = 'permalink_undefined',
    SUBREDDIT_UNDEFINED = 'subreddit_undefined'
const COMMON_DEFAULTS = {
    removal_reason: null,
    quarantine: false,
    score: 1, // score is not present when hidden
    locked: false,
    distinguished: null,
    stickied: false,
}
const COMMENT_DEFAULTS = {
    ...COMMON_DEFAULTS,
}
const POST_DEFAULTS = {
    ...COMMON_DEFAULTS,
    link_flair_text: null,
    author_flair_text: null,
    pinned: false,
    removed_by_category: null,
    is_robot_indexable: true, // /api/info HTML has no removal indicator for posts, so default to not-removed.
    // Removed posts are detected separately via individual page lookup (processPendingPost).
}
// classes whose presence indicate the field should be true, and false for their absence
const BINARY_FIELD_TO_CLASS_REGEXES = {
    locked: regexWithSpaceOnLeftAndRight('locked'), // only detects submission locks. comment locks will overwrite the value here
}

const fullnameIsComment = (name: string) => name.substr(0, 2) === 't1'
const fullnameIsPost = (name: string) => name.substr(0, 2) === 't3'

// keep track of items and quarantined subreddits appearing on user page HTML of old reddit
// based on solution from: https://stackoverflow.com/questions/68114819/access-nested-elements-in-htmlrewriter-cloudflare-workers
class Items extends ErrorCollector {
    items: Record<string, any>[]
    ids_set: Set<string>
    quarantined_subs: Set<string>
    constructor(url: string) {
        super(url)
        this.items = []
        this.ids_set = new Set()
        this.quarantined_subs = new Set()
        this.url = url
    }
    element(element: any) {
        const item: Record<string, any> = {}
        for (const att_map of attribute_mappings) {
            let value = element.getAttribute(att_map.attribute)
            if (value !== null) {
                if (att_map.func) {
                    value = att_map.func(value)
                }
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
        if (item.name) {
            item.id = item.name.replace(/^t[0-9]_/, '')
            //comments
            if (fullnameIsComment(item.name)) {
                if (item.permalink) {
                    const permalink_parts = item.permalink.split('/')
                    item.link_id = 't3_' + permalink_parts[4]
                    item.link_permalink = WWW_REDDIT_COM + permalink_parts.slice(0, 6).join('/') + '/'
                } else {
                    this.addError(PERMALINK_UNDEFINED)
                }
                item.stickied = !!classes.match(match_stickied)
                if (classes.match(match_controversial)) {
                    item.controversiality = 1
                } else {
                    item.controversiality = 0
                }
            } else {
                //submissions
                // submissions only get the class sticky-pinned, which indicates pinned (to user page).
                // user pages have no indicator in HTML for 'stickied' (as in, stickied to a subreddit) on submissions.
                // user/[user].json DOES indicate stickied-to-a-subreddit, it's just not marked in the HTML
                item.pinned = !!classes.match(match_pinned)
            }
        } else {
            this.addError(NAME_UNDEFINED)
            return
        }
        this.items.push(item)
        this.ids_set.add(item.name)
    }
    addQuarantinedSub(sub: string) {
        this.quarantined_subs.add(sub)
    }
    fillInDefaultValues() {
        for (const item of this.items) {
            if (!item.name) continue
            let defaults
            if (fullnameIsComment(item.name)) {
                defaults = COMMENT_DEFAULTS
            } else if (fullnameIsPost(item.name)) {
                defaults = POST_DEFAULTS
            }
            if (defaults) {
                for (const [field, value] of Object.entries(defaults)) {
                    if (!(field in item)) {
                        item[field] = value
                    }
                }
            }
        }
    }
}
class ItemsMeta {
    itemsObj: Items
    items: Record<string, any>[]
    last: Record<string, any>
    constructor(itemsObj: Items) {
        this.itemsObj = itemsObj
        this.items = itemsObj.items
        this.last = {}
    }
    // any extending class must call super.element(element) to define this.last
    element(_element: any) {
        if (this.items.length) {
            const last = this.items[this.items.length - 1]
            if (!last) {
                this.itemsObj.addError(LAST_UNDEFINED)
            } else {
                this.last = last
            }
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

class OneFieldAttribute extends OneField {
    att_name: string
    constructor(itemsObj: Items, field_name: string, att_name: string) {
        super(itemsObj, field_name)
        this.att_name = att_name
    }
    element(element: any, func: (v: any) => any = v => v) {
        super.element(element, func(element.getAttribute(this.att_name)))
    }
}

const fixDoubleSlashPrefix = (url: string): string => {
    if (url.substr(0, 2) === '//') {
        return 'https:' + url
    }
    return url
}

class Thumbnail extends OneFieldAttribute {
    constructor(itemsObj: Items) {
        super(itemsObj, 'thumbnail', 'src')
    }
    element(element: any) {
        super.element(element, fixDoubleSlashPrefix)
    }
}

class IfClassesExistThenSetValue extends ItemsMeta {
    classToFieldMaps: ClassToFieldMap[]
    constructor(itemsObj: Items, classToFieldMaps: ClassToFieldMap[]) {
        super(itemsObj)
        this.classToFieldMaps = classToFieldMaps
    }
    element(element: any) {
        super.element(element)
        const classes = element.getAttribute('class')
        for (const map of this.classToFieldMaps) {
            const regex = regexWithSpaceOnLeftAndRight(map.class_name)
            if (classes.match(regex)) {
                this.last[map.field_name] = map.value
            }
        }
    }
}

class ClassToFieldMap {
    class_name: string
    field_name: string
    value: any
    constructor(class_name: string, field_name: string, value: any) {
        this.class_name = class_name
        this.field_name = field_name
        this.value = value
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
                this.itemsObj.addError('NO_END_TAG_' + element.tagName)
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

class ValueFromText extends ItemsMeta {
    temp_text_var_name: string
    field_name: string
    constructor(itemsObj: Items, field_name: string) {
        super(itemsObj)
        this.temp_text_var_name = field_name + '_text'
        this.field_name = field_name
    }
    element(element: any) {
        super.element(element)
        this.last[this.temp_text_var_name] = ''
    }
    text({ text, lastInTextNode }: { text: string; lastInTextNode: boolean }, childFunc: () => void) {
        this.last[this.temp_text_var_name] += text
        if (lastInTextNode) {
            childFunc()
            delete this.last[this.temp_text_var_name]
        }
    }
}
const REGEX_BEGINS_WITH_SLASH = new RegExp(/^\//)
class LinkTitles extends ItemsMeta {
    element(element: any) {
        super.element(element)
        const last = this.last
        last.link_url = element.getAttribute('href')
        if (last.link_url.match(REGEX_BEGINS_WITH_SLASH)) {
            last.link_url = 'https://www.reddit.com' + last.link_url
        }
        last.link_title = ''
    }
    text({ text }: { text: string }) {
        this.last.link_title += text
    }
}
const match_reddit = new RegExp(/^https?:\/\/([^.]+\.)?reddit\.com\//)
const match_domain_no_www = new RegExp(/https?:\/\/(?:www\.)?([^/.]+\.[^/]+)(\/.+)?/)
class PostTitle extends ValueFromText {
    constructor(itemsObj: Items) {
        super(itemsObj, 'title')
    }
    element(element: any) {
        super.element(element)
        let href = element.getAttribute('href')
        if (href.match(REGEX_BEGINS_WITH_SLASH)) {
            href = WWW_REDDIT_COM + href
        }
        if (fullnameIsPost(this.last.name) && !('domain' in this.last)) {
            let domain: string
            if (href.match(match_reddit)) {
                domain = 'self.' + this.last.subreddit
            } else {
                domain = href.replace(match_domain_no_www, '$1')
            }
            this.last.domain = domain
        }
        if (!('url' in this.last)) {
            this.last.url = href
        }
    }
    text(props: { text: string; lastInTextNode: boolean }) {
        super.text(props, () => {
            this.last[this.field_name] = this.last[this.temp_text_var_name]
        })
    }
}

const user_fullname_match = new RegExp(/^id-t2_/)
const user_fullname_replace = new RegExp(/^id-/)
class LinkAuthor extends ItemsMeta {
    element(element: any) {
        super.element(element)
        this.last.link_author = ''
        const link_author_fullname = element
            .getAttribute('class')
            .replace(/ +/g, ' ')
            .split(' ')
            .filter((x: any) => x.match(user_fullname_match))[0]
        if (link_author_fullname) {
            this.last.link_author_fullname = link_author_fullname.replace(user_fullname_replace, '')
        }
    }
    text({ text }: { text: string }) {
        this.last.link_author += text
    }
}
const FULL_COMMENTS_REGEX = new RegExp(/full comments \(([0-9]+)\)/)
class NumComments extends ValueFromText {
    text(props: { text: string; lastInTextNode: boolean }) {
        super.text(props, () => {
            const matches = this.last[this.temp_text_var_name].match(FULL_COMMENTS_REGEX)
            if (matches) {
                this.last[this.field_name] = Number(matches[1])
            }
        })
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

class Quarantined extends ItemsMeta {
    element(element: any) {
        super.element(element)
        const last_sub = this.last.subreddit
        if (last_sub) {
            this.itemsObj.addQuarantinedSub(last_sub)
        } else {
            this.itemsObj.addError(SUBREDDIT_UNDEFINED)
        }
        this.last.quarantine = true
    }
}

class MetaRobots extends ErrorCollector {
    is_removed: boolean
    constructor(url: string) {
        super(url)
        this.is_removed = false
    }
    element(_element: any) {
        this.is_removed = true
    }
}

class ThreadPageAuthor extends ErrorCollector {
    author: string
    constructor(url: string) {
        super(url)
        this.author = ''
    }
    text({ text }: { text: string }) {
        this.author += text.trim()
    }
}

export const getItems_fromOld = async (path: string) => {
    const url = oldReddit + path

    const response = await fetch(url, redditHTMLRequestOptions)
    if (!response.ok) {
        return { error: 'request failed' }
    }
    const itemsObj = new Items(url)
    const rewriter = new HTMLRewriter()
        .on('#siteTable .thing', itemsObj)
        .on('#siteTable .thing .parent a.title', new LinkTitles(itemsObj))
        .on('#siteTable .thing .entry p.title a.title', new PostTitle(itemsObj))
        .on('#siteTable .thing .entry .usertext-body .md *', new InnerHTML(itemsObj, 'body'))
        .on('#siteTable .thing .entry .admin_takedown', new OneField(itemsObj, 'removal_reason', 'legal'))
        .on('#siteTable .thing .tagline .score.unvoted', new Score(itemsObj))
        .on('#siteTable .thing .tagline time', new Times(itemsObj))
        .on('#siteTable .thing .tagline .locked-tagline', new OneField(itemsObj, 'locked', true)) // for comments, sets locked=true
        .on(
            '#siteTable .thing .tagline .author',
            new IfClassesExistThenSetValue(itemsObj, [
                new ClassToFieldMap('submitter', 'is_submitter', true),
                new ClassToFieldMap('moderator', 'distinguished', 'moderator'),
                new ClassToFieldMap('admin', 'distinguished', 'admin'),
            ]),
        )
        .on('#siteTable .thing .parent .author', new LinkAuthor(itemsObj))
        .on(
            '#siteTable .thing ul.buttons li.first a[data-event-action="full_comments"]',
            new NumComments(itemsObj, 'num_comments'),
        )
        .on('#siteTable .thing .quarantine-stamp', new Quarantined(itemsObj))
        .on('#siteTable .thing .thumbnail img', new Thumbnail(itemsObj))
    await consume(rewriter.transform(response).body!)
    const info_promise = getCommentsInfo_fromOld(Array.from(itemsObj.ids_set))
    itemsObj.fillInDefaultValues()
    itemsObj.printErrors()
    itemsObj.items.forEach(item => {
        item.body = getMarkdownFromHTMLString(item.body)
    })
    const info = await info_promise
    return {
        quarantined: Array.from(itemsObj.quarantined_subs),
        items: itemsObj.items,
        info,
        ids_set: itemsObj.ids_set,
    }
}

const getCommentsInfo_fromOld = async (ids: string[]) => {
    const url = oldReddit + '/api/info?id=' + ids.join(',')
    const response = await fetch(url, {
        'Accept-Language': 'en',
        Cookie: 'over18=1;',
        'User-Agent': 'extension',
        credentials: 'omit',
    } as any)
    if (!response.ok) {
        console.error('request failed:', url)
        return {}
    }
    const itemsObj = new Items(url)
    const rewriter = new HTMLRewriter()
        .on('#siteTable .comment', itemsObj)
        // .comment.deleted assumes the page contains no user-deleted comments.
        // That will be true as long as IDs given to this function come from user pages.
        // If user-deleted comments are present, must also check body==[removed]
        .on('#siteTable .comment.deleted', new AuthorDeleted(itemsObj))
    await consume(rewriter.transform(response).body!)
    const info_items = itemsObj.items.reduce((obj, item) => {
        item.name = 't1_' + item.permalink.split('/').slice(6, 7)
        obj[item.name] = item
        return obj
    }, {})
    return info_items
}

// Exported function for lookupItemsByID fallback - parses HTML from old.reddit.com/api/info
// Returns array of {data: item} to match JSON API format
export const getItemsById_fromOldHTML = async (
    ids: string | string[],
    addToPendingPostQueue: ((postIds: string[]) => void) | null = null,
) => {
    const idsArray = Array.isArray(ids) ? ids : ids.split(',')

    // Separate posts (t3_) from comments (t1_)
    const postIds = idsArray.filter(id => id.startsWith('t3_'))
    // For posts, we need to fetch individual pages because /api/info HTML doesn't contain removal status
    if (postIds.length > 0 && addToPendingPostQueue) {
        // Add posts to a pending queue for throttled lookup
        addToPendingPostQueue(postIds)
    }

    const url = oldReddit + '/api/info?id=' + idsArray.join(',')
    const response = await fetch(url, {
        headers: {
            'Accept-Language': 'en',
            Cookie: 'over18=1;',
            'User-Agent': 'extension',
        },
        credentials: 'omit',
    })
    if (!response.ok) {
        throw new Error(`old.reddit.com HTML request failed: ${response.status}`)
    }
    const itemsObj = new Items(url)
    const rewriter = new HTMLRewriter()
        // Handle both posts (.link) and comments (.comment)
        .on('#siteTable .thing', itemsObj)
        .on('#siteTable .thing.deleted', new AuthorDeleted(itemsObj))
        .on('#siteTable .thing .entry .usertext-body .md *', new InnerHTML(itemsObj, 'body'))
        .on('#siteTable .thing .tagline .score.unvoted', new Score(itemsObj))
        .on('#siteTable .thing .tagline time', new Times(itemsObj))
        .on('#siteTable .thing .tagline .locked-tagline', new OneField(itemsObj, 'locked', true))
    await consume(rewriter.transform(response).body!)
    itemsObj.fillInDefaultValues()
    // Convert body HTML to markdown
    itemsObj.items.forEach(item => {
        if (item.body) {
            item.body = getMarkdownFromHTMLString(item.body)
        }
    })
    // Return only comments — posts are excluded because /api/info HTML cannot
    // determine post removal status. Posts are handled via the pending post queue.
    return itemsObj.items.filter(item => !item.name || !item.name.startsWith('t3_')).map(item => ({ data: item }))
}

export const getPost_fromOld = async (path: string) => {
    const url = oldReddit + path
    const response = await fetch(url, redditHTMLRequestOptions)
    if (!response.ok) {
        return { error: 'request failed' }
    }
    const metaRobotsObj = new MetaRobots(url)
    const authorObj = new ThreadPageAuthor(url)
    const rewriter = new HTMLRewriter()
        .on('meta[name="robots"][content="noindex,nofollow"]', metaRobotsObj)
        .on('#siteTable .thing .tagline span', authorObj)
    await consume(rewriter.transform(response).body!)
    return {
        is_removed: metaRobotsObj.is_removed,
        ...(authorObj.author && { author: authorObj.author }),
    }
}
