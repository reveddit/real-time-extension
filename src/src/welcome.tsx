import React, { useState, useEffect, useCallback } from 'react'
import { createRoot } from 'react-dom/client'
import styled from '@emotion/styled'
import { Global, css } from '@emotion/react'
import { subscribeUser } from './storage'
import { getLoggedinUser } from './requests'
import { colors } from './ui/theme'
import { BlueLink } from './ui/components'

const globalStyles = css`
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, sans-serif;
    background-color: #1a1a1b;
    color: #d7dadc;
    margin: 0;
    padding: 40px 20px;
    min-height: 100vh;
    box-sizing: border-box;
  }
`

const Container = styled.div`
  max-width: 600px;
  margin: 0 auto;
`

const HeaderSection = styled.div`
  text-align: center;
  margin-bottom: 30px;
`

const Logo = styled.img`
  width: 80px;
  height: 80px;
  margin-bottom: 15px;
`

const Title = styled.h1`
  font-size: 1.8em;
  margin: 0;
  color: #fff;
`

const Description = styled.p`
  font-size: 1.1em;
  line-height: 1.6;
  text-align: center;
  color: #b0b3b8;
`

const StatusBox = styled.div`
  background-color: #272729;
  border-radius: 8px;
  padding: 20px;
  margin: 25px 0;
  text-align: center;
`

const StatusMessage = styled.div<{ statusType: 'checking' | 'success' | 'error' }>`
  font-size: 1.1em;
  color: ${p => p.statusType === 'checking' ? '#818384' : p.statusType === 'success' ? '#46d160' : '#ff6b6b'};
`

const InstructionsBox = styled.div`
  background-color: #272729;
  border-radius: 8px;
  padding: 20px 30px;
  margin: 20px 0;

  h2 {
    font-size: 1.2em;
    margin: 20px 0 15px;
    color: #fff;
  }

  ol {
    padding-left: 20px;
    margin: 0;
    line-height: 2;
  }

  li {
    margin: 8px 0;
  }
`

const Actions = styled.div`
  text-align: center;
  margin: 30px 0;
`

const PrimaryBtn = styled.button`
  background-color: ${colors.redditOrange};
  color: #fff;
  border: none;
  padding: 14px 40px;
  font-size: 1.1em;
  border-radius: 24px;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: ${colors.redditOrangeHover};
  }

  &:disabled {
    background-color: #555;
    cursor: not-allowed;
  }
`

const FooterSection = styled.div`
  text-align: center;
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #343536;
`

function Welcome() {
  const [statusMessage, setStatusMessage] = useState('Checking Reddit connection...')
  const [statusType, setStatusType] = useState<'checking' | 'success' | 'error'>('checking')
  const [showInstructions, setShowInstructions] = useState(true)
  const [btnDisabled, setBtnDisabled] = useState(false)

  const checkConnection = useCallback(() => {
    setBtnDisabled(true)
    setStatusMessage('Checking Reddit connection...')
    setStatusType('checking')

    getLoggedinUser()
      .then((user: any) => {
        if (user) {
          setStatusMessage(`Connected as ${user}! Redirecting...`)
          setStatusType('success')
          setShowInstructions(false)

          subscribeUser(user, () => {
            try {
              chrome.runtime.sendMessage({ action: 'immediate-user-lookup', user })
            } catch (e) {}

            setTimeout(() => {
              window.location.href = `https://www.reveddit.com/user/${user}?all=true`
            }, 1000)
          }, () => {
            setTimeout(() => {
              window.location.href = `https://www.reveddit.com/user/${user}?all=true`
            }, 1000)
          })
        } else {
          setStatusMessage('Not connected. Please log in to Reddit first.')
          setStatusType('error')
          setShowInstructions(true)
          setBtnDisabled(false)
        }
      })
      .catch((err) => {
        console.log('Error checking connection:', err)
        setStatusMessage('Connection check failed. Please try again.')
        setStatusType('error')
        setBtnDisabled(false)
      })
  }, [])

  useEffect(() => {
    checkConnection()
  }, [checkConnection])

  return (
    <>
      <Global styles={globalStyles} />
      <Container>
        <HeaderSection>
          <Logo src="/icons/128.png" alt="Reveddit" />
          <Title>Welcome to Reveddit Real-Time</Title>
        </HeaderSection>

        <div>
          <Description>
            This extension monitors your Reddit comments and posts in real-time,
            notifying you when content is removed by moderators.
          </Description>

          <StatusBox>
            <StatusMessage statusType={statusType}>{statusMessage}</StatusMessage>
          </StatusBox>

          {showInstructions && (
            <InstructionsBox>
              <h2>Getting Started</h2>
              <ol>
                <li>
                  Open <BlueLink href="https://www.reddit.com" target="_blank">www.reddit.com</BlueLink>
                  {' '}or <BlueLink href="https://old.reddit.com" target="_blank">old.reddit.com</BlueLink>
                  {' '}in a new tab
                </li>
                <li>Log in to your Reddit account</li>
                <li>Come back here and click the button below</li>
              </ol>
            </InstructionsBox>
          )}

          <Actions>
            <PrimaryBtn onClick={checkConnection} disabled={btnDisabled}>
              Check Connection
            </PrimaryBtn>
          </Actions>

          <FooterSection>
            <BlueLink href="https://www.reveddit.com/about/faq/" target="_blank">
              Learn more about Reveddit
            </BlueLink>
          </FooterSection>
        </div>
      </Container>
    </>
  )
}

createRoot(document.getElementById('root')!).render(<Welcome />)
