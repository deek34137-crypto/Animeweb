// src/scripts/rebuildSearchIndex.ts
import { db } from '../lib/db';
import { SearchService } from '../services/search/SearchService';
import { Meilisearch } from 'meilisearch';
import { env } from '../lib/config/env';
import { logger } from '../lib/logger';

async function main() {
  console.log('--- Starting Search Index Rebuild (Phase 5) ---');

  if (!env.FLAG_ENABLE_SEARCH_FALLBACK) {
    console.log('Meilisearch search integration is disabled via feature flags. Aborting rebuild.');
    return;
  }

  const client = new Meilisearch({
    host: env.MEILISEARCH_HOST,
    apiKey: env.MEILISEARCH_KEY
  });

  const tempIndexName = 'anime_temp';

  try {
    // 1. Fetch all Anime records from PostgreSQL database
    const animes = await db.anime.findMany({
      include: {
        translations: true,
        aliases: true,
        externalIds: true
      }
    });

    console.log(`Fetched ${animes.length} anime records from PostgreSQL database.`);

    // 2. Format documents for Meilisearch ingestion
    const documents = animes.map(a => {
      const translationEn = a.translations.find((t: any) => t.language === 'en');
      const title = translationEn?.title || 'Unknown';
      const synopsis = translationEn?.synopsis || '';

      const malMapping = a.externalIds.find((e: any) => e.provider === 'MAL');
      const malId = malMapping ? malMapping.providerId : '0';

      return {
        id: a.id,
        malId,
        title,
        englishTitle: title,
        romajiTitle: title,
        synopsis,
        genres: [],
        studios: [],
        staff: [],
        characters: [],
        status: a.status,
        year: a.year || 0,
        season: a.season || 'Unknown',
        popularity: a.popularity,
        score: a.score || 0.0
      };
    });

    // 3. Create or retrieve the temporary index
    const tempIndex = client.index(tempIndexName);

    // 4. Configure Meilisearch settings for the temporary index
    console.log('Configuring settings on temporary index...');
    await SearchService.configureIndexSettings(tempIndexName);

    // 5. Ingest all documents into the temporary index
    console.log(`Ingesting ${documents.length} documents into temporary index...`);
    const enqueuedTask = await tempIndex.addDocuments(documents);
    console.log(`Documents enqueued. Task UID: ${enqueuedTask.taskUid}. Waiting for task resolution...`);

    // Wait for the task to complete
    let task = await client.getTask(enqueuedTask.taskUid);
    while (task.status === 'enqueued' || task.status === 'processing') {
      await new Promise(resolve => setTimeout(resolve, 500));
      task = await client.getTask(enqueuedTask.taskUid);
    }

    if (task.status === 'failed') {
      throw new Error(`Ingest task failed: ${task.error?.message || 'Unknown error'}`);
    }

    console.log('Documents successfully indexed in temporary index.');

    // 6. Call SearchService to validate and perform atomic index swap
    console.log('Executing atomic blue-green index swap...');
    const swapSuccess = await SearchService.swapCanaryIndex(tempIndexName);

    if (swapSuccess) {
      console.log('Search index successfully rebuilt and promoted.');
    } else {
      console.error('Search index rebuild swap was aborted due to validation failure.');
    }

    // 7. Cleanup the temporary index
    console.log('Cleaning up temporary index...');
    await client.deleteIndex(tempIndexName);
    console.log('Cleanup completed.');

  } catch (err: any) {
    console.error('Fatal error during search index rebuild:', err.message);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Rebuild process failed:', err);
  process.exit(1);
});
