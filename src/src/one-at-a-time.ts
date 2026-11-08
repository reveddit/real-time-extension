// One read-and-write of a stored object at a time, in the order they're asked
// for. The background and the extension's own pages (popup, options, history,
// followed items, welcome) share the extension's origin, so they share its Web
// Locks, and a write in the popup waits for one in the background. Content
// scripts run in the web page's origin, so they send their writes to the
// background (storage.ts byBackground). Where there are no Web Locks (tests in
// Node), each name has a chain in this module.
//
// A task that hasn't settled in LOCK_TIMEOUT_MS lets the next one go, so a
// stalled storage call can't hold up every later write. Its caller still gets
// its answer.
//
// No imports: news.ts and request-gates.ts use it too.
export const LOCK_TIMEOUT_MS = 10 * 1000

const chains = new Map<string, Promise<void>>()

const inTurn = <T>(name: string, task: () => Promise<T>, mode: 'exclusive' | 'shared'): Promise<T> =>
    new Promise<T>((resolve, reject) => {
        const hold = (): Promise<void> => {
            const run = Promise.resolve().then(task)
            run.then(resolve, reject)
            let timer: ReturnType<typeof setTimeout> | undefined
            const timeout = new Promise<void>(release => (timer = setTimeout(release, LOCK_TIMEOUT_MS)))
            return Promise.race([
                run.then(
                    () => {},
                    () => {},
                ),
                timeout,
            ]).finally(() => clearTimeout(timer))
        }
        const locks = (globalThis as any).navigator?.locks
        if (locks?.request) {
            locks.request(`reveddit:${name}`, { mode }, hold).catch(reject)
            return
        }
        const before = chains.get(name) ?? Promise.resolve()
        if (mode === 'shared') {
            before.then(hold)
            return
        }
        const turn = before.then(hold)
        chains.set(name, turn)
        turn.then(() => {
            if (chains.get(name) === turn) chains.delete(name)
        })
    })

export const oneAtATime = <T>(name: string, task: () => Promise<T>): Promise<T> => inTurn(name, task, 'exclusive')

// A read that waits for the writes asked for before it, beside other reads
export const afterWrites = <T>(name: string, task: () => Promise<T>): Promise<T> => inTurn(name, task, 'shared')
