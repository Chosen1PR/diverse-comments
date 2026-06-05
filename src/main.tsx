// Learn more at developers.reddit.com/docs
import {
  Devvit,
} from "@devvit/public-api";

import { commentLimitIsValid } from "./utils.js"

import {
  processCommentOnDiversify,
  processCommentOnPrune,
  isUserMod,
  //isDiversifyOnForThisPost,
  //isPruningOnForThisPost
} from "./utils-async.js"

import {
  getAuthorsCommentCount,
  deleteAuthorsCommentCount,
  incrementAuthorsCommentCount,
  getSeenStateForCommentCreate,
  getSeenStateForCommentDelete,
  updateDiversifyStateForPost,
  updatePruneStateForPost
} from "./redis.js"

Devvit.configure({
  redis: true,
  redditAPI: true,
});

Devvit.addSettings([
  {
    type: "group",
    label: "Diverse Comments",
    fields: [
      // Master config flag for enabling comment diversification at all
      {
        type: "boolean",
        name: "enable-diversify",
        label: "Turn on diverse comments",
        helpText:
          "Limits the number of comments a single user can leave on any given post.",
        defaultValue: false,
        scope: "installation",
      },
      {
        type: "select",
        name: "diversify-behavior",
        label: "Diversification behavior",
        helpText: "\"Report\" will flag comments for review without removing them. \"Filter\" will remove comments and send them for review. \"Remove\" will remove comments without sending them for review.",
        options: [
        {
          "label": "Report",
          "value": "report"
        },
        {
          "label": "Filter",
          "value": "filter"
        },
        {
          "label": "Remove",
          "value": "remove"
        }],
        defaultValue: ["remove"]
      },
      // Config setting for flag to diversify all posts
      {
        type: "boolean",
        name: "diversify-all-posts",
        label: "Diversify all posts",
        helpText: "Limits comments for all posts.",
        defaultValue: false,
        scope: "installation", // this can be a string literal 'app' as well
      },
      // Config setting for list of flairs of posts that should have comment diversification enabled
      {
        type: "paragraph",
        name: "diversify-flair-list",
        label: "Flair list",
        helpText:
          'Comma (,) delimited list of flairs (case-sensitive) for posts where you want to limit/diversify comments.\nNOTE: The "Diversify all posts" setting overrides this.',
        defaultValue: "",
        scope: "installation",
      },
      // Config setting for comment limit for comment diversification
      {
        type: "number",
        name: "diversify-comment-limit",
        label: "Comment limit",
        defaultValue: -1,
        helpText:
          "Enter the maximum number of comments you want people to be able to leave on a post. Enter any negative number for no limit, or 0 for no comments (equivalent to locking a post).",
        scope: "installation",
      },
      // Config setting for updating comment count when a user deletes their comments
      {
        type: "boolean",
        name: "update-comment-delete",
        label: "Update with comment deletes",
        defaultValue: true,
        helpText:
          "Update a user's comment count in a post when they delete their comment(s). Turn this off if you think users will abuse this and spend their time deleting and making comments over and over again.",
        scope: "installation",
      },
    ],
  },
  {
    type: "group",
    label: "Comment Pruning",
    fields: [
      // Master config setting for enabling comment pruning
      {
        type: "boolean",
        name: "enable-prune",
        label: "Turn on comment reply tree pruning",
        defaultValue: false,
        helpText: "Limit how long nested comment chains can get.",
        scope: "installation",
      },
      {
        type: "select",
        name: "prune-behavior",
        label: "Pruning behavior",
        helpText: "\"Report\" will flag comments for review without removing them. \"Filter\" will remove comments and send them for review. \"Remove\" will remove comments without sending them for review.",
        options: [
        {
          "label": "Report",
          "value": "report"
        },
        {
          "label": "Filter",
          "value": "filter"
        },
        {
          "label": "Remove",
          "value": "remove"
        }],
        defaultValue: ["filter"]
      },
      // Config setting for pruning comments in all posts
      {
        type: "boolean",
        name: "prune-all-posts",
        label: "Prune all posts",
        helpText: "Prune new comment trees in all posts.",
        defaultValue: false,
        scope: "installation", // this can be a string literal 'app' as well
      },
      // Config setting for pruning flair list
      {
        type: "paragraph",
        name: "prune-flair-list",
        label: "Flair list",
        helpText:
          'Comma (,) delimited list of flairs (case-sensitive) for posts where you want to prune comment trees.\nNOTE: The "Prune all posts" setting overrides this.',
        defaultValue: "",
        scope: "installation",
      },
      {
        type: "number",
        name: "prune-comment-limit",
        label: "Comment limit",
        helpText:
          "Enter the maximum length that comment reply trees can reach. Enter any negative number for no limit, 0 for no comments (equivalent to locking a post), or 1 for only top-level comments.",
        defaultValue: -1,
        scope: "installation",
      },
    ],
  },
  // Config setting for PMing a user when their comment is removed
  {
    type: "boolean",
    name: "pm-user",
    label: "Message users regarding comment removal",
    defaultValue: false,
    helpText:
      "Message users privately from the bot account (not modmail) when their comment has been removed (not filtered) and explain why.",
    scope: "installation",
  },
  // Config setting for exempting moderators to all rules
  {
    type: "boolean",
    name: "mods-exempt",
    label: "Moderators exempt",
    defaultValue: true,
    helpText:
      "Disable for testing, but most mods should leave this enabled.",
    scope: "installation",
  },
]);

// DEPRECATED
// The below two menu items have been commented out because the functionality they enable was deprecated.
// Leaving in the code for now in case I need to turn them back on.
/*
// Button on posts to manage comment limiting/diversification
Devvit.addMenuItem({
  label: "Manage Diverse Comments",
  location: "post", // can also be 'comment' or 'subreddit'
  forUserType: "moderator",
  onPress: async (_event, context) => {
    const diversifyEnabled = await context.settings.get("enable-diversify")!; //check if diversification enabled
    const diversifyAllPosts = await context.settings.get("diversify-all-posts"); //check if enabled for all posts
    const diversifyLimit = await context.settings.get("diversify-comment-limit");
    const diversifyLimitIsValid = commentLimitIsValid(diversifyLimit); //check if diversify comment limit is valid
    if (!diversifyEnabled) {
      context.ui.showToast({
        //text: `Value of diversifyEnabled is: ${diversifyEnabled}`,
        text: "Please enable comment diversification in the config settings for this app.",
        appearance: "neutral",
      });
    } else if (diversifyAllPosts) {
      context.ui.showToast({
        //text: `Value of diversifyAllPosts is: ${diversifyAllPosts}. diversifyEnabled`,
        text: "Comment diversification is already enabled for all posts.",
        appearance: "neutral",
      });
    } else if (!diversifyLimitIsValid) {
      context.ui.showToast({
        //text: `Value of diversifyLimit is: ${diversifyLimit}. Is valid? ${diversifyLimitIsValid}`,
        text: "The comment limit in this app's config settings does not allow for diverse comments.",
        appearance: "neutral",
      });
    } else {
      const isDiversified = await isDiversifyOnForThisPost(context);
      context.ui.showForm(manageDiversifyForm, { diversifyThisPost: isDiversified })
    }
  },
});

// Button on posts to manage comment pruning
Devvit.addMenuItem({
  label: "Manage Comment Pruning",
  location: "post", // can also be 'comment' or 'subreddit'
  forUserType: "moderator",
  onPress: async (event, context) => {
    const pruneEnabled = await context.settings.get("enable-prune")!; //check if pruning enabled
    const pruneAllPosts = await context.settings.get("prune-all-posts"); //check if enabled for all posts
    const pruneLimit = await context.settings.get("prune-comment-limit");
    const pruneLimitIsValid = commentLimitIsValid(pruneLimit); //check if prune comment limit is valid
    if (!pruneEnabled) {
      context.ui.showToast({
        //text: `Value of pruneEnabled is: ${pruneEnabled}`,
        text: "Please enable comment pruning in the config settings for this app.",
        appearance: "neutral",
      });
    } else if (pruneAllPosts) {
      context.ui.showToast({
        //text: `Value of pruneAllPosts is: ${pruneAllPosts}. pruneEnabled`,
        text: "Comment pruning is already enabled for all posts.",
        appearance: "neutral",
      });
    } else if (!pruneLimitIsValid) {
      context.ui.showToast({
        //text: `Value of pruneLimit is: ${pruneLimit}. Is valid? ${pruneLimitIsValid}`,
        text: "The comment limit in this app's config settings is does not allow for pruning comments.",
        appearance: "neutral",
      });
    } else {
      const isPruned = await isPruningOnForThisPost(context);
      context.ui.showForm(managePruneForm, { pruneThisPost: isPruned })
    }
  },
});
*/

// DEPRECATED
// Pop-up form for disabling comment diversification on a post
const disableDiversifyForm = Devvit.createForm({
  title: 'Success!',
  description: "Comment diversification is now not forced on this specific post, but if diversification is on for all posts"
    + " or for posts with this post's flair, comments in this post will still be diversified."
    + " Please check your config settings for more details.",
  fields: [],
  acceptLabel: 'Ok',
  cancelLabel: 'Cancel',
}, values => { });

// DEPRECATED
// Pop-up form for disabling comment pruning on a post
const disablePruneForm = Devvit.createForm({
  title: 'Success!',
  description: "Comment pruning is now not forced on this specific post, but if pruning is on for all posts"
    + " or for posts with this post's flair, comments in this post will still be pruned."
    + " Please check your config settings for more details.",
  fields: [],
  acceptLabel: 'Ok',
  cancelLabel: 'Cancel',
}, values => { });

// DEPRECATED
// Pop-up form for managing diverse comments on a post
const manageDiversifyForm = Devvit.createForm(
  (data) => (
    {
      title: 'Manage Diverse Comments',
      fields: [
      {
        type: 'boolean',
        name: 'diversifyThisPost',
        label: 'Diversify this post',
        defaultValue: data.diversifyThisPost,
        helpText: `Controls the active state of whether or not to diversify comments on this specific post`
          + `. NOTE: Even if this setting is off, comments may still be diversified if "Diversify all posts" is on`
          + ` or if diversification is enabled for all posts with this post's flair.`,
      }
    ],
    acceptLabel: 'Submit',
    cancelLabel: 'Cancel',
  }),
  async (event, context) => {
    const postId = context.postId!;
    if (event.values.diversifyThisPost) {
      await updateDiversifyStateForPost(postId, "1", context);
      context.ui.showToast({
        text: "Success! Comment diversification is now enabled on this post.",
        appearance: "success",
      });
    }
    else {
      await updateDiversifyStateForPost(postId, "0", context);
      context.ui.showForm(disableDiversifyForm);
    }
  }
);

// DEPRECATED
// Pop-up form for managing pruning comments on a post
const managePruneForm = Devvit.createForm(
  (data) => (
    {
      title: 'Manage Comment Pruning',
      fields: [
      {
        type: 'boolean',
        name: 'pruneThisPost',
        label: 'Prune this post',
        defaultValue: data.pruneThisPost,
        helpText: `Controls the active state of whether or not to prune comments on this specific post`
          + `. NOTE: Even if this setting is off, comments may still be pruned if "Prune all posts" is on`
          + ` or if pruning is enabled for all posts with this post's flair.`,
      }
    ],
    acceptLabel: 'Submit',
    cancelLabel: 'Cancel',
  }),
  async (event, context) => {
    const postId = context.postId!;
    if (event.values.pruneThisPost) {
      await updatePruneStateForPost(postId, "1", context);
      context.ui.showToast({
        text: "Success! Comment pruning is now enabled on this post.",
        appearance: "success",
      });
    }
    else {
      await updatePruneStateForPost(postId, "0", context);
      context.ui.showForm(disablePruneForm);
    }
  }
);

// New comment trigger handler
Devvit.addTrigger({
  event: "CommentCreate",
  onEvent: async (event, context) => {
    //console.log(`A new comment was created: ${JSON.stringify(event)}`);
    // Event constants
    const postId = event.post?.id!;
    const commentId = event.comment?.id!;
    const flair = event.post?.linkFlair?.text ?? "";
    const parentId = event.comment?.parentId!;
    const postLink = event.post?.permalink!;
    const commentLink = event.comment?.permalink!;
    const userId = event.author?.id!;
    const username = event.author?.name!;
    // Check if we have seen this comment before
    const seenState = await getSeenStateForCommentCreate(commentId, context);
    if (seenState == 'seen' || seenState == 'error')
      return; // If create event has already been processed, do nothing
    const isMod = await isUserMod(username, context);
    const modsExempt = await context.settings.get("mods-exempt") as boolean;
    // Check if comment author is a mod and exempt them if the config setting is checked
    const authorIsExempt = (isMod && modsExempt);
    var commentRemoved = false;
    // Check if diversification enabled
    const diversifyEnabled = await context.settings.get("enable-diversify") as boolean;
    if (diversifyEnabled) {
      commentRemoved = await processCommentOnDiversify(
        commentId,
        commentLink,
        postId,
        postLink,
        userId,
        username,
        flair,
        authorIsExempt,
        context
      );
    }
    if (!commentRemoved) {
      const pruneEnabled = await context.settings.get("enable-prune") as boolean; //check if pruning enabled
      if (pruneEnabled) {
        commentRemoved = await processCommentOnPrune(
          commentId,
          commentLink,
          parentId,
          postId,
          postLink,
          username,
          flair,
          authorIsExempt,
          context
        );
      }
    }
  },
});

// Update comment count on delete only if the config setting says so
Devvit.addTrigger({
  event: "CommentDelete",
  onEvent: async (event, context) => {
    //console.log(`A new comment was deleted: ${JSON.stringify(event)}`);
    const eventSource = event.source;
    const source = eventSource.valueOf(); // 3 = mod; 2 = admin; 1 = user; 0 = unknown; -1 = unrecognized
    if (source != 1)
      return; // If a comment was not deleted by its author, don't do anything.
    const diversifyEnabled = await context.settings.get("enable-diversify")!; //check if diversification enabled
    if (!diversifyEnabled)
      return; // If not enabled, don't do anything.
    const updateDelete = await context.settings.get("update-comment-delete"); //check if update with delete enabled
    if (!updateDelete)
      return; // If not enabled, don't do anything.
    const commentId = event.commentId!;
    const seenState = await getSeenStateForCommentDelete(commentId, context);
    if (seenState == 'seen' || seenState == 'error')
      return; // If delete event has already been seen, do nothing
    // If we got here, then comment diversification is enabled and "update with comment delete" is enabled.
    const userId = event.author?.id!;
    const postId = event.postId!;
    const diversifyLimit = await context.settings.get("diversify-comment-limit");
    const diversifyLimitIsValid = commentLimitIsValid(diversifyLimit); //check if diversify comment limit is valid
    if (!diversifyLimitIsValid) // If not valid, don't do anything.
      return;
    // If we got here, then comment diversification is enabled and "update with comment delete" is enabled.
    // It's not necessary to check if diversification is enabled for this post, because even if it's not,
    // then we only make one redis call which will return nothing, and no action will be taken.
    const commentCount = await getAuthorsCommentCount(userId, postId, context);
    if (commentCount == 1) // If this was the last comment, delete the redis hash for this user.
      await deleteAuthorsCommentCount(userId, postId, context);
    else if (commentCount > 1) // If there are more comments, just decrement the count by 1.
      await incrementAuthorsCommentCount(userId, postId, -1, context);
  },
});

export default Devvit;