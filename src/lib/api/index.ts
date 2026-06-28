import { JikanAPI, AnimeData, EpisodeData, CharacterRoster, RecommendationItem, StaffMember, UserReview } from '@/services/jikan';
import { db } from '../db';
import { cacheLife, cacheTag } from 'next/cache';
import { cache } from 'react';
import { rewriteImages } from '@/lib/image';

// Standalone cache-compiled helpers for Jikan fetches to prevent rate limiting
const getJikanAnimeDetail = async (id: number) => {
  'use cache';
  cacheLife({ stale: 86400, revalidate: 86400, expire: 604800 });
  cacheTag(`anime:${id}`);
  return JikanAPI.getAnimeDetail(id);
};

const getJikanAnimeEpisodes = async (id: number) => {
  'use cache';
  cacheLife({ stale: 86400, revalidate: 86400, expire: 604800 });
  cacheTag(`anime-episodes:${id}`);
  return JikanAPI.getAnimeEpisodes(id);
};

import { EpisodeCache } from '../anime/episodeCache';
import { triggerGamification } from '@/lib/gamification/background';
import { triggerAutomaticRecalculation } from '@/lib/discover/recommendations/background';

// Unified types returned by the API layer
export interface UnifiedAnimeDetail extends AnimeData {
  userTracking?: {
    status: string;
    score: number | null;
    episodesWatched: number;
    rewatchCount: number;
    startedAt: Date | null;
    completedAt: Date | null;
    notes: string | null;
    isPrivate: boolean;
    isFavorite: boolean;
  } | null;
}

export const AnimeApi = {
  // --- External Anime Metadata Methods ---
  getTrendingAnime: async (page = 1) => {
    'use cache';
    cacheLife({ stale: 86400, revalidate: 86400, expire: 604800 });
    cacheTag(`trending-page:${page}`);
    return JikanAPI.getTrendingAnime(page);
  },

  getTopRatedAnime: async (page = 1) => {
    'use cache';
    cacheLife({ stale: 86400, revalidate: 86400, expire: 604800 });
    cacheTag(`top-rated-page:${page}`);
    return JikanAPI.getTopRatedAnime(page);
  },

  getSeasonalAnime: async (page = 1) => {
    'use cache';
    cacheLife({ stale: 86400, revalidate: 86400, expire: 604800 });
    cacheTag(`seasonal-page:${page}`);
    return JikanAPI.getSeasonalAnime(page);
  },

  getUpcomingSeasonalAnime: async (page = 1) => {
    'use cache';
    cacheLife({ stale: 86400, revalidate: 86400, expire: 604800 });
    cacheTag(`upcoming-seasonal-page:${page}`);
    return JikanAPI.getUpcomingSeasonalAnime(page);
  },

  getTopAiringAnime: async (page = 1) => {
    'use cache';
    cacheLife({ stale: 86400, revalidate: 86400, expire: 604800 });
    cacheTag(`top-airing-page:${page}`);
    return JikanAPI.getTopAiringAnime(page);
  },

  getAiringSchedule: async (page = 1) => {
    'use cache';
    cacheLife({ stale: 86400, revalidate: 86400, expire: 604800 });
    cacheTag(`airing-schedule-page:${page}`);
    return JikanAPI.getAiringSchedule(page);
  },

  getRecentAnimeRecommendations: async (page = 1) => {
    'use cache';
    cacheLife({ stale: 86400, revalidate: 86400, expire: 604800 });
    cacheTag(`recent-recommendations-page:${page}`);
    return JikanAPI.getRecentAnimeRecommendations(page);
  },

  getAnimeDetail: cache(async (id: number, userId?: string): Promise<UnifiedAnimeDetail> => {
    const res = await getJikanAnimeDetail(id);
    const anime = res.data;

    let userTracking = null;
    if (userId) {
      const entry = await db.listEntry.findUnique({
        where: {
          userId_animeId: {
            userId,
            animeId: String(id),
          },
        },
      });
      if (entry) {
        userTracking = {
          status: entry.status,
          score: entry.score,
          episodesWatched: entry.episodesWatched,
          rewatchCount: entry.rewatchCount,
          startedAt: entry.startedAt,
          completedAt: entry.completedAt,
          notes: entry.notes,
          isPrivate: entry.isPrivate,
          isFavorite: entry.isFavorite,
        };
      }
    }

    return {
      ...anime,
      userTracking,
    };
  }),

  getAnimeEpisodes: cache(async (id: number): Promise<EpisodeData[]> => {
    const animeIdStr = String(id);
    const cached = await EpisodeCache.get(animeIdStr);
    if (cached) {
      return cached;
    }

    const res = await getJikanAnimeEpisodes(id);
    const episodes = res.data || [];

    let isAiring = false;
    try {
      const detailRes = await getJikanAnimeDetail(id);
      isAiring = detailRes?.data?.airing || detailRes?.data?.status === 'Currently Airing';
    } catch (e) {
      console.error(`Failed to fetch anime detail for airing status of ${id}:`, e);
    }

    await EpisodeCache.set(animeIdStr, episodes, isAiring);
    return episodes;
  }),

  getAnimeCharacters: cache(async (id: number): Promise<CharacterRoster[]> => {
    'use cache';
    cacheLife({ stale: 86400, revalidate: 86400, expire: 604800 });
    cacheTag(`anime-characters:${id}`);
    const res = await JikanAPI.getAnimeCharacters(id);
    return res.data || [];
  }),

  getAnimeRecommendations: cache(async (id: number): Promise<RecommendationItem[]> => {
    'use cache';
    cacheLife({ stale: 86400, revalidate: 86400, expire: 604800 });
    cacheTag(`anime-recommendations:${id}`);
    const res = await JikanAPI.getAnimeRecommendations(id);
    return res.data || [];
  }),

  getAnimeStaff: cache(async (id: number): Promise<StaffMember[]> => {
    'use cache';
    cacheLife({ stale: 86400, revalidate: 86400, expire: 604800 });
    cacheTag(`anime-staff:${id}`);
    const res = await JikanAPI.getAnimeStaff(id);
    return res.data || [];
  }),

  getAnimeReviews: cache(async (id: number): Promise<UserReview[]> => {
    'use cache';
    cacheLife({ stale: 86400, revalidate: 86400, expire: 604800 });
    cacheTag(`anime-reviews:${id}`);
    const res = await JikanAPI.getAnimeReviews(id);
    return res.data || [];
  }),

  searchAnime: async (query: string, filters: Parameters<typeof JikanAPI.searchAnime>[1] = {}) => {
    return JikanAPI.searchAnime(query, filters);
  },

  // --- Database Tracking Methods ---
  getUserList: cache(async (userId: string, status?: string) => {
    const list = await db.listEntry.findMany({
      where: {
        userId,
        ...(status ? { status } : {}),
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
    return rewriteImages(list);
  }),

  getListEntry: cache(async (userId: string, animeId: string) => {
    const entry = await db.listEntry.findUnique({
      where: {
        userId_animeId: {
          userId,
          animeId,
        },
      },
    });
    return rewriteImages(entry);
  }),

  upsertListEntry: async (
    userId: string,
    animeId: string,
    data: {
      animeTitle: string;
      animeImage: string;
      animeEpisodes?: number | null;
      status: string;
      score?: number | null;
      episodesWatched?: number;
      rewatchCount?: number;
      startedAt?: Date | null;
      completedAt?: Date | null;
      notes?: string | null;
      isPrivate?: boolean;
      isFavorite?: boolean;
      isTopFavorite?: boolean;
      topFavoriteOrder?: number | null;
    }
  ) => {
    let finalStatus = data.status;
    const finalEpisodesWatched = data.episodesWatched !== undefined ? data.episodesWatched : 0;

    // Auto-complete transition if user watched all episodes
    if (data.animeEpisodes && finalEpisodesWatched >= data.animeEpisodes && finalStatus === 'watching') {
      finalStatus = 'completed';
    }

    const isCompleted = finalStatus === 'completed';
    const completedDate = isCompleted ? (data.completedAt || new Date()) : null;
    const startedDate = finalStatus === 'watching' ? (data.startedAt || new Date()) : data.startedAt;

    // Fetch existing for activity logging comparison
    const existing = await db.listEntry.findUnique({
      where: {
        userId_animeId: { userId, animeId },
      },
    });

    const result = await db.listEntry.upsert({
      where: {
        userId_animeId: {
          userId,
          animeId,
        },
      },
      update: {
        status: finalStatus,
        score: data.score !== undefined ? data.score : undefined,
        episodesWatched: data.episodesWatched !== undefined ? data.episodesWatched : undefined,
        rewatchCount: data.rewatchCount !== undefined ? data.rewatchCount : undefined,
        startedAt: startedDate,
        completedAt: completedDate,
        notes: data.notes !== undefined ? data.notes : undefined,
        isPrivate: data.isPrivate !== undefined ? data.isPrivate : undefined,
        isFavorite: data.isFavorite !== undefined ? data.isFavorite : undefined,
        isTopFavorite: data.isTopFavorite !== undefined ? data.isTopFavorite : undefined,
        topFavoriteOrder: data.topFavoriteOrder !== undefined ? data.topFavoriteOrder : undefined,
      },
      create: {
        userId,
        animeId,
        animeTitle: data.animeTitle,
        animeImage: data.animeImage,
        animeEpisodes: data.animeEpisodes,
        status: finalStatus,
        score: data.score,
        episodesWatched: data.episodesWatched || 0,
        rewatchCount: data.rewatchCount || 0,
        startedAt: startedDate,
        completedAt: completedDate,
        notes: data.notes,
        isPrivate: data.isPrivate || false,
        isFavorite: data.isFavorite || false,
        isTopFavorite: data.isTopFavorite || false,
        topFavoriteOrder: data.topFavoriteOrder || null,
      },
    });

    // Logging User Activity Milestones
    try {
      if (!existing) {
        await db.activityLog.create({
          data: {
            userId,
            action: 'ADD_LIBRARY',
            animeId,
            animeTitle: data.animeTitle,
            details: `Added to library as ${finalStatus}`,
          },
        });
      } else {
        if (existing.status !== finalStatus) {
          await db.activityLog.create({
            data: {
              userId,
              action: 'STATUS_CHANGE',
              animeId,
              animeTitle: data.animeTitle,
              details: `Changed status to ${finalStatus}`,
            },
          });
        }
        if (data.score !== undefined && existing.score !== data.score && data.score !== null) {
          await db.activityLog.create({
            data: {
              userId,
              action: 'RATED',
              animeId,
              animeTitle: data.animeTitle,
              details: `Rated it ${data.score}/10`,
            },
          });
        }
        if (data.isFavorite !== undefined && existing.isFavorite !== data.isFavorite) {
          await db.activityLog.create({
            data: {
              userId,
              action: 'FAVORITE',
              animeId,
              animeTitle: data.animeTitle,
              details: data.isFavorite ? 'Added to favorites' : 'Removed from favorites',
            },
          });
        }
      }
      
      // Prune old activity logs to keep only latest 100 entries per user
      pruneActivityLogs(userId).catch(err => console.error('Pruning failed:', err));

      // Mark insights dirty
      await db.user.update({
        where: { id: userId },
        data: { insightsDirty: true },
      }).catch(err => console.error('Failed to dirty insights:', err));
    } catch (logErr) {
      console.error('Failed to write activity log:', logErr);
    }

    // Trigger Gamification XP / Achievement checks in background
    try {
      if (finalStatus === 'completed' && (!existing || existing.status !== 'completed')) {
        triggerGamification(userId, { eventType: 'COMPLETE', animeId });
      }
      if (data.score !== undefined && data.score !== null && (!existing || existing.score !== data.score)) {
        triggerGamification(userId, { eventType: 'RATE', animeId });
      }
      if (data.notes && data.notes.trim() !== '' && (!existing || existing.notes !== data.notes)) {
        triggerGamification(userId, { eventType: 'REVIEW', animeId });
      }
    } catch (err) {
      console.error('[Gamification Trigger Error]', err);
    }

    // Trigger automatic recommendation recalculation in background
    triggerAutomaticRecalculation(userId).catch(err => console.error('Failed to trigger automatic recalculation:', err));

    return result;
  },

  deleteListEntry: async (userId: string, animeId: string) => {
    const deleted = await db.listEntry.delete({
      where: {
        userId_animeId: {
          userId,
          animeId,
        },
      },
    });

    // Mark insights dirty
    await db.user.update({
      where: { id: userId },
      data: { insightsDirty: true },
    }).catch(err => console.error('Failed to dirty insights:', err));

    // Trigger automatic recommendation recalculation in background
    triggerAutomaticRecalculation(userId).catch(err => console.error('Failed to trigger automatic recalculation:', err));

    return deleted;
  },

  getContinueWatching: cache(async (userId: string) => {
    // Return all entries in 'watching' status, ordered by most recently updated
    const entries = await db.listEntry.findMany({
      where: {
        userId,
        status: 'watching',
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: 12,
    });

    const results = await Promise.all(
      entries.map(async (entry) => {
        const latestProgress = await db.watchProgress.findFirst({
          where: {
            userId,
            animeId: entry.animeId,
          },
          orderBy: {
            lastWatchedAt: 'desc',
          },
        });

        let resumeEpisode = entry.episodesWatched + 1;
        let lastWatchedDate = entry.updatedAt;
        let percentageComplete = 0;
        let remainingMinutes = 0;

        if (latestProgress) {
          const isCompleted = latestProgress.position / latestProgress.duration >= 0.90;
          if (!isCompleted) {
            resumeEpisode = latestProgress.episode;
            percentageComplete = Math.round((latestProgress.position / latestProgress.duration) * 100);
            remainingMinutes = Math.max(0, Math.ceil((latestProgress.duration - latestProgress.position) / 60));
          } else {
            resumeEpisode = latestProgress.episode + 1;
          }
          lastWatchedDate = latestProgress.lastWatchedAt;
        }

        return {
          id: entry.id,
          userId: entry.userId,
          animeId: entry.animeId,
          animeTitle: entry.animeTitle,
          animeImage: entry.animeImage,
          animeEpisodes: entry.animeEpisodes,
          status: entry.status,
          score: entry.score,
          episodesWatched: resumeEpisode,
          rewatchCount: entry.rewatchCount,
          startedAt: entry.startedAt,
          completedAt: entry.completedAt,
          notes: entry.notes,
          isPrivate: entry.isPrivate,
          createdAt: entry.createdAt,
          updatedAt: entry.updatedAt,
          lastWatchedAt: lastWatchedDate.toISOString(),
          percentageComplete,
          remainingMinutes,
        };
      })
    );

    // In-memory filter out completed shows
    return rewriteImages(
      results.filter(
        (entry) => !entry.animeEpisodes || entry.episodesWatched <= entry.animeEpisodes
      )
    );
  }),
};

export async function pruneActivityLogs(userId: string) {
  try {
    // Only prune routine actions (rating, favorites, watch progress updates)
    const routineActions = [
      'ADD_LIBRARY',
      'STATUS_CHANGE',
      'RATED',
      'FAVORITE',
      'RESTORE',
      'DELETE'
    ];

    const logs = await db.activityLog.findMany({
      where: {
        userId,
        action: { in: routineActions as any },
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
      skip: 500, // Keep latest 500 routine actions
    });

    if (logs.length > 0) {
      const idsToDelete = logs.map(l => l.id);
      await db.activityLog.deleteMany({
        where: { id: { in: idsToDelete } },
      });
    }
  } catch (err) {
    console.error('[ActivityLog Pruning Failed]', err);
  }
}
