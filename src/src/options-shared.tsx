import styled from '@emotion/styled'
import { tokens } from './ui/tokens'

export const Note = styled.p`
  color: var(--text-secondary);
  font-size: 0.88em;
  margin: ${tokens.space.sm} 0;
`

export const DiagActions = styled.div`
  display: flex;
  gap: ${tokens.space.sm};
  margin-top: ${tokens.space.sm};
`

// Callback-style sendMessage and lastError aren't in this chrome typings
// surface — same cast popup.tsx uses for try-reconnect.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const sendMessageAny = chrome.runtime.sendMessage as any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const runtimeAny = chrome.runtime as any
