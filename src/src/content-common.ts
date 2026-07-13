import { subscribeId, unsubscribeId, getLocalStorageItems, saveLocalStorageItems } from './storage'
import { LocalStorageItem } from './common'
import { setCurrentStateForId } from './monitoring'

let UNSUBSCRIBE_TEXT = 'unsubscribe-rev'
let SUBSCRIBE_TEXT = 'subscribe-rev'

const ON_REVEDDIT = !!location.hostname.match(/reveddit\.com$/)
if (ON_REVEDDIT) {
    UNSUBSCRIBE_TEXT = 'unsubscribe'
    SUBSCRIBE_TEXT = 'subscribe'
}

// On reddit, tint the reveddit buttons light blue so they stand out from the
// native action buttons (same look as the "scan-rev" button). Not on reveddit,
// where they're part of the site's own button row.
const styleRevButton = (element: HTMLElement) => {
    if (!ON_REVEDDIT) element.classList.add('rev-comment-action')
}

export const setTextAndFunction_subscribe = (id: string, element: HTMLElement, commentBody?: string): HTMLElement => {
    element.textContent = SUBSCRIBE_TEXT
    styleRevButton(element)
    element.onclick = e => {
        e.preventDefault()
        e.stopPropagation()
        subscribeId_changeText(id, element, commentBody)
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
    element.textContent = SUBSCRIBE_TEXT
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

export const setTextAndFunction_unsubscribe = (id: string, element: HTMLElement, commentBody?: string): HTMLElement => {
    element.textContent = UNSUBSCRIBE_TEXT
    styleRevButton(element)
    element.onclick = e => {
        e.preventDefault()
        e.stopPropagation()
        unsubscribeId_changeText(id, element, commentBody)
    }
    return element
}

const subscribeId_changeText = (id: string, element: HTMLElement, commentBody = '') => {
    subscribeId(id, async () => {
        setTextAndFunction_unsubscribe(id, element, commentBody)
        await setCurrentStateForId(id, window.location.href)
        if (commentBody) {
            getLocalStorageItems('other', false).then((storedItems: any) => {
                const item = storedItems[id]
                if (item) {
                    const itemObj = new LocalStorageItem({ object: item })
                    itemObj.setText(commentBody)
                    storedItems[id] = itemObj
                    saveLocalStorageItems('other', false, storedItems)
                }
            })
        }
    })
}

const unsubscribeId_changeText = (id: string, element: HTMLElement, commentBody?: string) => {
    unsubscribeId(id, () => {
        setTextAndFunction_subscribe(id, element, commentBody)
    })
}
