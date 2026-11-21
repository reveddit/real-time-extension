// Inputs the logged-out challenge solver (parse_html/new.ts solveChallenge)
// reads from the challenge page. Reddit renamed the token field on 2026-08-31
// (token -> jsc_token), which silently disabled every public-profile check
// until a code release. These values can now also arrive from the news feed
// (news.ts options.challenge), so the next rename is a feed edit. Structural
// changes (a new puzzle, a POST form) still need code.
//
// Imports only name-list.ts, which is import-free: news.ts and
// parse_html/new.ts both import this module.
import { sanitizeNameList } from './name-list'

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

// The feed's pattern runs over the challenge page (about 189 KB) in the
// background, so it mustn't be able to backtrack without end, as (a+)+ or a
// row of .* can. It takes quantifiers only on one character, an escape or a
// character class, at most two of them unbounded, and no backreferences or
// lookarounds. The built-in pattern needs one: ([^"]*).
export const isSafeSolutionRegex = (source: string): boolean => {
    let unbounded = 0
    let quantifiable = false // whether the atom before can take a quantifier
    for (let i = 0; i < source.length; i++) {
        const c = source[i]
        if (c === '\\') {
            const next = source[i + 1]
            if (next === undefined || /[1-9k]/.test(next)) return false // a backreference
            i++
            quantifiable = true
        } else if (c === '[') {
            let j = i + 1
            if (source[j] === '^') j++
            if (source[j] === ']') j++
            while (j < source.length && source[j] !== ']') j += source[j] === '\\' ? 2 : 1
            if (j >= source.length) return false
            i = j
            quantifiable = true
        } else if (c === '(') {
            if (source[i + 1] === '?') {
                if (source[i + 2] !== ':') return false // a lookaround or a named group
                i += 2
            }
            quantifiable = false
        } else if (c === '*' || c === '+' || c === '?' || c === '{') {
            if (!quantifiable) return false // on a group, a dot, or another quantifier
            if (c === '{') {
                const m = /^\{(\d+)(,(\d*))?\}/.exec(source.slice(i))
                if (!m) return false
                if (m[3] === '') unbounded++
                else if (Number(m[3] ?? m[1]) > 1000) return false
                i += m[0].length - 1
            } else if (c !== '?') {
                unbounded++
            }
            if (source[i + 1] === '?') i++ // lazy
            quantifiable = false
        } else {
            // ) | ^ $ and . take no quantifier; any other character is a literal
            quantifiable = !')|^$.'.includes(c)
        }
    }
    return unbounded <= 2
}

// Accepts a partial, untrusted object (the news feed); anything malformed is
// ignored field by field so a bad edit can never disable the solver.
export const sanitizeChallengeConfig = (raw: any): Partial<ChallengeConfig> => {
    const out: Partial<ChallengeConfig> = {}
    if (raw && typeof raw === 'object') {
        const fields = sanitizeNameList(raw.token_fields, FIELD_NAME, 8)
        if (fields.length) out.tokenFields = fields
        if (typeof raw.solution_regex === 'string' && raw.solution_regex.length <= 200) {
            try {
                new RegExp(raw.solution_regex) // throws on an invalid pattern
                if (/\(/.test(raw.solution_regex) && isSafeSolutionRegex(raw.solution_regex)) {
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
