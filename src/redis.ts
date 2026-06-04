import { TriggerContext } from "@devvit/public-api";

// Helper function to get key for redis hash that handles a comment's "seen" state
function getKeyForCommentSeenState(commentId: string) {
  return `comment:${commentId}`;
}

// Helper function for redis key-value pair that handles manual post diversification
export function getKeyForDiversifyPosts(postId: string) {
  return `diversify:${postId}`;
}

// DEPRECATED
// Helper function for redis key-value pair that handles manual post pruning
export function getKeyForPrunePosts(postId: string) {
  return `prune:${postId}`;
}

// Helper function for getting user's comment count in a post.
export async function getAuthorsCommentCount(
  userId: string,
  postId: string,
  context: TriggerContext
) {
  try {
    const key = getKeyForDiversifyPosts(postId);
    var countString = (await context.redis.hGet(key, userId)) ?? "";
    if (countString == "") return 0;
    else return Number(countString);
  }
  catch { return 0; }
}

// Helper function to set/reset a user's comment count in a post to 0.
export async function resetAuthorsCommentCount(
  userId: string,
  postId: string,
  context: TriggerContext
) {
  try {
    const key = getKeyForDiversifyPosts(postId);
    await context.redis.hSet(key, { [userId]: "0" });
  }
  catch {} // do nothing
}

// Helper function for deleting a user's comment count in a post.
// Useful if the comment count has reached 0.
export async function deleteAuthorsCommentCount(
  userId: string,
  postId: string,
  context: TriggerContext
) {
  try {
    const key = getKeyForDiversifyPosts(postId);
    await context.redis.hDel(key, [userId]);
  }
  catch {} // do nothing
}

// Helper function for updating a user's comment count in a post.
export async function incrementAuthorsCommentCount(
  userId: string,
  postId: string,
  increment: number,
  context: TriggerContext
) {
  try {
    const key = getKeyForDiversifyPosts(postId);
    await context.redis.hIncrBy(key, userId, increment);
  }
  catch {} // do nothing
}

// Helper function to get a comment creation event's "seen" state.
// 'new' means a comment has never been seen before.
// 'seen' means this app has already processed this comment before.
// 'error' indicates a likely redis failure.
export async function getSeenStateForCommentCreate(commentId: string, context: TriggerContext): Promise<'new' | 'seen' | 'error'> {
  try {
    const key = getKeyForCommentSeenState(commentId);
    const result = await context.redis.hSetNX(key, 'creationSeen', '1');
    if (result == 1) return 'new'; // new comment, successfully marked as seen
    else return 'seen'; // old comment, already seen
  }
  catch {
    return 'error'; // redis failure
  }
}

// Helper function to get a comment deletion event's "seen" state.
// 'new' means a comment has never been seen before.
// 'seen' means this app has already processed this comment before.
// 'error' indicates a likely redis failure.
export async function getSeenStateForCommentDelete(commentId: string, context: TriggerContext): Promise<'new' | 'seen' | 'error'> {
  try {
    const key = getKeyForCommentSeenState(commentId);
    const result = await context.redis.hSetNX(key, 'deletionSeen', '1');
    if (result == 1) return 'new'; // new comment deletion event, successfully marked as seen
    else return 'seen'; // old comment deletion event, already seen
  }
  catch {
    return 'error'; // redis failure
  }
}

// DEPRECATED
// Helper function to determine whether diversification is on for a specific post
export async function getDiversifyStateForPost(postId: string, context: TriggerContext) {
  const key = getKeyForDiversifyPosts(postId);
  var state = await context.redis.hGet(key, 'state');
  if (state) return state;
  else return "0";
}

// DEPRECATED
// Helper function to determine whether pruning is on for a specific post
export async function getPruneStateForPost(postId: string, context: TriggerContext) {
  const key = getKeyForPrunePosts(postId);
  var state = await context.redis.hGet(key, 'state');
  if (state) return state;
  else return "0";
}

// DEPRECATED
// Helper function to enable or disable diversification for a specific post
export async function updateDiversifyStateForPost(postId: string, state: string, context: TriggerContext) {
  const key = getKeyForDiversifyPosts(postId);
  if (state == "0" || state == "off" || state == "false")
    await context.redis.hDel(key, ['state']);
  else await context.redis.hSet(key, { state: state });
}

// DEPRECATED
// Helper function to enable or disable pruning for a specific post
export async function updatePruneStateForPost(postId: string, state: string, context: TriggerContext) {
  const key = getKeyForPrunePosts(postId);
  if (state == "0" || state == "off" || state == "false")
    await context.redis.hDel(key, ['state']);
  else await context.redis.hSet(key, { state: state });
}