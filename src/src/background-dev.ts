import browser from 'webextension-polyfill'
import { checkForChanges } from './monitoring'
import { lookupItemsByID_fromPublicProfile } from './requests'
import { INTERVAL_DEFAULT, initStorage, updateBadgeUnseenCount } from './storage'
import { setAlarm } from './common'

// Dev builds only: background.ts calls these behind `__DEV__`, so production
// bundles drop them. Nothing here runs at import time.

// Dev builds keep a ring buffer of background console output, readable from
// the local dev site (localhost:8080) via the dev-* messages below. The service worker
// console is otherwise unreachable for automated testing.
export function installDevLog() {
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

// Dev-only introspection for automated testing (the SW console and
// chrome://extensions are unreachable for automation): Chrome pages reach it
// through externally_connectable, Firefox pages through the content script's
// dev relay. Absent from production builds.
export const createDevActionHandler =
    (startViewerConnectAsMain: () => Promise<any>) => (message: any, sendResponse: (response: any) => void) => {
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
            case 'dev-run-check':
                Promise.resolve(checkForChanges())
                    .then(() => sendResponse({ ok: true }))
                    .catch(err => sendResponse({ error: String(err?.message || err) }))
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

// Dev helper: from devtools console run `__replayInstall()` to rerun the
// install-time flow (clears storage, re-detects user, triggers lookup).
// Keeps web-ext/ADB session intact — no reconnect needed.
export function installReplayInstall(subscribeToLoggedInUser_or_promptForUser: () => Promise<void>) {
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
