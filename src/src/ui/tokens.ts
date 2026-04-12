// Design tokens ported from website/src/sass/colors.sass so the extension
// matches the revddit.com site. Dark is the default; [data-theme="light"] on
// the root element flips the palette. The extension is self-contained: these
// values are copied, not imported from website/.

import { css } from '@emotion/react'

export const tokens = {
  radius: {
    sm: '4px',
    md: '6px',
    lg: '8px',
    pill: '999px',
  },
  space: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
  },
  font: {
    body: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  },
} as const

export const globalTokens = css`
  :root {
    /* Backgrounds */
    --bg-primary: #1a1b1e;
    --bg-secondary: #111214;
    --bg-surface: #25262b;
    --bg-surface-hover: #2c2d33;

    /* Text */
    --text-primary: #e0e0e0;
    --text-secondary: #909296;
    --text-muted: #606368;
    --text-on-accent: #ffffff;

    /* Accent / brand */
    --accent: #e03e3e;
    --accent-dim: #c13030;
    --accent-hover: #e85555;

    /* Links */
    --link: #74b3e0;
    --link-hover: #9ac8eb;

    /* Semantic */
    --author: #6a98af;
    --submitter: #2b7de9;
    --moderator: #2ea043;
    --admin: #e03e3e;
    --quarantined: #ffd635;

    /* Removed / deleted indicators */
    --removed-bg: rgba(99, 54, 54, 1);
    --removed-border: #e03e3e;
    --deleted-bg: rgba(33, 77, 149, 1);
    --deleted-border: #4c6ef5;
    --approved-bg: rgba(46, 160, 67, 0.22);
    --approved-border: #2ea043;
    --locked-bg: rgba(255, 214, 53, 0.22);
    --locked-border: #ffd635;

    /* Borders & surfaces */
    --border: #373a40;
    --border-light: #4a4e54;
    --note-bg: #264d73;
    --code-bg: rgba(42, 51, 64, 1);
    --code-border: rgba(88, 105, 123, 1);

    /* UI elements */
    --button-bg: #373a40;
    --button-text: #e0e0e0;
    --input-bg: #25262b;
    --input-border: #373a40;
    --input-focus: #74b3e0;

    /* Scores & meta */
    --meta: #909296;

    color-scheme: dark;
  }

  :root[data-theme='light'] {
    --bg-primary: #ffffff;
    --bg-secondary: #f8f9fa;
    --bg-surface: #f1f3f5;
    --bg-surface-hover: #e9ecef;

    --text-primary: #1a1b1e;
    --text-secondary: #495057;
    --text-muted: #868e96;
    --text-on-accent: #ffffff;

    --accent: #c92a2a;
    --accent-dim: #a82828;
    --accent-hover: #e03131;

    --link: #1971c2;
    --link-hover: #1c7ed6;

    --author: #3a6f8a;
    --submitter: #1864ab;
    --moderator: #2b8a3e;
    --admin: #c92a2a;

    --removed-bg: rgba(255, 230, 230, 1);
    --removed-border: #c92a2a;
    --deleted-bg: rgba(219, 234, 254, 1);
    --deleted-border: #1971c2;
    --approved-bg: rgba(43, 138, 62, 0.12);
    --approved-border: #2b8a3e;
    --locked-bg: rgba(255, 214, 53, 0.28);
    --locked-border: #d4a017;

    --border: #dee2e6;
    --border-light: #ced4da;
    --note-bg: #e7f5ff;
    --code-bg: #f1f3f5;
    --code-border: #dee2e6;

    --button-bg: #e9ecef;
    --button-text: #1a1b1e;
    --input-bg: #ffffff;
    --input-border: #ced4da;
    --input-focus: #1971c2;

    --meta: #868e96;

    color-scheme: light;
  }
`

export const globalBase = css`
  html, body {
    margin: 0;
    background: var(--bg-primary);
    color: var(--text-primary);
    font-family: ${tokens.font.body};
    font-size: 14px;
    line-height: 1.45;
  }
  *, *::before, *::after { box-sizing: border-box; }

  a { color: var(--link); text-decoration: none; }
  a:hover { color: var(--link-hover); text-decoration: underline; }

  hr {
    border: 0;
    border-top: 1px solid var(--border);
    margin: ${tokens.space.md} 0;
  }

  h1, h2, h3, h4 { color: var(--text-primary); }
  h1 { font-size: 22px; margin: 0 0 ${tokens.space.lg} 0; }
  h2 { font-size: 18px; margin: 0 0 ${tokens.space.md} 0; }
  h3 { font-size: 16px; margin: 0 0 ${tokens.space.sm} 0; }

  button {
    font-family: inherit;
    font-size: inherit;
  }

  input[type='text'], input[type='number'], select, textarea {
    background: var(--input-bg);
    color: var(--text-primary);
    border: 1px solid var(--input-border);
    border-radius: ${tokens.radius.sm};
    padding: 6px 8px;
    font-family: inherit;
    font-size: inherit;
    outline: none;
    &:focus { border-color: var(--input-focus); }
  }

  input[type='checkbox'] { accent-color: var(--link); }
`

// Markdown output styles (ported essentials from website/src/sass/markdown.sass
// and comment.sass). Applied inside .md-body containers.
export const globalMarkdown = css`
  .md-body {
    word-break: break-word;
    color: var(--text-primary);
  }
  .md-body p { margin: 0.5em 0; line-height: 1.45; }
  .md-body a { color: var(--link); }
  .md-body a:hover { color: var(--link-hover); }
  .md-body ul, .md-body ol { margin: 0.5em 0; padding-left: 1.5em; }
  .md-body li { margin: 0.2em 0; }
  .md-body blockquote {
    border-left: 3px solid var(--border-light);
    color: var(--text-secondary);
    padding-left: 10px;
    margin: 0.5em 0;
  }
  .md-body pre {
    margin: 0.5em 0;
    padding: 8px 10px;
    overflow: auto;
    border: 1px solid var(--code-border);
    background: var(--code-bg);
    border-radius: ${tokens.radius.md};
  }
  .md-body code {
    background: var(--code-bg);
    border: 1px solid var(--code-border);
    border-radius: 3px;
    padding: 0 4px;
    font-family: ${tokens.font.mono};
    font-size: 0.92em;
  }
  .md-body pre code {
    background: transparent;
    border: 0;
    padding: 0;
    display: block;
    white-space: pre;
  }
  .md-body h1, .md-body h2, .md-body h3, .md-body h4 {
    margin: 0.6em 0 0.3em 0;
  }
  .md-body > *:first-of-type { margin-top: 0; }
  .md-body > *:last-child { margin-bottom: 0; }
`
