
import path from 'path';
import fs from 'fs';
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
