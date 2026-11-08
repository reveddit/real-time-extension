import { lookupItemsByID } from './requests'
import {
    lookupItemsByLoggedInUserWithAuth,
    getAuth,
    getLoggedinUserDetailed,
    recordLoginDetectOutcome,
    isLoginRefusal,
    LoginDetectResult,
    whoIsSignedIn,
} from './reddit-auth'
import {
    recordCheckOutcome,
    lookupWarningToKeep,
    publicViewUncheckedReason,
    postRemovedByCategory,
} from './lookup-status'
import { storeRedditCookies } from './reddit-cookies'
import { isLegacyOff } from './legacy-lookup'
import {
    isCapabilityResting,
    noteCapabilityRefused,
    noteCapabilityWorked,
    noteRateLimited,
    isRateLimitedNow,
    flagIfRateLimited,
} from './request-gates'
import { readThreadItemLoggedIn, FOLLOWED_POST_IDS_KEY } from './followed-lookup'
import { withTimeout, canTabAnswer, isSupportedRedditTab } from './www-fetcher'
import { dlog } from './diaglog'
import { isViewerConnecting, recoverViewerConnect, hasRedditLoginCookie } from './viewer'
import {
    addLocalStorageItems,
    getLocalStorageItems,
    getPendingNotification,
    setPendingNotification,
    clearPendingNotification,
    appendNotificationLog,
    MAX_SYNC_STORAGE_CHANGES,
    SEEN_COUNT_DEFAULT,
    getObjectNamesForThing,
    getUserInit,
    subscribedThings,
    getOldestDateKey,
    notificationName,
    getNextPendingPosts,
    addToPendingPostQueue,
    removeFromPendingPostQueue,
    recordPendingPostAttempt,
    clearPendingPostAttempt,
    emptyPendingPostQueue,
    MAX_PENDING_POST_ATTEMPTS,
    getRateLimitBackoffRemainingMs,
    getUnseenIDs_thing,
    getBacklogSummaryState,
    markBacklogInitialNotified,
    markBacklogSummarySent,
    BACKLOG_SUMMARY_DELAY_MS,
    getNotifyFlags,
    getPublicLiveKey,
    fitStatusLists,
    syncItemBytes,
    PendingNotificationData,
    updateBadgeUnseenCount,
} from './storage'
import {
    REMOVED,
    DELETED,
    APPROVED,
    LOCKED,
    UNLOCKED,
    createNotification,
    isUserDeletedItem,
    isRemovedItem,
    isComment,
    ItemForStorage,
    LocalStorageItem,
    ChangeForStorage,
    CHANGE_TYPE_TEXT,
    setWarningBadge,
    getFullIDsFromURL,
    isOtherIdentity,
} from './common'
import browser from 'webextension-polyfill'
import { getPost_fromOld } from './parse_html/old'

const SUBSCRIBED_FROM_REDDIT = 0
const SUBSCRIBED_FROM_REVEDDIT = 1
const SUBSCRIBED_FROM_NA = 2

const TARGET_SEEN_COUNT_FOR_PREVIOUSLY_RECORDED_CHANGE = Math.floor(Math.random() * 60) + 60

// Require multiple consecutive observations of "removed" status before alerting,
// to prevent false removal notifications from transient API failures or intermittent responses.
// Randomized per extension instance (3-5 cycles) to thwart potential anti-extension fingerprinting.
const REMOVAL_CONFIRMATION_THRESHOLD = Math.floor(Math.random() * 3) + 3

const FULL_RESPONSE_ITEM_COUNT = 100

const BACKLOG_AGE_THRESHOLD_SECONDS = 48 * 60 * 60

// One side of a track: what this check read, its type, and the known list
interface TrackSide {
    current: string[]
    type: number
    known: Record<string, any>
}

interface MarkChangesContext {
    changes: any[]
    itemLookup: Record<string, any>
    newLocalStorageItems: Record<string, any>
    isUser: boolean
    subscribedFrom: number
    existingLocalStorageItems: Record<string, any>
    target_seen_count: number
    oldestDateThreshold: number | null
    skipConfirmationThreshold: boolean
}

interface MarkChangesResult {
    num_changes: number
    realtimeChanges: { count: number; changeTypes: string[]; ids: string[] }
    backlogCount: number
}

// Stores the oldest date a full listing of the user's items showed as the
// threshold and returns it, else null. Followed items have no listing. The
// check has read the stored date already, and most find it unchanged.
const updateOldestDateThreshold = (
    items: any[],
    itemLookup: Record<string, any>,
    thing: string,
    isUser: boolean,
    storedOldestDate: number | null,
): number | null => {
    if (!isUser || items.length < FULL_RESPONSE_ITEM_COUNT) {
        return null
    }

    const timestamps = items
        .map(itemWrap => {
            const item = itemWrap.data || itemLookup[itemWrap.name] || itemWrap
            return item.created_utc
        })
        .filter(ts => typeof ts === 'number' && ts > 0)

    if (timestamps.length === 0) {
        return null
    }

    timestamps.sort((a, b) => a - b)
    const oldestDate = timestamps[0]

    if (oldestDate !== storedOldestDate) {
        browser.storage.local.set({ [getOldestDateKey(thing, isUser)]: oldestDate })
    }
    return oldestDate
}

const getOldestDateThreshold = async (thing: string, isUser: boolean): Promise<number | null> => {
    if (!isUser) {
        return null
    }
    const key = getOldestDateKey(thing, isUser)
    return ((await browser.storage.local.get({ [key]: null })) as any)[key]
}

// Older than the oldest item a full listing showed: monitoring doesn't start
// keeping track of it
const isTooOld = (createdUtc: number | undefined, oldestDateThreshold: number | null) =>
    !!(oldestDateThreshold && createdUtc && createdUtc < oldestDateThreshold)

const PENDING_POST_BATCH_SIZE = 3
const PENDING_POST_DELAY_MS = 2000

// No "Scanning N posts" banner. Removed only when set: most cycles get here.
const clearPendingPostProgress = async () => {
    if (((await browser.storage.local.get({ pending_post_progress: null })) as any).pending_post_progress) {
        await browser.storage.local.remove('pending_post_progress')
    }
}

const processPendingPosts = async (storage: Record<string, any>) => {
    // Fed only by the legacy lookup chain (getItemsById_fromOldHTML): a queued
    // post's legacy page says whether it was removed, and its thread's JSON,
    // read with the user's login, gives its data (api/info.json is refused,
    // 2026-10-24). Either can rest after reddit refuses it.
    // Nothing queued can be read while the legacy pages are off or resting
    // (reddit has answered every one with its challenge since 2026-10-28), so
    // the queue empties: its banner would say "Scanning N posts" all along
    if (await isLegacyOff()) {
        await emptyPendingPostQueue()
        return
    }
    if (await isCapabilityResting('thread_json')) {
        // Nothing is being scanned, so no "Scanning N posts" progress either
        await clearPendingPostProgress()
        return
    }
    // After a 429 earlier in this cycle: the queue waits
    if (await isRateLimitedNow()) {
        return
    }
    const { posts, totalRemaining } = await getNextPendingPosts(PENDING_POST_BATCH_SIZE)
    if (posts.length === 0) {
        await clearPendingPostProgress()
        return
    }

    const totalAtStart = totalRemaining
    let processed = 0
    // The previous post's legacy page answered 403
    let refusedBefore = false

    for (const [index, postId] of posts.entries()) {
        const isAlreadyKnownRemoved = (() => {
            for (const { thing, isUser } of subscribedThings(storage.user_subscriptions || {})) {
                const keys = getObjectNamesForThing(thing, isUser)
                if (postId in (storage[keys['removed']] || {})) return true
            }
            return false
        })()

        if (isAlreadyKnownRemoved) {
            await removeFromPendingPostQueue(postId)
            await clearPendingPostAttempt(postId)
            processed++
            continue
        }

        // done: the post leaves the queue; retry: it stays where it is;
        // rotate: it goes to the back; wait: it stays, and this cycle's batch
        // ends (reddit refused or rate limited a request, or no login).
        // Attempts count only outcomes about the post itself, so a post that
        // never resolves stops being re-enqueued by the lookup fallback
        // (prevents a permanently "stuck" scan banner).
        let outcome: 'done' | 'retry' | 'rotate' | 'wait' = 'done'
        try {
            const postPath = '/comments/' + postId.substring(3) + '/'
            const result: any = await getPost_fromOld(postPath)
            if (result?.refused) {
                // The challenge reddit sends for every legacy page: they rest,
                // and the queue empties, as it does while they rest
                await noteCapabilityRefused('legacy', 'challenge page')
                await emptyPendingPostQueue()
                return
            } else if (result?.status === 403) {
                if (refusedBefore) {
                    // Two posts in a row: reddit refuses the legacy pages,
                    // which rest (the listing rests on its own), and the queue
                    // empties while they do
                    await noteCapabilityRefused('legacy', 'HTTP 403')
                    outcome = 'wait'
                } else {
                    // One post's 403 can be its own (a community only members
                    // can read): it moves to the back, and the next post says
                    // whether reddit refuses them all
                    refusedBefore = true
                    await recordPendingPostAttempt(postId)
                    outcome = 'rotate'
                }
            } else if (result?.status === 429) {
                noteRateLimited(new Error(String(result.error)))
                outcome = 'wait'
            } else {
                refusedBefore = false
                if (result && 'is_removed' in result) {
                    await noteCapabilityWorked('legacy')
                }
                if (result && 'is_removed' in result && result.is_removed) {
                    // Its data comes from its thread's JSON with the user's
                    // login. Logged out, reddit answers with its block page,
                    // which would rest the reads followed items need.
                    const read = (await hasRedditLoginCookie()) ? await readThreadItemLoggedIn(postId, postId) : null
                    if (!read) {
                        outcome = 'wait'
                    } else if (read.status === 429) {
                        noteRateLimited(new Error('www.reddit.com request failed: 429'))
                        outcome = 'wait'
                    } else if (read.blocked) {
                        if (read.refused) {
                            await noteCapabilityRefused('thread_json', 'block page')
                        }
                        outcome = 'wait'
                    } else if (read.data) {
                        const itemData = read.data
                        itemData.is_robot_indexable = false

                        const author = itemData.author
                        const isUser = storage.user_subscriptions && author in storage.user_subscriptions
                        const thing = isUser ? author : 'other'

                        console.log(`Detected removed post ${postId} (author: ${author}), updating status...`)

                        const itemLookup = { [postId]: itemData }

                        await checkForChanges_thing_byId(
                            [postId],
                            thing,
                            isUser,
                            null,
                            storage,
                            SUBSCRIBED_FROM_NA,
                            itemLookup,
                            [{ data: itemData }],
                            true,
                        )
                        await clearPendingPostAttempt(postId)
                    } else if ((await recordPendingPostAttempt(postId)) < MAX_PENDING_POST_ATTEMPTS) {
                        // A removal whose data didn't come back: read again next cycle
                        outcome = 'retry'
                    }
                } else {
                    await recordPendingPostAttempt(postId)
                    console.log(
                        result?.error
                            ? `Pending post lookup: ${postId}: no page (${result.error})`
                            : `Pending post lookup: ${postId} is not removed.`,
                    )
                }
            }
        } catch {
            await recordPendingPostAttempt(postId).catch(() => 0)
        }
        if (outcome === 'wait') {
            break
        }
        if (outcome === 'rotate') {
            // Re-added at the back unless it has used up its attempts
            await removeFromPendingPostQueue(postId)
            await addToPendingPostQueue([postId])
        } else if (outcome === 'done') {
            await removeFromPendingPostQueue(postId)
            processed++

            await browser.storage.local.set({
                pending_post_progress: {
                    processed: totalAtStart - totalRemaining + processed,
                    total: totalAtStart,
                    lastUpdated: Date.now(),
                },
            })
        }

        if (index < posts.length - 1 && _pendingPostTiming.delayMs > 0) {
            await new Promise(r => setTimeout(r, _pendingPostTiming.delayMs))
        }
    }

    const remainingAfter = totalRemaining - processed
    if (remainingAfter <= 0) {
        await browser.storage.local.remove('pending_post_progress')
    }
}
// For tests
export const _processPendingPosts = processPendingPosts
export const _pendingPostTiming = { delayMs: PENDING_POST_DELAY_MS }

// postId: the comment's post, when the page knows it (an old reddit comment's
// permalink); else the post the URL names. Every follow is of the item its URL
// names (popup, context menu) or of an item on the page (its buttons), and a
// thread page shows only its own comments, so that post is the comment's even
// when the URL focuses on another comment. Settles once the check has saved.
export const setCurrentStateForId = async (id: string, subscribedFromURL: string, postId?: string) => {
    // A followed comment's post: while api/info rests, the comment is read
    // through its thread, which needs it
    const post = postId || getFullIDsFromURL(subscribedFromURL || '')[0]
    if (id.startsWith('t1_') && post) {
        browser.storage.local
            .get({ [FOLLOWED_POST_IDS_KEY]: {} })
            .then((res: any) =>
                browser.storage.local.set({
                    [FOLLOWED_POST_IDS_KEY]: { ...res[FOLLOWED_POST_IDS_KEY], [id]: post.replace(/^t3_/, '') },
                }),
            )
            .catch(() => {})
    }
    // Not while a second account signs in: the browser's login is its. The
    // follow is saved, and the cycles check the item once that's over.
    if (await isViewerConnecting()) return
    let subscribedFrom = SUBSCRIBED_FROM_REDDIT
    if (subscribedFromURL.match(/^https:\/\/www.reveddit.com/)) {
        subscribedFrom = SUBSCRIBED_FROM_REVEDDIT
    }
    return browser.storage.sync
        .get(null)
        .then((storage: Record<string, any>) =>
            getAuth().then((auth: any) =>
                checkForChanges_thing_byId([id], 'other', false, auth, storage, subscribedFrom, {}),
            ),
        )
}

// Random jitter (0–10s) applied to periodic polls so they don't fire at a fixed
// instant each cycle, reducing the chance of coinciding with the user's own
// browsing and tripping Reddit's rate limit (429).
const POLL_JITTER_MAX_MS = 10000

// A manual "check now" (or a slow cycle meeting the next alarm) can otherwise
// start while the previous cycle is still mid-flight — issue #14's 5.15 log
// showed two interleaved cycles doubling the instantaneous request rate right
// before Reddit's first observed 429s. The window bounds staleness: a cycle
// that dies without reaching its done/catch marker (worker killed mid-cycle)
// must not wedge monitoring until the next worker restart.
let cycleStartedAtMs = 0
let cycleEndedAtMs = 0
// When the cycle's requests began: after the start jitter, which sends nothing
let cycleBusySinceMs = 0
const CYCLE_OVERLAP_WINDOW_MS = 3 * 60 * 1000

// The bridge (bridge.ts) yields to monitoring: it waits while a cycle's
// requests are running, using the same staleness window as the overlap guard.
export const isCycleInFlight = () =>
    cycleBusySinceMs > cycleEndedAtMs && Date.now() - cycleBusySinceMs < CYCLE_OVERLAP_WINDOW_MS

// A second account began signing in while a check ran. It's recorded before the
// user's login is set aside (viewer.ts), so what was sent went with the user's
// login, and the rest of the check waits for the next one.
const SIGN_IN_STARTED = new Error('a second account started signing in')
const stopIfSigningIn = async () => {
    if (await isViewerConnecting()) throw SIGN_IN_STARTED
}

export const checkForChanges = async (applyJitter = false, opts: { bypassBackoff?: boolean } = {}) => {
    const nowMs = Date.now()
    if (cycleStartedAtMs > cycleEndedAtMs && nowMs - cycleStartedAtMs < CYCLE_OVERLAP_WINDOW_MS) {
        dlog('cycle', '[reveddit] checkForChanges: previous cycle still running — skipping this trigger')
        return
    }
    // Claimed before anything is awaited, so a trigger meanwhile is skipped
    const startedAt = (cycleStartedAtMs = nowMs)
    // A cycle that a newer one overlapped doesn't end that one when it ends
    const endCycle = () => {
        if (cycleStartedAtMs === startedAt) cycleEndedAtMs = Date.now()
    }
    // A first step that fails ends the claim too, so the next trigger runs
    try {
        // A second account is signing in (viewer.ts): the browser holds its login,
        // not the user's, so nothing runs until that's over. A sign-in left too
        // long, or whose tab is gone, ends here.
        if (await isViewerConnecting()) {
            await recoverViewerConnect(whoIsSignedIn)
            if (await isViewerConnecting()) {
                dlog('cycle', '[reveddit] checkForChanges: skipping, a second account is signing in')
                endCycle()
                return
            }
        }
        // If Reddit recently rate-limited us, skip cycles until the backoff expires
        // rather than hammering and prolonging the lockout (see recordRateLimitHit).
        const backoffRemainingMs = await getRateLimitBackoffRemainingMs()
        if (backoffRemainingMs > 0) {
            if (!opts.bypassBackoff) {
                dlog(
                    'ratelimit',
                    `checkForChanges: skipping, rate-limit backoff ${Math.ceil(backoffRemainingMs / 1000)}s remaining`,
                )
                endCycle()
                return
            }
            // Manual "check now" from the options page: run anyway, but say so —
            // a paste showing a bypassed backoff reads very differently from one
            // showing a clean cycle.
            dlog(
                'ratelimit',
                `checkForChanges: running despite rate-limit backoff (${Math.ceil(backoffRemainingMs / 1000)}s remaining, manual)`,
            )
        }
        dlog('cycle', `[reveddit] checkForChanges: cycle start${opts.bypassBackoff ? ' (manual)' : ''}`)
        if (applyJitter) {
            await new Promise(r => setTimeout(r, Math.floor(Math.random() * POLL_JITTER_MAX_MS)))
            // One that began during the wait
            if (await isViewerConnecting()) {
                dlog('cycle', '[reveddit] checkForChanges: skipping, a second account is signing in')
                endCycle()
                return
            }
        }
    } catch (error: any) {
        endCycle()
        dlog('cycle', 'Error in checkForChanges:', String(error?.message || error))
        return
    }
    cycleBusySinceMs = Date.now()
    chrome.storage.sync.get(undefined as any, function (storage: Record<string, any>) {
        // A read the browser failed gives the check nothing to go on
        if (!storage) {
            endCycle()
            dlog(
                'cycle',
                'Error in checkForChanges: the synced data could not be read:',
                String((chrome.runtime as any)?.lastError?.message || 'no answer'),
            )
            return
        }
        const other = Object.keys(storage.other_subscriptions || {})
        const now = Math.floor(Date.now() / 1000)

        let cachedAuth: any
        getAuth()
            .then(async (auth: any) => {
                cachedAuth = auth
                await stopIfSigningIn()
                // Always check for logged-in user, regardless of subscription status
                return checkForChanges_loggedInUser(auth, storage)
            })
            .then(async () => {
                await stopIfSigningIn()
                // Also check other subscriptions if any exist
                if (other.length) {
                    return checkForChanges_other(cachedAuth, storage)
                }
            })
            .then(async () => {
                await stopIfSigningIn()
                // Process one pending post per alarm cycle (throttled)
                return processPendingPosts(storage)
            })
            .then(() => {
                chrome.storage.sync.set({ last_check: now })
                endCycle()
                dlog('cycle', '[reveddit] checkForChanges: cycle done')
                return maybeFireBacklogSummary(storage)
            })
            .catch(error => {
                endCycle()
                if (error === SIGN_IN_STARTED) {
                    dlog('cycle', '[reveddit] checkForChanges: stopped, a second account started signing in')
                    return
                }
                dlog('cycle', 'Error in checkForChanges:', String(error?.message || error))
                // Clear warning badge on error
                updateBadgeUnseenCount()
            })
    })
}

// Grace mode: when login detection is indeterminate (challenge page, 429) but a
// reddit session cookie is present and a user was previously detected, proceed
// with the cached username — the item lookups may run through a reddit tab's
// content script, which service-worker-only blocks don't reach.
const getGraceUser = async (): Promise<string | null> => {
    try {
        const local = (await browser.storage.local.get({ last_logged_in_user: '' })) as any
        const cached = local.last_logged_in_user
        if (!cached) {
            return null
        }
        return (await hasRedditLoginCookie()) ? String(cached) : null
    } catch {
        return null
    }
}

const checkForChanges_loggedInUser = async (auth: any, storage: Record<string, any>) => {
    // First get the current logged-in user — with failure class, so a broken
    // detection channel isn't mistaken for "logged out" and silently skipped.
    return getLoggedinUserDetailed()
        .then(async (detect: LoginDetectResult) => {
            // A sign-in that began meanwhile: the listing waits for the next check
            if (await isViewerConnecting()) return
            let loggedInUser: any = detect.user
            let usedGrace = false
            if (!loggedInUser && detect.indeterminate) {
                const graceUser = await getGraceUser()
                if (graceUser) {
                    dlog(
                        'auth',
                        `[reveddit] login detection indeterminate (${detect.reason}) — proceeding with cached user (grace mode)`,
                    )
                    loggedInUser = graceUser
                    usedGrace = true
                }
            }
            if (!loggedInUser) {
                if (detect.indeterminate) {
                    dlog('auth', `No logged-in user found, skipping user monitoring (indeterminate: ${detect.reason})`)
                } else {
                    dlog('auth', 'No logged-in user found, skipping user monitoring')
                    setWarningBadge('needs_user')
                }
                if (!detect.indeterminate || isLoginRefusal(detect.reason)) {
                    await recordLoginDetectOutcome(detect.indeterminate)
                }
                return
            }
            // A name is a definite answer, so the login check isn't being refused
            if (!usedGrace) await recordLoginDetectOutcome(false)
            // Remember the last detected logged-in user for popup display without
            // extra network calls. Grace mode skips the write: it only ever
            // echoes the stored value back, and a stale echo must not refresh it.
            try {
                if (!usedGrace) {
                    chrome.storage.local.set({ last_logged_in_user: loggedInUser })
                }
            } catch {
                /* ignored */
            }

            // Always monitor the currently logged-in user, regardless of subscription status
            // Ensure storage keys exist for the logged-in user
            const userInit = getUserInit(loggedInUser)
            chrome.storage.sync.get(Object.keys(userInit), existingKeys => {
                const keysToCreate: Record<string, any> = {}
                Object.keys(userInit).forEach(key => {
                    if (!(key in existingKeys)) {
                        keysToCreate[key] = userInit[key]
                    }
                })
                if (Object.keys(keysToCreate).length > 0) {
                    chrome.storage.sync.set(keysToCreate)
                }
            })

            // Only a pass that actually processed items may clear the warning
            // badge below; a failed or skipped lookup must not read as a clean cycle.
            let processedItems = false
            let listingRefused = false
            // The listing came back but says nothing either way
            let noNews = false
            const checkListing = async (listing: any) => {
                const ids: string[] = []
                const itemLookup: Record<string, any> = {}
                // An empty listing names nobody. That's a clean pass once the
                // login check names the user, and no news under the remembered
                // name: a user who has posted nothing gets one too.
                if (usedGrace && !listing.length) {
                    dlog('auth', '[reveddit] the listing is empty, which says nothing under the remembered name')
                    noNews = true
                    return
                }
                // Any other has to be the user's: grace mode has only the
                // remembered name, and a second account's sign-in can change
                // the browser's login while the cycle runs
                const isTheirs = (item: any) =>
                    String((item.data || item).author).toLowerCase() === String(loggedInUser).toLowerCase()
                if (listing.length && !listing.some(isTheirs)) {
                    dlog('auth', "[reveddit] the listing can't be taken for the user's, so it isn't checked")
                    return
                }
                ;(listing as any[]).forEach((item: any) => {
                    if (item.data && item.data.name) {
                        // format from reddit
                        item = item.data
                    }
                    ids.push(item.name)
                    itemLookup[item.name] = item
                })
                processedItems = true
                return checkForChanges_thing_byId(
                    ids,
                    loggedInUser,
                    true,
                    auth,
                    storage,
                    SUBSCRIBED_FROM_NA,
                    itemLookup,
                )
            }
            // Use message passing to get items from content script context
            return new Promise(resolve => {
                // Try to find a Reddit tab to make the request from
                chrome.tabs.query({ url: ['*://*.reddit.com/*'] }, tabs => {
                    if (!tabs?.length) {
                        // Use stored cookies as fallback (also when the query failed)
                        resolve('use_stored_cookies')
                        return
                    }

                    const supportedTabs = tabs.filter(tab => isSupportedRedditTab(tab) && !isOtherIdentity(tab))

                    if (supportedTabs.length === 0) {
                        dlog('cycle', 'No supported Reddit subdomains found (www.reddit.com or old.reddit.com)')
                        // Try to use stored cookies as fallback
                        resolve('use_stored_cookies')
                        return
                    }

                    // Store cookies for future use when no tabs are open
                    storeRedditCookies()

                    // Use the first supported Reddit tab that can answer
                    const tab = supportedTabs.find(canTabAnswer)
                    if (!tab) {
                        resolve('use_stored_cookies')
                        return
                    }

                    // One that never answers can't hold up the cycle either: it
                    // may have frozen since, or its fetch may have stalled
                    resolve(
                        withTimeout(
                            browser.tabs.sendMessage(tab.id!, { action: 'get-logged-in-user-items' }),
                            'the listing message',
                        ).catch(err => {
                            // No receiver, or no answer in time: the stored cookies' read decides
                            dlog('cycle', 'No answer from the reddit tab:', String(err?.message || err))
                            return 'use_stored_cookies'
                        }),
                    )
                })
            })
                .then(items => {
                    if (!items || (items as any).error) {
                        // The tab-side me.json fetch failed (429, block page,
                        // network). Do not record a clean pass: a 429 backs off
                        // like any other, anything else tries the stored-cookie
                        // path so the cycle still checks something.
                        const msg = String((items as any)?.error || 'no response')
                        const status = Number((msg.match(/status: (\d+)/) || [])[1])
                        dlog(
                            'cycle',
                            `tab-side me.json fetch failed (${msg}); ` +
                                (status === 429 ? 'backing off' : 'trying stored cookies'),
                        )
                        if (status) flagIfRateLimited(new Error(`me.json request failed: ${status}`))
                        if (status === 429) return
                        items = 'use_stored_cookies'
                    }

                    // Handle stored cookies case
                    if (items === 'use_stored_cookies') {
                        // Try to fetch items using stored cookies
                        return lookupItemsByLoggedInUserWithAuth().then(checkListing)
                    }

                    return checkListing(items)
                })
                .then(() => {
                    if (!processedItems) return
                    // The user's own listing came back, so their login works,
                    // even when the login check didn't answer
                    recordLoginDetectOutcome(false)
                    recordCheckOutcome(true)
                    // Clear warning badge and error state if we successfully
                    // processed items. A page-check, pagination or
                    // second-account thread-read outage outlives one pass:
                    // only its own recovery clears it.
                    return lookupWarningToKeep(loggedInUser).then(warning => {
                        if (warning) {
                            setWarningBadge(warning)
                            return
                        }
                        chrome.storage.local.remove('error_status', () => {
                            updateBadgeUnseenCount()
                        })
                    })
                })
                .catch(error => {
                    listingRefused = isLoginRefusal(String(error?.message))
                    throw error
                })
                .finally(async () => {
                    // Reddit refused the login check and the user's own listing
                    // too, so their login isn't working, whatever cookie is held
                    if (usedGrace && listingRefused && !processedItems) {
                        await recordLoginDetectOutcome(true)
                    }
                    // A rate limit already says it's why
                    if (!processedItems && !noNews && !(await isRateLimitedNow())) {
                        await recordCheckOutcome(false)
                    }
                })
        })
        .catch(error => {
            dlog('cycle', 'Error in checkForChanges_loggedInUser:', String(error?.message || error))
        })
}

// The user's items the logged-out view showed this pass, for the bridge
// (bridge.ts PUBLIC_LIVE_MAX_AGE_MS trusts it for 2 h). Written when the set
// changes, else every half hour, not on every 1-minute cycle.
const PUBLIC_LIVE_REFRESH_MS = 30 * 60 * 1000
const notePubliclyLive = async (user: string, ids: string[]) => {
    const key = getPublicLiveKey(user)
    const sorted = [...ids].sort()
    const stored = ((await browser.storage.local.get({ [key]: null })) as any)[key]
    const age = Date.now() - Number(stored?.t || 0)
    const storedIds: string[] = Array.isArray(stored?.ids) ? [...stored.ids].sort() : []
    const same = storedIds.length === sorted.length && storedIds.every((id, i) => id === sorted[i])
    if (same && age >= 0 && age < PUBLIC_LIVE_REFRESH_MS) {
        return
    }
    await browser.storage.local.set({ [key]: { ids: sorted, t: Date.now() } })
}

// What one lookup result says about removal. Quarantined, NSFW and
// private-community items never show logged out, so a result from the
// public-view comparison (_public_view) can't judge them
// (publicViewUncheckedReason). Those count as approved ('unchecked': bodies
// still get cached, no false removal alerts), except a removal already
// recorded, which stays as recorded until they can be checked again ('skip')
// rather than reading as approved. A post's own author view is that check
// when it showed the removal (removed_by_category, marked a: 1 in the entry):
// once it stops showing it, the post counts as approved again. The legacy
// paths can see this content, so their results are read as they are.
export const readLookupResult = (
    item: any,
    authItem: any,
    knownRemoved: { a?: number } | undefined,
): 'removed' | 'approved' | 'unchecked' | 'skip' => {
    if (item._public_view && authItem && publicViewUncheckedReason(item.name, authItem)) {
        return knownRemoved && !knownRemoved.a ? 'skip' : 'unchecked'
    }
    return isRemovedItem(item) ? 'removed' : 'approved'
}

// Shows a notification of changes, keeps it as pending until it shows, and logs it either way
const announce = (thing: string, name: string, pending: PendingNotificationData, source: 'recent' | 'retry') => {
    const message = `${pending.count} new [${pending.types.join(', ')}] actions, click to view`
    createNotification({
        notificationId: name,
        title: thing,
        message,
    }).then(success => {
        if (success) clearPendingNotification(name).catch(() => {})
    })
    setPendingNotification(name, pending).catch(() => {})
    appendNotificationLog({
        ts: Date.now(),
        id: thing,
        title: thing,
        message,
        itemIds: pending.itemIds,
        source,
    }).catch(() => {})
}

// Returns the lookup, so the cycle (and the bridge's wait on it) lasts until it
// ends. Its failure is logged here: reaching the cycle's catch would skip the
// pending posts and last_check, and reset the badge a warning had set.
function checkForChanges_other(auth: any, storage: Record<string, any>) {
    const ids = Object.keys(storage.other_subscriptions)
    if (ids.length) {
        return checkForChanges_thing_byId(ids, 'other', false, auth, storage, SUBSCRIBED_FROM_NA).catch(error => {
            dlog('cycle', 'Error checking followed items:', String(error?.message || error))
        })
    }
}

const checkForChanges_thing_byId = async (
    ids: string[],
    thing: string,
    isUser: boolean,
    auth: any,
    storage: Record<string, any>,
    subscribedFrom: number,
    itemLookup: Record<string, any> = {},
    preFetchedItems: any[] | null = null,
    skipConfirmationThreshold = false,
) => {
    let promise
    const monitor_quarantined = storage.options.monitor_quarantined
    // For user-tracked lookups, `thing` is the username — the www.reddit.com
    // public-profile comparison needs it. The public HTML lacks locked/created_utc,
    // so carry those per-item from the authenticated view (itemLookup).
    const username = isUser ? thing : ''
    const authItemsMeta: Record<string, any> = {}
    if (isUser) {
        const knownRemovedHash = storage[getObjectNamesForThing(thing, isUser)['removed']] || {}
        // The user's records, read to tell the lookup which removals are being
        // confirmed. A check that overlaps this one may save them while the
        // lookup runs, so they're read again after it.
        let records: Record<string, any> | undefined
        let oldestDateThreshold: number | null = null
        if (!preFetchedItems && storage.options.removal_status.track) {
            ;[records, oldestDateThreshold] = (await Promise.all([
                getLocalStorageItems(thing, isUser),
                getOldestDateThreshold(thing, isUser),
            ])) as [any, any]
        }
        for (const [name, authItem] of Object.entries(itemLookup)) {
            const recorded = name in knownRemovedHash
            authItemsMeta[name] = {
                locked: !!authItem.locked,
                created_utc: authItem.created_utc,
                // Positive removal signals from the author's own view — used to
                // confirm post removals the public feed hides during the grace period.
                is_robot_indexable: authItem.is_robot_indexable,
                removed_by_category: authItem.removed_by_category,
                // For verifying feed-absent comments against their own logged-out
                // page (profile-hidden subreddits vanish from the public feed).
                permalink: authItem.permalink,
                link_id: authItem.link_id,
                // Publicly-invisible classes — lets the lookup skip unverifiable
                // page fetches for them.
                quarantine: !!authItem.quarantine,
                over_18: !!authItem.over_18,
                subreddit_type: authItem.subreddit_type,
                // Removed posts can linger in the public feed long past creation
                // age — feed presence must not flip a recorded removal back to
                // approved without a page verdict.
                known_removed: recorded,
                // Its removal is being counted (r, markChanges) and isn't
                // recorded yet, which it still can be
                confirming: !recorded && records?.[name]?.r > 0 && !isTooOld(authItem.created_utc, oldestDateThreshold),
                // Whoever the browser is signed in as (lookupItemsByID)
                author: authItem.author,
            }
        }
    }
    if (preFetchedItems) {
        promise = Promise.resolve(preFetchedItems)
    } else if (location.protocol.match(/^http/)) {
        // this condition is for when the code is activated via a content script (e.g. the subscribe button) and browser.cookies is unavailable
        promise = browser.runtime.sendMessage({
            action: 'get-reddit-items-by-id',
            ids,
            monitor_quarantined,
            username,
            authItemsMeta,
        })
    } else {
        promise = lookupItemsByID(ids, auth, monitor_quarantined, username, authItemsMeta)
    }
    return promise.then(async result => {
        if (!result) return // handle expected errors
        const found = Array.isArray(result) ? result : result.items
        if (!found) return // handle expected errors from obj
        const removal_status = storage.options.removal_status
        const lock_status = storage.options.lock_status
        const target_seen_count = storage.options.seen_count || SEEN_COUNT_DEFAULT
        const keys = getObjectNamesForThing(thing, isUser)
        const notification = notificationName(thing, isUser)
        // Local storage is read first, so that nothing waits between the
        // lists' re-read below and their save: a save made elsewhere in
        // between would be lost
        const [existingLocalStorageItems, storedOldestDate]: [any, any] = await Promise.all([
            getLocalStorageItems(thing, isUser),
            getOldestDateThreshold(thing, isUser),
        ])
        // The user, a reveddit page or another check may have saved while the
        // lookup ran. So what this check compares and saves is read again, into
        // storage, which the cycle's later checks size their saves by. If that
        // read fails, it goes on with the copy it has.
        const followedBefore = storage.other_subscriptions || {}
        const savedKeys = [...Object.values(keys), ...(isUser ? [] : ['other_subscriptions'])]
        const saved = await browser.storage.sync.get(savedKeys).catch(() => null)
        if (saved) {
            for (const key of savedKeys) storage[key] = saved[key]
        }
        // Nothing about an item unfollowed since then is saved or told
        const isUnfollowed = (name: string) => name in followedBefore && !(name in (storage.other_subscriptions || {}))
        const items = isUser ? found : found.filter((itemWrap: any) => !isUnfollowed(itemWrap.data.name))

        const known_removed = storage[keys['removed']] || {}
        const known_approved = storage[keys['approved']] || {}
        const known_locked = storage[keys['locked']] || {}
        const known_unlocked = storage[keys['unlocked']] || {}
        const changes = storage[keys['changes']] || []
        if (!isUser) {
            itemLookup = {}
        }
        const removed: string[] = [],
            approved: string[] = [],
            locked: string[] = [],
            unlocked: string[] = [],
            // seen live in the logged-out view this pass
            publiclyLive: string[] = []
        items.forEach((itemWrap: any) => {
            const item = itemWrap.data
            if (!isUser) {
                itemLookup[item.name] = item
            }
            const authItem = isUser ? itemLookup[item.name] : null
            const reading = readLookupResult(item, authItem, known_removed[item.name])
            if (reading === 'removed') {
                removed.push(item.name)
            } else if (reading === 'unchecked') {
                approved.push(item.name)
            } else if (reading === 'approved') {
                approved.push(item.name)
                // A post still owed a page read (young, or once seen held) may
                // be held or spam-filtered while it still shows in the feed
                if (item._public_view && !item._public_view_unverified) {
                    publiclyLive.push(item.name)
                }
            }
            if (item.locked) {
                locked.push(item.name)
            } else {
                unlocked.push(item.name)
            }
        })

        if (isUser && items.some((itemWrap: any) => itemWrap.data?._public_view)) {
            notePubliclyLive(thing, publiclyLive).catch(() => {})
        }

        const oldestDateThreshold =
            updateOldestDateThreshold(items, itemLookup, thing, isUser, storedOldestDate) ?? storedOldestDate

        // mark items that do not exist in arrays
        // change happens if:
        //      tracking removals && item is removed
        //      tracking removals && item was in removed, now in approved
        const newLocalStorageItems: Record<string, any> = {}

        let num_changes = 0
        const mergedRealtime: { count: number; changeTypes: string[]; ids: string[] } = {
            count: 0,
            changeTypes: [],
            ids: [],
        }
        let backlogCount = 0
        const mergeResult = (r: MarkChangesResult) => {
            num_changes += r.num_changes
            mergedRealtime.count += r.realtimeChanges.count
            mergedRealtime.ids.push(...r.realtimeChanges.ids)
            backlogCount += r.backlogCount
            for (const t of r.realtimeChanges.changeTypes) {
                if (!mergedRealtime.changeTypes.includes(t)) mergedRealtime.changeTypes.push(t)
            }
        }
        const context: MarkChangesContext = {
            changes,
            itemLookup,
            newLocalStorageItems,
            isUser,
            subscribedFrom,
            existingLocalStorageItems,
            target_seen_count,
            oldestDateThreshold,
            skipConfirmationThreshold,
        }
        if (removal_status.track) {
            mergeResult(
                markChanges(
                    { current: removed, type: REMOVED, known: known_removed },
                    { current: approved, type: APPROVED, known: known_approved },
                    removal_status.notify,
                    context,
                ),
            )
        }
        if (lock_status.track) {
            mergeResult(
                markChanges(
                    { current: locked, type: LOCKED, known: known_locked },
                    { current: unlocked, type: UNLOCKED, known: known_unlocked },
                    lock_status.notify,
                    context,
                ),
            )
        }
        console.log('[debug] post-markChanges', {
            thing,
            isUser,
            subscribedFrom,
            removed: removed.length,
            approved: approved.length,
            locked: locked.length,
            unlocked: unlocked.length,
            known_removed: Object.keys(known_removed).length,
            known_approved: Object.keys(known_approved).length,
            existingLS: Object.keys(existingLocalStorageItems || {}).length,
            num_changes,
            realtimeCount: mergedRealtime.count,
            backlogCount,
        })
        if (mergedRealtime.count > 0) {
            console.log(
                `Creating realtime notification for ${thing}: ${mergedRealtime.count} changes of type ${mergedRealtime.changeTypes.join(', ')}`,
            )
            announce(
                thing,
                notification,
                {
                    count: mergedRealtime.count,
                    types: mergedRealtime.changeTypes,
                    itemIds: mergedRealtime.ids,
                    firstAttemptAt: Date.now(),
                    attempts: 1,
                },
                'recent',
            )
        }
        if (backlogCount > 0) {
            console.log(`Backlog for ${thing}: ${backlogCount} older changes collected (badge-only, no notification)`)
        }
        if (num_changes === 0) {
            // No new changes this cycle — but retry any pending
            // notification from a prior cycle that may have silently
            // failed to display (e.g. install-time on Firefox Android).
            const unseen = getUnseenIDs_thing(thing, isUser, storage)
            getPendingNotification(notification)
                .then(pending => {
                    if (!pending) return
                    // The user turned notifications off after this entry
                    // was queued, or has seen its items since (Mark all
                    // seen, a reveddit page) — drop it rather than retry.
                    // The badge still counts what's unseen.
                    if (
                        (!removal_status.notify && !lock_status.notify) ||
                        !pending.itemIds?.some(id => unseen.includes(id))
                    ) {
                        clearPendingNotification(notification).catch(() => {})
                        return
                    }
                    const MAX_RETRY_ATTEMPTS = 5
                    if (pending.attempts >= MAX_RETRY_ATTEMPTS) return
                    const MIN_RETRY_DELAY_MS = 2 * 60 * 1000
                    if (Date.now() - pending.firstAttemptAt < MIN_RETRY_DELAY_MS) return
                    console.log(`Retrying pending notification for ${thing} (attempt ${pending.attempts + 1})`)
                    announce(thing, notification, { ...pending, attempts: pending.attempts + 1 }, 'retry')
                })
                .catch(() => {})
        }
        const toSave = fitStatusLists(
            {
                [keys['removed']]: known_removed,
                [keys['approved']]: known_approved,
                [keys['locked']]: known_locked,
                [keys['unlocked']]: known_unlocked,
            },
            storage,
            keys,
            // 100 entries come to about 5 KB, well inside one item
            { [keys['changes']]: changes.slice(-MAX_SYNC_STORAGE_CHANGES) },
        )
        await browser.storage.sync.set(toSave).catch(err => {
            // A refused save is otherwise silent, and the next check
            // announces its changes again (issue #15)
            const sizes = Object.entries(toSave)
                .map(([key, value]) => `${key} ${syncItemBytes(key, value)}`)
                .join(', ')
            dlog('cycle', `[reveddit] sync save refused (${String(err?.message || err)}): ${sizes}`)
        })
        updateBadgeUnseenCount()
        console.log('[debug] addLocalStorageItems', {
            thing,
            isUser,
            keys: Object.keys(newLocalStorageItems),
            sample: Object.keys(newLocalStorageItems)
                .slice(0, 2)
                .map(k => ({
                    id: k,
                    t: newLocalStorageItems[k]?.t?.slice(0, 60),
                })),
        })
        return addLocalStorageItems(newLocalStorageItems, thing, isUser)
    })
}
// For tests
export const _checkForChanges_thing_byId = checkForChanges_thing_byId

const changeIsPreviouslyRecorded = (name: string, change_type: number | string, changes: any[]) => {
    for (const change of changes) {
        let change_obj = change
        if (!(change_obj instanceof ChangeForStorage)) {
            change_obj = new ChangeForStorage({ object: change })
        }
        if (change_obj.getID() === name && change_type === change_obj.g) {
            return true
        }
    }
    return false
}

// newLocalStorageItems operates as a return value
function markChanges(
    alert: TrackSide,
    normal: TrackSide,
    notify: boolean,
    {
        changes,
        itemLookup,
        newLocalStorageItems,
        isUser,
        subscribedFrom,
        existingLocalStorageItems,
        target_seen_count,
        oldestDateThreshold,
        skipConfirmationThreshold,
    }: MarkChangesContext,
) {
    const { current: alert_current_list, type: alert_type, known: alert_known_hash } = alert
    const { current: normal_current_list, type: normal_type, known: normal_known_hash } = normal
    const alert_unseen_ids: string[] = [],
        normal_unseen_ids: string[] = [],
        alert_userDeleted_unseen_ids: string[] = [],
        now = Math.floor(Date.now() / 1000)
    // Removal and lock tracking share one record per item, and each keeps its
    // own counts there, so an item can be approved while it stays locked
    const [seen_key, alert_key] = alert_type === REMOVED ? (['n', 'r'] as const) : (['ln', 'lr'] as const)
    // With what this check has done so far: the removal pass runs first
    const currentRecord = (name: string) =>
        new LocalStorageItem({ object: newLocalStorageItems[name] || existingLocalStorageItems[name] })
    // A change's record holds the item as it is now. This track's counts start
    // over, and the other track's carry on.
    const changeRecord = (name: string) => {
        const { n, r, ln, lr } = currentRecord(name)
        const record = new LocalStorageItem({ item: itemLookup[name], observed_utc: now })
        return Object.assign(record, alert_type === REMOVED ? { ln, lr } : { n, r })
    }

    alert_current_list.forEach(name => {
        const item = itemLookup[name]
        // 1. in the case of a non-userpage-tracked (isUser=false) removed comment, don't overwrite local storage b/c
        // if it were overwritten, body would appear on history page as [removed]
        // 2. in the case of userpage tracking (isUser=true), only need to save the text in local storage
        // when there is a change. user page lookup (itemLookup) will have original text
        const existingLocalStorageItem = existingLocalStorageItems[name]
        if (!isUser && !existingLocalStorageItem) {
            newLocalStorageItems[name] = new LocalStorageItem({ item: item, observed_utc: now })
        } else if (existingLocalStorageItem) {
            // reset seen_count so that items observed as approved/normal must be consecutively seen w/that state
            const newLocalStorageItem = currentRecord(name)
            if (name in alert_known_hash) {
                // Recorded already, so its alert count is never read: the
                // record is saved only when its seen count starts over, and
                // most checks of it write nothing
                if (newLocalStorageItem.getCount(seen_key) > 0) {
                    newLocalStorageItem.resetCount(seen_key)
                    newLocalStorageItems[name] = newLocalStorageItem
                }
            } else {
                newLocalStorageItem.resetCount(seen_key)
                // Track how many consecutive times this item has been observed as removed or locked.
                // Only fire an alert after REMOVAL_CONFIRMATION_THRESHOLD consecutive observations,
                // which prevents false alerts from transient API failures or intermittent data.
                const alert_count = newLocalStorageItem.incrementCount(alert_key)
                newLocalStorageItems[name] = newLocalStorageItem
                if (!skipConfirmationThreshold && alert_count < REMOVAL_CONFIRMATION_THRESHOLD) {
                    return // skip this item — not yet confirmed
                }
            }
        }
        if (!(name in alert_known_hash) && !isTooOld(item.created_utc, oldestDateThreshold)) {
            // markUnseen is always true except when subscribing via a reddit (not reveddit) page to a new ID for 'other'
            // subscriptions. As long as the item is not 'removed', the current state is stored as 'seen' (unseen=false).
            // It is assumed that users subscribing from reveddit pages will already have seen all the current mod actions,
            // and users subscribing from a reddit page will already know about locked items
            let markUnseen = true
            if (
                (subscribedFrom === SUBSCRIBED_FROM_REDDIT && alert_type !== REMOVED) ||
                subscribedFrom === SUBSCRIBED_FROM_REVEDDIT
            ) {
                markUnseen = false
            }
            alert_known_hash[name] = new ItemForStorage(
                item.created_utc,
                markUnseen,
                isComment(item.name) && item.link_id ? item.link_id : undefined,
            )
            delete normal_known_hash[name]
            if (markUnseen) {
                let alert_type_var = alert_type
                if (alert_type === REMOVED && isUserDeletedItem(item)) {
                    alert_type_var = DELETED
                    alert_userDeleted_unseen_ids.push(name)
                } else {
                    alert_unseen_ids.push(name)
                }
                changes.push(new ChangeForStorage({ id: name, observed_utc: now, change_type: alert_type_var }))
            }
            if (isUser) {
                newLocalStorageItems[name] = changeRecord(name)
            }
        }
        // A removal the post's own author view shows is marked so: when that
        // view stops showing it, it ends, even where nothing else can see the
        // post (readLookupResult)
        if (alert_type === REMOVED && isUser && name in alert_known_hash && postRemovedByCategory(name, item)) {
            alert_known_hash[name].a = 1
        }
    })
    normal_current_list.forEach(name => {
        const item = itemLookup[name]
        // save original text for all non-userpage-tracked items since comment text can disappear
        if (!isUser && !existingLocalStorageItems[name]) {
            newLocalStorageItems[name] = new LocalStorageItem({ item: item, observed_utc: now })
        }
        // Reset the confirmation count when item appears approved/normal,
        // so transient false alerts don't accumulate across separate incidents
        if (existingLocalStorageItems[name]) {
            const lsi = currentRecord(name)
            if (lsi.getCount(alert_key) > 0) {
                lsi.resetCount(alert_key)
                // Preserve this in newLocalStorageItems so it gets saved
                newLocalStorageItems[name] = lsi
            }
        }
        if (name in alert_known_hash) {
            const this_localStorageItem = currentRecord(name)
            // Track the seen count, aka 'observed same status' count
            // Doing so allows sending an alert only after N times a new status has been observed.
            // See: https://www.reddit.com/r/reveddit/comments/zc7tcm/reveddit_sending_repetitive_notifications/
            const seen_count = this_localStorageItem.incrementCount(seen_key)
            if (seen_count >= target_seen_count) {
                const change_is_previously_recorded = changeIsPreviouslyRecorded(name, normal_type, changes)
                // To prevent repeat notifications, whose non-deterministic cause I haven't yet figured out,
                // only notify about the second observed change in status back to 'normal' (approved/unlocked)
                // if a higher threshold of consecutive normal statuses has been observed
                if (!change_is_previously_recorded || seen_count >= TARGET_SEEN_COUNT_FOR_PREVIOUSLY_RECORDED_CHANGE) {
                    normal_known_hash[name] = new ItemForStorage(
                        item.created_utc,
                        true,
                        isComment(item.name) && item.link_id ? item.link_id : undefined,
                    )
                    delete alert_known_hash[name]

                    changes.push(
                        new ChangeForStorage({ id: name, observed_utc: now, change_type: normal_type, seen_count }),
                    )
                    normal_unseen_ids.push(name)

                    // A removed followed item keeps its record, as above: the
                    // lookup's copy would show [removed] on the history page
                    newLocalStorageItems[name] =
                        isUser || !isRemovedItem(item) ? changeRecord(name) : this_localStorageItem
                } else {
                    newLocalStorageItems[name] = this_localStorageItem
                }
            } else {
                newLocalStorageItems[name] = this_localStorageItem
            }
        } else if (!isTooOld(item.created_utc, oldestDateThreshold)) {
            // This runs on every check, so it keeps the unseen flag: an
            // approval or unlock stays unseen until it's viewed
            normal_known_hash[name] = new ItemForStorage(
                item.created_utc,
                !!normal_known_hash[name]?.u,
                isComment(item.name) && item.link_id ? item.link_id : undefined,
            )
            // Cache the body on first observation. The authenticated view (itemLookup) is the
            // only place the original text is guaranteed to exist — once Reddit removes the
            // item, no public source can recover it.
            if (isUser && !existingLocalStorageItems[name]) {
                newLocalStorageItems[name] = new LocalStorageItem({ item: item, observed_utc: now })
            }
        }
    })
    const allUnseenIds = [...alert_unseen_ids, ...normal_unseen_ids, ...alert_userDeleted_unseen_ids]
    const num_changes = allUnseenIds.length

    const realtimeIds: string[] = []
    let realtimeCount = 0
    let backlogCount = 0

    for (const id of allUnseenIds) {
        const item = itemLookup[id]
        const age = item?.created_utc ? now - item.created_utc : 0
        if (age > BACKLOG_AGE_THRESHOLD_SECONDS) {
            backlogCount++
        } else if (notify) {
            realtimeCount++
            realtimeIds.push(id)
        }
    }
    // A notification names only the changes it counts
    const isRealtime = (id: string) => realtimeIds.includes(id)
    const realtimeChangeTypes: string[] = []
    if (alert_unseen_ids.some(isRealtime)) realtimeChangeTypes.push(CHANGE_TYPE_TEXT[alert_type])
    if (alert_userDeleted_unseen_ids.some(isRealtime)) realtimeChangeTypes.push(CHANGE_TYPE_TEXT[DELETED])
    if (normal_unseen_ids.some(isRealtime)) realtimeChangeTypes.push(CHANGE_TYPE_TEXT[normal_type])

    return {
        num_changes,
        realtimeChanges: { count: realtimeCount, changeTypes: realtimeChangeTypes, ids: realtimeIds },
        backlogCount,
    } as MarkChangesResult
}

// Ids that the backlog notifications may announce — a type counts only when
// its notify setting (and track) is on; see getNotifyFlags in storage.
export const getUnseenBacklogItemIds = (storage: Record<string, any>): string[] => {
    const now = Math.floor(Date.now() / 1000)
    const { removal: notifyRemoval, lock: notifyLock } = getNotifyFlags(storage.options || {})

    const ids: string[] = []
    for (const { thing, isUser } of subscribedThings(storage.user_subscriptions || {})) {
        const keys = getObjectNamesForThing(thing, isUser)
        const typesToCount: string[] = []
        if (notifyRemoval) typesToCount.push(keys['removed'])
        if (notifyLock) typesToCount.push(keys['locked'])

        for (const key of typesToCount) {
            const obj = storage[key] || {}
            for (const id of Object.keys(obj)) {
                const item = obj[id]
                if (item && item.u === true && item.c && now - item.c > BACKLOG_AGE_THRESHOLD_SECONDS) {
                    ids.push(id)
                }
            }
        }
    }
    return ids
}

const announceBacklog = (count: string, typeText: string, itemIds: string[]) => {
    const id = 'backlog_summary'
    const title = 'reveddit real-time'
    const message = `${count} ${typeText} posts or comments found in your history. Click to review.`
    // Kept apart from accounts' notifications, which are named for the account
    createNotification({ notificationId: `reveddit:${id}`, title, message })
    appendNotificationLog({ ts: Date.now(), id, title, message, itemIds, source: id }).catch(() => {})
}

// Old (backlog) content notifies in two phases: one notification as soon as the
// first backlog items are found after install, then a single follow-up summary
// after BACKLOG_SUMMARY_DELAY_MS covering only items gathered since that first
// notification. The ids announced in phase 1 are snapshotted because "unseen"
// (item.u) tracks whether the user has reviewed an item, not whether it was
// already announced — without the snapshot, an unreviewed backlog would be
// re-announced identically by the summary.
export const maybeFireBacklogSummary = async (storage: Record<string, any>): Promise<void> => {
    const state = await getBacklogSummaryState()
    if (state.summarySent) return
    if (state.installedAt == null) return

    const notifyFlags = getNotifyFlags(storage.options || {})
    // Notifications are off for every type: return before consuming either
    // one-shot phase marker, so a user who re-enables notifications later
    // still gets the backlog notice.
    if (!notifyFlags.removal && !notifyFlags.lock) return
    const typeText = [notifyFlags.removal ? 'removed' : '', notifyFlags.lock ? 'locked' : ''].filter(Boolean).join('/')

    const unseenBacklogIds = getUnseenBacklogItemIds(storage)

    if (!state.initialBacklogNotified) {
        if (unseenBacklogIds.length === 0) return
        await markBacklogInitialNotified(unseenBacklogIds)
        announceBacklog(`${unseenBacklogIds.length} older`, typeText, unseenBacklogIds)
        return
    }

    if (Date.now() - state.installedAt < BACKLOG_SUMMARY_DELAY_MS) return

    await markBacklogSummarySent()
    const alreadyNotified = new Set(state.initialNotifiedIds)
    const newIds = unseenBacklogIds.filter(id => !alreadyNotified.has(id))
    if (newIds.length === 0) return

    announceBacklog(`${newIds.length} more older`, typeText, newIds)
}
