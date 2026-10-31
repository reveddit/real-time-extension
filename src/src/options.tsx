import React, { useState, useEffect, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import styled from '@emotion/styled'
import { getOptions, INTERVAL_DEFAULT, SEEN_COUNT_DEFAULT, saveOptions } from './storage'
import { DiagStatus, formatDiagStatus } from './diag-status'
import { setAlarm } from './common'
import { AppGlobal, setThemeMode, THEME_STORAGE_KEY, ThemeMode } from './ui/global'
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

const Page = styled.div`
  width: 380px;
  min-height: 300px;
  padding: ${tokens.space.lg};
`

const TopBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${tokens.space.md};
  margin-bottom: ${tokens.space.md};
`

const Title = styled.h1`
  margin: 0;
  font-size: 18px;
`

const Field = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${tokens.space.md};
  padding: ${tokens.space.sm} 0;
  border-bottom: 1px solid var(--border);
  &:last-child { border-bottom: 0; }
  & > label {
    color: var(--text-primary);
    flex: 1;
  }
  & > input[type='text'], & > input[type='number'], & > select {
    width: 90px;
    text-align: right;
  }
`

const FieldStack = styled.div``

const Hint = styled.div`
  font-size: 0.8em;
  font-weight: normal;
  color: var(--text-secondary);
  margin-top: 3px;
  max-width: 28em;
`

// && beats Field's "& > select" 90px width rule — these labels are longer.
const ModeSelect = styled.select`
  && {
    width: auto;
    min-width: 175px;
    text-align: left;
  }
`

const LinkRow = styled.div`
  font-size: 0.9em;
  margin-top: ${tokens.space.xs};
`

const Footer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: ${tokens.space.lg};
  padding-top: ${tokens.space.md};
  border-top: 1px solid var(--border);
  gap: ${tokens.space.md};
`

const AdvancedLink = styled.div`
  margin-top: ${tokens.space.md};
  font-size: 0.9em;
`

const AdvancedSection = styled.div<{ visible: boolean }>`
  display: ${p => (p.visible ? 'block' : 'none')};
  margin-top: ${tokens.space.sm};
`

const Note = styled.p`
  color: var(--text-secondary);
  font-size: 0.88em;
  margin: ${tokens.space.sm} 0;
`

const DiagActions = styled.div`
  display: flex;
  gap: ${tokens.space.sm};
  margin-top: ${tokens.space.sm};
`

// Callback-style sendMessage and lastError aren't in this chrome typings
// surface — same cast popup.tsx uses for try-reconnect.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sendMessageAny = chrome.runtime.sendMessage as any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const runtimeAny = chrome.runtime as any

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

function SecondAccount() {
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

// The two stored booleans per type ({track, notify}) have three valid states;
// the picker names them. track:false with notify:true is unreachable from this
// UI and behaves as 'off' in monitoring, so it displays as 'off'.
type TrackMode = 'off' | 'badge' | 'notify'
const modeFromStatus = (s: { track?: boolean; notify?: boolean }): TrackMode =>
  !s.track ? 'off' : s.notify ? 'notify' : 'badge'
const MODE_OPTIONS: { value: TrackMode; label: string }[] = [
  { value: 'notify', label: 'badge + notifications' },
  { value: 'badge', label: 'badge only' },
  { value: 'off', label: 'off' },
]

function Options() {
  const [interval, setInterval_] = useState('')
  const [seenCount, setSeenCount] = useState('')
  const [clientId, setClientId] = useState('')
  const [removedMode, setRemovedMode] = useState<TrackMode>('off')
  const [lockedMode, setLockedMode] = useState<TrackMode>('off')
  const [hideSubscribe, setHideSubscribe] = useState(false)
  const [monitorQuarantined, setMonitorQuarantined] = useState(false)
  const [showScanOnOwnProfile, setShowScanOnOwnProfile] = useState(false)
  const [showScanOnOtherProfiles, setShowScanOnOtherProfiles] = useState(true)
  const [showThreadScanButtons, setShowThreadScanButtons] = useState(true)
  const [highlightOwnProfileStatus, setHighlightOwnProfileStatus] = useState(true)
  const [autoFilterRemovedThreads, setAutoFilterRemovedThreads] = useState(true)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [simulateDeprecation, setSimulateDeprecation] = useState(false)
  const [themeMode, setThemeModeState] = useState<ThemeMode>('auto')
  const [error, setError] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [diagIncludeUser, setDiagIncludeUser] = useState(false)
  const [diagHideIds, setDiagHideIds] = useState(false)
  const [diagStatus, setDiagStatus] = useState('')
  const [diagBusy, setDiagBusy] = useState(false)

  useEffect(() => {
    // On a fresh install this page can mount before the background's
    // initStorage has written the defaults. Rendering that empty state would
    // show every setting as off — and "save" would persist it. Stay on the
    // loading screen until the options object exists, picking it up via
    // onChanged when initStorage lands.
    let optionsLoaded = false
    const onStorageChanged = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === 'sync' && changes.options) tryLoadOptions()
    }
    const tryLoadOptions = () => {
      getOptions((_users, _others, options) => {
        if (optionsLoaded || !options || !Object.keys(options).length) return
        optionsLoaded = true
        chrome.storage.onChanged.removeListener(onStorageChanged)
        const opts = options
        const removal = opts.removal_status || {}
        const lock = opts.lock_status || {}
        setInterval_(String(opts.interval ?? INTERVAL_DEFAULT))
        setSeenCount(String(opts.seen_count || SEEN_COUNT_DEFAULT))
        setClientId(opts.custom_clientid || '')
        setRemovedMode(modeFromStatus(removal))
        setLockedMode(modeFromStatus(lock))
        setHideSubscribe(!!opts.hide_subscribe)
        setMonitorQuarantined(!!opts.monitor_quarantined)
        setShowScanOnOwnProfile(!!opts.show_scan_on_own_profile)
        setShowScanOnOtherProfiles(opts.show_scan_on_other_profiles !== false)
        setShowThreadScanButtons(opts.show_thread_scan_buttons !== false)
        setHighlightOwnProfileStatus(opts.highlight_own_profile_status !== false)
        setAutoFilterRemovedThreads(opts.auto_filter_removed_threads !== false)
        setLoaded(true)
      })
    }
    chrome.storage.onChanged.addListener(onStorageChanged)
    tryLoadOptions()
    chrome.storage.local.get([THEME_STORAGE_KEY], res => {
      setThemeModeState((res?.[THEME_STORAGE_KEY] as ThemeMode) || 'auto')
    })
    chrome.storage.local.get(['dev_simulate_endpoint_deprecation'], res => {
      setSimulateDeprecation(!!res?.dev_simulate_endpoint_deprecation)
    })
    sendMessageAny(
      { action: 'get-diag-status' },
      (resp: DiagStatus) => {
        if (runtimeAny.lastError || !resp || resp.error) return
        const line = formatDiagStatus(resp)
        if (line) setDiagStatus(line)
      },
    )
    return () => chrome.storage.onChanged.removeListener(onStorageChanged)
  }, [])

  const copyDiagLog = () => {
    setDiagBusy(true)
    sendMessageAny(
      { action: 'get-diag-log', includeUsername: diagIncludeUser, hideIds: diagHideIds },
      (resp: { text?: string; error?: string }) => {
        setDiagBusy(false)
        if (runtimeAny.lastError || !resp || resp.error || typeof resp.text !== 'string') {
          setDiagStatus('could not read the log — try reopening this page')
          return
        }
        const text = resp.text
        navigator.clipboard.writeText(text).then(
          () => setDiagStatus(`copied ${text.split('\n').length} lines to the clipboard`),
          () => setDiagStatus('copy failed — clipboard unavailable'),
        )
      },
    )
  }

  const clearDiagLogClick = () => {
    sendMessageAny({ action: 'clear-diag-log' }, () => {
      if (runtimeAny.lastError) return
      setDiagStatus('log cleared')
    })
  }

  const runCheckNow = () => {
    sendMessageAny(
      { action: 'run-check-now' },
      (resp: { started?: boolean; throttled?: boolean }) => {
        if (runtimeAny.lastError || !resp) {
          setDiagStatus('could not start a check — try reopening this page')
          return
        }
        setDiagStatus(
          resp.throttled
            ? 'a manual check already ran in the last minute'
            : 'check started — wait about 30 seconds, then copy the log',
        )
      },
    )
  }

  // Written straight to local storage (not through saveOptions) so it takes
  // effect on the next monitoring cycle without needing "save". It's a dev/test
  // switch, not a user preference.
  const handleSimulateDeprecationChange = (checked: boolean) => {
    setSimulateDeprecation(checked)
    chrome.storage.local.set({ dev_simulate_endpoint_deprecation: checked })
  }

  const handleThemeChange = (mode: ThemeMode) => {
    setThemeModeState(mode)
    setThemeMode(mode)
  }

  const resetDefaults = () => {
    setInterval_(String(INTERVAL_DEFAULT))
    setSeenCount(String(SEEN_COUNT_DEFAULT))
    setClientId('')
  }

  const saveAndClose = () => {
    const intervalNum = Number(interval)
    const seenCountNum = Number(seenCount)
    const customClientId = (clientId || '').trim()

    if (!(Number.isInteger(intervalNum) && intervalNum > 0)) {
      setError('"minutes between Reddit checks" must be a positive integer')
      setTimeout(() => setError(''), 2800)
      return
    }
    if (!(Number.isInteger(seenCountNum) && seenCountNum > 0)) {
      setError('"same-status count before alert" must be a positive integer')
      setTimeout(() => setError(''), 2800)
      return
    }

    setError('')
    saveOptions(seenCountNum, intervalNum, customClientId, removedMode !== 'off', removedMode === 'notify',
                lockedMode !== 'off', lockedMode === 'notify', hideSubscribe, monitorQuarantined, showScanOnOwnProfile, showScanOnOtherProfiles, showThreadScanButtons, highlightOwnProfileStatus, autoFilterRemovedThreads, () => {
      setAlarm(intervalNum)
      chrome.runtime.sendMessage({ action: 'update-badge' })
      window.close()
    })
  }

  if (!loaded) return (
    <>
      <AppGlobal />
      <Page>Loading…</Page>
    </>
  )

  return (
    <>
      <AppGlobal />
      <Page>
        <TopBar>
          <Title>Options</Title>
          <Button variant="primary" onClick={saveAndClose}>save</Button>
        </TopBar>

        <SectionHeader>Subscriptions</SectionHeader>
        <FieldStack>
          <Field>
            <label>other subscriptions</label>
            <BlueLink target="_blank" href="/src/other.html">manage ↗</BlueLink>
          </Field>
        </FieldStack>

        <SecondAccount />

        <SectionHeader>Tracking &amp; notification</SectionHeader>
        <FieldStack>
          <Field>
            <label>removed content</label>
            <ModeSelect value={removedMode} onChange={e => setRemovedMode(e.target.value as TrackMode)}>
              {MODE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </ModeSelect>
          </Field>
          <Field>
            <label>locked content</label>
            <ModeSelect value={lockedMode} onChange={e => setLockedMode(e.target.value as TrackMode)}>
              {MODE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </ModeSelect>
          </Field>
        </FieldStack>
        {(removedMode === 'notify' || lockedMode === 'notify') && (
          <LinkRow>
            <BlueLink href="#" onClick={e => {
              e.preventDefault()
              // A UI macro, not a setting: drops "badge + notifications" to
              // "badge only". Never upgrades "off" — that would re-enable
              // tracking the user turned off.
              if (removedMode === 'notify') setRemovedMode('badge')
              if (lockedMode === 'notify') setLockedMode('badge')
            }}>
              turn off all notifications
            </BlueLink>
          </LinkRow>
        )}
        <Note>
          "badge only" counts changes on the toolbar icon and in history, without showing system
          notifications.
        </Note>

        <SectionHeader>Polling</SectionHeader>
        <FieldStack>
          <Field>
            <label>
              minutes between Reddit checks
              <Hint>How often the extension checks Reddit for removed content. Increase this if Reddit rate-limits you (429 errors).</Hint>
            </label>
            <input type="text" value={interval} onChange={e => setInterval_(e.target.value)} />
          </Field>
          <Field>
            <label>same-status count before alert</label>
            <input type="text" value={seenCount} onChange={e => setSeenCount(e.target.value)} />
          </Field>
          <Field>
            <label>monitor quarantined content</label>
            <input type="checkbox" checked={monitorQuarantined}
              onChange={e => setMonitorQuarantined(e.target.checked)} />
          </Field>
          <Field>
            <label>hide subscribe button</label>
            <input type="checkbox" checked={hideSubscribe}
              onChange={e => setHideSubscribe(e.target.checked)} />
          </Field>
          <Field>
            <label>show removed-content scan on other profiles</label>
            <input type="checkbox" checked={showScanOnOtherProfiles}
              onChange={e => setShowScanOnOtherProfiles(e.target.checked)} />
          </Field>
          <Field>
            <label>show removed-content scan on your own profile</label>
            <input type="checkbox" checked={showScanOnOwnProfile}
              onChange={e => setShowScanOnOwnProfile(e.target.checked)} />
          </Field>
          <Field>
            <label>show "scan for removed comments" buttons on threads</label>
            <input type="checkbox" checked={showThreadScanButtons}
              onChange={e => setShowThreadScanButtons(e.target.checked)} />
          </Field>
          <Field>
            <label>flag your removed/locked content on your own profile</label>
            <input type="checkbox" checked={highlightOwnProfileStatus}
              onChange={e => setHighlightOwnProfileStatus(e.target.checked)} />
          </Field>
          <Field>
            <label>auto-filter to show only removed comments after thread scan</label>
            <input type="checkbox" checked={autoFilterRemovedThreads}
              onChange={e => setAutoFilterRemovedThreads(e.target.checked)} />
          </Field>
        </FieldStack>
        {monitorQuarantined && (
          <Note>
            Enabling "monitor quarantined content" may appear to cause an occasional logout.
            Refreshing the page should show you are still logged in. Increase "minutes between
            Reddit checks" to 5 or more to reduce this occurrence.
          </Note>
        )}

        <SectionHeader>Appearance</SectionHeader>
        <FieldStack>
          <Field>
            <label>theme</label>
            <select value={themeMode} onChange={e => handleThemeChange(e.target.value as ThemeMode)}>
              <option value="auto">auto</option>
              <option value="dark">dark</option>
              <option value="light">light</option>
            </select>
          </Field>
        </FieldStack>

        <SectionHeader>Diagnostics</SectionHeader>
        <Note>
          If removal detection seems broken, run a check, then copy the log and include it in a GitHub
          issue or email. The log stays on this device — nothing is sent automatically. Your username is
          left out unless you include it. The log lists the ids of your recent posts and comments, which
          let the developer check what happened to them, so leave them in if you can. Hidden, each becomes
          a stand-in that can&apos;t be traced back, as long as your username stays out too.
        </Note>
        <FieldStack>
          <Field>
            <label>include username in copied log</label>
            <input type="checkbox" checked={diagIncludeUser}
              onChange={e => setDiagIncludeUser(e.target.checked)} />
          </Field>
          <Field>
            <label>hide post and comment ids</label>
            <input type="checkbox" checked={diagHideIds}
              onChange={e => setDiagHideIds(e.target.checked)} />
          </Field>
        </FieldStack>
        <DiagActions>
          <Button onClick={runCheckNow}>check now</Button>
          <Button onClick={copyDiagLog} disabled={diagBusy}>copy log</Button>
          <Button onClick={clearDiagLogClick}>clear log</Button>
        </DiagActions>
        {diagStatus && <Note>{diagStatus}</Note>}

        <AdvancedLink>
          {!showAdvanced && (
            <BlueLink href="#" onClick={e => { e.preventDefault(); setShowAdvanced(true) }}>
              advanced
            </BlueLink>
          )}
        </AdvancedLink>
        <AdvancedSection visible={showAdvanced}>
          <SectionHeader>Advanced</SectionHeader>
          <Note>
            This option overrides the "installed app" client id from reddit &gt; preferences &gt; apps.
          </Note>
          <FieldStack>
            <Field>
              <label>custom client id</label>
              <input
                type="text"
                value={clientId}
                onChange={e => setClientId(e.target.value)}
                placeholder="<default is blank>"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
              />
            </Field>
            {/* Dev/test switch only — gated out of released builds (mirrors __replayInstall). */}
            {__DEV__ && (
              <Field>
                <label>
                  simulate Reddit endpoint deprecation (dev)
                  <Hint>
                    Blocks the legacy old.reddit.com HTML and unauthenticated .json paths, as if Reddit
                    had already removed them. Detection then relies only on the logged-out
                    www.reddit.com profile view. Applies on the next check — no save needed.
                  </Hint>
                </label>
                <input
                  type="checkbox"
                  checked={simulateDeprecation}
                  onChange={e => handleSimulateDeprecationChange(e.target.checked)}
                />
              </Field>
            )}
          </FieldStack>
        </AdvancedSection>

        {error && <MessageBanner variant="warning">{error}</MessageBanner>}

        <Footer>
          <BlueLink href="#" onClick={e => { e.preventDefault(); resetDefaults() }}>
            reset to defaults
          </BlueLink>
          <Button variant="primary" onClick={saveAndClose}>save</Button>
        </Footer>
      </Page>
    </>
  )
}

createRoot(document.getElementById('root')!).render(<Options />)
