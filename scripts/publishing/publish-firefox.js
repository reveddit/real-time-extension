
import webExt from 'web-ext';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import { execSync } from 'child_process';
import { CONFIG, readDescription, getManifest, setupAbortHandler } from './common.js';

setupAbortHandler();
dotenv.config();

const requiredEnvVars = [
    'FIREFOX_JWT_ISSUER',
    'FIREFOX_JWT_SECRET',
    'FIREFOX_EXTENSION_ID' 
];

function checkEnv() {
    const missing = requiredEnvVars.filter(key => !process.env[key]);
    if (missing.length > 0) {
        console.error(`\x1b[31mError: Missing environment variables: ${missing.join(', ')}\x1b[0m`);
        process.exit(1);
    }
}

async function createSourceZip() {
    console.log('\n\x1b[33m[1/3] Zipping source code for review...\x1b[0m');
    const zipName = 'source-code-submission.zip';
    const zipPath = path.join(process.cwd(), zipName);
    
    // Remove old zip if exists
    if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);

    // Zip command that excludes sensitive and ignored files
    // -x matches relative paths. 
    // We exclude: .env (CRITICAL), node_modules, .git, dist folders, artifacts, and any existing zips
    const cmd = `zip -r "${zipName}" . -x "*.env*" "node_modules/*" ".git/*" "dist-*" "web-ext-artifacts/*" "*.zip" ".DS_Store"`;
    
    try {
        execSync(cmd, { stdio: 'inherit' });
        console.log(`\x1b[32m✔ Source code zipped: ${zipName}\x1b[0m`);
        return zipPath;
    } catch (error) {
        console.error('\x1b[31mFailed to zip source code:\x1b[0m', error);
        process.exit(1);
    }
}

function generateJWT() {
    const issuedAt = Math.floor(Date.now() / 1000);
    const payload = {
        iss: process.env.FIREFOX_JWT_ISSUER,
        jti: Math.random().toString(),
        iat: issuedAt,
        exp: issuedAt + 60 // 1 minute expiry
    };
    return jwt.sign(payload, process.env.FIREFOX_JWT_SECRET, { algorithm: 'HS256' });
}

async function updateStoreListing() {
    console.log('\n\x1b[33m[3/3] Updating Store Description...\x1b[0m');
    const description = readDescription();
    if (!description) {
        console.log('No description file found, skipping metadata update.');
        return;
    }

    const extensionId = process.env.FIREFOX_EXTENSION_ID; // The GUID (e.g. {uuid} or email-style)
    const url = `https://addons.mozilla.org/api/v5/addons/addon/${extensionId}/`;
    const token = generateJWT();

    // AMO API expects partial update for description
    // Field is "description": { "en-US": "..." } if localized, or string if not? 
    // Usually it is a localized object.
    const body = {
        description: {
            "en-US": description
        }
    };

    try {
        const response = await fetch(url, {
            method: 'PATCH',
            headers: {
                'Authorization': `JWT ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`API Error ${response.status}: ${errText}`);
        }

        console.log('\x1b[32m✔ Store description updated successfully!\x1b[0m');
    } catch (error) {
         console.error('\x1b[31mFailed to update description:\x1b[0m', error.message);
         // Don't exit process here, as the critical part (publishing) succeeded.
    }
}

async function main() {
    checkEnv();
    const manifest = getManifest();

    // Check for text-only mode
    if (process.argv.includes('--text-only')) {
        console.log(`\n\x1b[36m🚀 Updating Firefox Store Description Only (v${manifest.version})...\x1b[0m`);
        await updateStoreListing();
        return;
    }

    console.log(`\n\x1b[36m🚀 Starting Firefox Publish Flow for version ${manifest.version}...\x1b[0m`);

    const sourceZipPath = await createSourceZip();

    console.log('\n\x1b[33m[2/3] Signing and Submitting to AMO...\x1b[0m');

    try {
        const runResult = await webExt.cmd.sign({
            apiKey: process.env.FIREFOX_JWT_ISSUER,
            apiSecret: process.env.FIREFOX_JWT_SECRET,
            sourceDir: path.join(process.cwd(), 'dist-firefox'), 
            artifactsDir: path.join(process.cwd(), 'web-ext-artifacts'),
            channel: 'listed',
            shouldExitProgram: false,
            amoBaseUrl: 'https://addons.mozilla.org/api/v5/', 
            uploadSourceCode: sourceZipPath, // This attaches the source for review
        }, {
            shouldExitProgram: false,
        });

        console.log('\x1b[32m✔ Firefox Signing/Publishing process completed!\x1b[0m');
        
        // Clean up source zip
        if (fs.existsSync(sourceZipPath)) fs.unlinkSync(sourceZipPath);

        // Update the description
        await updateStoreListing();
        
    } catch (error) {
        console.error('\x1b[31mFirefox Publish Failed:\x1b[0m', error);
        process.exit(1);
    }
}

main();
