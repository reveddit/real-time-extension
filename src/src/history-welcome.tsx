import styled from '@emotion/styled'
import { Card, BlueLink, Button } from './ui/components'
import { tokens } from './ui/tokens'

const WelcomeBanner = styled(Card)`
  margin-bottom: ${tokens.space.lg};
  & h2 {
    margin: 0 0 ${tokens.space.sm} 0;
    font-size: 1.2em;
  }
  & p {
    margin: ${tokens.space.xs} 0;
    line-height: 1.6;
    color: var(--text-primary);
  }
  & ul {
    margin: ${tokens.space.sm} 0;
    padding-left: 1.4em;
    line-height: 1.8;
    color: var(--text-primary);
  }
`

const BannerActions = styled.div`
  display: flex;
  gap: ${tokens.space.sm};
  align-items: center;
  margin-top: ${tokens.space.md};
  flex-wrap: wrap;
`

const getPinInstructions = (): string => {
  if (__BUILT_FOR__ === 'firefox')
    return 'Click the extensions puzzle icon in the toolbar, then pin reveddit real-time.'
  if (navigator.userAgent.includes('Edg/'))
    return 'Click the extensions icon in the toolbar, then pin reveddit real-time.'
  return 'Click the puzzle piece icon in the toolbar, then pin reveddit real-time.'
}

export function FullWelcomeBanner({ currentUser, onDismiss }: { currentUser: string | null; onDismiss: () => void }) {
  return (
    <WelcomeBanner>
      <h2>Monitoring is active{currentUser ? ` for u/${currentUser}` : ''}</h2>
      <p>
        reveddit real-time is now watching your Reddit comments and posts. You'll be notified whenever content is
        removed by moderators, reapproved, locked, or unlocked.
      </p>
      <ul>
        <li>
          The extension's toolbar icon displays a badge count of removed comments and posts you haven't viewed yet.
        </li>
        <li>
          <strong>Pin the extension to your toolbar</strong> so you can always see this count. {getPinInstructions()}
        </li>
      </ul>
      {currentUser && (
        <p>
          You can also view your{' '}
          <BlueLink href={`https://www.reveddit.com/user/${currentUser}?all=true`} target="_blank" rel="noreferrer">
            reveddit.com user page
          </BlueLink>
          , which marks the removed comments and posts the extension finds.
        </p>
      )}
      <BannerActions>
        <Button variant="secondary" onClick={onDismiss}>
          Got it
        </Button>
      </BannerActions>
    </WelcomeBanner>
  )
}

export function SlimWelcomeBanner({ currentUser }: { currentUser: string | null }) {
  return (
    <WelcomeBanner>
      <h2>Monitoring is active{currentUser ? ` for u/${currentUser}` : ''}</h2>
      <p>
        No removed or changed content has been observed yet. You'll be notified when any of your comments or posts are
        removed by moderators.
      </p>
      <p>
        The extension's toolbar icon will display a count of removed items you haven't viewed. Pin the extension to your
        toolbar to always see it. {getPinInstructions()}
      </p>
      {currentUser && (
        <p>
          You can also check your{' '}
          <BlueLink href={`https://www.reveddit.com/user/${currentUser}?all=true`} target="_blank" rel="noreferrer">
            reveddit.com user page
          </BlueLink>
          , which marks the removed comments and posts the extension finds.
        </p>
      )}
    </WelcomeBanner>
  )
}
