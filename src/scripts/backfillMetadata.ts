// src/scripts/backfillMetadata.ts
import { db } from '../lib/db';
import { ProviderType, OutboxStatus } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const BOOKMARK_FILE = path.join(process.cwd(), 'backfill_bookmark.json');
const BATCH_SIZE = 100;

interface Bookmark {
  lastAnimeId: string;
  totalProcessed: number;
}

function loadBookmark(): Bookmark {
  if (fs.existsSync(BOOKMARK_FILE)) {
    try {
      const data = fs.readFileSync(BOOKMARK_FILE, 'utf-8');
      return JSON.parse(data);
    } catch {
      // Ignore and return default
    }
  }
  return { lastAnimeId: '', totalProcessed: 0 };
}

function saveBookmark(bookmark: Bookmark) {
  fs.writeFileSync(BOOKMARK_FILE, JSON.stringify(bookmark, null, 2), 'utf-8');
}

function generateSlug(title: string, id: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || `anime-${id}`;
}

async function main() {
  console.log('--- Starting Resumable Metadata Backfill (Phase 3.5) ---');
  
  const bookmark = loadBookmark();
  console.log(`Resuming backfill from last processed AnimeCache ID: "${bookmark.lastAnimeId}"`);
  console.log(`Total processed so far: ${bookmark.totalProcessed}`);

  let hasMore = true;
  let lastId = bookmark.lastAnimeId;
  let totalProcessed = bookmark.totalProcessed;
  const startTime = Date.now();

  while (hasMore) {
    const batchStart = Date.now();

    // Query AnimeCache records ordered by ID, starting after lastId
    const records = await db.animeCache.findMany({
      where: lastId ? { animeId: { gt: lastId } } : {},
      orderBy: { animeId: 'asc' },
      take: BATCH_SIZE
    });

    if (records.length === 0) {
      hasMore = false;
      break;
    }

    console.log(`Processing batch of ${records.length} records...`);

    for (const record of records) {
      try {
        const slug = generateSlug(record.title, record.animeId);

        await db.$transaction(async (tx) => {
          // 1. Create normalized Anime entry
          const anime = await tx.anime.upsert({
            where: { slug },
            create: {
              slug,
              status: record.type === 'Movie' ? 'FINISHED' : 'ONGOING',
              episodesCount: record.episodes || 0,
              popularity: record.popularity || 0,
              score: record.score || 0.0,
              version: 1
            },
            update: {
              episodesCount: record.episodes || 0,
              popularity: record.popularity || 0,
              score: record.score || 0.0
            }
          });

          // 2. Create English Translation
          await tx.animeTranslation.upsert({
            where: { animeId_language: { animeId: anime.id, language: 'en' } },
            create: {
              animeId: anime.id,
              language: 'en',
              title: record.title,
              synopsis: 'Imported during legacy backfill. Awaiting provider refresh.'
            },
            update: {}
          });

          // 3. Create Alias entries
          await tx.animeAlias.upsert({
            where: { animeId_alias: { animeId: anime.id, alias: record.title } },
            create: {
              animeId: anime.id,
              alias: record.title,
              type: 'ENGLISH'
            },
            update: {}
          });

          // 4. Create External Mapping for MAL/Jikan source ID
          await tx.externalMapping.upsert({
            where: { provider_providerId: { provider: ProviderType.MAL, providerId: record.animeId } },
            create: {
              animeId: anime.id,
              provider: ProviderType.MAL,
              providerId: record.animeId,
              verified: true,
              confidence: 1.0
            },
            update: {
              animeId: anime.id
            }
          });

          // 5. Enqueue Outbox event to trigger worker-based AniList and TMDB consolidation
          await tx.outboxEvent.create({
            data: {
              eventType: 'anime.updated',
              status: OutboxStatus.PENDING,
              payload: {
                animeId: anime.id,
                provider: ProviderType.MAL,
                providerId: record.animeId,
                priority: 10 // Low priority backfill
              }
            }
          });
        });

        totalProcessed++;
        lastId = record.animeId;
      } catch (err: any) {
        console.error(`Error processing record ${record.animeId}:`, err.message);
      }
    }

    // Save progress bookmark
    bookmark.lastAnimeId = lastId;
    bookmark.totalProcessed = totalProcessed;
    saveBookmark(bookmark);

    const elapsed = (Date.now() - startTime) / 1000;
    const speed = (totalProcessed - bookmark.totalProcessed) / ((Date.now() - startTime) / 1000);
    const batchTime = Date.now() - batchStart;

    console.log(`Batch complete in ${batchTime}ms. Total processed: ${totalProcessed}. Speed: ${speed.toFixed(1)} records/sec. Elapsed time: ${elapsed.toFixed(1)}s`);
  }

  console.log('--- Backfill Completed Successfully ---');
}

main().catch(err => {
  console.error('Fatal backfill error:', err);
  process.exit(1);
});
