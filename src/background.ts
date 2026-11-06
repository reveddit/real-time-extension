import {
    goToOptions,
    setAlarm,
    ALARM_NAME,
    createNotification,
    updateBadgeUnseenCount,
    createTab,
    setWarningBadge,
    isOtherIdentity,
    showsWhatsNew,
} from './src/common'
import { checkForChanges } from './src/monitoring'
import {
    lookupItemsByID,
    getLoggedinUser,
    getLoggedinUserDetailed,
    getCookie,
    getAuth,
    storeRedditCookies,
    readWithLogin,
    lookupItemsByID_fromPublicProfile,
    getPublicViewUncheckedLine,
    getLoginWallLine,
    isSettledByLogin,
    whoIsSignedIn,
} from './src/requests'
import {
    initStorage,
    INTERVAL_DEFAULT,
    getOptions,
    subscribeUser,
    getUnseenIDs_thing,
    markThingAsSeen,
    clearPendingNotification,
    setBacklogSummaryInstalledAt,
    markBacklogSummarySent,
} from './src/storage'
import { setupContextualMenu } from './src/contextMenus'
import browser from 'webextension-polyfill'
import { handleBridgeFetch } from './src/bridge'
import {
    applyRemoteConfig,
    fetchNews,
    getCachedNews,
    requestStoreUpdateIfBehind,
    getRemoteLoginCookies,
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
    getViewer,
    restoreCookies,
    isExpired,
    viewerCookieHeaderFor,
    ViewerAccount,
    VIEWER_KEY,
    VIEWER_SETTLE_MS,
    VIEWER_CONNECT_ALARM,
} from './src/viewer'
import { loginWallLanding } from './src/login-wall-config'
import { initDiagPersistence, buildDiagReport, clearDiagLog, dlog } from './src/diaglog'
import { getRateLimitBackoffRemainingMs, getSyncUsageLine } from './src/storage'
import { isLegacyPageUrl, LEGACY_PAGE_MARKER_PATTERN } from './src/parse_html/common'

// The background context is the diagnostic log's single writer — see diaglog.ts.
initDiagPersistence()

// Pages that may use the bridge: reveddit.com, and the local website in dev
// and staging builds. Dev actions take the local website only.
const isDevSitePage = (url: string) => __DEV__ && url.startsWith('http://localhost:8080/')
const isBridgePage = (url: string) =>
    /^https:\/\/([a-z0-9-]+\.)?reveddit\.com\//.test(url) ||
    (__LOCAL_SITE__ && url.startsWith('http://localhost:8080/'))

// Dev builds keep a ring buffer of background console output, readable from
// the local dev site (localhost:8080) via the dev-* messages below. The service worker
// console is otherwise unreachable for automated testing.
if (__DEV__) {
    const MAX_DEV_LOG_LINES = 400
    const devLog: string[] = []
    ;(globalThis as any).__devLog = devLog
    for (const level of ['log', 'warn', 'error'] as const) {
        const original = console[level].bind(console)
        console[level] = (...args: any[]) => {
            try {
                const line = args
                    .map(a => {
                        try {
                            return typeof a === 'string' ? a : JSON.stringify(a)
                        } catch {
                            return String(a)
                        }
                    })
                    .join(' ')
                devLog.push(`${new Date().toISOString()} [${level}] ${line}`)
                if (devLog.length > MAX_DEV_LOG_LINES) {
                    devLog.splice(0, devLog.length - MAX_DEV_LOG_LINES)
                }
            } catch {
                /* ignored */
            }
            original(...args)
        }
    }
}

// The challenge solver's remote inputs live in the cached news feed, which
// outlives the worker while the module's config does not: re-apply them on
// every start, not only in the onInstalled update branch below. The bridge
// waits for them: a request that wakes the worker must be checked against
// the feed's publicmodlogs token, not the compiled one.
const remoteConfigApplied = applyRemoteConfig().catch(() => {})
setupContextualMenu()

// BEGIN webRequest API code
// When manifest v3 goes live, this code should only run for firefox
// It enables viewing quarantined content on reveddit (except user pages which are covered with cloudflare workers)

// Can use this to check for firefox build:
if (__BUILT_FOR__ !== 'chrome') {
    const opt_extraInfoSpec = ['requestHeaders', 'blocking'] as any

    // The second account (viewer.ts), kept here so the blocking listener can
    // answer at once; reloaded when the account changes
    let viewerForHeaders: ViewerAccount | null | undefined
    const loadViewerForHeaders = async () => (viewerForHeaders = await getViewer())
    browser.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && VIEWER_KEY in changes) {
            loadViewerForHeaders()
        }
    })
    const ownPrefix = browser.runtime.getURL('')

    browser.webRequest.onBeforeSendHeaders.addListener(
        function (details): any {
            // The extension's own GETs as the second account: its cookies
            // replace the request's, if the marker carries its current token.
            // Firefox lets a blocking listener answer with a promise.
            if (
                details.tabId === -1 &&
                details.method === 'GET' &&
                /[?&]rv_viewer=/.test(details.url) &&
                String(details.originUrl || '').startsWith(ownPrefix)
            ) {
                const withViewerCookies = (viewer: ViewerAccount | null) => {
                    const headers = (details.requestHeaders || []).filter(h => h.name.toLowerCase() !== 'cookie')
                    const header = viewerCookieHeaderFor(details.url, viewer)
                    if (header) {
                        headers.push({ name: 'Cookie', value: header })
                    }
                    return { requestHeaders: headers }
                }
                return viewerForHeaders === undefined
                    ? loadViewerForHeaders().then(withViewerCookies)
                    : withViewerCookies(viewerForHeaders)
            }
            // Legacy post pages on www: background requests carrying the
            // legacy marker get the redesign_optout cookie (see the DNR rule
            // below for Chrome/Edge and parse_html/common.ts legacyPageUrl).
            if (
                details.tabId === -1 &&
                details.url.startsWith('https://www.reddit.com/') &&
                isLegacyPageUrl(details.url)
            ) {
                const headers = (details.requestHeaders || []).filter(h => h.name.toLowerCase() !== 'cookie')
                headers.push({ name: 'Cookie', value: 'redesign_optout=true; over18=1' })
                return { requestHeaders: headers }
            }
            //chrome uses details.initiator, but since chrome doesn't support webRequest anymore,
            //only need to check the value supported by firefox
            if (
                details.originUrl &&
                details.originUrl.match(/^https?:\/\/(www.reveddit.com|localhost:[0-9]*)(\/.*)?$/)
            ) {
                let newCookie = '_options={%22pref_quarantine_optin%22:true};'
                let gotCookie = false
                for (const n in details.requestHeaders!) {
                    const headerName = details.requestHeaders![n as any].name.toLowerCase()
                    if (headerName === 'cookie') {
                        details.requestHeaders![n as any].value = details.requestHeaders![n as any].value!.replace(
                            / ?reddit_session[^;]*;/,
                            '',
                        )
                        if (!details.requestHeaders![n as any].value!.match(/pref_quarantine_optin/)) {
                            details.requestHeaders![n as any].value =
                                details.requestHeaders![n as any].value + `; ${newCookie}`
                        }
                        gotCookie = true
                    }
                }
                if (!gotCookie) {
                    details.requestHeaders!.push({ name: 'Cookie', value: newCookie })
                }
            }
            return { requestHeaders: details.requestHeaders }
        },
        {
            // The last pattern is the legacy-page marker (match patterns test
            // the query string too); keeping this list narrow matters because
            // the listener is blocking and would otherwise run on every request
            // the user's own reddit tabs make.
            urls: [
                'https://oauth.reddit.com/*.json*',
                'https://*.reddit.com/api/info*',
                'https://www.reddit.com/*rv_legacy=1',
                'https://www.reddit.com/*rv_viewer=*',
            ],
        },
        opt_extraInfoSpec,
    )
}
// END webRequest API code

// Strip the chrome-extension:// Origin header off the background's reddit
// requests (legacy page fetches, www.reddit public-profile fetches):
// Reddit 403s requests carrying that Origin.
//
// The Sec-Fetch-* trio is deliberately LEFT INTACT. Earlier versions removed it
// too (it marks a cross-site programmatic fetch, which Reddit once rejected for
// these pages), but as of 2026-09-03 the opposite holds: a Chrome User-Agent
// with no Sec-Fetch headers is a fingerprint no real browser produces, and
// Reddit's WAF answers it with the "blocked by network security" 403 page.
// Verified from the built extension's service worker against live Reddit:
// origin+sec-fetch stripped → 403 block page for both the solved profile page
// and /api/info; origin-only stripped → 200 with real content for both.
// Uses declarativeNetRequest (Chrome/Edge MV3); Firefox uses the webRequest
// handler above. Session rules (not dynamic) because the tabIds condition is
// session-rule-only; the service worker re-registers them on every start.
;(() => {
    // Chrome/Edge builds only. Firefox 153 exposes chrome.declarativeNetRequest
    // even when the manifest does not request the permission, and its methods
    // then return undefined instead of a promise: the old existence check
    // passed, `.catch` on undefined threw at top level, and that exception
    // aborted the rest of this script before any message listener registered
    // (popup Connect answered "Could not detect user"). Everything below is also
    // wrapped so no rule-setup failure can ever take the background down.
    if (__BUILT_FOR__ !== 'chrome') return
    const dnr = (chrome as any).declarativeNetRequest
    if (!dnr?.updateSessionRules || !dnr?.updateDynamicRules) return
    const stripHeaders = [{ header: 'origin', operation: 'remove' }]
    const makeRule = (id: number, urlFilter: string) => ({
        id,
        priority: 1,
        action: { type: 'modifyHeaders', requestHeaders: stripHeaders },
        condition: {
            urlFilter,
            resourceTypes: ['xmlhttprequest', 'other'],
            // Background/service-worker requests only (tabId -1). Without this,
            // the rule would also strip headers off the Shreddit SPA's own XHRs
            // in the user's reddit tabs — breaking or fingerprint-flagging their
            // normal browsing. Content-script fetches are same-origin and don't
            // carry a problematic Origin header, so they don't need the rule.
            tabIds: [-1],
            // A site's own service worker is tabId -1 too, and reddit has one.
            // This condition is why the manifest asks for Chrome 101.
            initiatorDomains: [chrome.runtime.id],
        },
    })
    // Legacy post pages on www render old markup only with the
    // redesign_optout cookie; without it the Shreddit challenge comes back.
    // fetch() cannot set Cookie, so set it here for background requests that
    // carry the legacy marker (parse_html/common.ts legacyPageUrl). Scoped to
    // tabId -1 like the strip rules, so it never touches the user's browsing.
    const cookieRule = {
        id: 9003,
        priority: 2,
        action: {
            type: 'modifyHeaders',
            requestHeaders: [{ header: 'cookie', operation: 'set', value: 'redesign_optout=true; over18=1' }],
        },
        condition: {
            regexFilter: '^https://www\\.reddit\\.com/.*' + LEGACY_PAGE_MARKER_PATTERN,
            resourceTypes: ['xmlhttprequest', 'other'],
            tabIds: [-1],
            initiatorDomains: [chrome.runtime.id],
        },
    }
    try {
        // Prior versions persisted 9001 as a dynamic rule (no tab scoping) — clean it up
        Promise.resolve(dnr.updateDynamicRules({ removeRuleIds: [9001, 9002] })).catch(() => {})
        Promise.resolve(
            dnr.updateSessionRules({
                // 9004 was the bridge's loid cookie rule, replaced by the user's login
                removeRuleIds: [9001, 9002, 9003, 9004],
                addRules: [makeRule(9001, '||old.reddit.com/'), makeRule(9002, '||www.reddit.com/'), cookieRule],
            }),
        )
            .then(() => console.log('[reveddit] DNR header rules installed for old+www reddit'))
            .catch((e: any) => console.log('[reveddit] DNR rule setup failed:', e?.message || e))
    } catch (e: any) {
        console.log('[reveddit] DNR rule setup threw:', e?.message || e)
    }
})()

console.log('bg script running')
// Throttle recovery calls that fetch /api/me.json to at most ~2 per minute
const ME_RECOVER_MIN_INTERVAL_MS = 30000 // 30 seconds
let recoveringMe = false
let lastMeRecoverTs = 0

// Manual "check now" (options page) self-throttle. Module-level is enough: a
// service-worker restart resetting it just allows one extra manual run.
const MANUAL_CHECK_MIN_INTERVAL_MS = 60000
let lastManualCheckTs = 0

async function recoverIfDegraded() {
    const now = Date.now()
    if (recoveringMe) return
    if (now - lastMeRecoverTs < ME_RECOVER_MIN_INTERVAL_MS) return
    // The browser's login is a second account's while it signs in (viewer.ts)
    if (await isViewerConnecting()) return
    recoveringMe = true
    getLoggedinUser()
        .then(user => {
            if (user) {
                // Only a warning the login settles, if it's still the one up
                chrome.storage.local.get(['error_status'], result => {
                    if (isSettledByLogin(result?.error_status)) {
                        chrome.storage.local.remove('error_status', () => {
                            updateBadgeUnseenCount()
                        })
                    }
                })
            }
        })
        .finally(() => {
            recoveringMe = false
            lastMeRecoverTs = Date.now()
        })
}
// Keep stored Reddit cookies up-to-date automatically
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab && tab.url && tab.url.match(/^https?:\/\/[^/]*\.reddit\.com\//)) {
        storeRedditCookies().then(() => {
            // If signed out or the login check failed, try to recover by fetching the logged-in user (throttled)
            chrome.storage.local.get(['error_status'], result => {
                if (result && isSettledByLogin(result.error_status)) {
                    recoverIfDegraded()
                }
            })
        })
    }
})

chrome.cookies.onChanged.addListener(changeInfo => {
    const cookie = changeInfo.cookie
    if (cookie && cookie.domain && cookie.domain.replace(/^\./, '').endsWith('reddit.com')) {
        isViewerConnecting().then(async connecting => {
            if (connecting) {
                // A second account signed in (viewer.ts): done once reddit has
                // set the cookies that follow its login cookie
                if (!changeInfo.removed && (await getRemoteLoginCookies()).includes(cookie.name)) {
                    setTimeout(() => finishViewerConnect(whoAmI), VIEWER_SETTLE_MS)
                }
                return
            }
            storeRedditCookies().then(() => {
                // If signed out or the login check failed, try to recover as soon as cookies change (throttled)
                chrome.storage.local.get(['error_status'], result => {
                    if (result && isSettledByLogin(result.error_status)) {
                        recoverIfDegraded()
                    }
                })
            })
        })
    }
})

// The second account (viewer.ts): who the browser is logged in as when its
// sign-in ends; its header rule, which session rules lose with the browser;
// and a sign-in this worker stopped in the middle of. A sign-in ends when its
// tab leaves reddit's login page or closes.
const whoAmI = whoIsSignedIn
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
// A content script's item lookup (the subscribe button)
const lookupItemsForContentScript = (request: any, sendResponse: (response: any) => void) => {
    getAuth()
        .then(auth => {
            return lookupItemsByID(
                request.ids,
                auth,
                request.monitor_quarantined,
                request.username || '',
                request.authItemsMeta || {},
            )
        })
        .then(items => {
            // if request fails, items is null
            sendResponse({ response: 'done', items })
        })
        .catch(error => {
            console.log('Error in get-reddit-items-by-id:', error)
            sendResponse({ response: 'done', items: null })
        })
}

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
    } else if (request.action === 'get-cookie') {
        getCookie(request.options).then(cookie => {
            sendResponse({ response: 'done', cookie })
        })
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
    } else if (request.action == 'get-reddit-items-by-id') {
        // Not while a second account signs in: the browser's login is its
        isViewerConnecting().then(connecting => {
            if (connecting) {
                sendResponse({ response: 'done', items: null })
                return
            }
            lookupItemsForContentScript(request, sendResponse)
        })
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
    } else if (request.action == 'get-logged-in-user-items') {
        // This will be handled by content script, just pass it through
        return true
    } else if (request.action === 'fetch-with-login') {
        if (isOtherIdentity(sender?.tab)) {
            sendResponse({ ok: false, status: 0, otherIdentity: true })
            return true
        }
        readWithLogin(String(request.path), request.secondTryMode)
            .then(sendResponse)
            .catch(err => sendResponse({ ok: false, status: 0, error: String(err?.message || err) }))
        return true
    } else if (request.action === 'immediate-user-lookup') {
        const user = request.user
        if (user) {
            triggerImmediateLookupOnce(user)
        }
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
        ])
            .then(([backoffMs, lastCheck, nextCheck]) =>
                sendResponse({ backoffRemainingMs: backoffMs, lastCheck, nextCheck }),
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
        try {
            checkForChanges(false, { bypassBackoff: true })
        } catch (e: any) {
            dlog('ui', '[reveddit] manual check failed to start:', String(e?.message || e))
        }
        sendResponse({ started: true })
        return true
    } else if (request.action === 'try-reconnect') {
        // Manual reconnect attempt from popup - subscribe user and trigger lookup.
        // Not while a second account signs in: the browser's login is its.
        isViewerConnecting().then(connecting => {
            if (connecting) {
                sendResponse({ success: false, indeterminate: true, reason: 'a second account is signing in' })
            } else {
                tryReconnect(sendResponse)
            }
        })
        return true
    }
})

// The popup's Connect and Reconnect: subscribe whoever is logged in and look them up
function tryReconnect(sendResponse: (response: any) => void) {
    storeRedditCookies()
        .then(() => getLoggedinUserDetailed())
        .then(detail => {
            const user = detail.user
            if (user) {
                chrome.storage.local.set({ last_logged_in_user: user })
                // Subscribe the user (if not already subscribed)
                subscribeUser(
                    user,
                    () => {
                        // Trigger immediate lookup (forced: the user clicked
                        // Connect and expects a check now)
                        triggerImmediateLookupOnce(user, true)
                        chrome.storage.local.remove('error_status', () => {
                            updateBadgeUnseenCount()
                            sendResponse({ success: true, user })
                        })
                    },
                    () => {
                        // Already subscribed - still trigger lookup and clear error
                        triggerImmediateLookupOnce(user, true)
                        chrome.storage.local.remove('error_status', () => {
                            updateBadgeUnseenCount()
                            sendResponse({ success: true, user })
                        })
                    },
                )
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

// Dev-only introspection for automated testing (the SW console and
// chrome://extensions are unreachable for automation): Chrome pages reach it
// through externally_connectable, Firefox pages through the content script's
// dev relay. Absent from production builds.
const handleDevAction = __DEV__
    ? (message: any, sendResponse: (response: any) => void) => {
          switch (message.action) {
              case 'dev-get-log':
                  sendResponse({ log: (globalThis as any).__devLog || [] })
                  break
              case 'dev-get-storage':
                  // browser.*: Firefox's chrome.* calls take callbacks and return undefined
                  Promise.all([browser.storage.local.get(null), browser.storage.sync.get(null)])
                      .then(([local, sync]) => sendResponse({ local, sync }))
                      .catch(err => sendResponse({ error: String(err?.message || err) }))
                  break
              case 'dev-clear-storage':
                  Promise.all([browser.storage.local.clear(), browser.storage.sync.clear()])
                      .then(() => sendResponse({ ok: true }))
                      .catch(err => sendResponse({ error: String(err?.message || err) }))
                  break
              case 'dev-run-check':
                  Promise.resolve(checkForChanges())
                      .then(() => sendResponse({ ok: true }))
                      .catch(err => sendResponse({ error: String(err?.message || err) }))
                  break
              case 'dev-reload':
                  sendResponse({ ok: true })
                  setTimeout(() => chrome.runtime.reload(), 200)
                  break
              case 'dev-inject':
                  injectContentScriptIntoExistingRedditTabs()
                      .then(() => sendResponse({ ok: true }))
                      .catch((err: any) => sendResponse({ error: String(err?.message || err) }))
                  break
              case 'dev-open-page':
                  // Open an extension page (e.g. src/history.html) as a real tab so
                  // its rendered output/console can be inspected by automation.
                  try {
                      const rel = String(message.page || 'src/history.html')
                      const url = chrome.runtime.getURL(rel) + (message.query || '')
                      chrome.tabs.create({ url, active: true }, tab => sendResponse({ ok: true, tabId: tab?.id }))
                  } catch (err: any) {
                      sendResponse({ error: String(err?.message || err) })
                  }
                  break
              case 'dev-replay-install':
                  // Reruns the exact install-time flow (clear storage, detect user,
                  // subscribe, immediate lookup) — replicates a remove/re-add.
                  Promise.resolve((globalThis as any).__replayInstall?.())
                      .then(() => sendResponse({ ok: true }))
                      .catch((err: any) => sendResponse({ error: String(err?.message || err) }))
                  break
              case 'dev-fetch': {
                  // Fetch an arbitrary reddit URL from the background (host_permissions
                  // CORS bypass) exactly as the detection paths do, and report what
                  // came back — so background-only fetch behavior is diagnosable.
                  const credentials = message.credentials === 'include' ? 'include' : 'omit'
                  fetch(message.url, { credentials, headers: { 'Accept-Language': 'en' } })
                      .then(async r => {
                          const text = await r.text()
                          sendResponse({
                              status: r.status,
                              redirected: r.redirected,
                              finalUrl: r.url,
                              len: text.length,
                              hasShredditPost: text.includes('<shreddit-post'),
                              hasFeed: text.includes('<shreddit-feed'),
                              head: text.slice(0, message.maxLen || 600),
                          })
                      })
                      .catch(err => sendResponse({ error: String(err?.message || err) }))
                  break
              }
              case 'dev-viewer-connect-start':
                  // A second-account sign-in, as the options page's continue
                  // button starts it. Firefox's test runs need this: the relay's
                  // messages come from a content script, which that page's
                  // message handler refuses.
                  startViewerConnectAsMain().then(sendResponse, (err: any) =>
                      sendResponse({ error: String(err?.message || err) }),
                  )
                  break
              case 'dev-viewer-put-back':
                  // In place of typing a password in a test sign-in: the saved
                  // second account's own unexpired cookies go back in the
                  // browser, so the sign-in finishes as a real one would. Only
                  // during a sign-in, or they'd replace the user's own login.
                  // The values never leave the background.
                  Promise.all([getViewer(), isViewerConnecting()])
                      .then(async ([viewer, connecting]) => {
                          if (!connecting) {
                              sendResponse({ ok: false, error: 'not_connecting' })
                              return
                          }
                          const cookies = (viewer?.cookies || []).filter(c => !isExpired(c))
                          await restoreCookies(cookies)
                          sendResponse({ ok: !!viewer, set: cookies.length })
                      })
                      .catch(err => sendResponse({ error: String(err?.message || err) }))
                  break
              case 'dev-reddit-cookie-flags':
                  // The reddit cookies the browser holds: names and flags only
                  browser.cookies
                      .getAll({ domain: 'reddit.com' })
                      .then(jar =>
                          sendResponse({
                              cookies: jar.map(c => ({ name: c.name, session: !!c.session, hostOnly: !!c.hostOnly })),
                          }),
                      )
                      .catch(err => sendResponse({ error: String(err?.message || err) }))
                  break
              case 'dev-www-lookup':
                  // The public-view lookup monitoring runs, for any user and
                  // with no Reddit login: the profile feeds through the fetch
                  // routes, plus page verification of any ids given with
                  // permalinks ({ username, ids, meta: { [id]: { permalink } } }).
                  lookupItemsByID_fromPublicProfile(
                      Array.isArray(message.ids) ? message.ids : [],
                      String(message.username || ''),
                      message.meta || {},
                  )
                      .then(results => sendResponse({ results: results.map(r => r.data) }))
                      .catch(err => sendResponse({ error: String(err?.message || err) }))
                  break
              default:
                  sendResponse({ error: 'unknown dev action' })
          }
      }
    : null

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

chrome.runtime.onInstalled.addListener(function (details) {
    try {
        dlog('cycle', `[reveddit] onInstalled (${details.reason}) — version ${chrome.runtime.getManifest().version}`)
    } catch {
        /* ignored */
    }
    // Existing reddit tabs lost their content script on install/update; re-inject
    // so the reliable tab fetch path is ready before the first removal check.
    injectContentScriptIntoExistingRedditTabs()
    if (details.reason == 'install') {
        initStorage(() => {
            setAlarm(INTERVAL_DEFAULT)
            setBacklogSummaryInstalledAt(Date.now())
            subscribeToLoggedInUser_or_promptForUser()
            updateBadgeUnseenCount()
        })
        const uninstallGoogleFormLink =
            'https://docs.google.com/forms/d/e/1FAIpQLSejWHJAf8thfMdTnnEc5xZPlsdxA_dGUkbmnDq8PABVMkvARg/viewform'
        if (chrome.runtime.setUninstallURL) {
            chrome.runtime.setUninstallURL(uninstallGoogleFormLink)
        }
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
chrome.runtime.onStartup.addListener(() => {
    chrome.storage.local.get(['last_logged_in_user'], result => {
        if (!result.last_logged_in_user) {
            getLoggedinUser().then((user: any) => {
                if (user) {
                    subscribeUser(
                        user,
                        () => {
                            chrome.storage.local.remove('error_status', () => updateBadgeUnseenCount())
                        },
                        () => {
                            chrome.storage.local.remove('error_status', () => updateBadgeUnseenCount())
                        },
                    )
                } else {
                    setWarningBadge('needs_user')
                }
            })
        }
    })
})

if (__DEV__) {
    // Dev helper: from devtools console run `__replayInstall()` to rerun the
    // install-time flow (clears storage, re-detects user, triggers lookup).
    // Keeps web-ext/ADB session intact — no reconnect needed.
    ;(globalThis as any).__replayInstall = async () => {
        console.log('[dev] replaying install flow')
        await new Promise<void>(r => chrome.storage.sync.clear(() => r()))
        await new Promise<void>(r => chrome.storage.local.clear(() => r()))
        initStorage(() => {
            setAlarm(INTERVAL_DEFAULT)
            subscribeToLoggedInUser_or_promptForUser()
            updateBadgeUnseenCount()
        })
    }
    console.log('[dev] __replayInstall() available from devtools console')
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
            // force: reinstalls persist user_initial_lookup_done in synced
            // storage; without forcing, a reinstall would skip the first check.
            setTimeout(() => triggerImmediateLookupOnce(user, true), 3000)
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

// force bypasses the once-per-user guard (which lives in synced storage and so
// survives reinstalls) — used when the check is explicitly expected: install
// and the popup's Connect/Reconnect.
function triggerImmediateLookupOnce(user: string, force = false) {
    chrome.storage.sync.get(['user_initial_lookup_done'], result => {
        const lookupMap = result.user_initial_lookup_done || {}
        if (force || !lookupMap[user]) {
            lookupMap[user] = true
            chrome.storage.sync.set({ user_initial_lookup_done: lookupMap }, () => {
                // Run a full check which includes logged-in user
                try {
                    checkForChanges()
                } catch (e) {
                    console.log('Immediate lookup failed to start:', e)
                }
            })
        }
    })
}

const notificationClicked = (rawThing: string) => {
    const thing = rawThing.replace(/_backlog$/, '')

    if (thing === 'backlog_summary') {
        createTab(chrome.runtime.getURL('src/history.html?filter=removed'))
        return
    }

    const isUser = thing === 'other' ? false : true
    chrome.storage.sync.get(undefined as any, storage => {
        const unseenIDs = getUnseenIDs_thing(thing, isUser, storage)
        let url: string
        if (isUser) {
            url = chrome.runtime.getURL('src/history.html')
        } else {
            url = chrome.runtime.getURL('src/other.html')
            if (unseenIDs.length) {
                url = `https://www.reveddit.com/info?id=${unseenIDs.join(',')}&removal_status=all`
            }
        }
        markThingAsSeen(storage, thing, isUser)
        // The page opens even when the save is refused
        browser.storage.sync
            .set(storage)
            .catch((e: any) =>
                dlog('ui', '[reveddit] marking seen on a notification click failed:', String(e?.message || e)),
            )
            .then(() => {
                updateBadgeUnseenCount()
                clearPendingNotification(thing).catch(() => {})
                createTab(url)
            })
    })
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
    getOptions((_users, _others, options) => {
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
