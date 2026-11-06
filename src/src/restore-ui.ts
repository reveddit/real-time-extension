import { observe } from './dom-helpers'
import { noteCountSeen } from './restore'
import { forgetPageReads, endScanOfLeftPage } from './scan-session'
import { forgetPageInserter } from './recovered-inserter'
import {
    injectRestoreButton_newReddit,
    injectRestoreButton_oldReddit,
    injectScanAllButton,
    injectScanButton_newReddit,
} from './thread-scan-ui'
import { injectProfileScanButton_newReddit, injectProfileScanButton_oldReddit } from './profile-scan-ui'

// Pages this script has seen arrive
let arrivals = 0

// A document can last a whole visit to reddit, so a new page starts over. Back
// and forward can bring a page back with its buttons as they were when it left.
export function resetScansForPage() {
    arrivals++
    forgetPageReads()
    forgetPageInserter()
    endScanOfLeftPage()
}

// --- Public entry points ---

// Thread-scan buttons (per-comment "scan" + thread-level "Scan for removed
// comments") are governed by the show_thread_scan_buttons option (default ON).
function shouldShowThreadScanButtons(): Promise<boolean> {
    return new Promise(resolve => {
        try {
            chrome.storage.sync.get(['options'], sync => {
                resolve((sync?.options || {}).show_thread_scan_buttons !== false)
            })
        } catch {
            resolve(true)
        }
    })
}

// These observers last the whole document, across reddit's pages
let watchingComments = false

export function initRestoreOnThread(isNewReddit: boolean) {
    // The page this script started on may be older than the script: a tab from
    // before an install. Only the document's time covers that.
    noteCountSeen(isNewReddit, arrivals > 1 ? Date.now() : performance.timeOrigin)
    shouldShowThreadScanButtons().then(show => {
        if (!show) return
        injectScanAllButton(isNewReddit)
        if (watchingComments) return
        watchingComments = true
        if (!isNewReddit) {
            const selector = '.thing.comment'
            for (const el of Array.from(document.querySelectorAll(selector))) {
                injectRestoreButton_oldReddit(el as HTMLElement)
            }
            observe(document, selector, el => injectRestoreButton_oldReddit(el as HTMLElement))
        } else {
            const tombstones = 'shreddit-comment[author="[deleted]"]'
            document.querySelectorAll(tombstones).forEach(el => injectRestoreButton_newReddit(el as HTMLElement))
            observe(document, tombstones, el => injectRestoreButton_newReddit(el as HTMLElement))

            const rows = 'shreddit-comment-action-row'
            document.querySelectorAll(rows).forEach(injectScanButton_newReddit)
            observe(document, rows, injectScanButton_newReddit)
        }
    })
}

export function initProfileScan(username: string, isNewReddit: boolean) {
    shouldShowProfileScanButton(username).then(show => {
        if (!show) return
        if (!isNewReddit) {
            injectProfileScanButton_oldReddit(username)
        } else {
            injectProfileScanButton_newReddit(username)
        }
    })
}

// Whether to inject the scan button, governed by two options:
//   - other profiles: show_scan_on_other_profiles (default ON; undefined → on)
//   - the logged-in user's OWN profile: show_scan_on_own_profile (default OFF)
function shouldShowProfileScanButton(username: string): Promise<boolean> {
    return new Promise(resolve => {
        try {
            chrome.storage.local.get(['last_logged_in_user'], local => {
                const me = local?.last_logged_in_user
                const isOwnProfile = !!me && String(me).toLowerCase() === username.toLowerCase()
                chrome.storage.sync.get(['options'], sync => {
                    const opts = sync?.options || {}
                    if (isOwnProfile) {
                        resolve(!!opts.show_scan_on_own_profile)
                    } else {
                        resolve(opts.show_scan_on_other_profiles !== false)
                    }
                })
            })
        } catch {
            resolve(true)
        }
    })
}
