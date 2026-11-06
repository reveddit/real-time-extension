import { useMemo } from 'react'
import { getItemFromLocalStorage } from './storage'
import { ChangeForStorage, LocalStorageItem, getPrettyDate, getPrettyTimeLength, isComment } from './common'
import { Card, CardHeader, CardMeta, CardBody, CardActions, Badge, Button, BlueLink, MutedLink, Author, Subreddit, PostTitle, MdBody } from './ui/components'
import { markdownToHTML } from './ui/markdown'
import { redditItemUrl } from './ui/links'

export interface ChangeRow {
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

export type FilterOption = 'removed' | 'deleted' | 'approved' | 'locked' | 'unlocked' | 'edited'
export type FilterValue = FilterOption[]
export type SortValue = 'observed' | 'delta' | 'created'

export const variantFromAction = (action: string): ChangeRow['actionVariant'] => {
  if (action === 'mod removed') return 'removed'
  if (action === 'user deleted') return 'deleted'
  if (action === 'approved') return 'approved'
  if (action === 'locked') return 'locked'
  if (action === 'unlocked') return 'unlocked'
  if (action === 'edited') return 'edited'
  return 'default'
}

export const matchesFilter = (row: ChangeRow, filter: FilterValue): boolean => {
  if (filter.length === 0) return true
  return filter.includes(row.actionVariant as FilterOption)
}

export function ChangeCard({ row, onResolve }: { row: ChangeRow; onResolve: (id: string) => void }) {
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

export function toRow(change: ChangeForStorage, localStorage: Parameters<typeof getItemFromLocalStorage>[3]): ChangeRow {
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
      href = redditItemUrl(id!, postId)
    } else {
      needsResolve = true
    }
  } else {
    href = redditItemUrl(id!)
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
}
