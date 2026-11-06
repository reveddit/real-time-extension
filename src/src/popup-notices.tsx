import React from 'react'
import styled from '@emotion/styled'
import { ActionBtn, SecondaryActionBtn, MessageBanner, Card } from './ui/components'
import { tokens } from './ui/tokens'
import { markdownToHTML } from './ui/markdown'
import { LOGIN_WALL_INFO_URL } from './report'
import { isSignedInViewer } from './viewer'
import { NewsMessage } from './news'

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

export function NewsBanner({ message, onDismiss }: { message: NewsMessage; onDismiss: () => void }) {
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

export function UpdateNotice({ version, onDismiss }: { version: string; onDismiss: () => void }) {
  return (
    <NewsCard>
      <button className="dismiss" onClick={onDismiss} aria-label="Dismiss">&times;</button>
      <h4>Update available: v{version}</h4>
      <div className="md-body">
        Your browser hasn't installed it yet. Open chrome://extensions, turn on
        Developer mode (top right), and press Update.{' '}
        <a href="https://www.reveddit.com/update-help" target="_blank" rel="noopener noreferrer">
          Still stuck?
        </a>
      </div>
    </NewsCard>
  )
}

export function ReleaseNotice({ release, onDismiss }: { release: { version: string; description: string }; onDismiss: () => void }) {
  return (
    <NewsCard>
      <button className="dismiss" onClick={onDismiss} aria-label="Dismiss">&times;</button>
      <h4>v{release.version} released</h4>
      <div className="md-body">{release.description}</div>
    </NewsCard>
  )
}

// The options page's second-account section (viewer.ts), where its sign-in starts
const openSecondAccount = () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('src/options.html#second-account') })
  window.close()
}

export function ErrorNotice({ errorStatus, viewerName, currentUser, reconnectSuccess, reconnecting, onReconnect }: {
  errorStatus: string
  viewerName: string
  currentUser: string | null | undefined
  reconnectSuccess: boolean | null
  reconnecting: boolean
  onReconnect: () => void
}) {
  return (
  <div>
    {reconnectSuccess ? (
      <MessageBanner variant="success">✓ Connected!</MessageBanner>
    ) : errorStatus === 'rate_limited' ? (
      <MessageBanner variant="warning">
        ⚠ Reddit is rate-limiting requests. Monitoring will resume automatically.
      </MessageBanner>
    ) : errorStatus === 'reddit_blocked' ? (
      <MessageBanner variant="warning">
        ⚠ Reddit blocked the extension&apos;s last request (HTTP 403). It keeps retrying; opening a
        www.reddit.com tab usually clears this.
      </MessageBanner>
    ) : errorStatus === 'checks_failing' ? (
      <MessageBanner variant="warning">
        ⚠ Your posts and comments aren&apos;t being checked right now. Reddit or your connection may be
        down. The extension keeps trying.
      </MessageBanner>
    ) : errorStatus === 'profile_publicly_empty' ? (
      <MessageBanner variant="warning">
        ⚠ Your profile appears empty to logged-out users — possibly a shadowban. Removal alerts are
        paused. You can appeal at reddit.com/appeals.
      </MessageBanner>
    ) : (errorStatus === 'login_required' || errorStatus === 'public_view_unavailable') &&
      isSignedInViewer(viewerName, currentUser || '') ? (
      <>
        <MessageBanner variant="warning">
          ⚠ You&apos;re signed in to Reddit with your second account, which can&apos;t check its own posts and
          comments. To keep checking them, connect a different account.{' '}
          <a href={LOGIN_WALL_INFO_URL} target="_blank" rel="noopener noreferrer">
            Why?
          </a>
        </MessageBanner>
        <ActionBtn onClick={openSecondAccount}>Connect a different account</ActionBtn>
      </>
    ) : errorStatus === 'login_required' ? (
      <>
        <MessageBanner variant="warning">
          ⚠ Reddit now asks for a login before it shows profiles. To keep checking your posts and
          comments, connect a second Reddit account.{' '}
          <a href={LOGIN_WALL_INFO_URL} target="_blank" rel="noopener noreferrer">
            Why?
          </a>
        </MessageBanner>
        <ActionBtn onClick={openSecondAccount}>Connect a second account</ActionBtn>
      </>
    ) : errorStatus === 'viewer_signed_out' ? (
      <>
        <MessageBanner variant="warning">
          ⚠ Your second Reddit account was signed out, so your posts and comments aren&apos;t being
          checked. Connect it again to pick up where it left off.
        </MessageBanner>
        <ActionBtn onClick={openSecondAccount}>Connect it again</ActionBtn>
      </>
    ) : errorStatus === 'viewer_unavailable' ? (
      <>
        <MessageBanner variant="warning">
          ⚠ Reddit isn&apos;t answering checks through your second account right now. They keep retrying.
          If this keeps up, connect the account again, or use &ldquo;report a problem&rdquo; below.
        </MessageBanner>
        <ActionBtn onClick={openSecondAccount}>Second account settings</ActionBtn>
      </>
    ) : errorStatus === 'public_view_unavailable' ? (
      // Also how a login wall shows up when it doesn't redirect to the
      // login page (login-wall-config.ts), so the second account is here too
      <>
        <MessageBanner variant="warning">
          ⚠ Removal monitoring is paused — Reddit&apos;s public view isn&apos;t loading. Opening a
          www.reddit.com tab usually restores it. If it keeps up, connect a second Reddit account.
        </MessageBanner>
        <ActionBtn onClick={() => chrome.tabs.create({ url: 'https://www.reddit.com/', active: true })}>
          Open www.reddit.com
        </ActionBtn>
        <SecondaryActionBtn onClick={openSecondAccount}>Connect a second account</SecondaryActionBtn>
      </>
    ) : errorStatus === 'absent_verify_unavailable' ? (
      <>
        <MessageBanner variant="warning">
          ⚠ Reddit isn&apos;t letting the extension confirm whether missing content was removed, so
          some removals can&apos;t be detected. Keeping a www.reddit.com tab open usually restores
          this. If it keeps up, use &ldquo;report a problem&rdquo; below.
        </MessageBanner>
        <ActionBtn onClick={() => chrome.tabs.create({ url: 'https://www.reddit.com/', active: true })}>
          Open www.reddit.com
        </ActionBtn>
      </>
    ) : errorStatus === 'profile_pagination_unavailable' ? (
      <>
        <MessageBanner variant="warning">
          ⚠ Reddit stopped loading the older pages of your public profile, so removals of your older
          posts and comments can&apos;t be checked right now. Keeping a www.reddit.com tab open usually
          restores this.
        </MessageBanner>
        <ActionBtn onClick={() => chrome.tabs.create({ url: 'https://www.reddit.com/', active: true })}>
          Open www.reddit.com
        </ActionBtn>
      </>
    ) : (
      <>
        <MessageBanner variant="warning">
          {reconnectSuccess === false
            ? "⚠ Reddit still isn't showing you as logged in."
            : errorStatus === 'logged_in_view_unavailable'
              ? "⚠ Reddit isn't accepting your login, so your posts and comments aren't being checked."
              : "⚠ You don't seem to be logged in to Reddit, so your posts and comments aren't being checked."}
        </MessageBanner>
        <ActionBtn onClick={() => chrome.tabs.create({ url: 'https://www.reddit.com/login', active: true })}>
          Log in to Reddit
        </ActionBtn>
        <SecondaryActionBtn onClick={onReconnect} disabled={reconnecting}>
          {reconnecting ? 'Checking...' : 'Check again'}
        </SecondaryActionBtn>
      </>
    )}
  </div>
  )
}
