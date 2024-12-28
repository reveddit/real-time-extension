import {getAuth, lookupItemsByID} from './requests.js'
import {getFullIDsFromPath} from './common.js'
import {setTextAndFunction_subscribe,setTextAndFunction_unsubscribe} from './content-common.js'
import browser from 'webextension-polyfill'
import {subscribeUser, MAX_SUBSCRIPTIONS} from './storage.js'

const USER_DELETED = 'rev-user-deleted'
const MOD_REMOVED = 'rev-mod-removed'
const id_match_comment = /^t1_.+/
const id_match_post = /^t3_.+/
const defaultNewRedditTarget = 'shreddit-post'

export const redditModifications = (other_subscriptions, hide_subscribe, monitor_quarantined, subscribed_users_lowercase, unsubscribed_users_lowercase) => {
    const isNewReddit = Boolean(document.querySelector('head').getAttribute('prefix'))
    ifThreadPage_showRemovalStatus(isNewReddit, monitor_quarantined)
    const subscribeIfNotUnsubscribed = (user) => {
        const user_lc = user.toLowerCase()
        if (subscribed_users_lowercase.length < MAX_SUBSCRIPTIONS &&
            ! subscribed_users_lowercase.includes(user_lc) &&
            ! unsubscribed_users_lowercase.includes(user_lc)) {
            subscribeUser(user)
        }
    }
    if ( ! isNewReddit ) {
        const username = $('#header .user a')[0]?.textContent
        if (username && ! username.match(/ /) && username.trim().toLowerCase() !== 'login') {
            subscribeIfNotUnsubscribed(username)
        }
        if (! hide_subscribe) {
            const selector = '.thing.link, .thing.comment'
            addSubscribeLinks_oldReddit($(selector), other_subscriptions)
            $(document).arrive(selector, (element) => {
                addSubscribeLinks_oldReddit([element], other_subscriptions)
            })
        }
    } else {
        const username = $('.header-user-dropdown span').toArray().map(x => x.textContent.trim()).filter(x => ! x.match(/ /))[0]
        if (username) {
            subscribeIfNotUnsubscribed(username)
        }
        if (! hide_subscribe) {
            let selector_comments = '.Comment'
            addSubscribeLinks_newReddit_comments($(selector_comments), other_subscriptions)
            $(document).arrive(selector_comments, (element) => {
                addSubscribeLinks_newReddit_comments([element], other_subscriptions)
            })
            const selector_posts = '.Post'
            addSubscribeLinks_newReddit_posts($(selector_posts), other_subscriptions)
            $(document).arrive(selector_posts, (element) => {
                addSubscribeLinks_newReddit_posts([element], other_subscriptions)
            })
        }
        addDirectLinks_newReddit_comments()
        const selector_newPost = '.Post div[data-test-id="post-content"]'
        $(document).arrive(selector_newPost, (element) => {
            showRemovalStatusForThreadOverlay(element, monitor_quarantined)
        })
    }
}

const removedByModeratorText = 'Comment removed by moderator'.toLowerCase().trim()
const directLink_class = 'RevedditLink'
const addDirectLinks_newReddit_comments = () => {
    const processList = (elements) => {
        for (const el of elements) {
            const closest_div_ancestor = $(el).closest('div').first()
            const revedditLink = $(closest_div_ancestor).parent().find(`.${directLink_class}`).length
            if (! revedditLink) {
                const redditLink = $(closest_div_ancestor).find('a[href^="https://www.reddit.com"]').first().attr('href')
                const url = new URL(redditLink)
                url.searchParams.set('utm_source', 'reveddit-rt')
                url.host = 'www.reveddit.com'
                const newEl = $(el).clone()
                $(newEl).html(`<a target="_blank" style="text-decoration: underline;" href="${url.toString()}">view on Reveddit</a>`)
                const wrap = $(`<div class="${directLink_class}">${$(newEl)[0].outerHTML}</div>`)
                wrap.insertAfter(closest_div_ancestor)
            }
        }
    }
    $(document).arrive('span', (element) => {
        if (element.textContent.toLowerCase().trim() === removedByModeratorText) {
            processList([element])
        }
    })
    const processCommentsOnPageLoad = () => {
        // this selector is not accessible to arrive.js
        processList($(`span:equalsi("${removedByModeratorText}")`))
    }
    processCommentsOnPageLoad()
    setTimeout(processCommentsOnPageLoad, 1000)
    setTimeout(processCommentsOnPageLoad, 5000)
    setTimeout(processCommentsOnPageLoad, 10000)
}

const ifThreadPage_showRemovalStatus = (isNewReddit, monitor_quarantined, newRedditTarget = defaultNewRedditTarget, postData = {}) => {
    const [postID, commentID, user, subreddit] = getFullIDsFromPath(window.location.pathname)
    // links to comments on new reddit do not have robots noindex,nofollow, so need to lookup data if haven't already
    // as of 2022/2023: older posts e.g. t3_9emzhp no longer have noindex,nofollow, so always need to look up data for new reddit
    if (isNewReddit && Object.keys(postData).length === 0) {
        browser.runtime.sendMessage({action: 'get-from-old', path: `/r/${subreddit}/comments/${postID.substring(3)}/`})
        .then(response => {
            if (! response) return
            showRemovalStatus({isNewReddit, newRedditTarget,
                postData: {
                    is_robot_indexable: ! response.is_removed,
                    ...response,
                }
            })
        })
        // Previous code here called 'get-reddit-items-by-id', but that now returns a 403
    } else {
        showRemovalStatus({isNewReddit, newRedditTarget, postData})
    }

}

const showRemovalStatus = ({isNewReddit, newRedditTarget = defaultNewRedditTarget, postData = {}}) => {
    const [postID, commentID, user, subreddit] = getFullIDsFromPath(window.location.pathname)
    let className = undefined, message_1 = undefined
    if (postID) {
        // Note: Do NOT add this here: meta[name="robots"][content="noindex"]
        // That shows up on all pages that are permalinks to comments
        if ($('meta[name="robots"][content="noindex,nofollow"]').length ||
            ('is_robot_indexable' in postData && ! postData.is_robot_indexable) ) {
            const author = postData.author || $('.link .top-matter .author').first().text() || $('.link .top-matter .tagline span:contains("[deleted]")').text() || $('.Post span:contains("u/[deleted]")').first().text() || $('span[slot="authorName"]').first().text().trim()
            if ((author === '[deleted]' || author === 'u/[deleted]') && postData.removed_by_category !== 'moderator') {
                className = USER_DELETED
                message_1 = `This post was either deleted by the person who posted it, or removed by a moderator and then deleted by the person who posted it.`
            } else {
                className = MOD_REMOVED
                message_1 = `This post is unapproved. It is either waiting to be approved, or it was removed by someone or some robot.`
            }
        }
    }

    if (message_1) {
        const optionsID = 'goto-options-from-content'
        const message_2 = ` It is not currently visible in r/${subreddit} and may not appear in web search results.`
        const from = `<div class="rev-from"><a id="${optionsID}" href="#">Reveddit Real-Time</a> note</div>`
        const post_path = window.location.pathname.split('/',6).join('/')
        const reveddit_link = `<p><a href="https://www.reveddit.com${post_path}/">View the post on Reveddit.com</a></p>`
        if (! isNewReddit) {
            message_1 += ` View the post <a href="https://sh.reddit.com${post_path}/">on new "sh" reddit</a> for more details.`
            const $html_message = $(`<div class="reddit-infobar md-container-small ${className}">`)
                .append(from)
                .append(`<div class="md"><p>${message_1}${message_2}</p>${reveddit_link}</div>`)
            $html_message.prependTo('div.content[role="main"]')
        } else {
            message_1 += ` More details may appear in a message above from reddit.`
            const $html_wrap = $(`<div class="rev-new-reddit-message-wrap ${className}">${from}</div>`)
            const $html_content = $(`<div class="rev-new-reddit-message-content"></div>`)
            const $html_description = $(`<div class="rev-new-reddit-message-content-description">${message_1}${message_2}</div>`)
            $html_content.append($html_description)
            $html_content.append(reveddit_link)
            $html_wrap.append($html_content)
            $(newRedditTarget).first().after($html_wrap)
        }
        $(`#${optionsID}`).click(() => browser.runtime.sendMessage({action: 'open-options'}))
    }
}

const showRemovalStatusForThreadOverlay = (element, monitor_quarantined) => {
    const [postID, commentID, user, subreddit] = getFullIDsFromPath(window.location.pathname)
    // built for Chrome, i.e., incognito mode is 'split' and CORB applies
    if (__BUILT_FOR__ === 'chrome') {
        browser.runtime.sendMessage({action: 'get-reddit-items-by-id', ids: [postID], monitor_quarantined})
        .then(response => {
            if (! response || ! response.items || ! response.items.length) return
            const postData = response.items[0].data
            ifThreadPage_showRemovalStatus(true, monitor_quarantined, element.parentNode, postData)
        })
    } else {
        // built for Firefox, i.e., incognito mode is 'spanning' and content scripts
        // are allowed to send cross-origin requests
        getAuth()
        .then(auth => {
            return lookupItemsByID([postID], auth, monitor_quarantined)
        })
        .then(items => {
            // if request fails, items is null
            if (! items) return
            const postData = items[0].data
            ifThreadPage_showRemovalStatus(true, monitor_quarantined, element.parentNode, postData)
        })
    }
}

const getID_newReddit = (element, id_match) => {
    let id = element.id
    if (id && id.match(id_match)) return id
    id = $(element).attr('class').split(/\s+/).filter(c => c.match(id_match))[0]
    if (id && id.match(id_match)) return id
    id = element.parentNode.id
    if (id && id.match(id_match)) return id
    id = $(element).closest('div[tabindex=-1]').attr('id')
    return id
}

const addSubscribeLinks_newReddit_comments = (elements, subscriptions) => {
    $(elements).each((idx, targetedElement) => {
        const element = $(targetedElement).closest('.Comment')[0]
        const id = getID_newReddit(element, id_match_comment)
        if (! id || ! id.match(id_match_comment)) return
        let $button = getButton(element, 'save')
        let appendButtonTo = $button.parent()
        if (! $button.length) {
            $button = getButton(element, 'share')
            appendButtonTo = $button.parent()
            // if (! $button.length) {
            //     $button = $('<button>...</button>')
            //     appendButtonTo = element
            // }
        }
        const $button_clone = $button.clone()
        let commentBody = ''
        const bodyElement = element.querySelector('.RichTextJSON-root')
        if (bodyElement) {
            commentBody = bodyElement.textContent
        }
        if (id in subscriptions) {
            setTextAndFunction_unsubscribe(id, $button_clone, commentBody).appendTo(appendButtonTo)
        } else {
            setTextAndFunction_subscribe(id, $button_clone, commentBody).appendTo(appendButtonTo)
        }
    })
}

const getButton = (element, button_search_text) => {
    return $(element).find(`button:equalsi("${button_search_text}")`).first()
}

const addSubscribeLinks_newReddit_posts = (elements, subscriptions) => {
    $(elements).each((idx, element) => {
        const id = getID_newReddit(element, id_match_post)
        if (! id || ! id.match(id_match_post)) return
        const $button = $(element).find('button :equalsi("save")').first().parent()
        const $button_clone = $button.clone()
        $button_clone.find('i.icon').first().parent().remove()
        const $last_button = $button.parent().children('button').last()
        if (id in subscriptions) {
            setTextAndFunction_unsubscribe(id, $button_clone).insertAfter($last_button)
        } else {
            setTextAndFunction_subscribe(id, $button_clone).insertAfter($last_button)
        }
    })
}

const addSubscribeLinks_oldReddit = (elements, subscriptions) => {
    $(elements).each((idx, element) => {
        let id = element.getAttribute('data-fullname')
        if (! id) {
            const [postID, commentID, user, subreddit] = getFullIDsFromPath(element.getAttribute('data-permalink') || '')
            if (commentID) {
                id = commentID
            } else if (postID) {
                id = postID
            }
        }
        if (! id) return
        const buttons = element.querySelector('ul.buttons')
        if (! buttons) return
        let commentBody = ''
        const bodyElement = element.querySelector('.usertext-body')
        if (bodyElement && id.match(/^t1_/)) {
            commentBody = bodyElement.textContent
        }

        let $newButton = setTextAndFunction_subscribe(id, $(`<a href="">`)[0], commentBody)
        if (id in subscriptions) {
            $newButton = setTextAndFunction_unsubscribe(id, $(`<a href="">`)[0], commentBody)
        }
        $(buttons).append($newButton.wrap('<li>').parent())
    })
}
