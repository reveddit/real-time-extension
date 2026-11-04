import { isRemovedPost } from './common'
import { RECENT_RATE_LIMIT_WINDOW_MS } from './requests'
import { recordRateLimitHit, getMsSinceLastRateLimitHit, getRateLimitBackoffRemainingMs } from './storage'
import browser from 'webextension-polyfill'

// --- Interfaces ---

export interface CommentTreeNode {
    id: string // fullname e.g. "t1_abc123"
    author: string
    parent_id: string // e.g. "t1_xyz" or "t3_postid"
    body?: string
    created_utc: number
    link_id: string // thread fullname e.g. "t3_postid"
    children: CommentTreeNode[]
}

export interface RestoreResult {
    found: boolean
    author?: string
    body?: string
    body_html?: string
    sourceAuthor?: string
    // Per-comment scan batching: exhausted = every visible author has now been
    // searched (so the button can be disabled); remaining = visible authors still
    // unsearched after this batch (shown as "scan-rev (N)").
    exhausted?: boolean
    remaining?: number
}

export interface RestoreProgress {
    current: number
    total: number
    currentAuthor: string
    status: 'searching' | 'found' | 'not_found' | 'cancelled' | 'rate_limited' | 'error'
    message: string
}

export type ProgressCallback = (progress: RestoreProgress) => void

export interface ScanResult {
    id: string
    type: 'comment' | 'post'
    subreddit: string
    body?: string
    body_html?: string
    title?: string
    link_title?: string
    created_utc: number
    score?: number
    permalink: string
    parent_id?: string
    link_id?: string
}

export interface ProfileScanOptions {
    sort?: string
    t?: string
    after?: string
    before?: string
}

// --- Constants ---

const RESTORE_DELAY_MS = 1500
const MAX_RESTORE_LOOKUPS = 20
const ONE_MONTH_SECONDS = 30 * 60 * 60 * 24
const FIVE_MONTHS_SECONDS = 5 * ONE_MONTH_SECONDS
const ONE_YEAR_SECONDS = 365 * 60 * 60 * 24
const RATE_LIMIT_KEY = 'restore_rate_limit_until'

// --- Rate Limiter ---

export class RateLimiter {
    private delayMs: number
    private cancelled = false
    private lastFetchTime = 0

    constructor(delayMs: number = RESTORE_DELAY_MS) {
        this.delayMs = delayMs
    }

    cancel() {
        this.cancelled = true
    }

    isCancelled() {
        return this.cancelled
    }

    async schedule<T>(fn: () => Promise<T>): Promise<T> {
        if (this.cancelled) throw new Error('Cancelled')
        const now = Date.now()
        const elapsed = now - this.lastFetchTime
        if (elapsed < this.delayMs && this.lastFetchTime > 0) {
            await new Promise(r => setTimeout(r, this.delayMs - elapsed))
        }
        if (this.cancelled) throw new Error('Cancelled')
        this.lastFetchTime = Date.now()
        return fn()
    }
}

// --- Author validity ---

const invalidAuthors = new Set(['[deleted]', '[removed]', 'AutoModerator', ''])

function validAuthor(author: string | undefined | null): author is string {
    if (!author) return false
    return !invalidAuthors.has(author) && author[0] !== '['
}

// --- Comment Tree Extraction ---

// Old-reddit removed/deleted comments render as tombstones with no
// data-fullname and no data-author, but their data-permalink still ends with
// the base36 comment id, e.g.
//   /r/sub/comments/<postid>/<slug>/<commentid>/  ->  t1_<commentid>
// Recover the fullname from there so removed comments aren't silently skipped.
export function commentFullnameFromPermalink(permalink: string | null | undefined): string {
    if (!permalink) return ''
    const m = permalink.replace(/\/+$/, '').match(/\/comments\/[a-z0-9]+\/[^/]+\/([a-z0-9]+)$/i)
    return m ? 't1_' + m[1] : ''
}

function linkChildren(map: Map<string, CommentTreeNode>) {
    for (const node of map.values()) {
        map.get(node.parent_id)?.children.push(node)
    }
}

export function extractCommentTree_oldReddit(
    postFullname: string,
    root: ParentNode = document,
): Map<string, CommentTreeNode> {
    const map = new Map<string, CommentTreeNode>()
    const commentEls = root.querySelectorAll('.commentarea .thing.comment')

    for (const el of Array.from(commentEls)) {
        const id = el.getAttribute('data-fullname') || commentFullnameFromPermalink(el.getAttribute('data-permalink'))
        const author = el.getAttribute('data-author') || ''
        if (!id) continue

        const parentEl = el.parentElement?.closest('.thing.comment')
        const parent_id =
            parentEl?.getAttribute('data-fullname') ||
            commentFullnameFromPermalink(parentEl?.getAttribute('data-permalink')) ||
            postFullname

        const bodyEl = el.querySelector(':scope > .entry .usertext-body .md')
        const body = bodyEl?.textContent?.trim() || ''

        const timeEl = el.querySelector(':scope > .entry .tagline time')
        const datetime = timeEl?.getAttribute('datetime')
        const created_utc = datetime ? Math.floor(new Date(datetime).getTime() / 1000) : 0

        const node: CommentTreeNode = {
            id,
            author,
            parent_id,
            body,
            created_utc,
            link_id: postFullname,
            children: [],
        }
        map.set(id, node)
    }

    linkChildren(map)

    return map
}

// The comments new reddit's page shows, with who replied to whom. A comment at
// the top of the thread has no parentid.
export function extractCommentTree_newReddit(
    postFullname: string,
    root: ParentNode = document,
): Map<string, CommentTreeNode> {
    const map = new Map<string, CommentTreeNode>()
    for (const el of Array.from(root.querySelectorAll('shreddit-comment[thingid]'))) {
        const id = el.getAttribute('thingid') as string
        map.set(id, {
            id,
            author: el.getAttribute('author') || '',
            parent_id: el.getAttribute('parentid') || postFullname,
            created_utc: Math.floor(Date.parse(el.getAttribute('created') || '') / 1000) || 0,
            link_id: postFullname,
            children: [],
        })
    }
    linkChildren(map)
    return map
}

export function extractCommentTree_fromJSON(jsonData: any[]): {
    map: Map<string, CommentTreeNode>
    postAuthor: string
} {
    const map = new Map<string, CommentTreeNode>()
    let postAuthor = ''

    if (jsonData.length >= 1 && jsonData[0]?.data?.children?.[0]?.data) {
        postAuthor = jsonData[0].data.children[0].data.author || ''
    }

    if (jsonData.length >= 2 && jsonData[1]?.data?.children) {
        parseCommentListing(jsonData[1].data.children, map)
    }

    linkChildren(map)

    return { map, postAuthor }
}

function parseCommentListing(children: any[], map: Map<string, CommentTreeNode>) {
    for (const child of children) {
        if (child.kind !== 't1') continue
        const d = child.data
        const node: CommentTreeNode = {
            id: d.name,
            author: d.author || '',
            parent_id: d.parent_id || '',
            body: d.body || '',
            created_utc: d.created_utc || 0,
            link_id: d.link_id || '',
            children: [],
        }
        map.set(node.id, node)

        if (d.replies?.data?.children) {
            parseCommentListing(d.replies.data.children, map)
        }
    }
}

// --- Candidate Author Ordering ---

export function getCandidateAuthors(
    targetId: string,
    treeMap: Map<string, CommentTreeNode>,
    postAuthor: string,
    maxAuthors: number = MAX_RESTORE_LOOKUPS,
): string[] {
    const target = treeMap.get(targetId)
    if (!target) return []

    const seen = new Set<string>()
    const result: string[] = []

    const tryAdd = (node: CommentTreeNode | undefined) => {
        if (!node || !validAuthor(node.author) || seen.has(node.author)) return
        seen.add(node.author)
        result.push(node.author)
    }

    const tryAddAuthor = (author: string | undefined) => {
        if (!validAuthor(author) || seen.has(author)) return
        seen.add(author)
        result.push(author)
    }

    const getAncestor = (n: number): CommentTreeNode | undefined => {
        let current: CommentTreeNode | undefined = target
        for (let i = 0; i < n; i++) {
            if (!current?.parent_id?.startsWith('t1_')) return undefined
            current = treeMap.get(current.parent_id)
            if (!current) return undefined
        }
        return current
    }

    const getDescendant = (node: CommentTreeNode, n: number): CommentTreeNode | undefined => {
        let current: CommentTreeNode | undefined = node
        for (let i = 0; i < n; i++) {
            if (!current?.children?.length) return undefined
            current = current.children[0]
        }
        return current
    }

    // 1. Grandparent (2 up)
    tryAdd(getAncestor(2))

    // 2. Grandchild (2 down)
    tryAdd(getDescendant(target, 2))

    // 3. Thread OP
    tryAddAuthor(postAuthor)

    // 4-6. Paired ancestor/descendant expanding outward (3,4,5...)
    for (let dist = 3; result.length < maxAuthors; dist++) {
        const ancestor = getAncestor(dist)
        const descendant = getDescendant(target, dist)
        if (!ancestor && !descendant) break
        tryAdd(ancestor)
        tryAdd(descendant)
    }

    // 7. Parent (1 up) — last in tree traversal
    tryAdd(getAncestor(1))

    // 8. Siblings / cousins (other children of same parent)
    const parentNode = treeMap.get(target.parent_id)
    if (parentNode) {
        for (const sibling of parentNode.children) {
            if (sibling.id === targetId) continue
            tryAdd(sibling)
            if (result.length >= maxAuthors) break
        }
    }

    // 9. Nearby by timestamp, fanning out ±1, ±2, ...
    const sortedByTime = Array.from(treeMap.values())
        .filter(c => c.id.startsWith('t1_'))
        .sort((a, b) => a.created_utc - b.created_utc)

    if (sortedByTime.length > 1) {
        const targetIndex = sortedByTime.findIndex(c => c.id === targetId)
        if (targetIndex >= 0) {
            let offset = 1
            while (result.length < maxAuthors) {
                const before = sortedByTime[targetIndex - offset]
                const after = sortedByTime[targetIndex + offset]
                if (!before && !after) break
                tryAdd(before)
                if (result.length < maxAuthors) tryAdd(after)
                offset++
            }
        }
    }

    return result
}

// --- Which sort finds an old comment ---

function getUserPageSort(
    created_utc: number,
    score: number = 1,
    controversiality: number = 0,
): { sort: string; t: string } {
    const age = Math.floor(Date.now() / 1000) - created_utc
    let sort = 'new'
    let t = ''

    if (age > FIVE_MONTHS_SECONDS) {
        if (score < 2 || controversiality > 0) {
            sort = 'controversial'
        } else if (score >= 5) {
            sort = 'top'
        }
        if (sort !== 'new' && age < ONE_YEAR_SECONDS) {
            t = 'year'
        }
    }

    return { sort, t }
}

// --- Reddit's feeds ---

// What a scan reads. A person's feed still has the comments moderators removed,
// with their text, and leaves out what the person deleted. A thread's feed shows
// a removed comment with replies as [deleted] and no author, and leaves out one
// without replies. A comment's feed has its parent, itself and its replies, and
// leaves it out the same way. No page or JSON listing shows a removed comment's
// text any more (verified 2026-11-04). Logged out, reddit allows one feed a
// minute, so these go through the background with the user's login.
async function fetchWithLogin(path: string): Promise<string> {
    const res = (await browser.runtime.sendMessage({ action: 'fetch-with-login', path })) as any
    console.log(`[reveddit scan] ${path} -> status ${res?.status ?? 'none'}`)
    if (res?.ok) return res.text
    throw Object.assign(new Error(`reddit request failed (status ${res?.status ?? 'none'})`), {
        needsLogin: res?.needsLogin,
        refused: res?.blockPage,
    })
}

const fetchFeed = async (path: string): Promise<any[]> => parseFeed(await fetchWithLogin(path))

// The removed comments a scan looks for are in here, and it's why a scan goes
// author by author. Comments only, so posts don't dilute the 100 per request.
const fetchAuthorComments = (author: string, sort: string, t: string): Promise<any[]> => {
    const query = new URLSearchParams({ sort, limit: '100', ...(t && { t }) })
    return fetchFeed(`/user/${encodeURIComponent(author)}/comments/.rss?${query}`)
}

export function parseFeed(xml: string): any[] {
    const feed = new DOMParser().parseFromString(xml, 'text/xml')
    return Array.from(feed.querySelectorAll('entry')).map(entry => {
        const name = entry.querySelector('id')?.textContent || ''
        const isCommentItem = name.startsWith('t1_')
        const href = entry.querySelector('link')?.getAttribute('href') || ''
        const permalink = href.replace(/^https:\/\/[^/]+/, '')
        const post = permalink.match(/\/comments\/([a-z0-9]+)/i)?.[1]
        const content = entry.querySelector('content')?.textContent || ''
        const bodyEl = new DOMParser().parseFromString(content, 'text/html').querySelector('.md')
        const title = entry.querySelector('title')?.textContent || ''
        const date = entry.querySelector('published')?.textContent || entry.querySelector('updated')?.textContent
        return {
            kind: isCommentItem ? 't1' : 't3',
            data: {
                name,
                author: entry.querySelector('author name')?.textContent?.replace(/^\/u\//, '') || '[deleted]',
                subreddit: entry.querySelector('category')?.getAttribute('term') || '',
                body: (bodyEl?.textContent || '').trim(),
                body_html: bodyEl?.innerHTML || '',
                title: isCommentItem ? undefined : title,
                // A comment's title reads "/u/name on the post's title"
                link_title: isCommentItem ? title.replace(/^\/u\/\S+ on /, '') : undefined,
                created_utc: Math.floor(Date.parse(date || '') / 1000) || 0,
                permalink,
                link_id: post ? 't3_' + post : undefined,
            },
        }
    })
}

// --- Rate Limit Persistence ---

async function isRateLimited(): Promise<boolean> {
    return new Promise(resolve => {
        try {
            chrome.storage.local.get([RATE_LIMIT_KEY], result => {
                resolve(Date.now() < (result[RATE_LIMIT_KEY] || 0))
            })
        } catch {
            resolve(false)
        }
    })
}

// Monitoring and scans spend one shared client budget on Reddit's side, and
// removal monitoring is the extension's core job — so scans defer to it.
// While monitoring's rate-limit backoff is active, scans decline to run (the
// popup badge is already explaining the pause), and for a while after the
// last recorded 429 they run at half speed, mirroring monitoring's own
// gentle resume (computeAbsentVerifyBudget).
export async function monitoringBackoffGate(onProgress: ProgressCallback): Promise<boolean> {
    let backoffMs = 0
    try {
        backoffMs = await getRateLimitBackoffRemainingMs()
    } catch {
        /* storage unavailable — don't block the scan */
    }
    if (backoffMs > 0) {
        onProgress({
            current: 0,
            total: 0,
            currentAuthor: '',
            status: 'rate_limited',
            message:
                'Reddit is rate limiting this browser. Removal monitoring is paused too. Try again in a few minutes.',
        })
        return false
    }
    return true
}

export async function scanDelayMs(): Promise<number> {
    try {
        const ms = await getMsSinceLastRateLimitHit()
        if (ms !== null && ms < RECENT_RATE_LIMIT_WINDOW_MS) {
            return RESTORE_DELAY_MS * 2
        }
    } catch {
        /* fall through to the default */
    }
    return RESTORE_DELAY_MS
}

async function setRateLimitCooldown(durationMs: number = 60000) {
    try {
        chrome.storage.local.set({ [RATE_LIMIT_KEY]: Date.now() + durationMs })
    } catch {
        // ignore
    }
}

// --- The thread being scanned ---

// The feed has the thread's comments and says which are gone. The page has who
// replied to whom, for the comments it shows.
async function readThread(threadPostId: string, subreddit: string, isNewReddit: boolean) {
    const shortId = threadPostId.replace(/^t3_/, '')
    const items = await fetchFeed(`/r/${encodeURIComponent(subreddit)}/comments/${shortId}/.rss?limit=500`)
    const post = items.find(item => item.kind === 't3')?.data
    if (!post) {
        throw new Error('thread feed unreadable (no post)')
    }
    const tree = isNewReddit ? extractCommentTree_newReddit(threadPostId) : extractCommentTree_oldReddit(threadPostId)
    for (const { kind, data } of items) {
        if (kind !== 't1') continue
        const { name: id, author, body, created_utc } = data
        const shown = tree.get(id)
        if (shown) Object.assign(shown, { author, body })
        else tree.set(id, { id, author, body, created_utc, parent_id: '', link_id: threadPostId, children: [] })
    }
    return { tree, postAuthor: post.author as string, postCreatedUtc: post.created_utc as number }
}

const scanFailure = (err: any, otherwise: string): string => {
    if (err.needsLogin) return 'Sign in to Reddit to scan. Logged out, it allows one request a minute.'
    if (err.refused) return 'Reddit is refusing the feeds a scan reads. Try again later.'
    return err.message?.includes('429') ? 'Rate limited by Reddit. Try again in a minute.' : otherwise
}

// --- Main Restore Function ---

// Callback for comments found on author pages that aren't the target but belong
// to this thread and are removed — the UI fills tombstones or inserts them.
export type OtherFoundCallback = (comment: RecoveredComment) => void

export async function restoreComment(
    targetCommentId: string,
    threadPostId: string,
    subreddit: string,
    isNewReddit: boolean,
    onProgress: ProgressCallback,
    authorCache?: Map<string, any[]>,
    onOtherFound?: OtherFoundCallback,
): Promise<RestoreResult> {
    if (await isRateLimited()) {
        onProgress({
            current: 0,
            total: 0,
            currentAuthor: '',
            status: 'rate_limited',
            message: 'Rate limited by Reddit. Try again in a minute.',
        })
        return { found: false }
    }
    if (!(await monitoringBackoffGate(onProgress))) {
        return { found: false }
    }

    let thread: Awaited<ReturnType<typeof readThread>>
    try {
        thread = await readThread(threadPostId, subreddit, isNewReddit)
    } catch (err: any) {
        onProgress({
            current: 0,
            total: 0,
            currentAuthor: '',
            status: 'error',
            message: scanFailure(err, 'Could not load comment tree.'),
        })
        return { found: false }
    }

    const { tree: treeMap, postAuthor } = thread
    const { candidateAuthors, visibleRealIds, tombstoneIds } = summarizeThreadTree(treeMap)

    // Track which comments we've already resolved (across clicks) so we don't
    // report them again.
    const alreadyResolved = new Set<string>()
    document.querySelectorAll('[data-rev-id]').forEach(el => {
        alreadyResolved.add(el.getAttribute('data-rev-id')!)
    })

    // Search EVERY visible author, nearest-first for the target. We usually
    // find it in a few fetches and stop early, but only conclude "not found"
    // once ALL visible authors are exhausted.
    const proximityOrdered = getCandidateAuthors(targetCommentId, treeMap, postAuthor, Number.MAX_SAFE_INTEGER)
    const seenAuthors = new Set(proximityOrdered)
    const candidates = proximityOrdered.concat(candidateAuthors.filter(a => !seenAuthors.has(a)))

    if (candidates.length === 0) {
        onProgress({
            current: 0,
            total: 0,
            currentAuthor: '',
            status: 'not_found',
            message: 'No candidate authors found to search.',
        })
        return { found: false, exhausted: true, remaining: 0 }
    }

    const target = treeMap.get(targetCommentId)
    if (!target) {
        onProgress({
            current: 0,
            total: 0,
            currentAuthor: '',
            status: 'error',
            message: 'Target comment not found in tree.',
        })
        return { found: false }
    }

    const { sort, t } = getUserPageSort(target.created_utc)
    const limiter = new RateLimiter(await scanDelayMs())
    // Cap NEW network lookups per click; cached authors are checked for free.
    let newFetches = 0
    let unsearched = 0
    let targetResult: RestoreResult | null = null

    const makeRecovered = (d: any, subreddit_: string): RecoveredComment => ({
        id: d.name,
        parent_id: d.parent_id || treeMap.get(d.name)?.parent_id || threadPostId,
        link_id: d.link_id,
        author: d.author || '',
        body: d.body || '',
        body_html: d.body_html || '',
        created_utc: d.created_utc || 0,
        score: d.score || 0,
        permalink: d.permalink || '',
        subreddit: d.subreddit || subreddit_,
    })

    // Cross-check an author's feed against this thread. Three cases:
    //   1. Tombstone on the page: its removal and its place are known.
    //   2. Target comment: save as the result.
    //   3. Anything else that isn't live here might be a removed comment with no
    //      replies, or one the thread's feed cut off. Its own feed tells.
    const pendingVerify: any[] = []

    const crossCheck = (items: any[], _sourceAuthor: string) => {
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
                    sourceAuthor: _sourceAuthor,
                }
            } else if (tombstoneIds.has(d.name) && treeMap.get(d.name)?.parent_id) {
                alreadyResolved.add(d.name)
                onOtherFound?.(makeRecovered(d, subreddit))
            } else {
                pendingVerify.push(d)
            }
        }
    }

    for (let i = 0; i < candidates.length; i++) {
        if (targetResult) break
        if (limiter.isCancelled()) {
            onProgress({
                current: i,
                total: candidates.length,
                currentAuthor: '',
                status: 'cancelled',
                message: 'Search cancelled.',
            })
            return { found: false }
        }

        const author = candidates[i]
        const cached = authorCache?.has(author) ?? false
        if (!cached && newFetches >= MAX_RESTORE_LOOKUPS) {
            unsearched++
            continue
        }

        onProgress({
            current: i + 1,
            total: candidates.length,
            currentAuthor: author,
            status: 'searching',
            message: `Searching u/${author}…`,
        })

        try {
            let items: any[]
            if (cached) {
                items = authorCache!.get(author)!
            } else {
                items = await limiter.schedule(() => fetchAuthorComments(author, sort, t))
                authorCache?.set(author, items)
                newFetches++
            }
            crossCheck(items, author)
        } catch (err: any) {
            if (err.message === 'Cancelled') {
                onProgress({
                    current: i + 1,
                    total: candidates.length,
                    currentAuthor: '',
                    status: 'cancelled',
                    message: 'Search cancelled.',
                })
                return { found: false }
            }
            if (err.refused || err.needsLogin) {
                // Not "searched all": nothing was read, and the buttons stay
                onProgress({
                    current: i + 1,
                    total: candidates.length,
                    currentAuthor: '',
                    status: 'error',
                    message: scanFailure(err, ''),
                })
                return { found: false }
            }
            if (err.message?.includes('429')) {
                // Shared client-level signal: monitoring halves its verification
                // budget for an hour and backs off, and the popup badge tells
                // the user why.
                recordRateLimitHit()
                await setRateLimitCooldown()
                onProgress({
                    current: i + 1,
                    total: candidates.length,
                    currentAuthor: author,
                    status: 'rate_limited',
                    message: 'Rate limited by Reddit. Try again in a minute.',
                })
                return { found: false }
            }
        }
    }

    // Verify the rest through their own feeds before reporting them: a live
    // comment the thread's feed cut off stays out, and the feed names the parent.
    if (pendingVerify.length > 0) {
        const unverified = pendingVerify.filter(d => !alreadyResolved.has(d.name))
        if (unverified.length > 0) {
            const looked = await lookupCommentsByIds(unverified, limiter)
            for (const d of unverified) {
                const info = looked.get(d.name)
                if (!info?.removed) continue
                alreadyResolved.add(d.name)
                onOtherFound?.(makeRecovered({ ...d, parent_id: info.parent_id }, subreddit))
            }
        }
    }

    if (targetResult) {
        const r = targetResult as RestoreResult
        onProgress({
            current: candidates.length,
            total: candidates.length,
            currentAuthor: r.author || '',
            status: 'found',
            message: `Found comment by u/${r.author}`,
        })
        return r
    }

    const exhausted = unsearched === 0
    onProgress({
        current: candidates.length,
        total: candidates.length,
        currentAuthor: '',
        status: 'not_found',
        message: exhausted
            ? `Not found — searched all ${candidates.length} visible author(s).`
            : `No match yet — ${unsearched} author(s) left; click again to continue.`,
    })
    return { found: false, exhausted, remaining: unsearched }
}

// --- Profile Scan ---

export async function scanUserProfile(
    username: string,
    onProgress: ProgressCallback,
    options?: ProfileScanOptions,
): Promise<ScanResult[]> {
    if (!(await monitoringBackoffGate(onProgress))) {
        return []
    }
    onProgress({
        current: 0,
        total: 0,
        currentAuthor: username,
        status: 'searching',
        message: 'Fetching user profile...',
    })

    const user = encodeURIComponent(username)
    const query = new URLSearchParams({ sort: options?.sort || 'new', limit: '100' })
    const limiter = new RateLimiter(await scanDelayMs())
    const cachedItems: any[] = []
    // What reddit still lists: not removed comments, but removed posts, marked
    const liveItems = new Map<string, any>()

    try {
        for (const tab of ['comments', 'submitted']) {
            cachedItems.push(...(await limiter.schedule(() => fetchFeed(`/user/${user}/${tab}/.rss?${query}`))))
            const listing = JSON.parse(
                await limiter.schedule(() => fetchWithLogin(`/user/${user}/${tab}.json?${query}`)),
            )
            for (const child of listing?.data?.children || []) {
                liveItems.set(child.data.name, child.data)
            }
        }
    } catch (err: any) {
        onProgress({
            current: 0,
            total: 0,
            currentAuthor: username,
            status: 'error',
            message: err.message?.includes('404')
                ? 'User not found.'
                : scanFailure(err, 'Could not fetch user profile.'),
        })
        return []
    }

    if (cachedItems.length === 0) {
        onProgress({
            current: 0,
            total: 0,
            currentAuthor: username,
            status: 'not_found',
            message: 'No items found on user profile.',
        })
        return []
    }

    console.log(`[reveddit scan] read ${cachedItems.length} items from u/${username}'s feeds`)

    onProgress({
        current: 0,
        total: cachedItems.length,
        currentAuthor: username,
        status: 'searching',
        message: `Checking removal status of ${cachedItems.length} items...`,
    })

    // A comment the listing leaves out may only be in a subreddit they hid
    const unlisted = cachedItems.filter(item => item.kind === 't1' && !liveItems.has(item.data.name))
    const looked = await lookupCommentsByIds(
        unlisted.map(item => item.data),
        limiter,
    )

    const results: ScanResult[] = []

    for (const item of cachedItems) {
        const cached = item.data
        const live = liveItems.get(cached.name)
        const removed = item.kind === 't1' ? looked.get(cached.name)?.removed : live && isRemovedPost(live)
        if (!removed) continue

        const cachedHasContent = cached.body && cached.body !== '[removed]' && cached.body !== '[deleted]'
        const cachedHasTitle = cached.title && cached.title !== '[removed]' && cached.title !== '[deleted]'
        if (!cachedHasContent && !cachedHasTitle) continue

        results.push({
            id: cached.name,
            type: item.kind === 't1' ? 'comment' : 'post',
            subreddit: cached.subreddit || '',
            body: cached.body,
            body_html: cached.body_html,
            title: cached.title,
            link_title: cached.link_title,
            created_utc: cached.created_utc || 0,
            permalink: cached.permalink || '',
            parent_id: looked.get(cached.name)?.parent_id,
            link_id: cached.link_id,
        })
    }

    onProgress({
        current: cachedItems.length,
        total: cachedItems.length,
        currentAuthor: username,
        status: results.length > 0 ? 'found' : 'not_found',
        message: results.length > 0 ? `Found ${results.length} removed item(s).` : 'No removed items found.',
    })

    console.log(`[reveddit scan] done: ${results.length} removed of ${cachedItems.length} items`)

    return results
}

// --- Thread Scan (find removed comments by searching visible authors) ---
//
// Removed comments are NOT enumerable from a thread: reddit shows no tombstone
// for a removed leaf, and even the thread JSON omits them entirely (a thread can
// report num_comments=16 yet return one comment with no "load more" placeholder).
// The only way to recover them is to take each author who IS visible in the
// thread and look through their profile (fetched logged-out, so removed bodies
// are present) for comments whose link_id is this thread but which aren't shown
// here. A removed comment is therefore only recoverable if its author also has a
// visible comment in the thread. We bound the search by num_comments (stop once
// everything missing is found) and report each recovery through onComment so the
// UI can place it live.

export interface RecoveredComment {
    id: string
    parent_id: string
    link_id: string
    author: string
    body: string
    body_html: string
    created_utc: number
    score: number
    permalink: string
    subreddit: string
    // 'recovered' = a removed comment (red). 'context' = a live comment that was
    // just not loaded here, reconstructed to bridge an unattached comment into
    // the tree (muted). Absent ⇒ 'recovered'.
    kind?: 'recovered' | 'context'
}

export type RecoveredCommentCallback = (c: RecoveredComment) => void

// A comment read through its own feed. `removed` means it's a [deleted] tombstone
// there, or left out, so its text isn't available from it.
export interface LookedUpComment {
    id: string
    parent_id: string
    link_id: string
    author: string
    body: string
    body_html: string
    created_utc: number
    permalink: string
    subreddit: string
    removed: boolean
}

// Rate-limited, one request per comment, so callers pass few
export async function lookupCommentsByIds(
    comments: { name: string; link_id: string }[],
    limiter: RateLimiter,
): Promise<Map<string, LookedUpComment>> {
    const out = new Map<string, LookedUpComment>()
    for (const { name, link_id } of comments.slice(0, MAX_RESTORE_LOOKUPS)) {
        const path = `/comments/${link_id.replace(/^t3_/, '')}/_/${name.replace(/^t1_/, '')}/.rss?context=1`
        let items: any[]
        try {
            items = await limiter.schedule(() => fetchFeed(path))
        } catch {
            continue
        }
        if (!items.length) continue
        const at = items.findIndex(item => item.data.name === name)
        const d = items[at]?.data
        // With no replies, a removed comment's feed ends at its parent
        const parent = items[at < 0 ? items.length - 1 : at - 1]?.data
        out.set(name, {
            id: name,
            parent_id: parent?.name || '',
            link_id,
            author: d?.author || '[deleted]',
            body: d?.body || '[deleted]',
            body_html: d?.body_html || '',
            created_utc: d?.created_utc || 0,
            permalink: d?.permalink || '',
            subreddit: d?.subreddit || '',
            removed: !d || d.body === '[removed]' || d.body === '[deleted]',
        })
    }
    return out
}

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
        const isReal = validAuthor(node.author) && !(node.body || '').startsWith('[')
        if (isReal) {
            visibleRealIds.add(node.id)
            if (!seenAuthor.has(node.author)) {
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

function getNumComments(isNewReddit: boolean): number {
    const count = isNewReddit
        ? document.querySelector('shreddit-post')?.getAttribute('comment-count')
        : document
              .querySelector('#siteTable .thing[data-comments-count], .linklisting .thing[data-comments-count]')
              ?.getAttribute('data-comments-count')
    return parseInt(count || '', 10) || 0
}

export async function scanThreadForRemovedComments(
    threadPostId: string,
    subreddit: string,
    isNewReddit: boolean,
    authorCache: Map<string, any[]>,
    onProgress: ProgressCallback,
    onComment?: RecoveredCommentCallback,
): Promise<RecoveredComment[]> {
    if (!(await monitoringBackoffGate(onProgress))) {
        return []
    }
    let thread: Awaited<ReturnType<typeof readThread>>
    try {
        thread = await readThread(threadPostId, subreddit, isNewReddit)
    } catch (err: any) {
        onProgress({
            current: 0,
            total: 0,
            currentAuthor: '',
            status: 'error',
            message: scanFailure(err, 'Could not load comment tree.'),
        })
        return []
    }

    const { tree, postAuthor, postCreatedUtc } = thread
    const { candidateAuthors, visibleRealIds, tombstoneIds } = summarizeThreadTree(tree)

    // num_comments includes removed comments, so (total − visible) is how many
    // are missing. If nothing's missing there's nothing to scan for.
    const missingCount = Math.max(tombstoneIds.size, getNumComments(isNewReddit) - visibleRealIds.size)
    if (missingCount === 0) {
        onProgress({
            current: 0,
            total: 0,
            currentAuthor: '',
            status: 'not_found',
            message: 'All comments are visible — nothing removed.',
        })
        return []
    }

    // Candidates: every distinct valid author visible in the thread, plus the OP.
    const candidates = [...candidateAuthors]
    if (validAuthor(postAuthor) && !candidates.includes(postAuthor)) candidates.push(postAuthor)

    if (candidates.length === 0) {
        onProgress({
            current: 0,
            total: 0,
            currentAuthor: '',
            status: 'not_found',
            message: `${missingCount} comment(s) removed, but no visible authors to search.`,
        })
        return []
    }

    const { sort, t } = getUserPageSort(postCreatedUtc || Math.floor(Date.now() / 1000))
    const limiter = new RateLimiter(await scanDelayMs())
    const recovered: RecoveredComment[] = []
    const recoveredIds = new Set<string>()
    let searched = 0
    // Why reddit won't let any author's feed be read, if so
    let stopped = ''

    const recordRecovery = (d: any, sourceAuthor: string) => {
        const rc: RecoveredComment = {
            id: d.name,
            parent_id: d.parent_id || tree.get(d.name)?.parent_id || threadPostId,
            link_id: d.link_id,
            author: d.author || sourceAuthor,
            body: d.body || '',
            body_html: d.body_html || '',
            created_utc: d.created_utc || 0,
            score: d.score || 0,
            permalink: d.permalink || '',
            subreddit: d.subreddit || subreddit,
        }
        recovered.push(rc)
        recoveredIds.add(rc.id)
        onComment?.(rc)
    }

    for (const author of candidates) {
        if (recovered.length >= missingCount) break // found everything that's missing

        searched++
        onProgress({
            current: searched,
            total: candidates.length,
            currentAuthor: author,
            status: 'searching',
            message: `Searching u/${author}… — ${candidates.length - searched} author(s) left, ${recovered.length}/${missingCount} recovered`,
        })

        let items: any[]
        try {
            if (authorCache.has(author)) {
                items = authorCache.get(author)!
            } else {
                items = await limiter.schedule(() => fetchAuthorComments(author, sort, t))
                authorCache.set(author, items)
            }
        } catch (err: any) {
            if (err.message === 'Cancelled') break
            if (err.refused || err.needsLogin) {
                stopped = scanFailure(err, '')
                break
            }
            if (err.message?.includes('429')) {
                // Shared signal — see the twin catch in restoreComment.
                recordRateLimitHit()
                await setRateLimitCooldown()
                stopped = scanFailure(err, '')
                break
            }
            continue
        }

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
                recordRecovery(d, author)
            } else {
                uncertain.push(d)
            }
        }
        if (uncertain.length) {
            const looked = await lookupCommentsByIds(uncertain, limiter)
            for (const d of uncertain) {
                const info = looked.get(d.name)
                if (info?.removed) recordRecovery({ ...d, parent_id: info.parent_id }, author)
            }
        }
    }

    const unsearched = candidates.length - searched
    if (stopped) {
        onProgress({
            current: searched,
            total: candidates.length,
            currentAuthor: '',
            status: 'error',
            message: `${stopped} ${recovered.length} recovered.`,
        })
        return recovered
    }
    onProgress({
        current: searched,
        total: candidates.length,
        currentAuthor: '',
        status: recovered.length > 0 ? 'found' : 'not_found',
        message:
            `Scan complete: ${recovered.length} recovered` +
            (recovered.length < missingCount
                ? ` (${missingCount - recovered.length} not found${unsearched > 0 ? `, ${unsearched} author(s) unsearched` : ''})`
                : ''),
    })

    return recovered
}
