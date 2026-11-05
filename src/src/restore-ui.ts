import { getFullIDsFromPath, getPrettyDate, detectIsNewReddit } from './common'
import { getObjectNamesForThing } from './storage'
import { observe } from './dom-helpers'
import { getMarkupConfig } from './markup-config'
import {
    restoreComment,
    scanUserProfile,
    scanThreadForRemovedComments,
    commentFullnameFromPermalink,
    commentIdOf,
    commentSelector,
    lookupCommentsByIds,
    noteCountSeen,
    recoveredOnPage,
    scanFailure,
    COULD_NOT_READ,
    RateLimiter,
    ScanReads,
    type RestoreProgress,
    type RestoreResult,
    type RecoveredComment,
    type ScanResult,
    type ProfileScanOptions,
} from './restore'

// --- State tracking ---

const injectedComments = new Set<string>()
// The scan running now, on this tab: one at a time
let activeScan: RateLimiter | null = null
// The feeds this page's scans have read, so the next click goes on from there
const pageReads = new Map<string, any[]>()
// Whether the profile scan on this page saw everything, so a rescan starts over
let profileScanFinished = false
// Pages this script has seen arrive
let arrivals = 0
// Places what this page's scans recover, so each click's can nest under the last's
let pageInserter: RecoveredCommentInserter | null = null
const inserterForPage = (isNewReddit: boolean) => (pageInserter ||= new RecoveredCommentInserter(isNewReddit))

// A document can last a whole visit to reddit, so a new page starts over. Back
// and forward can bring a page back with its buttons as they were when it left.
export function resetScansForPage() {
    arrivals++
    pageReads.clear()
    profileScanFinished = false
    pageInserter = null
    setScanButtonsEnabled(!activeScan)
}
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
    btn.classList.toggle('rev-scan-disabled', !!activeScan)
    btn.textContent = 'scan-rev'
    btn.title = 'Search for removed comments in this thread via reveddit'
    btn.addEventListener('click', e => {
        e.preventDefault()
        e.stopPropagation()
        if (btn.classList.contains('rev-scan-exhausted')) return
        handleRestore(id, commentEl, false, btn)
    })
    li.appendChild(btn)
    buttons.appendChild(li)
}

// --- Thread Restore: New Reddit ---

// A comment's replies sit inside it, so a plain lookup can land on a reply's part
function ownPart(comment: Element, selector: string): HTMLElement | undefined {
    return Array.from(comment.querySelectorAll(selector)).find(el => el.closest('shreddit-comment') === comment) as
        | HTMLElement
        | undefined
}

const newRedditCommentEl = (id: string) => document.querySelector(commentSelector(id)) as HTMLElement

// A moderator's removal kept for its replies, read from its markup since its
// words may follow the page's language: no author, no text of the comment's own
// and not marked as the author's deletion. Its one paragraph is reddit's notice.
const removedText_newReddit = (comment: Element) =>
    comment.matches('[author="[deleted]"]:not([is-comment-deleted])') && !ownPart(comment, '[slot="comment"]')
        ? ownPart(comment, 'p')
        : undefined

// Comment observers last the whole document, and a post on a profile has no
// thread of the kind a scan reads
const onSubredditThread = () => !!getFullIDsFromPath(window.location.pathname)[3]

// Reddit collapses removed comments, and old reddit low-scored ones, with their
// replies inside, so something placed in one needs it and all around it open.
function openComment(comment: Element) {
    let c: Element | null | undefined = comment
    for (; c; c = c.parentElement?.closest('shreddit-comment, .thing.comment')) {
        c.querySelector(':scope > details')?.setAttribute('open', '')
        expandComment(c)
    }
}

// Under the comment's text, above its own buttons, not below its replies
function addUnderComment(comment: HTMLElement, ...els: HTMLElement[]) {
    const actionRow = ownPart(comment, '[slot="actionRow"]')
    if (actionRow) actionRow.before(...els)
    else comment.append(...els)
    openComment(comment)
}

function injectRestoreButton_newReddit(comment: HTMLElement) {
    const commentId = commentIdOf(comment)
    const textBlock = removedText_newReddit(comment)?.closest('div')
    if (!commentId || !textBlock || !onSubredditThread()) return
    if (textBlock.parentElement?.querySelector('.rev-restore-btn')) return

    const wrap = document.createElement('div')
    wrap.className = 'rev-restore-wrap'

    const btn = document.createElement('a')
    btn.href = '#'
    btn.className = 'rev-restore-btn'
    btn.classList.toggle('rev-scan-disabled', !!activeScan)
    btn.textContent = 'restore'
    btn.addEventListener('click', e => {
        e.preventDefault()
        e.stopPropagation()
        handleRestore(commentId, comment, true, btn)
    })
    wrap.appendChild(btn)
    textBlock.after(wrap)
}

function newRedditScanBtnHTML(): string {
    return (
        '<svg fill="currentColor" height="16" width="16" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">' +
        '<path d="M9 2a7 7 0 104.32 12.527l3.576 3.576a1 1 0 001.414-1.414l-3.576-3.576A7 7 0 009 2zM4 9a5 5 0 1110 0A5 5 0 014 9z"/>' +
        '</svg>' +
        '<span>Scan-Rev</span>'
    )
}

// Reddit stamps a comment's action row as the comment comes into view. The button
// takes a slot of the row's, which puts it inline with Share, and a light child
// stays in reach of the page's scan state, unlike one in the row's shadow root.
function injectScanButton_newReddit(row: Element) {
    const comment = row.closest('shreddit-comment') as HTMLElement | null
    const thingid = commentIdOf(comment)
    if (!comment || !thingid || !onSubredditThread()) return
    if (row.querySelector('.rev-scan-comment-btn') || removedText_newReddit(comment)) return

    const btn = document.createElement('button')
    btn.slot = getMarkupConfig().commentButtonSlots[0]
    btn.className = 'rev-scan-comment-btn rev-newreddit-action'
    btn.classList.toggle('rev-scan-disabled', !!activeScan)
    btn.title = 'Search for removed comments in this thread via reveddit'
    btn.innerHTML = newRedditScanBtnHTML()
    btn.addEventListener('click', e => {
        e.preventDefault()
        e.stopPropagation()
        if (btn.classList.contains('rev-scan-exhausted')) return
        handleRestore(thingid, comment, true, btn)
    })
    row.appendChild(btn)
}

// --- Restore Handler ---

// Disable every scan/restore button while one search runs, so a user can't fire
// many at once (which would multiply requests to reddit and risk a rate-limit).
function setScanButtonsEnabled(enabled: boolean) {
    document
        .querySelectorAll('.rev-scan-comment-btn, .rev-restore-btn, .rev-scan-all-btn, .rev-place-unattached-btn')
        .forEach(b => {
            ;(b as HTMLElement).classList.toggle('rev-scan-disabled', !enabled)
        })
}

// A scan belongs to the page it started on. pageEl is part of that page: reddit
// replaces it on leaving, which stops the scan, and nothing it finds is shown.
function startScan(pageEl: HTMLElement): RateLimiter {
    activeScan?.cancel()
    const limiter = new RateLimiter(undefined, () => pageEl.isConnected)
    activeScan = limiter
    setScanButtonsEnabled(false)
    return limiter
}

function endScan(limiter: RateLimiter) {
    if (activeScan !== limiter) return
    activeScan = null
    setScanButtonsEnabled(true)
}

function addCancelLink(host: HTMLElement, limiter: RateLimiter): HTMLElement {
    const cancelBtn = document.createElement('a')
    cancelBtn.href = '#'
    cancelBtn.className = 'rev-restore-cancel'
    cancelBtn.textContent = 'cancel'
    cancelBtn.onclick = e => {
        e.preventDefault()
        limiter.cancel()
    }
    host.appendChild(cancelBtn)
    return cancelBtn
}

// Place a recovered comment and retire the buttons that would search for it
function placeRecovered(inserter: RecoveredCommentInserter, rc: RecoveredComment, isNewReddit: boolean) {
    inserter.add(rc)
    const el = isNewReddit ? newRedditCommentEl(rc.id) : findOldRedditCommentEl(rc.id)
    const otherBtn = isNewReddit
        ? el && ownPart(el, '.rev-scan-comment-btn, .rev-restore-btn')
        : (el?.querySelector('.rev-scan-comment-btn') as HTMLElement | null)
    if (otherBtn) otherBtn.style.display = 'none'
}

async function handleRestore(commentId: string, container: HTMLElement, isNewReddit: boolean, btn: HTMLElement) {
    const [postID, , , subreddit] = getFullIDsFromPath(window.location.pathname)
    if (!postID || !subreddit) return

    // Inline progress/cancel UI belongs next to the comment: on old reddit its own
    // .entry, and on new reddit beside its action row. Neither holds its replies.
    const host = isNewReddit
        ? ownPart(container, '[slot="actionRow"]')?.parentElement || container
        : (container.querySelector(':scope > .entry') as HTMLElement) || container

    btn.style.display = 'none'
    const limiter = startScan(container)

    host.querySelector(':scope > .rev-restore-progress')?.remove()
    host.querySelector(':scope > .rev-restore-cancel')?.remove()

    // Cancel goes first (left) so it stays put as the progress text changes width.
    const cancelBtn = addCancelLink(host, limiter)

    const progressEl = document.createElement('span')
    progressEl.className = 'rev-restore-progress'
    const spinner = document.createElement('span')
    spinner.className = 'rev-spinner'
    const progressText = document.createElement('span')
    progressText.className = 'rev-restore-progress-text'
    progressEl.append(spinner, progressText)
    host.appendChild(progressEl)

    // Reuse the inserter from the thread-scan so other-found comments (tombstones
    // AND removed leaves without tombstones) are placed/orphaned properly, and
    // orphans relocate when their parent turns up later.
    const inserter = inserterForPage(isNewReddit)

    const placedBefore = inserter.placedCount
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
            pageReads,
            // Cross-check callback: when the scan finds another removed comment
            // while looking for the target, place it immediately — filling a
            // tombstone if one exists, or inserting into the tree / unattached area.
            rc => {
                if (container.isConnected) placeRecovered(inserter, rc, isNewReddit)
            },
            limiter,
        )
    } finally {
        endScan(limiter)
    }

    spinner.remove()
    cancelBtn.remove()

    // Back and forward can put this comment back, ready to search again
    if (!container.isConnected) {
        progressEl.remove()
        btn.style.display = ''
        return
    }

    if (result.found) {
        progressEl.remove()
        displayRestoredComment(commentId, container, result, isNewReddit)
        // Show filter and auto-switch if this is the first found comment
        injectThreadFilter(isNewReddit)
        autoFilterRemoved(isNewReddit, container)
    }
    if (result.found || inserter.placedCount > placedBefore) refreshThreadFilter(isNewReddit)
    if (result.found) return

    btn.style.display = ''
    if (lastStatus === 'not_found') {
        if (result.exhausted) {
            // Every visible author has been searched — no more to find for ANY
            // comment in this thread, so disable ALL remaining scan buttons
            // (per-comment and thread-level). A comment that needs another sort
            // of their feeds has its search still to come, so only this one goes.
            const exhaustedTitle = 'All visible authors searched — no more removed comments to find'
            const scanBtns = Array.from(document.querySelectorAll('.rev-scan-comment-btn:not(.rev-scan-exhausted)'))
            scanBtns
                .filter(b => !result.otherSorts || b === btn)
                .forEach(b => {
                    b.textContent = 'scan-rev'
                    ;(b as HTMLElement).classList.add('rev-scan-exhausted')
                    ;(b as HTMLElement).title = exhaustedTitle
                })
            const scanAllBtn = document.querySelector('.rev-scan-all-btn') as HTMLButtonElement | null
            if (!result.otherSorts && scanAllBtn && !scanAllBtn.classList.contains('rev-scan-exhausted')) {
                scanAllBtn.classList.add('rev-scan-exhausted')
                scanAllBtn.disabled = true
                scanAllBtn.title = exhaustedTitle
            }
        } else {
            // More remains; show the count and let a re-click continue. Update
            // ALL non-exhausted scan buttons so every comment shows the same
            // remaining count.
            document.querySelectorAll('.rev-scan-comment-btn:not(.rev-scan-exhausted)').forEach(b => {
                const base = (b.textContent || '').replace(/\s*\(\d+\)\s*$/, '')
                b.textContent = `${base} (${result.remaining})`
                ;(b as HTMLElement).title = `${result.remaining} more to check — click to continue`
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
        commentEl.setAttribute('data-rev-id', commentId)
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
    restoredEl.setAttribute('data-rev-id', commentId)
    if (result.body_html) {
        restoredEl.innerHTML = result.body_html
    } else {
        restoredEl.textContent = result.body
    }

    const attr = document.createElement('div')
    attr.className = 'rev-restore-attribution'
    attr.textContent = `Restored by Reveddit — comment by u/${result.author || 'unknown'}`
    addUnderComment(container, restoredEl, attr)
}

// --- Thread Scan All ---

const SCAN_ALL_TEXT = 'Scan for removed comments'

function injectScanAllButton(isNewReddit: boolean) {
    if (!isNewReddit) {
        const menuarea = document.querySelector('.commentarea .menuarea')
        if (!menuarea || menuarea.querySelector('.rev-scan-all-btn')) return

        const btn = document.createElement('button')
        btn.className = 'rev-scan-all-btn'
        btn.textContent = SCAN_ALL_TEXT
        btn.title = 'Search for removed comments in this thread'
        btn.addEventListener('click', e => {
            e.preventDefault()
            handleScanAll(false)
        })
        menuarea.appendChild(btn)
    } else {
        if (document.querySelector('.rev-scan-all-btn')) return
        const tree = document.querySelector('shreddit-comment-tree')
        if (!tree) return

        const btn = document.createElement('button')
        btn.className = 'rev-scan-all-btn rev-profile-scan-btn'
        btn.textContent = SCAN_ALL_TEXT
        btn.addEventListener('click', e => {
            e.preventDefault()
            handleScanAll(true)
        })
        tree.prepend(btn)
    }
}

async function handleScanAll(isNewReddit: boolean) {
    const [postID, , , subreddit] = getFullIDsFromPath(window.location.pathname)
    if (!postID || !subreddit) return

    const btn = document.querySelector('.rev-scan-all-btn') as HTMLButtonElement
    if (!btn) return
    btn.textContent = 'Scanning...'
    btn.disabled = true
    btn.classList.add('rev-scan-all-loading')
    // Block per-comment scans while the thread scan runs (and vice versa); keep
    // this button itself un-dimmed since it shows the active progress.
    const limiter = startScan(btn)
    btn.classList.remove('rev-scan-disabled')

    let progressEl = document.querySelector('.rev-scan-all-progress') as HTMLElement
    if (!progressEl) {
        progressEl = document.createElement('span')
        progressEl.className = 'rev-scan-all-progress'
        btn.after(progressEl)
    }
    progressEl.textContent = ''
    const cancelBtn = addCancelLink(progressEl, limiter)
    const spinner = document.createElement('span')
    spinner.className = 'rev-spinner'
    const progressText = document.createElement('span')
    progressEl.append(spinner, progressText)

    // Place each recovered comment the moment it's found: under its parent if
    // present, otherwise parked in the "unattached" area and relocated later if
    // an ancestor turns up in a subsequent search.
    const inserter = inserterForPage(isNewReddit)

    let finalStatus = ''
    const recovered = await scanThreadForRemovedComments(
        postID,
        subreddit,
        isNewReddit,
        pageReads,
        progress => {
            progressText.textContent = progress.message
            finalStatus = progress.status
        },
        rc => {
            if (btn.isConnected) placeRecovered(inserter, rc, isNewReddit)
        },
        limiter,
    )

    const onPage = recoveredOnPage()
    btn.textContent = onPage > 0 ? `${onPage} comment(s) recovered` : SCAN_ALL_TEXT
    if (finalStatus === 'partial') btn.textContent = 'Continue scan'
    btn.disabled = false
    btn.classList.remove('rev-scan-all-loading')
    endScan(limiter)
    // Leave the final status message visible; just drop the spinner.
    spinner.remove()
    cancelBtn.remove()

    // Left the page: what's on screen now isn't this scan's business
    if (!btn.isConnected) return

    // A scan that finished searched all visible authors, so everything is now
    // exhausted: disable all per-comment scan buttons + the thread button
    // itself. One that stopped (refused pages, rate limit, no comment tree, the
    // click's limit) leaves them for another try.
    if (finalStatus === 'found' || finalStatus === 'not_found') {
        const exhaustedTitle = 'All visible authors searched — no more removed comments to find'
        document.querySelectorAll('.rev-scan-comment-btn:not(.rev-scan-exhausted)').forEach(b => {
            b.textContent = 'scan-rev'
            ;(b as HTMLElement).classList.add('rev-scan-exhausted')
            ;(b as HTMLElement).title = exhaustedTitle
        })
        btn.classList.add('rev-scan-exhausted')
        btn.disabled = true
        btn.title = exhaustedTitle
    }

    // Show the filter bar and auto-switch to "removed" view if any were found.
    if (recovered.length > 0) {
        injectThreadFilter(isNewReddit)
        autoFilterRemoved(isNewReddit, btn)
        refreshThreadFilter(isNewReddit)
    }
}

// --- Thread comment filter (all / removed) ---

type ThreadFilter = 'all' | 'removed'

// A placement may have gone under a comment the filter hid. The bar holds the
// choice: it comes and goes with its page, and a document can last a whole visit.
function refreshThreadFilter(isNewReddit: boolean) {
    const active = document.querySelector('.rev-thread-filter-btn.rev-filter-active')
    if (active?.getAttribute('data-filter') === 'removed') applyThreadFilter('removed', isNewReddit)
}

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
    // Monitoring's record of the viewer's own comment, whose highlight is on its .entry
    if (el.getAttribute('data-rev-status') === 'removed') return true
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
    // Update button states
    document.querySelectorAll('.rev-thread-filter-btn').forEach(b => {
        b.classList.toggle('rev-filter-active', b.getAttribute('data-filter') === filter)
    })

    if (isNewReddit) {
        const comments = Array.from(document.querySelectorAll('shreddit-comment-tree shreddit-comment'))
        for (const el of comments.filter(c => !c.parentElement?.closest('shreddit-comment'))) {
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

// Replies sit deep inside their parent, and hold their own replies
const repliesOf_newReddit = (el: Element) =>
    Array.from(el.querySelectorAll('shreddit-comment')).filter(c => c.parentElement?.closest('shreddit-comment') === el)

function isNewRedditCommentRemoved(el: Element): boolean {
    return (
        !!removedText_newReddit(el) ||
        !!ownPart(el, '.rev-inserted-comment') ||
        el.getAttribute('data-rev-status') === 'removed'
    )
}

function hasNewRedditRemovedDescendant(el: Element): boolean {
    return isNewRedditCommentRemoved(el) || repliesOf_newReddit(el).some(hasNewRedditRemovedDescendant)
}

function applyFilterToNewRedditComment(el: HTMLElement, filter: ThreadFilter) {
    if (filter !== 'all' && !hasNewRedditRemovedDescendant(el)) {
        el.style.display = 'none'
        el.setAttribute('data-rev-filter-hidden', '1')
        return
    }

    if (el.hasAttribute('data-rev-filter-hidden')) {
        el.style.display = ''
        el.removeAttribute('data-rev-filter-hidden')
    }

    repliesOf_newReddit(el).forEach(c => applyFilterToNewRedditComment(c as HTMLElement, filter))
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

// Unless the user turned it off, and pageEl is still showing by then
function autoFilterRemoved(isNewReddit: boolean, pageEl: HTMLElement) {
    try {
        chrome.storage.sync.get(['options'], sync => {
            const auto = (sync?.options || {}).auto_filter_removed_threads !== false
            if (auto && pageEl.isConnected) applyThreadFilter('removed', isNewReddit)
        })
    } catch {
        applyThreadFilter('removed', isNewReddit)
    }
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
        const reads = new ScanReads(limiter, undefined, pageReads)
        const tried = new Set<string>()
        let unchecked = 0
        try {
            for (let level = 0; level < MAX_BRIDGE_DEPTH && !reads.stopped; level++) {
                const needed = this.pendingParents().filter(({ name }) => !tried.has(name))
                if (needed.length === 0) break
                needed.forEach(({ name }) => tried.add(name))
                btn.textContent = `Placing… (${this.orphans.size} left)`
                const lookup = await lookupCommentsByIds(needed, reads)
                unchecked += lookup.unchecked
                if (lookup.looked.size === 0 || !btn.isConnected) break // ancestors unavailable (deleted/invalid)
                for (const c of lookup.looked.values()) {
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
        } finally {
            this.placing = false
            endScan(limiter)
        }
        if (this.placed.size > placedBefore) refreshThreadFilter(this.isNewReddit)
        if (this.orphans.size === 0) return // orphan area auto-removed when empty
        const left = unchecked + reads.unread
        if (!left && !reads.failure) reads.retryGivenUp()
        note.textContent = limiter.isCancelled()
            ? ''
            : reads.failure
              ? scanFailure(reads.failure, COULD_NOT_READ)
              : left
                ? `${left} left to read. Click again to continue.`
                : reads.gaveUp
                  ? `${reads.gaveUp} couldn't be read. Click again to try them.`
                  : ''
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
        placeBtn.className = 'rev-place-unattached-btn'
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
    openComment(nativeEl)
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
    openComment(parentComment)
    const replies = ownPart(parentComment, '#comment-children') || parentComment
    let wrapper = replies.querySelector(':scope > .rev-rec-children') as HTMLElement | null
    if (!wrapper) {
        wrapper = document.createElement('div')
        wrapper.className = 'rev-rec-children'
        replies.appendChild(wrapper)
    }
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
        firstOnPage: { t1: firstOnPage('t1'), t3: firstOnPage('t3') },
    }
}

const firstOnPage = (kind: string) =>
    document
        .querySelector(`#siteTable > .thing[data-fullname^="${kind}_"]:not(.rev-inserted-comment)`)
        ?.getAttribute('data-fullname') || undefined

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
    isViewer(username).then(own => {
        if (own && !btn.disabled) btn.textContent = 'Scan for removed posts'
    })

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

    // The filter bar goes with the last results, so the page goes back to all of it
    if (resultsEl.childElementCount > 0) applyFilter('all')

    btn.disabled = true
    btn.textContent = 'Scanning...'
    progressEl.style.display = ''
    resultsEl.style.display = 'none'
    resultsEl.innerHTML = ''

    if (profileScanFinished) pageReads.clear()
    const limiter = startScan(container)
    // Only the scanned account's own session sees its removed content as live,
    // so the jump badge next to links is shown only to that account. The stored
    // name may be out of date, and the scan can find out better.
    let isOwnProfile = await isViewer(username)
    let lastStatus = ''
    const results = await scanUserProfile(
        username,
        (progress: RestoreProgress) => {
            progressEl.textContent = progress.message
            lastStatus = progress.status
            isOwnProfile ||= !!progress.own
        },
        { ...getProfileURLParams(), ownProfile: isOwnProfile },
        limiter,
        pageReads,
    )

    endScan(limiter)
    profileScanFinished = lastStatus === 'found' || lastStatus === 'not_found' || lastStatus === 'noted'
    btn.disabled = false
    btn.textContent = 'Rescan'

    // The scan's last message stands: "No removed items found." when it read
    // the profile, or why it couldn't. Left the page: nothing here is for what's
    // showing now.
    if (results.length === 0 || !container.isConnected) {
        return
    }

    // Unless it stopped short, which the results alone wouldn't show
    if (lastStatus === 'found') progressEl.style.display = 'none'
    resultsEl.style.display = ''

    // Reddit shows an author their own removed content as if nothing happened,
    // so on their own profile the reddit links below look normal to them. Say
    // so once, at the top, rather than next to every link.
    if (isOwnProfile) {
        const note = document.createElement('div')
        note.className = 'rev-scan-note'
        note.appendChild(createNoteMark(false))
        const noteText = document.createElement('span')
        noteText.textContent =
            'Reddit shows you your own removed content as if it were still up, so these links will ' +
            'look normal while you are logged in. To see what everyone else sees, open a link in a ' +
            'private/incognito window or while logged in as another account.'
        note.appendChild(noteText)
        resultsEl.appendChild(note)
    }

    const isNewReddit = detectIsNewReddit()
    const matched = highlightVisibleRemovedComments(results, isNewReddit)
    const inserted = insertMissingComments(results, matched, isNewReddit, isOwnProfile)

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
            resultsEl.appendChild(createScanResultItem(item, isOwnProfile))
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
}

function getVisibleItemPositions(isNewReddit: boolean): VisibleItem[] {
    const items: VisibleItem[] = []

    if (!isNewReddit) {
        const things = document.querySelectorAll('#siteTable > .thing[data-fullname]')
        for (const el of Array.from(things)) {
            const timeEl = el.querySelector('time[datetime]')
            const datetime = timeEl?.getAttribute('datetime')
            const created_utc = datetime ? Math.floor(new Date(datetime).getTime() / 1000) : 0
            items.push({ element: el as HTMLElement, created_utc })
        }
    } else {
        // New reddit profile: articles containing shreddit-post elements
        const articles = document.querySelectorAll('article[data-post-id]')
        for (const el of Array.from(articles)) {
            const shredditPost = el.querySelector('shreddit-post')
            const ts = shredditPost?.getAttribute('created-timestamp')
            const created_utc = ts ? Math.floor(new Date(ts).getTime() / 1000) : 0
            items.push({ element: el as HTMLElement, created_utc })
        }
    }

    return items
}

function insertMissingComments(
    results: ScanResult[],
    alreadyMatched: Set<string>,
    isNewReddit: boolean,
    showOwnViewMark = false,
): Set<string> {
    const inserted = new Set<string>()
    const missing = results.filter(r => !alreadyMatched.has(r.id))
    if (missing.length === 0) return inserted

    const visibleItems = getVisibleItemPositions(isNewReddit)
    if (visibleItems.length === 0) return inserted

    const currentSort = new URLSearchParams(window.location.search).get('sort') || 'new'

    for (const item of missing) {
        const position = findInsertPosition(item, visibleItems, currentSort)
        if (position) {
            const el = createInlineItem(item, isNewReddit, showOwnViewMark)
            position.element.insertAdjacentElement(position.where, el)
            inserted.add(item.id)
        }
    }

    return inserted
}

// Feeds carry no score, so on a page sorted by score an item goes right after
// the one before it in its feed, which has the same order and may be one
// inserted just now. On a page that may mix posts and comments, dates decide.
function findInsertPosition(
    item: ScanResult,
    visibleItems: VisibleItem[],
    sort: string,
): { element: HTMLElement; where: 'beforebegin' | 'afterend' } | null {
    if (sort === 'top' || sort === 'controversial') {
        const before =
            item.after && document.querySelector(`[data-fullname="${item.after}"], [data-post-id="${item.after}"]`)
        if (before) return { element: before as HTMLElement, where: 'afterend' }
        if (!item.after) return { element: visibleItems[0].element, where: 'beforebegin' }
    } else {
        const newer = visibleItems.find(visible => item.created_utc > visible.created_utc)
        if (newer) return { element: newer.element, where: 'beforebegin' }
    }

    return {
        element: visibleItems[visibleItems.length - 1].element,
        where: 'afterend',
    }
}

function createInlineItem(item: ScanResult, isNewReddit: boolean, showOwnViewMark = false): HTMLElement {
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

    // Link to the item in its thread on reddit. The scan row already shows the
    // body from the author's own view, and reveddit.com can only show
    // "[removed]" for these, so a reveddit link added nothing.
    const link = document.createElement('a')
    link.className = 'rev-scan-item-link'
    link.href = `https://www.reddit.com${item.permalink}${item.type === 'post' ? '' : '?context=3'}`
    link.target = '_blank'
    if (showOwnViewMark) link.title = OWN_VIEW_HINT
    link.textContent = 'View on reddit'
    const linkRow = document.createElement('div')
    linkRow.className = 'rev-scan-item-linkrow'
    linkRow.appendChild(link)
    if (showOwnViewMark) {
        linkRow.appendChild(createNoteMark(true))
    }

    el.appendChild(meta)
    if (item.title) el.appendChild(title)
    el.appendChild(body)
    el.appendChild(linkRow)
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

// The account the background last detected as logged in (set on every
// successful login detection). Storage only, no request.
const getLastLoggedInUser = (): Promise<string> =>
    new Promise(resolve => {
        try {
            chrome.storage.local.get(['last_logged_in_user'], r => resolve(String(r?.last_logged_in_user || '')))
        } catch {
            resolve('')
        }
    })

const isViewer = async (username: string): Promise<boolean> =>
    (await getLastLoggedInUser()).toLowerCase() === username.toLowerCase()

const OWN_VIEW_HINT = 'Shows your own view. Open in a private window, or as another account, to see it as others do.'

// Footnote-style marker: a small red "!" badge. The same badge heads the note
// above the results; next to a link it is a jump that scrolls to that note and
// flashes it, so the two are visibly tied.
function createNoteMark(jump: boolean, noteSelector = '.rev-scan-note'): HTMLElement {
    const mark = document.createElement(jump ? 'a' : 'span')
    mark.className = 'rev-note-mark' + (jump ? ' rev-note-mark-jump' : '')
    mark.textContent = '!'
    if (jump) {
        const a = mark as HTMLAnchorElement
        a.href = '#'
        a.title = OWN_VIEW_HINT
        a.addEventListener('click', e => {
            e.preventDefault()
            // Resolve relative to this panel when there is one (scan results);
            // otherwise the page-level note (own-profile highlights).
            const note = (mark.closest('.rev-profile-scan-results')?.querySelector(noteSelector) ||
                document.querySelector(noteSelector)) as HTMLElement | null
            if (!note) return
            note.scrollIntoView({ block: 'center' })
            note.classList.remove('rev-scan-note-flash')
            void note.offsetWidth // restart the animation on repeat clicks
            note.classList.add('rev-scan-note-flash')
        })
    } else {
        mark.setAttribute('aria-hidden', 'true')
    }
    return mark
}

// showOwnViewMark: only the scanned account's own session sees removed content
// as if it were live, so the jump badge, like the note above the results it
// leads to, is only shown when the viewer is that account.
function createScanResultItem(item: ScanResult, showOwnViewMark: boolean): HTMLElement {
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
    if (showOwnViewMark) {
        links.appendChild(createNoteMark(true))
    }
    // No reveddit.com link: the site can only show "[removed]" for these now
    // that reddit blocks its data access; the recovered text is already here.
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

// These observers last the whole document, across reddit's pages
let watchingComments = false

export function initRestoreOnThread(isNewReddit: boolean) {
    // The page this script started on may be older than the script: a tab from
    // before an install. Only the document's time covers that.
    noteCountSeen(isNewReddit, arrivals > 1 ? Date.now() : performance.timeOrigin)
    shouldShowThreadScanButtons().then(show => {
        if (!show) return
        injectScanAllButton(isNewReddit)
        if (watchingComments) return
        watchingComments = true
        if (!isNewReddit) {
            const selector = '.thing.comment'
            for (const el of Array.from(document.querySelectorAll(selector))) {
                injectRestoreButton_oldReddit(el as HTMLElement)
            }
            observe(document, selector, el => injectRestoreButton_oldReddit(el as HTMLElement))
        } else {
            const tombstones = 'shreddit-comment[author="[deleted]"]'
            document.querySelectorAll(tombstones).forEach(el => injectRestoreButton_newReddit(el as HTMLElement))
            observe(document, tombstones, el => injectRestoreButton_newReddit(el as HTMLElement))

            const rows = 'shreddit-comment-action-row'
            document.querySelectorAll(rows).forEach(injectScanButton_newReddit)
            observe(document, rows, injectScanButton_newReddit)
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

export function loadOwnRemovedSets(cb: (removed: Set<string>, locked: Set<string>) => void, username?: string) {
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
    onRemoved?: (el: HTMLElement) => void,
) {
    if (el.hasAttribute('data-rev-status')) return
    const id = getId(el)
    if (!id) return
    const status = removed.has(id) ? 'removed' : locked.has(id) ? 'locked' : ''
    el.setAttribute('data-rev-status', status)
    if (!status) return
    const target = getHighlightTarget ? getHighlightTarget(el) : el
    if (status === 'removed') {
        target.classList.add('rev-removed-highlight')
        onRemoved?.(el)
    } else {
        target.classList.add('rev-locked-highlight')
    }
}

// Own profile: a removed item looks perfectly normal to its author, so each
// highlighted item gets the "!" jump badge that leads to the note under the
// filter bar. Old reddit: a new entry in the item's button row, right after
// "permalink"/"comments". New reddit: the credit bar (the "r/sub · 2 mo. ago"
// line) when it is in the light DOM, otherwise a badge riding the red border.
function addOwnViewMark(el: HTMLElement, isNewReddit: boolean) {
    if (el.querySelector('.rev-own-mark')) return
    const mark = createNoteMark(true, '.rev-own-note')
    mark.classList.add('rev-own-mark')
    if (!isNewReddit) {
        const buttons = el.querySelector(':scope > .entry ul.buttons') || el.querySelector('ul.buttons')
        const first = buttons?.querySelector('li')
        if (buttons && first) {
            const li = document.createElement('li')
            li.className = 'rev-own-mark-li'
            li.appendChild(mark)
            first.insertAdjacentElement('afterend', li)
            return
        }
    } else {
        const creditBar = el.querySelector('[id^="feed-post-credit-bar"]')
        if (creditBar) {
            mark.classList.add('rev-own-mark-inline')
            creditBar.appendChild(mark)
            return
        }
    }
    // Fallback for either layout: sit on the red border that marks the item.
    const wrap = document.createElement('span')
    wrap.className = 'rev-own-mark-overlay'
    wrap.appendChild(mark)
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative'
    el.appendChild(wrap)
}

// One page's watch, with the records as they stand when it starts, since a
// document can last a whole visit to reddit. The next page's arrival stops it
// before the records are read again, so old ones can't flag that page's items.
let ownItemsObserver: MutationObserver | undefined
export function stopWatchingOwnItems() {
    ownItemsObserver?.disconnect()
}
function watchOwnItems(selector: string, flag: (el: HTMLElement) => void) {
    stopWatchingOwnItems()
    document.querySelectorAll(selector).forEach(el => flag(el as HTMLElement))
    ownItemsObserver = observe(document, selector, el => flag(el as HTMLElement))
}

export function initOwnThreadStatus(isNewReddit: boolean) {
    loadOwnRemovedSets((removed, locked) => {
        const selector = isNewReddit ? commentSelector() : '.thing.comment[data-fullname]'
        const getId = (el: HTMLElement) => (isNewReddit ? commentIdOf(el) : el.getAttribute('data-fullname') || '')
        // Highlight the comment, not what wraps its nested replies
        const getTarget = (el: HTMLElement) =>
            (isNewReddit
                ? ownPart(el, '[slot="comment"]')
                : (el.querySelector(':scope > .entry') as HTMLElement | null)) || el
        watchOwnItems(selector, el => flagOwnStatus(el, removed, locked, getId, getTarget))
    })
}

export function initOwnProfileStatus(username: string, isNewReddit: boolean) {
    loadOwnRemovedSets((removed, locked) => {
        const selector = isNewReddit
            ? 'shreddit-post[id^="t3_"], shreddit-profile-comment[comment-id]'
            : '#siteTable .thing[data-fullname]'
        const getId = (el: HTMLElement) =>
            el.getAttribute('data-fullname') || el.getAttribute('comment-id') || el.getAttribute('id') || ''

        // The bar holds the choice: reddit's back and forward buttons put it back with the page
        const applyFilter = (el: HTMLElement) => {
            const filter = document.querySelector('.rev-own-filter-bar .rev-filter-active')?.getAttribute('data-filter')
            const status = el.getAttribute('data-rev-status') || ''
            el.style.display = !filter || filter === 'all' || filter === status ? '' : 'none'
        }
        watchOwnItems(selector, el => {
            flagOwnStatus(el, removed, locked, getId, undefined, item => addOwnViewMark(item, isNewReddit))
            applyFilter(el)
        })
        injectOwnFilterBar(isNewReddit, removed.size > 0, locked.size > 0, () => {
            document.querySelectorAll(selector).forEach(el => applyFilter(el as HTMLElement))
        })
    }, username)
}

function injectOwnFilterBar(isNewReddit: boolean, hasRemoved: boolean, hasLocked: boolean, onFilter: () => void) {
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
        b.setAttribute('data-filter', f)
        b.addEventListener('click', () => {
            bar.querySelectorAll('.rev-filter-btn').forEach(x => x.classList.remove('rev-filter-active'))
            b.classList.add('rev-filter-active')
            onFilter()
        })
        return b
    }

    bar.appendChild(mk('all', 'all', true))
    if (hasRemoved) bar.appendChild(mk('removed', 'removed', false))
    if (hasLocked) bar.appendChild(mk('locked', 'locked', false))

    // The own-view note: this bar only exists on the viewer's own profile, and
    // reddit shows an author their removed content as if it were live.
    let note: HTMLElement | null = null
    if (hasRemoved) {
        note = document.createElement('div')
        note.className = 'rev-scan-note rev-own-note'
        note.appendChild(createNoteMark(false))
        const text = document.createElement('span')
        text.textContent =
            'Items marked removed look normal to you: reddit shows you your own removed content as if it ' +
            'were still up. To see what everyone else sees, open one in a private/incognito window or ' +
            'while logged in as another account.'
        note.appendChild(text)
    }

    if (isNewReddit) {
        const feed = document.querySelector('shreddit-feed')
        feed?.parentElement?.insertBefore(bar, feed)
        if (note) feed?.parentElement?.insertBefore(note, feed)
    } else {
        const siteTable = document.querySelector('#siteTable')
        siteTable?.parentElement?.insertBefore(bar, siteTable)
        if (note) siteTable?.parentElement?.insertBefore(note, siteTable)
    }
}
