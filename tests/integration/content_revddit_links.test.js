// placeSubscribeLink keeps one subscribe link per reveddit item even when the
// content script runs again in an open tab (extension reload or update).

// Install chrome global BEFORE any source import that references __BUILT_FOR__
import '../mocks/chrome-api.js'

import { describe, it, expect, beforeAll } from 'vitest'
import { DOMParser } from 'linkedom'

let placeSubscribeLink
beforeAll(async () => {
    // content-common reads location.hostname when it loads
    globalThis.location.hostname = 'www.reveddit.com'
    ;({ placeSubscribeLink } = await import('../../src/src/content-revddit.ts'))
})

const setup = () => {
    const doc = new DOMParser().parseFromString(
        '<div class="post-links"><a href="">context</a><a href="">reddit</a></div>',
        'text/html',
    )
    const link = text => {
        const a = doc.createElement('a')
        a.textContent = text
        return a
    }
    return { links: doc.querySelector('.post-links'), link }
}

const texts = links => Array.from(links.children).map(el => el.textContent)

describe('placeSubscribeLink', () => {
    it('places one link when the same run reaches an item twice', () => {
        const { links, link } = setup()
        placeSubscribeLink(links, link('subscribe'), 'run1')
        placeSubscribeLink(links, link('subscribe'), 'run1')
        expect(texts(links)).toEqual(['context', 'reddit', 'subscribe'])
    })

    it("replaces an earlier run's link and keeps the site's own links", () => {
        const { links, link } = setup()
        placeSubscribeLink(links, link('subscribe'), 'run1')
        placeSubscribeLink(links, link('unsubscribe'), 'run2')
        expect(texts(links)).toEqual(['context', 'reddit', 'unsubscribe'])
        expect(links.lastElementChild.getAttribute('data-rev-subscribe-run')).toBe('run2')
    })

    it('uses its own run token by default', () => {
        const { links, link } = setup()
        placeSubscribeLink(links, link('subscribe'))
        placeSubscribeLink(links, link('subscribe'))
        expect(texts(links)).toEqual(['context', 'reddit', 'subscribe'])
    })
})
