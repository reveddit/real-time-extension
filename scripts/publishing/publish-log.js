// Prints the publish log (.publish-log.jsonl, written by the publish scripts):
// what went to which store, when, from which commit, and what failed.
//   yarn publish:log [N] [--json]
import fs from 'fs';
import path from 'path';

const LOG_FILE = path.join(process.cwd(), '.publish-log.jsonl');
const args = process.argv.slice(2);
const n = Number(args.find(a => /^\d+$/.test(a))) || 40;

if (!fs.existsSync(LOG_FILE)) {
    console.log('No publish log yet: the publish scripts start it on their next run.');
    process.exit(0);
}
const entries = fs
    .readFileSync(LOG_FILE, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map(line => {
        try {
            return JSON.parse(line);
        } catch (e) {
            return null;
        }
    })
    .filter(Boolean)
    .slice(-n);

if (args.includes('--json')) {
    for (const e of entries) console.log(JSON.stringify(e));
    process.exit(0);
}
const when = iso => new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
const detail = e =>
    [
        e.reason,
        e.exitCode != null && e.exitCode !== 0 ? `exit ${e.exitCode}` : '',
        e.published ? `published: ${e.published.join(', ') || 'none'}` : '',
        e.failed ? `failed: ${e.failed.join(', ')}` : '',
        e.unconfirmed ? `unconfirmed: ${e.unconfirmed.join(', ')}` : '',
        e.note || '',
    ]
        .filter(Boolean)
        .join('; ');
const rows = entries.map(e => [when(e.at), e.version || '', e.store || '', e.event || '', e.commit || '', detail(e)]);
const header = ['when', 'version', 'store', 'event', 'commit', 'detail'];
const widths = header.map((h, i) => Math.max(h.length, ...rows.map(r => String(r[i]).length)));
const line = r => r.map((c, i) => (i === r.length - 1 ? String(c) : String(c).padEnd(widths[i]))).join('  ');
console.log(line(header));
console.log(line(widths.map(w => '-'.repeat(w))));
for (const r of rows) console.log(line(r));
console.log(
    '\npublished = the store accepted the submission; it may still be in review (Edge certification takes days).\n' +
        "What each store serves now: python3 ../website/scripts/sync-store-version.py --check",
);
