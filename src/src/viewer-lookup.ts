import { ViewerAccount, fetchJsonAsViewer, installViewerHeaderRule, checkViewerIdentity } from './viewer'
import { dlog, dlogSummary } from './diaglog'
import { fullnameValue } from './parse_html/new'
import { isViewerBlockedItem, isUserDeletedComment, isRemovedItem, setWarningBadge } from './common'
import browser from 'webextension-polyfill'
import {
    www_reddit,
    threadItemOf,
    AuthItemsMeta,
    absentLiveTtl,
    threadItemUrl,
    recordViewerOutcome,
    VIEWER_SIGNED_OUT,
    PROFILE_CONTROL_USER,
    reportPublicProfileShadowban,
    recordAbsentVerifyOutcome,
    recordPaginationOutcome,
    recordWwwDetectOutcome,
    notePublicProfileUnavailable,
    authSaysPostRemoved,
    isYoungPost,
    isCovered,
    publiclyInvisibleReason,
    recordViewerThreadOutcome,
} from './lookup-status'
import { noteRateLimited, readLocal } from './request-gates'

// The second account's view of the user's own items (viewer.ts): what other
// logged-in people see, for when reddit asks for a login before it shows
// profiles. Read through reddit's JSON with that account's login:
// - The user's comments and posts listings, newest first, walked until they
//   reach the oldest item asked about or VIEWER_LISTING_PAGES pages. A listed
//   comment is visible to others. A listed post is too, except a young one or
//   one recorded as removed, which its own thread decides, since held and
//   filtered posts linger in listings.
// - An item missing from the part walked is read on its own thread: reddit
//   leaves out of listings the items in subreddits the user hides from their
//   profile, so missing isn't removed.
// - Older than the part walked, or not read this cycle: no verdict.
// A few thread reads per cycle, verdicts cached, like the public view's page
// checks. Items in NSFW, quarantined and private subreddits follow the public
// view's rules (_public_view), whatever the second account can see.
const VIEWER_VERDICTS_KEY = 'viewer_item_verdicts'

const VIEWER_LISTING_PAGES = 3

const VIEWER_THREAD_READS_PER_CYCLE = 10

const VIEWER_VERDICTS_MAX = 300

export const _viewerTiming = { delayMs: 500 }

type ViewerVerdict = 'live' | 'removed' | 'unknown'

const VIEWER_VERDICT_TTL_MS: Record<ViewerVerdict, number> = {
    live: 6 * 3600 * 1000,
    removed: 2 * 3600 * 1000,
    unknown: 30 * 60 * 1000,
}

interface ViewerListing {
    items: Map<string, any>
    // ids at or above it were walked; 0 when the listing was walked to its end
    floor: number
    status?: number
    error?: string
}

const readViewerListing = async (
    viewer: ViewerAccount,
    username: string,
    tab: 'comments' | 'submitted',
    needed: number[],
): Promise<ViewerListing> => {
    const items = new Map<string, any>()
    let floor = Infinity
    let after = ''
    for (let page = 0; page < VIEWER_LISTING_PAGES; page++) {
        const r = await fetchJsonAsViewer(
            `${www_reddit}user/${encodeURIComponent(username)}/${tab}.json?sort=new&limit=100&raw_json=1` +
                (after ? `&after=${encodeURIComponent(after)}` : ''),
            viewer,
        )
        const children = r.json?.data?.children
        if (!r.ok || !Array.isArray(children)) {
            const error = r.blocked
                ? 'block page'
                : r.ok
                  ? 'unreadable answer'
                  : r.status === 200
                    ? 'a page in place of JSON'
                    : `request failed: ${r.status || 'network'}`
            // A later page failing only ends the walk, as in the logged-out
            // view's pagination: what the pages before it showed still stands,
            // and the floor says how far that reached. A 429 still ends the lookup.
            if (page > 0 && r.status !== 429) {
                dlog('feed', `[reveddit] second account: ${tab} listing stopped after ${page} pages: ${error}`)
                return { items, floor }
            }
            return { items, floor, status: r.status, error }
        }
        for (const child of children) {
            const name = child?.data?.name
            if (typeof name === 'string' && name.startsWith(tab === 'comments' ? 't1_' : 't3_')) {
                items.set(name, child.data)
                floor = Math.min(floor, fullnameValue(name))
            }
        }
        after = String(r.json?.data?.after || '')
        if (!after) {
            return { items, floor: 0 }
        }
        if (!needed.length || Math.min(...needed) >= floor) {
            break
        }
    }
    return { items, floor }
}

// An item's verdict from its thread's JSON as the second account. Another
// account doesn't get a removed comment that has no replies at all: its own
// permalink answers with the post and no comments, where the author's view has
// the comment intact (verified 2026-10-30 on two mod-removed comments). So a
// comment missing there is removed, when the post is the right one and nothing
// else came back in its place, which would mean the permalink's focus didn't take.
const viewerVerdictOf = (id: string, postId: string, json: any): ViewerVerdict => {
    const post = json?.[0]?.data?.children?.[0]?.data
    if (!post || post.name !== `t3_${postId.replace(/^t3_/, '')}`) {
        return 'unknown'
    }
    const data = id.startsWith('t3_') ? post : threadItemOf(json, id)
    if (!data) {
        const comments = json?.[1]?.data?.children
        return Array.isArray(comments) && comments.length === 0 ? 'removed' : 'unknown'
    }
    // The author's block, or the user deleting it since: no verdict
    if (isViewerBlockedItem(data) || (!id.startsWith('t3_') && isUserDeletedComment(data))) {
        return 'unknown'
    }
    if (
        isRemovedItem(data) ||
        (id.startsWith('t3_') && data.removed_by_category && data.removed_by_category !== 'deleted')
    ) {
        return 'removed'
    }
    return 'live'
}

// l: read while the item was listed
const readViewerVerdicts = () =>
    readLocal<Record<string, { v: ViewerVerdict; t: number; l?: 1 }>>(VIEWER_VERDICTS_KEY, {})

// After both listings come back as the edge's block page in both cache modes,
// the second account rests half an hour, as the logged-out view's refused
// routes rest (noteRefusal): every cycle would otherwise send reddit the same
// refused requests from that account. Resting cycles count as failed lookups,
// so the warning stays up. Kept per connected account (its token).
const VIEWER_REST_KEY = 'viewer_rest'

const VIEWER_BLOCK_REST_MS = 30 * 60 * 1000

// Kept as when the rest began, which must be in the past: a rest begun while
// the clock ran ahead then doesn't outlast its half hour once the clock is put
// right
const viewerRestUntil = async (viewer: ViewerAccount): Promise<number> => {
    try {
        const stored: any = await readLocal(VIEWER_REST_KEY, null)
        const began = Number(stored?.t)
        if (began > Date.now()) {
            // Dated ahead by a clock since put right: removed, so it doesn't
            // begin a rest of its own once real time reaches it
            await browser.storage.local.remove(VIEWER_REST_KEY)
            return 0
        }
        return stored?.token === viewer.token && began > 0 ? began + VIEWER_BLOCK_REST_MS : 0
    } catch {
        return 0
    }
}

const restViewer = async (viewer: ViewerAccount) => {
    const t = Date.now()
    await browser.storage.local.set({ [VIEWER_REST_KEY]: { token: viewer.token, t } }).catch(() => null)
    dlog(
        'feed',
        `[reveddit] second account: block pages on both listings; resting until ${new Date(t + VIEWER_BLOCK_REST_MS).toISOString()}`,
    )
}

// Each item through its own thread, as the second account: cached verdicts
// first, then at most VIEWER_THREAD_READS_PER_CYCLE reads in the order given.
// read, resolved (fresh verdicts) and pending (items still without one) are
// for recordViewerThreadOutcome. A 'live' lasts as long as the logged-out
// view's does for a missing item (absentLiveTtl: sooner for young items, when
// removals happen), and ends when an item read live while listed drops out of
// the listing, which is how a removal shows.
const readViewerThreads = async (
    viewer: ViewerAccount,
    ids: string[],
    authItemsMeta: AuthItemsMeta,
    listed: Map<string, any>,
): Promise<{ verdicts: Record<string, ViewerVerdict>; read: number; resolved: number; pending: number }> => {
    const cache = await readViewerVerdicts()
    const verdicts: Record<string, ViewerVerdict> = {}
    const now = Date.now()
    const ttl = (id: string, entry: { v: ViewerVerdict; l?: 1 }) =>
        entry.v !== 'live'
            ? (VIEWER_VERDICT_TTL_MS[entry.v] ?? 0)
            : entry.l && !listed.has(id)
              ? 0
              : absentLiveTtl(authItemsMeta[id]?.created_utc, now)
    const due = ids.filter(id => {
        const entry = cache[id]
        const age = now - Number(entry?.t)
        if (entry && age >= 0 && age < ttl(id, entry)) {
            if (entry.v !== 'unknown') {
                verdicts[id] = entry.v
            }
            return false
        }
        return true
    })
    let read = 0
    let resolved = 0
    let note = ''
    for (const id of due) {
        if (read >= VIEWER_THREAD_READS_PER_CYCLE) {
            break
        }
        const postId = id.startsWith('t3_') ? id : authItemsMeta[id]?.link_id
        if (!postId) {
            continue
        }
        if (read > 0 && _viewerTiming.delayMs > 0) {
            await new Promise(r => setTimeout(r, _viewerTiming.delayMs))
        }
        read++
        const r = await fetchJsonAsViewer(threadItemUrl(id, postId), viewer)
        if (r.status === 429) {
            noteRateLimited(new Error('www.reddit.com request failed: 429'))
            note = ', stopped on a 429'
            // Rate limited isn't refused: no count toward the warning
            read--
            break
        }
        if (r.blocked || (r.status === 200 && !r.ok)) {
            // Paced like an unreadable answer, so the next cycle goes on to
            // the items after this one instead of asking for it again. A page
            // in place of the JSON (a challenge) stops the reads like the block
            // page, since the next would get the same.
            cache[id] = { v: 'unknown', t: Date.now() }
            note = r.blocked ? ', stopped on a block page' : ', stopped on a page in place of JSON'
            break
        }
        const v = viewerVerdictOf(id, postId, r.ok ? r.json : undefined)
        cache[id] = { v, t: Date.now(), ...(listed.has(id) && { l: 1 as const }) }
        if (v !== 'unknown') {
            verdicts[id] = v
            resolved++
        }
    }
    if (read) {
        const kept = Object.entries(cache)
            .filter(([, entry]) => Date.now() - Number(entry?.t) < (VIEWER_VERDICT_TTL_MS[entry?.v] ?? 0))
            .sort((a, b) => b[1].t - a[1].t)
            .slice(0, VIEWER_VERDICTS_MAX)
        await browser.storage.local.set({ [VIEWER_VERDICTS_KEY]: Object.fromEntries(kept) }).catch(() => null)
    }
    const counts = due
        .slice(0, read)
        .map(id => cache[id]?.v)
        .filter(Boolean)
    dlogSummary(
        'verify',
        `[reveddit] second account: ${read} thread reads of ${due.length} due (` +
            (['live', 'removed', 'unknown'] as const)
                .map(v => `${counts.filter(c => c === v).length} ${v}`)
                .join(', ') +
            `)${note}`,
    )
    return { verdicts, read, resolved, pending: ids.filter(id => !verdicts[id]).length }
}

export const lookupItemsByID_fromViewer = async (
    ids: string[],
    username: string,
    authItemsMeta: AuthItemsMeta,
    viewer: ViewerAccount,
) => {
    const rest = await viewerRestUntil(viewer)
    if (rest > Date.now()) {
        const reason = `resting after block pages until ${new Date(rest).toISOString()}`
        await recordViewerOutcome(false, reason)
        throw new Error(`second-account lookup skipped: ${reason}`)
    }
    // Chrome and Edge: the rule carrying its cookies dates from the worker's
    // start, and a cookie may have expired since. Made again, it leaves it out.
    await installViewerHeaderRule()
    // A 429 there enters the shared backoff like any other
    const identity = await checkViewerIdentity(viewer).catch(err => {
        noteRateLimited(err)
        throw err
    })
    if (identity === 'signed_out') {
        dlog('feed', '[reveddit] the second account is signed out; it can be connected again in options')
        setWarningBadge(VIEWER_SIGNED_OUT)
        throw new Error(VIEWER_SIGNED_OUT)
    }
    const needed = (prefix: string) =>
        ids
            .filter(id => id.startsWith(prefix))
            .map(fullnameValue)
            .filter(Number.isFinite)
    const rateLimited = (): never => {
        noteRateLimited(new Error('www.reddit.com request failed: 429'))
        throw new Error('www.reddit.com request failed: 429')
    }
    // A listing no item needs isn't walked: it has nothing to decide, and its
    // failing would stop every check. Both listings missing is the shadowban
    // signature, though, so a walked listing's 404 sends for the other too.
    const unwalked: ViewerListing = { items: new Map(), floor: 0 }
    const walk = (tab: 'comments' | 'submitted') =>
        readViewerListing(viewer, username, tab, needed(tab === 'comments' ? 't1_' : 't3_'))
    let comments = needed('t1_').length ? await walk('comments') : unwalked
    if (comments.status === 429) {
        rateLimited()
    }
    const posts = needed('t3_').length || comments.status === 404 ? await walk('submitted') : unwalked
    if (posts.status === 404 && comments === unwalked) {
        comments = await walk('comments')
    }
    const walked = [comments, posts].filter(listing => listing !== unwalked)
    const failed = walked.filter(listing => listing.error)
    if (failed.some(listing => listing.status === 429)) {
        rateLimited()
    }
    if (failed.length === 2 && failed.every(listing => listing.status === 404) && ids.length) {
        // Both listings missing: logged in or out, the account doesn't exist for
        // others, which is how a sitewide shadowban looks, while a profile known
        // to exist still loads
        const control = await fetchJsonAsViewer(
            `${www_reddit}user/${PROFILE_CONTROL_USER}/comments.json?limit=1`,
            viewer,
        )
        if (control.status === 429) {
            rateLimited()
        }
        if (control.ok) {
            await recordViewerOutcome(true)
            return reportPublicProfileShadowban(username, 'missing (404) to the second account', true)
        }
    }
    if (failed.length) {
        const reason = failed.map(listing => listing.error).join('; ')
        await recordViewerOutcome(false, reason)
        // Refused outright: every listing walked got the block page in both
        // cache modes, or a page in place of the JSON (a challenge)
        if (
            failed.length === walked.length &&
            failed.every(listing => listing.error === 'block page' || listing.error === 'a page in place of JSON')
        ) {
            await restViewer(viewer)
        }
        throw new Error(`second-account lookup failed: ${reason}`)
    }
    await recordViewerOutcome(true)
    // The logged-out view's own warnings outlive a pass until that view
    // recovers; it isn't used while a second account checks, so they end here.
    // So does a missing-profile reading: another account sees the profile. The
    // thread reads below keep their own streak.
    await recordAbsentVerifyOutcome(true)
    await recordPaginationOutcome(undefined)
    await recordWwwDetectOutcome(true)
    await notePublicProfileUnavailable(null)

    // An item the second account gets as [unavailable] (one of the accounts
    // blocked the other) says nothing about how others see it, and would read
    // as removed. It's left to its thread, which can't decide it either, so it
    // gets no verdict, and cycles of nothing else count toward the warning.
    const all = [...comments.items, ...posts.items]
    const listed = new Map(all.filter(([, item]) => !isViewerBlockedItem(item)))
    if (listed.size < all.length) {
        dlog('feed', `[reveddit] second account: ${all.length - listed.size} listed items read [unavailable] (a block)`)
    }
    const meta = (id: string) => authItemsMeta[id] || {}
    const covered = (id: string) => isCovered(id, comments.floor, posts.floor)
    const authSaysRemoved = (id: string) => authSaysPostRemoved(id, meta(id))
    const young = (id: string) => isYoungPost(meta(id))
    const listedRemoved = (id: string, item: any) =>
        isRemovedItem(item) ||
        (id.startsWith('t3_') && !!item.removed_by_category && item.removed_by_category !== 'deleted')
    // Missing items first, each a possible removal; then listed posts a
    // listing can't clear
    const threads = await readViewerThreads(
        viewer,
        [
            ...ids.filter(
                id => !listed.has(id) && covered(id) && !authSaysRemoved(id) && !publiclyInvisibleReason(meta(id)),
            ),
            ...ids.filter(
                id =>
                    id.startsWith('t3_') &&
                    listed.has(id) &&
                    !authSaysRemoved(id) &&
                    !listedRemoved(id, listed.get(id)) &&
                    (young(id) || meta(id).known_removed),
            ),
        ],
        authItemsMeta,
        listed,
    )
    await recordViewerThreadOutcome(viewer, threads.read, threads.resolved, threads.pending)
    const verdicts = threads.verdicts
    const results: { data: Record<string, any> }[] = []
    for (const id of ids) {
        const m = meta(id)
        // As the public view marks its results (lookupItemsByID_fromPublicProfile)
        const carried = {
            locked: !!m.locked,
            ...(m.created_utc !== undefined && { created_utc: m.created_utc }),
            _public_view: true,
        }
        const syntheticRemoved = {
            data: { name: id, author: '[deleted]', body: '[removed]', is_robot_indexable: false, ...carried },
        }
        const item = listed.get(id)
        const verdict = verdicts[id]
        if (authSaysRemoved(id) || (item && listedRemoved(id, item)) || verdict === 'removed') {
            results.push(syntheticRemoved)
        } else if (item) {
            if (!id.startsWith('t3_') || verdict === 'live') {
                results.push({ data: { ...item, ...carried } })
            } else if (!m.known_removed) {
                // No thread verdict yet: listed, so visible, but a young post
                // may still be held, so the bridge isn't told it's publicly live
                results.push({
                    data: {
                        ...item,
                        is_robot_indexable: true,
                        ...carried,
                        ...(young(id) && { _public_view_unverified: true }),
                    },
                })
            }
            // Recorded removed, still listed, no thread verdict: no news, so a
            // listing alone never flips a recorded removal back
        } else if (covered(id) && publiclyInvisibleReason(m)) {
            // Monitoring reads these as unchecked, as for the public view
            results.push(syntheticRemoved)
        } else if (covered(id) && verdict === 'live') {
            results.push({ data: { name: id, author: username, is_robot_indexable: true, ...carried } })
        }
        // Not read this cycle, unreadable, or older than the part walked: no news
    }
    dlog(
        'feed',
        `[reveddit] second-account lookup: ${ids.length} requested, ${results.length} returned, ` +
            `${listed.size} listed (floor t1 ${comments.floor}, t3 ${posts.floor})`,
    )
    return results
}
