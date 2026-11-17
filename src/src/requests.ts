import { FetchHtml, PublicProfileData, getPublicProfileItems } from './parse_html/new'
import browser from 'webextension-polyfill'
import { dlog } from './diaglog'
import {
    removeMultipleFromPendingPostQueue,
    clearRateLimitBackoff,
    getScanSettings,
    getMsSinceLastRateLimitHit,
    SCAN_SECONDS_MAX,
} from './storage'
import { isRemovedItem, RedditItem } from './common'
import { getViewer, isSignedInViewer, isViewerConnecting, hasRedditLoginCookie } from './viewer'
import { isRateLimitError } from './parse_html/common'
import { isLoginWallMessage } from './login-wall-config'
import { getRemoteMechanism, MECHANISM_SCAN_FEEDS } from './news'
import { fetchForScan, UNCACHED_MODES, WWW_FETCH_TIMEOUT_MS, withDeadline, workerSession } from './logged-in-fetch'
import {
    PROFILE_CONTROL_USER,
    AuthItemsMeta,
    recordWwwDetectOutcome,
    reportPublicProfileShadowban,
    publiclyInvisibleReason,
    notePublicProfileUnavailable,
    recordPaginationOutcome,
    recordAbsentVerifyOutcome,
    authSaysPostRemoved,
    isCovered,
    publicViewUncheckedReason,
    notePublicViewUnchecked,
    viewerCheckedLast,
    VIEWER_THREAD_FAILURES_KEY,
    PROFILE_PUBLICLY_EMPTY,
} from './lookup-status'
import { getWwwHtmlFetcher } from './www-fetcher'
import { notePublicViewUnreadable } from './public-cookies'
import { noteRateLimited, isRateLimitedNow, RECENT_RATE_LIMIT_WINDOW_MS, readLocal, isFresh } from './request-gates'
import {
    verifyFeedPresentPosts,
    isAbsentVerificationDisabled,
    isAbsentUnverifiedUnknown,
    verifyFeedAbsentItems,
} from './page-verify'
import { lookupItemsByID_legacy } from './legacy-lookup'
import { lookupOtherItemsByID_authed } from './followed-lookup'
import { lookupItemsByID_fromViewer } from './viewer-lookup'
import { isLoginKeptOut } from './reddit-auth'

const PROFILE_CONTROL_KEY = 'public_profile_control'

const PROFILE_CONTROL_TTL_MS = 6 * 3600 * 1000

const PROFILE_CONTROL_FAILED_TTL_MS = 30 * 60 * 1000

const controlProfileLoads = async (fetchHtml: FetchHtml): Promise<boolean> => {
    const now = Date.now()
    const stored: any = await readLocal(PROFILE_CONTROL_KEY, null)
    const t = Number(stored?.t || 0)
    if (stored?.ok === true && isFresh(t, PROFILE_CONTROL_TTL_MS, now)) {
        return true
    }
    if (stored?.ok === false && isFresh(t, PROFILE_CONTROL_FAILED_TTL_MS, now)) {
        return false
    }
    const control: PublicProfileData = await getPublicProfileItems(PROFILE_CONTROL_USER, fetchHtml, [], 0)
    if (!control.valid) {
        dlog(
            'feed',
            `[reveddit] control profile u/${PROFILE_CONTROL_USER} did not load: ${control.error || 'unrecognized'}`,
        )
    }
    try {
        await browser.storage.local.set({ [PROFILE_CONTROL_KEY]: { ok: control.valid, t: now } })
    } catch {
        /* ignored */
    }
    return control.valid
}

// Primary detection path: compare the requested (authenticated) ids against the
// logged-out www.reddit.com profile. Present → not removed. Missing within the
// paginated coverage window → removed. Missing below the window → status unknown,
// omitted entirely so the caller neither alerts nor resets removal counts.
export const lookupItemsByID_fromPublicProfile = async (
    ids: string[],
    username: string,
    authItemsMeta: AuthItemsMeta = {},
) => {
    const fetcher = await getWwwHtmlFetcher()
    const { fetchHtml } = fetcher
    const profile = await getPublicProfileItems(username, fetchHtml, ids)
    if (!profile.valid) {
        const reason = profile.error || 'unrecognized response'
        // Both profile tabs are a 404 while the logged-in view lists items:
        // logged out, the account doesn't exist, which is how a site-wide
        // shadowban (or a suspension) looks. Same warning as an empty profile,
        // once a profile known to exist still loads.
        if (ids.length && profile.missing) {
            if (await controlProfileLoads(fetchHtml)) {
                await recordWwwDetectOutcome(true)
                return reportPublicProfileShadowban(username, 'missing (404)', true)
            }
            dlog('feed', `[reveddit] public profile for ${username} is a 404, but so is the control; not a shadowban`)
        }
        await recordWwwDetectOutcome(false, {
            reason,
            loginWall: !!profile.loginWall,
            withTab: fetcher.withTab,
            unreadable: !!profile.unreadable,
        })
        if (profile.unreadable) {
            await notePublicViewUnreadable()
        }
        // A 429 enters the shared backoff. Refusals don't touch the status:
        // recordWwwDetectOutcome reports a persistent failure itself.
        noteRateLimited(new Error(reason))
        throw new Error(`www profile lookup invalid: ${reason}`)
    }
    await recordWwwDetectOutcome(true)
    if (profile.hidden) {
        const tabs = [profile.hidden.t1 && 'comments', profile.hidden.t3 && 'posts'].filter(Boolean).join(' and ')
        dlog(
            'feed',
            `[reveddit] u/${username} hides their ${tabs} from logged-out visitors; each is checked on its own page`,
        )
    }
    if (profile.emptyProfile && ids.length) {
        // An account whose every item is NSFW, quarantined or in a private
        // subreddit is publicly empty by design, not shadowbanned: fall through
        // so the classification loop reads those (readLookupResult) instead
        // of parking the account behind a permanent banner. An id with
        // no meta could be visible, so it keeps the shadowban reading.
        const anyPubliclyVisibleClass = ids.some(id => !publiclyInvisibleReason(authItemsMeta[id]))
        if (!anyPubliclyVisibleClass) {
            dlog(
                'feed',
                `[reveddit] public profile for ${username} is empty, but every item is NSFW, quarantined or private; not treated as a shadowban`,
            )
        } else {
            // The whole profile is publicly empty while the authenticated view has
            // items — the shadowban signature
            await reportPublicProfileShadowban(username, 'empty', false)
        }
    }
    await notePublicProfileUnavailable(null)
    await recordPaginationOutcome(profile.paginationStopped)
    const { verdicts: postVerdicts, owed: postsOwed } = await verifyFeedPresentPosts(
        ids,
        new Set(profile.items.keys()),
        authItemsMeta,
        fetchHtml,
    )
    // Feed-absent items within coverage can be profile-hidden rather than
    // removed — verify against their own pages before concluding anything.
    // Skipped: auth-confirmed removals, and publicly-invisible classes whose
    // pages are gated logged-out (monitoring exempts those from removal anyway).
    const absentVerificationDisabled = await isAbsentVerificationDisabled()
    const absentUnverifiedIsUnknown = await isAbsentUnverifiedUnknown()
    const absentToVerify = ids.filter(id => {
        if (absentVerificationDisabled) {
            return false
        }
        if (profile.items.has(id)) {
            return false
        }
        const meta = authItemsMeta[id] || {}
        if (authSaysPostRemoved(id, meta)) {
            return false
        }
        if (publiclyInvisibleReason(meta)) {
            return false
        }
        return isCovered(id, profile.coverage)
    })
    const canaryCommentIds = [...profile.items.keys()].filter(id => id.startsWith('t1_')).slice(0, 3)
    // A post page's 429 (verifyFeedPresentPosts) ends this cycle's page
    // checks: the absent items get no verdict, which is no news
    const rateLimited = absentToVerify.length > 0 && (await isRateLimitedNow())
    if (rateLimited) {
        dlog('feed', `[reveddit] ${absentToVerify.length} feed-absent items not verified: rate limited`)
    }
    const absentVerdicts =
        absentToVerify.length && !rateLimited
            ? await verifyFeedAbsentItems(absentToVerify, authItemsMeta, fetchHtml, canaryCommentIds)
            : {}
    if (!absentToVerify.length) {
        // Nothing absent needs a page verdict (or verification is off), so the
        // "can't confirm removals" warning has nothing left to warn about
        await recordAbsentVerifyOutcome(true)
    }
    const results: { data: Record<string, any> }[] = []
    for (const id of ids) {
        const meta = authItemsMeta[id] || {}
        const carried = {
            locked: !!meta.locked,
            ...(meta.created_utc !== undefined && { created_utc: meta.created_utc }),
            // Marks results whose removed/approved status came from the public
            // profile comparison. Quarantined/NSFW/private-sub items are never
            // visible in that view, so their "missing" must not count as removed —
            // the classification loop uses this flag to exempt them.
            _public_view: true,
        }
        const isPost = id.startsWith('t3_')
        // The author's own view is authoritative when it already shows removal.
        const authSaysRemoved = authSaysPostRemoved(id, meta)
        const publicItem = profile.items.get(id)
        if (publicItem) {
            if (!isPost) {
                // Present comment → live (removed comments vanish from the feed).
                results.push({ data: { ...publicItem, ...carried } })
            } else if (authSaysRemoved) {
                // In the public feed but the authenticated view already flags it
                // removed (modqueue/spam grace period). is_robot_indexable:false
                // makes isRemovedPost() fire.
                results.push({ data: { ...publicItem, is_robot_indexable: false, ...carried } })
            } else {
                const verdict = postVerdicts[id]
                if (verdict === 'held' || verdict === 'removed') {
                    // The post's own page shows it held/removed even though it
                    // lingers in the feed and the auth view hasn't caught up.
                    results.push({ data: { ...publicItem, is_robot_indexable: false, ...carried } })
                } else if ((meta.known_removed || (meta.confirming && postsOwed.has(id))) && verdict !== 'live') {
                    // Recorded as removed, or with its removal being counted and
                    // a page read owed, still lingering in the feed, and no page
                    // verdict landed this cycle (no tab, challenge, shell, paced,
                    // past the cycle's reads). Omit: feed presence alone must not
                    // flip a recorded removal back to approved or start a count
                    // over on fetch luck — that oscillates. A real re-approval
                    // flips it once a 'live' page verdict arrives.
                    // Owed, not young as in viewer-lookup.ts: this path also reads a mature post once seen held
                } else {
                    // No removal signal from any source → live. (verdict 'live',
                    // 'unknown', or unfetched: the auth view says not-removed and
                    // it's publicly visible, so treat as live and cache the body.)
                    // A post owed a page read that didn't land, young or once seen
                    // held, may still be held or spam-filtered, so the bridge isn't
                    // told it's publicly live.
                    results.push({
                        data: {
                            ...publicItem,
                            is_robot_indexable: true,
                            ...carried,
                            ...(postsOwed.has(id) && { _public_view_unverified: true }),
                        },
                    })
                }
            }
        } else {
            const covered = isCovered(id, profile.coverage)
            const publiclyInvisible = !!publiclyInvisibleReason(meta)
            // The synthetic removed shape passes isRemovedComment (author+body
            // start with '[') and isRemovedPost (is_robot_indexable === false).
            const syntheticRemoved = {
                data: {
                    name: id,
                    author: '[deleted]',
                    body: '[removed]',
                    is_robot_indexable: false,
                    ...carried,
                },
            }
            if (authSaysRemoved) {
                // The auth view already flags it removed — authoritative. For a
                // post nobody logged out can see, only by removed_by_category
                // (publicViewUncheckedReason).
                results.push(syntheticRemoved)
            } else if (covered && publiclyInvisible) {
                // Never publicly visible, so nothing here can judge it; same
                // synthetic shape as before. Monitoring counts it approved, which
                // also refreshes the body cache, except a removal it already
                // recorded, which stays as recorded (readLookupResult).
                results.push(syntheticRemoved)
            } else if (covered) {
                if (absentVerificationDisabled) {
                    // Remote fallback: pre-verification behavior — absence
                    // within coverage counts as removed, unless the
                    // unverified-is-unknown valve says omit. Not for a kind the
                    // owner hides: nothing of it is listed, so absence says nothing.
                    const hiddenKind = isPost ? profile.hidden?.t3 : profile.hidden?.t1
                    if (!absentUnverifiedIsUnknown && !hiddenKind) results.push(syntheticRemoved)
                } else {
                    const verdict = absentVerdicts[id]
                    if (verdict === 'live') {
                        // Renders on its own page → not removed; it's absent from
                        // the feed because its subreddit is hidden from the profile.
                        results.push({ data: { name: id, author: username, is_robot_indexable: true, ...carried } })
                    } else if (verdict === 'removed' || verdict === 'held') {
                        results.push(syntheticRemoved)
                    }
                    // No verdict ('unknown' or over the per-cycle budget) → omit:
                    // feed absence alone is ambiguous, so neither alert nor reset.
                }
            }
        }
    }
    // The legacy pending-post queue may hold a conflicting verdict from a cycle
    // where the www path failed over to old.reddit — clear our ids from it so
    // the two paths can't alternate verdicts for the same post.
    const t3Requested = ids.filter(id => id.startsWith('t3_'))
    if (t3Requested.length) {
        removeMultipleFromPendingPostQueue(t3Requested).catch(() => {})
    }
    // Counted the way monitoring reads them (readLookupResult): what nobody
    // logged out can see is neither removed nor live, and is named once, in the
    // copied log's header, instead of on every cycle's line
    const unchecked: Record<string, string> = {}
    let removedCount = 0
    for (const { data } of results) {
        const reason = publicViewUncheckedReason(data.name, authItemsMeta[data.name])
        if (reason) {
            unchecked[data.name] = reason
        } else if (isRemovedItem(data as RedditItem)) {
            removedCount++
        }
    }
    await notePublicViewUnchecked(unchecked)
    // Only the page verdicts that aren't 'live' are named. Every item of a
    // profile that hides them is checked on its own page, so the whole map was
    // about 100 ids, 3 KB, on every cycle's line.
    const notLive = Object.fromEntries(Object.entries(absentVerdicts).filter(([, v]) => v !== 'live'))
    const liveCount = Object.keys(absentVerdicts).length - Object.keys(notLive).length
    dlog(
        'feed',
        `[reveddit] www lookup ${username}: ${ids.length} requested, ${results.length} returned ` +
            `(${removedCount} removed, ${Object.keys(unchecked).length} can't be checked logged out, ` +
            `${ids.length - results.length} omitted/uncovered), ` +
            `coverage t1=${profile.coverage.t1} t3=${profile.coverage.t3}, verdicts=${JSON.stringify(postVerdicts)}, ` +
            `absentVerdicts=${JSON.stringify(notLive)}${liveCount ? ` +${liveCount} live` : ''}, ` +
            // routes= names the route that last served each kind of page;
            // "www route for ... is now" lines record any change.
            `routes=${JSON.stringify(fetcher.servedRoutes())}` +
            (profile.paginationStopped ? `, ${profile.paginationStopped}` : ''),
    )
    return results
}

// Primary: compare against the logged-out www.reddit.com profile (survives the
// deprecation). Falls back to the legacy chain while that still exists. With a
// second account connected (viewer.ts), it checks the user's items instead,
// and the logged-out view isn't tried.
export const lookupItemsByID = (
    ids: string | string[],
    auth: any,
    monitor_quarantined = false,
    username = '',
    authItemsMeta: AuthItemsMeta = {},
) => {
    const idsArray = (Array.isArray(ids) ? ids : String(ids).split(',')).filter(x => x)
    const legacy = () => lookupItemsByID_legacy(auth, monitor_quarantined, ids, authItemsMeta)
    if (!idsArray.length) {
        if (username) {
            // None of the user's items left to check: nothing to ask reddit,
            // and a second account's thread reads have nothing left to warn
            // about (recordViewerThreadOutcome). No view checked, so the pass
            // keeps warnings by the usual rule (lookupWarningToKeep).
            viewerCheckedLast.delete(username.toLowerCase())
            return browser.storage.local
                .remove(VIEWER_THREAD_FAILURES_KEY)
                .catch(() => null)
                .then(() => [])
        }
        return legacy()
    }
    if (!username) {
        // "Other" (non-profile) subscriptions: no public profile to diff against.
        // Authenticated api/info is the deprecation-surviving primary; the legacy
        // chain stays as a fallback only while old.reddit/unauth-.json still work.
        return lookupOtherItemsByID_authed(idsArray, auth, monitor_quarantined)
            .then(result => {
                clearRateLimitBackoff()
                return result
            })
            .catch((authedError: Error) => {
                console.log('authenticated api/info lookup failed:', authedError.message)
                // A 429 on monitoring's own lookup enters the shared backoff,
                // and the legacy chain would only send more
                if (noteRateLimited(authedError)) {
                    throw authedError
                }
                return legacy()
            })
    }
    return getViewer().then(viewer => {
        // Signed in to the browser as the second account itself: its view of
        // its own items is the author's, where removals look live. The
        // logged-out view checks them while it can; when it can't, the popup
        // asks for a different second account (isSignedInViewer). When login
        // detection fell back to the cached username, the items' author says
        // who's signed in.
        const signedInAs = [username, ...Object.values(authItemsMeta).map(meta => meta.author || '')]
        if (viewer && signedInAs.some(name => isSignedInViewer(viewer!.name, name))) {
            dlog('feed', '[reveddit] the second account is the one signed in, so the logged-out view checks its items')
            viewer = null
        }
        viewerCheckedLast.set(username.toLowerCase(), !!viewer)
        return viewer
            ? lookupItemsByID_fromViewer(idsArray, username, authItemsMeta, viewer).then(result => {
                  clearRateLimitBackoff()
                  return result
              })
            : lookupItemsByID_publicThenLegacy(idsArray, username, authItemsMeta, legacy)
    })
}

const lookupItemsByID_publicThenLegacy = (
    idsArray: string[],
    username: string,
    authItemsMeta: AuthItemsMeta,
    legacy: () => Promise<any>,
) => {
    return lookupItemsByID_fromPublicProfile(idsArray, username, authItemsMeta)
        .then(result => {
            clearRateLimitBackoff()
            return result
        })
        .catch((publicError: Error) => {
            // A 429 (already in the backoff) ends the lookup: the legacy chain
            // would only send more. So does a login page: the legacy pages are
            // logged out too.
            if (
                publicError.message === PROFILE_PUBLICLY_EMPTY ||
                isRateLimitError(publicError) ||
                isLoginWallMessage(publicError.message)
            ) {
                throw publicError
            }
            console.log('www.reddit.com public profile lookup failed:', publicError.message)
            return legacy().catch((legacyError: any) => {
                // Name both failures. The legacy fallback's alone ("legacy reddit
                // HTML request failed: 403") hid the www failure behind it in
                // issue #27, which was filed about the legacy message.
                throw new Error(
                    `${publicError.message}; legacy fallback: ${String(legacyError?.message || legacyError)}`,
                )
            })
        })
}

// Every tab's scans take turns, so more of them don't mean a faster pace. The turn
// is taken when a read goes out, so its spacing is between real requests.
// Mutable for tests, like _wwwRouteTiming.
export const _scanTurn = { next: 0 }
// Session storage keeps the turn too, so a worker that stops between reads still
// holds the pace. Only the worker uses it (workerSession).
const SCAN_TURN_KEY = 'scan_turn_next'

// 0 once the turn is taken, or how long until it comes. The pace is the user's
// (options), and half that for a while after a 429, mirroring monitoring's own
// gentle resume (computeAbsentVerifyBudget).
const scanTurnIn = async (): Promise<number> => {
    const { gapMs } = await getScanSettings()
    const sinceHit = await getMsSinceLastRateLimitHit().catch(() => null)
    const gap = sinceHit !== null && sinceHit < RECENT_RATE_LIMIT_WINDOW_MS ? gapMs * 2 : gapMs
    const session = workerSession()
    if (!_scanTurn.next && session) {
        const stored: Record<string, any> = await session.get(SCAN_TURN_KEY).catch(() => ({}))
        // Another ask may have taken a turn while this one read
        _scanTurn.next ||= Number(stored[SCAN_TURN_KEY]) || 0
    }
    const now = Date.now()
    // Further off than any gap could put it, the clock went back
    const left = _scanTurn.next - now
    if (left > 0 && left <= 2000 * SCAN_SECONDS_MAX) return left
    _scanTurn.next = now + gap
    session?.set({ [SCAN_TURN_KEY]: _scanTurn.next }).catch(() => {})
    return 0
}

// For a scan the user started (scan-reads.ts). A login reads reddit's feeds at a
// scan's pace, where a logged-out browser gets one a minute (verified 2026-11-04).
// Every scan comes through here, so they share one pace and the backoff that
// monitoring and the bridge honor, whichever tab they run in. Too soon, it answers
// with waitMs: the page waits and asks again, where a cancel can take the read back.
export const readWithLogin = async (path: string, secondTryMode?: unknown) => {
    if ((await getRemoteMechanism(MECHANISM_SCAN_FEEDS)) === 'off') {
        return { ok: false, status: 0, blockPage: true }
    }
    // The sign-in owns the browser's login until it ends (viewer.ts)
    if (await isViewerConnecting()) {
        return { ok: false, status: 0, busy: true }
    }
    if (!(await hasRedditLoginCookie())) {
        return { ok: false, status: 0, needsLogin: true }
    }
    if (await isRateLimitedNow()) {
        return { ok: false, status: 0, resting: true }
    }
    const waitMs = await scanTurnIn()
    if (waitMs > 0) {
        return { ok: false, status: 0, waitMs }
    }
    // A second try's mode comes from the page's message, and only one that
    // skips the browser's cache is taken
    const secondTry = UNCACHED_MODES.find(mode => mode === secondTryMode)
    return withDeadline(WWW_FETCH_TIMEOUT_MS, async signal => {
        const url = `https://www.reddit.com${path}`
        const { response, blockPage, otherMode } = await fetchForScan(url, signal, secondTry)
        // Reddit's logout leaves a short cookie of the login's name, so holding one
        // settles nothing, and no wait helps. Its answers to the login check do. A
        // block page with a second try to come says nothing yet.
        const refused = response.status === 429 || (blockPage && otherMode === undefined)
        if (refused && (await isLoginKeptOut())) {
            return { ok: false, status: 0, needsLogin: true }
        }
        if (response.status === 429) {
            noteRateLimited(new Error('www.reddit.com request failed: 429'))
        }
        return {
            ok: response.ok,
            status: response.status,
            blockPage,
            otherMode,
            text: response.ok ? await response.text() : '',
        }
    })
}
