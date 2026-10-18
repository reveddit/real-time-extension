import { spawn, spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { getManifest, readPublishStatus, writePublishStatus, headCommit, extensionChangedSince } from './common.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const stores = [
    { name: 'chrome', script: 'publish-chrome.js' },
    { name: 'edge', script: 'publish-edge.js' },
    { name: 'firefox', script: 'publish-firefox.js' },
];

let currentProcess = null;
let aborted = false;

// Handle Ctrl+C - kill child and exit immediately
process.on('SIGINT', () => {
    console.log('\n\x1b[31m✖ Publishing aborted by user\x1b[0m');
    aborted = true;
    if (currentProcess) {
        currentProcess.kill('SIGINT');
    }
    process.exit(130); // Standard exit code for SIGINT
});

async function runScript(scriptName) {
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(__dirname, scriptName);
        currentProcess = spawn('node', [scriptPath], {
            stdio: 'inherit',
            cwd: process.cwd()
        });

        currentProcess.on('close', (code) => {
            currentProcess = null;
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`${scriptName} exited with code ${code}`));
            }
        });

        currentProcess.on('error', (err) => {
            currentProcess = null;
            reject(err);
        });
    });
}

// Skipped when it already passed for these exact extension files, so a run
// that only needs to finish the stores a failure left behind starts at once.
function runPreflight(status) {
    if (status.preflight && !extensionChangedSince(status.preflight.commit)) {
        console.log(`\x1b[32m✔ Preflight already passed for this code (${status.preflight.at}), skipping it\x1b[0m\n`);
        return;
    }
    console.log('\x1b[33mRunning yarn preflight...\x1b[0m');
    const result = spawnSync('yarn', ['preflight'], { stdio: 'inherit', cwd: process.cwd() });
    if (result.status !== 0) {
        console.error('\x1b[31mPreflight failed, so nothing was published.\x1b[0m');
        process.exit(1);
    }
    // Only committed files pin the result; with local edits, the next run checks again.
    const head = headCommit();
    if (!extensionChangedSince(head)) {
        status.preflight = { commit: head, at: new Date().toISOString() };
        writePublishStatus(status);
    }
}

async function main() {
    const { version } = getManifest();
    console.log(`\x1b[36m🚀 Starting Publish All for version ${version}...\x1b[0m\n`);

    const status = readPublishStatus();
    const already = stores.filter(s => status.published[s.name]).map(s => s.name);
    if (already.length && status.commit && extensionChangedSince(status.commit)) {
        console.error(
            `\x1b[31m${already.join(', ')} already got ${version} from ${status.commit.slice(0, 7)}, and the extension's files have changed since.\x1b[0m\n` +
            'Bump the version and add its VERSION HISTORY line, so every store gets the same code for one version.'
        );
        process.exit(1);
    }

    runPreflight(status);
    // No upfront build: each publish script rebuilds its own production
    // artifact (buildFresh in common.js) right before uploading.

    // One store failing doesn't stop the others.
    const failed = [];
    const unconfirmed = [];
    for (const store of stores) {
        if (aborted) break;
        const when = readPublishStatus().published[store.name];
        if (when) {
            console.log(`\x1b[32m✔ ${store.name} already has ${version} (${when}), skipping\x1b[0m`);
            continue;
        }
        try {
            await runScript(store.script);
            // Exited cleanly without recording it: Chrome's publish answered
            // without an OK (e.g. ITEM_PENDING_REVIEW), so it didn't go out
            if (!readPublishStatus().published[store.name]) unconfirmed.push(store.name);
        } catch (error) {
            if (aborted) break;
            console.error(`\x1b[31mFailed: ${error.message}\x1b[0m`);
            failed.push(store.name);
        }
    }
    if (aborted) return;

    if (!failed.length && !unconfirmed.length) {
        console.log(`\n\x1b[32m✔ All browsers have ${version}!\x1b[0m`);
        return;
    }
    console.log('');
    if (failed.length) {
        console.error(`\x1b[31m✖ Not published: ${failed.join(', ')}\x1b[0m`);
    }
    if (unconfirmed.length) {
        console.error(`\x1b[33m⚠ Not confirmed by the store: ${unconfirmed.join(', ')} (see its output above)\x1b[0m`);
    }
    console.log(
        `Fix that, then run \x1b[1myarn publish:all\x1b[0m again. It publishes only to the stores still missing ${version}, ` +
        'and skips the preflight while the extension\'s files are unchanged.'
    );
    process.exit(1);
}

main();
