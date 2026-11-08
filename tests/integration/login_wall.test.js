// Reddit's login wall (login-wall-config.ts): a public-view fetch that lands on
// the login page ends there, since every route is logged out alike. The kind
// of page then rests an hour at a time until one loads, the lookup skips the
// legacy pages, and a streak raises login_required instead of the generic
// public-view warning. Plus the popup's report-a-problem link to the issue
// form (report.ts, .github/ISSUE_TEMPLATE).

// Install chrome global BEFORE any source import
import '../mocks/chrome-api.js'

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import browserMock, { __getLocalStorage } from '../mocks/webextension-polyfill.js'

import { getWwwHtmlFetcher, getLoginWallLine, WWW_ROUTE_STATE_KEY, LOGIN_WALL_REST_MS } from '../../src/src/www-fetcher'
import { lookupItemsByID } from '../../src/src/requests'
import { lookupWarningToKeep, LOGIN_REQUIRED } from '../../src/src/lookup-status'
import { verifyFeedAbsentItems } from '../../src/src/page-verify'
import { _legacyLookups } from '../../src/src/legacy-lookup'
import {
    loginWallLanding,
    sanitizeLoginWallConfig,
    setLoginWallConfig,
    isLoginWallPage,
    isLoginWallMessage,
    LOGIN_WALL_MESSAGE,
} from '../../src/src/login-wall-config'
import { getPublicProfileItems } from '../../src/src/parse_html/new'
import { fetchNews, applyRemoteConfig, NEWS_CACHE_KEY } from '../../src/src/news'
import { newIssueUrl, ISSUES_URL, ISSUE_FORM, LOG_NOT_COPIED } from '../../src/src/report'
import { readFileSync } from 'node:fs'
import { routeOrder, useFetcherHooks } from '../mocks/www-fetch-hooks.js'

const FEED = 'https://www.reddit.com/user/u/comments/?sort=new'
const PARTIAL = 'https://www.reddit.com/svc/shreddit/comments/r/s/abc/x1?render-mode=partial'
const LOGIN = 'https://www.reddit.com/login/?dest=https%3A%2F%2Fwww.reddit.com%2Fuser%2Fu%2Fcomments%2F&reason=lor2'
const WHERE = 'redirected to /login/?reason=lor2'

const res = (status, body, redirectedTo = '') => ({
    ok: status >= 200 && status < 300,
    status,
    redirected: !!redirectedTo,
    url: redirectedTo || FEED,
    text: async () => body,
})

const routeState = () => __getLocalStorage()[WWW_ROUTE_STATE_KEY]
const leadWithTabRoute = () => routeOrder(['tab:no-cache'])

useFetcherHooks()

beforeEach(() => {
    setLoginWallConfig({})
})

afterEach(() => {
    setLoginWallConfig({})
})

describe('where a redirect landed', () => {
    it('is a login page by its path on any reddit host, logged as the path and reason without the dest, which names the user', () => {
        expect(loginWallLanding(LOGIN)).toBe('/login/?reason=lor2')
        expect(loginWallLanding('https://old.reddit.com/login/?reason=lor2')).toBe('/login/?reason=lor2')
        expect(loginWallLanding('https://www.reddit.com/account/login/?dest=x')).toBe('/account/login/')
        expect(loginWallLanding('https://www.reddit.com/register')).toBe('/register')
        expect(loginWallLanding('https://www.reddit.com/login/?reason=%3Cscript%3E')).toBe('/login/')
    })

    it('is not a login page elsewhere: users and subreddits named login, other sites, bad URLs', () => {
        for (const url of [
            'https://www.reddit.com/user/login/',
            'https://www.reddit.com/r/login/',
            'https://www.reddit.com/loginx',
            'https://www.reddit.com/user/u/comments/',
            'https://example.com/login/',
            'https://reddit.com.example.com/login/',
            'not a url',
        ]) {
            expect(loginWallLanding(url)).toBeNull()
        }
    })
})

describe('options.login_wall in the news feed', () => {
    it('is sanitized field by field: paths without trailing slashes, printable markers of a sane length', () => {
        expect(
            sanitizeLoginWallConfig({
                paths: ['/signin/', 'signin', '/x y', 7, '/signin'],
                markers: ['<auth-flow-modal', 'short', 'x'.repeat(121), 'tab\there!'],
            }),
        ).toEqual({ paths: ['/signin'], markers: ['<auth-flow-modal'] })
        expect(sanitizeLoginWallConfig({ paths: 'login', markers: null })).toEqual({})
        expect(sanitizeLoginWallConfig(undefined)).toEqual({})
    })

    it('adds to the built-in login paths, which always stay', () => {
        setLoginWallConfig({ paths: ['/signin'] })
        expect(loginWallLanding('https://www.reddit.com/signin/?x=1')).toBe('/signin/')
        expect(loginWallLanding(LOGIN)).toBe('/login/?reason=lor2')
    })

    it('is cached sanitized, applied at once, and applied again from the cache when the worker starts', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => ({
                ok: true,
                json: async () => ({ messages: [], options: { login_wall: { markers: ['<auth-flow-modal', 'x'] } } }),
            })),
        )
        await fetchNews({ force: true })
        expect(__getLocalStorage()[NEWS_CACHE_KEY].feed.options.login_wall).toEqual({ markers: ['<auth-flow-modal'] })
        expect(isLoginWallPage('<auth-flow-modal id=x>')).toBe(true)
        setLoginWallConfig({})
        await applyRemoteConfig()
        expect(isLoginWallPage('<auth-flow-modal id=x>')).toBe(true)
    })
})

describe('a public-view fetch that lands on the login page', () => {
    it('ends there: no other route is tried, none rests, and the kind of page remembers the wall', async () => {
        globalThis.fetch = vi.fn(async () => res(200, 'LOGIN PAGE', LOGIN))
        const fetcher = await getWwwHtmlFetcher()
        await expect(fetcher.fetchHtml(FEED)).rejects.toThrow(`${LOGIN_WALL_MESSAGE}: ${WHERE}`)
        expect(globalThis.fetch).toHaveBeenCalledTimes(1)
        expect(routeState().profile.routes).toEqual({})
        expect(routeState().profile.login).toMatchObject({ where: WHERE })
        expect(await getLoginWallLine()).toMatch(
            /^login wall: profile pages since .*\(redirected to \/login\/\?reason=lor2\)$/,
        )
    })

    it('is the wall whatever status the login page answers with, not a refused route', async () => {
        globalThis.fetch = vi.fn(async () => res(403, 'BLOCK', LOGIN))
        const fetcher = await getWwwHtmlFetcher()
        await expect(fetcher.fetchHtml(FEED)).rejects.toThrow(LOGIN_WALL_MESSAGE)
        expect(globalThis.fetch).toHaveBeenCalledTimes(1)
        expect(routeState().profile.routes).toEqual({})
    })

    it('sends no request for that kind of page for an hour, while other kinds still go out', async () => {
        globalThis.fetch = vi.fn(async url => (url === FEED ? res(200, 'LOGIN PAGE', LOGIN) : res(200, 'PAGE')))
        const fetcher = await getWwwHtmlFetcher()
        await expect(fetcher.fetchHtml(FEED)).rejects.toThrow(LOGIN_WALL_MESSAGE)
        await expect(fetcher.fetchHtml(FEED)).rejects.toThrow('next try after')
        const next = await getWwwHtmlFetcher()
        await expect(next.fetchHtml(FEED)).rejects.toThrow('next try after')
        expect(await next.fetchHtml(PARTIAL)).toBe('PAGE')
        expect(globalThis.fetch).toHaveBeenCalledTimes(2)
    })

    it('after the hour, one fetch goes out; a page that loads ends the wall, even on the route that served before', async () => {
        const t = Date.now() - LOGIN_WALL_REST_MS - 1000
        __getLocalStorage()[WWW_ROUTE_STATE_KEY] = {
            profile: {
                routes: {},
                served: { route: 'background:no-store', t: t - 5000 },
                login: { since: t - 60000, t, where: WHERE },
            },
        }
        globalThis.fetch = vi.fn(async () => res(200, 'PAGE'))
        const fetcher = await getWwwHtmlFetcher()
        expect(await fetcher.fetchHtml(FEED)).toBe('PAGE')
        expect(await getLoginWallLine()).toBe('login wall: none seen')
        expect(routeState().profile.served.route).toBe('background:no-store')
    })

    it('seen again after the hour, the wall keeps the time it began', async () => {
        const since = Date.now() - 3 * LOGIN_WALL_REST_MS
        const t = Date.now() - LOGIN_WALL_REST_MS - 1000
        __getLocalStorage()[WWW_ROUTE_STATE_KEY] = { profile: { routes: {}, login: { since, t, where: WHERE } } }
        globalThis.fetch = vi.fn(async () => res(200, 'LOGIN PAGE', LOGIN))
        const fetcher = await getWwwHtmlFetcher()
        await expect(fetcher.fetchHtml(FEED)).rejects.toThrow(LOGIN_WALL_MESSAGE)
        expect(routeState().profile.login.since).toBe(since)
        expect(routeState().profile.login.t).toBeGreaterThan(t)
    })

    it('a redirect to any other page is just that page', async () => {
        globalThis.fetch = vi.fn(async () => res(200, 'PAGE', 'https://www.reddit.com/user/u/comments/'))
        const fetcher = await getWwwHtmlFetcher()
        expect(await fetcher.fetchHtml(FEED)).toBe('PAGE')
        expect(routeState().profile.login).toBeUndefined()
    })

    it("is seen by the tab's content script, which says where its fetch landed", async () => {
        leadWithTabRoute()
        browserMock.tabs.query = vi.fn(async () => [{ id: 7 }])
        browserMock.tabs.sendMessage = vi.fn(async () => ({ success: true, html: 'LOGIN PAGE', redirectedTo: LOGIN }))
        const fetcher = await getWwwHtmlFetcher()
        await expect(fetcher.fetchHtml(FEED)).rejects.toThrow(`${LOGIN_WALL_MESSAGE}: ${WHERE}`)
        expect(globalThis.fetch).not.toHaveBeenCalled()
    })

    it("is seen by the tab's injected fetch too", async () => {
        leadWithTabRoute()
        browserMock.tabs.query = vi.fn(async () => [{ id: 7 }])
        browserMock.tabs.sendMessage = vi.fn(async () => {
            throw new Error('Could not establish connection. Receiving end does not exist.')
        })
        browserMock.scripting = {
            executeScript: vi.fn(async () => [{ result: { ok: false, status: 403, text: '', redirectedTo: LOGIN } }]),
        }
        const fetcher = await getWwwHtmlFetcher()
        await expect(fetcher.fetchHtml(FEED)).rejects.toThrow(`${LOGIN_WALL_MESSAGE}: ${WHERE}`)
        expect(browserMock.scripting.executeScript).toHaveBeenCalledTimes(1)
        expect(globalThis.fetch).not.toHaveBeenCalled()
    })

    it("served without a redirect, it's known by the feed's markers, and only on a page the caller can't read", async () => {
        setLoginWallConfig({ markers: ['<auth-flow-modal'] })
        const wall = '<html><body><auth-flow-modal></auth-flow-modal></body></html>'
        globalThis.fetch = vi.fn(async () => res(200, wall))

        const readable = await getWwwHtmlFetcher()
        expect(await readable.fetchHtml(FEED, () => true)).toBe(wall)
        expect(await readable.fetchHtml(PARTIAL)).toBe(wall)

        const unreadable = await getWwwHtmlFetcher()
        await expect(unreadable.fetchHtml(FEED, () => false)).rejects.toThrow(
            `${LOGIN_WALL_MESSAGE}: served a login page in place of the page asked for`,
        )
        expect(globalThis.fetch).toHaveBeenCalledTimes(3)
    })
})

describe('a profile lookup that meets the login wall', () => {
    it('is flagged, and a 429 from the other tab still names the failure so it reaches the backoff', async () => {
        const wall = new Error(`${LOGIN_WALL_MESSAGE}: ${WHERE}`)
        const profile = await getPublicProfileItems('u', async () => {
            throw wall
        })
        expect(profile).toMatchObject({ valid: false, loginWall: true, error: wall.message })

        const mixed = await getPublicProfileItems('u', async url => {
            throw url.includes('/comments/') ? wall : new Error('www.reddit.com request failed: 429')
        })
        expect(mixed).toMatchObject({ valid: false, loginWall: true, error: 'www.reddit.com request failed: 429' })
    })

    it('raises login_required after five in a row, without trying the legacy pages; the first one sends the only request', async () => {
        globalThis.fetch = vi.fn(async () => res(200, 'LOGIN PAGE', LOGIN))
        const lookup = () => lookupItemsByID(['t1_a'], null, false, 'u', {})
        for (let i = 1; i <= 5; i++) {
            const error = await lookup().catch(e => e)
            expect(isLoginWallMessage(error?.message)).toBe(true)
            expect(__getLocalStorage().error_status).toBe(i < 5 ? undefined : LOGIN_REQUIRED)
        }
        expect(globalThis.fetch).toHaveBeenCalledTimes(1)
        expect(_legacyLookups.commentsById).not.toHaveBeenCalled()
        expect(_legacyLookups.postByPath).not.toHaveBeenCalled()
    })
})

describe('a login wall on the pages a lookup reads after the profile', () => {
    // The profile's first page loads; what comes after it asks for a login
    const NEWEST = 't1_zzzz'
    const OLDER = 't1_aaaa'
    const firstPage =
        `<div thing-id="${NEWEST}" class="x"></div><shreddit-feed-load-more-observer ` +
        `cursor="${Buffer.from(NEWEST).toString('base64')}"></shreddit-feed-load-more-observer>`
    const noPosts =
        '<shreddit-feed navigation-session-id="x"><div>Welcome! u/u doesn&#x27;t have any posts yet, ' +
        'but check out their stats to learn more about them.</div></shreddit-feed>'

    it("on the profile's older pages: the warning asks for a second account, and a pass keeps it", async () => {
        globalThis.fetch = vi.fn(async url => {
            if (url.includes('/svc/')) return res(200, 'LOGIN PAGE', LOGIN)
            if (url.includes('/user/u/comments/')) return res(200, firstPage)
            if (url.includes('/user/u/submitted/')) return res(200, noPosts)
            throw new Error(`unexpected request: ${url}`)
        })
        const meta = { [NEWEST]: { link_id: 't3_p', created_utc: 1 }, [OLDER]: { link_id: 't3_p', created_utc: 1 } }
        for (let i = 1; i <= 5; i++) {
            await lookupItemsByID([NEWEST, OLDER], null, false, 'u', meta)
            expect(__getLocalStorage().error_status).toBe(i < 5 ? undefined : LOGIN_REQUIRED)
        }
        expect(await lookupWarningToKeep('u')).toBe(LOGIN_REQUIRED)
    })

    it('on the pages that settle a missing item: the same', async () => {
        globalThis.fetch = vi.fn(async () => res(200, 'LOGIN PAGE', LOGIN))
        const { fetchHtml } = await getWwwHtmlFetcher()
        for (let i = 1; i <= 5; i++) {
            const id = `t1_x${i}`
            const meta = { [id]: { permalink: `/r/sub/comments/abc/comment/${id.slice(3)}/` } }
            expect(await verifyFeedAbsentItems([id], meta, fetchHtml)).toEqual({})
            expect(__getLocalStorage().error_status).toBe(i < 5 ? undefined : LOGIN_REQUIRED)
        }
        expect(Object.keys(routeState())).toEqual(expect.arrayContaining(['partial', 'page']))
        expect(await lookupWarningToKeep('u')).toBe(LOGIN_REQUIRED)
    })
})

describe("the popup's report-a-problem issue form", () => {
    const parse = url => new URL(url).searchParams
    const form = readFileSync(new URL(`../../.github/ISSUE_TEMPLATE/${ISSUE_FORM}`, import.meta.url), 'utf8')

    it("opens the repository's form with the version and browser filled in", () => {
        const url = newIssueUrl({ runningOn: '0.0.5.30, Chrome 141', logCopied: true })
        expect(url.startsWith(`${ISSUES_URL}/new?template=${ISSUE_FORM}&`)).toBe(true)
        expect(parse(url).get('version')).toBe('0.0.5.30, Chrome 141')
        // the copied log is pasted by hand; the form's field says it's on the clipboard
        expect(parse(url).has('log')).toBe(false)
        expect(form).toMatch(/already on your clipboard/)
    })

    it('without a copied log, the log field says where to copy it from; an unknown version says so', () => {
        const url = newIssueUrl({ runningOn: '', logCopied: false })
        expect(parse(url).get('log')).toBe(LOG_NOT_COPIED)
        expect(parse(url).get('version')).toBe('unknown')
        expect(url.length).toBeLessThan(2000)
    })

    it('fills fields the form has, and asks for nothing else first', () => {
        for (const id of ['version', 'log']) {
            expect(form).toMatch(new RegExp(`^\\s+id: ${id}$`, 'm'))
        }
        // only "What happened?" is required
        expect(form.match(/required: true/g)).toHaveLength(1)
    })
})
