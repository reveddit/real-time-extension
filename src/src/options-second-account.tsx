import { useState, useEffect, useRef } from 'react'
import styled from '@emotion/styled'
import { BlueLink, Button, SectionHeader, MessageBanner } from './ui/components'
import { tokens } from './ui/tokens'
import {
  VIEWER_KEY,
  VIEWER_CONNECT_KEY,
  VIEWER_CONNECT_RESULT_KEY,
  VIEWER_IDENTITY_KEY,
  ViewerConnectResult,
  isSignedInViewer,
  inIncognitoContext,
} from './viewer'
import { LOGIN_WALL_INFO_URL } from './report'
import { Note, DiagActions, sendMessageAny, runtimeAny } from './options-shared'

// The second Reddit account (viewer.ts): connect it, cancel a sign-in, or
// disconnect it. The popup's login-required warning links here
// (#second-account), and the sign-in tab comes back here when it's over.
const SIGN_IN_ENDED: Record<string, string> = {
  same_account: "That's your main account. Connect a different one.",
  not_signed_in: 'The sign-in ended before an account signed in. Your own login is back.',
  unconfirmed:
    "Reddit didn't say which account signed in, so the sign-in was undone. Your own login is back. Try again in a few minutes.",
  cancelled: 'Sign-in cancelled. Your own login is back.',
  timed_out: 'The sign-in took too long, so it ended. Your own login is back.',
  no_tab: "Couldn't open Reddit's login page.",
}
const SIGN_IN_RESULT_SHOWN_MS = 10 * 60 * 1000

const Dialog = styled.dialog`
  max-width: 400px;
  padding: ${tokens.space.lg};
  color: var(--text-primary);
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: ${tokens.radius.lg};
  &::backdrop {
    background: rgba(0, 0, 0, 0.45);
  }
  h3 {
    margin: 0 0 ${tokens.space.sm};
    font-size: 1em;
  }
  p {
    margin: 0 0 ${tokens.space.md};
    color: var(--text-secondary);
    font-size: 0.92em;
  }
`

const DialogActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${tokens.space.sm};
`

const DIALOG_EDGE_PX = 8

// The page's own dialog rather than the browser's confirm(): Esc or cancel
// closes it, continue goes ahead. It opens over the button that asked for it,
// not in the middle of the page: Firefox shows options inside about:addons in
// a frame as tall as the whole page, where the middle is off screen.
function ConfirmDialog({ anchor, title, text, confirmLabel, onConfirm, onCancel }: {
  anchor: HTMLElement | null
  title: string
  text: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    if (anchor && dialog && !dialog.open) {
      dialog.showModal()
      const a = anchor.getBoundingClientRect()
      const h = dialog.offsetHeight
      const top = Math.max(
        DIALOG_EDGE_PX,
        Math.min(a.top + a.height / 2 - h / 2, window.innerHeight - h - DIALOG_EDGE_PX),
      )
      dialog.style.margin = `${top}px auto auto`
    }
    if (!anchor && dialog?.open) dialog.close()
  }, [anchor])
  return (
    <Dialog ref={ref} aria-label={title} onCancel={e => { e.preventDefault(); onCancel() }}>
      <h3>{title}</h3>
      <p>{text}</p>
      <DialogActions>
        <Button variant="secondary" onClick={onCancel}>cancel</Button>
        <Button variant="primary" onClick={onConfirm} autoFocus>{confirmLabel}</Button>
      </DialogActions>
    </Dialog>
  )
}

export function SecondAccount() {
  const [viewer, setViewer] = useState<{ name: string; connectedAt: number } | null>(null)
  // Reddit signed the second account out (checkViewerIdentity found it so)
  const [viewerSignedOut, setViewerSignedOut] = useState(false)
  const [signedIn, setSignedIn] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [result, setResult] = useState<ViewerConnectResult | null>(null)
  const [busy, setBusy] = useState(false)
  // The button that opened the confirm dialog, while it's open
  const [confirmFrom, setConfirmFrom] = useState<HTMLElement | null>(null)

  useEffect(() => {
    const keys = [VIEWER_KEY, VIEWER_CONNECT_KEY, VIEWER_CONNECT_RESULT_KEY, VIEWER_IDENTITY_KEY, 'last_logged_in_user']
    const load = () => {
      chrome.storage.local.get(keys, res => {
        const v = res?.[VIEWER_KEY]
        setViewer(v && typeof v.name === 'string' ? { name: v.name, connectedAt: Number(v.connectedAt) || 0 } : null)
        const identity = res?.[VIEWER_IDENTITY_KEY]
        setViewerSignedOut(!!v && identity?.token === v.token && identity?.result === 'signed_out')
        setSignedIn(String(res?.last_logged_in_user || ''))
        setConnecting(!!res?.[VIEWER_CONNECT_KEY])
        const r = res?.[VIEWER_CONNECT_RESULT_KEY]
        setResult(r && Date.now() - Number(r.t) < SIGN_IN_RESULT_SHOWN_MS ? r : null)
      })
    }
    const onStorageChanged = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === 'local' && keys.some(key => key in changes)) load()
    }
    load()
    chrome.storage.onChanged.addListener(onStorageChanged)
    if (window.location.hash === '#second-account') {
      setTimeout(() => document.getElementById('second-account')?.scrollIntoView(), 0)
    }
    return () => chrome.storage.onChanged.removeListener(onStorageChanged)
  }, [])

  const send = (action: string) => {
    setBusy(true)
    sendMessageAny({ action }, () => {
      void runtimeAny.lastError
      setBusy(false)
    })
  }

  return (
    <>
      <SectionHeader id="second-account">Second account</SectionHeader>
      <Note>
        When Reddit asks for a login before it shows profiles, the extension checks your posts and comments
        through a second Reddit account, the way other people see them. It only reads: it never posts, votes
        or joins anything.
      </Note>
      {inIncognitoContext() ? (
        // Only the normal windows' copy of the extension signs in (viewer.ts)
        <Note>
          {viewer ? `Connected: u/${viewer.name}. ` : ''}To connect or change the second account, open these options
          in a normal window, not a private or incognito one.
        </Note>
      ) : connecting ? (
        <>
          <Note>Waiting for you to sign in on Reddit&apos;s page. Your other Reddit tabs are signed out until then.</Note>
          <DiagActions>
            <Button variant="secondary" onClick={() => send('viewer-connect-cancel')} disabled={busy}>cancel</Button>
          </DiagActions>
        </>
      ) : viewer && !isSignedInViewer(viewer.name, signedIn) && !viewerSignedOut ? (
        <>
          <Note>
            Connected: u/{viewer.name}
            {viewer.connectedAt ? `, since ${new Date(viewer.connectedAt).toLocaleDateString()}` : ''}. Your posts
            and comments are checked through it.
          </Note>
          <DiagActions>
            <Button variant="secondary" onClick={() => send('viewer-disconnect')} disabled={busy}>disconnect</Button>
          </DiagActions>
        </>
      ) : (
        <>
          <Note>
            {viewer && isSignedInViewer(viewer.name, signedIn) ? (
              <>
                u/{viewer.name} is connected, but it&apos;s also the account you&apos;re signed in to Reddit with,
                so it can&apos;t check its own posts and comments. Connect a different account to check them.
              </>
            ) : viewer ? (
              <>
                u/{viewer.name} was signed out of Reddit, so your posts and comments aren&apos;t being checked.
                Connect it again to pick up where it left off.
              </>
            ) : (
              <>
                Use an account that isn&apos;t your main one, isn&apos;t a moderator where you post, and that you
                haven&apos;t blocked. You&apos;ll sign in on Reddit&apos;s own page.
              </>
            )}
          </Note>
          <DiagActions style={{ alignItems: 'center' }}>
            <Button variant="primary" onClick={e => setConfirmFrom(e.currentTarget)} disabled={busy}>
              {!viewer
                ? 'connect a second account'
                : isSignedInViewer(viewer.name, signedIn)
                  ? 'connect a different account'
                  : 'connect it again'}
            </Button>
            {viewer && (
              <Button variant="secondary" onClick={() => send('viewer-disconnect')} disabled={busy}>
                disconnect
              </Button>
            )}
            <BlueLink target="_blank" href={LOGIN_WALL_INFO_URL}>Why?</BlueLink>
          </DiagActions>
        </>
      )}
      <ConfirmDialog
        anchor={confirmFrom}
        title="Connect a second account"
        text="You'll be briefly signed out of Reddit while you sign in to the second account. But you'll be signed back in automatically when you finish."
        confirmLabel="continue"
        onConfirm={() => {
          setConfirmFrom(null)
          send('viewer-connect-start')
        }}
        onCancel={() => setConfirmFrom(null)}
      />
      {result?.ok && viewer && <MessageBanner variant="success">✓ Connected, and your own login is back.</MessageBanner>}
      {result && !result.ok && result.error && SIGN_IN_ENDED[result.error] && (
        <MessageBanner variant="warning">{SIGN_IN_ENDED[result.error]}</MessageBanner>
      )}
    </>
  )
}
