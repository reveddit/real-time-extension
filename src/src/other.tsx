import React, { useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import styled from '@emotion/styled'
import { Global } from '@emotion/react'
import { getItemFromLocalStorage, unsubscribeId, getIDs_thing } from './storage'
import { getPrettyDate, isComment, sortDict_by_numberValuedAttribute } from './common'
import { tableGlobalStyles } from './ui/components'

const Main = styled.div`
  width: 800px;
  margin: 0 auto;
`

const Link = styled.a`
  cursor: pointer;
  color: rgb(0, 0, 238);
`

interface Subscription {
  id: string
  timeSubscribedUTC: number
  contentType: string
  text: string
  createdUTC_pretty: string
  formatted_subscribedUTC: string
  formatted_createdUTC: string
  href: string
}

function Other() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [viewAllHref, setViewAllHref] = useState<string | null>(null)
  const [isEmpty, setIsEmpty] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    chrome.storage.local.get(undefined as any, localStorage => {
      chrome.storage.sync.get(undefined as any, syncStorage => {
        const { unseen, seen } = getIDs_thing('other', false, syncStorage)
        const subs = syncStorage.other_subscriptions

        const allIds = [...new Set([...unseen, ...seen])]
        if (allIds.length) {
          setViewAllHref(`https://www.reveddit.com/info?id=${allIds.join(',')}&removal_status=all`)
        }

        const items: Subscription[] = []
        sortDict_by_numberValuedAttribute(subs, 't').forEach(([id, item]) => {
          const timeSubscribedUTC = item.t
          const item_localStorage = getItemFromLocalStorage('other', false, id, localStorage)
          const contentType = isComment(id) ? 'comment' : 'post'
          let text = id
          let createdUTC_pretty = 'n/a'
          let formatted_createdUTC = ''
          const formatted_subscribedUTC = new Date(timeSubscribedUTC * 1000).toString()

          if (item_localStorage) {
            const item_createdUTC = item_localStorage.getCreatedUTC()
            if (item_localStorage.getText().trim()) {
              text = item_localStorage.getText().trim()
            }
            createdUTC_pretty = getPrettyDate(item_createdUTC)
            formatted_createdUTC = new Date(item_createdUTC * 1000).toString()
          }

          items.push({
            id,
            timeSubscribedUTC,
            contentType,
            text,
            createdUTC_pretty,
            formatted_subscribedUTC,
            formatted_createdUTC,
            href: `https://www.reveddit.com/api/info?id=${id}&removal_status=all`
          })
        })

        setSubscriptions(items)
        setIsEmpty(Object.keys(subs).length === 0)
        setLoaded(true)
      })
    })
  }, [])

  const handleUnsubscribe = (id: string) => {
    unsubscribeId(id, () => {
      setSubscriptions(prev => prev.filter(s => s.id !== id))
    })
  }

  if (!loaded) return null

  return (
    <>
      <Global styles={tableGlobalStyles} />
      <Main>
        <h1>Other Subscriptions</h1>
        <p>&bull; The maximum number of subscriptions is 100 items. If the maximum number is reached, the least recently subscribed items are bumped off the list.</p>
        <p>&bull; Subscribing to a post only tracks changes to the post itself, not the post&apos;s comments.</p>

        {viewAllHref && (
          <p><a href={viewAllHref}>View these items&apos; current status on reveddit</a></p>
        )}

        {subscriptions.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>index</th>
                <th>time subscribed &#x25BC;</th>
                <th>item creation time</th>
                <th>type</th>
                <th>text and link</th>
                <th>unsubscribe</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((sub, idx) => (
                <tr key={sub.id}>
                  <td>{idx + 1}</td>
                  <td title={sub.formatted_subscribedUTC}>{getPrettyDate(sub.timeSubscribedUTC)}</td>
                  <td title={sub.formatted_createdUTC}>{sub.createdUTC_pretty}</td>
                  <td>{sub.contentType}</td>
                  <td><a href={sub.href}>{sub.text}</a></td>
                  <td><Link onClick={() => handleUnsubscribe(sub.id)}>unsubscribe</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {isEmpty && (
          <div>
            <p>No &quot;other&quot; subscriptions yet. To subscribe,</p>
            <ul>
              <li>click &quot;subscribe-rev&quot; beneath any comment or post</li>
              <li>right-click on a reddit or reveddit link and select &quot;reveddit subscribe&quot;,</li>
              <li>or, click the reveddit extension icon and click &quot;subscribe&quot; to subscribe to the current page item.</li>
            </ul>
          </div>
        )}
      </Main>
    </>
  )
}

createRoot(document.getElementById('root')!).render(<Other />)
