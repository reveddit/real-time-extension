import { getPrettyDate } from './common'
import { lookupCommentsByIds, scanFailure, COULD_NOT_READ, ScanReads } from './scan-reads'
import { type RecoveredComment } from './restore'
import { addUnderComment, findOldRedditCommentEl, newRedditCommentEl, openComment, ownPart } from './comment-dom'
import { activeScan, addCancelLink, endScan, pageReads, scanStopped, startScan } from './scan-session'
import { refreshThreadFilter } from './thread-filter'
import { setRedditHTML } from './dom-helpers'

// Places what this page's scans recover, so each click's can nest under the last's
let pageInserter: RecoveredCommentInserter | null = null
export const inserterForPage = (isNewReddit: boolean) => (pageInserter ||= new RecoveredCommentInserter(isNewReddit))
export const forgetPageInserter = () => {
    pageInserter = null
}

// --- Recovered comment insertion (thread restore) ---

// Builds the removed-comment subtree incrementally as comments are recovered.
// A comment is placed under its parent when the parent is present (a visible
// comment, a tombstone, or an already-recovered comment). If the parent is
// itself missing, the comment is parked in an "unattached" area and relocated
// under its parent later if that ancestor turns up in a subsequent search.
const MAX_BRIDGE_DEPTH = 8

export class RecoveredCommentInserter {
    private isNewReddit: boolean
    private placed = new Map<string, HTMLElement>() // id -> element (can host children)
    private orphans = new Map<string, { rc: RecoveredComment; el: HTMLElement }>()
    private orphanArea: HTMLElement | null = null
    private placing = false

    constructor(isNewReddit: boolean) {
        this.isNewReddit = isNewReddit
    }

    add(rc: RecoveredComment) {
        // On the page, it may be from before Back, which this inserter doesn't know
        const kept =
            this.placed.get(rc.id) ||
            this.orphans.get(rc.id)?.el ||
            (document.querySelector(`[data-rev-id="${rc.id}"]`) as HTMLElement | null)
        if (kept) {
            if (!rc.kind) fillPlaceholder(kept, rc)
            if (!this.placed.has(rc.id) && !this.orphans.has(rc.id)) {
                this.placed.set(rc.id, kept)
                this.drainOrphans()
            }
            return
        }

        const onPage = this.isNewReddit ? newRedditCommentEl(rc.id) : findOldRedditCommentEl(rc.id)
        // It reached the page since, so nothing needs to stand in for it
        if (rc.kind && onPage) {
            this.drainOrphans()
            return
        }

        if (this.isNewReddit && onPage) {
            const el = createRecoveredCommentEl(rc)
            addUnderComment(onPage, el)
            this.placed.set(rc.id, el)
            this.drainOrphans()
            return
        }

        // Prefer filling an existing tombstone in place (old reddit only).
        const tombstone = this.isNewReddit ? null : onPage
        const el =
            tombstone && !tombstone.classList.contains('rev-inserted-comment')
                ? fillRecoveredTombstone(tombstone, rc)
                : createRecoveredCommentEl(rc)

        const placement = this.resolvePlacement(rc.parent_id)
        if (placement) {
            attach(el, placement)
            this.placed.set(rc.id, el)
            this.drainOrphans()
        } else {
            this.ensureOrphanArea().appendChild(el)
            this.orphans.set(rc.id, { rc, el })
        }
    }

    // Distinct parents that orphans still need but that aren't in the tree.
    private pendingParents(): { name: string; link_id: string }[] {
        const parents = new Map<string, string>()
        for (const { rc } of this.orphans.values()) {
            if (rc.parent_id.startsWith('t1_')) parents.set(rc.parent_id, rc.link_id)
        }
        return [...parents].map(([name, link_id]) => ({ name, link_id }))
    }

    get placedCount() {
        return this.placed.size
    }

    // Walk up the ancestor chain, through each comment's feed, to bridge unattached comments into
    // the tree: reconstruct each missing ancestor (removed → red, live-but-not-
    // loaded → muted "context") until its own parent is known, capped by depth.
    // Every chain ultimately reaches the post, so within the cap most attach.
    async placeUnattached(btn: HTMLButtonElement, note: HTMLElement) {
        // One scan at a time: this one would cancel a running scan
        if (this.placing || activeScan) return
        const placedBefore = this.placed.size
        // A parent may have reached the page since
        this.drainOrphans()
        this.placing = true
        btn.disabled = true
        const limiter = startScan(btn)
        btn.classList.remove('rev-scan-disabled')
        note.textContent = ''
        addCancelLink(note, limiter)
        const reads = await ScanReads.forClick(limiter, pageReads)
        const tried = new Set<string>()
        let broken: unknown
        try {
            for (let level = 0; level < MAX_BRIDGE_DEPTH && !reads.stopped; level++) {
                const needed = this.pendingParents().filter(({ name }) => !tried.has(name))
                if (needed.length === 0) break
                needed.forEach(({ name }) => tried.add(name))
                btn.textContent = `Placing… (${this.orphans.size} left)`
                const looked = await lookupCommentsByIds(needed, reads)
                if (looked.size === 0 || !btn.isConnected) break // ancestors unavailable (deleted/invalid)
                for (const c of looked.values()) {
                    this.add({
                        id: c.id,
                        parent_id: c.parent_id || c.link_id,
                        link_id: c.link_id,
                        author: c.author,
                        body: c.body,
                        body_html: c.body_html,
                        created_utc: c.created_utc,
                        permalink: c.permalink,
                        subreddit: c.subreddit,
                        kind: c.removed ? 'placeholder' : 'context',
                    })
                }
            }
        } catch (err) {
            broken = err
        } finally {
            this.placing = false
            endScan(limiter)
        }
        if (this.placed.size > placedBefore) refreshThreadFilter(this.isNewReddit)
        if (this.orphans.size === 0) return // orphan area auto-removed when empty
        const left = reads.unread
        const retrying = !reads.failure && !limiter.isCancelled() && reads.settle().retrying
        note.textContent = limiter.isCancelled()
            ? ''
            : reads.failure
              ? scanFailure(reads.failure, COULD_NOT_READ)
              : left
                ? `${left} left to read. Click again to continue.`
                : reads.gaveUp
                  ? `${reads.gaveUp} couldn't be read.${retrying ? ' Click again to try them.' : ''}`
                  : ''
        if (broken) scanStopped(broken, note)
        btn.disabled = false
        btn.textContent = `Place unattached comments (${this.orphans.size} left)`
    }

    // Re-check parked orphans now that something new was placed; relocate any
    // whose parent is now present. Loop so chains attach in one pass.
    private drainOrphans() {
        let moved = true
        while (moved) {
            moved = false
            for (const [id, { rc, el }] of this.orphans) {
                const placement = this.resolvePlacement(rc.parent_id)
                if (!placement) continue
                attach(el, placement) // relocates it out of the orphan area
                this.placed.set(id, el)
                this.orphans.delete(id)
                moved = true
            }
        }
        if (this.orphans.size === 0 && this.orphanArea) {
            this.orphanArea.remove()
            this.orphanArea = null
        }
    }

    // Where a comment with this parent should attach, or null if the parent
    // isn't present yet. Top-level recovered comments are prepended so they sit
    // above the rest of the thread instead of being buried at the bottom.
    private resolvePlacement(parentId: string): Placement | null {
        // A previously-recovered comment — nest under it (works on old & new reddit).
        const placedParent = this.placed.get(parentId)
        if (placedParent) {
            openComment(placedParent)
            return { container: childSlotOf(placedParent), prepend: false }
        }

        if (this.isNewReddit) {
            if (parentId.startsWith('t3_')) {
                const tree = document.querySelector('shreddit-comment-tree') as HTMLElement
                const top = tree?.querySelector('shreddit-comment')?.parentElement || tree
                return top ? { container: top, prepend: true } : null
            }
            const nativeParent = newRedditCommentEl(parentId)
            if (!nativeParent) return null
            return { container: newRedditChildSlot(nativeParent), prepend: false }
        }
        if (parentId.startsWith('t3_')) {
            const top =
                (document.querySelector('.commentarea > .sitetable.nestedlisting') as HTMLElement) ||
                (document.querySelector('.commentarea > .sitetable') as HTMLElement) ||
                (document.querySelector('.commentarea') as HTMLElement)
            return top ? { container: top, prepend: true } : null
        }
        const native = findOldRedditCommentEl(parentId)
        return native ? { container: oldRedditChildListing(native), prepend: false } : null
    }

    private ensureOrphanArea(): HTMLElement {
        if (this.orphanArea) return this.orphanArea
        const area = document.createElement('div')
        area.className = 'rev-unattached-area rev-removed-highlight'
        const header = document.createElement('div')
        header.className = 'rev-unattached-header'
        const title = document.createElement('div')
        title.className = 'rev-unattached-title'
        title.textContent = 'Unattached removed comments'
        const desc = document.createElement('div')
        desc.className = 'rev-unattached-desc'
        desc.textContent =
            "Their parent comment isn't in the known part of the comment tree, so we couldn't determine where they belong."
        const placeBtn = document.createElement('button')
        placeBtn.className = 'rev-btn rev-btn-solid rev-place-unattached-btn'
        placeBtn.textContent = 'Place unattached comments'
        placeBtn.title = 'Look up the missing parent comments to nest these into the thread'
        placeBtn.classList.toggle('rev-scan-disabled', !!activeScan)
        const note = document.createElement('span')
        note.className = 'rev-unattached-note'
        placeBtn.addEventListener('click', e => {
            e.preventDefault()
            this.placeUnattached(placeBtn, note)
        })
        header.append(title, desc, placeBtn, note)
        area.appendChild(header)
        // Place above the comment list so unattached comments lead, not trail.
        const anchor = this.isNewReddit
            ? document.querySelector('shreddit-comment-tree') || document.querySelector('main')
            : document.querySelector('.commentarea > .sitetable.nestedlisting') ||
              document.querySelector('.commentarea > .sitetable') ||
              document.querySelector('.commentarea')
        if (anchor) anchor.prepend(area)
        else document.body.prepend(area)
        this.orphanArea = area
        return area
    }
}

interface Placement {
    container: HTMLElement
    prepend: boolean
}

function attach(el: HTMLElement, { container, prepend }: Placement) {
    if (el.parentElement === container) return
    if (prepend) container.prepend(el)
    else container.appendChild(el)
}

// Returns/creates the div that is a direct child of host and matches selector.
function childDiv(host: Element, selector: string, className: string): HTMLElement {
    let child = host.querySelector(`:scope > ${selector}`) as HTMLElement | null
    if (!child) {
        child = document.createElement('div')
        child.className = className
        host.appendChild(child)
    }
    return child
}

// The slot that holds a recovered comment's own children.
const childSlotOf = (el: Element) => childDiv(el, '.rev-rec-children', 'rev-rec-children')

// The child comment listing of a native old-reddit comment.
function oldRedditChildListing(nativeEl: HTMLElement): HTMLElement {
    openComment(nativeEl)
    return childDiv(childDiv(nativeEl, '.child', 'child'), '.sitetable', 'sitetable listing')
}

function newRedditChildSlot(parentComment: HTMLElement): HTMLElement {
    openComment(parentComment)
    return childSlotOf(ownPart(parentComment, '#comment-children') || parentComment)
}

function recoveredMeta(rc: RecoveredComment): HTMLElement {
    const meta = document.createElement('div')
    meta.className = 'rev-scan-item-meta'
    const authorLink = document.createElement('a')
    authorLink.className = 'author'
    authorLink.href = `/user/${encodeURIComponent(rc.author)}`
    authorLink.textContent = `u/${rc.author}`
    meta.appendChild(authorLink)
    meta.appendChild(document.createTextNode(rc.created_utc ? ` · ${getPrettyDate(rc.created_utc)} ` : ' '))
    const badge = document.createElement('span')
    if (rc.kind === 'context') {
        // A live comment reconstructed only to bridge an unattached comment.
        badge.className = 'rev-scan-badge-context'
        badge.textContent = 'context'
    } else {
        badge.className = 'rev-scan-badge-removed'
        badge.textContent = 'removed'
    }
    meta.appendChild(badge)

    const links = document.createElement('span')
    links.className = 'rev-scan-item-links'
    if (rc.permalink) {
        const ctx = document.createElement('a')
        ctx.className = 'rev-scan-item-link'
        ctx.href = `https://old.reddit.com${rc.permalink}?context=3`
        ctx.target = '_blank'
        ctx.rel = 'noopener'
        ctx.textContent = 'context'
        // No reveddit.com link: the site can only show "[removed]" for these
        // now that reddit blocks its data access; the recovered text is here.
        links.append(ctx)
    }
    meta.appendChild(links)
    return meta
}

function recoveredBody(rc: RecoveredComment): HTMLElement {
    const body = document.createElement('div')
    // Outer .rev-removed-highlight already provides the red marker; no inner blue.
    body.className = 'rev-scan-item-body'
    if (rc.body_html) setRedditHTML(body, rc.body_html)
    else body.textContent = rc.body
    return body
}

// A fresh element for a recovered comment (no tombstone existed for it). 'context'
// comments are live ancestors reconstructed only to bridge the tree, shown muted.
function createRecoveredCommentEl(rc: RecoveredComment): HTMLElement {
    const el = document.createElement('div')
    el.className =
        rc.kind === 'context'
            ? 'thing comment rev-inserted-comment rev-context'
            : 'thing comment rev-inserted-comment rev-removed-highlight'
    if (rc.kind === 'placeholder') el.classList.add('rev-placeholder')
    // Old reddit's comment tree reads an element with no author as a tombstone
    if (rc.kind === 'context') el.setAttribute('data-author', rc.author)
    el.setAttribute('data-fullname', rc.id)
    el.setAttribute('data-rev-id', rc.id)
    el.setAttribute('data-rev-created', String(rc.created_utc))
    const entry = document.createElement('div')
    entry.className = 'rev-rec-entry'
    entry.append(recoveredMeta(rc), recoveredBody(rc))
    el.appendChild(entry)
    return el
}

// The scan has the text of a comment placed without it
function fillPlaceholder(el: HTMLElement, rc: RecoveredComment) {
    if (!el.classList.contains('rev-placeholder')) return
    el.classList.remove('rev-placeholder')
    el.setAttribute('data-rev-created', String(rc.created_utc))
    el.querySelector(':scope > .rev-rec-entry')?.replaceChildren(recoveredMeta(rc), recoveredBody(rc))
}

// Fills an existing old-reddit tombstone in place with the recovered content.
function fillRecoveredTombstone(tombstone: HTMLElement, rc: RecoveredComment): HTMLElement {
    openComment(tombstone)
    tombstone.classList.remove('deleted')
    tombstone.setAttribute('data-rev-id', rc.id)
    // Highlight only this comment's row, not its nested replies (see displayRestoredComment).
    const entry = (tombstone.querySelector(':scope > .entry') as HTMLElement | null) || tombstone
    entry.classList.add('rev-removed-highlight')
    const bodyEl = tombstone.querySelector(':scope > .entry .usertext-body .md')
    if (bodyEl) {
        if (rc.body_html) setRedditHTML(bodyEl, rc.body_html)
        else bodyEl.textContent = rc.body
    }
    const authorEl = tombstone.querySelector(':scope > .entry .tagline .author')
    if (authorEl && rc.author) {
        const link = document.createElement('a')
        link.href = `/user/${encodeURIComponent(rc.author)}`
        link.className = 'author'
        link.textContent = rc.author
        authorEl.replaceWith(link)
    }
    return tombstone
}
