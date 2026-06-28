import { db } from '@/lib/db';
import { assertCanFollow } from '../permissions';
import { NotificationService } from '../notifications/service';

export class FollowsService {
  /**
   * Establishes a follow relationship between two users.
   * Increments followers/following counts atomically.
   */
  static async followUser(followerId: string, followingId: string) {
    // Assert permissions (e.g. not self-follow, active user)
    await assertCanFollow(followerId, followingId);

    const result = await db.$transaction(async (tx) => {
      // 1. Check if already following
      const existing = await tx.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId,
            followingId,
          },
        },
      });

      if (existing) {
        return { success: true, alreadyFollowing: true, username: null };
      }

      // 2. Create the follow record
      await tx.follow.create({
        data: {
          followerId,
          followingId,
        },
      });

      // 3. Increment counters
      await tx.user.update({
        where: { id: followerId },
        data: {
          followingCount: { increment: 1 },
        },
      });

      const updatedFollowingUser = await tx.user.update({
        where: { id: followingId },
        data: {
          followersCount: { increment: 1 },
        },
        select: {
          username: true,
        },
      });

      return { success: true, alreadyFollowing: false, username: updatedFollowingUser.username };
    });

    // Send notification outside transaction block
    if (result.success && !result.alreadyFollowing && result.username) {
      await NotificationService.createNotification({
        userId: followingId,
        senderId: followerId,
        type: 'FOLLOW',
        entityId: followerId,
        entityType: 'USER',
        link: `/user/${result.username}`,
      }).catch(err => console.error('Failed to create follow notification:', err));
    }

    return { success: result.success, alreadyFollowing: result.alreadyFollowing };
  }

  /**
   * Removes a follow relationship between two users.
   * Decrements followers/following counts atomically, preventing negative values.
   */
  static async unfollowUser(followerId: string, followingId: string) {
    if (followerId === followingId) {
      return { success: false, error: 'Cannot unfollow yourself' };
    }

    return db.$transaction(async (tx) => {
      // 1. Check if relationship exists
      const existing = await tx.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId,
            followingId,
          },
        },
      });

      if (!existing) {
        return { success: true, wasNotFollowing: true };
      }

      // 2. Delete the record
      await tx.follow.delete({
        where: {
          followerId_followingId: {
            followerId,
            followingId,
          },
        },
      });

      // 3. Decrement counters (safely avoid dropping below 0)
      const followerUser = await tx.user.findUnique({
        where: { id: followerId },
        select: { followingCount: true },
      });

      if (followerUser && followerUser.followingCount > 0) {
        await tx.user.update({
          where: { id: followerId },
          data: {
            followingCount: { decrement: 1 },
          },
        });
      }

      const followingUser = await tx.user.findUnique({
        where: { id: followingId },
        select: { followersCount: true },
      });

      if (followingUser && followingUser.followersCount > 0) {
        await tx.user.update({
          where: { id: followingId },
          data: {
            followersCount: { decrement: 1 },
          },
        });
      }

      return { success: true, wasNotFollowing: false };
    });
  }

  /**
   * Helper to check if a user is following another user.
   */
  static async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    if (!followerId || !followingId) return false;
    if (followerId === followingId) return false;

    const follow = await db.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });

    return !!follow;
  }
}
