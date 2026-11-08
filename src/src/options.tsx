import { useState, useEffect } from 'react'
import styled from '@emotion/styled'
import {
  getOptions,
  INTERVAL_DEFAULT,
  SEEN_COUNT_DEFAULT,
  SCAN_READS_DEFAULT,
  SCAN_READS_MIN,
  SCAN_READS_MAX,
  SCAN_SECONDS_DEFAULT,
  SCAN_SECONDS_MIN,
  SCAN_SECONDS_MAX,
  isScanReads,
  isScanSeconds,
  scanSettingsFrom,
  saveOptions,
} from './storage'
import { DiagStatus, formatDiagStatus } from './diag-status'
import { setAlarm } from './common'
import { mountPage, setThemeMode, THEME_STORAGE_KEY, ThemeMode } from './ui/global'
import { BlueLink, Button, SectionHeader, MessageBanner } from './ui/components'
import { tokens } from './ui/tokens'
import { Note, DiagActions, sendMessageAny, runtimeAny } from './options-shared'
import { SecondAccount } from './options-second-account'
import { getRemoteScanLimits, ScanLimits } from './news'

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
  &:last-child {
    border-bottom: 0;
  }
  & > label {
    color: var(--text-primary);
    flex: 1;
  }
  & > input[type='text'],
  & > input[type='number'],
  & > select {
    width: 90px;
    text-align: right;
  }
`

const FieldStack = styled.div``

const CheckField = ({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) => (
  <Field>
    <label>{label}</label>
    <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
  </Field>
)

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
  const [scanReads, setScanReads] = useState('')
  const [scanSeconds, setScanSeconds] = useState('')
  const [scanLimits, setScanLimits] = useState<ScanLimits>({})
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
      getOptions(options => {
        if (optionsLoaded || !options || !Object.keys(options).length) return
        optionsLoaded = true
        chrome.storage.onChanged.removeListener(onStorageChanged)
        const opts = options
        const removal = opts.removal_status || {}
        const lock = opts.lock_status || {}
        setInterval_(String(opts.interval ?? INTERVAL_DEFAULT))
        setSeenCount(String(opts.seen_count || SEEN_COUNT_DEFAULT))
        const scan = scanSettingsFrom(opts)
        setScanReads(String(scan.readsPerClick))
        setScanSeconds(String(scan.seconds))
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
    getRemoteScanLimits().then(setScanLimits)
    chrome.storage.local.get([THEME_STORAGE_KEY], res => {
      setThemeModeState((res?.[THEME_STORAGE_KEY] as ThemeMode) || 'auto')
    })
    chrome.storage.local.get(['dev_simulate_endpoint_deprecation'], res => {
      setSimulateDeprecation(!!res?.dev_simulate_endpoint_deprecation)
    })
    sendMessageAny({ action: 'get-diag-status' }, (resp: DiagStatus) => {
      if (runtimeAny.lastError || !resp || resp.error) return
      const line = formatDiagStatus(resp)
      if (line) setDiagStatus(line)
    })
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
    sendMessageAny({ action: 'run-check-now' }, (resp: { started?: boolean; throttled?: boolean }) => {
      if (runtimeAny.lastError || !resp) {
        setDiagStatus('could not start a check — try reopening this page')
        return
      }
      setDiagStatus(
        resp.throttled
          ? 'a manual check already ran in the last minute'
          : 'check started — wait about 30 seconds, then copy the log',
      )
    })
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
    setScanReads(String(SCAN_READS_DEFAULT))
    setScanSeconds(String(SCAN_SECONDS_DEFAULT))
    setClientId('')
  }

  const saveAndClose = () => {
    const intervalNum = Number(interval)
    const seenCountNum = Number(seenCount)
    const customClientId = (clientId || '').trim()

    const refuse = (message: string) => {
      setError(message)
      setTimeout(() => setError(''), 2800)
    }
    if (!(Number.isInteger(intervalNum) && intervalNum > 0)) {
      return refuse('"minutes between Reddit checks" must be a positive integer')
    }
    if (!(Number.isInteger(seenCountNum) && seenCountNum > 0)) {
      return refuse('"same-status count before alert" must be a positive integer')
    }
    if (!isScanReads(scanReads)) {
      return refuse(
        `"most Reddit reads per scan click" must be a whole number from ${SCAN_READS_MIN} to ${SCAN_READS_MAX}`,
      )
    }
    if (!isScanSeconds(scanSeconds)) {
      return refuse(`"seconds between scan reads" must be from ${SCAN_SECONDS_MIN} to ${SCAN_SECONDS_MAX}`)
    }

    setError('')
    saveOptions(
      {
        seen_count: seenCountNum,
        interval: intervalNum,
        custom_clientid: customClientId,
        removal_status: { track: removedMode !== 'off', notify: removedMode === 'notify' },
        lock_status: { track: lockedMode !== 'off', notify: lockedMode === 'notify' },
        hide_subscribe: hideSubscribe,
        monitor_quarantined: monitorQuarantined,
        show_scan_on_own_profile: showScanOnOwnProfile,
        show_scan_on_other_profiles: showScanOnOtherProfiles,
        show_thread_scan_buttons: showThreadScanButtons,
        highlight_own_profile_status: highlightOwnProfileStatus,
        auto_filter_removed_threads: autoFilterRemovedThreads,
        scan_reads_per_click: Number(scanReads),
        scan_seconds_between_reads: Number(scanSeconds),
      },
      () => {
        setAlarm(intervalNum)
        chrome.runtime.sendMessage({ action: 'update-badge' })
        window.close()
      },
    )
  }

  const heldTo = [
    scanLimits.reads_per_click && `at most ${scanLimits.reads_per_click} reads a click`,
    scanLimits.seconds_between_reads &&
      `at least ${Math.min(scanLimits.seconds_between_reads, SCAN_SECONDS_MAX)} seconds between reads`,
  ]
    .filter(Boolean)
    .join(' and ')

  if (!loaded) return <Page>Loading…</Page>

  // Only requests made with this id's token read monitor_quarantined
  const hasClientId = clientId.trim() !== ''

  return (
    <Page>
      <TopBar>
        <Title>Options</Title>
        <Button variant="primary" onClick={saveAndClose}>
          save
        </Button>
      </TopBar>

      <SectionHeader>Subscriptions</SectionHeader>
      <FieldStack>
        <Field>
          <label>other subscriptions</label>
          <BlueLink target="_blank" href="/src/other.html">
            manage ↗
          </BlueLink>
        </Field>
      </FieldStack>

      <SecondAccount />

      <SectionHeader>Tracking &amp; notification</SectionHeader>
      <FieldStack>
        <Field>
          <label>removed content</label>
          <ModeSelect value={removedMode} onChange={e => setRemovedMode(e.target.value as TrackMode)}>
            {MODE_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </ModeSelect>
        </Field>
        <Field>
          <label>locked content</label>
          <ModeSelect value={lockedMode} onChange={e => setLockedMode(e.target.value as TrackMode)}>
            {MODE_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </ModeSelect>
        </Field>
      </FieldStack>
      {(removedMode === 'notify' || lockedMode === 'notify') && (
        <LinkRow>
          <BlueLink
            href="#"
            onClick={e => {
              e.preventDefault()
              // A UI macro, not a setting: drops "badge + notifications" to
              // "badge only". Never upgrades "off" — that would re-enable
              // tracking the user turned off.
              if (removedMode === 'notify') setRemovedMode('badge')
              if (lockedMode === 'notify') setLockedMode('badge')
            }}
          >
            turn off all notifications
          </BlueLink>
        </LinkRow>
      )}
      <Note>"badge only" counts changes on the toolbar icon and in history, without showing system notifications.</Note>

      <SectionHeader>Polling</SectionHeader>
      <FieldStack>
        <Field>
          <label>
            minutes between Reddit checks
            <Hint>
              How often the extension checks Reddit for removed content. Increase this if Reddit rate-limits you (429
              errors).
            </Hint>
          </label>
          <input type="text" value={interval} onChange={e => setInterval_(e.target.value)} />
        </Field>
        <Field>
          <label>same-status count before alert</label>
          <input type="text" value={seenCount} onChange={e => setSeenCount(e.target.value)} />
        </Field>
        {hasClientId && (
          <CheckField
            label="monitor quarantined content"
            checked={monitorQuarantined}
            onChange={setMonitorQuarantined}
          />
        )}
        <CheckField label="hide subscribe button" checked={hideSubscribe} onChange={setHideSubscribe} />
        <CheckField
          label="show removed-content scan on other profiles"
          checked={showScanOnOtherProfiles}
          onChange={setShowScanOnOtherProfiles}
        />
        <CheckField
          label="show removed-content scan on your own profile"
          checked={showScanOnOwnProfile}
          onChange={setShowScanOnOwnProfile}
        />
        <CheckField
          label={'show "scan for removed comments" buttons on threads'}
          checked={showThreadScanButtons}
          onChange={setShowThreadScanButtons}
        />
        <CheckField
          label="flag your removed/locked content on your own profile"
          checked={highlightOwnProfileStatus}
          onChange={setHighlightOwnProfileStatus}
        />
        <CheckField
          label="auto-filter to show only removed comments after thread scan"
          checked={autoFilterRemovedThreads}
          onChange={setAutoFilterRemovedThreads}
        />
      </FieldStack>
      {hasClientId && monitorQuarantined && (
        <Note>
          Enabling "monitor quarantined content" may appear to cause an occasional logout. Refreshing the page should
          show you are still logged in. Increase "minutes between Reddit checks" to 5 or more to reduce this occurrence.
        </Note>
      )}

      <SectionHeader>Scans</SectionHeader>
      <FieldStack>
        <Field>
          <label>most Reddit reads per scan click</label>
          <input type="text" value={scanReads} onChange={e => setScanReads(e.target.value)} />
        </Field>
        <Field>
          <label>seconds between scan reads</label>
          <input type="text" value={scanSeconds} onChange={e => setScanSeconds(e.target.value)} />
        </Field>
      </FieldStack>
      <Note>
        Scans read Reddit with your login. More reads or a shorter wait get through big threads sooner, but Reddit may
        ask you to verify you&apos;re human if it sees what looks like automated activity.
        {heldTo && ` For now, Reveddit holds every scan to ${heldTo}, whatever these say.`}
      </Note>

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
        If removal detection seems broken, run a check, then copy the log and include it in a GitHub issue or email. The
        log stays on this device — nothing is sent automatically. Your username is left out unless you include it. The
        log lists the ids of your recent posts and comments, which let the developer check what happened to them, so
        leave them in if you can. Hidden, each becomes a stand-in that can&apos;t be traced back, as long as your
        username stays out too.
      </Note>
      <FieldStack>
        <CheckField label="include username in copied log" checked={diagIncludeUser} onChange={setDiagIncludeUser} />
        <CheckField label="hide post and comment ids" checked={diagHideIds} onChange={setDiagHideIds} />
      </FieldStack>
      <DiagActions>
        <Button onClick={runCheckNow}>check now</Button>
        <Button onClick={copyDiagLog} disabled={diagBusy}>
          copy log
        </Button>
        <Button onClick={clearDiagLogClick}>clear log</Button>
      </DiagActions>
      {diagStatus && <Note>{diagStatus}</Note>}

      <AdvancedLink>
        {!showAdvanced && (
          <BlueLink
            href="#"
            onClick={e => {
              e.preventDefault()
              setShowAdvanced(true)
            }}
          >
            advanced
          </BlueLink>
        )}
      </AdvancedLink>
      <AdvancedSection visible={showAdvanced}>
        <SectionHeader>Advanced</SectionHeader>
        <Note>
          Takes an "installed app" client id from reddit &gt; preferences &gt; apps. Checks then also use Reddit&apos;s
          API with it.
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
                  Blocks the legacy old.reddit.com HTML and unauthenticated .json paths, as if Reddit had already
                  removed them. Detection then relies only on the logged-out www.reddit.com profile view. Applies on the
                  next check — no save needed.
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
        <BlueLink
          href="#"
          onClick={e => {
            e.preventDefault()
            resetDefaults()
          }}
        >
          reset to defaults
        </BlueLink>
        <Button variant="primary" onClick={saveAndClose}>
          save
        </Button>
      </Footer>
    </Page>
  )
}

mountPage(Options)
