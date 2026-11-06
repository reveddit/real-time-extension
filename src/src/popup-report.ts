import { browserOfUserAgent } from './diaglog'
import { newIssueUrl, REPORT_LOG_MAX_CHARS } from './report'

const runtimeAny = chrome.runtime as any

// Copies the diagnostic log (the options page's default copy, without the
// username) and opens a new GitHub issue form that asks for it. The copy
// comes first: the new tab takes focus and closes the popup.
export const reportProblem = () => {
    const open = (logCopied: boolean) => {
        let version = ''
        try {
            version = chrome.runtime.getManifest().version
        } catch {
            /* ignored */
        }
        const runningOn = [version, browserOfUserAgent(navigator.userAgent)].filter(Boolean).join(', ')
        chrome.tabs.create({ url: newIssueUrl({ runningOn, logCopied }) })
        window.close()
    }
    runtimeAny.sendMessage(
        { action: 'get-diag-log', includeUsername: false, maxChars: REPORT_LOG_MAX_CHARS },
        (resp: { text?: string; error?: string }) => {
            if (runtimeAny.lastError || !resp || typeof resp.text !== 'string') {
                open(false)
                return
            }
            navigator.clipboard.writeText(resp.text).then(
                () => open(true),
                () => open(false),
            )
        },
    )
}
