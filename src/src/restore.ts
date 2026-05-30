import { isRemovedComment, isRemovedPost, isComment } from './common'

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

export interface ThreadScanResult {
    commentId: string
    result: RestoreResult
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

export function extractCommentTree_oldReddit(postFullname: string): Map<string, CommentTreeNode> {
    const map = new Map<string, CommentTreeNode>()
    const commentEls = document.querySelectorAll('.commentarea .thing.comment')

    for (const el of Array.from(commentEls)) {
        const id = el.getAttribute('data-fullname')
        const author = el.getAttribute('data-author') || ''
        if (!id) continue

        const parentEl = el.parentElement?.closest('.thing.comment')
        const parent_id = parentEl?.getAttribute('data-fullname') || postFullname

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

export async function fetchUserPage(
    author: string,
    sort: string = 'new',
    t: string = '',
    after?: string,
    before?: string,
): Promise<any[]> {
    const params = new URLSearchParams({
        sort,
        limit: '100',
        raw_json: '1',
    })
    if (t) params.set('t', t)
    if (after) params.set('after', after)
    if (before) params.set('before', before)

    const url = `https://old.reddit.com/user/${encodeURIComponent(author)}.json?${params}`
    const response = await fetch(url, { credentials: 'omit' })
    if (!response.ok) {
        throw new Error(`User page fetch failed: ${response.status}`)
    }
    const data = await response.json()
    if (data?.data?.children) {
        return data.data.children
    }
    return []
}

// --- User page via HTML ---
// The unauthenticated .json user page is 403'd, but Reddit still serves the
// HTML user page unauthenticated WITH removed bodies. Fetch + parse that.
export async function fetchUserPageHTML(username: string, sort = 'new'): Promise<any[]> {
    const qs = sort && sort !== 'new' ? `?sort=${encodeURIComponent(sort)}` : ''
    const url = `https://old.reddit.com/user/${encodeURIComponent(username)}${qs}`
    const response = await fetch(url, { credentials: 'omit' })
    if (!response.ok) throw new Error(`User page fetch failed: ${response.status}`)
    return parseUserPageHTML(await response.text())
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
            data: {
                name,
                author: el.getAttribute('data-author') || '',
                subreddit: el.getAttribute('data-subreddit') || '',
                body: bodyEl ? (bodyEl.textContent || '').trim() : undefined,
                body_html: bodyEl ? bodyEl.innerHTML : undefined,
                title: !isCommentItem && titleEl ? (titleEl.textContent || '').trim() : undefined,
                created_utc: datetime ? Math.floor(new Date(datetime).getTime() / 1000) : 0,
                score: scoreEl?.getAttribute('title') ? parseInt(scoreEl.getAttribute('title')!, 10) || 0 : undefined,
                permalink,
                link_id,
            },
        })
    }
    return items
}

function findMatchingComment(
    userPageItems: any[],
    threadFullname: string,
    targetParentId: string,
): { author: string; body: string; body_html: string } | null {
    for (const item of userPageItems) {
        const d = item.data
        if (!d || item.kind !== 't1') continue
        if (d.link_id === threadFullname && d.parent_id === targetParentId) {
            return {
                author: d.author,
                body: d.body,
                body_html: d.body_html,
            }
        }
    }
    return null
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
    const response = await fetch(url, { credentials: 'omit' })
    if (!response.ok) {
        throw new Error(`Thread JSON fetch failed: ${response.status}`)
    }
    return response.json()
}

// --- Main Restore Function ---

export async function restoreComment(
    targetCommentId: string,
    threadPostId: string,
    subreddit: string,
    isNewReddit: boolean,
    onProgress: ProgressCallback,
    authorCache?: Map<string, any[]>,
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
    const candidates = getCandidateAuthors(targetCommentId, treeMap, postAuthor)

    if (candidates.length === 0) {
        onProgress({
            current: 0,
            total: 0,
            currentAuthor: '',
            status: 'not_found',
            message: 'No candidate authors found to search.',
        })
        return { found: false }
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

    for (let i = 0; i < candidates.length; i++) {
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
        onProgress({
            current: i + 1,
            total: candidates.length,
            currentAuthor: author,
            status: 'searching',
            message: `Checking u/${author}... (${i + 1}/${candidates.length})`,
        })

        try {
            let items: any[]
            if (authorCache?.has(author)) {
                items = authorCache.get(author)!
            } else {
                items = await limiter.schedule(() => fetchUserPage(author, sort, t))
                authorCache?.set(author, items)
            }
            const match = findMatchingComment(items, target.link_id, target.parent_id)
            if (match) {
                onProgress({
                    current: i + 1,
                    total: candidates.length,
                    currentAuthor: author,
                    status: 'found',
                    message: `Found comment by u/${match.author}`,
                })
                return {
                    found: true,
                    author: match.author,
                    body: match.body,
                    body_html: match.body_html,
                    sourceAuthor: author,
                }
            }
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
            // Other errors: skip this author, continue
        }
    }

    onProgress({
        current: candidates.length,
        total: candidates.length,
        currentAuthor: '',
        status: 'not_found',
        message: `Not found after checking ${candidates.length} users.`,
    })
    return { found: false }
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

    onProgress({
        current: 0,
        total: cachedItems.length,
        currentAuthor: username,
        status: 'searching',
        message: `Checking removal status of ${cachedItems.length} items...`,
    })

    // Batch check via /api/info. Use a plain (non-OAuth) request — OAuth shares
    // one per-app rate-limit bucket across all users, so it must be avoided.
    // NOTE: credentials:'omit' is intentionally NOT set — that flag is what
    // Reddit 403s; a same-origin request without it returns 200.
    const ids = cachedItems.map(item => item.data.name)
    const infoUrl = `https://old.reddit.com/api/info.json?id=${ids.join(',')}&raw_json=1`
    let liveItems: Map<string, any>

    try {
        const response = await fetch(infoUrl)
        if (!response.ok) {
            if (response.status === 429 || response.status === 403) {
                onProgress({
                    current: 0,
                    total: cachedItems.length,
                    currentAuthor: username,
                    status: 'rate_limited',
                    message: 'Rate limited by Reddit. Try again later.',
                })
                return []
            }
            throw new Error(`API info fetch failed: ${response.status}`)
        }
        const data = await response.json()
        liveItems = new Map()
        if (data?.data?.children) {
            for (const child of data.data.children) {
                liveItems.set(child.data.name, child.data)
            }
        }
    } catch {
        onProgress({
            current: 0,
            total: cachedItems.length,
            currentAuthor: username,
            status: 'error',
            message: 'Could not check removal status.',
        })
        return []
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

    return results
}

// --- Thread Scan (batch restore all removed) ---

export async function scanThreadForRemovedComments(
    threadPostId: string,
    subreddit: string,
    isNewReddit: boolean,
    authorCache: Map<string, any[]>,
    onProgress: ProgressCallback,
): Promise<ThreadScanResult[]> {
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
        return []
    }

    const { treeMap, postAuthor } = treeResult

    // Find all removed comments
    const removedComments: CommentTreeNode[] = []
    for (const node of treeMap.values()) {
        if (!validAuthor(node.author) || node.body?.startsWith('[')) {
            removedComments.push(node)
        }
    }

    if (removedComments.length === 0) {
        onProgress({
            current: 0,
            total: 0,
            currentAuthor: '',
            status: 'not_found',
            message: 'No removed comments found in thread.',
        })
        return []
    }

    // Collect all unique candidate authors across all removed comments
    const allCandidates: string[] = []
    const seen = new Set<string>()
    for (const removed of removedComments) {
        const candidates = getCandidateAuthors(removed.id, treeMap, postAuthor)
        for (const c of candidates) {
            if (!seen.has(c)) {
                seen.add(c)
                allCandidates.push(c)
            }
        }
    }

    const limiter = new RateLimiter(RESTORE_DELAY_MS)
    const results: ThreadScanResult[] = []
    const resolved = new Set<string>()
    let fetched = 0

    for (const author of allCandidates) {
        if (resolved.size === removedComments.length) break

        fetched++
        onProgress({
            current: fetched,
            total: allCandidates.length,
            currentAuthor: author,
            status: 'searching',
            message: `Checking u/${author}... (${fetched}/${allCandidates.length}, ${results.length} found)`,
        })

        let items: any[]
        try {
            if (authorCache.has(author)) {
                items = authorCache.get(author)!
            } else {
                const { sort, t } = getUserPageSort(removedComments[0].created_utc)
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

        // Check fetched items against all unresolved removed comments
        for (const removed of removedComments) {
            if (resolved.has(removed.id)) continue
            const match = findMatchingComment(items, removed.link_id, removed.parent_id)
            if (match) {
                resolved.add(removed.id)
                results.push({
                    commentId: removed.id,
                    result: {
                        found: true,
                        author: match.author,
                        body: match.body,
                        body_html: match.body_html,
                        sourceAuthor: author,
                    },
                })
            }
        }
    }

    onProgress({
        current: fetched,
        total: allCandidates.length,
        currentAuthor: '',
        status: results.length > 0 ? 'found' : 'not_found',
        message: `Scan complete: ${results.length}/${removedComments.length} restored.`,
    })

    return results
}
