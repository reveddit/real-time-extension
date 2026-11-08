// The sign-in tests' logging (scripts/script-helpers.cjs signinLog): both tests
// share it, so hiding a password can't be fixed in one and missed in the other.

import { createRequire } from 'module'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const { signinLog } = createRequire(import.meta.url)('../../scripts/script-helpers.cjs')

let dir, logFile, printed

beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'signin-log-'))
    logFile = path.join(dir, 'test.log')
    printed = vi.spyOn(console, 'log').mockImplementation(() => {})
})

afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true })
})

describe('signinLog', () => {
    it('stamps each line and sends it to the screen and the file, passwords hidden', () => {
        const { log } = signinLog(logFile, ['hunter2', 'swordfish'])
        log('typed', 'hunter2', 'then swordfish')
        const [line] = printed.mock.calls[0]
        expect(line).toMatch(/^\d\d:\d\d:\d\d typed \*\*\* then \*\*\*$/)
        expect(fs.readFileSync(logFile, 'utf8')).toBe(`${line}\n`)
    })

    it('hides passwords in text for an error, too', () => {
        const { hide } = signinLog(logFile, ['hunter2'])
        expect(hide(new Error('bad hunter2'))).toBe('Error: bad ***')
    })

    it('records each check and logs it as PASS or FAIL', () => {
        const { check, results } = signinLog(logFile, [])
        check(true, 'it worked')
        check(false, 'it broke')
        expect(results).toEqual([true, false])
        const lines = fs.readFileSync(logFile, 'utf8').trim().split('\n')
        expect(lines[0]).toMatch(/PASS it worked$/)
        expect(lines[1]).toMatch(/FAIL it broke$/)
    })
})
