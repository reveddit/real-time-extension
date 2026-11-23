// STORE_DESCRIPTION.txt's VERSION HISTORY as a list for the build, newest first:
// each release's version, its date (as 2026/11/17) and its notes. An entry
// reads "2026/11/17 - 0.0.5.37", then one "- note" line for each note.
export const parseReleaseHistory = text => {
    const lines = text.split('\n').map(line => line.trim())
    const start = lines.findIndex(line => line.startsWith('VERSION HISTORY'))
    if (start === -1) throw new Error('STORE_DESCRIPTION.txt: could not find VERSION HISTORY section')
    const releases = []
    for (const line of lines.slice(start + 1)) {
        const header = line.match(/^(\d{4}[/-]\d{2}[/-]\d{2})\s+-\s+(\d+(?:\.\d+)+)$/)
        if (header) {
            releases.push({ version: header[2], date: header[1].replaceAll('-', '/'), notes: [] })
        } else if (line.startsWith('- ') && releases.length) {
            releases.at(-1).notes.push(line.slice(2).trim())
        }
    }
    return releases
}
