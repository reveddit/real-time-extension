// Synced from the shared source (see shared.json): change it there, not here.
//
// The publish scripts' settings, shared.json's modules.publish, and the rule for
// a version's release note. Plain functions with no side effects, so tests can
// import them.

export const STORES = ['chrome', 'edge', 'firefox']
export const STORE_NAMES = { chrome: 'Chrome', edge: 'Edge', firefox: 'Firefox' }
const DEFAULT_BUILD = { chrome: 'build-chrome', edge: 'build-edge', firefox: 'build-firefox' }

// How the extension's build finds a version's line in VERSION HISTORY: the
// version alone ("0.0.7"), its date and version ("2026/11/16 - 0.0.1"), or
// either. Each gives the version a line names, which the build compares with the
// manifest's. The note is the line after it.
export const VERSION_LINES = {
    version: line => line,
    'date - version': line => line.match(/^[\d/]+\s*-\s*(.+)$/)?.[1],
    either: line => line.match(/^(?:\d{4}\/\d{2}\/\d{2} - )?(\d+(?:\.\d+)+)$/)?.[1],
}

// Whether VERSION HISTORY has a line for `version`, in the form `versionLine`
// names, with a note on the next line (a note may start with "- ")
export function hasChangelogEntry(description, version, versionLine) {
    const versionOf = VERSION_LINES[versionLine]
    const lines = String(description || '').split('\n')
    const start = lines.findIndex(l => l.startsWith('VERSION HISTORY'))
    if (start === -1 || !versionOf) return false
    for (let i = start + 1; i < lines.length; i++) {
        if (versionOf(lines[i].trim()) !== version) continue
        if ((lines[i + 1] || '').trim().replace(/^-\s*/, '')) return true
    }
    return false
}

// The line a new version's entry starts with, for the message that asks for one
export function versionLineExample(versionLine, version, now = new Date()) {
    if (versionLine === 'version') return version
    const pad = n => String(n).padStart(2, '0')
    return `${now.getFullYear()}/${pad(now.getMonth() + 1)}/${pad(now.getDate())} - ${version}`
}

const isText = v => typeof v === 'string' && v.length > 0
const isTextList = v => Array.isArray(v) && v.every(isText)
const ENV_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/

// Each setting, with what makes it wrong ('' when it's fine)
const RULES = {
    // The stores to publish to, in the order publish:all goes through them
    stores: v =>
        Array.isArray(v) && v.length && v.every(s => STORES.includes(s)) && new Set(v).size === v.length
            ? ''
            : `stores must list some of ${STORES.join(', ')}, each once`,
    // Whether the extension shows its release notes (a popup card, say): then the
    // description is part of its code
    showsReleaseNotes: v => (typeof v === 'boolean' ? '' : 'showsReleaseNotes must be true or false'),
    // The build-time name the notes would reach the extension's code by, which a
    // test checks nothing reads when showsReleaseNotes is false
    notesGlobal: v => (isText(v) ? '' : 'notesGlobal must name the build-time global that holds the notes'),
    versionLine: v => (v in VERSION_LINES ? '' : `versionLine must be one of: ${Object.keys(VERSION_LINES).join(', ')}`),
    // The store privacy answers, which Chrome's step points to for the Privacy tab
    privacyFile: v => (isText(v) ? '' : 'privacyFile must be a file name'),
    // The yarn script that makes each store's production build
    build: v =>
        v && typeof v === 'object' && !Array.isArray(v) && Object.entries(v).every(([s, script]) => STORES.includes(s) && isText(script))
            ? ''
            : `build must map stores (${STORES.join(', ')}) to yarn scripts`,
    // The checks publish:all runs first, each a yarn script. A pass is remembered
    // for the code it passed on, unless `remember` is false (a check with its own
    // cache, say).
    checks: v =>
        Array.isArray(v) &&
        v.every(
            ch =>
                ch &&
                isText(ch.script) &&
                Object.keys(ch).every(k => ['script', 'label', 'skipFlag', 'remember'].includes(k)) &&
                (ch.label === undefined || isText(ch.label)) &&
                (ch.skipFlag === undefined || /^--[a-z0-9-]+$/.test(ch.skipFlag)) &&
                (ch.remember === undefined || typeof ch.remember === 'boolean'),
        )
            ? ''
            : 'checks must be a list of { script, label?, skipFlag?, remember? }, with skipFlag like --skip-name',
    // The tracked files that aren't the extension's code: git pathspecs
    notBuildInputs: v => (isTextList(v) && !v.some(p => p.startsWith(':')) ? '' : 'notBuildInputs must be a list of paths'),
    // Variables that make test builds, dropped from the checks' and builds' environment
    clearEnv: v => (Array.isArray(v) && v.every(n => ENV_NAME.test(n)) ? '' : 'clearEnv must be a list of variable names'),
    // The name of the source zip Firefox's reviewers get, and what it leaves out
    sourceZip: v => (isText(v) && /^[\w.-]+\.zip$/.test(v) ? '' : 'sourceZip must be a .zip file name'),
    sourceZipExcludes: v => (isTextList(v) ? '' : 'sourceZipExcludes must be a list of paths'),
    // The /u/<n>/ of Chrome dashboard links, for a publisher account that isn't the browser's first
    chromeDashboardUser: v => (Number.isInteger(v) && v >= 0 ? '' : 'chromeDashboardUser must be a whole number'),
    // A command the publish log suggests for what each store serves now
    storeCheck: v => (isText(v) ? '' : 'storeCheck must be a command'),
}
const REQUIRED = ['stores', 'showsReleaseNotes', 'versionLine', 'notBuildInputs']

// What's wrong with a modules.publish object, as a list of sentences
export function settingsProblems(s) {
    if (!s || typeof s !== 'object' || Array.isArray(s)) return ['shared.json has no publish settings (modules.publish)']
    const problems = []
    for (const key of Object.keys(s)) {
        if (!RULES[key]) problems.push(`unknown setting "${key}"`)
        else if (RULES[key](s[key])) problems.push(RULES[key](s[key]))
    }
    for (const key of REQUIRED) if (!(key in s)) problems.push(`${key} is missing`)
    if (s.showsReleaseNotes === false && !('notesGlobal' in s)) problems.push('notesGlobal is missing (showsReleaseNotes is false)')
    for (const store of Object.keys(s.build || {})) {
        if (Array.isArray(s.stores) && !s.stores.includes(store)) problems.push(`build names ${store}, which isn't in stores`)
    }
    return problems
}

// The settings with their defaults filled in
export function withDefaults(s) {
    return {
        notesGlobal: '',
        privacyFile: '',
        checks: [{ script: 'preflight' }],
        clearEnv: [],
        sourceZip: 'source.zip',
        sourceZipExcludes: [],
        chromeDashboardUser: null,
        storeCheck: '',
        ...s,
        build: { ...DEFAULT_BUILD, ...s.build },
    }
}
