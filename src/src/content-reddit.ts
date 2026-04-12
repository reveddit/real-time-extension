import { getAuth, lookupItemsByID } from './requests'
import { getFullIDsFromPath } from './common'
import { setTextAndFunction_subscribe, setTextAndFunction_unsubscribe } from './content-common'
import { observe, findByText } from './dom-helpers'
import browser from 'webextension-polyfill'
import { subscribeUser, MAX_SUBSCRIPTIONS } from './storage'

const USER_DELETED = 'rev-user-deleted'
const MOD_REMOVED = 'rev-mod-removed'
const id_match_comment = /^t1_.+/
const id_match_post = /^t3_.+/
const defaultNewRedditTarget = 'shreddit-post'

export const redditModifications = (
    other_subscriptions: Record<string, any>,
    hide_subscribe: boolean,
    monitor_quarantined: boolean,
    subscribed_users_lowercase: string[],
    unsubscribed_users_lowercase: string[],
) => {
    const isNewReddit = Boolean(document.querySelector('head')?.getAttribute('prefix'))
    ifThreadPage_showRemovalStatus(isNewReddit, monitor_quarantined)
    const subscribeIfNotUnsubscribed = (user: string) => {
        const user_lc = user.toLowerCase()
        if (
            subscribed_users_lowercase.length < MAX_SUBSCRIPTIONS &&
            !subscribed_users_lowercase.includes(user_lc) &&
            !unsubscribed_users_lowercase.includes(user_lc)
        ) {
            subscribeUser(user)
        }
    }
    if (!isNewReddit) {
        const username = document.querySelector('#header .user a')?.textContent
        if (username && !username.match(/ /) && username.trim().toLowerCase() !== 'login') {
            subscribeIfNotUnsubscribed(username)
        }
        if (!hide_subscribe) {
            const selector = '.thing.link, .thing.comment'
            addSubscribeLinks_oldReddit(
                Array.from(document.querySelectorAll(selector)) as HTMLElement[],
                other_subscriptions,
            )
            observe(document, selector, element => {
                addSubscribeLinks_oldReddit([element as HTMLElement], other_subscriptions)
            })
        }
    } else {
        const username = Array.from(document.querySelectorAll('.header-user-dropdown span'))
            .map(x => (x.textContent || '').trim())
            .filter(x => !x.match(/ /))[0]
        if (username) {
            subscribeIfNotUnsubscribed(username)
        }
        if (!hide_subscribe) {
            let selector_comments = '.Comment'
            addSubscribeLinks_newReddit_comments(
                Array.from(document.querySelectorAll(selector_comments)) as HTMLElement[],
                other_subscriptions,
            )
            observe(document, selector_comments, element => {
                addSubscribeLinks_newReddit_comments([element as HTMLElement], other_subscriptions)
            })
            const selector_posts = '.Post'
            addSubscribeLinks_newReddit_posts(
                Array.from(document.querySelectorAll(selector_posts)) as HTMLElement[],
                other_subscriptions,
            )
            observe(document, selector_posts, element => {
                addSubscribeLinks_newReddit_posts([element as HTMLElement], other_subscriptions)
            })
        }
        addDirectLinks_newReddit_comments()
        const selector_newPost = '.Post div[data-test-id="post-content"]'
        observe(document, selector_newPost, element => {
            showRemovalStatusForThreadOverlay(element as HTMLElement, monitor_quarantined)
        })
    }
}

const removedByModeratorText = 'Comment removed by moderator'.toLowerCase().trim()
const directLink_class = 'RevedditLink'
const addDirectLinks_newReddit_comments = () => {
    const processList = (elements: Element[]) => {
        for (const el of elements) {
            const closest_div_ancestor = el.closest('div')
            if (!closest_div_ancestor) continue
            const parent = closest_div_ancestor.parentElement
            if (!parent) continue
            const revedditLink = parent.querySelectorAll(`.${directLink_class}`).length
            if (revedditLink) continue
            const redditLinkEl = closest_div_ancestor.querySelector('a[href^="https://www.reddit.com"]')
            const redditLink = redditLinkEl?.getAttribute('href')
            if (!redditLink) continue
            const url = new URL(redditLink)
            url.searchParams.set('utm_source', 'reveddit-rt')
            url.host = 'www.reveddit.com'

            const newEl = el.cloneNode(true) as HTMLElement
            const link = document.createElement('a')
            link.target = '_blank'
            link.style.textDecoration = 'underline'
            link.href = url.toString()
            link.textContent = 'view on Reveddit'
            newEl.textContent = ''
            newEl.appendChild(link)

            const wrap = document.createElement('div')
            wrap.className = directLink_class
            wrap.appendChild(newEl)
            closest_div_ancestor.after(wrap)
        }
    }
    observe(document, 'span', element => {
        if ((element.textContent || '').toLowerCase().trim() === removedByModeratorText) {
            processList([element])
        }
    })
    const processCommentsOnPageLoad = () => {
        processList(findByText(document, 'span', removedByModeratorText))
    }
    processCommentsOnPageLoad()
    setTimeout(processCommentsOnPageLoad, 1000)
    setTimeout(processCommentsOnPageLoad, 5000)
    setTimeout(processCommentsOnPageLoad, 10000)
}

const ifThreadPage_showRemovalStatus = (
    isNewReddit: boolean,
    monitor_quarantined: boolean,
    newRedditTarget: string | Element = defaultNewRedditTarget,
    postData: Record<string, any> = {},
) => {
    const [postID, , , subreddit] = getFullIDsFromPath(window.location.pathname)
    // links to comments on new reddit do not have robots noindex,nofollow, so need to lookup data if haven't already
    // as of 2022/2023: older posts e.g. t3_9emzhp no longer have noindex,nofollow, so always need to look up data for new reddit
    if (isNewReddit && Object.keys(postData).length === 0) {
        browser.runtime
            .sendMessage({ action: 'get-from-old', path: `/r/${subreddit}/comments/${postID!.substring(3)}/` })
            .then((response: any) => {
                if (!response) return
                showRemovalStatus({
                    isNewReddit,
                    newRedditTarget,
                    postData: {
                        is_robot_indexable: !response.is_removed,
                        ...response,
                    },
                })
            })
            .catch(() => {})
        // Previous code here called 'get-reddit-items-by-id', but that now returns a 403
    } else {
        showRemovalStatus({ isNewReddit, newRedditTarget, postData })
    }
}

const showRemovalStatus = ({
    isNewReddit,
    newRedditTarget = defaultNewRedditTarget,
    postData = {},
}: {
    isNewReddit: boolean
    newRedditTarget?: string | Element
    postData?: Record<string, any>
}) => {
    const [postID, , , subreddit] = getFullIDsFromPath(window.location.pathname)
    let className = undefined,
        message_1 = undefined
    if (postID) {
        if (
            document.querySelector('meta[name="robots"][content="noindex,nofollow"]') ||
            ('is_robot_indexable' in postData && !postData.is_robot_indexable)
        ) {
            const author =
                postData.author ||
                document.querySelector('.link .top-matter .author')?.textContent ||
                Array.from(document.querySelectorAll('.link .top-matter .tagline span')).find(el =>
                    el.textContent?.includes('[deleted]'),
                )?.textContent ||
                '' ||
                Array.from(document.querySelectorAll('.Post span')).find(el => el.textContent?.includes('u/[deleted]'))
                    ?.textContent ||
                document.querySelector('span[slot="authorName"]')?.textContent?.trim() ||
                ''
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
        const post_path = window.location.pathname.split('/', 6).join('/')
        const reveddit_link = `<p><a href="https://www.reveddit.com${post_path}/">View the post on Reveddit.com</a></p>`
        if (!isNewReddit) {
            message_1 += ` View the post <a href="https://sh.reddit.com${post_path}/">on new "sh" reddit</a> for more details.`
            const infobar = document.createElement('div')
            infobar.className = `reddit-infobar md-container-small ${className}`
            infobar.innerHTML = `${from}<div class="md"><p>${message_1}${message_2}</p>${reveddit_link}</div>`
            const contentMain = document.querySelector('div.content[role="main"]')
            if (contentMain) {
                contentMain.prepend(infobar)
            }
        } else {
            message_1 += ` More details may appear in a message above from reddit.`
            const wrap = document.createElement('div')
            wrap.className = `rev-new-reddit-message-wrap ${className}`
            wrap.innerHTML = `${from}<div class="rev-new-reddit-message-content"><div class="rev-new-reddit-message-content-description">${message_1}${message_2}</div>${reveddit_link}</div>`
            let target: Element | null
            if (typeof newRedditTarget === 'string') {
                target = document.querySelector(newRedditTarget)
            } else {
                target = newRedditTarget
            }
            if (target) {
                target.after(wrap)
            }
        }
        document
            .getElementById(optionsID)
            ?.addEventListener('click', () => browser.runtime.sendMessage({ action: 'open-options' }))
    }
}

const showRemovalStatusForThreadOverlay = (element: HTMLElement, monitor_quarantined: boolean) => {
    const [postID] = getFullIDsFromPath(window.location.pathname)
    // built for Chrome, i.e., incognito mode is 'split' and CORB applies
    if (__BUILT_FOR__ === 'chrome') {
        browser.runtime
            .sendMessage({ action: 'get-reddit-items-by-id', ids: [postID], monitor_quarantined })
            .then((response: any) => {
                if (!response || !response.items || !response.items.length) return
                const postData = response.items[0].data
                ifThreadPage_showRemovalStatus(true, monitor_quarantined, element.parentNode as Element, postData)
            })
            .catch(() => {})
    } else {
        // built for Firefox, i.e., incognito mode is 'spanning' and content scripts
        // are allowed to send cross-origin requests
        getAuth()
            .then(auth => {
                return lookupItemsByID([postID!], auth, monitor_quarantined)
            })
            .then(items => {
                // if request fails, items is null
                if (!items) return
                const postData = items[0].data
                ifThreadPage_showRemovalStatus(true, monitor_quarantined, element.parentNode as Element, postData)
            })
    }
}

const getID_newReddit = (element: HTMLElement, id_match: RegExp) => {
    let id: string = element.id
    if (id && id.match(id_match)) return id
    id = (element.className || '').split(/\s+/).filter(c => c.match(id_match))[0]
    if (id && id.match(id_match)) return id
    id = (element.parentNode as HTMLElement)?.id
    if (id && id.match(id_match)) return id
    id = element.closest('div[tabindex="-1"]')?.id || ''
    return id
}

const addSubscribeLinks_newReddit_comments = (elements: HTMLElement[], subscriptions: Record<string, any>) => {
    elements.forEach(targetedElement => {
        const element = targetedElement.closest('.Comment') as HTMLElement
        if (!element) return
        const id = getID_newReddit(element, id_match_comment)
        if (!id || !id.match(id_match_comment)) return
        let button = getButton(element, 'save')
        let appendButtonTo = button?.parentElement
        if (!button) {
            button = getButton(element, 'share')
            appendButtonTo = button?.parentElement
        }
        if (!button || !appendButtonTo) return
        const buttonClone = button.cloneNode(true) as HTMLElement
        let commentBody = ''
        const bodyElement = element.querySelector('.RichTextJSON-root')
        if (bodyElement) {
            commentBody = bodyElement.textContent || ''
        }
        if (id in subscriptions) {
            appendButtonTo.appendChild(setTextAndFunction_unsubscribe(id, buttonClone, commentBody))
        } else {
            appendButtonTo.appendChild(setTextAndFunction_subscribe(id, buttonClone, commentBody))
        }
    })
}

const getButton = (element: Element, button_search_text: string): Element | null => {
    return findByText(element, 'button', button_search_text)[0] || null
}

const addSubscribeLinks_newReddit_posts = (elements: HTMLElement[], subscriptions: Record<string, any>) => {
    elements.forEach(element => {
        const id = getID_newReddit(element, id_match_post)
        if (!id || !id.match(id_match_post)) return
        // Find a descendant of a button with text "save", then get its parent (the button)
        const allButtonDescendants = element.querySelectorAll('button *')
        const saveEl = Array.from(allButtonDescendants).find(
            el => (el.textContent || '').toLowerCase().trim() === 'save',
        )
        const button = saveEl?.parentElement
        if (!button) return
        const buttonClone = button.cloneNode(true) as HTMLElement
        const iconEl = buttonClone.querySelector('i.icon')
        if (iconEl?.parentElement) {
            iconEl.parentElement.remove()
        }
        const lastButton = Array.from(button.parentElement!.children)
            .filter(el => el.tagName === 'BUTTON')
            .pop()
        if (id in subscriptions) {
            const btn = setTextAndFunction_unsubscribe(id, buttonClone)
            if (lastButton) lastButton.after(btn)
        } else {
            const btn = setTextAndFunction_subscribe(id, buttonClone)
            if (lastButton) lastButton.after(btn)
        }
    })
}

const addSubscribeLinks_oldReddit = (elements: HTMLElement[], subscriptions: Record<string, any>) => {
    elements.forEach(element => {
        let id: string | null = element.getAttribute('data-fullname')
        if (!id) {
            const [postID, commentID] = getFullIDsFromPath(element.getAttribute('data-permalink') || '')
            if (commentID) {
                id = commentID
            } else if (postID) {
                id = postID
            }
        }
        if (!id) return
        const buttons = element.querySelector('ul.buttons')
        if (!buttons) return
        let commentBody = ''
        const bodyElement = element.querySelector('.usertext-body')
        if (bodyElement && id.match(/^t1_/)) {
            commentBody = bodyElement.textContent || ''
        }

        const a = document.createElement('a')
        a.href = ''
        let newButton: HTMLElement
        if (id in subscriptions) {
            newButton = setTextAndFunction_unsubscribe(id, a, commentBody)
        } else {
            newButton = setTextAndFunction_subscribe(id, a, commentBody)
        }
        const li = document.createElement('li')
        li.appendChild(newButton)
        buttons.appendChild(li)
    })
}
