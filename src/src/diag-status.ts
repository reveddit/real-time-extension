// One status line shared by the popup and the options page: answers "is it
// still checking?" without a diagnostic log. Times come from the background's
// get-diag-status handler (last_check in seconds, the alarm's next fire in ms).
export interface DiagStatus {
    backoffRemainingMs?: number
    lastCheck?: number
    nextCheck?: number
    error?: string
}

const clock = (ms: number) => new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

export const formatDiagStatus = (resp: DiagStatus, now = Date.now()): string => {
    const parts: string[] = []
    if (resp.lastCheck) {
        parts.push(`last check ${clock(resp.lastCheck * 1000)}`)
    }
    if (resp.backoffRemainingMs && resp.backoffRemainingMs > 0) {
        parts.push(`paused ~${Math.max(1, Math.ceil(resp.backoffRemainingMs / 60000))} min (Reddit rate limit)`)
    } else if (resp.nextCheck && resp.nextCheck > now) {
        parts.push(`next ~${clock(resp.nextCheck)}`)
    }
    return parts.join(' · ')
}
