import {markIDsAsSeenIfSubscribed} from './storage'
import {setTextAndFunction_subscribe,setTextAndFunction_unsubscribe} from './content-common'
import browser from 'webextension-polyfill'

const id_match = /^t[13]_.+/

export const revdditModifications = (storage: Record<string, any>, user: string, isUserPage: boolean, isInfoPage: boolean) => {
    if (isUserPage || isInfoPage) {
        waitForAddedNode_withMinAttValue('numItemsLoaded',
                                         document.querySelector('.main'),
                                         'data-numitemsloaded',
                                         1,
                                         () => {
                                             findIDsForUserAndMark(storage, user, isUserPage)
                                         })
    }

    const selector_posts = '.post:not(.deleted)'
    const selector_comments = '.comment-body-and-links'
    $(document).arrive(selector_comments, (element) => {
        addSubscribeLinks_revddit_comments([element], storage.other_subscriptions)
    })
    addSubscribeLinks_revddit_comments($(selector_comments), storage.other_subscriptions)
    $(document).arrive(selector_posts, (element) => {
        addSubscribeLinks_revddit_posts([element], storage.other_subscriptions)
    })
    setTimeout(() => { // this delay is necessary to make button appear on thread-page post items, not sure why
        addSubscribeLinks_revddit_posts($(selector_posts), storage.other_subscriptions)
    }, 2000)

}

const addSubscribeLinks_revddit_comments = (elements: any, subscriptions: Record<string, any>) => {
    $(elements).each((idx, targetedElement) => {
        const element = targetedElement.parentNode
        if (element.classList.contains('deleted')) return
        const id = element.id
        const links = element.querySelector('.comment-links')
        let commentBody = ''
        let bodyElement = element.querySelector('.comment-body')
        if (bodyElement && id.match(/^t1_/)) {
            commentBody = bodyElement.textContent
        }
        let $newLink = setTextAndFunction_subscribe(id, $(`<a href="">`)[0], commentBody)
        if (id in subscriptions) {
            $newLink = setTextAndFunction_unsubscribe(id, $(`<a href="">`)[0], commentBody)
        }
        $(links).append($newLink)
    })
}

const addSubscribeLinks_revddit_posts = (elements: any, subscriptions: Record<string, any>) => {
    $(elements).each((idx, element) => {
        const id = element.id
        const links = element.querySelector('.post-links')
        let $newLink = setTextAndFunction_subscribe(id, $(`<a href="">`)[0])
        if (id in subscriptions) {
            $newLink = setTextAndFunction_unsubscribe(id, $(`<a href="">`)[0])
        }
        $(links).append($newLink)
    })
}

function waitForAddedNode_withMinAttValue(id: string, parent: Element | null, attribute: string, minAttributeValue: number, done: () => void) {
    new MutationObserver(function(this: MutationObserver, mutations) {
        var el = document.getElementById(id);
        if (el && Number(el.getAttribute(attribute)) >= minAttributeValue) {
            this.disconnect();
            done();
        }
    }).observe(parent || document, {
        childList: true,
        subtree: true
    });
}

function findIDsForUserAndMark(storage: Record<string, any>, user: string, isUserPage: boolean) {
    const seen_removed_ids = getIDsHashFromSelector('.comment.removed, .post.removed, .comment.deleted, .post.deleted')
    const seen_approved_ids = getIDsHashFromSelector('.comment:not(.removed), .post:not(.removed)')
    const seen_locked_ids = getIDsHashFromSelector('.comment.locked, .post.locked')
    const seen_unlocked_ids = getIDsHashFromSelector('.comment:not(.locked), .post:not(.locked)')
    markIDsAsSeenIfSubscribed(storage, user, isUserPage,
                              seen_removed_ids,
                              seen_approved_ids,
                              seen_locked_ids,
                              seen_unlocked_ids,
                              () => {
        chrome.runtime.sendMessage({action: 'update-badge'})
    })
}

function getIDsHashFromSelector(selector: string) {
    const hash: Record<string, any> = {}
    $(selector).each(function() {
        const id = this.getAttribute('id')
        if (id) hash[id] = this.getAttribute('data-created_utc')
    })
    return hash
}
