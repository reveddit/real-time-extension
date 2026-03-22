import {REMOVED, DELETED, APPROVED, LOCKED, UNLOCKED, EDITED,
        getSubscribedUsers_withUnseenIDs } from './storage'
import browser from 'webextension-polyfill'

export interface RedditItem {
    name: string
    author: string
    body?: string
    title?: string
    created_utc: number
    is_robot_indexable?: boolean
    removal_reason?: string | null
    locked?: boolean
    link_id?: string
    subreddit?: string
    quarantine?: boolean
    permalink?: string
    [key: string]: any
}

export const ALARM_NAME = 'notifyme'
const maxRedditContentLength = 300
const ACTION_API = __BUILT_FOR__ === 'chrome' ? 'action' : 'browserAction'

export const setWarningBadge = (errorStatus?: string) => {
    try {
        (chrome as any)[ACTION_API].setBadgeText({text: '!'})
        ;(chrome as any)[ACTION_API].setBadgeBackgroundColor({color: '#ffcc00'})
        if (errorStatus) {
            chrome.storage.local.set({error_status: errorStatus})
        }
    } catch (e) {}
}

// https://stackoverflow.com/questions/25933556/chrome-extension-open-new-tab-when-browser-opened-in-background-mac/25933964#25933964
export const createTab = (url: string) => {
    chrome.tabs.create({url:url}, (tab) => {
        if(! tab) {
            // probably no window available
            chrome.windows.create({url:url}, (win) => {
                // better to focus after window creation callback
                if (win?.id != null) chrome.windows.update(win.id, {focused: true})
            })
        } else {
            // better to focus after tab creation callback
            chrome.windows.update(tab.windowId, {focused: true})
        }
    })
}

export const getFullIDsFromURL = (url: string): [string | undefined, string | undefined, string | undefined, string | undefined] => {
    const path = url.replace(/https:\/\/[^/]*re(ve)?ddit.com/, '')
    return getFullIDsFromPath(path)
}

const regex_pc = /^\/(v|r|user)\/([^/]+)\/comments\/([^/]+)\/[^/]*(?:\/([^/?&#]+))?/
const regex_user = /^\/(?:user|y|u)\/([^/?&#]+)\/?/

export const getFullIDsFromPath = (path: string): [string | undefined, string | undefined, string | undefined, string | undefined] => {
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

export const reformatRedditText = (body: string): string => {
    return body.replace(/&amp;/g, '&').replace(/&gt;/g, '>').replace(/&lt;/g, '<')
        .replace(/\s+/g, ' ').substr(0, maxRedditContentLength)
}

export const isRemovedItem = (item: RedditItem): boolean => {
    if (item.removal_reason) {
        return true
    }
    if (isComment(item.name)) {
        return isRemovedComment(item)
    } else {
        return isRemovedPost(item)
    }
}

export const isComment = (name: string): boolean => {
    return name.substr(0,2) === 't1'
}
// Checking that author starts with '[' for userpage-driven content is sufficient to prove comment is removed.
// This way, the check is indifferent to language, in case Accept-Language is not set to 'en'
// Also check body because comments whose author account is deleted may have valid unremoved body
export const isRemovedComment = (item: RedditItem): boolean => {
    return (item.author.replace(/\\/g, '')[0] === '['
        &&    (item.body || '').replace(/\\/g, '')[0] === '[')
}
export const isUserDeletedComment = (item: RedditItem): boolean => {
    return ((item.body || '').replace(/\\/g, '') === '[deleted]' &&
            item.author.replace(/\\/g, '') === '[deleted]')
}
export const isUserDeletedPost = (item: RedditItem): boolean => {
    return (item.is_robot_indexable === false) && item.author.replace(/\\/g, '') === '[deleted]'
}
export const isUserDeletedItem = (item: RedditItem): boolean => {
    if (isComment(item.name)) {
        return isUserDeletedComment(item)
    } else {
        return isUserDeletedPost(item)
    }
}
export const isRemovedPost = (item: RedditItem): boolean => {
    return item.is_robot_indexable === false
}

export const trimDict_by_numberValuedAttribute = (dict: Record<string, any>, maxNumItems: number, numberValuedAttribute: string): Record<string, any> => {
    const array = sortDict_by_numberValuedAttribute(dict, numberValuedAttribute)

    const shortenedArray = array.slice(0, maxNumItems)
    const newDict: Record<string, any> = {}
    shortenedArray.forEach(item => {
        newDict[item[0]] = item[1]
    })
    return newDict
}

export const sortDict_by_numberValuedAttribute = (dict: Record<string, any>, numberValuedAttribute: string): [string, any][] => {
    let array: [string, any][] = Object.keys(dict).map(key => {
        return [key, dict[key]] as [string, any]
    })
    array.sort((a, b) => {
        return b[1][numberValuedAttribute] - a[1][numberValuedAttribute]
    })
    return array
}

export class ItemForStorage {
    c: number
    u: boolean
    p?: string
    constructor(created_utc: number, unseen: boolean, post_id?: string, object: any = null) {
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
    i: string | null
    o: number | null
    g: number | null
    n: number | null
    user?: string
    constructor({ id = null, observed_utc = null, change_type = null, seen_count = null, object = null }: { id?: string | null, observed_utc?: number | null, change_type?: number | null, seen_count?: number | null, object?: any }) {
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
    t: string
    o: number | null
    c: number
    n: number
    r: number
    p?: string
    constructor({ item = null, observed_utc = null, object = null }: { item?: RedditItem | null, observed_utc?: number | null, object?: any }) {
        if (object) {
            this.t = object.t
            this.o = object.o
            this.c = object.c
            this.n = object.n || 0 // seen_count, which increments when the same status is observed
            this.r = object.r || 0 // removal_count, consecutive times observed as removed
            if (typeof object.p !== 'undefined') this.p = object.p
        } else {
            let text = ''
            if (item && isComment(item.name)) {
                text = reformatRedditText(item.body || '')
            } else if (item) {
                text = item.title || ''
            }
            this.t = text
            this.o = observed_utc
            this.c = item ? item.created_utc : 0
            this.n = 0
            this.r = 0
            // store compact post id for comments when available
            if (item && isComment(item.name) && item.link_id) {
                this.p = item.link_id
            }
        }
    }
    setText(text: string) {this.t = reformatRedditText(text)}
    getText() { return this.t }
    getObservedUTC() { return this.o }
    getCreatedUTC() { return this.c }
    resetSeenCount() { this.n = 0 }
    getSeenCount() { return this.n }
    getPostID() { return this.p }
    incrementRemovalCount() {
        if (typeof this.r === 'undefined') this.r = 0
        this.r += 1
        return this.r
    }
    resetRemovalCount() { this.r = 0 }
    getRemovalCount() { return this.r || 0 }
    incrementSeenCount() {
        if (typeof this.n === 'undefined') {
            this.n = 0
        }
        this.n += 1
        return this.n
    }
}

export function setAlarm(periodInMinutes: number) {
    chrome.alarms.clear(ALARM_NAME)
    chrome.alarms.create(ALARM_NAME, {delayInMinutes: 1, periodInMinutes: periodInMinutes})
}

export function alphaLowerSort (a: string, b: string): number {
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


export function showError(message: string, selector: string) {
    const div = document.createElement('div')
    div.className = 'rr-error'
    div.textContent = message
    const parent = document.querySelector(selector)
    if (parent) {
        parent.appendChild(div)
        setTimeout(() => {
            div.style.transition = 'opacity 400ms'
            div.style.opacity = '0'
            setTimeout(() => div.remove(), 400)
        }, 2400)
    }
}

//noinspection JSUnusedLocalSymbols
export function pprint(obj: any) {
    console.log(JSON.stringify(obj, null, '\t'))
}


export const getPrettyTimeLength = (seconds: number): string | undefined => {
    const thresholds = [[60, 'second', 'seconds'], [60, 'minute', 'minutes'], [24, 'hour', 'hours'], [7, 'day', 'days'],
    [365/12/7, 'week', 'weeks'], [12, 'month', 'months'], [10, 'year', 'years'],
    [10, 'decade', 'decades'], [10, 'century', 'centuries'], [10, 'millenium', 'millenia']]
    if (seconds < 60) return seconds + ' seconds'
    let time = seconds
    for (var i=0; i<thresholds.length; i++) {
        let divisor = thresholds[i][0] as number
        let text: string = thresholds[i][1] as string
        let textPlural = thresholds[i][2] as string
        if (time < divisor) {
            let extra = (time - Math.floor(time))
            let prevUnitTime = Math.round(extra*(thresholds[i-1][0] as number))
            if ((thresholds[i-1][0] as number) === prevUnitTime) {
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
        time = time / (divisor as number)
    }
}

export const getPrettyDate = (createdUTC: number): string => {
    const seconds = Math.floor((new Date).getTime()/1000)-createdUTC
    return getPrettyTimeLength(seconds) + ' ago'
}

export const createNotification = ({notificationId, title, message}: {notificationId: string, title: string, message: string}) => {
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
                const swSelf = self as any
                const swRegistration = swSelf && swSelf.registration ? swSelf.registration : null
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
            chrome.notifications.create(uniqueId, options as chrome.notifications.NotificationOptions, () => {
                if ((chrome.runtime as any)?.lastError) {
                    console.log('chrome.notifications.create error:', (chrome.runtime as any).lastError.message)
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
        .catch(() => {})
    } else {
        getSubscribedUsers_withUnseenIDs(usersUnseenIDs => {
            let total = 0
            Object.values(usersUnseenIDs).forEach(ids => {
                total += ids.length
            })
            let text = total.toString()
            if (total == 0) text = '';
            (chrome as any)[ACTION_API].setBadgeBackgroundColor({color: "red"})
            ;(chrome as any)[ACTION_API].setBadgeText({text: text})
        })
    }
}
