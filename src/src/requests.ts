import { getOptions, addToPendingPostQueue } from './storage'
import browser from 'webextension-polyfill'
import { getItemsById_fromOldHTML } from './parse_html/old'

const clientID = 'SEw1uvRd6kxFEw'
const oauth_reddit = 'https://oauth.reddit.com/'
const www_reddit = 'https://www.reddit.com/'
const OAUTH_REVEDDIT = 'https://cred2.reveddit.com/'
const WWW_REVEDDIT = 'https://wred.reveddit.com/'

const NO_AUTH = 'none'

export const lookupItemsByID = (
    ids: string | string[],
    auth: any,
    monitor_quarantined = false,
    monitor_quarantined_remote = false,
    quarantined_subreddits: string[] = [],
) => {
    const params: Record<string, any> = { id: ids, raw_json: 1 }
    if (monitor_quarantined_remote) {
        params.quarantined_subreddits = quarantined_subreddits.join(',')
    }
    const search =
        '?' +
        Object.keys(params)
            .map(k => `${k}=${params[k]}`)
            .join('&')

    return lookupItemsByID_withFallback('api/info', search, auth, monitor_quarantined, monitor_quarantined_remote, ids)
}

// Helper to try fetching via content script on a Reddit tab
const tryContentScriptFetch = async (ids: string | string[]) => {
    // Find a Reddit tab to use for the fetch
    const tabs = await browser.tabs.query({ url: ['*://*.reddit.com/*'] })
    const supportedTabs = tabs.filter(tab => {
        try {
            const hostname = new URL(tab.url!).hostname
            return hostname === 'www.reddit.com' || hostname === 'old.reddit.com'
        } catch {
            return false
        }
    })

    if (supportedTabs.length === 0) {
        throw new Error('No Reddit tab available for content script fetch')
    }

    // Try to send message to the first available Reddit tab
    const response = (await browser.tabs.sendMessage(supportedTabs[0].id!, {
        action: 'fetch-api-info-public',
        ids: ids,
    })) as any

    if (response && response.success) {
        return response.items
    } else {
        throw new Error(response?.error || 'Content script fetch failed')
    }
}

// Function that tries multiple fallbacks: www JSON -> content script -> old HTML -> OAuth
export const lookupItemsByID_withFallback = (
    path: string,
    search: string,
    auth: any,
    monitor_quarantined = false,
    monitor_quarantined_remote = false,
    ids: string | string[] = '',
) => {
    // First try www.reddit.com without authentication
    const wwwUrl = www_reddit + path + '.json' + search
    const wwwOptions = { credentials: 'omit' as const }

    return fetch(wwwUrl, wwwOptions)
        .then(response => {
            if (response.ok) {
                return response.json()
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
        .catch(error => {
            console.log('www.reddit.com JSON failed, trying content script fallback:', error.message)

            // Second: try content script fetch (credentials: omit from reddit.com origin)
            return tryContentScriptFetch(ids).catch(contentError => {
                console.log('Content script fallback failed:', contentError.message)

                // Third: try old.reddit.com HTML parsing
                return getItemsById_fromOldHTML(ids, addToPendingPostQueue).catch(htmlError => {
                    console.log('old.reddit.com HTML fallback failed:', htmlError.message)

                    // Fourth: Fall back to OAuth if available
                    if (auth && auth !== 'none') {
                        console.log('Trying OAuth fallback')
                        return fetch_forReddit(
                            ...getFetchParams(path, search, auth, monitor_quarantined_remote),
                            monitor_quarantined,
                        )
                    } else {
                        console.log('No OAuth auth available for fallback')
                        throw htmlError
                    }
                })
            })
        })
}

const cookieDetails_redditSession = { name: 'reddit_session', url: 'https://reddit.com' }

const acceptable_setCookieDetails = ['name', 'value', 'domain', 'path', 'secure', 'httpOnly', 'storeId']

const getSettableCookie = (cookie: any, url = 'https://reddit.com') => {
    if (!cookie) {
        return cookie
    }
    const filtered = Object.keys(cookie)
        .filter(key => acceptable_setCookieDetails.includes(key))
        .reduce(
            (obj, key) => {
                return {
                    ...obj,
                    [key]: cookie[key],
                }
            },
            {} as Record<string, any>,
        )
    filtered.url = url
    return filtered
}

//monitor_quarantined -> when true, client sets cookie (used for every look up)
//monitor_quarantined_remote -> when true, remote server sets cookie (used once in awhile)
const fetch_forReddit = async (url: string, options?: any, monitor_quarantined = false) => {
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
    if (!options) {
        options = { credentials: 'omit' }
    }
    options['cache'] = 'reload'
    if (!options.headers) {
        options.headers = {}
    }
    if (options.headers['Accept-Language'] !== 'en') {
        options.headers['Accept-Language'] = 'en'
    }
    const result = fetch(url, options).then(handleFetchErrors).then(getRedditData).catch(console.log)
    if (cookie_redditSession) {
        await browser.cookies.set(cookie_redditSession)
    }
    return result
}

export const lookupItemsByUser = (
    user: string,
    after: string,
    sort: string,
    timeSpan: string,
    monitor_quarantined: boolean,
    monitor_quarantined_remote: boolean,
    auth: any,
) => {
    const params: Record<string, any> = { limit: 100, sort, raw_json: 1 }
    if (after) params.after = after
    if (timeSpan) params.t = timeSpan
    const path = `user/${user}/overview.json`
    const search =
        '?' +
        Object.keys(params)
            .map(k => `${k}=${params[k]}`)
            .join('&')
    return fetch_forReddit(...getFetchParams(path, search, auth, monitor_quarantined_remote), monitor_quarantined)
}

export const lookupItemsByLoggedInUser = (
    after: string,
    sort: string,
    timeSpan: string,
    monitor_quarantined: boolean,
    monitor_quarantined_remote: boolean,
    auth: any,
) => {
    const params: Record<string, any> = { limit: 100, sort, raw_json: 1 }
    if (after) params.after = after
    if (timeSpan) params.t = timeSpan
    const path = `user/me.json`
    const search =
        '?' +
        Object.keys(params)
            .map(k => `${k}=${params[k]}`)
            .join('&')
    return fetch_forReddit(...getFetchParams(path, search, auth, monitor_quarantined_remote), monitor_quarantined)
}

// Alternative approach: use the same method as getLoggedinUser but with proper authentication
export const lookupItemsByLoggedInUserWithAuth = (
    after: string,
    sort: string,
    timeSpan: string,
    monitor_quarantined: boolean,
    monitor_quarantined_remote: boolean,
    auth: any,
) => {
    const params: Record<string, any> = { limit: 100, sort, raw_json: 1 }
    if (after) params.after = after
    if (timeSpan) params.t = timeSpan
    const search =
        '?' +
        Object.keys(params)
            .map(k => `${k}=${params[k]}`)
            .join('&')

    // First try www.reddit.com with rehydrated cookies
    return rehydrateStoredRedditCookies().then(() => {
        const url = `https://www.reddit.com/user/me.json${search}`
        const options = { credentials: 'include' as const, cache: 'reload' as const }
        return fetch(url, options)
            .then(response => {
                if (response.ok) {
                    return response.json()
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
            .catch(error => {
                console.log('www.reddit.com request failed, trying OAuth fallback:', error.message)

                // Fall back to OAuth if www.reddit.com fails and auth is available
                if (auth && auth !== 'none') {
                    return lookupItemsByUser(
                        'me',
                        after,
                        sort,
                        timeSpan,
                        monitor_quarantined,
                        monitor_quarantined_remote,
                        auth,
                    )
                } else {
                    console.log('No OAuth auth available for fallback')
                    throw error
                }
            })
    })
}

export const handleFetchErrors = (response: Response) => {
    if (!response.ok) {
        throw Error(response.statusText)
    }
    return response.json()
}

const getRedditData = (data: any) => {
    if (data && data.user && data.user.items) {
        // format from cred2.reveddit.com
        return data
    }
    if (!data || !data.data || !data.data.children) {
        throw Error('reddit data is not defined')
    }
    return data.data.children
}

export const getRedditToken = (data: any) => {
    if (!data || !data.access_token) {
        throw Error('access token is not defined')
    }
    return data.access_token
}

export const getAuth = (monitor_quarantined_remote = false) => {
    return getOptions((users: string[], others: string[], options: Record<string, any>) => {
        let use_this_clientID = clientID
        if (options.custom_clientid) {
            use_this_clientID = options.custom_clientid
            if (use_this_clientID === 'testing') {
                return NO_AUTH
            }
        } else if (!monitor_quarantined_remote) {
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

// code: https://github.com/toolbox-team/reddit-moderator-toolbox/blob/434ec0bb71ebba2fcf0cb5e4cad529035a1ae742/extension/data/background/handlers/webrequest.js#L34
// discussion: https://www.reddit.com/r/redditdev/comments/5jf4yg/api_new_modmail/dbfnw98/
export const getLocalAuth = () => {
    return fetch('https://mod.reddit.com/mail/all').then(_result => {
        getCookie({ url: 'https://mod.reddit.com', name: 'token' }).then(cookie => {
            if (cookie) {
                // remove invalid chars at the end per discussion
                const invalidChar = new RegExp('[^A-Za-z0-9+/].*?$')
                const base64Cookie = cookie.value.replace(invalidChar, '')
                const tokenData = atob(base64Cookie)
                const tokens = JSON.parse(tokenData)
                if ('accessToken' in tokens && tokens.accessToken) {
                    const auth = {
                        headers: {
                            Authorization: `bearer ${tokens.accessToken}`,
                            'Accept-Language': 'en',
                        },
                    }
                    return auth
                } else {
                    return null
                }
            } else {
                return null
            }
        })
    })
}

export const getCookie = ({ url, name }: { url: string; name: string }) => {
    if (location.protocol.match(/^http/)) {
        return browser.runtime
            .sendMessage({
                action: 'get-cookie',
                options: { url, name },
            })
            .then((response: any) => {
                return response.cookie
            })
            .catch(() => null)
    } else {
        return browser.cookies.get({ url, name })
    }
}

const getFetchParams = (
    path: string,
    search: string,
    auth: any,
    monitor_quarantined_remote: boolean,
): [string, any?] => {
    if (!auth || auth === NO_AUTH) {
        let url = (monitor_quarantined_remote ? WWW_REVEDDIT : www_reddit) + path
        if (path === 'api/info') {
            url += '.json'
        }
        url += search
        return [url]
    } else {
        let host = oauth_reddit
        let path_and_search = path + search
        if (monitor_quarantined_remote) {
            host = OAUTH_REVEDDIT
            path_and_search += '&give_it_to_me=1'
        }
        const url = host + path_and_search
        return [url, auth]
    }
}

export const getLocalOrAppAuth = () => {
    return getLocalAuth()
        .then((auth: any) => {
            if (auth) return auth
            return getAuth()
        })
        .catch(console.log)
}

export const getLoggedinUser = () => {
    return new Promise(resolve => {
        const isContentContext =
            typeof chrome === 'undefined' || !chrome.tabs || typeof chrome.tabs.query !== 'function'
        // In a content script, chrome.tabs.query is not available. Use the current page's host.
        if (isContentContext && typeof window !== 'undefined' && window.location && window.location.hostname) {
            const currentHost = window.location.hostname
            const targetUrl = `https://${currentHost}/api/me.json`
            fetch(targetUrl, { credentials: 'include', cache: 'reload' })
                .then(handleFetchErrors)
                .then(getRedditUsername)
                .then(resolve)
                .catch(() => resolve(null))
            return
        }

        // Pick a host: prefer old.reddit.com if an old.reddit tab is open (quarantine
        // opt-in lives there), otherwise default to www.reddit.com.
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

        const fetchUser = (targetUrl: string) =>
            fetch(targetUrl, { credentials: 'include', cache: 'reload' })
                .then(handleFetchErrors)
                .then(getRedditUsername)

        pickHost().then(host => {
            const targetUrl = `https://${host}/api/me.json`
            // 1) Direct fetch. With `cookies` permission + reddit host_permissions the
            //    browser includes the user's real session cookies even with no tab open.
            fetchUser(targetUrl)
                .then(resolve)
                .catch(() => {
                    // 2) Fallback: rehydrate any previously-stored cookies and retry once.
                    rehydrateStoredRedditCookies().then(success => {
                        if (!success) {
                            resolve(null)
                            return
                        }
                        fetchUser(targetUrl)
                            .then(resolve)
                            .catch(() => {
                                console.log('Failed to authenticate with stored cookies')
                                resolve(null)
                            })
                    })
                })
        })
    })
}

const getRedditUsername = (data: any) => {
    if (!data || !data.data || !data.data.name) {
        throw Error('reddit username is not defined')
    }
    return data.data.name
}

// Store Reddit cookies for later use when no tabs are open
export const storeRedditCookies = () => {
    return new Promise(resolve => {
        // Only run this in background script context, not in content scripts
        if (typeof chrome === 'undefined' || !chrome.tabs || !chrome.cookies) {
            console.log('storeRedditCookies: Not available in this context (content script)')
            resolve(false)
            return
        }

        chrome.tabs.query({ url: ['*://*.reddit.com/*'] }, tabs => {
            const supportedTabs = tabs.filter(tab => {
                try {
                    const hostname = new URL(tab.url!).hostname
                    return hostname === 'www.reddit.com' || hostname === 'old.reddit.com'
                } catch {
                    return false
                }
            })

            if (supportedTabs.length > 0) {
                const tab = supportedTabs[0]
                try {
                    new URL(tab.url!)
                } catch {
                    console.log('storeRedditCookies: invalid tab url', tab && tab.url)
                    resolve(false)
                    return
                }

                // Get cookies for the Reddit parent domain so we include domain-scoped and host-only cookies
                chrome.cookies.getAll({ domain: 'reddit.com' }, cookies => {
                    const cookieMap: Record<string, string> = {}
                    const cookieObjects: any[] = []
                    cookies.forEach(cookie => {
                        // Save a simple map for backwards compatibility
                        cookieMap[cookie.name] = cookie.value
                        // Save full settable cookie details for rehydration
                        const host =
                            cookie.domain && cookie.domain.startsWith('.')
                                ? cookie.domain.slice(1)
                                : cookie.domain || 'reddit.com'
                        const url = `https://${host}`
                        cookieObjects.push(getSettableCookie(cookie, url))
                    })

                    if (cookies.length > 0) {
                        chrome.storage.local.set(
                            {
                                stored_reddit_cookies: cookieMap,
                                stored_reddit_cookie_objects: cookieObjects,
                                stored_reddit_domain: 'reddit.com',
                            },
                            () => {
                                resolve(true)
                            },
                        )
                    } else {
                        resolve(false)
                    }
                })
            } else {
                resolve(false)
            }
        })
    })
}

// Retrieve stored Reddit cookies
export const getStoredRedditCookies = () => {
    return new Promise(resolve => {
        chrome.storage.local.get(['stored_reddit_cookies', 'stored_reddit_domain'], result => {
            if (result.stored_reddit_cookies) {
                resolve(result.stored_reddit_cookies)
            } else {
                resolve(null)
            }
        })
    })
}

// Rehydrate stored cookies back into the browser's cookie jar for reddit.com
const rehydrateStoredRedditCookies = () => {
    return new Promise(resolve => {
        chrome.storage.local.get(['stored_reddit_cookie_objects'], result => {
            const cookieObjects = result.stored_reddit_cookie_objects
            if (Array.isArray(cookieObjects) && cookieObjects.length) {
                Promise.all(cookieObjects.map(c => browser.cookies.set(c).catch(() => null)))
                    .then(() => resolve(true))
                    .catch(() => resolve(false))
            } else {
                resolve(false)
            }
        })
    })
}
