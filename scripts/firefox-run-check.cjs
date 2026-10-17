#!/usr/bin/env node
// Runs one monitoring check in a Firefox started by
// scripts/firefox-for-claude.applescript and prints what the diagnostic log
// says about it. Dev builds relay the test actions that Chrome dev builds take
// through externally_connectable (dev-run-check, dev-get-log, dev-get-storage…)
// from the content script on the localhost dev site, so that site must be up
// (`yarn start` in the website repo).
//
//   node --experimental-websocket scripts/firefox-run-check.cjs \
//       [--install <dir>] [--reddit-tab] [--site <url>]
//
// --install loads <dir> (a copy of dist-dev-firefox outside ~/Desktop) first.
// --reddit-tab opens www.reddit.com while the check runs, so it can use the
//   tab path; without it the check uses the background unless you have a
//   www.reddit.com tab open yourself.
// --site is the dev-site page to relay through (default
//   http://localhost:8080/about/).
//
// Never launch Firefox from an automated session: on macOS, a Firefox started
// that way cost the launching session its ~/Desktop access.

const args = process.argv.slice(2)
const opt = name => {
    const i = args.indexOf(name)
    return i >= 0 ? args.splice(i, 2)[1] : undefined
}
const flag = name => {
    const i = args.indexOf(name)
    return i >= 0 ? (args.splice(i, 1), true) : false
}
const install = opt('--install')
const site = opt('--site') || 'http://localhost:8080/about/'
const redditTab = flag('--reddit-tab')

const ws = new WebSocket('ws://127.0.0.1:9222/session')
let nextId = 1
const pending = new Map()
ws.onmessage = event => {
    const msg = JSON.parse(event.data)
    const entry = msg.id && pending.get(msg.id)
    if (entry) {
        pending.delete(msg.id)
        msg.type === 'error' ? entry.reject(new Error(`${msg.error}: ${msg.message}`)) : entry.resolve(msg.result)
    }
}
const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
        const id = nextId++
        pending.set(id, { resolve, reject })
        ws.send(JSON.stringify({ id, method, params }))
    })
const sleep = ms => new Promise(r => setTimeout(r, ms))

// One dev action through the page's relay; resolves with the answer's JSON
const devCall = message => `new Promise(resolve => {
    const id = Math.floor(Math.random() * 1e9)
    const t = setTimeout(() => resolve(JSON.stringify({ error: 'no answer (is this a dev build?)' })), 60000)
    window.addEventListener('message', e => {
        if (e.data && e.data.type === 'reveddit-dev-response' && e.data.id === id) {
            clearTimeout(t)
            resolve(JSON.stringify(e.data.response))
        }
    })
    window.postMessage({ type: 'reveddit-dev-request', id, message: ${JSON.stringify(message)} }, location.origin)
})`
const dev = async (message, context) => {
    const { result } = await send('script.evaluate', { expression: devCall(message), target: { context }, awaitPromise: true })
    return JSON.parse(result.value)
}

const openTab = async url => {
    const { context } = await send('browsingContext.create', { type: 'tab', background: true })
    await send('browsingContext.navigate', { context, url, wait: 'complete' })
    return context
}

ws.onopen = async () => {
    const contexts = []
    try {
        await send('session.new', { capabilities: {} })
        if (install) {
            const { extension } = await send('webExtension.install', { extensionData: { type: 'path', path: install } })
            console.log(`installed temporary add-on ${extension} from ${install}`)
            await sleep(4000)
        }
        if (redditTab) contexts.push(await openTab('https://www.reddit.com/'))
        const page = await openTab(site)
        contexts.push(page)
        await sleep(2000)
        const started = new Date().toISOString()
        const run = await dev({ action: 'dev-run-check' }, page)
        if (run.error) throw new Error(run.error)
        // dev-run-check answers before the cycle's lookups finish
        let lines = []
        for (let i = 0; i < 30; i++) {
            const { log = [] } = await dev({ action: 'dev-get-log' }, page)
            lines = log.filter(l => l > started)
            if (lines.some(l => /cycle done/.test(l))) break
            await sleep(3000)
        }
        console.log(lines.map(l => l.slice(11, 23) + ' ' + l.slice(24).replace('[log] [reveddit] ', '')).join('\n'))
        const { local = {} } = await dev({ action: 'dev-get-storage' }, page)
        if (local.www_tab_refused_at) {
            console.log(`tab refused at ${new Date(local.www_tab_refused_at).toISOString()} (the background leads for 6h)`)
        }
    } catch (e) {
        console.error('ERROR', e.message)
        process.exitCode = 1
    } finally {
        for (const context of contexts) await send('browsingContext.close', { context }).catch(() => {})
        await send('session.end').catch(() => {})
        ws.close()
    }
}
ws.onerror = () => {
    console.error('Could not reach Firefox on 127.0.0.1:9222. Start it with --remote-debugging-port 9222 (see scripts/firefox-for-claude.applescript).')
    process.exitCode = 1
}
