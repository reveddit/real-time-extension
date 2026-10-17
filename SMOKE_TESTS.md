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

---

## Installation / Welcome

- [ ] Load unpacked extension in Chrome → welcome page opens
- [ ] "Check Connection" detects logged-in Reddit user
- [ ] User is auto-subscribed and redirected to reveddit.com

---

## Popup

- [ ] Click extension icon → popup opens
- [ ] Subscribed user is listed
- [ ] "options" link opens options page
- [ ] "clear notifications" link works
- [ ] Badge count shows correctly (or is empty when no unseen changes)
- [ ] "send a test notification" shows a notification; with a notify setting off, its message names the disabled type(s)

---

## Options Page

- [ ] All checkboxes render with correct defaults
- [ ] Change "minutes between updates" → save → reopen → value persists
- [ ] Change removed/locked pickers (off / badge only / badge + notifications) → save → verify persistence
- [ ] "turn off all notifications" link sets both pickers to badge only, leaves "off" pickers alone, and hides itself
- [ ] With both pickers on "badge only": detection updates badge and history, no notification appears (including the install-time backlog notice)
- [ ] "hide subscribe" and "monitor quarantined" toggles work
- [ ] "advanced" section reveals client ID field
- [ ] "reset to defaults" restores default values
- [ ] Invalid interval value shows error

---

## Content Script — Reddit Subscribe Button

- [ ] Navigate to a Reddit user profile → subscribe button appears
- [ ] Click subscribe → user added to popup list
- [ ] Navigate to a Reddit post → subscribe button appears on post and comments
- [ ] "hide subscribe" option removes the button

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
- [ ] Add a subreddit/post/comment ID → verify it appears in storage
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
