import browser from 'webextension-polyfill'
import { CAPABILITY_REST_KEY } from './news'
import { dlogSummary, dlog } from './diaglog'
import { setWarningBadge } from './common'
import { recordRateLimitHit, getRateLimitBackoffRemainingMs } from './storage'
import { isRateLimitError } from './parse_html/common'

type RestingCapability = 'legacy' | 'legacy_info' | 'api_info' | 'thread_json'

export const CAPABILITY_FIRST_REST_MS = 6 * 3600 * 1000

export const CAPABILITY_MAX_REST_MS = 7 * 24 * 3600 * 1000

interface CapabilityRest {
    // refusals in a row
    refusals: number
    until: number
    // when the first of them came
    since: number
}

export const capabilityRestMs = (refusals: number): number =>
    Math.min(CAPABILITY_FIRST_REST_MS * 2 ** Math.max(0, refusals - 1), CAPABILITY_MAX_REST_MS)

const readCapabilityRests = async (): Promise<Partial<Record<RestingCapability, CapabilityRest>>> => {
    try {
        return ((await browser.storage.local.get({ [CAPABILITY_REST_KEY]: {} })) as any)[CAPABILITY_REST_KEY] || {}
    } catch {
        return {}
    }
}

// A rest further ahead than the longest one (the clock was set back) is
// ignored, so the next refusal starts a new rest rather than finding the old
// one still running
const isRestActive = (rest: CapabilityRest | undefined, now: number): boolean => {
    const left = Number(rest?.until) - now
    return left > 0 && left <= CAPABILITY_MAX_REST_MS
}

export const isCapabilityResting = async (capability: RestingCapability): Promise<boolean> =>
    isRestActive((await readCapabilityRests())[capability], Date.now())

const hoursText = (ms: number) => `${Math.round(ms / 3600000)} h`

export const noteCapabilityRefused = async (capability: RestingCapability, why: string) => {
    try {
        const rests = await readCapabilityRests()
        const now = Date.now()
        const before = rests[capability]
        // Already resting: a path that doesn't honor the rest (a restore the
        // user started) adds no refusal; only the tries the rest allows count
        if (isRestActive(before, now)) {
            return
        }
        const refusals = (before?.refusals || 0) + 1
        const restMs = capabilityRestMs(refusals)
        rests[capability] = { refusals, until: now + restMs, since: before?.since || now }
        await browser.storage.local.set({ [CAPABILITY_REST_KEY]: rests })
        dlogSummary(
            'cycle',
            `[reveddit] ${capability} refused (${why}): resting ${hoursText(restMs)}, ` +
                `refusal ${refusals} in a row since ${new Date(rests[capability]!.since).toISOString()}`,
        )
    } catch {
        /* ignored */
    }
}

export const noteCapabilityWorked = async (capability: RestingCapability) => {
    try {
        const rests = await readCapabilityRests()
        const before = rests[capability]
        if (!before) {
            return
        }
        delete rests[capability]
        await browser.storage.local.set({ [CAPABILITY_REST_KEY]: rests })
        dlogSummary(
            'cycle',
            `[reveddit] ${capability} works again, after ${before.refusals} refusals since ${new Date(before.since).toISOString()}`,
        )
    } catch {
        /* ignored */
    }
}

// Only a 429 is rate limiting. A 403 is a block (challenge page, structural
// block on unauthenticated JSON) and gets its own status so the popup and
// support triage stop calling it rate limiting. The synthetic '(legacy
// endpoints disabled)' 403 is a build-time simulation, not a live block.
const RATE_LIMIT_STATUSES = new Set([429])

export const flagIfRateLimited = (err: Error) => {
    const m = err.message.match(/request failed: (\d+)/)
    if (!m) return
    const status = Number(m[1])
    if (RATE_LIMIT_STATUSES.has(status)) {
        setWarningBadge('rate_limited')
    } else if (status === 403 && !err.message.includes('legacy endpoints disabled')) {
        setWarningBadge('reddit_blocked')
    }
    // Only a real 429 means rate-limited. A 403 is Reddit's structural block on
    // unauthenticated JSON requests (it happens every cycle now), so it must NOT
    // trigger backoff — otherwise the alarm would needlessly pause monitoring.
    if (status === 429) {
        dlog('ratelimit', '[reveddit] 429 from Reddit — scheduling monitoring backoff')
        recordRateLimitHit()
    }
}

// Reddit is rate limiting: a 429 started a backoff that hasn't run out. A 429
// stops the loop that saw it (noteRateLimited); the later steps of the cycle
// ask this before sending anything.
export const isRateLimitedNow = async (): Promise<boolean> => (await getRateLimitBackoffRemainingMs()) > 0

// A 429 enters the shared backoff and tells the caller to stop its loop. Only
// a 429: a 403 is about one route, which the fetcher already moved off.
export const noteRateLimited = (err: any): boolean => {
    if (!isRateLimitError(err)) {
        return false
    }
    flagIfRateLimited(err instanceof Error ? err : new Error(String(err)))
    return true
}

// Gentle resume after a 429: for a while after the last recorded hit, halve the
// verification burst and double its spacing, so the first cycle back from a
// backoff doesn't immediately re-trip the limiter (which for a heavy commenter
// turns into a permanent skip-verify-skip loop — issue #14's suspected shape).
export const RECENT_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000
