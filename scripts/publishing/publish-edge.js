import axios from 'axios';
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import open from 'open';
import readline from 'readline';
import dotenv from 'dotenv';
import { getManifest, readDescription, copyToClipboard } from './common.js';

dotenv.config();

const requiredEnvVars = ['EDGE_PRODUCT_ID', 'EDGE_CLIENT_ID', 'EDGE_API_KEY'];

function checkEnv() {
    const missing = requiredEnvVars.filter(key => !process.env[key]);
    if (missing.length > 0) {
        console.error(`\x1b[31mError: Missing environment variables: ${missing.join(', ')}\x1b[0m`);
        process.exit(1);
    }
}

function askQuestion(query) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    return new Promise(resolve => rl.question(query, ans => {
        rl.close();
        resolve(ans);
    }));
}

async function main() {
    checkEnv();
    const manifest = getManifest();
    console.log(`\n\x1b[36m🚀 Starting Edge Publish Flow for version ${manifest.version}...\x1b[0m`);

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
    const uploadUrl = `https://api.addons.microsoftedge.microsoft.com/v1/products/${productId}/submissions/draft/package`;

    try {
        const zipBuffer = fs.readFileSync(zipPath);
        
        const requestHeaders = {
            ...headers,
            'Content-Type': 'application/zip'
        };
        console.log('Debug: Sending headers:', JSON.stringify(requestHeaders, null, 2));

        const response = await axios.post(uploadUrl, zipBuffer, {
            headers: requestHeaders,
            maxBodyLength: Infinity,
            maxContentLength: Infinity
        });

        const operationId = response.headers['location']; // Often returned in Location header for async ops
        console.log(`\x1b[32m✔ Package uploaded successfully!\x1b[0m`);
        if (operationId) console.log(`Operation ID: ${operationId}`);

    } catch (error) {
        console.error('\x1b[31mFailed to upload package:\x1b[0m');
        if (error.response) {
             console.error(`Status: ${error.response.status}`);
             console.error(`Data:`, error.response.data);
        } else {
            console.error(error.message);
        }
        // If it fails with 401/403, we might need to debug headers.
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
    await askQuestion('\x1b[36mPress ENTER once you have verified/updated the store listing...\x1b[0m');

    // 3. Submit
    console.log('\n\x1b[33m[3/3] Submitting for Certification...\x1b[0m');
    const submitUrl = `https://api.addons.microsoftedge.microsoft.com/v1/products/${productId}/submissions`;
    try {
         const submitResp = await axios.post(submitUrl, {
            notes: `Version ${manifest.version} automated submission`
         }, { headers: { ...headers, 'Content-Type': 'application/json' } });

         console.log(`\x1b[32m✔ Submitted! ID: ${submitResp.data.id || 'Success'}\x1b[0m`);
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
