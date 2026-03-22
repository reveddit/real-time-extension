import React, { useState, useEffect, useCallback } from 'react'
import { createRoot } from 'react-dom/client'
import styled from '@emotion/styled'
import { Global, css } from '@emotion/react'
import { goToOptions, getFullIDsFromURL, createNotification } from './common'
import { colors } from './ui/theme'
import { BlueLink, ActionBtn, MessageBanner } from './ui/components'
import {
  getSubscribedUsers_withSeenAndUnseenIDs,
  subscribeId, unsubscribeId,
  markThingAsSeen, setStorageUpdateBadge, markEverythingAsSeen
} from './storage'
import { setCurrentStateForId } from './monitoring'

const globalStyles = css`
  body, input, button {
    font-size: 1.3em;
  }
`

const PopupContainer = styled.div`
  width: 300px;
`

const WarningContainer = styled.div`
  margin-bottom: 10px;
`

const WarningHint = styled.div`
  color: #856404;
  font-size: 0.85em;
  text-align: center;
  padding: 4px 8px;
`

const ConnectContainer = styled.div`
  margin: 5px 0;
`

const Unseen = styled.span`
  display: inline-block;
  border-right: 1px solid lightgrey;
  min-width: 2.5em;
  margin-right: 0.6em;
`

const ClearNotifications = styled(BlueLink)`
  font-size: small;
  cursor: pointer;
`

const BottomDiv = styled.div`
  text-align: center;
`

const OptionsLink = styled(BlueLink)`
  float: right;
`

/* Toggle switch styles */
const SwitchRow = styled.div`
  &::after {
    content: '';
    display: block;
    clear: both;
  }
`

const TextLabel = styled.span<{ active: boolean }>`
  color: ${p => p.active ? colors.blue : 'rgb(204,204,204)'};
  cursor: pointer;

  .un {
    visibility: ${p => p.active ? 'hidden' : 'visible'};
  }
`

const SwitchWrapper = styled.div`
  float: right;
  margin-bottom: 5px;

  input {
    position: absolute;
    margin-left: -9999px;
    visibility: hidden;
  }

  input + label {
    display: block;
    position: relative;
    cursor: pointer;
    outline: none;
    user-select: none;
    padding: 2px;
    width: 60px;
    height: 30px;
    background-color: #dddddd;
    border-radius: 30px;
    transition: background 0.4s;
  }

  input + label:before,
  input + label:after {
    display: block;
    position: absolute;
    content: "";
  }

  input + label:before {
    top: 2px;
    left: 2px;
    bottom: 2px;
    right: 2px;
    background-color: #fff;
    border-radius: 30px;
    transition: background 0.4s;
  }

  input + label:after {
    top: 4px;
    left: 4px;
    bottom: 4px;
    width: 25px;
    background-color: #dddddd;
    border-radius: 25px;
    transition: margin 0.4s, background 0.4s;
  }

  input:checked + label {
    background-color: ${colors.blue};
  }

  input:checked + label:after {
    margin-left: 30px;
    background-color: ${colors.blue};
  }
`

function ToggleSwitch({ id, type, checked, onToggle }: {
  id: string
  type: string
  checked: boolean
  onToggle: (checked: boolean) => void
}) {
  const inputId = `toggle-${type}`

  return (
    <SwitchRow>
      <TextLabel active={checked} onClick={() => onToggle(!checked)}>
        <span className="un">un</span>subscribed {type}
      </TextLabel>
      <SwitchWrapper>
        <input
          id={inputId}
          className="cmn-toggle cmn-toggle-round-flat"
          type="checkbox"
          checked={checked}
          onChange={e => onToggle(e.target.checked)}
        />
        <label htmlFor={inputId}></label>
      </SwitchWrapper>
    </SwitchRow>
  )
}

function UnseenLink({ thing, isUser, unseenStr, url }: {
  thing: string
  isUser: boolean
  unseenStr: string
  url: string
}) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    chrome.storage.sync.get(undefined as any, storage => {
      markThingAsSeen(storage, thing, isUser)
      setStorageUpdateBadge(storage).then(() => {
        chrome.tabs.create({ url })
        window.close()
      })
    })
  }

  return (
    <div>
      <Unseen>{unseenStr} </Unseen>
      {' '}
      <BlueLink href={url} target="_blank" onClick={handleClick}>{thing}</BlueLink>
    </div>
  )
}

function Popup() {
  const [errorStatus, setErrorStatus] = useState<string | null>(null)
  const [userData, setUserData] = useState<{
    users: Record<string, any>
    otherUnseen: string[]
    otherTotal: number
  } | null>(null)
  const [currentUser, setCurrentUser] = useState<string | null | undefined>(undefined)
  const [hasSupportedTabs, setHasSupportedTabs] = useState(false)
  const [showSubdomainWarning, setShowSubdomainWarning] = useState(false)
  const [syncStorage, setSyncStorage] = useState<Record<string, any> | null>(null)
  const [activeTab, setActiveTab] = useState<{ url: string; postID?: string; commentID?: string } | null>(null)
  const [reconnecting, setReconnecting] = useState(false)
  const [reconnectSuccess, setReconnectSuccess] = useState<boolean | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [connectResult, setConnectResult] = useState<{ success: boolean; user?: string } | null>(null)
  const [connectMessage, setConnectMessage] = useState<string | null>(null)

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

    chrome.storage.sync.get(undefined as any, sync => {
      setSyncStorage(sync)
      chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        const url = tabs[0]?.url
        if (url) {
          const [postID, commentID] = getFullIDsFromURL(url)
          setActiveTab({ url, postID, commentID })
        }
      })
    })
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleClearNotifications = () => {
    markEverythingAsSeen().then(() => loadData())
  }

  const handleReconnect = () => {
    setReconnecting(true)
    chrome.runtime.sendMessage({ action: 'store-reddit-cookies' })
    setTimeout(() => {
      ;(chrome.runtime.sendMessage as any)({ action: 'try-reconnect' }, (response: any) => {
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
    ;(chrome.runtime.sendMessage as any)({ action: 'try-reconnect' }, (response: any) => {
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

  // Determine which toggles to show
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

  // Current user info
  let currentUserSection: React.ReactNode = <span>loading...</span>
  if (currentUser !== undefined && userData) {
    if (currentUser) {
      const userInfo = userData.users[currentUser]
      const unseenIDs = userInfo ? userInfo.unseen : []
      const historyUrl = chrome.runtime.getURL('src/history.html')
      currentUserSection = (
        <UnseenLink thing={currentUser} isUser={true} unseenStr={String(unseenIDs.length)} url={historyUrl} />
      )
    } else {
      // No user
      currentUserSection = (
        <ConnectContainer>
          {connectResult?.success ? (
            <MessageBanner variant="success">&#10003; Connected as {connectResult.user}!</MessageBanner>
          ) : (
            <>
              <MessageBanner variant="info">{connectMessage || 'Log in to www.reddit.com or old.reddit.com to get started.'}</MessageBanner>
              {hasSupportedTabs && (
                <ActionBtn onClick={handleConnect} disabled={connecting}>
                  {connecting ? 'Connecting...' : 'Connect'}
                </ActionBtn>
              )}
            </>
          )}
        </ConnectContainer>
      )
    }
  }

  // "Other" section
  let otherUrl = '/src/other.html'
  if (userData && userData.otherUnseen.length) {
    otherUrl = `https://www.reveddit.com/info?id=${userData.otherUnseen.join(',')}&removal_status=all`
  }

  const historyUrl = chrome.runtime.getURL('src/history.html')

  return (
    <>
      <Global styles={globalStyles} />
      <PopupContainer>
        {/* Error/reconnect banner */}
        {errorStatus && (
          <WarningContainer>
            {reconnectSuccess ? (
              <MessageBanner variant="success">&#10003; Connected!</MessageBanner>
            ) : (
              <>
                <MessageBanner variant="warning">
                  {reconnectSuccess === false
                    ? '⚠️ Still disconnected. Try logging into Reddit again.'
                    : '⚠️ Session may be disconnected.'}
                </MessageBanner>
                {hasSupportedTabs ? (
                  <ActionBtn onClick={handleReconnect} disabled={reconnecting}>
                    {reconnecting ? 'Checking...' : 'Reconnect'}
                  </ActionBtn>
                ) : (
                  <WarningHint>Open a Reddit tab first, then click here to reconnect.</WarningHint>
                )}
              </>
            )}
          </WarningContainer>
        )}

        {/* Toggle switches for current page items */}
        <div id="switches">
          {switches.map(sw => (
            <ToggleSwitch
              key={sw.id}
              id={sw.id}
              type={sw.type}
              checked={sw.subscribed}
              onToggle={checked => handleToggle(sw.id, checked, activeTab!.url)}
            />
          ))}
        </div>

        <div>
          <OptionsLink href="/src/options.html" onClick={e => { e.preventDefault(); goToOptions() }}>options</OptionsLink>
        </div>
        <div style={{ clear: 'both' }} />
        <div>
          <ClearNotifications href="#" onClick={e => { e.preventDefault(); handleClearNotifications() }}>clear notifications</ClearNotifications>
        </div>
        <div style={{ clear: 'both' }} />

        {showSubdomainWarning && (
          <MessageBanner variant="warning">⚠️ User monitoring requires www.reddit.com or old.reddit.com</MessageBanner>
        )}

        {/* Current user section */}
        <div>{currentUserSection}</div>

        <hr />

        {/* Other subscriptions */}
        {userData && (
          <UnseenLink
            thing="other"
            isUser={false}
            unseenStr={`${userData.otherUnseen.length} / ${userData.otherTotal}`}
            url={otherUrl}
          />
        )}

        <hr />

        <BottomDiv>
          <BlueLink
            target="_blank"
            href={historyUrl}
            onClick={e => {
              e.preventDefault()
              chrome.tabs.create({ url: historyUrl })
              window.close()
            }}
          >
            history
          </BlueLink>
        </BottomDiv>

        <hr />

        <button id="test-notification" style={{ marginTop: '6px' }} onClick={handleTestNotification}>
          Test notification
        </button>
      </PopupContainer>
    </>
  )
}

createRoot(document.getElementById('root')!).render(<Popup />)
