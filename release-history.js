// STORE_DESCRIPTION.txt's VERSION HISTORY as a list for the build, newest first:
// each release's version, its date (as 2026/11/17) and its notes. An entry
// reads "2026/11/17 - 0.0.5.37", then one "- note" line for each note. The older
// entries write their dates with dashes or one-digit months and days; they come
// out as above too.
const DATED = /^\d{4}[/-]\d{1,2}[/-]\d{1,2}\s*-/
const HEADER = /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})\s*-\s*(\d+(?:\.\d+)+)$/

export const parseReleaseHistory = text => {
    const lines = text.split('\n').map(line => line.trim())
    const start = lines.findIndex(line => line.startsWith('VERSION HISTORY'))
    if (start === -1) throw new Error('STORE_DESCRIPTION.txt: could not find VERSION HISTORY section')
    const releases = []
    for (const line of lines.slice(start + 1)) {
        const header = line.match(HEADER)
        if (header) {
            const [, year, month, day, version] = header
            releases.push({ version, date: `${year}/${month.padStart(2, '0')}/${day.padStart(2, '0')}`, notes: [] })
        } else if (DATED.test(line)) {
            // Skipped, its notes would be filed under the release above it
            throw new Error(`STORE_DESCRIPTION.txt: can't read this VERSION HISTORY header: ${line}`)
        } else if (line.startsWith('- ') && releases.length) {
            releases.at(-1).notes.push(line.slice(2).trim())
        }
    }
    return releases
}
