import browser from 'webextension-polyfill'
import { getRemoteMechanism, MECHANISM_LEGACY, resolveMechanismDisabled } from './news'
import { getItemsById_fromOldHTML, getPost_fromOld } from './parse_html/old'
import { PostPageStatus } from './parse_html/new'
import { dlogSummary, dlog } from './diaglog'
import { isRemovedComment } from './common'
import { addToPendingPostQueue, clearRateLimitBackoff } from './storage'
import {
    isCapabilityResting,
    noteCapabilityRefused,
    isRateLimitedNow,
    noteCapabilityWorked,
    noteRateLimited,
} from './request-gates'
import { AuthItemsMeta, www_reddit } from './lookup-status'
import { fetch_forReddit } from './reddit-auth'

// Gate for the unauthenticated legacy paths: old.reddit.com HTML and unauth www
// .json — the endpoints Reddit's announced deprecation removes. Gates exactly the
// unauthenticated legacy call sites; authenticated calls (credentials:'include')
// and the www SSR HTML public path survive the real change, so they are never gated.
//
// Resolution, highest priority first:
// 1. Dev storage override (dev options checkbox, or from the service-worker console):
//      chrome.storage.local.set({ dev_simulate_endpoint_deprecation: true })   // or false
//      chrome.storage.local.remove('dev_simulate_endpoint_deprecation')        // back to defaults
// 2. Remote option MECHANISM_LEGACY from the news feed (see news.ts) — lets the
//    legacy paths be turned off fleet-wide when the deprecation actually lands,
//    without waiting on a store republish. 'auto' defers to the build.
// 3. Build default (SIMULATE_DEPRECATION=true → dist-*-nolegacy folders). The
//    extension checks for removals immediately on load, so this is what's in
//    effect before the first news fetch completes.
export const DEV_SIMULATE_DEPRECATION_KEY = 'dev_simulate_endpoint_deprecation'

const SIMULATE_DEPRECATION_BUILD_DEFAULT =
    typeof __SIMULATE_DEPRECATION__ !== 'undefined' ? __SIMULATE_DEPRECATION__ : false

export const isLegacyDisabled = (): Promise<boolean> =>
    browser.storage.local
        .get({ [DEV_SIMULATE_DEPRECATION_KEY]: null })
        .then(async (r: any) => {
            const dev = r[DEV_SIMULATE_DEPRECATION_KEY]
            const remote = await getRemoteMechanism(MECHANISM_LEGACY)
            return resolveMechanismDisabled(dev === null ? null : !!dev, remote, SIMULATE_DEPRECATION_BUILD_DEFAULT)
        })
        .catch(() => SIMULATE_DEPRECATION_BUILD_DEFAULT)

// Message shape matches flagIfRateLimited's /request failed: (\d+)/ — a 403 does
// not trigger rate-limit backoff, mirroring how the real deprecation responds.
export const throwIfLegacyDisabled = async (label: string) => {
    if (await isLegacyDisabled()) {
        throw new Error(`${label} request failed: 403 (legacy endpoints disabled)`)
    }
}

export type LegacyKind = 'legacy' | 'legacy_info'

export const isLegacyResting = (kind: LegacyKind = 'legacy'): Promise<boolean> => isCapabilityResting(kind)

// Off for now: disabled (dev switch, remote option, build), or resting after a
// refusal. Monitoring and page views honor both.
export const isLegacyOff = async (kind: LegacyKind = 'legacy'): Promise<boolean> =>
    (await isLegacyDisabled()) || (await isLegacyResting(kind))

const throwIfLegacyOff = async (label: string, kind: LegacyKind) => {
    await throwIfLegacyDisabled(label)
    if (await isLegacyResting(kind)) {
        throw new Error(`${label} skipped: resting after reddit refused it`)
    }
}

// A real 403 (not the simulated one above) rests that kind of legacy request
export const noteLegacyRefusal = (err: any, kind: LegacyKind = 'legacy'): Promise<void> => {
    const message = String(err?.message || err)
    if (/request failed: 403\b/.test(message) && !message.includes('legacy endpoints disabled')) {
        return noteCapabilityRefused(kind, 'HTTP 403')
    }
    return Promise.resolve()
}

// Seam for tests: the legacy parsers run HTMLRewriter (WASM), which cannot load
// under vitest, so the tiebreaker routes its calls through this replaceable
// object rather than calling the parse_html/old functions directly.
export const _legacyLookups = {
    commentsById: getItemsById_fromOldHTML,
    postByPath: getPost_fromOld,
}

const LEGACY_TIEBREAK_POST_MAX_PER_CYCLE = 5

const LEGACY_TIEBREAK_POST_DELAY_MS = 500

// old.reddit tiebreaker for ids the www page lottery left unverdicted. The www
// SSR variants sometimes serve comment-less shells for extended stretches
// (observed live: 12/12 shells), which would leave feed-absent items undetected
// indefinitely. old.reddit is not subject to those variants and remains the
// pre-Shreddit truth source until the deprecation lands — this call site is
// gated with the rest of the legacy paths. Comments resolve in one batched
// /api/info HTML request; posts need their own page (meta-robots signal).
export const legacyTiebreakAbsent = async (
    ids: string[],
    canaryCommentIds: string[],
    verdicts: Record<string, PostPageStatus>,
    record: (id: string, v: Exclude<PostPageStatus, 'unknown'>) => void,
    authItemsMeta: AuthItemsMeta = {},
): Promise<void> => {
    const unresolved = ids.filter(id => !(id in verdicts))
    // Not after a 429 (the verification loop above stops on one)
    if (!unresolved.length || (await isRateLimitedNow())) {
        return
    }
    // Comments read the legacy /api/info listing, posts their own legacy pages
    const commentIds = (await isLegacyOff('legacy_info')) ? [] : unresolved.filter(id => id.startsWith('t1_'))
    const postIds = (await isLegacyOff('legacy')) ? [] : unresolved.filter(id => id.startsWith('t3_'))
    if (commentIds.length) {
        try {
            // old.reddit /api/info HTML DROPS removed comments instead of
            // rendering [removed] markers (verified live), so absence is the
            // removal signal — but only when the response is provably healthy.
            // Feed-present comments are live by definition; batching a few in as
            // canaries proves the endpoint returned real things this cycle.
            const batch = [...commentIds, ...canaryCommentIds]
            const results = (await _legacyLookups.commentsById(batch)) as any[]
            const byName: Record<string, any> = {}
            for (const wrap of results || []) {
                if (wrap?.data?.name) {
                    byName[wrap.data.name] = wrap.data
                }
            }
            const canaryRendered = canaryCommentIds.some(id => byName[id])
            if (canaryRendered) {
                await noteCapabilityWorked('legacy_info')
            }
            // The "healthy call, zero items" case was invisible in issue #14's
            // log — it must be distinguishable from "tiebreak resolved things".
            dlogSummary(
                'legacy',
                `[reveddit] legacy comment tiebreak: ${Object.keys(byName).length}/${batch.length} rendered, canaryRendered=${canaryRendered}`,
            )
            for (const id of commentIds) {
                const item = byName[id]
                if (item && item.author) {
                    record(id, isRemovedComment(item) ? 'removed' : 'live')
                } else if (!item && canaryRendered) {
                    // Absent while known-live canaries rendered. /api/info is not
                    // a profile view, so profile-hiding cannot explain absence
                    // here (verified: a profile-hidden live comment renders) →
                    // the comment is removed or deleted.
                    record(id, 'removed')
                }
            }
        } catch (err: any) {
            dlog('legacy', '[reveddit] legacy comment tiebreak failed:', String(err?.message || err))
            if (noteRateLimited(err)) {
                return
            }
            await noteLegacyRefusal(err, 'legacy_info')
        }
    }
    let postFetches = 0
    for (const id of postIds) {
        if (postFetches >= LEGACY_TIEBREAK_POST_MAX_PER_CYCLE) {
            break
        }
        if (postFetches > 0) {
            await new Promise(r => setTimeout(r, LEGACY_TIEBREAK_POST_DELAY_MS))
        }
        postFetches++
        try {
            // Canonical permalink when the auth view supplied one: /comments/<id>/
            // answers with a redirect to it
            const permalink = authItemsMeta[id]?.permalink
            const path = permalink && permalink.startsWith('/r/') ? permalink : '/comments/' + id.substring(3) + '/'
            const page = (await _legacyLookups.postByPath(path)) as any
            if (page && !page.error) {
                record(id, page.is_removed ? 'removed' : 'live')
                await noteCapabilityWorked('legacy')
            } else {
                dlog('legacy', `[reveddit] legacy post tiebreak ${id}: no page${page?.error ? ` (${page.error})` : ''}`)
                if (page?.status === 403 || page?.refused) {
                    // Refused: the legacy pages rest (the listing rests on its
                    // own), starting with the rest of this loop
                    await noteCapabilityRefused('legacy', page.refused ? 'challenge page' : 'HTTP 403')
                    break
                }
                if (page?.status === 429) {
                    noteRateLimited(new Error(String(page.error)))
                    break
                }
            }
        } catch (err: any) {
            dlog('legacy', `[reveddit] legacy post tiebreak failed ${id}:`, String(err?.message || err))
        }
    }
}

// Legacy paths, kept as fallback until Reddit's deprecation lands:
// old.reddit HTML -> www JSON -> OAuth. All unauthenticated-legacy fetches are
// gated by the dev deprecation switch so post-deprecation behavior is testable.
// Posts go to the pending-post queue, which reads each one's own legacy page
// ('legacy'), whatever becomes of the listing: the listing ('legacy_info')
// rests on its own, and reddit refuses it while the pages still answer. Not
// posts the logged-in view shows in a private or quarantined community: their
// pages answer 403 logged out, which reads like reddit refusing every page.
const queueLegacyPosts = async (ids: string | string[], authItemsMeta: AuthItemsMeta) => {
    const postIds = (Array.isArray(ids) ? ids : String(ids).split(',')).filter(id => {
        const meta = authItemsMeta[id]
        return id.startsWith('t3_') && !(meta?.quarantine || meta?.subreddit_type === 'private')
    })
    if (postIds.length && !(await isLegacyOff('legacy'))) {
        await addToPendingPostQueue(postIds)
    }
}

export const lookupItemsByID_legacy = (
    auth: any,
    monitor_quarantined: boolean,
    ids: string | string[],
    authItemsMeta: AuthItemsMeta = {},
) => {
    const search = `?id=${ids}&raw_json=1`
    return queueLegacyPosts(ids, authItemsMeta)
        .catch(() => {})
        .then(() => throwIfLegacyOff('legacy reddit HTML', 'legacy_info'))
        .then(() => getItemsById_fromOldHTML(ids))
        .then(result => {
            clearRateLimitBackoff()
            noteCapabilityWorked('legacy_info')
            return result
        })
        .catch(htmlError => {
            console.log('old.reddit.com HTML fallback failed:', htmlError.message)
            noteLegacyRefusal(htmlError, 'legacy_info')

            // Second: try www.reddit.com JSON (sometimes works after rate-limit clears)
            const wwwUrl = www_reddit + 'api/info.json' + search
            const wwwOptions = { credentials: 'omit' as const }

            return throwIfLegacyOff('www.reddit.com JSON', 'legacy_info')
                .then(() => fetch(wwwUrl, wwwOptions))
                .then(response => {
                    if (response.ok) {
                        clearRateLimitBackoff()
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
                .catch(async wwwError => {
                    console.log('www.reddit.com JSON failed:', wwwError.message)

                    // Fall back to OAuth if available
                    if (auth && auth !== 'none') {
                        console.log('Trying OAuth fallback')
                        const children = await fetch_forReddit('api/info' + search, auth, monitor_quarantined)
                        // It swallows its own errors (returns undefined), which
                        // monitoring would read as a pass that found nothing
                        if (Array.isArray(children)) {
                            return children
                        }
                    }
                    // Only a 429 enters the backoff here. This chain runs
                    // when the public view already failed, and its refusal
                    // must not replace the status that failure reports.
                    noteRateLimited(wwwError)
                    throw htmlError
                })
        })
}
