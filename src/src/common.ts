// The newest 100 items of the signed-in user's own listing (user/me)
export const OWN_LISTING_QUERY = '?limit=100&sort=new&raw_json=1'

export interface RedditItem {
    name: string
    author: string
    body?: string
    title?: string
    created_utc: number
    is_robot_indexable?: boolean
    removal_reason?: string | null
    // set only in a moderator's view, see isRemovedInModView
    removed?: boolean
    spam?: boolean
    banned_by?: string | boolean | null
    locked?: boolean
    link_id?: string
    subreddit?: string
    quarantine?: boolean
    permalink?: string
    [key: string]: any
}

export const ALARM_NAME = 'notifyme'
// The background telling Reddit tabs what's followed now, or who's signed in
export const BELLS_CHANGED = 'bells-changed'
export const REMOVED_BY_MODERATOR_TEXT = 'comment removed by moderator'

// The survey the browser opens after an uninstall
export const FEEDBACK_FORM =
    'https://docs.google.com/forms/d/e/1FAIpQLSejWHJAf8thfMdTnnEc5xZPlsdxA_dGUkbmnDq8PABVMkvARg/viewform'
// Its question "What browser and platform do you use?"
const FEEDBACK_FORM_BROWSER = 'entry.701261599'
interface BrowserHints {
    brands?: { brand: string; version: string }[]
    platform?: string
    mobile?: boolean
}
// The browser's own name and version: Opera, Edge and Brave list theirs beside
// Chromium, Chrome lists Google Chrome, and the made-up entry that keeps sites
// from matching the list exactly spells "Not A Brand" some way
const browserName = (brands: BrowserHints['brands'] = []) => {
    const real = brands.filter(b => !/not.?a.?brand/i.test(b.brand))
    const named = real.find(b => b.brand !== 'Chromium') ?? real[0]
    return named ? `${named.brand} ${named.version}` : ''
}
// The survey with its browser question filled in with the browser and the
// extension's version, which the person sees and can change before sending.
// Not on Firefox, whose manifest says the extension collects nothing.
export const feedbackFormLink = (version: string, hints?: BrowserHints): string => {
    const name = __BUILT_FOR__ === 'firefox' ? '' : browserName(hints?.brands)
    if (!name) return FEEDBACK_FORM
    const answer = `${name} on ${hints?.platform || 'an unknown system'}${hints?.mobile ? ', mobile' : ''}, extension ${version}`
    return `${FEEDBACK_FORM}?usp=pp_url&${FEEDBACK_FORM_BROWSER}=${encodeURIComponent(answer)}`
}

export const REMOVED = 1
export const APPROVED = 2
export const LOCKED = 3
export const UNLOCKED = 4
const EDITED = 5
export const DELETED = 6
export const CHANGE_TYPE_TEXT: Record<number, string> = {
    [REMOVED]: 'mod removed',
    [DELETED]: 'user deleted',
    [APPROVED]: 'approved',
    [LOCKED]: 'locked',
    [UNLOCKED]: 'unlocked',
    [EDITED]: 'edited',
}

export function detectIsNewReddit(): boolean {
    // Available before JS renders — new reddit sets device attribute on <html>
    if (document.documentElement.hasAttribute('device')) return true
    // Custom elements present after rendering
    if (document.querySelector('shreddit-app') || document.querySelector('shreddit-feed')) return true
    // Old reddit markers
    if (document.getElementById('header') || document.getElementById('siteTable')) return false
    return false
}
const maxRedditContentLength = 10000
export const ACTION_API = __BUILT_FOR__ === 'chrome' ? 'action' : 'browserAction'

export const setWarningBadge = (errorStatus?: string) => {
    try {
        ;(chrome as any)[ACTION_API].setBadgeText({ text: '!' })
        ;(chrome as any)[ACTION_API].setBadgeBackgroundColor({ color: '#ffcc00' })
        if (errorStatus) {
            chrome.storage.local.set({ error_status: errorStatus })
        }
    } catch {
        /* ignored */
    }
}

// Firefox runs one background for every window and container, and its fetches
// carry the default container's cookies: a private window or a container tab
// would get another identity's logged-in view. (Chrome and Edge run incognito
// tabs in their own instance.)
export const isOtherIdentity = (tab?: chrome.tabs.Tab): boolean => {
    const cookieStoreId = (tab as any)?.cookieStoreId
    return (
        __BUILT_FOR__ === 'firefox' && Boolean(tab?.incognito || (cookieStoreId && cookieStoreId !== 'firefox-default'))
    )
}

// https://stackoverflow.com/questions/25933556/chrome-extension-open-new-tab-when-browser-opened-in-background-mac/25933964#25933964
export const createTab = (url: string) => {
    // chrome.windows is unavailable on Firefox Android (single-window browser);
    // just open a tab and let the browser foreground it.
    if (!chrome.windows) {
        chrome.tabs.create({ url, active: true })
        return
    }
    chrome.tabs.create({ url: url }, tab => {
        if (!tab) {
            // probably no window available
            chrome.windows.create({ url: url }, win => {
                // better to focus after window creation callback
                if (win?.id != null) chrome.windows.update(win.id, { focused: true })
            })
        } else {
            // better to focus after tab creation callback
            chrome.windows.update(tab.windowId, { focused: true })
        }
    })
}

export const getFullIDsFromURL = (
    url: string,
): [string | undefined, string | undefined, string | undefined, string | undefined] => {
    const path = url.replace(/https:\/\/[^/]*re(ve)?ddit.com/, '')
    return getFullIDsFromPath(path)
}

// The id can end the path. It stops at a query or a file ending, so a profile's
// comments tab (/user/x/comments/?sort=new, /user/x/comments/.rss) reads as no post.
const regex_pc = /^\/(v|r|user)\/([^/]+)\/comments\/([^/?&#.]+)(?:\/[^/]*(?:\/([^/?&#]+))?)?/
const regex_user = /^\/(?:user|y|u)\/([^/?&#]+)\/?/

// Updating opens the what's new page when the first 3 segments change (e.g.
// "0.0.5"), so patch bumps like 0.0.5.0 → 0.0.5.1 don't show the same page again.
const whatsNewGeneration = (version: string) => version.split('.').slice(0, 3).join('.')
export const showsWhatsNew = (previous: string | undefined, current: string) =>
    !!previous && whatsNewGeneration(previous) !== whatsNewGeneration(current)

export const getFullIDsFromPath = (
    path: string,
): [string | undefined, string | undefined, string | undefined, string | undefined] => {
    let postID = undefined,
        commentID = undefined,
        user = undefined,
        subreddit = undefined
    const matches_pc = path.match(regex_pc)
    const matches_user = path.match(regex_user)
    if (matches_pc) {
        const type = matches_pc[1]
        if (type === 'user') {
            user = matches_pc[2]
        } else {
            subreddit = matches_pc[2]
        }
        if (matches_pc[3]) postID = 't3_' + matches_pc[3]
        if (matches_pc[4]) commentID = 't1_' + matches_pc[4]
    } else if (matches_user) {
        user = matches_user[1]
    }
    return [postID, commentID, user, subreddit]
}

export const reformatRedditText = (body: string): string => {
    return body
        .replace(/&amp;/g, '&')
        .replace(/&gt;/g, '>')
        .replace(/&lt;/g, '<')
        .replace(/[^\S\n]+/g, ' ')
        .substr(0, maxRedditContentLength)
}

// Moderators see removed items in subreddits they moderate with the text
// intact and removed: true or banned_by (the remover) set; spam marks
// spam-filter removals (verified on r/pushshift 2026-10-17). Followed items
// are read from the user's own logged-in /api/info, so for a moderator these
// flags are the only sign of a removal there. Other views leave them unset.
export const isRemovedInModView = (item: RedditItem): boolean =>
    item.removed === true || item.spam === true || Boolean(item.banned_by)

export const isRemovedItem = (item: RedditItem): boolean => {
    if (item.removal_reason || isRemovedInModView(item)) {
        return true
    }
    if (isComment(item.name)) {
        return isRemovedComment(item)
    } else {
        return isRemovedPost(item)
    }
}

export const isComment = (name: string): boolean => {
    return name.substr(0, 2) === 't1'
}
// Checking that author starts with '[' for userpage-driven content is sufficient to prove comment is removed.
// This way, the check is indifferent to language, in case Accept-Language is not set to 'en'
// Also check body because comments whose author account is deleted may have valid unremoved body
export const isRemovedComment = (item: RedditItem): boolean => {
    return item.author.replace(/\\/g, '')[0] === '[' && (item.body || '').replace(/\\/g, '')[0] === '['
}
// What a logged-in read shows for an item whose author blocked the viewer:
// author, body or selftext '[unavailable]'. The item is live, but it reads
// like a removal (isRemovedComment), so the extension's logged-in reads leave
// it out and the bridge tags it.
export const VIEWER_BLOCKED = '[unavailable]'
export const isViewerBlockedItem = (item: any): boolean =>
    Boolean(item) &&
    (item.author === VIEWER_BLOCKED || item.body === VIEWER_BLOCKED || item.selftext === VIEWER_BLOCKED)
// The text reddit shows in place of an item's own: [removed], [deleted], or its
// own "[ Removed by Reddit ]", which may give a reason and a link. Text that goes
// on past its closing bracket is a person's own.
export const isPlaceholderText = (text = ''): boolean =>
    text === '[removed]' ||
    text === '[deleted]' ||
    /^\[ ?removed by reddit(?:[^[\]]|\[[^[\]]*\]\([^()]*\))*\]$/i.test(text)
export const isUserDeletedComment = (item: RedditItem): boolean => {
    return (item.body || '').replace(/\\/g, '') === '[deleted]' && item.author.replace(/\\/g, '') === '[deleted]'
}
export const isUserDeletedPost = (item: RedditItem): boolean => {
    return item.is_robot_indexable === false && item.author.replace(/\\/g, '') === '[deleted]'
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
// A post the viewer's listing marks, whoever removed it. 'deleted' is the author's own doing.
export const isRemovedByCategory = (post: RedditItem): boolean =>
    Boolean(post.removed_by_category) && post.removed_by_category !== 'deleted'

export const trimDict_by_numberValuedAttribute = (
    dict: Record<string, any>,
    maxNumItems: number,
    numberValuedAttribute: string,
): Record<string, any> => {
    return Object.fromEntries(sortDict_by_numberValuedAttribute(dict, numberValuedAttribute).slice(0, maxNumItems))
}

export const sortDict_by_numberValuedAttribute = (
    dict: Record<string, any>,
    numberValuedAttribute: string,
): [string, any][] => {
    return Object.entries(dict).sort((a, b) => b[1][numberValuedAttribute] - a[1][numberValuedAttribute])
}

export class ItemForStorage {
    c: number
    u: boolean
    p?: string
    constructor(created_utc: number, unseen: boolean, post_id?: string) {
        this.c = created_utc
        this.u = unseen
        if (typeof post_id !== 'undefined') this.p = post_id
    }
}

export class ChangeForStorage {
    i: string | null
    o: number | null
    g: number | null
    n: number | null
    user?: string
    constructor({
        id = null,
        observed_utc = null,
        change_type = null,
        seen_count = null,
        object = null,
    }: {
        id?: string | null
        observed_utc?: number | null
        change_type?: number | null
        seen_count?: number | null
        object?: any
    }) {
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
    getID() {
        return this.i
    }
    getObservedUTC() {
        return this.o
    }
    getChangeType() {
        return CHANGE_TYPE_TEXT[this.g as number]
    }
    getSeenCount() {
        return this.n
    }
}

type LocalItemCount = 'n' | 'r' | 'ln' | 'lr'

export class LocalStorageItem {
    t: string
    o: number | null
    c: number
    n: number
    r: number
    ln?: number
    lr?: number
    p?: string
    b?: string // post selftext body (comments store body in `t`)
    s?: string // subreddit name
    constructor({
        item = null,
        observed_utc = null,
        object = null,
    }: {
        item?: RedditItem | null
        observed_utc?: number | null
        object?: any
    }) {
        if (object) {
            this.t = object.t
            this.o = object.o
            this.c = object.c
            this.n = object.n || 0 // seen_count, which increments when the same status is observed
            this.r = object.r || 0 // removal_count, consecutive times observed as removed
            // n and r for lock tracking, only on items it has counted
            if (typeof object.ln !== 'undefined') this.ln = object.ln
            if (typeof object.lr !== 'undefined') this.lr = object.lr
            if (typeof object.p !== 'undefined') this.p = object.p
            if (typeof object.b !== 'undefined') this.b = object.b
            if (typeof object.s !== 'undefined') this.s = object.s
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
            // store selftext body for posts (comments already have body in `t`)
            if (item && !isComment(item.name) && (item as any).selftext) {
                this.b = reformatRedditText((item as any).selftext)
            }
            if (item && item.subreddit) {
                this.s = item.subreddit
            }
        }
    }
    setText(text: string) {
        this.t = reformatRedditText(text)
    }
    getText() {
        return this.t
    }
    getBody() {
        return this.b
    }
    getSubreddit() {
        return this.s
    }
    getObservedUTC() {
        return this.o
    }
    getCreatedUTC() {
        return this.c
    }
    getPostID() {
        return this.p
    }
    getCount(count: LocalItemCount) {
        return this[count] || 0
    }
    resetCount(count: LocalItemCount) {
        this[count] = 0
    }
    incrementCount(count: LocalItemCount) {
        const value = this.getCount(count) + 1
        this[count] = value
        return value
    }
}

export function setAlarm(periodInMinutes: number) {
    chrome.alarms.clear(ALARM_NAME)
    chrome.alarms.create(ALARM_NAME, { delayInMinutes: 1, periodInMinutes: periodInMinutes })
}

// Leaves closing the popup to the popup: a reddit page's link runs this in the
// background, and Firefox's background page has a window of its own
export function goToOptions() {
    const isAndroid = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent)
    if (isAndroid) {
        chrome.tabs.create({ url: chrome.runtime.getURL('src/options.html'), active: true })
    } else {
        chrome.runtime.openOptionsPage()
    }
}

export const getPrettyTimeLength = (seconds: number): string | undefined => {
    const thresholds = [
        [60, 'second', 'seconds'],
        [60, 'minute', 'minutes'],
        [24, 'hour', 'hours'],
        [7, 'day', 'days'],
        [365 / 12 / 7, 'week', 'weeks'],
        [12, 'month', 'months'],
        [10, 'year', 'years'],
        [10, 'decade', 'decades'],
        [10, 'century', 'centuries'],
        [10, 'millenium', 'millenia'],
    ]
    if (seconds < 60) return seconds + ' seconds'
    let time = seconds
    for (let i = 0; i < thresholds.length; i++) {
        let divisor = thresholds[i][0] as number
        let text: string = thresholds[i][1] as string
        let textPlural = thresholds[i][2] as string
        if (time < divisor) {
            let extra = time - Math.floor(time)
            let prevUnitTime = Math.round(extra * (thresholds[i - 1][0] as number))
            if ((thresholds[i - 1][0] as number) === prevUnitTime) {
                time += 1
                prevUnitTime = 0
            }
            if (Math.floor(time) > 1 || Math.floor(time) == 0) {
                text = textPlural
            }
            if (i > 1 && prevUnitTime > 0) {
                let remainText = thresholds[i - 1][1]
                if (prevUnitTime > 1) {
                    remainText = thresholds[i - 1][2]
                }
                text += ', ' + String(prevUnitTime) + ' ' + remainText
            }
            return String(Math.floor(time)) + ' ' + text
        }
        time = time / (divisor as number)
    }
}

export const getPrettyDate = (createdUTC: number): string => {
    const seconds = Math.floor(new Date().getTime() / 1000) - createdUTC
    return getPrettyTimeLength(seconds) + ' ago'
}

export const createNotification = ({
    notificationId,
    title,
    message,
}: {
    notificationId: string
    title: string
    message: string
}): Promise<boolean> => {
    console.log(`createNotification called: ${notificationId} - ${title} - ${message}`)
    return new Promise<boolean>(resolve => {
        if (location.protocol.match(/^http/)) {
            console.log('Sending notification via message passing')
            chrome.runtime.sendMessage({
                action: 'create-notification',
                options: { notificationId, title, message },
            })
            resolve(true)
        } else {
            console.log('Creating notification directly with chrome.notifications.create')
            const baseId = String(notificationId)
            const uniqueId = baseId.includes('|') ? baseId : `${baseId}|${Date.now()}`
            const options = {
                type: 'basic',
                iconUrl: chrome.runtime.getURL('icons/128.png'),
                title: title,
                message: message,
            }
            const fallbackShowNotification = () => {
                try {
                    const swSelf = self as any
                    const swRegistration = swSelf && swSelf.registration ? swSelf.registration : null
                    if (swRegistration && swRegistration.showNotification) {
                        swRegistration.showNotification(title, {
                            body: message,
                            icon: chrome.runtime.getURL('icons/128.png'),
                            data: baseId,
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
                        resolve(false)
                    } else {
                        resolve(true)
                    }
                })
            } catch (error) {
                console.log('Error creating notification:', error)
                fallbackShowNotification()
                resolve(false)
            }
        }
    })
}
