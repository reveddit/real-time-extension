---
name: shadow-moderation-checker
description: Build, port or debug a tool that tells people when their own posts or comments are hidden from everyone else while the platform still shows them to the author as if live (shadow moderation). Use whenever someone wants an extension, userscript or app that checks whether their own Reddit, YouTube, Facebook, X, TikTok, Bilibili or forum content is really visible to others, asks how to detect silent removals or comments held for review, wants to port Reveddit Real-Time to another site, or is debugging a check that broke because a platform started blocking it (403s, JS challenges, captchas, login walls). Not for measuring reach or follower "shadowbans", and not for watching other people's accounts.
---

# Shadow moderation checker

Reveddit Real-Time tells Reddit users when moderators, filters or Reddit itself remove their posts or comments, which Reddit keeps showing them as if nothing happened. Its code ([github.com/reveddit/real-time-extension](https://github.com/reveddit/real-time-extension)) is the reference implementation, and code paths below are relative to it. This skill holds what building it taught that a model can't already know: the traps in the method, which views of a platform survive its blocks, the limits, and how to test without fooling yourself. It assumes you can already write a browser extension.

Platform specifics live in dated notes next to this file. Read the one for your platform first:

- [reddit.md](reddit.md): who sees what, the logged-out views, the fetch paths, and how the extension's monitoring behaves, as of 2026-10-17
- [youtube.md](youtube.md): a one-request anonymous check per comment, and Top-sort hiding, as of 2026-10-17
- [facebook.md](facebook.md): "Hide comment" and automatic hiding, from Facebook's own help pages, not tested first-hand

Each line there is a dated measurement, and platforms change without notice. Re-verify a finding before you rely on it (see Testing), then update its date or add a dated line saying what changed. When you study a new platform, start a notes file for it in the same form.

## What to detect

The problem is a false status shown to the author. The platform shows people their own removed or hidden content as if it were still up, while everyone else sees a placeholder or nothing. Examples: Reddit's moderator, AutoModerator and spam-filter removals and its sitewide shadowbans (still in use), Facebook's "Hide comment" and its keyword filters, and YouTube channel owners removing or holding comments.

Reach reduction is a different thing: downranking, feed demotion, search suppression, or being left out of a default sort while still public. Most "shadowban" coverage and most "shadowban checker" tools are about reach, so don't borrow their definitions or their signals. Keep reach out of the removal signal. If a tool reports it at all, give it its own state and softer wording, and leave that decision to the person you're building for. YouTube's Top-sort hiding is the worked example in youtube.md.

Not being notified isn't the issue by itself either. The line is actively showing the author something false.

Word each alert by what was seen:

- seen in the other view, then gone: "removed"
- never seen in the other view: "not visible to others" (held, filtered, or removed before the first check)
- back in the other view: "visible again"

## The method

Compare what the author sees with a view that isn't theirs, item by item.

- **The author's view** says what to check and holds the text. Save each item's text the first time you see it. The platform won't show it to anyone else after a removal, and archives that copy posts soon after they appear get only `[removed]` for items that filters remove within seconds.
- **The other view**, logged out or from another account, is the only one that can say an item is live. Depend on as little of it as possible: item ids, and the page structure that proves the page is real. Then a markup change elsewhere can't break detection.

Give each item one of four verdicts: live, removed, held or unknown. Unknown means no alert, and no reset of anything already recorded. Reveddit Real-Time decides in this order (`lookupItemsByID_fromPublicProfile` in `src/src/requests.ts`):

1. The author's view itself shows a removal (for a Reddit post, `is_robot_indexable: false`): removed.
2. The item is in a class logged-out visitors never see (on Reddit, NSFW, quarantined and private subreddits): don't judge it from a logged-out view.
3. The other view lists the item: live. For a young post, or one already recorded as removed, check its own page first.
4. The item is missing from the part of the listing you actually walked: its own page decides.
5. The item is older than the part you walked: unknown.

### The author's view never proves an item is live

Reddit shows a removed comment to its author exactly as if it were live, on their profile, in the thread and in the API. That is the whole problem, so nothing in the author's view can clear an item.

The author's view does sometimes leak a removal. For Reddit posts, `is_robot_indexable: false` or a `removed_by_category` value means removed. Use leaks like these one way only: they can confirm a removal, never clear one. For a held or spam-filtered post, `is_robot_indexable` stays `true` for about a day. Flags a platform renders into the author's own page are still the author's view, so a tool that only reads them never checks what others see (see Prior art).

### Every logged-in view belongs to somebody

A logged-in view differs from the public one wherever the platform uses a relationship to decide visibility:

- Authors see their own removed items as live.
- Moderators and owners see removed items with the text intact. Reddit marks them `removed: true` or `banned_by`, and spam-filter removals `spam: true`.
- On Facebook, the author's friends also see a hidden comment.
- Blocks, mutes and personal filters hide things from one viewer only.

So a comparison view has to come from someone with no relationship to the author or the community: not a friend or follower, not a moderator, no blocks. Otherwise it reports removed items as live.

### Make sure the public check is really logged out, and fresh

If the user's session reaches the "public" fetch, the check reads the author's view and reports everything live, forever, with no error. Omit credentials explicitly on every public fetch, even when you think the cookie jar is clean. Reveddit Real-Time restores saved Reddit cookies into the browser for its logged-in fetches, so a public fetch that didn't omit credentials would send them. Prove the check is public with a known-removed canary (see Testing).

A cached copy fails the same way. old.reddit.com served logged-out pages with `Cache-Control: private, max-age=3600`, so a poll that read the browser's cache could miss a removal for up to an hour. Bypass the cache wherever the platform tolerates it (reddit.md notes where Reddit didn't).

### Listings lie both ways; the item's own page decides

Missing from a listing doesn't mean removed:

- **Coverage.** An item older than the last page you fetched has unknown status. Track how far back you actually enumerated, and call only items inside that range absent. Reddit ids are base36 and increase, so the smallest id seen is the floor.
- **Listings drop items for other reasons.** Since about July 2026, Reddit's logged-out profiles leave out items from subreddits the user hid from their profile, for every viewer. Until that was handled, the extension reported every such comment as removed ([issue 14](https://github.com/reveddit/real-time-extension/issues/14)). Reddit's profile overview tab also omits items that its comments and posts tabs show.
- **Some classes are hidden from every logged-out visitor by design:** NSFW, quarantined and private communities on Reddit, and age gates, private groups and region locks elsewhere. Exclude them, or you will flag them all.

Present in a listing doesn't mean live:

- Held and spam-filtered posts linger in Reddit's public profile feed for a grace period, so the extension checks posts younger than 48 hours against their own pages.
- One removed post was still listed 3.5 weeks after it was made, a day after its removal. Once a removal is recorded, presence in a listing must not flip it back; only the item's own page can, or the status flips with fetch luck.

The item's own logged-out page settles it in both directions. Fetch it for each item a listing can't settle, within a per-cycle budget, and cache the verdict.

### The page you got may not be the page you asked for

Platforms answer automated fetches with challenge pages, block pages, captcha walls, server-rendered shells with no comments in them, and sometimes a different page entirely: Reddit once served its front page for a comment's permalink. A page is evidence only if it's the page you asked for, so check that it names the item before it decides anything. Titles don't help (by October 2026 every Reddit page had the same one), and structure alone doesn't either: Reddit's front page carries the same post elements a thread page does. A canonical URL helps only where the page has one, and Reddit's thread pages don't. What works there is the ids the page carries: the post element whose id is the requested post, and a comment tree that names the requested comment. Anything else, including a matching element that's missing an attribute you rely on, is unknown, never removed. Fetch an item at the URL the site itself links to: other forms of a permalink may redirect, a cookie-less background fetch loses a solved challenge across a redirect, and one of Reddit's forms came back as a shell that redirects only in a browser.

### A failed check must never read as "all clear"

- Unknown is a real verdict. Leave unknown items out of the results: no alert, and no reset of a recorded removal.
- Zero items from a page that didn't parse means broken, not "everything removed". When the whole public profile is empty while the author's view has items, that's a possible account-wide shadowban: show one warning, not one alert per item, unless every item is in a class logged-out visitors never see.
- Count consecutive failures of each path. After a few in a row (Reveddit Real-Time uses 5), show the user a warning that checks aren't working. Only a cycle that actually checked items may clear it.
- The same goes for detecting who's logged in. Conclude "logged out" only from a clean answer that has no user in it. A challenge page or a 429 means "couldn't tell", and treating it as logged out quietly stops all monitoring.
- Cache unknown verdicts too, briefly (Reveddit Real-Time: 30 minutes). Otherwise, while a path is dead, every cycle re-fetches the same newest items (about 29,000 requests a day at a one-minute interval) and never gets to the rest.

### The tool's own status needs live evidence too

reveddit.com once told a user whose extension was turned off that it was installed and working, because it read values the extension had saved long before. Have the extension mark the page itself (Reveddit Real-Time sets an attribute on `<html>` at document_start) or answer a ping, and treat silence as not running.

### A view that hoists the item may answer a different question

YouTube's comment permalink puts the linked comment first whenever it's public at all. "Present" there means public under the Newest sort, not visible in the Top sort most viewers see (youtube.md). Before trusting a shortcut like this, check which view of the item it actually reports.

### Confirm before you alert

- Require several consecutive "removed" observations before alerting (Reveddit Real-Time: 3 to 5), and several "live" ones before reporting an item visible again (Reveddit Real-Time: 2 by default).
- When the reasons for hiding look the same publicly, classify by history. An item seen public that then disappears was removed. One never seen public was held, filtered or removed before the first check; say so more softly. Check about two minutes after the user posts to catch filters that act at once.
- Some signals flap. Of 134 YouTube comments that were left out of the Top sort at least once, 7 changed state within 20 minutes. Require two agreeing checks before changing a state like that.

## Starting on a new platform

First get ground truth. Ask the person you're building for for an item they know is hidden (a moderator told them, or a friend couldn't see it) and one they know is live, and use both at every step. Then answer these, and record the answers, with dates, in a new notes file:

1. Where does the author see their own items (profile, history page, API), and does any field there leak a removal?
2. What does a removed item look like to others in a listing, on its own page and in the API: absent, a placeholder, or blanked text?
3. What do logged-out visitors get at all, and which classes are gated (age, private groups, region)?
4. Can a logged-out visitor load a single item's page? Does a "linked comment" URL put the item at the top when it's public, as YouTube's `lc=` does? That makes the check one request per item.
5. Which relationships change what a logged-in viewer sees: friends, follows, moderator or owner roles, blocks?
6. Who can hide an item (moderators, page or channel owners, keyword filters, the platform), and can the public tell them apart?
7. Can an item be left out of a sort or feed while still public? That's reach; keep it separate.
8. Has someone already built a checker for it? See Prior art below.

Then measure each rung of the ladder below in each browser you'll support, with both items.

## The fallback ladder

Platforms block the cheap ways into their logged-out view first. The rungs below run roughly from easiest for a platform to block, and cheapest for you, to hardest and costliest. Rungs further down come closer to an ordinary visitor reading the page, which a platform can't block without blocking its visitors, and most cost the user more: a permission, a second account, an install. The order isn't strict: on 2026-10-17 Reddit refused Chrome's page fetches but served its background fetches, and the reverse in Firefox. So build the first two together and fall back between them per request: on a block, try the other path once, and remember a refusal for a few hours so later cycles don't keep paying for it (Reveddit Real-Time remembers a refused tab for 6 hours, which spares each later cycle a 190 KB block page). Log every handoff.

1. **A logged-out fetch from a page.** A content script fetches from one of the platform's own tabs, same-origin. It's the cheapest rung, and the platform controls the page. Reddit, 2026-10-17: refused in Chrome; accepted in Firefox only through `content.fetch`, the page's own fetch.
2. **A logged-out fetch from the extension's background.** Host permissions get it past CORS, and it works with no tab open, but nothing about it looks like a visitor. Reddit, 2026-10-17: a JS challenge, then a 403 block page, unless the fetch sends no-cache headers.
3. **Per-item pages and legacy endpoints.** Not a new path but other URLs, fetched through rung 1 or 2 when listings fail. A platform that wants to be found in search and shared by link has to keep single-item pages open to logged-out visitors. Prefer routes the platform's own site uses, like the partial pages its own scripts load: requests there look like the site's own traffic, so walling them off risks breaking its own pages. Treat legacy endpoints as tiebreakers behind a remote off switch, with their host adjustable remotely too, since platforms move and retire them.
4. **A real logged-out tab.** Not built or tested here yet; this is the plan. A genuine page load is what a visitor does, so this is the hardest browser rung to block. In Firefox, open it in a container (`contextualIdentities`, `cookieStoreId`), which keeps its own cookies and site storage. In Chrome, use an extension-owned tab whose requests lose their cookies through `declarativeNetRequest` session rules scoped to that tab's id. Strip `Set-Cookie` from its responses as well, or the tab writes into the user's cookie jar, and check that the page can't authenticate some other way, since it shares site storage with the user's own tabs. Not incognito: an extension runs there only if the user turns on "Allow in incognito" for it, and that's off by default.
5. **A second account the user owns,** logged in by the user. It sees what other logged-in users see, and if a platform goes fully login-only, it's the only view left. It must have no relationship to the author or the community (see "Every logged-in view belongs to somebody"). Check the platform's terms first: Facebook allows one personal account per person.
6. **A desktop app on the user's own connection.** A last resort, for when no browser can reach the logged-out view any more.

Don't move checks to a server. Server and datacenter checks are the most heavily blocked, and a server takes the user's data off their machine.

Logged-in reads often still pass when logged-out ones don't. If another feature needs public data (reveddit.com does), it can fetch with the user's login and rewrite the answer back to the public view: mark what monitoring has already confirmed removed, and whatever a moderator's view flags as removed (`toPublicView` in `src/src/bridge.ts`). That can't find the user's own removals, since the login hides exactly those, so detection still needs the other view.

## Keep it fixable without a store release

Store reviews take days, and platforms change strings on their own schedule. On 2026-08-31 Reddit renamed one hidden field in its challenge page, and every public-profile check stopped until a new version shipped. Since then, the strings most likely to change (that field's name and the puzzle's pattern) can come from a remote config feed, checked field by field so a bad edit can't break the solver (`src/src/challenge-config.ts`). Give every detection path a remote off switch too, and give ambiguous signals one that turns them into unknown rather than removed. Keep all of it data: store policies forbid remotely loaded code.

## Hard limits

- **No CAPTCHA solving.** A JS challenge that any browser passes by running the page's script is not a CAPTCHA. A page asking a person to prove they're human is. When a path starts getting those, treat that path as refused and record unknown. Never solve one, and never pass one to a solving service.
- **No one else's credentials.** Use the user's own session, on their own machine, and accounts the user owns.
- **Only the user's own content.** The check compares views of what the user posted. No watching other people's accounts, and no datasets of what others post.
- **No mass scraping.** Fetch the fewest pages that settle the user's items: per-cycle caps, spacing between requests, cached verdicts, and one backoff after a 429 that every caller shares. Never let two cycles run at once; overlapping cycles doubled Reveddit Real-Time's request rate just before its first 429s. A 403 is a block, not rate limiting: label it as a block and don't back off on it.
- **No posting on the user's behalf.** Test posts are made by the user, by hand.
- **Don't disguise the traffic.** No proxies or IP rotation, no spoofed user agents or fingerprints, and no borrowed cookies. Every rung above runs in a context the user controls, on their own connection.
- **Keep the user's data on their machine.** Reveddit Real-Time's diagnostic log stays in local storage and leaves only when the user copies it. If a tool ever adds an opt-in to share something, use each store's consent mechanism: in Firefox, optional `data_collection_permissions` (its built-in consent prompt needs Firefox 140 or later); in Chrome and Edge, the store's privacy disclosures plus a consent screen in the extension (researched 2026-10-17).

If the only way through crosses one of these lines, stop and tell the person you're building for what the platform did.

## Testing

- **Confirm which path served a page before concluding anything.** With fallbacks in place, a page that loads may have come through a different path than the one you meant to test. Check resource timing or the network log, have the tool log the path it used and every switch between paths (Reveddit Real-Time logs the leading path as `via=tab` or `via=background`, plus a line for each handoff), and say which path a result came from.
- **Keep a diagnostic log.** Log each verdict with its reason, each fallback handoff, and the shape of each page that didn't parse: size, challenge marker, whether the expected structure is there, title, canonical path, captcha wall (`describePageForDiag` in `src/src/parse_html/new.ts`). Log shapes, never content. A user's log with verdicts but no reasons can't be debugged. Reveddit Real-Time keeps two tiers so a pasted log still covers a day: per-cycle summaries kept by time, and per-item detail capped by count (`src/src/diaglog.ts`).
- **Use canaries.**
  - Positive: an item you know is removed must come back removed. Post in a community that removes everything (r/CantSayAnything removes every post and comment). If it comes back live, the "public" check is seeing the author's view. An id that doesn't exist won't do: it's missing from the author's view too, so it only tests the parser.
  - Negative: put a few items known to be live into each batch. If they're missing, the response is broken and its absences mean nothing.
  - Before trusting a test run, check that a known-live item, a known-removed item and a nonexistent id all come back right.
- **Test in the user's real browser, in each browser.** Headless Chromium got Reddit's captcha wall, and Chrome and Firefox got different answers to the same request on the same day. Playwright is still fine for testing the extension's own pages.
- **Your own testing heats the connection.** Probe at low volume, one process at a time, at least a second apart, and note the time of each run. If results turn strange after a burst of testing, check again after a quiet hour before deciding the platform changed; another browser on the same connection doesn't rule the testing out. On 2026-10-17 a new 403 appeared right after heavy test traffic, and a round of header experiments run then couldn't separate Reddit's change from the effect of the testing.
- **Re-verify a dated finding before building on it.** A project note said Chrome's tab path worked; measured again on 2026-10-17, it didn't. Reproduce a finding with a canary, then update its date in the platform notes, or add a line saying what changed.

### In this repo

- Chrome: `yarn test:e2e` runs Playwright Chromium with `dist-dev-chrome` loaded, which tests the extension but not what Reddit serves, since Reddit walls headless Chromium. For that, use a dev build in the user's real Chrome: its reveddit.com and localhost pages can call `dev-run-check`, `dev-get-log` and `dev-get-storage` through `externally_connectable`. Production builds don't have those actions.
- Firefox: Playwright can't load extensions into Firefox. Use `scripts/firefox-bidi.cjs` (loads a reveddit.com page and records each website-bridge request and answer) and `scripts/firefox-run-check.cjs` (runs one monitoring check and prints its diagnostic log; needs the website's `yarn start` on localhost:8080). Both run with `node --experimental-websocket` against a Firefox the user started with `--remote-debugging-port 9222` (`scripts/firefox-for-claude.applescript`).
- **Never launch Firefox from an agent session.** On macOS the system charges a Firefox that a session launched to that session's process, and twice on 2026-10-17 the session then lost access to a protected folder it was working in. Ask the user to start Firefox. If the repo is in a protected folder such as `~/Desktop`, copy the build out before `--install`, because Firefox reads it itself. WebDriver BiDi won't navigate to `moz-extension://` pages.

## Prior art (surveyed 2026-10-17)

Look before building. Most "shadowban checkers" read account signals and guess.

- **YouTube:** freedom-introvert/youtube-comment-censor-detector, a userscript with a Chinese README. After you post, it rechecks every 5 seconds and separates deleted, held for review and Top-sort hidden. Smaller: RobertWesner/YouTube-Shadow-Comment, danehobrecht/shadowtube.
- **Bilibili:** PizzaDark/biliAntiShadowban compares the guest and logged-in comment lists 8 seconds after you post. freedom-introvert/biliSendCommAntifraud finds the word that tripped a filter by posting probe comments and deleting them, which the limits above rule out.
- **X:** the official "Under the Hood" report in settings (August 2026; downloadable as JSON; for accounts posting at least 10 times a month; government-ordered limits added in September). Robot-Inventor/shadowban-scanner only reads flags X has already put in the page and never checks another view, so it can't see ghost bans or reply deboosting. Reading a platform's own flags is not a visibility check.
- **Bluesky:** Label Scanner, at blue.mackuba.eu/scanner (takes a handle or URL).
- **Facebook, Instagram, TikTok:** no credible comment-level checker found.
