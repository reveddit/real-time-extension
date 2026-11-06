// What fetchNews keeps from the feed and hands on: the stored cache's shape,
// the configs it applies, the log line, and the end of a legacy rest when the
// switch or host changes. Also the solver regex rules in challenge-config.

// Install chrome global BEFORE any source import
import '../mocks/chrome-api.js'

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { __resetStorage, __getLocalStorage } from '../mocks/webextension-polyfill.js'

import { fetchNews, NEWS_CACHE_KEY, NEWS_FETCH_FAILED_AT_KEY, CAPABILITY_REST_KEY } from '../../src/src/news'
import {
    getChallengeConfig,
    setChallengeConfig,
    sanitizeChallengeConfig,
    DEFAULT_CHALLENGE_CONFIG,
} from '../../src/src/challenge-config'
import { getMarkupConfig, setMarkupConfig } from '../../src/src/markup-config'
import { getPublicModlogsFeed, setPublicModlogsFeed } from '../../src/src/bridge-config'
import { clearDiagLog } from '../../src/src/diaglog'
import { getDiagEntries } from '../mocks/diag-entries.js'

const serve = feed =>
    vi.stubGlobal(
        'fetch',
        vi.fn(async () => ({ ok: true, status: 200, json: async () => feed })),
    )
const cachedFeed = () => __getLocalStorage()[NEWS_CACHE_KEY]?.feed
const goodMessage = { id: 'a', title: 't', body_markdown: 'b', published_utc: '5', severity: 'info' }

beforeEach(async () => {
    __resetStorage({}, {})
    setChallengeConfig({})
    setMarkupConfig({})
    setPublicModlogsFeed('')
    await clearDiagLog()
})

describe('a feed without a messages array', () => {
    it.each([null, {}, { messages: 'x' }, { messages: { 0: goodMessage } }])(
        'leaves the cache and the failure marker alone: %j',
        async feed => {
            serve(feed)
            await fetchNews({ force: true })
            expect(__getLocalStorage()[NEWS_CACHE_KEY]).toBeUndefined()
            expect(__getLocalStorage()[NEWS_FETCH_FAILED_AT_KEY]).toBeUndefined()
            expect((await getDiagEntries()).map(e => e.m)).toEqual([])
        },
    )

    it('does not reset a config an earlier feed set', async () => {
        setChallengeConfig({ tokenFields: ['kept_token'] })
        serve({ options: { challenge: {} } })
        await fetchNews({ force: true })
        expect(getChallengeConfig().tokenFields).toEqual(['kept_token'])
    })
})

describe('the messages and fields it keeps', () => {
    it('drops messages missing a string id, title or body, and keeps only the known fields', async () => {
        serve({
            messages: [
                { ...goodMessage, extra: 1, min_version: '0.0.1', max_version: 'bad' },
                { ...goodMessage, id: 1 },
                { ...goodMessage, title: undefined },
                { ...goodMessage, body_markdown: 3 },
                null,
                { id: 'b', title: 't', body_markdown: 'b', published_utc: 'nope', max_version: '9.0' },
            ],
            latest_version: '0.0.5.30',
            latest_version_published_utc: '1793549326167',
            something_else: true,
        })
        await fetchNews({ force: true })
        expect(cachedFeed()).toEqual({
            messages: [
                { id: 'a', published_utc: 5, title: 't', body_markdown: 'b', severity: 'info', min_version: '0.0.1' },
                { id: 'b', published_utc: 0, title: 't', body_markdown: 'b', max_version: '9.0' },
            ],
            options: { mechanisms: {} },
            latest_version: '0.0.5.30',
            latest_version_published_utc: 1793549326167,
        })
    })

    it.each([
        ['an invalid latest_version', { latest_version: 'bad' }],
        ['a numeric latest_version', { latest_version: 3 }],
    ])('leaves out %s', async (_, extra) => {
        serve({ messages: [], ...extra })
        await fetchNews({ force: true })
        expect(cachedFeed()).not.toHaveProperty('latest_version')
    })

    it.each(['x', 0, -1, undefined])('leaves out a release date of %j', async date => {
        serve({ messages: [], latest_version_published_utc: date })
        await fetchNews({ force: true })
        expect(cachedFeed()).not.toHaveProperty('latest_version_published_utc')
    })

    it('keeps every option it recognizes and nothing else', async () => {
        serve({
            messages: [],
            options: {
                mechanisms: { legacyOldReddit: 'off', scanFeeds: 'auto', other: 'on', bad: 'maybe', worse: 1 },
                legacy_host: 'old.reddit.com',
                challenge: { token_fields: ['abc_token', 'BAD-'], solution_regex: 'a(b)' },
                www_route_order: { chrome: ['tab:reload', 'bad'] },
                markup: { comment_id_attributes: ['a-b', '1bad'] },
                login_cookies: ['sess', 'bad name'],
                login_wall: { paths: ['/signin/', 'nope'], markers: ['<auth-flow-modal'] },
                scan_limits: { reads_per_click: 3, seconds_between_reads: 4, junk: 1 },
                publicmodlogs_feed: 'a'.repeat(40),
                unknown_option: 1,
            },
        })
        await fetchNews({ force: true })
        const options = cachedFeed().options
        expect(Object.keys(options).sort()).toEqual(
            [
                'challenge',
                'legacy_host',
                'login_cookies',
                'login_wall',
                'mechanisms',
                'markup',
                'publicmodlogs_feed',
                'www_route_order',
                'scan_limits',
            ].sort(),
        )
        expect(options.mechanisms).toEqual({ legacyOldReddit: 'off', scanFeeds: 'auto', other: 'on' })
        expect(options.legacy_host).toBe('old.reddit.com')
        expect(options.scan_limits).toEqual({ reads_per_click: 6, seconds_between_reads: 4 })
        expect(options.markup).toEqual({ commentIdAttributes: ['a-b'] })
        expect(options.www_route_order).toEqual({ chrome: { order: ['tab:reload'], skip: [] } })
        expect(options.challenge).toEqual({ tokenFields: ['abc_token'], solutionRegex: 'a(b)' })
        expect(options.login_cookies).toEqual(['sess'])
        expect(options.login_wall).toEqual({ paths: ['/signin'], markers: ['<auth-flow-modal'] })
        expect(options.publicmodlogs_feed).toBe('a'.repeat(40))
    })

    it.each(['evil.example', 5, null, undefined])('refuses a legacy_host of %j', async host => {
        serve({ messages: [], options: { legacy_host: host } })
        await fetchNews({ force: true })
        expect(cachedFeed().options).toEqual({ mechanisms: {} })
    })

    it.each(['str', null, [], 5])('treats options of %j as none', async options => {
        serve({ messages: [], options })
        await fetchNews({ force: true })
        expect(cachedFeed().options).toEqual({ mechanisms: {} })
    })
})

describe('the configs a fetch applies', () => {
    it('sets the solver, markup and public modlogs feed from the feed', async () => {
        serve({
            messages: [],
            options: {
                challenge: { token_fields: ['renamed_token'] },
                markup: { comment_id_attributes: ['data-x'] },
                publicmodlogs_feed: 'b'.repeat(40),
            },
        })
        await fetchNews({ force: true })
        expect(getChallengeConfig()).toEqual({ ...DEFAULT_CHALLENGE_CONFIG, tokenFields: ['renamed_token'] })
        expect(getMarkupConfig().commentIdAttributes).toEqual(['data-x', 'thingId', 'thing-id'])
        expect(getPublicModlogsFeed()).toBe('b'.repeat(40))
    })

    it('returns each to its default when a later feed leaves it out', async () => {
        serve({ messages: [], options: { challenge: { token_fields: ['renamed_token'] } } })
        await fetchNews({ force: true })
        serve({ messages: [] })
        await fetchNews({ force: true })
        expect(getChallengeConfig()).toEqual(DEFAULT_CHALLENGE_CONFIG)
    })
})

describe('the log line', () => {
    it('lists the optional parts that are present', async () => {
        serve({
            messages: [goodMessage],
            options: {
                mechanisms: { legacyOldReddit: 'off' },
                www_route_order: { chrome: ['tab:reload'] },
                markup: { comment_id_attributes: ['data-x'] },
                login_wall: { markers: ['<auth-flow-modal'] },
                publicmodlogs_feed: 'a'.repeat(40),
            },
        })
        await fetchNews({ force: true })
        const [line] = (await getDiagEntries()).map(e => e.m)
        expect(line).toMatch(/^\[reveddit\] news fetch ok: 1 messages, mechanisms=\{"legacyOldReddit":"off"\}/)
        expect(line).toContain(', www_route_order=')
        expect(line).toContain(', markup=')
        expect(line).toContain(', login_wall={')
        expect(line).toMatch(/, publicmodlogs_feed set$/)
        expect(line).not.toContain('scan_limits')
    })

    it('is bare when the feed sets nothing', async () => {
        serve({ messages: [] })
        await fetchNews({ force: true })
        expect((await getDiagEntries()).map(e => e.m)).toEqual(['[reveddit] news fetch ok: 0 messages, mechanisms={}'])
    })
})

describe('ending a legacy rest', () => {
    const seedCache = options => ({
        [NEWS_CACHE_KEY]: { feed: { messages: [], options }, lastFetched: 0 },
        [CAPABILITY_REST_KEY]: { legacy: { n: 1 }, legacy_info: { n: 2 }, api_info: { n: 3 } },
    })
    const rests = () => __getLocalStorage()[CAPABILITY_REST_KEY]

    it('clears the legacy rests, and only those, when the switch changes', async () => {
        __resetStorage({}, seedCache({ mechanisms: { legacyOldReddit: 'on' } }))
        serve({ messages: [], options: { mechanisms: { legacyOldReddit: 'off' } } })
        await fetchNews({ force: true })
        expect(rests()).toEqual({ api_info: { n: 3 } })
    })

    it('clears them when the host changes', async () => {
        __resetStorage({}, seedCache({ mechanisms: {}, legacy_host: 'www.reddit.com' }))
        serve({ messages: [], options: { legacy_host: 'old.reddit.com' } })
        await fetchNews({ force: true })
        expect(rests()).toEqual({ api_info: { n: 3 } })
    })

    it('leaves them when neither changed', async () => {
        __resetStorage({}, seedCache({ mechanisms: { legacyOldReddit: 'off' }, legacy_host: 'old.reddit.com' }))
        serve({ messages: [], options: { mechanisms: { legacyOldReddit: 'off' }, legacy_host: 'old.reddit.com' } })
        await fetchNews({ force: true })
        expect(rests()).toEqual({ legacy: { n: 1 }, legacy_info: { n: 2 }, api_info: { n: 3 } })
    })

    it('leaves them on the first fetch, when nothing was cached', async () => {
        __resetStorage({}, { [CAPABILITY_REST_KEY]: { legacy: { n: 1 } } })
        serve({ messages: [], options: { mechanisms: { legacyOldReddit: 'off' } } })
        await fetchNews({ force: true })
        expect(rests()).toEqual({ legacy: { n: 1 } })
    })
})

describe('sanitizeChallengeConfig solution_regex', () => {
    const regex = value => sanitizeChallengeConfig({ solution_regex: value })

    it('keeps a valid pattern with a capture group', () => {
        expect(regex('a(b)')).toEqual({ solutionRegex: 'a(b)' })
    })
    it('ignores one without a group', () => {
        expect(regex('nogroup')).toEqual({})
    })
    it('ignores an invalid pattern, even with a paren', () => {
        expect(regex('(')).toEqual({})
        expect(regex('a(b')).toEqual({})
    })
    it('ignores a pattern over 200 characters and keeps one of exactly 200', () => {
        expect(regex('(' + 'a'.repeat(199) + ')')).toEqual({})
        expect(regex('(' + 'a'.repeat(198) + ')')).toEqual({ solutionRegex: '(' + 'a'.repeat(198) + ')' })
    })
    it('ignores a non-string', () => {
        expect(regex(5)).toEqual({})
        expect(regex(['(a)'])).toEqual({})
    })
    it('judges the two fields apart', () => {
        expect(sanitizeChallengeConfig({ token_fields: ['abc_token'], solution_regex: 'nogroup' })).toEqual({
            tokenFields: ['abc_token'],
        })
    })
    it.each([undefined, null, 'x', 5])('returns nothing for %j', raw => {
        expect(sanitizeChallengeConfig(raw)).toEqual({})
    })
})
