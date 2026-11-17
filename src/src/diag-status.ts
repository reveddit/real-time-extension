// One status line shared by the popup and the options page: answers "is it
// still checking?" without a diagnostic log. Times come from the background's
// get-diag-status handler (last_check in seconds, the alarm's next fire in ms).
export interface DiagStatus {
    backoffRemainingMs?: number
    lastCheck?: number
    nextCheck?: number
    // When a check last read the user's items, and since when the checks after
    // it have read none (ms, lookup-status.ts noteItemsCheck)
    itemsCheckedAt?: number
    itemsFailingSince?: number
    error?: string
}

// The time, and the day when it isn't today
const clock = (ms: number, now: number) => {
    const at = new Date(ms)
    const time = at.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    return at.toDateString() === new Date(now).toDateString()
        ? time
        : `${at.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${time}`
}

export const formatDiagStatus = (resp: DiagStatus, now = Date.now()): string => {
    const parts: string[] = []
    // A cycle that read none of the user's items still ends, so while checks
    // fail, the time that counts is the last one that read them
    if (resp.itemsFailingSince) {
        parts.push(
            resp.itemsCheckedAt
                ? `last good check ${clock(resp.itemsCheckedAt, now)}`
                : `checks failing since ${clock(resp.itemsFailingSince, now)}`,
        )
    } else if (resp.lastCheck) {
        parts.push(`last check ${clock(resp.lastCheck * 1000, now)}`)
    }
    if (resp.backoffRemainingMs && resp.backoffRemainingMs > 0) {
        parts.push(`paused ~${Math.max(1, Math.ceil(resp.backoffRemainingMs / 60000))} min (Reddit rate limit)`)
    } else if (resp.nextCheck && resp.nextCheck > now) {
        parts.push(`next ~${clock(resp.nextCheck, now)}`)
    }
    return parts.join(' · ')
}
