import React, { useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import styled from '@emotion/styled'
import { getOptions, INTERVAL_DEFAULT, SEEN_COUNT_DEFAULT, saveOptions } from './storage'
import { setAlarm } from './common'
import { AppGlobal, setThemeMode, THEME_STORAGE_KEY, ThemeMode } from './ui/global'
import { BlueLink, Button, SectionHeader, MessageBanner } from './ui/components'
import { tokens } from './ui/tokens'

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

const TrackingGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 70px 70px;
  align-items: center;
  gap: ${tokens.space.xs} ${tokens.space.md};
  padding: ${tokens.space.sm} 0;
  & > .hcell {
    color: var(--text-secondary);
    font-size: 0.82em;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    text-align: center;
  }
  & > .rowlabel {
    color: var(--text-primary);
  }
  & > .cbcell {
    text-align: center;
  }
  & > .spacer { height: 4px; }
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

function Options() {
  const [interval, setInterval_] = useState('')
  const [seenCount, setSeenCount] = useState('')
  const [clientId, setClientId] = useState('')
  const [removedTrack, setRemovedTrack] = useState(false)
  const [removedNotify, setRemovedNotify] = useState(false)
  const [lockedTrack, setLockedTrack] = useState(false)
  const [lockedNotify, setLockedNotify] = useState(false)
  const [hideSubscribe, setHideSubscribe] = useState(false)
  const [monitorQuarantined, setMonitorQuarantined] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [themeMode, setThemeModeState] = useState<ThemeMode>('auto')
  const [error, setError] = useState('')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    getOptions((_users: string[], _others: string[], options: Record<string, any>) => {
      const opts = options || {}
      const removal = opts.removal_status || {}
      const lock = opts.lock_status || {}
      setInterval_(String(opts.interval ?? INTERVAL_DEFAULT))
      setSeenCount(String(opts.seen_count || SEEN_COUNT_DEFAULT))
      setClientId(opts.custom_clientid || '')
      setRemovedTrack(!!removal.track)
      setRemovedNotify(!!removal.notify)
      setLockedTrack(!!lock.track)
      setLockedNotify(!!lock.notify)
      setHideSubscribe(!!opts.hide_subscribe)
      setMonitorQuarantined(!!opts.monitor_quarantined)
      setLoaded(true)
    })
    chrome.storage.local.get([THEME_STORAGE_KEY], res => {
      setThemeModeState((res?.[THEME_STORAGE_KEY] as ThemeMode) || 'auto')
    })
  }, [])

  const handleRemovedNotifyChange = (checked: boolean) => {
    setRemovedNotify(checked)
    if (checked) setRemovedTrack(true)
  }
  const handleRemovedTrackChange = (checked: boolean) => {
    setRemovedTrack(checked)
    if (!checked) setRemovedNotify(false)
  }
  const handleLockedNotifyChange = (checked: boolean) => {
    setLockedNotify(checked)
    if (checked) setLockedTrack(true)
  }
  const handleLockedTrackChange = (checked: boolean) => {
    setLockedTrack(checked)
    if (!checked) setLockedNotify(false)
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
      setError('"minutes between updates" must be a positive integer')
      setTimeout(() => setError(''), 2800)
      return
    }
    if (!(Number.isInteger(seenCountNum) && seenCountNum > 0)) {
      setError('"same-status count before alert" must be a positive integer')
      setTimeout(() => setError(''), 2800)
      return
    }

    setError('')
    saveOptions(seenCountNum, intervalNum, customClientId, removedTrack, removedNotify,
                lockedTrack, lockedNotify, hideSubscribe, monitorQuarantined, () => {
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

        <SectionHeader>Tracking &amp; notification</SectionHeader>
        <TrackingGrid>
          <div />
          <div className="hcell">track</div>
          <div className="hcell">notify</div>

          <div className="rowlabel">removed</div>
          <div className="cbcell">
            <input type="checkbox" checked={removedTrack}
              onChange={e => handleRemovedTrackChange(e.target.checked)} />
          </div>
          <div className="cbcell">
            <input type="checkbox" checked={removedNotify}
              onChange={e => handleRemovedNotifyChange(e.target.checked)} />
          </div>

          <div className="rowlabel">locked</div>
          <div className="cbcell">
            <input type="checkbox" checked={lockedTrack}
              onChange={e => handleLockedTrackChange(e.target.checked)} />
          </div>
          <div className="cbcell">
            <input type="checkbox" checked={lockedNotify}
              onChange={e => handleLockedNotifyChange(e.target.checked)} />
          </div>
        </TrackingGrid>

        <SectionHeader>Polling</SectionHeader>
        <FieldStack>
          <Field>
            <label>minutes between updates</label>
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
        </FieldStack>
        {monitorQuarantined && (
          <Note>
            Enabling "monitor quarantined content" may appear to cause an occasional logout.
            Refreshing the page should show you are still logged in. Increase "minutes between
            updates" to 5 or more to reduce this occurrence.
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
