// The popup as a person sees it: the real popup.tsx over a fake DOM.

// Install chrome global BEFORE any source import
import '../mocks/chrome-api.js'

import { describe, it, expect, vi } from 'vitest'
import { WWW_DETECT_FAILURES_KEY, WWW_TAB_FAILURES_KEY } from '../../src/src/lookup-status'
import { openPage } from '../mocks/extension-page.js'

const POST_URL = 'https://www.reddit.com/r/pics/comments/abc123/a_title/'

// tabs: the reddit tabs open, as the popup's query lists them after the
// storage has answered, or a promise of them for a query that answers later
// still. active: the address of the tab the popup was opened over. fakes: run
// over the extension's APIs before the popup loads.
const openPopup = ({ sync = {}, local = {}, tabs = [], active, fakes = () => {} } = {}) =>
    openPage(
        () => {
            vi.stubGlobal('__LATEST_RELEASE__', null)
            vi.stubGlobal('fetch', () => new Promise(() => {}))
            chrome.tabs.query = (query, callback) =>
                query.active ? callback(active ? [{ url: active }] : []) : Promise.resolve(tabs).then(callback)
            chrome.tabs.create = vi.fn()
            chrome.runtime.openOptionsPage = vi.fn()
            fakes()
            return import('../../src/src/popup.tsx')
        },
        { user_subscriptions: {}, other_subscriptions: {}, ...sync },
        local,
    )

// Each kind of button has its own styles, so its own class
const buttonKinds = async () => {
    const { createElement } = await import('react')
    const { renderToStaticMarkup } = await import('react-dom/server')
    const { ActionBtn, SecondaryActionBtn } = await import('../../src/src/ui/components')
    const classOf = Button => renderToStaticMarkup(createElement(Button)).match(/class="([^"]*)"/)[1]
    return { [classOf(ActionBtn)]: 'primary', [classOf(SecondaryActionBtn)]: 'secondary' }
}

// The warning's text, and its buttons with their kinds
const warningIn = async document => {
    const banner = Array.from(document.querySelectorAll('div'))
        .filter(div => div.textContent.startsWith('⚠'))
        .at(-1)
    const kinds = await buttonKinds()
    return {
        text: banner?.textContent,
        buttons: Array.from(banner?.parentElement.querySelectorAll('button') || []).map(button => [
            button.textContent,
            kinds[button.className],
        ]),
    }
}

describe('the follow switch', () => {
    // A follow's first check can take as long as a read does, and the switch
    // shows what's followed, so it can't wait for that.
    it("shows the follow at once, whether or not reddit's read ever answers", async () => {
        const options = { removal_status: { track: true }, lock_status: { track: true } }
        const { document, __getSyncStorage } = await openPopup({ sync: { options }, active: POST_URL })
        const text = () => document.body.textContent
        await vi.waitFor(() => expect(text()).toContain('subscribe to post'))

        const label = Array.from(document.querySelectorAll('span')).find(el => el.textContent === 'subscribe to post')
        label.click()

        await vi.waitFor(() => expect(text()).toContain('subscribed to post'))
        expect(Object.keys(__getSyncStorage().other_subscriptions)).toEqual(['t3_abc123'])
    })

    it('asks for the tab without waiting on the storage, which it reads whole once', async () => {
        let answer
        const storageAnswers = new Promise(resolve => (answer = resolve))
        const wholeReads = []
        let askedForTab = false
        const { document } = await openPopup({
            active: POST_URL,
            fakes: () => {
                const get = chrome.storage.sync.get
                chrome.storage.sync.get = (keys, callback) => {
                    if (keys != null) return get(keys, callback)
                    wholeReads.push(keys)
                    return storageAnswers.then(() => get(keys, callback))
                }
                const query = chrome.tabs.query
                chrome.tabs.query = (q, callback) => {
                    askedForTab ||= !!q.active
                    return query(q, callback)
                }
            },
        })
        await vi.waitFor(() => expect(askedForTab).toBe(true))
        answer()
        await vi.waitFor(() => expect(document.body.textContent).toContain('subscribe to post'))
        expect(wholeReads).toHaveLength(1)
    })
})

describe('a warning that a www.reddit.com tab usually clears', () => {
    // A tab gets three failed checks of its own to clear the public view's
    // warning. Checks with no tab open don't count, however many there were.
    const TAB_CHECKS = 3
    const WWW_TAB = { url: 'https://www.reddit.com/r/pics/' }
    const OPEN_TAB = 'Opening a www.reddit.com tab usually restores it.'
    const KEEP_TAB = 'Keeping a www.reddit.com tab open usually restores this.'
    const CONNECT = 'connect a second Reddit account'

    const local = (error_status, { failures = 0, tabFailures = 0 } = {}) => ({
        error_status,
        last_logged_in_user: 'someone',
        [WWW_DETECT_FAILURES_KEY]: failures,
        [WWW_TAB_FAILURES_KEY]: tabFailures,
    })
    const warning = async (error_status, { tabs = [], ...counts } = {}) => {
        const { document } = await openPopup({ local: local(error_status, counts), tabs })
        return document
    }
    const expectButtons = (document, buttons) =>
        vi.waitFor(async () => expect((await warningIn(document)).buttons).toEqual(buttons))

    it('public view with no tab open: a tab first, a second account after, however long it has lasted', async () => {
        // The count of a tab closed since doesn't count either
        const document = await warning('public_view_unavailable', { failures: 40, tabFailures: TAB_CHECKS })
        await expectButtons(document, [
            ['Open www.reddit.com', 'primary'],
            ['Connect a second account', 'secondary'],
        ])
        expect((await warningIn(document)).text).toContain(`${OPEN_TAB} If it keeps up, ${CONNECT}.`)
    })

    // Reported 2026-11-10: a tab opened after a long time without one got the
    // second account's words and button at once
    it('public view with a tab just opened: waits on its checks, with the second account as the other choice', async () => {
        const document = await warning('public_view_unavailable', {
            failures: 40,
            tabFailures: TAB_CHECKS - 1,
            tabs: [WWW_TAB],
        })
        await expectButtons(document, [['Connect a second account', 'secondary']])
        const { text } = await warningIn(document)
        expect(text).toContain('Keeping your www.reddit.com tab open usually restores it within a few checks.')
        expect(text).not.toContain(CONNECT)
    })

    it('public view with a tab open that has had its checks: the second account is the main choice', async () => {
        const document = await warning('public_view_unavailable', { tabFailures: TAB_CHECKS, tabs: [WWW_TAB] })
        await expectButtons(document, [['Connect a second account', 'primary']])
        expect((await warningIn(document)).text).toContain(
            `isn't loading, even with your www.reddit.com tab open. To keep checking your posts and comments, ${CONNECT}.`,
        )
    })

    it('follows the checks while open: the second account comes first, then the warning goes', async () => {
        const { document, storageChanged } = await openPopup({
            local: local('public_view_unavailable', { tabFailures: TAB_CHECKS - 1 }),
            tabs: [WWW_TAB],
        })
        await expectButtons(document, [['Connect a second account', 'secondary']])
        storageChanged({ [WWW_TAB_FAILURES_KEY]: { oldValue: TAB_CHECKS - 1, newValue: TAB_CHECKS } }, 'local')
        await expectButtons(document, [['Connect a second account', 'primary']])
        storageChanged({ error_status: { oldValue: 'public_view_unavailable' } }, 'local')
        await vi.waitFor(async () => expect((await warningIn(document)).text).toBeUndefined())
    })

    it('public view with a www.reddit.com tab open: offers none even before the tab query answers', async () => {
        let answer
        const document = await warning('public_view_unavailable', { tabs: new Promise(resolve => (answer = resolve)) })
        // The storage has answered: the account's row is there
        await vi.waitFor(() => expect(document.body.textContent).toContain('someone'))
        expect(document.body.textContent).not.toContain('Open www.reddit.com')
        answer([WWW_TAB])
        await expectButtons(document, [['Connect a second account', 'secondary']])
    })

    // 2026-11-17: Reddit sent a Posts-tab layout the parser couldn't read. The
    // steps are the public view's, in words that say what Reddit sent.
    it("a page Reddit sent that couldn't be read: a tab first, a second account once the tab has had its checks", async () => {
        const UNREADABLE = "Reddit is sending pages this version can't read in place of your profile"
        const closed = await warning('public_view_unreadable', { failures: 40 })
        await expectButtons(closed, [
            ['Open www.reddit.com', 'primary'],
            ['Connect a second account', 'secondary'],
        ])
        expect((await warningIn(closed)).text).toContain(
            `${UNREADABLE}. Opening a www.reddit.com tab sometimes gets past this. If it keeps up, ${CONNECT}.`,
        )

        const open = await warning('public_view_unreadable', { tabFailures: TAB_CHECKS - 1, tabs: [WWW_TAB] })
        await expectButtons(open, [['Connect a second account', 'secondary']])
        expect((await warningIn(open)).text).toContain(
            'Keeping your www.reddit.com tab open sometimes gets past this within a few checks.',
        )

        const lasting = await warning('public_view_unreadable', { tabFailures: TAB_CHECKS, tabs: [WWW_TAB] })
        await expectButtons(lasting, [['Connect a second account', 'primary']])
        expect((await warningIn(lasting)).text).toContain(
            `${UNREADABLE}, even through your www.reddit.com tab. To keep checking your posts and comments, ${CONNECT}.`,
        )
    })

    // One tab read and the other not: that kind's removals go unchecked
    it("a tab that can't be read: names it, a tab first while none is open, a second account either way", async () => {
        const closed = await warning('profile_posts_unreadable')
        await expectButtons(closed, [
            ['Open www.reddit.com', 'primary'],
            ['Connect a second account', 'secondary'],
        ])
        expect((await warningIn(closed)).text).toBe(
            "⚠ Reddit is sending the posts on your profile in a form this version can't read, so removals of your posts " +
                "can't be checked right now. Your comments are still checked. Opening a www.reddit.com tab sometimes gets " +
                `past this. If it keeps up, ${CONNECT}.`,
        )

        const open = await warning('profile_comments_unreadable', { tabs: [WWW_TAB] })
        await expectButtons(open, [['Connect a second account', 'secondary']])
        expect((await warningIn(open)).text).toContain(
            'removals of your comments can\'t be checked right now. Your posts are still checked. ' +
                `If it keeps up with your www.reddit.com tab open, ${CONNECT}.`,
        )
    })

    it('holds a notice with no word of a tab until the tab query answers too', async () => {
        let answer
        const document = await warning('checks_failing', { tabs: new Promise(resolve => (answer = resolve)) })
        await vi.waitFor(() => expect(document.body.textContent).toContain('someone'))
        expect((await warningIn(document)).text).toBeUndefined()
        answer([])
        await vi.waitFor(async () => expect((await warningIn(document)).text).toContain("aren't being checked right now"))
    })

    it('absent verification: offers a tab while none is open, and nothing once one is', async () => {
        const closed = await warning('absent_verify_unavailable')
        await expectButtons(closed, [['Open www.reddit.com', 'primary']])
        expect((await warningIn(closed)).text).toContain(KEEP_TAB)

        const open = await warning('absent_verify_unavailable', { tabs: [WWW_TAB] })
        await vi.waitFor(async () => expect((await warningIn(open)).text).not.toContain(KEEP_TAB))
        expect((await warningIn(open)).buttons).toEqual([])
    })

    // Reddit refused a profile's older pages through the tab too (2026-11-11),
    // which a second account doesn't read
    it("a profile's older pages: a tab might help while none is open, and a second account either way", async () => {
        const closed = await warning('profile_pagination_unavailable')
        await expectButtons(closed, [
            ['Open www.reddit.com', 'primary'],
            ['Connect a second account', 'secondary'],
        ])
        expect((await warningIn(closed)).text).toContain(
            `Opening a www.reddit.com tab sometimes restores this. If it keeps up, ${CONNECT}.`,
        )

        // A tab opened on that advice gets its checks before a second account comes first
        const open = await warning('profile_pagination_unavailable', { tabs: [WWW_TAB] })
        await expectButtons(open, [['Connect a second account', 'secondary']])
        expect((await warningIn(open)).text).toContain(
            `can't be checked right now. If it keeps up with your www.reddit.com tab open, ${CONNECT}.`,
        )
    })

    // Reddit signed in to the second account itself has that account's items
    // checked logged out, so connecting a second account would lead nowhere
    it.each([
        'login_required',
        'public_view_unavailable',
        'public_view_unreadable',
        'profile_posts_unreadable',
        'profile_pagination_unavailable',
    ])(
        '%s while signed in to Reddit as the second account: asks for a different one',
        async status => {
            const viewer_account = { name: 'Someone', token: 'ab'.repeat(16), cookies: [], connectedAt: Date.now() }
            const { document } = await openPopup({ local: { ...local(status), viewer_account } })
            await expectButtons(document, [['Connect a different account', 'primary']])
            expect((await warningIn(document)).text).toContain("You're signed in to Reddit with your second account")
        },
    )

    it('a blocked request: says a tab usually clears it only while none is open', async () => {
        const BLOCKED = "⚠ Reddit blocked the extension's last request (HTTP 403). It keeps retrying"
        const closed = await warning('reddit_blocked')
        await vi.waitFor(async () =>
            expect((await warningIn(closed)).text).toBe(
                `${BLOCKED}; opening a www.reddit.com tab usually clears this.`,
            ),
        )
        const open = await warning('reddit_blocked', { tabs: [WWW_TAB] })
        await vi.waitFor(async () => expect((await warningIn(open)).text).toBe(`${BLOCKED}.`))
    })

    it("still offers a tab when the open ones can't carry the extension's reads", async () => {
        const tabs = [
            { url: 'https://old.reddit.com/' },
            { url: 'https://www.reddit.com/', discarded: true },
            { url: 'https://www.reddit.com/r/pics/', frozen: true },
        ]
        const document = await warning('public_view_unavailable', { tabFailures: TAB_CHECKS, tabs })
        await expectButtons(document, [
            ['Open www.reddit.com', 'primary'],
            ['Connect a second account', 'secondary'],
        ])
    })
})

describe('an account named other', () => {
    it('has its own row, apart from followed items', async () => {
        const { document } = await openPopup({
            sync: {
                user_subscriptions: { other: true },
                other_subscriptions: { t1_followed: { t: 1 }, t1_too: { t: 2 } },
                removed_u_other: { t1_mine: { u: true }, t1_also: { u: true } },
                removed_other: { t1_followed: { u: true } },
            },
            local: { last_logged_in_user: 'other' },
        })
        // Both rows read "other": the account's unseen count, then followed items' of all followed
        const rows = () =>
            Array.from(document.querySelectorAll('a'))
                .filter(a => a.firstElementChild?.textContent === 'other')
                .map(a => a.children[1].textContent)
        await vi.waitFor(() => expect(rows()).toEqual(['2', '1 / 2']))
    })
})

describe('the test notification', () => {
    it('has the id the background knows only to close (background_clicks.test.js)', async () => {
        const { document } = await openPopup()
        const link = () =>
            Array.from(document.querySelectorAll('a')).find(a => a.textContent === 'send a test notification')
        await vi.waitFor(() => expect(link()).toBeTruthy())
        vi.spyOn(chrome.notifications, 'create')
        link().click()
        expect(chrome.notifications.create.mock.calls[0][0]).toMatch(/^reveddit:test\|/)
    })
})

describe('the header', () => {
    it('opens History and Options from named icons, and the popup closes after either', async () => {
        const { document, window } = await openPopup()
        const icon = name => document.querySelector(`button[aria-label="${name}"]`)
        await vi.waitFor(() => expect(icon('History')).toBeTruthy())
        for (const name of ['History', 'Options']) {
            expect(icon(name).getAttribute('title')).toBe(name)
            expect(icon(name).querySelector('svg')).toBeTruthy()
        }
        // No other button says them: the row of big ones is gone
        const labels = Array.from(document.querySelectorAll('button')).map(button => button.textContent)
        expect(labels).not.toContain('History')
        expect(labels).not.toContain('Options')

        icon('History').click()
        expect(chrome.tabs.create).toHaveBeenCalledWith({ url: chrome.runtime.getURL('src/history.html') })
        expect(window.close).toHaveBeenCalledTimes(1)

        icon('Options').click()
        expect(chrome.runtime.openOptionsPage).toHaveBeenCalledTimes(1)
        expect(window.close).toHaveBeenCalledTimes(2)
    })

    // The way back to a message dismissed from the card
    it('opens the news page from its icon, and the popup closes', async () => {
        const { document, window } = await openPopup()
        const news = () => document.querySelector('button[aria-label="News"]')
        await vi.waitFor(() => expect(news()).toBeTruthy())
        expect(news().getAttribute('title')).toBe('News')
        expect(news().querySelector('svg')).toBeTruthy()

        news().click()
        expect(chrome.tabs.create).toHaveBeenCalledWith({ url: chrome.runtime.getURL('src/news-page.html') })
        expect(window.close).toHaveBeenCalledTimes(1)
    })
})

// News messages as the popup shows them. The cache is what a fetch stored, a
// fresh one, so the popup fetches nothing. The feed's side is in
// news_messages.test.js.
describe('the news message', () => {
    const newsMessage = (id, extra = {}) => ({
        id,
        title: `Title ${id}`,
        body_markdown: `Words of ${id}`,
        published_utc: 1,
        ...extra,
    })
    const newsCache = (...messages) => ({ news_cache: { feed: { messages }, lastFetched: Date.now() } })
    const card = document => document.querySelector('button[aria-label="Dismiss"]')?.parentElement
    const title = document => card(document)?.querySelector('h4').textContent
    const dismiss = document => card(document).querySelector('button[aria-label="Dismiss"]').click()
    const PNG = 'data:image/png;base64,iVBORw0KGgo='

    it('opens a link in a new tab, since a plain click on one does nothing in the popup', async () => {
        const body = '[Get it free →](https://twisitter.com)'
        const { document } = await openPopup({ local: newsCache(newsMessage('a', { body_markdown: body })) })
        await vi.waitFor(() => expect(card(document)).toBeTruthy())
        const link = card(document).querySelector('.md-body a')
        expect([link.getAttribute('href'), link.getAttribute('target')]).toEqual(['https://twisitter.com', '_blank'])
    })

    it('shows a higher priority first, then the newest', async () => {
        const local = newsCache(
            newsMessage('new', { published_utc: 9 }),
            newsMessage('old', { published_utc: 1 }),
            newsMessage('first', { published_utc: 5, priority: 3 }),
        )
        const { document } = await openPopup({ local })
        await vi.waitFor(() => expect(title(document)).toBe('Title first'))
    })

    // A second tap on × would otherwise dismiss a message nobody saw
    it('holds the next message until the popup opens again', async () => {
        const local = newsCache(newsMessage('old', { published_utc: 1 }), newsMessage('new', { published_utc: 2 }))
        const first = await openPopup({ local })
        await vi.waitFor(() => expect(title(first.document)).toBe('Title new'))

        dismiss(first.document)
        await vi.waitFor(() => expect(card(first.document)).toBeFalsy())

        const second = await openPopup({ local: first.__getLocalStorage() })
        await vi.waitFor(() => expect(title(second.document)).toBe('Title old'))
    })

    it('shows an icon beside the title', async () => {
        const { document } = await openPopup({ local: newsCache(newsMessage('a', { icon: PNG })) })
        await vi.waitFor(() => expect(card(document)).toBeTruthy())
        expect(card(document).className).toContain('has-icon')
        expect(card(document).querySelector('img.icon').getAttribute('src')).toBe(PNG)
    })

    it('shows no picture for a message without an icon', async () => {
        const { document } = await openPopup({ local: newsCache(newsMessage('a')) })
        await vi.waitFor(() => expect(card(document)).toBeTruthy())
        expect(card(document).className).not.toContain('has-icon')
        expect(card(document).querySelector('img')).toBeNull()
    })
})
