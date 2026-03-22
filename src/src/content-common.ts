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

export const setTextAndFunction_subscribe = (id: string, element: HTMLElement, commentBody?: string) => {
    return $(element).text(SUBSCRIBE_TEXT).off('click').click((eventObj) => subscribeId_changeText(id, eventObj.target, commentBody))
}

export const setTextAndFunction_unsubscribe = (id: string, element: HTMLElement, commentBody?: string) => {
    return $(element).text(UNSUBSCRIBE_TEXT).off('click').click((eventObj) => unsubscribeId_changeText(id, eventObj.target, commentBody))
}

const subscribeId_changeText = (id: string, element: HTMLElement, commentBody = '') => {
    subscribeId(id, async () => {
        setTextAndFunction_unsubscribe(id, element, commentBody)
        await setCurrentStateForId(id, window.location.href)
        if (commentBody) {
            getLocalStorageItems('other', false)
            .then((storedItems: any) => {
                const item = storedItems[id]
                // content from private subs won't be saved b/c
                // no item is created for that (reddit returns no data for
                // non-logged-in authenticated apps)
                if (item) {
                    const itemObj = new LocalStorageItem({object: item})
                    itemObj.setText(commentBody)
                    storedItems[id] = itemObj
                    saveLocalStorageItems('other', false, storedItems)
                }
            })
        }
    })
    return false
}

const unsubscribeId_changeText = (id: string, element: HTMLElement, commentBody?: string) => {
    unsubscribeId(id, () => {
        setTextAndFunction_subscribe(id, element, commentBody)
    })
    return false
}
