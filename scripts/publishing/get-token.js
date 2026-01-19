
import readline from 'readline';
import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

const oauth2Client = new google.auth.OAuth2(
    process.env.CHROME_CLIENT_ID,
    process.env.CHROME_CLIENT_SECRET,
    'urn:ietf:wg:oauth:2.0:oob' // This is the magic "I'm a manual CLI" redirect URI
);

// 1. Generate the URL to visit
const scopes = [
    'https://www.googleapis.com/auth/chromewebstore'
];

const url = oauth2Client.generateAuthUrl({
    access_type: 'offline', // CRITICAL: This ensures we get a Refresh Token
    scope: scopes
});

console.log('\n\x1b[1m\x1b[36m=== Refresh Token Generator ===\x1b[0m');
console.log('1. Visit this URL in your browser:');
console.log(`\n\x1b[4m${url}\x1b[0m\n`);
console.log('2. Log in with the account that owns the Chrome Extension.');
console.log('3. You will see a code (or be redirected to a page that failed loading, but check the URL bar for "code=").');
console.log('4. Paste that code here:');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question('\n> Code: ', async (code) => {
    try {
        const { tokens } = await oauth2Client.getToken(code);
        console.log('\n\x1b[32m✔ SUCCESS!\x1b[0m');
        console.log('\nCopy this Refresh Token into your .env file as CHROME_REFRESH_TOKEN:\n');
        console.log(`\x1b[1m\x1b[33m${tokens.refresh_token}\x1b[0m`);
        console.log('\n(Note: If it says "undefined", it means you have already authorized this app before online without revoking access. Go to https://myaccount.google.com/permissions to revoke "Uploader" access, then try again to force a new Refresh Token.)');
    } catch (e) {
        console.error('\n\x1b[31mError getting token:\x1b[0m', e.message);
    }
    rl.close();
});
