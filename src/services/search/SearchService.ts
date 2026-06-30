// src/services/search/SearchService.ts
import { Meilisearch } from 'meilisearch';
import { env } from '@/lib/config/env';
import { logger } from '@/lib/logger';
import { MetadataService } from '../metadata/MetadataService';
import { AnimeData } from '../metadata/types/compatibility';

let client: Meilisearch | null = null;
if (env.FLAG_ENABLE_SEARCH_FALLBACK) {
  try {
    client = new Meilisearch({
      host: env.MEILISEARCH_HOST,
      apiKey: env.MEILISEARCH_KEY
    });
  } catch (err) {
    logger.error('Failed to initialize Meilisearch client:', err);
  }
}

export class SearchService {
  private static readonly PRIMARY_INDEX = 'anime';

  /**
   * Searches for anime. First attempts Meilisearch, and falls back to
   * pg_trgm trigram similarity queries if Meilisearch fails or is disabled.
   */
  static async search(query: string, limit = 20): Promise<AnimeData[]> {
    // 1. Attempt Meilisearch query if active
    if (client && env.FLAG_ENABLE_SEARCH_FALLBACK) {
      try {
        const index = client.index(this.PRIMARY_INDEX);
        const searchRes = await index.search(query, { limit });
        
        if (searchRes.hits.length > 0) {
          // Map hits to AnimeData
          return searchRes.hits.map((hit: any) => hit as unknown as AnimeData);
        }
      } catch (err) {
        logger.error('SearchService: Meilisearch query failed, falling back to trigram Postgres search:', err);
      }
    }

    // 2. Fallback to trigram pg_trgm similarity Postgres search
    return MetadataService.searchWithTrigramFallback(query, limit);
  }

  /**
   * Promotes a new index version using an atomic blue-green index swap.
   * Performs data validation and document checks before swapping.
   */
  static async swapCanaryIndex(newIndexName: string): Promise<boolean> {
    if (!client) {
      logger.error('SearchService: Meilisearch client is not initialized for index swap.');
      return false;
    }

    try {
      const primaryIndex = client.index(this.PRIMARY_INDEX);
      const newIndex = client.index(newIndexName);

      // 1. Verify document count in new index is sane
      const primaryStats = await primaryIndex.getStats();
      const newStats = await newIndex.getStats();

      const currentCount = primaryStats.numberOfDocuments;
      const newCount = newStats.numberOfDocuments;

      logger.info(`SearchService: Validating new search index ${newIndexName} (${newCount} docs) vs primary index (${currentCount} docs)...`);

      // Reject if document count drops by more than 10%
      if (currentCount > 0 && newCount < currentCount * 0.9) {
        logger.error(`SearchService Swap Aborted: Document count regression detected. New index has ${newCount} docs, but primary has ${currentCount}.`);
        return false;
      }

      // 2. Run sample validation queries on the new index
      // E.g., Search for "Frieren" or similar keyword and assert a match exists
      const testSearch = await newIndex.search('a', { limit: 1 });
      if (testSearch.hits.length === 0) {
        logger.error(`SearchService Swap Aborted: Basic query validation failed on the new index.`);
        return false;
      }

      // 3. Perform atomic index swap
      // We swap the new index into the primary index name
      await client.swapIndexes([
        { indexes: [this.PRIMARY_INDEX, newIndexName] as [string, string], rename: false }
      ]);

      logger.info(`SearchService: Atomic index swap completed successfully. Promoted ${newIndexName} to primary.`);
      return true;
    } catch (err) {
      logger.error('SearchService: Index swap failed with error:', err);
      return false;
    }
  }

  /**
   * Configures Meilisearch settings (searchable, filterable, synonyms) for the index.
   */
  static async configureIndexSettings(indexName: string): Promise<void> {
    if (!client) return;

    try {
      const index = client.index(indexName);
      await index.updateSettings({
        searchableAttributes: ['title', 'englishTitle', 'romajiTitle', 'synonyms', 'synopsis', 'genres', 'studios', 'staff', 'characters'],
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
export default SearchService;
