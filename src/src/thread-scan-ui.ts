import { getFullIDsFromPath } from './common'
import { ofThisRun, markThisRun, orphaned } from './run-token'
import { getMarkupConfig } from './markup-config'
import {
    restoreComment,
    scanThreadForRemovedComments,
    recoveredOnPage,
    type RestoreResult,
    type RecoveredComment,
} from './restore'
import { commentFullnameFromPermalink, commentIdOf } from './comment-tree'
import { type RestoreProgress } from './scan-reads'
import {
    addUnderComment,
    findOldRedditCommentEl,
    newRedditCommentEl,
    ownPart,
    removedText_newReddit,
} from './comment-dom'
import { activeScan, endScan, pageReads, readsGoWith, scanStopped, showProgress, startScan } from './scan-session'
import { autoFilterRemoved, injectThreadFilter, refreshThreadFilter } from './thread-filter'
import { RecoveredCommentInserter, inserterForPage } from './recovered-inserter'

// --- State tracking ---

const injectedComments = new Set<string>()

// --- Thread Restore: Old Reddit ---

export function injectRestoreButton_oldReddit(commentEl: HTMLElement) {
    // Removed tombstones lack data-fullname; recover the id from data-permalink
    // so the per-comment "scan" button appears on removed comments too.
    const id =
        commentEl.getAttribute('data-fullname') ||
        commentFullnameFromPermalink(commentEl.getAttribute('data-permalink'))
    if (!id || injectedComments.has(id)) return

    const buttons = commentEl.querySelector(':scope > .entry > ul.buttons')
    if (!buttons || orphaned()) return

    injectedComments.add(id)
    // The last run's, since this one only comes here once per comment
    buttons.querySelector('.rev-scan-comment-btn')?.closest('li')?.remove()

    const li = document.createElement('li')
    const btn = document.createElement('a')
    btn.href = '#'
    btn.className = 'rev-scan-comment-btn rev-comment-action'
    btn.classList.toggle('rev-scan-disabled', !!activeScan)
    btn.textContent = 'scan-rev'
    btn.title = SCAN_TITLE
    if (nothingMissing()) markExhausted(btn)
    btn.addEventListener('click', e => {
        e.preventDefault()
        e.stopPropagation()
        if (btn.classList.contains('rev-scan-exhausted')) return
        handleRestore(id, commentEl, false, btn)
    })
    li.appendChild(btn)
    buttons.appendChild(li)
}

// Comment observers last the whole document, and a post on a profile has no
// thread of the kind a scan reads
const onSubredditThread = () => !!getFullIDsFromPath(window.location.pathname)[3]

export function injectRestoreButton_newReddit(comment: HTMLElement) {
    const commentId = commentIdOf(comment)
    const textBlock = removedText_newReddit(comment)?.closest('div')
    if (!commentId || !textBlock || !onSubredditThread() || orphaned()) return
    const placed = textBlock.parentElement?.querySelector('.rev-restore-btn')
    if (ofThisRun(placed)) return
    placed?.closest('.rev-restore-wrap')?.remove()

    const wrap = document.createElement('div')
    wrap.className = 'rev-restore-wrap'

    const btn = document.createElement('a')
    markThisRun(btn)
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

// New reddit's has an icon beside its label, which CSS hides where a row is short of room
const setScanLabel = (btn: Element, text: string) => {
    ;(btn.querySelector('span') || btn).textContent = text
}
const resetScanLabel = (btn: Element) => setScanLabel(btn, btn.querySelector('span') ? 'Scan-Rev' : 'scan-rev')

const SCAN_TITLE = 'Search for removed comments in this thread'
const NOTHING_LEFT_TITLE = 'No more removed comments to find'
const markExhausted = (btn: Element) => {
    resetScanLabel(btn)
    btn.classList.add('rev-scan-exhausted')
    ;(btn as HTMLElement).title = NOTHING_LEFT_TITLE
}
const retireScanAll = (btn: HTMLButtonElement) => {
    btn.classList.add('rev-scan-exhausted')
    btn.disabled = true
    btn.title = NOTHING_LEFT_TITLE
}
// A thread scan that left nothing missing leaves a row reddit stamps later nothing to
// find. After any other finish a row stays plain, as that scan may never have covered
// it. The scan button keeps this, so it comes and goes with its page.
const NOTHING_MISSING = 'data-rev-nothing-missing'
// The button comes before the comments, so finding it doesn't walk them all
const nothingMissing = () => !!document.querySelector('.rev-scan-all-btn')?.hasAttribute(NOTHING_MISSING)
// "Continue scan" goes when another click has nothing to go on with
function endContinueScan() {
    const btn = document.querySelector('.rev-scan-all-btn')
    if (btn?.textContent !== 'Continue scan') return
    const onPage = recoveredOnPage()
    btn.textContent = onPage > 0 ? `${onPage} comment(s) recovered` : SCAN_ALL_TEXT
    const note = document.querySelector('.rev-scan-all-progress')
    if (note) note.textContent = ''
}
// Another click reads nothing more, or may not after a failure
const promisesNothing = (status: string) => status === 'noted' || status === 'error'
// With no number on it, for a scan button with no more to say about what's left
const resetScanBtn = (btn: Element) => {
    resetScanLabel(btn)
    ;(btn as HTMLElement).title = SCAN_TITLE
}

const showScanLeft = (btn: Element, left: number) => {
    const base = (btn.textContent || '').replace(/\s*\(\d+\)\s*$/, '')
    setScanLabel(btn, `${base} (${left})`)
    ;(btn as HTMLElement).title = `${left} more to check — click to continue`
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
export function injectScanButton_newReddit(row: Element) {
    const comment = row.closest('shreddit-comment') as HTMLElement | null
    const thingid = commentIdOf(comment)
    if (!comment || !thingid || !onSubredditThread() || orphaned()) return
    const placed = row.querySelector(':scope > .rev-scan-comment-btn')
    if (ofThisRun(placed) || removedText_newReddit(comment)) return
    placed?.remove()

    const btn = document.createElement('button')
    markThisRun(btn)
    btn.slot = getMarkupConfig().commentButtonSlots[0]
    btn.className = 'rev-btn rev-scan-comment-btn rev-newreddit-action'
    btn.classList.toggle('rev-scan-disabled', !!activeScan)
    btn.title = SCAN_TITLE
    btn.innerHTML = newRedditScanBtnHTML()
    if (nothingMissing()) markExhausted(btn)
    btn.addEventListener('click', e => {
        e.preventDefault()
        e.stopPropagation()
        if (btn.classList.contains('rev-scan-exhausted')) return
        handleRestore(thingid, comment, true, btn)
    })
    row.appendChild(btn)
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
    // Dimmed stops the mouse, not the keyboard
    if (btn.classList.contains('rev-scan-disabled')) return
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

    const progressEl = document.createElement('span')
    progressEl.className = 'rev-restore-progress'
    const { clearProgress, progressText } = showProgress(host, limiter, progressEl)
    progressText.className = 'rev-restore-progress-text'
    host.appendChild(progressEl)

    // Reuse the inserter from the thread-scan so other-found comments (tombstones
    // AND removed leaves without tombstones) are placed/orphaned properly, and
    // orphans relocate when their parent turns up later.
    const inserter = inserterForPage(isNewReddit)

    const placedBefore = inserter.placedCount
    let result: RestoreResult = { found: false }
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
    } catch (err) {
        scanStopped(err, progressText)
    } finally {
        endScan(limiter)
    }

    clearProgress()

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
        if (injectThreadFilter(isNewReddit)) autoFilterRemoved(isNewReddit, container)
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
            const scanBtns = Array.from(document.querySelectorAll('.rev-scan-comment-btn:not(.rev-scan-exhausted)'))
            if (result.otherSorts) {
                // The search may have come from a restore link, which stays one
                if (btn.matches('.rev-scan-comment-btn')) markExhausted(btn)
                scanBtns.filter(b => b !== btn).forEach(resetScanBtn)
                if (result.threadScanDone) endContinueScan()
                return
            }
            scanBtns.forEach(markExhausted)
            endContinueScan()
            const scanAllBtn = document.querySelector('.rev-scan-all-btn') as HTMLButtonElement | null
            if (scanAllBtn && !scanAllBtn.classList.contains('rev-scan-exhausted')) retireScanAll(scanAllBtn)
        } else {
            // More remains; show the count and let a re-click continue. Update
            // ALL non-exhausted scan buttons so every comment shows the same
            // remaining count.
            const left = result.remaining ?? 0
            document
                .querySelectorAll('.rev-scan-comment-btn:not(.rev-scan-exhausted)')
                .forEach(b => showScanLeft(b, left))
        }
    }
    if (promisesNothing(lastStatus)) {
        document.querySelectorAll('.rev-scan-comment-btn:not(.rev-scan-exhausted)').forEach(resetScanBtn)
        if (result.threadScanDone) endContinueScan()
    }
    // cancelled / rate_limited / error: leave the button clickable so the user can retry.
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
const OTHER_AGES = 'Scan-Rev can still search comments of other ages'

export function injectScanAllButton(isNewReddit: boolean) {
    const host = document.querySelector(isNewReddit ? 'shreddit-comment-tree' : '.commentarea .menuarea')
    const placed = (isNewReddit ? document : host)?.querySelector('.rev-scan-all-btn')
    if (isNewReddit && placed && ofThisRun(placed)) {
        readsGoWith(placed)
        // Back can bring back what a scan placed before the page was left, with no bar
        if (recoveredOnPage() > 0) injectThreadFilter(isNewReddit)
    }
    if (!host || ofThisRun(placed) || orphaned()) return
    placed?.remove()

    const btn = document.createElement('button')
    markThisRun(btn)
    btn.className = 'rev-btn rev-btn-solid rev-scan-all-btn'
    btn.textContent = SCAN_ALL_TEXT
    if (!isNewReddit) btn.title = SCAN_TITLE
    btn.addEventListener('click', e => {
        e.preventDefault()
        handleScanAll(isNewReddit)
    })
    if (isNewReddit) {
        readsGoWith(btn)
        host.prepend(btn)
    } else {
        host.appendChild(btn)
    }
}

async function handleScanAll(isNewReddit: boolean) {
    const [postID, , , subreddit] = getFullIDsFromPath(window.location.pathname)
    if (!postID || !subreddit) return

    const btn = document.querySelector('.rev-scan-all-btn') as HTMLButtonElement
    if (!btn || btn.classList.contains('rev-scan-disabled')) return
    const labelBefore = btn.textContent
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
    const { clearProgress, progressText } = showProgress(progressEl, limiter)

    // Place each recovered comment the moment it's found: under its parent if
    // present, otherwise parked in the "unattached" area and relocated later if
    // an ancestor turns up in a subsequent search.
    const inserter = inserterForPage(isNewReddit)

    let finalStatus = ''
    let otherSorts = false
    let leftNothingMissing = false
    let recovered: RecoveredComment[] = []
    try {
        recovered = await scanThreadForRemovedComments(
            postID,
            subreddit,
            isNewReddit,
            pageReads,
            progress => {
                progressText.textContent = progress.message
                finalStatus = progress.status
                otherSorts ||= !!progress.otherSorts
                leftNothingMissing ||= !!progress.nothingMissing
            },
            rc => {
                if (btn.isConnected) placeRecovered(inserter, rc, isNewReddit)
            },
            limiter,
        )
    } catch (err) {
        scanStopped(err, progressText)
    }

    const onPage = recoveredOnPage()
    btn.textContent = onPage > 0 ? `${onPage} comment(s) recovered` : SCAN_ALL_TEXT
    if (finalStatus === 'partial') btn.textContent = 'Continue scan'
    // Back can bring this button back, and the count above was another page's
    if (!btn.isConnected) btn.textContent = labelBefore
    btn.disabled = false
    btn.classList.remove('rev-scan-all-loading')
    endScan(limiter)
    // Leave the final status message visible; just drop the spinner.
    clearProgress()

    // Left the page: what's on screen now isn't this scan's business
    if (!btn.isConnected) return

    // A scan that finished searched all visible authors, so everything is now
    // exhausted: disable all per-comment scan buttons + the thread button
    // itself. One that stopped (refused pages, rate limit, no comment tree, the
    // click's limit) leaves them for another try.
    const scanBtns = document.querySelectorAll('.rev-scan-comment-btn:not(.rev-scan-exhausted)')
    const finished = finalStatus === 'found' || finalStatus === 'not_found'
    if (finished) retireScanAll(btn)
    if (promisesNothing(finalStatus) || otherSorts) scanBtns.forEach(resetScanBtn)
    else if (finished) scanBtns.forEach(markExhausted)
    // A comment that needs another sort of feeds has its own search still to come
    if (otherSorts) {
        btn.title = OTHER_AGES
        progressText.textContent += ` ${OTHER_AGES}.`
    }
    if (leftNothingMissing) btn.setAttribute(NOTHING_MISSING, '1')

    // Show the filter bar if any were found, and auto-switch to the "removed" view
    // on the first find.
    if (recovered.length > 0) {
        if (injectThreadFilter(isNewReddit)) autoFilterRemoved(isNewReddit, btn)
        refreshThreadFilter(isNewReddit)
    }
}
