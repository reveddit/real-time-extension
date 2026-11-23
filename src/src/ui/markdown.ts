// Thin wrapper around the vendored snuownd parser. Matches the behavior of
// website/src/utils.tsx markdownToHTML so the extension renders Reddit
// markdown identically to revddit.com.

import SnuOwnd from '../../../lib/snuownd'

const parser = (SnuOwnd as any).getParser()

// The same parser with each link set to open in a new tab. In the popup a plain
// click on a link does nothing (only one with Command or Ctrl held opens it),
// so the popup's messages ask for this.
const newTabRenderer = (SnuOwnd as any).getRedditRenderer()
newTabRenderer.context.target = '_blank'
const newTabParser = (SnuOwnd as any).getParser(newTabRenderer)

const replaceAmpGTLT = (s: string): string => s.replace(/&amp;/g, '&').replace(/&gt;/g, '>').replace(/&lt;/g, '<')

export const markdownToHTML = (text: string, newTab = false): string => {
    const html = (newTab ? newTabParser : parser).render(replaceAmpGTLT(text || ''))
    // Rewrite relative links (e.g. /r/...) to absolute reddit.com URLs
    return html.replace(/href="\//g, 'href="https://www.reddit.com/')
}
