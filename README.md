## Features

Formerly known as Diverse Comments, this app allows moderators to limit comments on posts in two distinct ways.

1. Limit how many comments per post each user can make, configurable by post flair. Doing this can lead to a more diverse variety of comments, since they won't all be coming from the same users.
2. Limit how many comments can be on a comment reply chain. This chops off or "prunes" the end of comment trees once the limit has been reached.

Additionally, mods can choose whether to:

- Limit comments for all posts, no posts, or posts with a specific flair.
- Report, filter, or remove comments.
- Message users privately from the bot account (not modmail) when their comment is removed (not filtered) and explain why. Equivalent to an Automod notification.

---

## Changelog

### [0.1.7] (2026-06-19)

- Fixed an issue that caused filtered comments to still be visible to other users while in the mod queue.

### [0.1.4] (2026-06-04)

#### Features

- Added the ability to report or filter comments instead of removing them.
- Deprecated the ability to limit comments on *specific* posts from a menu item due to disuse. Mods can still limit comments on all posts or only those with specific flairs.
- Removed the Settings menu item at subreddit level for a cleaner menu. Settings are still accessible from developers.reddit.com.

#### Bug Fixes

- Fixed an issue that caused some comments past the per-post limit to not be removed.
- Improved resilience to Developer Platform issues that may fire duplicate triggers for a single comment. This ensures the app accurately tracks comments and avoids removing legitimate ones as duplicates.
- Updated Devvit CLI to 0.13.2.
- Updated dependencies to address vulnerabilities.
- Rewrote and rearranged large sections of code for easier readability and maintainability.

### [0.1.3] (2026-05-18)

#### Features

- App icon now appears as app account's avatar.
- Updated description on app profile page.
- Updated Devvit CLI to 0.12.24.

### [0.1.2] (2026-01-14)

- New app icon.

### [0.1.1] (2025-12-24)

- Added the word "Settings" to the subreddit-level menu item.
- Bumped minor version.

### [0.0.32] (2025-11-30)

#### Bug Fixes

- Prevented app from messaging AutoModerator or the [subreddit]-ModTeam account.

### [0.0.29] (2025-11-22)

#### Features

- Added a proper link to the config settings from the subreddit-level menu item.
- Migrated application to Devvit Web.

### [0.0.23] (2025-08-19)

#### Bug Fixes

- Fixed a bug where the PM wasn't being sent to the user even if the config setting was enabled.
- Fixed a bug where comment deletes by users were being combined with comment removals from mods, negatively affecting comment tracking. Now, a comment removal will not decrease that user's comment count; it will only decrease if the user deletes their own comment.

### [0.0.21] (2025-08-06)

#### Bug Fixes

- Re-engineered the app to reference a user's "user ID" (a unique hidden identifier) rather than their username. This solves some edge cases where a user might change their username after their account is created.
- Fixed a bug where the app wasn't properly keeping track of new comments and deleted comments when diversification was enabled.
- Fixed a bug where some settings for comment pruning were dependent on the settings for diversification.
- Tweaked how the "mods exempt" setting works to improve the testing experience for mods.

### [0.0.18] (2025-07-20)

#### Bug Fixes

- Fixed a bug where a post was not being diversified/pruned even if its post flair had a match in the config's flair list.

### [0.0.17] (2025-06-25)

- Updated to use new Devvit platform version 0.11.17. No new features or bug fixes.

### [0.0.16] (2025-06-10)

#### Features

- Tidied up the menu items on a post. Now there are only 2 instead of 4: Manage Diverse Comments and Manage Comment Pruning.
- The menu items now show a pop-up where you can change whether or not diversifying or pruning is enabled on a specific post.
- A more detailed message now appears when these pop-ups show up and when diversifying or pruning is disabled per post. The message explains that even though it can look "turned off" for an individual post, comments will still be removed if diversification/pruning is turned on for all posts or for posts with a specific flair.

### [0.0.9] (2025-06-08)

#### Features

- Now sends users a PM with their comment's permalink and the post's permalink instead of the post title.

### [0.0.8] Initial version (2025-06-07)

#### Features

- Limit how many comments a single user can leave on any given post.
- Limit how many comments can be on a comment reply chain.
- Configure for all posts, no posts, individual posts, or posts with a specific post flair.
- Option to PM users when their comment is removed and explain why.

#### Bug Fixes

None yet (initial version). Please send a private message to the developer (u/Chosen1PR) to report bugs.