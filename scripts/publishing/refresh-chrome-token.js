import fs from 'fs';
import http from 'http';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Manually parse .env to avoid package resolution issues
const envPath = path.resolve(__dirname, '../../.env');
let clientId = process.env.CHROME_CLIENT_ID;
let clientSecret = process.env.CHROME_CLIENT_SECRET;
let oauthPort = process.env.OAUTH_PORT;

if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envVars = Object.fromEntries(
        envContent.split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('#') && line.includes('='))
            .map(line => [line.substring(0, line.indexOf('=')).trim(), line.substring(line.indexOf('=') + 1).trim()])
    );
    clientId = clientId || envVars.CHROME_CLIENT_ID;
    clientSecret = clientSecret || envVars.CHROME_CLIENT_SECRET;
    oauthPort = oauthPort || envVars.OAUTH_PORT;
}

async function main() {

    if (!clientId || !clientSecret) {
        console.error("\x1b[31mError: Missing CHROME_CLIENT_ID or CHROME_CLIENT_SECRET in .env\x1b[0m");
        process.exit(1);
    }

    const port = parseInt(oauthPort || '3000', 10);
    const redirectUri = `http://localhost:${port}`;
    const scope = 'https://www.googleapis.com/auth/chromewebstore';
    
    // Using prompt=consent and access_type=offline guarantees we get a refresh_token
    const authUrl = `https://accounts.google.com/o/oauth2/auth?response_type=code&scope=${scope}&client_id=${clientId}&access_type=offline&prompt=consent&redirect_uri=${redirectUri}`;

    const server = http.createServer(async (req, res) => {
        // Strip out the query string to parse
        const urlObj = new URL(req.url, `http://localhost:${port}`);
        
        if (urlObj.pathname === '/') {
            const code = urlObj.searchParams.get('code');
            const error = urlObj.searchParams.get('error');

            if (error) {
                res.writeHead(400, { 'Content-Type': 'text/html' });
                res.end(`<h1>Authorization Failed</h1><p>Error: ${error}</p><p>Please check your terminal.</p>`);
                console.error(`\x1b[31mAuthorization error from Google:\x1b[0m ${error}`);
                server.close();
                process.exit(1);
            } else if (code) {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end('<h1>Authorization Successful!</h1><p>You can close this tab and return to your terminal.</p>');
                
                console.log("\n\x1b[32m✔ Received authorization code from Google.\x1b[0m Fetching new refresh token...");

                try {
                    const response = await fetch('https://oauth2.googleapis.com/token', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: new URLSearchParams({
                            client_id: clientId,
                            client_secret: clientSecret,
                            code: code,
                            grant_type: 'authorization_code',
                            redirect_uri: redirectUri
                        })
                    });

                    const data = await response.json();

                    if (!response.ok || data.error) {
                        console.error("\x1b[31mError fetching token:\x1b[0m", data);
                        process.exit(1);
                    }

                    const refreshToken = data.refresh_token;
                    if (!refreshToken) {
                        console.error("\x1b[31mNo refresh token returned!\x1b[0m This usually means you didn't grant offline access, or you already authorized it recently without revoking it. Try going to https://myaccount.google.com/permissions and removing access for this app, then try again.");
                        process.exit(1);
                    }

                    console.log("\x1b[32m✔ Successfully got new refresh token!\x1b[0m");
                    
                    const envPath = path.resolve(__dirname, '../../.env');
                    if (fs.existsSync(envPath)) {
                        let envVal = fs.readFileSync(envPath, 'utf8');
                        if (envVal.includes('CHROME_REFRESH_TOKEN=')) {
                            // Replace existing while preserving other stuff
                            envVal = envVal.replace(/^CHROME_REFRESH_TOKEN=.*$/gm, `CHROME_REFRESH_TOKEN=${refreshToken}`);
                        } else {
                            envVal += `\nCHROME_REFRESH_TOKEN=${refreshToken}\n`;
                        }
                        fs.writeFileSync(envPath, envVal);
                        console.log("\x1b[32m✔ Automatically updated CHROME_REFRESH_TOKEN in .env\x1b[0m");
                    } else {
                        console.log(`\n\x1b[33mCould not find .env file to update automatically.\x1b[0m`);
                        console.log(`Please manually update your .env file with:\nCHROME_REFRESH_TOKEN=${refreshToken}`);
                    }
                } catch (err) {
                    console.error("\x1b[31mFailed to fetch token:\x1b[0m", err);
                } finally {
                    server.closeAllConnections?.();
                    server.close(() => process.exit(0));
                }
            } else {
                 res.writeHead(404);
                 res.end('Not found');
            }
        }
    });

    server.on('error', (e) => {
        if (e.code === 'EADDRINUSE') {
            console.error(`\x1b[31mPort ${port} is already in use.\x1b[0m Please free it or set OAUTH_PORT in your environment to a different number.`);
            process.exit(1);
        } else {
            console.error(e);
        }
    });

    server.listen(port, async () => {
        console.log(`\n\x1b[36m🚀 Starting Chrome Token Refresh Flow...\x1b[0m`);
        console.log(`Local server listening on \x1b[33mhttp://localhost:${port}\x1b[0m to receive the authorization redirect.`);
        console.log("\nPlease open the following URL in your browser to authorize:");
        console.log(`\n\x1b[35m${authUrl}\x1b[0m\n`);
        
        console.log("\x1b[2m(If you get a 'redirect_uri_mismatch' error, make sure http://localhost:3000 is added to your Authorized redirect URIs in the Google Cloud Console under Credentials -> OAuth 2.0 Client IDs. Let me know if you need help with this!)\x1b[0m\n");
    });
}

main();
