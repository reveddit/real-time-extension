import { isRemovedComment, isRemovedPost, isComment } from './common'
import { throwIfLegacyDisabled } from './requests'
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

export function extractCommentTree_oldReddit(postFullname: string): Map<string, CommentTreeNode> {
    const map = new Map<string, CommentTreeNode>()
    const commentEls = document.querySelectorAll('.commentarea .thing.comment')

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

    // Link children to parents
    for (const node of map.values()) {
        const parent = map.get(node.parent_id)
        if (parent) {
            parent.children.push(node)
        }
    }

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

    // Link children to parents
    for (const node of map.values()) {
        const parent = map.get(node.parent_id)
        if (parent) {
            parent.children.push(node)
        }
    }

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

// --- User Page Fetching ---

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

// Fetch an author's comments UNAUTHENTICATED. Uses the HTML path because the
// JSON endpoint hides removed comments from the listing — the HTML page still
// shows them logged-out. Fetches /comments (not the overview) so posts don't
// dilute the 25-per-page limit.
export async function fetchUserPage(
    author: string,
    sort: string = 'new',
    _t: string = '',
    _after?: string,
    _before?: string,
): Promise<any[]> {
    return fetchUserPageHTML(author, sort, true)
}

// Fetch an old.reddit.com JSON URL UNAUTHENTICATED. The content script can't do
// this itself (credentials:'omit' 403s the JSON API, default sends the user's
// cookies, and on new reddit it's cross-origin/CORS), so always go through the
// background — it fetches with no cookies (extension origin) and the DNR header
// strip, giving the logged-out view (which still has removed bodies).
async function fetchOldRedditJSON(url: string): Promise<any> {
    const res = (await browser.runtime.sendMessage({ action: 'fetch-old-reddit-json', url })) as any
    console.log(`[reveddit] old-reddit-json bg ${url.split('?')[0]} -> status ${res?.status ?? 'none'}`)
    if (res?.ok && res.data) return res.data
    throw new Error(`background old-reddit fetch failed (status ${res?.status ?? 'none'})`)
}

// --- User page via HTML ---
// The unauthenticated .json user page is 403'd, but Reddit still serves the
// HTML user page unauthenticated WITH removed bodies. Fetch + parse that.
// Route by page host: on old.reddit.com it's a same-origin fetch (works on all
// browsers, no DNR needed); on new reddit (www/sh) old.reddit.com is cross-origin
// and CORS-blocked in the content script, so the background does it (it has the
// host_permissions CORS bypass + the DNR header strip).
// commentsOnly: true  → /user/X/comments (thread restore — no posts diluting)
// commentsOnly: false → /user/X (profile scan — needs both posts and comments)
export async function fetchUserPageHTML(username: string, sort = 'new', commentsOnly = false): Promise<any[]> {
    const subpath = commentsOnly ? '/comments' : ''
    const qs = sort && sort !== 'new' ? `?sort=${encodeURIComponent(sort)}` : ''
    const path = `/user/${encodeURIComponent(username)}${subpath}${qs}`
    let html: string
    if (location.hostname === 'old.reddit.com') {
        // Unauthenticated (credentials omitted) old.reddit fetch — dying endpoint, gated
        await throwIfLegacyDisabled('old.reddit.com userpage HTML')
        const url = `https://old.reddit.com${path}`
        const response = await fetch(url, { credentials: 'omit' })
        if (!response.ok) throw new Error(`User page fetch failed: ${response.status}`)
        html = await response.text()
        console.log(`[reveddit scan] user-page direct fetch ok (${html.length} bytes)`)
    } else {
        html = await fetchUserPageHTMLViaBackground(username, path)
    }
    return parseUserPageHTML(html)
}

async function fetchUserPageHTMLViaBackground(username: string, path: string): Promise<string> {
    const res = (await browser.runtime.sendMessage({
        action: 'fetch-userpage-html',
        username,
        path,
    })) as any
    console.log(
        `[reveddit scan] user-page background fetch -> status ${res?.status ?? 'none'} (${res?.ok ? 'ok' : res?.error || 'fail'})`,
    )
    if (res?.ok && res.text) return res.text
    throw new Error(`background user-page fetch failed (status ${res?.status ?? 'none'})`)
}

async function fetchApiInfoViaBackground(ids: string): Promise<any[]> {
    const res = (await browser.runtime.sendMessage({ action: 'fetch-api-info', ids })) as any
    console.log(
        `[reveddit scan] /api/info background -> status ${res?.status ?? 'none'} (${res?.ok ? 'ok' : res?.error || 'fail'})`,
    )
    if (res?.ok && res.children) return res.children
    throw new Error(`background /api/info fetch failed (status ${res?.status ?? 'none'})`)
}

export function parseUserPageHTML(html: string): any[] {
    const doc = new DOMParser().parseFromString(html, 'text/html')
    const items: any[] = []
    for (const el of Array.from(doc.querySelectorAll('#siteTable > .thing[data-fullname]'))) {
        const name = el.getAttribute('data-fullname') || ''
        if (!name) continue
        const isCommentItem = name.startsWith('t1_')
        const bodyEl = el.querySelector('.entry .usertext-body .md')
        const titleEl = el.querySelector('.entry a.title')
        // For comments, the parent post title (shown above the comment on the user page).
        const linkTitleEl = el.querySelector('.parent a.title')
        const timeEl = el.querySelector('.tagline time')
        const scoreEl = el.querySelector('.tagline .score.unvoted')
        const permalink = el.getAttribute('data-permalink') || ''
        let link_id: string | undefined
        if (isCommentItem && permalink) {
            const parts = permalink.split('/').filter(Boolean)
            if (parts[2] === 'comments' && parts[3]) link_id = 't3_' + parts[3]
        }
        const datetime = timeEl?.getAttribute('datetime')
        items.push({
            kind: isCommentItem ? 't1' : 't3',
            data: {
                name,
                author: el.getAttribute('data-author') || '',
                subreddit: el.getAttribute('data-subreddit') || '',
                body: bodyEl ? (bodyEl.textContent || '').trim() : undefined,
                body_html: bodyEl ? bodyEl.innerHTML : undefined,
                title: !isCommentItem && titleEl ? (titleEl.textContent || '').trim() : undefined,
                link_title: isCommentItem && linkTitleEl ? (linkTitleEl.textContent || '').trim() : undefined,
                created_utc: datetime ? Math.floor(new Date(datetime).getTime() / 1000) : 0,
                score: scoreEl?.getAttribute('title') ? parseInt(scoreEl.getAttribute('title')!, 10) || 0 : undefined,
                permalink,
                link_id,
                // parent_id isn't in the HTML, but link_id (the thread) is; the
                // inserter can still place comments by link_id when parent_id is
                // missing (they land in the unattached area and can be bridged).
                parent_id: link_id,
            },
        })
    }
    return items
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

async function setRateLimitCooldown(durationMs: number = 60000) {
    try {
        chrome.storage.local.set({ [RATE_LIMIT_KEY]: Date.now() + durationMs })
    } catch {
        // ignore
    }
}

// --- Thread JSON Fetch (for new reddit) ---

export async function fetchThreadJSON(postId: string, subreddit: string): Promise<any[]> {
    const shortId = postId.replace(/^t3_/, '')
    const url = `https://old.reddit.com/r/${encodeURIComponent(subreddit)}/comments/${shortId}.json?raw_json=1&limit=500`
    return fetchOldRedditJSON(url)
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

    let treeResult: { treeMap: Map<string, CommentTreeNode>; postAuthor: string }

    try {
        if (isNewReddit) {
            const jsonData = await fetchThreadJSON(threadPostId, subreddit)
            const parsed = extractCommentTree_fromJSON(jsonData)
            treeResult = { treeMap: parsed.map, postAuthor: parsed.postAuthor }
        } else {
            const opEl = document.querySelector('.link .top-matter .author')
            treeResult = {
                treeMap: extractCommentTree_oldReddit(threadPostId),
                postAuthor: opEl?.textContent?.trim() || '',
            }
        }
    } catch {
        onProgress({
            current: 0,
            total: 0,
            currentAuthor: '',
            status: 'error',
            message: 'Could not load comment tree.',
        })
        return { found: false }
    }

    const { treeMap, postAuthor } = treeResult
    const { visibleRealIds, tombstoneIds } = summarizeThreadTree(treeMap)

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
    const candidates = proximityOrdered.concat(
        summarizeThreadTree(treeMap).candidateAuthors.filter(a => !seenAuthors.has(a)),
    )

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
    const limiter = new RateLimiter(RESTORE_DELAY_MS)
    // Cap NEW network lookups per click; cached authors are checked for free.
    let newFetches = 0
    let unsearched = 0
    let targetResult: RestoreResult | null = null

    const makeRecovered = (d: any, subreddit_: string): RecoveredComment => ({
        id: d.name,
        parent_id: d.parent_id || threadPostId,
        link_id: d.link_id,
        author: d.author || '',
        body: d.body || '',
        body_html: d.body_html || '',
        created_utc: d.created_utc || 0,
        score: d.score || 0,
        permalink: d.permalink || '',
        subreddit: d.subreddit || subreddit_,
    })

    // Cross-check an author's page against this thread. Three cases:
    //   1. Tombstone (in removedIds) — removal already confirmed, report directly.
    //   2. Target comment — save as the result.
    //   3. Not in tree at all (no tombstone, not visible) — might be a removed
    //      leaf or just not loaded. Collect for /api/info verification.
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
            } else if (tombstoneIds.has(d.name)) {
                // Tombstone — removal confirmed, report immediately.
                alreadyResolved.add(d.name)
                onOtherFound?.(makeRecovered(d, subreddit))
            } else {
                // Not in tree at all — queue for /api/info verification.
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
                items = await limiter.schedule(() => fetchUserPage(author, sort, t))
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
            if (err.message?.includes('429') || err.message?.includes('403')) {
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

    // Verify not-in-tree comments via /api/info before reporting them. A
    // removed comment reads [removed]/[deleted]; a live-but-not-loaded one
    // reads its real body and should be skipped. Use the full lookup (not just
    // the removed-set) so we get the real parent_id for proper tree placement —
    // the HTML parser doesn't have parent_id, so without this the inserter
    // can't tell where the comment belongs and it would be misplaced.
    if (pendingVerify.length > 0) {
        const unverified = pendingVerify.filter(d => !alreadyResolved.has(d.name))
        if (unverified.length > 0) {
            const looked = await lookupCommentsByIds(
                unverified.map(d => d.name),
                limiter,
            )
            for (const d of unverified) {
                const info = looked.get(d.name)
                if (!info?.removed) continue
                alreadyResolved.add(d.name)
                const rc = makeRecovered(d, subreddit)
                // Use the real parent_id from /api/info (the HTML parser doesn't
                // have it, so without this correction the comment would be
                // misplaced as a top-level comment).
                if (info.parent_id) rc.parent_id = info.parent_id
                onOtherFound?.(rc)
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
    onProgress({
        current: 0,
        total: 0,
        currentAuthor: username,
        status: 'searching',
        message: 'Fetching user profile...',
    })

    const sort = options?.sort || 'new'

    let cachedItems: any[]
    try {
        cachedItems = await fetchUserPageHTML(username, sort)
    } catch (err: any) {
        onProgress({
            current: 0,
            total: 0,
            currentAuthor: username,
            status: 'error',
            message: err.message?.includes('404') ? 'User not found.' : 'Could not fetch user profile.',
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

    console.log(`[reveddit scan] parsed ${cachedItems.length} items from user page for u/${username}`)

    onProgress({
        current: 0,
        total: cachedItems.length,
        currentAuthor: username,
        status: 'searching',
        message: `Checking removal status of ${cachedItems.length} items...`,
    })

    // Batch check via /api/info. Non-OAuth (OAuth shares one per-app rate-limit
    // bucket across all users). Routed by host like the user page: same-origin on
    // old.reddit.com, else through the background fetching old.reddit.com
    // unauthenticated (the DNR rule strips the fetch headers Reddit rejects).
    const ids = cachedItems.map(item => item.data.name)
    const liveItems: Map<string, any> = new Map()
    let children: any[]

    try {
        if (location.hostname === 'old.reddit.com') {
            // Unauthenticated old.reddit .json — dying endpoint, gated
            await throwIfLegacyDisabled('old.reddit.com api/info JSON')
            const infoUrl = `https://old.reddit.com/api/info.json?id=${ids.join(',')}&raw_json=1`
            const response = await fetch(infoUrl)
            console.log(`[reveddit scan] /api/info direct -> ${response.status}`)
            if (!response.ok) throw new Error(`status ${response.status}`)
            children = (await response.json())?.data?.children || []
        } else {
            children = await fetchApiInfoViaBackground(ids.join(','))
        }
    } catch (err: any) {
        console.log('[reveddit scan] /api/info failed:', err?.message || err)
        onProgress({
            current: 0,
            total: cachedItems.length,
            currentAuthor: username,
            status: 'error',
            message: 'Could not check removal status.',
        })
        return []
    }
    for (const child of children) {
        liveItems.set(child.data.name, child.data)
    }

    const results: ScanResult[] = []

    for (const item of cachedItems) {
        const cached = item.data
        const live = liveItems.get(cached.name)

        const cachedHasContent = cached.body && cached.body !== '[removed]' && cached.body !== '[deleted]'
        const cachedHasTitle = cached.title && cached.title !== '[removed]' && cached.title !== '[deleted]'

        if (!cachedHasContent && !cachedHasTitle) continue

        const liveIsRemoved = !live || (isComment(cached.name) ? isRemovedComment(live) : isRemovedPost(live))

        if (liveIsRemoved) {
            results.push({
                id: cached.name,
                type: cached.name.startsWith('t1_') ? 'comment' : 'post',
                subreddit: cached.subreddit || '',
                body: cached.body,
                body_html: cached.body_html,
                title: cached.title,
                link_title: cached.link_title,
                created_utc: cached.created_utc || 0,
                score: cached.score,
                permalink: cached.permalink || '',
                parent_id: cached.parent_id,
                link_id: cached.link_id,
            })
        }
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

// A comment fetched by id from /api/info (logged-out). `removed` means its public
// body is a [removed]/[deleted] tombstone (real content is not available here).
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

// Batched, rate-limited /api/info lookup of comments by fullname.
export async function lookupCommentsByIds(ids: string[], limiter: RateLimiter): Promise<Map<string, LookedUpComment>> {
    const out = new Map<string, LookedUpComment>()
    for (let i = 0; i < ids.length; i += 100) {
        const batch = ids.slice(i, i + 100)
        let children: any[]
        try {
            children = await limiter.schedule(() => fetchApiInfoViaBackground(batch.join(',')))
        } catch {
            continue
        }
        for (const child of children || []) {
            const d = child?.data
            if (!d || child.kind !== 't1') continue
            const b = (d.body || '').replace(/\\/g, '')
            out.set(d.name, {
                id: d.name,
                parent_id: d.parent_id || '',
                link_id: d.link_id || '',
                author: d.author || '',
                body: d.body || '',
                body_html: d.body_html || '',
                created_utc: d.created_utc || 0,
                permalink: d.permalink || '',
                subreddit: d.subreddit || '',
                removed: b === '[removed]' || b === '[deleted]',
            })
        }
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
            // A removed comment that IS present in the view (has a tombstone) —
            // its removal is already confirmed, no need to re-verify via /api/info.
            tombstoneIds.add(node.id)
        }
    }
    return { candidateAuthors: authors, visibleRealIds, tombstoneIds }
}

function getOldRedditNumComments(): number {
    const el = document.querySelector(
        '#siteTable .thing[data-comments-count], .linklisting .thing[data-comments-count]',
    )
    const n = parseInt(el?.getAttribute('data-comments-count') || '', 10)
    return Number.isFinite(n) ? n : 0
}

function getOldRedditPostCreatedUtc(): number {
    const dt = document.querySelector('#siteTable .thing .tagline time')?.getAttribute('datetime')
    return dt ? Math.floor(new Date(dt).getTime() / 1000) : 0
}

export async function scanThreadForRemovedComments(
    threadPostId: string,
    subreddit: string,
    isNewReddit: boolean,
    authorCache: Map<string, any[]>,
    onProgress: ProgressCallback,
    onComment?: RecoveredCommentCallback,
): Promise<RecoveredComment[]> {
    let candidateAuthors: string[]
    let visibleRealIds: Set<string>
    let tombstoneIds: Set<string>
    let postAuthor: string
    let numComments: number
    let postCreatedUtc: number

    try {
        if (isNewReddit) {
            const jsonData = await fetchThreadJSON(threadPostId, subreddit)
            const parsed = extractCommentTree_fromJSON(jsonData)
            const post = jsonData?.[0]?.data?.children?.[0]?.data
            postAuthor = parsed.postAuthor
            numComments = post?.num_comments ?? 0
            postCreatedUtc = post?.created_utc ?? 0
            ;({ candidateAuthors, visibleRealIds, tombstoneIds } = summarizeThreadTree(parsed.map))
        } else {
            const treeMap = extractCommentTree_oldReddit(threadPostId)
            postAuthor = document.querySelector('.link .top-matter .author')?.textContent?.trim() || ''
            numComments = getOldRedditNumComments()
            postCreatedUtc = getOldRedditPostCreatedUtc()
            ;({ candidateAuthors, visibleRealIds, tombstoneIds } = summarizeThreadTree(treeMap))
        }
    } catch {
        onProgress({
            current: 0,
            total: 0,
            currentAuthor: '',
            status: 'error',
            message: 'Could not load comment tree.',
        })
        return []
    }

    // num_comments includes removed comments, so (total − visible) is how many
    // are missing. If nothing's missing there's nothing to scan for.
    const missingCount = Math.max(0, numComments - visibleRealIds.size)
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
    const limiter = new RateLimiter(RESTORE_DELAY_MS)
    const recovered: RecoveredComment[] = []
    const recoveredIds = new Set<string>()
    let searched = 0

    const recordRecovery = (d: any, sourceAuthor: string) => {
        const rc: RecoveredComment = {
            id: d.name,
            parent_id: d.parent_id || threadPostId,
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
                items = await limiter.schedule(() => fetchUserPage(author, sort, t))
                authorCache.set(author, items)
            }
        } catch (err: any) {
            if (err.message === 'Cancelled') break
            if (err.message?.includes('429') || err.message?.includes('403')) {
                await setRateLimitCooldown()
                break
            }
            continue
        }

        // This author's comments in this thread that aren't already shown. A
        // tombstone confirms removal; anything else is only "missing from this
        // view" until /api/info confirms it's actually removed (it may simply
        // not be loaded here, e.g. a single-comment-thread view).
        const threadComments = items.filter(i => i?.data && i.kind === 't1' && i.data.link_id === threadPostId)
        console.log(`[reveddit scan] u/${author}: ${items.length} items, ${threadComments.length} in this thread`)
        const uncertain: any[] = []
        for (const item of threadComments) {
            const d = item.data
            if (visibleRealIds.has(d.name) || recoveredIds.has(d.name)) continue
            if (tombstoneIds.has(d.name)) {
                console.log(`[reveddit scan]   ${d.name} → tombstone match, recovering`)
                recordRecovery(d, author)
            } else {
                console.log(`[reveddit scan]   ${d.name} → not in tree, queuing for /api/info verify`)
                uncertain.push(d)
            }
        }
        if (uncertain.length) {
            const looked = await lookupCommentsByIds(
                uncertain.map(d => d.name),
                limiter,
            )
            const confirmedCount = [...looked.values()].filter(c => c.removed).length
            console.log(`[reveddit scan]   /api/info verified ${confirmedCount}/${uncertain.length} as removed`)
            for (const d of uncertain) {
                const info = looked.get(d.name)
                if (!info?.removed) continue
                // Use real parent_id from /api/info (HTML parser doesn't have it)
                if (info.parent_id) d.parent_id = info.parent_id
                recordRecovery(d, author)
            }
        }
    }

    const unsearched = candidates.length - searched
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
