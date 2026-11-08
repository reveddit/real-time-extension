import browser from 'webextension-polyfill'
import { dlog } from './diaglog'
import { setWarningBadge, OWN_LISTING_QUERY } from './common'
import { settableCookie, toStoredCookie, hasRedditLoginCookie } from './viewer'
import { getOptions } from './storage'
import { MECHANISM_ME_CHALLENGE } from './news'
import { solveChallenge } from './parse_html/new'
import { isStreakLong, recordStreak } from './lookup-status'
import { rehydrateStoredRedditCookies } from './reddit-cookies'
import { flagIfRateLimited, isMechanismDisabled } from './request-gates'

const oauth_reddit = 'https://oauth.reddit.com/'

export const NO_AUTH = 'none'

// Consecutive refusals of the logged-in detection path, mirroring
// recordWwwDetectOutcome in lookup-status.ts: one is noise, a streak means
// reddit isn't accepting the login. Definite outcomes (a username, or a clean logged-out
// response) reset the streak. Only the monitoring cycle records outcomes.
export const LOGGED_IN_VIEW_UNAVAILABLE = 'logged_in_view_unavailable'

// The warnings that finding the user signed in settles: nobody was signed in,
// or the login check wasn't answering. The rest are about checks a login
// doesn't fix (the logged-out view, a login wall, the second account), which
// only their own recovery ends.
export const isSettledByLogin = (status: unknown): boolean =>
    status === 'needs_user' || status === LOGGED_IN_VIEW_UNAVAILABLE

const LOGIN_DETECT_FAILURES_KEY = 'login_detect_consecutive_failures'

// Reddit turned a login check or a listing away. A network error, an outage or a
// rate limit is no such answer, and says nothing about the login.
export const isLoginRefusal = (failure = ''): boolean => /(status|request failed:) 40[13]\b|non-JSON/.test(failure)

// Reddit keeps refusing the login check and the user's listing
export const isLoginKeptOut = () => isStreakLong(LOGIN_DETECT_FAILURES_KEY)

export const recordLoginDetectOutcome = (indeterminate: boolean) =>
    recordStreak(
        LOGIN_DETECT_FAILURES_KEY,
        !indeterminate,
        n => dlog('auth', `[reveddit] login detection indeterminate — consecutive failures: ${n}`),
        () => setWarningBadge(LOGGED_IN_VIEW_UNAVAILABLE),
    )

const cookieDetails_redditSession = { name: 'reddit_session', url: 'https://reddit.com' }

// What cookies.set needs to put a cookie back as it was, expiry included: one
// put back without it lasts only until the browser closes, which signs the
// user out of Reddit (viewer.ts settableCookie)
const getSettableCookie = (cookie: any): any => (cookie ? settableCookie(toStoredCookie(cookie)) : cookie)

// A request with a real OAuth token: only the token paths get here. The cookie
// that opts in to quarantined content is set every time. monitor_quarantined
// also takes reddit_session out as the request starts and puts it back right
// after, without waiting for the answer.
export const fetch_forReddit = async (pathAndSearch: string, auth: any, monitor_quarantined: boolean) => {
    let cookie_redditSession
    await browser.cookies.set({
        domain: 'reddit.com',
        url: 'https://reddit.com',
        name: '_options',
        value: '{%22pref_quarantine_optin%22:true}',
    })
    if (monitor_quarantined) {
        cookie_redditSession = getSettableCookie(await browser.cookies.get(cookieDetails_redditSession))
        if (cookie_redditSession) {
            await browser.cookies.remove(cookieDetails_redditSession)
        }
    }
    const result = fetch(oauth_reddit + pathAndSearch, { ...auth, cache: 'reload' })
        .then(handleFetchErrors)
        .then(getRedditData)
        .catch(console.log)
    if (cookie_redditSession) {
        await browser.cookies.set(cookie_redditSession)
    }
    return result
}

export const lookupItemsByUser = (user: string, monitor_quarantined: boolean, auth: any) =>
    fetch_forReddit(`user/${user}/overview.json${OWN_LISTING_QUERY}`, auth, monitor_quarantined)

// Alternative approach: use the same method as getLoggedinUser but with proper authentication
export const lookupItemsByLoggedInUserWithAuth = (monitor_quarantined: boolean, auth: any) => {
    // First try www.reddit.com with rehydrated cookies
    return rehydrateStoredRedditCookies().then(() => {
        const url = `https://www.reddit.com/user/me.json${OWN_LISTING_QUERY}`
        const options = { credentials: 'include' as const, cache: 'reload' as const }
        return fetch(url, options)
            .then(response => {
                if (response.ok) {
                    // A challenge comes with a 200, and it's a refusal all the same
                    return response.json().catch(() => {
                        throw new Error('non-JSON listing from www.reddit.com')
                    })
                } else {
                    throw new Error(`www.reddit.com request failed: ${response.status}`)
                }
            })
            .then(data => {
                if (data && data.data && data.data.children) {
                    return data.data.children
                }
                throw new Error('Invalid data format from www.reddit.com')
            })
            .catch(async error => {
                console.log('www.reddit.com request failed, trying OAuth fallback:', error.message)
                // Whatever the fallback answers: its token has no user, so it
                // can't make up for this
                flagIfRateLimited(error)

                // Fall back to OAuth if www.reddit.com fails and auth is available
                if (auth && auth !== 'none') {
                    const children = await lookupItemsByUser('me', monitor_quarantined, auth)
                    // Without items, www's failure stands: this swallows its own
                    // errors (returns undefined), and an empty answer says nothing
                    // about the signed-in user. Monitoring checks whose items they are.
                    if (children?.length) {
                        return children
                    }
                } else {
                    console.log('No OAuth auth available for fallback')
                }
                throw error
            })
    })
}

const handleFetchErrors = (response: Response) => {
    if (!response.ok) {
        throw Error(response.statusText)
    }
    return response.json()
}

const getRedditData = (data: any) => {
    if (!data || !data.data || !data.data.children) {
        throw Error('reddit data is not defined')
    }
    return data.data.children
}

const getRedditToken = (data: any) => {
    if (!data || !data.access_token) {
        throw Error('access token is not defined')
    }
    return data.access_token
}

export const getAuth = () => {
    return getOptions((options: Record<string, any>) => {
        const use_this_clientID = options.custom_clientid
        if (!use_this_clientID || use_this_clientID === 'testing') {
            return NO_AUTH
        }
        const tokenInit = {
            headers: {
                Authorization: `Basic ${btoa(`${use_this_clientID}:`)}`,
                'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
            },
            method: 'POST',
            body: `grant_type=${encodeURIComponent('https://oauth.reddit.com/grants/installed_client')}&device_id=DO_NOT_TRACK_THIS_DEVICE`,
        }

        return fetch('https://www.reddit.com/api/v1/access_token', tokenInit)
            .then(handleFetchErrors)
            .then(getRedditToken)
            .then(token => ({
                headers: {
                    Authorization: `bearer ${token}`,
                    'Accept-Language': 'en',
                },
            }))
            .catch(console.log)
    })
}

// --- Logged-in-user detection ---
// Tri-state so callers can tell "definitely logged out" from "couldn't
// determine" (challenge page, 429, network failure). The old boolean-null shape
// collapsed both into null, and monitoring silently skipped every cycle when a
// client's /api/me.json was WAF-challenged — zero detections, no visible error.
export interface LoginDetectResult {
    user: string | null
    // True when no probe produced a definite answer. Monitoring treats this as
    // "detection channel broken" (badge after a streak, grace mode), never as
    // "logged out".
    indeterminate: boolean
    reason?: string
}

// Retry-with-solution when me.json serves the string-doubling challenge, same
// solver as the absent-verification path. Remote-gated (MECHANISM_ME_CHALLENGE)
// with the usual dev override (highest priority):
//   chrome.storage.local.set({ dev_disable_me_challenge_solve: true })  // or false
//   chrome.storage.local.remove('dev_disable_me_challenge_solve')       // defaults
const DEV_DISABLE_ME_CHALLENGE_KEY = 'dev_disable_me_challenge_solve'

const isMeChallengeSolveDisabled = () =>
    isMechanismDisabled(DEV_DISABLE_ME_CHALLENGE_KEY, MECHANISM_ME_CHALLENGE, false)

type MeProbe =
    | { state: 'user'; user: string }
    | { state: 'loggedOut' }
    | { state: 'indeterminate'; reason: string; html?: string }

// One fetch of an /api/me.json URL, classified. Logged-out is only concluded
// from a clean 2xx JSON body without a username; every other shape (non-2xx,
// HTML/challenge, network error) is indeterminate.
const probeMeJson = async (url: string): Promise<MeProbe> => {
    let response: Response
    try {
        response = await fetch(url, { credentials: 'include', cache: 'reload' })
    } catch (err: any) {
        return { state: 'indeterminate', reason: `network error: ${String(err?.message || err)}` }
    }
    if (!response.ok) {
        return { state: 'indeterminate', reason: `status ${response.status}` }
    }
    let text: string
    try {
        text = await response.text()
    } catch (err: any) {
        return { state: 'indeterminate', reason: `body read failed: ${String(err?.message || err)}` }
    }
    try {
        const data = JSON.parse(text)
        const name = data?.data?.name
        return name ? { state: 'user', user: String(name) } : { state: 'loggedOut' }
    } catch {
        return { state: 'indeterminate', reason: 'non-JSON response (challenge or HTML page)', html: text }
    }
}

const probeMeJsonWithChallengeRetry = async (host: string): Promise<MeProbe> => {
    const targetUrl = `https://${host}/api/me.json`
    let probe = await probeMeJson(targetUrl)
    if (probe.state === 'indeterminate' && probe.html && !(await isMeChallengeSolveDisabled())) {
        const solutionUrl = solveChallenge(probe.html, targetUrl)
        if (solutionUrl) {
            dlog('auth', `[reveddit] me.json challenge detected on ${host} — retrying with solution`)
            probe = await probeMeJson(solutionUrl)
        }
    }
    if (probe.state === 'indeterminate') {
        // Keep the historical line shape: a challenge/HTML response is otherwise
        // indistinguishable from "not logged in" when debugging connect issues.
        dlog('auth', `getLoggedinUser direct fetch failed (${targetUrl}): ${probe.reason}`)
    }
    return probe
}

export const getLoggedinUserDetailed = async (): Promise<LoginDetectResult> => {
    // Reddit answers a browser with no login with a refusal, not a clean
    // "nobody", so with none there's nothing to ask it. A login the browser
    // lost is put back first.
    if (!(await hasRedditLoginCookie())) {
        await rehydrateStoredRedditCookies()
        if (!(await hasRedditLoginCookie())) {
            return { user: null, indeterminate: false }
        }
    }

    // Pick a host: prefer old.reddit.com if an old.reddit tab is open (quarantine
    // opt-in lives there), otherwise default to www.reddit.com. With `cookies`
    // permission + reddit host_permissions the browser includes the user's real
    // session cookies even with no tab open.
    const pickHost = (): Promise<string> =>
        new Promise(hostResolve => {
            try {
                chrome.tabs.query({ url: ['*://old.reddit.com/*'] }, tabs => {
                    hostResolve(tabs && tabs.length > 0 ? 'old.reddit.com' : 'www.reddit.com')
                })
            } catch {
                hostResolve('www.reddit.com')
            }
        })

    const primaryHost = await pickHost()

    let probe = await probeMeJsonWithChallengeRetry(primaryHost)
    if (probe.state === 'user') {
        return { user: probe.user, indeterminate: false }
    }
    let sawLoggedOut = probe.state === 'loggedOut'
    let lastReason: string | undefined = probe.state === 'indeterminate' ? probe.reason : undefined

    if (probe.state === 'indeterminate') {
        // Challenge/throttle flags are often per-host — a definite answer from
        // the other host is just as authoritative.
        const fallbackHost = primaryHost === 'www.reddit.com' ? 'old.reddit.com' : 'www.reddit.com'
        probe = await probeMeJsonWithChallengeRetry(fallbackHost)
        if (probe.state === 'user') {
            return { user: probe.user, indeterminate: false }
        }
        sawLoggedOut = sawLoggedOut || probe.state === 'loggedOut'
        lastReason = probe.state === 'indeterminate' ? probe.reason : lastReason
    }

    // Last resort (pre-existing behavior): rehydrate any previously-stored
    // cookies and retry the primary host once.
    if (!sawLoggedOut) {
        const rehydrated = await rehydrateStoredRedditCookies()
        if (rehydrated) {
            probe = await probeMeJsonWithChallengeRetry(primaryHost)
            if (probe.state === 'user') {
                return { user: probe.user, indeterminate: false }
            }
            if (probe.state === 'indeterminate') {
                dlog('auth', 'Failed to authenticate with stored cookies')
                lastReason = probe.reason
            }
            sawLoggedOut = sawLoggedOut || probe.state === 'loggedOut'
        }
    }

    if (sawLoggedOut) {
        return { user: null, indeterminate: false }
    }
    return { user: null, indeterminate: true, reason: lastReason || 'unknown' }
}

// Back-compat shape for callers that only care about the username (popup
// reconnect, startup): resolves the username or null, never rejects.
export const getLoggedinUser = (): Promise<string | null> => getLoggedinUserDetailed().then(r => r.user)

// Who the browser is signed in to reddit as, for the second account's sign-in
// (viewer.ts): it rejects when reddit gave no clean answer, which isn't the
// same as nobody being signed in
export const whoIsSignedIn = (): Promise<string | null> =>
    getLoggedinUserDetailed().then(detail => {
        if (detail.indeterminate) {
            throw new Error(`reddit didn't say who's signed in (${detail.reason})`)
        }
        return detail.user
    })
