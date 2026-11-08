// The scan buttons as a person presses them: the real restore-ui.ts and restore.ts
// over a fake DOM, with the background's reads answered from a table of feeds.

// Install chrome global BEFORE any source import
import '../mocks/chrome-api.js'

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { __resetStorage } from '../mocks/webextension-polyfill.js'
import { parseHTML, DOMParser } from 'linkedom'
import { POST, NOW, entry, postEntry, feed, listing, threadPath, authorPath, commentPath, answerRead } from '../mocks/feeds.js'

const refused = { ok: false, status: 403, blockPage: true }

const comment = (id, author, parent = '', children = '') =>
    `<shreddit-comment thingid="${id}" author="${author}" ${parent && `parentid="${parent}"`} created="${NOW}">` +
    `<details open><div slot="comment"><p>live words</p></div>` +
    `<shreddit-comment-action-row></shreddit-comment-action-row>` +
    `<div id="comment-children">${children}</div></details></shreddit-comment>`
const tombstone = (id, parent = '', children = '') =>
    `<shreddit-comment thingid="${id}" author="[deleted]" is-author-deleted ${parent && `parentid="${parent}"`} ` +
    `created="${NOW}" collapsed><details><div><p>Comment removed by moderator</p></div>` +
    `<div id="comment-children">${children}</div></details></shreddit-comment>`
const threadPage = (count, comments) =>
    `<html device="desktop"><body><shreddit-post comment-count="${count}"></shreddit-post>` +
    `<shreddit-comment-tree><section>${comments}</section></shreddit-comment-tree></body></html>`

const oldComment = (id, author, children = '', state = 'noncollapsed') =>
    `<div class="thing comment ${state}" data-fullname="${id}" data-author="${author}"><div class="entry">` +
    `<p class="tagline"><a class="author">${author}</a><time datetime="${NOW}"></time></p>` +
    `<div class="usertext-body"><div class="md"><p>live words</p></div></div><ul class="buttons"></ul></div>` +
    `<div class="child">${children && `<div class="sitetable listing">${children}</div>`}</div></div>`
const oldThreadPage = (count, comments) =>
    `<html><body><div id="siteTable" class="linklisting">` +
    `<div class="thing link" data-comments-count="${count}" data-fullname="${POST}"></div></div>` +
    `<div class="commentarea"><div class="menuarea"></div><div class="sitetable nestedlisting">${comments}</div></div></body></html>`

let pages, asked, ui
const answer = path => answerRead(pages, asked, path)

const load = async (html, path = '/r/sub/comments/post/a_title/') => {
    const dom = parseHTML(html)
    globalThis.document = dom.document
    globalThis.window = { location: { pathname: path.split('?')[0], search: path.split('?')[1] ? `?${path.split('?')[1]}` : '' } }
    globalThis.MutationObserver = class {
        observe() {}
        disconnect() {}
    }
    globalThis.DOMParser = DOMParser
    vi.resetModules()
    // scan-reads.ts gets the fresh instance of the mock
    const mock = await import('../mocks/webextension-polyfill.js')
    // More than the default, so the scans here have room
    mock.__resetStorage({ options: { scan_reads_per_click: 50 } })
    const fresh = mock.default
    // A second between reads, as the fastest options have it
    let waited = false
    fresh.runtime.sendMessage = async message => {
        if (message.action !== 'fetch-with-login') return undefined
        waited = !waited
        return waited ? { ok: false, status: 0, waitMs: 1000 } : answer(message.path)
    }
    ui = await import('../../src/src/restore-ui.ts')
}
const loadThread = async (html, isNewReddit = true) => {
    await load(html)
    ui.initRestoreOnThread(isNewReddit)
    await vi.advanceTimersByTimeAsync(0)
}
const loadProfile = async (html, user = 'someone', path = `/user/${user}/`, isNewReddit = false) => {
    await load(html, path)
    ui.initProfileScan(user, isNewReddit)
    await vi.advanceTimersByTimeAsync(0)
}

const click = el => el.dispatchEvent(new (el.ownerDocument.defaultView.Event)('click', { bubbles: true, cancelable: true }))
const settle = async busy => {
    for (let i = 0; i < 400 && busy(); i++) await vi.advanceTimersByTimeAsync(2000)
    await vi.advanceTimersByTimeAsync(0)
}
const scanBtn = () => document.querySelector('.rev-scan-all-btn')
const scanThread = async () => {
    click(scanBtn())
    await settle(() => scanBtn().classList.contains('rev-scan-all-loading'))
}
const placeBtn = () => document.querySelector('.rev-place-unattached-btn')
const place = async () => {
    const btn = placeBtn()
    const before = asked.length
    click(btn)
    await settle(() => btn.isConnected && btn.disabled)
    return asked.slice(before)
}
const threadNote = () => document.querySelector('.rev-scan-all-progress')?.textContent
const placeNote = () => document.querySelector('.rev-unattached-note')?.textContent
const revEl = id => document.querySelector(`[data-rev-id="${id}"]`)

beforeEach(() => {
    __resetStorage()
    vi.useFakeTimers()
    asked = []
    pages = { [authorPath('op_user')]: feed() }
})
// A removed comment whose parent, a live one the page didn't load, sits between it and a's comment
const orphanAndParent = () => {
    pages[commentPath('t1_gone1')] = feed(postEntry(), entry('t1_parent', 'p', 'live words'))
    pages[commentPath('t1_parent')] = feed(postEntry(), entry('t1_a', 'a', 'live words'), entry('t1_parent', 'p', 'live words'))
}

describe('Place unattached, then going on with the scan', () => {
    const start = async (count, html) => {
        await loadThread(html || threadPage(count, comment('t1_a', 'a') + comment('t1_b', 'b')))
        pages[threadPath] = feed(postEntry(), entry('t1_a', 'a', 'live words'), entry('t1_b', 'b', 'live words'), entry('t1_parent', 'p', 'live words'))
        pages[authorPath('a')] = feed(entry('t1_a', 'a', 'live words'), entry('t1_gone1', 'a', 'first words'))
        pages[authorPath('p')] = feed(entry('t1_parent', 'p', 'live words'))
        pages[authorPath('b')] = refused
        orphanAndParent()
    }

    it('reads on: a live comment placed for context is no recovered one', async () => {
        await start(5)
        await scanThread()
        expect(scanBtn().textContent).toBe('Continue scan')
        await place()
        expect(revEl('t1_parent').classList.contains('rev-context')).toBe(true)

        pages[authorPath('b')] = feed(entry('t1_b', 'b', 'live words'), entry('t1_gone2', 'b', 'second words'))
        pages[commentPath('t1_gone2')] = feed(postEntry(), entry('t1_a', 'a', 'live words'))
        await scanThread()
        expect(revEl('t1_gone2')?.textContent).toContain('second words')
        expect(scanBtn().textContent).toBe('2 comment(s) recovered')
    })

    it('gives a comment placed without its text that text when a feed has it', async () => {
        await start(5)
        pages[threadPath] = feed(postEntry(), entry('t1_a', 'a', 'live words'), entry('t1_b', 'b', 'live words'))
        pages[commentPath('t1_parent')] = feed(postEntry())
        await scanThread()
        await place()
        expect(revEl('t1_parent').classList.contains('rev-placeholder')).toBe(true)
        expect(revEl('t1_parent').textContent).toContain('[deleted]')

        pages[authorPath('b')] = feed(entry('t1_b', 'b', 'live words'), entry('t1_parent', 'p', 'the real words'))
        await scanThread()
        expect(revEl('t1_parent').classList.contains('rev-placeholder')).toBe(false)
        expect(revEl('t1_parent').textContent).toContain('the real words')
        expect(revEl('t1_parent').textContent).toContain('u/p')
        expect(Number(revEl('t1_parent').getAttribute('data-rev-created'))).toBe(Math.floor(Date.parse(NOW) / 1000))
        expect(revEl('t1_gone1').parentElement.closest('[data-rev-id]')).toBe(revEl('t1_parent'))
    })

    it('adds no second copy of a comment placed without its text, after Back forgets it', async () => {
        await start(5)
        pages[threadPath] = feed(postEntry(), entry('t1_a', 'a', 'live words'), entry('t1_b', 'b', 'live words'))
        pages[commentPath('t1_parent')] = feed(postEntry())
        await scanThread()
        await place()
        ui.resetScansForPage()

        pages[authorPath('b')] = feed(entry('t1_b', 'b', 'live words'), entry('t1_parent', 'p', 'the real words'))
        await scanThread()
        expect(document.querySelectorAll('[data-rev-id="t1_parent"]')).toHaveLength(1)
        expect(revEl('t1_parent').textContent).toContain('the real words')
    })

    it("old reddit: a live comment placed for context reads as live, so the count isn't thrown", async () => {
        await loadThread(oldThreadPage(5, oldComment('t1_a', 'a') + oldComment('t1_b', 'b')), false)
        pages[threadPath] = feed(postEntry(), entry('t1_a', 'a', 'live words'), entry('t1_b', 'b', 'live words'))
        pages[authorPath('a')] = feed(entry('t1_a', 'a', 'live words'), entry('t1_gone1', 'a', 'first words'))
        pages[authorPath('b')] = refused
        pages[authorPath('p')] = feed(entry('t1_parent', 'p', 'live words'))
        orphanAndParent()
        await scanThread()
        await place()

        pages[authorPath('b')] = feed(entry('t1_b', 'b', 'live words'))
        await scanThread()
        // a, b, the parent, what it recovered, and one more it never found
        expect(threadNote()).toContain('Scan complete: 1 recovered (1 not found)')
    })
})

describe('Place unattached', () => {
    const chains = (n, length) => {
        const orphans = []
        for (let c = 0; c < n; c++) {
            const orphan = `t1_o${c}`
            orphans.push(entry(orphan, 'a', 'removed words'))
            let child = orphan
            for (let level = 1; level <= length; level++) {
                const parent = `t1_p${c}x${level}`
                const up = level === length ? postEntry() : entry(`t1_p${c}x${level + 1}`, 'x', 'live words')
                pages[commentPath(child)] = feed(postEntry(), entry(parent, 'x', 'live words'))
                pages[commentPath(parent)] = feed(postEntry(), ...(level === length ? [] : [up]), entry(parent, 'x', 'live words'))
                child = parent
            }
        }
        return orphans
    }
    const withOrphans = async (n, length) => {
        await loadThread(threadPage(n * 2 + 3, comment('t1_a', 'a')))
        pages[threadPath] = feed(postEntry(), entry('t1_a', 'a', 'live words'))
        pages[authorPath('a')] = feed(entry('t1_a', 'a', 'live words'), ...chains(n, length))
        await scanThread()
    }

    it('goes on from where the last click stopped, reading nothing twice', async () => {
        await withOrphans(25, 3)
        const first = await place()
        expect(first).toHaveLength(50)
        expect(placeNote()).toBe('25 left to read. Click again to continue.')
        const second = await place()
        expect(second.filter(path => first.includes(path))).toEqual([])
        expect(placeBtn()).toBeNull()
    })

    it('reads 20 a click unless the options say otherwise', async () => {
        await withOrphans(25, 3)
        ;(await import('../mocks/webextension-polyfill.js')).__resetStorage()
        expect(await place()).toHaveLength(20)
    })

    it('says why it stopped', async () => {
        await withOrphans(1, 1)
        for (const [answered, words] of [
            [{ ok: false, status: 0, needsLogin: true }, 'Sign in to Reddit to scan'],
            [{ ok: false, status: 0, resting: true }, 'Reddit is rate limiting'],
            [{ ok: false, status: 429 }, 'Reddit is rate limiting'],
            [{ ok: false, status: 0, otherIdentity: true }, 'Scans need a regular window'],
        ]) {
            pages[commentPath('t1_p0x1')] = answered
            await place()
            expect(placeNote()).toContain(words)
            expect(placeBtn().textContent).toBe('Place unattached comments (1 left)')
        }
    })

    it("says what it couldn't read, and tries it again on a later click", async () => {
        await withOrphans(1, 1)
        const parent = pages[commentPath('t1_p0x1')]
        pages[commentPath('t1_p0x1')] = { ok: false, status: 500 }
        await place()
        expect(placeNote()).toBe('1 left to read. Click again to continue.')
        await place()
        expect(placeNote()).toBe("1 couldn't be read. Click again to try them.")
        pages[commentPath('t1_p0x1')] = parent
        await place()
        expect(placeBtn()).toBeNull()
    })

    it('puts nothing in for a parent that has reached the page since, on either reddit', async () => {
        for (const isNewReddit of [true, false]) {
            const parentHtml = isNewReddit ? comment('t1_parent', 'p') : oldComment('t1_parent', 'p')
            const list = isNewReddit ? 'section' : '.sitetable.nestedlisting'
            await loadThread(
                (isNewReddit ? threadPage : oldThreadPage)(5, (isNewReddit ? comment : oldComment)('t1_a', 'a')),
                isNewReddit,
            )
            pages[threadPath] = feed(postEntry(), entry('t1_a', 'a', 'live words'))
            pages[authorPath('a')] = feed(entry('t1_a', 'a', 'live words'), entry('t1_gone1', 'a', 'first words'))
            orphanAndParent()
            await scanThread()
            document.querySelector(list).insertAdjacentHTML('beforeend', parentHtml)
            expect(await place()).toEqual([])
            expect(placeBtn()).toBeNull()
            expect(document.querySelectorAll('[data-rev-id]')).toHaveLength(1)
            expect(document.querySelector(isNewReddit ? '[thingid="t1_parent"]' : '[data-fullname="t1_parent"]').contains(revEl('t1_gone1'))).toBe(true)
        }
    })

    it('hangs what comes next from a comment placed before Back, and reads nothing twice', async () => {
        await withOrphans(1, 2)
        pages[commentPath('t1_p0x1')] = feed(postEntry())
        await place()
        expect(revEl('t1_p0x1').classList.contains('rev-placeholder')).toBe(true)
        ui.resetScansForPage()

        pages[authorPath('a')] = feed(entry('t1_a', 'a', 'live words'), entry('t1_new', 'a', 'more words'))
        pages[commentPath('t1_new')] = feed(postEntry(), entry('t1_p0x1', null, '[deleted]'))
        await scanThread()
        await scanThread()
        expect(revEl('t1_new')).not.toBeNull()
        await place()
        expect(placeBtn()).toBeNull()
        expect(revEl('t1_p0x1').contains(revEl('t1_new'))).toBe(true)
        expect(document.querySelectorAll('[data-rev-id="t1_p0x1"]')).toHaveLength(1)
    })

    it('leaves its button ready if the page is left, for Back to bring back', async () => {
        await withOrphans(1, 1)
        const btn = placeBtn()
        const box = btn.closest('.rev-unattached-area')
        const home = box.parentElement
        let answered
        pages[commentPath('t1_p0x1')] = new Promise(resolve => (answered = resolve))
        click(btn)
        await vi.advanceTimersByTimeAsync(1000)
        box.remove()
        answered({ ok: false, status: 500 })
        await vi.advanceTimersByTimeAsync(0)
        home.prepend(box)
        expect(btn.disabled).toBe(false)
        expect(btn.textContent).toBe('Place unattached comments (1 left)')
        expect(document.querySelector('.rev-unattached-note .rev-restore-cancel')).toBeNull()
    })

    it.each([
        ['waiting its turn', async () => ({ ok: false, status: 0, waitMs: 20000 })],
        ['with a read out', () => new Promise(() => {})],
    ])('frees the buttons of a new page at once, from a scan of the old one %s', async (_, sendMessage) => {
        await loadThread(threadPage(9, comment('t1_a', 'a')))
        pages[threadPath] = feed(postEntry(), entry('t1_a', 'a', 'live words'))
        const mock = (await import('../mocks/webextension-polyfill.js')).default
        mock.runtime.sendMessage = sendMessage
        click(scanBtn())
        await vi.advanceTimersByTimeAsync(0)
        const onNewPage = document.querySelector('.rev-scan-comment-btn')
        expect(onNewPage.classList.contains('rev-scan-disabled')).toBe(true)
        scanBtn().remove()
        ui.resetScansForPage()
        await vi.advanceTimersByTimeAsync(0)
        expect(onNewPage.classList.contains('rev-scan-disabled')).toBe(false)
        expect(asked).toEqual([])
    })

    it('keeps what it read through Back, which can bring "Continue scan" back with it', async () => {
        const authors = Array.from({ length: 15 }, (_, i) => `author${i}`)
        await loadThread(threadPage(30, authors.map(name => comment(`t1_${name}`, name)).join('')))
        pages[threadPath] = feed(postEntry())
        for (const name of authors) pages[authorPath(name)] = feed()
        const mock = await import('../mocks/webextension-polyfill.js')
        mock.__getSyncStorage().options = { scan_reads_per_click: 10 }
        await scanThread()
        expect(scanBtn().textContent).toBe('Continue scan')
        const read = [...asked]

        ui.resetScansForPage()
        ui.initRestoreOnThread(true)
        await vi.advanceTimersByTimeAsync(0)
        asked.length = 0
        await scanThread()
        expect(asked.filter(path => read.includes(path))).toEqual([])
    })

    it('gives the buttons back if a scan breaks, and says it stopped', async () => {
        await loadThread(threadPage(9, comment('t1_a', 'a')))
        pages[threadPath] = feed(postEntry(), entry('t1_a', 'a', 'live words'))
        const querySelector = document.querySelector.bind(document)
        document.querySelector = selector => {
            if (selector.startsWith('shreddit-post')) throw new Error('broken')
            return querySelector(selector)
        }
        await scanThread()
        expect(threadNote()).toContain('The scan stopped unexpectedly')
        expect(scanBtn().disabled).toBe(false)
        expect(document.querySelector('.rev-restore-cancel')).toBeNull()
        expect(document.querySelector('.rev-scan-comment-btn').classList.contains('rev-scan-disabled')).toBe(false)
    })

    it('gives its button back if it breaks, and says it stopped', async () => {
        await withOrphans(1, 1)
        const btn = placeBtn()
        click(btn)
        document.createElement = () => {
            throw new Error('broken')
        }
        await settle(() => btn.disabled)
        expect(placeNote()).toContain('The scan stopped unexpectedly')
        expect(btn.textContent).toBe('Place unattached comments (1 left)')
    })

    it("can't be pressed during a scan, and can be cancelled like one", async () => {
        await loadThread(threadPage(9, comment('t1_a', 'a') + comment('t1_b', 'b')))
        pages[threadPath] = feed(postEntry(), entry('t1_a', 'a', 'live words'), entry('t1_b', 'b', 'live words'))
        pages[authorPath('a')] = feed(entry('t1_gone1', 'a', 'first words'), entry('t1_a', 'a', 'live words'))
        pages[authorPath('b')] = feed(entry('t1_b', 'b', 'live words'))
        orphanAndParent()
        click(scanBtn())
        for (let i = 0; i < 8 && !placeBtn(); i++) await vi.advanceTimersByTimeAsync(500)
        expect(placeBtn().classList.contains('rev-scan-disabled')).toBe(true)
        click(placeBtn())
        await settle(() => scanBtn().classList.contains('rev-scan-all-loading'))
        expect(threadNote()).not.toContain('cancelled')
        expect(asked).not.toContain(commentPath('t1_parent'))
        expect(placeBtn().classList.contains('rev-scan-disabled')).toBe(false)

        let answered
        pages[commentPath('t1_parent')] = new Promise(resolve => (answered = resolve))
        click(placeBtn())
        await vi.advanceTimersByTimeAsync(0)
        expect(scanBtn().classList.contains('rev-scan-disabled')).toBe(true)
        click(document.querySelector('.rev-unattached-note .rev-restore-cancel'))
        answered({ ok: false, status: 500 })
        await settle(() => placeBtn().disabled)
        expect(placeBtn().textContent).toBe('Place unattached comments (1 left)')
        expect(scanBtn().classList.contains('rev-scan-disabled')).toBe(false)
    })
})

describe("when a scan ends, the page's Scan-Rev buttons", () => {
    const twoAuthors = async () => {
        await loadThread(threadPage(9, comment('t1_a', 'a') + comment('t1_b', 'b')))
        pages[threadPath] = feed(postEntry(), entry('t1_a', 'a', 'live words'), entry('t1_b', 'b', 'live words'))
        pages[authorPath('a')] = feed(entry('t1_a', 'a', 'live words'))
        pages[authorPath('b')] = feed(entry('t1_b', 'b', 'live words'))
    }
    const scanRev = () => document.querySelector('.rev-scan-comment-btn')

    it('lose their number once another click would read nothing', async () => {
        await twoAuthors()
        pages[authorPath('b')] = { ok: false, status: 500 }
        for (let click_ = 0; click_ < 3; click_++) {
            click(scanRev())
            await settle(() => document.querySelector('.rev-spinner'))
        }
        expect(scanRev().textContent).toBe('Scan-Rev')
        expect(scanRev().title).not.toContain('click to continue')
    })

    it('end "Continue scan" once another click would read nothing', async () => {
        const authors = Array.from({ length: 15 }, (_, i) => `author${i}`)
        await loadThread(threadPage(30, authors.map(name => comment(`t1_${name}`, name)).join('')))
        pages[threadPath] = feed(postEntry())
        for (const name of authors) pages[authorPath(name)] = feed()
        pages[authorPath('author14')] = { ok: false, status: 403, blockPage: false }
        const mock = await import('../mocks/webextension-polyfill.js')
        mock.__getSyncStorage().options = { scan_reads_per_click: 10 }
        await scanThread()
        expect(scanBtn().textContent).toBe('Continue scan')
        for (let click_ = 0; click_ < 2; click_++) {
            click(scanRev())
            await settle(() => document.querySelector('.rev-spinner'))
        }
        expect(scanBtn().textContent).toBe('Scan for removed comments')
    })

    it.each([
        ['it searched everyone', () => {}],
        ['all that is left is a feed it could not read', () => (pages[authorPath('author14')] = { ok: false, status: 403, blockPage: false })],
    ])('leave "Continue scan" for a thread scan of another sort when %s', async (_, setUp) => {
        const eightMonthsAgo = new Date(Date.now() - 240 * 24 * 3600 * 1000).toISOString()
        const authors = Array.from({ length: 15 }, (_, i) => `author${i}`)
        await loadThread(threadPage(30, authors.map(name => comment(`t1_${name}`, name)).join('')))
        document.querySelectorAll('[thingid]').forEach((el, i) => i && el.setAttribute('created', eightMonthsAgo))
        pages[threadPath] = feed(postEntry().replace(NOW, eightMonthsAgo))
        for (const name of ['op_user', ...authors]) {
            pages[authorPath(name)] = feed()
            pages[`/user/${name}/comments/.rss?sort=controversial&limit=100&t=year`] = feed()
        }
        setUp()
        const mock = await import('../mocks/webextension-polyfill.js')
        mock.__getSyncStorage().options = { scan_reads_per_click: 10 }
        await scanThread()
        expect(scanBtn().textContent).toBe('Continue scan')
        for (let click_ = 0; click_ < 2; click_++) {
            click(scanRev())
            await settle(() => document.querySelector('.rev-spinner'))
        }
        expect(scanBtn().textContent).toBe('Continue scan')
        expect(document.querySelector('.rev-scan-all-progress').textContent).not.toBe('')
    })

    it('end "Continue scan" after a search of its own sort, with another sort still to come', async () => {
        const authors = Array.from({ length: 15 }, (_, i) => `author${i}`)
        await loadThread(threadPage(30, authors.map(name => comment(`t1_${name}`, name)).join('')))
        const eightMonthsAgo = new Date(Date.now() - 240 * 24 * 3600 * 1000).toISOString()
        document.querySelector('[thingid="t1_author14"]').setAttribute('created', eightMonthsAgo)
        pages[threadPath] = feed(postEntry())
        for (const name of authors) pages[authorPath(name)] = feed()
        const mock = await import('../mocks/webextension-polyfill.js')
        mock.__getSyncStorage().options = { scan_reads_per_click: 10 }
        await scanThread()
        for (let click_ = 0; click_ < 2; click_++) {
            click(scanRev())
            await settle(() => document.querySelector('.rev-spinner'))
        }
        expect(scanBtn().textContent).toBe('Scan for removed comments')
        const read = asked.length
        await scanThread()
        expect(asked.length).toBe(read)
        expect(scanBtn().classList.contains('rev-scan-exhausted')).toBe(true)
        expect(scanBtn().title).toContain('other ages')
    })

    it('lose their number when a scan finishes and they stay for another sort', async () => {
        await twoAuthors()
        const eightMonthsAgo = new Date(Date.now() - 240 * 24 * 3600 * 1000).toISOString()
        document.querySelector('[thingid="t1_b"]').setAttribute('created', eightMonthsAgo)
        scanRev().querySelector('span').textContent = 'Scan-Rev (12)'
        await scanThread()
        expect(scanRev().textContent).toBe('Scan-Rev')
    })

    it('stay for a comment that needs another sort of feeds', async () => {
        await twoAuthors()
        const eightMonthsAgo = new Date(Date.now() - 240 * 24 * 3600 * 1000).toISOString()
        document.querySelector('[thingid="t1_b"]').setAttribute('created', eightMonthsAgo)
        await scanThread()
        expect(scanBtn().classList.contains('rev-scan-exhausted')).toBe(true)
        expect(scanBtn().title).not.toContain('No more removed comments')
        expect(document.querySelector('.rev-scan-comment-btn.rev-scan-exhausted')).toBeNull()
        expect(threadNote()).toMatch(/^Scan complete: .+ Scan-Rev can still search comments of other ages\.$/)
    })

    it('all go when nothing is missing any more, whatever sorts are left', async () => {
        await loadThread(threadPage(3, comment('t1_a', 'a') + comment('t1_b', 'b')))
        pages[threadPath] = feed(postEntry(), entry('t1_a', 'a', 'live words'), entry('t1_b', 'b', 'live words'))
        pages[authorPath('a')] = feed(entry('t1_a', 'a', 'live words'), entry('t1_gone', 'a', 'removed words'))
        pages[authorPath('b')] = feed(entry('t1_b', 'b', 'live words'))
        pages[commentPath('t1_gone')] = feed(postEntry())
        const eightMonthsAgo = new Date(Date.now() - 240 * 24 * 3600 * 1000).toISOString()
        document.querySelector('[thingid="t1_b"]').setAttribute('created', eightMonthsAgo)
        await scanThread()
        expect(document.querySelector('.rev-scan-comment-btn:not(.rev-scan-exhausted)')).toBeNull()
    })

    it('all go when every comment was read the same way', async () => {
        await twoAuthors()
        await scanThread()
        expect(document.querySelector('.rev-scan-comment-btn:not(.rev-scan-exhausted)')).toBeNull()
        expect(threadNote()).not.toContain('other ages')
    })

    const clickScanRev = async () => {
        click(scanRev())
        await settle(() => document.querySelector('.rev-spinner'))
    }

    it.each([
        ["a comment's own search", clickScanRev],
        ['a thread scan', () => scanThread()],
    ])('lose their number when the retries it promised fail in %s, as the next click reads nothing', async (_, retry) => {
        const authors = ['a', 'b', 'c']
        await loadThread(threadPage(9, authors.map(name => comment(`t1_${name}`, name)).join('')))
        pages[threadPath] = feed(postEntry(), ...authors.map(name => entry(`t1_${name}`, name, 'live words')))
        for (const name of authors) pages[authorPath(name)] = { ok: false, status: 500 }
        for (let click_ = 0; click_ < 3; click_++) await clickScanRev()
        expect(scanRev().textContent).toBe('Scan-Rev (3)')
        expect(scanRev().title).toContain('click to continue')

        await retry()
        expect(scanRev().textContent).toBe('Scan-Rev')
        expect(scanRev().title).toBe('Search for removed comments in this thread')

        asked.length = 0
        await clickScanRev()
        expect(asked).toEqual([])
    })
})

describe('a row reddit stamps after a thread scan', () => {
    const NOTHING_LEFT = 'No more removed comments to find'
    const live = (...names) => names.map(name => entry(`t1_${name}`, name, 'live words'))

    const stamp = async () => {
        const { injectScanButton_newReddit } = await import('../../src/src/thread-scan-ui.ts')
        document.querySelector('section').insertAdjacentHTML('beforeend', comment('t1_later', 'later'))
        const row = document.querySelector('[thingid="t1_later"] shreddit-comment-action-row')
        injectScanButton_newReddit(row)
        return row.querySelector('.rev-scan-comment-btn')
    }

    it.each([
        ['was missing nothing', 2, () => {}],
        [
            'found all that was missing',
            3,
            () => {
                pages[authorPath('a')] = feed(...live('a'), entry('t1_gone', 'a', 'removed words'))
                pages[commentPath('t1_gone')] = feed(postEntry())
            },
        ],
    ])('starts with nothing to find, after a scan that %s', async (_, count, setUp) => {
        await loadThread(threadPage(count, comment('t1_a', 'a') + comment('t1_b', 'b')))
        pages[threadPath] = feed(postEntry(), ...live('a', 'b'))
        pages[authorPath('a')] = feed(...live('a'))
        pages[authorPath('b')] = feed(...live('b'))
        setUp()
        await scanThread()
        const btn = await stamp()
        expect(btn.classList.contains('rev-scan-exhausted')).toBe(true)
        expect(btn.title).toBe(NOTHING_LEFT)
        expect(btn.textContent).toBe('Scan-Rev')

        asked.length = 0
        click(btn)
        await settle(() => document.querySelector('.rev-spinner'))
        expect(asked).toEqual([])
    })

    it('starts with nothing to find on old reddit too', async () => {
        await loadThread(oldThreadPage(2, oldComment('t1_a', 'a') + oldComment('t1_b', 'b')), false)
        pages[threadPath] = feed(postEntry(), ...live('a', 'b'))
        await scanThread()
        const { injectRestoreButton_oldReddit } = await import('../../src/src/thread-scan-ui.ts')
        document.querySelector('.nestedlisting').insertAdjacentHTML('beforeend', oldComment('t1_later', 'later'))
        const later = document.querySelector('[data-fullname="t1_later"]')
        injectRestoreButton_oldReddit(later)
        const btn = later.querySelector('.rev-scan-comment-btn')
        expect(btn.classList.contains('rev-scan-exhausted')).toBe(true)
        expect(btn.title).toBe(NOTHING_LEFT)
        expect(btn.textContent).toBe('scan-rev')
    })

    it.each([
        ['left comments missing', 9],
        ['had too many comments to count', 3000],
    ])('stays plain after a scan that %s, which may never have covered it', async (_, count) => {
        await loadThread(threadPage(count, comment('t1_a', 'a') + comment('t1_b', 'b')))
        pages[threadPath] = feed(postEntry(), ...live('a', 'b'))
        pages[authorPath('a')] = feed(...live('a'))
        pages[authorPath('b')] = feed(...live('b'))
        await scanThread()
        expect(threadNote()).toContain('Scan complete')
        const btn = await stamp()
        expect(btn.classList.contains('rev-scan-exhausted')).toBe(false)
        expect(btn.title).toBe('Search for removed comments in this thread')
    })

    it("stays plain after a comment's own search of every author", async () => {
        await loadThread(threadPage(2, comment('t1_a', 'a') + comment('t1_b', 'b')))
        pages[threadPath] = feed(postEntry(), ...live('a', 'b'))
        pages[authorPath('a')] = feed(...live('a'))
        pages[authorPath('b')] = feed(...live('b'))
        click(document.querySelector('.rev-scan-comment-btn'))
        await settle(() => document.querySelector('.rev-spinner'))
        expect(document.querySelector('.rev-scan-comment-btn').classList.contains('rev-scan-exhausted')).toBe(true)
        expect((await stamp()).classList.contains('rev-scan-exhausted')).toBe(false)
    })
})

describe('a thread scan that ends after its page was left', () => {
    const start = async () => {
        await loadThread(threadPage(9, comment('t1_a', 'a') + comment('t1_b', 'b')))
        pages[threadPath] = feed(postEntry(), entry('t1_a', 'a', 'live words'), entry('t1_b', 'b', 'live words'))
        pages[authorPath('a')] = feed(entry('t1_a', 'a', 'live words'), entry('t1_gone', 'a', 'the words'))
        pages[commentPath('t1_gone')] = feed(postEntry(), entry('t1_a', 'a', 'live words'))
    }
    // Clicks the thread scan, and leaves while it reads b's feed. Then Back.
    const leaveMidRead = async () => {
        const btn = scanBtn()
        const tree = document.querySelector('shreddit-comment-tree')
        const home = tree.parentElement
        let answered
        pages[authorPath('b')] = new Promise(resolve => (answered = resolve))
        click(btn)
        for (let i = 0; i < 20 && !asked.includes(authorPath('b')); i++) await vi.advanceTimersByTimeAsync(500)
        tree.remove()
        ui.resetScansForPage()
        answered(refused)
        await vi.advanceTimersByTimeAsync(2000)
        home.append(tree)
        ui.resetScansForPage()
        ui.initRestoreOnThread(true)
        await vi.advanceTimersByTimeAsync(0)
    }

    it('leaves its button as it was before the click, whatever another page has on it', async () => {
        await start()
        pages[authorPath('b')] = refused
        await scanThread()
        expect(scanBtn().textContent).toBe('Continue scan')
        asked.length = 0
        await leaveMidRead()
        expect(scanBtn().textContent).toBe('Continue scan')
        expect(scanBtn().disabled).toBe(false)
    })

    it('gets its filter bar on Back, for what it placed before the page was left', async () => {
        await start()
        await leaveMidRead()
        expect(revEl('t1_gone')).not.toBeNull()
        expect(document.querySelector('.rev-thread-filter-bar')).not.toBeNull()
        expect(document.querySelector('.rev-thread-filter-btn.rev-filter-active').getAttribute('data-filter')).toBe('all')
    })
})

describe("a feed that couldn't be read", () => {
    it('leaves the buttons, with no word of everything being searched, and a later click reads it', async () => {
        await loadThread(threadPage(4, comment('t1_a', 'a') + comment('t1_b', 'b')))
        const button = document.querySelector('.rev-scan-comment-btn')
        pages[threadPath] = feed(postEntry(), entry('t1_a', 'a', 'live words'), entry('t1_b', 'b', 'live words'))
        pages[authorPath('a')] = feed(entry('t1_a', 'a', 'live words'))
        pages[authorPath('b')] = refused
        await scanThread()
        await scanThread()
        expect(threadNote()).toContain("1 feed(s) couldn't be read. Click again to try them.")
        expect(scanBtn().disabled).toBe(false)
        expect(scanBtn().title).not.toContain('No more removed comments')
        expect(button.classList.contains('rev-scan-exhausted')).toBe(false)

        pages[authorPath('b')] = feed(entry('t1_b', 'b', 'live words'), entry('t1_gone', 'b', 'words'))
        pages[commentPath('t1_gone')] = feed(postEntry(), entry('t1_a', 'a', 'live words'))
        await scanThread()
        expect(revEl('t1_gone')?.textContent).toContain('words')
    })
})

describe('the thread filter', () => {
    const hidden = el => el.style.display === 'none'

    it('shows what Place unattached moves under a comment it had hidden', async () => {
        await loadThread(threadPage(4, comment('t1_a', 'a') + comment('t1_b', 'b')))
        pages[threadPath] = feed(postEntry(), entry('t1_a', 'a', 'live words'), entry('t1_b', 'b', 'live words'), entry('t1_parent', 'p', 'live words'))
        pages[authorPath('a')] = feed(entry('t1_a', 'a', 'live words'), entry('t1_gone1', 'a', 'first words'))
        pages[authorPath('b')] = feed(entry('t1_b', 'b', 'live words'))
        pages[authorPath('p')] = feed(entry('t1_parent', 'p', 'live words'))
        orphanAndParent()
        await scanThread()
        const top = document.querySelector('[thingid="t1_a"]')
        expect(hidden(top)).toBe(true)
        await place()
        expect(top.contains(revEl('t1_gone1'))).toBe(true)
        expect(hidden(top)).toBe(false)
    })
})

describe('the thread filter, set to removed', () => {
    const filterOn = () => {
        scanBtn().insertAdjacentHTML(
            'afterend',
            '<div class="rev-thread-filter-bar"><button class="rev-thread-filter-btn rev-filter-active" data-filter="removed"></button></div>',
        )
        const top = document.querySelector('[thingid="t1_a"]')
        top.style.display = 'none'
        top.setAttribute('data-rev-filter-hidden', '1')
        return top
    }
    const gone = entry('t1_gone1', 'a', 'first words')

    beforeEach(() => {
        pages[threadPath] = feed(postEntry(), entry('t1_a', 'a', 'live words'), entry('t1_tomb', null, '[deleted]'))
        pages[authorPath('a')] = feed(entry('t1_a', 'a', 'live words'), gone)
        pages[commentPath('t1_gone1')] = feed(postEntry(), entry('t1_a', 'a', 'live words'))
    })

    it('shows what a restore click found under a comment it had hidden, though it missed its own', async () => {
        await loadThread(threadPage(4, comment('t1_a', 'a') + tombstone('t1_tomb')))
        const top = filterOn()
        click(document.querySelector('.rev-restore-btn'))
        await settle(() => document.querySelector('.rev-spinner'))
        expect(top.contains(revEl('t1_gone1'))).toBe(true)
        expect(top.style.display).toBe('')
    })

    it('shows what a scan found under a comment it had hidden, with the automatic switch off', async () => {
        chrome.storage.sync.set({ options: { auto_filter_removed_threads: false } })
        await loadThread(threadPage(4, comment('t1_a', 'a') + tombstone('t1_tomb')))
        const top = filterOn()
        await scanThread()
        expect(top.contains(revEl('t1_gone1'))).toBe(true)
        expect(top.style.display).toBe('')
    })
})

describe('the thread filter, set to removed, on a click that placed nothing', () => {
    const opened = () => document.querySelector('[data-fullname="t1_a"]').classList.contains('collapsed') === false

    beforeEach(async () => {
        await loadThread(oldThreadPage(3, oldComment('t1_a', 'a') + oldComment('t1_b', 'b')), false)
        pages[threadPath] = feed(postEntry(), entry('t1_a', 'a', 'live words'), entry('t1_b', 'b', 'live words'))
        pages[authorPath('a')] = feed(entry('t1_a', 'a', 'live words'))
        pages[authorPath('b')] = refused
    })
    const filterOn = () =>
        scanBtn().insertAdjacentHTML(
            'afterend',
            '<div class="rev-thread-filter-bar"><button class="rev-thread-filter-btn rev-filter-active" data-filter="removed"></button></div>',
        )

    it('leaves alone what the viewer opened: a scan', async () => {
        filterOn()
        await scanThread()
        expect(opened()).toBe(true)
    })

    it("leaves alone what the viewer opened: a comment's own scan", async () => {
        filterOn()
        click(document.querySelector('.rev-scan-comment-btn'))
        await settle(() => document.querySelector('.rev-spinner'))
        expect(document.querySelector('.rev-restore-progress')).not.toBeNull()
        expect(opened()).toBe(true)
    })

    it('leaves alone what the viewer opened: Place unattached that only parks a parent', async () => {
        pages[authorPath('a')] = feed(entry('t1_a', 'a', 'live words'), entry('t1_gone1', 'a', 'first words'))
        pages[authorPath('b')] = feed(entry('t1_b', 'b', 'live words'))
        pages[commentPath('t1_gone1')] = feed(postEntry(), entry('t1_parent', 'p', 'live words'))
        pages[commentPath('t1_parent')] = feed(postEntry(), entry('t1_up', 'u', 'live words'), entry('t1_parent', 'p', 'live words'))
        pages[commentPath('t1_up')] = { ok: false, status: 500 }
        await scanThread()
        document.querySelector('[data-fullname="t1_a"]').classList.remove('collapsed')
        await place()
        expect(placeNote()).toContain('left to read')
        expect(opened()).toBe(true)
    })

    it('leaves alone what the viewer opened: Place unattached', async () => {
        pages[authorPath('a')] = feed(entry('t1_a', 'a', 'live words'), entry('t1_gone1', 'a', 'first words'))
        pages[authorPath('b')] = feed(entry('t1_b', 'b', 'live words'))
        pages[commentPath('t1_gone1')] = feed(postEntry(), entry('t1_parent', 'p', 'live words'))
        pages[commentPath('t1_parent')] = { ok: false, status: 500 }
        await scanThread()
        document.querySelector('[data-fullname="t1_a"]').classList.remove('collapsed')
        await place()
        expect(opened()).toBe(true)
    })
})

describe('the thread filter, not set to removed', () => {
    it('stays as it is after a scan, with the automatic switch off', async () => {
        chrome.storage.sync.set({ options: { auto_filter_removed_threads: false } })
        await loadThread(threadPage(4, comment('t1_a', 'a') + comment('t1_b', 'b') + tombstone('t1_tomb')))
        pages[threadPath] = feed(postEntry(), entry('t1_a', 'a', 'live words'), entry('t1_b', 'b', 'live words'), entry('t1_tomb', null, '[deleted]'))
        pages[authorPath('a')] = feed(entry('t1_a', 'a', 'live words'), entry('t1_tomb', 'a', 'the words'))
        pages[authorPath('b')] = feed(entry('t1_b', 'b', 'live words'))
        await scanThread()
        expect(document.querySelector('.rev-thread-filter-btn.rev-filter-active').getAttribute('data-filter')).toBe('all')
        expect(document.querySelector('[thingid="t1_b"]').style.display).not.toBe('none')
    })
})

describe('a comment placed under a tombstone reddit left collapsed', () => {
    it('opens it, and what encloses it', async () => {
        const closed = tombstone('t1_tomb', 't1_up')
        await loadThread(threadPage(5, tombstone('t1_up', '', closed) + comment('t1_a', 'a')))
        pages[threadPath] = feed(postEntry(), entry('t1_a', 'a', 'live words'), entry('t1_up', null, '[deleted]'), entry('t1_tomb', null, '[deleted]'))
        pages[authorPath('a')] = feed(entry('t1_a', 'a', 'live words'), entry('t1_leaf', 'a', 'the words'))
        pages[commentPath('t1_leaf')] = feed(postEntry(), entry('t1_tomb', null, '[deleted]'))
        await scanThread()
        expect(document.querySelector('[thingid="t1_tomb"]').contains(revEl('t1_leaf'))).toBe(true)
        for (const id of ['t1_tomb', 't1_up']) {
            expect(document.querySelector(`[thingid="${id}"] > details`).hasAttribute('open')).toBe(true)
        }
    })
})

describe('a comment recovered inside what reddit left collapsed', () => {
    it('opens all around it when the comment is a tombstone itself', async () => {
        const inner = tombstone('t1_inner', 't1_up')
        await loadThread(threadPage(4, tombstone('t1_up', '', inner) + comment('t1_a', 'a')))
        pages[threadPath] = feed(postEntry(), entry('t1_a', 'a', 'live words'), entry('t1_up', null, '[deleted]'), entry('t1_inner', null, '[deleted]'))
        pages[authorPath('a')] = feed(entry('t1_a', 'a', 'live words'), entry('t1_inner', 'a', 'the words'))
        await scanThread()
        expect(revEl('t1_inner')).not.toBeNull()
        for (const id of ['t1_inner', 't1_up']) {
            expect(document.querySelector(`[thingid="${id}"] > details`).hasAttribute('open')).toBe(true)
        }
    })

    it('reopens what the viewer closed, when a reply goes under a comment already placed', async () => {
        await loadThread(threadPage(5, tombstone('t1_tomb') + comment('t1_a', 'a') + comment('t1_b', 'b')))
        pages[threadPath] = feed(postEntry(), entry('t1_a', 'a', 'live words'), entry('t1_b', 'b', 'live words'), entry('t1_tomb', null, '[deleted]'))
        pages[authorPath('a')] = feed(entry('t1_a', 'a', 'live words'), entry('t1_x', 'a', 'first'))
        pages[authorPath('b')] = refused
        pages[commentPath('t1_x')] = feed(postEntry(), entry('t1_tomb', null, '[deleted]'))
        await scanThread()
        const tomb = document.querySelector('[thingid="t1_tomb"] > details')
        tomb.removeAttribute('open')

        pages[authorPath('b')] = feed(entry('t1_b', 'b', 'live words'), entry('t1_y', 'b', 'second'))
        pages[commentPath('t1_y')] = feed(postEntry(), entry('t1_x', 'a', 'first'))
        await scanThread()
        expect(revEl('t1_x').contains(revEl('t1_y'))).toBe(true)
        expect(tomb.hasAttribute('open')).toBe(true)
    })

    it('old reddit: expands a collapsed comment it goes under, and what encloses that', async () => {
        const collapsed = oldComment('t1_low', 'low', '', 'collapsed')
        await loadThread(oldThreadPage(4, oldComment('t1_top', 'top', collapsed, 'collapsed')), false)
        pages[threadPath] = feed(postEntry(), entry('t1_top', 'top', 'live words'), entry('t1_low', 'low', 'live words'))
        pages[authorPath('low')] = feed(entry('t1_low', 'low', 'live words'), entry('t1_leaf', 'low', 'the words'))
        pages[authorPath('top')] = feed(entry('t1_top', 'top', 'live words'))
        pages[commentPath('t1_leaf')] = feed(postEntry(), entry('t1_low', 'low', 'live words'))
        chrome.storage.sync.set({ options: { auto_filter_removed_threads: false } })
        await scanThread()
        for (const id of ['t1_low', 't1_top']) {
            expect(document.querySelector(`[data-fullname="${id}"]`).classList.contains('collapsed')).toBe(false)
        }
    })
})

describe("the time a page's count is kept from", () => {
    const seen = () => document.querySelector('shreddit-post').getAttribute('data-rev-seen')

    it("is the document's for the page the script started on, which may be older than the script", async () => {
        const started = Math.floor(Date.now() / 1000)
        await vi.advanceTimersByTimeAsync(3600 * 1000)
        await loadThread(threadPage(1, comment('t1_a', 'a')))
        expect(Number(seen())).toBe(started)
    })

    it('is when a later page arrives, and stays through Back', async () => {
        await loadThread(threadPage(1, comment('t1_a', 'a')))
        ui.resetScansForPage()
        await vi.advanceTimersByTimeAsync(3600 * 1000)
        ui.resetScansForPage()
        document.querySelector('shreddit-post').removeAttribute('data-rev-seen')
        ui.initRestoreOnThread(true)
        const arrived = seen()
        expect(Number(arrived)).toBe(Math.floor(Date.now() / 1000))
        await vi.advanceTimersByTimeAsync(60000)
        ui.initRestoreOnThread(true)
        expect(seen()).toBe(arrived)
    })

    it('is kept by old reddit too', async () => {
        await loadThread(oldThreadPage(1, oldComment('t1_a', 'a')), false)
        expect(document.querySelector('.thing.link').hasAttribute('data-rev-seen')).toBe(true)
    })
})

describe('a comment posted since the count, recovered on an earlier click', () => {
    const later = new Date(Date.now() + 3600 * 1000).toISOString()

    it('stands in for nothing the count has missing, on either reddit', async () => {
        for (const isNewReddit of [true, false]) {
            const live = isNewReddit ? comment : oldComment
            await loadThread((isNewReddit ? threadPage : oldThreadPage)(3, live('t1_a', 'a') + live('t1_b', 'b')), isNewReddit)
            pages[threadPath] = feed(postEntry(), entry('t1_a', 'a', 'live words'), entry('t1_b', 'b', 'live words'))
            pages[authorPath('a')] = feed(entry('t1_a', 'a', 'live words'), entry('t1_late', 'a', 'since').replace(NOW, later))
            pages[commentPath('t1_late')] = feed(postEntry(), entry('t1_a', 'a', 'live words'))
            pages[authorPath('b')] = { ok: false, status: 500 }
            await scanThread()
            expect(revEl('t1_late')).not.toBeNull()

            pages[authorPath('b')] = feed(entry('t1_b', 'b', 'live words'), entry('t1_leaf', 'b', 'the words'))
            pages[commentPath('t1_leaf')] = feed(postEntry(), entry('t1_b', 'b', 'live words'))
            await scanThread()
            expect(revEl('t1_leaf')).not.toBeNull()
        }
    })
})

describe('the profile scan', () => {
    const query = 'sort=new&limit=100'
    const profilePage =
        `<html><body><div class="content" role="main"><div id="siteTable">` +
        `<div class="thing" data-fullname="t1_live"><time datetime="${NOW}"></time></div></div></div></body></html>`
    const profileBtn = () => document.querySelector('.rev-profile-scan-btn')
    const progress = () => document.querySelector('.rev-profile-scan-progress').textContent
    const scanProfile = async () => {
        click(profileBtn())
        await settle(() => profileBtn().disabled)
    }

    beforeEach(() => {
        pages[`/user/someone/comments/.rss?${query}`] = feed(entry('t1_live', 'someone', 'live'), entry('t1_gone', 'someone', 'removed words'))
        pages[`/user/someone/submitted/.rss?${query}`] = feed()
        pages[`/user/someone/comments.json?${query}`] = listing({ data: { name: 't1_live' } })
        pages[`/user/someone/submitted.json?${query}`] = listing()
        pages[commentPath('t1_gone')] = feed(postEntry())
    })

    it("places a later click's item among the page's own rows, whatever an earlier click inserted", async () => {
        const secondsAgo = seconds => new Date(Date.now() - seconds * 1000).toISOString()
        const row = (id, seconds) =>
            `<div class="thing" data-fullname="${id}"><time datetime="${secondsAgo(seconds)}"></time></div>`
        await loadProfile(
            `<html><body><div class="content" role="main"><div id="siteTable">${row('t1_a', 100)}` +
                `<div class="thing rev-inserted-comment" data-fullname="t1_x"></div>${row('t1_b', 300)}` +
                `</div></div></body></html>`,
        )
        pages[`/user/someone/comments/.rss?${query}`] = feed(
            entry('t1_a', 'someone', 'live'),
            entry('t1_y', 'someone', 'the removed text').replace(NOW, secondsAgo(200)),
            entry('t1_b', 'someone', 'live'),
        )
        pages[`/user/someone/comments.json?${query}`] = listing({ data: { name: 't1_a' } }, { data: { name: 't1_b' } })
        pages[commentPath('t1_y')] = feed(postEntry())
        await scanProfile()
        const rows = Array.from(document.querySelectorAll('#siteTable > [data-fullname]'))
        expect(rows.map(el => el.getAttribute('data-fullname'))).toEqual(['t1_a', 't1_x', 't1_y', 't1_b'])
    })

    it('keeps the order of items older than the last row, across clicks', async () => {
        const secondsAgo = seconds => new Date(Date.now() - seconds * 1000).toISOString()
        const row = (id, seconds) =>
            `<div class="thing" data-fullname="${id}"><time datetime="${secondsAgo(seconds)}"></time></div>`
        await loadProfile(
            `<html><body><div class="content" role="main"><div id="siteTable">${row('t1_a', 100)}${row('t1_b', 200)}` +
                `<div class="thing rev-inserted-comment" data-fullname="t1_x"></div></div></div></body></html>`,
        )
        pages[`/user/someone/comments/.rss?${query}`] = feed(
            entry('t1_a', 'someone', 'live'),
            entry('t1_b', 'someone', 'live'),
            entry('t1_y', 'someone', 'the removed text').replace(NOW, secondsAgo(300)),
            entry('t1_z', 'someone', 'the removed text').replace(NOW, secondsAgo(400)),
        )
        pages[`/user/someone/comments.json?${query}`] = listing({ data: { name: 't1_a' } }, { data: { name: 't1_b' } })
        pages[commentPath('t1_y')] = pages[commentPath('t1_z')] = feed(postEntry())
        await scanProfile()
        const rows = Array.from(document.querySelectorAll('#siteTable > [data-fullname]'))
        expect(rows.map(el => el.getAttribute('data-fullname'))).toEqual(['t1_a', 't1_b', 't1_x', 't1_y', 't1_z'])
    })

    it('keeps its reads and what it finished through Back', async () => {
        const ids = Array.from({ length: 30 }, (_, i) => `t1_off${i}`)
        pages[`/user/someone/comments/.rss?${query}`] = feed(...ids.map(id => entry(id, 'someone', 'the text')))
        for (const id of ids) pages[commentPath(id)] = feed(postEntry())
        await loadProfile(profilePage)
        const mock = await import('../mocks/webextension-polyfill.js')
        mock.__getSyncStorage().options = { scan_reads_per_click: 20 }
        await scanProfile()
        expect(progress()).toContain('scan again to go on')
        const read = [...asked]

        ui.resetScansForPage()
        ui.initProfileScan('someone', false)
        await vi.advanceTimersByTimeAsync(0)
        asked.length = 0
        await scanProfile()
        expect(asked.filter(path => read.includes(path))).toEqual([])
    })

    it('leaves the text of a row an earlier click inserted as it is', async () => {
        await loadProfile(
            `<html device="desktop"><body><div class="content" role="main"></div>` +
                `<article data-post-id="t1_gone" class="rev-inserted-comment"><p>the removed text</p></article>` +
                `</body></html>`,
        )
        await scanProfile()
        expect(document.querySelector('.rev-restored-inline')).toBeNull()
    })

    it("keeps a new page's rescan its own, whatever a scan of the last page does as it ends", async () => {
        await loadProfile(profilePage)
        let answered
        pages[`/user/someone/comments/.rss?${query}`] = new Promise(resolve => (answered = resolve))
        click(profileBtn())
        await vi.advanceTimersByTimeAsync(1000)
        document.querySelector('.rev-profile-scan-container').remove()
        ui.resetScansForPage()
        pages[`/user/someone/comments/.rss?${query}`] = feed(entry('t1_live', 'someone', 'live'))
        ui.initProfileScan('someone', false)
        await vi.advanceTimersByTimeAsync(0)
        await scanProfile()
        answered({ ok: false, status: 500 })
        await vi.advanceTimersByTimeAsync(2000)
        asked.length = 0
        await scanProfile()
        expect(asked).toContain(`/user/someone/comments/.rss?${query}`)
    })

    it('gives the button back if it breaks, and says it stopped', async () => {
        await loadProfile(profilePage)
        globalThis.window = {}
        await scanProfile()
        expect(progress()).toBe('The scan stopped unexpectedly. Try again.')
        expect(profileBtn().textContent).toBe('Rescan')
    })

    it('can be cancelled, and leaves only its last word', async () => {
        await loadProfile(profilePage)
        let answered
        pages[`/user/someone/comments/.rss?${query}`] = new Promise(resolve => (answered = resolve))
        click(profileBtn())
        await vi.advanceTimersByTimeAsync(0)
        click(document.querySelector('.rev-profile-scan-progress .rev-restore-cancel'))
        answered({ ok: false, status: 500 })
        await settle(() => profileBtn().disabled)
        expect(progress()).toBe('Scan cancelled.')
        click(profileBtn())
        await settle(() => profileBtn().disabled)
        expect(progress()).not.toContain('Scan cancelled.')
    })

    it('reads again on a rescan once it has read all it could, though it left a note', async () => {
        await loadProfile(profilePage)
        const healed = pages[commentPath('t1_gone')]
        pages[commentPath('t1_gone')] = { ok: false, status: 500 }
        await scanProfile()
        await scanProfile()
        expect(progress()).toContain("1 comment(s) couldn't be checked.")

        pages[commentPath('t1_gone')] = healed
        asked.length = 0
        await scanProfile()
        expect(asked).toContain(commentPath('t1_gone'))
        expect(progress()).toContain('Found 1 removed item(s).')
    })

    it("doesn't tell someone scanning another person's profile about their own view", async () => {
        await loadProfile(profilePage)
        await scanProfile()
        expect(document.querySelector('.rev-scan-note')).toBeNull()
        expect(document.querySelector('.rev-scan-item-link').title).toBe('')
    })

    it('tells them when the scan finds it is theirs, though the stored name was out of date', async () => {
        chrome.storage.local.set({ last_logged_in_user: 'an_old_name' })
        pages[`/user/someone/comments.json?${query}`] = listing({ data: { name: 't1_live' } }, { data: { name: 't1_gone' } })
        pages[`/user/someone/submitted/.rss?${query}`] = feed(postEntry('t3_gone', 'someone', 'a post'))
        pages[`/user/someone/submitted.json?${query}`] = listing({ data: { name: 't3_gone', removed_by_category: 'moderator' } })
        pages['/api/me.json'] = JSON.stringify({ data: { name: 'someone' } })
        await loadProfile(profilePage)
        await scanProfile()
        expect(document.querySelector('.rev-scan-note')?.textContent).toContain('your own removed content')
    })

    it("reads each tab from the page's place in the list, when the page's anchor is the other tab's", async () => {
        const list = `${query}&after=`
        const above = '/user/someone/comments/.rss?sort=new&limit=1&before=t1_first'
        pages[above] = feed(entry('t1_above', 'someone', 'words'))
        pages[`/user/someone/comments/.rss?${list}t1_above`] = feed()
        pages[`/user/someone/comments.json?${list}t1_above`] = listing()
        pages[`/user/someone/submitted/.rss?${list}t3_anchor`] = feed()
        pages[`/user/someone/submitted.json?${list}t3_anchor`] = listing()
        await loadProfile(
            profilePage.replace('t1_live', 't1_first'),
            'someone',
            '/user/someone/?count=25&after=t3_anchor',
        )
        await scanProfile()
        expect(asked.slice(0, 5)).toEqual([
            above,
            `/user/someone/comments/.rss?${list}t1_above`,
            `/user/someone/comments.json?${list}t1_above`,
            `/user/someone/submitted/.rss?${list}t3_anchor`,
            `/user/someone/submitted.json?${list}t3_anchor`,
        ])
    })

    it('does tell them on their own profile', async () => {
        chrome.storage.local.set({ last_logged_in_user: 'someone' })
        chrome.storage.sync.set({ options: { show_scan_on_own_profile: true } })
        await loadProfile(profilePage)
        await scanProfile()
        expect(document.querySelector('.rev-scan-note')?.textContent).toContain('your own removed content')
        expect(document.querySelector('.rev-scan-item-link').title).toContain('Shows your own view')
    })
})

// What fills a removed comment reddit left a tombstone for, on old reddit
describe('an old reddit tombstone', () => {
    const tomb = (id, state = 'deleted') =>
        `<div class="thing comment ${state}" data-author="" data-permalink="/r/sub/comments/post/a_title/${id.slice(3)}/">` +
        `<div class="entry"><p class="tagline"><a class="author">[deleted]</a><time datetime="${NOW}"></time></p>` +
        `<div class="usertext-body"><div class="md"><p>[removed]</p></div></div><ul class="buttons"></ul></div>` +
        `<div class="child"></div></div>`
    const tombEl = () => document.querySelector('[data-permalink$="/tomb/"]')
    const seed = () => {
        pages[threadPath] = feed(postEntry(), entry('t1_a', 'a', 'live words'), entry('t1_tomb', null, '[deleted]'))
        pages[authorPath('a')] = feed(entry('t1_a', 'a', 'live words'), entry('t1_tomb', 'a', 'the words'))
    }

    it('is filled in place by a thread scan', async () => {
        await loadThread(oldThreadPage(4, oldComment('t1_a', 'a') + tomb('t1_tomb')), false)
        seed()
        await scanThread()
        const el = tombEl()
        expect(document.querySelectorAll('[data-rev-id="t1_tomb"]')).toHaveLength(1)
        expect(revEl('t1_tomb')).toBe(el)
        expect(el.classList.contains('deleted')).toBe(false)
        expect(el.classList.contains('rev-inserted-comment')).toBe(false)
        expect(el.classList.contains('rev-removed-highlight')).toBe(false)
        expect(el.querySelector(':scope > .entry').classList.contains('rev-removed-highlight')).toBe(true)
        expect(el.querySelector('.usertext-body .md').textContent).toContain('the words')
        const author = el.querySelector('.tagline .author')
        expect(author.localName).toBe('a')
        expect(author.getAttribute('href')).toBe('/user/a')
        expect(author.textContent).toBe('a')
        expect(el.parentElement.classList.contains('nestedlisting')).toBe(true)
    })

    it('is opened if reddit left it collapsed, and the thread filter counts it as removed', async () => {
        await loadThread(oldThreadPage(4, oldComment('t1_a', 'a') + tomb('t1_tomb', 'deleted collapsed')), false)
        seed()
        await scanThread()
        const el = tombEl()
        expect(el.classList.contains('collapsed')).toBe(false)
        expect(el.classList.contains('noncollapsed')).toBe(true)
        const a = document.querySelector('[data-fullname="t1_a"]')
        expect(a.classList.contains('collapsed')).toBe(true)
        expect(a.getAttribute('data-rev-filter-collapsed')).toBe('1')
    })

    it("is filled by its own scan, which adds who restored it", async () => {
        await loadThread(oldThreadPage(4, oldComment('t1_a', 'a') + tomb('t1_tomb')), false)
        seed()
        chrome.storage.sync.set({ options: { auto_filter_removed_threads: false } })
        click(tombEl().querySelector('.rev-scan-comment-btn'))
        await settle(() => document.querySelector('.rev-spinner'))
        const el = tombEl()
        expect(revEl('t1_tomb')).toBe(el)
        expect(el.classList.contains('deleted')).toBe(false)
        expect(el.querySelector(':scope > .entry').classList.contains('rev-removed-highlight')).toBe(true)
        expect(el.querySelector('.usertext-body .md').textContent).toContain('the words')
        expect(el.querySelector('.tagline a.author').getAttribute('href')).toBe('/user/a')
        expect(el.querySelector(':scope > .entry > .rev-restore-attribution').textContent).toBe('Restored by Reveddit')
        expect(document.querySelector('.rev-restore-progress')).toBeNull()
    })
})

describe('the profile scan, on the rows of a profile', () => {
    const query = 'sort=new&limit=100'
    const secondsAgo = seconds => new Date(Date.now() - seconds * 1000).toISOString()
    const profileBtn = () => document.querySelector('.rev-profile-scan-btn')
    const scanProfile = async () => {
        click(profileBtn())
        await settle(() => profileBtn().disabled)
    }
    const feeds = (...gone) => {
        pages[`/user/someone/comments/.rss?${query}`] = feed(
            entry('t1_live', 'someone', 'live'),
            ...gone.map(([id, seconds]) => entry(id, 'someone', 'the removed text').replace(NOW, secondsAgo(seconds))),
        )
        pages[`/user/someone/submitted/.rss?${query}`] = feed()
        pages[`/user/someone/comments.json?${query}`] = listing({ data: { name: 't1_live' } })
        pages[`/user/someone/submitted.json?${query}`] = listing()
        for (const [id] of gone) pages[commentPath(id)] = feed(postEntry())
    }

    describe('on old reddit', () => {
        const row = (id, seconds, inner = '') =>
            `<div class="thing" data-fullname="${id}"><div class="entry"><p class="tagline"><time datetime="${secondsAgo(seconds)}"></time></p>` +
            `<div class="usertext-body"><div class="md"><p>[removed]</p></div></div></div>${inner}</div>`
        const page = rows =>
            `<html><body><div class="content" role="main"><div id="siteTable">${rows}</div></div></body></html>`

        it('highlights a removed row, shows its text and badges it once', async () => {
            feeds(['t1_gone', 200])
            await loadProfile(page(row('t1_live', 100) + row('t1_gone', 200)))
            await scanProfile()
            const gone = document.querySelector('[data-fullname="t1_gone"]')
            expect(gone.classList.contains('rev-removed-highlight')).toBe(true)
            expect(gone.querySelector('.usertext-body .md').textContent).toContain('the removed text')
            expect(gone.querySelectorAll('.tagline .rev-scan-badge-removed')).toHaveLength(1)
            expect(gone.querySelector('.tagline .rev-inline-badge').textContent).toBe('removed')
            const live = document.querySelector('[data-fullname="t1_live"]')
            expect(live.classList.contains('rev-removed-highlight')).toBe(false)
            expect(live.querySelector('.md').textContent).toBe('[removed]')
            expect(document.querySelectorAll('.rev-inserted-comment')).toHaveLength(0)

            await scanProfile()
            expect(gone.querySelectorAll('.tagline .rev-inline-badge')).toHaveLength(1)
        })

        it('puts back the row by its tagline when the row has no .entry of its own', async () => {
            feeds(['t1_gone', 200])
            await loadProfile(
                page(
                    '<div class="thing" data-fullname="t1_gone"><div class="usertext-body"><div class="md"><p>[removed]</p></div></div>' +
                        `<p class="tagline"></p><time datetime="${secondsAgo(200)}"></time></div>`,
                ),
            )
            await scanProfile()
            const gone = document.querySelector('[data-fullname="t1_gone"]')
            expect(gone.querySelector('.md').textContent).toContain('the removed text')
            expect(gone.querySelectorAll('.tagline .rev-inline-badge')).toHaveLength(1)
        })

        it('leaves a row an earlier click inserted as it is', async () => {
            feeds(['t1_gone', 200])
            await loadProfile(page(row('t1_live', 100)))
            await scanProfile()
            const inserted = document.querySelector('[data-rev-id="t1_gone"]')
            expect(inserted.classList.contains('thing')).toBe(true)
            const text = inserted.textContent
            await scanProfile()
            expect(document.querySelectorAll('[data-rev-id="t1_gone"]')).toHaveLength(1)
            expect(inserted.textContent).toBe(text)
        })

        it('inserts a row older than the page by date, with the item as old reddit builds it', async () => {
            feeds(['t1_mid', 200], ['t1_old', 900])
            await loadProfile(page(row('t1_live', 100) + row('t1_late', 300)))
            await scanProfile()
            const rows = Array.from(document.querySelectorAll('#siteTable > [data-fullname]'))
            expect(rows.map(el => el.getAttribute('data-fullname'))).toEqual(['t1_live', 't1_mid', 't1_late', 't1_old'])
            const mid = rows[1]
            expect(mid.localName).toBe('div')
            expect(mid.className).toBe('rev-inserted-comment rev-removed-highlight thing')
            expect(mid.getAttribute('data-rev-id')).toBe('t1_mid')
            expect(mid.querySelector('.rev-scan-item-body').textContent.trim()).toBe('the removed text')
            expect(mid.querySelector('.rev-scan-item-link').getAttribute('href')).toMatch(/^https:\/\/www\.reddit\.com\/.*\?context=3$/)
        })
    })

    describe('on new reddit', () => {
        const row = (id, seconds, inner = '<div id="feed-post-credit-bar-1"></div>') =>
            `<article data-post-id="${id}"><shreddit-post created-timestamp="${secondsAgo(seconds)}">${inner}</shreddit-post></article>`
        const page = rows =>
            `<html device="desktop"><body><shreddit-feed>${rows}</shreddit-feed></body></html>`
        const load_ = (rows, path) => loadProfile(page(rows), 'someone', path, true)

        it('highlights a removed row, badges its credit bar and shows its text once', async () => {
            feeds(['t1_gone', 200])
            await load_(row('t1_live', 100) + row('t1_gone', 200))
            await scanProfile()
            const gone = document.querySelector('article[data-post-id="t1_gone"]')
            expect(gone.classList.contains('rev-removed-highlight')).toBe(true)
            expect(gone.querySelectorAll('#feed-post-credit-bar-1 .rev-inline-badge')).toHaveLength(1)
            expect(gone.querySelector('shreddit-post > .rev-restored-inline').textContent.trim()).toBe('the removed text')
            const live = document.querySelector('article[data-post-id="t1_live"]')
            expect(live.classList.contains('rev-removed-highlight')).toBe(false)
            expect(live.querySelector('.rev-restored-inline')).toBeNull()
            expect(document.querySelectorAll('.rev-inserted-comment')).toHaveLength(0)

            await scanProfile()
            expect(gone.querySelectorAll('.rev-inline-badge')).toHaveLength(1)
            expect(gone.querySelectorAll('.rev-restored-inline')).toHaveLength(1)
        })

        it('badges the post itself when its credit bar is not on the page', async () => {
            feeds(['t1_gone', 200])
            await load_(row('t1_live', 100) + row('t1_gone', 200, ''))
            await scanProfile()
            const post = document.querySelector('article[data-post-id="t1_gone"] shreddit-post')
            expect(post.querySelectorAll(':scope > .rev-inline-badge')).toHaveLength(1)
            expect(post.querySelector(':scope > .rev-restored-inline').textContent.trim()).toBe('the removed text')
        })

        it('inserts a row among the page by date, as an article', async () => {
            feeds(['t1_mid', 200], ['t1_old', 900])
            await load_(row('t1_live', 100) + row('t1_late', 300))
            await scanProfile()
            const rows = Array.from(document.querySelectorAll('shreddit-feed > article'))
            expect(rows.map(el => el.getAttribute('data-post-id'))).toEqual(['t1_live', 't1_mid', 't1_late', 't1_old'])
            const mid = rows[1]
            expect(mid.className).toBe('rev-inserted-comment rev-removed-highlight')
            expect(mid.getAttribute('data-rev-id')).toBe('t1_mid')
            expect(mid.hasAttribute('data-fullname')).toBe(false)
            expect(mid.querySelector('.rev-scan-item-body').textContent.trim()).toBe('the removed text')
        })

        it("doesn't count what an earlier click inserted among the rows it places by", async () => {
            feeds(['t1_a', 200])
            await load_(row('t1_live', 100) + row('t1_late', 300))
            await scanProfile()
            feeds(['t1_a', 200], ['t1_b', 400])
            await scanProfile()
            const rows = Array.from(document.querySelectorAll('shreddit-feed > article'))
            expect(rows.map(el => el.getAttribute('data-post-id'))).toEqual(['t1_live', 't1_a', 't1_late', 't1_b'])
        })
    })

    describe('on a listing it cannot place an item in', () => {
        const page = '<html><body><div class="content" role="main"><div id="siteTable"></div></div></body></html>'

        it('lists a removed comment with its thread title and links', async () => {
            feeds(['t1_gone', 200])
            await loadProfile(page)
            await scanProfile()
            const item = document.querySelector('.rev-profile-scan-results .rev-scan-item')
            expect(item.className).toBe('rev-scan-item rev-removed-highlight')
            expect(item.querySelector('.rev-scan-item-title').getAttribute('href')).toMatch(/^https:\/\/old\.reddit\.com\//)
            expect(item.querySelector('.rev-scan-item-title').textContent).toBe('A title')
            expect(item.querySelector('.rev-scan-item-title').rel).toBe('noreferrer')
            expect(item.querySelector('.rev-scan-item-meta').textContent).toMatch(/^r\/sub . .+ removed$/)
            expect(item.querySelector('.rev-scan-item-meta .rev-scan-badge-removed').textContent).toBe('removed')
            expect(item.querySelector('.rev-scan-item-body').textContent.trim()).toBe('the removed text')
            const links = item.querySelector('.rev-scan-item-links')
            expect(links.children).toHaveLength(1)
            const link = links.firstElementChild
            expect(link.textContent).toBe('context')
            expect(link.getAttribute('href')).toMatch(/^https:\/\/old\.reddit\.com\/.*\?context=3$/)
            expect(link.getAttribute('target')).toBe('_blank')
            expect(link.rel).toBe('noreferrer')
            expect(document.querySelector('.rev-scan-header').textContent).toBe('1 removed item(s) from other pages:')
        })

        it("lists a removed post by its own title, and marks the link on the viewer's own profile", async () => {
            chrome.storage.local.set({ last_logged_in_user: 'someone' })
            chrome.storage.sync.set({ options: { show_scan_on_own_profile: true } })
            feeds()
            pages[`/user/someone/submitted/.rss?${query}`] = feed(postEntry('t3_gone', 'someone', 'a post'))
            pages[`/user/someone/submitted.json?${query}`] = listing({ data: { name: 't3_gone', removed_by_category: 'moderator' } })
            await loadProfile(page)
            await scanProfile()
            const item = document.querySelector('.rev-profile-scan-results .rev-scan-item')
            expect(item.querySelector('.rev-scan-item-title')).not.toBeNull()
            expect(item.querySelector('.rev-scan-item-links .rev-note-mark-jump')).not.toBeNull()
        })
    })
})

describe('the thread scan button', () => {
    it('ends the menu bar of an old reddit thread, with a title, once', async () => {
        await loadThread(oldThreadPage(3, oldComment('t1_a', 'a')), false)
        ui.initRestoreOnThread(false)
        await vi.advanceTimersByTimeAsync(0)
        const buttons = document.querySelectorAll('.rev-scan-all-btn')
        expect(buttons).toHaveLength(1)
        expect(buttons[0].parentElement.classList.contains('menuarea')).toBe(true)
        expect(buttons[0].textContent).toBe('Scan for removed comments')
        expect(buttons[0].className).toBe('rev-btn rev-btn-solid rev-scan-all-btn')
        expect(buttons[0].title).toBe('Search for removed comments in this thread')
    })

    it('leads the comment tree of a new reddit thread, with no title, once', async () => {
        await loadThread(threadPage(3, comment('t1_a', 'a')))
        ui.initRestoreOnThread(true)
        await vi.advanceTimersByTimeAsync(0)
        const buttons = document.querySelectorAll('.rev-scan-all-btn')
        expect(buttons).toHaveLength(1)
        expect(document.querySelector('shreddit-comment-tree').firstElementChild).toBe(buttons[0])
        expect(buttons[0].textContent).toBe('Scan for removed comments')
        expect(buttons[0].className).toBe('rev-btn rev-btn-solid rev-scan-all-btn')
        expect(buttons[0].hasAttribute('title')).toBe(false)
    })

    it("is replaced by a later run's when the page still has an earlier run's", async () => {
        await loadThread(threadPage(3, comment('t1_a', 'a')))
        scanBtn().remove()
        const stale = document.createElement('button')
        stale.className = 'rev-scan-all-btn'
        document.querySelector('shreddit-comment-tree').prepend(stale)
        ui.initRestoreOnThread(true)
        await vi.advanceTimersByTimeAsync(0)
        expect(document.querySelectorAll('.rev-scan-all-btn')).toHaveLength(1)
        expect(scanBtn()).not.toBe(stale)
    })
})

describe('the thread filter bar', () => {
    const filterBtn = f => document.querySelector(`.rev-thread-filter-btn[data-filter="${f}"]`)
    const activeFilter = () => document.querySelector('.rev-thread-filter-btn.rev-filter-active').getAttribute('data-filter')
    const unattached = () => document.querySelector('.rev-unattached-area')
    const gone = entry('t1_gone1', 'a', 'first words')

    it('old reddit: collapses what has nothing removed, and "all" opens it again', async () => {
        const tomb =
            `<div class="thing comment deleted" data-permalink="/r/sub/comments/post/a_title/tomb/"><div class="entry">` +
            `<p class="tagline"><a class="author">[deleted]</a></p><div class="usertext-body"><div class="md"><p>[removed]</p></div></div>` +
            `<ul class="buttons"></ul></div><div class="child"></div></div>`
        await loadThread(oldThreadPage(5, oldComment('t1_a', 'a') + oldComment('t1_b', 'b', oldComment('t1_c', 'c')) + tomb), false)
        pages[threadPath] = feed(postEntry(), entry('t1_a', 'a', 'live words'), entry('t1_b', 'b', 'live words'), entry('t1_c', 'c', 'live words'), entry('t1_tomb', null, '[deleted]'))
        pages[authorPath('a')] = feed(entry('t1_a', 'a', 'live words'), entry('t1_tomb', 'a', 'the words'))
        pages[authorPath('b')] = feed(entry('t1_b', 'b', 'live words'))
        pages[authorPath('c')] = feed(entry('t1_c', 'c', 'live words'))
        await scanThread()
        const el = id => document.querySelector(`[data-fullname="${id}"]`)
        const tombEl = document.querySelector('[data-rev-id="t1_tomb"]')
        expect(activeFilter()).toBe('removed')
        expect(['t1_a', 't1_b'].map(id => el(id).classList.contains('collapsed'))).toEqual([true, true])
        expect(el('t1_b').getAttribute('data-rev-filter-collapsed')).toBe('1')
        // collapsed at its highest level, so what it holds is left alone
        expect(el('t1_c').hasAttribute('data-rev-filter-collapsed')).toBe(false)
        expect(el('t1_b').querySelector(':scope > .entry .expand')).toBeNull()
        expect(tombEl.classList.contains('collapsed')).toBe(false)

        click(filterBtn('all'))
        expect(activeFilter()).toBe('all')
        expect(['t1_a', 't1_b'].map(id => el(id).classList.contains('collapsed'))).toEqual([false, false])
        expect(el('t1_b').hasAttribute('data-rev-filter-collapsed')).toBe(false)
        click(filterBtn('removed'))
        expect(el('t1_b').classList.contains('collapsed')).toBe(true)
    })

    it('old reddit: leaves open a comment the viewer opened, and one with a removed reply', async () => {
        await loadThread(oldThreadPage(5, oldComment('t1_a', 'a') + oldComment('t1_b', 'b', '', 'collapsed')), false)
        pages[threadPath] = feed(postEntry(), entry('t1_a', 'a', 'live words'), entry('t1_b', 'b', 'live words'))
        pages[authorPath('a')] = feed(entry('t1_a', 'a', 'live words'), gone)
        pages[authorPath('b')] = feed(entry('t1_b', 'b', 'live words'))
        pages[commentPath('t1_gone1')] = feed(postEntry(), entry('t1_a', 'a', 'live words'))
        await scanThread()
        const a = document.querySelector('[data-fullname="t1_a"]')
        expect(a.classList.contains('collapsed')).toBe(false)
        expect(a.contains(revEl('t1_gone1'))).toBe(true)
        const b = document.querySelector('[data-fullname="t1_b"]')
        expect(b.classList.contains('collapsed')).toBe(true)
        expect(b.hasAttribute('data-rev-filter-collapsed')).toBe(false)
    })

    it('new reddit: hides what has nothing removed, and "all" shows it again', async () => {
        await loadThread(threadPage(5, comment('t1_a', 'a') + comment('t1_b', 'b', '', comment('t1_c', 'c')) + tombstone('t1_tomb')))
        pages[threadPath] = feed(postEntry(), entry('t1_a', 'a', 'live words'), entry('t1_b', 'b', 'live words'), entry('t1_c', 'c', 'live words'), entry('t1_tomb', null, '[deleted]'))
        pages[authorPath('a')] = feed(entry('t1_a', 'a', 'live words'), entry('t1_tomb', 'a', 'the words'))
        pages[authorPath('b')] = feed(entry('t1_b', 'b', 'live words'))
        pages[authorPath('c')] = feed(entry('t1_c', 'c', 'live words'))
        await scanThread()
        const el = id => document.querySelector(`[thingid="${id}"]`)
        expect(activeFilter()).toBe('removed')
        expect(['t1_a', 't1_b'].map(id => el(id).style.display)).toEqual(['none', 'none'])
        expect(el('t1_b').getAttribute('data-rev-filter-hidden')).toBe('1')
        expect(el('t1_tomb').style.display).not.toBe('none')

        click(filterBtn('all'))
        expect(['t1_a', 't1_b'].map(id => el(id).style.display)).toEqual(['', ''])
        expect(el('t1_c').style.display).not.toBe('none')
        expect(el('t1_a').hasAttribute('data-rev-filter-hidden')).toBe(false)
        click(filterBtn('removed'))
        expect(el('t1_a').style.display).toBe('none')
    })

    it('shows the unattached area only while it holds something removed, on either reddit', async () => {
        for (const isNew of [true, false]) {
            await loadThread(
                isNew ? threadPage(4, comment('t1_a', 'a') + comment('t1_b', 'b')) : oldThreadPage(4, oldComment('t1_a', 'a') + oldComment('t1_b', 'b')),
                isNew,
            )
            pages[threadPath] = feed(postEntry(), entry('t1_a', 'a', 'live words'), entry('t1_b', 'b', 'live words'))
            pages[authorPath('a')] = feed(entry('t1_a', 'a', 'live words'), gone)
            pages[authorPath('b')] = feed(entry('t1_b', 'b', 'live words'))
            orphanAndParent()
            await scanThread()
            expect(unattached().style.display).toBe('')
            click(filterBtn('all'))
            expect(unattached().style.display).toBe('')
            unattached().classList.remove('rev-removed-highlight')
            unattached().querySelector('.rev-removed-highlight').classList.remove('rev-removed-highlight')
            unattached().querySelector('.rev-inserted-comment')?.classList.remove('rev-inserted-comment')
            click(filterBtn('removed'))
            expect(unattached().style.display).toBe('none')
            click(filterBtn('all'))
            expect(unattached().style.display).toBe('')
        }
    })

    describe('after a find', () => {
        const foundOnce = async () => {
            await loadThread(threadPage(9, comment('t1_a', 'a') + comment('t1_b', 'b') + tombstone('t1_tomb')))
            pages[threadPath] = feed(postEntry(), entry('t1_a', 'a', 'live words'), entry('t1_b', 'b', 'live words'), entry('t1_tomb', null, '[deleted]'))
            pages[authorPath('a')] = feed(entry('t1_a', 'a', 'live words'), gone)
            pages[commentPath('t1_gone1')] = feed(postEntry(), entry('t1_a', 'a', 'live words'))
            pages[authorPath('b')] = refused
            await scanThread()
            expect(activeFilter()).toBe('removed')
            click(filterBtn('all'))
            pages[authorPath('b')] = feed(entry('t1_b', 'b', 'live words'), entry('t1_tomb', 'b', 'second words'))
        }

        it("keeps the viewer's all through what a later scan finds", async () => {
            await foundOnce()
            await scanThread()
            expect(revEl('t1_tomb')).not.toBeNull()
            expect(activeFilter()).toBe('all')
        })

        it("keeps the viewer's all through what a comment's own search finds", async () => {
            await foundOnce()
            click(document.querySelector('.rev-restore-btn'))
            await settle(() => document.querySelector('.rev-spinner'))
            expect(revEl('t1_tomb')).not.toBeNull()
            expect(activeFilter()).toBe('all')
        })

        it("switches to removed on the first find, from a comment's own search too", async () => {
            await loadThread(threadPage(4, comment('t1_a', 'a') + tombstone('t1_tomb')))
            pages[threadPath] = feed(postEntry(), entry('t1_a', 'a', 'live words'), entry('t1_tomb', null, '[deleted]'))
            pages[authorPath('a')] = feed(entry('t1_a', 'a', 'live words'), entry('t1_tomb', 'a', 'the words'))
            click(document.querySelector('.rev-restore-btn'))
            await settle(() => document.querySelector('.rev-spinner'))
            expect(activeFilter()).toBe('removed')
        })
    })

    it('goes right after the scan button', async () => {
        await loadThread(threadPage(3, comment('t1_a', 'a')))
        scanBtn().remove()
        pages[threadPath] = feed(postEntry(), entry('t1_a', 'a', 'live words'))
        pages[authorPath('a')] = feed(entry('t1_a', 'a', 'live words'), gone)
        pages[commentPath('t1_gone1')] = feed(postEntry(), entry('t1_a', 'a', 'live words'))
        ui.initRestoreOnThread(true)
        await vi.advanceTimersByTimeAsync(0)
        await scanThread()
        expect(scanBtn().nextElementSibling.className).toBe('rev-thread-filter-bar')
        const labels = Array.from(document.querySelectorAll('.rev-thread-filter-bar > *'), el => `${el.localName}:${el.textContent}`)
        expect(labels).toEqual(['span:reveddit:', 'button:all', 'button:removed'])
    })
})
