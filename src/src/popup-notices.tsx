import { ReactNode } from 'react'
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
  & .md-body {
    font-size: 0.85em;
    color: var(--text-primary);
  }
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
    &:hover {
      color: var(--text-primary);
    }
  }
`

export function NewsBanner({ message, onDismiss }: { message: NewsMessage; onDismiss: () => void }) {
  return (
    <NewsCard>
      <button className="dismiss" onClick={onDismiss} aria-label="Dismiss">
        ×
      </button>
      <h4>{message.title}</h4>
      <div className="md-body" dangerouslySetInnerHTML={{ __html: markdownToHTML(message.body_markdown) }} />
    </NewsCard>
  )
}

export function UpdateNotice({ version, onDismiss }: { version: string; onDismiss: () => void }) {
  const steps =
    __STORE__ === 'firefox'
      ? 'Open about:addons, click the gear icon at the top of the page and choose Check for Updates. ' +
        'If reveddit real-time then shows under Available Updates, press Install.'
      : 'Open chrome://extensions, turn on Developer mode (top right), and press Update.'
  return (
    <NewsCard>
      <button className="dismiss" onClick={onDismiss} aria-label="Dismiss">
        &times;
      </button>
      <h4>Update available: v{version}</h4>
      <div className="md-body">
        Your browser hasn't installed it yet. {steps}{' '}
        <a href="https://www.reveddit.com/update-help" target="_blank" rel="noopener noreferrer">
          Still stuck?
        </a>
      </div>
    </NewsCard>
  )
}

export function ReleaseNotice({
  release,
  onDismiss,
}: {
  release: { version: string; description: string }
  onDismiss: () => void
}) {
  return (
    <NewsCard>
      <button className="dismiss" onClick={onDismiss} aria-label="Dismiss">
        &times;
      </button>
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
const openWww = () => chrome.tabs.create({ url: 'https://www.reddit.com/', active: true })

const Why = () => (
  <a href={LOGIN_WALL_INFO_URL} target="_blank" rel="noopener noreferrer">
    Why?
  </a>
)

type Action = [string, () => void]
type Warning = {
  // A function of whether a www.reddit.com tab is open, for a text that would ask for one
  text: ReactNode | ((wwwTabOpen: boolean) => ReactNode)
  button?: Action
  fallback?: Action
  // The warning once an open tab has had its checks
  lasting?: Warning
}
const OPEN_WWW: Action = ['Open www.reddit.com', openWww]
const CONNECT_SECOND: Action = ['Connect a second account', openSecondAccount]

// The failed checks in a row a www.reddit.com tab gets to clear the public
// view's warning (WWW_TAB_FAILURES_KEY), a few minutes at the default of a
// check a minute. Until then, the second account is only the other choice.
const CHECKS_FOR_A_TAB = 3

// A warning that offers a second account, while Reddit is signed in to the second account
const SIGNED_IN_AS_VIEWER: Warning = {
  text: (
    <>
      ⚠ You&apos;re signed in to Reddit with your second account, which can&apos;t check its own posts and comments. To
      keep checking them, connect a different account. <Why />
    </>
  ),
  button: ['Connect a different account', openSecondAccount],
}

const WARNINGS: Record<string, Warning> = {
  rate_limited: { text: '⚠ Reddit is rate-limiting requests. Monitoring will resume automatically.' },
  reddit_blocked: {
    text: tabOpen =>
      "⚠ Reddit blocked the extension's last request (HTTP 403). It keeps retrying" +
      (tabOpen ? '.' : '; opening a www.reddit.com tab usually clears this.'),
  },
  checks_failing: {
    text: "⚠ Your posts and comments aren't being checked right now. Reddit or your connection may be down. The extension keeps trying.",
  },
  profile_publicly_empty: {
    text: '⚠ Your profile appears empty to logged-out users — possibly a shadowban. Removal alerts are paused. You can appeal at reddit.com/appeals.',
  },
  login_required: {
    text: (
      <>
        ⚠ Reddit now asks for a login before it shows profiles. To keep checking your posts and comments, connect a
        second Reddit account. <Why />
      </>
    ),
    button: CONNECT_SECOND,
  },
  viewer_signed_out: {
    text: "⚠ Your second Reddit account was signed out, so your posts and comments aren't being checked. Connect it again to pick up where it left off.",
    button: ['Connect it again', openSecondAccount],
  },
  viewer_unavailable: {
    text: "⚠ Reddit isn't answering checks through your second account right now. They keep retrying. If this keeps up, connect the account again, or use “report a problem” below.",
    button: ['Second account settings', openSecondAccount],
  },
  // Also how a login wall shows up when it doesn't redirect to the
  // login page (login-wall-config.ts), so the second account is here too
  public_view_unavailable: {
    text: tabOpen =>
      "⚠ Removal monitoring is paused — Reddit's public view isn't loading. " +
      (tabOpen
        ? 'Keeping your www.reddit.com tab open usually restores it within a few checks.'
        : 'Opening a www.reddit.com tab usually restores it. If it keeps up, connect a second Reddit account.'),
    button: OPEN_WWW,
    fallback: CONNECT_SECOND,
    lasting: {
      text:
        "⚠ Removal monitoring is paused — Reddit's public view isn't loading, even with your www.reddit.com tab open. " +
        'To keep checking your posts and comments, connect a second Reddit account.',
      button: CONNECT_SECOND,
    },
  },
  absent_verify_unavailable: {
    text: tabOpen =>
      "⚠ Reddit isn't letting the extension confirm whether missing content was removed, so some removals can't be detected. " +
      (tabOpen ? '' : 'Keeping a www.reddit.com tab open usually restores this. ') +
      'If it keeps up, use “report a problem” below.',
    button: OPEN_WWW,
  },
  // A second account reads the profile's JSON listing, not the older pages
  // reddit refused here, which it refused through the tab too (2026-11-11)
  profile_pagination_unavailable: {
    text: tabOpen =>
      "⚠ Reddit stopped loading the older pages of your public profile, so removals of your older posts and comments can't be checked right now. " +
      (tabOpen
        ? 'If it keeps up with your www.reddit.com tab open, connect a second Reddit account.'
        : 'Opening a www.reddit.com tab sometimes restores this. If it keeps up, connect a second Reddit account.'),
    button: OPEN_WWW,
    fallback: CONNECT_SECOND,
  },
}

export function ErrorNotice({
  errorStatus,
  viewerName,
  currentUser,
  wwwTabOpen,
  wwwTabFailures,
  reconnectSuccess,
  reconnecting,
  onReconnect,
}: {
  errorStatus: string
  viewerName: string
  currentUser: string | null | undefined
  // A www.reddit.com tab that can carry the extension's reads is open
  wwwTabOpen: boolean
  // The public view's lookups in a row that failed with a tab open (lookup-status.ts)
  wwwTabFailures: number
  reconnectSuccess: boolean | null
  reconnecting: boolean
  onReconnect: () => void
}) {
  if (reconnectSuccess)
    return (
      <div>
        <MessageBanner variant="success">✓ Connected!</MessageBanner>
      </div>
    )
  const offersSecondAccount = (w?: Warning) => !!w && [w.button, w.fallback, w.lasting?.button].includes(CONNECT_SECOND)
  const asViewer = offersSecondAccount(WARNINGS[errorStatus]) && isSignedInViewer(viewerName, currentUser || '')
  const warning = asViewer ? SIGNED_IN_AS_VIEWER : WARNINGS[errorStatus]
  if (!warning) {
    return (
      <div>
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
      </div>
    )
  }
  // Checks without a tab don't count, so opening one always gets its checks
  const lasting = wwwTabOpen && wwwTabFailures >= CHECKS_FOR_A_TAB
  const chosen = (lasting && warning.lasting) || warning
  // With a tab open, there's none to open
  const offered = (action?: Action) => (wwwTabOpen && action === OPEN_WWW ? undefined : action)
  const button = offered(chosen.button)
  const fallback = offered(chosen.fallback)
  return (
    <div>
      <MessageBanner variant="warning">
        {typeof chosen.text === 'function' ? chosen.text(wwwTabOpen) : chosen.text}
      </MessageBanner>
      {button && <ActionBtn onClick={button[1]}>{button[0]}</ActionBtn>}
      {fallback && <SecondaryActionBtn onClick={fallback[1]}>{fallback[0]}</SecondaryActionBtn>}
    </div>
  )
}
