// Install chrome global BEFORE any source import
import '../mocks/chrome-api.js'

import { describe, it, expect, beforeEach } from 'vitest'
import { __resetStorage, __getLocalStorage } from '../mocks/webextension-polyfill.js'

import { applyRemoteChallengeConfig, NEWS_CACHE_KEY } from '../../src/src/news'
import { getChallengeConfig, resetChallengeConfig, DEFAULT_CHALLENGE_CONFIG } from '../../src/src/challenge-config'
import { flagIfRateLimited } from '../../src/src/requests'

// The worker re-applies the cached feed's solver inputs on every start
// (background.ts module scope), so a token rename fixed remotely survives the
// next alarm-tick restart instead of reverting to the compiled defaults.
describe('applyRemoteChallengeConfig on worker start', () => {
    beforeEach(() => {
        resetChallengeConfig()
        __resetStorage({}, {})
    })

    it('reads the cached feed and overrides the compiled defaults', async () => {
        __resetStorage(
            {},
            { [NEWS_CACHE_KEY]: { feed: { options: { challenge: { tokenFields: ['renamed_token'] } } } } },
        )
        await applyRemoteChallengeConfig()
        expect(getChallengeConfig().tokenFields).toEqual(['renamed_token'])
        expect(getChallengeConfig().solutionRegex).toBe(DEFAULT_CHALLENGE_CONFIG.solutionRegex)
    })

    it('leaves the defaults in place when nothing is cached', async () => {
        await applyRemoteChallengeConfig()
        expect(getChallengeConfig()).toEqual(DEFAULT_CHALLENGE_CONFIG)
    })
})

// A 403 is a block, not rate limiting: it gets its own status and never
// enters the 429 backoff. The simulated legacy-disabled 403 sets nothing.
describe('flagIfRateLimited status classes', () => {
    beforeEach(() => __resetStorage({}, {}))

    it('429 sets rate_limited', () => {
        flagIfRateLimited(new Error('www.reddit.com request failed: 429'))
        expect(__getLocalStorage().error_status).toBe('rate_limited')
    })

    it('403 sets reddit_blocked and no backoff', () => {
        flagIfRateLimited(new Error('www.reddit.com request failed: 403'))
        expect(__getLocalStorage().error_status).toBe('reddit_blocked')
        expect(__getLocalStorage().rate_limit_until).toBeUndefined()
    })

    it('the synthetic legacy-disabled 403 sets nothing', () => {
        flagIfRateLimited(new Error('profile request failed: 403 (legacy endpoints disabled)'))
        expect(__getLocalStorage().error_status).toBeUndefined()
    })
})
