import {goToOptions, getFullIDsFromURL, createNotification} from './common.js'
import {getSubscribedUsers_withSeenAndUnseenIDs,
        subscribeId, unsubscribeId,
        markThingAsSeen, setStorageUpdateBadge, markEverythingAsSeen} from './storage.js'
import {setCurrentStateForId} from './monitoring.js'
import browser from 'webextension-polyfill'


populatePopup()


function populatePopup() {
    $('#popup').empty()
    $(` <div id="switches"></div>
        <div><a class="blue-link" id="go-to-options" href="/src/options.html">options</a></div>
        <div style="clear:both"></div>
        <div><a href="#" class="clear-notifications blue-link">clear notifications</a></div>
        <div style="clear:both"></div>
    `).appendTo('#popup')

    $('.clear-notifications').click(() => {
        markEverythingAsSeen()
        .then(res => {
            populatePopup()
        })
    })
    
    $('#go-to-options').click(goToOptions);

    // Check for session disconnection and show warning if needed
    chrome.storage.local.get(['error_status'], (result) => {
        if (result && result.error_status) {
            $('<div class="warning-message">⚠️ Session may be disconnected. Open or reload a Reddit tab to reconnect.</div>').prependTo('#popup')
        }
    })

    getSubscribedUsers_withSeenAndUnseenIDs(async (users, storage) => {
        const other = users['other']
        delete users['other']
        
        // Check for supported Reddit subdomains
        chrome.tabs.query({url: ['*://*.reddit.com/*']}, (tabs) => {
            const supportedTabs = tabs.filter(tab => {
                const hostname = new URL(tab.url).hostname
                return hostname === 'www.reddit.com' || hostname === 'old.reddit.com'
            })
            
            if (tabs.length > 0 && supportedTabs.length === 0) {
                // Check if we've already shown the warning
                chrome.storage.local.get(['subdomain_warning_shown'], (result) => {
                    if (!result.subdomain_warning_shown) {
                        // Show warning for unsupported subdomain only once
                        $('<div class="warning-message">⚠️ User monitoring requires www.reddit.com or old.reddit.com</div>').appendTo('#popup')
                        // Mark warning as shown
                        chrome.storage.local.set({subdomain_warning_shown: true})
                    }
                })
            }
        })
        
        // Reserve space and show loading state for the current user section
        const $currentUserContainer = $('<div id="current-user-section"><span class="loading">loading...</span></div>').appendTo('#popup')

        // Use last saved logged-in user from local storage instead of calling /me.json
        try {
            chrome.storage.local.get(['last_logged_in_user'], (result) => {
                $currentUserContainer.empty()
                const loggedInUser = result && result.last_logged_in_user
                if (loggedInUser) {
                    const userData = users[loggedInUser]
                    if (userData) {
                        const unseenIDs = userData['unseen']
                        displayUserInPopup(loggedInUser, unseenIDs, $currentUserContainer)
                    } else {
                        displayUserInPopup(loggedInUser, [], $currentUserContainer)
                    }
                } else {
                    $('<div class="no-user-message">Log in to www.reddit.com or old.reddit.com to get started.</div>').appendTo($currentUserContainer)
                }
            })
        } catch (e) {
            $currentUserContainer.empty()
            $('<div class="no-user-message">Log in to www.reddit.com or old.reddit.com to get started.</div>').appendTo($currentUserContainer)
        }
        
        $('<hr>').appendTo('#popup')
        displayOtherInPopup(other['unseen'], Object.keys(storage.other_subscriptions).length)
        $('<hr>').appendTo('#popup')
        $('<a target="_blank" class="blue-link" id="go-to-history" href="/src/history.html">history</a>')
            .click(openAndClose).wrap('<div id="bottom">').parent().appendTo('#popup')
        $('<hr>').appendTo('#popup')
        $('<button id="test-notification" style="margin-top:6px">Test notification</button>').appendTo('#popup')
        $('#test-notification').on('click', () => {
            createNotification({
                notificationId: 'test',
                title: 'Reveddit test notification',
                message: 'If you see this, notifications are working.'
            })
        })
    })

    chrome.storage.sync.get(null, syncStorage => {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            const url = tabs[0].url
            if (url) {
                const [postID, commentID] = getFullIDsFromURL(url)
                if (commentID) {
                    showToggleSubscribe({comment: commentID}, syncStorage, url)
                }
                if (postID) {
                    showToggleSubscribe({post: postID}, syncStorage, url)
                }
            }
        })
    });
}

const openAndClose = (ev) => {
    ev.preventDefault()
    window.open(ev.target.href)
    window.close()
}

function showToggleSubscribe({post: post, comment: comment}, storage, url) {
    let id = ''
    let type = ''
    if (comment) {
        id = comment
        type = 'comment'
    } else if (post) {
        id = post
        type = 'post'
    } else {
        return
    }
    
    const inputId = `toggle-${type}`
    const textLabelId = `text-label-${type}`
    $('#switches').append(`
        <span class="text-label" id="${textLabelId}"><span class="un">un</span>subscribed ${type}</span>
        <div class="switch">
            <input id="${inputId}" class="cmn-toggle cmn-toggle-round-flat" type="checkbox">
            <label for="${inputId}"></label>
        </div>
        <div style="clear:both"></div>
    `)
    const $textLabel = $(`#${textLabelId}`)
    const $input = $(`#${inputId}`)

    function toggleLabelTextAndColor () {
        if ($input.prop('checked')) {
            $textLabel.addClass('set')
            $textLabel.find('.un').css('visibility', 'hidden')
        } else {
            $textLabel.removeClass('set')
            $textLabel.find('.un').css('visibility', '')
        }
    }

    $input.change((e) => {
        let fn = subscribeId
        if (! $input.prop('checked')) fn = unsubscribeId
        fn(id, async () => {
            chrome.runtime.sendMessage({action: 'update-badge'})
            toggleLabelTextAndColor()
            if (fn === subscribeId) {
                // marking state separately from the subscribe function b/c
                // otherwise one of the following happens:
                //   (1) chaining this makes the function a little slow
                //   (2) not chaining it will mess up sync state writes
                await setCurrentStateForId(id, url)
                populatePopup()
            } else {
                populatePopup()
            }
        })
    })
    if (id in storage.other_subscriptions) {
        $input.prop('checked', true)
        toggleLabelTextAndColor()
    }
    $textLabel.click((e) => {
        $input.prop('checked', !$input.prop('checked')).change()
    })
}

function displayUserInPopup(user, unseen, $parent) {
    // Always point to the extension's history page for user content
    const url = chrome.runtime.getURL('src/history.html')
    addUnseenLink(user, true, `${unseen.length}`, url, $parent)
}

function displayOtherInPopup(unseen, total) {
    let url = '/src/other.html'
    if (unseen.length) {
        url = `https://www.reveddit.com/info?id=${unseen.join(',')}&removal_status=all`
    }
    addUnseenLink('other', false, `${unseen.length} / ${total}`, url)
}


function addUnseenLink(thing, isUser, unseen_str, url, $parent) {
    const $div = $(`<div><span class="unseen">${unseen_str} </span> </div>`)
    const $a = $(`<a class="blue-link" target="_blank" href="${url}">${thing}</a>`)
    $a.click((e) => {
        e.preventDefault()
        chrome.storage.sync.get(null, (storage) => {
            markThingAsSeen(storage, thing, isUser)
            setStorageUpdateBadge(storage)
            .then(res => {
                chrome.tabs.create({url: e.target.href})
                window.close() // closes the popup which persists in FF
            })
        })
    })
    $a.appendTo($div)
    $div.appendTo($parent || '#popup')
}
