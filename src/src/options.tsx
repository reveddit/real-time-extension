import React, { useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import styled from '@emotion/styled'
import { Global, css } from '@emotion/react'
import { getOptions, INTERVAL_DEFAULT, SEEN_COUNT_DEFAULT, saveOptions } from './storage'
import { setAlarm } from './common'
import { BlueLink } from './ui/components'

const globalStyles = css`
  body {
    margin: 10px;
  }
`

const Row = styled.div`
  clear: both;
  text-align: right;
  padding-bottom: 2em;

  label {
    margin-right: 0.5em;
    float: left;
    width: 15em;
  }

  input {
    float: left;
  }
`

const SaveBtnGroup = styled.div<{ align?: string }>`
  display: flex;
  justify-content: ${p => p.align === 'start' ? 'flex-start' : 'flex-end'};
`

const Header = styled.h3`
  font-weight: bold;
`

const Subscriptions = styled.div`
  margin-bottom: 1.5em;

  div {
    margin-bottom: 0.5em;
  }
`

const ErrorDiv = styled.div`
  color: red;
  min-height: 2em;
`

const TableHeader = styled.td<{ type?: 'row' | 'col' }>`
  font-weight: bold;
  ${p => p.type === 'row' ? 'margin-bottom: 10px; text-align: right;' : 'margin-left: 10px;'}
`

const Table = styled.table`
  border-collapse: separate;
  border-spacing: 5px;

  tr td {
    text-align: center;
  }
`

const AdvancedSection = styled.div<{ visible: boolean }>`
  display: ${p => p.visible ? 'block' : 'none'};
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
  const [error, setError] = useState('')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    getOptions((_users: string[], _others: string[], options: Record<string, any>) => {
      setInterval_(String(options.interval))
      setSeenCount(String(options.seen_count || SEEN_COUNT_DEFAULT))
      setClientId(options.custom_clientid || '')
      setRemovedTrack(options.removal_status.track)
      setRemovedNotify(options.removal_status.notify)
      setLockedTrack(options.lock_status.track)
      setLockedNotify(options.lock_status.notify)
      setHideSubscribe(options.hide_subscribe)
      setMonitorQuarantined(options.monitor_quarantined)
      setLoaded(true)
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

  if (!loaded) return null

  return (
    <>
      <Global styles={globalStyles} />

      <SaveBtnGroup>
        <button onClick={saveAndClose}>save</button>
      </SaveBtnGroup>

      <Header>Subscriptions</Header>
      <Subscriptions>
        <div>
          <BlueLink target="_blank" href="/src/other.html">other</BlueLink>
        </div>
        <hr />
      </Subscriptions>

      <br /><br />
      <Header>Tracking &amp; Notification</Header>
      <Table>
        <tbody>
          <tr>
            <td></td>
            <TableHeader type="col">track</TableHeader>
            <TableHeader type="col">notify</TableHeader>
          </tr>
          <tr>
            <TableHeader type="row">removed</TableHeader>
            <td><input type="checkbox" checked={removedTrack} onChange={e => handleRemovedTrackChange(e.target.checked)} /></td>
            <td><input type="checkbox" checked={removedNotify} onChange={e => handleRemovedNotifyChange(e.target.checked)} /></td>
          </tr>
          <tr>
            <TableHeader type="row">locked</TableHeader>
            <td><input type="checkbox" checked={lockedTrack} onChange={e => handleLockedTrackChange(e.target.checked)} /></td>
            <td><input type="checkbox" checked={lockedNotify} onChange={e => handleLockedNotifyChange(e.target.checked)} /></td>
          </tr>
        </tbody>
      </Table>

      <Header>Other</Header>
      <Row>
        <label>minutes between updates: </label>
        <input type="text" value={interval} onChange={e => setInterval_(e.target.value)} />
      </Row>
      <Row>
        <label>hide subscribe button: </label>
        <input type="checkbox" checked={hideSubscribe} onChange={e => setHideSubscribe(e.target.checked)} />
      </Row>
      <Row>
        <label>monitor quarantined content: </label>
        <input type="checkbox" checked={monitorQuarantined} onChange={e => setMonitorQuarantined(e.target.checked)} />
      </Row>
      <Row>
        <label>same-status count before alert: </label>
        <input type="text" value={seenCount} onChange={e => setSeenCount(e.target.value)} />
      </Row>
      {monitorQuarantined && (
        <p>Note: enabling &quot;monitor quarantined content&quot; may appear to cause an occasional logout. Refreshing the page should show you are still logged in. Increase &quot;minutes between updates&quot; to 5 or more to reduce this occurrence.</p>
      )}

      <div>
        {!showAdvanced && (
          <BlueLink href="#" onClick={e => { e.preventDefault(); setShowAdvanced(true) }}>advanced</BlueLink>
        )}
        <AdvancedSection visible={showAdvanced}>
          <Header>Advanced</Header>
          <p>This option overrides the &quot;installed app&quot; client id from reddit &gt; preferences &gt; apps.</p>
          <Row>
            <label>custom client id: </label>
            <input type="text" value={clientId} onChange={e => setClientId(e.target.value)}
              placeholder="<default is blank>" autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} />
          </Row>
        </AdvancedSection>
      </div>

      <Row>
        <BlueLink href="#" onClick={e => { e.preventDefault(); resetDefaults() }}>reset to defaults</BlueLink>
      </Row>
      <div style={{ clear: 'both' }} />
      {error && <ErrorDiv>{error}</ErrorDiv>}
      <SaveBtnGroup align="end">
        <button onClick={saveAndClose}>save</button>
      </SaveBtnGroup>
      <div style={{ clear: 'both' }} />
    </>
  )
}

createRoot(document.getElementById('root')!).render(<Options />)
