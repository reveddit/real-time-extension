import { isRateLimitError } from './parse_html/common'
import { getRateLimitBackoffRemainingMs, getScanSettings } from './storage'
import browser from 'webextension-polyfill'

export interface RestoreProgress {
    // partial: it stopped short of everything, and another click goes on.
    // noted: it read all it could, and its message says what that leaves out.
    status: 'searching' | 'found' | 'not_found' | 'partial' | 'noted' | 'cancelled' | 'rate_limited' | 'error'
    message: string
    // A profile scan found this is the viewer's own profile
    own?: boolean
    // Comments on the page that need another sort, as on RestoreResult
    otherSorts?: boolean
    // A thread scan left nothing missing from the page's count
    nothingMissing?: boolean
}

export type ProgressCallback = (progress: RestoreProgress) => void

// --- Constants ---

// One refused read may be about that author, and one failure may be a blip. A few
// in a row aren't.
const MAX_FAILED_READS_IN_A_ROW = 3
// How long before a feed that used up its tries gets another, if a click asks
const RETRY_GIVEN_UP_MS = 5 * 60 * 1000
// Where the browser has no session storage, the turn and the cache mode the worker
// learned are only in its memory, which an idle 30 seconds ends. Asking again keeps
// it up, and sends nothing until the turn comes.
const LONGEST_WAIT_MS = 20 * 1000

// --- Rate Limiter ---

export class RateLimiter {
    private stillWanted: () => boolean
    private cancelled = false
    private endWait: () => void = () => {}

    // stillWanted: whether the page the scan belongs to is still showing
    constructor(stillWanted: () => boolean = () => true) {
        this.stillWanted = stillWanted
    }

    cancel() {
        this.cancelled = true
        this.endWait()
    }

    isCancelled() {
        return this.cancelled || !this.stillWanted()
    }

    // Throws when cancelled. A cancel ends the wait, so it takes the next read back
    // at once.
    async wait(ms = 0) {
        if (ms > 0 && !this.isCancelled()) {
            await new Promise<void>(resolve => {
                this.endWait = resolve
                setTimeout(resolve, ms)
            })
        }
        if (this.isCancelled()) throw new Error('Cancelled')
    }
}

// --- Reddit's feeds ---

// What a scan reads. A person's feed still has the comments moderators removed,
// with their text, and leaves out what the person deleted. A thread's feed shows
// a removed comment with replies as [deleted] and no author, and leaves out one
// without replies. A comment's feed has its parent, itself and its replies, and
// leaves it out the same way. No page or JSON listing shows a removed comment's
// text any more (verified 2026-11-04). Logged out, reddit allows one feed a
// minute, so these go through the background with the user's login.
async function fetchWithLogin(path: string, limiter: RateLimiter, secondTryMode?: number): Promise<string> {
    let res: any
    do {
        await limiter.wait(Math.min(res?.waitMs ?? 0, LONGEST_WAIT_MS))
        res = await browser.runtime.sendMessage({ action: 'fetch-with-login', path, secondTryMode })
    } while (res?.waitMs)
    console.log(`[reveddit scan] ${path} -> status ${res?.status ?? 'none'}`)
    if (res?.ok) return res.text
    throw Object.assign(new Error(`reddit request failed: ${res?.status ?? 'none'}`), {
        status: res?.status,
        needsLogin: res?.needsLogin,
        refused: res?.blockPage,
        otherMode: res?.otherMode,
        busy: res?.busy,
        resting: res?.resting,
        otherIdentity: res?.otherIdentity,
    })
}

// The removed comments a scan looks for are in here, and it's why a scan goes
// author by author. Comments only, so posts don't dilute the 100 per request.
export const authorFeedPath = (author: string, sort: string, t: string): string => {
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
// a while after the last recorded 429 (requests.ts scanTurnIn).
export async function monitoringBackoffGate(onProgress: ProgressCallback): Promise<boolean> {
    let backoffMs = 0
    try {
        backoffMs = await getRateLimitBackoffRemainingMs()
    } catch {
        /* storage unavailable — don't block the scan */
    }
    if (backoffMs > 0) {
        onProgress({
            status: 'rate_limited',
            message: RATE_LIMITED,
        })
        return false
    }
    return true
}

// --- One click's reads ---

// Why the next read would fare no better, whoever it's for. A refusal of status 0
// never went out: the website has turned scans off.
const endsScan = (err: any): boolean =>
    Boolean(
        err.needsLogin ||
        err.busy ||
        err.resting ||
        err.otherIdentity ||
        (err.refused && err.status === 0) ||
        isRateLimitError(err),
    )

// In pageReads: an address reddit has no feed for, and a read given up on
const NO_FEED: any[] = []
const GAVE_UP: any[] = []

// What one click reads: how much it may still send, what it couldn't read, and
// what ended it. A failed read isn't a finished one, so a caller can tell "read
// it all and found nothing" from "couldn't read it". Feeds it has read are kept
// in pageReads, if given, so the next click goes on from there. A read with no
// answer gets one more try on the next click, then the scan moves past it, so
// no click is promised work it can't do. Once nothing else is left it gets a last
// try, so a feed that never answers can't keep clicks reading it, and the scan says
// what it couldn't read. That isn't finished, so the buttons stay, and a click a
// while later tries again. Reddit's own 403 is the exception: it's a final answer, so
// it isn't a failure in a row, and no click asks that feed again.
export class ScanReads {
    // Left for the next click
    unread = 0
    failure: any
    // The requests this click may send (options). The next click goes on.
    readonly budget: number
    private left: number
    private failedInARow = 0
    // Tried on two clicks, with no answer, among those this click came to
    private givenUp = new Set<string>()
    private refusedInBothModes = false
    private limiter: RateLimiter
    private pageReads: Map<string, any[]>

    constructor(limiter: RateLimiter, budget: number, pageReads = new Map<string, any[]>()) {
        this.limiter = limiter
        this.budget = budget
        this.left = budget
        this.pageReads = pageReads
    }

    static async forClick(limiter: RateLimiter, pageReads?: Map<string, any[]>) {
        const { readsPerClick } = await getScanSettings()
        return new ScanReads(limiter, readsPerClick, pageReads)
    }

    get stopped(): boolean {
        return Boolean(this.failure) || this.limiter.isCancelled()
    }

    get gaveUp(): number {
        return this.givenUp.size
    }

    has(path: string): boolean {
        return this.pageReads.has(path)
    }

    // keep: how many of the click's reads to leave for later
    canRead(path: string, keep = 0): boolean {
        return this.left > keep || this.has(path)
    }

    // final: reddit's own answer, which no other click would change
    noAnswer(path: string, final = false) {
        const tried = `tried ${path}`
        if (final) this.pageReads.set(`retried ${path}`, [Infinity])
        if (final || this.pageReads.has(tried)) {
            this.pageReads.set(path, GAVE_UP)
            this.givenUp.add(path)
        } else {
            this.pageReads.set(tried, NO_FEED)
            this.pageReads.delete(path)
            this.unread++
        }
    }

    private retryGivenUp(): number {
        let retrying = 0
        for (const path of this.givenUp) {
            const retried = `retried ${path}`
            const [lastTry = 0] = this.pageReads.get(retried) ?? []
            if (Date.now() - lastTry < RETRY_GIVEN_UP_MS) continue
            this.pageReads.delete(path)
            this.pageReads.set(retried, [Date.now()])
            retrying++
        }
        return retrying
    }

    // How a click ended, once nothing stopped it. retrying: feeds the next click
    // will try again. stuck: all that's left is what it couldn't read.
    settle() {
        const retrying = this.unread ? 0 : this.retryGivenUp()
        return { retrying, stuck: !this.unread && !retrying && this.gaveUp > 0 }
    }

    // One request, and after a block page a second try, if the click has room and
    // hasn't already seen both tries refused. Once the click's reads are spent,
    // nothing goes out, not even what a scan can't go on without: the next click
    // sends it.
    async text(path: string): Promise<string> {
        if (this.left <= 0) throw Object.assign(new Error("this click's reads ran out"), { outOfReads: true })
        this.left--
        try {
            return await fetchWithLogin(path, this.limiter)
        } catch (err: any) {
            if (err.otherMode === undefined || this.refusedInBothModes) throw err
            // Only the click's reads ran out, so the second try is the next click's
            if (this.left <= 0) throw Object.assign(err, { outOfReads: true })
            this.left--
            return fetchWithLogin(path, this.limiter, err.otherMode).catch(second => {
                this.refusedInBothModes ||= Boolean(second.refused)
                throw second
            })
        }
    }

    // What a scan can't go on without: kept like the rest, but a failure is thrown
    // for the scan to report
    async needed(path: string, itemsOf: (text: string) => any[] = parseFeed): Promise<any[]> {
        const items = this.pageReads.get(path) ?? itemsOf(await this.text(path))
        this.pageReads.set(path, items)
        return items
    }

    // Undefined when there's nothing to go on: it wasn't read, or reddit said
    // there's no such feed, which is an answer and isn't counted as unread
    async feed(path: string): Promise<any[] | undefined> {
        const kept = this.pageReads.get(path)
        if (kept === GAVE_UP) this.givenUp.add(path)
        if (kept === GAVE_UP || kept === NO_FEED) {
            this.failedInARow = 0
            return undefined
        }
        try {
            const items = await this.needed(path)
            this.failedInARow = 0
            return items
        } catch (err: any) {
            if (this.limiter.isCancelled()) return undefined
            if (err.status === 404) {
                this.failedInARow = 0
                this.pageReads.set(path, NO_FEED)
                return undefined
            }
            // Not tried in both modes, so not a failure: the next click reads it whole
            if (err.outOfReads) {
                this.unread++
                return undefined
            }
            if (endsScan(err)) {
                this.unread++
                this.failure = err
                return undefined
            }
            const final = err.status === 403 && !err.refused
            this.noAnswer(path, final)
            if (final) this.failedInARow = 0
            else if (++this.failedInARow >= MAX_FAILED_READS_IN_A_ROW) this.failure = err
            return undefined
        }
    }
}

export const scanFailure = (err: any, otherwise: string): string => {
    if (err.needsLogin) return 'Sign in to Reddit to scan. Logged out, it allows one request a minute.'
    if (err.busy) return 'A second account is signing in. Try again in a moment.'
    if (err.otherIdentity) return "Scans need a regular window: here they'd read as your regular windows' account."
    if (err.resting || isRateLimitError(err)) return RATE_LIMITED
    if (err.outOfReads) return "This click's reads ran out; scan again to go on."
    if (err.refused) return 'Reddit is refusing the feeds a scan reads. Try again later.'
    return otherwise
}
export const COULD_NOT_READ = "Couldn't read reddit's feeds. Try again."

// A comment read through its own feed. `removed` means it's a [deleted] tombstone
// there, or left out, so its text isn't available from it.
interface LookedUpComment {
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

export const commentFeedPath = ({ name, link_id }: { name: string; link_id: string }): string =>
    `/comments/${link_id.replace(/^t3_/, '')}/_/${name.replace(/^t1_/, '')}/.rss?context=1`

// One request per comment, as far as the click's reads go, and the rest count as
// unread. A failed read leaves its comment out, and reads says why, so a comment
// that wasn't read can't pass for one that's live.
export async function lookupCommentsByIds(
    comments: { name: string; link_id: string }[],
    reads: ScanReads,
): Promise<Map<string, LookedUpComment>> {
    const looked = new Map<string, LookedUpComment>()
    for (const { name, link_id } of comments) {
        if (reads.stopped) break
        const path = commentFeedPath({ name, link_id })
        if (!reads.canRead(path)) {
            reads.unread++
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
    return looked
}
