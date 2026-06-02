import { getFullIDsFromPath, getPrettyDate, REMOVED_BY_MODERATOR_TEXT, detectIsNewReddit } from './common'
import { getObjectNamesForThing } from './storage'
import { observe, findByText } from './dom-helpers'
import {
    restoreComment,
    scanUserProfile,
    scanThreadForRemovedComments,
    commentFullnameFromPermalink,
    lookupCommentsByIds,
    RateLimiter,
    type RestoreProgress,
    type RestoreResult,
    type RecoveredComment,
    type ScanResult,
    type ProfileScanOptions,
} from './restore'

// --- State tracking ---

const injectedComments = new Set<string>()
let activeRestoreLimiter: RateLimiter | null = null
const authorCache = new Map<string, any[]>()
let currentFilter: 'all' | 'removed' | 'visible' = 'removed'

// --- Thread Restore: Old Reddit ---

function injectRestoreButton_oldReddit(commentEl: HTMLElement) {
    // Removed tombstones lack data-fullname; recover the id from data-permalink
    // so the per-comment "scan" button appears on removed comments too.
    const id =
        commentEl.getAttribute('data-fullname') ||
        commentFullnameFromPermalink(commentEl.getAttribute('data-permalink'))
    if (!id || injectedComments.has(id)) return

    const buttons = commentEl.querySelector(':scope > .entry > ul.buttons')
    if (!buttons) return

    injectedComments.add(id)

    const li = document.createElement('li')
    const btn = document.createElement('a')
    btn.href = '#'
    btn.className = 'rev-scan-comment-btn rev-comment-action'
    btn.textContent = 'scan-rev'
    btn.title = 'Scan for removed comments'
    btn.addEventListener('click', e => {
        e.preventDefault()
        e.stopPropagation()
        if (btn.classList.contains('rev-scan-exhausted')) return
        handleRestore(id, commentEl, false)
    })
    li.appendChild(btn)
    buttons.appendChild(li)
}

// --- Thread Restore: New Reddit ---

function getCommentId_newReddit(el: Element): string | null {
    const comment = el.closest('shreddit-comment')
    if (comment) return comment.getAttribute('thingid')
    let current = el.closest('[id]')
    while (current) {
        if (current.id?.startsWith('t1_')) return current.id
        current = current.parentElement?.closest('[id]') || null
    }
    const permalink = el.closest('[permalink]')?.getAttribute('permalink')
    if (permalink) {
        const parts = permalink.split('/')
        const commentIdPart = parts[parts.length - 1] || parts[parts.length - 2]
        if (commentIdPart) return 't1_' + commentIdPart
    }
    return null
}

function injectRestoreButton_newReddit(removedTextEl: Element) {
    const closestDiv = removedTextEl.closest('div')
    if (!closestDiv) return
    const parent = closestDiv.parentElement
    if (!parent || parent.querySelector('.rev-restore-btn')) return

    const commentId = getCommentId_newReddit(removedTextEl)
    if (!commentId || injectedComments.has(commentId)) return
    injectedComments.add(commentId)

    const wrap = document.createElement('div')
    wrap.className = 'rev-restore-wrap'

    const btn = document.createElement('a')
    btn.href = '#'
    btn.className = 'rev-restore-btn'
    btn.textContent = 'restore'
    btn.addEventListener('click', e => {
        e.preventDefault()
        e.stopPropagation()
        handleRestore(commentId, wrap, true)
    })
    wrap.appendChild(btn)
    closestDiv.after(wrap)
}

function injectScanButton_newReddit(commentEl: HTMLElement) {
    const thingid = commentEl.getAttribute('thingid')
    if (!thingid || injectedComments.has(thingid)) return
    const actionRow = commentEl.querySelector('[slot="actionRow"]')
    if (!actionRow || actionRow.querySelector('.rev-scan-comment-btn')) return

    injectedComments.add(thingid)

    const btn = document.createElement('button')
    btn.className = 'rev-scan-comment-btn rev-comment-action'
    btn.textContent = 'scan-rev'
    btn.title = 'Scan for removed comments'
    btn.addEventListener('click', e => {
        e.preventDefault()
        e.stopPropagation()
        if (btn.classList.contains('rev-scan-exhausted')) return
        handleRestore(thingid, commentEl, true)
    })
    actionRow.appendChild(btn)
}

// --- Restore Handler ---

// Disable every scan/restore button while one search runs, so a user can't fire
// many at once (which would multiply requests to reddit and risk a rate-limit).
function setScanButtonsEnabled(enabled: boolean) {
    document.querySelectorAll('.rev-scan-comment-btn, .rev-scan-all-btn').forEach(b => {
        ;(b as HTMLElement).classList.toggle('rev-scan-disabled', !enabled)
    })
}

async function handleRestore(commentId: string, container: HTMLElement, isNewReddit: boolean) {
    const [postID, , , subreddit] = getFullIDsFromPath(window.location.pathname)
    if (!postID || !subreddit) return

    activeRestoreLimiter?.cancel()

    // Inline progress/cancel UI belongs next to the comment — for old reddit the
    // comment's own .entry, not the whole .thing (which sits above its replies).
    const host = isNewReddit ? container : (container.querySelector(':scope > .entry') as HTMLElement) || container

    const btn = (container.querySelector('.rev-restore-btn') ||
        container.querySelector('.rev-scan-comment-btn')) as HTMLElement
    if (btn) btn.style.display = 'none'
    setScanButtonsEnabled(false)

    host.querySelector(':scope > .rev-restore-progress')?.remove()
    host.querySelector(':scope > .rev-restore-cancel')?.remove()

    // Cancel goes first (left) so it stays put as the progress text changes width.
    const cancelBtn = document.createElement('a')
    cancelBtn.href = '#'
    cancelBtn.className = 'rev-restore-cancel'
    cancelBtn.textContent = 'cancel'
    host.appendChild(cancelBtn)

    const progressEl = document.createElement('span')
    progressEl.className = 'rev-restore-progress'
    const spinner = document.createElement('span')
    spinner.className = 'rev-spinner'
    const progressText = document.createElement('span')
    progressText.className = 'rev-restore-progress-text'
    progressEl.append(spinner, progressText)
    host.appendChild(progressEl)

    const limiter = new RateLimiter()
    activeRestoreLimiter = limiter
    cancelBtn.onclick = e => {
        e.preventDefault()
        limiter.cancel()
    }

    // Reuse the inserter from the thread-scan so other-found comments (tombstones
    // AND removed leaves without tombstones) are placed/orphaned properly, and
    // orphans relocate when their parent turns up later.
    const inserter = new RecoveredCommentInserter(isNewReddit)

    let result: RestoreResult
    let lastStatus = ''
    try {
        result = await restoreComment(
            commentId,
            postID,
            subreddit,
            isNewReddit,
            (progress: RestoreProgress) => {
                progressText.textContent = progress.message
                lastStatus = progress.status
            },
            authorCache,
            // Cross-check callback: when the scan finds another removed comment
            // while looking for the target, place it immediately — filling a
            // tombstone if one exists, or inserting into the tree / unattached area.
            rc => {
                inserter.add(rc)
                // Hide that comment's scan-rev button since it's resolved.
                const el = isNewReddit
                    ? document.querySelector(`[id="${rc.id}"], [thingid="${rc.id}"]`)
                    : findOldRedditCommentEl(rc.id)
                const otherBtn = el?.querySelector('.rev-scan-comment-btn') as HTMLElement | null
                if (otherBtn) otherBtn.style.display = 'none'
            },
        )
    } finally {
        activeRestoreLimiter = null
        setScanButtonsEnabled(true)
    }

    spinner.remove()
    cancelBtn.remove()

    if (result.found) {
        progressEl.remove()
        displayRestoredComment(commentId, container, result, isNewReddit)
        // Show filter and auto-switch if this is the first found comment
        injectThreadFilter(isNewReddit)
        shouldAutoFilterRemoved().then(auto => {
            if (auto) applyThreadFilter('removed', isNewReddit)
        })
        return
    }

    if (!btn) return
    btn.style.display = ''
    if (lastStatus === 'not_found') {
        if (result.exhausted) {
            // Every visible author has been searched — no more to find for ANY
            // comment in this thread, so disable ALL remaining scan buttons
            // (per-comment and thread-level).
            const exhaustedTitle = 'All visible authors searched — no more removed comments to find'
            document.querySelectorAll('.rev-scan-comment-btn:not(.rev-scan-exhausted)').forEach(b => {
                b.textContent = 'scan-rev'
                ;(b as HTMLElement).classList.add('rev-scan-exhausted')
                ;(b as HTMLElement).title = exhaustedTitle
            })
            const scanAllBtn = document.querySelector('.rev-scan-all-btn') as HTMLButtonElement | null
            if (scanAllBtn && !scanAllBtn.classList.contains('rev-scan-exhausted')) {
                scanAllBtn.classList.add('rev-scan-exhausted')
                scanAllBtn.disabled = true
                scanAllBtn.title = exhaustedTitle
            }
        } else {
            // More authors remain; show the count and let a re-click continue.
            // Update ALL non-exhausted scan buttons so every comment shows the
            // same remaining count.
            document.querySelectorAll('.rev-scan-comment-btn:not(.rev-scan-exhausted)').forEach(b => {
                const base = (b.textContent || '').replace(/\s*\(\d+\)\s*$/, '')
                b.textContent = `${base} (${result.remaining})`
                ;(b as HTMLElement).title = `${result.remaining} more author(s) to search — click to continue`
            })
        }
    }
    // cancelled / rate_limited / error: leave the button clickable so the user can retry.
}

// Find an old-reddit comment element by fullname. Removed tombstones have no
// data-fullname, so fall back to matching the comment id parsed from
// data-permalink (see commentFullnameFromPermalink).
function findOldRedditCommentEl(commentId: string): HTMLElement | null {
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

// --- Display Restored Comment ---

function displayRestoredComment(
    commentId: string,
    container: HTMLElement,
    result: RestoreResult,
    isNewReddit: boolean,
) {
    if (!result.body) return

    if (!isNewReddit) {
        const commentEl = findOldRedditCommentEl(commentId)
        if (!commentEl) return
        commentEl.classList.remove('deleted')
        // Highlight only the comment's own row (.entry), not the whole .thing —
        // the .thing contains its nested replies (.child), so a border/tint there
        // would span the entire subtree.
        const entry = (commentEl.querySelector(':scope > .entry') as HTMLElement | null) || commentEl
        entry.classList.add('rev-removed-highlight')
        const bodyEl = commentEl.querySelector(':scope > .entry .usertext-body .md')
        if (bodyEl && result.body_html) {
            bodyEl.innerHTML = result.body_html
        } else if (bodyEl) {
            bodyEl.textContent = result.body
        }

        if (result.author) {
            const authorEl = commentEl.querySelector(':scope > .entry .tagline .author')
            if (authorEl) {
                const link = document.createElement('a')
                link.href = `/user/${result.author}`
                link.className = 'author'
                link.textContent = result.author
                authorEl.replaceWith(link)
            }
        }
        // Attribution under the comment itself (the author already shows in the
        // tagline above), not appended after the whole subtree.
        const attr = document.createElement('div')
        attr.className = 'rev-restore-attribution'
        attr.textContent = 'Restored by Reveddit'
        entry.appendChild(attr)
        return
    }

    const restoredEl = document.createElement('div')
    restoredEl.className = 'rev-inserted-comment rev-removed-highlight'
    if (result.body_html) {
        restoredEl.innerHTML = result.body_html
    } else {
        restoredEl.textContent = result.body
    }
    container.appendChild(restoredEl)

    const attr = document.createElement('div')
    attr.className = 'rev-restore-attribution'
    attr.textContent = `Restored by Reveddit — comment by u/${result.author || 'unknown'}`
    container.appendChild(attr)
}

// --- Thread Scan All ---

function injectScanAllButton(isNewReddit: boolean) {
    if (!isNewReddit) {
        const menuarea = document.querySelector('.commentarea .menuarea')
        if (!menuarea || menuarea.querySelector('.rev-scan-all-btn')) return

        const btn = document.createElement('button')
        btn.className = 'rev-scan-all-btn'
        btn.textContent = 'Scan for removed comments'
        btn.title = 'Search for removed comments in this thread'
        btn.addEventListener('click', e => {
            e.preventDefault()
            handleScanAll(false)
        })
        menuarea.appendChild(btn)
    } else {
        if (document.querySelector('.rev-scan-all-btn')) return
        const anchor = document.querySelector('shreddit-comment-tree') || document.querySelector('main#main-content')
        if (!anchor) return

        const btn = document.createElement('button')
        btn.className = 'rev-scan-all-btn rev-profile-scan-btn'
        btn.textContent = 'Scan for removed comments'
        btn.addEventListener('click', e => {
            e.preventDefault()
            handleScanAll(true)
        })
        anchor.before(btn)
    }
}

async function handleScanAll(isNewReddit: boolean) {
    const [postID, , , subreddit] = getFullIDsFromPath(window.location.pathname)
    if (!postID || !subreddit) return

    const btn = document.querySelector('.rev-scan-all-btn') as HTMLButtonElement
    if (!btn) return
    const origText = btn.textContent
    btn.textContent = 'Scanning...'
    btn.disabled = true
    btn.classList.add('rev-scan-all-loading')
    // Block per-comment scans while the thread scan runs (and vice versa); keep
    // this button itself un-dimmed since it shows the active progress.
    setScanButtonsEnabled(false)
    btn.classList.remove('rev-scan-disabled')

    let progressEl = document.querySelector('.rev-scan-all-progress') as HTMLElement
    if (!progressEl) {
        progressEl = document.createElement('span')
        progressEl.className = 'rev-scan-all-progress'
        btn.after(progressEl)
    }
    progressEl.textContent = ''
    const spinner = document.createElement('span')
    spinner.className = 'rev-spinner'
    const progressText = document.createElement('span')
    progressEl.append(spinner, progressText)

    // Place each recovered comment the moment it's found: under its parent if
    // present, otherwise parked in the "unattached" area and relocated later if
    // an ancestor turns up in a subsequent search.
    const inserter = new RecoveredCommentInserter(isNewReddit)

    const recovered = await scanThreadForRemovedComments(
        postID,
        subreddit,
        isNewReddit,
        authorCache,
        progress => {
            progressText.textContent = progress.message
        },
        rc => inserter.add(rc),
    )

    btn.textContent =
        recovered.length > 0 ? `${recovered.length} comment(s) recovered` : origText || 'Scan for removed comments'
    btn.disabled = false
    btn.classList.remove('rev-scan-all-loading')
    setScanButtonsEnabled(true)
    // Leave the final status message visible; just drop the spinner.
    spinner.remove()

    // The thread-level scan searches all visible authors — so everything is now
    // exhausted. Disable all per-comment scan buttons + the thread button itself.
    const exhaustedTitle = 'All visible authors searched — no more removed comments to find'
    document.querySelectorAll('.rev-scan-comment-btn:not(.rev-scan-exhausted)').forEach(b => {
        b.textContent = 'scan-rev'
        ;(b as HTMLElement).classList.add('rev-scan-exhausted')
        ;(b as HTMLElement).title = exhaustedTitle
    })
    btn.classList.add('rev-scan-exhausted')
    btn.disabled = true
    btn.title = exhaustedTitle

    // Show the filter bar and auto-switch to "removed" view if any were found.
    if (recovered.length > 0) {
        injectThreadFilter(isNewReddit)
        shouldAutoFilterRemoved().then(auto => {
            if (auto) applyThreadFilter('removed', isNewReddit)
        })
    }
}

// --- Thread comment filter (all / removed) ---

type ThreadFilter = 'all' | 'removed'
let _activeThreadFilter: ThreadFilter = 'all'

function expandComment(el: Element) {
    if (!el.classList.contains('collapsed')) return
    el.classList.remove('collapsed')
    el.classList.add('noncollapsed')
    const btn = el.querySelector(':scope > .entry .expand')
    if (btn) btn.textContent = '[–]'
}

function collapseComment(el: Element) {
    if (el.classList.contains('collapsed')) return
    el.classList.remove('noncollapsed')
    el.classList.add('collapsed')
    const btn = el.querySelector(':scope > .entry .expand')
    if (btn) btn.textContent = '[+]'
}

function isRemovedOrRecovered(el: Element): boolean {
    // A tombstone filled by us, or inserted by us, or highlighted by per-comment scan
    if (el.classList.contains('rev-removed-highlight')) return true
    if (el.classList.contains('rev-inserted-comment')) return true
    if (el.getAttribute('data-rev-id')) return true
    // A native reddit tombstone (deleted class, body = [removed])
    if (el.classList.contains('deleted')) return true
    return false
}

// Does this comment or any of its descendants contain a removed comment?
function hasRemovedDescendant(el: Element): boolean {
    if (isRemovedOrRecovered(el)) return true
    const childContainer = el.querySelector(':scope > .child')
    if (!childContainer) return false
    const children = childContainer.querySelectorAll(':scope > .sitetable > .thing.comment, :scope > .thing.comment')
    for (const child of Array.from(children)) {
        if (hasRemovedDescendant(child)) return true
    }
    return false
}

function applyThreadFilter(filter: ThreadFilter, isNewReddit: boolean) {
    _activeThreadFilter = filter
    // Update button states
    document.querySelectorAll('.rev-thread-filter-btn').forEach(b => {
        b.classList.toggle('rev-filter-active', b.getAttribute('data-filter') === filter)
    })

    if (isNewReddit) {
        const topComments = document.querySelectorAll('shreddit-comment-tree > shreddit-comment[thingid]')
        for (const el of Array.from(topComments)) {
            applyFilterToNewRedditComment(el as HTMLElement, filter)
        }
        const unattached = document.querySelector('.rev-unattached-area')
        if (unattached)
            (unattached as HTMLElement).style.display =
                filter === 'all' || unattached.querySelector('.rev-removed-highlight, .rev-inserted-comment')
                    ? ''
                    : 'none'
        return
    }

    const topComments = document.querySelectorAll('.commentarea > .sitetable > .thing.comment')
    for (const el of Array.from(topComments)) {
        applyFilterToComment(el as HTMLElement, filter)
    }
    // Also handle unattached area
    const unattached = document.querySelector('.rev-unattached-area')
    if (unattached)
        (unattached as HTMLElement).style.display =
            filter === 'all' || unattached.querySelector('.rev-removed-highlight, .rev-inserted-comment') ? '' : 'none'
}

function applyFilterToComment(el: HTMLElement, filter: ThreadFilter) {
    if (filter === 'all') {
        if (el.hasAttribute('data-rev-filter-collapsed')) {
            expandComment(el)
            el.removeAttribute('data-rev-filter-collapsed')
        }
        const childContainer = el.querySelector(':scope > .child')
        if (childContainer) {
            const children = childContainer.querySelectorAll(
                ':scope > .sitetable > .thing.comment, :scope > .thing.comment',
            )
            children.forEach(c => applyFilterToComment(c as HTMLElement, filter))
        }
        return
    }

    // filter === 'removed': collapse non-removed subtrees at their highest
    // level so a single expand reveals the whole branch.
    if (!hasRemovedDescendant(el)) {
        if (!el.classList.contains('collapsed')) {
            collapseComment(el)
            el.setAttribute('data-rev-filter-collapsed', '1')
        }
        return
    }

    if (el.hasAttribute('data-rev-filter-collapsed')) {
        expandComment(el)
        el.removeAttribute('data-rev-filter-collapsed')
    }

    if (isRemovedOrRecovered(el)) {
        expandComment(el)
    }

    const childContainer = el.querySelector(':scope > .child')
    if (childContainer) {
        const children = childContainer.querySelectorAll(
            ':scope > .sitetable > .thing.comment, :scope > .thing.comment',
        )
        children.forEach(c => applyFilterToComment(c as HTMLElement, filter))
    }
}

function isNewRedditCommentRemoved(el: Element): boolean {
    if (el.classList.contains('rev-removed-highlight')) return true
    if (el.classList.contains('rev-inserted-comment')) return true
    if (el.hasAttribute('data-rev-id')) return true
    if (el.hasAttribute('is-comment-deleted')) return true
    const body = el.querySelector('[slot="comment"]')
    if (body && (body.textContent || '').toLowerCase().includes(REMOVED_BY_MODERATOR_TEXT)) return true
    return false
}

function hasNewRedditRemovedDescendant(el: Element): boolean {
    if (isNewRedditCommentRemoved(el)) return true
    const children = el.querySelectorAll(':scope > shreddit-comment')
    for (const child of Array.from(children)) {
        if (hasNewRedditRemovedDescendant(child)) return true
    }
    return false
}

function applyFilterToNewRedditComment(el: HTMLElement, filter: ThreadFilter) {
    if (filter === 'all') {
        if (el.hasAttribute('data-rev-filter-hidden')) {
            el.style.display = ''
            el.removeAttribute('data-rev-filter-hidden')
        }
        el.querySelectorAll(':scope > shreddit-comment').forEach(c =>
            applyFilterToNewRedditComment(c as HTMLElement, filter),
        )
        return
    }

    if (!hasNewRedditRemovedDescendant(el)) {
        el.style.display = 'none'
        el.setAttribute('data-rev-filter-hidden', '1')
        return
    }

    if (el.hasAttribute('data-rev-filter-hidden')) {
        el.style.display = ''
        el.removeAttribute('data-rev-filter-hidden')
    }

    el.querySelectorAll(':scope > shreddit-comment').forEach(c =>
        applyFilterToNewRedditComment(c as HTMLElement, filter),
    )
}

function injectThreadFilter(isNewReddit: boolean) {
    if (document.querySelector('.rev-thread-filter-bar')) return
    const bar = document.createElement('div')
    bar.className = 'rev-thread-filter-bar'

    const label = document.createElement('span')
    label.className = 'rev-own-filter-label'
    label.textContent = 'reveddit:'
    bar.appendChild(label)

    const mk = (text: string, f: ThreadFilter) => {
        const b = document.createElement('button')
        b.className = 'rev-filter-btn rev-thread-filter-btn' + (f === 'all' ? ' rev-filter-active' : '')
        b.textContent = text
        b.setAttribute('data-filter', f)
        b.addEventListener('click', () => applyThreadFilter(f, isNewReddit))
        return b
    }

    bar.appendChild(mk('all', 'all'))
    bar.appendChild(mk('removed', 'removed'))

    // Place next to the "Scan for removed comments" button
    const scanBtn = document.querySelector('.rev-scan-all-btn')
    if (scanBtn) {
        scanBtn.after(bar)
    } else {
        // Fallback: above comments
        const anchor = isNewReddit
            ? document.querySelector('shreddit-comment-tree') || document.querySelector('main')
            : document.querySelector('.commentarea .menuarea') || document.querySelector('.commentarea')
        if (anchor) anchor.prepend(bar)
    }
}

function shouldAutoFilterRemoved(): Promise<boolean> {
    return new Promise(resolve => {
        try {
            chrome.storage.sync.get(['options'], sync => {
                resolve((sync?.options || {}).auto_filter_removed_threads !== false)
            })
        } catch {
            resolve(true)
        }
    })
}

// --- Recovered comment insertion (thread restore) ---

// Builds the removed-comment subtree incrementally as comments are recovered.
// A comment is placed under its parent when the parent is present (a visible
// comment, a tombstone, or an already-recovered comment). If the parent is
// itself missing, the comment is parked in an "unattached" area and relocated
// under its parent later if that ancestor turns up in a subsequent search.
const MAX_BRIDGE_DEPTH = 8

class RecoveredCommentInserter {
    private isNewReddit: boolean
    private placed = new Map<string, HTMLElement>() // id -> element (can host children)
    private orphans = new Map<string, { rc: RecoveredComment; el: HTMLElement }>()
    private orphanArea: HTMLElement | null = null
    private placing = false

    constructor(isNewReddit: boolean) {
        this.isNewReddit = isNewReddit
    }

    add(rc: RecoveredComment) {
        if (this.placed.has(rc.id) || this.orphans.has(rc.id)) return

        // Prefer filling an existing tombstone in place (old reddit only).
        const tombstone = this.isNewReddit ? null : findOldRedditCommentEl(rc.id)
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

    // Distinct parent ids that orphans still need but that aren't in the tree.
    private pendingParentIds(): string[] {
        const ids = new Set<string>()
        for (const { rc } of this.orphans.values()) {
            if (rc.parent_id.startsWith('t1_')) ids.add(rc.parent_id)
        }
        return [...ids]
    }

    // Walk up the ancestor chain via /api/info to bridge unattached comments into
    // the tree: reconstruct each missing ancestor (removed → red, live-but-not-
    // loaded → muted "context") until its own parent is known, capped by depth.
    // Every chain ultimately reaches the post, so within the cap most attach.
    async placeUnattached(btn: HTMLButtonElement) {
        if (this.placing) return
        this.placing = true
        btn.disabled = true
        const limiter = new RateLimiter()
        const tried = new Set<string>()
        for (let level = 0; level < MAX_BRIDGE_DEPTH; level++) {
            const needed = this.pendingParentIds().filter(id => !tried.has(id))
            if (needed.length === 0) break
            needed.forEach(id => tried.add(id))
            btn.textContent = `Placing… (${this.orphans.size} left)`
            const looked = await lookupCommentsByIds(needed, limiter)
            if (looked.size === 0) break // ancestors unavailable (deleted/invalid)
            for (const c of looked.values()) {
                this.add({
                    id: c.id,
                    parent_id: c.parent_id || c.link_id,
                    link_id: c.link_id,
                    author: c.author,
                    body: c.body,
                    body_html: c.body_html,
                    created_utc: c.created_utc,
                    score: 0,
                    permalink: c.permalink,
                    subreddit: c.subreddit,
                    kind: c.removed ? 'recovered' : 'context',
                })
            }
        }
        this.placing = false
        if (this.orphans.size === 0) return // orphan area auto-removed when empty
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
        if (placedParent) return { container: childSlotOf(placedParent), prepend: false }

        if (this.isNewReddit) {
            if (parentId.startsWith('t3_')) {
                const tree = document.querySelector('shreddit-comment-tree') as HTMLElement
                return tree ? { container: tree, prepend: false } : null
            }
            const nativeParent = document.querySelector(`shreddit-comment[thingid="${parentId}"]`) as HTMLElement
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
        placeBtn.className = 'rev-place-unattached-btn'
        placeBtn.textContent = 'Place unattached comments'
        placeBtn.title = 'Look up the missing parent comments to nest these into the thread'
        placeBtn.addEventListener('click', e => {
            e.preventDefault()
            this.placeUnattached(placeBtn)
        })
        header.append(title, desc, placeBtn)
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

// Returns/creates the slot that holds a recovered comment's own children.
function childSlotOf(el: HTMLElement): HTMLElement {
    let slot = el.querySelector(':scope > .rev-rec-children') as HTMLElement | null
    if (!slot) {
        slot = document.createElement('div')
        slot.className = 'rev-rec-children'
        el.appendChild(slot)
    }
    return slot
}

// Returns/creates the child comment listing of a native old-reddit comment.
function oldRedditChildListing(nativeEl: HTMLElement): HTMLElement {
    let child = nativeEl.querySelector(':scope > .child') as HTMLElement | null
    if (!child) {
        child = document.createElement('div')
        child.className = 'child'
        nativeEl.appendChild(child)
    }
    let listing = child.querySelector(':scope > .sitetable') as HTMLElement | null
    if (!listing) {
        listing = document.createElement('div')
        listing.className = 'sitetable listing'
        child.appendChild(listing)
    }
    return listing
}

function newRedditChildSlot(parentComment: HTMLElement): HTMLElement {
    const thingid = parentComment.getAttribute('thingid') || ''
    const slotName = `children-${thingid}-rev`

    let wrapper = parentComment.querySelector(`[slot="${slotName}"]`) as HTMLElement | null
    if (wrapper) return wrapper

    // Create a named slot inside the shadow DOM's #comment-children
    const commentChildren = parentComment.shadowRoot?.querySelector('#comment-children')
    if (commentChildren) {
        const newSlot = document.createElement('slot')
        newSlot.name = slotName
        commentChildren.appendChild(newSlot)
    }

    // Light DOM wrapper targeting that slot — CSS applies normally
    wrapper = document.createElement('div')
    wrapper.slot = slotName
    wrapper.className = 'rev-rec-children'
    parentComment.appendChild(wrapper)
    return wrapper
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
        const rev = document.createElement('a')
        rev.className = 'rev-scan-item-link'
        rev.href = `https://www.reveddit.com${rc.permalink}`
        rev.target = '_blank'
        rev.rel = 'noopener'
        rev.textContent = 'view on reveddit'
        links.append(ctx, rev)
    }
    meta.appendChild(links)
    return meta
}

function recoveredBody(rc: RecoveredComment): HTMLElement {
    const body = document.createElement('div')
    // Outer .rev-removed-highlight already provides the red marker; no inner blue.
    body.className = 'rev-scan-item-body'
    if (rc.body_html) body.innerHTML = rc.body_html
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
    el.setAttribute('data-fullname', rc.id)
    el.setAttribute('data-rev-id', rc.id)
    const entry = document.createElement('div')
    entry.className = 'rev-rec-entry'
    entry.append(recoveredMeta(rc), recoveredBody(rc))
    el.appendChild(entry)
    return el
}

// Fills an existing old-reddit tombstone in place with the recovered content.
function fillRecoveredTombstone(tombstone: HTMLElement, rc: RecoveredComment): HTMLElement {
    tombstone.classList.remove('deleted')
    tombstone.setAttribute('data-rev-id', rc.id)
    // Highlight only this comment's row, not its nested replies (see displayRestoredComment).
    const entry = (tombstone.querySelector(':scope > .entry') as HTMLElement | null) || tombstone
    entry.classList.add('rev-removed-highlight')
    const bodyEl = tombstone.querySelector(':scope > .entry .usertext-body .md')
    if (bodyEl) {
        if (rc.body_html) bodyEl.innerHTML = rc.body_html
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

// --- Profile Scan: UI ---

function getProfileURLParams(): ProfileScanOptions {
    const params = new URLSearchParams(window.location.search)
    return {
        sort: params.get('sort') || undefined,
        t: params.get('t') || undefined,
        after: params.get('after') || undefined,
        before: params.get('before') || undefined,
    }
}

function injectProfileScanButton_oldReddit(username: string) {
    if (document.querySelector('.rev-profile-scan-container')) return

    // Render in the main content column (not the sidebar) so the scan button,
    // filter controls, and any recovered comments appear with the user's listing.
    const siteTable = document.querySelector('#siteTable')
    const main = document.querySelector('.content[role="main"]')
    const container = createProfileScanContainer(username)
    if (siteTable?.parentElement) {
        siteTable.parentElement.insertBefore(container, siteTable)
    } else if (main) {
        main.prepend(container)
    }
}

function injectProfileScanButton_newReddit(username: string) {
    if (!window.location.pathname.match(/^\/(?:user|u)\/[^/]+/)) return
    if (document.querySelector('.rev-profile-scan-container')) return

    // Insert before the feed, after the sort controls
    const targets = [
        document.querySelector('shreddit-feed'),
        document.querySelector('[data-testid="profile-main"]')?.parentElement,
        document.querySelector('faceplate-tabpanel')?.parentElement,
    ]
    const target = targets.find(Boolean)
    if (!target) return

    const container = createProfileScanContainer(username)
    target.insertAdjacentElement('beforebegin', container)
}

function createProfileScanContainer(username: string): HTMLElement {
    const container = document.createElement('div')
    container.className = 'rev-profile-scan-container'

    const btn = document.createElement('button')
    btn.className = 'rev-profile-scan-btn'
    btn.textContent = 'Scan for removed content'
    btn.addEventListener('click', () => handleProfileScan(username, container))

    const progress = document.createElement('div')
    progress.className = 'rev-profile-scan-progress'
    progress.style.display = 'none'

    const results = document.createElement('div')
    results.className = 'rev-profile-scan-results'
    results.style.display = 'none'

    container.appendChild(btn)
    container.appendChild(progress)
    container.appendChild(results)
    return container
}

async function handleProfileScan(username: string, container: HTMLElement) {
    const btn = container.querySelector('.rev-profile-scan-btn') as HTMLButtonElement
    const progressEl = container.querySelector('.rev-profile-scan-progress') as HTMLElement
    const resultsEl = container.querySelector('.rev-profile-scan-results') as HTMLElement

    btn.disabled = true
    btn.textContent = 'Scanning...'
    progressEl.style.display = ''
    resultsEl.style.display = 'none'
    resultsEl.innerHTML = ''

    const urlParams = getProfileURLParams()
    const results = await scanUserProfile(
        username,
        (progress: RestoreProgress) => {
            progressEl.textContent = progress.message
        },
        urlParams,
    )

    btn.disabled = false
    btn.textContent = 'Rescan'

    if (results.length === 0) {
        progressEl.textContent = 'No removed items found.'
        return
    }

    progressEl.style.display = 'none'
    resultsEl.style.display = ''

    const isNewReddit = detectIsNewReddit()
    const matched = highlightVisibleRemovedComments(results, isNewReddit)
    const inserted = insertMissingComments(results, matched, isNewReddit)

    renderFilterControls(resultsEl, results)
    applyFilter(currentFilter)

    // Show items that couldn't be placed on page
    const unplaced = results.filter(r => !matched.has(r.id) && !inserted.has(r.id))
    if (unplaced.length > 0) {
        const header = document.createElement('div')
        header.className = 'rev-scan-header'
        header.textContent = `${unplaced.length} removed item(s) from other pages:`
        resultsEl.appendChild(header)
        for (const item of unplaced) {
            resultsEl.appendChild(createScanResultItem(item))
        }
    }
}

// --- Profile Scan: Inline Integration ---

function highlightVisibleRemovedComments(results: ScanResult[], isNewReddit: boolean): Set<string> {
    const matched = new Set<string>()
    const resultMap = new Map(results.map(r => [r.id, r]))

    if (!isNewReddit) {
        const commentEls = document.querySelectorAll('.thing[data-fullname]')
        for (const el of Array.from(commentEls)) {
            const fullname = el.getAttribute('data-fullname')
            if (!fullname) continue
            const scanResult = resultMap.get(fullname)
            if (scanResult) {
                matched.add(fullname)
                highlightComment_oldReddit(el as HTMLElement, scanResult)
            }
        }
    } else {
        // New reddit: articles with data-post-id, or shreddit-post with id attribute
        const articles = document.querySelectorAll('article[data-post-id]')
        for (const el of Array.from(articles)) {
            const postId = el.getAttribute('data-post-id')
            if (!postId) continue
            const scanResult = resultMap.get(postId)
            if (scanResult) {
                matched.add(postId)
                highlightComment_newReddit(el as HTMLElement, scanResult)
            }
        }
    }

    return matched
}

function highlightComment_oldReddit(el: HTMLElement, result: ScanResult) {
    el.classList.add('rev-removed-highlight')

    const bodyEl = el.querySelector(':scope > .entry .usertext-body .md') || el.querySelector('.usertext-body .md')
    if (bodyEl && result.body) {
        if (result.body_html) {
            bodyEl.innerHTML = result.body_html
        } else {
            bodyEl.textContent = result.body
        }
    }

    const tagline = el.querySelector(':scope > .entry .tagline') || el.querySelector('.tagline')
    if (tagline && !tagline.querySelector('.rev-inline-badge')) {
        const badge = document.createElement('span')
        badge.className = 'rev-inline-badge rev-scan-badge-removed'
        badge.textContent = 'removed'
        tagline.appendChild(badge)
    }
}

function highlightComment_newReddit(el: HTMLElement, result: ScanResult) {
    el.classList.add('rev-removed-highlight')

    if (el.querySelector('.rev-restored-inline')) return

    // Add badge near the credit bar / timestamp area
    const creditBar = el.querySelector('[id^="feed-post-credit-bar"]') || el.querySelector('shreddit-post')
    if (creditBar && !creditBar.querySelector('.rev-inline-badge')) {
        const badge = document.createElement('span')
        badge.className = 'rev-inline-badge rev-scan-badge-removed'
        badge.textContent = 'removed'
        creditBar.appendChild(badge)
    }

    // Show restored body content
    if (result.body || result.body_html) {
        const restoredEl = document.createElement('div')
        restoredEl.className = 'rev-restored-inline'
        if (result.body_html) {
            restoredEl.innerHTML = result.body_html
        } else if (result.body) {
            restoredEl.textContent = result.body
        }
        const shredditPost = el.querySelector('shreddit-post') || el
        shredditPost.appendChild(restoredEl)
    }
}

// --- Profile Scan: Insert Missing Comments ---

interface VisibleItem {
    element: HTMLElement
    created_utc: number
    score: number
}

function getVisibleItemPositions(isNewReddit: boolean): VisibleItem[] {
    const items: VisibleItem[] = []

    if (!isNewReddit) {
        const things = document.querySelectorAll('#siteTable > .thing[data-fullname]')
        for (const el of Array.from(things)) {
            const timeEl = el.querySelector('time[datetime]')
            const datetime = timeEl?.getAttribute('datetime')
            const created_utc = datetime ? Math.floor(new Date(datetime).getTime() / 1000) : 0
            const scoreEl = el.querySelector('.score.unvoted')
            const score = scoreEl ? parseInt(scoreEl.getAttribute('title') || '0', 10) : 0
            items.push({ element: el as HTMLElement, created_utc, score })
        }
    } else {
        // New reddit profile: articles containing shreddit-post elements
        const articles = document.querySelectorAll('article[data-post-id]')
        for (const el of Array.from(articles)) {
            const shredditPost = el.querySelector('shreddit-post')
            const ts = shredditPost?.getAttribute('created-timestamp')
            const created_utc = ts ? Math.floor(new Date(ts).getTime() / 1000) : 0
            const score = parseInt(shredditPost?.getAttribute('score') || '0', 10)
            items.push({ element: el as HTMLElement, created_utc, score })
        }
    }

    return items
}

function insertMissingComments(results: ScanResult[], alreadyMatched: Set<string>, isNewReddit: boolean): Set<string> {
    const inserted = new Set<string>()
    const missing = results.filter(r => !alreadyMatched.has(r.id))
    if (missing.length === 0) return inserted

    const visibleItems = getVisibleItemPositions(isNewReddit)
    if (visibleItems.length === 0) return inserted

    const currentSort = new URLSearchParams(window.location.search).get('sort') || 'new'

    for (const item of missing) {
        const position = findInsertPosition(item, visibleItems, currentSort)
        if (position) {
            const el = createInlineItem(item, isNewReddit)
            position.element.insertAdjacentElement(position.where, el)
            inserted.add(item.id)
        }
    }

    return inserted
}

function findInsertPosition(
    item: ScanResult,
    visibleItems: VisibleItem[],
    sort: string,
): { element: HTMLElement; where: 'beforebegin' | 'afterend' } | null {
    for (const visible of visibleItems) {
        const shouldInsertBefore =
            sort === 'new'
                ? item.created_utc > visible.created_utc
                : sort === 'top'
                  ? (item.score || 0) > visible.score
                  : sort === 'controversial'
                    ? (item.score || 0) < visible.score
                    : item.created_utc > visible.created_utc

        if (shouldInsertBefore) {
            return { element: visible.element, where: 'beforebegin' }
        }
    }

    return {
        element: visibleItems[visibleItems.length - 1].element,
        where: 'afterend',
    }
}

function createInlineItem(item: ScanResult, isNewReddit: boolean): HTMLElement {
    const el = document.createElement(isNewReddit ? 'article' : 'div')
    el.className = 'rev-inserted-comment rev-removed-highlight'
    el.setAttribute('data-rev-id', item.id)
    if (isNewReddit) {
        el.setAttribute('data-post-id', item.id)
    } else {
        el.classList.add('thing')
        el.setAttribute('data-fullname', item.id)
    }

    const meta = document.createElement('div')
    meta.className = 'rev-scan-item-meta'
    const sub = item.subreddit ? `r/${item.subreddit}` : ''
    const age = item.created_utc ? getPrettyDate(item.created_utc) : ''
    meta.innerHTML = `${sub} &middot; ${age} <span class="rev-scan-badge-removed">removed</span>`

    const title = document.createElement('div')
    title.className = 'rev-scan-item-title'
    if (item.type === 'post' && item.title) {
        title.textContent = item.title
    }

    const body = document.createElement('div')
    body.className = 'rev-scan-item-body'
    if (item.body_html) {
        body.innerHTML = item.body_html
    } else if (item.body) {
        body.textContent = item.body
    }

    const link = document.createElement('a')
    link.className = 'rev-scan-item-link'
    link.href = `https://www.reveddit.com${item.permalink}`
    link.target = '_blank'
    link.textContent = 'View on Reveddit'

    el.appendChild(meta)
    if (item.title) el.appendChild(title)
    el.appendChild(body)
    el.appendChild(link)
    return el
}

// --- Profile Scan: Filter Controls ---

function renderFilterControls(container: HTMLElement, results: ScanResult[]) {
    const filterBar = document.createElement('div')
    filterBar.className = 'rev-filter-bar'

    const total = results.length

    const buttons: { label: string; filter: typeof currentFilter }[] = [
        { label: `Removed (${total})`, filter: 'removed' },
        { label: `All`, filter: 'all' },
    ]

    for (const { label, filter } of buttons) {
        const btn = document.createElement('button')
        btn.className = 'rev-filter-btn'
        if (filter === currentFilter) btn.classList.add('rev-filter-active')
        btn.textContent = label
        btn.addEventListener('click', () => {
            currentFilter = filter
            applyFilter(filter)
            filterBar.querySelectorAll('.rev-filter-btn').forEach(b => b.classList.remove('rev-filter-active'))
            btn.classList.add('rev-filter-active')
        })
        filterBar.appendChild(btn)
    }

    container.prepend(filterBar)
}

function applyFilter(filter: 'all' | 'removed' | 'visible') {
    const isNewReddit = detectIsNewReddit()

    // Handle items in the main listing
    const selector = isNewReddit ? 'article[data-post-id]' : '#siteTable > .thing[data-fullname]'
    const items = document.querySelectorAll(selector)

    for (const el of Array.from(items)) {
        const htmlEl = el as HTMLElement
        const isHighlighted = el.classList.contains('rev-removed-highlight')

        switch (filter) {
            case 'all':
                htmlEl.style.display = ''
                break
            case 'removed':
                htmlEl.style.display = isHighlighted ? '' : 'none'
                break
            case 'visible':
                htmlEl.style.display = ''
                break
        }
    }

    // Handle inserted comments
    const insertedEls = document.querySelectorAll('.rev-inserted-comment')
    for (const el of Array.from(insertedEls)) {
        const htmlEl = el as HTMLElement
        switch (filter) {
            case 'all':
            case 'removed':
                htmlEl.style.display = ''
                break
            case 'visible':
                htmlEl.style.display = 'none'
                break
        }
    }
}

// --- Shared helper ---

function createScanResultItem(item: ScanResult): HTMLElement {
    const el = document.createElement('div')
    el.className = 'rev-scan-item rev-removed-highlight'

    // Title: the post title for posts, the parent post's title for comments.
    const titleText = item.type === 'post' ? item.title : item.link_title
    if (titleText) {
        const title = document.createElement('a')
        title.className = 'rev-scan-item-title'
        title.href = `https://old.reddit.com${item.permalink}`
        title.target = '_blank'
        title.rel = 'noreferrer'
        title.textContent = titleText
        el.appendChild(title)
    }

    const meta = document.createElement('div')
    meta.className = 'rev-scan-item-meta'
    const sub = item.subreddit ? `r/${item.subreddit}` : ''
    const age = item.created_utc ? getPrettyDate(item.created_utc) : ''
    meta.innerHTML = `${sub}${sub && age ? ' &middot; ' : ''}${age} <span class="rev-scan-badge-removed">removed</span>`
    el.appendChild(meta)

    if (item.body) {
        const body = document.createElement('div')
        body.className = 'rev-scan-item-body'
        body.textContent = item.body
        el.appendChild(body)
    }

    const links = document.createElement('div')
    links.className = 'rev-scan-item-links'
    const mkLink = (text: string, href: string) => {
        const a = document.createElement('a')
        a.className = 'rev-scan-item-link'
        a.href = href
        a.target = '_blank'
        a.rel = 'noreferrer'
        a.textContent = text
        return a
    }
    links.appendChild(mkLink('context', `https://old.reddit.com${item.permalink}?context=3`))
    links.appendChild(mkLink('view on reveddit', `https://www.reveddit.com${item.permalink}`))
    el.appendChild(links)

    return el
}

// --- Public entry points ---

// Thread-scan buttons (per-comment "scan" + thread-level "Scan for removed
// comments") are governed by the show_thread_scan_buttons option (default ON).
function shouldShowThreadScanButtons(): Promise<boolean> {
    return new Promise(resolve => {
        try {
            chrome.storage.sync.get(['options'], sync => {
                resolve((sync?.options || {}).show_thread_scan_buttons !== false)
            })
        } catch {
            resolve(true)
        }
    })
}

export function initRestoreOnThread(isNewReddit: boolean) {
    shouldShowThreadScanButtons().then(show => {
        if (!show) return
        if (!isNewReddit) {
            const selector = '.thing.comment'
            for (const el of Array.from(document.querySelectorAll(selector))) {
                injectRestoreButton_oldReddit(el as HTMLElement)
            }
            observe(document, selector, el => injectRestoreButton_oldReddit(el as HTMLElement))
        } else {
            const processSpan = (el: Element) => {
                if ((el.textContent || '').toLowerCase().trim() === REMOVED_BY_MODERATOR_TEXT) {
                    injectRestoreButton_newReddit(el)
                }
            }
            for (const el of findByText(document, 'span', REMOVED_BY_MODERATOR_TEXT)) {
                injectRestoreButton_newReddit(el)
            }
            observe(document, 'span', processSpan)

            // Per-comment scan buttons on all shreddit-comments
            const commentSel = 'shreddit-comment[thingid]'
            document.querySelectorAll(commentSel).forEach(el => injectScanButton_newReddit(el as HTMLElement))
            observe(document, commentSel, el => injectScanButton_newReddit(el as HTMLElement))
        }

        injectScanAllButton(isNewReddit)
        if (isNewReddit) {
            // Comment tree may not exist yet — retry when it appears.
            observe(document, 'shreddit-comment-tree', () => injectScanAllButton(true))
        }
    })
}

export function initProfileScan(username: string, isNewReddit: boolean) {
    shouldShowProfileScanButton(username).then(show => {
        if (!show) return
        if (!isNewReddit) {
            injectProfileScanButton_oldReddit(username)
        } else {
            injectProfileScanButton_newReddit(username)
            setTimeout(() => injectProfileScanButton_newReddit(username), 1500)
            setTimeout(() => injectProfileScanButton_newReddit(username), 3000)
            setTimeout(() => injectProfileScanButton_newReddit(username), 5000)
            setTimeout(() => injectProfileScanButton_newReddit(username), 10000)
            // Also observe for shreddit-feed appearing dynamically
            observe(document, 'shreddit-feed', () => injectProfileScanButton_newReddit(username))
        }
    })
}

// Whether to inject the scan button, governed by two options:
//   - other profiles: show_scan_on_other_profiles (default ON; undefined → on)
//   - the logged-in user's OWN profile: show_scan_on_own_profile (default OFF)
function shouldShowProfileScanButton(username: string): Promise<boolean> {
    return new Promise(resolve => {
        try {
            chrome.storage.local.get(['last_logged_in_user'], local => {
                const me = local?.last_logged_in_user
                const isOwnProfile = !!me && String(me).toLowerCase() === username.toLowerCase()
                chrome.storage.sync.get(['options'], sync => {
                    const opts = sync?.options || {}
                    if (isOwnProfile) {
                        resolve(!!opts.show_scan_on_own_profile)
                    } else {
                        resolve(opts.show_scan_on_other_profiles !== false)
                    }
                })
            })
        } catch {
            resolve(true)
        }
    })
}

// --- Own-content status highlight (threads + profiles) ---
//
// Flag the logged-in user's content that the monitor already recorded as
// removed (red) or locked (gold). Reddit shows your own removed comments
// normally, so there's otherwise no cue. Reads stored removed_u_*/locked_u_*
// records only — no extra API calls. Default on; toggle in options.

type OwnFilter = 'all' | 'removed' | 'locked'

function loadOwnRemovedSets(cb: (removed: Set<string>, locked: Set<string>) => void, username?: string) {
    try {
        chrome.storage.local.get(['last_logged_in_user'], local => {
            const me = local?.last_logged_in_user
            if (!me) return
            if (username && String(me).toLowerCase() !== username.toLowerCase()) return
            chrome.storage.sync.get(['options'], sync => {
                if ((sync?.options || {}).highlight_own_profile_status === false) return
                const keys = getObjectNamesForThing(me, true)
                chrome.storage.sync.get([keys.removed, keys.locked], data => {
                    const removed = new Set(Object.keys(data[keys.removed] || {}))
                    const locked = new Set(Object.keys(data[keys.locked] || {}))
                    if (removed.size === 0 && locked.size === 0) return
                    cb(removed, locked)
                })
            })
        })
    } catch {
        // storage unavailable
    }
}

function flagOwnStatus(
    el: HTMLElement,
    removed: Set<string>,
    locked: Set<string>,
    getId: (el: HTMLElement) => string,
    getHighlightTarget?: (el: HTMLElement) => HTMLElement,
) {
    if (el.hasAttribute('data-rev-status')) return
    const id = getId(el)
    if (!id) return
    const status = removed.has(id) ? 'removed' : locked.has(id) ? 'locked' : ''
    el.setAttribute('data-rev-status', status)
    if (!status) return
    const target = getHighlightTarget ? getHighlightTarget(el) : el
    if (status === 'removed') target.classList.add('rev-removed-highlight')
    else target.classList.add('rev-locked-highlight')
}

export function initOwnThreadStatus(isNewReddit: boolean) {
    loadOwnRemovedSets((removed, locked) => {
        const selector = isNewReddit ? 'shreddit-comment[thingid]' : '.thing.comment[data-fullname]'
        const getId = (el: HTMLElement) =>
            isNewReddit ? el.getAttribute('thingid') || '' : el.getAttribute('data-fullname') || ''
        // Old reddit: highlight .entry not .thing — .thing wraps nested replies.
        // New reddit: shreddit-comment itself is fine — children are slotted separately.
        const getTarget = isNewReddit
            ? undefined
            : (el: HTMLElement) => (el.querySelector(':scope > .entry') as HTMLElement) || el
        const flag = (el: HTMLElement) => flagOwnStatus(el, removed, locked, getId, getTarget)
        document.querySelectorAll(selector).forEach(el => flag(el as HTMLElement))
        observe(document, selector, el => flag(el as HTMLElement))
    })
}

export function initOwnProfileStatus(username: string, isNewReddit: boolean) {
    loadOwnRemovedSets((removed, locked) => {
        const selector = isNewReddit
            ? 'shreddit-post[id^="t3_"], shreddit-profile-comment[comment-id]'
            : '#siteTable .thing[data-fullname]'
        const getId = (el: HTMLElement) =>
            el.getAttribute('data-fullname') || el.getAttribute('comment-id') || el.getAttribute('id') || ''
        let filter: OwnFilter = 'all'

        const applyFilter = (el: HTMLElement) => {
            const status = el.getAttribute('data-rev-status') || ''
            el.style.display = filter === 'all' || filter === status ? '' : 'none'
        }
        const flag = (el: HTMLElement) => {
            flagOwnStatus(el, removed, locked, getId)
            applyFilter(el)
        }

        document.querySelectorAll(selector).forEach(el => flag(el as HTMLElement))
        injectOwnFilterBar(isNewReddit, removed.size > 0, locked.size > 0, f => {
            filter = f
            document.querySelectorAll(selector).forEach(el => applyFilter(el as HTMLElement))
        })
        observe(document, selector, el => flag(el as HTMLElement))
    }, username)
}

function injectOwnFilterBar(
    isNewReddit: boolean,
    hasRemoved: boolean,
    hasLocked: boolean,
    onFilter: (f: OwnFilter) => void,
) {
    if (document.querySelector('.rev-own-filter-bar')) return
    const bar = document.createElement('div')
    bar.className = 'rev-filter-bar rev-own-filter-bar'

    const label = document.createElement('span')
    label.className = 'rev-own-filter-label'
    label.textContent = 'reveddit:'
    bar.appendChild(label)

    const mk = (text: string, f: OwnFilter, active: boolean) => {
        const b = document.createElement('button')
        b.className = 'rev-filter-btn' + (active ? ' rev-filter-active' : '')
        b.textContent = text
        b.addEventListener('click', () => {
            bar.querySelectorAll('.rev-filter-btn').forEach(x => x.classList.remove('rev-filter-active'))
            b.classList.add('rev-filter-active')
            onFilter(f)
        })
        return b
    }

    bar.appendChild(mk('all', 'all', true))
    if (hasRemoved) bar.appendChild(mk('removed', 'removed', false))
    if (hasLocked) bar.appendChild(mk('locked', 'locked', false))

    if (isNewReddit) {
        const feed = document.querySelector('shreddit-feed')
        feed?.parentElement?.insertBefore(bar, feed)
    } else {
        const siteTable = document.querySelector('#siteTable')
        siteTable?.parentElement?.insertBefore(bar, siteTable)
    }
}
