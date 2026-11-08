// What the scripts in this folder share: --option parsing, sleep, the WebDriver
// BiDi client for a Firefox started with --remote-debugging-port 9222, and the
// .env and build checks and the logging of the two sign-in tests.

const fs = require('fs')
const path = require('path')

// opt('--x') takes --x <value>, flag('--x') takes --x; both remove what they
// read, so args is left with the positional arguments.
const parseArgs = () => {
    const args = process.argv.slice(2)
    const opt = name => {
        const i = args.indexOf(name)
        return i >= 0 ? args.splice(i, 2)[1] : undefined
    }
    const flag = name => {
        const i = args.indexOf(name)
        return i >= 0 ? (args.splice(i, 1), true) : false
    }
    return { args, opt, flag }
}

const sleep = ms => new Promise(r => setTimeout(r, ms))

const connectBidi = () => {
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
    return { ws, send }
}

// Loads .env and exits with 2 unless the second account is in it and the dev
// build in `build` (a dist-dev-<browser> folder) is there and new enough.
// Returns the accounts, and the passwords for hiding in logs.
const checkEnv = ({ dryRun, build, skipBuildCheck }) => {
    require('dotenv').config({ path: path.join(__dirname, '..', '.env') })
    const second = { username: process.env.REDDIT_SECOND_USERNAME || '', password: process.env.REDDIT_SECOND_PASSWORD || '' }
    const main = { username: process.env.REDDIT_MAIN_USERNAME || '', password: process.env.REDDIT_MAIN_PASSWORD || '' }
    const secrets = [second.password, main.password].filter(Boolean)
    if (!dryRun && (!second.username || !second.password)) {
        console.error('Add REDDIT_SECOND_USERNAME and REDDIT_SECOND_PASSWORD to .env first.')
        process.exit(2)
    }
    const file = path.join(build, 'background.js')
    if (!skipBuildCheck && (!fs.existsSync(file) || !fs.readFileSync(file, 'utf8').includes('dev-viewer-connect-start'))) {
        const name = path.basename(build)
        console.error(`${name} is missing or too old: run yarn build-${name.replace('dist-dev-', '')}-dev first.`)
        process.exit(2)
    }
    return { second, main, secrets }
}

// The sign-in tests' log: each line stamped, with the passwords hidden, on the
// screen and in logFile. check logs a PASS or FAIL and keeps it in results.
const signinLog = (logFile, secrets) => {
    const hide = text => secrets.reduce((t, s) => t.split(s).join('***'), String(text))
    const log = (...parts) => {
        const line = hide(`${new Date().toISOString().slice(11, 19)} ${parts.join(' ')}`)
        fs.appendFileSync(logFile, `${line}\n`)
        console.log(line)
    }
    const results = []
    const check = (ok, what) => {
        results.push(ok)
        log(ok ? 'PASS' : 'FAIL', what)
    }
    return { hide, log, results, check }
}

module.exports = { parseArgs, sleep, connectBidi, checkEnv, signinLog }
