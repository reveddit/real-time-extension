import { getFullIDsFromPath, REMOVED_BY_MODERATOR_TEXT, detectIsNewReddit, BELLS_CHANGED } from './common'
import {
    setTextAndFunction_subscribe,
    setTextAndFunction_unsubscribe,
    setTextAndFunction_disabledOwn,
    BELL_BUTTON,
} from './content-common'
import { placeForThisRun, ofThisRun, markThisRun, orphaned } from './run-token'
import { element, observe, findByText } from './dom-helpers'
import browser from 'webextension-polyfill'
import { subscribeUser, MAX_SUBSCRIPTIONS } from './storage'
import { initOwnProfileStatus, initOwnThreadStatus, loadOwnRemovedSets, stopWatchingOwnItems } from './own-status'
import { commentIdOf, ownPart } from './comment-dom'
import { classifyPostPage } from './parse_html/new'
import { getMarkupConfig } from './markup-config'
import { applyRemoteConfig } from './news'

const USER_DELETED = 'rev-user-deleted'
const MOD_REMOVED = 'rev-mod-removed'
const NEW_REDDIT_POST = 'shreddit-post'
const NEW_REDDIT_NOTE = 'rev-new-reddit-message-wrap'

export const redditModifications = async (
    other_subscriptions: Record<string, any>,
    hide_subscribe: boolean,
    subscribed_users_lowercase: string[],
    unsubscribed_users_lowercase: string[],
) => {
    // Everything below reads reddit's markup by the names in here
    await applyRemoteConfig().catch(() => {})
    const isNewReddit = detectIsNewReddit()
    if (isNewReddit) {
        showRemovalStatusOnPostPages()
    } else {
        showRemovalStatus({ isNewReddit })
    }

    // The user's own removed and locked items, marked on thread and profile pages
    const startPageFeatures = () => {
        stopWatchingOwnItems()
        const [postID, , user, subreddit] = getFullIDsFromPath(window.location.pathname)
        if (postID && subreddit) initOwnThreadStatus(isNewReddit)
        if (user) initOwnProfileStatus(user, isNewReddit)
    }
    startPageFeatures()
    // Reddit moves between its pages without loading a new document. The address
    // changes first, then a new main arrives, and on a first visit a post's
    // comments after it (verified 2026-11-04), so each arrival starts them again.
    if (isNewReddit) observe(document, 'main, shreddit-comment-tree', startPageFeatures)
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
                username,
            )
            observe(document, selector, element => {
                addSubscribeLinks_oldReddit([element as HTMLElement], other_subscriptions, username)
            })
        }
    } else {
        if (!hide_subscribe) addSubscribeButtons_newReddit(other_subscriptions)
        addDirectLinks_newReddit_comments()
    }
}

const removedByModeratorText = REMOVED_BY_MODERATOR_TEXT
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

// New reddit's pages have no robots meta. A post's own element holds reddit's
// banner instead, for visitors, other accounts and the author alike (verified
// 2026-11-04 on two removed posts and three live ones). That is the page's own
// answer, so it costs no request. Reddit can keep it from the author for about
// a day, when only monitoring knows, so the author's own record counts too. No
// banner clears nothing: the note just stays away. Reddit moves between its
// pages without loading a new document, so every page watches for posts. The
// banner has its own selector since it may arrive after its post.
const showRemovalStatusOnPostPages = () => {
    const bannerSlots = getMarkupConfig().postBannerSlots
    const selector = [NEW_REDDIT_POST, ...bannerSlots.map(s => `${NEW_REDDIT_POST} [slot="${s}"]`)].join(',')
    const check = (element: Element) => {
        const post = element.closest(NEW_REDDIT_POST)
        const [postID] = getFullIDsFromPath(window.location.pathname)
        if (!post || !postID) return
        const { status, banner, author } = classifyPostPage(post.outerHTML, postID)
        const show = () =>
            showRemovalStatus({ isNewReddit: true, target: post, postData: { is_robot_indexable: false, author } })
        if (banner) {
            show()
        } else if (status === 'live') {
            loadOwnRemovedSets(removed => {
                if (removed.has(postID)) show()
            })
        }
    }
    document.querySelectorAll(selector).forEach(check)
    observe(document, selector, check)
}

const showRemovalStatus = ({
    isNewReddit,
    target,
    postData = {},
}: {
    isNewReddit: boolean
    target?: Element
    postData?: Record<string, any>
}) => {
    const [postID, , user, subreddit] = getFullIDsFromPath(window.location.pathname)
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
                document.querySelector('span[slot="authorName"]')?.textContent?.trim() ||
                ''
            if (author === '[deleted]' || author === 'u/[deleted]') {
                className = USER_DELETED
                message_1 = `This post was either deleted by the person who posted it, or removed by a moderator and then deleted by the person who posted it.`
            } else {
                className = MOD_REMOVED
                message_1 = `This post is unapproved. It is either waiting to be approved, or it was removed by someone or some robot.`
            }
        }
    }

    if (message_1) {
        const place = subreddit ? `r/${subreddit}` : `u/${user}'s profile`
        const message_2 = ` It is not currently visible in ${place} and may not appear in web search results.`
        const link = (href: string, text: string) => {
            const a = element('a', '', text) as HTMLAnchorElement
            a.href = href
            return a
        }
        const options = link('#', 'Reveddit Real-Time')
        options.addEventListener('click', () => browser.runtime.sendMessage({ action: 'open-options' }))
        const from = element('div', 'rev-from', options, ' note')
        const post_path = window.location.pathname.split('/', 6).join('/')
        const reveddit_link = element(
            'p',
            '',
            link(`https://www.reveddit.com${post_path}/`, 'View the post on Reveddit.com'),
        )
        if (!isNewReddit) {
            const sh = link(`https://sh.reddit.com${post_path}/`, 'on new "sh" reddit')
            const text = element('p', '', message_1, ' View the post ', sh, ' for more details.', message_2)
            const infobar = element('div', `reddit-infobar md-container-small ${className}`, from)
            infobar.append(element('div', 'md', text, reveddit_link))
            document.querySelector('div.content[role="main"]')?.prepend(infobar)
        } else {
            const more = ' More details may appear in a message above from reddit.'
            const description = element('div', 'rev-new-reddit-message-content-description', message_1, more, message_2)
            const wrap = element('div', `${NEW_REDDIT_NOTE} ${className}`, from)
            wrap.append(element('div', 'rev-new-reddit-message-content', description, reveddit_link))
            wrap.dataset.post = postID
            // Reddit's back and forward buttons put a page's old elements back
            if (target && !document.querySelector(`.${NEW_REDDIT_NOTE}[data-post="${postID}"]`)) {
                target.after(wrap)
            }
        }
    }
}

// The logged-in user's own content is already monitored via their profile, and the
// "other" bucket can't reliably detect their own mod-removals anyway — so on their
// own comments the track button renders disabled with a tooltip explaining why
// (setTextAndFunction_disabledOwn), instead of silently doing the wrong thing.
// Fail open (normal button) if the author can't be determined.
const normalizeUser = (u: string | null | undefined): string => (u || '').trim().replace(/^u\//i, '').toLowerCase()
const isOwnComment = (author: string | null | undefined, loggedInUser: string | null | undefined): boolean => {
    const a = normalizeUser(author)
    const me = normalizeUser(loggedInUser)
    return !!a && !!me && a === me
}
// What a subscribe button says and does for an item, by whether it's followed
const setSubscribeButton = (
    element: HTMLElement,
    id: string,
    subscriptions: Record<string, any>,
    own: boolean,
    commentBody?: string,
    postId?: string,
): HTMLElement => {
    // Already tracked (e.g. from before) — keep unsubscribe available.
    if (id in subscriptions) return setTextAndFunction_unsubscribe(id, element, commentBody, postId, own)
    if (own) return setTextAndFunction_disabledOwn(element)
    return setTextAndFunction_subscribe(id, element, commentBody, postId)
}

// A comment's button takes a slot of its action row, and a post's takes the spare
// slot at the end of its action row: its share button's slot would push Share out
// of line. Reddit stamps a comment's row when the comment comes into view.
const addSubscribeButtons_newReddit = async (subscriptions: Record<string, any>) => {
    let followed = subscriptions
    let { last_logged_in_user: me } = (await browser.storage.local.get({ last_logged_in_user: '' })) as any
    // One bell for a row or post, ours from before if this run placed one
    const place = (host: Element, slot: string, id: string, own: boolean, body?: string, postId?: string) => {
        const placed = host.querySelector(':scope > .rev-comment-action') as HTMLElement | null
        if (ofThisRun(placed)) {
            setSubscribeButton(placed as HTMLElement, id, followed, own, body, postId)
            return
        }
        const bell = document.createElement('button')
        bell.slot = slot
        bell.className = `rev-btn rev-newreddit-action ${BELL_BUTTON}`
        setSubscribeButton(bell, id, followed, own, body, postId)
        placeForThisRun(host, bell, '.rev-comment-action')
    }
    // Only a profile's own lists are by its owner, not saved and the like, and
    // comments there name no author
    const profileOwner = () =>
        window.location.pathname.match(/^\/u(?:ser)?\/([^/]+)(?:\/(?:comments|overview)?\/?)?$/)?.[1]
    const addToRow = (row: Element) => {
        const comment = row.closest('shreddit-comment, shreddit-profile-comment')
        const id = commentIdOf(comment) || comment?.getAttribute('comment-id')
        if (!comment || !id || orphaned()) return
        const author = comment.getAttribute('author') || profileOwner()
        const postId = comment.getAttribute('postid') || getFullIDsFromPath(comment.getAttribute('href') || '')[0]
        const text =
            comment.localName === 'shreddit-comment'
                ? ownPart(comment, '[slot="comment"]')
                : comment.querySelector('.md')
        place(
            row,
            getMarkupConfig().commentButtonSlots[0],
            id,
            isOwnComment(author, me),
            text?.textContent || '',
            postId,
        )
    }
    const addToPost = (post: Element) => {
        const id = getMarkupConfig()
            .postIdAttributes.map(name => post.getAttribute(name))
            .find(value => value?.startsWith('t3_'))
        if (id && !orphaned()) place(post, getMarkupConfig().postButtonSlots[0], id, false)
    }
    const rows = 'shreddit-comment-action-row'
    const addToAll = () => {
        document.querySelectorAll(rows).forEach(addToRow)
        document.querySelectorAll(NEW_REDDIT_POST).forEach(addToPost)
    }
    // One document outlasts many pages here, unlike on old reddit, and bells
    // already on the page should say what's followed now. The background says
    // when that or the user changes (background.ts): a listener to storage here
    // would be handed every write the extension makes, in every Reddit tab.
    browser.runtime.onMessage.addListener((message: any) => {
        if (message?.action !== BELLS_CHANGED) return
        let redraw = false
        if ('followed' in message && JSON.stringify(message.followed) !== JSON.stringify(followed)) {
            followed = message.followed
            redraw = true
        }
        if ('me' in message && message.me !== me) {
            me = message.me
            redraw = true
        }
        if (redraw) addToAll()
    })
    addToAll()
    observe(document, rows, addToRow)
    observe(document, NEW_REDDIT_POST, addToPost)
}

const addSubscribeLinks_oldReddit = (
    elements: HTMLElement[],
    subscriptions: Record<string, any>,
    loggedInUser?: string | null,
) => {
    elements.forEach(element => {
        let id: string | null = element.getAttribute('data-fullname')
        // The comment's own post, for following it from a profile or the inbox
        const [postID, commentID] = getFullIDsFromPath(element.getAttribute('data-permalink') || '')
        if (!id) {
            if (commentID) {
                id = commentID
            } else if (postID) {
                id = postID
            }
        }
        if (!id) return
        const own = id.match(/^t1_/) && isOwnComment(element.getAttribute('data-author'), loggedInUser)
        // A post's sit under its title
        const buttons = element.querySelector(
            ':scope > .entry > ul.buttons, :scope > .entry > .top-matter > ul.buttons',
        )
        // A tab open through the update from 0.0.5.37 still has that run's scan-rev
        // link, ahead of the subscribe link and with its class
        const placed = buttons?.querySelector('.rev-comment-action:not(.rev-scan-comment-btn)')
        if (!buttons || ofThisRun(placed) || orphaned()) return
        placed?.closest('li')?.remove()
        let commentBody = ''
        const bodyElement = element.querySelector('.usertext-body')
        if (bodyElement && id.match(/^t1_/)) {
            commentBody = bodyElement.textContent || ''
        }

        const a = document.createElement('a')
        a.href = ''
        markThisRun(a)
        const li = document.createElement('li')
        li.appendChild(setSubscribeButton(a, id, subscriptions, !!own, commentBody, postID))
        buttons.appendChild(li)
    })
}
