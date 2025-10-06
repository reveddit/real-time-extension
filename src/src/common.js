import {REMOVED, DELETED, APPROVED, LOCKED, UNLOCKED, EDITED,
        getSubscribedUsers_withUnseenIDs } from './storage.js'
import browser from 'webextension-polyfill'

export const ALARM_NAME = 'notifyme'
const maxRedditContentLength = 300
const ACTION_API = __BUILT_FOR__ === 'chrome' ? 'action' : 'browserAction'

export const setWarningBadge = (errorStatus) => {
    try {
        chrome[ACTION_API].setBadgeText({text: '!'})
        chrome[ACTION_API].setBadgeBackgroundColor({color: '#ffcc00'})
        if (errorStatus) {
            chrome.storage.local.set({error_status: errorStatus})
        }
    } catch (e) {}
}

// https://stackoverflow.com/questions/25933556/chrome-extension-open-new-tab-when-browser-opened-in-background-mac/25933964#25933964
export const createTab = (url) => {
    chrome.tabs.create({url:url}, (tab) => {
        if(! tab) {
            // probably no window available
            chrome.windows.create({url:url}, (win) => {
                // better to focus after window creation callback
                chrome.windows.update(win.id, {focused: true})
            })
        } else {
            // better to focus after tab creation callback
            chrome.windows.update(tab.windowId, {focused: true})
        }
    })
}

export const getFullIDsFromURL = (url) => {
    const path = url.replace(/https:\/\/[^/]*re(ve)?ddit.com/, '')
    return getFullIDsFromPath(path)
}

const regex_pc = /^\/(v|r|user)\/([^/]+)\/comments\/([^/]+)\/[^/]*(?:\/([^/?&#]+))?/
const regex_user = /^\/(?:user|y|u)\/([^/?&#]+)\/?/

export const getFullIDsFromPath = (path) => {
    let postID = undefined, commentID = undefined, user = undefined, subreddit = undefined
    const matches_pc = path.match(regex_pc)
    const matches_user = path.match(regex_user)
    if (matches_pc) {
        const type = matches_pc[1]
        if (type === 'user') {
            user = matches_pc[2]
        } else {
            subreddit = matches_pc[2]
        }
        if (matches_pc[3]) postID = 't3_'+matches_pc[3]
        if (matches_pc[4]) commentID = 't1_'+matches_pc[4]
    } else if (matches_user) {
        user = matches_user[1]
    }
    return [postID, commentID, user, subreddit]
}

export const reformatRedditText = (body) => {
    return body.replace(/&amp;/g, '&').replace(/&gt;/g, '>').replace(/&lt;/g, '<')
        .replace(/\s+/g, ' ').substr(0, maxRedditContentLength)
}

export const isRemovedItem = (item) => {
    if (item.removal_reason) {
        return true
    }
    if (isComment(item.name)) {
        return isRemovedComment(item)
    } else {
        return isRemovedPost(item)
    }
}

export const isComment = (name) => {
    return name.substr(0,2) === 't1'
}
// Checking that author starts with '[' for userpage-driven content is sufficient to prove comment is removed.
// This way, the check is indifferent to language, in case Accept-Language is not set to 'en'
// Also check body because comments whose author account is deleted may have valid unremoved body
export const isRemovedComment = (item) => {
    return (item.author.replace(/\\/g, '')[0] === '['
        &&    item.body.replace(/\\/g, '')[0] === '[')
}
export const isUserDeletedComment = (item) => {
    return (item.body.replace(/\\/g, '') === '[deleted]' &&
            item.author.replace(/\\/g, '') === '[deleted]')
}
export const isUserDeletedPost = (item) => {
    return (! item.is_robot_indexable) && item.author.replace(/\\/g, '') === '[deleted]'
}
export const isUserDeletedItem = (item) => {
    if (isComment(item.name)) {
        return isUserDeletedComment(item)
    } else {
        return isUserDeletedPost(item)
    }
}
export const isRemovedPost = (item) => {
    return ! item.is_robot_indexable
}

export const trimDict_by_numberValuedAttribute = (dict, maxNumItems, numberValuedAttribute) => {
    const array = sortDict_by_numberValuedAttribute(dict, numberValuedAttribute)

    const shortenedArray = array.slice(0, maxNumItems)
    const newDict = {}
    shortenedArray.forEach(item => {
        newDict[item[0]] = item[1]
    })
    return newDict
}

export const sortDict_by_numberValuedAttribute = (dict, numberValuedAttribute) => {
    let array = Object.keys(dict).map(key => {
        return [key, dict[key]]
    })
    array.sort((a, b) => {
        return b[1][numberValuedAttribute] - a[1][numberValuedAttribute]
    })
    return array
}

export class ItemForStorage {
    constructor(created_utc, unseen, post_id = undefined, object = null) {
        if (object) {
            this.c = object.c
            this.u = object.u
            if (typeof object.p !== 'undefined') this.p = object.p
        } else {
            this.c = created_utc
            this.u = unseen
            if (typeof post_id !== 'undefined') this.p = post_id
        }
    }
    getCreatedUTC() { return this.c }
    getUnseen() { return this.u }
    getPostID() { return this.p }
}

export class ChangeForStorage {
    constructor({ id = null, observed_utc = null, change_type = null, seen_count = null, object = null }) {
        if (object) {
            this.i = object.i
            this.o = object.o
            this.g = object.g
            this.n = object.n
        } else {
            this.i = id
            this.o = observed_utc
            this.g = change_type
            this.n = seen_count
        }
    }
    getID() { return this.i }
    getObservedUTC() { return this.o }
    getChangeTypeInternal() { return this.g }
    getChangeType() {
        switch(this.g) {
            case REMOVED: return 'mod removed'
            case DELETED: return 'user deleted'
            case APPROVED: return 'approved'
            case LOCKED: return 'locked'
            case UNLOCKED: return 'unlocked'
            case EDITED: return 'edited'
        }
    }
    getSeenCount() { return this.n }
}

export class LocalStorageItem {
    constructor({ item = null, observed_utc = null, object = null }) {
        if (object) {
            this.t = object.t
            this.o = object.o
            this.c = object.c
            this.n = object.n || 0 // seen_count, which increments when the same status is observed
            if (typeof object.p !== 'undefined') this.p = object.p
        } else {
            let text = ''
            if (isComment(item.name)) {
                text = reformatRedditText(item.body)
            } else {
                text = item.title
            }
            this.t = text
            this.o = observed_utc
            this.c = item.created_utc
            this.n = 0
            // store compact post id for comments when available
            if (isComment(item.name) && item.link_id) {
                this.p = item.link_id
            }
        }
    }
    setText(text) {this.t = reformatRedditText(text)}
    getText() { return this.t }
    getObservedUTC() { return this.o }
    getCreatedUTC() { return this.c }
    resetSeenCount() { this.n = 0 }
    getSeenCount() { return this.n }
    getPostID() { return this.p }
    incrementSeenCount() {
        if (typeof this.n === 'undefined') {
            this.n = 0
        }
        this.n += 1
        return this.n
    }
}

export function setAlarm(periodInMinutes) {
    chrome.alarms.clear(ALARM_NAME)
    chrome.alarms.create(ALARM_NAME, {delayInMinutes: 1, periodInMinutes: periodInMinutes})
}

export function alphaLowerSort (a, b) {
    var textA = a.toLowerCase()
    var textB = b.toLowerCase()

    if (textA < textB) return -1
    if (textA > textB) return 1
    return 0
}

export function goToOptions () {
    if (chrome.runtime.openOptionsPage) {
        chrome.runtime.openOptionsPage()
        window.close() //closes the popup which persists in FF
    } else {
        window.open(chrome.runtime.getURL('/src/options.html'))
    }
}


export function showError(message, selector) {
    $('<div class="rr-error">'+message+'</div>').appendTo(selector).delay(2400).fadeTo(400, 0, function() {$(this).remove()})
}

//noinspection JSUnusedLocalSymbols
export function pprint(obj) {
    console.log(JSON.stringify(obj, null, '\t'))
}


export const getPrettyTimeLength = (seconds) => {
    const thresholds = [[60, 'second', 'seconds'], [60, 'minute', 'minutes'], [24, 'hour', 'hours'], [7, 'day', 'days'],
    [365/12/7, 'week', 'weeks'], [12, 'month', 'months'], [10, 'year', 'years'],
    [10, 'decade', 'decades'], [10, 'century', 'centuries'], [10, 'millenium', 'millenia']]
    if (seconds < 60) return seconds + ' seconds'
    let time = seconds
    for (var i=0; i<thresholds.length; i++) {
        let divisor = thresholds[i][0]
        let text = thresholds[i][1]
        let textPlural = thresholds[i][2]
        if (time < divisor) {
            let extra = (time - Math.floor(time))
            let prevUnitTime = Math.round(extra*thresholds[i-1][0])
            if (thresholds[i-1][0] === prevUnitTime) {
                time += 1
                prevUnitTime = 0
            }
            if (Math.floor(time) > 1 || Math.floor(time) == 0) {
                text = textPlural
            }
            if (i > 1 && prevUnitTime > 0) {
                let remainText = thresholds[i-1][1]
                if (prevUnitTime > 1) {
                    remainText = thresholds[i-1][2]
                }
                text += ', ' + String(prevUnitTime) + ' ' + remainText
            }
            return String(Math.floor(time)) + ' ' + text
        }
        time = time / divisor
    }
}

export const getPrettyDate = (createdUTC) => {
    const seconds = Math.floor((new Date).getTime()/1000)-createdUTC
    return getPrettyTimeLength(seconds) + ' ago'
}

export const createNotification = ({notificationId, title, message}) => {
    console.log(`createNotification called: ${notificationId} - ${title} - ${message}`)
    if (location.protocol.match(/^http/)) {
        console.log('Sending notification via message passing')
        chrome.runtime.sendMessage({
            action: 'create-notification',
            options: {notificationId, title, message}
        })
    } else {
        console.log('Creating notification directly with chrome.notifications.create')
        // Use callback form to avoid Promise issues across browsers
        // Ensure a unique ID so repeated notifications are not silently merged by the OS
        const baseId = String(notificationId)
        const uniqueId = baseId.includes('|') ? baseId : `${baseId}|${Date.now()}`
        const options = {
            type: 'basic',
            iconUrl: chrome.runtime.getURL('icons/128.png'),
            title: title,
            message: message
        }
        const fallbackShowNotification = () => {
            try {
                const swRegistration = self && self.registration ? self.registration : null
                if (swRegistration && swRegistration.showNotification) {
                    swRegistration.showNotification(title, {
                        body: message,
                        icon: chrome.runtime.getURL('icons/128.png'),
                        data: baseId
                    })
                }
            } catch (e) {
                console.log('Fallback showNotification failed:', e)
            }
        }
        try {
            chrome.notifications.create(uniqueId, options, () => {
                if (chrome.runtime && chrome.runtime.lastError) {
                    console.log('chrome.notifications.create error:', chrome.runtime.lastError.message)
                    fallbackShowNotification()
                }
            })
        } catch (error) {
            console.log('Error creating notification:', error)
            fallbackShowNotification()
        }
    }
}

export const updateBadgeUnseenCount = () => {
    if (location.protocol.match(/^http/)) {
        chrome.runtime.sendMessage({
            action: 'update-badge'
        })
        .catch?.(() => {})
    } else {
        getSubscribedUsers_withUnseenIDs(usersUnseenIDs => {
            let total = 0
            Object.values(usersUnseenIDs).forEach(ids => {
                total += ids.length
            })
            let text = total.toString()
            if (total == 0) text = ''
            chrome[ACTION_API].setBadgeBackgroundColor({color: "red"})
            chrome[ACTION_API].setBadgeText({text: text})
        })
    }
}
