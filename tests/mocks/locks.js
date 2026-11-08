// navigator.locks as one origin has it: one lock manager, which every context
// of the extension (the background, its pages) and every fresh copy of the
// modules shares. Each name's requests are granted in the order they're made:
// an exclusive one alone, shared ones together. A lock is held until its
// callback's promise settles.
let names = new Map()

const grant = name => {
    const { held, waiting } = names.get(name)
    while (waiting.length) {
        const next = waiting[0]
        const free = next.mode === 'shared' ? held.every(lock => lock.mode === 'shared') : held.length === 0
        if (!free) return
        waiting.shift()
        held.push(next)
        next.run()
    }
}

export const locks = {
    request(name, ...rest) {
        const callback = rest.pop()
        const mode = rest[0]?.mode === 'shared' ? 'shared' : 'exclusive'
        if (!names.has(name)) names.set(name, { held: [], waiting: [] })
        const state = names.get(name)
        return new Promise((resolve, reject) => {
            const lock = {
                mode,
                run: () =>
                    Promise.resolve()
                        .then(() => callback({ name, mode }))
                        .then(resolve, reject)
                        .finally(() => {
                            state.held.splice(state.held.indexOf(lock), 1)
                            if (names.get(name) === state) grant(name)
                        }),
            }
            state.waiting.push(lock)
            grant(name)
        })
    },
}

// Between tests, so a lock a test left held doesn't hold up the next one
export const __resetLocks = () => {
    names = new Map()
}
