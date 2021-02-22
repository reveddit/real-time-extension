import {alphaLowerSort, goToOptions, getFullIDsFromURL} from './common.js'
import {getSubscribedUsers_withSeenAndUnseenIDs,
        subscribeUser, unsubscribeUser, subscribeId, unsubscribeId,
        markThingAsSeen, setStorageUpdateBadge, markEverythingAsSeen} from './storage.js'
import {setCurrentStateForId} from './monitoring.js'
import browser from 'webextension-polyfill'


populatePopup()


function populatePopup() {
    $('#popup').empty()
    $(` <div id="switches"></div>
        <div id="rr-input">
            <input type="text" id="user" placeholder="username">
            <button id="rr-go">go</button>
        </div>
        <div style="clear:both"></div>
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

    getSubscribedUsers_withSeenAndUnseenIDs((users, storage) => {
        const other = users['other']
        delete users['other']
        if (Object.keys(users).length > 0) {
            $('<div class="num-unseen"># unseen</div>').appendTo('#popup')
        }
        Object.keys(users).forEach(user => {
            const unseenIDs = users[user]['unseen']
            displayUserInPopup(user, unseenIDs);
        })
        $('<hr>').appendTo('#popup')
        displayOtherInPopup(other['unseen'], Object.keys(storage.other_subscriptions).length)
        $('<hr>').appendTo('#popup')
        $('<a target="_blank" class="blue-link" id="go-to-history" href="/src/history.html">history</a>')
            .click(openAndClose).wrap('<div id="bottom">').parent().appendTo('#popup')
    })


    chrome.storage.sync.get(null, syncStorage => {
        /*console.log('sync storage:')
        Object.keys(syncStorage).forEach(key => {
            console.log(key)
            console.log(syncStorage[key])
        })*/

        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            const url = tabs[0].url
            if (url) {
                const [postID, commentID, user] = getFullIDsFromURL(url)
                if (commentID) {
                    showToggleSubscribe({comment: commentID}, syncStorage, url)
                }
                if (postID) {
                    showToggleSubscribe({post: postID}, syncStorage, url)
                }
                if (user) {
                    showToggleSubscribe({user: user}, syncStorage, url)
                }
            }
        })
    });

    var $input = $('#user');
    $input.focus();
    $input.bind("enterKey",function() {
        goUser();
    });
    $input.keyup(function(e) {
        if(e.keyCode == 13) $(this).trigger("enterKey");
    });

    $('#rr-go').click(function() {
        goUser();
    });
}

const openAndClose = (ev) => {
    window.open(ev.target.href)
    window.close()
}

function showToggleSubscribe({post: post, comment: comment, user: user}, storage, url) {
    let id = ''
    let type = ''
    let subFn = undefined, unsubFn = undefined
    if (comment) {
        id = comment
        type = 'comment'
    } else if (post) {
        id = post
        type = 'post'
    } else if (user) {
        id = user
        type = 'user'
    } else {
        return
    }
    if (comment || post) {
        subFn = subscribeId
        unsubFn = unsubscribeId
    } else {
        subFn = subscribeUser
        unsubFn = unsubscribeUser
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
        let fn = subFn
        if (! $input.prop('checked')) fn = unsubFn
        fn(id, () => {
            chrome.runtime.sendMessage({action: 'update-badge'})
            toggleLabelTextAndColor()
            if (fn === subFn && (comment || post)) {
                // marking state separately from the subscribe function b/c
                // otherwise one of the following happens:
                //   (1) chaining this makes the function a little slow
                //   (2) not chaining it will mess up sync state writes
                setCurrentStateForId(id, url, () => {
                    populatePopup()
                })
            } else {
                populatePopup()
            }
        })
    })
    if ((post || comment) && id in storage.other_subscriptions) {
        $input.prop('checked', true)
        toggleLabelTextAndColor()
    }
    if (user && user in storage.user_subscriptions) {
        $input.prop('checked', true)
        toggleLabelTextAndColor()
    }
    $textLabel.click((e) => {
        $input.prop('checked', !$input.prop('checked')).change()
    })
}

function goUser() {
    var user = $('#user').val().trim();
    if (user) {
        chrome.tabs.create({url: `https://www.reveddit.com/user/${user}`});
    }
}

function displayUserInPopup(user, unseen) {
    let params = ''
    if (unseen.length) {
        params = `?show=${unseen.join(',')}&removal_status=all`
    }
    const url = `https://www.reveddit.com/user/${user}${params}`
    addUnseenLink(user, true, `${unseen.length}`, url)
}

function displayOtherInPopup(unseen, total) {
    let url = '/src/other.html'
    if (unseen.length) {
        url = `https://www.reveddit.com/info?id=${unseen.join(',')}&removal_status=all`
    }
    addUnseenLink('other', false, `${unseen.length} / ${total}`, url)
}


function addUnseenLink(thing, isUser, unseen_str, url) {
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
    $div.appendTo('#popup')
}
