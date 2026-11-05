# Smoke Test Checklist

Manual verification before each release. Run through **all** sections.
Testing subreddit: **r/CantSayAnything** (auto-removes all posts/comments).

---

## Prerequisites

- [ ] `yarn build-chrome-dev` succeeds
- [ ] `yarn build-firefox-dev` succeeds
- [ ] `yarn test` — all integration tests pass
- [ ] `yarn test:e2e` — all E2E tests pass
- [ ] `yarn lint` — no errors
- [ ] `node scripts/chrome-run-lookup.cjs` (after `yarn build-chrome-dev`, outside the sandbox) — the removal check against live Reddit with no login: the canary comes back REMOVED and the log names the fetch routes that served

---

## Installation / Welcome

- [ ] Load unpacked extension in Chrome → welcome page opens if logged out of Reddit, otherwise the history page opens
- [ ] "Check connection now" detects logged-in Reddit user
- [ ] User is auto-subscribed and redirected to the history page

---

## Popup

- [ ] Click extension icon → popup opens
- [ ] Subscribed user is listed
- [ ] "options" link opens options page
- [ ] "mark all as seen" link works
- [ ] Badge count shows correctly (or is empty when no unseen changes)
- [ ] "send a test notification" shows a notification; with a notify setting off, its message names the disabled type(s)

---

## Options Page

- [ ] All checkboxes render with correct defaults
- [ ] Change "minutes between Reddit checks" → save → reopen → value persists
- [ ] Change removed/locked pickers (off / badge only / badge + notifications) → save → verify persistence
- [ ] "turn off all notifications" link sets both pickers to badge only, leaves "off" pickers alone, and hides itself
- [ ] With both pickers on "badge only": detection updates badge and history, no notification appears (including the install-time backlog notice)
- [ ] "hide subscribe" toggle works
- [ ] "monitor quarantined" toggle works; it shows only when a custom client ID is set
- [ ] "advanced" section reveals client ID field
- [ ] "reset to defaults" restores only "minutes between Reddit checks", "same-status count before alert" and the client ID
- [ ] Invalid interval value shows error

---

## Content Script — Reddit Subscribe Button

- [ ] Old reddit: posts and comments have a `subscribe-rev` link
- [ ] New reddit: comment rows on threads and profiles have a subscribe button, a bell icon whose tooltip reads "Get told if this is removed", and so does the end of a post's action row on threads and feeds
- [ ] Click subscribe on someone else's comment and on a post → the link flips to `unsubscribe-rev`, or the bell fills in and its tooltip says "Stop following this", and each item is listed under the popup's "other" link
- [ ] Click unsubscribe → it flips back and the item leaves the "other" list
- [ ] Your own comments get a disabled button whose tooltip says why
- [ ] "hide subscribe" option removes them on both reddits, after a page reload

---

## Monitoring & Detection (r/CantSayAnything)

- [ ] Subscribe to your own user
- [ ] Post a comment in r/CantSayAnything
- [ ] Wait for 1–2 monitoring cycles (check alarm interval in options)
- [ ] Extension detects removal — badge count increments
- [ ] Notification appears (if notifications enabled)
- [ ] History page shows the detected removal with correct action type

---

## History Page

- [ ] After a detection: history table renders with columns (action, time, type, author, link)
- [ ] "removed" actions have correct styling
- [ ] Comment links navigate to the correct Reddit thread
- [ ] Post links navigate to the correct Reddit submission

---

## Other Subscriptions

- [ ] From popup, click "other" link → other.html opens
- [ ] On a Reddit post or comment page, turn on the popup's "subscribe to post" or "subscribe to comment" toggle, or right-click a link and choose "reveddit subscribe" → the item appears on other.html
- [ ] Monitored "other" items appear in history when changes are detected

---

## Website connection (reveddit.com)

The site reaches Reddit through the extension's bridge, using your Reddit login. Chrome: test a dev build against the dev site (`yarn start` in the website repo, http://localhost:8080), because the live site only messages the store version's ID. Firefox: the live site works with any build (`scripts/firefox-bidi.cjs` checks it; see README).

- [ ] Status shows right at first paint: the green "running" banner appears immediately, with no install pitch flashing first
- [ ] Turn the extension off and reload: the red "isn't running" banner appears immediately, not green for a few seconds
- [ ] Logged in to Reddit: your user page (`/y/<you>/`) and a thread load with no "Could not connect" box
- [ ] Your own removed items, e.g. the r/CantSayAnything comment from the monitoring test above, show as removed on `/y/<you>/`, not intact
- [ ] With a moderator account: a subreddit you moderate shows mod-removed posts as removed
- [ ] Logged out of Reddit: the "Could not connect" box says this browser isn't logged in to Reddit
- [ ] Options → "check now", then reload a reveddit page while the check runs: the page loads once the check ends (the diagnostic log shows "bridge: waited …ms for a monitoring cycle")

---

## Cross-Browser

- [ ] Firefox: load extension via `about:debugging` → all above features work
- [ ] Edge: load unpacked extension → popup and options work

---

## Regression Checks

- [ ] No console errors on popup, options, history, or welcome pages
- [ ] Service worker stays active (check `chrome://extensions` → "Inspect")
- [ ] Storage sync quota not exceeded with moderate subscriptions (~5 users)
- [ ] Context menu "subscribe" entry appears on Reddit pages
