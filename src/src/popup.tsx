import React, { useState, useEffect, useCallback } from 'react'
import { createRoot } from 'react-dom/client'
import styled from '@emotion/styled'
import { css } from '@emotion/react'
import { goToOptions, getFullIDsFromURL, createNotification } from './common'
import { AppGlobal, setThemeMode, THEME_STORAGE_KEY } from './ui/global'
import { ActionBtn, MessageBanner, MiniSpinner, Card } from './ui/components'
import { tokens } from './ui/tokens'
import {
  getSubscribedUsers_withSeenAndUnseenIDs,
  subscribeId, unsubscribeId,
  markThingAsSeen, setStorageUpdateBadge, markEverythingAsSeen, clearPendingNotification,
  getPendingPostQueueSize,
} from './storage'
import { setCurrentStateForId } from './monitoring'
import { fetchNews, getUnreadMessages, markNewsRead, NewsMessage } from './news'
import { markdownToHTML } from './ui/markdown'

declare const __LATEST_RELEASE__: { version: string; description: string } | null

const PopupContainer = styled.div`
  width: 320px;
  padding: ${tokens.space.md};
  font-size: 14px;
`

const TopRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${tokens.space.sm};
  gap: ${tokens.space.sm};
`

const Brand = styled.div`
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: 0.01em;
`


const SubsCard = styled(Card)`
  padding: ${tokens.space.xs} ${tokens.space.md};
  margin: ${tokens.space.sm} 0;
`

const SubRow = styled.a`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 10px 10px 12px;
  margin: 0 -10px;
  min-height: 36px;
  border-radius: ${tokens.radius.md};
  text-decoration: none;
  color: var(--link);
  cursor: pointer;
  transition: background-color 0.12s ease;

  & + & {
    border-top: 1px solid var(--border);
    border-top-left-radius: 0;
    border-top-right-radius: 0;
  }

  &:hover {
    background: var(--bg-surface-hover);
    text-decoration: none;
    & .sub-chev { color: var(--text-secondary); }
  }
  &:active {
    background: var(--bg-surface-hover);
    filter: brightness(0.95);
  }
  &:focus-visible {
    outline: 2px solid var(--input-focus);
    outline-offset: -2px;
  }
`

const SubRowText = styled.span`
  flex: 1;
  min-width: 0;
  font-size: 0.95em;
  color: var(--link);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const SubRowChev = styled.span`
  flex-shrink: 0;
  font-size: 18px;
  line-height: 1;
  margin-left: 2px;
  color: var(--text-muted);
  transition: color 0.12s ease;
`

const UnseenPill = styled.span`
  min-width: 2em;
  text-align: center;
  padding: 2px 8px;
  border-radius: ${tokens.radius.pill};
  background: var(--bg-surface-hover);
  color: var(--text-secondary);
  font-size: 0.82em;
  font-weight: 600;
`

const UnseenPillActive = styled(UnseenPill)`
  background: var(--accent);
  color: var(--text-on-accent);
`


const SwitchRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 0;
`

const SwitchLabel = styled.span<{ active: boolean }>`
  color: ${p => (p.active ? 'var(--text-primary)' : 'var(--text-secondary)')};
  cursor: pointer;
  font-size: 0.92em;
`

const SwitchWrapper = styled.label`
  position: relative;
  display: inline-block;
  width: 42px;
  height: 22px;
  & input { opacity: 0; width: 0; height: 0; }
  & .slider {
    position: absolute;
    cursor: pointer;
    top: 0; left: 0; right: 0; bottom: 0;
    background: var(--button-bg);
    border: 1px solid var(--border);
    border-radius: ${tokens.radius.pill};
    transition: 0.2s;
  }
  & .slider::before {
    position: absolute;
    content: '';
    height: 16px;
    width: 16px;
    left: 2px;
    top: 2px;
    background: var(--text-primary);
    border-radius: 50%;
    transition: 0.2s;
  }
  & input:checked + .slider {
    background: var(--accent);
    border-color: var(--accent);
  }
  & input:checked + .slider::before {
    transform: translateX(20px);
    background: var(--text-on-accent);
  }
`


const NewsCard = styled(Card)`
  padding: ${tokens.space.sm} ${tokens.space.md};
  background: var(--note-bg);
  border-color: var(--border-light);
  position: relative;
  & h4 {
    margin: 0 0 4px 0;
    font-size: 0.92em;
    color: var(--text-primary);
  }
  & .md-body { font-size: 0.85em; color: var(--text-primary); }
  & .dismiss {
    position: absolute;
    top: 6px;
    right: 8px;
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    font-size: 16px;
    line-height: 1;
    padding: 2px 6px;
    &:hover { color: var(--text-primary); }
  }
`

const ThemeToggleBtn = styled.button`
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 18px;
  padding: 2px 4px;
  line-height: 1;
  transition: color 0.15s ease;
  &:hover { color: var(--text-primary); }
`

const SubsCardFooter = styled.div`
  border-top: 1px solid var(--border);
  margin-top: 4px;
  padding-top: 6px;
  text-align: right;
`

const MarkSeenLink = styled.a<{ $enabled: boolean }>`
  font-size: 0.78em;
  text-decoration: none;
  transition: color 0.15s ease;
  ${p =>
    p.$enabled
      ? css`
          color: var(--link);
          cursor: pointer;
          &:hover {
            color: var(--link-hover);
            text-decoration: underline;
          }
        `
      : css`
          color: var(--text-muted);
          cursor: default;
          opacity: 0.55;
          &:hover {
            text-decoration: none;
          }
        `}
`

const PopupActions = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  margin-top: ${tokens.space.sm};
`

const ActionRowBtn = styled.button`
  padding: 7px 10px;
  background: var(--accent);
  color: var(--text-on-accent);
  border: 0;
  border-radius: ${tokens.radius.md};
  font-size: 0.88em;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s ease;
  &:hover {
    background: var(--accent-hover);
  }
`

const FooterRow = styled.div`
  display: flex;
  justify-content: space-between;
  margin: 8px 0 2px;
`

const FooterLink = styled.a`
  font-size: 0.78em;
  color: var(--text-muted);
  text-decoration: none;
  cursor: pointer;
  &:hover {
    color: var(--text-secondary);
    text-decoration: underline;
  }
`

function ToggleSwitch({ type, checked, onToggle }: {
  type: string
  checked: boolean
  onToggle: (checked: boolean) => void
}) {
  return (
    <SwitchRow>
      <SwitchLabel active={checked} onClick={() => onToggle(!checked)}>
        {checked ? 'subscribed' : 'subscribe'} to {type}
      </SwitchLabel>
      <SwitchWrapper>
        <input
          type="checkbox"
          checked={checked}
          onChange={e => onToggle(e.target.checked)}
        />
        <span className="slider" />
      </SwitchWrapper>
    </SwitchRow>
  )
}

function UnseenRow({ thing, isUser, unseenCount, totalStr, url }: {
  thing: string
  isUser: boolean
  unseenCount: number
  totalStr?: string
  url: string
}) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    chrome.storage.sync.get(undefined, storage => {
      markThingAsSeen(storage, thing, isUser)
      clearPendingNotification(thing).catch(() => {})
      setStorageUpdateBadge(storage).then(() => {
        chrome.tabs.create({ url })
        window.close()
      })
    })
  }

  const Pill = unseenCount > 0 ? UnseenPillActive : UnseenPill

  return (
    <SubRow href={url} target="_blank" onClick={handleClick}>
      <SubRowText>{thing}</SubRowText>
      <Pill>{totalStr ?? unseenCount}</Pill>
      <SubRowChev className="sub-chev" aria-hidden="true">›</SubRowChev>
    </SubRow>
  )
}

function NewsBanner({ message, onDismiss }: { message: NewsMessage; onDismiss: () => void }) {
  return (
    <NewsCard>
      <button className="dismiss" onClick={onDismiss} aria-label="Dismiss">×</button>
      <h4>{message.title}</h4>
      <div
        className="md-body"
        dangerouslySetInnerHTML={{ __html: markdownToHTML(message.body_markdown) }}
      />
    </NewsCard>
  )
}

function Popup() {
  const [errorStatus, setErrorStatus] = useState<string | null>(null)
  const [userData, setUserData] = useState<{
    users: Record<string, {unseen: string[]; seen: string[]}>
    otherUnseen: string[]
    otherTotal: number
  } | null>(null)
  const [currentUser, setCurrentUser] = useState<string | null | undefined>(undefined)
  const [hasSupportedTabs, setHasSupportedTabs] = useState(false)
  const [showSubdomainWarning, setShowSubdomainWarning] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [syncStorage, setSyncStorage] = useState<Record<string, any> | null>(null)
  const [activeTab, setActiveTab] = useState<{ url: string; postID?: string; commentID?: string } | null>(null)
  const [reconnecting, setReconnecting] = useState(false)
  const [reconnectSuccess, setReconnectSuccess] = useState<boolean | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [connectResult, setConnectResult] = useState<{ success: boolean; user?: string } | null>(null)
  const [connectMessage, setConnectMessage] = useState<string | null>(null)
  const [newsMessage, setNewsMessage] = useState<NewsMessage | null>(null)
  const [pendingPostCount, setPendingPostCount] = useState(0)
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [showRelease, setShowRelease] = useState(false)

  const loadData = useCallback(() => {
    setUserData(null)
    setCurrentUser(undefined)
    setSyncStorage(null)
    setActiveTab(null)
    setReconnecting(false)
    setReconnectSuccess(null)
    setConnecting(false)
    setConnectResult(null)
    setConnectMessage(null)

    chrome.storage.local.get(['error_status'], result => {
      setErrorStatus(result?.error_status || null)
    })

    getSubscribedUsers_withSeenAndUnseenIDs(async (users, storage) => {
      const other = users['other']
      delete users['other']
      setUserData({
        users,
        otherUnseen: other.unseen,
        otherTotal: Object.keys(storage.other_subscriptions).length
      })

      chrome.tabs.query({ url: ['*://*.reddit.com/*'] }, tabs => {
        const supported = tabs.filter(tab => {
          try {
            const h = new URL(tab.url!).hostname
            return h === 'www.reddit.com' || h === 'old.reddit.com'
          } catch { return false }
        })
        setHasSupportedTabs(supported.length > 0)
        if (tabs.length > 0 && supported.length === 0) {
          chrome.storage.local.get(['subdomain_warning_shown'], result => {
            if (!result.subdomain_warning_shown) {
              setShowSubdomainWarning(true)
              chrome.storage.local.set({ subdomain_warning_shown: true })
            }
          })
        }
      })

      chrome.storage.local.get(['last_logged_in_user'], result => {
        setCurrentUser(result?.last_logged_in_user || null)
      })
    })

    chrome.storage.sync.get(undefined, sync => {
      setSyncStorage(sync)
      chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        const url = tabs[0]?.url
        if (url) {
          const [postID, commentID] = getFullIDsFromURL(url)
          setActiveTab({ url, postID, commentID })
        }
      })
    })

    getPendingPostQueueSize().then(size => setPendingPostCount(size))

    // News feed: opportunistically refresh (6h throttled) then read top unread.
    fetchNews().finally(() => {
      getUnreadMessages().then(unread => {
        setNewsMessage(unread[0] || null)
      })
    })
  }, [])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    const listener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === 'local' && changes.pending_post_lookups) {
        const newQueue = changes.pending_post_lookups.newValue || []
        setPendingPostCount(newQueue.length)
      }
    }
    chrome.storage.onChanged.addListener(listener)
    return () => chrome.storage.onChanged.removeListener(listener)
  }, [])

  useEffect(() => {
    chrome.storage.local.get([THEME_STORAGE_KEY], result => {
      const mode = result[THEME_STORAGE_KEY] || 'auto'
      const resolved = mode === 'auto'
        ? (window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
        : mode
      setTheme(resolved)
    })
  }, [])

  useEffect(() => {
    if (__LATEST_RELEASE__) {
      chrome.storage.local.get(['dismissed_release_version'], result => {
        if (result.dismissed_release_version !== __LATEST_RELEASE__!.version) {
          setShowRelease(true)
        }
      })
    }
  }, [])

  const handleToggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    setThemeMode(next)
  }

  const handleDismissRelease = () => {
    setShowRelease(false)
    if (__LATEST_RELEASE__) {
      chrome.storage.local.set({ dismissed_release_version: __LATEST_RELEASE__.version })
    }
  }

  const handleClearNotifications = () => {
    markEverythingAsSeen().then(() => loadData())
  }

  const handleDismissNews = () => {
    if (!newsMessage) return
    const id = newsMessage.id
    markNewsRead(id).then(() => getUnreadMessages()).then(unread => {
      setNewsMessage(unread[0] || null)
    })
  }

  const handleReconnect = () => {
    setReconnecting(true)
    chrome.runtime.sendMessage({ action: 'store-reddit-cookies' })
    setTimeout(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(chrome.runtime.sendMessage as any)({ action: 'try-reconnect' }, (response: {success?: boolean; user?: string}) => {
        if (response?.success) {
          setReconnectSuccess(true)
          setTimeout(() => loadData(), 1000)
        } else {
          setReconnecting(false)
          setReconnectSuccess(false)
        }
      })
    }, 500)
  }

  const handleConnect = () => {
    setConnecting(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(chrome.runtime.sendMessage as any)({ action: 'try-reconnect' }, (response: {success?: boolean; user?: string}) => {
      if (response?.success) {
        setConnectResult({ success: true, user: response.user })
        setTimeout(() => loadData(), 1000)
      } else {
        setConnecting(false)
        setConnectMessage('Could not detect user. Make sure you are logged in to Reddit.')
      }
    })
  }

  const handleToggle = (id: string, subscribe: boolean, url: string) => {
    const fn = subscribe ? subscribeId : unsubscribeId
    fn(id, async () => {
      chrome.runtime.sendMessage({ action: 'update-badge' })
      if (subscribe) {
        await setCurrentStateForId(id, url)
      }
      loadData()
    })
  }

  const handleTestNotification = () => {
    createNotification({
      notificationId: 'test',
      title: 'Reveddit test notification',
      message: 'If you see this, notifications are working.'
    })
  }

  const switches: { id: string; type: string; subscribed: boolean }[] = []
  if (syncStorage && activeTab) {
    if (activeTab.commentID) {
      switches.push({
        id: activeTab.commentID,
        type: 'comment',
        subscribed: activeTab.commentID in (syncStorage.other_subscriptions || {})
      })
    }
    if (activeTab.postID) {
      switches.push({
        id: activeTab.postID,
        type: 'post',
        subscribed: activeTab.postID in (syncStorage.other_subscriptions || {})
      })
    }
  }

  const hasAnyUnseen =
    (userData?.otherUnseen.length ?? 0) > 0 ||
    Object.values(userData?.users ?? {}).some(u => u.unseen.length > 0)

  const historyUrl = chrome.runtime.getURL('src/history.html')

  let otherUrl = chrome.runtime.getURL('src/other.html')
  if (userData && userData.otherUnseen.length) {
    otherUrl = `https://www.reveddit.com/info?id=${userData.otherUnseen.join(',')}&removal_status=all`
  }

  // Current user section
  let currentUserSection: React.ReactNode = null
  if (currentUser !== undefined && userData) {
    if (currentUser) {
      const userInfo = userData.users[currentUser]
      const unseenIDs = userInfo ? userInfo.unseen : []
      currentUserSection = (
        <UnseenRow
          thing={currentUser}
          isUser={true}
          unseenCount={unseenIDs.length}
          url={historyUrl}
        />
      )
    } else {
      currentUserSection = (
        <div>
          {connectResult?.success ? (
            <MessageBanner variant="success">✓ Connected as {connectResult.user}!</MessageBanner>
          ) : (
            <>
              <MessageBanner variant="info">
                {connectMessage || 'Log in to www.reddit.com or old.reddit.com to get started.'}
              </MessageBanner>
              {hasSupportedTabs && (
                <ActionBtn onClick={handleConnect} disabled={connecting}>
                  {connecting ? 'Connecting...' : 'Connect'}
                </ActionBtn>
              )}
            </>
          )}
        </div>
      )
    }
  }

  return (
    <>
      <AppGlobal />
      <PopupContainer>
        <TopRow>
          <Brand>reveddit real-time</Brand>
          <ThemeToggleBtn onClick={handleToggleTheme} aria-label="Toggle theme">
            {theme === 'dark' ? '\u{1F319}' : '\u{2600}\u{FE0F}'}
          </ThemeToggleBtn>
        </TopRow>

        {showRelease && __LATEST_RELEASE__ && (
          <NewsCard>
            <button className="dismiss" onClick={handleDismissRelease} aria-label="Dismiss">&times;</button>
            <h4>v{__LATEST_RELEASE__.version} released</h4>
            <div className="md-body">{__LATEST_RELEASE__.description}</div>
          </NewsCard>
        )}

        {newsMessage && <NewsBanner message={newsMessage} onDismiss={handleDismissNews} />}

        {errorStatus && currentUser && (
          <div>
            {reconnectSuccess ? (
              <MessageBanner variant="success">✓ Connected!</MessageBanner>
            ) : errorStatus === 'rate_limited' ? (
              <MessageBanner variant="warning">
                ⚠ Reddit is rate-limiting requests. Monitoring will resume automatically.
              </MessageBanner>
            ) : (
              <>
                <MessageBanner variant="warning">
                  {reconnectSuccess === false
                    ? '⚠ Still disconnected. Try logging into Reddit again.'
                    : '⚠ Session may be disconnected.'}
                </MessageBanner>
                {hasSupportedTabs ? (
                  <ActionBtn onClick={handleReconnect} disabled={reconnecting}>
                    {reconnecting ? 'Checking...' : 'Reconnect'}
                  </ActionBtn>
                ) : (
                  <ActionBtn onClick={() => chrome.tabs.create({ url: 'https://www.reddit.com/', active: true })}>
                    Open Reddit to reconnect
                  </ActionBtn>
                )}
              </>
            )}
          </div>
        )}

        {switches.length > 0 && (
          <Card style={{ padding: `${tokens.space.sm} ${tokens.space.md}`, margin: `${tokens.space.sm} 0` }}>
            {switches.map(sw => (
              <ToggleSwitch
                key={sw.id}
                type={sw.type}
                checked={sw.subscribed}
                onToggle={checked => handleToggle(sw.id, checked, activeTab!.url)}
              />
            ))}
          </Card>
        )}

        {showSubdomainWarning && (
          <MessageBanner variant="warning">⚠ User monitoring requires www.reddit.com or old.reddit.com</MessageBanner>
        )}

        {pendingPostCount > 0 && (
          <MessageBanner variant="info"><MiniSpinner />Scanning {pendingPostCount} posts for removals...</MessageBanner>
        )}

        <SubsCard>
          {currentUserSection}
          {userData && (
            <UnseenRow
              thing="other"
              isUser={false}
              unseenCount={userData.otherUnseen.length}
              totalStr={`${userData.otherUnseen.length} / ${userData.otherTotal}`}
              url={otherUrl}
            />
          )}
          <SubsCardFooter>
            <MarkSeenLink
              href="#"
              $enabled={hasAnyUnseen}
              aria-disabled={!hasAnyUnseen}
              onClick={e => {
                e.preventDefault()
                if (hasAnyUnseen) handleClearNotifications()
              }}
            >
              mark all as seen
            </MarkSeenLink>
          </SubsCardFooter>
        </SubsCard>

        <PopupActions>
          <ActionRowBtn onClick={() => { chrome.tabs.create({ url: historyUrl }); window.close() }}>
            History
          </ActionRowBtn>
          <ActionRowBtn onClick={() => goToOptions()}>
            Options
          </ActionRowBtn>
        </PopupActions>

        <FooterRow>
          <FooterLink href="#" onClick={e => { e.preventDefault(); handleTestNotification() }}>
            send a test notification
          </FooterLink>
          <FooterLink href="https://www.reddit.com/r/reveddit" target="_blank" rel="noopener noreferrer">
            feedback
          </FooterLink>
        </FooterRow>
      </PopupContainer>
    </>
  )
}

createRoot(document.getElementById('root')!).render(<Popup />)
