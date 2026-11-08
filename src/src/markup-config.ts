// Attribute names the page classifiers (parse_html/new.ts) read an item's id
// from, and the slot a post's removal banner renders in. Every page verdict
// hinges on them: if reddit renamed the comment tree's id attribute, removed
// comments would read 'unknown' and their alerts would stop; if it moved the
// banner to another slot, held and removed posts would read live. Reddit
// renamed the challenge's token field once (challenge-config.ts), so these too
// can come from the news feed (options.markup) without a store release. The
// feed only adds names; the built-in ones always stay.
//
// Imports only name-list.ts, which is import-free: news.ts, parse_html/new.ts
// and three content-script modules import this module.
import { sanitizeNameList } from './name-list'

export interface MarkupConfig {
    // On <shreddit-comment> and <shreddit-comment-tree>
    commentIdAttributes: string[]
    // On <shreddit-post>
    postIdAttributes: string[]
    // Slots inside <shreddit-post> that hold its held/removed/deleted banner
    postBannerSlots: string[]
    // Slots of a comment's action row, the first of which takes our buttons
    commentButtonSlots: string[]
    // Slots inside <shreddit-post>, the first of which takes the subscribe button
    postButtonSlots: string[]
}

const DEFAULT_MARKUP_CONFIG: MarkupConfig = {
    commentIdAttributes: ['thingId', 'thing-id'],
    postIdAttributes: ['id'],
    postBannerSlots: ['post-removed-banner'],
    commentButtonSlots: ['comment-share'],
    postButtonSlots: ['action-row-whitespace'],
}

const ATTRIBUTE_NAME = /^[A-Za-z][A-Za-z0-9_-]{0,39}$/

let current: MarkupConfig = {
    commentIdAttributes: [...DEFAULT_MARKUP_CONFIG.commentIdAttributes],
    postIdAttributes: [...DEFAULT_MARKUP_CONFIG.postIdAttributes],
    postBannerSlots: [...DEFAULT_MARKUP_CONFIG.postBannerSlots],
    commentButtonSlots: [...DEFAULT_MARKUP_CONFIG.commentButtonSlots],
    postButtonSlots: [...DEFAULT_MARKUP_CONFIG.postButtonSlots],
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
        const banner = names(raw.post_banner_slots ?? raw.postBannerSlots)
        const button = names(raw.comment_button_slots ?? raw.commentButtonSlots)
        const postButton = names(raw.post_button_slots ?? raw.postButtonSlots)
        if (comment.length) out.commentIdAttributes = comment
        if (post.length) out.postIdAttributes = post
        if (banner.length) out.postBannerSlots = banner
        if (button.length) out.commentButtonSlots = button
        if (postButton.length) out.postButtonSlots = postButton
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
        postBannerSlots: withDefaults(partial.postBannerSlots, DEFAULT_MARKUP_CONFIG.postBannerSlots),
        commentButtonSlots: withDefaults(partial.commentButtonSlots, DEFAULT_MARKUP_CONFIG.commentButtonSlots),
        postButtonSlots: withDefaults(partial.postButtonSlots, DEFAULT_MARKUP_CONFIG.postButtonSlots),
    }
}
