import { useState, useEffect, useCallback } from 'react'
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

const ThemeToggleBtn = styled.button`
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

function Popup() {
  const [errorStatus, setErrorStatus] = useState<string | null>(null)
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

    chrome.storage.local.get(['error_status', VIEWER_KEY], result => {
      setErrorStatus(result?.error_status || null)
      setViewerName(String(result?.[VIEWER_KEY]?.name || ''))
    })

    getSubscribedUsers_withSeenAndUnseenIDs(async (users, storage) => {
      const other = users['other']
      delete users['other']
      setUserData({
        users,
        otherUnseen: other.unseen,
        otherTotal: Object.keys(storage.other_subscriptions).length,
      })

      chrome.tabs.query({ url: ['*://*.reddit.com/*'] }, tabs => {
        const supported = tabs.filter(tab => {
          try {
            const h = new URL(tab.url!).hostname
            return h === 'www.reddit.com' || h === 'old.reddit.com'
          } catch {
            return false
          }
        })
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
      notificationId: 'test',
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
        <ThemeToggleBtn onClick={handleToggleTheme} aria-label="Toggle theme">
          {theme === 'dark' ? '\u{1F319}' : '\u{2600}\u{FE0F}'}
        </ThemeToggleBtn>
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

      <PopupActions>
        <ActionRowBtn
          onClick={() => {
            chrome.tabs.create({ url: historyUrl })
            window.close()
          }}
        >
          History
        </ActionRowBtn>
        <ActionRowBtn onClick={() => goToOptions()}>Options</ActionRowBtn>
      </PopupActions>

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
