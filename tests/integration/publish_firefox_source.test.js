// What Mozilla's reviewers get as source is the commit that was built. The real
// scripts/publishing/publish-firefox.js runs in a scratch git repo, with a fake
// yarn (the install check and the build), a fake web-ext that reads the source
// zip it's handed, and a fetch stub, so nothing is sent anywhere.
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { execFileSync, spawnSync } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const SLOW = { timeout: 60_000 }
const GIT_ID = [
    '-c',
    'user.name=test',
    '-c',
    'user.email=test@example.com',
    '-c',
    'commit.gpgsign=false',
    '-c',
    'core.hooksPath=/dev/null',
]
// Without the GIT_* variables git hands a hook (GIT_INDEX_FILE, and GIT_DIR in a
// worktree), which would point the scratch repo's commands at the real one
// when the pre-commit hook runs these tests
const GIT_ENV = Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.startsWith('GIT_')))

// FAKE_INSTALL_FAILS: yarn.lock doesn't match. FAKE_EDIT_DURING_BUILD: a file is
// edited while the build runs.
const FAKE_YARN = `#!/bin/sh
echo "yarn $* STAGING=\${STAGING-unset} SIMULATE_DEPRECATION=\${SIMULATE_DEPRECATION-unset}" >> "$FAKE_LOG"
case "$1" in
    install) exit "\${FAKE_INSTALL_FAILS:-0}" ;;
    build-firefox)
        if [ -n "$FAKE_EDIT_DURING_BUILD" ]; then echo '// edited' >> src/main.ts; fi
        mkdir -p dist-firefox && echo '{}' > dist-firefox/manifest.json ;;
esac
`

const FAKE_WEB_EXT = `import fs from 'fs'
import { execFileSync } from 'child_process'
export default {
    cmd: {
        async sign(opts) {
            const zip = opts.uploadSourceCode
            const files = execFileSync('unzip', ['-Z1', zip], { encoding: 'utf8' }).split('\\n').filter(f => f && !f.endsWith('/'))
            const readme = execFileSync('unzip', ['-p', zip, 'README.md'], { encoding: 'utf8' }).trim()
            fs.appendFileSync(process.env.FAKE_LOG, 'sign\\nzip ' + JSON.stringify(files) + '\\nzip README.md: ' + readme + '\\n')
        },
    },
}
`

const STUB_FETCH = `globalThis.fetch = async url => {
    if (String(url).startsWith('https://addons.mozilla.org/')) return { ok: true, status: 200, json: async () => ({}), text: async () => '' }
    throw new Error('unexpected fetch: ' + url)
}
`

let tmp, repo, log

const write = (file, text) => {
    fs.mkdirSync(path.dirname(path.join(repo, file)), { recursive: true })
    fs.writeFileSync(path.join(repo, file), text)
}
const git = (...args) => execFileSync('git', [...GIT_ID, ...args], { cwd: repo, encoding: 'utf8', env: GIT_ENV }).trim()

function run(env = {}) {
    fs.writeFileSync(log, '')
    const r = spawnSync(process.execPath, [path.join('scripts', 'publishing', 'publish-firefox.js')], {
        cwd: repo,
        encoding: 'utf8',
        env: {
            PATH: `${path.join(tmp, 'bin')}${path.delimiter}${process.env.PATH}`,
            HOME: process.env.HOME,
            TMPDIR: os.tmpdir(),
            NODE_OPTIONS: `--import=${pathToFileURL(path.join(tmp, 'stub-fetch.mjs')).href}`,
            FAKE_LOG: log,
            FIREFOX_JWT_ISSUER: 'issuer',
            FIREFOX_JWT_SECRET: 'secret',
            FIREFOX_EXTENSION_ID: 'test@example.com',
            ...env,
        },
    })
    const calls = fs.readFileSync(log, 'utf8').split('\n').filter(Boolean)
    return { code: r.status, out: r.stdout + r.stderr, calls }
}
const signed = calls => calls.includes('sign')

beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rte-publish-'))
    repo = path.join(tmp, 'repo')
    log = path.join(tmp, 'calls.log')
    fs.mkdirSync(path.join(tmp, 'bin'))
    fs.writeFileSync(path.join(tmp, 'bin', 'yarn'), FAKE_YARN, { mode: 0o755 })
    fs.writeFileSync(path.join(tmp, 'stub-fetch.mjs'), STUB_FETCH)
    // The scripts' other dependencies, found by walking up from the repo
    fs.symlinkSync(path.join(ROOT, 'node_modules'), path.join(tmp, 'node_modules'))

    fs.mkdirSync(repo)
    for (const file of ['common.js', 'publish-firefox.js']) {
        write(`scripts/publishing/${file}`, fs.readFileSync(path.join(ROOT, 'scripts', 'publishing', file), 'utf8'))
    }
    write('.gitignore', fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8'))
    write('src/manifest.json', '{"version": "9.9.9"}\n')
    write('src/main.ts', 'export const main = 1\n')
    write('README.md', 'committed readme\n')
    write('.env.example', 'FIREFOX_JWT_SECRET=\n')
    write('dist-firefox/old.js', '// a committed build\n')
    write('.nvmrc', `${process.version.slice(1)}\n`)
    git('init', '-q')
    git('add', '-A')
    git('commit', '-qm', 'start')
    // Nearer than the real one, in the repo's own (ignored) node_modules
    write('node_modules/web-ext/package.json', '{"name": "web-ext", "type": "module", "main": "index.js"}\n')
    write('node_modules/web-ext/index.js', FAKE_WEB_EXT)
})

afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true })
})

describe('publish-firefox.js', () => {
    it('refuses uncommitted changes to the extension, with no way around it', SLOW, () => {
        write('src/main.ts', 'export const main = 2\n')
        const r = run({ PUBLISH_ALLOW_DIRTY: '1' })
        expect(r.code).toBe(1)
        expect(r.out).toContain('src/main.ts')
        expect(r.calls).toEqual([])
    })

    it('sends the commit that was built, and nothing uncommitted, untracked or secret', SLOW, () => {
        // Docs aren't build inputs, so these don't stop a publish
        write('README.md', 'uncommitted readme\n')
        write('notes.md', 'private notes\n')
        write('.env', 'FIREFOX_JWT_SECRET=secret\n')
        const r = run()
        expect(r.code).toBe(0)
        const files = JSON.parse(r.calls.find(line => line.startsWith('zip [')).slice('zip '.length))
        expect(files.sort()).toEqual([
            '.gitignore',
            '.nvmrc',
            'README.md',
            'scripts/publishing/common.js',
            'scripts/publishing/publish-firefox.js',
            'src/main.ts',
            'src/manifest.json',
        ])
        expect(r.calls).toContain('zip README.md: committed readme')
    })

    it('stops unless Node is the version .nvmrc names', SLOW, () => {
        write('.nvmrc', '1.2.3\n')
        git('commit', '-qam', 'another Node')
        const r = run()
        expect(r.code).toBe(1)
        expect(r.out).toContain('.nvmrc names 1.2.3')
        expect(r.calls).toEqual([])
    })

    it('stops when the extension changes while it builds', SLOW, () => {
        const r = run({ FAKE_EDIT_DURING_BUILD: '1' })
        expect(r.code).toBe(1)
        expect(r.out).toContain('changed while it was building')
        expect(signed(r.calls)).toBe(false)
    })

    it("builds with yarn.lock's dependencies, as a production build", SLOW, () => {
        const r = run({ STAGING: 'true', SIMULATE_DEPRECATION: 'true' })
        expect(r.code).toBe(0)
        const install = r.calls.findIndex(line => line.startsWith('yarn install --immutable'))
        const build = r.calls.findIndex(line => line.startsWith('yarn build-firefox'))
        expect(install).toBeGreaterThanOrEqual(0)
        expect(install).toBeLessThan(build)
        expect(r.calls[build]).toContain('STAGING=unset SIMULATE_DEPRECATION=unset')

        const failed = run({ FAKE_INSTALL_FAILS: '1' })
        expect(failed.code).toBe(1)
        expect(failed.out).toContain('yarn install --immutable failed')
        expect(failed.calls.some(line => line.startsWith('yarn build-firefox'))).toBe(false)
    })
})
