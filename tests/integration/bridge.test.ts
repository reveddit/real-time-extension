// Bridge URL validation and budget: the bridge is a closed allowlist of public
// reddit JSON endpoints, never a URL proxy, and its window budget halves for
// an hour after a 429 (mirroring computeAbsentVerifyBudget).

// Install chrome global BEFORE any source import
import '../mocks/chrome-api.js'

import { describe, it, expect } from 'vitest'

import { validateBridgeUrl, computeBridgeBudget, bridgeRequestUrl, BRIDGE_MARKER } from '../../src/src/bridge.ts'
import { RECENT_RATE_LIMIT_WINDOW_MS } from '../../src/src/requests.ts'

describe('validateBridgeUrl', () => {
    it('accepts the endpoints the website uses', () => {
        for (const url of [
            'https://www.reddit.com/api/info.json?id=t3_abc,t1_def&raw_json=1',
            'https://www.reddit.com/user/spez/comments.json?limit=100&sort=new',
            'https://www.reddit.com/user/spez/about/.json',
            'https://www.reddit.com/user/spez/moderated_subreddits/.json',
            'https://www.reddit.com/api/user_data_by_account_ids.json?ids=t2_abc',
            'https://www.reddit.com/api/username_available.json?user=spez',
            'https://www.reddit.com/r/CantSayAnything/new.json?limit=100',
            'https://www.reddit.com/r/CantSayAnything/about/.json',
            'https://www.reddit.com/r/sub/about/log.json?feed=abc&user=publicmodlogs',
            'https://www.reddit.com/comments/abc123.json?limit=500',
            'https://www.reddit.com/r/sub/comments/abc123.json?sort=old',
            'https://www.reddit.com/search.json?q=url:x',
        ]) {
            expect(validateBridgeUrl(url), url).toBeTruthy()
        }
    })
    it('normalizes the /.json form and strips jsonp', () => {
        expect(validateBridgeUrl('https://www.reddit.com/user/spez/about/.json?jsonp=cb_1&raw_json=1')).toBe(
            'https://www.reddit.com/user/spez/about.json?raw_json=1',
        )
    })
    it('refuses other hosts, protocols, and paths', () => {
        for (const url of [
            'https://oauth.reddit.com/api/info.json?id=t3_abc', // page must rewrite first
            'https://old.reddit.com/api/info.json?id=t3_abc',
            'http://www.reddit.com/api/info.json?id=t3_abc',
            'https://www.reddit.com.evil.com/api/info.json',
            'https://www.reddit.com/api/v1/access_token',
            'https://www.reddit.com/api/submit.json',
            'https://www.reddit.com/user/spez/comments', // no .json
            'https://example.com/api/info.json',
            'not a url',
        ]) {
            expect(validateBridgeUrl(url), url).toBeNull()
        }
    })
})

describe('computeBridgeBudget', () => {
    it('halves the window budget after a recent 429', () => {
        const normal = computeBridgeBudget(null)
        expect(computeBridgeBudget(RECENT_RATE_LIMIT_WINDOW_MS + 1)).toBe(normal)
        expect(computeBridgeBudget(RECENT_RATE_LIMIT_WINDOW_MS - 1)).toBe(Math.floor(normal / 2))
    })
})

// The loid cookie is injected only on requests carrying the bridge marker
// (DNR rule on Chrome/Edge, webRequest on Firefox), so every bridge fetch must
// carry it and the marker must survive validateBridgeUrl's normalization.
describe('bridgeRequestUrl', () => {
    it('appends the marker to URLs with and without a query', () => {
        expect(bridgeRequestUrl('https://www.reddit.com/api/info.json?id=t3_abc')).toBe(
            'https://www.reddit.com/api/info.json?id=t3_abc&' + BRIDGE_MARKER,
        )
        expect(bridgeRequestUrl('https://www.reddit.com/user/spez/about.json')).toBe(
            'https://www.reddit.com/user/spez/about.json?' + BRIDGE_MARKER,
        )
    })
    it('matches the header rules the same way on both browsers', () => {
        const marked = bridgeRequestUrl(
            validateBridgeUrl('https://www.reddit.com/r/sub/new.json?limit=100&jsonp=cb_1')!,
        )
        // Chrome DNR regexFilter (bridge.ts) and Firefox match pattern
        // 'https://www.reddit.com/*rv_bridge=1' (background.ts) both test the query
        expect(marked).toMatch(new RegExp('^https://www\\.reddit\\.com/.*[?&]' + BRIDGE_MARKER))
        expect(marked.endsWith(BRIDGE_MARKER)).toBe(true)
    })
})
