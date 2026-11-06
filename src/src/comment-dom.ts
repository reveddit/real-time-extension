import { commentFullnameFromPermalink, commentSelector } from './restore'

// --- Thread Restore: New Reddit ---

// A comment's replies sit inside it, so a plain lookup can land on a reply's part
export function ownPart(comment: Element, selector: string): HTMLElement | undefined {
    return Array.from(comment.querySelectorAll(selector)).find(el => el.closest('shreddit-comment') === comment) as
        | HTMLElement
        | undefined
}

export const newRedditCommentEl = (id: string) => document.querySelector(commentSelector(id)) as HTMLElement

// A moderator's removal kept for its replies, read from its markup since its
// words may follow the page's language: no author, no text of the comment's own
// and not marked as the author's deletion. Its one paragraph is reddit's notice.
export const removedText_newReddit = (comment: Element) =>
    comment.matches('[author="[deleted]"]:not([is-comment-deleted])') && !ownPart(comment, '[slot="comment"]')
        ? ownPart(comment, 'p')
        : undefined

// Reddit collapses removed comments, and old reddit low-scored ones, with their
// replies inside, so something placed in one needs it and all around it open.
export function openComment(comment: Element) {
    let c: Element | null | undefined = comment
    for (; c; c = c.parentElement?.closest('shreddit-comment, .thing.comment')) {
        c.querySelector(':scope > details')?.setAttribute('open', '')
        expandComment(c)
    }
}

// Under the comment's text, above its own buttons, not below its replies
export function addUnderComment(comment: HTMLElement, ...els: HTMLElement[]) {
    const actionRow = ownPart(comment, '[slot="actionRow"]')
    if (actionRow) actionRow.before(...els)
    else comment.append(...els)
    openComment(comment)
}

// Find an old-reddit comment element by fullname. Removed tombstones have no
// data-fullname, so fall back to matching the comment id parsed from
// data-permalink (see commentFullnameFromPermalink).
export function findOldRedditCommentEl(commentId: string): HTMLElement | null {
    const byFullname = document.querySelector(`.thing.comment[data-fullname="${commentId}"]`)
    if (byFullname) return byFullname as HTMLElement
    const things = document.querySelectorAll('.commentarea .thing.comment')
    for (const el of Array.from(things)) {
        if (commentFullnameFromPermalink(el.getAttribute('data-permalink')) === commentId) {
            return el as HTMLElement
        }
    }
    return null
}

export function expandComment(el: Element) {
    if (!el.classList.contains('collapsed')) return
    el.classList.remove('collapsed')
    el.classList.add('noncollapsed')
    const btn = el.querySelector(':scope > .entry .expand')
    if (btn) btn.textContent = '[–]'
}

export function collapseComment(el: Element) {
    if (el.classList.contains('collapsed')) return
    el.classList.remove('noncollapsed')
    el.classList.add('collapsed')
    const btn = el.querySelector(':scope > .entry .expand')
    if (btn) btn.textContent = '[+]'
}
