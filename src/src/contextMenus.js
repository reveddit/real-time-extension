import {subscribeUser, subscribeId} from './storage.js'
import {getFullIDsFromURL} from './common.js'
import {setCurrentStateForId} from './monitoring.js'

const regex_comment = /^\/r\/[^/]+\/comments\/[^/]+\/[^/]*\/([^/]+)/
const regex_post = /^\/r\/[^/]+\/comments\/([^/]+)\/[^/]*\/?/
const regex_user = /^\/user\/([^/]+)\/?/

export const setupContextualMenu = () => {
    const contextMenu_id = 'reveddit-subscribe'
    chrome.contextMenus.removeAll(() => {
        chrome.contextMenus.create({
            id: contextMenu_id,
            title: 'reveddit subscribe',
            contexts: ['link'],
            targetUrlPatterns: ['https://*.reddit.com/r/*/comments/*', 'https://www.reveddit.com/r/*/comments/*',
                                'https://*.reddit.com/user/*', 'https://www.reveddit.com/user/*']
        })
    })
    chrome.contextMenus.onClicked.addListener(function(info, tab) {
        if (info.menuItemId == contextMenu_id) {
            const url = info.linkUrl
            const text = 'link'
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
                alert(`Unable to subscribe to this ${text}, it is not a comment, post or user.\n\n${url}`)
            }
        }
    });
}
