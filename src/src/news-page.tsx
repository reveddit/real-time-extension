// The news page: what the developer has announced, and the extension's version
// history. The popup's news card shows one message at a time and a dismissed one
// is gone from it, so this is where they all stay.

import { useEffect, useState } from 'react'
import styled from '@emotion/styled'
import { mountPage } from './ui/global'
import { Page, Card } from './ui/components'
import { tokens } from './ui/tokens'
import { markdownToHTML } from './ui/markdown'
import { fetchNews, getMessages, NewsMessage } from './news'

// STORE_DESCRIPTION.txt's version history, put in by the build (release-history.js)
declare const __RELEASE_HISTORY__: { version: string; date: string; notes: string[] }[]

type Tab = 'apps' | 'versions'
const TABS: { id: Tab; label: string }[] = [
  { id: 'apps', label: 'Other apps' },
  { id: 'versions', label: 'Version history' },
]

const Title = styled.h1`
  font-size: 1.4em;
  margin: 0 0 ${tokens.space.lg} 0;
`

const TabRow = styled.div`
  display: flex;
  gap: ${tokens.space.xl};
  border-bottom: 1px solid var(--border);
  margin-bottom: ${tokens.space.lg};
`

const TabButton = styled.button<{ $active: boolean }>`
  background: none;
  border: none;
  border-bottom: 2px solid ${p => (p.$active ? 'var(--link)' : 'transparent')};
  color: ${p => (p.$active ? 'var(--text-primary)' : 'var(--text-secondary)')};
  cursor: pointer;
  font: inherit;
  font-weight: ${p => (p.$active ? 600 : 400)};
  padding: ${tokens.space.sm} 0;
  margin-bottom: -1px;
  &:hover {
    color: var(--text-primary);
  }
`

const Entry = styled(Card)`
  display: flex;
  gap: ${tokens.space.lg};
  align-items: flex-start;
  & > img {
    width: 40px;
    height: 40px;
    border-radius: 8px;
    flex: none;
  }
  & > div {
    min-width: 0;
    flex: 1;
  }
  & h3 {
    margin: 0;
    font-size: 1em;
  }
  & time {
    display: block;
    margin: 2px 0 ${tokens.space.sm} 0;
    color: var(--text-secondary);
    font-size: 0.85em;
  }
  & ul {
    margin: ${tokens.space.sm} 0 0 0;
    padding-left: ${tokens.space.xl};
  }
`

const Empty = styled.p`
  color: var(--text-secondary);
`

const formatDate = (date: Date) =>
  Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })

function Message({ message }: { message: NewsMessage }) {
  const date = message.published_utc > 0 ? formatDate(new Date(message.published_utc)) : ''
  return (
    <Entry>
      {message.icon && <img src={message.icon} alt="" />}
      <div>
        <h3>{message.title}</h3>
        {date && <time>{date}</time>}
        <div className="md-body" dangerouslySetInnerHTML={{ __html: markdownToHTML(message.body_markdown, true) }} />
      </div>
    </Entry>
  )
}

function Messages({ messages }: { messages: NewsMessage[] | null }) {
  if (!messages) return null
  if (!messages.length) return <Empty>Nothing here yet.</Empty>
  return (
    <>
      {messages.map(message => (
        <Message key={message.id} message={message} />
      ))}
    </>
  )
}

function Versions() {
  return (
    <>
      {__RELEASE_HISTORY__.map(release => (
        <Entry key={release.version}>
          <div>
            <h3>v{release.version}</h3>
            <time>{formatDate(new Date(`${release.date.replace(/\//g, '-')}T12:00:00`))}</time>
            <ul>
              {release.notes.map((note, i) => (
                <li key={i}>{note}</li>
              ))}
            </ul>
          </div>
        </Entry>
      ))}
    </>
  )
}

function News() {
  const [tab, setTab] = useState<Tab>(window.location.hash === '#versions' ? 'versions' : 'apps')
  const [messages, setMessages] = useState<NewsMessage[] | null>(null)

  useEffect(() => {
    // The cached messages show at once, so a fetch that stalls leaves them on the page,
    // and what the fetch brings replaces them
    getMessages()
      .then(cached => {
        if (cached.length) setMessages(cached)
      })
      .then(() => fetchNews())
      .finally(() => getMessages().then(setMessages))
  }, [])

  return (
    <Page>
      <Title>News</Title>
      <TabRow role="tablist">
        {TABS.map(({ id, label }) => (
          <TabButton key={id} role="tab" aria-selected={tab === id} $active={tab === id} onClick={() => setTab(id)}>
            {label}
          </TabButton>
        ))}
      </TabRow>
      <div role="tabpanel">{tab === 'apps' ? <Messages messages={messages} /> : <Versions />}</div>
    </Page>
  )
}

mountPage(News)
