import {getSubscribedUsers_withSeenAndUnseenIDs, subscribeUser} from './storage.js'
import {redditModifications} from './content-reddit.js'
import {revdditModifications} from './content-revddit.js'
import {getLoggedinUser} from './requests.js'
import browser from 'webextension-polyfill'

(function () {
    const matches = window.location.href.match(/^https?:\/\/[^/]*(reddit\.com|reveddit\.com|localhost)/)

    function queryUser (message, sender, response) {
        if (message.action === 'query-user') {
            return getLoggedinUser()
            .then((user) => {
                if (user) {
                    try { chrome.runtime.sendMessage({action: 'immediate-user-lookup', user}) } catch (e) {}
                    return subscribeUser(user, () => {
                        window.location.href=`https://www.reveddit.com/user/${user}?all=true`
                    })
                } else {
                    return Promise.resolve('failed')
                }
            })
        } else if (message.action === 'get-logged-in-user-items') {
            // Handle request for logged-in user's items from background script
            const params = {limit: 100, sort: 'new', raw_json: 1}
            const search = '?'+Object.keys(params).map(k => `${k}=${params[k]}`).join('&')
            
            // Use the same subdomain as the current page to avoid cross-site issues
            const currentHost = window.location.hostname
            const url = `https://${currentHost}/user/me.json${search}`
            
            // Ask background to store cookies for future use when no tabs are open
            try {
                chrome.runtime.sendMessage({action: 'store-reddit-cookies'})
            } catch (e) {
                // ignore if not available
            }
            
            return fetch(url, {credentials: 'include'})
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
        } else if (message.action === 'fetch-api-info-public') {
            // Fetch /api/info WITHOUT credentials to get "public" view
            // This is key for detecting removed content - we need to see what logged-out users see
            const ids = message.ids
            const url = `https://old.reddit.com/api/info.json?id=${ids}&raw_json=1`
            
            return fetch(url, {
                credentials: 'omit',
                headers: {
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache',
                }
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Content script fetch failed: ${response.status}`)
                }
                return response.json()
            })
            .then(data => {
                if (data && data.data && data.data.children) {
                    return {success: true, items: data.data.children}
                }
                throw new Error('Invalid data format')
            })
            .catch(error => {
                console.log('Content script fetch-api-info-public error:', error)
                return {success: false, error: error.message}
            })
        }
    }
    $.extend($.expr[":"], {
        "equalsi": (elem, i, match, array) => {
            return (elem.textContent || elem.innerText || "").toLowerCase().trim() === match[3].toLowerCase().trim()
        }
    });
    window.localStorage.setItem('hasSeenLanguageModal', true)
    window.localStorage.setItem('hasNotifierExtension', true)
    browser.runtime.onMessage.addListener(queryUser)

    const extensionSaysNoSubscriptions = 'extensionSaysNoSubscriptions'
    let user = 'other'
    let isUserPage = false
    let isInfoPage = false
    let isReddit = false
    jQuery(document).ready(() => {
        if (matches) {
            isReddit = matches[1] === 'reddit.com'
            const pathParts = window.location.pathname.split('/')
            if (pathParts[1] === 'user' && pathParts.length >= 3 && pathParts[2]) {
                user = window.location.pathname.split('/')[2];
                isUserPage = true
            } else if (pathParts[1] === 'info') {
                isInfoPage = true
            }
        }
        getSubscribedUsers_withSeenAndUnseenIDs((users, storage) => {
            const subscribed_users_lowercase = Object.keys(users).filter(x => x !== 'other').map(x => x.toLowerCase())
            if (subscribed_users_lowercase.length === 0) {
                window.localStorage.setItem(extensionSaysNoSubscriptions, true)
            } else {
                window.localStorage.removeItem(extensionSaysNoSubscriptions)
            }
            if (isReddit) {
                redditModifications(storage.other_subscriptions, storage.options.hide_subscribe, storage.options.monitor_quarantined, subscribed_users_lowercase, Object.keys((storage.user_unsubscriptions || {})).map(x => x.toLowerCase()))
            } else {
                revdditModifications(storage, user, isUserPage, isInfoPage)
            }
        })
    });
})();
