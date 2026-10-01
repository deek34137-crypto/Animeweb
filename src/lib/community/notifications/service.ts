import { db } from '@/lib/db';
import { NotificationType } from '@prisma/client';

export class NotificationService {
  /**
   * Dispatches an entity-linked notification to a user.
   * Prevents duplicate unread notifications of the same type/entity from the same sender.
   */
  static async createNotification({
    userId,
    senderId,
    type,
    entityId,
    entityType,
    link,
  }: {
    userId: string;
    senderId: string | null;
    type: NotificationType;
    entityId: string | null;
    entityType: string | null;
    link: string | null;
  }) {
    // Prevent self-notifications
    if (senderId === userId) {
      return null;
    }

    // Check for existing unread duplicate to prevent spam
    const existing = await db.notification.findFirst({
      where: {
        userId,
        senderId,
        type,
        entityId,
        entityType,
        read: false,
      },
    });

    if (existing) {
      return existing;
    }

    return db.notification.create({
      data: {
        userId,
        senderId,
        type,
        entityId,
        entityType,
        link,
      },
    });
  }

  /**
   * Scans a post content for mentions, validates usernames,
   * and dispatches MENTION notifications to matching users.
   */
  static async extractAndNotifyMentions({
    content,
    senderId,
    entityId,
    entityType,
    link,
  }: {
    content: string;
    senderId: string;
    entityId: string;
    entityType: string;
    link: string;
  }) {
    if (!content) return [];

    // Simple regex parsing of @username tags
    // Usernames are alphanumeric plus underscores
    const mentionRegex = /\B@([a-zA-Z0-9_]{3,30})\b/g;
    const usernames = new Set<string>();
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
      usernames.add(match[1].toLowerCase());
    }

    if (usernames.size === 0) {
      return [];
    }

    // Find users in DB matching the extracted usernames
    const users = await db.user.findMany({
      where: {
        username: {
          in: Array.from(usernames),
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
        username: true,
      },
    });

    const notifications = [];
    for (const user of users) {
      // Don't notify the sender themselves
      if (user.id === senderId) {
        continue;
      }

      const notif = await this.createNotification({
        userId: user.id,
        senderId,
        type: 'MENTION',
        entityId,
        entityType,
        link,
      });

      if (notif) {
        notifications.push(notif);
      }
    }

    return notifications;
  }

  /**
   * Helper to notify the owner of a thread when a reply is posted.
   */
  static async notifyThreadReply({
    threadId,
    replyAuthorId,
    threadSlug,
  }: {
    threadId: string;
    replyAuthorId: string;
    threadSlug: string;
  }) {
    const thread = await db.forumThread.findUnique({
      where: { id: threadId },
      select: { userId: true },
    });

    if (!thread || thread.userId === replyAuthorId) {
      return null;
    }

    return this.createNotification({
      userId: thread.userId,
      senderId: replyAuthorId,
      type: 'REPLY',
      entityId: threadSlug,
      entityType: 'THREAD',
      link: `/community/thread/${threadSlug}`,
    });
  }

}
