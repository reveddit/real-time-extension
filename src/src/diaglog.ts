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

type DiagArea =
    | 'cycle' // checkForChanges boundaries and skips
    | 'auth' // logged-in-user detection
    | 'feed' // public-profile lookup
    | 'verify' // feed-absent page verification
    | 'legacy' // legacy-reddit tiebreak paths
    | 'ratelimit' // 429 hits and backoff decisions
    | 'bridge' // website bridge requests (refusals and failures)
    | 'news' // remote news/mechanism fetches
    | 'ui' // user-initiated actions (manual check, clear)

interface DiagEntry {
    t: number // epoch ms
    a: DiagArea
    m: string // exactly what console.log printed
    d?: string // optional JSON payload, truncated
}

type DiagTier = 'summary' | 'detail'

// Areas whose every line is low-volume, per-cycle history.
const SUMMARY_AREAS: ReadonlySet<DiagArea> = new Set<DiagArea>(['cycle', 'auth', 'feed', 'ratelimit', 'news', 'ui'])

// Detail tier: the recent past, per item. One ring, one key.
export const DIAG_LOG_KEY = 'diag_log_v1'
export const DIAG_MAX_ENTRIES = 600
// Serialized-size backstop so the ring can't crowd storage.local even if
// entries run long (storage.local quota is shared with verdict caches etc.).
const DIAG_MAX_BYTES = 128 * 1024

// Summary tier: hourly chunks under DIAG_SUMMARY_LOG_KEY + '_' + hourIndex,
// kept for SUMMARY_RETENTION_HOURS. The count cap is a memory backstop only;
// at three or four ~150-byte lines per one-minute cycle, 36 hours is ~8000
// entries and ~1.2 MB across chunks.
const DIAG_SUMMARY_LOG_KEY = 'diag_summary_v2'
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

const chunkKeysBetween = (first: number, last: number): string[] =>
    Array.from({ length: last - first + 1 }, (_, i) => `${DIAG_SUMMARY_LOG_KEY}_${first + i}`)

// The chunk keys covering the retention window ending now.
const retainedChunkKeys = (now: number) =>
    chunkKeysBetween(hourIndex(now) - SUMMARY_RETENTION_HOURS + 1, hourIndex(now))

// Keys just outside the window: removed on flush so storage never accumulates
// stale hours (bounded lookback, since removal is idempotent).
const expiredChunkKeys = (now: number) => {
    const oldestKept = hourIndex(now) - SUMMARY_RETENTION_HOURS + 1
    return chunkKeysBetween(oldestKept - 24, oldestKept - 1)
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

// For a copy that shouldn't say which posts and comments it's about (the
// options page's "hide post and comment ids"): each id becomes a stand-in the
// first time it appears, c_ for a comment and p_ for a post, and keeps it for
// the rest of the copy, so the log still shows what happened to each item.
// A stand-in is random, has nothing of the id in it, and is made anew for each
// copy, so nobody can work back to the id. Covers fullnames (t1_, t3_), reddit
// paths (/comments/<post>/<slug>/<comment>, and the comment partial's), and the
// lookups' coverage floors ("t1=<n>", "floor t1 <n>"), which are ids as numbers.
// A path's title slug and a page's title would find the post by search, so they
// go too.
export const idHider = (): ((text: string) => string) => {
    const standIns = new Map<string, string>()
    const taken = new Set<string>()
    const standIn = (kind: 'c' | 'p', id: string): string => {
        const key = `${kind}:${id.toLowerCase()}`
        let s = standIns.get(key)
        if (!s) {
            do {
                s = `${kind}_${Array.from(crypto.getRandomValues(new Uint8Array(8)), b => (b % 36).toString(36)).join('')}`
            } while (taken.has(s))
            standIns.set(key, s)
            taken.add(s)
        }
        return s
    }
    // An id ends where the next character can't continue it, so a stand-in
    // already in place (c_..., p_...) is never read as an id
    return text =>
        text
            .replace(/(?<=^|[^0-9a-z]|%[0-9a-f]{2})t([13])_([0-9a-z]+)/gi, (_, t, id) =>
                standIn(t === '1' ? 'c' : 'p', id),
            )
            .replace(
                /(\/svc\/shreddit\/comments\/r\/[^/\s"?#]+\/)([0-9a-z]+)\/([0-9a-z]+)(?![_0-9a-z])/gi,
                (_, head, post, comment) => `${head}${standIn('p', post)}/${standIn('c', comment)}`,
            )
            .replace(
                /\/comments\/(?!r\/)([0-9a-z]+)(?![_0-9a-z])(?:\/([^/\s"?#]+)(?:\/([0-9a-z]+)(?![_0-9a-z]))?)?/gi,
                (_, post, slug, comment) =>
                    `/comments/${standIn('p', post)}` +
                    (slug ? '/_' + (comment ? `/${standIn('c', comment)}` : '') : ''),
            )
            .replace(
                /\b(t[13])(=| |":)([1-9]\d{3,})\b/g,
                (_, t, sep, n) => `${t}${sep}${standIn(t === 't1' ? 'c' : 'p', Number(n).toString(36))}`,
            )
            .replace(/\btitle="(?:[^"\\]|\\.)*"/g, 'title=(hidden)')
}

const coverageLine = (label: string, list: DiagEntry[], keeps: string): string => {
    if (!list.length) {
        return `${label}: 0 entries (keeps ${keeps})`
    }
    const first = new Date(list[0].t).toISOString()
    const last = new Date(list[list.length - 1].t).toISOString()
    return `${label}: ${list.length} entries (keeps ${keeps}), ${first} → ${last}`
}

// The browser and its major version, from a user agent string (Edge's also
// names Chrome, so it's asked first)
export const browserOfUserAgent = (ua: string): string => {
    for (const [token, name] of [
        ['Firefox', 'Firefox'],
        ['Edg', 'Edge'],
        ['Chrome', 'Chrome'],
    ]) {
        const m = ua.match(new RegExp(`\\b${token}/(\\d+)`))
        if (m) {
            return `${name} ${m[1]}`
        }
    }
    return ''
}

// Pure, unit-tested. redactNames are replaced (case-insensitive) so the default
// copy leaves the reporter's username out; item ids and subreddit names stay:
// they're what makes the log diagnosable.
// Summary first (the history), then the recent per-item
// detail, each section oldest first; a coverage line per tier says how much
// time the paste actually spans, which a reader otherwise had to guess.
// Each section's heading names the version and browser too: people paste a
// section without the header lines above it. Past maxChars, each tier keeps
// its newest entries that fit, the detail tier at most 40% of the room unless
// the summary leaves some over. The coverage lines then describe what's kept,
// and a header line says what was left out. hideIds swaps post and comment ids
// for stand-ins (idHider), the same ones throughout.
export const formatTieredDiagLog = (
    tiers: { summary: DiagEntry[]; details: DiagEntry[] },
    headerLines: string[],
    redactNames: string[] = [],
    runningOn = '',
    maxChars = Infinity,
    hideIds = false,
): string => {
    const on = runningOn ? ` (${runningOn})` : ''
    const hide = hideIds ? idHider() : (s: string) => s
    // Ids first: a name redacted out of "comments" or out of an id would leave
    // the rest unrecognized. A name with something like an id in it (Mike_t1_abc)
    // is redacted in its hidden form too, longest first as before.
    const names = hideIds
        ? [...new Set([...redactNames, ...redactNames.map(hide)])].sort((a, b) => b.length - a.length)
        : redactNames
    const clean = (s: string) => redact(hide(s), names)
    const text = {
        summary: tiers.summary.map(e => clean(renderEntry(e))),
        details: tiers.details.map(e => clean(renderEntry(e))),
    }
    const newestOf = <T>(list: T[], n: number) => list.slice(list.length - n)
    // The newest s summary and d detail entries. The coverage lines describe
    // the newest covered.s and covered.d, which differ only to reserve room.
    const build = (s: number, d: number, note: string[] = [], covered = { s, d }) =>
        [
            clean(
                [
                    ...headerLines,
                    coverageLine(
                        'summary tier',
                        newestOf(tiers.summary, covered.s),
                        `last ${SUMMARY_RETENTION_HOURS} hours`,
                    ),
                    coverageLine('detail tier', newestOf(tiers.details, covered.d), `last ${DIAG_MAX_ENTRIES} entries`),
                    ...note,
                ].join('\n'),
            ),
            '',
            `==== summary${on}: cycles, login detection, rate limits, news, actions (oldest first) ====`,
            ...newestOf(text.summary, s),
            '',
            `==== detail${on}: per-item verification, tiebreaks, bridge (oldest first) ====`,
            ...newestOf(text.details, d),
        ].join('\n')
    const full = build(text.summary.length, text.details.length)
    if (full.length <= maxChars) {
        return full
    }
    const note = (s: number, d: number) => [
        `trimmed to fit: the oldest ${text.summary.length - s} summary and ` +
            `${text.details.length - d} detail entries are left out`,
    ]
    // How many of the newest entries fit in room: each costs its length and
    // the newline before it
    const newest = (entries: string[], room: number) => {
        let n = 0
        let used = 0
        while (n < entries.length && used + entries[entries.length - 1 - n].length + 1 <= room) {
            used += entries[entries.length - 1 - n].length + 1
            n++
        }
        return { n, used }
    }
    // The header at its longest: coverage lines for the whole tiers, and the
    // note with everything left out
    const room = maxChars - build(0, 0, note(0, 0), { s: text.summary.length, d: text.details.length }).length
    let details = newest(text.details, Math.floor(room * 0.4))
    const summary = newest(text.summary, room - details.used)
    details = newest(text.details, room - summary.used)
    return build(summary.n, details.n, note(summary.n, details.n))
}

// Assembles the copyable report. extraHeaderLines lets the background handler
// contribute state this module shouldn't reach into (e.g. backoff remaining,
// which lives behind storage.ts helpers — importing those here would cycle).
export const buildDiagReport = async (opts: {
    includeUsername?: boolean
    extraHeaderLines?: string[]
    // The popup's report a problem: cut to fit an issue (report.ts)
    maxChars?: number
    // The options page's choice: post and comment ids as stand-ins (idHider)
    hideIds?: boolean
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
            // Every account with anything stored: subscribed, unsubscribed, or
            // neither, when monitoring kept its lists (removed_u_<name> and the
            // like) while it was logged in
            const sync = ((await browser.storage.sync.get(null)) as any) || {}
            redactNames.push(
                ...Object.keys(sync.user_subscriptions || {}),
                ...Object.keys(sync.user_unsubscriptions || {}),
                ...Object.keys(sync).flatMap(key => key.match(/^[a-z]+_u_(.+)$/)?.slice(1) ?? []),
            )
        } catch {
            /* ignored */
        }
        // Longest first, so an alt named after the main account goes whole
        redactNames.sort((a, b) => b.length - a.length)
    }
    const header = [
        'reveddit real-time diagnostic log',
        `version: ${version}`,
        `ua: ${ua}`,
        `generated: ${new Date().toISOString()}`,
        ...(opts.hideIds ? ['ids: hidden; c_ and p_ are stand-ins for comment and post ids, made for this copy'] : []),
        ...(opts.extraHeaderLines || []),
    ]
    return formatTieredDiagLog(
        tiers,
        header,
        redactNames,
        [version, browserOfUserAgent(ua)].filter(Boolean).join(', '),
        opts.maxChars,
        opts.hideIds,
    )
}
