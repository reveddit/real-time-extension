// Reddit's feeds as a scan reads them, in the shapes of 2026-11-04.

import { vi } from 'vitest'

// Runs a scan under fake timers, as long as its waits take
export const withTimers = async run => {
    vi.useFakeTimers()
    let done = false
    const running = run().finally(() => (done = true))
    for (let i = 0; i < 100 && !done; i++) await vi.advanceTimersByTimeAsync(2000)
    return running
}

export const POST = 't3_post'
// A thread's age picks the sort, so these stay young
export const NOW = new Date().toISOString()
export const entry = (id, author, body, post = 'post', sub = 'sub') =>
    `<entry>${author ? `<author><name>/u/${author}</name><uri>https://www.reddit.com/user/${author}</uri></author>` : ''}` +
    `<category term="${sub}" label="r/${sub}" />` +
    `<content type="html">&lt;!-- SC_OFF --&gt;&lt;div class=&quot;md&quot;&gt;&lt;p&gt;${body}&lt;/p&gt; &lt;/div&gt;&lt;!-- SC_ON --&gt;</content>` +
    `<id>${id}</id><link href="https://www.reddit.com/r/${sub}/comments/${post}/a_title/${id.slice(3)}/"/>` +
    `<updated>${NOW}</updated><title>/u/${author || '[deleted]'} on A title</title></entry>`
export const postEntry = (id = POST, author = 'op_user', body = 'the post', extra = '') =>
    entry(id, author, body, id.slice(3)).replace('</title>', `</title>${extra}`)
export const feed = (...entries) =>
    `<?xml version="1.0" encoding="UTF-8"?><feed xmlns="http://www.w3.org/2005/Atom"><id>/x/.rss</id>${entries.join('')}</feed>`
export const listing = (...children) => JSON.stringify({ data: { children } })

// The paths a scan reads, and the background's answer to one from a table of
// pages (a string is a page that loads, an object is the answer itself, a path
// missing from the table is a 404). Records each path asked.
export const threadPath = '/r/sub/comments/post/.rss?limit=500'
export const authorPath = name => `/user/${name}/comments/.rss?sort=new&limit=100`
export const commentPath = id => `/comments/post/_/${id.slice(3)}/.rss?context=1`
export const answerRead = (pages, asked, path) => {
    asked.push(path)
    const page = pages[path]
    if (page === undefined) return { ok: false, status: 404, text: '' }
    return typeof page === 'string' ? { ok: true, status: 200, text: page } : page
}
