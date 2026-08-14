// src/services/search/SearchFallbackService.ts
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { ProviderType } from '@prisma/client';
import { AnimeData } from '../metadata/types/compatibility';

export class SearchFallbackService {
  /**
   * Runs high-performance trigram similarity query on AnimeTranslation titles.
   */
  static async search(query: string, limit = 20): Promise<AnimeData[]> {
    try {
      const results: any[] = await db.$queryRaw`
        SELECT a.*
        FROM "Anime" a
        JOIN "AnimeTranslation" t ON t."animeId" = a.id
        WHERE t.language = 'en' AND similarity(t.title, ${query}) > 0.15
        ORDER BY similarity(t.title, ${query}) DESC
        LIMIT ${limit};
      `;

      if (results.length === 0) return [];

      const completeAnimes = await db.anime.findMany({
        where: { id: { in: results.map((r: any) => r.id) } },
        include: {
          translations: true,
          aliases: true,
          externalIds: true
        }
      });

      return completeAnimes.map((a: any) => this.mapDatabaseToJikanAnime(a));
    } catch (err: any) {
      logger.error('SearchFallbackService: pg_trgm trigram search query failed:', err);
      return [];
    }
  }

  /**
   * Helper to map database model structures back to Jikan compatibility models.
   */
  private static mapDatabaseToJikanAnime(anime: any): AnimeData {
    const translationEn = anime.translations.find((t: any) => t.language === 'en');
    const title = translationEn?.title || 'Unknown';
    const synopsis = translationEn?.synopsis || null;

    const malMapping = anime.externalIds.find((e: any) => e.provider === ProviderType.MAL);
    const malId = malMapping ? parseInt(malMapping.providerId, 10) : 0;

    const poster = `https://cdn.myanimelist.net/images/anime/10/${malId || 1000}.jpg`;
    const images = {
      jpg: { image_url: poster, small_image_url: poster, large_image_url: poster },
      webp: { image_url: poster, small_image_url: poster, large_image_url: poster }
    };

    const statusMap: Record<string, string> = {
      ONGOING: 'Currently Airing',
      FINISHED: 'Finished Airing',
      UPCOMING: 'Not yet aired',
      HIATUS: 'On Hiatus'
    };

    return {
      mal_id: malId,
      url: `https://myanimelist.net/anime/${malId}`,
      images,
      trailer: { youtube_id: null, url: null, embed_url: null },
      approved: true,
      title,
      title_english: title,
      title_japanese: null,
      title_synonyms: anime.aliases.map((a: any) => a.alias),
      type: 'TV',
      source: 'Manga',
      episodes: anime.episodesCount,
      status: statusMap[anime.status] || 'Finished Airing',
      airing: anime.status === 'ONGOING',
      aired: { from: null, to: null, string: 'Aired info unavailable' },
      duration: '24 min per ep',
      rating: 'PG-13',
      score: anime.score,
      scored_by: anime.popularity,
      rank: null,
      popularity: anime.popularity,
      members: anime.popularity,
      favorites: 0,
      synopsis,
      background: null,
      season: anime.season?.toLowerCase() || null,
      year: anime.year,
      broadcast: { day: null, time: null, timezone: null, string: null },
      producers: [],
      licensors: [],
      studios: [],
      genres: [],
      explicit_genres: [],
      themes: [],
      demographics: [],
      relations: []
    };
  }
}
export default SearchFallbackService;
