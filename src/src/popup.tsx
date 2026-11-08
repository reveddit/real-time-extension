import { useState, useEffect, useCallback, ReactNode } from 'react'
import styled from '@emotion/styled'
import { css } from '@emotion/react'
import { goToOptions, getFullIDsFromURL, createNotification } from './common'
import { mountPage, setThemeMode, resolveTheme, THEME_STORAGE_KEY } from './ui/global'
import { MessageBanner, MiniSpinner, Card } from './ui/components'
import { DiagStatus, formatDiagStatus } from './diag-status'
import { tokens } from './ui/tokens'
import {
  getSubscribedUsers_withSeenAndUnseenIDs,
  subscribeId,
  unsubscribeId,
  markEverythingAsSeen,
  getPendingPostQueueSize,
  getTestNotificationMessage,
} from './storage'
import { setCurrentStateForId } from './monitoring'
import { fetchNews, getUnreadMessages, getPendingUpdateVersion, markNewsRead, NewsMessage } from './news'
import { VIEWER_KEY } from './viewer'
import { WWW_DETECT_FAILURES_KEY } from './lookup-status'
import { canTabAnswer, isSupportedRedditTab } from './www-fetcher'
import { UnseenRow, ToggleSwitch, CurrentUserSection } from './popup-rows'
import { NewsBanner, UpdateNotice, ReleaseNotice, ErrorNotice } from './popup-notices'
import { reportProblem } from './popup-report'

declare const __LATEST_RELEASE__: { version: string; description: string } | null

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const runtimeAny = chrome.runtime as any

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

const StatusLine = styled.div`
  font-size: 11px;
  color: var(--text-secondary);
  margin: -6px 0 8px;
`

const SubsCard = styled(Card)`
  padding: ${tokens.space.xs} ${tokens.space.md};
  margin: ${tokens.space.sm} 0;
`

const HeaderButtons = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
`

const HeaderBtn = styled.button`
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 18px;
  padding: 2px 4px;
  line-height: 1;
  transition: color 0.15s ease;
  &:hover {
    color: var(--text-primary);
  }
  & svg {
    display: block;
  }
`

// Drawn in the button's text color, so they follow the theme and the hover
const Icon = ({ children }: { children: ReactNode }) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
)

const ClockIcon = () => (
  <Icon>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Icon>
)

// Eight teeth around a hole
const GearIcon = () => (
  <Icon>
    <path d="M10.2 4.4L10.5 1.6A10.5 10.5 0 0 1 13.5 1.6L13.8 4.4A7.8 7.8 0 0 1 16.1 5.4L18.3 3.6A10.5 10.5 0 0 1 20.4 5.7L18.6 7.9A7.8 7.8 0 0 1 19.6 10.2L22.4 10.5A10.5 10.5 0 0 1 22.4 13.5L19.6 13.8A7.8 7.8 0 0 1 18.6 16.1L20.4 18.3A10.5 10.5 0 0 1 18.3 20.4L16.1 18.6A7.8 7.8 0 0 1 13.8 19.6L13.5 22.4A10.5 10.5 0 0 1 10.5 22.4L10.2 19.6A7.8 7.8 0 0 1 7.9 18.6L5.7 20.4A10.5 10.5 0 0 1 3.6 18.3L5.4 16.1A7.8 7.8 0 0 1 4.4 13.8L1.6 13.5A10.5 10.5 0 0 1 1.6 10.5L4.4 10.2A7.8 7.8 0 0 1 5.4 7.9L3.6 5.7A10.5 10.5 0 0 1 5.7 3.6L7.9 5.4A7.8 7.8 0 0 1 10.2 4.4Z" />
    <circle cx="12" cy="12" r="3" />
  </Icon>
)

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

function Popup() {
  const [errorStatus, setErrorStatus] = useState<string | null>(null)
  const [wwwFailures, setWwwFailures] = useState(0)
  // null until the tab query answers
  const [wwwTabOpen, setWwwTabOpen] = useState<boolean | null>(null)
  // The connected second account (viewer.ts), if any
  const [viewerName, setViewerName] = useState('')
  const [userData, setUserData] = useState<{
    users: Record<string, { unseen: string[]; seen: string[] }>
    otherUnseen: string[]
    otherTotal: number
  } | null>(null)
  const [currentUser, setCurrentUser] = useState<string | null | undefined>(undefined)
  const [showSubdomainWarning, setShowSubdomainWarning] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [syncStorage, setSyncStorage] = useState<Record<string, any> | null>(null)
  const [activeTab, setActiveTab] = useState<{ url: string; postID?: string; commentID?: string } | null>(null)
  const [reconnecting, setReconnecting] = useState(false)
  const [reconnectSuccess, setReconnectSuccess] = useState<boolean | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [connectResult, setConnectResult] = useState<{ success: boolean; user?: string } | null>(null)
  const [connectMessage, setConnectMessage] = useState<string | null>(null)
  const [diagStatus, setDiagStatus] = useState<string>('')

  // 'last check 14:02 · next ~14:07' under the brand line: answers "is it
  // still checking?" without the options page. Refreshed every 30 s.
  useEffect(() => {
    const refresh = () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(chrome.runtime.sendMessage as any)({ action: 'get-diag-status' }, (resp: DiagStatus) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if ((chrome.runtime as any).lastError || !resp || resp.error) return
          setDiagStatus(formatDiagStatus(resp))
        })
      } catch {
        /* ignored */
      }
    }
    refresh()
    const timer = window.setInterval(refresh, 30000)
    return () => window.clearInterval(timer)
  }, [])
  const [newsMessage, setNewsMessage] = useState<NewsMessage | null>(null)
  const [pendingUpdate, setPendingUpdate] = useState<string | null>(null)
  const [pendingPostCount, setPendingPostCount] = useState(0)
  const [pendingProgress, setPendingProgress] = useState<{ processed: number; total: number } | null>(null)
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

    chrome.storage.local.get(['error_status', VIEWER_KEY, WWW_DETECT_FAILURES_KEY], result => {
      setErrorStatus(result?.error_status || null)
      setViewerName(String(result?.[VIEWER_KEY]?.name || ''))
      setWwwFailures(Number(result?.[WWW_DETECT_FAILURES_KEY]) || 0)
    })

    // Beside the sync read, not after it: the notices that depend on a tab wait for this
    chrome.tabs.query({ url: ['*://*.reddit.com/*'] }, found => {
      // undefined when the query fails, which must still answer those notices
      const tabs = found || []
      const supported = tabs.filter(isSupportedRedditTab)
      // Only a tab www-fetcher.ts can read through counts. A supported tab's address parses.
      setWwwTabOpen(supported.some(tab => new URL(tab.url!).hostname === 'www.reddit.com' && canTabAnswer(tab)))
      if (tabs.length > 0 && supported.length === 0) {
        chrome.storage.local.get(['subdomain_warning_shown'], result => {
          if (!result.subdomain_warning_shown) {
            setShowSubdomainWarning(true)
            chrome.storage.local.set({ subdomain_warning_shown: true })
          }
        })
      }
    })

    getSubscribedUsers_withSeenAndUnseenIDs(async (users, storage) => {
      const other = users['other']
      delete users['other']
      setUserData({
        users,
        otherUnseen: other.unseen,
        otherTotal: Object.keys(storage.other_subscriptions).length,
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
    chrome.storage.local.get(['pending_post_progress'], result => {
      const prog = result?.pending_post_progress
      setPendingProgress(
        prog && typeof prog.total === 'number' ? { processed: prog.processed || 0, total: prog.total } : null,
      )
    })

    // News feed: opportunistically refresh (at most hourly, MIN_FETCH_INTERVAL_MS) then read top unread.
    fetchNews().finally(() => {
      getUnreadMessages().then(unread => {
        setNewsMessage(unread[0] || null)
      })
      // Update notice: the feed says a newer version has been out for days
      // but this browser hasn't applied it (the 0.0.5.14 stuck-cohort case).
      getPendingUpdateVersion().then(latest => {
        if (!latest) return
        chrome.storage.local.get(['dismissed_update_notice_version'], result => {
          if (result.dismissed_update_notice_version !== latest) {
            setPendingUpdate(latest)
            // Nudge the browser to fetch the update; if it downloads, the
            // background onUpdateAvailable listener applies it immediately.
            try {
              runtimeAny.requestUpdateCheck?.(() => void runtimeAny.lastError)
            } catch {
              /* unsupported in some browsers */
            }
          }
        })
      })
    })
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    const listener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === 'local' && changes.pending_post_lookups) {
        const newQueue = changes.pending_post_lookups.newValue || []
        setPendingPostCount(newQueue.length)
        if (newQueue.length === 0) setPendingProgress(null)
      }
      if (area === 'local' && changes.pending_post_progress) {
        const prog = changes.pending_post_progress.newValue
        setPendingProgress(
          prog && typeof prog.total === 'number' ? { processed: prog.processed || 0, total: prog.total } : null,
        )
      }
    }
    chrome.storage.onChanged.addListener(listener)
    return () => chrome.storage.onChanged.removeListener(listener)
  }, [])

  useEffect(() => {
    chrome.storage.local.get([THEME_STORAGE_KEY], result => {
      setTheme(resolveTheme(result[THEME_STORAGE_KEY] || 'auto'))
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
    markNewsRead(id)
      .then(() => getUnreadMessages())
      .then(unread => {
        setNewsMessage(unread[0] || null)
      })
  }

  const handleDismissUpdateNotice = () => {
    if (pendingUpdate) {
      chrome.storage.local.set({ dismissed_update_notice_version: pendingUpdate })
    }
    setPendingUpdate(null)
  }

  const handleReconnect = () => {
    setReconnecting(true)
    chrome.runtime.sendMessage({ action: 'store-reddit-cookies' })
    setTimeout(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(chrome.runtime.sendMessage as any)(
        { action: 'try-reconnect' },
        (response: { success?: boolean; user?: string }) => {
          if (response?.success) {
            setReconnectSuccess(true)
            setTimeout(() => loadData(), 1000)
          } else {
            setReconnecting(false)
            setReconnectSuccess(false)
          }
        },
      )
    }, 500)
  }

  const handleConnect = () => {
    setConnecting(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(chrome.runtime.sendMessage as any)(
      { action: 'try-reconnect' },
      (response: { success?: boolean; user?: string; indeterminate?: boolean; reason?: string }) => {
        if (response?.success) {
          setConnectResult({ success: true, user: response.user })
          setTimeout(() => loadData(), 1000)
        } else {
          setConnecting(false)
          setConnectMessage(
            response?.indeterminate
              ? `Couldn't confirm your Reddit login${response.reason ? ` (${response.reason})` : ''}. ` +
                  "If you're already logged in, open www.reddit.com in a tab and try again."
              : 'Could not detect user. Make sure you are logged in to Reddit.',
          )
        }
      },
    )
  }

  const handleToggle = (id: string, subscribe: boolean, url: string) => {
    const fn = subscribe ? subscribeId : unsubscribeId
    fn(id, () => {
      chrome.runtime.sendMessage({ action: 'update-badge' })
      // Not waited for: the switch shows the change at once, and a read can stall
      if (subscribe) {
        setCurrentStateForId(id, url)
      }
      loadData()
    })
  }

  const handleTestNotification = () => {
    createNotification({
      notificationId: 'reveddit:test',
      title: 'Reveddit test notification',
      message: getTestNotificationMessage((syncStorage || {}).options || {}),
    })
  }

  const switches: { id: string; type: string; subscribed: boolean }[] = []
  if (syncStorage && activeTab) {
    if (activeTab.commentID) {
      switches.push({
        id: activeTab.commentID,
        type: 'comment',
        subscribed: activeTab.commentID in (syncStorage.other_subscriptions || {}),
      })
    }
    if (activeTab.postID) {
      switches.push({
        id: activeTab.postID,
        type: 'post',
        subscribed: activeTab.postID in (syncStorage.other_subscriptions || {}),
      })
    }
  }

  const hasAnyUnseen =
    (userData?.otherUnseen.length ?? 0) > 0 || Object.values(userData?.users ?? {}).some(u => u.unseen.length > 0)

  const historyUrl = chrome.runtime.getURL('src/history.html')

  let otherUrl = chrome.runtime.getURL('src/other.html')
  if (userData && userData.otherUnseen.length) {
    otherUrl = `https://www.reveddit.com/info?id=${userData.otherUnseen.join(',')}&removal_status=all`
  }

  return (
    <PopupContainer>
      <TopRow>
        <Brand>reveddit real-time</Brand>
        <HeaderButtons>
          <HeaderBtn
            title="History"
            aria-label="History"
            onClick={() => {
              chrome.tabs.create({ url: historyUrl })
              window.close()
            }}
          >
            <ClockIcon />
          </HeaderBtn>
          <HeaderBtn
            title="Options"
            aria-label="Options"
            onClick={() => {
              goToOptions()
              // Firefox leaves the popup open over the options page
              window.close()
            }}
          >
            <GearIcon />
          </HeaderBtn>
          <HeaderBtn onClick={handleToggleTheme} aria-label="Toggle theme">
            {theme === 'dark' ? '\u{1F319}' : '\u{2600}\u{FE0F}'}
          </HeaderBtn>
        </HeaderButtons>
      </TopRow>
      {diagStatus && <StatusLine>{diagStatus}</StatusLine>}

      {pendingUpdate && <UpdateNotice version={pendingUpdate} onDismiss={handleDismissUpdateNotice} />}

      {showRelease && __LATEST_RELEASE__ && (
        <ReleaseNotice release={__LATEST_RELEASE__} onDismiss={handleDismissRelease} />
      )}

      {newsMessage && <NewsBanner message={newsMessage} onDismiss={handleDismissNews} />}

      {errorStatus &&
        (currentUser || errorStatus === 'logged_in_view_unavailable' || errorStatus === 'checks_failing') && (
          <ErrorNotice
            errorStatus={errorStatus}
            viewerName={viewerName}
            currentUser={currentUser}
            wwwTabOpen={wwwTabOpen}
            wwwFailures={wwwFailures}
            reconnectSuccess={reconnectSuccess}
            reconnecting={reconnecting}
            onReconnect={handleReconnect}
          />
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
        <MessageBanner variant="info">
          <MiniSpinner />
          {pendingProgress && pendingProgress.total > 0
            ? `Scanning ${Math.min(pendingProgress.processed, pendingProgress.total)} of ${pendingProgress.total} posts for removals…`
            : `Scanning ${pendingPostCount} posts for removals…`}
        </MessageBanner>
      )}

      <SubsCard>
        {currentUser !== undefined && userData && (
          <CurrentUserSection
            currentUser={currentUser}
            users={userData.users}
            historyUrl={historyUrl}
            connectResult={connectResult}
            connectMessage={connectMessage}
            connecting={connecting}
            onConnect={handleConnect}
          />
        )}
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

      <FooterRow>
        <FooterLink
          href="#"
          onClick={e => {
            e.preventDefault()
            handleTestNotification()
          }}
        >
          send a test notification
        </FooterLink>
        <FooterLink
          href="#"
          onClick={e => {
            e.preventDefault()
            reportProblem()
          }}
        >
          report a problem
        </FooterLink>
      </FooterRow>
    </PopupContainer>
  )
}

mountPage(Popup)
