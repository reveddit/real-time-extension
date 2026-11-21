// Synced from the shared source (see shared.json): change it there, not here.
//
// Guided refresh of CHROME_REFRESH_TOKEN: starts a localhost server, opens the
// Google consent URL, exchanges the returned code, and writes the new token to
// .env. Needs http://localhost:<OAUTH_PORT|3000> among the OAuth client's
// Authorized redirect URIs in Google Cloud Console.
import http from 'http'
import { saveEnvVar } from '../lib/env.mjs'
import { c, openUrl, requireEnv, setupAbortHandler } from './common.mjs'

setupAbortHandler()
requireEnv(['CHROME_CLIENT_ID', 'CHROME_CLIENT_SECRET'])

const clientId = process.env.CHROME_CLIENT_ID
const clientSecret = process.env.CHROME_CLIENT_SECRET
const port = parseInt(process.env.OAUTH_PORT || '3000', 10)
const redirectUri = `http://localhost:${port}`
const scope = 'https://www.googleapis.com/auth/chromewebstore'
// prompt=consent + access_type=offline guarantees a fresh refresh_token
const authUrl =
    'https://accounts.google.com/o/oauth2/auth?response_type=code' +
    `&scope=${scope}&client_id=${clientId}&access_type=offline&prompt=consent&redirect_uri=${redirectUri}`

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, redirectUri)
    if (url.pathname !== '/') {
        res.writeHead(404).end()
        return
    }
    const code = url.searchParams.get('code')
    const error = url.searchParams.get('error')
    if (error || !code) {
        res.writeHead(400, { 'Content-Type': 'text/html' })
        res.end(`<h1>Authorization failed</h1><p>${error ? 'Google said no' : 'no code'}: check your terminal.</p>`)
        console.error(c.red(`Authorization error from Google: ${error || 'no code returned'}`))
        server.close(() => process.exit(1))
        return
    }
    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end('<h1>Authorization successful!</h1><p>You can close this tab and return to your terminal.</p>')
    console.log('\n' + c.green('✔ Got authorization code.') + ' Exchanging for a refresh token...')
    try {
        const data = await (
            await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    client_id: clientId,
                    client_secret: clientSecret,
                    code,
                    grant_type: 'authorization_code',
                    redirect_uri: redirectUri,
                }),
            })
        ).json()
        if (!data.refresh_token) {
            console.error(c.red('No refresh token returned!'), JSON.stringify(data.error || data))
            console.error('If you authorized recently, revoke the app at https://myaccount.google.com/permissions and retry.')
            server.close(() => process.exit(1))
            return
        }
        saveEnvVar('CHROME_REFRESH_TOKEN', data.refresh_token)
        console.log(c.green('✔ CHROME_REFRESH_TOKEN updated in .env'))
        server.closeAllConnections?.()
        server.close(() => process.exit(0))
    } catch (e) {
        console.error(c.red('Token exchange failed:'), e.message)
        server.close(() => process.exit(1))
    }
})

server.on('error', e => {
    if (e.code === 'EADDRINUSE') {
        console.error(c.red(`Port ${port} is in use: free it or set OAUTH_PORT to another port.`))
        process.exit(1)
    }
    throw e
})

server.listen(port, () => {
    console.log(c.cyan('🚀 Chrome token refresh flow'))
    console.log(`Listening on ${c.yellow(redirectUri)} for the authorization redirect.`)
    console.log('\nAuthorize in your browser (opening now):')
    console.log('\n' + c.magenta(authUrl) + '\n')
    console.log(`(A redirect_uri_mismatch means ${redirectUri} must be added to the OAuth client's Authorized redirect URIs.)`)
    openUrl(authUrl)
})
