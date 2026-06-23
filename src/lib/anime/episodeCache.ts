import { db } from '../db';
import { EpisodeData } from '@/services/jikan';

export const EpisodeCache = {
  get: async (animeId: string): Promise<EpisodeData[] | null> => {
    try {
      const cache = await db.animeEpisodeCache.findUnique({
        where: { animeId }
      });
      if (!cache) return null;
      if (new Date() > new Date(cache.expiresAt)) {
        // Cache expired, delete asynchronously
        db.animeEpisodeCache.delete({ where: { animeId } }).catch(() => {});
        return null;
      }
      return cache.episodes as unknown as EpisodeData[];
    } catch (e) {
      console.error('Error fetching episode cache:', e);
      return null;
    }
  },

  set: async (animeId: string, episodes: EpisodeData[], isAiring: boolean): Promise<void> => {
    try {
      // 1 hour for currently airing, 24 hours for completed
      const ttlHours = isAiring ? 1 : 24;
      const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);
      
      await db.animeEpisodeCache.upsert({
        where: { animeId },
        update: {
          episodes: episodes as any,
          totalCount: episodes.length,
          cachedAt: new Date(),
          expiresAt
        },
        create: {
          animeId,
          episodes: episodes as any,
          totalCount: episodes.length,
          expiresAt
        }
      });
    } catch (e) {
      console.error('Error saving episode cache:', e);
    }
  },

  invalidate: async (animeId: string): Promise<void> => {
    try {
      await db.animeEpisodeCache.delete({
        where: { animeId }
      });
    } catch (e) {
      console.error('Error invalidating episode cache:', e);
    }
  }
};
