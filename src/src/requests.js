import {getOptions} from './storage.js'
import browser from 'webextension-polyfill'

const clientID = 'SEw1uvRd6kxFEw'
const oauth_reddit = 'https://oauth.reddit.com/'
const www_reddit = 'https://www.reddit.com/'
const OAUTH_REVEDDIT = 'https://cred2.reveddit.com/'
const WWW_REVEDDIT = 'https://wred.reveddit.com/'

const NO_AUTH = 'none'

export const lookupItemsByID = (ids, auth, monitor_quarantined = false, monitor_quarantined_remote = false, quarantined_subreddits = []) => {
    const params = {id:ids, raw_json:1}
    if (monitor_quarantined_remote) {
        params.quarantined_subreddits = quarantined_subreddits.join(',')
    }
    const search = '?'+Object.keys(params).map(k => `${k}=${params[k]}`).join('&')

    return fetch_forReddit(...getFetchParams('api/info', search, auth, monitor_quarantined_remote), monitor_quarantined)
}

const cookieDetails_redditSession = {name: 'reddit_session', url: 'https://reddit.com'}

const acceptable_setCookieDetails = ['name', 'value', 'domain', 'path', 'secure', 'httpOnly', 'storeId']

const getSettableCookie = (cookie, url = 'https://reddit.com') => {
    if (! cookie) {
        return cookie
    }
    const filtered = Object.keys(cookie)
        .filter(key => acceptable_setCookieDetails.includes(key))
        .reduce((obj, key) => {
            return {
                ...obj,
                [key]: cookie[key]
            };
        }, {});
    filtered.url = url
    return filtered
}


//monitor_quarantined -> when true, client sets cookie (used for every look up)
//monitor_quarantined_remote -> when true, remote server sets cookie (used once in awhile)
const fetch_forReddit = async (url, options, monitor_quarantined = false) => {
    let cookie_redditSession
    await browser.cookies.set({domain: 'reddit.com', url: 'https://reddit.com', name: '_options', value: '{%22pref_quarantine_optin%22:true}'})
    if (monitor_quarantined) {
        cookie_redditSession = getSettableCookie(await browser.cookies.get(cookieDetails_redditSession))
        if (cookie_redditSession) {
            await browser.cookies.remove(cookieDetails_redditSession)
        }
    }
    if (! options) {
        options = {}
    }
    options['cache'] = 'reload'
    if (! options.headers) {
        options.headers = {}
    }
    if (options.headers['Accept-Language'] !== 'en') {
        options.headers['Accept-Language'] = 'en'
    }
    const result = fetch(url, options)
    .then(handleFetchErrors)
    .then(getRedditData)
    .catch(console.log)
    if (cookie_redditSession) {
        await browser.cookies.set(cookie_redditSession)
    }
    return result
}

export const lookupItemsByUser = (user, after, sort, timeSpan, monitor_quarantined, monitor_quarantined_remote, auth) => {
    const params = {limit: 100, sort, raw_json:1}
    if (after) params.after = after
    if (timeSpan) params.t = timeSpan
    const path = `user/${user}/overview.json`
    const search = '?'+Object.keys(params).map(k => `${k}=${params[k]}`).join('&')
    return fetch_forReddit(...getFetchParams(path, search, auth, monitor_quarantined_remote), monitor_quarantined)
}

export const handleFetchErrors = (response) => {
    if (! response.ok) {
        throw Error(response.statusText)
    }
    return response.json()
}

const getRedditData = (data) => {
    if (data && data.user && data.user.items) { // format from cred2.reveddit.com
        return data
    }
    if (! data || ! data.data || ! data.data.children) {
        throw Error('reddit data is not defined')
    }
    return data.data.children
}

export const getRedditToken = (data) => {
    if (! data || ! data.access_token) {
        throw Error('access token is not defined')
    }
    return data.access_token
}

export const getAuth = () => {
    return getOptions((users, others, options) => {
        var use_this_clientID = clientID
        if (options.custom_clientid) {
            use_this_clientID = options.custom_clientid
            if (use_this_clientID === 'testing') {
                return NO_AUTH
            }
        }
        const tokenInit = {
            headers: {
                Authorization: `Basic ${btoa(`${use_this_clientID}:`)}`,
                'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8'
            },
            method: 'POST',
            body: `grant_type=${encodeURIComponent('https://oauth.reddit.com/grants/installed_client')}&device_id=DO_NOT_TRACK_THIS_DEVICE`
        }

        return fetch('https://www.reddit.com/api/v1/access_token', tokenInit)
        .then(handleFetchErrors)
        .then(getRedditToken)
        .then(token => ({
            headers: {
                Authorization: `bearer ${token}`,
                'Accept-Language': 'en',
            }
        }))
        .catch(console.log)
    })

}

// code: https://github.com/toolbox-team/reddit-moderator-toolbox/blob/434ec0bb71ebba2fcf0cb5e4cad529035a1ae742/extension/data/background/handlers/webrequest.js#L34
// discussion: https://www.reddit.com/r/redditdev/comments/5jf4yg/api_new_modmail/dbfnw98/
export const getLocalAuth = () => {
    return fetch('https://mod.reddit.com/mail/all')
    .then(result => {
        getCookie({url: 'https://mod.reddit.com', name: 'token'})
        .then(cookie => {
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
                        }
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

export const getCookie = ({url, name}) => {
    if (location.protocol.match(/^http/)) {
        return browser.runtime.sendMessage({
            action: 'get-cookie',
            options: {url, name}
        })
        .then(response => {
            return response.cookie
        })
    } else {
        return browser.cookies.get({url, name})
    }
}

const getFetchParams = (path, search, auth, monitor_quarantined_remote) => {
    if (! auth || auth === NO_AUTH) {
        let url = (monitor_quarantined_remote ? WWW_REVEDDIT : www_reddit)+path
        if (path === 'api/info') {
            url += '.json'
        }
        url += search
        return [url]
    } else {
        let host = oauth_reddit
        let path_and_search = path+search
        if (monitor_quarantined_remote) {
            host = OAUTH_REVEDDIT
            path_and_search += '&give_it_to_me=1'
        }
        const url = host+path_and_search
        return [url, auth]
    }
}

export const getLocalOrAppAuth = () => {
    return getLocalAuth()
    .then(auth => {
        if (auth) return auth
        return getAuth()
    })
    .catch(console.log)
}

export const getLoggedinUser = () => {
    return fetch('https://www.reddit.com/api/me.json')
    .then(handleFetchErrors)
    .then(getRedditUsername)
    .catch(console.log)
}

const getRedditUsername = (data) => {
    if (! data || ! data.data || ! data.data.name) {
        throw Error('reddit username is not defined')
    }
    return data.data.name
}
