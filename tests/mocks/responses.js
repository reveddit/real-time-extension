// Minimal fetch Response fakes. Each carries only the fields the code under
// test reads, so a test that reads another one fails loudly.

// A text answer
export const res = (status, body) => ({
    ok: status >= 200 && status < 300,
    status,
    text: async () => body,
})

// A JSON answer with its content type
export const json = (status, data, type = 'application/json; charset=UTF-8') => ({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: name => (name.toLowerCase() === 'content-type' ? type : null) },
    json: async () => data,
})
