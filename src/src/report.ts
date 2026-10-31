// The popup's "report a problem": the repository's issue form
// (.github/ISSUE_TEMPLATE/problem.yml) with the version and browser filled in.
// The popup has just copied the diagnostic log to the clipboard for its log
// field, which says so. The log goes by clipboard, not in the URL: it runs to
// thousands of lines, and GitHub turns away very long issue URLs. It's the
// options page's default copy (no username, item ids kept, and the form says
// so), cut to its newest lines to fit an issue.
//
// Import-free, so tests and any page can use it.

export const ISSUES_URL = 'https://github.com/reveddit/real-time-extension/issues'
export const ISSUE_FORM = 'problem.yml'
// GitHub turns away an issue whose text passes 65,536 characters. This leaves
// room for the form's other fields.
export const REPORT_LOG_MAX_CHARS = 50000
// Why reddit's login screen means connecting a second account, on reveddit.com
export const LOGIN_WALL_INFO_URL = 'https://www.reveddit.com/about/reddit-login/'

export interface IssueDraft {
    // Version and browser, e.g. '0.0.5.30, Chrome 141'
    runningOn: string
    logCopied: boolean
}

// What the log field says when the popup couldn't copy the log
export const LOG_NOT_COPIED =
    'The extension could not copy its log. In its options, press "copy log" under Diagnostics, ' +
    "then paste it here in place of this text. If GitHub says it's too long, keep only its last part."

// Issue form fields fill from query parameters named by their ids
export const newIssueUrl = ({ runningOn, logCopied }: IssueDraft): string => {
    const fields: [string, string][] = [
        ['template', ISSUE_FORM],
        ['version', runningOn || 'unknown'],
        ...(logCopied ? [] : ([['log', LOG_NOT_COPIED]] as [string, string][])),
    ]
    return `${ISSUES_URL}/new?${fields.map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join('&')}`
}
