import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import styled from '@emotion/styled'
import { getAllChanges, getPendingPostQueueSize, clearPendingPostQueue, getNotificationLog, NotificationLogEntry } from './storage'
import { ChangeForStorage } from './common'
import { mountPage } from './ui/global'
import { MessageBanner, MiniSpinner, Page } from './ui/components'
import { tokens } from './ui/tokens'
import { redditItemUrl } from './ui/links'
import { ChangeRow, FilterOption, FilterValue, SortValue, matchesFilter, ChangeCard, toRow } from './history-rows'
import { FullWelcomeBanner, SlimWelcomeBanner } from './history-welcome'
import { NotificationLog } from './history-log'

const searchParams = new URLSearchParams(window.location.search)
const VALID_FILTERS = ['removed', 'deleted', 'approved', 'locked', 'unlocked', 'edited'] as const
const initialFilter: FilterValue = (() => {
    const f = searchParams.get('filter')
    if (!f) return []
    return f.split(',').filter((v): v is FilterOption => (VALID_FILTERS as readonly string[]).includes(v))
})()

const PageHeader = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: ${tokens.space.lg};
  margin-bottom: ${tokens.space.lg};
  flex-wrap: wrap;
`

const Controls = styled.div`
  display: flex;
  gap: ${tokens.space.lg};
  align-items: baseline;
  flex-wrap: wrap;
`

const ControlGroup = styled.div`
  display: flex;
  gap: ${tokens.space.sm};
  align-items: center;
  flex-wrap: wrap;
  & label {
    color: var(--text-secondary);
    font-size: 0.85em;
    display: flex;
    align-items: center;
    gap: 3px;
    cursor: pointer;
  }
`

const ControlLabel = styled.span`
  color: var(--text-secondary);
  font-size: 0.85em;
  font-weight: 500;
  margin-right: ${tokens.space.xs};
`

const ShowWelcomeLink = styled.button`
  background: none;
  border: none;
  padding: 0;
  color: var(--text-secondary);
  font-size: 0.85em;
  cursor: pointer;
  text-decoration: underline;
  &:hover { color: var(--link-hover); }
`

const ResetButton = styled.button`
  background: var(--accent);
  border: 1px solid var(--accent);
  border-radius: ${tokens.radius.sm};
  color: var(--text-on-accent);
  font-size: 0.8em;
  cursor: pointer;
  padding: 4px 8px;
  &:hover:not(:disabled) { background: var(--accent-hover); border-color: var(--accent-hover); }
  &:disabled { opacity: 0.4; cursor: default; }
`

const StopScanLink = styled.button`
  background: none;
  border: none;
  padding: 0;
  margin-left: 8px;
  color: var(--text-secondary);
  font-size: 0.9em;
  cursor: pointer;
  text-decoration: underline;
  &:hover { color: var(--link-hover); }
`

const Empty = styled.p`
  text-align: center;
  color: var(--text-secondary);
  padding: ${tokens.space.xl};
`

// span (not div): it renders inside <Empty>, a styled.p, and <p> cannot
// contain a <div> — React flags that as a hydration error.
const Spinner = styled.span`
  display: block;
  width: 48px;
  height: 48px;
  margin: 0 auto ${tokens.space.md};
  border: 4px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  @keyframes spin { to { transform: rotate(360deg); } }
`

function History() {
  const [changes, setChanges] = useState<ChangeRow[]>([])
  const [loaded, setLoaded] = useState(false)
  const [filter, setFilter] = useState<FilterValue>(initialFilter)
  const [sort, setSort] = useState<SortValue>('observed')
  const [currentUser, setCurrentUser] = useState<string | null>(null)
  const [bannerDismissed, setBannerDismissed] = useState(() => {
    // ?welcome=1 (the post-install landing URL) always shows the welcome banner,
    // regardless of a prior dismissal.
    if (new URLSearchParams(location.search).get('welcome') === '1') return false
    return localStorage.getItem('history_banner_dismissed') === '1'
  })
  const dismissBanner = () => {
    localStorage.setItem('history_banner_dismissed', '1')
    setBannerDismissed(true)
  }
  const [pendingPostCount, setPendingPostCount] = useState(0)
  const [pendingProgress, setPendingProgress] = useState<{ processed: number; total: number } | null>(null)
  const [backoffMs, setBackoffMs] = useState(0)
  const [initialScanDone, setInitialScanDone] = useState(true)
  const [notifLog, setNotifLog] = useState<NotificationLogEntry[]>([])
  const [logOpen, setLogOpen] = useState(false)
  const logSectionRef = useRef<HTMLDivElement>(null)

  const loadData = useCallback(() => {
    getPendingPostQueueSize().then(size => setPendingPostCount(size))
    chrome.storage.local.get(['last_logged_in_user', 'pending_post_progress', 'rate_limit_until'], result => {
      setCurrentUser(result?.last_logged_in_user || null)
      const prog = result?.pending_post_progress
      setPendingProgress(prog && typeof prog.total === 'number' ? { processed: prog.processed || 0, total: prog.total } : null)
      setBackoffMs(Math.max(0, (result?.rate_limit_until || 0) - Date.now()))
    })
    chrome.storage.sync.get(['last_check'], result => {
      setInitialScanDone(result.last_check != null)
    })
    getAllChanges(changesByUser => {
      chrome.storage.local.get(undefined, localStorage => {
        const all: ChangeForStorage[] = []
        Object.keys(changesByUser).forEach(user => {
          changesByUser[user].forEach((changeObj) => {
            const change = new ChangeForStorage({ object: changeObj })
            change.user = user
            all.push(change)
          })
        })

        const rows: ChangeRow[] = all.map(change => toRow(change, localStorage))

        setChanges(rows)
        setLoaded(true)
      })
    })
  }, [])

  useEffect(() => {
    loadData()
    getNotificationLog().then(setNotifLog)
    let debounceTimer: ReturnType<typeof setTimeout> | null = null
    const debouncedLoad = () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(loadData, 500)
    }
    const onChange = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      const keys = Object.keys(changes)
      if (area === 'sync' && keys.some(k => k.startsWith('changes_'))) {
        debouncedLoad()
      } else if (area === 'local' && keys.some(k => k.startsWith('items_'))) {
        debouncedLoad()
      }
      if (area === 'sync' && changes.last_check) {
        setInitialScanDone(true)
      }
      if (area === 'local' && changes.pending_post_lookups) {
        const newQueue = changes.pending_post_lookups.newValue || []
        setPendingPostCount(newQueue.length)
        if (newQueue.length === 0) setPendingProgress(null)
      }
      if (area === 'local' && changes.pending_post_progress) {
        const prog = changes.pending_post_progress.newValue
        setPendingProgress(prog && typeof prog.total === 'number' ? { processed: prog.processed || 0, total: prog.total } : null)
      }
      if (area === 'local' && changes.rate_limit_until) {
        setBackoffMs(Math.max(0, (changes.rate_limit_until.newValue || 0) - Date.now()))
      }
      if (area === 'local' && changes.notification_log) {
        setNotifLog(changes.notification_log.newValue || [])
      }
    }
    chrome.storage.onChanged.addListener(onChange)
    return () => {
      chrome.storage.onChanged.removeListener(onChange)
      if (debounceTimer) clearTimeout(debounceTimer)
    }
  }, [loadData])

  const handleResolve = (id: string) => {
    const apiJsonUrl = `https://www.reddit.com/api/info.json?id=${encodeURIComponent(id)}`
    const apiPageUrl = `https://www.reddit.com/api/info?id=${encodeURIComponent(id)}`
    // Credentialed like lookupOtherItemsByID_authed: the unauthenticated form
    // has 403'd since August 2026, which sent every click to the fallback.
    fetch(apiJsonUrl, { credentials: 'include' })
      .then(r => r.json())
      .then(json => {
        const children = (json?.data?.children && Array.isArray(json.data.children)) ? json.data.children : []
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = children[0]?.data || (children.find((ch: any) => ch?.data?.name === id) || {} as any).data
        if (data?.permalink) {
          window.open(`https://www.reddit.com${data.permalink}?context=3`, '_blank')
          return
        }
        const linkId = data && (data.link_id || (data.parent_id?.substr(0, 3) === 't3_' ? data.parent_id : null))
        if (linkId?.substr(0, 3) === 't3_') {
          window.open(redditItemUrl(id, linkId), '_blank')
        } else {
          window.open(apiPageUrl, '_blank')
        }
      })
      .catch(() => {
        window.open(apiPageUrl, '_blank')
      })
  }

  const visible = useMemo(() => {
    const filtered = changes.filter(r => matchesFilter(r, filter))
    const sorted = [...filtered]
    if (sort === 'observed') {
      sorted.sort((a, b) => b.observedUTC - a.observedUTC)
    } else if (sort === 'created') {
      sorted.sort((a, b) => b.createdUTC - a.createdUTC)
    } else {
      sorted.sort((a, b) => (b.observedUTC - b.createdUTC) - (a.observedUTC - a.createdUTC))
    }
    return sorted
  }, [changes, filter, sort])

  const showFullBanner = !bannerDismissed
  const showSlimBanner = bannerDismissed && changes.length === 0 && loaded

  if (!loaded) return null

  return (
    <Page>
      {showFullBanner ? (
        <FullWelcomeBanner currentUser={currentUser} onDismiss={dismissBanner} />
      ) : (
        <ShowWelcomeLink onClick={() => { localStorage.removeItem('history_banner_dismissed'); setBannerDismissed(false) }}>
          show welcome message
        </ShowWelcomeLink>
      )}

      <TitleBar>
        <h1 style={{ margin: 0 }}>History</h1>
        <NotifLogLink onClick={() => {
          setLogOpen(true)
          setTimeout(() => logSectionRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
        }}>notification log</NotifLogLink>
      </TitleBar>
      <PageHeader>
        <Controls>
          <ControlGroup>
            <ControlLabel>filter</ControlLabel>
            {([['removed', 'mod removed'], ['deleted', 'user deleted'], ['locked', 'locked'], ['unlocked', 'unlocked'], ['approved', 'approved'], ['edited', 'edited']] as const).map(([value, label]) => (
              <label key={value}>
                <input type="checkbox" checked={filter.includes(value)} onChange={e => {
                  setFilter(e.target.checked ? [...filter, value] : filter.filter(f => f !== value))
                }} />
                {label}
              </label>
            ))}
          </ControlGroup>
          <ControlGroup>
            <ControlLabel>sort</ControlLabel>
            {([['observed', 'observed'], ['created', 'created'], ['delta', 'time to action']] as const).map(([value, label]) => (
              <label key={value}>
                <input type="radio" name="sort" value={value} checked={sort === value} onChange={() => setSort(value)} />
                {label}
              </label>
            ))}
          </ControlGroup>
          <ResetButton disabled={filter.length === 0 && sort === 'observed'} onClick={() => { setFilter([]); setSort('observed') }}>reset</ResetButton>
        </Controls>
      </PageHeader>

      {pendingPostCount > 0 && (
        <MessageBanner variant="info">
          <MiniSpinner />
          {pendingProgress && pendingProgress.total > 0
            ? `Scanning ${Math.min(pendingProgress.processed, pendingProgress.total)} of ${pendingProgress.total} posts for removals…`
            : `Scanning ${pendingPostCount} ${pendingPostCount === 1 ? 'post' : 'posts'} for removals…`}
          {backoffMs > 0
            ? ` Paused ~${Math.max(1, Math.ceil(backoffMs / 60000))} min — Reddit rate limit.`
            : ' New results appear here automatically.'}
          <StopScanLink onClick={() => { clearPendingPostQueue(); setPendingPostCount(0); setPendingProgress(null) }}>stop</StopScanLink>
        </MessageBanner>
      )}

      {visible.length > 0 ? (
        visible.map((row, idx) => (
          <ChangeCard key={`${row.id}-${idx}`} row={row} onResolve={handleResolve} />
        ))
      ) : (
        <>
          {showSlimBanner && (
            <SlimWelcomeBanner currentUser={currentUser} />
          )}
          {!showSlimBanner && changes.length === 0 && !initialScanDone && (
            <Empty>
              <Spinner />
              Scanning your recent posts and comments…
            </Empty>
          )}
          {!showSlimBanner && (initialScanDone || changes.length > 0) && (
            <Empty>
              {changes.length === 0
                ? 'No actions observed since extension installation.'
                : 'No events match the current filter.'}
            </Empty>
          )}
        </>
      )}

      <NotificationLog
        sectionRef={logSectionRef}
        open={logOpen}
        onToggle={() => setLogOpen(!logOpen)}
        entries={notifLog}
      />
    </Page>
  )
}


const TitleBar = styled.div`
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    margin-bottom: ${tokens.space.sm};
`
const NotifLogLink = styled.button`
    background: none;
    border: none;
    color: var(--link);
    cursor: pointer;
    font-size: 0.85em;
    padding: 0;
    text-decoration: none;
    &:hover { color: var(--link-hover); text-decoration: underline; }
`

mountPage(History)
