import { JikanAPI, AnimeData, EpisodeData, CharacterRoster, RecommendationItem } from '@/services/jikan';
import { db } from '../db';

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
    const res = await JikanAPI.getAnimeEpisodes(id);
    return res.data || [];
  },

  getAnimeCharacters: async (id: number): Promise<CharacterRoster[]> => {
    const res = await JikanAPI.getAnimeCharacters(id);
    return res.data || [];
  },

  getAnimeRecommendations: async (id: number): Promise<RecommendationItem[]> => {
    const res = await JikanAPI.getAnimeRecommendations(id);
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

    // In-memory filter out completed shows to handle cases where status wasn't updated
    return entries.filter(
      (entry) => !entry.animeEpisodes || entry.episodesWatched < entry.animeEpisodes
    );
  },
};
