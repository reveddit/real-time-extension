import { getObjectNamesForThing } from './storage'
import { observe } from './dom-helpers'
import { commentIdOf, commentSelector } from './comment-tree'
import { ownPart } from './comment-dom'
import { createNoteMark } from './note-mark'

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
        b.className = 'rev-btn rev-filter-btn' + (active ? ' rev-filter-active' : '')
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
