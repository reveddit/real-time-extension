// The popup as a person sees it: the real popup.tsx over a fake DOM.

// Install chrome global BEFORE any source import
import '../mocks/chrome-api.js'

import { describe, it, expect, vi } from 'vitest'
import { STREAK_WARN_AT, WWW_DETECT_FAILURES_KEY } from '../../src/src/lookup-status'
import { openPage } from '../mocks/extension-page.js'

const POST_URL = 'https://www.reddit.com/r/pics/comments/abc123/a_title/'

// tabs: the reddit tabs open, as the popup's query lists them. active: the
// address of the tab the popup was opened over.
const openPopup = ({ sync = {}, local = {}, tabs = [], active } = {}) =>
    openPage(
        () => {
            vi.stubGlobal('__LATEST_RELEASE__', null)
            vi.stubGlobal('fetch', () => new Promise(() => {}))
            chrome.tabs.query = (query, callback) => callback(query.active ? (active ? [{ url: active }] : []) : tabs)
            chrome.tabs.create = vi.fn()
            chrome.runtime.openOptionsPage = vi.fn()
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
})

describe('a warning that a www.reddit.com tab usually clears', () => {
    // Monitoring raises the public view's warning on the STREAK_WARN_AT-th
    // failed lookup in a row. Three checks after that, a tab has had its chance.
    const LASTING = STREAK_WARN_AT + 3
    const WWW_TAB = { url: 'https://www.reddit.com/r/pics/' }
    const OPEN_TAB = 'Opening a www.reddit.com tab usually restores it.'
    const KEEP_TAB = 'Keeping a www.reddit.com tab open usually restores this.'

    const warning = async (error_status, { failures = 0, tabs = [] } = {}) => {
        const { document } = await openPopup({
            local: { error_status, last_logged_in_user: 'someone', [WWW_DETECT_FAILURES_KEY]: failures },
            tabs,
        })
        return document
    }
    const expectButtons = (document, buttons) =>
        vi.waitFor(async () => expect((await warningIn(document)).buttons).toEqual(buttons))

    it("public view with no tab open: a tab first, a second account after, until it's lasted", async () => {
        const document = await warning('public_view_unavailable', { failures: LASTING - 1 })
        await expectButtons(document, [
            ['Open www.reddit.com', 'primary'],
            ['Connect a second account', 'secondary'],
        ])
        expect((await warningIn(document)).text).toContain(OPEN_TAB)
    })

    it('public view with no tab open, once it has lasted: the second account first', async () => {
        const document = await warning('public_view_unavailable', { failures: LASTING })
        await expectButtons(document, [
            ['Connect a second account', 'primary'],
            ['Open www.reddit.com', 'secondary'],
        ])
    })

    it('public view with a www.reddit.com tab open: asks for no tab, and the second account waits as the other choice', async () => {
        const document = await warning('public_view_unavailable', { failures: LASTING - 1, tabs: [WWW_TAB] })
        await expectButtons(document, [['Connect a second account', 'secondary']])
        const { text } = await warningIn(document)
        expect(text).not.toContain('www.reddit.com tab')
        expect(text).toContain('If it keeps up, connect a second Reddit account.')
    })

    it('public view with a www.reddit.com tab open, once it has lasted: the second account is the main choice', async () => {
        const document = await warning('public_view_unavailable', { failures: LASTING, tabs: [WWW_TAB] })
        await expectButtons(document, [['Connect a second account', 'primary']])
    })

    it.each(['absent_verify_unavailable', 'profile_pagination_unavailable'])(
        '%s: offers a tab while none is open, and nothing once one is',
        async status => {
            const closed = await warning(status)
            await expectButtons(closed, [['Open www.reddit.com', 'primary']])
            expect((await warningIn(closed)).text).toContain(KEEP_TAB)

            const open = await warning(status, { tabs: [WWW_TAB] })
            await vi.waitFor(async () => expect((await warningIn(open)).text).not.toContain(KEEP_TAB))
            expect((await warningIn(open)).buttons).toEqual([])
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
        const document = await warning('public_view_unavailable', { failures: STREAK_WARN_AT, tabs })
        await expectButtons(document, [
            ['Open www.reddit.com', 'primary'],
            ['Connect a second account', 'secondary'],
        ])
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
})
