import React from 'react'
import styled from '@emotion/styled'
import { ActionBtn, MessageBanner } from './ui/components'
import { tokens } from './ui/tokens'
import { markThingAsSeen, setStorageUpdateBadge, clearPendingNotification, notificationName } from './storage'

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

export function ToggleSwitch({ type, checked, onToggle }: {
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

export function UnseenRow({ thing, isUser, unseenCount, totalStr, url }: {
  thing: string
  isUser: boolean
  unseenCount: number
  totalStr?: string
  url: string
}) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    chrome.storage.sync.get(undefined, storage => {
      const marked = markThingAsSeen(storage, thing, isUser)
      clearPendingNotification(notificationName(thing, isUser)).catch(() => {})
      setStorageUpdateBadge(marked).then(() => {
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

export function CurrentUserSection({ currentUser, users, historyUrl, connectResult, connectMessage, connecting, onConnect }: {
  currentUser: string | null
  users: Record<string, { unseen: string[]; seen: string[] }>
  historyUrl: string
  connectResult: { success: boolean; user?: string } | null
  connectMessage: string | null
  connecting: boolean
  onConnect: () => void
}) {
  if (currentUser) {
    const userInfo = users[currentUser]
    const unseenIDs = userInfo ? userInfo.unseen : []
    return (
      <UnseenRow
        thing={currentUser}
        isUser={true}
        unseenCount={unseenIDs.length}
        url={historyUrl}
      />
    )
  }
  return (
    <div>
      {connectResult?.success ? (
        <MessageBanner variant="success">✓ Connected as {connectResult.user}!</MessageBanner>
      ) : (
        <>
          <MessageBanner variant="info">
            {connectMessage || 'Log in to www.reddit.com or old.reddit.com to get started.'}
          </MessageBanner>
          {/* Connect is tab-independent (direct cookie-authenticated fetch),
              so always offer it — the old tab gate left users with no
              button and no path forward when no Reddit tab was open. */}
          <ActionBtn onClick={onConnect} disabled={connecting}>
            {connecting ? 'Connecting...' : 'Connect'}
          </ActionBtn>
        </>
      )}
    </div>
  )
}
