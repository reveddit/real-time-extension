// Synced from the shared source (see shared.json): change it there, not here.
//
// Edge Add-ons: upload edge.zip, pause so you can paste STORE_DESCRIPTION.txt into
// Partner Center (the API can't set listing text), then submit for certification.
// The Edge Add-ons API (v1.1, API key) through fetch. EDGE_API_KEY_EXPIRY, when
// set, warns two weeks before the key expires and stops once it has.
import fs from 'fs'
import {
    ARTIFACTS, c, getManifest, assertStore, assertVersionInDescription, requireEnv, startRun, stop, buildFresh,
    markPublished, pauseForListing,
} from './common.mjs'

const API_BASE = 'https://api.addons.microsoftedge.microsoft.com/v1/products'
// Edge answers an upload or a submit with 202 and an operation id in the Location
// header, then works on it: the submit can still fail (a submission already in
// review, no changes, a validation error), so each is polled until it settles.
// The tests shorten the waits.
const POLL_INTERVAL_MS = Number(process.env.EDGE_POLL_INTERVAL_MS) || 5000
const POLL_TIMEOUT_MS = Number(process.env.EDGE_POLL_TIMEOUT_MS) || 5 * 60 * 1000
const RENEW = 'Renew the API key at https://partner.microsoft.com/en-us/dashboard/microsoftedge/publishapi, then update EDGE_API_KEY and EDGE_API_KEY_EXPIRY in .env.'

function checkApiKeyExpiry() {
    const expiry = process.env.EDGE_API_KEY_EXPIRY
    if (!expiry) {
        console.warn(c.yellow("Warning: EDGE_API_KEY_EXPIRY isn't set in .env, so the key's expiry can't be checked."))
        return
    }
    const date = new Date(expiry)
    if (isNaN(date)) {
        console.warn(c.yellow(`Warning: can't read EDGE_API_KEY_EXPIRY: "${expiry}"`))
        return
    }
    const daysLeft = (date - Date.now()) / (24 * 60 * 60 * 1000)
    if (daysLeft < 0) stop(`The Edge API key expired on ${expiry}.`, RENEW, 'Edge API key expired')
    if (daysLeft < 14) console.warn(c.yellow(`Warning: the Edge API key expires in ${Math.ceil(daysLeft)} day(s) (${expiry}). ${RENEW}`))
}

// fetch, throwing on an answer that isn't 2xx, with its status and text
async function request(url, init, label) {
    const res = await fetch(url, init)
    if (res.ok) return res
    const error = new Error(`${label}: ${res.status} ${await res.text().catch(() => '')}`.trim())
    error.status = res.status
    throw error
}

const operationIdFrom = res => String(res.headers.get('location') || '').split('/').filter(Boolean).pop() || ''

async function pollOperation(url, headers, label) {
    const deadline = Date.now() + POLL_TIMEOUT_MS
    for (;;) {
        const data = await (await request(url, { headers }, label)).json()
        if (data?.status && data.status !== 'InProgress') return data
        if (Date.now() >= deadline) return { status: 'InProgress', timedOut: true }
        console.log(c.dim(`${label}: in progress...`))
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS))
    }
}

const describeOperation = op =>
    [op.errorCode, op.message, ...(op.errors || []).map(e => e?.message || JSON.stringify(e))].filter(Boolean).join('\n  ')

// A refused request: 401 and 403 mean the API key, which expires every few months
function requestFailed(what, error) {
    const keyHint = error.status === 401 || error.status === 403 ? `The Edge API key is likely expired. ${RENEW}` : ''
    stop(`${what} failed: ${error.message}`, keyHint, `${what.toLowerCase()} failed`)
}

async function main() {
    startRun('edge')
    assertStore('edge')
    requireEnv(['EDGE_PRODUCT_ID', 'EDGE_CLIENT_ID', 'EDGE_API_KEY'])
    checkApiKeyExpiry()
    const version = getManifest().version
    assertVersionInDescription(version)
    console.log(c.cyan(`🚀 Edge publish flow for v${version}`))

    // Always upload a freshly built edge.zip: a stale one could be from an older commit
    const commit = buildFresh('edge')
    const productId = process.env.EDGE_PRODUCT_ID
    const headers = { Authorization: `ApiKey ${process.env.EDGE_API_KEY}`, 'X-ClientID': process.env.EDGE_CLIENT_ID }

    console.log('\n' + c.yellow('[1/3] Uploading edge.zip...'))
    const uploadUrl = `${API_BASE}/${productId}/submissions/draft/package`
    let op, operationId
    try {
        const res = await request(
            uploadUrl,
            { method: 'POST', headers: { ...headers, 'Content-Type': 'application/zip' }, body: fs.readFileSync(ARTIFACTS.edge) },
            'Upload',
        )
        operationId = operationIdFrom(res)
        if (!operationId) throw new Error('the answer had no operation id (Location header)')
        op = await pollOperation(`${uploadUrl}/operations/${operationId}`, headers, 'Package processing')
    } catch (error) {
        requestFailed('Upload', error)
    }
    if (op.status !== 'Succeeded') {
        stop(
            `Edge ${op.timedOut ? 'is still processing the package' : 'refused the package'} (operation ${operationId}):\n  ${describeOperation(op)}`,
            '',
            op.timedOut ? 'package still processing' : 'package refused',
        )
    }
    console.log(c.green('✔ Package uploaded and processed'))

    console.log('\n' + c.yellow('[2/3] Store listing description...'))
    await pauseForListing({
        store: 'edge',
        commit,
        url: `https://partner.microsoft.com/en-us/dashboard/microsoftedge/${productId}/listings`,
        explain: ["The Edge Add-ons API can't set the listing text: paste it in Partner Center."],
        save: "Save it there, but don't publish from Partner Center: the next step submits the upload and the saved listing together.",
        enter: 'Press ENTER once the listing is saved > ',
        later: 'check the listing description in Partner Center',
    })

    console.log('\n' + c.yellow('[3/3] Submitting for certification...'))
    const submitUrl = `${API_BASE}/${productId}/submissions`
    try {
        const res = await request(
            submitUrl,
            {
                method: 'POST',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({ notes: `Version ${version} automated submission` }),
            },
            'Submit',
        )
        operationId = operationIdFrom(res)
        if (!operationId) throw new Error('the answer had no operation id (Location header)')
        op = await pollOperation(`${submitUrl}/operations/${operationId}`, headers, 'Submission')
    } catch (error) {
        requestFailed('Submit', error)
    }
    if (op.timedOut) {
        // Exits cleanly without recording it: publish-all reports Edge as unconfirmed
        console.warn(
            c.yellow(`⚠ Edge is still processing the submission (operation ${operationId}). Check Partner Center, then run publish:all again if it failed.`),
        )
        return
    }
    if (op.status !== 'Succeeded') {
        stop(`Edge didn't accept the submission (operation ${operationId}):\n  ${describeOperation(op)}`, '', 'submission refused')
    }
    console.log(c.green('✔ Submitted for certification. It goes live once Microsoft certifies it, which can take days.'))
    markPublished('edge', commit)
}

main().catch(e => stop(`Edge publish failed: ${e.message || e}`, '', String(e.message || e).slice(0, 200)))
