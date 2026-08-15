// Persistent diagnostic log: the always-on, user-copyable successor to the
// dev-only __devLog ring buffer in background.ts. dlog() mirrors what the
// service-worker console already shows (every call also console.logs the same
// line) while keeping a bounded buffer the options page can copy — so a report
// like issue #14 ("zero detections, no visible error") doesn't require walking
// the reporter through chrome://extensions and DevTools.
//
// Nothing here is ever transmitted: the buffer lives in storage.local and only
// leaves the machine when the user copies it themselves. That keeps this out of
// data-collection territory for store privacy disclosures.
//
// Contexts: dlog is safe to call anywhere (content scripts, options, popup),
// but only the background/service-worker context persists — it alone calls
// initDiagPersistence(). Other contexts just get the console.log mirror and a
// small in-memory ring that dies with the page, which avoids concurrent
// read-modify-write clobbering of the stored buffer.
import browser from 'webextension-polyfill'

export type DiagArea =
    | 'cycle' // checkForChanges boundaries and skips
    | 'auth' // logged-in-user detection
    | 'feed' // public-profile lookup
    | 'verify' // feed-absent page verification
    | 'legacy' // old.reddit tiebreak paths
    | 'ratelimit' // 429 hits and backoff decisions
    | 'news' // remote news/mechanism fetches
    | 'ui' // user-initiated actions (manual check, clear)

export interface DiagEntry {
    t: number // epoch ms
    a: DiagArea
    m: string // exactly what console.log printed
    d?: string // optional JSON payload, truncated
}

export const DIAG_LOG_KEY = 'diag_log_v1'
export const DIAG_MAX_ENTRIES = 600
export const DIAG_MAX_DATA_CHARS = 500
// Serialized-size backstop so the buffer can't crowd storage.local even if
// entries run long (storage.local quota is shared with verdict caches etc.).
export const DIAG_MAX_BYTES = 128 * 1024
const FLUSH_DELAY_MS = 2000

let entries: DiagEntry[] = []
let persistEnabled = false
let loadPromise: Promise<void> | null = null
let flushTimer: ReturnType<typeof setTimeout> | null = null

const trimToLimits = (list: DiagEntry[]): DiagEntry[] => {
    let trimmed = list.length > DIAG_MAX_ENTRIES ? list.slice(list.length - DIAG_MAX_ENTRIES) : list
    // Rare path: only engages when entries are unusually large on average.
    while (trimmed.length > 1 && JSON.stringify(trimmed).length > DIAG_MAX_BYTES) {
        trimmed = trimmed.slice(Math.max(1, Math.floor(trimmed.length / 10)))
    }
    return trimmed
}

const scheduleFlush = () => {
    if (!persistEnabled || flushTimer) {
        return
    }
    flushTimer = setTimeout(() => {
        flushTimer = null
        browser.storage.local.set({ [DIAG_LOG_KEY]: entries }).catch(() => {})
    }, FLUSH_DELAY_MS)
}

// Background/service-worker only. Loads the stored buffer and prepends it to
// anything dlog'd during this session before the load finished.
export const initDiagPersistence = (): Promise<void> => {
    if (loadPromise) {
        return loadPromise
    }
    persistEnabled = true
    loadPromise = browser.storage.local
        .get({ [DIAG_LOG_KEY]: [] })
        .then((r: any) => {
            const stored = Array.isArray(r[DIAG_LOG_KEY]) ? (r[DIAG_LOG_KEY] as DiagEntry[]) : []
            entries = trimToLimits([...stored, ...entries])
        })
        .catch(() => {})
    return loadPromise
}

export const dlog = (area: DiagArea, message: string, data?: unknown): void => {
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
    entries.push(entry)
    entries = trimToLimits(entries)
    scheduleFlush()
}

export const getDiagEntries = async (): Promise<DiagEntry[]> => {
    if (loadPromise) {
        await loadPromise
    }
    return entries.slice()
}

export const clearDiagLog = async (): Promise<void> => {
    entries = []
    if (flushTimer) {
        clearTimeout(flushTimer)
        flushTimer = null
    }
    try {
        await browser.storage.local.remove(DIAG_LOG_KEY)
    } catch {
        /* ignored */
    }
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Pure formatter, unit-tested. redactNames are replaced (case-insensitive) so
// the default copy leaves the reporter's username out; item ids and subreddit
// names stay — they're what makes the log diagnosable.
export const formatDiagLog = (list: DiagEntry[], headerLines: string[], redactNames: string[] = []): string => {
    const lines: string[] = [...headerLines, `entries: ${list.length} (oldest first)`, '----']
    for (const e of list) {
        lines.push(`${new Date(e.t).toISOString()} [${e.a}] ${e.m}${e.d !== undefined ? ` | ${e.d}` : ''}`)
    }
    let text = lines.join('\n')
    for (const name of redactNames) {
        if (!name) {
            continue
        }
        text = text.replace(new RegExp(escapeRegExp(name), 'gi'), '────')
    }
    return text
}

// Assembles the copyable report. extraHeaderLines lets the background handler
// contribute state this module shouldn't reach into (e.g. backoff remaining,
// which lives behind storage.ts helpers — importing those here would cycle).
export const buildDiagReport = async (opts: {
    includeUsername?: boolean
    extraHeaderLines?: string[]
}): Promise<string> => {
    const list = await getDiagEntries()
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
    return formatDiagLog(list, header, redactNames)
}
