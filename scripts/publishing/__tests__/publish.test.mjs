// Synced from the shared source (see shared.json): change it there, not here.
//
// The publish flow end to end, with nothing sent anywhere. The real publish scripts
// run in a scratch git repo set up with this repo's publish settings (shared.json)
// and its .gitignore, against a fake yarn (the checks and the builds), fake pbcopy
// and open, a fake web-ext package for AMO, and a fetch stub for the stores' APIs.
// The shared source runs them with each case in PUBLISH_TEST_CASES instead.
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { execFileSync, spawn, spawnSync } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import { hasChangelogEntry, settingsProblems, versionLineExample } from '../settings.mjs'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const SCRIPTS = [
    'scripts/lib/env.mjs',
    ...['settings', 'common', 'publish-all', 'publish-chrome', 'publish-edge', 'publish-firefox', 'publish-log'].map(
        name => `scripts/publishing/${name}.mjs`,
    ),
]
const SLOW = { timeout: 60_000 }
const VERSION = '1.2.3'
const NAMES = { chrome: 'Chrome', edge: 'Edge', firefox: 'Firefox' }
const GIT_ID = ['-c', 'user.name=test', '-c', 'user.email=test@example.com', '-c', 'commit.gpgsign=false', '-c', 'core.hooksPath=/dev/null']
// Without the GIT_* variables git hands a hook (GIT_INDEX_FILE, and GIT_DIR in a
// worktree), which would point the scratch repo's git at the real one when a
// pre-commit hook runs these tests
const GIT_ENV = Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.startsWith('GIT_')))

// The settings under test: this repo's own, or each case the shared source lists
const CASES = process.env.PUBLISH_TEST_CASES
    ? JSON.parse(fs.readFileSync(process.env.PUBLISH_TEST_CASES, 'utf8'))
    : [
          {
              name: "this repo's shared.json",
              settings: JSON.parse(fs.readFileSync(path.join(ROOT, 'shared.json'), 'utf8')).modules.publish,
              gitignore: fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8'),
              repo: true,
          },
      ]

// pbcopy: FAKE_REWORD_ON_COPY edits the description the first time, as you might
// while a listing step waits
const FAKE_PBCOPY = `#!/bin/sh
cat > /dev/null
echo pbcopy >> "$FAKE_LOG"
if [ -n "$FAKE_REWORD_ON_COPY" ] && [ ! -e "$FAKE_LOG.reworded" ]; then
    : > "$FAKE_LOG.reworded"
    echo 'Reworded while the listing step waited.' >> STORE_DESCRIPTION.txt
fi
`
const FAKE_OPEN = `#!/bin/sh
echo "open $*" >> "$FAKE_LOG"
`

// FAKE_AMO: ok (default), exists (AMO already has the version) or fail (no answer).
// It lists the source zip it's handed, and FAKE_ZIP_SHOW names a file in it to print.
const FAKE_WEB_EXT = `import fs from 'fs'
import path from 'path'
import { execFileSync } from 'child_process'
const log = line => fs.appendFileSync(process.env.FAKE_LOG, line + '\\n')
export default {
    cmd: {
        async sign(opts) {
            const zip = opts.uploadSourceCode
            const there = !!zip && fs.existsSync(zip)
            log(\`sign approvalTimeout=\${opts.approvalTimeout} source=\${there ? path.basename(zip) : 'missing'}\`)
            if (there) {
                const files = execFileSync('unzip', ['-Z1', zip], { encoding: 'utf8' }).split('\\n').filter(f => f && !f.endsWith('/'))
                log('zip ' + JSON.stringify(files.sort()))
                const show = process.env.FAKE_ZIP_SHOW
                if (show) log(\`zip \${show}: \${execFileSync('unzip', ['-p', zip, show], { encoding: 'utf8' }).trim()}\`)
            }
            if (process.env.FAKE_AMO === 'exists') throw new Error('Submission failed (2): Bad Request\\n{"version": ["Version already exists."]}')
            if (process.env.FAKE_AMO === 'fail') throw new Error('Submission failed (2): 503.')
        },
    },
}
`

// FAKE_CHROME=fail: the submit answers without OK. FAKE_CHROME_UPLOAD or
// FAKE_CHROME_SUBMIT=<status>: that call answers Google's error body with that
// HTTP status. FAKE_EDGE: ok, unauthorized, refuse-package, refuse-submit or slow
// (the submission never settles). FAKE_COMMIT_DURING_SUBMIT: other code is
// committed while a store's step waits. FAKE_CTRL_C: the first store call gets
// Ctrl+C, as at a store's prompt (only that store's script sees it, and exits 130).
const STUB_FETCH = `import fs from 'fs'
import { execFileSync } from 'child_process'
const log = line => fs.appendFileSync(process.env.FAKE_LOG, line + '\\n')
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
const accepted = operation => new Response(null, { status: 202, headers: { location: operation } })
const googleError = status => json({ error: { code: Number(status), message: 'Backend Error', status: 'UNAVAILABLE' } }, Number(status))
const GIT_ID = ${JSON.stringify(GIT_ID)}
function commitLater() {
    if (!process.env.FAKE_COMMIT_DURING_SUBMIT) return
    fs.writeFileSync('src/later.ts', 'export const later = 1\\n')
    execFileSync('git', [...GIT_ID, 'add', '-A'])
    execFileSync('git', [...GIT_ID, 'commit', '-qm', 'later'])
}
globalThis.fetch = async (url, init = {}) => {
    const u = String(url)
    const method = init.method || 'GET'
    log(\`fetch \${method} \${u}\`)
    if (process.env.FAKE_CTRL_C) {
        process.kill(process.pid, 'SIGINT')
        await new Promise(() => setInterval(() => {}, 1000)) // waits, as at a prompt, for the signal
    }
    if (u === 'https://oauth2.googleapis.com/token') return json({ access_token: 'token' })
    if (u.startsWith('https://www.googleapis.com/upload/chromewebstore/')) {
        return process.env.FAKE_CHROME_UPLOAD ? googleError(process.env.FAKE_CHROME_UPLOAD) : json({ uploadState: 'SUCCESS' })
    }
    if (u.startsWith('https://www.googleapis.com/chromewebstore/') && u.endsWith('/publish')) {
        if (process.env.FAKE_CHROME_SUBMIT) return googleError(process.env.FAKE_CHROME_SUBMIT)
        commitLater()
        return json({ status: [process.env.FAKE_CHROME === 'fail' ? 'NOT_AUTHORIZED' : 'OK'] })
    }
    if (u.startsWith('https://api.addons.microsoftedge.microsoft.com/')) {
        const mode = process.env.FAKE_EDGE || 'ok'
        if (mode === 'unauthorized') return json({ message: 'Unauthorized' }, 401)
        if (method === 'POST' && u.endsWith('/submissions/draft/package')) return accepted('op-package')
        if (u.endsWith('/operations/op-package')) {
            return json(mode === 'refuse-package' ? { status: 'Failed', errorCode: 'InvalidPackage', message: 'The package is not valid.' } : { status: 'Succeeded' })
        }
        if (method === 'POST' && u.endsWith('/submissions')) {
            commitLater()
            return accepted('op-submit')
        }
        if (u.endsWith('/operations/op-submit')) {
            if (mode === 'slow') return json({ status: 'InProgress' })
            if (mode === 'refuse-submit') return json({ status: 'Failed', errorCode: 'InProgressSubmission', message: 'A submission is in review.' })
            return json({ status: 'Succeeded' })
        }
    }
    if (u.startsWith('https://addons.mozilla.org/')) {
        if (init.body) log('amo description ' + JSON.stringify(JSON.parse(init.body).description['en-US']))
        return json({})
    }
    throw new Error('unexpected fetch: ' + u)
}
`

describe('the VERSION HISTORY entry', () => {
    const history = line => `Text.\n\nVERSION HISTORY:\n${line}\nA note.\n`
    it('is found the way each kind of build reads it: the version line, then a note', () => {
        expect(hasChangelogEntry(history('1.2.3'), '1.2.3', 'version')).toBe(true)
        expect(hasChangelogEntry(history('2026/11/17 - 1.2.3'), '1.2.3', 'version')).toBe(false)
        expect(hasChangelogEntry(history('2026/11/17 - 1.2.3'), '1.2.3', 'date - version')).toBe(true)
        expect(hasChangelogEntry(history('2026/11/17-1.2.3'), '1.2.3', 'date - version')).toBe(true)
        expect(hasChangelogEntry(history('1.2.3'), '1.2.3', 'date - version')).toBe(false)
        expect(hasChangelogEntry(history('2026/11/17 - 1.2.3'), '1.2.3', 'either')).toBe(true)
        expect(hasChangelogEntry(history('1.2.3'), '1.2.3', 'either')).toBe(true)
        for (const form of ['version', 'date - version', 'either']) {
            expect(hasChangelogEntry(history(form === 'version' ? '1.2.30' : '2026/11/17 - 1.2.30'), '1.2.3', form)).toBe(false)
            expect(hasChangelogEntry('Text that mentions 1.2.3 but has no history.', '1.2.3', form)).toBe(false)
            expect(hasChangelogEntry(`VERSION HISTORY:\n${versionLineExample(form, '1.2.3')}\n`, '1.2.3', form)).toBe(false)
            expect(hasChangelogEntry(`VERSION HISTORY:\n${versionLineExample(form, '1.2.3')}\n- \n`, '1.2.3', form)).toBe(false)
            expect(hasChangelogEntry(`VERSION HISTORY:\n${versionLineExample(form, '1.2.3')}\n- a note\n`, '1.2.3', form)).toBe(true)
        }
    })
})

describe('the publish settings', () => {
    const fine = { stores: ['chrome'], showsReleaseNotes: true, versionLine: 'version', notBuildInputs: ['tests'] }
    it('are checked before anything runs', () => {
        expect(settingsProblems(fine)).toEqual([])
        expect(settingsProblems(undefined)).toHaveLength(1)
        expect(settingsProblems({ ...fine, showReleaseNotes: true })).toContain('unknown setting "showReleaseNotes"')
        expect(settingsProblems({ ...fine, stores: ['chrome', 'safari'] })).toHaveLength(1)
        expect(settingsProblems({ ...fine, stores: ['chrome', 'chrome'] })).toHaveLength(1)
        expect(settingsProblems({ ...fine, showsReleaseNotes: false })).toContain('notesGlobal is missing (showsReleaseNotes is false)')
        expect(settingsProblems({ ...fine, versionLine: 'dated' })).toHaveLength(1)
        expect(settingsProblems({ ...fine, build: { edge: 'build-edge' } })).toContain("build names edge, which isn't in stores")
        expect(settingsProblems({ ...fine, checks: [{ script: 'preflight', skip: '--x' }] })).toHaveLength(1)
        expect(settingsProblems({ ...fine, checks: [{ script: 'preflight', remember: 'no' }] })).toHaveLength(1)
        expect(settingsProblems({ ...fine, checks: [{ script: 'preflight', remember: false, skipFlag: '--skip-it' }] })).toEqual([])
        expect(settingsProblems({ ...fine, clearEnv: ['NOT A NAME'] })).toHaveLength(1)
        expect(settingsProblems({ ...fine, sourceZip: '../source.zip' })).toHaveLength(1)
        expect(settingsProblems({ ...fine, notBuildInputs: [':(exclude)src'] })).toHaveLength(1)
        const { versionLine, ...missing } = fine
        expect(settingsProblems(missing)).toContain('versionLine is missing')
    })
})

describe.each(CASES)('publishing with $name', kase => {
    const settings = kase.settings
    const stores = settings.stores
    const checks = settings.checks || [{ script: 'preflight' }]
    const BUILD = { chrome: 'build-chrome', edge: 'build-edge', firefox: 'build-firefox', ...settings.build }
    const sourceZip = settings.sourceZip || 'source.zip'
    const FAIL = { chrome: { FAKE_CHROME: 'fail' }, edge: { FAKE_EDGE: 'refuse-submit' }, firefox: { FAKE_AMO: 'fail' } }
    let tmp, repo, log

    const write = (file, text) => {
        fs.mkdirSync(path.dirname(path.join(repo, file)), { recursive: true })
        fs.writeFileSync(path.join(repo, file), text)
    }
    const read = file => fs.readFileSync(path.join(repo, file), 'utf8')
    const exists = file => fs.existsSync(path.join(repo, file))
    const git = (...args) => execFileSync('git', [...GIT_ID, ...args], { cwd: repo, encoding: 'utf8', env: GIT_ENV }).trim()
    const commitAll = message => {
        git('add', '-A')
        git('commit', '-qm', message)
    }
    const description = (version, note) =>
        `A description.\n\nVERSION HISTORY:\n${versionLineExample(settings.versionLine, version, new Date(2026, 10, 20))}\n${note || `A note for ${version}.`}\n`
    const setVersion = (version, note) => {
        write('src/manifest.json', JSON.stringify({ version }))
        write('STORE_DESCRIPTION.txt', description(version, note))
    }
    const status = () => JSON.parse(read('.publish-status.json'))
    const published = () => (exists('.publish-status.json') ? Object.keys(status().published).sort() : [])
    const events = () =>
        exists('.publish-log.jsonl')
            ? read('.publish-log.jsonl')
                  .split('\n')
                  .filter(Boolean)
                  .map(line => JSON.parse(line))
            : []
    const calls = () => fs.readFileSync(log, 'utf8').split('\n').filter(Boolean)
    // The stores whose build ran, in order
    const built = lines => lines.map(l => stores.find(s => l === `yarn ${BUILD[s]}`)).filter(Boolean)
    const ran = (lines, script) => lines.includes(`yarn ${script}`)
    const sorted = list => [...list].sort()

    // The fake yarn. FAKE_FAILS=<script> fails that script, FAKE_EDIT_DURING=<script>
    // edits the extension while it runs. Each build makes its store's artifact, and
    // the clearEnv variables each script saw go to $FAKE_LOG.env.
    function fakeYarn() {
        const make = {
            chrome: 'echo zip > chrome.zip',
            edge: 'echo zip > edge.zip',
            firefox: `mkdir -p dist-firefox && echo '{"browser_specific_settings":{"gecko":{"id":"test@example.com"}}}' > dist-firefox/manifest.json`,
        }
        const envs = (settings.clearEnv || []).map(n => ` ${n}=\${${n}-unset}`).join('')
        return [
            '#!/bin/sh',
            'echo "yarn $*" >> "$FAKE_LOG"',
            envs ? `echo "$1${envs}" >> "$FAKE_LOG.env"` : '',
            `if [ "$1" = "$FAKE_EDIT_DURING" ]; then echo '// edited' >> src/main.ts; fi`,
            'if [ "$1" = "$FAKE_FAILS" ]; then exit 1; fi',
            'case "$1" in',
            ...stores.map(store => `    ${BUILD[store]}) ${make[store]} ;;`),
            'esac',
            'exit 0',
            '',
        ].join('\n')
    }

    // A committed file at a path each of notBuildInputs covers
    function outsideFiles() {
        return settings.notBuildInputs
            .filter(p => !['.gitignore', 'shared.json', 'shared.lock.json'].includes(p))
            .map(p => p.replace(/\*/g, 'x'))
            .map(p => (exists(p) && fs.statSync(path.join(repo, p)).isDirectory() ? `${p}/x.txt` : p))
    }

    function env(extra) {
        return {
            PATH: `${path.join(tmp, 'bin')}${path.delimiter}${process.env.PATH}`,
            HOME: process.env.HOME,
            TMPDIR: os.tmpdir(),
            NODE_OPTIONS: `--import=${pathToFileURL(path.join(tmp, 'stub-fetch.mjs')).href}`,
            FAKE_LOG: log,
            CI: '1',
            CHROME_EXTENSION_ID: 'ext',
            CHROME_CLIENT_ID: 'id',
            CHROME_CLIENT_SECRET: 'secret',
            CHROME_REFRESH_TOKEN: 'refresh',
            EDGE_PRODUCT_ID: 'product',
            EDGE_CLIENT_ID: 'client',
            EDGE_API_KEY: 'key',
            EDGE_POLL_INTERVAL_MS: '20',
            EDGE_POLL_TIMEOUT_MS: '300',
            FIREFOX_JWT_ISSUER: 'issuer',
            FIREFOX_JWT_SECRET: 'secret',
            ...extra,
        }
    }

    const resetLog = () => {
        fs.writeFileSync(log, '')
        fs.rmSync(`${log}.env`, { force: true })
        fs.rmSync(`${log}.reworded`, { force: true })
    }

    // Runs one publish script as `node scripts/publishing/<script>` in the repo
    function run(script, extra = {}, args = []) {
        resetLog()
        const r = spawnSync(process.execPath, [path.join('scripts', 'publishing', script), ...args], {
            cwd: repo,
            encoding: 'utf8',
            env: env(extra),
        })
        return { code: r.status, out: r.stdout + r.stderr, calls: calls() }
    }

    // Runs it as if in a terminal, pressing ENTER at each "Press ENTER" prompt, up
    // to `presses` times. Then its input ends, as a pipe left open would keep it
    // running.
    function runInTerminal(script, extra = {}, presses = 1) {
        resetLog()
        return new Promise(resolve => {
            const child = spawn(process.execPath, [path.join('scripts', 'publishing', script)], {
                cwd: repo,
                env: env({ CI: '', PUBLISH_TEST_INTERACTIVE: '1', ...extra }),
            })
            let out = ''
            let pressed = 0
            child.stdout.on('data', chunk => {
                out += chunk
                const prompts = out.split('Press ENTER').length - 1
                for (; pressed < Math.min(prompts, presses); pressed++) child.stdin.write('\n')
                if (pressed === presses) child.stdin.end()
            })
            child.stderr.on('data', chunk => {
                out += chunk
            })
            child.on('close', code => resolve({ code, out, prompts: out.split('Press ENTER').length - 1, calls: calls() }))
        })
    }

    beforeEach(() => {
        tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'publish-test-'))
        repo = path.join(tmp, 'repo')
        log = path.join(tmp, 'calls.log')
        fs.mkdirSync(path.join(tmp, 'bin'))
        fs.writeFileSync(path.join(tmp, 'bin', 'yarn'), fakeYarn(), { mode: 0o755 })
        fs.writeFileSync(path.join(tmp, 'bin', 'pbcopy'), FAKE_PBCOPY, { mode: 0o755 })
        fs.writeFileSync(path.join(tmp, 'bin', 'open'), FAKE_OPEN, { mode: 0o755 })
        // Outside the repo, where node finds it walking up from scripts/publishing
        fs.mkdirSync(path.join(tmp, 'node_modules', 'web-ext'), { recursive: true })
        fs.writeFileSync(path.join(tmp, 'node_modules', 'web-ext', 'package.json'), '{"name":"web-ext","type":"module","main":"index.js"}')
        fs.writeFileSync(path.join(tmp, 'node_modules', 'web-ext', 'index.js'), FAKE_WEB_EXT)
        fs.writeFileSync(path.join(tmp, 'stub-fetch.mjs'), STUB_FETCH)

        fs.mkdirSync(repo)
        for (const file of SCRIPTS) write(file, fs.readFileSync(path.join(ROOT, file), 'utf8'))
        write('shared.json', JSON.stringify({ modules: { publish: settings } }, null, 2) + '\n')
        write('.gitignore', kase.gitignore)
        setVersion(VERSION)
        write('src/main.ts', 'export const main = 1\n')
        write('.nvmrc', `${process.version.slice(1)}\n`)
        for (const file of outsideFiles()) write(file, 'not the extension\n')
        // no template: git copies no hook samples, which a sandbox may not let it write
        git('init', '-q', '--template=')
        commitAll('start')
    })

    afterEach(() => {
        fs.rmSync(tmp, { recursive: true, force: true })
    })

    it('are valid', () => {
        expect(settingsProblems(settings)).toEqual([])
    })

    describe('yarn publish:all', () => {
        it('keeps going past a failed store, and a rerun publishes only the store still missing', SLOW, () => {
            const first = run('publish-all.mjs', FAIL[stores[0]])
            expect(first.code).toBe(1)
            for (const check of checks) expect(ran(first.calls, check.script)).toBe(true)
            expect(built(first.calls)).toEqual(stores)
            expect(first.out).toContain(`Not published: ${NAMES[stores[0]]}`)
            expect(published()).toEqual(sorted(stores.slice(1)))
            // Firefox's step returns once AMO has the version, without waiting for approval
            if (stores.includes('firefox')) expect(first.calls).toContain(`sign approvalTimeout=0 source=${sourceZip}`)

            const second = run('publish-all.mjs')
            expect(second.code).toBe(0)
            // The checks passed for this code already, so only one that caches itself runs
            for (const check of checks) expect(ran(second.calls, check.script)).toBe(check.remember === false)
            expect(built(second.calls)).toEqual([stores[0]])
            for (const store of stores.slice(1)) expect(second.out).toContain(`${NAMES[store]} already has ${VERSION}`)
            expect(published()).toEqual(sorted(stores))

            // Nothing left to do: not even yarn runs
            const third = run('publish-all.mjs')
            expect(third.code).toBe(0)
            expect(third.calls).toEqual([])
        })

        it("stops every store after one whose script was aborted (Ctrl+C at its prompt), and says what was published", SLOW, () => {
            const r = run('publish-all.mjs', { FAKE_CTRL_C: '1' })
            expect(r.code).toBe(130)
            expect(built(r.calls)).toEqual([stores[0]])
            expect(r.out).toContain('Publishing aborted by user')
            expect(r.out).toContain(`Not published: ${stores.map(s => NAMES[s]).join(', ')}`)
            expect(published()).toEqual([])
            expect(events().some(e => e.event === 'publish:all finished')).toBe(false)

            // Aborted in a later store, after one that has the version
            if (stores.length > 2 && stores[1] !== 'firefox') {
                expect(run(`publish-${stores[0]}.mjs`).code).toBe(0)
                const later = run('publish-all.mjs', { FAKE_CTRL_C: '1' })
                expect(later.code).toBe(130)
                expect(built(later.calls)).toEqual([stores[1]])
                expect(later.out).toContain(`Published: ${NAMES[stores[0]]}`)
                expect(later.out).toContain(`Not published: ${stores.slice(1).map(s => NAMES[s]).join(', ')}`)
                expect(published()).toEqual([stores[0]])
            }
        })

        it("never counts its own files as the extension's, whatever .gitignore says", SLOW, () => {
            const own = ['.publish-status.json', '.publish-log.jsonl', 'web-ext-artifacts/']
            write('.gitignore', kase.gitignore.split('\n').filter(line => !own.includes(line)).join('\n'))
            commitAll('ignore less')
            expect(run('publish-all.mjs', FAIL[stores[0]]).code).toBe(1)
            expect(exists('.publish-log.jsonl')).toBe(true)
            const rerun = run('publish-all.mjs')
            expect(rerun.out).not.toContain('uncommitted or untracked')
            expect(rerun.code).toBe(0)
        })

        it('stops before the checks while the extension has uncommitted or untracked changes', SLOW, () => {
            write('src/main.ts', 'export const main = 2\n')
            const edited = run('publish-all.mjs')
            expect(edited.code).toBe(1)
            expect(edited.calls).toEqual([])
            expect(edited.out).toContain('src/main.ts')
            for (const store of stores) expect(run(`publish-${store}.mjs`).calls).toEqual([])

            git('checkout', '--', 'src/main.ts')
            write('src/new/added.ts', 'export const added = 1\n')
            const added = run('publish-all.mjs')
            expect(added.code).toBe(1)
            expect(added.calls).toEqual([])
            expect(added.out).toContain('src/new/added.ts')
        })

        it("doesn't count changes to the files that aren't the extension's", SLOW, () => {
            for (const file of outsideFiles()) write(file, 'edited\n')
            if (settings.notBuildInputs.includes('scripts')) write('scripts/untracked.txt', 'untracked\n')
            if (settings.notBuildInputs.includes('.gitignore')) fs.appendFileSync(path.join(repo, '.gitignore'), '# edited\n')
            const r = run('publish-all.mjs')
            expect(r.out).not.toContain('uncommitted or untracked')
            expect(r.code).toBe(0)
            expect(published()).toEqual(sorted(stores))
        })

        it('refuses other code under a version a store already has, until the version is bumped', SLOW, () => {
            expect(run(`publish-${stores[0]}.mjs`).code).toBe(0)
            expect(published()).toEqual([stores[0]])

            write('src/main.ts', 'export const main = 2\n')
            commitAll('other code')
            const refused = run('publish-all.mjs')
            expect(refused.code).toBe(1)
            expect(refused.calls).toEqual([])
            expect(refused.out).toContain(`${NAMES[stores[0]]} already got ${VERSION}`)
            // A store's own script refuses too
            for (const store of stores.slice(1)) {
                const alone = run(`publish-${store}.mjs`)
                expect(alone.code).toBe(1)
                expect(alone.calls).toEqual([])
            }

            setVersion('1.2.4')
            commitAll('bump')
            expect(run('publish-all.mjs').code).toBe(0)
            expect(status().version).toBe('1.2.4')
            expect(published()).toEqual(sorted(stores))
        })

        it('stops unless Node is the version .nvmrc names', SLOW, () => {
            write('.nvmrc', '1.2.3\n')
            commitAll('another Node')
            const all = run('publish-all.mjs')
            expect(all.code).toBe(1)
            expect(all.out).toContain('.nvmrc names 1.2.3')
            expect(all.calls).toEqual([])
            for (const store of stores) {
                const alone = run(`publish-${store}.mjs`)
                expect(alone.code).toBe(1)
                expect(alone.calls).toEqual([])
            }
        })

        it("builds with yarn.lock's dependencies, and stops if the extension changes while it builds", SLOW, () => {
            const last = stores.at(-1)
            const r = run('publish-all.mjs', { FAKE_EDIT_DURING: BUILD[last] })
            for (const store of stores) expect(r.calls[r.calls.indexOf(`yarn ${BUILD[store]}`) - 1]).toBe('yarn install --immutable')
            // ...and the checks test those dependencies too
            expect(r.calls[0]).toBe('yarn install --immutable')
            expect(r.code).toBe(1)
            expect(r.out).toContain('changed while it was building')
            if (last === 'firefox') expect(r.calls.some(line => line.startsWith('sign'))).toBe(false)
            expect(published()).toEqual(sorted(stores.slice(0, -1)))

            git('checkout', '--', 'src/main.ts')
            const failed = run(`publish-${last}.mjs`, { FAKE_FAILS: 'install' })
            expect(failed.code).toBe(1)
            expect(failed.out).toContain('yarn install --immutable failed')
            expect(built(failed.calls)).toEqual([])
        })

        it.runIf(settings.clearEnv?.length)("checks and builds without the variables that make test builds", SLOW, () => {
            const set = Object.fromEntries(settings.clearEnv.map(name => [name, 'true']))
            const r = run('publish-all.mjs', set)
            expect(r.code).toBe(0)
            const seen = fs.readFileSync(`${log}.env`, 'utf8').split('\n').filter(Boolean)
            const scripts = [...checks.map(ch => ch.script), ...stores.map(s => BUILD[s])]
            for (const script of scripts) {
                expect(seen).toContain(`${script}${settings.clearEnv.map(name => ` ${name}=unset`).join('')}`)
            }
        })

        it.runIf(!settings.showsReleaseNotes && stores.length > 1)(
            'lets a reworded store description go to the stores still missing the version, since the code is the same',
            SLOW,
            () => {
                const builtFrom = git('rev-parse', 'HEAD')
                expect(run(`publish-${stores[0]}.mjs`).code).toBe(0)
                setVersion(VERSION, `A reworded note for ${VERSION}.`)
                commitAll('reword the note')
                const r = run('publish-all.mjs')
                expect(r.code).toBe(0)
                expect(built(r.calls)).toEqual(stores.slice(1))
                expect(r.out).toContain('Its listing text is from an earlier STORE_DESCRIPTION.txt')
                expect(published()).toEqual(sorted(stores))
                expect(status().commit).toBe(builtFrom)
                // AMO's listing gets the reworded note
                if (stores.slice(1).includes('firefox')) {
                    expect(r.calls).toContain(`amo description ${JSON.stringify(read('STORE_DESCRIPTION.txt').trim())}`)
                }
            },
        )

        it.runIf(settings.showsReleaseNotes)(
            'refuses a reworded release note under a version a store already has, since the extension shows it',
            SLOW,
            () => {
                expect(run(`publish-${stores[0]}.mjs`).code).toBe(0)
                setVersion(VERSION, `A reworded note for ${VERSION}.`)
                commitAll('reword the note')
                const r = run('publish-all.mjs')
                expect(r.code).toBe(1)
                expect(r.calls).toEqual([])
                expect(r.out).toContain(`${NAMES[stores[0]]} already got ${VERSION}`)
            },
        )

        it('still wants the store description committed', SLOW, () => {
            write('STORE_DESCRIPTION.txt', description(VERSION, 'Not committed.'))
            const r = run('publish-all.mjs')
            expect(r.code).toBe(1)
            expect(r.calls).toEqual([])
            expect(r.out).toContain('STORE_DESCRIPTION.txt')
        })

        it('stops before the checks, and each store script too, when VERSION HISTORY has no entry for the version', SLOW, () => {
            write('src/manifest.json', JSON.stringify({ version: '1.2.5' }))
            commitAll('no note for 1.2.5')
            const all = run('publish-all.mjs')
            expect(all.code).toBe(1)
            expect(all.out).toContain('no VERSION HISTORY entry for 1.2.5')
            expect(all.out).toContain(versionLineExample(settings.versionLine, '1.2.5'))
            expect(all.calls).toEqual([])
            for (const store of stores) expect(run(`publish-${store}.mjs`).calls).toEqual([])
        })

        it.runIf(stores.length > 1 && stores[0] !== 'firefox')(
            'records the commit a store was built from, though HEAD moves while its step waits',
            SLOW,
            () => {
                const builtFrom = git('rev-parse', 'HEAD')
                const r = run('publish-all.mjs', { FAKE_COMMIT_DURING_SUBMIT: '1' })
                expect(status().commit).toBe(builtFrom)
                // So the next store isn't given the code committed after the first one's build
                expect(r.code).toBe(1)
                expect(built(r.calls)).toEqual([stores[0]])
                expect(r.out).toContain(`${NAMES[stores[0]]} already got ${VERSION}`)
                expect(published()).toEqual([stores[0]])
            },
        )
    })

    describe('the checks before any store', () => {
        it('stop everything when one fails', SLOW, () => {
            const check = checks.at(-1)
            const r = run('publish-all.mjs', { FAKE_FAILS: check.script })
            expect(r.code).toBe(1)
            expect(r.out).toContain(`${check.label || `yarn ${check.script}`} failed, so nothing was published.`)
            expect(built(r.calls)).toEqual([])
            expect(published()).toEqual([])
        })

        it('run again once the code changes', SLOW, () => {
            // Firefox fails in its build, before AMO could hold a submission of this code
            const failAll = { ...FAIL.chrome, ...FAIL.edge, FAKE_FAILS: BUILD.firefox }
            expect(run('publish-all.mjs', failAll).code).toBe(1)
            expect(published()).toEqual([])
            const same = run('publish-all.mjs', failAll)
            for (const check of checks) expect(ran(same.calls, check.script)).toBe(check.remember === false)

            write('src/main.ts', 'export const main = 2\n')
            commitAll('other code')
            const changed = run('publish-all.mjs')
            expect(changed.code).toBe(0)
            for (const check of checks) expect(ran(changed.calls, check.script)).toBe(true)
        })

        const skippable = checks.find(check => check.skipFlag && check.remember !== false)
        it.runIf(skippable)('can be skipped with their flag, which later runs remember for this code', SLOW, () => {
            const label = skippable.label || `yarn ${skippable.script}`
            const r = run('publish-all.mjs', FAIL[stores[0]], [skippable.skipFlag])
            expect(ran(r.calls, skippable.script)).toBe(false)
            expect(r.out).toContain(`${label} not run (${skippable.skipFlag})`)
            expect(status().checks[skippable.script].skipped).toBe(true)
            expect(events().some(e => e.event === 'check skipped' && e.reason === skippable.skipFlag)).toBe(true)

            const again = run('publish-all.mjs')
            expect(again.code).toBe(0)
            expect(ran(again.calls, skippable.script)).toBe(false)
            expect(again.out).toContain(`${label} was skipped for this code`)
        })
    })

    describe('a listing step', () => {
        const listing = stores.filter(store => store !== 'firefox')
        const urls = {
            chrome: `https://chrome.google.com/${settings.chromeDashboardUser == null ? '' : `u/${settings.chromeDashboardUser}/`}webstore/devconsole/ext/edit`,
            edge: 'https://partner.microsoft.com/en-us/dashboard/microsoftedge/product/listings',
        }

        it.runIf(listing.length).each(listing)('copies the description and opens the dashboard, then submits after ENTER (%s)', SLOW, async store => {
            const r = await runInTerminal(`publish-${store}.mjs`)
            expect(r.code).toBe(0)
            expect(r.prompts).toBe(1)
            expect(r.calls).toContain('pbcopy')
            expect(r.calls).toContain(`open ${urls[store]}`)
            const submit = r.calls.findIndex(line => line.endsWith('/publish') || line.endsWith('/submissions'))
            expect(submit).toBeGreaterThan(r.calls.indexOf('pbcopy'))
            if (store === 'chrome') {
                expect(r.out).toContain('Save draft')
                if (settings.privacyFile) expect(r.out).toContain(`paste it from ${settings.privacyFile}`)
            }
            expect(published()).toEqual([store])
        })

        it.runIf(listing.length && !settings.showsReleaseNotes).each(listing)(
            'copies a description edited while it waits again, then submits (%s)',
            SLOW,
            async store => {
                const r = await runInTerminal(`publish-${store}.mjs`, { FAKE_REWORD_ON_COPY: '1' }, 2)
                expect(r.code).toBe(0)
                expect(r.prompts).toBe(2)
                expect(r.calls.filter(line => line === 'pbcopy')).toHaveLength(2)
                expect(r.out).toContain('changed since it was copied')
                expect(published()).toEqual([store])
            },
        )

        it.runIf(listing.length && settings.showsReleaseNotes).each(listing)(
            "stops before submitting when the description changes while it waits, since the package has the old note (%s)",
            SLOW,
            async store => {
                const r = await runInTerminal(`publish-${store}.mjs`, { FAKE_REWORD_ON_COPY: '1' })
                expect(r.code).toBe(1)
                expect(r.out).toContain('the extension shows its release notes')
                expect(r.calls.some(line => line.endsWith('/publish') || line.endsWith('/submissions'))).toBe(false)
                expect(published()).toEqual([])
                expect(events().at(-1)).toMatchObject({ store, event: 'failed', reason: 'description changed during the listing step' })
            },
        )
    })

    describe.runIf(stores.includes('chrome'))('Chrome', () => {
        it.each(['503', '429', '401'])('stops on an upload Google answers with HTTP %s, before submitting', SLOW, code => {
            const r = run('publish-chrome.mjs', { FAKE_CHROME_UPLOAD: code })
            expect(r.code).toBe(1)
            expect(r.out).toContain(`Upload failed: HTTP ${code}`)
            expect(r.out).toContain('Backend Error')
            expect(r.out).not.toContain('Upload accepted')
            expect(r.calls.some(line => line.endsWith('/publish'))).toBe(false)
            expect(published()).toEqual([])
            expect(events().at(-1)).toMatchObject({ store: 'chrome', event: 'failed', reason: `upload refused (HTTP ${code})` })
        })

        it('stops on a submit Google answers with HTTP 503, saying so', SLOW, () => {
            const r = run('publish-chrome.mjs', { FAKE_CHROME_SUBMIT: '503' })
            expect(r.code).toBe(1)
            expect(r.out).toContain('Submit failed: HTTP 503')
            expect(published()).toEqual([])
        })
    })

    describe.runIf(stores.includes('edge'))('Edge', () => {
        it('uploads, waits for the package, then submits and waits for the submission', SLOW, () => {
            const r = run('publish-edge.mjs')
            expect(r.code).toBe(0)
            const api = 'https://api.addons.microsoftedge.microsoft.com/v1/products/product/submissions'
            expect(r.calls.filter(line => line.startsWith('fetch'))).toEqual([
                `fetch POST ${api}/draft/package`,
                `fetch GET ${api}/draft/package/operations/op-package`,
                `fetch POST ${api}`,
                `fetch GET ${api}/operations/op-submit`,
            ])
            expect(published()).toEqual(['edge'])
        })

        it('stops on a package Edge refuses, before submitting', SLOW, () => {
            const r = run('publish-edge.mjs', { FAKE_EDGE: 'refuse-package' })
            expect(r.code).toBe(1)
            expect(r.out).toContain('refused the package')
            expect(r.out).toContain('The package is not valid.')
            expect(r.calls.some(line => line.endsWith('/submissions'))).toBe(false)
            expect(published()).toEqual([])
        })

        it('says the API key is likely expired when Edge answers 401', SLOW, () => {
            const r = run('publish-edge.mjs', { FAKE_EDGE: 'unauthorized' })
            expect(r.code).toBe(1)
            expect(r.out).toContain('The Edge API key is likely expired')
        })

        it('stops before building once EDGE_API_KEY_EXPIRY has passed', SLOW, () => {
            const r = run('publish-edge.mjs', { EDGE_API_KEY_EXPIRY: '2020-01-01' })
            expect(r.code).toBe(1)
            expect(r.out).toContain('expired on 2020-01-01')
            expect(r.calls).toEqual([])
        })

        it("leaves a submission Edge hasn't settled unrecorded, and publish:all calls it unconfirmed", SLOW, () => {
            const alone = run('publish-edge.mjs', { FAKE_EDGE: 'slow' })
            expect(alone.code).toBe(0)
            expect(alone.out).toContain('still processing the submission')
            expect(published()).toEqual([])
            expect(events().at(-1)).toMatchObject({ store: 'edge', event: 'unconfirmed' })

            const all = run('publish-all.mjs', { FAKE_EDGE: 'slow' })
            expect(all.code).toBe(1)
            expect(all.out).toContain('Not confirmed by the store: Edge')
            expect(events().at(-1)).toMatchObject({ event: 'publish:all finished', unconfirmed: ['edge'] })
        })
    })

    describe.runIf(stores.includes('firefox'))('Firefox', () => {
        it('sends the commit that was built as source, and nothing uncommitted, untracked or secret', SLOW, () => {
            const committed = git('ls-files', '--', '.', ...(settings.sourceZipExcludes || []).map(p => `:(exclude)${p}`))
                .split('\n')
                .sort()
            if (settings.notBuildInputs.includes('scripts')) {
                write('scripts/x.txt', 'uncommitted\n')
                write('scripts/notes.txt', 'untracked\n')
            }
            write('.env', 'FIREFOX_JWT_SECRET=secret\n')
            const r = run('publish-firefox.mjs', { FAKE_ZIP_SHOW: 'scripts/x.txt' })
            expect(r.code).toBe(0)
            expect(r.calls).toContain(`sign approvalTimeout=0 source=${sourceZip}`)
            const zipped = JSON.parse(r.calls.find(line => line.startsWith('zip [')).slice('zip '.length))
            expect(zipped).toEqual(committed)
            expect(zipped).not.toContain('.env')
            if (committed.includes('scripts/x.txt')) expect(r.calls).toContain('zip scripts/x.txt: not the extension')
            // The zip goes once AMO has it
            expect(exists(sourceZip)).toBe(false)
            expect(r.calls).toContain(`amo description ${JSON.stringify(read('STORE_DESCRIPTION.txt').trim())}`)
        })

        it('sets the listing description alone with --text-only', SLOW, () => {
            // No build yet to read the add-on id from
            const r = run('publish-firefox.mjs', { FIREFOX_EXTENSION_ID: 'test@example.com' }, ['--text-only'])
            expect(r.code).toBe(0)
            expect(built(r.calls)).toEqual([])
            expect(r.calls).toContain(`amo description ${JSON.stringify(read('STORE_DESCRIPTION.txt').trim())}`)
            expect(published()).toEqual([])
        })

        describe('after a run that stopped once AMO took the version', () => {
            it('counts as published on the rerun when the earlier submission was this code', SLOW, () => {
                expect(run('publish-firefox.mjs', { FAKE_AMO: 'fail' }).code).toBe(1)
                expect(published()).toEqual([])
                expect(status().firefoxSubmissions).toHaveLength(1)

                const rerun = run('publish-firefox.mjs', { FAKE_AMO: 'exists' })
                expect(rerun.code).toBe(0)
                expect(rerun.out).toContain(`AMO already has ${VERSION} from this code`)
                expect(published()).toEqual(['firefox'])
                // The refused submission isn't kept as one AMO may hold
                expect(status().firefoxSubmissions).toHaveLength(1)
            })

            it("isn't counted when nothing here shows AMO got this code, unless accepted by hand", SLOW, () => {
                const refused = run('publish-firefox.mjs', { FAKE_AMO: 'exists' })
                expect(refused.code).toBe(1)
                expect(refused.out).toContain('PUBLISH_FIREFOX_ACCEPT_EXISTING=1')
                expect(published()).toEqual([])

                const accepted = run('publish-firefox.mjs', { FAKE_AMO: 'exists', PUBLISH_FIREFOX_ACCEPT_EXISTING: '1' })
                expect(accepted.code).toBe(0)
                expect(published()).toEqual(['firefox'])
            })

            it('stops every store from shipping other code under that version', SLOW, () => {
                expect(run('publish-firefox.mjs', { FAKE_AMO: 'fail' }).code).toBe(1)
                write('src/main.ts', 'export const main = 2\n')
                commitAll('other code')
                const r = run('publish-all.mjs')
                expect(r.code).toBe(1)
                expect(r.calls).toEqual([])
                expect(r.out).toContain("didn't finish, so AMO may have that code")
            })
        })
    })

    describe('the publish log', () => {
        it('keeps every run, and yarn publish:log prints it', SLOW, () => {
            const builtFrom = git('rev-parse', 'HEAD').slice(0, 7)
            run('publish-all.mjs', FAIL[stores[0]])
            run('publish-all.mjs')
            const seen = events().map(e => [e.store || '', e.event])
            expect(seen).toEqual([
                [stores[0], 'started'],
                [stores[0], 'failed'],
                ...stores.slice(1).flatMap(store => [
                    [store, 'started'],
                    [store, 'published'],
                ]),
                ['', 'publish:all finished'],
                [stores[0], 'started'],
                [stores[0], 'published'],
                ['', 'publish:all finished'],
            ])
            expect(events().find(e => e.event === 'published')).toMatchObject({ version: VERSION, commit: builtFrom })
            expect(events()[3 + 2 * (stores.length - 1) - 1]).toMatchObject({ failed: [stores[0]] })

            const printed = run('publish-log.mjs')
            expect(printed.code).toBe(0)
            expect(printed.out).toMatch(/when\s+version\s+store\s+event\s+commit\s+detail/)
            expect(printed.out).toContain('publish:all finished')
            if (settings.storeCheck) expect(printed.out).toContain(settings.storeCheck)
        })
    })

    describe('shared.json', () => {
        it('stops every script before anything runs when its publish settings are wrong', SLOW, () => {
            write('shared.json', JSON.stringify({ modules: { publish: { ...settings, unknownSetting: true } } }))
            commitAll('a bad setting')
            for (const script of ['publish-all.mjs', ...stores.map(store => `publish-${store}.mjs`), 'publish-log.mjs']) {
                const r = run(script)
                expect(r.code).toBe(1)
                expect(r.out).toContain('unknown setting "unknownSetting"')
                expect(r.calls).toEqual([])
            }
        })

        it("keeps a store it doesn't list from being published to", SLOW, () => {
            for (const store of ['chrome', 'edge', 'firefox'].filter(s => !stores.includes(s))) {
                const r = run(`publish-${store}.mjs`)
                expect(r.code).toBe(1)
                expect(r.out).toContain(`${NAMES[store]} isn't one of this extension's stores`)
                expect(r.calls).toEqual([])
            }
        })
    })

    describe.runIf(kase.repo)('in this repo', () => {
        it("names yarn scripts package.json has", () => {
            const scripts = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).scripts || {}
            for (const script of [...stores.map(store => BUILD[store]), ...checks.map(check => check.script)]) {
                expect(scripts, `package.json has no "${script}" script`).toHaveProperty([script])
            }
        })

        // The same-code checks leave STORE_DESCRIPTION.txt out when shared.json says the
        // extension never shows its release notes. If its code starts reading them
        // (notesGlobal, which webpack fills from the description), a reworded note
        // changes the code: set showsReleaseNotes to true.
        it.runIf(!settings.showsReleaseNotes)("doesn't show its release notes, as shared.json says", () => {
            const src = path.join(ROOT, 'src')
            const readers = fs
                .readdirSync(src, { recursive: true })
                .filter(f => /\.(m?[jt]sx?|html)$/.test(f) && !/__tests__|\.d\.ts$/.test(f))
                .filter(f => fs.readFileSync(path.join(src, f), 'utf8').includes(settings.notesGlobal))
            expect(readers).toEqual([])
        })
    })
})
