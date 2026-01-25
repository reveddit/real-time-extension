
import path from 'path';
import fs from 'fs';
import readline from 'readline';
import { fileURLToPath } from 'url';
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
