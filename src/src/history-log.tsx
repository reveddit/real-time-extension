import React from 'react'
import styled from '@emotion/styled'
import { tokens } from './ui/tokens'
import { NotificationLogEntry } from './storage'

const LogSection = styled.div`
    margin-top: ${tokens.space.lg};
    padding-top: ${tokens.space.md};
    border-top: 1px solid var(--border);
`
const LogToggle = styled.button`
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    font-size: 0.85em;
    padding: ${tokens.space.xs} 0;
    &:hover { color: var(--text-primary); }
`
const LogTable = styled.div`
    display: grid;
    grid-template-columns: auto auto 1fr auto;
    gap: 0;
    margin-top: ${tokens.space.sm};
    font-size: 0.82em;
    color: var(--text-secondary);
`
const LogHeader = styled.div`
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--text-muted);
    padding: ${tokens.space.xs} ${tokens.space.sm};
    border-bottom: 1px solid var(--border);
`
const LogCell = styled.div`
    padding: ${tokens.space.xs} ${tokens.space.sm};
    border-bottom: 1px solid var(--border);
    word-break: break-all;
`
const LogEmpty = styled.div`
    color: var(--text-muted);
    padding: ${tokens.space.sm} 0;
`

export function NotificationLog({ sectionRef, open, onToggle, entries }: {
  sectionRef: React.RefObject<HTMLDivElement | null>
  open: boolean
  onToggle: () => void
  entries: NotificationLogEntry[]
}) {
  return (
    <LogSection ref={sectionRef}>
      <LogToggle onClick={() => onToggle()}>
        {open ? '▾' : '▸'} Notification Log ({entries.length})
      </LogToggle>
      {open && (
        entries.length === 0 ? <LogEmpty>No notifications logged yet.</LogEmpty> : (
        <LogTable>
          <LogHeader>Time</LogHeader>
          <LogHeader>Type</LogHeader>
          <LogHeader>Message</LogHeader>
          <LogHeader>IDs</LogHeader>
          {entries.slice().reverse().map((entry, i) => (
            <React.Fragment key={i}>
              <LogCell>{new Date(entry.ts).toLocaleString()}</LogCell>
              <LogCell>{entry.source}</LogCell>
              <LogCell>{entry.message}</LogCell>
              <LogCell>{entry.itemIds?.join(', ')}</LogCell>
            </React.Fragment>
          ))}
        </LogTable>
        )
      )}
    </LogSection>
  )
}
