import {goToOptions, setAlarm, ALARM_NAME,
        createNotification, updateBadgeUnseenCount, createTab } from './src/common.js'
import {checkForChanges} from './src/monitoring.js'
import {lookupItemsByID, getLoggedinUser, getCookie, getAuth} from './src/requests.js'
import {initStorage, INTERVAL_DEFAULT, subscribeUser,
        getUnseenIDs_thing, markThingAsSeen } from './src/storage.js'
import {setupContextualMenu} from './src/contextMenus.js'
import browser from 'webextension-polyfill'

setupContextualMenu()


// BEGIN webRequest API code
// When manifest v3 goes live, this code should only run for firefox
// It enables viewing quarantined content on reveddit (except user pages which are covered with cloudflare workers)

// Can use this to check for firefox build:
if (__BUILT_FOR__ !== 'chrome') {
    const opt_extraInfoSpec = ['requestHeaders', 'blocking']

    browser.webRequest.onBeforeSendHeaders.addListener(function(details){
        //chrome uses details.initiator, but since chrome doesn't support webRequest anymore,
        //only need to check the value supported by firefox
        if (details.originUrl.match(/^https:\/\/www.reveddit.com(\/.*)?$/)) {
            var newCookie = '_options={%22pref_quarantine_optin%22:true};'
            var gotCookie = false
            for (var n in details.requestHeaders) {
                const headerName = details.requestHeaders[n].name.toLowerCase()
                if (headerName === "cookie") {
                    details.requestHeaders[n].value = details.requestHeaders[n].value.replace(/ ?reddit_session[^;]*;/,'')
                    if (! details.requestHeaders[n].value.match(/pref_quarantine_optin/)) {
                        details.requestHeaders[n].value = details.requestHeaders[n].value + `; ${newCookie}`
                    }
                    gotCookie = true
                }
            }
            if (! gotCookie) {
                details.requestHeaders.push({name:"Cookie",value:newCookie})
            }
        }
        return {requestHeaders:details.requestHeaders}
    },{
        urls:["https://oauth.reddit.com/*.json*", "https://*.reddit.com/api/info*"]
    }, opt_extraInfoSpec)
}
// END webRequest API code

chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if (request.action == "open-options") {
            goToOptions()
            sendResponse({response: "done"})
            return true
        } else if (request.action == "update-badge") {
            updateBadgeUnseenCount()
            sendResponse({response: "done"})
            return true
        } else if (request.action == "create-notification") {
            createNotification(request.options)
            return true
        } else if (request.action === "get-cookie") {
            getCookie(request.options)
            .then(cookie => {
                sendResponse({response: "done", cookie})
            })
            return true
        } else if (request.action == "get-reddit-items-by-id") {
            getAuth()
            .then(auth => {
                return lookupItemsByID(request.ids, auth)
            })
            .then(items => {
                // if request fails, items is null
                sendResponse({response: "done", items})
            })
            return true
        }
})

chrome.runtime.onInstalled.addListener(function(details) {
    if (details.reason == 'install') {
        initStorage(() => {
            setAlarm(INTERVAL_DEFAULT)
            subscribeToLoggedInUser_or_promptForUser()
            updateBadgeUnseenCount()
        })
        var uninstallGoogleFormLink = 'https://docs.google.com/forms/d/e/1FAIpQLSejWHJAf8thfMdTnnEc5xZPlsdxA_dGUkbmnDq8PABVMkvARg/viewform'
        if (chrome.runtime.setUninstallURL) {
            chrome.runtime.setUninstallURL(uninstallGoogleFormLink)
        }
    } else if (details.reason == 'update') {
        updateBadgeUnseenCount()
    }
})



function subscribeToLoggedInUser_or_promptForUser() {
    getLoggedinUser()
    .then((user) => {
        if (user) {
            subscribeUser(user, () => {
                chrome.tabs.create({url: `https://www.reveddit.com/user/${user}?all=true`})
            })
        } else {
            browser.tabs.create({url: `https://www.reveddit.com/user/`})
            .then(tab => {
                // try to make request via content page instead (works for firefox)
                setTimeout(() => {
                    browser.tabs.sendMessage(tab.id, {action: 'query-user'})
                }, 2000)
            })
        }
    })
}

const notificationClicked = (thing) => {
    const isUser = thing === 'other' ? false : true
    chrome.storage.sync.get(null, (storage) => {
        const unseenIDs = getUnseenIDs_thing(thing, isUser, storage)
        let url = null
        if (isUser && storage.user_subscriptions[thing]) {
            url = `https://www.reveddit.com/user/${thing}`
            if (unseenIDs.length) {
                url += `?show=${unseenIDs.join(',')}&removal_status=all`
            }
        } else if (! isUser) {
            url = '/src/other.html'
            if (unseenIDs.length) {
                url = `https://www.reveddit.com/info?id=${unseenIDs.join(',')}&removal_status=all`
            }
        }
        if (url) {
            markThingAsSeen(storage, thing, isUser)
            browser.storage.sync.set(storage)
            .then(res => {
                updateBadgeUnseenCount()
                createTab(url)
            })
        }
    })
}

chrome.notifications.onClicked.addListener((thing) => {
    notificationClicked(thing)
    chrome.notifications.clear(thing)
})

// only need this while using registration.showNotification in common.js
if (__BUILT_FOR__ === 'chrome') {
    self.addEventListener('notificationclick', (event) => {
        notificationClicked(event.notification.data)
        event.notification.close()
    })
}

if (! chrome.extension.inIncognitoContext) {
    chrome.alarms.onAlarm.addListener(function(alarm) {
        if (alarm.name == ALARM_NAME) {
            checkForChanges()
        }
    })
}
