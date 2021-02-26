import {alphaLowerSort,showError,countUnseen_updateBadge_background,saveSubscriptions} from './common.js'
import {subscribeUser, unsubscribeUser, getOptions, INTERVAL_DEFAULT, saveOptions} from './storage.js'

import {setAlarm, ALARM_NAME} from './common.js'
import browser from 'webextension-polyfill'



getOptions((users, others, options) => {
    var sorted = users.sort(alphaLowerSort);
    displayOther()
    $.each(sorted, function (i,v) {
        displayUser(v);
    });
    $('#interval').val(options.interval);
    $('#clientid').val(options.custom_clientid);

    $('#removed_track').prop('checked', options.removal_status.track);
    $('#removed_notify').prop('checked', options.removal_status.notify);

    $('#locked_track').prop('checked', options.lock_status.track);
    $('#locked_notify').prop('checked', options.lock_status.notify);

    $('#hide_subscribe').prop('checked', options.hide_subscribe);
})

var $new = $('#new');

$new.bind("enterKey",addSubscriptionViaOptions);

$('#rr-opt-add').click(addSubscriptionViaOptions);

$('#rr-opt-save').click(saveAndCloseOptions);
$('#reset').click(resetDefaults);

$('#advanced-btn').click((ev) => {
    $('#advanced').show()
    $(ev.target).hide()
    return false
})

$new.keyup(function(e){
    if(e.keyCode == 13) $(this).trigger("enterKey");
});

['removed', 'locked'].forEach(type => {
    $(`#${type}_notify`).change(function() {
        if(this.checked) {
            $(`#${type}_track`).prop('checked', true)
        }
    });
    $(`#${type}_track`).change(function() {
        if(! this.checked) {
            $(`#${type}_notify`).prop('checked', false)
        }
    });
})

function resetDefaults() {
    $('#interval').val(INTERVAL_DEFAULT);
    $('#clientid').val('')
}

function saveAndCloseOptions() {
    const interval = Number($('#interval').val())
    const custom_clientid = $('#clientid').val().trim()
    const removed_track = $('#removed_track').prop('checked')
    const removed_notify = $('#removed_notify').prop('checked')

    const locked_track = $('#locked_track').prop('checked')
    const locked_notify = $('#locked_notify').prop('checked')

    const hide_subscribe = $('#hide_subscribe').prop('checked')

    if (Number.isInteger(interval) && interval > 0) {
        saveOptions(interval, custom_clientid, removed_track, removed_notify,
                    locked_track, locked_notify, hide_subscribe, () => {
            setAlarm(interval)
            chrome.runtime.sendMessage({action: 'update-badge'})
            window.close();
        })
    } else {
        showError("minutes between updates must be an integer", '#rr-opt-error');
    }

}

function addSubscriptionViaOptions() {
    var new_val = $new.val().trim();
    if (new_val) {
        subscribeUser(new_val, () => {
            displayUser(new_val);
            $new.val('');
        }, (errorMessage) => {
            showError(errorMessage, '#rr-opt-error')
        })
    }
}


function displayUser(user) {
    var $userDiv = $(`<div data-user="${user}"><a class="blue-link" target="_blank" href="https://www.reveddit.com/user/${user}">${user}</a> <a class="remove-subscription blue-link" href="#">remove</a></div>`).appendTo('#rr-subscriptions');
    $userDiv.find('.remove-subscription').click(removeSubscription);
}

function displayOther() {
    var $userDiv = $(`<div data-user="other"><a class="blue-link" target="_blank" href="/src/other.html">other</a></div><hr>`).appendTo('#rr-subscriptions');
}

function removeSubscription(e) {
    var user = $(e.target).parent().attr('data-user');
    $('.remove-subscription').off('click')
    unsubscribeUser(user, () => {
        $(e.target).parent().remove();
        chrome.runtime.sendMessage({action: 'update-badge'})
        $('.remove-subscription').click(removeSubscription)
    })

}
