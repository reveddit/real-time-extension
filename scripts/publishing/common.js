
import path from 'path';
import fs from 'fs';
import readline from 'readline';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';
import clipboardy from 'clipboardy';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const CONFIG = {
    // Adjust these paths relative to where the script is run (project root)
    chromeZip: path.join(process.cwd(), 'chrome.zip'),
    firefoxZip: path.join(process.cwd(), 'firefox.zip'),
    descriptionFile: path.join(process.cwd(), 'STORE_DESCRIPTION.txt'),
    manifestFile: path.join(process.cwd(), 'src', 'manifest.json'),
};

export function readDescription() {
    try {
        if (!fs.existsSync(CONFIG.descriptionFile)) {
            console.warn(`\x1b[33mWarning: Description file not found at ${CONFIG.descriptionFile}\x1b[0m`);
            return null;
        }
        return fs.readFileSync(CONFIG.descriptionFile, 'utf8').trim();
    } catch (error) {
        console.error('Error reading description file:', error);
        return null;
    }
}

export function getManifest() {
    return JSON.parse(fs.readFileSync(CONFIG.manifestFile, 'utf8'));
}

/**
 * Rebuild the production artifact right before uploading, so a standalone
 * publish (without publish-all) can never ship a stale zip/dist built from an
 * older commit. Dev builds live in dist-dev-*, so they were never a risk here.
 * @param {string} buildScript - The yarn script to run (e.g. "build-chrome")
 */
export function buildFresh(buildScript) {
    // Every store script builds here right before it uploads, so this is
    // where its run starts counting in the publish log
    trackRun(buildScript.replace(/^build-/, ''));
    assertCleanBuildInputs();
    // Here too, so a standalone `yarn publish:<store>` can't give a store
    // other code under a version another store already has
    assertSameCodeForVersion();
    console.log(`\x1b[33mBuilding fresh production package (yarn ${buildScript})...\x1b[0m`);
    const result = spawnSync('yarn', [buildScript], { stdio: 'inherit', cwd: process.cwd() });
    if (result.status !== 0) {
        console.error(`\x1b[31myarn ${buildScript} failed.\x1b[0m`);
        process.exit(1);
    }
    // What was built, for markPublished: HEAD can move before the store accepts it
    const status = readPublishStatus();
    status.built = { commit: headCommit(), dirty: buildInputsDirty(), at: new Date().toISOString() };
    writePublishStatus(status);
}

/**
 * Copy text to clipboard with console feedback
 * @param {string} text - The text to copy
 * @param {string} label - Label for the success message (e.g., "Description", "URL")
 */
export function copyToClipboard(text, label = 'Text') {
    try {
        clipboardy.writeSync(text);
        console.log(`\x1b[32m✔ ${label} copied to clipboard!\x1b[0m`);
        return true;
    } catch (e) {
        console.log(`\x1b[33m⚠ Could not copy ${label.toLowerCase()} to clipboard.\x1b[0m`);
        return false;
    }
}

/**
 * Setup handler for Ctrl+C to exit with code 130 (SIGINT)
 */
export function setupAbortHandler() {
    process.on('SIGINT', () => {
        console.log('\n\x1b[31m✖ Aborted\x1b[0m');
        process.exit(130);
    });
}

/**
 * Prompt user for input, properly handling Ctrl+C
 * @param {string} query - The prompt to display
 * @returns {Promise<string>} - The user's input
 */
export function prompt(query) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise((resolve) => {
        // Handle Ctrl+C at the readline level
        rl.on('SIGINT', () => {
            rl.close();
            console.log('\n\x1b[31m✖ Aborted\x1b[0m');
            process.exit(130);
        });

        rl.question(query, (answer) => {
            rl.close();
            resolve(answer);
        });
    });
}

/**
 * Which stores already have the current manifest version, so a publish run
 * that failed partway finishes by running `yarn publish:all` again: it skips
 * those stores, and the preflight while the extension's files are unchanged.
 * Kept in .publish-status.json (gitignored); deleting it starts over.
 * Publishing needs the build inputs committed (assertCleanBuildInputs), so
 * the commit recorded there is what the stores got.
 */
const STATUS_FILE = path.join(process.cwd(), '.publish-status.json');

// What the built extension is made from: every tracked file but these (the
// dependencies and build scripts count too). One version must not ship
// different code to different stores.
const NOT_BUILD_INPUTS = [
    'tests', 'scripts', '*.md', 'dist-*', '.claude', '.claude-mcp', '.github', '.husky', 'graphics', 'images',
    'test-results', 'LICENSE', 'renovate.json', 'eslint.config.js', '.prettierrc', '.prettierignore',
    '.editorconfig', 'playwright.config.js', 'vitest.config.js', '.gitignore',
];
const BUILD_INPUTS = ['.', ...NOT_BUILD_INPUTS.map(p => `:(exclude)${p}`)];

function git(...args) {
    const result = spawnSync('git', args, { cwd: process.cwd(), encoding: 'utf8' });
    return { ok: result.status === 0, out: (result.stdout || '').trim() };
}

export function headCommit() {
    return git('rev-parse', 'HEAD').out;
}

/**
 * Whether the extension's files differ from `commit`, committed or not.
 * @param {string} commit
 */
export function extensionChangedSince(commit) {
    return !git('diff', '--quiet', commit, '--', ...BUILD_INPUTS).ok;
}

/**
 * Whether a build input has uncommitted changes or is untracked, so HEAD
 * wouldn't say what a build from this tree ships.
 */
export function buildInputsDirty() {
    const status = git('status', '--porcelain', '--', ...BUILD_INPUTS);
    return !status.ok || status.out !== '';
}

/**
 * Stop unless the build inputs match HEAD. PUBLISH_ALLOW_DIRTY=1 publishes
 * anyway; the run is then recorded as dirty, and publish:all won't resume it.
 */
export function assertCleanBuildInputs() {
    if (!buildInputsDirty()) return;
    if (process.env.PUBLISH_ALLOW_DIRTY) {
        console.warn('\x1b[33mWarning: publishing uncommitted changes (PUBLISH_ALLOW_DIRTY)\x1b[0m');
        return;
    }
    failureReason = 'uncommitted changes';
    console.error(
        '\x1b[31mThe extension has uncommitted or untracked changes:\x1b[0m\n' +
        git('status', '--short', '--', ...BUILD_INPUTS).out + '\n' +
        'Commit or stash them first, so the version in each store is a commit (PUBLISH_ALLOW_DIRTY=1 overrides).'
    );
    process.exit(1);
}

/**
 * Stop when a store already has this version from other code: one version
 * must be the same code in every store.
 */
export function assertSameCodeForVersion() {
    const status = readPublishStatus();
    const already = Object.keys(status.published);
    if (!already.length) return;
    if (status.dirty) {
        failureReason = 'another store has this version from uncommitted files';
        console.error(
            `\x1b[31m${already.join(', ')} got ${status.version} from uncommitted files (PUBLISH_ALLOW_DIRTY), so the other stores can't be given the same code.\x1b[0m\n` +
            'Bump the version and add its VERSION HISTORY line.'
        );
        process.exit(1);
    }
    if (status.commit && extensionChangedSince(status.commit)) {
        failureReason = 'another store has this version from other code';
        console.error(
            `\x1b[31m${already.join(', ')} already got ${status.version} from ${status.commit.slice(0, 7)}, and the extension's files have changed since.\x1b[0m\n` +
            'Bump the version and add its VERSION HISTORY line, so every store gets the same code for one version.'
        );
        process.exit(1);
    }
}

export function readPublishStatus() {
    const { version } = getManifest();
    try {
        const status = JSON.parse(fs.readFileSync(STATUS_FILE, 'utf8'));
        if (status.version === version) return { ...status, published: status.published || {} };
    } catch (e) {
        // Missing or unreadable: nothing recorded yet
    }
    return { version, published: {} };
}

export function writePublishStatus(status) {
    fs.writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2) + '\n');
}

/**
 * Record that a store accepted the current version. Each publish script calls
 * this once its store has it, whether or not publish-all started it.
 * @param {string} store - "chrome", "edge" or "firefox"
 */
/**
 * Every publish action, appended and never rewritten, in .publish-log.jsonl
 * (gitignored). .publish-status.json resets with each version; this is the
 * history of what went to which store and when. `yarn publish:log` prints it.
 */
const LOG_FILE = path.join(process.cwd(), '.publish-log.jsonl');
let publishedThisRun = false;
let failureReason = '';

export function logPublishEvent(event) {
    try {
        const { version } = getManifest();
        const entry = { at: new Date().toISOString(), version, commit: headCommit().slice(0, 7), ...event };
        fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n');
    } catch (e) {
        // A publish never stops for its log
    }
}

/**
 * Log a store's run: its start now, and on exit whether it published, failed,
 * was aborted, or exited without the store confirming.
 * @param {string} store - "chrome", "edge" or "firefox"
 */
export function trackRun(store) {
    logPublishEvent({ store, event: 'started' });
    process.on('exit', code => {
        if (publishedThisRun) return;
        const event = code === 0 ? 'unconfirmed' : code === 130 ? 'aborted' : 'failed';
        logPublishEvent({ store, event, exitCode: code, ...(failureReason && { reason: failureReason }) });
    });
}

export function markPublished(store) {
    publishedThisRun = true;
    logPublishEvent({ store, event: 'published' });
    const status = readPublishStatus();
    status.commit = status.commit || status.built?.commit || headCommit();
    if (status.built?.dirty || buildInputsDirty()) status.dirty = true;
    status.published[store] = new Date().toISOString();
    writePublishStatus(status);
}
