// Helper function to get key for redis hash that handles comments on posts
export function getKeyForComments(postId: string) {
  return `comments:${postId}`;
}

// Alternative helper function for redis key-value pair that handles comments on posts
export function getKeyForComments2(postId: string, userId: string) {
  return `${postId}:${userId}`;
}

// Helper function for redis key-value pair that handles manual post diversification
export function getKeyForDiversifyPosts(postId: string) {
  return `diversify:${postId}`;
}

// Helper function for redis key-value pair that handles manual post pruning
export function getKeyForPrunePosts(postId: string) {
  return `prune:${postId}`;
}

// Helper function that tells you if the current comment limit in the config settings is even valid
export function commentLimitIsValid(commentLimit: string | number | boolean | string[] | undefined) {
  return (
    commentLimit != undefined &&
    !Number.isNaN(commentLimit) &&
    Number(commentLimit) >= 1
  );
}

// Helper function for verifying if post flair is included in the list of flairs in the config settings
export function containsFlair(flair: string, flairList: string) {
  flair = flair.trim(); //trim unneeded white space
  var flairs = flairList.split(","); //separate flairs in list
  for (let i = 0; i < flairs.length; i++) {
    flairs[i] = flairs[i].trim(); //for each flair in the list, trim white space as well
    if (flairs[i] == flair) //check if flairs match
      return true;
  }
  //reached end of list, no match
  return false;
}

// Helper function to get reason for why a comment was removed
export function getReasonForRemoval(reasonWord: string, commentLimit?: number) {
  var reason = "";
  if (reasonWord=="diversify") {
    reason += "- This subreddit has limited the total number of comments a single user can leave on a post";
    if (commentLimit!=undefined)
      reason += ` to ${commentLimit}.`;
    else reason += ".";
  }
  else if (reasonWord=="prune") {
    reason += "- This subreddit has limited the length of comment reply chains";
    if (commentLimit!=undefined)
      reason += ` to ${commentLimit}.`;
    else reason += ".";
  }
  return reason;
}

// Helper function to get the full text for which post(s) the comment removal reason applies
export function getReasonScope(
  forAllPosts: boolean,
  forThisPostFlair: boolean,
  forThisPost: boolean
) {
  var scope = "";
  if (forAllPosts)
    scope +=
      " Currently, this limit applies across all posts in the subreddit.";
  else if (forThisPostFlair)
    scope +=
      " Currently, this limit applies across all posts with this post's flair.";
  else if (forThisPost)
    scope +=
      " Currently, this limit applies on this specific post, but not necessarily *only* this post.";
  return scope;
}