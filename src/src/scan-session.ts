import { RateLimiter } from './scan-reads'

// The scan running now, on this tab: one at a time
export let activeScan: RateLimiter | null = null
// The feeds this page's scans have read, so the next click goes on from there.
// They go with the page's scan button, as Back can bring it back reading
// "Continue scan".
export let pageReads = new Map<string, any[]>()
const readsOfButton = new WeakMap<Element, Map<string, any[]>>()
export const readsGoWith = (btn: Element) => {
    pageReads = readsOfButton.get(btn) ?? new Map()
    readsOfButton.set(btn, pageReads)
}

export const forgetPageReads = () => {
    pageReads = new Map()
}

// --- Restore Handler ---

// Disable every scan/restore button while one search runs, so a user can't fire
// many at once (which would multiply requests to reddit and risk a rate-limit).
export function setScanButtonsEnabled(enabled: boolean) {
    document
        .querySelectorAll('.rev-scan-comment-btn, .rev-restore-btn, .rev-scan-all-btn, .rev-place-unattached-btn')
        .forEach(b => {
            ;(b as HTMLElement).classList.toggle('rev-scan-disabled', !enabled)
        })
}

// A scan belongs to the page it started on. pageEl is part of that page: reddit
// replaces it on leaving, which stops the scan, and nothing it finds is shown.
export function startScan(pageEl: HTMLElement): RateLimiter {
    activeScan?.cancel()
    const limiter = new RateLimiter(() => pageEl.isConnected)
    activeScan = limiter
    setScanButtonsEnabled(false)
    return limiter
}

export function endScan(limiter: RateLimiter) {
    if (activeScan !== limiter) return
    activeScan = null
    setScanButtonsEnabled(true)
}

// Not a failed read, which a scan reports itself, but the buttons still come back
export function scanStopped(err: unknown, note: HTMLElement) {
    console.log('[reveddit scan] stopped:', err)
    note.textContent = 'The scan stopped unexpectedly. Try again.'
}

export function addCancelLink(host: HTMLElement, limiter: RateLimiter): HTMLElement {
    const cancelBtn = document.createElement('a')
    cancelBtn.href = '#'
    cancelBtn.className = 'rev-restore-cancel'
    cancelBtn.textContent = 'cancel'
    cancelBtn.onclick = e => {
        e.preventDefault()
        limiter.cancel()
    }
    host.appendChild(cancelBtn)
    return cancelBtn
}

// Cancel goes first (left) so it stays put as the text changes width
export function showProgress(host: HTMLElement, limiter: RateLimiter, textHost = host) {
    const cancelBtn = addCancelLink(host, limiter)
    const spinner = document.createElement('span')
    spinner.className = 'rev-spinner'
    const progressText = document.createElement('span')
    textHost.append(spinner, progressText)
    const clearProgress = () => {
        spinner.remove()
        cancelBtn.remove()
    }
    return { clearProgress, progressText }
}

export function endScanOfLeftPage() {
    // A scan of the page that left may be waiting for its turn or a read to end.
    // It's nothing to this page, and it's over.
    if (activeScan?.isCancelled()) {
        activeScan.cancel()
        activeScan = null
    }
    setScanButtonsEnabled(!activeScan)
}
