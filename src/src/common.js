import {REMOVED, DELETED, APPROVED, LOCKED, UNLOCKED, EDITED,
        getSubscribedUsers_withUnseenIDs } from './storage.js'

export const ALARM_NAME = 'notifyme'


const maxRedditContentLength = 300

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

const regex_pc = /^\/(r|user)\/([^/]+)\/comments\/([^/]+)\/[^/]*(?:\/([^/?&#]+))?/
const regex_user = /^\/user\/([^/?&#]+)\/?/

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
    if (isComment(item.name)) {
        return isRemovedComment(item)
    } else {
        return isRemovedPost(item)
    }
}

export const isComment = (name) => {
    return name.substr(0,2) === 't1'
}
export const isRemovedComment = (item) => {
    return ((item.body.replace(/\\/g, '') === '[removed]' ||
             item.body.replace(/\\/g, '') === '[deleted]') &&
            item.author.replace(/\\/g, '') === '[deleted]')
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
    constructor(created_utc, unseen) {
        this.c = created_utc
        this.u = unseen
    }
    getCreatedUTC() { return this.c }
    getUnseen() { return this.u }
}

export class ChangeForStorage {
    constructor({ id = null, observed_utc = null, change_type = null, object = null }) {
        if (object) {
            this.i = object.i
            this.o = object.o
            this.g = object.g
        } else {
            this.i = id
            this.o = observed_utc
            this.g = change_type
        }
    }
    getID() { return this.i }
    getObservedUTC() { return this.o }
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
}

export class LocalStorageItem {
    constructor({ item = null, observed_utc = null, object = null }) {
        if (object) {
            this.t = object.t
            this.o = object.o
            this.c = object.c
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
        }
    }
    setText(text) {this.t = reformatRedditText(text)}
    getText() { return this.t }
    getObservedUTC() { return this.o }
    getCreatedUTC() { return this.c }
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
    if (location.protocol.match(/^http/)) {
        chrome.runtime.sendMessage({
            action: 'create-notification',
            options: {notificationId, title, message}
        })
    } else {
        chrome.notifications.create(notificationId,
            {type: 'basic', iconUrl: '/icons/128.png',
             title, message})
    }
}

export const updateBadgeUnseenCount = () => {
    if (location.protocol.match(/^http/)) {
        chrome.runtime.sendMessage({
            action: 'update-badge'
        })
    } else {
        getSubscribedUsers_withUnseenIDs(usersUnseenIDs => {
            let total = 0
            Object.values(usersUnseenIDs).forEach(ids => {
                total += ids.length
            })
            let text = total.toString()
            if (total == 0) text = ''
            chrome.browserAction.setBadgeBackgroundColor({color: "red"})
            chrome.browserAction.setBadgeText({text: text})
        })
    }
}
