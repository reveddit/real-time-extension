// Persistent diagnostic log: the always-on, user-copyable successor to the
// dev-only __devLog ring buffer in background.ts. dlog() mirrors what the
// service-worker console already shows (every call also console.logs the same
// line) while keeping a bounded buffer the options page can copy — so a report
// like issue #14 ("zero detections, no visible error") doesn't require walking
// the reporter through chrome://extensions and DevTools.
//
// Nothing here is ever transmitted: the buffers live in storage.local and only
// leave the machine when the user copies them themselves. That keeps this out
// of data-collection territory for store privacy disclosures.
//
// Contexts: dlog is safe to call anywhere (content scripts, options, popup),
// but only the background/service-worker context persists — it alone calls
// initDiagPersistence(). Other contexts just get the console.log mirror and a
// small in-memory ring that dies with the page, which avoids concurrent
// read-modify-write clobbering of the stored buffers.
//
// Two tiers (added 0.0.5.22). A single 600-entry ring filled up with per-item
// verification lines within an hour or two, so a pasted log rarely showed
// what the extension had been doing over a day. Now:
// - summary: cycle boundaries, per-cycle outcome lines, login detection,
//   rate-limit decisions, news fetches and user actions. Retained by TIME
//   (SUMMARY_RETENTION_HOURS) in hourly storage chunks, so at the default
//   one-minute cadence a copied log still spans a day and a half, and each
//   flush rewrites only the current hour's chunk rather than the whole
//   history (a single growing buffer would have meant hundreds of MB of
//   storage writes per day).
// - detail: per-item verification verdicts, tiebreak results, bridge
//   refusals. High volume, small count cap, so it only ever shows the recent
//   past, and it can no longer evict the history.
// The tier is chosen by area (SUMMARY_AREAS); a per-cycle line in a detail
// area opts in with dlogSummary(). Everything is still local-only and copied
// by hand from the options page.
import browser from 'webextension-polyfill'

export type DiagArea =
    | 'cycle' // checkForChanges boundaries and skips
    | 'auth' // logged-in-user detection
    | 'feed' // public-profile lookup
    | 'verify' // feed-absent page verification
    | 'legacy' // legacy-reddit tiebreak paths
    | 'ratelimit' // 429 hits and backoff decisions
    | 'bridge' // website bridge requests (refusals and failures)
    | 'news' // remote news/mechanism fetches
    | 'ui' // user-initiated actions (manual check, clear)

export interface DiagEntry {
    t: number // epoch ms
    a: DiagArea
    m: string // exactly what console.log printed
    d?: string // optional JSON payload, truncated
}

export type DiagTier = 'summary' | 'detail'

// Areas whose every line is low-volume, per-cycle history.
export const SUMMARY_AREAS: ReadonlySet<DiagArea> = new Set<DiagArea>([
    'cycle',
    'auth',
    'feed',
    'ratelimit',
    'news',
    'ui',
])

// Detail tier: the recent past, per item. One ring, one key.
export const DIAG_LOG_KEY = 'diag_log_v1'
export const DIAG_MAX_ENTRIES = 600
// Serialized-size backstop so the ring can't crowd storage.local even if
// entries run long (storage.local quota is shared with verdict caches etc.).
export const DIAG_MAX_BYTES = 128 * 1024

// Summary tier: hourly chunks under DIAG_SUMMARY_LOG_KEY + '_' + hourIndex,
// kept for SUMMARY_RETENTION_HOURS. The count cap is a memory backstop only;
// at three or four ~150-byte lines per one-minute cycle, 36 hours is ~8000
// entries and ~1.2 MB across chunks.
export const DIAG_SUMMARY_LOG_KEY = 'diag_summary_v2'
export const SUMMARY_CHUNK_MS = 60 * 60 * 1000
export const SUMMARY_RETENTION_HOURS = 36
export const DIAG_SUMMARY_MAX_ENTRIES = 12000

export const DIAG_MAX_DATA_CHARS = 500
const FLUSH_DELAY_MS = 2000

let details: DiagEntry[] = []
let detailsDirty = false
let summaries: DiagEntry[] = []
const dirtySummaryChunks = new Set<string>()
let persistEnabled = false
let loadPromise: Promise<void> | null = null
let flushTimer: ReturnType<typeof setTimeout> | null = null

const hourIndex = (t: number) => Math.floor(t / SUMMARY_CHUNK_MS)
export const summaryChunkKey = (t: number) => `${DIAG_SUMMARY_LOG_KEY}_${hourIndex(t)}`

// The chunk keys covering the retention window ending now.
const retainedChunkKeys = (now: number): string[] => {
    const keys: string[] = []
    const last = hourIndex(now)
    for (let h = last - SUMMARY_RETENTION_HOURS + 1; h <= last; h++) {
        keys.push(`${DIAG_SUMMARY_LOG_KEY}_${h}`)
    }
    return keys
}

// Keys just outside the window: removed on flush so storage never accumulates
// stale hours (bounded lookback, since removal is idempotent).
const expiredChunkKeys = (now: number): string[] => {
    const keys: string[] = []
    const oldestKept = hourIndex(now) - SUMMARY_RETENTION_HOURS + 1
    for (let h = oldestKept - 24; h < oldestKept; h++) {
        keys.push(`${DIAG_SUMMARY_LOG_KEY}_${h}`)
    }
    return keys
}

const pruneSummaries = (list: DiagEntry[], now: number): DiagEntry[] => {
    const cutoff = (hourIndex(now) - SUMMARY_RETENTION_HOURS + 1) * SUMMARY_CHUNK_MS
    let kept = list.filter(e => e.t >= cutoff)
    if (kept.length > DIAG_SUMMARY_MAX_ENTRIES) {
        kept = kept.slice(kept.length - DIAG_SUMMARY_MAX_ENTRIES)
    }
    return kept
}

const trimToLimits = (list: DiagEntry[], maxEntries: number, maxBytes: number): DiagEntry[] => {
    let trimmed = list.length > maxEntries ? list.slice(list.length - maxEntries) : list
    // Rare path: only engages when entries are unusually large on average.
    while (trimmed.length > 1 && JSON.stringify(trimmed).length > maxBytes) {
        trimmed = trimmed.slice(Math.max(1, Math.floor(trimmed.length / 10)))
    }
    return trimmed
}

const trimDetails = (list: DiagEntry[]) => trimToLimits(list, DIAG_MAX_ENTRIES, DIAG_MAX_BYTES)

// Writes only what changed: the detail ring if it did, and the hourly summary
// chunks that received lines. Also drops chunks that aged out of retention.
const flushNow = (): Promise<void> => {
    const now = Date.now()
    const writes: Record<string, DiagEntry[]> = {}
    if (detailsDirty) {
        writes[DIAG_LOG_KEY] = details
        detailsDirty = false
    }
    if (dirtySummaryChunks.size) {
        const byKey: Record<string, DiagEntry[]> = {}
        for (const e of summaries) {
            const key = summaryChunkKey(e.t)
            if (dirtySummaryChunks.has(key)) {
                ;(byKey[key] = byKey[key] || []).push(e)
            }
        }
        for (const key of dirtySummaryChunks) {
            writes[key] = byKey[key] || []
        }
        dirtySummaryChunks.clear()
    }
    const ops: Promise<unknown>[] = []
    if (Object.keys(writes).length) {
        ops.push(browser.storage.local.set(writes))
    }
    ops.push(browser.storage.local.remove(expiredChunkKeys(now)))
    return Promise.all(ops)
        .then(() => {})
        .catch(() => {})
}

const scheduleFlush = () => {
    if (!persistEnabled || flushTimer) {
        return
    }
    flushTimer = setTimeout(() => {
        flushTimer = null
        flushNow()
    }, FLUSH_DELAY_MS)
}

// Background/service-worker only. Loads the stored buffers and prepends them
// to anything dlog'd during this session before the load finished.
export const initDiagPersistence = (): Promise<void> => {
    if (loadPromise) {
        return loadPromise
    }
    persistEnabled = true
    const now = Date.now()
    const chunkKeys = retainedChunkKeys(now)
    const defaults: Record<string, DiagEntry[]> = { [DIAG_LOG_KEY]: [] }
    for (const key of chunkKeys) {
        defaults[key] = []
    }
    loadPromise = browser.storage.local
        .get(defaults)
        .then((r: any) => {
            const storedDetails = Array.isArray(r[DIAG_LOG_KEY]) ? (r[DIAG_LOG_KEY] as DiagEntry[]) : []
            const storedSummaries: DiagEntry[] = []
            for (const key of chunkKeys) {
                if (Array.isArray(r[key])) {
                    storedSummaries.push(...(r[key] as DiagEntry[]))
                }
            }
            details = trimDetails([...storedDetails, ...details])
            detailsDirty = detailsDirty || details.length !== storedDetails.length
            // Lines logged before the load finished belong to chunks that must
            // be rewritten with the stored ones merged in.
            for (const e of summaries) {
                dirtySummaryChunks.add(summaryChunkKey(e.t))
            }
            summaries = pruneSummaries([...storedSummaries, ...summaries], now)
            if (dirtySummaryChunks.size || detailsDirty) {
                scheduleFlush()
            }
        })
        .catch(() => {})
    return loadPromise
}

const record = (tier: DiagTier, area: DiagArea, message: string, data?: unknown): void => {
    // Mirror to the console with identical text, so existing "open the service
    // worker console" instructions keep showing the same lines.
    if (data === undefined) {
        console.log(message)
    } else {
        console.log(message, data)
    }
    const entry: DiagEntry = { t: Date.now(), a: area, m: message }
    if (data !== undefined) {
        try {
            const serialized = typeof data === 'string' ? data : JSON.stringify(data)
            entry.d =
                serialized.length > DIAG_MAX_DATA_CHARS ? serialized.slice(0, DIAG_MAX_DATA_CHARS) + '…' : serialized
        } catch {
            entry.d = String(data)
        }
    }
    if (tier === 'summary') {
        summaries.push(entry)
        summaries = pruneSummaries(summaries, entry.t)
        dirtySummaryChunks.add(summaryChunkKey(entry.t))
    } else {
        details.push(entry)
        details = trimDetails(details)
        detailsDirty = true
    }
    scheduleFlush()
}

// Tier by area: summary areas keep history, everything else is detail.
export const dlog = (area: DiagArea, message: string, data?: unknown): void =>
    record(SUMMARY_AREAS.has(area) ? 'summary' : 'detail', area, message, data)

// A per-cycle line living in a detail area (e.g. the verify/legacy roll-ups)
// opts into the summary tier so it survives the per-item churn.
export const dlogSummary = (area: DiagArea, message: string, data?: unknown): void =>
    record('summary', area, message, data)

export const getDiagTiers = async (): Promise<{ summary: DiagEntry[]; details: DiagEntry[] }> => {
    if (loadPromise) {
        await loadPromise
    }
    return { summary: summaries.slice(), details: details.slice() }
}

// Both tiers merged in time order (back-compat for callers and tests that
// only care about content).
export const getDiagEntries = async (): Promise<DiagEntry[]> => {
    const tiers = await getDiagTiers()
    return [...tiers.summary, ...tiers.details].sort((a, b) => a.t - b.t)
}

export const clearDiagLog = async (): Promise<void> => {
    details = []
    detailsDirty = false
    summaries = []
    dirtySummaryChunks.clear()
    // Nothing stored is worth loading after a clear; a later
    // initDiagPersistence() (tests, or a context that inits late) starts fresh.
    loadPromise = null
    if (flushTimer) {
        clearTimeout(flushTimer)
        flushTimer = null
    }
    try {
        const now = Date.now()
        await browser.storage.local.remove([DIAG_LOG_KEY, ...retainedChunkKeys(now), ...expiredChunkKeys(now)])
    } catch {
        /* ignored */
    }
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const renderEntry = (e: DiagEntry) =>
    `${new Date(e.t).toISOString()} [${e.a}] ${e.m}${e.d !== undefined ? ` | ${e.d}` : ''}`

const redact = (text: string, redactNames: string[]): string => {
    let out = text
    for (const name of redactNames) {
        if (!name) {
            continue
        }
        out = out.replace(new RegExp(escapeRegExp(name), 'gi'), '────')
    }
    return out
}

// Pure formatter, unit-tested. redactNames are replaced (case-insensitive) so
// the default copy leaves the reporter's username out; item ids and subreddit
// names stay — they're what makes the log diagnosable.
export const formatDiagLog = (list: DiagEntry[], headerLines: string[], redactNames: string[] = []): string => {
    const lines: string[] = [...headerLines, `entries: ${list.length} (oldest first)`, '----', ...list.map(renderEntry)]
    return redact(lines.join('\n'), redactNames)
}

const coverageLine = (label: string, list: DiagEntry[], keeps: string): string => {
    if (!list.length) {
        return `${label}: 0 entries (keeps ${keeps})`
    }
    const first = new Date(list[0].t).toISOString()
    const last = new Date(list[list.length - 1].t).toISOString()
    return `${label}: ${list.length} entries (keeps ${keeps}), ${first} → ${last}`
}

// Pure, unit-tested. Summary first (the history), then the recent per-item
// detail, each section oldest first; a coverage line per tier says how much
// time the paste actually spans, which a reader otherwise had to guess.
export const formatTieredDiagLog = (
    tiers: { summary: DiagEntry[]; details: DiagEntry[] },
    headerLines: string[],
    redactNames: string[] = [],
): string => {
    const lines: string[] = [
        ...headerLines,
        coverageLine('summary tier', tiers.summary, `last ${SUMMARY_RETENTION_HOURS} hours`),
        coverageLine('detail tier', tiers.details, `last ${DIAG_MAX_ENTRIES} entries`),
        '',
        '==== summary: cycles, login detection, rate limits, news, actions (oldest first) ====',
        ...tiers.summary.map(renderEntry),
        '',
        '==== detail: per-item verification, tiebreaks, bridge (oldest first) ====',
        ...tiers.details.map(renderEntry),
    ]
    return redact(lines.join('\n'), redactNames)
}

// Assembles the copyable report. extraHeaderLines lets the background handler
// contribute state this module shouldn't reach into (e.g. backoff remaining,
// which lives behind storage.ts helpers — importing those here would cycle).
export const buildDiagReport = async (opts: {
    includeUsername?: boolean
    extraHeaderLines?: string[]
}): Promise<string> => {
    const tiers = await getDiagTiers()
    let version = 'unknown'
    try {
        version = chrome.runtime.getManifest().version
    } catch {
        /* ignored */
    }
    let ua = 'unknown'
    try {
        ua = navigator.userAgent
    } catch {
        /* ignored */
    }
    const redactNames: string[] = []
    if (!opts.includeUsername) {
        try {
            const local = (await browser.storage.local.get({ last_logged_in_user: '' })) as any
            if (local.last_logged_in_user) {
                redactNames.push(String(local.last_logged_in_user))
            }
            const sync = (await browser.storage.sync.get({ user_subscriptions: {} })) as any
            for (const name of Object.keys(sync.user_subscriptions || {})) {
                redactNames.push(name)
            }
        } catch {
            /* ignored */
        }
    }
    const header = [
        'reveddit real-time diagnostic log',
        `version: ${version}`,
        `ua: ${ua}`,
        `generated: ${new Date().toISOString()}`,
        ...(opts.extraHeaderLines || []),
    ]
    return formatTieredDiagLog(tiers, header, redactNames)
}
