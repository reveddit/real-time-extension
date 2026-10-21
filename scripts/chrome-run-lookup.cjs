#!/usr/bin/env node
// Runs the public-view lookup, the core of every removal check, in a clean
// Chromium against live Reddit, with no Reddit login, and prints what the
// extension logged: which fetch route served each kind of page and the
// verdicts. A canary rides along: t1_ouz0d47, a comment of GiveUsNetNeutrality's
// that r/CantSayAnything removed, must come back REMOVED. Use it when Reddit
// changes what it refuses, to see which routes still read pages.
//
//   yarn build-chrome-dev
//   node scripts/chrome-run-lookup.cjs [--user <name>] [--lead <route>] [--tab]
//
// --user   whose public profile to read (default GiveUsNetNeutrality; the
//          canary is only checked for that user)
// --lead   start every kind of page on this route, e.g. background:reload, to
//          see the extension move off a refused one
// --tab    open a www.reddit.com tab first and lead with tab:no-cache, so the
//          tab legs run (content script, injected fetch)
//
// Needs the Bash sandbox off (it launches a browser and reaches reddit.com).
// Don't discard tabs in this browser: chrome.tabs.discard crashes Chrome for
// Testing (seen 2026-10-21 with every build, for any tab).

const path = require('path')
const { chromium } = require('playwright')

const args = process.argv.slice(2)
const opt = name => {
    const i = args.indexOf(name)
    return i >= 0 ? args.splice(i, 2)[1] : undefined
}
const flag = name => {
    const i = args.indexOf(name)
    return i >= 0 ? (args.splice(i, 1), true) : false
}
const user = opt('--user') || 'GiveUsNetNeutrality'
const lead = opt('--lead')
const withTab = flag('--tab')
const extDir = path.join(__dirname, '..', 'dist-dev-chrome')

const CANARY = 't1_ouz0d47'
const CANARY_META = { permalink: '/r/CantSayAnything/comments/1u1u4am/x/ouz0d47/', link_id: 't3_1u1u4am' }

const sleep = ms => new Promise(r => setTimeout(r, ms))

;(async () => {
    const context = await chromium.launchPersistentContext('', {
        channel: 'chromium',
        // Headed but off-screen: headless Chromium names itself HeadlessChrome,
        // which Reddit treats differently from a real browser.
        headless: false,
        args: [
            `--disable-extensions-except=${extDir}`,
            `--load-extension=${extDir}`,
            '--no-first-run',
            '--disable-gpu',
            '--window-position=-3000,-3000',
            '--window-size=500,400',
        ],
    })
    try {
        const sw = context.serviceWorkers()[0] || (await context.waitForEvent('serviceworker'))
        await sleep(3000)
        if (withTab) {
            await sw.evaluate(async user => {
                await chrome.tabs.create({ url: `https://www.reddit.com/user/${user}/`, active: false })
            }, user)
            await sleep(7000)
        }
        const seed = withTab ? 'tab:no-cache' : lead
        await sw.evaluate(async seed => {
            await chrome.storage.local.remove(['www_route_state', 'www_absent_item_verdicts'])
            if (seed) {
                await chrome.storage.local.set({
                    www_route_state: { lead: { feed: seed, partial: seed, page: seed }, exhaustedAt: {} },
                })
            }
        }, seed)
        const canary = user === 'GiveUsNetNeutrality'
        const mark = await sw.evaluate(() => globalThis.__devLog.length)
        const result = await sw.evaluate(
            message =>
                new Promise(resolve => {
                    const timer = setTimeout(() => resolve({ error: 'no answer in 2 min' }), 120000)
                    globalThis.__devAction(message, r => {
                        clearTimeout(timer)
                        resolve(r)
                    })
                }),
            {
                action: 'dev-www-lookup',
                username: user,
                ids: canary ? [CANARY] : [],
                meta: canary ? { [CANARY]: CANARY_META } : {},
            },
        )
        const log = await sw.evaluate(mark => globalThis.__devLog.slice(mark), mark)
        for (const line of log.filter(l => l.includes('[reveddit]'))) console.log(line)
        const state = await sw.evaluate(async () => (await chrome.storage.local.get('www_route_state')).www_route_state)
        console.log('\nroute state:', JSON.stringify(state))
        if (result.error) {
            console.log('lookup failed:', result.error)
            process.exitCode = 1
        } else if (canary) {
            const item = result.results.find(d => d.name === CANARY)
            const removed = item && item.author === '[deleted]'
            console.log(
                `canary ${CANARY}: ${item ? (removed ? 'REMOVED (ok)' : 'live (WRONG)') : 'no verdict (WRONG)'}`,
            )
            if (!removed) process.exitCode = 1
        }
    } finally {
        await context.close()
    }
})().catch(err => {
    console.error(err)
    process.exit(1)
})
