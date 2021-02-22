import {getSubscribedUsers_withSeenAndUnseenIDs, subscribeUser} from './storage.js'
import {redditModifications} from './content-reddit.js'
import {revdditModifications} from './content-revddit.js'
import {getLoggedinUser} from './requests.js'
import browser from 'webextension-polyfill'



(function () {
    function queryUser (message, sender, response) {
        if (message.action === 'query-user') {
            return getLoggedinUser()
            .then((user) => {
                if (user) {
                    return subscribeUser(user, () => {
                        window.location.href=`https://www.reveddit.com/user/${user}?all=true`
                    })
                } else {
                    return Promise.resolve('failed')
                }
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
        const matches = window.location.href.match(/^https?:\/\/[^/]*(reddit\.com|reveddit\.com|localhost)/)
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
            if (Object.keys(users).filter(x => x !== 'other').length === 0) {
                window.localStorage.setItem(extensionSaysNoSubscriptions, true)
            } else {
                window.localStorage.removeItem(extensionSaysNoSubscriptions)
            }
            if (isReddit) {
                redditModifications(storage.other_subscriptions)
            } else {
                revdditModifications(storage, user, isUserPage, isInfoPage)
            }
        })
    });
})();
