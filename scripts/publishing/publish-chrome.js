
import chromeWebstoreUpload from 'chrome-webstore-upload';
import open from 'open';
import dotenv from 'dotenv';
import { CONFIG, readDescription, getManifest, copyToClipboard, setupAbortHandler, prompt } from './common.js';

setupAbortHandler();
dotenv.config();

const requiredEnvVars = [
    'CHROME_EXTENSION_ID',
    'CHROME_CLIENT_ID',
    'CHROME_CLIENT_SECRET',
    'CHROME_REFRESH_TOKEN',
    // 'CHROME_DASHBOARD_ID' // not required, don't need to validate this
];

function checkEnv() {
    const missing = requiredEnvVars.filter(key => !process.env[key]);
    if (missing.length > 0) {
        console.error(`\x1b[31mError: Missing environment variables: ${missing.join(', ')}\x1b[0m`);
        process.exit(1);
    }
}

async function main() {
    checkEnv();

    const manifest = getManifest();
    console.log(`\n\x1b[36m🚀 Starting Chrome Publish Flow for version ${manifest.version}...\x1b[0m`);

    // 1. Upload the ZIP
    console.log('\n\x1b[33m[1/3] Uploading source package...\x1b[0m');
    const store = chromeWebstoreUpload({
        extensionId: process.env.CHROME_EXTENSION_ID,
        clientId: process.env.CHROME_CLIENT_ID,
        clientSecret: process.env.CHROME_CLIENT_SECRET,
        refreshToken: process.env.CHROME_REFRESH_TOKEN,
    });

    try {
        // We use the upload method directly
        // Note: The CLI package exports a function that returns an object with upload() and publish()
        // Reading the source file as a stream is handled by the library if we pass a path
        const fs = await import('fs');
        const myZip = fs.createReadStream(CONFIG.chromeZip);
        
        const uploadResult = await store.uploadExisting(myZip);
        
        if (uploadResult.uploadState === 'FAILURE') {
             console.error('\x1b[31mUpload Failed:\x1b[0m', uploadResult.itemError);
             process.exit(1);
        }
        console.log('\x1b[32m✔ Upload successful!\x1b[0m');

        // 2. Prompt for Description Update
        console.log('\n\x1b[33m[2/3] Verifying Store Listing...\x1b[0m');
        const description = readDescription();
        if (description) {
            copyToClipboard(description, 'Description');
            console.log('Local description file found.');
        } else {
             console.log('No local description file found (skipped).');
        }

        console.log('Automated text updates are not supported by the Chrome Web Store API.');

        // Open the URL specific to this extension's listing
        const chromeUrl = `https://chrome.google.com/u/1/webstore/devconsole/${process.env.CHROME_DASHBOARD_ID}/${process.env.CHROME_EXTENSION_ID}/edit`;
        console.log(`\n\x1b[35m📋 Chrome Dashboard URL:\x1b[0m\n${chromeUrl}\n`);
        console.log('Opening the Developer Dashboard for you to verify/paste the description...');
        await open(chromeUrl);
        
        await prompt('\n\x1b[1mPress ENTER once you have verified/updated the store listing description in the browser > \x1b[0m');

        // 3. Publish
        console.log('\n\x1b[33m[3/3] Publishing to Store...\x1b[0m');
        const publishResult = await store.publish();
        
        if (publishResult.status.length > 0 && publishResult.status[0] === 'OK') {
             console.log('\x1b[32m✔ Successfully Published!\x1b[0m');
        } else {
             console.error('\x1b[31mPublish potentially failed or returned warnings:\x1b[0m', publishResult);
        }

    } catch (error) {
        console.error('\x1b[31mAn unexpected error occurred:\x1b[0m', error);
        process.exit(1);
    }
}

main();
