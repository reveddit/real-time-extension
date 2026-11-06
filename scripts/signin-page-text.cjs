// What a stuck sign-in page says went wrong, for a sign-in test's log. Page text
// can hold an email address, which stays out.
const pageComplaints = text =>
    String(text)
        .split('\n')
        .filter(line => /error|try again|whoa|wrong|invalid/i.test(line))
        .slice(0, 3)
        .map(line => line.trim().slice(0, 120).replace(/\S+@\S+/g, '<email>'))

module.exports = { pageComplaints }
