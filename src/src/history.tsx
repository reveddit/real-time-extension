import React, { useState, useEffect, useMemo } from 'react'
import { createRoot } from 'react-dom/client'
import styled from '@emotion/styled'
import { getAllChanges, getItemFromLocalStorage } from './storage'
import { ChangeForStorage, LocalStorageItem, getPrettyDate, getPrettyTimeLength, isComment } from './common'
import { AppGlobal } from './ui/global'
import { Card, CardHeader, CardMeta, CardBody, CardActions, Badge, Button, BlueLink, MutedLink, Author, Subreddit, PostTitle, MdBody } from './ui/components'
import { tokens } from './ui/tokens'
import { markdownToHTML } from './ui/markdown'

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
  gap: ${tokens.space.md};
  align-items: center;
  flex-wrap: wrap;
  & label {
    color: var(--text-secondary);
    font-size: 0.85em;
  }
  & select {
    background: var(--input-bg);
    color: var(--text-primary);
    border: 1px solid var(--input-border);
    border-radius: ${tokens.radius.sm};
    padding: 5px 8px;
    font: inherit;
  }
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

type FilterValue = 'all' | 'removed' | 'deleted' | 'approved' | 'locked' | 'unlocked' | 'edited'
type SortValue = 'observed' | 'delta'

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
  if (filter === 'all') return true
  if (filter === 'removed') return row.actionVariant === 'removed'
  if (filter === 'deleted') return row.actionVariant === 'deleted'
  if (filter === 'approved') return row.actionVariant === 'approved'
  if (filter === 'locked') return row.actionVariant === 'locked'
  if (filter === 'unlocked') return row.actionVariant === 'unlocked'
  if (filter === 'edited') return row.actionVariant === 'edited'
  return true
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
  const [filter, setFilter] = useState<FilterValue>('all')
  const [sort, setSort] = useState<SortValue>('observed')

  useEffect(() => {
    getAllChanges(changesByUser => {
      chrome.storage.local.get(null, localStorage => {
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
    } else {
      sorted.sort((a, b) => (b.observedUTC - b.createdUTC) - (a.observedUTC - a.createdUTC))
    }
    return sorted
  }, [changes, filter, sort])

  if (!loaded) return <AppGlobal />

  return (
    <>
      <AppGlobal />
      <Page>
        <PageHeader>
          <h1 style={{ margin: 0 }}>History</h1>
          <Controls>
            <label>
              filter{' '}
              <select value={filter} onChange={e => setFilter(e.target.value as FilterValue)}>
                <option value="all">all</option>
                <option value="removed">mod removed</option>
                <option value="deleted">user deleted</option>
                <option value="locked">locked</option>
                <option value="unlocked">unlocked</option>
                <option value="approved">approved</option>
                <option value="edited">edited</option>
              </select>
            </label>
            <label>
              sort{' '}
              <select value={sort} onChange={e => setSort(e.target.value as SortValue)}>
                <option value="observed">observed time</option>
                <option value="delta">time between creation and action</option>
              </select>
            </label>
          </Controls>
        </PageHeader>

        {visible.length > 0 ? (
          visible.map((row, idx) => (
            <ChangeCard key={`${row.id}-${idx}`} row={row} onResolve={handleResolve} />
          ))
        ) : (
          <Empty>
            {changes.length === 0
              ? 'No actions observed since extension installation. Subscribe to a user or a post or comment to track changes.'
              : 'No events match the current filter.'}
          </Empty>
        )}
      </Page>
    </>
  )
}

createRoot(document.getElementById('root')!).render(<History />)
