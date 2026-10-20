# YouTube notes

Measurements, not facts, from an unreleased prototype checker (its anonymous check verified 2026-07-10) and an anonymous study of 1,120 comments on four videos (2026-10-17). Each line ends with its date. Re-verify a line before relying on it, then update its date. Nothing here was tested logged in.

Token contents below are continuation tokens written as protobuf `field:value`. `V` is the video id, `C` the comment id, `P` a parent comment's id. To build one, encode it as protobuf, then as URL-safe base64 with `=` written as `%3D`.

## Who sees what

- When a channel owner removes or holds your comment, or the spam filter catches it, YouTube keeps showing it to you as if nothing happened. That's the premise of the prototype and of the userscripts under Prior art in SKILL.md; it wasn't tested here. (2026-07-10)
- Your comment history page, `/feed/history/comment_history`, lists removed comments too, with no removal flag, so the public view is the only signal. (from the prototype's research, not tested, 2026-07-10)
- Publicly, a comment removed by the channel owner, one held for review and one caught by the spam filter are expected to be simply absent and to look the same. Tell them apart by history: seen public and then gone, or never seen public (held, filtered, or removed before the first check). (2026-07-10)

## One anonymous check per comment

- A comment's permalink is `watch?v=V&lc=C`; for a reply, `lc=P.REPLY`. Fetch it with `&hl=en`, `credentials: 'omit'` and `cache: 'reload'`. The watch page's comments token is `2:{2:V} 3:6 6:{4:{4:V 6:0 15:2 16:"C"} 8:"comments-section"}`: the Top sort (`6:0`) with the comment's id in field 16. (2026-10-17)
- Send that token to `POST /youtubei/v1/next?prettyPrint=false` with no cookies, no API key and a minimal context, `{client: {clientName: 'WEB', clientVersion}}`. A public comment comes back first, marked `RENDERING_PRIORITY_LINKED_COMMENT`; a public reply comes back as its parent's only inline reply. A missing comment reads as absent, but absent has only been tested with ids that don't exist, never yet with a real removed or held comment. No comments section at all (comments turned off, video gone) is inconclusive, never absent. Read ids from `frameworkUpdates.entityBatchUpdate.mutations[].payload.commentEntityPayload`. (2026-07-10; confirmed in 53 checks, 2026-10-17)
- Tokens you build yourself matched YouTube's byte for byte, and a built `lc=` token gave the same answer without the 1.4 MB watch page, though that was tried on only two comments. Otherwise take the token from the watch page's `ytInitialData` and the client version from its `INNERTUBE_CLIENT_VERSION`. Watch pages are served `no-cache, no-store`, so a cached copy can't fake a result. (2026-10-17; 2026-07-10)
- One watch page in 57 came back without a comments token, and the retry was fine. Retry before recording inconclusive. (2026-10-17)
- The study made 913 anonymous requests in 29 minutes, from one process, at least 1.05 seconds apart. The prototype's own budget is a check every 30 minutes, at most 20 comments per cycle, 1.5 seconds apart. (2026-10-17; 2026-07-10)

## Top-sort hiding

- 128 of 1,120 comments (11.4%) were missing from the default Top sort in three passes while still public under Newest: 4.7% on a recipe video, 24.4% on a news clip. It's at least partly per comment, not per account (36 of 113 affected authors had another comment on the same video visible under Top), and mostly hits comments with no likes or replies. (2026-10-17)
- The `lc=` check reports these comments as present: its token asks for Top, and YouTube puts the linked comment first anyway. Nothing in the anonymous payloads marked them: `isModeratedElqComment` was `false` on every thread in both sorts. (2026-10-17)
- This is probably reach reduction rather than shadow moderation: the comment stays public under Newest, and YouTube's sort menu describes Newest as "including potential spam". If a tool reports it, give it its own state ("only people who sort by Newest can see it") and softer wording. A userscript claims that a Top-hidden reply doesn't notify the person it answers. That's unverified; if true, it's closer to deceiving the author. (2026-10-17)
- Top membership flaps: 7 of 134 candidates changed state across three passes within 20 minutes. Require two agreeing checks. (2026-10-17)
- Checking a reply: if the parent shows no "N replies" under Top, the reply is hidden there (6 of 6 cases). Otherwise page through the parent's Top reply list from a token you build: `2:{2:V} 3:6 6:{3:{2:P 4:{1:0} 5:CH 6:V 8:1 9:10 16:{1:1}} 8:"comment-replies-item-P"}`, where `CH` is the uploader's channel id (field 5 of the reply token in the `lc=` response). That's 1 request for the first 10 replies and 1 per 50 after that. Don't reuse the reply token from the `lc=` response, which carries the linked reply in field 11 and gave different results from one request to the next. Don't trust reply counts either: they were wrong for 7 of the 42 threads with hidden replies. (2026-10-17)
- Checking a top-level comment: walk Top from `2:{2:V} 3:6 6:{4:{4:V 6:0 15:2} 8:"comments-section"}`, 20 threads per page at about 120 KB, and stop when the comment appears. Cap the walk (about 50 pages, roughly 1,000 top-level comments) and say "not checked" above it. Stop at an empty page: one walk in 12 got a token that returned empty pages forever. One walk per video per cycle serves every watched comment on that video. (2026-10-17)
- Sort fields: top-level lists `6:0` Top, `6:1` Newest; reply lists `16:{1:1}` Top, `16:{1:2}` Newest. (2026-10-17)

## Never verified in the prototype

Capturing new comments by wrapping `create_comment`, importing the comment history page, and the extension running end to end. (2026-07-10)
