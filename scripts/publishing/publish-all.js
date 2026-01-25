import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const scripts = [
    'publish-chrome.js',
    'publish-firefox.js',
    'publish-edge.js'
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

async function main() {
    console.log('\x1b[36m🚀 Starting Publish All...\x1b[0m\n');

    for (const script of scripts) {
        if (aborted) break;
        try {
            await runScript(script);
        } catch (error) {
            if (!aborted) {
                console.error(`\x1b[31mFailed: ${error.message}\x1b[0m`);
                process.exit(1);
            }
            break;
        }
    }

    if (!aborted) {
        console.log('\n\x1b[32m✔ All browsers published successfully!\x1b[0m');
    }
}

main();
