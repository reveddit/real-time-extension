import { isRemovedInModView, isRemovedPost } from './common'
import { isRateLimitError } from './parse_html/common'
import { getMarkupConfig } from './markup-config'
import { getRateLimitBackoffRemainingMs } from './storage'
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
    // searched (so the button can be disabled); remaining = what's still to check
    // after this batch (shown as "scan-rev (N)").
    exhausted?: boolean
    remaining?: number
    // Comments on the page that need another sort, so a person's feed read here
    // says nothing about them and their buttons stay
    otherSorts?: boolean
}

export interface RestoreProgress {
    current: number
    total: number
    currentAuthor: string
    // partial: it stopped short of everything, and another click goes on
    status: 'searching' | 'found' | 'not_found' | 'partial' | 'cancelled' | 'rate_limited' | 'error'
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
    permalink: string
    parent_id?: string
    link_id?: string
    // The item before it in the feed, which has the page's order. Unset for the first.
    after?: string
}

export interface ProfileScanOptions {
    sort?: string
    t?: string
    after?: string
    before?: string
    // Reddit shows an author their own removed comments as live, so a scan of
    // one's own profile can only say anything about posts
    ownProfile?: boolean
}

// --- Constants ---

const RESTORE_DELAY_MS = 1500
const MAX_RESTORE_LOOKUPS = 20
// The requests one click may send, counting a block page's retry, though not on
// the few reads that open a scan. They carry the user's login, and 50 in a row is
// the longest run measured at this pace (reddit.md). The next click goes on.
const MAX_SCAN_READS = 50
// One refused read may be about that author (a suspended account's feed isn't
// measured, and a feed's own 403 looks like the edge's block page), and one
// failure may be a blip. A few in a row aren't.
const MAX_FAILED_READS_IN_A_ROW = 3
const ONE_MONTH_SECONDS = 30 * 60 * 60 * 24
const FIVE_MONTHS_SECONDS = 5 * ONE_MONTH_SECONDS
const ONE_YEAR_SECONDS = 365 * 60 * 60 * 24

// --- Rate Limiter ---

export class RateLimiter {
    private delayMs: number
    private stillWanted: () => boolean
    private cancelled = false
    private lastFetchTime = 0

    // stillWanted: whether the page the scan belongs to is still showing
    constructor(delayMs: number = RESTORE_DELAY_MS, stillWanted: () => boolean = () => true) {
        this.delayMs = delayMs
        this.stillWanted = stillWanted
    }

    cancel() {
        this.cancelled = true
    }

    isCancelled() {
        return this.cancelled || !this.stillWanted()
    }

    async schedule<T>(fn: () => Promise<T>): Promise<T> {
        if (this.isCancelled()) throw new Error('Cancelled')
        const now = Date.now()
        const elapsed = now - this.lastFetchTime
        if (elapsed < this.delayMs && this.lastFetchTime > 0) {
            await new Promise(r => setTimeout(r, this.delayMs - elapsed))
        }
        if (this.isCancelled()) throw new Error('Cancelled')
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

// Reddit has spelled this thingId and thing-id. Attribute names on a page read lowercase.
const commentIdAttributes = () => getMarkupConfig().commentIdAttributes.map(name => name.toLowerCase())

export const commentIdOf = (comment: Element | null | undefined): string => {
    for (const name of commentIdAttributes()) {
        const id = comment?.getAttribute(name)
        if (id) return id
    }
    return ''
}

export const commentSelector = (id?: string): string =>
    commentIdAttributes()
        .map(name => `shreddit-comment[${name}${id ? `="${id}"` : ''}]`)
        .join(', ')

// The comments new reddit's page shows, with who replied to whom. A reply sits
// inside its parent, and a comment at the top of the thread has no parentid.
export function extractCommentTree_newReddit(
    postFullname: string,
    root: ParentNode = document,
): Map<string, CommentTreeNode> {
    const map = new Map<string, CommentTreeNode>()
    for (const el of Array.from(root.querySelectorAll(commentSelector()))) {
        const id = commentIdOf(el)
        map.set(id, {
            id,
            author: el.getAttribute('author') || '',
            parent_id:
                el.getAttribute('parentid') ||
                commentIdOf(el.parentElement?.closest('shreddit-comment')) ||
                postFullname,
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
async function fetchWithLogin(path: string, onRetried?: () => void): Promise<string> {
    const res = (await browser.runtime.sendMessage({ action: 'fetch-with-login', path })) as any
    console.log(`[reveddit scan] ${path} -> status ${res?.status ?? 'none'}`)
    if (res?.retried) onRetried?.()
    if (res?.ok) return res.text
    throw Object.assign(new Error(`reddit request failed: ${res?.status ?? 'none'}`), {
        status: res?.status,
        needsLogin: res?.needsLogin,
        refused: res?.blockPage,
        busy: res?.busy,
        resting: res?.resting,
        otherIdentity: res?.otherIdentity,
    })
}

const fetchFeed = async (path: string, onRetried?: () => void): Promise<any[]> =>
    parseFeed(await fetchWithLogin(path, onRetried))

// The removed comments a scan looks for are in here, and it's why a scan goes
// author by author. Comments only, so posts don't dilute the 100 per request.
const authorFeedPath = (author: string, sort: string, t: string): string => {
    const query = new URLSearchParams({ sort, limit: '100', ...(t && { t }) })
    return `/user/${encodeURIComponent(author)}/comments/.rss?${query}`
}

export function parseFeed(xml: string): any[] {
    const feed = new DOMParser().parseFromString(xml, 'text/xml')
    // A challenge, a login page, an empty body or a cut-off feed isn't a person
    // with no comments. Browsers differ on what survives a parse error.
    if (feed.documentElement?.localName !== 'feed' || feed.querySelector('parsererror')) {
        throw Object.assign(new Error('a page in place of the feed'), { refused: true })
    }
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

// --- Scans and the backoff ---

const RATE_LIMITED =
    'Reddit is rate limiting this browser. Removal monitoring is paused too. Try again in a few minutes.'

// Monitoring and scans spend one shared client budget on Reddit's side, and
// removal monitoring is the extension's core job — so scans defer to it.
// While monitoring's rate-limit backoff is active, scans decline to run (the
// popup badge is already explaining the pause). A read that goes out after one
// starts is turned away in the background, which also doubles the spacing for
// a while after the last recorded 429 (requests.ts readWithLogin).
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
            message: RATE_LIMITED,
        })
        return false
    }
    return true
}

// --- One click's reads ---

// Why the next read would fare no better, whoever it's for
const endsScan = (err: any): boolean =>
    Boolean(err.needsLogin || err.busy || err.resting || err.otherIdentity || isRateLimitError(err))

// In pageReads: an address reddit has no feed for, and a read given up on
const NO_FEED: any[] = []
const GAVE_UP: any[] = []

// What one click reads: how much it may still send, what it couldn't read, and
// what ended it. A failed read isn't a finished one, so a caller can tell "read
// it all and found nothing" from "couldn't read it". Feeds it has read are kept
// in pageReads, if given, so the next click goes on from there. A read with no
// answer gets one more try on the next click, then the scan moves past it, so
// no click is promised work it can't do.
export class ScanReads {
    // Left for the next click
    unread = 0
    // Tried on two clicks
    gaveUp = 0
    failure: any
    private left: number
    private failedInARow = 0
    private limiter: RateLimiter
    private pageReads?: Map<string, any[]>

    constructor(limiter: RateLimiter, budget: number = MAX_SCAN_READS, pageReads?: Map<string, any[]>) {
        this.limiter = limiter
        this.left = budget
        this.pageReads = pageReads
    }

    get stopped(): boolean {
        return Boolean(this.failure) || this.limiter.isCancelled()
    }

    has(path: string): boolean {
        return this.pageReads?.has(path) ?? false
    }

    canRead(path: string): boolean {
        return this.left > 0 || this.has(path)
    }

    noAnswer(path: string) {
        const tried = `tried ${path}`
        if (this.pageReads?.has(tried)) {
            this.pageReads.set(path, GAVE_UP)
            this.gaveUp++
        } else {
            this.pageReads?.set(tried, NO_FEED)
            this.pageReads?.delete(path)
            this.unread++
        }
    }

    // Undefined when there's nothing to go on: it wasn't read, or a 404 said
    // there's no such feed, which is an answer and isn't counted as unread
    async feed(path: string): Promise<any[] | undefined> {
        const kept = this.pageReads?.get(path)
        if (kept) {
            this.failedInARow = 0
            if (kept === GAVE_UP) this.gaveUp++
            return kept === NO_FEED || kept === GAVE_UP ? undefined : kept
        }
        this.left--
        try {
            const items = await this.limiter.schedule(() => fetchFeed(path, () => this.left--))
            this.failedInARow = 0
            this.pageReads?.set(path, items)
            return items
        } catch (err: any) {
            if (this.limiter.isCancelled()) return undefined
            if (err.status === 404) {
                this.failedInARow = 0
                this.pageReads?.set(path, NO_FEED)
                return undefined
            }
            if (endsScan(err)) {
                this.unread++
                this.failure = err
                return undefined
            }
            this.noAnswer(path)
            if (++this.failedInARow >= MAX_FAILED_READS_IN_A_ROW) this.failure = err
            return undefined
        }
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
        // Gone in either view is gone: a page can be older than the feed
        if (!shown) tree.set(id, { id, author, body, created_utc, parent_id: '', link_id: threadPostId, children: [] })
        else if (!validAuthor(author)) shown.author = author
    }
    return { tree, postAuthor: post.author as string, postCreatedUtc: post.created_utc as number }
}

const scanFailure = (err: any, otherwise: string): string => {
    if (err.needsLogin) return 'Sign in to Reddit to scan. Logged out, it allows one request a minute.'
    if (err.busy) return 'A second account is signing in. Try again in a moment.'
    if (err.otherIdentity) return "Scans need a regular window: here they'd read as your regular windows' account."
    if (err.resting || isRateLimitError(err)) return RATE_LIMITED
    if (err.refused) return 'Reddit is refusing the feeds a scan reads. Try again later.'
    return otherwise
}
const COULD_NOT_READ = "Couldn't read reddit's feeds. Try again."

// Comments a scan already put on this page
const recoveredOnPage = () =>
    new Set(Array.from(document.querySelectorAll('[data-rev-id]'), el => el.getAttribute('data-rev-id')!))

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
export type OtherFoundCallback = (comment: RecoveredComment) => void

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
    // Reading the page now would read the next one
    if (limiter.isCancelled()) {
        onProgress({ current: 0, total: 0, currentAuthor: '', status: 'cancelled', message: 'Search cancelled.' })
        return { found: false }
    }

    const { tree: treeMap, postAuthor } = thread
    const { candidateAuthors, visibleRealIds, tombstoneIds } = summarizeThreadTree(treeMap)

    // Track which comments we've already resolved (across clicks) so we don't
    // report them again.
    const alreadyResolved = recoveredOnPage()

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
    // 20 authors and 20 comments a click, on top of the thread's own feed
    const reads = new ScanReads(limiter, 2 * MAX_RESTORE_LOOKUPS, pageReads)
    // Cap NEW network lookups per click; cached authors are checked for free.
    let newFetches = 0
    let unsearched = 0
    let targetResult: RestoreResult | null = null

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
                onOtherFound?.(toRecovered(d, treeMap, threadPostId, subreddit))
            } else {
                pendingVerify.push(d)
            }
        }
    }

    for (let i = 0; i < candidates.length && !targetResult && !reads.stopped; i++) {
        const author = candidates[i]
        const path = authorFeedPath(author, sort, t)
        const kept = reads.has(path)
        if (!kept && newFetches >= MAX_RESTORE_LOOKUPS) {
            unsearched++
            continue
        }
        if (!kept) newFetches++

        onProgress({
            current: i + 1,
            total: candidates.length,
            currentAuthor: author,
            status: 'searching',
            message: `Searching u/${author}…`,
        })

        const items = await reads.feed(path)
        if (items) crossCheck(items, author)
    }

    // Verify the rest through their own feeds before reporting them: a live
    // comment the thread's feed cut off stays out, and the feed names the parent.
    // The answer isn't held up for this: they keep for the next click.
    let unchecked = 0
    if (!targetResult && !reads.stopped) {
        const unverified = pendingVerify.filter(d => !alreadyResolved.has(d.name))
        const lookup = await lookupCommentsByIds(unverified, reads)
        unchecked = lookup.unchecked
        for (const d of unverified) {
            const info = lookup.looked.get(d.name)
            if (!info?.removed) continue
            alreadyResolved.add(d.name)
            onOtherFound?.(toRecovered({ ...d, parent_id: info.parent_id }, treeMap, threadPostId, subreddit))
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

    if (limiter.isCancelled()) {
        onProgress({
            current: candidates.length,
            total: candidates.length,
            currentAuthor: '',
            status: 'cancelled',
            message: 'Search cancelled.',
        })
        return { found: false }
    }

    if (reads.failure) {
        // Not "searched all": something wasn't read, and the buttons stay
        onProgress({
            current: candidates.length,
            total: candidates.length,
            currentAuthor: '',
            status: 'error',
            message: scanFailure(reads.failure, COULD_NOT_READ),
        })
        return { found: false }
    }

    const remaining = unsearched + reads.unread + unchecked
    const couldntRead = `Not found — searched ${candidates.length} visible author(s), but ${reads.gaveUp} feed(s) couldn't be read.`
    onProgress({
        current: candidates.length,
        total: candidates.length,
        currentAuthor: '',
        status: 'not_found',
        message: remaining
            ? `No match yet — ${remaining} left to check; click again to continue.`
            : reads.gaveUp
              ? couldntRead
              : `Not found — searched all ${candidates.length} visible author(s).`,
    })
    const otherSorts = Array.from(treeMap.values()).some(({ created_utc }) => {
        const other = getUserPageSort(created_utc)
        return created_utc > 0 && (other.sort !== sort || other.t !== t)
    })
    return { found: false, exhausted: remaining === 0, remaining, otherSorts }
}

// --- Profile Scan ---

export async function scanUserProfile(
    username: string,
    onProgress: ProgressCallback,
    options?: ProfileScanOptions,
    limiter: RateLimiter = new RateLimiter(),
    pageReads?: Map<string, any[]>,
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
        const stopped = limiter.isCancelled()
        onProgress({
            current: 0,
            total: 0,
            currentAuthor: username,
            status: stopped ? 'cancelled' : 'error',
            message: stopped
                ? 'Scan cancelled.'
                : err.status === 404
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

    // A comment the listing leaves out may only be in a subreddit they hid. An
    // author's own listing and feeds show their removed comments as live.
    const unlisted = cachedItems.filter(item => item.kind === 't1' && !liveItems.has(item.data.name))
    const reads = new ScanReads(limiter, MAX_SCAN_READS - 5, pageReads)
    const { looked, unchecked } = await lookupCommentsByIds(
        unlisted.map(item => item.data),
        reads,
    )

    const results: ScanResult[] = []

    cachedItems.forEach((item, i) => {
        const cached = item.data
        const live = liveItems.get(cached.name)
        const removed =
            item.kind === 't1'
                ? looked.get(cached.name)?.removed || (live && isRemovedInModView(live))
                : live && (isRemovedPost(live) || isRemovedInModView(live) || isRemovedByCategory(live))
        if (!removed) return

        const cachedHasContent = cached.body && cached.body !== '[removed]' && cached.body !== '[deleted]'
        const cachedHasTitle = cached.title && cached.title !== '[removed]' && cached.title !== '[deleted]'
        if (!cachedHasContent && !cachedHasTitle) return

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
            after: cachedItems[i - 1]?.kind === item.kind ? cachedItems[i - 1].data.name : undefined,
        })
    })

    console.log(`[reveddit scan] done: ${results.length} removed of ${cachedItems.length} items`)

    const found = results.length > 0 ? `Found ${results.length} removed item(s).` : ''
    const progress = { current: cachedItems.length, total: cachedItems.length, currentAuthor: username }
    if (limiter.isCancelled()) {
        onProgress({ ...progress, status: 'cancelled', message: `Scan cancelled. ${found}`.trim() })
        return results
    }
    if (reads.failure) {
        const why = scanFailure(reads.failure, 'Could not check removal status.')
        onProgress({ ...progress, status: 'error', message: `${why} ${found}`.trim() })
        return results
    }
    const unread = unchecked + reads.unread
    // Every comment listed is how a profile looks to its own author, and the
    // stored name may be empty or out of date
    const own = options?.ownProfile || (unlisted.length === 0 && (await isSignedInAs(username, limiter)))
    const notes = [
        unread > 0 && `${unread} comment(s) not checked yet; scan again to go on.`,
        reads.gaveUp > 0 && `${reads.gaveUp} comment(s) couldn't be checked.`,
        own && "Reddit shows you your own comments as live, so a scan can't check them.",
    ].filter(Boolean)
    const nothing = own ? 'No removed posts found.' : `No removed items found${unread ? ' so far' : ''}.`
    onProgress({
        ...progress,
        status: notes.length ? 'partial' : results.length > 0 ? 'found' : 'not_found',
        message: [found || nothing, ...notes].join(' '),
    })
    return results
}

const isSignedInAs = async (username: string, limiter: RateLimiter): Promise<boolean> => {
    try {
        const me = JSON.parse(await limiter.schedule(() => fetchWithLogin('/api/me.json')))
        return String(me?.data?.name).toLowerCase() === username.toLowerCase()
    } catch {
        return false
    }
}

// A post the viewer's listing marks, whoever removed it. 'deleted' is the author's own doing.
const isRemovedByCategory = (post: any): boolean =>
    Boolean(post.removed_by_category) && post.removed_by_category !== 'deleted'

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

// One request per comment, as far as the click's reads go. unchecked: how many
// that left out. A failed read leaves its comment out of looked, and reads says
// why, so a comment that wasn't read can't pass for one that's live.
export async function lookupCommentsByIds(
    comments: { name: string; link_id: string }[],
    reads: ScanReads,
): Promise<{ looked: Map<string, LookedUpComment>; unchecked: number }> {
    const looked = new Map<string, LookedUpComment>()
    let unchecked = 0
    for (const { name, link_id } of comments) {
        if (reads.stopped) break
        const path = `/comments/${link_id.replace(/^t3_/, '')}/_/${name.replace(/^t1_/, '')}/.rss?context=1`
        if (!reads.canRead(path)) {
            unchecked++
            continue
        }
        const items = await reads.feed(path)
        if (!items) continue
        const at = items.findIndex(item => item.data.name === name)
        // A real answer always has the post, and with the comment left out, at
        // most its parent as well. Anything else says nothing about the comment.
        if (!items.length || (at < 0 && (items.length > 2 || items.some(item => item.data.link_id !== link_id)))) {
            reads.noAnswer(path)
            continue
        }
        const d = items[at]?.data
        // With no replies, a removed comment's feed ends at its parent
        const parent = items[at < 0 ? items.length - 1 : at - 1]?.data
        looked.set(name, {
            id: name,
            parent_id: parent?.name || '',
            link_id,
            author: d?.author || '[deleted]',
            body: d?.body || '[deleted]',
            body_html: d?.body_html || '',
            created_utc: d?.created_utc || 0,
            permalink: d?.permalink || '',
            subreddit: d?.subreddit || '',
            removed: !d || (d.author === '[deleted]' && (d.body === '[removed]' || d.body === '[deleted]')),
        })
    }
    return { looked, unchecked }
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
        // A tombstone has no author, or one in brackets, in every view, whatever
        // its text. AutoModerator is live but has no feed worth reading.
        if (node.author && node.author[0] !== '[') {
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

// null when the page doesn't say
function getNumComments(isNewReddit: boolean): number | null {
    const count = isNewReddit
        ? document.querySelector('shreddit-post')?.getAttribute('comment-count')
        : document
              .querySelector('#siteTable .thing[data-comments-count], .linklisting .thing[data-comments-count]')
              ?.getAttribute('data-comments-count')
    const parsed = parseInt(count ?? '', 10)
    return Number.isNaN(parsed) ? null : parsed
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
    // Reading the page now would read the next one
    if (limiter.isCancelled()) {
        const message = 'Scan cancelled. 0 recovered.'
        onProgress({ current: 0, total: 0, currentAuthor: '', status: 'cancelled', message })
        return []
    }

    const { tree, postAuthor, postCreatedUtc } = thread
    const { candidateAuthors, visibleRealIds, tombstoneIds } = summarizeThreadTree(tree)

    // num_comments includes removed comments, so (total − visible) is how many
    // are missing. If nothing's missing there's nothing to scan for. A page
    // that doesn't give the count can't say that.
    const total = getNumComments(isNewReddit)
    const missingCount = total === null ? Infinity : Math.max(tombstoneIds.size, total - visibleRealIds.size)
    const counted = Number.isFinite(missingCount)
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
            message: `${counted ? `${missingCount} comment(s) removed, but no` : 'No'} visible authors to search.`,
        })
        return []
    }

    const { sort, t } = getUserPageSort(postCreatedUtc || Math.floor(Date.now() / 1000))
    // The thread's own feed was the first read
    const reads = new ScanReads(limiter, MAX_SCAN_READS - 1, pageReads)
    const recovered: RecoveredComment[] = []
    const recoveredIds = recoveredOnPage()
    const alreadyRecovered = recoveredIds.size
    const recoveredCount = () => recovered.length + alreadyRecovered
    let searched = 0
    let unsearched = 0
    let unchecked = 0

    const recordRecovery = (d: any) => {
        const rc = toRecovered(d, tree, threadPostId, subreddit)
        recovered.push(rc)
        recoveredIds.add(rc.id)
        onComment?.(rc)
    }

    for (const author of candidates) {
        if (recoveredCount() >= missingCount || reads.stopped) break // found everything that's missing

        const path = authorFeedPath(author, sort, t)
        if (!reads.canRead(path)) {
            unsearched++
            continue
        }

        searched++
        onProgress({
            current: searched,
            total: candidates.length,
            currentAuthor: author,
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
            const lookup = await lookupCommentsByIds(uncertain, reads)
            unchecked += lookup.unchecked
            for (const d of uncertain) {
                const info = lookup.looked.get(d.name)
                if (info?.removed) recordRecovery({ ...d, parent_id: info.parent_id })
            }
        }
    }

    const progress = { current: searched, total: candidates.length, currentAuthor: '' }
    if (limiter.isCancelled()) {
        onProgress({ ...progress, status: 'cancelled', message: `Scan cancelled. ${recoveredCount()} recovered.` })
        return recovered
    }
    if (reads.failure) {
        const why = scanFailure(reads.failure, COULD_NOT_READ)
        onProgress({ ...progress, status: 'error', message: `${why} ${recoveredCount()} recovered.` })
        return recovered
    }
    const left = unsearched + unchecked + reads.unread
    if (left > 0) {
        const message = `${recoveredCount()} recovered so far, ${left} left to check. Click again to continue.`
        onProgress({ ...progress, status: 'partial', message })
        return recovered
    }
    onProgress({
        ...progress,
        status: recovered.length > 0 ? 'found' : 'not_found',
        message:
            `Scan complete: ${recoveredCount()} recovered` +
            (counted && recoveredCount() < missingCount ? ` (${missingCount - recoveredCount()} not found)` : '') +
            (reads.gaveUp ? `. ${reads.gaveUp} feed(s) couldn't be read.` : ''),
    })

    return recovered
}
