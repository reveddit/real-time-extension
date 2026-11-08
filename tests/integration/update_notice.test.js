// The popup's notice that an update hasn't arrived (popup-notices.tsx): each
// store's build says how its browser checks for updates.

// Install chrome global BEFORE any source import
import '../mocks/chrome-api.js'

import { describe, it, expect, afterEach } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { UpdateNotice } from '../../src/src/popup-notices'

const notice = store => {
    globalThis.__STORE__ = store
    return renderToStaticMarkup(createElement(UpdateNotice, { version: '1.2', onDismiss() {} }))
}

afterEach(() => {
    globalThis.__STORE__ = 'chrome'
})

describe('the update notice', () => {
    it('gives Firefox its add-ons page and update check', () => {
        const text = notice('firefox')
        expect(text).toContain('about:addons')
        expect(text).toContain('Check for Updates')
        expect(text).not.toContain('chrome://extensions')
    })

    it.each(['chrome', 'edge'])('gives the %s build the extensions page', store => {
        const text = notice(store)
        expect(text).toContain('chrome://extensions')
        expect(text).not.toContain('about:addons')
    })

    it('links to the full steps in every build', () => {
        expect(notice('firefox')).toContain('https://www.reveddit.com/update-help')
        expect(notice('chrome')).toContain('https://www.reveddit.com/update-help')
    })
})
