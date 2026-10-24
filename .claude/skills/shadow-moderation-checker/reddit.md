# Reddit notes

Measurements, not facts. Each line ends with the date it was verified or, where the code didn't record one, the date it was written into the code. Reddit changes without notice: re-verify a line before relying on it, then update its date. The code comments in [requests.ts](../../../src/src/requests.ts), [parse_html/new.ts](../../../src/src/parse_html/new.ts), [bridge.ts](../../../src/src/bridge.ts) and [monitoring.ts](../../../src/src/monitoring.ts) carry more detail.

## Who sees what

- Authors see their own removed comments as live everywhere they look: profile, thread and API. That covers moderator, AutoModerator and spam-filter removals. Sitewide shadowbans still happen too; don't repeat the claim that Reddit ended them in 2015. (2026-10-17)
- Other logged-in users see a removed item as `[removed]`. Reddit hides only your own removals from you, so a logged-in read of `/api/info` is a fair check for items the user didn't write, unless the user moderates that subreddit (see the moderators line below). (2026-07-13)
- From one home IP, Reddit answered `/api/info` from the extension's background with the 190 KB block page in every form tried: `api/info.json` with the user's login and without, and the legacy `/api/info?id=` HTML, in every fetch cache mode. Profile, about, thread, subreddit and item pages still loaded the same way. Not yet checked from another network. (2026-10-24)
- Posts: the author's view sometimes shows the removal, as `is_robot_indexable: false` or a `removed_by_category` value. Trust it when present. For held and spam-filtered posts, `is_robot_indexable` stays `true` for about 24 hours. (2026-07-13)
- Moderators see removed items in their subreddits with the text intact and `removed: true` or `banned_by` set (verified on r/pushshift, 2026-10-17). The code also reads `spam: true` as a spam-filter removal; that one wasn't checked that day.
- Send `Accept-Language: en`, and treat a comment as removed when its author starts with "[", which works in any language. (2026-07-13)

## Logged-out views

- Logged-out `.json` from an extension gets a 189 KB "network security" 403 page in Chrome and Firefox. Chrome tried only the browser's `loid` cookie, which had got through since September. Firefox also tried `Sec-Fetch-Site: none`, a reddit Referer, both, and the whole device cookie jar minus the session cookies, all 403, though right after heavy test traffic, so recheck the variants before ruling them out. (2026-10-17)
- What still got 200 that day: logged-in requests such as `/api/me.json`, legacy pages (see Item pages), and logged-out www.reddit.com HTML pages through the fetch paths below. New API keys can't be created, so OAuth isn't a path for a new tool. (2026-10-17)
- Logged-out www.reddit.com HTML is the one public view of a profile left: `/user/<name>/comments/?sort=new` and `/user/<name>/submitted/?sort=new`. Items carry `thing-id="t1_…"` (comments) or `thing-id="t3_…"` (posts). Removed items are simply absent; nothing marks them. The first page holds about 8 items. Further pages come about 25 at a time from `/svc/shreddit/profiles/profile_comments-more-posts/new/?sort=new&after=<cursor>&name=<user>&feedLength=8` (posts: `profile_posts-more-posts`), and each page carries the next cursor, the base64 of its last item's id. An empty profile says the user "doesn't have any posts yet" or "comments yet". (2026-07-01)
- The overview tab omits items that the comments and posts tabs show; don't use it. (2026-07-13)
- Since about July 2026, logged-out profiles leave out items from subreddits the user hid from their profile ("curate your profile"), for every viewer. (2026-07-20)
- Items in NSFW, quarantined and private subreddits never appear logged out. Restricted subreddits are public; only posting is restricted there. (2026-07-13)
- Held and spam-filtered posts linger in the public profile feed for a grace period, much as `is_robot_indexable` lags for about 24 hours. The extension checks posts younger than 48 hours against their own pages (2026-07-13). A removed post was seen still listed 3.5 weeks after it was made, a day after its removal (2026-07-26).

## Item pages

- Fetch item pages at the URL the site itself links to, which renders without a redirect. A post's permalink is `/r/<sub>/comments/<id>/<slug>/`; `/comments/<id>/` answers with a 301 to it. A comment's is `/r/<sub>/comments/<post>/comment/<id>/`; `/comments/<post>/comment/<id>/` answers with a 301, and the API's permalink form, `/r/<sub>/comments/<post>/<slug>/<id>/`, came back as a shell that only redirects in a browser, with no comment tree and no post (3 of 3 samples, live and removed). A cookie-less background fetch that follows a redirect loses its solved challenge and gets a new one. (2026-10-17)
- A post's logged-out page shows its status inside the `<shreddit-post>` element. A held post shows "Post is awaiting moderator approval." even to logged-out visitors (verified). For removals the extension looks for phrases such as "removed by the moderators", "removed by Reddit" or "Reddit's spam filters"; those patterns weren't each verified. Search only inside that element, since comments lower down can contain the same words (2026-07-13). Read only the `<shreddit-post>` whose `id` is the requested post: other pages carry `<shreddit-post>` elements too, and the regex `<shreddit-post\b` also matches `<shreddit-post-overflow-menu>`, which an ad put first on the front page (2026-10-17).
- On a comment's logged-out page, a live comment renders as `<shreddit-comment thingId="t1_…" author="<name>">`, including comments in subreddits hidden from the profile. A removed comment with no replies is absent. A removed comment kept for its replies renders with `author="[deleted]"`. `<shreddit-comment-tree>` carries the focal comment's id even when that comment is removed (2026-07-20). That proves the page is the right one, not that the comment is live, so count a missing comment as removed only when the tree names the requested comment (2026-10-17).
- Reddit sometimes serves comment-less page shells for long stretches (12 of 12 in one run, 2026-07-26), and once served its front page for a permalink, even after a solved challenge (2026-08-17). Read both as unknown. The front page has `<link rel="canonical" href="https://www.reddit.com/">`, three `<shreddit-post>` feed items and no comment tree, while post pages, comment pages and `/svc` partials have no canonical link at all. So identify a thread page by the ids above, not by a canonical link or its title, which every page now shares. Code that only looked for those elements read the front page as "every comment removed, every post live". (2026-10-17)
- Lighter routes that Reddit's own scripts load, and legacy pages, carry the same signals. The extension uses them as fallbacks and tiebreakers, each behind a remote switch: see `fetchAndClassifyAbsentItem` and `legacyTiebreakAbsent` in [requests.ts](../../../src/src/requests.ts) and the comments in [parse_html/common.ts](../../../src/src/parse_html/common.ts). (2026-10-17)

## Fetch paths

The extension reads logged-out pages either from a www.reddit.com tab, through its content script, or from its background. `getWwwHtmlFetcher` in requests.ts tries routes, a path plus a fetch cache mode, in order and remembers which ones Reddit refused.

- **The JS challenge.** A request that doesn't look like the page's own gets a challenge page instead: a string-doubling puzzle and a token in a hidden form, which any browser passes by running the page's script. On 2026-08-31 the token field was renamed from `token` to `jsc_token`, with a new `jsc_orig_r` field, and the solved request must echo each field under its own name or Reddit serves the challenge again. The rename silently stopped every public-profile check until a release. The field names and the puzzle's pattern now live in [challenge-config.ts](../../../src/src/challenge-config.ts) and can be overridden from the news feed. (2026-09-03)
- **What each path got** (2026-10-17):

  | Request | Chrome | Firefox |
  |---|---|---|
  | Logged-out `.json` from the extension | 403 block page | 403 block page |
  | `.json` with the user's login | passes | passes |
  | Logged-out HTML from the background | JS challenge, then 403 on the solved request | same |
  | The same with `cache: 'reload'` (no-cache) | 200; a full lookup read 100 of 100 items | 200, real pages |
  | Logged-out HTML from a www.reddit.com tab | 403 since about 2026-09-14, from the content script and from a script in the page's main world | the page's own fetch (`content.fetch`): 200, no challenge. The content script's `fetch()`: challenge, then 403 |
  | The same with `cache: 'reload'` | not tested | "Prove your humanity" captcha, in both cycles tried |

- **2026-10-21, Chrome: reversed in the background.** `cache: 'reload'` got the 403 on every solved page, `/svc` partial and legacy request, while `no-store`, `default` and `no-cache` read real pages. In the tab, `default` got the 403 or the captcha, and `no-cache` and `reload` read real pages. On the wire, Chrome's `default` and `no-store` send no cache headers, `no-cache` sends `Cache-Control: max-age=0`, and `reload` sends `Pragma` and `Cache-Control: no-cache`. Firefox follows the Fetch spec, under which `no-store` sends the same headers as `reload`. (2026-10-21)
- **The block page** is Reddit's "network security" page, about 190 KB, sent with a 403. Each challenge was fresh, so the no-cache effect isn't a stale cache; `cache: 'reload'` adds `Pragma: no-cache` and `Cache-Control: no-cache`. Only the background sends no-cache, since on a tab it brought the captcha. (2026-10-17)
- **Why Firefox's tab differs:** a Firefox content script's default `fetch` is privileged, so Reddit sees an extension request, with no tab and no Referer. `content.fetch` is the page's own fetch: same-origin, with a Referer. (2026-10-17)
- **Headless Chromium** got the captcha wall and no `loid` cookie, so it can't stand in for a real browser. (2026-10-17)
- old.reddit.com and sh.reddit.com tabs can't help: their content scripts' fetches to www.reddit.com are cross-origin and blocked. (2026-07-13)
- Each extension update or reinstall orphans the content scripts in open tabs ("Receiving end does not exist"). Inject the fetch with `scripting.executeScript` instead (2026-08-14). In Firefox, call it as `browser.scripting`, because `chrome.*` there takes callbacks and returns undefined (2026-10-17).

In 0.0.5.24 the leading path got one retry through the other on a 403, and a refused tab handed the lead to the background for 6 hours. With that, Chrome read 100 of 100 items and found 7 removals, and Firefox read 27 of 27 and found 3, through both paths. (version 0.0.5.24, 2026-10-17) After the 2026-10-21 reversal, 0.0.5.25 kept sending `reload` from the background and failed every lookup (reveddit/reveddit#27).

So no route is fixed any more. Each fetch tries the routes in order, and a refused route rests, per kind of page: 6 hours after a 403, 30 minutes after a captcha, a network error or a page the caller can't read. The news feed can reorder and skip the routes for each browser (`www_route_order`; 0.0.5.26 read a single list as `www_routes`) without a release, though never drop the last background route. A page counts as served only when the caller can read it, so a renamed challenge field or an unrecognized page moves the fetch on instead of passing for a success. (0.0.5.27, 2026-10-22)

Young posts still in the feed are checked on their own pages, at most 10 per cycle, with unreadable answers cached for 30 minutes. Before 0.0.5.27 they were checked only while the tab path led, so in Chrome a held post showed only through the author's-view fields. (2026-10-22)

## Monitoring in brief (0.0.5.24)

- **Cycle:** every minute by default, one at a time, with up to 10 seconds of jitter.
- **Items missing from the feed:** checked on their own pages, the lighter route first. Up to 20 per cycle, 500 ms apart, halved and spaced twice as far for an hour after a 429. Verdicts are cached for 6 hours if live, 2 hours if removed, and 30 minutes if held or unknown.
- **When the public profile fails:** a legacy chain takes over. Comments are checked every cycle, and posts go to a pending queue that checks each one at most 3 times. After a real 403 from it, every legacy path rests for 6 hours (0.0.5.27).
- **Alerts:** a removal alerts after 3 to 5 consecutive removed verdicts (the count is drawn again each time the background starts), and a reinstatement after 2 live ones by default.
- **Warnings** after 5 consecutive failed cycles: `public_view_unavailable`, `absent_verify_unavailable`, `logged_in_view_unavailable`. `profile_publicly_empty` is the account-wide shadowban signature.

## The website bridge

reveddit.com pages can fetch Reddit JSON through the extension ([bridge.ts](../../../src/src/bridge.ts)). By October every logged-out fetch of that kind got the 403, so since 0.0.5.24 the bridge sends the user's own Reddit login, and refuses with `not_logged_in` when there isn't one. `toPublicView` then rewrites the answer to what logged-out visitors see. Items the extension's monitoring has confirmed removed are marked removed, and so are items carrying moderator-view flags (`removed`, `spam`, `banned_by`). The gap: the user's own removed items that monitoring hasn't seen, beyond its newest ~130 per subscribed user, still look live through the bridge. (2026-10-17) Since 0.0.5.27 the user's other own items carry `reveddit_unverified` unless monitoring's last pass saw them in the logged-out view, items by authors who blocked the user (`[unavailable]`) carry `reveddit_viewer_blocked`, fields only a logged-in viewer gets are set to their logged-out values, and the user's own profile answers 404 while monitoring sees the shadowban signature. The website still has to show those flags. (2026-10-22)

Also worth copying: a closed list of allowed paths, not a URL proxy; requests wait up to 6 seconds for a running monitoring cycle and share its 429 backoff; and at most 100 requests per 10 minutes, halved for an hour after a 429. (2026-10-17) Every answer arrives within 9 seconds, inside the page's 10-second timeout. A bridge that sends the user's login must check who is asking: in Firefox any extension can message another one, and a content-script relay must refuse private windows and containers, whose cookies aren't the ones the background sends. Paths whose answer depends on the viewer (`/user/me`, `r/mod`, `r/friends`, a mod log without the publicmodlogs feed) are refused. (0.0.5.27, 2026-10-22)

## Rate limits

- Only a 429 is rate limiting. Back off on it, with one backoff shared by monitoring and the bridge. A 403 is a block, and backing off on it would pause monitoring for nothing. (2026-09-11)
- Two monitoring cycles running at once doubled the request rate just before the first 429s seen in a user's log, so cycles must not overlap. (2026-08-17)
- After a 429, halve the per-cycle verification budget and double its spacing for an hour, so the first cycle back doesn't trip the limit again. (2026-08-14)

## In the diagnostic log

- `www tab fetch refused` and `background www fetch refused`: a handoff between paths.
- `via=tab` or `via=background` at the end of each `www lookup` line: the path that led when the lookup finished.
- `page unreadable after challenge solve` or `page unreadable (no solvable challenge)`, with the page's shape: `bytes`, `challenge`, `scaffold`, `title`, `canonical`, `wall=captcha`.
- `absent verify: N fetched, N paced (recent unknown), N resolved this cycle`.
- `www public-view lookup failed — consecutive failures: N`.

## Code map

- `src/src/requests.ts`: `getWwwHtmlFetcher` (paths and handoffs), `PUBLIC_VIEW_FETCH_INIT` and `BACKGROUND_FETCH_INIT`, `lookupItemsByID_fromPublicProfile` (classification), `verifyFeedPresentPosts`, `verifyFeedAbsentItems`, `legacyTiebreakAbsent`, `getLoggedinUserDetailed`.
- `src/src/parse_html/new.ts`: profile parsing, `classifyPostPage`, `classifyCommentPage`, `solveChallenge`, `describePageForDiag`.
- `src/src/challenge-config.ts`, `src/src/bridge.ts`, `src/src/monitoring.ts` (the cycle, confirmation counts, never-public classes) and `src/src/diaglog.ts`.
