// Reddit's feeds as a scan reads them, in the shapes of 2026-11-04.

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
