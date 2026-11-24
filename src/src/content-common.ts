import { subscribeId, unsubscribeId, keepPageText } from './storage'
import { setCurrentStateForId } from './monitoring'
import { icon } from './dom-helpers'

let UNSUBSCRIBE_TEXT = 'unsubscribe-rev'
let SUBSCRIBE_TEXT = 'subscribe-rev'

// localhost is the dev builds' reveddit site (production builds never match it)
const ON_REVEDDIT = !!location.hostname.match(/reveddit\.com$/) || location.hostname === 'localhost'
if (ON_REVEDDIT) {
    UNSUBSCRIBE_TEXT = 'unsubscribe'
    SUBSCRIBE_TEXT = 'subscribe'
}

// On old reddit, tint the reveddit buttons light blue so they stand out from the
// native action buttons, while new reddit's
// match the row around them (.rev-newreddit-action). Not on reveddit, where
// they're part of the site's own button row.
const styleRevButton = (element: HTMLElement) => {
    if (!ON_REVEDDIT) element.classList.add('rev-comment-action')
}

// New reddit's rows have no room for words, so its button is a bell, filled when
// the item is followed, and says what it does in its tooltip
export const BELL_BUTTON = 'rev-subscribe-bell'
const bell = (followed: boolean) =>
    icon(
        'M10 2a6 6 0 00-6 6v3.6L2.3 14a1 1 0 00.8 1.6h13.8a1 1 0 00.8-1.6L16 11.6V8a6 6 0 00-6-6z' +
            (followed ? '' : 'M6 8a4 4 0 118 0v4.3l1 1.3H5l1-1.3V8z') +
            'M8 17a2 2 0 004 0H8z',
        true,
    )
const setLabel = (element: HTMLElement, text: string, followed = false) => {
    if (!element.classList.contains(BELL_BUTTON)) {
        element.textContent = text
        return
    }
    element.replaceChildren(bell(followed))
    element.title = followed ? 'Stop following this' : 'Get told if this is removed'
    element.setAttribute('aria-label', text)
}

// New reddit redraws a button in place when the logged-in user changes
const clearDisabled = (element: HTMLElement) => {
    element.removeAttribute('aria-disabled')
    element.style.opacity = ''
    element.style.cursor = ''
}

// postId: the item's post when the page knows it and its URL may not (a
// profile page lists comments from many threads)
export const setTextAndFunction_subscribe = (
    id: string,
    element: HTMLElement,
    commentBody?: string,
    postId?: string,
): HTMLElement => {
    setLabel(element, SUBSCRIBE_TEXT)
    styleRevButton(element)
    clearDisabled(element)
    element.onclick = e => {
        e.preventDefault()
        e.stopPropagation()
        subscribeId_changeText(id, element, commentBody, postId)
    }
    return element
}

// Shown in place of subscribe on the logged-in user's own comments. Their content
// is already monitored automatically (profile path), and the per-item "other"
// lookup cannot see their own removals anyway (Reddit's self-view hides them) —
// so the button is disabled with an explanation instead of silently working wrong.
// aria-disabled + swallowed click rather than the native disabled attribute, so the
// title tooltip shows reliably cross-browser (and works on old reddit's <a>).
export const setTextAndFunction_disabledOwn = (element: HTMLElement): HTMLElement => {
    setLabel(element, SUBSCRIBE_TEXT)
    styleRevButton(element)
    element.title =
        'Tracking isn’t needed for your own comments — this extension already monitors your content and will notify you of removals.'
    element.setAttribute('aria-disabled', 'true')
    element.style.opacity = '0.5'
    element.style.cursor = 'not-allowed'
    element.onclick = e => {
        e.preventDefault()
        e.stopPropagation()
    }
    return element
}

export const setTextAndFunction_unsubscribe = (
    id: string,
    element: HTMLElement,
    commentBody?: string,
    postId?: string,
    own = false,
): HTMLElement => {
    setLabel(element, UNSUBSCRIBE_TEXT, true)
    styleRevButton(element)
    clearDisabled(element)
    element.onclick = e => {
        e.preventDefault()
        e.stopPropagation()
        unsubscribeId_changeText(id, element, commentBody, postId, own)
    }
    return element
}

const subscribeId_changeText = (id: string, element: HTMLElement, commentBody = '', postId?: string) => {
    subscribeId(id, async () => {
        setTextAndFunction_unsubscribe(id, element, commentBody, postId)
        await setCurrentStateForId(id, window.location.href, postId)
        if (commentBody) keepPageText(id, commentBody).catch(() => {})
    })
}

const unsubscribeId_changeText = (
    id: string,
    element: HTMLElement,
    commentBody: string | undefined,
    postId: string | undefined,
    own: boolean,
) => {
    unsubscribeId(id, () => {
        if (own) setTextAndFunction_disabledOwn(element)
        else setTextAndFunction_subscribe(id, element, commentBody, postId)
    })
}
