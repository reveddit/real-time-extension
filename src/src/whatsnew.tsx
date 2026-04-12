import React from 'react'
import { createRoot } from 'react-dom/client'
import styled from '@emotion/styled'
import { AppGlobal } from './ui/global'
import { Card, CardBody, SectionHeader, Button, BlueLink } from './ui/components'
import { tokens } from './ui/tokens'

const Page = styled.div`
  max-width: 720px;
  margin: 0 auto;
  padding: ${tokens.space.xl};
`

const Hero = styled.div`
  text-align: center;
  padding: ${tokens.space.xl} 0;
  border-bottom: 1px solid var(--border);
  margin-bottom: ${tokens.space.xl};
`

const Title = styled.h1`
  font-size: 28px;
  margin: 0 0 ${tokens.space.sm} 0;
`

const Subtitle = styled.p`
  color: var(--text-secondary);
  margin: 0;
  font-size: 1.1em;
`

const Feature = styled.div`
  margin-bottom: ${tokens.space.lg};
  & > h3 {
    display: flex;
    align-items: center;
    gap: ${tokens.space.sm};
    margin-bottom: ${tokens.space.xs};
  }
  & > p {
    margin: 0;
    color: var(--text-secondary);
  }
`

const Footer = styled.div`
  text-align: center;
  margin-top: ${tokens.space.xl};
  padding-top: ${tokens.space.lg};
  border-top: 1px solid var(--border);
  color: var(--text-muted);
  font-size: 0.9em;
`

function WhatsNew() {
  const version = (() => {
    try {
      return chrome.runtime.getManifest().version
    } catch {
      return ''
    }
  })()

  const openHistory = () => {
    try {
      chrome.tabs.create({ url: chrome.runtime.getURL('src/history.html') })
    } catch (e) {
      console.log('openHistory failed:', e)
    }
  }

  return (
    <>
      <AppGlobal />
      <Page>
        <Hero>
          <Title>What's new in reveddit real-time</Title>
          <Subtitle>A redesign to match reveddit.com {version ? `· v${version}` : ''}</Subtitle>
        </Hero>

        <SectionHeader>Highlights</SectionHeader>

        <Card>
          <CardBody>
            <Feature>
              <h3>Fresh look, dark by default</h3>
              <p>
                The popup, options, and history pages have been rebuilt to match the
                revddit.com design. Dark is the default, with a light mode you can pick
                from the options page.
              </p>
            </Feature>

            <Feature>
              <h3>History shows real comments and posts</h3>
              <p>
                Each removal, deletion, or lock now renders as a Reddit-style card with
                the full markdown body — no more truncated link labels. Filter and sort
                from the top of the page.
              </p>
            </Feature>

            <Feature>
              <h3>Same settings, clearer layout</h3>
              <p>
                All of your existing options and subscriptions carry over unchanged.
                The options page is now grouped into sections so nothing gets lost.
              </p>
            </Feature>
          </CardBody>
        </Card>

        <Footer>
          <Button variant="primary" onClick={openHistory}>
            Open history
          </Button>
          <div style={{ marginTop: 16 }}>
            Questions or feedback?{' '}
            <BlueLink href="https://www.reddit.com/r/reveddit" target="_blank" rel="noreferrer">
              r/reveddit
            </BlueLink>
          </div>
        </Footer>
      </Page>
    </>
  )
}

createRoot(document.getElementById('root')!).render(<WhatsNew />)
