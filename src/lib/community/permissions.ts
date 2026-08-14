import { db } from '@/lib/db';

export class PermissionError extends Error {
  constructor(message: string, public status: number = 403) {
    super(message);
    this.name = 'PermissionError';
  }
}

/**
 * Asserts that a user is active, exists, and is not banned.
 * Returns the user object if valid.
 */
export async function assertUserActive(userId: string) {
  if (!userId) {
    throw new PermissionError('Authentication required', 401);
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, suspendedUntil: true },
  });

  if (!user) {
    throw new PermissionError('User not found', 404);
  }

  if (user.suspendedUntil && user.suspendedUntil > new Date()) {
    throw new PermissionError('Your account has been suspended', 403);
  }

  return user;
}

/**
 * Validates if the user can create a thread.
 */
export async function assertCanCreateThread(userId: string) {
  return assertUserActive(userId);
}

/**
 * Validates if the user can post a reply in a thread.
 */
export async function assertCanReply(userId: string, threadId: string) {
  const user = await assertUserActive(userId);

  const thread = await db.forumThread.findUnique({
    where: { id: threadId },
    select: { locked: true, deletedAt: true },
  });

  if (!thread || thread.deletedAt) {
    throw new PermissionError('Thread not found or has been deleted', 404);
  }

  // Suspended or locked thread validation (admins and moderators can bypass locks)
  if (thread.locked && user.role !== 'ADMIN' && user.role !== 'MODERATOR') {
    throw new PermissionError('This thread is locked and cannot be replied to', 403);
  }

  return { user, thread };
}

/**
 * Validates if the user can post a comment on an anime episode.
 */
export async function assertCanCommentEpisode(userId: string) {
  return assertUserActive(userId);
}

/**
 * Validates if the user can perform a follow action.
 */
export async function assertCanFollow(followerId: string, followingId: string) {
  if (followerId === followingId) {
    throw new PermissionError('You cannot follow yourself', 400);
  }
  return assertUserActive(followerId);
}

/**
 * Validates if the user has authorization to modify (edit/delete) a thread.
 */
export async function assertCanModifyThread(userId: string, threadId: string) {
  const user = await assertUserActive(userId);

  const thread = await db.forumThread.findUnique({
    where: { id: threadId },
    select: { userId: true },
  });

  if (!thread) {
    throw new PermissionError('Thread not found', 404);
  }

  const isOwner = thread.userId === userId;
  const isModOrAdmin = user.role === 'ADMIN' || user.role === 'MODERATOR';

  if (!isOwner && !isModOrAdmin) {
    throw new PermissionError('You are not authorized to modify this thread', 403);
  }

  return { thread, user, isOwner };
}

/**
 * Validates if the user has authorization to modify (edit/delete) a thread post/reply.
 */
export async function assertCanModifyPost(userId: string, postId: string) {
  const user = await assertUserActive(userId);

  const post = await db.forumPost.findUnique({
    where: { id: postId },
    select: { userId: true, threadId: true },
  });

  if (!post) {
    throw new PermissionError('Post not found', 404);
  }

  const isOwner = post.userId === userId;
  const isModOrAdmin = user.role === 'ADMIN' || user.role === 'MODERATOR';

  if (!isOwner && !isModOrAdmin) {
    throw new PermissionError('You are not authorized to modify this post', 403);
  }

  return { post, user, isOwner };
}

/**
 * Validates if the user has authorization to modify (edit/delete) an episode comment.
 */
export async function assertCanModifyComment(userId: string, commentId: string) {
  const user = await assertUserActive(userId);

  const comment = await db.episodeComment.findUnique({
    where: { id: commentId },
    select: { userId: true },
  });

  if (!comment) {
    throw new PermissionError('Comment not found', 404);
  }

  const isOwner = comment.userId === userId;
  const isModOrAdmin = user.role === 'ADMIN' || user.role === 'MODERATOR';

  if (!isOwner && !isModOrAdmin) {
    throw new PermissionError('You are not authorized to modify this comment', 403);
  }

  return { comment, user, isOwner };
}
