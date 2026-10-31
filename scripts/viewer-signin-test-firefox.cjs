#!/usr/bin/env node
// The Firefox version of viewer-signin-test.cjs: a real second-account sign-in,
// for you to run, in a Firefox you started with its remote-control port open
// (scripts/firefox-for-claude.applescript, or
// `open -na Firefox --args --new-instance --profile <dir> --remote-debugging-port 9222`).
// It loads the dev build as a temporary add-on, signs in on Reddit's own login
// page with the second account's password from .env, the way a person would,
// then checks what the extension did with it. Claude doesn't run this one,
// since it types a password.
//
//   yarn build-firefox-dev
//   node --experimental-websocket scripts/viewer-signin-test-firefox.cjs [--no-install] [--dry-run]
//
// .env (gitignored, next to package.json): the same names as
// viewer-signin-test.cjs. REDDIT_SECOND_USERNAME and REDDIT_SECOND_PASSWORD
// are needed; with REDDIT_MAIN_USERNAME and REDDIT_MAIN_PASSWORD it signs in
// the main account too when that Firefox isn't, else it asks you to.
//
// --no-install  use the add-on already loaded instead of loading the build
// --dry-run     go as far as Reddit's login form for the second account, then
//               close it unsigned, as a person giving up would (what Claude
//               can run)
//
// The dev build relays test actions from a page on http://localhost:8080; this
// serves one itself unless something already answers there. If Reddit asks
// you to prove you're human, or for a code, do it in Firefox: the script waits.
// It prints and logs no password, cookie value or token. The log goes to
// ../.test-profiles/firefox-signin-test.log, beside the repo.
//
// Never launch Firefox from an automated session: on macOS, a Firefox started
// that way cost the launching session its ~/Desktop access.

const fs = require('fs')
const os = require('os')
const http = require('http')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

const args = process.argv.slice(2)
const flag = name => {
    const i = args.indexOf(name)
    return i >= 0 ? (args.splice(i, 1), true) : false
}
const noInstall = flag('--no-install')
const dryRun = flag('--dry-run')
const build = path.join(__dirname, '..', 'dist-dev-firefox')
const second = { username: process.env.REDDIT_SECOND_USERNAME || '', password: process.env.REDDIT_SECOND_PASSWORD || '' }
const main = { username: process.env.REDDIT_MAIN_USERNAME || '', password: process.env.REDDIT_MAIN_PASSWORD || '' }
const secrets = [second.password, main.password].filter(Boolean)
const RELAY_URL = 'http://localhost:8080/about/'

const logDir = path.join(__dirname, '..', '..', '.test-profiles')
fs.mkdirSync(logDir, { recursive: true })
const logFile = path.join(logDir, 'firefox-signin-test.log')
const hide = text => secrets.reduce((t, s) => t.split(s).join('***'), String(text))
const log = (...parts) => {
    const line = hide(`${new Date().toISOString().slice(11, 19)} ${parts.join(' ')}`)
    fs.appendFileSync(logFile, `${line}\n`)
    console.log(line)
}
const sleep = ms => new Promise(r => setTimeout(r, ms))
const results = []
const check = (ok, what) => {
    results.push(ok)
    log(ok ? 'PASS' : 'FAIL', what)
}

if (!dryRun && (!second.username || !second.password)) {
    console.error('Add REDDIT_SECOND_USERNAME and REDDIT_SECOND_PASSWORD to .env first.')
    process.exit(2)
}
if (!noInstall && (!fs.existsSync(path.join(build, 'background.js')) || !fs.readFileSync(path.join(build, 'background.js'), 'utf8').includes('dev-viewer-connect-start'))) {
    console.error('dist-dev-firefox is missing or too old: run yarn build-firefox-dev first.')
    process.exit(2)
}

// A page for the dev build's content-script relay, unless one is up already
const relayServer = async () => {
    const up = await fetch(RELAY_URL).then(
        () => true,
        () => false,
    )
    if (up) return null
    const server = http.createServer((req, res) => {
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
        res.end('<!doctype html><title>relay</title><p>reveddit dev relay</p>')
    })
    await new Promise((resolve, reject) => server.once('error', reject).listen(8080, '127.0.0.1', resolve))
    return server
}

;(async () => {
    log(`=== viewer-signin-test-firefox${dryRun ? ' (dry run)' : ''}`)
    const server = await relayServer()
    const ws = await new Promise((resolve, reject) => {
        const s = new WebSocket('ws://127.0.0.1:9222/session')
        s.onopen = () => resolve(s)
        s.onerror = () => reject(new Error('Firefox not answering on 127.0.0.1:9222: start it with its remote-control port open'))
    }).catch(e => {
        log('error', e.message)
        server?.close()
        process.exit(1)
    })
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
    // Firefox quitting mid-run fails the run rather than leaving it waiting
    const closed = () => new Error('Firefox closed the connection')
    ws.onclose = () => {
        for (const entry of pending.values()) entry.reject(closed())
        pending.clear()
    }
    const send = (method, params = {}) =>
        new Promise((resolve, reject) => {
            if (ws.readyState !== WebSocket.OPEN) return reject(closed())
            const id = nextId++
            pending.set(id, { resolve, reject })
            ws.send(JSON.stringify({ id, method, params }))
        })
    const tree = async () => (await send('browsingContext.getTree', {})).contexts
    const evalIn = async (context, expression) => {
        const { result } = await send('script.evaluate', { expression, target: { context }, awaitPromise: true })
        return result.value
    }
    let relay
    const dev = async message =>
        JSON.parse(
            await evalIn(
                relay,
                `new Promise(resolve => {
                    const id = Math.floor(Math.random() * 1e9)
                    const t = setTimeout(() => resolve(JSON.stringify({ error: 'no answer' })), 60000)
                    window.addEventListener('message', e => {
                        if (e.data && e.data.type === 'reveddit-dev-response' && e.data.id === id) {
                            clearTimeout(t)
                            resolve(JSON.stringify(e.data.response))
                        }
                    })
                    window.postMessage({ type: 'reveddit-dev-request', id, message: ${JSON.stringify(message)} }, location.origin)
                })`,
            ),
        )
    const nameOf = r => {
        try {
            return JSON.parse(r.head || '')?.data?.name || ''
        } catch {
            return ''
        }
    }
    const me = async (url, credentials) => {
        const r = await dev({ action: 'dev-fetch', url, credentials, maxLen: 200000 })
        return { status: r.status ?? r.error, name: nameOf(r) }
    }
    const local = async () => (await dev({ action: 'dev-get-storage' })).local || {}
    const sessionCookie = async () => {
        const { cookies = [] } = await dev({ action: 'dev-reddit-cookie-flags' })
        const s = cookies.find(c => c.name === 'reddit_session')
        return s ? (s.session ? 'session-only' : 'persistent') : 'absent'
    }
    const findTab = async pattern => (await tree()).find(c => pattern.test(c.url))?.context
    // Types into a field of Reddit's login form (inside its shadow root) with
    // real key presses, as a person would
    const typeInto = async (context, field, text) => {
        const focused = await evalIn(
            context,
            `(() => { const i = document.querySelector('faceplate-text-input#${field}')?.shadowRoot?.querySelector('input'); if (!i) return false; i.focus(); i.select?.(); return true })()`,
        )
        if (!focused) throw new Error(`the ${field} field isn't there`)
        await send('input.performActions', {
            context,
            actions: [{ type: 'key', id: 'keyboard', actions: [...text].flatMap(ch => [{ type: 'keyDown', value: ch }, { type: 'keyUp', value: ch }]) }],
        })
        await send('input.releaseActions', { context }).catch(() => {})
    }
    const formReady = context => evalIn(context, `!!document.querySelector('faceplate-text-input#login-username')`).catch(() => false)
    const waitForForm = async (context, label) => {
        for (let waited = 0; !(await formReady(context)); waited += 2) {
            if (waited === 0) log(`${label}: no login form yet. If Reddit asks you to prove you're human, do it in Firefox.`)
            if (waited > 300) throw new Error(`${label}: the login form never appeared`)
            await sleep(2000)
        }
    }
    const signIn = async (context, account, label) => {
        await waitForForm(context, label)
        try {
            await typeInto(context, 'login-username', account.username)
            await typeInto(context, 'login-password', account.password)
            const pressed = await evalIn(
                context,
                `(() => { const b = [...document.querySelectorAll('button')].find(b => /^log in$/i.test(b.textContent.trim())); b?.click(); return !!b })()`,
            )
            if (!pressed) throw new Error('no Log In button')
        } catch (e) {
            throw new Error(hide(`${label}: couldn't fill the login form: ${e.message}`))
        }
        log(`${label}: login form sent`)
    }

    try {
        await send('session.new', { capabilities: {} })
        if (!noInstall) {
            // Firefox reads the add-on itself: from outside ~/Desktop, or it asks for Desktop access
            const copy = path.join(os.tmpdir(), 'reveddit-dev-firefox')
            fs.rmSync(copy, { recursive: true, force: true })
            fs.cpSync(build, copy, { recursive: true })
            const { extension } = await send('webExtension.install', { extensionData: { type: 'path', path: copy } })
            log('loaded the dev build as a temporary add-on:', extension)
            await sleep(4000)
        }
        relay = await findTab(/^http:\/\/localhost:8080\//)
        if (!relay) ({ context: relay } = await send('browsingContext.create', { type: 'tab', background: true }))
        await send('browsingContext.navigate', { context: relay, url: RELAY_URL, wait: 'complete' })
        await sleep(1500)
        if (!(await dev({ action: 'dev-reddit-cookie-flags' })).cookies) throw new Error("the add-on doesn't answer the relay: is it the current dev build?")

        // 1. The main login
        let mainName = (await me('https://www.reddit.com/api/me.json', 'include')).name
        if (!mainName && !dryRun) {
            const { context: tab } = await send('browsingContext.create', { type: 'tab' })
            await send('browsingContext.navigate', { context: tab, url: 'https://www.reddit.com/login/', wait: 'none' })
            if (main.username && main.password) await signIn(tab, main, 'main account')
            else log('Sign in to your MAIN Reddit account in Firefox. Waiting up to 5 minutes.')
            for (let i = 0; i < 150 && !mainName; i++) {
                await sleep(2000)
                mainName = (await me('https://www.reddit.com/api/me.json', 'include')).name
            }
            if (!mainName) throw new Error('the main account never signed in')
        }
        if (mainName && second.username && mainName.toLowerCase() === second.username.toLowerCase()) {
            throw new Error('Firefox is signed in as the second account: sign in to your main account there instead')
        }
        log('main account:', mainName || '(none)', '| reddit_session', await sessionCookie())
        for (let i = 0; mainName && i < 30 && String((await local()).last_logged_in_user || '').toLowerCase() !== mainName.toLowerCase(); i++) {
            if (i === 0) await dev({ action: 'dev-run-check' })
            await sleep(2000)
        }
        const before = (await local()).viewer_account || null

        // 2. The second account signs in on Reddit's page
        log('sign-in start:', JSON.stringify(await dev({ action: 'dev-viewer-connect-start' })))
        let loginTab
        for (let i = 0; i < 40 && !loginTab; i++) {
            await sleep(500)
            loginTab = await findTab(/^https:\/\/www\.reddit\.com\/login/)
        }
        if (!loginTab) throw new Error("the extension didn't open Reddit's login page")
        if (dryRun) {
            await waitForForm(loginTab, 'second account')
            check(true, "dry run: Reddit's login form is there")
            await send('browsingContext.close', { context: loginTab })
            let ended = null
            for (let i = 0; i < 30 && !ended; i++) {
                await sleep(1000)
                const l = await local()
                if (!l.viewer_connect) ended = l
            }
            check(ended?.viewer_connect_result?.error === 'not_signed_in', `dry run: closing the login tab ended it as not signed in (${JSON.stringify(ended?.viewer_connect_result || null)})`)
            const back = await me('https://www.reddit.com/api/me.json', 'include')
            check(!mainName || back.name.toLowerCase() === mainName.toLowerCase(), `dry run: the main login is as it was: ${back.name || '(none)'}`)
            log(results.every(Boolean) ? 'DRY RUN PASSED' : 'DRY RUN FAILED')
            if (results.some(ok => !ok)) process.exitCode = 1
            return
        }
        await signIn(loginTab, second, 'second account')
        let done = null
        for (let i = 0; i < 150 && !done; i++) {
            await sleep(2000)
            if (i === 10) log('Still signing in. If Reddit asks for a code or a check, finish it in Firefox.')
            const l = await local()
            if (!l.viewer_connect) done = l
        }
        if (!done) throw new Error('the sign-in never finished')
        const result = done.viewer_connect_result || {}
        const viewer = done.viewer_account || null
        check(result.ok === true, `the sign-in finished: ${result.ok ? 'ok' : `not ok (${result.error || 'no result'})`}`)
        check(viewer?.name?.toLowerCase() === second.username.toLowerCase(), `the second account saved: ${viewer?.name || 'none'}`)
        check(!!viewer && viewer.connectedAt !== before?.connectedAt, 'a new connection, not a leftover one')

        // 3. What the extension did with it
        await sleep(3000)
        const mainAfter = await me('https://www.reddit.com/api/me.json', 'include')
        check(!!mainName && mainAfter.name.toLowerCase() === mainName.toLowerCase(), `the main login came back: ${mainAfter.status} ${mainAfter.name || '(no name)'}`)
        const persistence = await sessionCookie()
        check(persistence === 'persistent', `the main login survives a restart: reddit_session ${persistence}`)
        if (viewer) {
            const marked = await me(`https://www.reddit.com/api/me.json?rv_viewer=${viewer.token}`, 'omit')
            check(marked.name.toLowerCase() === second.username.toLowerCase(), `a marked request answers as the second account: ${marked.status} ${marked.name || '(no name)'}`)
        }
        const unmarked = await me('https://www.reddit.com/api/me.json?raw_json=1', 'omit')
        check(unmarked.name.toLowerCase() !== second.username.toLowerCase(), `an unmarked request doesn't: ${unmarked.status} ${unmarked.name || '(no name)'}`)

        // 4. One check through it
        const since = new Date().toISOString()
        await dev({ action: 'dev-run-check' })
        await sleep(30000)
        const { log: entries = [] } = await dev({ action: 'dev-get-log' })
        const lines = entries.filter(l => l >= since)
        for (const l of lines.filter(l => /second|lookup|cycle done|error|refused|rate|429|403/i.test(l)).slice(-10)) log('  log:', l.slice(11, 23), l.slice(24))
        // A lookup settles only what it can each cycle, so not every item need come back
        const lookup = lines.map(l => l.match(/second-account lookup: (\d+) requested, (\d+) returned/)).find(Boolean)
        check(!!lookup, `a check ran through the second account: ${lookup ? `${lookup[2]} of ${lookup[1]} items settled` : 'no lookup logged'}`)
        const after = await local()
        check(!after.error_status, `no warning afterwards: ${after.error_status || 'none'}`)
        log(results.every(Boolean) ? `ALL ${results.length} CHECKS PASSED` : `${results.filter(ok => !ok).length} OF ${results.length} CHECKS FAILED`)
    } catch (e) {
        log('error', hide(e.message))
        process.exitCode = 1
    } finally {
        await send('session.end').catch(() => {})
        ws.close()
        server?.close()
    }
    if (results.some(ok => !ok)) process.exitCode = 1
})()
