// src/services/metadata/MetadataService.ts
import { db } from '@/lib/db';
import { env } from '@/lib/config/env';
import { logger } from '@/lib/logger';
import { ProviderType, OutboxStatus } from '@prisma/client';
import { AnimeData } from './types/compatibility';
import { ProviderManager } from './ProviderManager';
import { MergeEngine } from './MergeEngine';
import { CacheManager } from '@/services/cache/CacheManager';
import { SearchService } from '../search/SearchService';
import { SearchFallbackService } from '../search/SearchFallbackService';

export class MetadataService {
  /**
   * Resolves Anime details. Uses local normalized mirror (Phase 4) if flag is enabled,
   * otherwise falls back to dynamic provider resolution or returns empty.
   */
  static async getAnimeDetail(id: number): Promise<AnimeData> {
    return CacheManager.get(`anime:detail:${id}`, async () => {
      // 1. If feature flag is disabled, return null to trigger legacy AniList GraphQL fallback
      if (!env.FLAG_USE_NEW_METADATA) {
        throw new Error('New metadata pipeline is disabled');
      }

      // 2. Query the normalized local database using MAL ID mapping
      const mapping = await db.externalMapping.findFirst({
        where: { provider: ProviderType.MAL, providerId: id.toString() },
        include: {
          anime: {
            include: {
              translations: true,
              aliases: true,
              externalIds: true
            }
          }
        }
      });

      if (mapping?.anime) {
        return this.mapDatabaseToJikanAnime(mapping.anime);
      }

      // 3. Read-through sync (On-demand cache miss resolution)
      logger.info(`MetadataService: Detail cache miss in database for MAL ID ${id}. Triggering on-demand read-through sync.`);
      try {
        const aniListProvider = ProviderManager.getProvider(ProviderType.ANILIST);
        
        // On-demand fetch from AniList (first query)
        const aniListRes = await aniListProvider.getAnime(id.toString());
        const rawPayload = aniListRes.data;

        // Create the Anime record synchronously to satisfy the client immediately
        const slug = `anime-mal-${id}`;
        
        const anime = await db.$transaction(async (tx) => {
          const current = await tx.anime.create({
            data: {
              slug,
              status: rawPayload.status,
              season: rawPayload.season || null,
              year: rawPayload.year || null,
              episodesCount: rawPayload.episodesCount || 0,
              popularity: rawPayload.popularity || 0,
              score: rawPayload.score || 0.0,
              version: 1
            }
          });

          await tx.animeTranslation.create({
            data: {
              animeId: current.id,
              language: 'en',
              title: rawPayload.titles.find(t => t.language === 'en')?.value || 'Unknown',
              synopsis: rawPayload.synopsis || null
            }
          });

          await tx.externalMapping.create({
            data: {
              animeId: current.id,
              provider: ProviderType.MAL,
              providerId: id.toString(),
              verified: true,
              confidence: 1.0
            }
          });

          // Create an outbox event to consolidate this record in background (with TMDB, etc.)
          await tx.outboxEvent.create({
            data: {
              eventType: 'anime.updated',
              status: OutboxStatus.PENDING,
              payload: {
                animeId: current.id,
                provider: ProviderType.MAL,
                providerId: id.toString(),
                priority: 2 // High priority user request
              }
            }
          });

          return current;
        });

        // Query the complete record back and return it
        const completeRecord = await db.anime.findUnique({
          where: { id: anime.id },
          include: {
            translations: true,
            aliases: true,
            externalIds: true
          }
        });

        return this.mapDatabaseToJikanAnime(completeRecord!);
      } catch (err: any) {
        logger.error(`MetadataService: Read-through sync failed for MAL ID ${id}:`, err);
        throw err;
      }
    });
  }

  /**
   * Standard search method. If Meilisearch is active, queries Meilisearch index.
   * If Meilisearch is down or query fails, falls back to trigram pg_trgm GIN search.
   */
  static async searchAnime(query: string, limit = 20): Promise<AnimeData[]> {
    if (!env.FLAG_USE_NEW_METADATA) {
      throw new Error('New metadata pipeline is disabled');
    }

    return SearchService.search(query, limit);
  }

  /**
   * Runs high-performance trigram similarity query on AnimeTranslation titles.
   */
  static async searchWithTrigramFallback(query: string, limit = 20): Promise<AnimeData[]> {
    return SearchFallbackService.search(query, limit);
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

    // Build dummy image objects for UI components
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
export default MetadataService;
