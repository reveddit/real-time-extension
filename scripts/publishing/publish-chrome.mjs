// Synced from the shared source (see shared.json): change it there, not here.
//
// Chrome Web Store: upload chrome.zip, pause so you can paste STORE_DESCRIPTION.txt
// into the dashboard (and fill the Privacy tab, when shared.json names a privacy
// file), since the API can set neither, then submit for review. On an expired
// refresh token (invalid_grant) it offers the guided refresh and retries. The
// Chrome Web Store HTTP API, through fetch.
import fs from 'fs'
import path from 'path'
import { spawnSync } from 'child_process'
import { fileURLToPath } from 'url'
import { loadDotEnv } from '../lib/env.mjs'
import {
    ARTIFACTS, SETTINGS, c, getManifest, assertStore, assertVersionInDescription, requireEnv, startRun, stop,
    isInteractive, prompt, buildFresh, markPublished, pauseForListing,
} from './common.mjs'

const API = 'https://www.googleapis.com'

async function accessToken() {
    const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: process.env.CHROME_CLIENT_ID,
            client_secret: process.env.CHROME_CLIENT_SECRET,
            refresh_token: process.env.CHROME_REFRESH_TOKEN,
            grant_type: 'refresh_token',
        }),
    })
    const data = await res.json()
    if (data.error) {
        const err = new Error(`token: ${data.error} ${data.error_description || ''}`)
        err.invalidGrant = data.error === 'invalid_grant'
        throw err
    }
    return data.access_token
}

const headers = token => ({ Authorization: `Bearer ${token}`, 'x-goog-api-version': '2' })

// The item's edit page: /u/<n>/ picks the browser's Google account that publishes
// it, and the publisher id is optional
function dashboardUrl(id) {
    const user = SETTINGS.chromeDashboardUser === null ? '' : `u/${SETTINGS.chromeDashboardUser}/`
    const publisher = process.env.CHROME_DASHBOARD_ID ? `${process.env.CHROME_DASHBOARD_ID}/` : ''
    return `https://chrome.google.com/${user}webstore/devconsole/${publisher}${id}/edit`
}

async function uploadAndSubmit(commit) {
    const token = await accessToken()
    const id = process.env.CHROME_EXTENSION_ID

    console.log('\n' + c.yellow('[1/3] Uploading chrome.zip...'))
    const up = await (
        await fetch(`${API}/upload/chromewebstore/v1.1/items/${id}`, {
            method: 'PUT',
            headers: headers(token),
            body: fs.readFileSync(ARTIFACTS.chrome),
        })
    ).json()
    if (up.uploadState === 'FAILURE') stop(`Upload failed: ${JSON.stringify(up.itemError)}`, '', 'upload refused')
    console.log(c.green(`✔ Upload ${up.uploadState || 'accepted'}`))

    const privacy = SETTINGS.privacyFile
    console.log('\n' + c.yellow(privacy ? '[2/3] Store listing description and privacy...' : '[2/3] Store listing description...'))
    await pauseForListing({
        store: 'chrome',
        commit,
        url: dashboardUrl(id),
        explain: privacy
            ? [
                  'The Chrome Web Store API sets neither the listing text nor the Privacy tab: do both in the dashboard.',
                  `A permission new in this version gets its justification field only now, with the upload: paste it from ${privacy}.`,
              ]
            : ["The Chrome Web Store API can't set the listing text: paste it in the dashboard."],
        // The submit below takes the saved draft, so an edit not yet saved is left
        // out, and a submission from the dashboard locks the item until its review ends
        save: 'Click Save draft there, not Submit for review: the next step submits the upload and the saved listing together.',
        enter: privacy
            ? 'Press ENTER once the listing description and the Privacy tab are saved > '
            : 'Press ENTER once the listing is saved > ',
        later: privacy
            ? 'check the listing description and the Privacy tab in the dashboard'
            : 'check the listing description in the dashboard',
    })

    console.log('\n' + c.yellow('[3/3] Submitting for review...'))
    const pub = await (await fetch(`${API}/chromewebstore/v1.1/items/${id}/publish`, { method: 'POST', headers: headers(token) })).json()
    if (pub.status?.[0] !== 'OK') stop(`Submit failed or returned warnings: ${JSON.stringify(pub)}`, '', 'submit not accepted')
    console.log(c.green("✔ Submitted for review. It goes live once the review clears; until then the dashboard won't take another submission."))
    markPublished('chrome', commit)
}

async function main() {
    startRun('chrome')
    assertStore('chrome')
    requireEnv(['CHROME_EXTENSION_ID', 'CHROME_CLIENT_ID', 'CHROME_CLIENT_SECRET', 'CHROME_REFRESH_TOKEN'])
    const version = getManifest().version
    assertVersionInDescription(version)
    console.log(c.cyan(`🚀 Chrome publish flow for v${version}`))

    // Always upload a freshly built chrome.zip: a stale one could be from an older commit
    const commit = buildFresh('chrome')

    try {
        await uploadAndSubmit(commit)
    } catch (error) {
        if (!error.invalidGrant) throw error
        console.error('\n' + c.red('Chrome Web Store token expired or invalid.'))
        if (!isInteractive()) stop('Run `yarn refresh:chrome` locally to mint a new CHROME_REFRESH_TOKEN.', '', 'Chrome token expired')
        const answer = await prompt('\nRun the token refresh flow now? (Y/n) > ')
        if (answer.toLowerCase() !== 'y' && answer.trim() !== '') stop('Not refreshed, so nothing was submitted.', '', 'Chrome token expired')
        const dir = path.dirname(fileURLToPath(import.meta.url))
        const r = spawnSync(process.execPath, [path.join(dir, 'refresh-chrome-token.mjs')], { stdio: 'inherit' })
        if (r.status !== 0) stop('Token refresh failed or was aborted.', '', 'Chrome token refresh failed')
        delete process.env.CHROME_REFRESH_TOKEN // re-read the value the refresh flow just saved
        loadDotEnv()
        console.log('\n' + c.green('✔ Token refreshed, retrying...'))
        await uploadAndSubmit(commit)
    }
}

main().catch(e => stop(`Chrome publish failed: ${e.message || e}`, '', String(e.message || e).slice(0, 200)))
