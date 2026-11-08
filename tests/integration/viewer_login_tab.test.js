// A second account's sign-in that can't open Reddit's login page
// (viewer.ts startViewerConnect): the user's login goes back, and the options
// page has the reason to show.

// Install chrome global BEFORE any source import
import '../mocks/chrome-api.js'

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import browserMock, { __resetStorage, __getLocalStorage } from '../mocks/webextension-polyfill.js'

import { startViewerConnect, isViewerConnecting, VIEWER_CONNECT_RESULT_KEY } from '../../src/src/viewer'
import { cookie, fill, find, cookiesApi } from '../mocks/cookies.js'

beforeEach(() => {
    __resetStorage()
    fill([cookie('reddit_session', 'A-SESSION')])
    browserMock.cookies = cookiesApi
    browserMock.tabs.create = vi.fn(async () => {
        throw new Error('no window to open it in')
    })
})

afterEach(() => {
    delete browserMock.tabs.create
    delete browserMock.cookies
})

describe('a sign-in with no login page', () => {
    it('records why it ended, for the options page, and puts the login back', async () => {
        expect(await startViewerConnect('alice')).toEqual({ ok: false, error: 'no_tab' })
        expect(__getLocalStorage()[VIEWER_CONNECT_RESULT_KEY]).toMatchObject({ ok: false, error: 'no_tab' })
        expect(await isViewerConnecting()).toBe(false)
        expect(find('reddit_session').value).toBe('A-SESSION')
    })
})
