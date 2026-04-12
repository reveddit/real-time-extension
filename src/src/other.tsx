import React, { useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import styled from '@emotion/styled'
import { getItemFromLocalStorage, unsubscribeId, getIDs_thing } from './storage'
import { getPrettyDate, isComment, sortDict_by_numberValuedAttribute, LocalStorageItem } from './common'
import { AppGlobal } from './ui/global'
import {
  Card, CardHeader, CardMeta, CardBody, CardActions,
  BlueLink, MutedLink, Button,
  Subreddit, PostTitle, MdBody,
} from './ui/components'
import { tokens } from './ui/tokens'
import { markdownToHTML } from './ui/markdown'

const Page = styled.div`
  max-width: 820px;
  margin: 0 auto;
  padding: ${tokens.space.xl} ${tokens.space.lg};
`

const PageHeader = styled.div`
  margin-bottom: ${tokens.space.lg};
  & h1 { margin: 0 0 ${tokens.space.sm} 0; font-size: 22px; }
  & p {
    color: var(--text-secondary);
    margin: ${tokens.space.xs} 0;
  }
`

const Empty = styled.div`
  & p { margin: 0 0 ${tokens.space.sm} 0; }
  & ul { margin: 0; padding-left: 1.4em; }
  & li { margin: ${tokens.space.xs} 0; color: var(--text-secondary); }
`

interface SubscriptionRow {
  id: string
  contentType: 'comment' | 'post'
  subreddit: string
  title: string
  body: string
  subscribedUTC: number
  createdUTC: number
  formattedSubscribed: string
  formattedSubscribedFull: string
  formattedCreated: string
  formattedCreatedFull: string
  href: string
  revedditHref: string
}

function buildRedditHref(id: string, isCommentItem: boolean, postId?: string): string {
  if (isCommentItem) {
    if (postId) {
      const shortPost = postId.substring(3)
      const shortComment = id.substring(3)
      return `https://www.reddit.com/comments/${shortPost}/-/${shortComment}?context=3`
    }
    return `https://www.reveddit.com/info?id=${encodeURIComponent(id)}`
  }
  const shortPost = id.substring(3)
  return `https://www.reddit.com/comments/${shortPost}`
}

function Other() {
  const [rows, setRows] = useState<SubscriptionRow[]>([])
  const [viewAllHref, setViewAllHref] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  const load = () => {
    chrome.storage.local.get(null, localStorage => {
      chrome.storage.sync.get(null, syncStorage => {
        const subs = syncStorage.other_subscriptions || {}
        const { unseen, seen } = getIDs_thing('other', false, syncStorage)
        const allIds = [...new Set([...unseen, ...seen])]
        setViewAllHref(
          allIds.length
            ? `https://www.reveddit.com/info?id=${allIds.join(',')}&removal_status=all`
            : null
        )

        const next: SubscriptionRow[] = []
        sortDict_by_numberValuedAttribute(subs, 't').forEach(([id, sub]) => {
          const subscribedUTC = sub.t || 0
          const item = getItemFromLocalStorage('other', false, id, localStorage)
          const isCommentItem = isComment(id)
          const contentType: 'comment' | 'post' = isCommentItem ? 'comment' : 'post'

          let title = ''
          let body = ''
          let subreddit = ''
          let createdUTC = 0
          let postId: string | undefined

          if (item && typeof item !== 'string') {
            const lsi = item as LocalStorageItem
            const text = (lsi.getText() || '').trim()
            const stored_body = (lsi.getBody?.() || '').trim()
            subreddit = lsi.getSubreddit?.() || ''
            createdUTC = lsi.getCreatedUTC() || 0
            postId = lsi.getPostID?.()

            if (isCommentItem) {
              body = text
            } else {
              title = text
              body = stored_body
            }
          }

          next.push({
            id,
            contentType,
            subreddit,
            title,
            body,
            subscribedUTC,
            createdUTC,
            formattedSubscribed: getPrettyDate(subscribedUTC),
            formattedSubscribedFull: new Date(subscribedUTC * 1000).toString(),
            formattedCreated: createdUTC ? getPrettyDate(createdUTC) : '',
            formattedCreatedFull: createdUTC ? new Date(createdUTC * 1000).toString() : '',
            href: buildRedditHref(id, isCommentItem, postId),
            revedditHref: `https://www.reveddit.com/info?id=${encodeURIComponent(id)}`,
          })
        })

        setRows(next)
        setLoaded(true)
      })
    })
  }

  useEffect(() => { load() }, [])

  const handleUnsubscribe = (id: string) => {
    unsubscribeId(id, () => {
      setRows(prev => prev.filter(r => r.id !== id))
    })
  }

  return (
    <>
      <AppGlobal />
      <Page>
        <PageHeader>
          <h1>Other subscriptions</h1>
          <p>
            Up to 100 items. When the list is full, the least-recently subscribed items are dropped.
            Subscribing to a post only tracks the post itself, not its comments.
          </p>
          {viewAllHref && (
            <p>
              <BlueLink href={viewAllHref} target="_blank" rel="noreferrer">
                View all current statuses on reveddit ↗
              </BlueLink>
            </p>
          )}
        </PageHeader>

        {loaded && rows.length === 0 && (
          <Card>
            <Empty>
              <p>No &quot;other&quot; subscriptions yet. To subscribe:</p>
              <ul>
                <li>Click &quot;subscribe-rev&quot; beneath any comment or post</li>
                <li>Right-click a Reddit or reveddit link and choose &quot;reveddit subscribe&quot;</li>
                <li>Open the reveddit extension popup on a Reddit page and toggle &quot;subscribe to comment/post&quot;</li>
              </ul>
            </Empty>
          </Card>
        )}

        {rows.map(row => (
          <Card key={row.id}>
            <CardHeader>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.9em' }}>
                {row.contentType}
                {row.subreddit && <> in <Subreddit>r/{row.subreddit}</Subreddit></>}
              </span>
            </CardHeader>
            <CardMeta>
              <span title={row.formattedSubscribedFull}>subscribed {row.formattedSubscribed}</span>
              {row.formattedCreated && (
                <span title={row.formattedCreatedFull}>created {row.formattedCreated}</span>
              )}
            </CardMeta>
            {row.title && <PostTitle>{row.title}</PostTitle>}
            {row.body && (
              <CardBody>
                <MdBody
                  className="md-body"
                  dangerouslySetInnerHTML={{ __html: markdownToHTML(row.body) }}
                />
              </CardBody>
            )}
            <CardActions>
              <BlueLink href={row.href} target="_blank" rel="noreferrer">Open on Reddit ↗</BlueLink>
              <MutedLink href={row.revedditHref} target="_blank" rel="noreferrer">
                View on reveddit ↗
              </MutedLink>
              <Button variant="ghost" onClick={() => handleUnsubscribe(row.id)}>
                unsubscribe
              </Button>
            </CardActions>
          </Card>
        ))}
      </Page>
    </>
  )
}

createRoot(document.getElementById('root')!).render(<Other />)
