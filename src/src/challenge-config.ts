// Inputs the logged-out challenge solver (parse_html/new.ts solveChallenge)
// reads from the challenge page. Reddit renamed the token field on 2026-08-31
// (token -> jsc_token), which silently disabled every public-profile check
// until a code release. These values can now also arrive from the news feed
// (news.ts options.challenge), so the next rename is a feed edit. Structural
// changes (a new puzzle, a POST form) still need code.
//
// Kept import-free: news.ts and parse_html/new.ts both import it.

export interface ChallengeConfig {
    // Hidden-input names that carry the token, tried in order. The solved URL
    // echoes the token under the same name.
    tokenFields: string[]
    // Regex source for the string-doubling puzzle; group 1 is the string.
    solutionRegex: string
}

export const DEFAULT_CHALLENGE_CONFIG: ChallengeConfig = {
    tokenFields: ['jsc_token', 'token'],
    solutionRegex: 'await\\(async e=>e\\+e\\)\\("([^"]*)"\\)',
}

const FIELD_NAME = /^[a-z][a-z0-9_]{0,31}$/

let current: ChallengeConfig = { ...DEFAULT_CHALLENGE_CONFIG }

export const getChallengeConfig = (): ChallengeConfig => current

// Accepts a partial, untrusted object (the news feed); anything malformed is
// ignored field by field so a bad edit can never disable the solver.
export const sanitizeChallengeConfig = (raw: any): Partial<ChallengeConfig> => {
    const out: Partial<ChallengeConfig> = {}
    if (raw && typeof raw === 'object') {
        if (Array.isArray(raw.token_fields)) {
            const fields = raw.token_fields.filter((f: any) => typeof f === 'string' && FIELD_NAME.test(f))
            if (fields.length) out.tokenFields = fields.slice(0, 8)
        }
        if (typeof raw.solution_regex === 'string' && raw.solution_regex.length <= 200) {
            try {
                new RegExp(raw.solution_regex) // throws on an invalid pattern
                if (/\(/.test(raw.solution_regex)) {
                    // needs a capture group for the puzzle string
                    out.solutionRegex = raw.solution_regex
                }
            } catch {
                /* invalid regex: ignored */
            }
        }
    }
    return out
}

export const setChallengeConfig = (partial: Partial<ChallengeConfig>) => {
    current = {
        tokenFields: partial.tokenFields?.length ? partial.tokenFields : DEFAULT_CHALLENGE_CONFIG.tokenFields,
        solutionRegex: partial.solutionRegex || DEFAULT_CHALLENGE_CONFIG.solutionRegex,
    }
}

export const resetChallengeConfig = () => setChallengeConfig({})
