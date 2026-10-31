#!/usr/bin/env node
// A real second-account sign-in, for you to run: it signs in on Reddit's own
// login page with the second account's password from .env, the way a person
// would, then checks what the extension did with it (the main login back and
// still persistent, the account saved, marked requests answered as it, and a
// check through it). Claude doesn't run this one, since it types a password.
//
//   yarn build-chrome-dev
//   node scripts/viewer-signin-test.cjs [--profile <dir>] [--keep-open] [--dry-run]
//
// .env (gitignored, next to package.json) needs:
//   REDDIT_SECOND_USERNAME, REDDIT_SECOND_PASSWORD   the second account
//   REDDIT_MAIN_USERNAME, REDDIT_MAIN_PASSWORD       optional: the main account,
//       signed in first when the profile isn't. Without them, sign in by hand
//       in the window when asked; the profile keeps that login for next time.
//
// --profile    the Chromium profile (default ../.test-profiles/chrome, beside
//              the repo, not in it). It keeps Reddit's site data between runs,
//              which lets the login page through without a "Prove your
//              humanity" check. If that check or a two-factor prompt comes up,
//              finish it in the window: the script waits.
// --keep-open  leave the browser open at the end
// --dry-run    go as far as Reddit's login form for the second account, then
//              cancel without typing anything (what Claude can run)
//
// It prints and logs no password, cookie value or token. The log goes to
// <profile>-signin-test.log. Claude's own scripts read this profile too; they
// need the Bash sandbox off.

const fs = require('fs')
const path = require('path')
const { chromium } = require('playwright')
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

const args = process.argv.slice(2)
const opt = name => {
    const i = args.indexOf(name)
    return i >= 0 ? args.splice(i, 2)[1] : undefined
}
const flag = name => {
    const i = args.indexOf(name)
    return i >= 0 ? (args.splice(i, 1), true) : false
}
const profile = path.resolve(opt('--profile') || path.join(__dirname, '..', '..', '.test-profiles', 'chrome'))
const keepOpen = flag('--keep-open')
const dryRun = flag('--dry-run')
const ext = path.join(__dirname, '..', 'dist-dev-chrome')
const second = { username: process.env.REDDIT_SECOND_USERNAME || '', password: process.env.REDDIT_SECOND_PASSWORD || '' }
const main = { username: process.env.REDDIT_MAIN_USERNAME || '', password: process.env.REDDIT_MAIN_PASSWORD || '' }
const secrets = [second.password, main.password].filter(Boolean)

const logFile = `${profile}-signin-test.log`
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
if (!fs.existsSync(path.join(ext, 'background.js')) || !fs.readFileSync(path.join(ext, 'background.js'), 'utf8').includes('dev-viewer-connect-start')) {
    console.error('dist-dev-chrome is missing or too old: run yarn build-chrome-dev first.')
    process.exit(2)
}

// Fills Reddit's login form and presses Log In. A "Prove your humanity" page
// or anything else in its place waits for the person at the window.
const signIn = async (page, account, label) => {
    const username = page.getByRole('textbox', { name: /user|email/i })
    for (let waited = 0; !(await username.count()); waited += 2) {
        if (waited === 0) log(`${label}: no login form yet (page "${await page.title()}"). If Reddit asks you to prove you're human, do it in the window.`)
        if (waited > 300) throw new Error(`${label}: the login form never appeared`)
        await sleep(2000)
    }
    try {
        await username.fill(account.username)
        await page.locator('input[type="password"]').fill(account.password)
        await page.getByRole('button', { name: /^log in$/i }).click()
    } catch (e) {
        throw new Error(hide(`${label}: couldn't fill the login form: ${e.message.split('\n')[0]}`))
    }
    log(`${label}: login form sent`)
}

;(async () => {
    fs.mkdirSync(profile, { recursive: true })
    log(`=== viewer-signin-test, profile ${profile}`)
    const context = await chromium.launchPersistentContext(profile, {
        channel: 'chromium',
        headless: false,
        viewport: null,
        args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`, '--no-first-run', '--window-size=1200,900', '--window-position=60,40'],
    })
    // The extension's service worker, not a site's
    const worker = async () => {
        for (let i = 0; i < 10; i++) {
            const sw = context
                .serviceWorkers()
                .filter(w => w.url().startsWith('chrome-extension://'))
                .at(-1)
            if (sw) return sw
            await sleep(1000)
        }
        throw new Error("the extension's service worker never started")
    }
    try {
        // Run the build on disk: a kept profile can start the service worker of
        // an earlier build, which may not even answer. With developer mode on,
        // chrome://extensions reloads the extension from disk, as its Reload
        // button does for a person.
        const extensions = await context.newPage()
        await extensions.goto('chrome://extensions/')
        await sleep(1500)
        const item = () =>
            document
                .querySelector('extensions-manager')
                ?.shadowRoot?.querySelector('extensions-item-list')
                ?.shadowRoot?.querySelector('extensions-item')?.shadowRoot
        await extensions.evaluate(`(() => {
            const devMode = document.querySelector('extensions-manager')?.shadowRoot?.querySelector('extensions-toolbar')?.shadowRoot?.querySelector('#devMode')
            if (devMode && !devMode.checked) devMode.click()
            const toggle = (${item})()?.querySelector('#enableToggle')
            if (toggle && !toggle.checked) toggle.click()
        })()`)
        await sleep(1000)
        const reloaded = context.waitForEvent('serviceworker', { timeout: 30000 }).catch(() => null)
        const clicked = await extensions.evaluate(`(() => {
            const reload = (${item})()?.querySelector('#dev-reload-button')
            reload?.click()
            return !!reload
        })()`)
        if (!clicked) throw new Error("chrome://extensions has no Reload button for the extension")
        await reloaded
        await sleep(2000)
        await extensions.close()
        // Chrome names an unpacked extension after its folder's path
        const extensionId = new URL((await worker()).url()).host
        const options = await context.newPage()
        await options.goto(`chrome-extension://${extensionId}/src/options.html#second-account`)
        await sleep(1500)
        const devAction = async message => (await worker()).evaluate(m => new Promise(r => globalThis.__devAction(m, r)), message)
        // From the worker, where the extension's own requests come from: the
        // second account's header rule matches only requests from no tab
        const me = async (url, credentials) =>
            (await worker()).evaluate(
                async ([u, c]) => {
                    const r = await fetch(u, { credentials: c, cache: 'no-cache' })
                    try {
                        return { status: r.status, name: (await r.json())?.data?.name || '' }
                    } catch {
                        return { status: r.status, name: '' }
                    }
                },
                [url, credentials],
            )
        const local = keys => options.evaluate(k => chrome.storage.local.get(k), keys)
        const sessionCookie = () =>
            options.evaluate(async () => {
                const s = (await chrome.cookies.getAll({ domain: 'reddit.com' })).find(c => c.name === 'reddit_session')
                return s ? (s.session ? 'session-only' : 'persistent') : 'absent'
            })
        log('running version', await options.evaluate(() => chrome.runtime.getManifest().version))

        // 1. The main login
        let mainName = (await me('https://www.reddit.com/api/me.json', 'include')).name
        if (!mainName && dryRun) {
            log('dry run: the main account is not signed in in this profile (a real run signs it in first)')
        } else if (!mainName) {
            const page = await context.newPage()
            await page.goto('https://www.reddit.com/login/')
            if (main.username && main.password) {
                await signIn(page, main, 'main account')
            } else {
                log('Sign in to your MAIN Reddit account in the window. Waiting up to 5 minutes.')
            }
            for (let i = 0; i < 150 && !mainName; i++) {
                await sleep(2000)
                mainName = (await me('https://www.reddit.com/api/me.json', 'include')).name
            }
            await page.close().catch(() => {})
            if (!mainName) throw new Error('the main account never signed in')
        }
        if (mainName && mainName.toLowerCase() === second.username.toLowerCase()) {
            throw new Error('the browser is signed in as the second account: sign in to your main account in this profile instead')
        }
        log('main account:', mainName, '| reddit_session', await sessionCookie())
        // The sign-in sets the main login aside under the name the extension knows
        for (let i = 0; mainName && i < 30 && (await local('last_logged_in_user')).last_logged_in_user?.toLowerCase() !== mainName.toLowerCase(); i++) {
            if (i === 0) await devAction({ action: 'dev-run-check' })
            await sleep(2000)
        }
        const before = (await local('viewer_account')).viewer_account || null

        // 2. The second account signs in on Reddit's page, started the way the
        // options page's continue button starts it
        const started = await options.evaluate(() => new Promise(r => chrome.runtime.sendMessage({ action: 'viewer-connect-start' }, r)))
        log('sign-in start:', JSON.stringify(started))
        let loginTab = null
        for (let i = 0; i < 40 && !loginTab; i++) {
            await sleep(500)
            loginTab = context.pages().find(p => /^https:\/\/www\.reddit\.com\/login/.test(p.url()))
        }
        if (!loginTab) throw new Error("the extension didn't open Reddit's login page")
        await loginTab.waitForLoadState('domcontentloaded').catch(() => {})
        await sleep(2000)
        if (dryRun) {
            const form = await loginTab.getByRole('textbox', { name: /user|email/i }).count()
            const password = await loginTab.locator('input[type="password"]').count()
            const button = await loginTab.getByRole('button', { name: /^log in$/i }).count()
            check(form === 1 && password === 1 && button === 1, `dry run: Reddit's login form is there (page "${await loginTab.title()}", username ${form}, password ${password}, Log In ${button})`)
            const cancelled = await options.evaluate(() => new Promise(r => chrome.runtime.sendMessage({ action: 'viewer-connect-cancel' }, resp => r(resp))))
            await sleep(1500)
            const l = await local(['viewer_connect', 'viewer_connect_result'])
            check(!l.viewer_connect && l.viewer_connect_result?.error === 'cancelled', `dry run: cancelled without signing in (${JSON.stringify(cancelled)})`)
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
            if (i === 10) log('Still signing in. If Reddit asks for a code or a check, finish it in the window.')
            const l = await local(['viewer_connect', 'viewer_connect_result', 'viewer_account'])
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
        check(mainAfter.name.toLowerCase() === mainName.toLowerCase(), `the main login came back: ${mainAfter.status} ${mainAfter.name || '(no name)'}`)
        const persistence = await sessionCookie()
        check(persistence === 'persistent', `the main login survives a restart: reddit_session ${persistence}`)
        const ruleCookies = await (await worker()).evaluate(async () => {
            const r = (await chrome.declarativeNetRequest.getSessionRules()).find(x => x.id === 9005)
            return r ? (r.action.requestHeaders?.[0]?.value || '').split(';').map(p => p.trim().split('=')[0]).filter(Boolean) : []
        })
        check(ruleCookies.includes('reddit_session'), `the header rule carries the second account's login (${ruleCookies.length} cookies)`)
        if (viewer) {
            const marked = await me(`https://www.reddit.com/api/me.json?rv_viewer=${viewer.token}`, 'omit')
            check(marked.name.toLowerCase() === second.username.toLowerCase(), `a marked request answers as the second account: ${marked.status} ${marked.name || '(no name)'}`)
        }
        const unmarked = await me('https://www.reddit.com/api/me.json?raw_json=1', 'omit')
        check(unmarked.name.toLowerCase() !== second.username.toLowerCase(), `an unmarked request doesn't: ${unmarked.status} ${unmarked.name || '(no name)'}`)

        // 4. One check through it
        await options.evaluate(() => chrome.storage.local.remove('viewer_item_verdicts'))
        const since = new Date().toISOString()
        await devAction({ action: 'dev-run-check' })
        await sleep(40000)
        const text = await options.evaluate(() => new Promise(r => chrome.runtime.sendMessage({ action: 'get-diag-log', includeUsername: false }, resp => r(resp?.text || ''))))
        const lines = text.split('\n').filter(l => /^\d{4}-/.test(l) && l.slice(0, 19) >= since.slice(0, 19))
        for (const l of lines.filter(l => /second|lookup|cycle done|error|refused|rate|429|403/i.test(l)).slice(-10)) log('  log:', l)
        // A lookup settles only what it can each cycle, so not every item need come back
        const lookup = lines.map(l => l.match(/second-account lookup: (\d+) requested, (\d+) returned/)).find(Boolean)
        check(!!lookup, `a check ran through the second account: ${lookup ? `${lookup[2]} of ${lookup[1]} items settled` : 'no lookup logged'}`)
        const after = await local(['error_status', 'viewer_identity'])
        check(!after.error_status, `no warning afterwards: ${after.error_status || 'none'}`)
        log(results.every(Boolean) ? `ALL ${results.length} CHECKS PASSED` : `${results.filter(ok => !ok).length} OF ${results.length} CHECKS FAILED`)
        if (keepOpen) {
            log('Leaving the browser open; close it when done.')
            await new Promise(resolve => context.on('close', resolve))
        }
    } catch (e) {
        log('error', hide(e.message))
        process.exitCode = 1
    } finally {
        await context.close().catch(() => {})
    }
    if (results.some(ok => !ok)) process.exitCode = 1
})()
