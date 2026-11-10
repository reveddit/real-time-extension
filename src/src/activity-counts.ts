// What the extension did in the browser, an hour at a time, for the log people
// copy into a report: how often Reddit changed its cookies, how often the copy
// of them was saved, and how much was written to storage. Survey reports of lag
// came down to work done for each of Reddit's answers (2026-11-09). The
// background counts, and the check cycle writes the line (monitoring.ts), as
// the cycle's lines are the log's record.
import { dlog } from './diaglog'
import { isFresh, workerSession } from './logged-in-fetch'

const HOUR_MS = 60 * 60 * 1000
// Kept in session storage, as Chrome's worker stops between events: a couple of
// seconds after the last count, while the worker lives on (30 s past its last
// event), and at least once a minute while counts keep coming. A write for
// every count would add to what it counts. Firefox's background page keeps them
// in memory.
const KEY = 'activity_counts'
const KEEP_EVERY_MS = 60 * 1000
const KEEP_AFTER_MS = 2000

interface Counts {
    since: number
    cookieChanges: number
    saves: number
    kb: number
}
const fresh = (): Counts => ({ since: Date.now(), cookieChanges: 0, saves: 0, kb: 0 })
let counts = fresh()
let keptAt = -Infinity
let keepLater: ReturnType<typeof setTimeout> | undefined
let loaded: Promise<void> | undefined
const load = () =>
    (loaded ??= (async () => {
        const stored = (
            await workerSession()
                ?.get(KEY)
                .catch(() => undefined)
        )?.[KEY] as Partial<Counts> | undefined
        if (typeof stored?.since === 'number') counts = { ...fresh(), ...stored }
    })())
const keep = (now: number) => {
    clearTimeout(keepLater)
    keepLater = undefined
    keptAt = now
    workerSession()
        ?.set({ [KEY]: counts })
        .catch(() => {})
}
const add = (field: 'cookieChanges' | 'saves' | 'kb', n: number) =>
    load().then(() => {
        counts[field] += n
        if (!workerSession()) return
        const now = Date.now()
        if (!isFresh(keptAt, KEEP_EVERY_MS, now)) {
            keep(now)
            return
        }
        clearTimeout(keepLater)
        keepLater = setTimeout(() => keep(Date.now()), KEEP_AFTER_MS)
    })

export const countCookieChange = () => add('cookieChanges', 1)
export const countCookieSave = () => add('saves', 1)

// Every write reaches the background's listener, the extension pages' writes
// too. The counts' own write isn't counted.
export const countStorageWrites = (changes: Record<string, { newValue?: unknown }>) => {
    let chars = 0
    for (const [key, change] of Object.entries(changes)) {
        if (key !== KEY && change.newValue !== undefined) chars += JSON.stringify(change.newValue).length
    }
    if (chars) add('kb', chars / 1024)
}

// At each check: the counts, once an hour has passed since they started
export const logActivityHourly = () =>
    load().then(() => {
        const now = Date.now()
        if (isFresh(counts.since, HOUR_MS, now)) return
        const { since, cookieChanges, saves, kb } = counts
        counts = fresh()
        keep(now)
        if (!cookieChanges && !saves && !kb) return
        dlog(
            'cycle',
            `[reveddit] activity since ${new Date(since).toISOString().slice(0, 16)}Z: Reddit cookie changes ${cookieChanges}, cookie copies saved ${saves}, storage written ${Math.round(kb)} KB`,
        )
    })

export const _resetActivityCounts = () => {
    clearTimeout(keepLater)
    keepLater = undefined
    counts = fresh()
    keptAt = -Infinity
    loaded = undefined
}
