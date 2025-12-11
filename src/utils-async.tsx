import {
  Devvit,
  TriggerContext,
} from "@devvit/public-api";

import {
  getKeyForDiversifyPosts,
  getKeyForPrunePosts,
} from "./utils.js"

export async function removeCommentOnDiversify(
  //commentId: string,
  //postId: string,
  //flairText: string,
  //context: TriggerContext
) {
  // Implement later.
  //var forAllPosts = false;
  //var forThisPostFlair = false;
  //var forThisPost = false;
}

export async function removeCommentOnPrune(
  //commentId: string,
  //postId: string,
  //flairText: string,
  //parentId: string,
  //context: TriggerContext,
) {
  // Implement later.
}

// Helper function for getting user's comment count
export async function getAuthorsCommentCountInPost(
  key: string,
  userId: string,
  postId: string,
  context: TriggerContext
) {
  var countString = (await context.redis.hGet(key, userId)) ?? "";
  if (countString == "") {
    // User hasn't commented here before. Adding redis hash with comment count of 0.
    countString = "0";
    await context.redis.hSet(key, { userId: countString });
  }
  const commentCount = Number(countString);
  return commentCount;
}

// Helper function to PM a user when their comment is removed
export async function pmUser(
  username: string,
  subredditName: string,
  commentLink: string,
  postLink: string,
  reason: string,
  context: TriggerContext
) {
  const knownBots = [ "AutoModerator", subredditName + "-ModTeam", "saved-response" ]
  if (knownBots.includes("username"))
    return; // If recipient is a known bot, do nothing.
  const subjectText = `Your comment in r/${subredditName} was removed`;
  var messageText = `Hi, [your comment](${commentLink}) in [this post](${postLink}) was removed due to the following reason:\n\n`;
  const commentCountDisclaimer = `\n\nTo reduce your comment count so it is once again under the limit, you can delete your comment(s).`;
  const inboxDisclaimer = `\n\n*This inbox is not monitored. If you have any questions, please message the moderators of r/${subredditName}.*`;
  if (reason.startsWith("- This subreddit has limited the total number"))
    messageText = messageText + reason + commentCountDisclaimer + inboxDisclaimer;
  else // any other reason besides diversify
    messageText = messageText + reason + inboxDisclaimer;
  if (username) {
    // If you want to send a PM as the subreddit, uncomment the line below and comment out the next line
    //await context.reddit.sendPrivateMessageAsSubreddit({
    try {
      await context.reddit.sendPrivateMessage({
        subject: subjectText,
        text: messageText,
        to: username,
        //fromSubredditName: subredditName,
      });
    } catch (error) {
      if (error == "NOT_WHITELISTED_BY_USER_ERROR")
        console.log(`Error: u/${username} likely has messaging disabled.`);
      else console.log(`Error sending PM to user ${username}: ${error}`);
    }
  }
  else {
    console.log(`Error: User not found. Cannot send PM.`);
  }
}

// Helper function for determining if comment author is a moderator
export async function authorIsMod(userId: string, context: TriggerContext) {
  const subreddit = await context.reddit.getCurrentSubredditName()!;
  const modList = context.reddit.getModerators( { subredditName: subreddit }!);
  const mods = await modList.all();
  var isMod = false;
  //for each mod in the list, check if their user id matches the comment author's user id
  for (let i = 0; i < mods.length; i++) {
    const modId = mods[i].id;
    if (userId==modId) {
      isMod = true;
      break;
    }
  }
  return isMod;
}

// Helper function to determine if diversification is enabed for a particular post
export async function isDiversifyOnForThisPost(context: Devvit.Context) {
  const postId = context.postId!;
  const key = getKeyForDiversifyPosts(postId);
  const matches = await context.redis.exists(key);
  return matches > 0;
}

// Helper function to determine if pruning is enabed for a particular post
export async function isPruningOnForThisPost(context: Devvit.Context) {
  const postId = context.postId!;
  const key = getKeyForPrunePosts(postId);
  const matches = await context.redis.exists(key);
  return matches > 0;
}