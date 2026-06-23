import { JikanAPI, AnimeData, EpisodeData, CharacterRoster, RecommendationItem, StaffMember, UserReview } from '@/services/jikan';
import { db } from '../db';

import { EpisodeCache } from '../anime/episodeCache';

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
  } | null;
}

export const AnimeApi = {
  // --- External Anime Metadata Methods ---
  getTrendingAnime: async (page = 1) => {
    return JikanAPI.getTrendingAnime(page);
  },

  getTopRatedAnime: async (page = 1) => {
    return JikanAPI.getTopRatedAnime(page);
  },

  getSeasonalAnime: async (page = 1) => {
    return JikanAPI.getSeasonalAnime(page);
  },

  getTopAiringAnime: async (page = 1) => {
    return JikanAPI.getTopAiringAnime(page);
  },

  getAiringSchedule: async (page = 1) => {
    return JikanAPI.getAiringSchedule(page);
  },

  getRecentAnimeRecommendations: async (page = 1) => {
    return JikanAPI.getRecentAnimeRecommendations(page);
  },

  getAnimeDetail: async (id: number, userId?: string): Promise<UnifiedAnimeDetail> => {
    const res = await JikanAPI.getAnimeDetail(id);
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
        };
      }
    }

    return {
      ...anime,
      userTracking,
    };
  },

  getAnimeEpisodes: async (id: number): Promise<EpisodeData[]> => {
    const animeIdStr = String(id);
    const cached = await EpisodeCache.get(animeIdStr);
    if (cached) {
      return cached;
    }

    const res = await JikanAPI.getAnimeEpisodes(id);
    const episodes = res.data || [];

    let isAiring = false;
    try {
      const detailRes = await JikanAPI.getAnimeDetail(id);
      isAiring = detailRes?.data?.airing || detailRes?.data?.status === 'Currently Airing';
    } catch (e) {
      console.error(`Failed to fetch anime detail for airing status of ${id}:`, e);
    }

    await EpisodeCache.set(animeIdStr, episodes, isAiring);
    return episodes;
  },

  getAnimeCharacters: async (id: number): Promise<CharacterRoster[]> => {
    const res = await JikanAPI.getAnimeCharacters(id);
    return res.data || [];
  },

  getAnimeRecommendations: async (id: number): Promise<RecommendationItem[]> => {
    const res = await JikanAPI.getAnimeRecommendations(id);
    return res.data || [];
  },

  getAnimeStaff: async (id: number): Promise<StaffMember[]> => {
    const res = await JikanAPI.getAnimeStaff(id);
    return res.data || [];
  },

  getAnimeReviews: async (id: number): Promise<UserReview[]> => {
    const res = await JikanAPI.getAnimeReviews(id);
    return res.data || [];
  },

  searchAnime: async (query: string, filters: Parameters<typeof JikanAPI.searchAnime>[1] = {}) => {
    return JikanAPI.searchAnime(query, filters);
  },

  // --- Database Tracking Methods ---
  getUserList: async (userId: string, status?: string) => {
    return db.listEntry.findMany({
      where: {
        userId,
        ...(status ? { status } : {}),
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  },

  getListEntry: async (userId: string, animeId: string) => {
    return db.listEntry.findUnique({
      where: {
        userId_animeId: {
          userId,
          animeId,
        },
      },
    });
  },

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

    return db.listEntry.upsert({
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
      },
    });
  },

  deleteListEntry: async (userId: string, animeId: string) => {
    return db.listEntry.delete({
      where: {
        userId_animeId: {
          userId,
          animeId,
        },
      },
    });
  },

  getContinueWatching: async (userId: string) => {
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
    return results.filter(
      (entry) => !entry.animeEpisodes || entry.episodesWatched <= entry.animeEpisodes
    );
  },
};
