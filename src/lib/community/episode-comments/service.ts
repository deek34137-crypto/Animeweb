import { db } from '@/lib/db';
import { assertCanCommentEpisode, assertCanModifyComment } from '../permissions';
import { sanitizeMarkdown } from '../sanitize';

export class EpisodeCommentsService {
  /**
   * Fetches paginated episode comments with likes and user details.
   * Filters soft-deleted content to return safe masks.
   */
  static async getComments({
    animeId,
    episode,
    page = 1,
    limit = 20,
    sortBy = 'newest', // newest, oldest, top
    requestingUserId,
  }: {
    animeId: string;
    episode: number;
    page?: number;
    limit?: number;
    sortBy?: 'newest' | 'oldest' | 'top';
    requestingUserId?: string | null;
  }) {
    const skip = (page - 1) * limit;

    let orderBy: any = { createdAt: 'desc' };
    if (sortBy === 'oldest') {
      orderBy = { createdAt: 'asc' };
    } else if (sortBy === 'top') {
      orderBy = { likes: { _count: 'desc' } };
    }

    const [comments, total] = await Promise.all([
      db.episodeComment.findMany({
        where: {
          animeId,
          episode,
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatar: true,
            },
          },
          likes: {
            select: {
              userId: true,
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      db.episodeComment.count({
        where: {
          animeId,
          episode,
        },
      }),
    ]);

    // Mask soft-deleted comments
    const sanitizedComments = comments.map(comment => {
      const isLiked = requestingUserId
        ? comment.likes.some(l => l.userId === requestingUserId)
        : false;

      if (comment.deletedAt) {
        return {
          id: comment.id,
          animeId: comment.animeId,
          episode: comment.episode,
          content: '[Deleted]',
          spoiler: false,
          likesCount: 0,
          isLiked: false,
          createdAt: comment.createdAt,
          editedAt: comment.editedAt,
          deletedAt: comment.deletedAt,
          user: {
            id: '',
            username: 'deleted',
            displayName: '[Deleted]',
            avatar: null,
          },
        };
      }

      return {
        id: comment.id,
        animeId: comment.animeId,
        episode: comment.episode,
        content: comment.content, // Treated as canonical Markdown
        spoiler: comment.spoiler,
        likesCount: comment.likes.length,
        isLiked,
        createdAt: comment.createdAt,
        editedAt: comment.editedAt,
        deletedAt: null,
        user: comment.user,
      };
    });

    return {
      comments: sanitizedComments,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Creates a new episode comment after sanitization.
   */
  static async createComment({
    userId,
    animeId,
    episode,
    content,
    spoiler = false,
  }: {
    userId: string;
    animeId: string;
    episode: number;
    content: string;
    spoiler?: boolean;
  }) {
    await assertCanCommentEpisode(userId);

    const cleanContent = sanitizeMarkdown(content);
    if (!cleanContent.trim()) {
      throw new Error('Comment content cannot be empty after sanitization');
    }

    return db.episodeComment.create({
      data: {
        userId,
        animeId,
        episode,
        content: cleanContent,
        spoiler,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        },
      },
    });
  }

  /**
   * Toggles a comment like (like/unlike) for a user.
   */
  static async toggleLike(commentId: string, userId: string) {
    if (!userId) {
      throw new Error('Authentication required');
    }

    return db.$transaction(async (tx) => {
      const existing = await tx.episodeCommentLike.findUnique({
        where: {
          userId_commentId: {
            userId,
            commentId,
          },
        },
      });

      let liked = false;
      if (existing) {
        // Unlike
        await tx.episodeCommentLike.delete({
          where: {
            userId_commentId: {
              userId,
              commentId,
            },
          },
        });
      } else {
        // Like
        await tx.episodeCommentLike.create({
          data: {
            userId,
            commentId,
          },
        });
        liked = true;
      }

      // Count updated likes
      const likesCount = await tx.episodeCommentLike.count({
        where: { commentId },
      });

      return { liked, likesCount };
    });
  }

  /**
   * Edits an existing comment.
   */
  static async editComment({
    userId,
    commentId,
    content,
    spoiler,
  }: {
    userId: string;
    commentId: string;
    content: string;
    spoiler?: boolean;
  }) {
    await assertCanModifyComment(userId, commentId);

    const cleanContent = sanitizeMarkdown(content);
    if (!cleanContent.trim()) {
      throw new Error('Comment content cannot be empty after sanitization');
    }

    return db.episodeComment.update({
      where: { id: commentId },
      data: {
        content: cleanContent,
        spoiler: spoiler !== undefined ? spoiler : undefined,
        editedAt: new Date(),
      },
    });
  }

  /**
   * Performs soft deletion of a comment.
   */
  static async deleteComment(userId: string, commentId: string) {
    await assertCanModifyComment(userId, commentId);

    // Soft delete comment
    return db.episodeComment.update({
      where: { id: commentId },
      data: {
        deletedAt: new Date(),
      },
    });
  }
}
