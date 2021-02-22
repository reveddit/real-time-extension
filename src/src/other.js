import { getItemFromLocalStorage, unsubscribeId, getIDs_thing } from './storage.js'
import { getPrettyDate, isComment, sortDict_by_numberValuedAttribute } from './common.js'
import browser from 'webextension-polyfill'

const key = 'other_subscriptions'
chrome.storage.local.get(null, localStorage => {
    chrome.storage.sync.get(null, syncStorage => {
        const {unseen, seen} = getIDs_thing('other', false, syncStorage)
        const subscriptions = syncStorage.other_subscriptions
        $("<p>&bull; The maximum number of subscriptions is 100 items. If the maximum number is reached, the least recently subscribed items are bumped off the list.</p>").appendTo('#main')
        $("<p>&bull; Subscribing to a post only tracks changes to the post itself, not the post's comments.</p>").appendTo('#main')
        if (unseen.length || seen.length) {
            $(`<p><a href="https://www.reveddit.com/info?id=${$.unique($.merge(unseen, seen)).join(',')}&removal_status=all">View these items' current status on reveddit</a></p>`).appendTo('#main')
        }
        var table = $('<table>')
        var headersRow = $('<tr>')
        $('<th>').text('index').appendTo(headersRow)
        $('<th>').html('time subscribed &#x25BC;').appendTo(headersRow)
        $('<th>').text('item creation time').appendTo(headersRow)
        $('<th>').text('type').appendTo(headersRow)
        $('<th>').text('text and link').appendTo(headersRow)
        $('<th>').text('unsubscribe').appendTo(headersRow)
        table.append(headersRow)
        let index = 1
        sortDict_by_numberValuedAttribute(subscriptions, 't').forEach(([id, item]) => {
            const timeSubscribedUTC = item.t
            const row = $('<tr>')
            //index
            $('<td>').append(index).appendTo(row)
            const item_localStorage = getItemFromLocalStorage('other', false, id, localStorage)
            let contentType = isComment(id) ? 'comment' : 'post'
            let text = id
            let timeLength = 'n/a'
            const formatted_subscribedUTC = new Date(timeSubscribedUTC*1000)
            // time subscribed
            $('<td>').attr('title',formatted_subscribedUTC).text(getPrettyDate(timeSubscribedUTC)).appendTo(row)

            let createdUTC_pretty = 'n/a'
            let formatted_createdUTC = ''
            if (item_localStorage) {
                const item_createdUTC = item_localStorage.getCreatedUTC()
                if (item_localStorage.getText().trim()) {
                    text = item_localStorage.getText().trim()
                }
                createdUTC_pretty = getPrettyDate(item_createdUTC)
                formatted_createdUTC = new Date(item_createdUTC*1000)
            }
            //item creation time
            $('<td>').attr('title',formatted_createdUTC).text(createdUTC_pretty).appendTo(row)

            //type
            $('<td>').text(contentType).appendTo(row)

            const href = `https://www.reveddit.com/api/info?id=${id}&removal_status=all`
            const linkedText = $('<a/>', {href:href, text: text})
            //text
            $('<td>').append(linkedText).appendTo(row)

            const unsubscribeLink = $('<a/>', {
                class: 'link',
                text: 'unsubscribe',
                click: () => {
                    unsubscribeId(id, () => {
                        $(row).remove()
                    })
                }
            })
            $('<td>').append(unsubscribeLink).appendTo(row)
            table.append(row)
            index += 1
        })
        table.appendTo('#main')
        if (Object.keys(subscriptions).length === 0) {
            const text = (`<p>No "other" subscriptions yet. To subscribe,</p>
                            <ul>
                                <li>click "subscribe-rev" beneath any comment or post</li>
                                <li>right-click on a reddit or reveddit link and select "reveddit subscribe",</li>
                                <li>or, click the reveddit extension icon and click "subscribe" to subscribe to the current page item.</li>
                            </ul>`)
            $(text).appendTo('#main')
        }
    })
})
