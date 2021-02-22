import { getAllChanges, getItemFromLocalStorage } from './storage.js'
import { ChangeForStorage, LocalStorageItem, getPrettyDate, getPrettyTimeLength, alphaLowerSort, isComment } from './common.js'
import browser from 'webextension-polyfill'

const showChanges = (allChanges, localStorage) => {

    var table = $('<table>').addClass('history')
    var headersRow = $('<tr>')
    $('<th>').text('action').appendTo(headersRow)
    $('<th>').html('action observed time &#x25BC;').appendTo(headersRow)
    $('<th>').text('time between item creation and observed action').appendTo(headersRow)
    $('<th>').text('type').appendTo(headersRow)
    $('<th>').text('author').appendTo(headersRow)
    $('<th>').text('link').appendTo(headersRow)
    table.append(headersRow)
    allChanges.forEach(change => {
        const id = change.getID()
        const change_observedUTC = change.getObservedUTC()
        const action = change.getChangeType()
        const user = change.user
        let isUser = true
        if (user === 'other') {
            isUser = false
        }
        const item_localStorage = getItemFromLocalStorage(user, isUser, id, localStorage)
        let contentType = isComment(id) ? 'comment' : 'post'
        let text = id
        let timeLength = 'n/a'
        let formatted_createdUTC = ''
        if (item_localStorage) {
            const item_createdUTC = item_localStorage.getCreatedUTC()
            if (item_localStorage.getText().trim()) {
                text = item_localStorage.getText().trim()
            }
            timeLength = getPrettyTimeLength(change_observedUTC-item_createdUTC)
            formatted_createdUTC = new Date(item_createdUTC*1000)
        }
        var row = $('<tr>')
        //action
        $('<td>').addClass('action-column').append(`<span class="action ${action}">${action.replace(/ /g,'&nbsp;')}</span>`).appendTo(row)
        //observed
        const formatted_observedUTC = new Date(change_observedUTC*1000)
        $('<td>').attr('title',formatted_observedUTC).text(getPrettyDate(change_observedUTC)).appendTo(row)
        //duration
        $('<td>').attr('title',formatted_createdUTC).text(timeLength).appendTo(row)
        //type
        $('<td>').text(contentType).appendTo(row)
        //author
        $('<td>').text(user).appendTo(row)
        var href;
        if (isUser) {
            href = `https://www.reveddit.com/user/${user}?show=${id}&removal_status=all`
        } else {
            href = `https://www.reveddit.com/info?id=${id}&removal_status=all`
        }
        var linkedText = $('<a/>', {href:href, text: text})
        //link
        $('<td>').append(linkedText).appendTo(row)
        table.append(row)
    })
    table.appendTo('#tables')
}

getAllChanges(changesByUser => {
    chrome.storage.local.get(null, localStorage => {
        let numChanges = 0
        const allChanges = []
        Object.keys(changesByUser).forEach(user => {
            changesByUser[user].forEach(changeObj => {
                const change = new ChangeForStorage({object: changeObj})
                change.user = user
                allChanges.push(change)
            })
        })
        allChanges.sort((a,b) => {
            return b.getObservedUTC() - a.getObservedUTC()
        })

        if (allChanges.length > 0) {
            showChanges(allChanges, localStorage)
        } else {
            $('.legend').hide()
            $('<p>No actions observed since extension installation. Subscribe to a user or a post or comment to track changes.</p>').appendTo('#tables')
        }
    })
})
