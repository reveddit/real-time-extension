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
        const seen_count = change.getSeenCount()
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
        let seen_text = ''
        if (seen_count) {
            seen_text = `<div class="seencount">seen ${seen_count}x</div>`
        }
        var row = $('<tr>')
        //action
        $('<td>').addClass('action-column').append(`<div class="action ${action}">${action.replace(/ /g,'&nbsp;')}</div>${seen_text}`).appendTo(row)
        //observed
        const formatted_observedUTC = new Date(change_observedUTC*1000)
        $('<td>').attr('title',formatted_observedUTC).text(getPrettyDate(change_observedUTC)).appendTo(row)
        //duration
        $('<td>').attr('title',formatted_createdUTC).text(timeLength).appendTo(row)
        //type
        $('<td>').text(contentType).appendTo(row)
        //author
        $('<td>').text(user).appendTo(row)
        // Always prefer direct Reddit links; resolve missing post IDs at click time via Reddit api/info
        const postId = item_localStorage && item_localStorage.getPostID && item_localStorage.getPostID()
        let href;
        if (isComment(id)) {
            if (postId) {
                const shortPost = postId.substring(3)
                const shortComment = id.substring(3)
                href = `https://www.reddit.com/comments/${shortPost}/-/${shortComment}?context=3`
            } else {
                href = '#'
            }
        } else {
            const shortPost = id.substring(3)
            href = `https://www.reddit.com/comments/${shortPost}`
        }
        var linkedText = $('<a/>', {href:href, text: text})
        if (isComment(id) && ! postId) {
            // Resolve post ID on click using Reddit's api/info, then redirect to the comment in context
            linkedText.on('click', function(e) {
                e.preventDefault()
                const apiJsonUrl = `https://www.reddit.com/api/info.json?id=${encodeURIComponent(id)}`
                const apiPageUrl = `https://www.reddit.com/api/info?id=${encodeURIComponent(id)}`
                fetch(apiJsonUrl, {credentials: 'omit'})
                .then(r => r.json())
                .then(json => {
                    const children = (json && json.data && Array.isArray(json.data.children)) ? json.data.children : []
                    const match = children.find(ch => ch && ch.data && ch.data.name === id) || (children[0] && children[0].data ? children[0] : null)
                    const data = match && match.data ? match.data : null
                    const linkId = data && (data.link_id || (data.parent_id && data.parent_id.substr(0,3) === 't3_' ? data.parent_id : null))
                    if (linkId && linkId.substr(0,3) === 't3_') {
                        const shortPost = linkId.substring(3)
                        const shortComment = id.substring(3)
                        const url = `https://www.reddit.com/comments/${shortPost}/-/${shortComment}?context=3`
                        window.location.href = url
                    } else {
                        // Last resort: guide user to Reddit api/info page (non-JSON)
                        window.location.href = apiPageUrl
                    }
                })
                .catch(() => {
                    window.location.href = `https://www.reddit.com/api/info?id=${encodeURIComponent(id)}`
                })
            })
        }
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
