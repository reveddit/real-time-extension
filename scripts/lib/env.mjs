// Synced from the shared source (see shared.json): change it there, not here.
//
// Tiny .env support, with no dotenv dependency.
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
export const ENV_PATH = path.join(ROOT, '.env')

// Populate process.env from .env (existing env vars win). Safe if .env is absent.
export function loadDotEnv() {
    let text
    try {
        text = fs.readFileSync(ENV_PATH, 'utf8')
    } catch {
        return
    }
    for (const line of text.split('\n')) {
        const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
        if (m && !line.trim().startsWith('#') && !(m[1] in process.env)) {
            process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
        }
    }
}

// Set or replace one KEY=value line in .env (the Chrome token refresh uses it).
export function saveEnvVar(key, value) {
    let text = ''
    try {
        text = fs.readFileSync(ENV_PATH, 'utf8')
    } catch {
        /* create it */
    }
    const line = `${key}=${value}`
    const re = new RegExp(`^${key}=.*$`, 'm')
    text = re.test(text) ? text.replace(re, line) : text + (text.endsWith('\n') || !text ? '' : '\n') + line + '\n'
    fs.writeFileSync(ENV_PATH, text)
    process.env[key] = value
}
