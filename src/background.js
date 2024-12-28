import {goToOptions, setAlarm, ALARM_NAME,
        createNotification, updateBadgeUnseenCount, createTab } from './src/common.js'
import {checkForChanges} from './src/monitoring.js'
import {lookupItemsByID, getLoggedinUser, getCookie, getAuth} from './src/requests.js'
import {initStorage, INTERVAL_DEFAULT, subscribeUser,
        getUnseenIDs_thing, markThingAsSeen } from './src/storage.js'
import {setupContextualMenu} from './src/contextMenus.js'
import browser from 'webextension-polyfill'
import { getItems_fromOld, getPost_fromOld } from './src/parse_html/old.js'
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
        if (details.originUrl.match(/^https?:\/\/(www.reveddit.com|localhost:[0-9]*)(\/.*)?$/)) {
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
console.log('bg script running')
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
                return lookupItemsByID(request.ids, auth, request.monitor_quarantined)
            })
            .then(items => {
                // if request fails, items is null
                sendResponse({response: "done", items})
            })
            return true
        } else if (request.action === "get-from-old") {
            getPost_fromOld(request.path)
            .then(data => {
                sendResponse(data)
            })
            return true
        }
})

chrome.runtime.onMessageExternal.addListener(
    function(message, sender, sendResponse) {
        switch (message.action) {
            case 'fetch-old':
                getItems_fromOld(message.path)
                .then(data => {
                    sendResponse({data})
                })
                break
            case 'version':
                sendResponse({version: chrome.runtime.getManifest().version})
                break
        }
    }
)


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


let lastAlarm = 0;

if (! chrome.extension.inIncognitoContext) {
    // ### BEGIN WORKAROUND for broken alarms
    // https://bugs.chromium.org/p/chromium/issues/detail?id=1316588#c99
    (async function lostEventsWatchdog() {
      let quietCount = 0;
      while (true) {
        await new Promise(resolve => setTimeout(resolve, 65000));
        const now = Date.now();
        const age = now - lastAlarm;
        console.log(`lostEventsWatchdog: last alarm ${age/1000}s ago`);
        if (age < 95000) {
          quietCount = 0;  // alarm still works.
        } else if (++quietCount >= 3) {
          console.error("lostEventsWatchdog: reloading!");
          return chrome.runtime.reload();
        } else {
          setAlarm(INTERVAL_DEFAULT)
        }
      }
    })();
    // ### END WORKAROUND for broken alarms

    chrome.alarms.onAlarm.addListener(function(alarm) {
        if (alarm.name == ALARM_NAME) {
            lastAlarm = Date.now() // part of WORKAROUND for broken alarms
            checkForChanges()
        }
    })
}
