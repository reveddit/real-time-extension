import { isViewerBlockedItem, VIEWER_BLOCKED } from './common'
import {
    COULD_NOT_READ,
    type ProgressCallback,
    RateLimiter,
    ScanReads,
    authorFeedPath,
    commentFeedPath,
    lookupCommentsByIds,
    monitoringBackoffGate,
    parseFeed,
    scanFailure,
} from './scan-reads'
import {
    type CommentTreeNode,
    extractCommentTree_newReddit,
    extractCommentTree_oldReddit,
    getCandidateAuthors,
    validAuthor,
} from './comment-tree'

export interface RestoreResult {
    found: boolean
    author?: string
    body?: string
    body_html?: string
    // Per-comment scan batching: exhausted = every visible author has now been
    // searched (so the button can be disabled); remaining = what's still to check
    // after this batch (shown as "scan-rev (N)").
    exhausted?: boolean
    remaining?: number
    // Comments on the page that need another sort, so a person's feed read here
    // says nothing about them and their buttons stay
    otherSorts?: boolean
    // Nothing is left for a thread scan: it reads this sort, or none need its own
    threadScanDone?: boolean
}
// The most a thread's feed holds, the post included, whatever a request asks for
const THREAD_FEED_LIMIT = 500
const ONE_MONTH_SECONDS = 30 * 60 * 60 * 24
const FIVE_MONTHS_SECONDS = 5 * ONE_MONTH_SECONDS
const ONE_YEAR_SECONDS = 365 * 60 * 60 * 24

// --- Which sort finds an old comment ---

const someNeedOtherSorts = (tree: Map<string, CommentTreeNode>, sort: string, t: string): boolean =>
    Array.from(tree.values()).some(({ created_utc }) => {
        const other = getUserPageSort(created_utc)
        return created_utc > 0 && (other.sort !== sort || other.t !== t)
    })

function getUserPageSort(created_utc: number): { sort: string; t: string } {
    const age = Math.floor(Date.now() / 1000) - created_utc
    let sort = 'new'
    let t = ''

    if (age > FIVE_MONTHS_SECONDS) {
        sort = 'controversial'
        if (age < ONE_YEAR_SECONDS) t = 'year'
    }

    return { sort, t }
}

const threadScanSort = (postCreatedUtc: number) => getUserPageSort(postCreatedUtc || Math.floor(Date.now() / 1000))

// --- The thread being scanned ---

// The feed has the thread's comments and says which are gone. The page has who
// replied to whom, for the comments it shows.
async function readThread(threadPostId: string, subreddit: string, isNewReddit: boolean, reads: ScanReads) {
    const shortId = threadPostId.replace(/^t3_/, '')
    const items = await reads.needed(
        `/r/${encodeURIComponent(subreddit)}/comments/${shortId}/.rss?limit=${THREAD_FEED_LIMIT}`,
        text => {
            const read = parseFeed(text)
            if (!read.some(item => item.kind === 't3')) throw new Error('thread feed unreadable (no post)')
            return read
        },
    )
    const post = items.find(item => item.kind === 't3')!.data
    const tree = isNewReddit ? extractCommentTree_newReddit(threadPostId) : extractCommentTree_oldReddit(threadPostId)
    for (const { kind, data } of items) {
        if (kind !== 't1') continue
        const { name: id, author, body, created_utc } = data
        const shown = tree.get(id)
        // Gone in either view is gone, as a page can be older than the feed. But
        // a mask in either view means someone blocked the viewer, and it's live.
        if (!shown) tree.set(id, { id, author, body, created_utc, parent_id: '', link_id: threadPostId, children: [] })
        else if (isViewerBlockedItem(data) || shown.author === VIEWER_BLOCKED) shown.author = VIEWER_BLOCKED
        else if (!validAuthor(author)) shown.author = author
    }
    return { tree, postAuthor: post.author as string, postCreatedUtc: post.created_utc as number }
}

// The thread, or undefined once it has said why there's none
async function openThread(
    threadPostId: string,
    subreddit: string,
    isNewReddit: boolean,
    reads: ScanReads,
    onProgress: ProgressCallback,
    cancelled: string,
) {
    try {
        const thread = await readThread(threadPostId, subreddit, isNewReddit, reads)
        // Reading the page now would read the next one
        if (!reads.stopped) return thread
    } catch (err: any) {
        if (!reads.stopped) {
            onProgress({ status: 'error', message: scanFailure(err, 'Could not load comment tree.') })
            return undefined
        }
    }
    onProgress({ status: 'cancelled', message: cancelled })
    return undefined
}

// Comments a scan put on this page and needn't look for again. A live one placed
// for context stays, but one placed without its text still needs it.
const placedOnPage = () =>
    new Set(
        Array.from(
            document.querySelectorAll('[data-rev-id]:not(.rev-placeholder)'),
            el => el.getAttribute('data-rev-id')!,
        ),
    )

// Those that are removed comments it recovered
const recoveredEls = () => document.querySelectorAll('[data-rev-id]:not(.rev-placeholder):not(.rev-context)')
export const recoveredOnPage = () => recoveredEls().length

const toRecovered = (
    d: any,
    tree: Map<string, CommentTreeNode>,
    threadPostId: string,
    subreddit: string,
): RecoveredComment => ({
    id: d.name,
    parent_id: d.parent_id || tree.get(d.name)?.parent_id || threadPostId,
    link_id: d.link_id,
    author: d.author,
    body: d.body || '',
    body_html: d.body_html || '',
    created_utc: d.created_utc || 0,
    permalink: d.permalink || '',
    subreddit: d.subreddit || subreddit,
})

// --- Main Restore Function ---

// Callback for comments found on author pages that aren't the target but belong
// to this thread and are removed — the UI fills tombstones or inserts them.
type OtherFoundCallback = (comment: RecoveredComment) => void

export async function restoreComment(
    targetCommentId: string,
    threadPostId: string,
    subreddit: string,
    isNewReddit: boolean,
    onProgress: ProgressCallback,
    pageReads?: Map<string, any[]>,
    onOtherFound?: OtherFoundCallback,
    limiter: RateLimiter = new RateLimiter(),
): Promise<RestoreResult> {
    if (!(await monitoringBackoffGate(onProgress))) {
        return { found: false }
    }

    const reads = await ScanReads.forClick(limiter, pageReads)
    const thread = await openThread(threadPostId, subreddit, isNewReddit, reads, onProgress, 'Search cancelled.')
    if (!thread) return { found: false }

    const { tree: treeMap, postAuthor, postCreatedUtc } = thread
    const { candidateAuthors, visibleRealIds, tombstoneIds } = summarizeThreadTree(treeMap)

    // Track which comments we've already resolved (across clicks) so we don't
    // report them again.
    const alreadyResolved = placedOnPage()

    // Search EVERY visible author, nearest-first for the target. We usually
    // find it in a few fetches and stop early, but only conclude "not found"
    // once ALL visible authors are exhausted.
    const proximityOrdered = getCandidateAuthors(targetCommentId, treeMap, postAuthor)
    const seenAuthors = new Set(proximityOrdered)
    const candidates = proximityOrdered.concat(candidateAuthors.filter(a => !seenAuthors.has(a)))

    if (candidates.length === 0) {
        onProgress({
            status: 'not_found',
            message: 'No candidate authors found to search.',
        })
        return { found: false, exhausted: true, remaining: 0 }
    }

    const target = treeMap.get(targetCommentId)
    if (!target) {
        onProgress({
            status: 'error',
            message: 'Target comment not found in tree.',
        })
        return { found: false }
    }

    const { sort, t } = getUserPageSort(target.created_utc)
    let targetResult: RestoreResult | null = null

    // Cross-check an author's feed against this thread. Three cases:
    //   1. Tombstone on the page: its removal and its place are known.
    //   2. Target comment: save as the result.
    //   3. Anything else that isn't live here might be a removed comment with no
    //      replies, or one the thread's feed cut off. Its own feed tells.
    const pendingVerify: any[] = []
    // Enough of the click stays for those, up to half
    const heldBack = () =>
        Math.min(pendingVerify.filter(d => !reads.has(commentFeedPath(d))).length, Math.floor(reads.budget / 2))

    const crossCheck = (items: any[]) => {
        for (const item of items) {
            const d = item?.data
            if (!d || item.kind !== 't1') continue
            if (d.link_id !== threadPostId) continue
            if (alreadyResolved.has(d.name) || visibleRealIds.has(d.name)) continue

            if (d.name === targetCommentId) {
                alreadyResolved.add(d.name)
                targetResult = {
                    found: true,
                    author: d.author,
                    body: d.body,
                    body_html: d.body_html,
                }
            } else if (tombstoneIds.has(d.name) && treeMap.get(d.name)?.parent_id) {
                alreadyResolved.add(d.name)
                onOtherFound?.(toRecovered(d, treeMap, threadPostId, subreddit))
            } else {
                pendingVerify.push(d)
            }
        }
    }

    for (let i = 0; i < candidates.length && !targetResult && !reads.stopped; i++) {
        const author = candidates[i]
        const path = authorFeedPath(author, sort, t)
        if (!reads.canRead(path, heldBack())) {
            reads.unread++
            continue
        }

        onProgress({
            status: 'searching',
            message: `Searching u/${author}…`,
        })

        const items = await reads.feed(path)
        if (items) crossCheck(items)
    }

    // Verify the rest through their own feeds before reporting them: a live
    // comment the thread's feed cut off stays out, and the feed names the parent.
    // The answer isn't held up for this: they keep for the next click.
    if (!targetResult && !reads.stopped) {
        const unverified = pendingVerify.filter(d => !alreadyResolved.has(d.name))
        const looked = await lookupCommentsByIds(unverified, reads)
        for (const d of unverified) {
            const info = looked.get(d.name)
            if (!info?.removed) continue
            alreadyResolved.add(d.name)
            onOtherFound?.(toRecovered({ ...d, parent_id: info.parent_id }, treeMap, threadPostId, subreddit))
        }
    }

    if (targetResult) {
        const r = targetResult as RestoreResult
        onProgress({
            status: 'found',
            message: `Found comment by u/${r.author}`,
        })
        return r
    }

    if (limiter.isCancelled()) {
        onProgress({
            status: 'cancelled',
            message: 'Search cancelled.',
        })
        return { found: false }
    }

    if (reads.failure) {
        // Not "searched all": something wasn't read, and the buttons stay
        onProgress({
            status: 'error',
            message: scanFailure(reads.failure, COULD_NOT_READ),
        })
        return { found: false }
    }

    const remaining = reads.unread
    const { retrying, stuck } = reads.settle()
    const couldntRead = `Not found — ${reads.gaveUp} feed(s) couldn't be read.`
    onProgress({
        status: stuck ? 'noted' : 'not_found',
        message: remaining
            ? `No match yet — ${remaining} left to check; click again to continue.`
            : retrying
              ? `${couldntRead} Click again to try them.`
              : stuck
                ? couldntRead
                : `Not found — searched all ${candidates.length} visible author(s).`,
    })
    const left = remaining + retrying
    const otherSorts = someNeedOtherSorts(treeMap, sort, t)
    const threadSort = threadScanSort(postCreatedUtc)
    return {
        found: false,
        exhausted: left === 0 && !stuck,
        remaining: left,
        otherSorts,
        threadScanDone: !otherSorts || (threadSort.sort === sort && threadSort.t === t),
    }
}

// --- Thread Scan (find removed comments by searching visible authors) ---
//
// Removed comments are NOT enumerable from a thread: reddit shows no tombstone
// for a removed leaf, and even the thread JSON omits them entirely (a thread can
// report num_comments=16 yet return one comment with no "load more" placeholder).
// The only way to recover them is to take each author who IS visible in the
// thread and look through their feed (which keeps removed bodies) for comments
// whose link_id is this thread but which aren't shown here. A removed comment is
// therefore only recoverable if its author also has a visible comment in the
// thread. We bound the search by num_comments (stop once everything missing is
// found) and by what one click may send, and report each recovery through
// onComment so the UI can place it live.

export interface RecoveredComment {
    id: string
    parent_id: string
    link_id: string
    author: string
    body: string
    body_html: string
    created_utc: number
    permalink: string
    subreddit: string
    // Absent: a removed comment, with its text (red). 'context' = a live comment
    // that was just not loaded here, reconstructed to bridge an unattached comment
    // into the tree (muted). 'placeholder' = a removed comment bridging the same
    // way, whose text isn't known yet.
    kind?: 'context' | 'placeholder'
}

type RecoveredCommentCallback = (c: RecoveredComment) => void

function summarizeThreadTree(map: Map<string, CommentTreeNode>): {
    candidateAuthors: string[]
    visibleRealIds: Set<string>
    tombstoneIds: Set<string>
} {
    const authors: string[] = []
    const seenAuthor = new Set<string>()
    const visibleRealIds = new Set<string>()
    const tombstoneIds = new Set<string>()
    for (const node of map.values()) {
        // A tombstone has no author, or one in brackets, in every view, whatever
        // its text. AutoModerator is live but has no feed worth reading, and so
        // is someone who blocked the viewer, in brackets though they are.
        if (isViewerBlockedItem(node) || (node.author && node.author[0] !== '[')) {
            visibleRealIds.add(node.id)
            if (validAuthor(node.author) && !seenAuthor.has(node.author)) {
                seenAuthor.add(node.author)
                authors.push(node.author)
            }
        } else {
            // A removed comment that IS present in the view (has a tombstone)
            tombstoneIds.add(node.id)
        }
    }
    return { candidateAuthors: authors, visibleRealIds, tombstoneIds }
}

const countHolder = (isNewReddit: boolean) =>
    document.querySelector(
        isNewReddit
            ? 'shreddit-post'
            : '#siteTable .thing[data-comments-count], .linklisting .thing[data-comments-count]',
    )

// null when the page doesn't say
function getNumComments(isNewReddit: boolean): number | null {
    const holder = countHolder(isNewReddit)
    const count = holder?.getAttribute(isNewReddit ? 'comment-count' : 'data-comments-count')
    const parsed = parseInt(count ?? '', 10)
    return Number.isNaN(parsed) ? null : parsed
}

// The count is as old as its element, which isn't the document's age: reddit moves
// between pages in one document, and Back brings an old element back. So the element
// keeps the time it was first seen, set as a page arrives.
export const noteCountSeen = (isNewReddit: boolean, at: number) => {
    const holder = countHolder(isNewReddit)
    if (!holder?.hasAttribute('data-rev-seen')) {
        holder?.setAttribute('data-rev-seen', String(Math.floor(at / 1000)))
    }
}

export async function scanThreadForRemovedComments(
    threadPostId: string,
    subreddit: string,
    isNewReddit: boolean,
    pageReads: Map<string, any[]>,
    onProgress: ProgressCallback,
    onComment?: RecoveredCommentCallback,
    limiter: RateLimiter = new RateLimiter(),
): Promise<RecoveredComment[]> {
    if (!(await monitoringBackoffGate(onProgress))) {
        return []
    }
    const reads = await ScanReads.forClick(limiter, pageReads)
    const cancelled = `Scan cancelled. ${recoveredOnPage()} recovered.`
    const thread = await openThread(threadPostId, subreddit, isNewReddit, reads, onProgress, cancelled)
    if (!thread) return []

    const { tree, postAuthor, postCreatedUtc } = thread
    const { candidateAuthors, visibleRealIds, tombstoneIds } = summarizeThreadTree(tree)

    // num_comments includes removed comments, so (total − visible) is how many
    // are missing. If nothing's missing there's nothing to scan for. A page
    // that doesn't give the count can't say that. A comment posted since the
    // count was shown isn't in it. With no time kept, the document's errs toward
    // reading more. Past what the feed holds, the post being one of those, the rest
    // are only out of reach, so a count that big doesn't say what's missing either.
    const count = getNumComments(isNewReddit)
    const total = count !== null && count >= THREAD_FEED_LIMIT ? null : count
    const seenAt = Number(countHolder(isNewReddit)?.getAttribute('data-rev-seen')) || performance.timeOrigin / 1000
    const inCount = Array.from(visibleRealIds).filter(id => tree.get(id)!.created_utc <= seenAt)
    // A tombstone posted since is missing on top of what the count has
    const late = Array.from(tombstoneIds).filter(id => tree.get(id)!.created_utc > seenAt).length
    const missingCount = total === null ? Infinity : Math.max(tombstoneIds.size - late, total - inCount.length) + late
    const counted = Number.isFinite(missingCount)
    if (missingCount === 0) {
        onProgress({
            status: 'not_found',
            message: 'All comments are visible — nothing removed.',
            nothingMissing: true,
        })
        return []
    }

    // Candidates: every distinct valid author visible in the thread, plus the OP.
    const candidates = [...candidateAuthors]
    if (validAuthor(postAuthor) && !candidates.includes(postAuthor)) candidates.push(postAuthor)

    if (candidates.length === 0) {
        onProgress({
            status: 'not_found',
            message: `${counted ? `${missingCount} comment(s) removed, but no` : 'No'} visible authors to search.`,
        })
        return []
    }

    const { sort, t } = threadScanSort(postCreatedUtc)
    const recovered: RecoveredComment[] = []
    const recoveredIds = placedOnPage()
    const alreadyRecovered = recoveredOnPage()
    const recoveredCount = () => recovered.length + alreadyRecovered
    // Those that answer for what's missing: one posted since doesn't stand in for
    // one the count has, unless it's a tombstone, which was added to what's missing
    const answersMissing = (id: string, created_utc: number) => created_utc <= seenAt || tombstoneIds.has(id)
    const alreadyInCount = Array.from(recoveredEls()).filter(el =>
        answersMissing(el.getAttribute('data-rev-id')!, Number(el.getAttribute('data-rev-created'))),
    ).length
    const recoveredInCount = () => alreadyInCount + recovered.filter(rc => answersMissing(rc.id, rc.created_utc)).length
    let searched = 0

    const recordRecovery = (d: any) => {
        const rc = toRecovered(d, tree, threadPostId, subreddit)
        recovered.push(rc)
        recoveredIds.add(rc.id)
        onComment?.(rc)
    }

    for (const author of candidates) {
        if (recoveredInCount() >= missingCount || reads.stopped) break // found everything that's missing

        const path = authorFeedPath(author, sort, t)
        if (!reads.canRead(path)) {
            reads.unread++
            continue
        }

        searched++
        onProgress({
            status: 'searching',
            message: `Searching u/${author}… — ${candidates.length - searched} author(s) left, ${recoveredCount()}${counted ? `/${missingCount}` : ''} recovered`,
        })

        const items = await reads.feed(path)
        if (!items) continue

        // This author's comments in this thread that aren't live here. A tombstone
        // on the page confirms removal. Anything else needs its own feed to say:
        // it may be live, and only cut off from the thread's feed.
        const threadComments = items.filter(i => i?.data && i.kind === 't1' && i.data.link_id === threadPostId)
        console.log(`[reveddit scan] u/${author}: ${items.length} items, ${threadComments.length} in this thread`)
        const uncertain: any[] = []
        for (const item of threadComments) {
            const d = item.data
            if (visibleRealIds.has(d.name) || recoveredIds.has(d.name)) continue
            if (tombstoneIds.has(d.name) && tree.get(d.name)?.parent_id) {
                recordRecovery(d)
            } else {
                uncertain.push(d)
            }
        }
        if (uncertain.length) {
            const looked = await lookupCommentsByIds(uncertain, reads)
            for (const d of uncertain) {
                const info = looked.get(d.name)
                if (info?.removed) recordRecovery({ ...d, parent_id: info.parent_id })
            }
        }
    }

    if (limiter.isCancelled()) {
        onProgress({ status: 'cancelled', message: `Scan cancelled. ${recoveredCount()} recovered.` })
        return recovered
    }
    if (reads.failure) {
        const why = scanFailure(reads.failure, COULD_NOT_READ)
        onProgress({ status: 'error', message: `${why} ${recoveredCount()} recovered.` })
        return recovered
    }
    // With nothing missing any more, what it couldn't read has nothing to give
    const stillMissing = recoveredInCount() < missingCount
    if (reads.unread > 0 && stillMissing) {
        const message = `${recoveredCount()} recovered so far, ${reads.unread} left to check. Click again to continue.`
        onProgress({ status: 'partial', message })
        return recovered
    }
    if (reads.gaveUp && stillMissing) {
        const { retrying } = reads.settle()
        const next = retrying ? ' Click again to try them.' : ''
        const message = `${recoveredCount()} recovered. ${reads.gaveUp} feed(s) couldn't be read.${next}`
        onProgress({ status: retrying ? 'partial' : 'noted', message })
        return recovered
    }
    onProgress({
        status: recovered.length > 0 ? 'found' : 'not_found',
        message:
            `Scan complete: ${recoveredCount()} recovered` +
            (counted && stillMissing ? ` (${missingCount - recoveredInCount()} not found)` : ''),
        otherSorts: stillMissing && someNeedOtherSorts(tree, sort, t),
        nothingMissing: !stillMissing,
    })

    return recovered
}
