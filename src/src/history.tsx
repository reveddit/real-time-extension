import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { createRoot } from 'react-dom/client'
import styled from '@emotion/styled'
import { getAllChanges, getItemFromLocalStorage, getPendingPostQueueSize } from './storage'
import { ChangeForStorage, LocalStorageItem, getPrettyDate, getPrettyTimeLength, isComment } from './common'
import { AppGlobal } from './ui/global'
import { Card, CardHeader, CardMeta, CardBody, CardActions, Badge, Button, BlueLink, MutedLink, Author, Subreddit, PostTitle, MdBody, MessageBanner } from './ui/components'
import { tokens } from './ui/tokens'
import { markdownToHTML } from './ui/markdown'

const searchParams = new URLSearchParams(window.location.search)
const isWelcome = searchParams.get('welcome') === '1'
const VALID_FILTERS = ['removed', 'deleted', 'approved', 'locked', 'unlocked', 'edited'] as const
const initialFilter: FilterValue = (() => {
    const f = searchParams.get('filter')
    if (!f) return []
    return f.split(',').filter((v): v is FilterOption => (VALID_FILTERS as readonly string[]).includes(v))
})()

const getPinInstructions = (): string => {
  if (__BUILT_FOR__ === 'firefox') return 'Click the extensions puzzle icon in the toolbar, then pin reveddit real-time.'
  if (__BUILT_FOR__ === 'edge') return 'Click the extensions icon in the toolbar, then pin reveddit real-time.'
  return 'Click the puzzle piece icon in the toolbar, then pin reveddit real-time.'
}

const WelcomeBanner = styled(Card)`
  margin-bottom: ${tokens.space.lg};
  & h2 {
    margin: 0 0 ${tokens.space.sm} 0;
    font-size: 1.2em;
  }
  & p {
    margin: ${tokens.space.xs} 0;
    line-height: 1.6;
    color: var(--text-primary);
  }
  & ul {
    margin: ${tokens.space.sm} 0;
    padding-left: 1.4em;
    line-height: 1.8;
    color: var(--text-primary);
  }
`

const BannerActions = styled.div`
  display: flex;
  gap: ${tokens.space.sm};
  align-items: center;
  margin-top: ${tokens.space.md};
  flex-wrap: wrap;
`

const Page = styled.div`
  max-width: 820px;
  margin: 0 auto;
  padding: ${tokens.space.xl} ${tokens.space.lg};
`

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

const Empty = styled.p`
  text-align: center;
  color: var(--text-secondary);
  padding: ${tokens.space.xl};
`

interface ChangeRow {
  id: string | null
  action: string
  actionVariant: 'removed' | 'deleted' | 'approved' | 'locked' | 'unlocked' | 'edited' | 'default'
  observedUTC: number
  createdUTC: number
  formattedObserved: string
  formattedObservedFull: string
  timeLength: string
  formattedCreated: string
  contentType: 'comment' | 'post'
  user: string
  subreddit: string
  text: string
  body: string
  href: string
  needsResolve: boolean
  seenCount: number | null
}

type FilterOption = 'removed' | 'deleted' | 'approved' | 'locked' | 'unlocked' | 'edited'
type FilterValue = FilterOption[]
type SortValue = 'observed' | 'delta' | 'created'

const variantFromAction = (action: string): ChangeRow['actionVariant'] => {
  if (action === 'mod removed') return 'removed'
  if (action === 'user deleted') return 'deleted'
  if (action === 'approved') return 'approved'
  if (action === 'locked') return 'locked'
  if (action === 'unlocked') return 'unlocked'
  if (action === 'edited') return 'edited'
  return 'default'
}

const matchesFilter = (row: ChangeRow, filter: FilterValue): boolean => {
  if (filter.length === 0) return true
  return filter.includes(row.actionVariant as FilterOption)
}

function ChangeCard({ row, onResolve }: { row: ChangeRow; onResolve: (id: string) => void }) {
  const rendered = useMemo(() => {
    if (row.contentType === 'comment') {
      return row.text ? markdownToHTML(row.text) : ''
    }
    return row.body ? markdownToHTML(row.body) : ''
  }, [row.text, row.body, row.contentType])

  const showPostTitle = row.contentType === 'post' && row.text
  const bodyIsEmpty = !rendered || rendered.trim() === '' || rendered.trim() === '<p></p>'

  return (
    <Card>
      <CardHeader>
        <Badge variant={row.actionVariant}>{row.action}</Badge>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.9em' }}>
          {row.contentType} by <Author>u/{row.user}</Author>
          {row.subreddit ? <> in <Subreddit>r/{row.subreddit}</Subreddit></> : null}
        </span>
      </CardHeader>

      <CardMeta>
        <span title={row.formattedObservedFull}>observed {row.formattedObserved}</span>
        {row.timeLength !== 'n/a' && <span title={row.formattedCreated}>{row.action} {row.timeLength} after creation</span>}
        {row.seenCount ? <span>seen {row.seenCount}×</span> : null}
      </CardMeta>

      {showPostTitle && <PostTitle>{row.text}</PostTitle>}

      <CardBody>
        {bodyIsEmpty ? (
          <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
            (no body content stored)
          </span>
        ) : (
          <MdBody className="md-body" dangerouslySetInnerHTML={{ __html: rendered }} />
        )}
      </CardBody>

      <CardActions>
        {row.needsResolve ? (
          <Button variant="secondary" onClick={() => onResolve(row.id!)}>
            Open on Reddit ↗
          </Button>
        ) : (
          <BlueLink href={row.href} target="_blank" rel="noreferrer">
            Open on Reddit ↗
          </BlueLink>
        )}
        {row.id && (
          <MutedLink
            href={`https://www.reveddit.com/info?id=${encodeURIComponent(row.id)}`}
            target="_blank"
            rel="noreferrer"
          >
            View on reveddit ↗
          </MutedLink>
        )}
      </CardActions>
    </Card>
  )
}

function History() {
  const [changes, setChanges] = useState<ChangeRow[]>([])
  const [loaded, setLoaded] = useState(false)
  const [filter, setFilter] = useState<FilterValue>(initialFilter)
  const [sort, setSort] = useState<SortValue>('observed')
  const [currentUser, setCurrentUser] = useState<string | null>(null)
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const [pendingPostCount, setPendingPostCount] = useState(0)

  const loadData = useCallback(() => {
    getPendingPostQueueSize().then(size => setPendingPostCount(size))
    chrome.storage.local.get(['last_logged_in_user'], result => {
      setCurrentUser(result?.last_logged_in_user || null)
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

        const rows: ChangeRow[] = all.map(change => {
          const id = change.getID()
          const observedUTC = change.getObservedUTC() || 0
          const action = change.getChangeType() || ''
          const seenCount = change.getSeenCount()
          const user = change.user || ''
          const isUser = user !== 'other'

          const item = getItemFromLocalStorage(user, isUser, id!, localStorage)
          const contentType: 'comment' | 'post' = isComment(id!) ? 'comment' : 'post'
          let text = ''
          let body = ''
          let subreddit = ''
          let timeLength = 'n/a'
          let formattedCreated = ''
          let createdUTC = 0

          if (item && typeof item !== 'string') {
            const lsi = item as LocalStorageItem
            createdUTC = lsi.getCreatedUTC() || 0
            text = (lsi.getText() || '').trim()
            body = (lsi.getBody?.() || '').trim()
            subreddit = lsi.getSubreddit?.() || ''
            if (createdUTC) {
              timeLength = getPrettyTimeLength(observedUTC - createdUTC) || 'n/a'
              formattedCreated = new Date(createdUTC * 1000).toString()
            }
          }

          if (!text && !body) text = id || ''

          const postId = item && typeof item !== 'string' ? (item as LocalStorageItem).getPostID?.() : undefined
          let href = '#'
          let needsResolve = false
          if (isComment(id!)) {
            if (postId) {
              const shortPost = postId.substring(3)
              const shortComment = id!.substring(3)
              href = `https://www.reddit.com/comments/${shortPost}/-/${shortComment}?context=3`
            } else {
              needsResolve = true
            }
          } else {
            const shortPost = id!.substring(3)
            href = `https://www.reddit.com/comments/${shortPost}`
          }

          return {
            id,
            action,
            actionVariant: variantFromAction(action),
            observedUTC,
            createdUTC,
            formattedObserved: getPrettyDate(observedUTC),
            formattedObservedFull: new Date(observedUTC * 1000).toString(),
            timeLength,
            formattedCreated,
            contentType,
            user,
            subreddit,
            text,
            body,
            href,
            needsResolve,
            seenCount,
          }
        })

        setChanges(rows)
        setLoaded(true)
      })
    })
  }, [])

  useEffect(() => {
    loadData()
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
      if (area === 'local' && changes.pending_post_lookups) {
        const newQueue = changes.pending_post_lookups.newValue || []
        setPendingPostCount(newQueue.length)
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
    fetch(apiJsonUrl, { credentials: 'omit' })
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
          const shortPost = linkId.substring(3)
          const shortComment = id.substring(3)
          window.open(`https://www.reddit.com/comments/${shortPost}/-/${shortComment}?context=3`, '_blank')
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

  const showFullBanner = isWelcome && !bannerDismissed
  const showSlimBanner = !isWelcome && changes.length === 0 && loaded

  if (!loaded) return <AppGlobal />

  return (
    <>
      <AppGlobal />
      <Page>
        {showFullBanner && (
          <WelcomeBanner>
            <h2>Monitoring is active{currentUser ? ` for u/${currentUser}` : ''}</h2>
            <p>reveddit real-time is now watching your Reddit comments and posts. You'll be notified whenever content is removed by moderators, reapproved, locked, or unlocked.</p>
            <ul>
              <li>The extension's toolbar icon displays a badge count of removed comments and posts you haven't viewed yet.</li>
              <li><strong>Pin the extension to your toolbar</strong> so you can always see this count. {getPinInstructions()}</li>
            </ul>
            {currentUser && (
              <p>
                You can also view your{' '}
                <BlueLink href={`https://www.reveddit.com/user/${currentUser}?all=true`} target="_blank" rel="noreferrer">
                  reveddit.com user page
                </BlueLink>
                , which can show orphaned and collapsed comments.
              </p>
            )}
            <BannerActions>
              <Button variant="secondary" onClick={() => setBannerDismissed(true)}>Got it</Button>
            </BannerActions>
          </WelcomeBanner>
        )}

        <PageHeader>
          <h1 style={{ margin: 0 }}>History</h1>
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
          <MessageBanner variant="info">Scanning {pendingPostCount} posts for removals. New results will appear here automatically.</MessageBanner>
        )}

        {visible.length > 0 ? (
          visible.map((row, idx) => (
            <ChangeCard key={`${row.id}-${idx}`} row={row} onResolve={handleResolve} />
          ))
        ) : (
          <>
            {showSlimBanner && (
              <WelcomeBanner>
                <h2>Monitoring is active{currentUser ? ` for u/${currentUser}` : ''}</h2>
                <p>No removed or changed content has been observed yet. You'll be notified when any of your comments or posts are removed by moderators.</p>
                <p>The extension's toolbar icon will display a count of removed items you haven't viewed. Pin the extension to your toolbar to always see it. {getPinInstructions()}</p>
                {currentUser && (
                  <p>
                    You can also check your{' '}
                    <BlueLink href={`https://www.reveddit.com/user/${currentUser}?all=true`} target="_blank" rel="noreferrer">
                      reveddit.com user page
                    </BlueLink>
                    {' '}for orphaned and collapsed comments.
                  </p>
                )}
              </WelcomeBanner>
            )}
            {!showSlimBanner && (
              <Empty>
                {changes.length === 0
                  ? 'No actions observed since extension installation.'
                  : 'No events match the current filter.'}
              </Empty>
            )}
          </>
        )}
      </Page>
    </>
  )
}

createRoot(document.getElementById('root')!).render(<History />)
