import browser from 'webextension-polyfill'
import { dlogSummary, dlog } from './diaglog'
import { hasRedditLoginCookie } from './viewer'
import { getLocalStorageItems } from './storage'
import { isViewerBlockedItem } from './common'
import { fetchJsonLoggedIn } from './logged-in-fetch'
import { threadItemUrl, threadItemOf, www_reddit } from './lookup-status'
import {
    isCapabilityResting,
    noteRateLimited,
    noteCapabilityRefused,
    noteCapabilityWorked,
    isRateLimitedNow,
} from './request-gates'
import { NO_AUTH, fetch_forReddit } from './reddit-auth'
import { rehydrateStoredRedditCookies } from './reddit-cookies'

// "Other" (non-profile) items have no public profile to diff against, so removal
// is read from api/info instead. This is the deprecation-surviving primary for
// that case: an AUTHENTICATED api/info request (OAuth token if one exists, else
// the user's real session cookies) — both survive the unauth deprecation. It
// reveals removals for content the user did NOT author (Reddit's self-view only
// hides your OWN removals); self-authored items are handled separately via the
// logged-out thread view. Ids are batched to Reddit's 100-per-call api/info limit,
// one chunk at a time with a small gap, so a large watch list can't burst.
const OTHER_APIINFO_CHUNK = 100

const OTHER_APIINFO_CHUNK_DELAY_MS = 1000

// One item through its thread's JSON with the user's login, which carries the
// fields api/info had (body [removed] or [deleted], removed_by_category,
// is_robot_indexable, locked): a comment through its permalink, where it comes
// first, a post through its thread. data is the item when reddit answered
// with it.
interface ThreadItemRead {
    data?: any
    status: number
    blocked: boolean
    refused: boolean
}

export const readThreadItemLoggedIn = async (id: string, postId: string): Promise<ThreadItemRead> => {
    const r = await fetchJsonLoggedIn(threadItemUrl(id, postId))
    return {
        data: r.ok ? threadItemOf(r.json, id) : undefined,
        status: r.status,
        blocked: r.blocked,
        refused: r.refused,
    }
}

// While api/info rests, each followed item is read through its thread's JSON
// (readThreadItemLoggedIn). One request per item, so a few per cycle,
// oldest-checked first: 100 followed items take about 20 cycles to go round.
// An item not read this cycle is left out of the result, which monitoring
// reads as no news. A comment's post id comes from the URL it was followed
// from (setCurrentStateForId) or from the item cache, whose p is the post's
// fullname; one found in the cache is copied over, so the cache isn't read
// every cycle. Both maps keep only followed items.
const FOLLOWED_CHECKED_AT_KEY = 'followed_checked_at'

export const FOLLOWED_POST_IDS_KEY = 'followed_post_ids'

const FOLLOWED_THREAD_CHECKS_PER_CYCLE = 5

const FOLLOWED_THREAD_DELAY_MS = 700

export const _followedTiming = { delayMs: FOLLOWED_THREAD_DELAY_MS }

const readFollowedMaps = async (): Promise<{ checkedAt: Record<string, number>; postIds: Record<string, string> }> => {
    try {
        const stored = (await browser.storage.local.get({
            [FOLLOWED_CHECKED_AT_KEY]: {},
            [FOLLOWED_POST_IDS_KEY]: {},
        })) as any
        return { checkedAt: stored[FOLLOWED_CHECKED_AT_KEY] || {}, postIds: stored[FOLLOWED_POST_IDS_KEY] || {} }
    } catch {
        return { checkedAt: {}, postIds: {} }
    }
}

// Merged into what's stored now (a follow's lookup can run beside a cycle's)
// and pruned to the followed list, not to this call's ids: a follow looks up
// one id, and the rotation must not restart then
const saveFollowedMaps = async (checked: Record<string, number>, foundPostIds: Record<string, string>) => {
    try {
        const { checkedAt, postIds } = await readFollowedMaps()
        const followed = new Set(
            Object.keys(
                (((await browser.storage.sync.get({ other_subscriptions: {} })) as any).other_subscriptions ||
                    {}) as object,
            ),
        )
        const keep = (map: Record<string, unknown>) => {
            let dropped = false
            for (const id of Object.keys(map)) {
                if (!followed.has(id)) {
                    delete map[id]
                    dropped = true
                }
            }
            return dropped
        }
        Object.assign(checkedAt, checked)
        const postIdsChanged = Object.entries(foundPostIds).some(([id, post]) => postIds[id] !== post)
        Object.assign(postIds, foundPostIds)
        keep(checkedAt)
        const write: Record<string, unknown> = { [FOLLOWED_CHECKED_AT_KEY]: checkedAt }
        if (keep(postIds) || postIdsChanged) {
            write[FOLLOWED_POST_IDS_KEY] = postIds
        }
        await browser.storage.local.set(write)
    } catch {
        /* ignored */
    }
}

const lookupFollowedItemsByThread = async (ids: string[]): Promise<any[]> => {
    const skip = (why: string) => {
        dlogSummary('cycle', `[reveddit] followed items through their threads (api/info resting): ${why}`)
        return []
    }
    if (await isCapabilityResting('thread_json')) {
        return skip(`not read, the thread reads rest after reddit refused them`)
    }
    // Logged out, reddit answers every .json from the extension with its
    // block page (bridge.ts), so there's nothing to read
    if (!(await hasRedditLoginCookie())) {
        return skip('not read, no reddit login')
    }
    const { checkedAt, postIds } = await readFollowedMaps()
    const found: Record<string, string> = {}
    if (ids.some(id => !id.startsWith('t3_') && !postIds[id])) {
        try {
            const cached: Record<string, any> = ((await getLocalStorageItems('other', false)) as any) || {}
            for (const id of ids) {
                const p = cached[id]?.p
                if (!id.startsWith('t3_') && !postIds[id] && typeof p === 'string' && p) {
                    found[id] = p.replace(/^t3_/, '')
                }
            }
        } catch {
            /* ignored */
        }
    }
    const postOf = (id: string): string | undefined =>
        id.startsWith('t3_') ? id : postIds[id] || found[id] || undefined
    const readable = ids.filter(id => postOf(id))
    const noPost = ids.length - readable.length
    readable.sort((a, b) => (checkedAt[a] || 0) - (checkedAt[b] || 0))
    const batch = readable.slice(0, FOLLOWED_THREAD_CHECKS_PER_CYCLE)
    const results: { data: any }[] = []
    const checked: Record<string, number> = {}
    let answered = false
    let viewerBlocked = 0
    let note = ''
    for (const [i, id] of batch.entries()) {
        if (i > 0 && _followedTiming.delayMs > 0) {
            await new Promise(r => setTimeout(r, _followedTiming.delayMs))
        }
        const r = await readThreadItemLoggedIn(id, postOf(id)!)
        if (r.status === 429) {
            noteRateLimited(new Error('www.reddit.com request failed: 429'))
            note = ', stopped on a 429'
            break
        }
        if (r.blocked) {
            // Refused in both cache modes: the thread reads rest like api/info.
            // One mode only (the other was skipped after a recent double
            // block): just this cycle's reads stop.
            if (r.refused) {
                await noteCapabilityRefused('thread_json', 'block page')
            }
            note = ', stopped on a block page'
            break
        }
        checked[id] = Date.now()
        if (r.status === 200) {
            answered = true
        }
        if (r.data) {
            // The author blocked the user: the logged-in view reads
            // [unavailable], which would look like a removal
            if (isViewerBlockedItem(r.data)) {
                viewerBlocked++
            } else {
                results.push({ data: r.data })
            }
        }
    }
    if (answered) {
        await noteCapabilityWorked('thread_json')
    }
    await saveFollowedMaps(checked, found)
    dlogSummary(
        'cycle',
        `[reveddit] followed items through their threads (api/info resting): ${results.length} of ${batch.length} read` +
            note +
            (viewerBlocked ? `, ${viewerBlocked} hidden by their authors' block` : '') +
            (noPost ? `, ${noPost} comments with no known post skipped` : ''),
    )
    return results
}

export const lookupOtherItemsByID_authed = async (ids: string[], auth: any, monitor_quarantined: boolean) => {
    // After a 429 earlier in the cycle (the user's own lookup): no news this time
    if (await isRateLimitedNow()) {
        dlog('cycle', `[reveddit] followed items not read: rate limited`)
        return []
    }
    const useOAuth = auth && auth !== NO_AUTH
    if (!useOAuth) {
        // Put the user's harvested session back in the cookie jar so credentials
        // 'include' yields the authenticated view (mirrors lookupItemsByLoggedInUserWithAuth).
        await rehydrateStoredRedditCookies()
        if (await isCapabilityResting('api_info')) {
            return lookupFollowedItemsByThread(ids)
        }
    }
    const children: any[] = []
    for (let i = 0; i < ids.length; i += OTHER_APIINFO_CHUNK) {
        const chunk = ids.slice(i, i + OTHER_APIINFO_CHUNK)
        const search = `?id=${chunk.join(',')}&raw_json=1`
        let batch: any
        if (useOAuth) {
            batch = await fetch_forReddit('api/info' + search, auth, monitor_quarantined)
        } else {
            const r = await fetchJsonLoggedIn(`${www_reddit}api/info.json${search}`)
            if (r.blocked) {
                await noteCapabilityRefused('api_info', 'block page')
                return lookupFollowedItemsByThread(ids)
            }
            if (!r.ok) {
                throw new Error(`authenticated api/info request failed: ${r.status}`)
            }
            batch = r.json?.data?.children
        }
        if (!Array.isArray(batch)) {
            // fetch_forReddit swallows its own errors (returns undefined); treat any
            // non-array as failure so the caller drops to the legacy chain.
            throw new Error('authenticated api/info returned no children')
        }
        children.push(...batch)
        if (i + OTHER_APIINFO_CHUNK < ids.length) {
            await new Promise(r => setTimeout(r, OTHER_APIINFO_CHUNK_DELAY_MS))
        }
    }
    if (!useOAuth) {
        await noteCapabilityWorked('api_info')
    }
    // Items whose authors blocked the user read [unavailable] logged in, which
    // would look like removals: no news about them
    const visible = children.filter(child => !isViewerBlockedItem(child?.data))
    if (visible.length < children.length) {
        dlog('cycle', `[reveddit] followed items: ${children.length - visible.length} hidden by their authors' block`)
    }
    return visible
}
