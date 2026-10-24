// Attribute names the page classifiers (parse_html/new.ts) read an item's id
// from. Every page verdict hinges on them: if reddit renamed the comment tree's
// id attribute, removed comments would read 'unknown' and their alerts would
// stop. Reddit renamed the challenge's token field once (challenge-config.ts),
// so these too can come from the news feed (options.markup) without a store
// release. The feed only adds names; the built-in ones always stay.
//
// Imports only name-list.ts, which is import-free: news.ts and
// parse_html/new.ts both import this module.
import { sanitizeNameList } from './name-list'

export interface MarkupConfig {
    // On <shreddit-comment> and <shreddit-comment-tree>
    commentIdAttributes: string[]
    // On <shreddit-post>
    postIdAttributes: string[]
}

export const DEFAULT_MARKUP_CONFIG: MarkupConfig = {
    commentIdAttributes: ['thingId', 'thing-id'],
    postIdAttributes: ['id'],
}

const ATTRIBUTE_NAME = /^[A-Za-z][A-Za-z0-9_-]{0,39}$/

let current: MarkupConfig = {
    commentIdAttributes: [...DEFAULT_MARKUP_CONFIG.commentIdAttributes],
    postIdAttributes: [...DEFAULT_MARKUP_CONFIG.postIdAttributes],
}

export const getMarkupConfig = (): MarkupConfig => current

// Accepts the feed's untrusted object; anything malformed is ignored field by
// field. Stored in camelCase.
export const sanitizeMarkupConfig = (raw: any): Partial<MarkupConfig> => {
    const out: Partial<MarkupConfig> = {}
    const names = (value: unknown): string[] => sanitizeNameList(value, ATTRIBUTE_NAME, 8)
    if (raw && typeof raw === 'object') {
        const comment = names(raw.comment_id_attributes ?? raw.commentIdAttributes)
        const post = names(raw.post_id_attributes ?? raw.postIdAttributes)
        if (comment.length) out.commentIdAttributes = comment
        if (post.length) out.postIdAttributes = post
    }
    return out
}

export const setMarkupConfig = (partial: Partial<MarkupConfig>) => {
    const withDefaults = (extra: string[] | undefined, defaults: string[]) => [
        ...(extra || []),
        ...defaults.filter(name => !(extra || []).includes(name)),
    ]
    current = {
        commentIdAttributes: withDefaults(partial.commentIdAttributes, DEFAULT_MARKUP_CONFIG.commentIdAttributes),
        postIdAttributes: withDefaults(partial.postIdAttributes, DEFAULT_MARKUP_CONFIG.postIdAttributes),
    }
}
