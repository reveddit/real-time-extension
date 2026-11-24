import {
    goToOptions,
    setAlarm,
    ALARM_NAME,
    createNotification,
    createTab,
    setWarningBadge,
    isOtherIdentity,
    showsWhatsNew,
    BELLS_CHANGED,
    feedbackFormLink,
} from './src/common'
import { checkForChanges, setCurrentStateForIdHere } from './src/monitoring'
import { getLoggedinUser, getLoggedinUserDetailed, isSettledByLogin, whoIsSignedIn } from './src/reddit-auth'
import { storeRedditCookies } from './src/reddit-cookies'
import { countCookieChange, countStorageWrites } from './src/activity-counts'
import { isFresh } from './src/logged-in-fetch'
import { getItemsCheckStatus, getPublicViewUncheckedLine } from './src/lookup-status'
import { getLoginWallLine } from './src/www-fetcher'
import {
    initStorage,
    INTERVAL_DEFAULT,
    getOptions,
    subscribeUser,
    markThingSeen,
    clearPendingNotification,
    FOLLOWED_NOTIFICATION,
    setBacklogSummaryInstalledAt,
    markBacklogSummarySent,
    updateBadgeUnseenCount,
    PAGE_WRITE,
    subscribeIdHere,
    unsubscribeIdHere,
    subscribeUserHere,
    keepPageTextHere,
    markIDsAsSeenHere,
} from './src/storage'
import { dropRetiredRests } from './src/request-gates'
import { setupContextualMenu } from './src/contextMenus'
import browser from 'webextension-polyfill'
import { handleBridgeFetch } from './src/bridge'
import {
    applyRemoteConfig,
    fetchNews,
    getCachedNews,
    requestStoreUpdateIfBehind,
    getRemoteLoginCookies,
    compareVersions,
} from './src/news'
import {
    startViewerConnect,
    cancelViewerConnect,
    finishViewerConnect,
    recoverViewerConnect,
    disconnectViewer,
    installViewerHeaderRule,
    isViewerConnecting,
    isLoginTab,
    VIEWER_SETTLE_MS,
    VIEWER_CONNECT_ALARM,
} from './src/viewer'
import { loginWallLanding } from './src/login-wall-config'
import { initDiagPersistence, buildDiagReport, clearDiagLog, dlog } from './src/diaglog'
import { getRateLimitBackoffRemainingMs, getSyncUsageLine } from './src/storage'
import { installWebRequestHeaders, installDnrHeaderRules } from './src/header-rules'
import { installPublicCookies } from './src/public-cookies'
import { installDevLog, createDevActionHandler, installReplayInstall } from './src/background-dev'

// The background context is the diagnostic log's single writer — see diaglog.ts.
initDiagPersistence()

// Pages that may use the bridge: www.reveddit.com, where the site's other names
// redirect, and the local website in dev and staging builds. A page on any
// other reveddit.com name is an old deploy or someone else's, and the bridge
// fetches with the user's login. Dev actions take the local website only.
const isDevSitePage = (url: string) => __DEV__ && url.startsWith('http://localhost:8080/')
const isBridgePage = (url: string) =>
    url.startsWith('https://www.reveddit.com/') || (__LOCAL_SITE__ && url.startsWith('http://localhost:8080/'))

if (__DEV__) {
    installDevLog()
}

// The challenge solver's remote inputs live in the cached news feed, which
// outlives the worker while the module's config does not: re-apply them on
// every start, not only in the onInstalled update branch below. The bridge
// waits for them: a request that wakes the worker must be checked against
// the feed's publicmodlogs token, not the compiled one.
const remoteConfigApplied = applyRemoteConfig().catch(() => {})
setupContextualMenu()

// BEGIN webRequest API code (header-rules.ts)
// Can use this to check for firefox build:
if (__BUILT_FOR__ !== 'chrome') {
    installWebRequestHeaders()
}
// END webRequest API code

installDnrHeaderRules()
// The logged-out reads' own cookies: its listener, then its rule
installPublicCookies()

console.log('bg script running')
// Throttle recovery calls that fetch /api/me.json to at most ~2 per minute
const ME_RECOVER_MIN_INTERVAL_MS = 30000 // 30 seconds
let recoveringMe = false
let lastMeRecoverTs = 0

// Manual "check now" (options page) self-throttle. Module-level is enough: a
// service-worker restart resetting it just allows one extra manual run.
const MANUAL_CHECK_MIN_INTERVAL_MS = 60000
let lastManualCheckTs = 0

// For a look that finds no login every few seconds: the console only
const consoleOnly: typeof dlog = (_area, message) => console.log(message)

// A login was found: only a warning it settles goes, if it's still the one up.
// Needing a second account, say, stays until a check finds it gone.
const clearWarningALoginSettles = (then: () => void = () => {}) =>
    chrome.storage.local.get(['error_status'], result => {
        const finish = () => {
            updateBadgeUnseenCount()
            then()
        }
        if (isSettledByLogin(result?.error_status)) chrome.storage.local.remove('error_status', finish)
        else finish()
    })

async function recoverIfDegraded() {
    const now = Date.now()
    if (recoveringMe) return
    if (now - lastMeRecoverTs < ME_RECOVER_MIN_INTERVAL_MS) return
    // Claimed before anything is awaited, so a burst of cookie changes or tab
    // loads asks reddit once
    recoveringMe = true
    // The browser's login is a second account's while it signs in (viewer.ts)
    if (await isViewerConnecting().catch(() => true)) {
        recoveringMe = false
        return
    }
    // A miss goes to the console: the next check logs the same one
    getLoggedinUser(consoleOnly)
        .then(user => {
            if (user) clearWarningALoginSettles()
        })
        .finally(() => {
            recoveringMe = false
            lastMeRecoverTs = Date.now()
        })
}
// Keep stored Reddit cookies up-to-date automatically. If signed out or the
// login check failed, try to recover by fetching the logged-in user (throttled).
const storeCookiesThenRecover = () =>
    storeRedditCookies().then(() => {
        chrome.storage.local.get(['error_status'], result => {
            if (result && isSettledByLogin(result.error_status)) {
                recoverIfDegraded()
            }
        })
    })
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab && tab.url && tab.url.match(/^https?:\/\/[^/]*\.reddit\.com\//)) {
        storeCookiesThenRecover()
    }
})

// The login cookies' names, read again at most every 5 minutes: they're asked
// about at each of Reddit's cookie changes, and the feed holding them is large
const LOGIN_NAMES_EVERY_MS = 5 * 60 * 1000
let loginNames: { at: number; names: Promise<string[]> } | undefined
const loginCookieNames = () => {
    if (!loginNames || !isFresh(loginNames.at, LOGIN_NAMES_EVERY_MS, Date.now())) {
        loginNames = { at: Date.now(), names: getRemoteLoginCookies() }
    }
    return loginNames.names
}
// Reddit replaces one of its cookies with most of its answers, its own pages'
// requests included (74 of 96 on 2026-11-09), so what runs here runs for nearly
// every request. A new value for a cookie that isn't a login's is only counted:
// the saved copy takes it at the next check or page load (reddit-cookies.ts).
// A login cookie's change and any cookie's going are saved at once, so a check
// that puts missing cookies back can't sign a user back in who just signed out.
chrome.cookies.onChanged.addListener(async changeInfo => {
    const cookie = changeInfo.cookie
    if (!cookie?.domain?.replace(/^\./, '').endsWith('reddit.com')) return
    // A new value comes as the old cookie's removal, then the new cookie
    if (changeInfo.removed && changeInfo.cause === 'overwrite') return
    countCookieChange()
    const login = (await loginCookieNames()).includes(cookie.name)
    if (!login && !changeInfo.removed) return
    if (await isViewerConnecting()) {
        // A second account signed in (viewer.ts): done once reddit has
        // set the cookies that follow its login cookie
        if (login && !changeInfo.removed) {
            setTimeout(() => finishViewerConnect(whoAmI), VIEWER_SETTLE_MS)
        }
        return
    }
    storeCookiesThenRecover()
})

// Reddit tabs' bells show what's followed and who's signed in, and hear of a
// change from here (content-reddit.ts): a listener to storage in each tab would
// be handed every write the extension makes, the cookie snapshot's included.
// Firefox reports writes that change nothing.
browser.storage.onChanged.addListener((changes, area) => {
    countStorageWrites(changes)
    const changed = (key: string) =>
        key in changes && JSON.stringify(changes[key].oldValue) !== JSON.stringify(changes[key].newValue)
    const news = {
        ...(area === 'sync' && changed('other_subscriptions')
            ? { followed: changes.other_subscriptions.newValue || {} }
            : {}),
        ...(area === 'local' && changed('last_logged_in_user')
            ? { me: changes.last_logged_in_user.newValue || '' }
            : {}),
    }
    if (!Object.keys(news).length) return
    browser.tabs.query({ url: '*://*.reddit.com/*' }).then(
        tabs => {
            for (const tab of tabs) {
                if (tab.id !== undefined)
                    browser.tabs.sendMessage(tab.id, { action: BELLS_CHANGED, ...news }).catch(() => {})
            }
        },
        () => {},
    )
})

// The second account (viewer.ts): who the browser is logged in as when its
// sign-in ends; its header rule, which session rules lose with the browser;
// and a sign-in this worker stopped in the middle of. A sign-in ends when its
// tab leaves reddit's login page or closes. A sign-in asks on every page load
// in its tab, so a miss goes in the saved log at most once a minute, and the
// rest to the console.
const WHO_AM_I_LOG_EVERY_MS = 60 * 1000
let whoAmILoggedAt = -Infinity
const whoAmI = () =>
    whoIsSignedIn(
        Date.now() - whoAmILoggedAt < WHO_AM_I_LOG_EVERY_MS
            ? consoleOnly
            : (area, message) => {
                  whoAmILoggedAt = Date.now()
                  dlog(area, message)
              },
    )
installViewerHeaderRule().catch(() => {})
recoverViewerConnect(whoAmI).catch(() => {})
// A sign-in started for whoever the browser was last logged in as
const startViewerConnectAsMain = () =>
    browser.storage.local
        .get({ last_logged_in_user: '' })
        .then((r: any) => startViewerConnect(String(r.last_logged_in_user || '')))
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (
        changeInfo.status === 'complete' &&
        tab?.url &&
        /^https:\/\/([^/]+\.)?reddit\.com\//.test(tab.url) &&
        !loginWallLanding(tab.url)
    ) {
        isLoginTab(tabId)
            .then(isIt => {
                if (isIt) return finishViewerConnect(whoAmI)
            })
            .catch(() => {})
    }
})
chrome.tabs.onRemoved.addListener(tabId => {
    isLoginTab(tabId)
        .then(isIt => {
            if (isIt) return finishViewerConnect(whoAmI, 'not_signed_in')
        })
        .catch(() => {})
})
// What a reddit or reveddit page's content script asks the background to write
// (storage.ts byBackground), each run as it runs in an extension page. A web
// page's script sends them, so each argument is checked first.
const isItemId = (id: unknown): id is string => typeof id === 'string' && /^t[13]_[a-z0-9]{1,16}$/.test(id)
const isPostId = (id: unknown): id is string => typeof id === 'string' && /^(t3_)?[a-z0-9]{1,16}$/.test(id)
const isName = (name: unknown): name is string => typeof name === 'string' && /^[\w-]{1,64}$/.test(name)
const isPageUrl = (url: unknown): url is string =>
    typeof url === 'string' && url.length <= 2048 && /^https?:\/\//.test(url)
const isPageText = (text: unknown): text is string => typeof text === 'string' && text.length <= 40000
// Item ids and when each was made, as a page's elements give them
const isSeenIds = (ids: unknown): ids is Record<string, any> =>
    !!ids &&
    typeof ids === 'object' &&
    !Array.isArray(ids) &&
    Object.keys(ids).length <= 1000 &&
    Object.entries(ids).every(([id, t]) => isItemId(id) && (t == null || ['string', 'number'].includes(typeof t)))
const PAGE_WRITES = new Map<string, (args: any[]) => Promise<unknown> | false>([
    ['subscribeId', ([id]) => isItemId(id) && subscribeIdHere(id)],
    ['unsubscribeId', ([id]) => isItemId(id) && unsubscribeIdHere(id)],
    ['subscribeUser', ([user]) => isName(user) && subscribeUserHere(user)],
    ['keepPageText', ([id, text]) => isItemId(id) && isPageText(text) && keepPageTextHere(id, text)],
    [
        'setCurrentStateForId',
        ([id, url, postId]) =>
            isItemId(id) &&
            isPageUrl(url) &&
            (postId == null || isPostId(postId)) &&
            setCurrentStateForIdHere(id, url, postId ?? undefined),
    ],
    [
        'markIDsAsSeenIfSubscribed',
        ([user, isUser, ...lists]) =>
            isName(user) &&
            typeof isUser === 'boolean' &&
            lists.length === 4 &&
            lists.every(isSeenIds) &&
            markIDsAsSeenHere(user, isUser, lists[0], lists[1], lists[2], lists[3]),
    ],
])

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.action == 'open-options') {
        goToOptions()
        sendResponse({ response: 'done' })
        return true
    } else if (request.action == 'update-badge') {
        updateBadgeUnseenCount()
        sendResponse({ response: 'done' })
        return true
    } else if (request.action == 'create-notification') {
        console.log('Background script received create-notification request:', request.options)
        createNotification(request.options)
        return true
    } else if (
        request.action === 'viewer-connect-start' ||
        request.action === 'viewer-connect-cancel' ||
        request.action === 'viewer-disconnect'
    ) {
        // The second account (viewer.ts), from the extension's own pages only
        if (!String(sender?.url || '').startsWith(chrome.runtime.getURL(''))) {
            sendResponse({ ok: false, error: 'forbidden' })
            return true
        }
        const run =
            request.action === 'viewer-connect-start'
                ? startViewerConnectAsMain()
                : request.action === 'viewer-connect-cancel'
                  ? cancelViewerConnect('cancelled').then(() => ({ ok: true }))
                  : disconnectViewer().then(() => ({ ok: true }))
        run.then(sendResponse, (e: any) => sendResponse({ ok: false, error: String(e?.message || e) }))
        return true
    } else if (request.action === PAGE_WRITE) {
        const run = Array.isArray(request.args) && PAGE_WRITES.get(String(request.write))?.(request.args)
        if (!run) {
            sendResponse({ ok: false, error: 'forbidden' })
            return true
        }
        run.then(
            answer => sendResponse({ ok: true, answer }),
            (e: any) => sendResponse({ ok: false, error: String(e?.message || e) }),
        )
        return true
    } else if (__DEV__ && request.action === 'dev-relay') {
        // Dev builds: the local website's content script relays test scripts'
        // dev actions here (Firefox has no externally_connectable).
        if (isDevSitePage(sender?.tab?.url || '')) {
            handleDevAction?.(request.message || {}, sendResponse)
        } else {
            sendResponse({ error: 'forbidden' })
        }
        return true
    } else if (request.action === 'bridge-fetch') {
        // Relay from the reveddit.com content script (Firefox has no
        // externally_connectable). Guard on the sender tab's origin; the
        // Chrome path arrives via onMessageExternal below instead.
        if (!isBridgePage(sender?.tab?.url || sender?.url || '')) {
            sendResponse({ ok: false, status: 0, error: 'forbidden' })
            return true
        }
        if (isOtherIdentity(sender?.tab)) {
            sendResponse({ ok: false, status: 0, error: 'unsupported_context' })
            return true
        }
        remoteConfigApplied.then(() => handleBridgeFetch(request)).then(sendResponse)
        return true
    } else if (request.action === 'store-reddit-cookies') {
        // Trigger cookie capture in background context
        storeRedditCookies()
        sendResponse({ response: 'done' })
        return true
    } else if (request.action === 'get-diag-log') {
        Promise.all([
            getRateLimitBackoffRemainingMs(),
            getCachedNews(),
            getPublicViewUncheckedLine(!!request.includeUsername),
            getSyncUsageLine(),
            getLoginWallLine(),
        ])
            .then(([backoffMs, newsCache, uncheckedLine, syncUsageLine, loginWallLine]) =>
                buildDiagReport({
                    includeUsername: !!request.includeUsername,
                    hideIds: !!request.hideIds,
                    ...(Number(request.maxChars) > 0 && { maxChars: Number(request.maxChars) }),
                    extraHeaderLines: [
                        `rate-limit backoff: ${backoffMs > 0 ? Math.ceil(backoffMs / 1000) + 's remaining' : 'none'}`,
                        `news: ${
                            newsCache
                                ? `fetched ${new Date(newsCache.lastFetched).toISOString()}, ${
                                      newsCache.feed?.messages?.length ?? 0
                                  } messages, latest_version=${newsCache.feed?.latest_version || 'unset'}`
                                : 'never fetched'
                        }`,
                        uncheckedLine,
                        syncUsageLine,
                        loginWallLine,
                    ],
                }),
            )
            .then(text => sendResponse({ text }))
            .catch(err => sendResponse({ error: String(err?.message || err) }))
        return true
    } else if (request.action === 'clear-diag-log') {
        dlog('ui', '[reveddit] diagnostic log cleared from options page')
        clearDiagLog()
            .then(() => sendResponse({ ok: true }))
            .catch(() => sendResponse({ ok: false }))
        return true
    } else if (request.action === 'get-diag-status') {
        Promise.all([
            getRateLimitBackoffRemainingMs(),
            new Promise<number>(resolve =>
                chrome.storage.sync.get(['last_check'], r => resolve(Number(r?.last_check) || 0)),
            ),
            // The monitoring alarm's next fire (ms), for the 'next ~HH:MM' line.
            new Promise<number>(resolve => {
                try {
                    chrome.alarms.get(ALARM_NAME, (a: any) => resolve(Number(a?.scheduledTime) || 0))
                } catch {
                    resolve(0)
                }
            }),
            getItemsCheckStatus(),
        ])
            .then(([backoffMs, lastCheck, nextCheck, items]) =>
                sendResponse({ backoffRemainingMs: backoffMs, lastCheck, nextCheck, ...items }),
            )
            .catch(err => sendResponse({ error: String(err?.message || err) }))
        return true
    } else if (request.action === 'run-check-now') {
        const now = Date.now()
        if (now - lastManualCheckTs < MANUAL_CHECK_MIN_INTERVAL_MS) {
            sendResponse({ throttled: true })
            return true
        }
        lastManualCheckTs = now
        dlog('ui', '[reveddit] manual check requested from options page')
        checkForChanges(false, { bypassBackoff: true })
        sendResponse({ started: true })
        return true
    } else if (request.action === 'try-reconnect') {
        // Not while a second account signs in: the browser's login is its
        isViewerConnecting().then(connecting => {
            if (connecting) {
                sendResponse({ success: false, indeterminate: true, reason: 'a second account is signing in' })
            } else {
                tryReconnect(sendResponse, !!request.quiet)
            }
        })
        return true
    }
})

// The popup's Connect and Reconnect, and the welcome page's poll: subscribe
// whoever is logged in and look them up. The poll is quiet, as it can find
// nobody every few seconds for hours: its lines go to the console only.
function tryReconnect(sendResponse: (response: any) => void, quiet: boolean) {
    storeRedditCookies()
        .then(() => getLoggedinUserDetailed(quiet ? consoleOnly : dlog))
        .then(detail => {
            const user = detail.user
            if (user) {
                chrome.storage.local.set({ last_logged_in_user: user })
                // A check now, as the user expects one, whether the user was
                // just subscribed or already was
                const done = () => {
                    checkForChanges()
                    clearWarningALoginSettles(() => sendResponse({ success: true, user }))
                }
                subscribeUser(user, done, done)
            } else {
                // indeterminate: reddit did not answer the probe (challenge,
                // block, 429), which is not the same as being logged out.
                sendResponse({ success: false, indeterminate: detail.indeterminate, reason: detail.reason })
            }
        })
        .catch(err => {
            console.log('try-reconnect error:', err)
            sendResponse({ success: false })
        })
}

const handleDevAction = __DEV__ ? createDevActionHandler(startViewerConnectAsMain) : null

if (__DEV__) {
    // For automation that holds the service worker itself (Playwright)
    ;(globalThis as any).__devAction = handleDevAction
}

// A reveddit.com page (externally_connectable, Chrome and Edge). Another
// extension's message carries its id, even from a content script on a reveddit
// page, and Firefox delivers only those here (it has no
// externally_connectable).
const isFromBridgePage = (sender: chrome.runtime.MessageSender) => !sender.id && isBridgePage(sender.url || '')

chrome.runtime.onMessageExternal.addListener(function (message, sender, sendResponse) {
    const fromBridgePage = isFromBridgePage(sender)
    if (!fromBridgePage && message?.action !== 'version') {
        sendResponse({ ok: false, status: 0, error: 'forbidden' })
        return true
    }
    switch (message.action) {
        case 'version':
            sendResponse({ version: chrome.runtime.getManifest().version, name: chrome.runtime.getManifest().name })
            break
        case 'bridge-fetch':
            // reveddit.com pages fetch public reddit JSON through the extension
            remoteConfigApplied.then(() => handleBridgeFetch(message)).then(sendResponse)
            break
        default:
            // Dev actions answer only the local dev site of a dev build. Any
            // other message gets an answer too, so no page waits on silence.
            if (__DEV__ && handleDevAction && isDevSitePage(sender.url || '')) {
                handleDevAction(message, sendResponse)
            } else {
                sendResponse({
                    ok: false,
                    status: 0,
                    error: String(message?.action || '').startsWith('dev-') ? 'forbidden' : 'unknown action',
                })
            }
    }
    return true
})

// The survey after an uninstall, with this version and the browser's filled in
// (common.ts feedbackFormLink): set again at each update and browser start, as
// both change. navigator.userAgentData is Chromium's, in its worker too.
const setUninstallSurvey = () =>
    chrome.runtime.setUninstallURL?.(
        feedbackFormLink(chrome.runtime.getManifest().version, (navigator as any).userAgentData),
    )

chrome.runtime.onInstalled.addListener(function (details) {
    try {
        dlog('cycle', `[reveddit] onInstalled (${details.reason}) — version ${chrome.runtime.getManifest().version}`)
    } catch {
        /* ignored */
    }
    // Existing reddit tabs lost their content script on install/update; re-inject
    // so the reliable tab fetch path is ready before the first removal check.
    injectContentScriptIntoExistingRedditTabs()
    setUninstallSurvey()
    if (details.reason == 'install') {
        initStorage(() => {
            setAlarm(INTERVAL_DEFAULT)
            setBacklogSummaryInstalledAt(Date.now())
            subscribeToLoggedInUser_or_promptForUser()
            updateBadgeUnseenCount()
        })
    } else if (details.reason == 'update') {
        updateBadgeUnseenCount()
        markBacklogSummarySent()
        try {
            if (showsWhatsNew(details.previousVersion, chrome.runtime.getManifest().version)) {
                createTab(chrome.runtime.getURL('src/whatsnew.html'))
            }
        } catch (e) {
            console.log('whatsnew open failed:', e)
        }
        // Refresh the news feed cache on update.
        fetchNews({ force: true }).catch(() => {})
        applyRemoteConfig().catch(() => {})
        // What 0.0.5.31 and earlier wrote and nothing reads any more: cookie
        // copies (stored_reddit_cookie_objects holds the snapshot), an oldest
        // date for followed items, which have no listing to show one, and their
        // pending notification, kept under the name an account can have. Only
        // on an update from one of those, as 'other' has been u/other's since.
        if (details.previousVersion && compareVersions(details.previousVersion, '0.0.5.31') <= 0) {
            try {
                browser.storage.local
                    .remove(['stored_reddit_cookies', 'stored_reddit_domain', 'oldest_date_other'])
                    .catch(() => {})
            } catch {
                /* ignored */
            }
            clearPendingNotification('other').catch(() => {})
        }
        // What 0.0.5.37 and earlier kept for the legacy pages (the pending-post
        // queue, their rests, the dev switch) and the optional custom client id's
        // rest, none of which is read any more. The retired options stay in
        // `options`, unread: only the options page writes that object.
        if (details.previousVersion && compareVersions(details.previousVersion, '0.0.5.37') <= 0) {
            try {
                browser.storage.local
                    .remove([
                        'pending_post_lookups',
                        'pending_post_attempts',
                        'pending_post_progress',
                        'dev_simulate_endpoint_deprecation',
                    ])
                    .catch(() => {})
            } catch {
                /* ignored */
            }
            dropRetiredRests()
        }
    }
})

// Inject the content script into reddit tabs that predate this install/reload.
// Manifest content scripts only auto-run on navigation, so already-open tabs have
// none until refreshed — and the reliable www public-view fetch path (a
// same-origin, challenge-free content-script fetch) needs one. Without this, the
// immediate on-install check falls back to the background worker, which Reddit
// challenges on post pages. The content script's own __reveddit_cs_loaded guard
// makes a redundant injection a no-op, but we still check first to avoid the work.
async function injectContentScriptIntoExistingRedditTabs() {
    // browser.scripting: in the Firefox (MV2) build, chrome.* calls take
    // callbacks and return undefined, so awaiting chrome.scripting threw for
    // every tab ("can't access property Symbol.iterator of undefined")
    const scripting = (browser as any).scripting || (chrome as any).scripting
    if (!scripting?.executeScript) return // older Firefox MV2 — skip gracefully
    let tabs: any[]
    try {
        tabs = await browser.tabs.query({ url: ['https://*.reddit.com/*', 'https://*.reveddit.com/*'] })
    } catch {
        return
    }
    let injected = 0
    let alreadyPresent = 0
    let inaccessible = 0
    await Promise.all(
        tabs
            .filter(t => t.id != null)
            .map(async tab => {
                try {
                    const [probe] = await scripting.executeScript({
                        target: { tabId: tab.id },
                        func: () => (window as any).__reveddit_cs_loaded === true,
                    })
                    if (probe?.result) {
                        alreadyPresent++
                        return
                    }
                    await scripting.insertCSS({ target: { tabId: tab.id }, files: ['src/content.css'] })
                    await scripting.executeScript({ target: { tabId: tab.id }, files: ['src/content.js'] })
                    injected++
                } catch (e: any) {
                    // Expected for tabs this SW instance can't touch: incognito
                    // tabs under `incognito:"split"`, discarded tabs, or protected
                    // pages. Their own instance (if any) handles them.
                    const msg = String(e?.message || e)
                    if (/Cannot access|must request permission|No tab with id|discarded/i.test(msg)) {
                        inaccessible++
                    } else {
                        console.log(`[reveddit] content-script injection failed for tab ${tab.id} (${tab.url}):`, msg)
                    }
                }
            }),
    )
    if (injected || alreadyPresent || inaccessible) {
        console.log(
            `[reveddit] content-script injection: ${injected} injected, ${alreadyPresent} already present, ` +
                `${inaccessible} inaccessible (of ${tabs.length} matched tabs)`,
        )
    }
}
// Runs on every service-worker start (including reload) and after install/update.
injectContentScriptIntoExistingRedditTabs()

// A downloaded update is waiting for the extension to go idle. Apply it now:
// a long-lived worker or open extension page can otherwise defer it
// indefinitely (see the 0.0.5.14 stuck-cohort incident, Aug 2026).
chrome.runtime.onUpdateAvailable.addListener(details => {
    dlog('cycle', `[reveddit] update ${details?.version || '?'} downloaded, reloading to apply`)
    setTimeout(() => chrome.runtime.reload(), 250)
})

// On browser startup, if no user is currently tracked, re-check connection and
// surface a warning badge if Reddit can't be reached.
chrome.runtime.onStartup.addListener(async () => {
    setUninstallSurvey()
    // Not while a second account signs in: the browser's login is its, and it
    // would be subscribed as the user's
    if (await isViewerConnecting()) return
    chrome.storage.local.get(['last_logged_in_user'], result => {
        if (!result.last_logged_in_user) {
            getLoggedinUser().then((user: any) => {
                if (user) {
                    const done = () => clearWarningALoginSettles()
                    subscribeUser(user, done, done)
                } else {
                    setWarningBadge('needs_user')
                }
            })
        }
    })
})

if (__DEV__) {
    installReplayInstall(subscribeToLoggedInUser_or_promptForUser)
}

async function subscribeToLoggedInUser_or_promptForUser() {
    // Try to detect the logged-in user with a short, bounded retry loop.
    // getLoggedinUser() is already silent on failure (resolves null), so we retry
    // at install time to cover race conditions where cookies aren't yet readable
    // right at install (observed on Firefox with a Reddit tab already open).
    let user: any = null
    const MAX_ATTEMPTS = 3 // ~4s total; welcome page polls after that
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
        user = await getLoggedinUser()
        if (user) break
        if (i < MAX_ATTEMPTS - 1) await new Promise(r => setTimeout(r, 2000))
    }

    if (user) {
        // Populate the popup's connected state immediately — before this, only
        // try-reconnect and the first completed check wrote it, so a reinstall
        // showed "log in to get started" despite a detected user.
        chrome.storage.local.set({ last_logged_in_user: user })
        const onSubscribed = () => {
            // Delay the initial lookup briefly so Android has time to dismiss
            // the "extension was added" system dialog and grant notification
            // permission before the first createNotification call.
            setTimeout(() => checkForChanges(), 3000)
            chrome.tabs.create({ url: chrome.runtime.getURL('src/history.html?welcome=1'), active: true })
        }
        // Also handle the already-subscribed case: user_subscriptions persists
        // in synced storage across reinstalls, and subscribeUser reports an
        // existing subscription via its error callback. Without it, a reinstall
        // completed silently — no tab, no first check, popup stuck disconnected.
        subscribeUser(user, onSubscribed, onSubscribed)
    } else {
        // Still no user - surface the disconnected state on the toolbar icon and
        // show the welcome/onboarding page so the user can finish the setup.
        setWarningBadge('needs_user')
        chrome.tabs.create({ url: chrome.runtime.getURL('src/welcome.html'), active: true })
    }
}

const notificationClicked = (name: string) => {
    if (name === 'reveddit:backlog_summary') {
        createTab(chrome.runtime.getURL('src/history.html?filter=removed'))
        return
    }
    const isUser = name !== FOLLOWED_NOTIFICATION
    // The extension's other notifications, such as the link menu's note that
    // it couldn't follow a link and the popup's test, have no items to show.
    // An account's notification is named for it, and no username has a colon.
    if (isUser && name.startsWith('reveddit:')) {
        return
    }
    const thing = isUser ? name : 'other'
    // The page opens even when the save is refused
    markThingSeen(thing, isUser, (e: any) =>
        dlog('ui', '[reveddit] marking seen on a notification click failed:', String(e?.message || e)),
    )
        .then(unseenIDs => {
            let url: string
            if (isUser) {
                url = chrome.runtime.getURL('src/history.html')
            } else {
                url = chrome.runtime.getURL('src/other.html')
                if (unseenIDs.length) {
                    url = `https://www.reveddit.com/info?id=${unseenIDs.join(',')}&removal_status=all`
                }
            }
            updateBadgeUnseenCount()
            clearPendingNotification(name).catch(() => {})
            createTab(url)
        })
        .catch(() => {})
}

chrome.notifications.onClicked.addListener(notificationId => {
    const thing = (notificationId || '').split('|')[0]
    notificationClicked(thing)
    chrome.notifications.clear(notificationId)
})

// only need this while using registration.showNotification in common.js
if (__BUILT_FOR__ === 'chrome') {
    self.addEventListener('notificationclick', (event: any) => {
        notificationClicked(event.notification.data)
        event.notification.close()
    })
}

let lastAlarm = 0

// Recreate the monitoring alarm at the interval the user chose on the options
// page, never the compiled default: the watchdog must not undo a raised interval.
function setAlarmFromOptions() {
    getOptions(options => {
        const interval = Number(options?.interval)
        setAlarm(Number.isInteger(interval) && interval > 0 ? interval : INTERVAL_DEFAULT)
    })
}

if (!chrome.extension.inIncognitoContext) {
    // ### BEGIN WORKAROUND for broken alarms
    // https://bugs.chromium.org/p/chromium/issues/detail?id=1316588#c99
    ;(async function lostEventsWatchdog() {
        let quietCount = 0
        while (true) {
            await new Promise(resolve => setTimeout(resolve, 65000))
            const now = Date.now()
            // Judge health by the alarm's own schedule, not by the last tick this
            // worker saw: a worker woken by the popup or a bridge fetch has seen no
            // tick yet, and an interval above one minute never ticks within 95 s.
            // Lost (the Chromium bug) means the alarm exists but is overdue.
            const alarm: any = await new Promise(resolve => chrome.alarms.get(ALARM_NAME, resolve))
            const overdueMs = alarm?.scheduledTime ? now - alarm.scheduledTime : Infinity
            console.log(
                `lostEventsWatchdog: last alarm ${(now - lastAlarm) / 1000}s ago, next ${
                    alarm?.scheduledTime ? `${Math.round(-overdueMs / 1000)}s` : 'missing'
                }`,
            )
            if (overdueMs < 95000) {
                quietCount = 0 // alarm still works.
            } else if (++quietCount >= 3) {
                console.error('lostEventsWatchdog: reloading!')
                return chrome.runtime.reload()
            } else {
                setAlarmFromOptions()
            }
        }
    })()
    // ### END WORKAROUND for broken alarms

    chrome.alarms.onAlarm.addListener(function (alarm) {
        // A second account's sign-in that ran too long ends on time, whatever
        // the monitoring interval (viewer.ts)
        if (alarm.name === VIEWER_CONNECT_ALARM) {
            recoverViewerConnect(whoAmI).catch(() => {})
        }
        if (alarm.name == ALARM_NAME) {
            lastAlarm = Date.now() // part of WORKAROUND for broken alarms
            checkForChanges(true) // apply jitter to periodic (alarm-driven) polls
            // Piggyback the news feed refresh on the alarm tick; fetchNews
            // enforces its own hourly throttle internally. The update check
            // reads the cached feed, which the popup may have fetched instead.
            fetchNews()
                .then(requestStoreUpdateIfBehind)
                .catch(() => {})
        }
    })
}
