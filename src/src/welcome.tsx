import React, { useState, useEffect, useCallback, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import styled from '@emotion/styled'
import { subscribeUser } from './storage'
import { getLoggedinUser } from './requests'
import { AppGlobal } from './ui/global'
import { BlueLink, Button, Card } from './ui/components'
import { tokens } from './ui/tokens'

const Page = styled.div`
  max-width: 560px;
  margin: 0 auto;
  padding: ${tokens.space.xl} ${tokens.space.lg};
`

const Header = styled.div`
  text-align: center;
  margin-bottom: ${tokens.space.lg};
`

const Logo = styled.img`
  width: 72px;
  height: 72px;
  margin-bottom: ${tokens.space.sm};
`

const Title = styled.h1`
  margin: 0 0 ${tokens.space.xs} 0;
  font-size: 1.8em;
`

const Subtitle = styled.p`
  margin: 0;
  color: var(--text-secondary);
  line-height: 1.5;
`

const StatusCard = styled(Card)`
  text-align: center;
`

const StatusText = styled.div<{ statusType: 'checking' | 'success' | 'error' }>`
  font-size: 1.05em;
  color: ${p =>
    p.statusType === 'success'
      ? 'var(--approved-border)'
      : p.statusType === 'error'
        ? 'var(--accent)'
        : 'var(--text-secondary)'};
`

const InstructionsCard = styled(Card)`
  & h2 {
    font-size: 1.1em;
    margin: 0 0 ${tokens.space.sm} 0;
  }
  & ol {
    margin: 0;
    padding-left: 1.4em;
    line-height: 1.8;
    color: var(--text-primary);
  }
  & li { margin: ${tokens.space.xs} 0; }
`

const Actions = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${tokens.space.sm};
  margin: ${tokens.space.lg} 0;
`

const Footer = styled.div`
  text-align: center;
  margin-top: ${tokens.space.lg};
  padding-top: ${tokens.space.md};
  border-top: 1px solid var(--border);
`

function Welcome() {
  const [statusMessage, setStatusMessage] = useState('Checking Reddit connection...')
  const [statusType, setStatusType] = useState<'checking' | 'success' | 'error'>('checking')
  const [showInstructions, setShowInstructions] = useState(false)
  const [succeeded, setSucceeded] = useState(false)

  const inFlight = useRef(false)
  const attemptCount = useRef(0)
  const pollTimer = useRef<number | null>(null)

  const checkConnection = useCallback((isManual: boolean = false) => {
    if (inFlight.current || succeeded) return
    inFlight.current = true
    attemptCount.current += 1

    if (isManual) {
      setStatusMessage('Checking Reddit connection...')
      setStatusType('checking')
    }

    getLoggedinUser()
      .then((result) => {
        const user = result as string | null
        inFlight.current = false
        if (user) {
          setSucceeded(true)
          setStatusMessage(`Connected as ${user}! Redirecting...`)
          setStatusType('success')
          setShowInstructions(false)
          if (pollTimer.current !== null) {
            window.clearInterval(pollTimer.current)
            pollTimer.current = null
          }

          const redirect = () => {
            setTimeout(() => {
              window.location.href = chrome.runtime.getURL('src/history.html?welcome=1')
            }, 1000)
          }

          subscribeUser(user, () => {
            try {
              chrome.runtime.sendMessage({ action: 'immediate-user-lookup', user })
            } catch (e) {
              console.log('immediate-user-lookup send failed:', e)
            }
            redirect()
          }, redirect)
        } else {
          if (attemptCount.current === 1) {
            setStatusMessage("We couldn't detect your Reddit session yet. If you're already signed in, open a Reddit tab so the extension can read your session. Otherwise, sign in to Reddit below.")
          } else {
            setStatusMessage('Waiting for Reddit session… (we\'ll detect it automatically)')
          }
          setStatusType('error')
          setShowInstructions(true)
        }
      })
      .catch((err) => {
        inFlight.current = false
        console.log('Error checking connection:', err)
        setStatusMessage('Waiting for Reddit session… (we\'ll detect it automatically)')
        setStatusType('error')
        setShowInstructions(true)
      })
  }, [succeeded])

  useEffect(() => {
    checkConnection()
    const startedAt = Date.now()
    pollTimer.current = window.setInterval(() => {
      if (succeeded) {
        if (pollTimer.current !== null) {
          window.clearInterval(pollTimer.current)
          pollTimer.current = null
        }
        return
      }
      const elapsed = Date.now() - startedAt
      const interval = elapsed < 60000 ? 2000 : 5000
      if (interval === 5000 && Math.floor(elapsed / 2000) % 2 !== 0) return
      checkConnection()
    }, 2000)
    return () => {
      if (pollTimer.current !== null) {
        window.clearInterval(pollTimer.current)
        pollTimer.current = null
      }
    }
  }, [checkConnection, succeeded])

  const openReddit = () => {
    try {
      chrome.tabs.create({ url: 'https://www.reddit.com' })
    } catch (e) {
      console.log('chrome.tabs.create failed, falling back to window.open:', e)
      window.open('https://www.reddit.com', '_blank')
    }
  }

  return (
    <>
      <AppGlobal />
      <Page>
        <Header>
          <Logo src="/icons/128.png" alt="Reveddit" />
          <Title>Welcome to reveddit real-time</Title>
          <Subtitle>
            This extension monitors your Reddit comments and posts in real time,
            notifying you when content is removed by moderators.
          </Subtitle>
        </Header>

        <StatusCard>
          <StatusText statusType={statusType}>{statusMessage}</StatusText>
        </StatusCard>

        {showInstructions && (
          <InstructionsCard>
            <h2>Getting started</h2>
            <ol>
              <li>
                Open <BlueLink href="https://www.reddit.com" target="_blank" rel="noreferrer">www.reddit.com</BlueLink>
                {' '}or <BlueLink href="https://old.reddit.com" target="_blank" rel="noreferrer">old.reddit.com</BlueLink>
              </li>
              <li>Log in to your Reddit account</li>
              <li>We'll detect you automatically — no click needed.</li>
            </ol>
          </InstructionsCard>
        )}

        {!succeeded && (
          <Actions>
            <Button variant="primary" onClick={openReddit}>Open Reddit</Button>
            <Button
              variant="ghost"
              onClick={() => checkConnection(true)}
              disabled={inFlight.current}
            >
              Check connection now
            </Button>
          </Actions>
        )}

        <Footer>
          <BlueLink href="https://www.reveddit.com/about/faq/" target="_blank" rel="noreferrer">
            Learn more about reveddit
          </BlueLink>
        </Footer>
      </Page>
    </>
  )
}

createRoot(document.getElementById('root')!).render(<Welcome />)
