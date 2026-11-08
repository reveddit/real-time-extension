// A post in the public feed that is owed a page read it didn't get this cycle is
// passed on as live without being called publicly live (_public_view_unverified),
// so the bridge doesn't tell the website so: young ones, and at any age one once
// seen held.

// Install chrome global BEFORE any source import
import '../mocks/chrome-api.js'

import { describe, it, expect } from 'vitest'
import { __getLocalStorage } from '../mocks/webextension-polyfill.js'
import { lookupItemsByID_fromPublicProfile } from '../../src/src/requests'
import { USER, thingIdEl, emptyStatePage, installFetch, useLegacyStub } from '../mocks/public-profile.js'

useLegacyStub()

describe('a mature post in the public feed', () => {
    const POST = 't3_mature1'
    const meta = { [POST]: { locked: false, created_utc: Math.floor(Date.now() / 1000) - 5 * 86400 } }
    let calls
    const lookup = async () => {
        calls = installFetch([
            [`/user/${USER}/comments/?sort=new`, emptyStatePage('comments')],
            [`/user/${USER}/submitted/?sort=new`, thingIdEl(POST)],
        ])
        const [result] = await lookupItemsByID_fromPublicProfile([POST], USER, meta)
        return result.data
    }

    it("once seen held, isn't called publicly live while its page read waits out an undecided one", async () => {
        __getLocalStorage().www_post_page_verdicts = { [POST]: { v: 'unknown', t: Date.now(), k: 2, adverse: true } }
        expect(await lookup()).toMatchObject({ name: POST, is_robot_indexable: true, _public_view_unverified: true })
        expect(calls.some(url => url.includes('/comments/mature1'))).toBe(false)
    })

    it('with no such history, is publicly live by the feed', async () => {
        const data = await lookup()
        expect(data).toMatchObject({ name: POST, is_robot_indexable: true })
        expect(data._public_view_unverified).toBeUndefined()
    })
})
