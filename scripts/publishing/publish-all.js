import { spawn, spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import {
    getManifest,
    readPublishStatus,
    writePublishStatus,
    headCommit,
    extensionChangedSince,
    assertCleanBuildInputs,
    assertSameCodeForVersion,
    logPublishEvent,
} from './common.js';

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

// A check every release must pass: the preflight, then a real second-account
// sign-in in Chrome, which signs in with the password in .env. Each is skipped
// when it already passed (or was skipped) for these exact extension files, so
// a run that only needs to finish the stores a failure left behind starts at
// once. A check with a skip flag isn't run when the flag is given, and the
// skip is recorded like a pass.
function runCheck(status, key, label, script, skip) {
    const done = status[key];
    if (done && !extensionChangedSince(done.commit)) {
        const how = done.skipped ? 'was skipped' : 'already passed';
        console.log(`\x1b[32m✔ ${label} ${how} for this code (${done.at}), skipping it\x1b[0m\n`);
        return;
    }
    if (skip && process.argv.includes(skip.flag)) {
        console.log(`\x1b[33m⚠ ${label} not run (${skip.flag})\x1b[0m\n`);
        logPublishEvent({ event: skip.event, reason: skip.flag });
        pinResult(status, key, { skipped: true });
        return;
    }
    console.log(`\x1b[33mRunning yarn ${script}...\x1b[0m`);
    const result = spawnSync('yarn', [script], { stdio: 'inherit', cwd: process.cwd() });
    if (result.status !== 0) {
        console.error(`\x1b[31m${label} failed, so nothing was published.\x1b[0m`);
        if (skip) console.error(`To publish without it, run \x1b[1myarn publish:all ${skip.flag}\x1b[0m.`);
        process.exit(1);
    }
    pinResult(status, key, {});
}

// Only committed files pin a check's result; with local edits, the next run checks again.
function pinResult(status, key, result) {
    const head = headCommit();
    if (!extensionChangedSince(head)) {
        status[key] = { commit: head, at: new Date().toISOString(), ...result };
        writePublishStatus(status);
    }
}

// The sign-in test's browser is one automation drives, and reddit has refused
// that window's login at times when the extension's own sign-in worked
// (2026-11-05, 11-08 and 11-12), so a person can publish without it.
const SKIP_SIGNIN = { flag: '--skip-signin', event: 'sign-in test skipped' };

async function main() {
    const { version } = getManifest();
    console.log(`\x1b[36m🚀 Starting Publish All for version ${version}...\x1b[0m\n`);

    // Before the preflight, so a refusal comes at once (each store's build checks again)
    assertCleanBuildInputs();
    assertSameCodeForVersion();
    const status = readPublishStatus();

    runCheck(status, 'preflight', 'Preflight', 'preflight');
    runCheck(status, 'signin', 'The real sign-in test', 'test:signin:chrome', SKIP_SIGNIN);
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
    logPublishEvent({
        event: 'publish:all finished',
        published: stores.map(s => s.name).filter(name => readPublishStatus().published[name]),
        ...(failed.length && { failed }),
        ...(unconfirmed.length && { unconfirmed }),
    });

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
        'and skips the preflight and the sign-in test while the extension\'s files are unchanged.'
    );
    process.exit(1);
}

main();
