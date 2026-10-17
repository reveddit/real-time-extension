#!/usr/bin/env node
// Drives a Firefox you started yourself with its remote-control port open
// (scripts/firefox-for-claude.applescript starts it with
// --remote-debugging-port 9222) over WebDriver BiDi. Playwright can't load
// extensions into Firefox; this can. It opens its own tab, records every
// bridge request the page posts to the extension's content-script relay and
// the answers, and prints what the page shows.
//
//   node --experimental-websocket scripts/firefox-bidi.cjs \
//       [--install <dir>] [--wait <ms>] [--eval <expression>] <url>
//
// --install loads <dir> (a dist-dev-firefox build) as a temporary add-on
//   first. Firefox reads it itself, so copy the build out of ~/Desktop or
//   Firefox will ask for Desktop access.
// --wait is how long to let the page load and fetch (default 15000 ms).
// --eval runs one more expression in the page and prints its JSON.
//
// Never launch Firefox from an automated session: on macOS, a Firefox started
// that way cost the launching session its ~/Desktop access.

const args = process.argv.slice(2)
const opt = name => {
    const i = args.indexOf(name)
    return i >= 0 ? args.splice(i, 2)[1] : undefined
}
const install = opt('--install')
const waitMs = Number(opt('--wait') || 15000)
const extra = opt('--eval')
const target = args[0]
if (!target) {
    console.error('usage: node --experimental-websocket scripts/firefox-bidi.cjs [--install <dir>] [--wait <ms>] [--eval <expr>] <url>')
    process.exit(2)
}

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

// Runs in each new document of our tab before the page's own scripts
const PRELOAD = `() => {
    window.__bridgeLog = []
    window.addEventListener('message', e => {
        const d = e.data
        if (!d || e.source !== window) return
        if (d.type === 'reveddit-bridge-request')
            window.__bridgeLog.push({ t: Math.round(performance.now()), req: d.id, url: String(d.url).replace('https://www.reddit.com', '') })
        if (d.type === 'reveddit-bridge-response')
            window.__bridgeLog.push({ t: Math.round(performance.now()), resp: d.id, ok: d.ok, status: d.status, error: d.error })
    })
}`

const REPORT = `JSON.stringify({
    url: location.href,
    mark: document.documentElement.getAttribute('data-reveddit-extension'),
    items: [...document.querySelectorAll('.comment, .post')].map(e =>
        e.id + (e.classList.contains('removed') ? ' REMOVED' : e.classList.contains('deleted') ? ' deleted' : '')),
    connectError: [...document.querySelectorAll('p')].find(p => /Could not connect/.test(p.textContent))
        ?.parentElement?.innerText.replace(/\\s+/g, ' ').slice(0, 600) || null,
    bridge: window.__bridgeLog || null,
})`

const evaluate = async (expression, context) => {
    const { result } = await send('script.evaluate', { expression, target: { context }, awaitPromise: true })
    return result.value
}

ws.onopen = async () => {
    let context
    try {
        await send('session.new', { capabilities: {} })
        if (install) {
            const { extension } = await send('webExtension.install', { extensionData: { type: 'path', path: install } })
            console.log(`installed temporary add-on ${extension} from ${install}`)
            await new Promise(r => setTimeout(r, 3000))
        }
        ;({ context } = await send('browsingContext.create', { type: 'tab' }))
        await send('script.addPreloadScript', { functionDeclaration: PRELOAD, contexts: [context] })
        await send('browsingContext.navigate', { context, url: target, wait: 'complete' })
        await new Promise(r => setTimeout(r, waitMs))
        console.log(JSON.stringify(JSON.parse(await evaluate(REPORT, context)), null, 1))
        if (extra) {
            console.log(await evaluate(`Promise.resolve(${extra}).then(v => JSON.stringify(v, null, 1))`, context))
        }
    } catch (e) {
        console.error('ERROR', e.message)
        process.exitCode = 1
    } finally {
        if (context) await send('browsingContext.close', { context }).catch(() => {})
        await send('session.end').catch(() => {})
        ws.close()
    }
}
ws.onerror = () => {
    console.error('Could not reach Firefox on 127.0.0.1:9222. Start it with --remote-debugging-port 9222 (see scripts/firefox-for-claude.applescript).')
    process.exitCode = 1
}
