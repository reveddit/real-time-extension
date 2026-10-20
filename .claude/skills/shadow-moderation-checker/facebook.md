# Facebook notes

Nothing here has been tested first-hand. It comes from Facebook's own Help Center and Terms, and from how-to guides, read 2026-10-17. Verify it before building on it, and record what you find here with the date.

## What Facebook says (read 2026-10-17)

- When you hide a comment on a post on your profile, Facebook says it "will still be visible to the person who wrote it and their friends", and is hidden from everyone else you shared the post with. ([Hide or delete a comment from a post on your Facebook profile](https://www.facebook.com/help/207042374708584))
- A Page also hides comments automatically, through its list of blocked words and its profanity filter. Facebook says such comments "remain visible to the people who wrote them and their friends", and not to anyone else. ([Block certain words from appearing in comments on your Facebook Page](https://www.facebook.com/help/131671940241729), [Turn the profanity filter on and off for your Facebook Page](https://www.facebook.com/help/1017549069082358))
- A Page can hide comments by hand too ([Hide a comment from a post on your Facebook Page](https://www.facebook.com/help/297845860255949)), but that page didn't render without a browser, so who still sees those wasn't read.
- None of these pages say whether the writer is told. How-to guides say the writer isn't notified, and that replies to a hidden comment are hidden too ([How-To Geek](https://www.howtogeek.com/841380/how-to-hide-a-comment-on-your-post-on-facebook/)).

So by Facebook's own account, comments hidden on a profile post, by a Page's blocked words or by its profanity filter stay visible to their writer and the writer's friends, and the writer is reportedly not told. That fits this skill's definition of shadow moderation.

## What it means for a checker (inferred, not tested)

- The writer's friends see hidden comments, so any view from a friend's account reports them as live. The comparison view has to come from someone who isn't the writer's friend.
- Check what a logged-out visitor sees of a public post's comments. Facebook puts much of its logged-out browsing behind a login prompt; if a post's comments don't show, the logged-out rungs of the ladder aren't available here.
- Facebook's [terms](https://www.facebook.com/terms.php) say "Create only one account (your own)" (section 3.1), so a second personal account isn't an option either.
- A clean first test needs no extra accounts. The user posts publicly from their profile, a willing friend comments, and the user hides that comment. Then three people look with their own accounts: the friend, one of the friend's friends, and someone who is neither. If the user runs a Page, repeat there with a word from its blocked list. Record what each person saw here, with the date.
- Prior art: no credible comment-level checker for Facebook, Instagram or TikTok as of 2026-10-17. The "shadowban checker" sites for them guess from account signals.
