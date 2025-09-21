import {goToOptions, setAlarm, ALARM_NAME,
        createNotification, updateBadgeUnseenCount, createTab } from './src/common.js'
import {checkForChanges} from './src/monitoring.js'
import {lookupItemsByID, getLoggedinUser, getCookie, getAuth, storeRedditCookies} from './src/requests.js'
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
// Keep stored Reddit cookies up-to-date automatically
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab && tab.url && tab.url.match(/^https?:\/\/[^/]*\.reddit\.com\//)) {
        storeRedditCookies()
        .then(() => {
            // If in a degraded state, try to recover by fetching the logged-in user
            chrome.storage.local.get(['error_status'], (result) => {
                if (result && result.error_status) {
                    getLoggedinUser()
                    .then(user => {
                        if (user) {
                            chrome.storage.local.remove('error_status', () => {
                                updateBadgeUnseenCount()
                            })
                        }
                    })
                }
            })
        })
    }
})

chrome.cookies.onChanged.addListener((changeInfo) => {
    const cookie = changeInfo.cookie
    if (cookie && cookie.domain && cookie.domain.replace(/^\./, '').endsWith('reddit.com')) {
        storeRedditCookies()
        .then(() => {
            // If in a degraded state, try to recover as soon as cookies change
            chrome.storage.local.get(['error_status'], (result) => {
                if (result && result.error_status) {
                    getLoggedinUser()
                    .then(user => {
                        if (user) {
                            chrome.storage.local.remove('error_status', () => {
                                updateBadgeUnseenCount()
                            })
                        }
                    })
                }
            })
        })
    }
})
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
            console.log('Background script received create-notification request:', request.options)
            createNotification(request.options)
            return true
        } else if (request.action === "get-cookie") {
            getCookie(request.options)
            .then(cookie => {
                sendResponse({response: "done", cookie})
            })
            return true
        } else if (request.action == "get-reddit-items-by-id") {
            // Only get OAuth auth if user has provided a custom client ID
            chrome.storage.sync.get(['options'], (result) => {
                const needsOAuth = result.options && result.options.custom_clientid && result.options.custom_clientid !== ''
                const authPromise = needsOAuth ? getAuth() : Promise.resolve('none')
                
                authPromise.then(auth => {
                    return lookupItemsByID(request.ids, auth, request.monitor_quarantined)
                })
                .then(items => {
                    // if request fails, items is null
                    sendResponse({response: "done", items})
                })
                .catch(error => {
                    console.log('Error in get-reddit-items-by-id:', error)
                    sendResponse({response: "done", items: null})
                })
            })
            return true
        } else if (request.action === 'store-reddit-cookies') {
            // Trigger cookie capture in background context
            storeRedditCookies()
            sendResponse({response: 'done'})
            return true
        } else if (request.action == "get-logged-in-user-items") {
            // This will be handled by content script, just pass it through
            return true
        } else if (request.action === "get-from-old") {
            getPost_fromOld(request.path)
            .then(data => {
                sendResponse(data)
            })
            return true
        } else if (request.action === 'immediate-user-lookup') {
            const user = request.user
            if (user) {
                triggerImmediateLookupOnce(user)
            }
            sendResponse({response: 'done'})
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
                triggerImmediateLookupOnce(user)
                chrome.tabs.create({url: `https://www.reveddit.com/user/${user}?all=true`})
            })
        } else {
            browser.tabs.create({url: `https://www.reddit.com/user/me`})
            .then(tab => {
                // try to make request via content page instead (works for firefox)
                setTimeout(() => {
                    browser.tabs.sendMessage(tab.id, {action: 'query-user'})
                    .catch(err => {
                        // Receiving end does not exist → show warning badge instead of throwing
                        console.log('Error sending message to new tab:', err)
                    })
                }, 2000)
            })
        }
    })
}

function triggerImmediateLookupOnce(user) {
    chrome.storage.sync.get(['user_initial_lookup_done'], (result) => {
        const lookupMap = result.user_initial_lookup_done || {}
        if (! lookupMap[user]) {
            lookupMap[user] = true
            chrome.storage.sync.set({user_initial_lookup_done: lookupMap}, () => {
                // Run a full check which includes logged-in user
                try {
                    checkForChanges()
                } catch (e) {
                    console.log('Immediate lookup failed to start:', e)
                }
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
            // Always point to the extension's history page for user content
            url = chrome.runtime.getURL('src/history.html')
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

chrome.notifications.onClicked.addListener((notificationId) => {
    const thing = (notificationId || '').split('|')[0]
    notificationClicked(thing)
    chrome.notifications.clear(notificationId)
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
