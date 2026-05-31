import { getFullIDsFromPath, getPrettyDate, REMOVED_BY_MODERATOR_TEXT, detectIsNewReddit } from './common'
import { observe, findByText } from './dom-helpers'
import {
    restoreComment,
    scanUserProfile,
    scanThreadForRemovedComments,
    RateLimiter,
    type RestoreProgress,
    type RestoreResult,
    type ScanResult,
    type ProfileScanOptions,
} from './restore'

// --- State tracking ---

const injectedComments = new Set<string>()
let activeRestoreLimiter: RateLimiter | null = null
const authorCache = new Map<string, any[]>()
let currentFilter: 'all' | 'removed' | 'visible' = 'removed'

// --- Thread Restore: Old Reddit ---

function isRemovedComment_oldReddit(el: Element): boolean {
    if (el.classList.contains('deleted')) return true
    const body = el.querySelector(':scope > .entry .usertext-body .md')
    const text = (body?.textContent || '').trim()
    return text === '[removed]' || text === '[deleted]'
}

function injectRestoreButton_oldReddit(commentEl: HTMLElement) {
    const id = commentEl.getAttribute('data-fullname')
    if (!id || injectedComments.has(id)) return

    const buttons = commentEl.querySelector(':scope > .entry > ul.buttons')
    if (!buttons) return

    injectedComments.add(id)

    const isRemoved = isRemovedComment_oldReddit(commentEl)

    const li = document.createElement('li')
    const btn = document.createElement('a')
    btn.href = '#'
    btn.className = isRemoved ? 'rev-scan-comment-btn rev-scan-comment-removed' : 'rev-scan-comment-btn'
    btn.textContent = 'scan'
    btn.title = 'Scan for removed comments'
    btn.addEventListener('click', e => {
        e.preventDefault()
        e.stopPropagation()
        handleRestore(id, commentEl, false)
    })
    li.appendChild(btn)
    buttons.appendChild(li)
}

// --- Thread Restore: New Reddit ---

function getCommentId_newReddit(el: Element): string | null {
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

// --- Restore Handler ---

async function handleRestore(commentId: string, container: HTMLElement, isNewReddit: boolean) {
    const [postID, , , subreddit] = getFullIDsFromPath(window.location.pathname)
    if (!postID || !subreddit) return

    activeRestoreLimiter?.cancel()

    const btn = (container.querySelector('.rev-restore-btn') ||
        container.querySelector('.rev-scan-comment-btn')) as HTMLElement
    if (btn) btn.style.display = 'none'

    let progressEl = container.querySelector('.rev-restore-progress') as HTMLElement
    if (!progressEl) {
        progressEl = document.createElement('span')
        progressEl.className = 'rev-restore-progress'
        container.appendChild(progressEl)
    }

    let cancelBtn = container.querySelector('.rev-restore-cancel') as HTMLAnchorElement
    if (!cancelBtn) {
        cancelBtn = document.createElement('a')
        cancelBtn.href = '#'
        cancelBtn.className = 'rev-restore-cancel'
        cancelBtn.textContent = 'cancel'
        container.appendChild(cancelBtn)
    }
    cancelBtn.style.display = ''

    const limiter = new RateLimiter()
    activeRestoreLimiter = limiter
    cancelBtn.onclick = e => {
        e.preventDefault()
        limiter.cancel()
    }

    const result = await restoreComment(
        commentId,
        postID,
        subreddit,
        isNewReddit,
        (progress: RestoreProgress) => {
            progressEl.textContent = progress.message
        },
        authorCache,
    )

    cancelBtn.style.display = 'none'
    activeRestoreLimiter = null

    if (result.found) {
        progressEl.textContent = ''
        displayRestoredComment(commentId, container, result, isNewReddit)
    } else {
        if (btn) btn.style.display = ''
    }
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
        const commentEl = document.querySelector(`.thing.comment[data-fullname="${commentId}"]`)
        if (commentEl) {
            const bodyEl = commentEl.querySelector(':scope > .entry .usertext-body .md')
            if (bodyEl && result.body_html) {
                bodyEl.innerHTML = result.body_html
                bodyEl.classList.add('rev-restored')
            } else if (bodyEl) {
                bodyEl.textContent = result.body
                bodyEl.classList.add('rev-restored')
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
        }
    } else {
        const restoredEl = document.createElement('div')
        restoredEl.className = 'rev-restored'
        if (result.body_html) {
            restoredEl.innerHTML = result.body_html
        } else {
            restoredEl.textContent = result.body
        }
        container.appendChild(restoredEl)
    }

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
        const target =
            document.querySelector('shreddit-sort-dropdown')?.parentElement ||
            document.querySelector('[slot="commentCount"]')?.parentElement
        if (!target || target.querySelector('.rev-scan-all-btn')) return

        const btn = document.createElement('button')
        btn.className = 'rev-scan-all-btn rev-profile-scan-btn'
        btn.textContent = 'Restore all removed'
        btn.addEventListener('click', e => {
            e.preventDefault()
            handleScanAll(true)
        })
        target.appendChild(btn)
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

    let progressEl = document.querySelector('.rev-scan-all-progress') as HTMLElement
    if (!progressEl) {
        progressEl = document.createElement('span')
        progressEl.className = 'rev-scan-all-progress'
        btn.after(progressEl)
    }

    const results = await scanThreadForRemovedComments(postID, subreddit, isNewReddit, authorCache, progress => {
        progressEl.textContent = progress.message
    })

    for (const { commentId, result } of results) {
        if (!result.found) continue
        const container = isNewReddit
            ? document.querySelector(`[id="${commentId}"], [thingid="${commentId}"]`)
            : document.querySelector(`.thing.comment[data-fullname="${commentId}"]`)
        if (container) {
            displayRestoredComment(commentId, container as HTMLElement, result, isNewReddit)
        }
    }

    const found = results.filter(r => r.result.found).length
    btn.textContent = found > 0 ? `${found} comment(s) restored` : origText || 'Scan for removed comments'
    btn.disabled = false
    btn.classList.remove('rev-scan-all-loading')
    progressEl.textContent = ''
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
    body.className = 'rev-scan-item-body rev-restored'
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
    el.className = 'rev-scan-item'

    const meta = document.createElement('div')
    meta.className = 'rev-scan-item-meta'
    const sub = item.subreddit ? `r/${item.subreddit}` : ''
    const age = item.created_utc ? getPrettyDate(item.created_utc) : ''
    meta.innerHTML = `${sub} &middot; ${age} <span class="rev-scan-badge-removed">removed</span>`

    const body = document.createElement('div')
    body.className = 'rev-scan-item-body'
    if (item.type === 'post' && item.title) {
        body.textContent = item.title
    } else if (item.body) {
        body.textContent = item.body.length > 300 ? item.body.substring(0, 300) + '...' : item.body
    }

    const link = document.createElement('a')
    link.className = 'rev-scan-item-link'
    link.href = `https://www.reveddit.com${item.permalink}`
    link.target = '_blank'
    link.textContent = 'View on Reveddit'

    el.appendChild(meta)
    el.appendChild(body)
    el.appendChild(link)
    return el
}

// --- Public entry points ---

export function initRestoreOnThread(isNewReddit: boolean) {
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
    }

    injectScanAllButton(isNewReddit)
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
