import { markIDsAsSeenIfSubscribed } from './storage'
import { setTextAndFunction_subscribe, setTextAndFunction_unsubscribe } from './content-common'
import { observe } from './dom-helpers'

export const revdditModifications = (
    storage: Record<string, any>,
    user: string,
    isUserPage: boolean,
    isInfoPage: boolean,
) => {
    if (isUserPage || isInfoPage) {
        waitForAddedNode_withMinAttValue(
            'numItemsLoaded',
            document.querySelector('.main'),
            'data-numitemsloaded',
            1,
            () => {
                findIDsForUserAndMark(storage, user, isUserPage)
            },
        )
    }

    const selector_posts = '.post:not(.deleted)'
    const selector_comments = '.comment-body-and-links'
    observe(document, selector_comments, element => {
        addSubscribeLinks_revddit_comments([element as HTMLElement], storage.other_subscriptions)
    })
    addSubscribeLinks_revddit_comments(
        Array.from(document.querySelectorAll(selector_comments)) as HTMLElement[],
        storage.other_subscriptions,
    )
    observe(document, selector_posts, element => {
        addSubscribeLinks_revddit_posts([element as HTMLElement], storage.other_subscriptions)
    })
    setTimeout(() => {
        // this delay is necessary to make button appear on thread-page post items, not sure why
        addSubscribeLinks_revddit_posts(
            Array.from(document.querySelectorAll(selector_posts)) as HTMLElement[],
            storage.other_subscriptions,
        )
    }, 2000)
}

const addSubscribeLinks_revddit_comments = (elements: HTMLElement[], subscriptions: Record<string, any>) => {
    elements.forEach(targetedElement => {
        const element = targetedElement.parentElement
        if (!element || element.classList.contains('deleted')) return
        const id = element.id
        const links = element.querySelector('.comment-links')
        if (!links) return
        let commentBody = ''
        const bodyElement = element.querySelector('.comment-body')
        if (bodyElement && id.match(/^t1_/)) {
            commentBody = bodyElement.textContent || ''
        }
        const a = document.createElement('a')
        a.href = ''
        if (id in subscriptions) {
            placeSubscribeLink(links, setTextAndFunction_unsubscribe(id, a, commentBody))
        } else {
            placeSubscribeLink(links, setTextAndFunction_subscribe(id, a, commentBody))
        }
    })
}

const addSubscribeLinks_revddit_posts = (elements: HTMLElement[], subscriptions: Record<string, any>) => {
    elements.forEach(element => {
        const id = element.id
        const links = element.querySelector('.post-links')
        if (!links) return
        const a = document.createElement('a')
        a.href = ''
        if (id in subscriptions) {
            placeSubscribeLink(links, setTextAndFunction_unsubscribe(id, a))
        } else {
            placeSubscribeLink(links, setTextAndFunction_subscribe(id, a))
        }
    })
}

// A new run of this content script starts whenever the extension is reloaded or
// updated while a reveddit tab is open, and the previous run's links stay in the
// page with click handlers that no longer work. Each link carries its run's
// token: a later run replaces the old link instead of adding a second one, and a
// run that reaches the same item twice (the posts observer and the delayed pass
// below can both see it) keeps the link it already placed.
const RUN_TOKEN = Math.random().toString(36).slice(2)
const RUN_ATTRIBUTE = 'data-rev-subscribe-run'

export const placeSubscribeLink = (links: Element, link: HTMLElement, runToken = RUN_TOKEN) => {
    const placed = Array.from(links.children).filter(el => el.hasAttribute(RUN_ATTRIBUTE))
    if (placed.some(el => el.getAttribute(RUN_ATTRIBUTE) === runToken)) return
    placed.forEach(el => el.remove())
    link.setAttribute(RUN_ATTRIBUTE, runToken)
    links.appendChild(link)
}

function waitForAddedNode_withMinAttValue(
    id: string,
    parent: Element | null,
    attribute: string,
    minAttributeValue: number,
    done: () => void,
) {
    new MutationObserver(function (this: MutationObserver) {
        const el = document.getElementById(id)
        if (el && Number(el.getAttribute(attribute)) >= minAttributeValue) {
            this.disconnect()
            done()
        }
    }).observe(parent || document, {
        childList: true,
        subtree: true,
    })
}

function findIDsForUserAndMark(storage: Record<string, any>, user: string, isUserPage: boolean) {
    const seen_removed_ids = getIDsHashFromSelector('.comment.removed, .post.removed, .comment.deleted, .post.deleted')
    const seen_approved_ids = getIDsHashFromSelector('.comment:not(.removed), .post:not(.removed)')
    const seen_locked_ids = getIDsHashFromSelector('.comment.locked, .post.locked')
    const seen_unlocked_ids = getIDsHashFromSelector('.comment:not(.locked), .post:not(.locked)')
    markIDsAsSeenIfSubscribed(
        storage,
        user,
        isUserPage,
        seen_removed_ids,
        seen_approved_ids,
        seen_locked_ids,
        seen_unlocked_ids,
        () => {
            chrome.runtime.sendMessage({ action: 'update-badge' })
        },
    )
}

function getIDsHashFromSelector(selector: string) {
    const hash: Record<string, any> = {}
    document.querySelectorAll(selector).forEach(el => {
        const id = el.getAttribute('id')
        if (id) hash[id] = el.getAttribute('data-created_utc')
    })
    return hash
}
