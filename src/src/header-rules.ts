import browser from 'webextension-polyfill'
import { getViewer, viewerCookieHeaderFor, ViewerAccount, VIEWER_KEY } from './viewer'
import { isPublicViewUrl, publicCookieHeaderFor, PUBLIC_VIEW_URL_FILTER } from './public-cookies'

// The header rules the extension's own requests need (from the background, and
// the logged-out reads its tab routes send from inside a reddit tab), and
// reveddit.com's: Firefox's listener and Chrome and Edge's static rules. Both
// are installed from background.ts, synchronously at its top level and in the
// order set there: the service worker must register its listeners before its
// first await.

// A request's headers with its Cookie header set to value, or taken off when
// value is ''
const withCookie = (headers: { name: string; value?: string }[] | undefined, value: string) => [
    ...(headers || []).filter(h => h.name.toLowerCase() !== 'cookie'),
    ...(value ? [{ name: 'Cookie', value }] : []),
]

// BEGIN webRequest API code
// When manifest v3 goes live, this code should only run for firefox
// It enables viewing quarantined content on reveddit (except user pages which are covered with cloudflare workers)
export function installWebRequestHeaders() {
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
                const withViewerCookies = (viewer: ViewerAccount | null) => ({
                    requestHeaders: withCookie(details.requestHeaders, viewerCookieHeaderFor(details.url, viewer)),
                })
                return viewerForHeaders === undefined
                    ? loadViewerForHeaders().then(withViewerCookies)
                    : withViewerCookies(viewerForHeaders)
            }
            // The extension's logged-out reads, from the background or from
            // inside a www.reddit.com tab: the cookies reddit gave the reads
            // before them (public-cookies.ts), or none, if the marker carries
            // the jar's token. Unlike the second account's, this branch isn't
            // limited to the background, so a URL with another token may be a
            // page's own request, and keeps its cookies.
            if (details.method === 'GET' && isPublicViewUrl(details.url)) {
                return publicCookieHeaderFor(details.url).then(header => ({
                    requestHeaders:
                        header === null ? details.requestHeaders : withCookie(details.requestHeaders, header),
                }))
            }
            //chrome uses details.initiator, but since chrome doesn't support webRequest anymore,
            //only need to check the value supported by firefox
            if (
                details.originUrl &&
                details.originUrl.match(/^https?:\/\/(www\.reveddit\.com|localhost:[0-9]*)(\/.*)?$/)
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
            // The rv_ patterns are the markers of the second account and the
            // logged-out reads (match patterns test the query
            // string too); keeping this list narrow matters because the
            // listener is blocking and would otherwise run on every request
            // the user's own reddit tabs make.
            urls: [
                'https://oauth.reddit.com/*.json*',
                'https://*.reddit.com/api/info*',
                'https://www.reddit.com/*rv_viewer=*',
                PUBLIC_VIEW_URL_FILTER,
            ],
        },
        opt_extraInfoSpec,
    )
}
// END webRequest API code

// Strip the chrome-extension:// Origin header off the background's reddit
// requests (www.reddit public-profile fetches):
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
export function installDnrHeaderRules() {
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
    try {
        // Prior versions persisted 9001 as a dynamic rule (no tab scoping) — clean it up
        Promise.resolve(dnr.updateDynamicRules({ removeRuleIds: [9001, 9002] })).catch(() => {})
        Promise.resolve(
            dnr.updateSessionRules({
                // 9003 set the legacy pages' cookie, gone with them; 9004 was the bridge's loid
                // cookie rule, replaced by the user's login
                removeRuleIds: [9001, 9002, 9003, 9004],
                addRules: [makeRule(9001, '||old.reddit.com/'), makeRule(9002, '||www.reddit.com/')],
            }),
        )
            .then(() => console.log('[reveddit] DNR header rules installed for old+www reddit'))
            .catch((e: any) => console.log('[reveddit] DNR rule setup failed:', e?.message || e))
    } catch (e: any) {
        console.log('[reveddit] DNR rule setup threw:', e?.message || e)
    }
}
