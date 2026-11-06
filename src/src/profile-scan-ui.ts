import { getPrettyDate, detectIsNewReddit } from './common'
import { ofThisRun, markThisRun, orphaned } from './run-token'
import { scanUserProfile, type ScanResult, type ProfileScanOptions } from './profile-scan'
import { type RestoreProgress } from './scan-reads'
import { endScan, pageReads, readsGoWith, scanStopped, showProgress, startScan } from './scan-session'
import { OWN_VIEW_HINT, createNoteMark, createScanResultItem, isViewer } from './note-mark'

// Profile scans that saw everything, so a rescan starts over
const finishedProfiles = new WeakSet<Element>()
let currentFilter: 'all' | 'removed' = 'removed'

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

export function injectProfileScanButton_oldReddit(username: string) {
    if (!clearLastRunsProfileScan()) return

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

export function injectProfileScanButton_newReddit(username: string) {
    if (!window.location.pathname.match(/^\/(?:user|u)\/[^/]+/)) return
    if (!clearLastRunsProfileScan()) return

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

// Whether the page needs a scan button: not with this run's already there
function clearLastRunsProfileScan() {
    const placed = document.querySelector('.rev-profile-scan-container')
    if (placed && ofThisRun(placed)) readsGoWith(placed)
    if (ofThisRun(placed) || orphaned()) return false
    if (placed) {
        placed.remove()
        // Its filter buttons go with it, so what they hid comes back
        applyFilter('all')
    }
    return true
}

function createProfileScanContainer(username: string): HTMLElement {
    const container = document.createElement('div')
    markThisRun(container)
    container.className = 'rev-profile-scan-container'
    readsGoWith(container)

    const btn = document.createElement('button')
    btn.className = 'rev-btn rev-btn-solid rev-profile-scan-btn'
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

    if (finishedProfiles.has(container)) pageReads.clear()
    const limiter = startScan(container)
    progressEl.textContent = ''
    const { clearProgress, progressText } = showProgress(progressEl, limiter)
    // Only the scanned account's own session sees its removed content as live,
    // so the jump badge next to links is shown only to that account. The stored
    // name may be out of date, and the scan can find out better.
    let isOwnProfile = await isViewer(username)
    let lastStatus = ''
    let results: ScanResult[] = []
    try {
        results = await scanUserProfile(
            username,
            (progress: RestoreProgress) => {
                progressText.textContent = progress.message
                lastStatus = progress.status
                isOwnProfile ||= !!progress.own
            },
            { ...getProfileURLParams(), ownProfile: isOwnProfile },
            limiter,
            pageReads,
        )
    } catch (err) {
        scanStopped(err, progressText)
    }

    endScan(limiter)
    clearProgress()
    if (lastStatus === 'found' || lastStatus === 'not_found' || lastStatus === 'noted') finishedProfiles.add(container)
    else finishedProfiles.delete(container)
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
    // New reddit: articles with data-post-id, or shreddit-post with id attribute
    const [selector, idAttr] = isNewReddit
        ? ['article[data-post-id]', 'data-post-id']
        : ['.thing[data-fullname]', 'data-fullname']
    for (const el of Array.from(document.querySelectorAll(selector))) {
        const id = el.getAttribute(idAttr)
        const scanResult = id ? resultMap.get(id) : undefined
        if (!id || !scanResult) continue
        matched.add(id)
        // One inserted by an earlier click shows its text already
        if (el.classList.contains('rev-inserted-comment')) continue
        if (isNewReddit) highlightComment_newReddit(el as HTMLElement, scanResult)
        else highlightComment_oldReddit(el as HTMLElement, scanResult)
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
    // New reddit profile: articles containing shreddit-post elements
    const selector = isNewReddit
        ? 'article[data-post-id]:not(.rev-inserted-comment)'
        : '#siteTable > .thing[data-fullname]:not(.rev-inserted-comment)'
    return Array.from(document.querySelectorAll(selector), el => {
        const date = isNewReddit
            ? el.querySelector('shreddit-post')?.getAttribute('created-timestamp')
            : el.querySelector('time[datetime]')?.getAttribute('datetime')
        return { element: el as HTMLElement, created_utc: date ? Math.floor(new Date(date).getTime() / 1000) : 0 }
    })
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

    // Past the page's last row, and past what's gone there already
    let last = visibleItems[visibleItems.length - 1].element
    while (last.nextElementSibling?.classList.contains('rev-inserted-comment')) {
        last = last.nextElementSibling as HTMLElement
    }
    return { element: last, where: 'afterend' }
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
        btn.className = 'rev-btn rev-filter-btn'
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

function applyFilter(filter: 'all' | 'removed') {
    const isNewReddit = detectIsNewReddit()

    // Handle items in the main listing
    const selector = isNewReddit ? 'article[data-post-id]' : '#siteTable > .thing[data-fullname]'
    const items = document.querySelectorAll(selector)

    for (const el of Array.from(items)) {
        const htmlEl = el as HTMLElement
        const isHighlighted = el.classList.contains('rev-removed-highlight')

        htmlEl.style.display = filter === 'removed' && !isHighlighted ? 'none' : ''
    }

    // Handle inserted comments
    const insertedEls = document.querySelectorAll('.rev-inserted-comment')
    for (const el of Array.from(insertedEls)) {
        ;(el as HTMLElement).style.display = ''
    }
}
