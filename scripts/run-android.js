// Runs web-ext against the Android emulator and prints a dev-workflow
// banner after the initial install so logs can be captured cleanly.
import { spawn } from 'child_process'
import { existsSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'

function resolveAdb() {
  if (process.env.ADB) return process.env.ADB
  const candidate = join(homedir(), 'Library/Android/sdk/platform-tools/adb')
  if (existsSync(candidate)) return candidate
  return 'adb'
}

const ADB = resolveAdb()

function startLogcat() {
  // Clear prior log buffer so we only see fresh output from this run.
  spawn(ADB, ['logcat', '-c'], { stdio: 'ignore' }).on('exit', () => {
    const logcat = spawn(
      ADB,
      ['logcat', '-v', 'brief', 'Gecko:I', 'GeckoConsole:V', '*:S'],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    )
    const tag = '\x1b[36m[logcat]\x1b[0m '
    const NOISE = /GFX1-|shader-cache|program_binary|Failed to load a program/
    const prefix = (chunk) =>
      chunk
        .toString()
        .split('\n')
        .filter((l) => l && !NOISE.test(l))
        .map((l) => tag + l)
        .join('\n') + '\n'
    logcat.stdout.on('data', (c) => {
      const out = prefix(c)
      if (out.trim()) process.stdout.write(out)
    })
    logcat.stderr.on('data', (c) => {
      const out = prefix(c)
      if (out.trim()) process.stderr.write(out)
    })
    process.on('exit', () => logcat.kill())
  })
}

function printBanner() {
  const lines = [
    '',
    '============================================================',
    '  Android dev workflow',
    '============================================================',
    '  Extension is installed on the emulator. To capture logs:',
    '',
    '    1. Desktop Firefox → about:debugging',
    '    2. Under USB Devices click "Connect" next to the emulator',
    '       (e.g. "sdk_gphone64_arm64") → click the device name',
    '    3. Temporary Extensions → "Inspect" on reveddit real-time',
    '',
    '  To replay the install-time flow (fires subscribe + lookup):',
    '    In the devtools console, run:  __replayInstall()',
    '    This clears storage and reruns the install logic — no',
    '    need to reinstall the extension or reconnect ADB.',
    '',
    '  For code edits:',
    '    - Save a file → webpack rebuilds → extension auto-reloads.',
    '    - Extension-page tabs (options/history) need a manual refresh.',
    '    - Devtools stays attached across reloads.',
    '    - Ctrl-C to stop everything.',
    '============================================================',
    '',
  ]
  process.stdout.write(lines.join('\n'))
}

const child = spawn(
  'npx',
  [
    'web-ext', 'run',
    '--source-dir', 'dist-dev-firefox',
    '-t', 'firefox-android',
    '--adb-device', 'emulator-5554',
    '--firefox-apk', 'org.mozilla.firefox',
  ],
  { stdio: ['inherit', 'pipe', 'inherit'] }
)

let printed = false
child.stdout.on('data', (chunk) => {
  process.stdout.write(chunk)
  if (!printed && chunk.toString().includes('as a temporary add-on')) {
    printed = true
    setTimeout(() => {
      printBanner()
      startLogcat()
    }, 200)
  }
})

child.on('exit', (code) => process.exit(code ?? 0))
