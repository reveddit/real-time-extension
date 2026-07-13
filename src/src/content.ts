import { getSubscribedUsers_withSeenAndUnseenIDs, subscribeUser } from './storage'
import { redditModifications } from './content-reddit'
import { revdditModifications } from './content-revddit'
import { getLoggedinUser } from './requests'
import browser from 'webextension-polyfill'
;(function () {
    // Guard against double-execution: the background injects this script into
    // reddit tabs that predate the extension's install/reload (they otherwise
    // have no content script). A second run would register duplicate message
    // listeners. The flag lives in the content-script isolated world, which the
    // background's injection check reads via chrome.scripting.executeScript.
    if ((window as any).__reveddit_cs_loaded) {
        return
    }
    ;(window as any).__reveddit_cs_loaded = true

    const matches = window.location.href.match(/^https?:\/\/[^/]*(reddit\.com|reveddit\.com|localhost)/)

    function queryUser(message: any, _sender: any, _response: any) {
        if (message.action === 'query-user') {
            return getLoggedinUser().then((user: any): any => {
                if (user) {
                    try {
                        chrome.runtime.sendMessage({ action: 'immediate-user-lookup', user })
                    } catch {
                        /* ignored */
                    }
                    return subscribeUser(user, () => {
                        window.location.href = `https://www.reveddit.com/user/${user}?all=true`
                    })
                } else {
                    return Promise.resolve('failed')
                }
            })
        } else if (message.action === 'get-logged-in-user-items') {
            // Handle request for logged-in user's items from background script
            const params: Record<string, any> = { limit: 100, sort: 'new', raw_json: 1 }
            const search =
                '?' +
                Object.keys(params)
                    .map(k => `${k}=${params[k]}`)
                    .join('&')

            // Use the same subdomain as the current page to avoid cross-site issues
            const currentHost = window.location.hostname
            const url = `https://${currentHost}/user/me.json${search}`

            // Ask background to store cookies for future use when no tabs are open
            try {
                chrome.runtime.sendMessage({ action: 'store-reddit-cookies' })
            } catch {
                // ignore if not available
            }

            return fetch(url, { credentials: 'include' })
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`)
                    }
                    return response.json()
                })
                .then(data => {
                    if (data && data.data && data.data.children) {
                        return data.data.children
                    }
                    throw new Error('reddit data is not defined')
                })
                .catch(error => {
                    console.log('Error fetching logged-in user items:', error)
                    return null
                })
        } else if (message.action === 'fetch-www-profile-public') {
            // Public-view fetch for removal detection: what logged-out users see.
            // Runs in a www.reddit.com tab so the fetch is same-origin, which is
            // verified to bypass Reddit's JS challenge (the background worker's
            // fetch may not). URLs (profile tabs and /svc/ pagination partials)
            // are built by parse_html/new.ts; this handler just fetches.
            // credentials MUST stay omitted or the logged-in view comes back and
            // removals become undetectable.
            const url = String(message.url || '')
            if (!url.startsWith('https://www.reddit.com/')) {
                return Promise.resolve({ success: false, error: 'invalid url' })
            }
            return fetch(url, {
                credentials: 'omit',
                headers: { 'Accept-Language': 'en' },
            })
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`www.reddit.com request failed: ${response.status}`)
                    }
                    return response.text()
                })
                .then(html => ({ success: true, html }))
                .catch(error => {
                    console.log('Content script fetch-www-profile-public error:', error)
                    return { success: false, error: error.message }
                })
        }
    }
    window.localStorage.setItem('hasSeenLanguageModal', 'true')
    window.localStorage.setItem('hasNotifierExtension', 'true')
    browser.runtime.onMessage.addListener(queryUser as any)

    const extensionSaysNoSubscriptions = 'extensionSaysNoSubscriptions'
    let user = 'other'
    let isUserPage = false
    let isInfoPage = false
    let isReddit = false
    const main = () => {
        if (matches) {
            isReddit = matches[1] === 'reddit.com'
            const pathParts = window.location.pathname.split('/')
            if (pathParts[1] === 'user' && pathParts.length >= 3 && pathParts[2]) {
                user = window.location.pathname.split('/')[2]
                isUserPage = true
            } else if (pathParts[1] === 'info') {
                isInfoPage = true
            }
        }
        getSubscribedUsers_withSeenAndUnseenIDs((users, storage) => {
            const subscribed_users_lowercase = Object.keys(users)
                .filter(x => x !== 'other')
                .map(x => x.toLowerCase())
            if (subscribed_users_lowercase.length === 0) {
                window.localStorage.setItem(extensionSaysNoSubscriptions, 'true')
            } else {
                window.localStorage.removeItem(extensionSaysNoSubscriptions)
            }
            if (isReddit) {
                redditModifications(
                    storage.other_subscriptions,
                    storage.options.hide_subscribe,
                    storage.options.monitor_quarantined,
                    subscribed_users_lowercase,
                    Object.keys(storage.user_unsubscriptions || {}).map(x => x.toLowerCase()),
                )
            } else {
                revdditModifications(storage, user, isUserPage, isInfoPage)
            }
        })
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', main)
    } else {
        main()
    }
})()
