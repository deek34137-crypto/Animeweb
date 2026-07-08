// src/services/search/SearchService.ts
import { Meilisearch } from 'meilisearch';
import { env } from '@/lib/config/env';
import { logger } from '@/lib/logger';
import { db } from '@/lib/db';
import { ProviderType } from '@prisma/client';
import { AnimeData } from '../metadata/types/compatibility';
import { SearchFallbackService } from './SearchFallbackService';
import { AniListProvider } from '../metadata/providers/AniListProvider';
import { RankingEngine } from './RankingEngine';
import { SearchResultBuilder, PremiumSearchResults } from './SearchResultBuilder';

let client: Meilisearch | null = null;
if (env.FLAG_ENABLE_SEARCH_FALLBACK) {
  try {
    client = new Meilisearch({
      host: env.MEILISEARCH_HOST!,
      apiKey: env.MEILISEARCH_KEY
    });
  } catch (err) {
    logger.error('Failed to initialize Meilisearch client:', err);
  }
}

export class SearchService {
  private static readonly PRIMARY_INDEX = 'anime';

  /**
   * Orchestrates high-performance, local-first anime searches.
   */
  static async search(query: string, limit = 20): Promise<PremiumSearchResults> {
    let candidates: AnimeData[] = [];
    let matchedCharacters: any[] = [];
    let matchedStudios: any[] = [];

    const hasSearchQuery = !!query && query.trim().length > 0;

    if (hasSearchQuery) {
      // 1. Attempt local Meilisearch query
      if (client && env.FLAG_ENABLE_SEARCH_FALLBACK) {
        try {
          const index = client.index(this.PRIMARY_INDEX);
          const searchRes = await index.search(query, { limit });
          if (searchRes.hits.length > 0) {
            candidates = searchRes.hits.map((hit: any) => hit as unknown as AnimeData);
          }
        } catch (err) {
          logger.error('SearchService: Meilisearch query failed:', err);
        }
      }

      // 2. Attempt Postgres canonical DB trigram search
      if (candidates.length === 0) {
        try {
          candidates = await SearchFallbackService.search(query, limit);
        } catch (err) {
          logger.error('SearchService: Postgres trigram search failed:', err);
        }
      }

      // 3. Fallback to external provider search (AniList)
      if (candidates.length === 0) {
        logger.info(`SearchService: Local cache miss for "${query}". Triggering external provider pipeline.`);
        const provider = new AniListProvider();
        
        const [animeResults, charResults, studioResults] = await Promise.all([
          provider.searchAnime(query, 30).catch(() => []),
          provider.searchCharacters(query, 3).catch(() => []),
          provider.searchStudios(query, 3).catch(() => [])
        ]);

        const externalCandidates: AnimeData[] = [...animeResults];

        charResults.forEach((cr) => {
          matchedCharacters.push(cr.characterNode);
          externalCandidates.push(...cr.media);
        });

        studioResults.forEach((sr) => {
          matchedStudios.push(sr.studioNode);
          externalCandidates.push(...sr.media);
        });

        candidates = externalCandidates;

        // Normalize & save external candidates to PostgreSQL in background
        Promise.resolve().then(async () => {
          for (const anime of externalCandidates) {
            try {
              await saveExternalAnimeToLocalDb(anime);
            } catch (dbErr) {
              // silent fail on duplicate key or db error
            }
          }
        });
      }
    } else {
      // Browsing/filtering: fetch from Postgres or simple provider search
      candidates = await SearchFallbackService.search('', limit);
    }

    // ─── Ranking and Scoring Engine ───
    const scoresMap = new Map<number, number>();
    const matchContext = new Map<number, { byTitle?: boolean; byCharacter?: boolean; byStudio?: boolean }>();

    // Map candidates to find bestMatch and apply scores
    candidates.forEach((anime) => {
      const malId = anime.mal_id;
      const ctx = matchContext.get(malId) || {};
      const score = RankingEngine.scoreCandidate(anime, query, ctx);
      scoresMap.set(malId, score);
    });

    let bestMatch: AnimeData | null = null;
    let bestScore = -1;
    candidates.forEach((anime) => {
      const score = scoresMap.get(anime.mal_id) || 0;
      if (score > bestScore) {
        bestScore = score;
        bestMatch = anime;
      }
    });

    if (bestMatch && bestScore > 100) {
      RankingEngine.applyRelationBoosts(candidates, scoresMap, bestMatch, bestScore);
      RankingEngine.applyRecommendationBoosts(candidates, scoresMap, bestMatch);
    }

    // ─── Build Premium UI Grouped Sections ───
    return SearchResultBuilder.build(
      candidates,
      scoresMap,
      bestMatch,
      matchedCharacters,
      matchedStudios
    );
  }

  /**
   * Promotes a new index version using an atomic blue-green index swap.
   */
  static async swapCanaryIndex(newIndexName: string): Promise<boolean> {
    if (!client) {
      logger.error('SearchService: Meilisearch client is not initialized for index swap.');
      return false;
    }

    try {
      const primaryIndex = client.index(this.PRIMARY_INDEX);
      const newIndex = client.index(newIndexName);

      const primaryStats = await primaryIndex.getStats();
      const newStats = await newIndex.getStats();

      const currentCount = primaryStats.numberOfDocuments;
      const newCount = newStats.numberOfDocuments;

      logger.info(`SearchService: Validating new search index ${newIndexName} (${newCount} docs) vs primary index (${currentCount} docs)...`);

      if (currentCount > 0 && newCount < currentCount * 0.9) {
        logger.error(`SearchService Swap Aborted: Document count regression detected.`);
        return false;
      }

      const testSearch = await newIndex.search('a', { limit: 1 });
      if (testSearch.hits.length === 0) {
        logger.error(`SearchService Swap Aborted: Basic query validation failed.`);
        return false;
      }

      await client.swapIndexes([
        { indexes: [this.PRIMARY_INDEX, newIndexName] as [string, string], rename: false }
      ]);

      logger.info(`SearchService: Atomic index swap completed successfully.`);
      return true;
    } catch (err) {
      logger.error('SearchService: Index swap failed with error:', err);
      return false;
    }
  }

  /**
   * Configures Meilisearch settings.
   */
  static async configureIndexSettings(indexName: string): Promise<void> {
    if (!client) return;

    try {
      const index = client.index(indexName);
      await index.updateSettings({
        searchableAttributes: ['title', 'englishTitle', 'romajiTitle', 'synonyms', 'synopsis', 'genres', 'studios'],
        filterableAttributes: ['genres', 'status', 'year', 'season', 'studios'],
        sortableAttributes: ['popularity', 'score', 'year'],
        synonyms: {
          'frieren': ['beyond journeys end', 'sousou no frieren'],
          'demon slayer': ['kimetsu no yaiba'],
          'attack on titan': ['shingeki no kyojin']
        }
      });
      logger.info(`SearchService: Settings successfully configured for search index ${indexName}.`);
    } catch (err) {
      logger.error(`SearchService: Failed to configure settings for index ${indexName}:`, err);
    }
  }
}

async function saveExternalAnimeToLocalDb(anime: AnimeData): Promise<void> {
  const malId = anime.mal_id;
  if (!malId) return;

  const existingMapping = await db.externalMapping.findFirst({
    where: { provider: ProviderType.MAL, providerId: malId.toString() }
  });

  if (existingMapping) return;

  const slug = `anime-mal-${malId}`;
  const statusMap: Record<string, string> = {
    'Finished Airing': 'FINISHED',
    'Currently Airing': 'ONGOING',
    'Not yet aired': 'UPCOMING',
    'On Hiatus': 'HIATUS'
  };

  const dbStatus = statusMap[anime.status || ''] || 'FINISHED';

  const created = await db.anime.create({
    data: {
      slug,
      status: dbStatus,
      season: anime.season ? anime.season.toUpperCase() : null,
      year: anime.year,
      episodesCount: anime.episodes || 0,
      popularity: anime.popularity || 0,
      score: anime.score || 0.0
    }
  });

  await db.animeTranslation.create({
    data: {
      animeId: created.id,
      language: 'en',
      title: anime.title_english || anime.title,
      synopsis: anime.synopsis
    }
  });

  await db.externalMapping.create({
    data: {
      animeId: created.id,
      provider: ProviderType.MAL,
      providerId: malId.toString(),
      verified: true,
      confidence: 1.0
    }
  });

  if (anime.title_synonyms && anime.title_synonyms.length > 0) {
    for (const synonym of anime.title_synonyms) {
      try {
        await db.animeAlias.create({
          data: {
            animeId: created.id,
            alias: synonym,
            type: 'SYNONYM'
          }
        });
      } catch {}
    }
  }
}

export default SearchService;
