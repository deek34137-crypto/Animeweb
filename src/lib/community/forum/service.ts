import { db } from '@/lib/db';
import { assertCanCreateThread, assertCanReply, assertCanModifyThread, assertCanModifyPost } from '../permissions';
import { sanitizeMarkdown } from '../sanitize';
import { defaultViewTracker } from './viewTracker';
import { NotificationService } from '../notifications/service';

export function generateSlug(title: string): string {
  const cleaned = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // remove non-alphanumeric except spaces and hyphens
    .replace(/\s+/g, '-')         // replace spaces with hyphens
    .replace(/-+/g, '-')          // merge consecutive hyphens
    .trim();
  
  const baseSlug = cleaned || 'thread';
  return baseSlug.substring(0, 100);
}

export class ForumService {
  /**
   * Helper to seed forum categories.
   */
  static async createCategory({
    slug,
    name,
    description,
    icon,
    sortOrder = 0,
  }: {
    slug: string;
    name: string;
    description?: string;
    icon?: string;
    sortOrder?: number;
  }) {
    return db.forumCategory.upsert({
      where: { slug },
      update: { name, description, icon, sortOrder },
      create: { slug, name, description, icon, sortOrder },
    });
  }

  /**
   * Creates a new forum thread with slug validation and collision resolving.
   */
  static async createThread({
    userId,
    title,
    content,
    categoryId,
    animeId,
    spoiler = false,
  }: {
    userId: string;
    title: string;
    content: string;
    categoryId: string;
    animeId?: string;
    spoiler?: boolean;
  }) {
    await assertCanCreateThread(userId);

    const cleanTitle = title.trim();
    if (cleanTitle.length < 5 || cleanTitle.length > 150) {
      throw new Error('Thread title must be between 5 and 150 characters');
    }

    const cleanContent = sanitizeMarkdown(content);
    if (!cleanContent.trim()) {
      throw new Error('Thread content cannot be empty after sanitization');
    }

    // Resolve unique slug collisions
    const slug = generateSlug(cleanTitle);
    let uniqueSlug = slug;
    let suffix = 1;
    while (true) {
      const existing = await db.forumThread.findUnique({
        where: { slug: uniqueSlug },
      });
      if (!existing) break;
      suffix++;
      uniqueSlug = `${slug}-${suffix}`;
    }

    const thread = await db.forumThread.create({
      data: {
        userId,
        categoryId,
        slug: uniqueSlug,
        title: cleanTitle,
        content: cleanContent,
        animeId: animeId || null,
        spoiler,
      },
      include: {
        user: {
          select: {
            username: true,
          },
        },
      },
    });

    // Extract mentions and create notifications
    await NotificationService.extractAndNotifyMentions({
      content: cleanContent,
      senderId: userId,
      entityId: thread.slug,
      entityType: 'THREAD',
      link: `/community/thread/${thread.slug}`,
    });

    return thread;
  }

  /**
   * Retrieves list of threads with sorting, category filtering, and search.
   * Trending logic weights replies, participants, and views, decayed by hoursSinceLastReply.
   */
  static async getThreads({
    categoryId,
    search,
    page = 1,
    limit = 10,
    sortBy = 'trending', // trending, newest
  }: {
    categoryId?: string;
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: 'trending' | 'newest';
  }) {
    const where: any = {
      deletedAt: null, // Hide deleted threads from directory list
    };

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Query threads
    const threads = await db.forumThread.findMany({
      where,
      include: {
        user: {
          select: {
            username: true,
            displayName: true,
            avatar: true,
          },
        },
        category: {
          select: {
            name: true,
            slug: true,
          },
        },
        posts: {
          select: {
            userId: true,
          },
        },
      },
      orderBy: sortBy === 'newest' ? { createdAt: 'desc' } : undefined,
    });

    const total = threads.length;

    // Perform sorting logic in JS if trending is requested
    let sortedThreads = threads;
    if (sortBy === 'trending') {
      const now = new Date();
      const ratedThreads = threads.map(t => {
        // Find last activity time
        const lastActivity = t.lastReplyAt || t.createdAt;
        const hoursSinceLastReply = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60);

        // Find unique participants in replies plus the thread author
        const participantIds = new Set<string>([t.userId, ...t.posts.map(p => p.userId)]);
        const uniqueParticipants = participantIds.size;

        // Weighted score formula: (replies*10 + participants*5 + views*0.25) / (hours + 2)^1.3
        const score = (t.replyCount * 10 + uniqueParticipants * 5 + t.views * 0.25) / Math.pow(hoursSinceLastReply + 2, 1.3);

        return { thread: t, score };
      });

      // Sort descending by calculated score
      ratedThreads.sort((a, b) => b.score - a.score);
      sortedThreads = ratedThreads.map(rt => rt.thread);
    }

    // Slice for pagination
    const start = (page - 1) * limit;
    const paginatedThreads = sortedThreads.slice(start, start + limit);

    return {
      threads: paginatedThreads.map(t => ({
        id: t.id,
        slug: t.slug,
        title: t.title,
        content: t.content,
        views: t.views,
        replyCount: t.replyCount,
        lastReplyAt: t.lastReplyAt,
        locked: t.locked,
        pinned: t.pinned,
        spoiler: t.spoiler,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        user: t.user,
        category: t.category,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Fetches thread by unique slug.
   * Increments view count unique to IP using the ViewTracker.
   */
  static async getThreadBySlug(slug: string, ipAddress?: string) {
    const thread = await db.forumThread.findUnique({
      where: { slug },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!thread) {
      return null;
    }

    // Views increment deduplicated by IP
    if (ipAddress) {
      const isUnique = await defaultViewTracker.recordView(ipAddress, thread.id);
      if (isUnique) {
        await db.forumThread.update({
          where: { id: thread.id },
          data: {
            views: { increment: 1 },
          },
        });
        // Update local thread object views count
        thread.views += 1;
      }
    }

    return thread;
  }

  /**
   * Appends a reply to a thread in an atomic transaction.
   * Fires REPLY notifications and triggers mentions fanout.
   */
  static async replyToThread({
    userId,
    threadId,
    content,
    spoiler = false,
  }: {
    userId: string;
    threadId: string;
    content: string;
    spoiler?: boolean;
  }) {
    // Assert user can reply (locked checks done inside)
    await assertCanReply(userId, threadId);

    const cleanContent = sanitizeMarkdown(content);
    if (!cleanContent.trim()) {
      throw new Error('Reply content cannot be empty after sanitization');
    }

    const result = await db.$transaction(async (tx) => {
      // 1. Create the reply post
      const post = await tx.forumPost.create({
        data: {
          threadId,
          userId,
          content: cleanContent,
          spoiler,
        },
      });

      // 2. Fetch the thread details to update cache slug
      const thread = await tx.forumThread.update({
        where: { id: threadId },
        data: {
          replyCount: { increment: 1 },
          lastReplyAt: new Date(),
          lastReplyUserId: userId,
        },
        select: {
          slug: true,
        },
      });

      return { post, slug: thread.slug };
    });

    // Send notifications outside of transaction to prevent locks
    await NotificationService.notifyThreadReply({
      threadId,
      replyAuthorId: userId,
      threadSlug: result.slug,
    }).catch(err => console.error('Failed to dispatch reply notification:', err));

    await NotificationService.extractAndNotifyMentions({
      content: cleanContent,
      senderId: userId,
      entityId: result.slug,
      entityType: 'THREAD',
      link: `/community/thread/${result.slug}`,
    }).catch(err => console.error('Failed to dispatch mention notifications:', err));

    return result.post;
  }

  /**
   * Fetches thread replies. Soft deleted replies content returns as [Deleted].
   */
  static async getThreadReplies({
    threadId,
    page = 1,
    limit = 20,
  }: {
    threadId: string;
    page?: number;
    limit?: number;
  }) {
    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      db.forumPost.findMany({
        where: { threadId },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatar: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit,
      }),
      db.forumPost.count({ where: { threadId } }),
    ]);

    const sanitizedPosts = posts.map(post => {
      if (post.deletedAt) {
        return {
          id: post.id,
          threadId: post.threadId,
          content: '[Deleted]',
          spoiler: false,
          createdAt: post.createdAt,
          editedAt: post.editedAt,
          deletedAt: post.deletedAt,
          user: {
            id: '',
            username: 'deleted',
            displayName: '[Deleted]',
            avatar: null,
            role: 'USER',
          },
        };
      }

      return {
        id: post.id,
        threadId: post.threadId,
        content: post.content, // Canonical Markdown
        spoiler: post.spoiler,
        createdAt: post.createdAt,
        editedAt: post.editedAt,
        deletedAt: null,
        user: post.user,
      };
    });

    return {
      posts: sanitizedPosts,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Edits a thread content/title.
   */
  static async editThread({
    userId,
    threadId,
    title,
    content,
    spoiler,
  }: {
    userId: string;
    threadId: string;
    title?: string;
    content?: string;
    spoiler?: boolean;
  }) {
    await assertCanModifyThread(userId, threadId);

    const data: any = {
      editedAt: new Date(),
    };

    if (title !== undefined) {
      const cleanTitle = title.trim();
      if (cleanTitle.length < 5 || cleanTitle.length > 150) {
        throw new Error('Title must be between 5 and 150 characters');
      }
      data.title = cleanTitle;
    }

    if (content !== undefined) {
      const cleanContent = sanitizeMarkdown(content);
      if (!cleanContent.trim()) {
        throw new Error('Content cannot be empty after sanitization');
      }
      data.content = cleanContent;
    }

    if (spoiler !== undefined) {
      data.spoiler = spoiler;
    }

    return db.forumThread.update({
      where: { id: threadId },
      data,
    });
  }

  /**
   * Sets soft-deleted flag on a thread.
   */
  static async deleteThread(userId: string, threadId: string) {
    await assertCanModifyThread(userId, threadId);

    return db.forumThread.update({
      where: { id: threadId },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  /**
   * Toggles locked status of a thread (Admins/mods only).
   */
  static async toggleLockThread(userId: string, threadId: string) {
    const user = await assertCanModifyThread(userId, threadId);
    
    // Locks require Moderator/Admin status
    if (user.user.role !== 'ADMIN' && user.user.role !== 'MODERATOR') {
      throw new Error('Unauthorized lock toggle');
    }

    const thread = await db.forumThread.findUnique({
      where: { id: threadId },
      select: { locked: true },
    });

    if (!thread) throw new Error('Thread not found');

    return db.forumThread.update({
      where: { id: threadId },
      data: {
        locked: !thread.locked,
      },
    });
  }

  /**
   * Toggles pinned status of a thread (Admins/mods only).
   */
  static async togglePinThread(userId: string, threadId: string) {
    const user = await assertCanModifyThread(userId, threadId);
    
    if (user.user.role !== 'ADMIN' && user.user.role !== 'MODERATOR') {
      throw new Error('Unauthorized pin toggle');
    }

    const thread = await db.forumThread.findUnique({
      where: { id: threadId },
      select: { pinned: true },
    });

    if (!thread) throw new Error('Thread not found');

    return db.forumThread.update({
      where: { id: threadId },
      data: {
        pinned: !thread.pinned,
      },
    });
  }

  /**
   * Edits a post reply.
   */
  static async editPost({
    userId,
    postId,
    content,
    spoiler,
  }: {
    userId: string;
    postId: string;
    content: string;
    spoiler?: boolean;
  }) {
    await assertCanModifyPost(userId, postId);

    const cleanContent = sanitizeMarkdown(content);
    if (!cleanContent.trim()) {
      throw new Error('Post content cannot be empty after sanitization');
    }

    return db.forumPost.update({
      where: { id: postId },
      data: {
        content: cleanContent,
        spoiler: spoiler !== undefined ? spoiler : undefined,
        editedAt: new Date(),
      },
    });
  }

  /**
   * Soft deletes a post reply.
   */
  static async deletePost(userId: string, postId: string) {
    await assertCanModifyPost(userId, postId);

    return db.forumPost.update({
      where: { id: postId },
      data: {
        deletedAt: new Date(),
      },
    });
  }
}
