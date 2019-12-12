import {getOptions} from './storage.js'

const clientID = 'SEw1uvRd6kxFEw'
const oauth_reddit = 'https://oauth.reddit.com/'
const www_reddit = 'https://www.reddit.com/'

const NO_AUTH = 'none'

export const lookupItemsByID = (ids, auth) => {
    const params = {id:ids, raw_json:1}
    const search = '?'+Object.keys(params).map(k => `${k}=${params[k]}`).join('&')

    return window.fetch(...getFetchParams('api/info', search, auth))
    .then(handleFetchErrors)
    .then(getRedditData)
    .catch(console.log)
}

export const lookupItemsByUser = (user, after, sort, timeSpan, auth) => {
    const params = {limit: 100, sort, raw_json:1}
    if (after) params.after = after
    if (timeSpan) params.t = timeSpan
    const path = `user/${user}/overview.json`
    const search = '?'+Object.keys(params).map(k => `${k}=${params[k]}`).join('&')

    return window.fetch(...getFetchParams(path, search, auth))
    .then(handleFetchErrors)
    .then(getRedditData)
    .catch(console.log)
}

export const handleFetchErrors = (response) => {
    if (! response.ok) {
        throw Error(response.statusText)
    }
    return response.json()
}

export const getRedditData = (data) => {
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
                Authorization: `Basic ${window.btoa(`${use_this_clientID}:`)}`,
                'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8'
            },
            method: 'POST',
            body: `grant_type=${encodeURIComponent('https://oauth.reddit.com/grants/installed_client')}&device_id=DO_NOT_TRACK_THIS_DEVICE`
        }

        return window.fetch('https://www.reddit.com/api/v1/access_token', tokenInit)
        .then(handleFetchErrors)
        .then(getRedditToken)
        .then(token => ({
            headers: {
                Authorization: `bearer ${token}`
            }
        }))
        .catch(console.log)
    })

}

// code: https://github.com/toolbox-team/reddit-moderator-toolbox/blob/434ec0bb71ebba2fcf0cb5e4cad529035a1ae742/extension/data/background/handlers/webrequest.js#L34
// discussion: https://www.reddit.com/r/redditdev/comments/5jf4yg/api_new_modmail/dbfnw98/
export const getLocalAuth = () => {
    return window.fetch('https://mod.reddit.com/mail/all')
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
                            Authorization: `bearer ${tokens.accessToken}`
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

const getFetchParams = (path, search, auth) => {
    if (! auth || auth === NO_AUTH) {
        let url = www_reddit+path
        if (path === 'api/info') {
            url += '.json'
        }
        url += search
        return [url]
    } else {
        const url = oauth_reddit+path+search
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
    return window.fetch('https://www.reddit.com/api/me.json')
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
