import {subscribeId, unsubscribeId, getLocalStorageItems, saveLocalStorageItems} from './storage'
import {LocalStorageItem} from './common'
import {setCurrentStateForId} from './monitoring'
import browser from 'webextension-polyfill'

let UNSUBSCRIBE_TEXT = 'unsubscribe-rev'
let SUBSCRIBE_TEXT = 'subscribe-rev'

if (location.hostname.match(/reveddit\.com$/)) {
    UNSUBSCRIBE_TEXT = 'unsubscribe'
    SUBSCRIBE_TEXT = 'subscribe'
}

export const setTextAndFunction_subscribe = (id: string, element: HTMLElement, commentBody?: string): HTMLElement => {
    element.textContent = SUBSCRIBE_TEXT
    element.onclick = (e) => {
        e.preventDefault()
        subscribeId_changeText(id, element, commentBody)
    }
    return element
}

export const setTextAndFunction_unsubscribe = (id: string, element: HTMLElement, commentBody?: string): HTMLElement => {
    element.textContent = UNSUBSCRIBE_TEXT
    element.onclick = (e) => {
        e.preventDefault()
        unsubscribeId_changeText(id, element, commentBody)
    }
    return element
}

const subscribeId_changeText = (id: string, element: HTMLElement, commentBody = '') => {
    subscribeId(id, async () => {
        setTextAndFunction_unsubscribe(id, element, commentBody)
        await setCurrentStateForId(id, window.location.href)
        if (commentBody) {
            getLocalStorageItems('other', false)
            .then((storedItems: any) => {
                const item = storedItems[id]
                if (item) {
                    const itemObj = new LocalStorageItem({object: item})
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
