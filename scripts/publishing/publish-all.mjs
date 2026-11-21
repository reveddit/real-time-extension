// Synced from the shared source (see shared.json): change it there, not here.
//
// Publish the current version to each store, in the order shared.json lists them
// (a store whose step waits for you goes before Firefox, whose step only waits on
// AMO). The checks shared.json names (the preflight, say) run first. Each store
// script builds its own fresh production artifact. A store that fails doesn't stop
// the others, and each store that takes the version is recorded (common.mjs), so
// running this again publishes only to the stores still missing it, and skips the
// checks that passed for this code. Ctrl+C kills the current child and aborts.
import { spawn, spawnSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'
import {
    ROOT, SETTINGS, c, getManifest, readPublishStatus, writePublishStatus, headCommit, extensionChangedSince,
    descriptionChangedSince, assertVersionInDescription, assertCleanBuildInputs, assertSameCodeForVersion,
    assertNodeVersion, installLockedDependencies, releaseEnv, logPublishEvent,
} from './common.mjs'
import { STORE_NAMES } from './settings.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const stores = SETTINGS.stores
const name = store => STORE_NAMES[store]
// How each store's listing gets a description reworded after it has the version
const LISTING = {
    chrome: "paste the current one into Chrome's dashboard if it isn't there",
    edge: "paste the current one into Partner Center if it isn't there",
    firefox: 'yarn publish:firefox:text updates it',
}

let current = null
let aborted = false
process.on('SIGINT', () => {
    console.log('\n' + c.red('✖ Publishing aborted by user'))
    aborted = true
    current?.kill('SIGINT')
    process.exit(130)
})

const run = store =>
    new Promise((resolve, reject) => {
        const script = `publish-${store}.mjs`
        current = spawn(process.execPath, [path.join(HERE, script)], { stdio: 'inherit', cwd: ROOT })
        current.on('close', code => {
            current = null
            code === 0 ? resolve() : reject(new Error(`${script} exited with code ${code}`))
        })
        current.on('error', err => {
            current = null
            reject(err)
        })
    })

// A check every release passes before any store gets it, run as `yarn <script>`.
// One that passed, or was skipped with its skipFlag, for this exact code isn't run
// again, so a rerun that only finishes the stores a failure left starts at once,
// unless its `remember` is false: then it runs each time (it may cache itself).
function runCheck(status, check) {
    const label = check.label || `yarn ${check.script}`
    const done = check.remember !== false && status.checks[check.script]
    if (done && !extensionChangedSince(done.commit)) {
        console.log(c.green(`✔ ${label} ${done.skipped ? 'was skipped' : 'already passed'} for this code (${done.at}), skipping it\n`))
        return
    }
    if (check.skipFlag && process.argv.includes(check.skipFlag)) {
        console.log(c.yellow(`⚠ ${label} not run (${check.skipFlag})\n`))
        logPublishEvent({ event: 'check skipped', check: label, reason: check.skipFlag })
        pinResult(status, check, { skipped: true })
        return
    }
    console.log(c.yellow(`Running yarn ${check.script}...`))
    if (spawnSync('yarn', [check.script], { cwd: ROOT, stdio: 'inherit', env: releaseEnv() }).status !== 0) {
        console.error(c.red(`${label} failed, so nothing was published.`))
        if (check.skipFlag) console.error(`To publish without it, run ${c.bold(`yarn publish:all ${check.skipFlag}`)}.`)
        process.exit(1)
    }
    pinResult(status, check, {})
}

// Only committed code pins a check's result: with local edits, the next run checks again
function pinResult(status, check, result) {
    const head = headCommit()
    if (check.remember === false || extensionChangedSince(head)) return
    status.checks[check.script] = { commit: head, at: new Date().toISOString(), ...result }
    writePublishStatus(status)
}

const { version } = getManifest()
const publishedAt = store => readPublishStatus().published[store]
console.log(c.cyan(`🚀 Publish all ${version}: ${stores.map(name).join(' → ')} (each builds fresh prod)\n`))

// Before the checks, so a refusal comes at once (each store's script checks again)
assertVersionInDescription(version)
assertCleanBuildInputs()
assertSameCodeForVersion()
assertNodeVersion()
if (stores.every(publishedAt)) {
    console.log(c.green(`✔ Every store already has ${version}.`))
    process.exit(0)
}
// The checks test the dependencies the stores' builds get
installLockedDependencies()
const status = readPublishStatus()
for (const check of SETTINGS.checks) runCheck(status, check)

// The description reworded since a store got this version (the code is the same)
const recorded = readPublishStatus().commit
const reworded = !!recorded && descriptionChangedSince(recorded)

const unconfirmed = []
for (const store of stores) {
    if (aborted) break
    const when = publishedAt(store)
    if (when) {
        console.log(c.green(`✔ ${name(store)} already has ${version} (${when}), skipping`))
        if (reworded) console.log(c.yellow(`  Its listing text is from an earlier STORE_DESCRIPTION.txt: ${LISTING[store]}.`))
        continue
    }
    try {
        await run(store)
        // Exited cleanly without recording it: the store didn't confirm it (Edge
        // still processing the submission, say)
        if (!publishedAt(store)) unconfirmed.push(store)
    } catch (error) {
        if (aborted) break
        // One store failing doesn't stop the others
        console.error(c.red(`Failed: ${error.message}`))
    }
}

if (!aborted) {
    // A store counts once its script recorded it, not because it exited cleanly
    const missing = stores.filter(store => !publishedAt(store))
    const notConfirmed = missing.filter(store => unconfirmed.includes(store))
    const notPublished = missing.filter(store => !unconfirmed.includes(store))
    logPublishEvent({
        event: 'publish:all finished',
        published: stores.filter(publishedAt),
        ...(notPublished.length && { failed: notPublished }),
        ...(notConfirmed.length && { unconfirmed: notConfirmed }),
    })
    if (!missing.length) {
        console.log('\n' + c.green(`✔ Every store has ${version}!`))
    } else {
        console.log('')
        if (notPublished.length) console.error(c.red(`✖ Not published: ${notPublished.map(name).join(', ')} (see its output above)`))
        if (notConfirmed.length) console.error(c.yellow(`⚠ Not confirmed by the store: ${notConfirmed.map(name).join(', ')} (see its output above)`))
        console.log(
            `Fix that, then run ${c.bold('yarn publish:all')} again. It publishes only to the stores still missing ${version}, ` +
                'and skips the checks that already passed for this code.',
        )
        process.exit(1)
    }
}
