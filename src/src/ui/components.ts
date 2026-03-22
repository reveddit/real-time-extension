import styled from '@emotion/styled'
import { css } from '@emotion/react'
import { colors } from './theme'

export const BlueLink = styled.a`
  color: ${colors.blue};
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`

export const ActionBtn = styled.button`
  display: block;
  width: 100%;
  margin-top: 6px;
  padding: 8px;
  background-color: ${colors.redditOrange};
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.95em;

  &:hover { background-color: ${colors.redditOrangeHover}; }
  &:disabled { background-color: ${colors.disabledGray}; cursor: wait; }
`

export type BannerVariant = 'warning' | 'success' | 'info'

const bannerColors: Record<BannerVariant, { bg: string; border: string; text: string }> = {
  warning: colors.warning,
  success: colors.success,
  info: colors.info,
}

export const MessageBanner = styled.div<{ variant: BannerVariant }>`
  background-color: ${p => bannerColors[p.variant].bg};
  border: 1px solid ${p => bannerColors[p.variant].border};
  color: ${p => bannerColors[p.variant].text};
  padding: 8px;
  margin: 5px 0;
  border-radius: 4px;
  font-size: 0.9em;
  text-align: center;
`

export const tableGlobalStyles = css`
  h1 {
    text-align: center;
  }
  table {
    border-collapse: collapse;
  }
  th, td {
    border: 1px solid black;
    padding: 10px;
  }
  a {
    text-decoration: none;
  }
`
