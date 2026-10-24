import axios from 'axios';
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import open from 'open';
import dotenv from 'dotenv';
import { getManifest, readDescription, copyToClipboard, setupAbortHandler, prompt, buildFresh, markPublished } from './common.js';

setupAbortHandler();
dotenv.config();

const requiredEnvVars = ['EDGE_PRODUCT_ID', 'EDGE_CLIENT_ID', 'EDGE_API_KEY'];

function checkEnv() {
    const missing = requiredEnvVars.filter(key => !process.env[key]);
    if (missing.length > 0) {
        console.error(`\x1b[31mError: Missing environment variables: ${missing.join(', ')}\x1b[0m`);
        process.exit(1);
    }
}

function checkApiKeyExpiry() {
    const expiry = process.env.EDGE_API_KEY_EXPIRY;
    if (!expiry) {
        console.warn('\x1b[33mWarning: EDGE_API_KEY_EXPIRY not set in .env — cannot check if key is still valid.\x1b[0m');
        return;
    }
    const expiryDate = new Date(expiry);
    if (isNaN(expiryDate)) {
        console.warn(`\x1b[33mWarning: Could not parse EDGE_API_KEY_EXPIRY: "${expiry}"\x1b[0m`);
        return;
    }
    const now = new Date();
    const daysLeft = (expiryDate - now) / (1000 * 60 * 60 * 24);
    if (daysLeft < 0) {
        console.error(`\x1b[31mEdge API key expired on ${expiry}!\x1b[0m`);
        printKeyRenewalInstructions();
        process.exit(1);
    } else if (daysLeft < 14) {
        console.warn(`\x1b[33mWarning: Edge API key expires in ${Math.ceil(daysLeft)} day(s) (${expiry})\x1b[0m`);
        printKeyRenewalInstructions();
    }
}

// Edge answers an upload or a submit with 202 and an operation ID in the
// Location header, then works on it: the submit can still fail (a submission
// already in review, no changes, a validation error). Poll until it settles.
const API_BASE = 'https://api.addons.microsoftedge.microsoft.com/v1/products';
const POLL_INTERVAL_MS = 5000;
const POLL_TIMEOUT_MS = 5 * 60 * 1000;

const operationIdFrom = (response) => String(response.headers['location'] || '').split('/').filter(Boolean).pop() || '';

async function pollOperation(url, headers, label) {
    const deadline = Date.now() + POLL_TIMEOUT_MS;
    for (;;) {
        const { data } = await axios.get(url, { headers });
        if (data?.status && data.status !== 'InProgress') {
            return data;
        }
        if (Date.now() >= deadline) {
            return { status: 'InProgress', timedOut: true };
        }
        process.stdout.write(`\x1b[2m${label}: in progress...\x1b[0m\n`);
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
    }
}

const describeOperation = (op) =>
    [op.errorCode, op.message, ...(op.errors || []).map(e => e?.message || JSON.stringify(e))].filter(Boolean).join('\n  ');

function printKeyRenewalInstructions() {
    console.error(`\nRenew your API key at:\n  https://partner.microsoft.com/en-us/dashboard/microsoftedge/publishapi\n`);
    console.error(`Then update both EDGE_API_KEY and EDGE_API_KEY_EXPIRY in .env`);
}

async function main() {
    checkEnv();
    checkApiKeyExpiry();
    const manifest = getManifest();
    console.log(`\n\x1b[36m🚀 Starting Edge Publish Flow for version ${manifest.version}...\x1b[0m`);

    buildFresh('build-edge');

    const productId = process.env.EDGE_PRODUCT_ID;
    const clientId = process.env.EDGE_CLIENT_ID;
    const apiKey = process.env.EDGE_API_KEY;

    // API V1.1 Headers
    // Authorization: "API-Key <API_KEY>", "Client-ID <CLIENT_ID>" (based on MS docs for V1.1)
    // Actually, MS docs say: "Authorization": "ActiveDirectory <ACCESS_TOKEN>" for V1...
    // But for V1.1 it is often "X-Api-Key" or similar? 
    // Wait, let's look at the official docs again carefully.
    // "Response to the deprecation... V1.1... Uses API Key."
    // Common pattern: "Authorization: <ApiKey>" or header "X-Api-Key".
    // Let's try the standard pattern used by the library we just abandoned: "Authorization: <ApiKey>" is incorrect usually.
    // Re-reading: "X-Client-ID" and "X-Api-Key" are common.
    
    // Actually, let's look at what the successful library meant to do. 
    // The library uses: headers['Authorization'] = `RunAs apiKey=${apiKey}`; 
    // OR headers['XP-Client-ID'] = clientId 
    
    // Let's rely on standard V1.1 pattern: Authorization: ApiKey <key>
    // X-Client-ID is sometimes required.
    const headers = {
        'Authorization': `ApiKey ${apiKey}`,
        'X-ClientID': clientId,
    };

    const zipName = 'edge.zip';
    const zipPath = path.join(process.cwd(), zipName);

    if (!fs.existsSync(zipPath)) {
        console.error(`\x1b[31mError: ${zipName} not found.\x1b[0m`);
        process.exit(1);
    }

    // 1. Upload Package
    console.log('\n\x1b[33m[1/3] Uploading package to Edge Add-ons Store...\x1b[0m');
    const uploadUrl = `${API_BASE}/${productId}/submissions/draft/package`;

    try {
        const zipBuffer = fs.readFileSync(zipPath);
        
        const response = await axios.post(uploadUrl, zipBuffer, {
            headers: { ...headers, 'Content-Type': 'application/zip' },
            maxBodyLength: Infinity,
            maxContentLength: Infinity
        });

        const operationId = operationIdFrom(response);
        if (!operationId) {
            throw new Error('the upload response had no operation ID (Location header)');
        }
        const op = await pollOperation(`${uploadUrl}/operations/${operationId}`, headers, 'Package processing');
        if (op.status !== 'Succeeded') {
            console.error(`\x1b[31mEdge ${op.timedOut ? 'is still processing the package' : 'rejected the package'} (operation ${operationId}):\x1b[0m\n  ${describeOperation(op)}`);
            process.exit(1);
        }
        console.log(`\x1b[32m✔ Package uploaded and processed!\x1b[0m`);

    } catch (error) {
        console.error('\x1b[31mFailed to upload package:\x1b[0m');
        if (error.response) {
             console.error(`Status: ${error.response.status}`);
             console.error(`Data:`, error.response.data);
             if (error.response.status === 401 || error.response.status === 403) {
                 console.error(`\n\x1b[33mYour Edge API key is likely expired (they expire every ~2 months).\x1b[0m`);
                 printKeyRenewalInstructions();
             }
        } else {
            console.error(error.message);
        }
        process.exit(1);
    }

    // 2. Manual Description Check (Same as before)
    console.log('\n\x1b[33m[2/3] Manual Description Verification\x1b[0m');
    const description = readDescription();
    if (description) {
        copyToClipboard(description, 'Description');
    }
    
    // Open Dashboard
    const edgeUrl = `https://partner.microsoft.com/en-us/dashboard/microsoftedge/${productId}/listings`;
    console.log(`\n\x1b[35m📋 Edge Dashboard URL:\x1b[0m\n${edgeUrl}\n`);
    await open(edgeUrl);
    await prompt('\x1b[36mPress ENTER once you have verified/updated the store listing...\x1b[0m');

    // 3. Submit
    console.log('\n\x1b[33m[3/3] Submitting for Certification...\x1b[0m');
    const submitUrl = `${API_BASE}/${productId}/submissions`;
    try {
         const submitResp = await axios.post(submitUrl, {
            notes: `Version ${manifest.version} automated submission`
         }, { headers: { ...headers, 'Content-Type': 'application/json' } });

         const operationId = operationIdFrom(submitResp);
         if (!operationId) {
             throw new Error('the submit response had no operation ID (Location header)');
         }
         const op = await pollOperation(`${submitUrl}/operations/${operationId}`, headers, 'Submission');
         if (op.timedOut) {
             // Exiting cleanly without recording it: publish-all reports Edge as unconfirmed
             console.warn(`\x1b[33m⚠ Edge is still processing the submission (operation ${operationId}). Check Partner Center, then run publish:all again if it failed.\x1b[0m`);
             return;
         }
         if (op.status !== 'Succeeded') {
             console.error(`\x1b[31mEdge did not accept the submission (operation ${operationId}):\x1b[0m\n  ${describeOperation(op)}`);
             process.exit(1);
         }
         console.log(`\x1b[32m✔ Submitted for certification!\x1b[0m`);
         markPublished('edge');
    } catch (error) {
        console.error('\x1b[31mFailed to submit:\x1b[0m');
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error(`Data:`, error.response.data);
        } else {
             console.error(error.message);
        }
        process.exit(1);
    }
}

main();
