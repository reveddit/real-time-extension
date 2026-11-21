// Synced from the shared source (see shared.json): change it there, not here.
//
// What the store publish scripts share: the extension's settings (shared.json,
// modules.publish), the checks a publish makes before it builds, the record of
// which store has the current version (.publish-status.json), the publish log
// (.publish-log.jsonl), and the pause for a listing a store's API can't set.
// Nothing beyond node: .env through ../lib/env.mjs, the clipboard through
// pbcopy, links through `open`, and AMO's JWT through node:crypto.
import fs from 'fs'
import path from 'path'
import readline from 'readline'
import crypto from 'crypto'
import { spawnSync } from 'child_process'
import { fileURLToPath } from 'url'
import { loadDotEnv } from '../lib/env.mjs'
import { STORE_NAMES, settingsProblems, withDefaults, hasChangelogEntry, versionLineExample } from './settings.mjs'

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
export const DESCRIPTION = 'STORE_DESCRIPTION.txt'
export const FILES = {
    manifest: path.join(ROOT, 'src', 'manifest.json'),
    description: path.join(ROOT, DESCRIPTION),
    status: path.join(ROOT, '.publish-status.json'),
    log: path.join(ROOT, '.publish-log.jsonl'),
}
// What each store's build makes (the Firefox build's folder is what AMO signs)
export const ARTIFACTS = {
    chrome: path.join(ROOT, 'chrome.zip'),
    edge: path.join(ROOT, 'edge.zip'),
    firefox: path.join(ROOT, 'dist-firefox'),
}

loadDotEnv()

// ansi
export const c = {
    red: s => `\x1b[31m${s}\x1b[0m`,
    green: s => `\x1b[32m${s}\x1b[0m`,
    yellow: s => `\x1b[33m${s}\x1b[0m`,
    magenta: s => `\x1b[35m${s}\x1b[0m`,
    cyan: s => `\x1b[36m${s}\x1b[0m`,
    bold: s => `\x1b[1m${s}\x1b[0m`,
    dim: s => `\x1b[2m${s}\x1b[0m`,
}

// Why a store's run stopped, for the publish log
let failureReason = ''

// Stop the run: `message` in red, then `hint`. `reason` is what the publish log keeps.
export function stop(message, hint = '', reason = '') {
    if (reason) failureReason = reason
    console.error(c.red(message))
    if (hint) console.error(hint)
    process.exit(1)
}

// shared.json's modules.publish, with the defaults filled in
export const SETTINGS = (() => {
    let publish
    try {
        publish = JSON.parse(fs.readFileSync(path.join(ROOT, 'shared.json'), 'utf8')).modules?.publish
    } catch (error) {
        stop(`Can't read the publish settings in shared.json: ${error.message}`)
    }
    const problems = settingsProblems(publish)
    if (problems.length) stop(`shared.json's publish settings: ${problems.join('; ')}.`)
    return withDefaults(publish)
})()

// In CI and other runs with no terminal, the interactive steps (the listing
// pause, the token refresh) are skipped or fail fast instead of hanging on a
// prompt nobody will answer. PUBLISH_TEST_INTERACTIVE is for the tests, which
// answer the prompts through a pipe.
export const isInteractive = () => (process.stdin.isTTY || process.env.PUBLISH_TEST_INTERACTIVE === '1') && !process.env.CI

export function setupAbortHandler() {
    process.on('SIGINT', () => {
        console.log('\n' + c.red('✖ Aborted'))
        process.exit(130)
    })
}

export function requireEnv(keys) {
    const missing = keys.filter(k => !process.env[k])
    if (missing.length) {
        stop(
            `Error: missing environment variables: ${missing.join(', ')}`,
            'Set them in .env (see .env.example) or the environment.',
            'missing environment variables',
        )
    }
}

export function getManifest() {
    return JSON.parse(fs.readFileSync(FILES.manifest, 'utf8'))
}

export function readDescription() {
    try {
        return fs.readFileSync(FILES.description, 'utf8').trim()
    } catch {
        console.warn(c.yellow(`Warning: no description file at ${FILES.description}`))
        return null
    }
}

// Refuse a version with no release note: the build would stop on it anyway,
// later, after the checks
export function assertVersionInDescription(version) {
    if (hasChangelogEntry(readDescription(), version, SETTINGS.versionLine)) return
    stop(
        `${DESCRIPTION} has no VERSION HISTORY entry for ${version}.`,
        `Add "${versionLineExample(SETTINGS.versionLine, version)}" at the top of VERSION HISTORY, with its note on the next line.`,
        'no release note for this version',
    )
}

// Stop unless shared.json lists `store` among the extension's stores
export function assertStore(store) {
    if (SETTINGS.stores.includes(store)) return
    stop(`${STORE_NAMES[store]} isn't one of this extension's stores: shared.json's publish stores are ${SETTINGS.stores.join(', ')}.`)
}

export function prompt(query) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    return new Promise(resolve => {
        rl.on('SIGINT', () => {
            rl.close()
            console.log('\n' + c.red('✖ Aborted'))
            process.exit(130)
        })
        rl.question(query, answer => {
            rl.close()
            resolve(answer)
        })
    })
}

export function copyToClipboard(text, label = 'Text') {
    const r = spawnSync('pbcopy', { input: text })
    if (r.status === 0) {
        console.log(c.green(`✔ ${label} copied to clipboard!`))
        return true
    }
    console.log(c.yellow(`⚠ Could not copy ${label.toLowerCase()} to clipboard.`))
    return false
}

export function openUrl(url) {
    if (!isInteractive()) return
    spawnSync('open', [url], { stdio: 'ignore' })
}

// Which stores already have the current manifest version, so a publish:all that
// failed partway finishes when it's run again: it skips those stores. Kept in
// .publish-status.json (gitignored); deleting it starts over. Publishing needs the
// build inputs committed (assertCleanBuildInputs), so the commit recorded there is
// what the stores got.

// What the built extension is made from: every tracked file but shared.json's
// notBuildInputs and these scripts' own files (the dependencies count). One
// version must not ship different code to different stores.
const OWN_FILES = ['.publish-status.json', '.publish-log.jsonl', 'web-ext-artifacts', SETTINGS.sourceZip]
const BUILD_INPUTS = ['.', ...[...SETTINGS.notBuildInputs, ...OWN_FILES].map(p => `:(exclude)${p}`)]
// The store description reaches the build through its release notes. When the
// extension doesn't show them (its build reads them only to refuse a version
// without one), rewording the description after a store has the version leaves
// the code the same, like any listing text, so the same-code checks leave it out.
// It still has to be committed (assertCleanBuildInputs): the listings and
// Firefox's source zip come from it. When the extension shows them, a reworded
// note is new code.
const CODE_INPUTS = SETTINGS.showsReleaseNotes ? BUILD_INPUTS : [...BUILD_INPUTS, `:(exclude)${DESCRIPTION}`]

function git(...args) {
    const r = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8' })
    return { ok: r.status === 0, out: (r.stdout || '').trim() }
}

export const headCommit = () => git('rev-parse', 'HEAD').out

// Whether the extension's code differs from `commit`, committed or not. A missing
// commit, or one git can't find, counts as changed.
export const extensionChangedSince = commit => !commit || !git('diff', '--quiet', commit, '--', ...CODE_INPUTS).ok
// Whether the store description differs from `commit`'s, the same way
export const descriptionChangedSince = commit => !commit || !git('diff', '--quiet', commit, '--', DESCRIPTION).ok

// The build inputs' uncommitted and untracked changes, one per line ('' for none),
// every untracked file whatever status.showUntrackedFiles says
function buildInputChanges() {
    const status = git('status', '--porcelain', '--untracked-files=all', '--', ...BUILD_INPUTS)
    return status.ok ? status.out : '(git status failed)'
}

// Stop unless the build inputs match HEAD, so HEAD is what a build ships (and the
// Firefox source zip, made from that commit, matches the build).
export function assertCleanBuildInputs() {
    const changes = buildInputChanges()
    if (!changes) return
    stop(
        "The extension's files have uncommitted or untracked changes:\n" + changes,
        'Commit or stash them first, so the version in each store is a commit.',
        'uncommitted changes',
    )
}

// Stop unless this is the Node that .nvmrc names, which Mozilla's reviewers rebuild
// with, so their build comes out the same.
export function assertNodeVersion() {
    let wanted = ''
    try {
        wanted = fs.readFileSync(path.join(ROOT, '.nvmrc'), 'utf8').trim().replace(/^v/, '')
    } catch {
        // missing: nothing names the version, so it's refused below
    }
    const running = process.version.slice(1)
    if (wanted && (running === wanted || running.startsWith(`${wanted}.`))) return
    stop(
        `This is Node ${running}, but .nvmrc names ${wanted || 'no version'}, which Mozilla's reviewers rebuild with.`,
        'Switch with `nvm use`, then run it again.',
        'not the Node version .nvmrc names',
    )
}

// Stop when a store already has this version from other code: one version must
// be the same code in every store.
export function assertSameCodeForVersion() {
    const status = readPublishStatus()
    // AMO may hold a Firefox submission whose run stopped before recording it
    // (publish-firefox.mjs), so other code under this version can't go out
    const otherFirefox =
        !status.published.firefox && (status.firefoxSubmissions || []).find(s => extensionChangedSince(s.commit))
    if (otherFirefox) {
        stop(
            `A Firefox submission of ${status.version} from ${otherFirefox.commit?.slice(0, 7) || 'uncommitted files'} (${otherFirefox.at}) didn't finish, ` +
                "so AMO may have that code, and the extension's files differ from it.",
            'Bump the version and add its VERSION HISTORY line. If you know AMO never got it, delete firefoxSubmissions from .publish-status.json.',
            'AMO may have this version from other code',
        )
    }
    const already = Object.keys(status.published)
    if (already.length && extensionChangedSince(status.commit)) {
        stop(
            `${already.map(s => STORE_NAMES[s] || s).join(', ')} already got ${status.version} from ${status.commit?.slice(0, 7)}, and the extension's files have changed since.`,
            'Bump the version and add its VERSION HISTORY line, so every store gets the same code for one version.',
            'another store has this version from other code',
        )
    }
}

export function readPublishStatus() {
    const { version } = getManifest()
    try {
        const status = JSON.parse(fs.readFileSync(FILES.status, 'utf8'))
        if (status.version === version) return { ...status, published: status.published || {}, checks: status.checks || {} }
    } catch {
        // missing or unreadable: nothing recorded yet
    }
    return { version, published: {}, checks: {} }
}

export function writePublishStatus(status) {
    fs.writeFileSync(FILES.status, JSON.stringify(status, null, 2) + '\n')
}

// Install the dependencies yarn.lock names, which a reviewer's rebuild installs:
// a merge or checkout can change yarn.lock without anyone running yarn install
export function installLockedDependencies() {
    if (spawnSync('yarn', ['install', '--immutable'], { cwd: ROOT, stdio: 'inherit' }).status === 0) return
    stop(
        "yarn install --immutable failed, so the build wouldn't use the dependencies yarn.lock names.",
        '',
        'yarn install --immutable failed',
    )
}

// The environment a release's checks and builds run in, without shared.json's
// clearEnv: variables that make test builds, so one exported in the shell can't
// reach a store, or make a check test a build other than the one that ships
export function releaseEnv() {
    const env = { ...process.env }
    for (const name of SETTINGS.clearEnv) delete env[name]
    return env
}

// Build a store's production artifact right before it's uploaded, so nothing stale
// or dev ships, after the checks above (here too, so a standalone publish:<store>
// can't give a store other code under a version another store has). Returns the
// commit built, which the store script hands to markPublished: HEAD can move
// while a store's step waits on you.
export function buildFresh(store) {
    assertCleanBuildInputs()
    assertSameCodeForVersion()
    assertNodeVersion()
    const commit = headCommit()
    installLockedDependencies()
    const script = SETTINGS.build[store]
    const artifact = store === 'firefox' ? path.join(ARTIFACTS.firefox, 'manifest.json') : ARTIFACTS[store]
    console.log(c.yellow(`Building fresh production package (yarn ${script})...`))
    const build = spawnSync('yarn', [script], { cwd: ROOT, stdio: 'inherit', env: releaseEnv() })
    if (build.status !== 0 || !fs.existsSync(artifact)) stop(`yarn ${script} failed.`, '', `yarn ${script} failed`)
    // A file edited while the build ran may be in the build but not in the commit
    if (buildInputChanges() || extensionChangedSince(commit)) {
        stop(
            "The extension's files changed while it was building, so the build may not match the commit.",
            'Commit or undo the change, then run it again.',
            'files changed during the build',
        )
    }
    return commit
}

// Every publish action, appended and never rewritten, in .publish-log.jsonl
// (gitignored). .publish-status.json resets with each version; this is the
// history of what went to which store and when. `yarn publish:log` prints it.
let publishedThisRun = false

export function logPublishEvent(event) {
    try {
        const entry = { at: new Date().toISOString(), version: getManifest().version, commit: headCommit().slice(0, 7), ...event }
        fs.appendFileSync(FILES.log, JSON.stringify(entry) + '\n')
    } catch {
        // A publish never stops for its log
    }
}

// The start of a store's run: Ctrl+C aborts it, and the log gets its start now and,
// on exit, whether it published, failed, was aborted, or exited without the store
// confirming it
export function startRun(store) {
    setupAbortHandler()
    logPublishEvent({ store, event: 'started' })
    process.on('exit', code => {
        if (publishedThisRun) return
        const event = code === 0 ? 'unconfirmed' : code === 130 ? 'aborted' : 'failed'
        logPublishEvent({ store, event, exitCode: code, ...(failureReason && { reason: failureReason }) })
    })
}

// Record that a store accepted the current version, built from `commit`. Each
// store script calls this once its store has it, whether or not publish-all
// started it.
export function markPublished(store, commit) {
    publishedThisRun = true
    logPublishEvent({ store, event: 'published', commit: commit.slice(0, 7) })
    const status = readPublishStatus()
    status.commit = status.commit || commit
    status.published[store] = new Date().toISOString()
    writePublishStatus(status)
}

// The listing step of a store whose API can't set the listing text: the
// description goes to the clipboard, the dashboard opens, and this waits for
// ENTER. `explain` lines say what the API can't do and `save` how to keep the
// edit for the submission, `enter` is the prompt, and `later` what to check by
// hand after a run with no terminal. A description edited during the pause (a
// reworded note, say) is copied again, so the listing gets the new text. When the
// extension shows its release notes, though, the package already uploaded was
// built from `commit`'s description, so a change stops the run before it submits.
export async function pauseForListing({ store, commit, url, explain, save, enter, later }) {
    for (const line of explain) console.log(line)
    if (!isInteractive()) {
        console.log(c.yellow(`⚠ Non-interactive run: ${later} after this publish.`))
        return
    }
    let description = readDescription()
    if (description) copyToClipboard(description, 'Description')
    console.log(c.magenta('📋 Dashboard: ') + url)
    openUrl(url)
    console.log(save)
    for (;;) {
        await prompt('\n' + c.bold(enter))
        if (SETTINGS.showsReleaseNotes && descriptionChangedSince(commit)) {
            stop(
                `${DESCRIPTION} changed since the package was built, and the extension shows its release notes, ` +
                    `so the package uploaded to ${STORE_NAMES[store]} has the old note. Nothing was submitted.`,
                'Commit the change, then run it again: it builds and uploads the new note.',
                'description changed during the listing step',
            )
        }
        const now = readDescription()
        if (now === description) return
        console.log(c.yellow(`${DESCRIPTION} changed since it was copied.`))
        if (now) copyToClipboard(now, 'The new description')
        description = now
    }
}

// HS256 JWT for the AMO API
export function amoJwt(issuer, secret) {
    const b64url = obj => Buffer.from(JSON.stringify(obj)).toString('base64url')
    const iat = Math.floor(Date.now() / 1000)
    const head = b64url({ alg: 'HS256', typ: 'JWT' })
    const body = b64url({ iss: issuer, jti: crypto.randomUUID(), iat, exp: iat + 60 })
    const sig = crypto.createHmac('sha256', secret).update(`${head}.${body}`).digest('base64url')
    return `${head}.${body}.${sig}`
}
