import {
  Devvit,
  TriggerContext,
  FormKey
} from "@devvit/public-api";

import {
  getReasonForRemoval,
  getReasonScope,
  containsFlair,
  commentLimitIsValid
} from "./utils.js"

import {
  getAuthorsCommentCount,
  incrementAuthorsCommentCount,
  //getDiversifyStateForPost,
  //getPruneStateForPost,
  //updateDiversifyStateForPost,
  //updatePruneStateForPost
} from "./redis.js"

import { getExtendedDevvit } from "./protos.js";
import { CommentId } from "./types.js"

// Helper function to remove comments beyond the limit per post.
// Returns true if the comment was removed, false otherwise.
export async function processCommentOnDiversify(
  commentId: string,
  commentLink: string,
  postId: string,
  postLink: string,
  userId: string,
  username: string,
  flairText: string,
  authorIsExempt: boolean,
  context: TriggerContext
) {
  const commentLimit = (await context.settings.get("diversify-comment-limit")) as number;
  const diversifyLimitIsValid = commentLimitIsValid(commentLimit); //check if diversify comment limit is valid
  if (!diversifyLimitIsValid) return false; // If limit is not valid, do nothing.
  // Temporary variables that will be needed if PM is sent to user
  var commentRemoved = false;
  var commentRemovedReason = "";
  var forAllPosts = false;
  var forThisPostFlair = false;
  var forThisPost = false;
  const diversifyAllPosts = await context.settings.get("diversify-all-posts")!; //check if enabled for all posts
  forAllPosts = Boolean(diversifyAllPosts);
  //const diversifyState = await getDiversifyStateForPost(postId, context);
  //forThisPost = (diversifyState == "1"); // DEPRECATED
    
  //If not enabled for all posts and not enabled manually for this specific post, then check post flair.
  forThisPostFlair = false;
  if (!forAllPosts && !forThisPost) {        
    const flairList = (await context.settings.get("diversify-flair-list") as string) ?? "";
    forThisPostFlair =
      flairText != "" && flairList != "" && containsFlair(flairText, flairList);
    //console.log(`forThisPostFlair is ${forThisPostFlair} for flair ${flair} and flairList ${flairList}`);
  }
  // If everything looks good, this is where comment limiting/diversification begins
  if (forAllPosts || forThisPost || forThisPostFlair) {
    // Step 1: Get user's comment count in post.
    const commentCount = await getAuthorsCommentCount(
      userId,
      postId,
      context
    );
    // Step 2: If user is over limit, remove comment.
    if (commentCount >= commentLimit && !authorIsExempt) { // Mod check here will depend on the "mods exempt" config setting.
      commentRemoved = await actionCommentAccordingToDiversifyBehavior(commentId, context);
      if (commentRemoved) commentRemovedReason = "diversify";
    }
    // Step 3: Increment user's comment count in post.
    await incrementAuthorsCommentCount(userId, postId, 1, context);
    // Even if this comment was removed in Step 2, any new comments will still increment the comment count for this user.
    // For the count to be decremented, the user must delete their comment and "update with comment deletes" must be enabled.
  }
  if (commentRemoved) {
    await pmUserIfEnabled(username, commentLink, postLink, commentRemovedReason,
      commentLimit, forAllPosts, forThisPostFlair, forThisPost, context);
  }
  return commentRemoved;
}

// Helper function to remove comments past the max reply chain length.
// Returns true if the comment was removed, false otherwise.
export async function processCommentOnPrune(
  commentId: string,
  commentLink: string,
  parentId: string,
  postId: string,
  postLink: string,
  username: string,
  flairText: string,
  authorIsExempt: boolean,
  context: TriggerContext
) {
  const commentLimit = await context.settings.get("prune-comment-limit") as number;
  const pruneLimitIsValid = commentLimitIsValid(commentLimit); //check if prune comment limit is valid
  if (!pruneLimitIsValid) return false; // If comment limit is not valid, do nothing
  // Temporary variables that will be needed if PM is sent to user
  var commentRemoved = false;
  var commentRemovedReason = "";
  var forAllPosts = false;
  var forThisPostFlair = false;
  var forThisPost = false;
  const pruneAllPosts = await context.settings.get("prune-all-posts")!; //check if enabled for all posts
  forAllPosts = Boolean(pruneAllPosts);
  //const pruneState = await getPruneStateForPost(postId, context);
  //forThisPost = (pruneState == "1"); // DEPRECATED

  //If not enabled for all posts and not enabled manually for this specific post, then check post flair.
  forThisPostFlair = false;
  if (!forAllPosts && !forThisPost) {
    const flairList = (await context.settings.get("prune-flair-list") as string) ?? "";
    forThisPostFlair =
      flairText != "" && flairList != "" && containsFlair(flairText, flairList);
  }
  // If everything looks good, this is where comment pruning begins
  if (forAllPosts || forThisPost || forThisPostFlair) {
    var counter = 1;
    var id = parentId;
    // Keep getting parent IDs until you get to "t3_[whatever]" which indicates the parent post,
    // or until you get to the installation's prune limit.
    while (id.startsWith("t1_") && counter <= commentLimit) {
      const comment = await context.reddit.getCommentById(id)!;
      id = comment.parentId;
      counter++;
    }
    // If the limit of comment tree growth has been reached, remove comment
    if (counter > commentLimit && !authorIsExempt) { // Mod check here will depend on the "mods exempt" config setting.
      commentRemoved = await actionCommentAccordingToPruneBehavior(commentId, context);
      if (commentRemoved) commentRemovedReason = "prune";
    }
  }
  if (commentRemoved) {
    await pmUserIfEnabled(username, commentLink, postLink, commentRemovedReason,
      commentLimit, forAllPosts, forThisPostFlair, forThisPost, context);
  }
  return commentRemoved;
}

// Helper function to PM a user if the setting is enabled
export async function pmUserIfEnabled(
  username: string,
  commentLink: string,
  postLink: string,
  commentRemovedReason: string,
  commentLimit: number,
  forAllPosts: boolean,
  forThisPostFlair: boolean,
  forThisPost: boolean,
  context: TriggerContext
) {
  // Optional: inform user via PM that they have reached the limit.
  const pmUserSetting = await context.settings.get("pm-user")!;
  if (pmUserSetting) {
    const subredditName = context.subredditName!;
    var reason = getReasonForRemoval(commentRemovedReason, commentLimit);
    reason += getReasonScope(forAllPosts, forThisPostFlair, forThisPost);
    pmUser(username, subredditName, commentLink, postLink, reason, context);
  }
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
  var reasonIsDiversify = reason.startsWith("- This subreddit has limited the total number");
  if (reasonIsDiversify) {
    reasonIsDiversify = (await context.settings.get("update-comment-delete")) as boolean;
  } // Only send the comment count disclaimer if the setting to update with comment deletes is enabled.
  if (reasonIsDiversify)
    messageText = messageText + reason + commentCountDisclaimer + inboxDisclaimer;
  else // any other reason besides diversify
    messageText = messageText + reason + inboxDisclaimer;
  if (username) {
    try {
      await context.reddit.sendPrivateMessage({
        subject: subjectText,
        text: messageText,
        to: username,
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
export async function isUserMod(username: string, context: TriggerContext) {
  // If user not found, return false.
  if (username == undefined || username == null ||  username == "") return false;
  const subredditName = context.subredditName!;
  // Check if known bot.
  if (username == "AutoModerator" || username == (subredditName + "-ModTeam") || username == context.appSlug)
    return true; // Return true for known bots that are mods.
  const user = await context.reddit.getUserByUsername(username);
  if (!user) return false; // If user not found, return false.
  const modPermissions = await user.getModPermissionsForSubreddit(subredditName);
  if (!modPermissions) return false; // For no permissions object, return false.
  else if (modPermissions.length < 1) return false; // For no permissions in the object, return false.
  else return true; // Otherwise, it's a mod; return true.
}

// Helper function to action a comment according to the "Diversification behavior" setting.
// May result in a comment being reported, filtered, or removed.
// Returns true if the comment was removed, false otherwise.
async function actionCommentAccordingToDiversifyBehavior(commentId: string, context: TriggerContext) {
  const behavior = (await context.settings.get("diversify-behavior")) as string ?? "";
  var commentRemoved = false;
  if (behavior == "report") {
    const comment = await context.reddit.getCommentById(commentId);
    if (comment) await context.reddit.report(comment, { reason: "User's comment limit reached" });
  }
  else if (behavior == "filter") {
    await filterComment(commentId as CommentId, "User's comment count limit reached", true, context);
  }
  else if (behavior == "remove") {
    await context.reddit.remove(commentId, false);
    commentRemoved = true;
  }
  return commentRemoved;
}

// Helper function to action a comment according to the "Prune behavior" setting.
// May result in a comment being reported, filtered, or removed.
// Returns true if the comment was removed, false otherwise.
async function actionCommentAccordingToPruneBehavior(commentId: string, context: TriggerContext) {
  const behavior = (await context.settings.get("prune-behavior")) as string ?? "";
  var commentRemoved = false;
  if (behavior == "report") {
    const comment = await context.reddit.getCommentById(commentId);
    if (comment) await context.reddit.report(comment, { reason: "Comment reply chain limit reached" });
  }
  else if (behavior == "filter") {
    await filterComment(commentId as CommentId, "Comment reply chain limit reached", true, context);
  }
  else if (behavior == "remove") {
    await context.reddit.remove(commentId, false);
    commentRemoved = true;
  }
  return commentRemoved;
}

// EXPERIMENTAL
// Test of filtering comments based on function in Protos
export async function filterComment(commentId: CommentId, reason: string, keep: boolean, context: TriggerContext) {
  try {
    const ExtDevvit = getExtendedDevvit();
    await ExtDevvit.redditAPIPlugins.Moderation.Filter({ id: commentId, keep: keep, reason: reason, }, context.metadata);
  }
  catch (error) {
    console.log(`Could not filter comment:\n${error}`);
  }
}

// DEPRECATED
/*
// Helper function to determine if diversification is enabed for a particular post
export async function isDiversifyOnForThisPost(context: Devvit.Context) {
  const postId = context.postId!;
  const state = await getDiversifyStateForPost(postId, context);
  if (state == "0" || state == "off" || state == "false")
    return false;
  else if (state == "1" || state == "on" || state == "true")
    return true;
  else return false;
}

// DEPRECATED
// Helper function to determine if pruning is enabed for a particular post
export async function isPruningOnForThisPost(context: Devvit.Context) {
  const postId = context.postId!;
  const state = await getPruneStateForPost(postId, context);
  if (state == "0" || state == "off" || state == "false")
    return false;
  else if (state == "1" || state == "on" || state == "true")
    return true;
  else return false;
}
*/