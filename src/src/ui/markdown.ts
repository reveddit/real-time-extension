// Thin wrapper around the vendored snuownd parser. Matches the behavior of
// website/src/utils.tsx markdownToHTML so the extension renders Reddit
// markdown identically to revddit.com.

import SnuOwnd from './snuownd'

const parser = (SnuOwnd as any).getParser()

const replaceAmpGTLT = (s: string): string =>
  s.replace(/&amp;/g, '&').replace(/&gt;/g, '>').replace(/&lt;/g, '<')

export const markdownToHTML = (text: string): string => {
  const html = parser.render(replaceAmpGTLT(text || ''))
  // Rewrite relative links (e.g. /r/...) to absolute reddit.com URLs
  return html.replace(/href="\//g, 'href="https://www.reddit.com/')
}
