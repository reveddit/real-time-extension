import { getPrettyDate } from './common'
import { type ScanResult } from './restore'

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

export const isViewer = async (username: string): Promise<boolean> =>
    (await getLastLoggedInUser()).toLowerCase() === username.toLowerCase()

export const OWN_VIEW_HINT =
    'Shows your own view. Open in a private window, or as another account, to see it as others do.'

// Footnote-style marker: a small red "!" badge. The same badge heads the note
// above the results; next to a link it is a jump that scrolls to that note and
// flashes it, so the two are visibly tied.
export function createNoteMark(jump: boolean, noteSelector = '.rev-scan-note'): HTMLElement {
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
export function createScanResultItem(item: ScanResult, showOwnViewMark: boolean): HTMLElement {
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
