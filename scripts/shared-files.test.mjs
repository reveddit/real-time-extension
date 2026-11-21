// Synced from the shared source (see shared.json): change it there, not here.
//
// The files synced into this repo from the shared source must match it byte for
// byte. shared.lock.json lists each one with its sha256, as the last sync wrote
// it. A fix made in a copy here would be lost at the next sync, and the other
// repos wouldn't get it: make the change in the shared source, then sync it.
import { describe, it, expect } from 'vitest'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const readJson = file => JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'))
const sha256 = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, file))).digest('hex')

describe('the shared files', () => {
    const lock = readJson('shared.lock.json')

    it('are the modules shared.json takes, as last synced', () => {
        const wanted = ['core', ...Object.keys(readJson('shared.json').modules || {})].sort()
        expect(Object.keys(lock.modules).sort(), 'shared.json changed since the last sync: sync it again').toEqual(wanted)
    })

    it('match the shared source', () => {
        const changed = []
        for (const files of Object.values(lock.modules)) {
            for (const [file, hash] of Object.entries(files)) {
                if (!fs.existsSync(path.join(ROOT, file))) changed.push(`${file} (missing)`)
                else if (sha256(file) !== hash) changed.push(file)
            }
        }
        expect(changed, 'These shared files were changed here. Make the change in the shared source and sync it instead.').toEqual([])
    })
})
