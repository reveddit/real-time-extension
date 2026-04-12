import styled from '@emotion/styled'
import { css } from '@emotion/react'
import { tokens } from './tokens'

export const BlueLink = styled.a`
  color: var(--link);
  text-decoration: none;
  &:hover {
    color: var(--link-hover);
    text-decoration: underline;
  }
`

export const MutedLink = styled.a`
  color: var(--text-secondary);
  text-decoration: none;
  &:hover { color: var(--link-hover); text-decoration: underline; }
`

export const ActionBtn = styled.button`
  display: block;
  width: 100%;
  margin-top: 6px;
  padding: 8px 10px;
  background: var(--accent);
  color: var(--text-on-accent);
  border: 0;
  border-radius: ${tokens.radius.md};
  cursor: pointer;
  font-size: 0.95em;
  font-weight: 600;
  transition: background 0.15s ease;
  &:hover { background: var(--accent-hover); }
  &:disabled { background: var(--button-bg); color: var(--text-muted); cursor: wait; }
`

export const Button = styled.button<{ variant?: 'primary' | 'secondary' | 'ghost' }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: ${tokens.radius.md};
  font-size: 0.92em;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
  ${p => {
    switch (p.variant) {
      case 'secondary':
        return css`
          background: var(--button-bg);
          color: var(--button-text);
          border-color: var(--border);
          &:hover { background: var(--bg-surface-hover); }
        `
      case 'ghost':
        return css`
          background: transparent;
          color: var(--link);
          border-color: transparent;
          &:hover { background: var(--bg-surface-hover); }
        `
      case 'primary':
      default:
        return css`
          background: var(--accent);
          color: var(--text-on-accent);
          border-color: var(--accent);
          &:hover { background: var(--accent-hover); border-color: var(--accent-hover); }
        `
    }
  }}
  &:disabled { opacity: 0.6; cursor: not-allowed; }
`

export type BannerVariant = 'warning' | 'success' | 'info' | 'news'

export const MessageBanner = styled.div<{ variant: BannerVariant }>`
  padding: 10px 12px;
  margin: 6px 0;
  border-radius: ${tokens.radius.md};
  font-size: 0.92em;
  ${p => {
    switch (p.variant) {
      case 'warning':
        return css`
          background: var(--locked-bg);
          border: 1px solid var(--locked-border);
          color: var(--text-primary);
        `
      case 'success':
        return css`
          background: var(--approved-bg);
          border: 1px solid var(--approved-border);
          color: var(--text-primary);
        `
      case 'news':
        return css`
          background: var(--note-bg);
          border: 1px solid var(--border-light);
          color: var(--text-primary);
        `
      case 'info':
      default:
        return css`
          background: var(--bg-surface);
          border: 1px solid var(--border);
          color: var(--text-secondary);
        `
    }
  }}
`

export const Card = styled.div`
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: ${tokens.radius.lg};
  padding: ${tokens.space.md} ${tokens.space.lg};
  margin-bottom: ${tokens.space.md};
  transition: border-color 0.15s ease;
  &:hover { border-color: var(--border-light); }
`

export const CardHeader = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${tokens.space.sm};
  margin-bottom: ${tokens.space.xs};
`

export const CardMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${tokens.space.sm};
  color: var(--text-secondary);
  font-size: 0.85em;
  margin-bottom: ${tokens.space.sm};
  & > span + span::before {
    content: '·';
    margin-right: ${tokens.space.sm};
    color: var(--text-muted);
  }
`

export const CardBody = styled.div`
  color: var(--text-primary);
  font-size: 0.95em;
`

export const CardActions = styled.div`
  display: flex;
  gap: ${tokens.space.sm};
  margin-top: ${tokens.space.sm};
  padding-top: ${tokens.space.sm};
  border-top: 1px solid var(--border);
`

export type BadgeVariant = 'removed' | 'deleted' | 'approved' | 'locked' | 'unlocked' | 'edited' | 'default'

export const Badge = styled.span<{ variant?: BadgeVariant }>`
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: ${tokens.radius.pill};
  font-weight: 700;
  font-size: 0.75em;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  white-space: nowrap;
  border: 1px solid transparent;
  ${p => {
    switch (p.variant) {
      case 'removed':
        return css`background: var(--removed-bg); border-color: var(--removed-border); color: #fff;`
      case 'deleted':
        return css`background: var(--deleted-bg); border-color: var(--deleted-border); color: #fff;`
      case 'approved':
        return css`background: var(--approved-bg); border-color: var(--approved-border); color: var(--text-primary);`
      case 'locked':
        return css`background: var(--locked-bg); border-color: var(--locked-border); color: var(--text-primary);`
      case 'unlocked':
        return css`background: var(--approved-bg); border-color: var(--approved-border); color: var(--text-primary);`
      case 'edited':
        return css`background: var(--bg-surface-hover); border-color: var(--border); color: var(--text-primary);`
      case 'default':
      default:
        return css`background: var(--bg-surface-hover); border-color: var(--border); color: var(--text-secondary);`
    }
  }}
`

export const SectionHeader = styled.h2`
  font-size: 0.78em;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-secondary);
  margin: ${tokens.space.lg} 0 ${tokens.space.sm} 0;
  padding-bottom: ${tokens.space.xs};
  border-bottom: 1px solid var(--border);
`

export const Field = styled.label`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${tokens.space.md};
  padding: ${tokens.space.sm} 0;
  & > span.label {
    color: var(--text-primary);
    font-size: 0.95em;
  }
  & > span.hint {
    color: var(--text-muted);
    font-size: 0.82em;
    display: block;
    margin-top: 2px;
  }
`

export const FieldCol = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
`

export const NumberInput = styled.input`
  width: 80px;
  text-align: right;
`

export const TextInput = styled.input`
  width: 100%;
`

export const Author = styled.span`
  color: var(--author);
  font-weight: 600;
`

export const Subreddit = styled.span`
  color: var(--text-secondary);
`

export const PostTitle = styled.h3`
  margin: ${tokens.space.xs} 0 ${tokens.space.sm} 0;
  color: var(--text-primary);
`

export const MdBody = styled.div`
  font-size: 0.95em;
`
