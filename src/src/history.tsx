import React, { useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import styled from '@emotion/styled'
import { Global } from '@emotion/react'
import { getAllChanges, getItemFromLocalStorage } from './storage'
import { ChangeForStorage, LocalStorageItem, getPrettyDate, getPrettyTimeLength, isComment } from './common'
import { tableGlobalStyles } from './ui/components'

const Tables = styled.div`
  max-width: 800px;
  margin: 0 auto;
  display: table;
`

const ActionColumn = styled.td`
  text-align: center;
`

const ActionBadge = styled.div<{ action: string }>`
  border-radius: 10px;
  font-weight: 700;
  padding: 7px;
  ${p => {
    switch (p.action) {
      case 'removed': return 'background: rgb(199,3,0); color: white;'
      case 'deleted': return 'background: #00007d; color: white;'
      case 'approved': return 'background: green; color: white;'
      case 'locked': return 'background: #ffd635; color: black;'
      case 'unlocked': return 'background: #ffd635; color: green;'
      default: return ''
    }
  }}
`

const SeenCount = styled.div`
  margin-top: 7px;
`

interface ChangeRow {
  id: string | null
  action: string
  actionClass: string
  observedUTC: number
  formattedObserved: string
  formattedObservedFull: string
  timeLength: string
  formattedCreated: string
  contentType: string
  user: string
  text: string
  href: string
  needsResolve: boolean
  seenCount: number | null
}

function History() {
  const [changes, setChanges] = useState<ChangeRow[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    getAllChanges(changesByUser => {
      chrome.storage.local.get(undefined as any, localStorage => {
        const allChanges: ChangeForStorage[] = []
        Object.keys(changesByUser).forEach(user => {
          changesByUser[user].forEach((changeObj: any) => {
            const change = new ChangeForStorage({ object: changeObj })
            change.user = user
            allChanges.push(change)
          })
        })
        allChanges.sort((a, b) => (b.getObservedUTC() || 0) - (a.getObservedUTC() || 0))

        const rows: ChangeRow[] = allChanges.map(change => {
          const id = change.getID()
          const observedUTC = change.getObservedUTC() || 0
          const action = change.getChangeType() || ''
          const seenCount = change.getSeenCount()
          const user = change.user || ''
          let isUser = user !== 'other'

          const item_localStorage = getItemFromLocalStorage(user, isUser, id!, localStorage)
          const contentType = isComment(id!) ? 'comment' : 'post'
          let text = id || ''
          let timeLength = 'n/a'
          let formattedCreated = ''

          if (item_localStorage) {
            const createdUTC = item_localStorage.getCreatedUTC()
            if (item_localStorage.getText().trim()) {
              text = item_localStorage.getText().trim()
            }
            timeLength = getPrettyTimeLength(observedUTC - createdUTC) || ''
            formattedCreated = new Date(createdUTC * 1000).toString()
          }

          const postId = item_localStorage && typeof item_localStorage !== 'string' ? item_localStorage.getPostID?.() : undefined
          let href: string
          let needsResolve = false

          if (isComment(id!)) {
            if (postId) {
              const shortPost = postId.substring(3)
              const shortComment = id!.substring(3)
              href = `https://www.reddit.com/comments/${shortPost}/-/${shortComment}?context=3`
            } else {
              href = '#'
              needsResolve = true
            }
          } else {
            const shortPost = id!.substring(3)
            href = `https://www.reddit.com/comments/${shortPost}`
          }

          // Map display action to CSS class
          const actionClass = action.replace(/ /g, '-').split('-')[0]

          return {
            id,
            action,
            actionClass,
            observedUTC,
            formattedObserved: getPrettyDate(observedUTC),
            formattedObservedFull: new Date(observedUTC * 1000).toString(),
            timeLength,
            formattedCreated,
            contentType,
            user,
            text,
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

  const handleResolveClick = (e: React.MouseEvent, id: string) => {
    e.preventDefault()
    const apiJsonUrl = `https://www.reddit.com/api/info.json?id=${encodeURIComponent(id)}`
    const apiPageUrl = `https://www.reddit.com/api/info?id=${encodeURIComponent(id)}`

    fetch(apiJsonUrl, { credentials: 'omit' })
      .then(r => r.json())
      .then(json => {
        const children = (json?.data?.children && Array.isArray(json.data.children)) ? json.data.children : []
        const data = children[0]?.data || (children.find((ch: any) => ch?.data?.name === id) || {}).data
        if (data?.permalink) {
          window.location.href = `https://www.reddit.com${data.permalink}?context=3`
          return
        }
        const linkId = data && (data.link_id || (data.parent_id?.substr(0, 3) === 't3_' ? data.parent_id : null))
        if (linkId?.substr(0, 3) === 't3_') {
          const shortPost = linkId.substring(3)
          const shortComment = id.substring(3)
          window.location.href = `https://www.reddit.com/comments/${shortPost}/-/${shortComment}?context=3`
        } else {
          window.location.href = apiPageUrl
        }
      })
      .catch(() => {
        window.location.href = apiPageUrl
      })
  }

  if (!loaded) return null

  return (
    <>
      <Global styles={tableGlobalStyles} />
      <div>
        <h1>History</h1>
        <Tables>
          {changes.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>action</th>
                  <th>action observed time &#x25BC;</th>
                  <th>time between item creation and observed action</th>
                  <th>type</th>
                  <th>author</th>
                  <th>link</th>
                </tr>
              </thead>
              <tbody>
                {changes.map((row, idx) => (
                  <tr key={idx}>
                    <ActionColumn>
                      <ActionBadge action={row.actionClass}>
                        {row.action.replace(/ /g, '\u00a0')}
                      </ActionBadge>
                      {row.seenCount ? <SeenCount>seen {row.seenCount}x</SeenCount> : null}
                    </ActionColumn>
                    <td title={row.formattedObservedFull}>{row.formattedObserved}</td>
                    <td title={row.formattedCreated}>{row.timeLength}</td>
                    <td>{row.contentType}</td>
                    <td>{row.user}</td>
                    <td>
                      {row.needsResolve ? (
                        <a href="#" onClick={e => handleResolveClick(e, row.id!)}>{row.text}</a>
                      ) : (
                        <a href={row.href}>{row.text}</a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No actions observed since extension installation. Subscribe to a user or a post or comment to track changes.</p>
          )}
        </Tables>
      </div>
    </>
  )
}

createRoot(document.getElementById('root')!).render(<History />)
