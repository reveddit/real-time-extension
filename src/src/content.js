import {getSubscribedUsers_withSeenAndUnseenIDs, subscribeUser} from './storage.js'
import {redditModifications} from './content-reddit.js'
import {revdditModifications} from './content-revddit.js'
import {getLoggedinUser} from './requests.js'
import browser from 'webextension-polyfill'


(function () {
    const matches = window.location.href.match(/^https?:\/\/[^/]*(reddit\.com|reveddit\.com|localhost)/)
    console.log(matches)
    window.addEventListener("message", async evt => {
        // if (evt.origin !== "http://example.com") return;
        const type = evt.data.type
        if (type === 'request') {
            // console.log('extension processing request')
            // console.log(evt.data) // "Question!"
            // console.log('evt.origin', evt.origin)
            const test = await browser.runtime.sendMessage(
                {action: 'fetch-parse-old',
                path:'/user/rhaksw'})
            console.log('sending request info')
            const info = await browser.runtime.sendMessage(
                {action: 'fetch-text',
                url:'https://www.reddit.com/api/info?id=t1_jm5c2x7'})
            console.log('completed request info', info)
            evt.source.postMessage({type: 'response', response: test, info}, evt.origin);
        } else if (type === 'IsExtensionInstalled') {
            console.log('extension got installation check')
            evt.source.postMessage({type: 'RevedditExtensionInstalled', version: browser.runtime.getManifest().version})
        }
    });

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
