// Minimal fetch Response fakes. Each carries only the fields the code under
// test reads, so a test that reads another one fails loudly.

const contentType = type => ({ get: name => (name.toLowerCase() === 'content-type' ? type : null) })

// A text answer, with its content type if one is given
export const res = (status, body, type) => ({
    ok: status >= 200 && status < 300,
    status,
    ...(type && { headers: contentType(type) }),
    text: async () => body,
})

// A JSON answer with its content type
export const json = (status, data, type = 'application/json; charset=UTF-8') => ({
    ok: status >= 200 && status < 300,
    status,
    headers: contentType(type),
    json: async () => data,
})

// A request, or a body, that never answers: like a real fetch's, it fails once
// the request is aborted, and without a signal it never ends
export const untilAborted = signal =>
    new Promise((_, reject) =>
        signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError'))),
    )

// A body stream that sends its start and then stalls. Like a real fetch's, it
// fails once the request is aborted, and without a signal it never ends.
export const stallingBody = (start, signal) =>
    new ReadableStream({
        start: controller => {
            controller.enqueue(new TextEncoder().encode(start))
            signal?.addEventListener('abort', () => controller.error(signal.reason))
        },
    })
