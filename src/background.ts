import {
    goToOptions,
    setAlarm,
    ALARM_NAME,
    createNotification,
    updateBadgeUnseenCount,
    createTab,
    setWarningBadge,
} from './src/common'
import { checkForChanges } from './src/monitoring'
import {
    lookupItemsByID,
    getLoggedinUser,
    getCookie,
    getAuth,
    storeRedditCookies,
    throwIfLegacyDisabled,
} from './src/requests'
import {
    initStorage,
    INTERVAL_DEFAULT,
    subscribeUser,
    getUnseenIDs_thing,
    markThingAsSeen,
    clearPendingNotification,
    setBacklogSummaryInstalledAt,
    markBacklogSummarySent,
} from './src/storage'
import { setupContextualMenu } from './src/contextMenus'
import browser from 'webextension-polyfill'
import { getItems_fromOld, getPost_fromOld } from './src/parse_html/old'
import { fetchNews } from './src/news'
import { initDiagPersistence, buildDiagReport, clearDiagLog, dlog } from './src/diaglog'
import { getRateLimitBackoffRemainingMs } from './src/storage'

// The background context is the diagnostic log's single writer — see diaglog.ts.
initDiagPersistence()

const WHATSNEW_SHOWN_KEY = 'whatsnew_shown_version'

// Compare only the first 3 segments (e.g. "0.0.5") so that patch bumps like
// 0.0.5.0 → 0.0.5.1 don't re-show the same what's-new page.
const whatsnewGeneration = (version: string) => version.split('.').slice(0, 3).join('.')

// Dev builds keep a ring buffer of background console output, readable from
// reveddit.com via the dev-* external messages below. The service worker
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

setupContextualMenu()

// BEGIN webRequest API code
// When manifest v3 goes live, this code should only run for firefox
// It enables viewing quarantined content on reveddit (except user pages which are covered with cloudflare workers)

// Can use this to check for firefox build:
if (__BUILT_FOR__ !== 'chrome') {
    const opt_extraInfoSpec = ['requestHeaders', 'blocking'] as any

    browser.webRequest.onBeforeSendHeaders.addListener(
        function (details) {
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
            urls: ['https://oauth.reddit.com/*.json*', 'https://*.reddit.com/api/info*'],
        },
        opt_extraInfoSpec,
    )
}
// END webRequest API code

// Strip the chrome-extension:// Origin header off the background's reddit
// requests (old.reddit profile-scan fetches, www.reddit public-profile fetches).
// Reddit 403s requests carrying that Origin; the Sec-Fetch-* trio marks them as
// cross-site programmatic fetches, which Reddit also rejects for these pages (a
// navigation, Mode:navigate/Dest:document, returns 200). Stripping both makes
// them look like plain requests.
// Uses declarativeNetRequest (Chrome/Edge MV3); Firefox uses the webRequest
// handler above. Session rules (not dynamic) because the tabIds condition is
// session-rule-only; the service worker re-registers them on every start.
;(() => {
    const dnr = (chrome as any).declarativeNetRequest
    if (!dnr?.updateSessionRules) return
    const stripHeaders = [
        { header: 'origin', operation: 'remove' },
        { header: 'sec-fetch-site', operation: 'remove' },
        { header: 'sec-fetch-mode', operation: 'remove' },
        { header: 'sec-fetch-dest', operation: 'remove' },
    ]
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
        },
    })
    // Prior versions persisted 9001 as a dynamic rule (no tab scoping) — clean it up
    dnr.updateDynamicRules({ removeRuleIds: [9001, 9002] }).catch(() => {})
    dnr.updateSessionRules({
        removeRuleIds: [9001, 9002],
        addRules: [makeRule(9001, '||old.reddit.com/'), makeRule(9002, '||www.reddit.com/')],
    })
        .then(() => console.log('[reveddit] DNR header-strip rules installed for old+www reddit'))
        .catch((e: any) => console.log('[reveddit] DNR rule setup failed:', e?.message || e))
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

function recoverIfDegraded() {
    const now = Date.now()
    if (recoveringMe) return
    if (now - lastMeRecoverTs < ME_RECOVER_MIN_INTERVAL_MS) return
    recoveringMe = true
    getLoggedinUser()
        .then(user => {
            if (user) {
                chrome.storage.local.remove('error_status', () => {
                    updateBadgeUnseenCount()
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
            // If in a degraded state, try to recover by fetching the logged-in user (throttled)
            chrome.storage.local.get(['error_status'], result => {
                if (result && result.error_status) {
                    recoverIfDegraded()
                }
            })
        })
    }
})

chrome.cookies.onChanged.addListener(changeInfo => {
    const cookie = changeInfo.cookie
    if (cookie && cookie.domain && cookie.domain.replace(/^\./, '').endsWith('reddit.com')) {
        storeRedditCookies().then(() => {
            // If in a degraded state, try to recover as soon as cookies change (throttled)
            chrome.storage.local.get(['error_status'], result => {
                if (result && result.error_status) {
                    recoverIfDegraded()
                }
            })
        })
    }
})
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
    } else if (request.action == 'get-reddit-items-by-id') {
        // Only get OAuth auth if user has provided a custom client ID
        chrome.storage.sync.get(['options'], result => {
            const needsOAuth = result.options && result.options.custom_clientid && result.options.custom_clientid !== ''
            const authPromise = needsOAuth ? getAuth() : Promise.resolve('none')

            authPromise
                .then(auth => {
                    return lookupItemsByID(
                        request.ids,
                        auth,
                        request.monitor_quarantined,
                        false,
                        [],
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
        })
        return true
    } else if (request.action === 'store-reddit-cookies') {
        // Trigger cookie capture in background context
        storeRedditCookies()
        sendResponse({ response: 'done' })
        return true
    } else if (request.action == 'get-logged-in-user-items') {
        // This will be handled by content script, just pass it through
        return true
    } else if (request.action === 'get-from-old') {
        // Unauthenticated old.reddit.com thread page — dying endpoint, gated
        throwIfLegacyDisabled('old.reddit.com post page')
            .then(() => getPost_fromOld(request.path))
            .then(data => {
                sendResponse(data)
            })
            .catch(err => {
                sendResponse({ error: String(err?.message || err) })
            })
        return true
    } else if (request.action === 'fetch-userpage-html') {
        // Profile scan: content scripts on new reddit (www/sh) can't fetch
        // old.reddit.com (cross-origin → CORS). The background has the
        // host_permissions CORS bypass, so fetch the HTML here and hand the raw
        // text back to the content script to parse.
        // Use the explicit path if provided (e.g. /user/X/comments?sort=new),
        // otherwise fall back to the overview for backward compatibility.
        const url = request.path
            ? `https://old.reddit.com${request.path}`
            : `https://old.reddit.com/user/${encodeURIComponent(request.username)}${request.qs || ''}`
        throwIfLegacyDisabled('old.reddit.com userpage HTML')
            .then(() => fetch(url, { credentials: 'omit' }))
            .then(async r => {
                console.log(`[reveddit] bg fetch-userpage-html ${url} -> ${r.status}`)
                const text = r.ok ? await r.text() : ''
                sendResponse({ ok: r.ok, status: r.status, text })
            })
            .catch(err => {
                console.log('[reveddit] bg fetch-userpage-html error:', err?.message || String(err))
                sendResponse({ ok: false, status: 0, error: String(err?.message || err) })
            })
        return true
    } else if (request.action === 'fetch-api-info') {
        // Profile-scan removal check via old.reddit.com/api/info, unauthenticated
        // (no cookies from the extension origin). Same CORS/DNR situation as the
        // user-page fetch, so it also goes through the background on new reddit.
        // NOTE: no credentials:'omit' — that flag alone 403s the JSON API. From the
        // background there are no reddit cookies anyway, so a plain fetch is
        // unauthenticated without tripping that block.
        const url = `https://old.reddit.com/api/info.json?id=${request.ids}&raw_json=1`
        throwIfLegacyDisabled('old.reddit.com api/info JSON')
            .then(() => fetch(url))
            .then(async r => {
                console.log(
                    `[reveddit] bg fetch-api-info (${String(request.ids).split(',').length} ids) -> ${r.status}`,
                )
                const data = r.ok ? await r.json() : null
                sendResponse({ ok: r.ok, status: r.status, children: data?.data?.children || null })
            })
            .catch(err => {
                console.log('[reveddit] bg fetch-api-info error:', err?.message || String(err))
                sendResponse({ ok: false, status: 0, error: String(err?.message || err) })
            })
        return true
    } else if (request.action === 'fetch-old-reddit-json') {
        // Thread restore: fetch an old.reddit.com .json URL unauthenticated (no
        // cookies from the extension origin) so removed bodies are visible. Same
        // CORS/DNR situation as the profile-scan fetches. Host-checked.
        const url = String(request.url || '')
        if (!url.startsWith('https://old.reddit.com/')) {
            sendResponse({ ok: false, status: 0, error: 'invalid url' })
            return true
        }
        throwIfLegacyDisabled('old.reddit.com JSON')
            .then(() => fetch(url))
            .then(async r => {
                console.log(`[reveddit] bg fetch-old-reddit-json ${url.split('?')[0]} -> ${r.status}`)
                const data = r.ok ? await r.json() : null
                sendResponse({ ok: r.ok, status: r.status, data })
            })
            .catch(err => {
                console.log('[reveddit] bg fetch-old-reddit-json error:', err?.message || String(err))
                sendResponse({ ok: false, status: 0, error: String(err?.message || err) })
            })
        return true
    } else if (request.action === 'immediate-user-lookup') {
        const user = request.user
        if (user) {
            triggerImmediateLookupOnce(user)
        }
        sendResponse({ response: 'done' })
        return true
    } else if (request.action === 'get-diag-log') {
        getRateLimitBackoffRemainingMs()
            .then(backoffMs =>
                buildDiagReport({
                    includeUsername: !!request.includeUsername,
                    extraHeaderLines: [
                        `rate-limit backoff: ${backoffMs > 0 ? Math.ceil(backoffMs / 1000) + 's remaining' : 'none'}`,
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
        ])
            .then(([backoffMs, lastCheck]) => sendResponse({ backoffRemainingMs: backoffMs, lastCheck }))
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
        // Manual reconnect attempt from popup - subscribe user and trigger lookup
        storeRedditCookies()
            .then(() => getLoggedinUser())
            .then((user: any) => {
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
                    sendResponse({ success: false })
                }
            })
            .catch(err => {
                console.log('try-reconnect error:', err)
                sendResponse({ success: false })
            })
        return true
    }
})

chrome.runtime.onMessageExternal.addListener(function (message, sender, sendResponse) {
    switch (message.action) {
        case 'fetch-old':
            // Unauthenticated old.reddit.com user page HTML — dying endpoint, gated
            throwIfLegacyDisabled('old.reddit.com HTML')
                .then(() => getItems_fromOld(message.path))
                .then(data => {
                    sendResponse({ data })
                })
                .catch(err => {
                    sendResponse({ data: { error: String(err?.message || err) } })
                })
            break
        case 'version':
            sendResponse({ version: chrome.runtime.getManifest().version, name: chrome.runtime.getManifest().name })
            break
    }
    // Dev-only introspection for automated testing from reveddit.com (the SW
    // console and chrome://extensions are unreachable for automation). Absent
    // from production builds.
    if (__DEV__) {
        switch (message.action) {
            case 'dev-get-log':
                sendResponse({ log: (globalThis as any).__devLog || [] })
                break
            case 'dev-get-storage':
                Promise.all([chrome.storage.local.get(undefined), chrome.storage.sync.get(undefined)])
                    .then(([local, sync]) => sendResponse({ local, sync }))
                    .catch(err => sendResponse({ error: String(err?.message || err) }))
                break
            case 'dev-clear-storage':
                Promise.all([chrome.storage.local.clear(), chrome.storage.sync.clear()])
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
        // Open the what's new page once per version bump.
        try {
            const currentVersion = chrome.runtime.getManifest().version
            chrome.storage.local.get(WHATSNEW_SHOWN_KEY, res => {
                if (res && whatsnewGeneration(res[WHATSNEW_SHOWN_KEY] || '') !== whatsnewGeneration(currentVersion)) {
                    chrome.storage.local.set({ [WHATSNEW_SHOWN_KEY]: currentVersion }, () => {
                        createTab(chrome.runtime.getURL('src/whatsnew.html'))
                    })
                }
            })
        } catch (e) {
            console.log('whatsnew open failed:', e)
        }
        // Refresh the news feed cache on update.
        fetchNews({ force: true }).catch(() => {})
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
    const scripting = (chrome as any).scripting
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
        browser.storage.sync.set(storage).then(() => {
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

if (!chrome.extension.inIncognitoContext) {
    // ### BEGIN WORKAROUND for broken alarms
    // https://bugs.chromium.org/p/chromium/issues/detail?id=1316588#c99
    ;(async function lostEventsWatchdog() {
        let quietCount = 0
        while (true) {
            await new Promise(resolve => setTimeout(resolve, 65000))
            const now = Date.now()
            const age = now - lastAlarm
            console.log(`lostEventsWatchdog: last alarm ${age / 1000}s ago`)
            if (age < 95000) {
                quietCount = 0 // alarm still works.
            } else if (++quietCount >= 3) {
                console.error('lostEventsWatchdog: reloading!')
                return chrome.runtime.reload()
            } else {
                setAlarm(INTERVAL_DEFAULT)
            }
        }
    })()
    // ### END WORKAROUND for broken alarms

    chrome.alarms.onAlarm.addListener(function (alarm) {
        if (alarm.name == ALARM_NAME) {
            lastAlarm = Date.now() // part of WORKAROUND for broken alarms
            checkForChanges(true) // apply jitter to periodic (alarm-driven) polls
            // Piggyback the news feed refresh on the alarm tick; fetchNews
            // enforces its own 6-hour throttle internally.
            fetchNews().catch(() => {})
        }
    })
}
