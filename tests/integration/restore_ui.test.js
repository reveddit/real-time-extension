// The scan buttons as a person presses them: the real restore-ui.ts and restore.ts
// over a fake DOM, with the background's reads answered from a table of feeds.

// Install chrome global BEFORE any source import
import '../mocks/chrome-api.js'

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import browserMock, { __resetStorage } from '../mocks/webextension-polyfill.js'
import { parseHTML, DOMParser } from 'linkedom'
import { POST, NOW, entry, postEntry, feed, listing } from '../mocks/feeds.js'

const threadPath = '/r/sub/comments/post/.rss?limit=500'
const authorPath = name => `/user/${name}/comments/.rss?sort=new&limit=100`
const commentPath = id => `/comments/post/_/${id.slice(3)}/.rss?context=1`
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
const answer = path => {
    asked.push(path)
    const page = pages[path]
    if (page === undefined) return { ok: false, status: 404, text: '' }
    return typeof page === 'string' ? { ok: true, status: 200, text: page } : page
}

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
    // restore.ts gets the fresh instance of the mock
    const fresh = (await import('../mocks/webextension-polyfill.js')).default
    fresh.runtime.sendMessage = async message =>
        message.action === 'fetch-with-login' ? answer(message.path) : undefined
    ui = await import('../../src/src/restore-ui.ts')
}
const loadThread = async (html, isNewReddit = true) => {
    await load(html)
    ui.initRestoreOnThread(isNewReddit)
    await vi.advanceTimersByTimeAsync(0)
}
const loadProfile = async (html, user = 'someone', path = `/user/${user}/`) => {
    await load(html, path)
    ui.initProfileScan(user, false)
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
    vi.spyOn(console, 'log').mockImplementation(() => {})
})
afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
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
        await vi.advanceTimersByTimeAsync(0)
        box.remove()
        answered({ ok: false, status: 500 })
        await vi.advanceTimersByTimeAsync(0)
        home.prepend(box)
        expect(btn.disabled).toBe(false)
        expect(btn.textContent).toBe('Place unattached comments (1 left)')
        expect(document.querySelector('.rev-unattached-note .rev-restore-cancel')).toBeNull()
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
        expect(scanBtn().title).not.toContain('All visible authors searched')
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
