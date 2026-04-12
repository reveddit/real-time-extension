// Prints a reminder of the Android dev workflow before yarn dev-android starts.
const lines = [
  '',
  '============================================================',
  '  Android dev workflow',
  '============================================================',
  '  1. Wait for: "Installed ... as a temporary add-on"',
  '  2. In desktop Firefox: about:debugging → This Firefox',
  '     → connect USB device → Inspect the background script',
  '  3. In THIS terminal: press "R" to reload extension so',
  '     devtools catches install-time logs from the start',
  '  4. Edit source files — webpack rebuilds, web-ext reloads',
  '     automatically. Extension-page tabs need manual refresh.',
  '  5. Ctrl-C to stop.',
  '============================================================',
  '',
]
console.log(lines.join('\n'))
