import {getAuth, lookupItemsByID} from './requests.js'
import {getFullIDsFromPath} from './common.js'
import {setTextAndFunction_subscribe,setTextAndFunction_unsubscribe} from './content-common.js'

const USER_DELETED = 'rev-user-deleted'
const MOD_REMOVED = 'rev-mod-removed'
const id_match_comment = /^t1_.+/
const id_match_post = /^t3_.+/

export const redditModifications = (other_subscriptions) => {
    const isNewReddit = document.querySelector('#SHORTCUT_FOCUSABLE_DIV') !== null
    ifThreadPage_showRemovalStatus(isNewReddit)
    if ( ! isNewReddit ) {
        const selector = '.thing.link, .thing.comment'
        addSubscribeLinks_oldReddit($(selector), other_subscriptions)
        $(document).arrive(selector, (element) => {
            addSubscribeLinks_oldReddit([element], other_subscriptions)
        })
    } else {
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
        const selector_newPost = '.Post div[data-test-id="post-content"]'
        $(document).arrive(selector_newPost, (element) => {
            showRemovalStatusForThreadOverlay(element)
        })
    }
}

const ifThreadPage_showRemovalStatus = (isNewReddit, newRedditTarget = '.Post', postData = {}) => {
    const [postID, commentID, user, subreddit] = getFullIDsFromPath(window.location.pathname)
    // links to comments on new reddit do not have robots noindex,nofollow, so need to lookup data if haven't already
    if (isNewReddit && commentID && Object.keys(postData).length === 0) {
        browser.runtime.sendMessage({action: 'get-reddit-items-by-id', ids: [postID]})
        .then(response => {
            if (! response || ! response.items || ! response.items.length) return
            postData = response.items[0].data
            showRemovalStatus({isNewReddit, newRedditTarget, postData})
        })
    } else {
        showRemovalStatus({isNewReddit, newRedditTarget, postData})
    }

}

const showRemovalStatus = ({isNewReddit, newRedditTarget = '.Post', postData = {}}) => {
    const [postID, commentID, user, subreddit] = getFullIDsFromPath(window.location.pathname)
    let className = undefined, message_1 = undefined
    if (postID) {
        if ($('meta[name="robots"][content="noindex,nofollow"]').length ||
            ('is_robot_indexable' in postData && ! postData.is_robot_indexable) ) {
            const author = postData.author || $('.link .top-matter .author').first().text() || $('.link .top-matter .tagline span:contains("[deleted]")').text() || $('.Post span:contains("u/[deleted]")').first().text()
            if (author === '[deleted]' || author === 'u/[deleted]') {
                className = USER_DELETED
                message_1 = `This post was deleted by the person who posted it.`
            } else {
                className = MOD_REMOVED
                message_1 = `This post is unapproved. It is either waiting to be approved, or it was removed by someone or some robot.`
            }
        }
    }

    if (message_1) {
        const message_2 = ` It is not currently visible in r/${subreddit} and will not appear in web search results.`
        const from = '<div class="rev-from"><a href="https://www.reveddit.com/about">re(ve)ddit</a> note</div>'
        if (! isNewReddit) {
            if (className !== USER_DELETED) {
                message_1 += ` View the post <a href="https://new.reddit.com${window.location.pathname}">on new reddit</a> for more details.`
            }
            const $html_message = $(`<div class="reddit-infobar md-container-small ${className}">`)
                .append(from)
                .append(`<div class="md"><p>${message_1}${message_2}</p></div>`)
            $html_message.prependTo('div.content[role="main"]')
        } else {
            if (className !== USER_DELETED) {
                message_1 += ` More details may appear in a message above from reddit.`
            }
            const $html_wrap = $(`<div class="rev-new-reddit-message-wrap ${className}">${from}</div>`)
            const $html_content = $(`<div class="rev-new-reddit-message-content"></div>`)
            const $html_description = $(`<div class="rev-new-reddit-message-content-description">${message_1}${message_2}</div>`)
            $html_content.append($html_description)
            $html_wrap.append($html_content)
            $(newRedditTarget).first().after($html_wrap)
        }
    }
}

const showRemovalStatusForThreadOverlay = (element) => {
    const [postID, commentID, user, subreddit] = getFullIDsFromPath(window.location.pathname)
    // built for Chrome, i.e., incognito mode is 'split' and CORB applies
    if (__BUILT_FOR__ === 'chrome') {
        browser.runtime.sendMessage({action: 'get-reddit-items-by-id', ids: [postID]})
        .then(response => {
            if (! response || ! response.items || ! response.items.length) return
            const postData = response.items[0].data
            ifThreadPage_showRemovalStatus(true, element.parentNode, postData)
        })
    } else {
        // built for Firefox, i.e., incognito mode is 'spanning' and content scripts
        // are allowed to send cross-origin requests
        getAuth()
        .then(auth => {
            return lookupItemsByID([postID], auth)
        })
        .then(items => {
            // if request fails, items is null
            if (! items) return
            const postData = items[0].data
            ifThreadPage_showRemovalStatus(true, element.parentNode, postData)
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
            if (! $button.length) {
                $button = $('<button>...</button>')
                appendButtonTo = element
            }
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
