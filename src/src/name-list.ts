// A list of names from the untrusted news feed: strings matching the pattern,
// each once, at most max of them. Used for every name-list option (markup
// attributes, challenge token fields, login cookie names). Import-free, like
// markup-config.ts, so any module can use it.
export const sanitizeNameList = (raw: unknown, pattern: RegExp, max: number): string[] =>
    Array.isArray(raw)
        ? [...new Set(raw.filter((v): v is string => typeof v === 'string' && pattern.test(v)))].slice(0, max)
        : []
