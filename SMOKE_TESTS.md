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

---

## Options Page

- [ ] All checkboxes render with correct defaults
- [ ] Change "minutes between updates" → save → reopen → value persists
- [ ] Toggle removed/locked track/notify checkboxes → save → verify persistence
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

## Cross-Browser

- [ ] Firefox: load extension via `about:debugging` → all above features work
- [ ] Edge: load unpacked extension → popup and options work

---

## Regression Checks

- [ ] No console errors on popup, options, history, or welcome pages
- [ ] Service worker stays active (check `chrome://extensions` → "Inspect")
- [ ] Storage sync quota not exceeded with moderate subscriptions (~5 users)
- [ ] Context menu "subscribe" entry appears on Reddit pages
