import { isPlaceholderText, isRemovedByCategory, isRemovedInModView, isRemovedPost } from './common'
import {
    type ProgressCallback,
    RateLimiter,
    ScanReads,
    lookupCommentsByIds,
    monitoringBackoffGate,
    scanFailure,
} from './scan-reads'

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
    // The first comment and post on the page, for the tab that page's anchor isn't from
    firstOnPage?: { t1?: string; t3?: string }
    // Reddit shows an author their own removed comments as live, so a scan of
    // one's own profile can only say anything about posts
    ownProfile?: boolean
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
        status: 'searching',
        message: 'Fetching user profile...',
    })

    const reads = await ScanReads.forClick(limiter, pageReads)
    const user = encodeURIComponent(username)
    // The page's own list. Feeds take these as listings do, but a tab ignores an
    // anchor that's the other tab's (reddit.md), so that tab goes from the page's
    // first of its own. A page with none of them reads that tab from the top.
    const { t, after, before, firstOnPage } = options ?? {}
    const queryWith = (more: Record<string, string> = {}) =>
        new URLSearchParams({ sort: options?.sort || 'new', limit: '100', ...(t && { t }), ...more })
    const startOf = async (tab: string, kind: string): Promise<Record<string, string>> => {
        if (after?.startsWith(kind)) return { after }
        if (before?.startsWith(kind)) return { before }
        const first = (after || before) && firstOnPage?.[kind as 't1' | 't3']
        if (!first) return {}
        // after leaves its anchor out, and the first may be the one that's removed
        const query = queryWith({ limit: '1', before: first })
        const [above] = await reads.needed(`/user/${user}/${tab}/.rss?${query}`)
        return above ? { after: above.data.name } : {}
    }
    const cachedItems: any[] = []
    // What reddit still lists: not removed comments, but removed posts, marked
    const liveItems = new Map<string, any>()

    try {
        for (const [tab, kind] of [
            ['comments', 't1'],
            ['submitted', 't3'],
        ] as const) {
            const query = queryWith(await startOf(tab, kind))
            cachedItems.push(...(await reads.needed(`/user/${user}/${tab}/.rss?${query}`)))
            const children = await reads.needed(
                `/user/${user}/${tab}.json?${query}`,
                text => JSON.parse(text)?.data?.children || [],
            )
            for (const child of children) {
                liveItems.set(child.data.name, child.data)
            }
        }
    } catch (err: any) {
        const stopped = limiter.isCancelled()
        onProgress({
            // Only the click's reads ran out: the next click goes on
            status: stopped ? 'cancelled' : err.outOfReads ? 'partial' : 'error',
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
            status: 'not_found',
            message: 'No items found on user profile.',
        })
        return []
    }

    console.log(`[reveddit scan] read ${cachedItems.length} items from u/${username}'s feeds`)

    onProgress({
        status: 'searching',
        message: `Checking removal status of ${cachedItems.length} items...`,
    })

    // A comment the listing leaves out may only be in a subreddit they hid. An
    // author's own listing and feeds show their removed comments as live.
    const unlisted = cachedItems.filter(item => item.kind === 't1' && !liveItems.has(item.data.name))
    const looked = await lookupCommentsByIds(
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

        const cachedHasContent = cached.body && !isPlaceholderText(cached.body)
        const cachedHasTitle = cached.title && !isPlaceholderText(cached.title)
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
    // Every comment listed is how a profile looks to its own author, and the
    // stored name may be empty or out of date. Undefined: reddit didn't say.
    const own = options?.ownProfile || (unlisted.length === 0 ? await isSignedInAs(username, reads) : false)
    if (limiter.isCancelled()) {
        onProgress({ status: 'cancelled', message: `Scan cancelled. ${found}`.trim() })
        return results
    }
    if (reads.failure) {
        const why = scanFailure(reads.failure, 'Could not check removal status.')
        onProgress({ status: 'error', message: `${why} ${found}`.trim() })
        return results
    }
    const unread = reads.unread
    const notes = [
        unread > 0 && `${unread} comment(s) not checked yet; scan again to go on.`,
        reads.gaveUp > 0 && `${reads.gaveUp} comment(s) couldn't be checked.`,
        own && "Reddit shows you your own comments as live, so a scan can't check them.",
        own === undefined &&
            "If this is your own profile, a scan can't check its comments: Reddit shows them to you as live.",
    ].filter(Boolean)
    const nothing = own ? 'No removed posts found.' : `No removed items found${unread ? ' so far' : ''}.`
    onProgress({
        own: Boolean(own),
        status: unread > 0 ? 'partial' : notes.length ? 'noted' : results.length > 0 ? 'found' : 'not_found',
        message: [found || nothing, ...notes].join(' '),
    })
    return results
}

// Not getLoggedinUserDetailed: this read takes its turn with the scan's others
const isSignedInAs = async (username: string, reads: ScanReads): Promise<boolean | undefined> => {
    const path = '/api/me.json'
    if (!reads.canRead(path)) return undefined
    try {
        const me = JSON.parse(await reads.text(path))
        return String(me?.data?.name).toLowerCase() === username.toLowerCase()
    } catch {
        return undefined
    }
}
