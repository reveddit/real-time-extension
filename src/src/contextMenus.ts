import { subscribeUser, subscribeId } from './storage'
import { createNotification, getFullIDsFromURL } from './common'
import { setCurrentStateForId } from './monitoring'

export const setupContextualMenu = () => {
    if (!chrome.contextMenus) return
    const contextMenu_id = 'reveddit-subscribe'
    chrome.contextMenus.removeAll(() => {
        chrome.contextMenus.create({
            id: contextMenu_id,
            title: 'reveddit subscribe',
            contexts: ['link'],
            targetUrlPatterns: [
                'https://*.reddit.com/r/*/comments/*',
                'https://www.reveddit.com/r/*/comments/*',
                'https://*.reddit.com/user/*',
                'https://www.reveddit.com/user/*',
            ],
        })
    })
    chrome.contextMenus.onClicked.addListener(function (info) {
        if (info.menuItemId == contextMenu_id) {
            const url = info.linkUrl!
            const [postID, commentID, user] = getFullIDsFromURL(url)
            if (commentID) {
                subscribeId(commentID)
                setCurrentStateForId(commentID, url)
            } else if (postID) {
                subscribeId(postID)
                setCurrentStateForId(postID, url)
            } else if (user) {
                subscribeUser(user)
            } else {
                // The background can't alert: a service worker has no alert, and Firefox's page shows none
                createNotification({
                    notificationId: 'subscribe_failed',
                    title: 'reveddit subscribe',
                    message: `Unable to subscribe to this link, it is not a comment, post or user.\n\n${url}`,
                })
            }
        }
    })
}
