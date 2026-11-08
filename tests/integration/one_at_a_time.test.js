// One read-and-write of an object at a time (one-at-a-time.ts): over the
// origin's Web Locks, and over a chain of its own where there are none. A task
// that stalls lets the next one go after LOCK_TIMEOUT_MS, so a storage call
// that never answers can't hold up every later write.

import { describe, it, expect, vi } from 'vitest'
import { oneAtATime, afterWrites, LOCK_TIMEOUT_MS } from '../../src/src/one-at-a-time'

const stall = () => {
    const task = {}
    task.run = () => new Promise(resolve => (task.finish = resolve))
    return task
}

describe.each([
    ['over Web Locks', () => {}],
    ['with none', () => vi.stubGlobal('navigator', {})],
])('one at a time, %s', (_, setup) => {
    it('lets the next task go once one has stalled for LOCK_TIMEOUT_MS, and still answers the stalled one', async () => {
        setup()
        vi.useFakeTimers()
        const stalled = stall()
        const first = oneAtATime('an object', stalled.run)
        const ran = []
        const next = oneAtATime('an object', async () => ran.push('next'))
        await vi.advanceTimersByTimeAsync(LOCK_TIMEOUT_MS - 1)
        expect(ran).toEqual([])
        await vi.advanceTimersByTimeAsync(1)
        expect(ran).toEqual(['next'])
        await next
        stalled.finish('late')
        expect(await first).toBe('late')
    })

    it('runs one task of a name at a time, in the order asked, and other names meanwhile', async () => {
        setup()
        const order = []
        const stalled = stall()
        const first = oneAtATime('an object', async () => {
            order.push('first starts')
            await stalled.run()
            order.push('first ends')
        })
        const second = oneAtATime('an object', async () => order.push('second'))
        await oneAtATime('another object', async () => order.push('another'))
        stalled.finish()
        await Promise.all([first, second])
        expect(order).toEqual(['first starts', 'another', 'first ends', 'second'])
    })

    it('reads after the writes asked for before it, beside other reads', async () => {
        setup()
        const order = []
        const stalled = stall()
        const write = oneAtATime('an object', async () => {
            await stalled.run()
            order.push('write')
        })
        const reads = Promise.all([
            afterWrites('an object', async () => order.push('read 1')),
            afterWrites('an object', async () => order.push('read 2')),
        ])
        await new Promise(resolve => setTimeout(resolve, 0))
        expect(order).toEqual([])
        stalled.finish()
        await Promise.all([write, reads])
        expect(order).toEqual(['write', 'read 1', 'read 2'])
    })
})
