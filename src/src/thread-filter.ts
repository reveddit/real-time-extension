import { collapseComment, expandComment, ownPart, removedText_newReddit } from './comment-dom'

// --- Thread comment filter (all / removed) ---

type ThreadFilter = 'all' | 'removed'

// A placement may have gone under a comment the filter hid. The bar holds the
// choice: it comes and goes with its page, and a document can last a whole visit.
export function refreshThreadFilter(isNewReddit: boolean) {
    const active = document.querySelector('.rev-thread-filter-btn.rev-filter-active')
    if (active?.getAttribute('data-filter') === 'removed') applyThreadFilter('removed', isNewReddit)
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

export function injectThreadFilter(isNewReddit: boolean) {
    if (document.querySelector('.rev-thread-filter-bar')) return
    const bar = document.createElement('div')
    bar.className = 'rev-thread-filter-bar'

    const label = document.createElement('span')
    label.className = 'rev-own-filter-label'
    label.textContent = 'reveddit:'
    bar.appendChild(label)

    const mk = (text: string, f: ThreadFilter) => {
        const b = document.createElement('button')
        b.className = 'rev-btn rev-filter-btn rev-thread-filter-btn' + (f === 'all' ? ' rev-filter-active' : '')
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
export function autoFilterRemoved(isNewReddit: boolean, pageEl: HTMLElement) {
    try {
        chrome.storage.sync.get(['options'], sync => {
            const auto = (sync?.options || {}).auto_filter_removed_threads !== false
            if (auto && pageEl.isConnected) applyThreadFilter('removed', isNewReddit)
        })
    } catch {
        applyThreadFilter('removed', isNewReddit)
    }
}
