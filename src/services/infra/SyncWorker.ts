// src/services/infra/SyncWorker.ts
import { Worker, Job } from 'bullmq';
import { db } from '@/lib/db';
import { env } from '@/lib/config/env';
import { logger } from '@/lib/logger';
import { MergeEngine } from '@/services/metadata/MergeEngine';
import { ProviderManager } from '@/services/metadata/ProviderManager';
import { QuarantineService } from '@/services/metadata/health/QuarantineService';
import { DataQualityMonitor } from '@/services/metadata/monitoring/DataQualityMonitor';
import { CacheManager } from '@/services/cache/CacheManager';
import { ProviderType } from '@prisma/client';

let worker: Worker | null = null;

if (env.FLAG_ENABLE_OUTBOX) {
  try {
    worker = new Worker('sync-priority-queue', async (job: Job) => {
      const { animeId, provider, providerId } = job.data;
      logger.info(`SyncWorker: Processing ingest job for anime ${animeId} from ${provider} (${providerId})`);

      // 1. Check if provider is currently quarantined
      const isQuarantined = await QuarantineService.isQuarantined(provider);
      if (isQuarantined) {
        logger.warn(`SyncWorker: Bypassing request - provider ${provider} is quarantined.`);
        throw new Error(`Provider ${provider} is quarantined.`);
      }

      // 2. Fetch raw payload from the provider via ProviderManager
      let rawPayload: any;
      try {
        const providerInst = ProviderManager.getProvider(provider);
        const response = await providerInst.getAnime(providerId);
        rawPayload = response.data;
      } catch (err: any) {
        logger.error(`SyncWorker: Fetch failed from ${provider} for target ${providerId}:`, err);
        // Record validation failure to trigger quarantine if limits are exceeded
        if (err.name === 'ZodError') {
          await QuarantineService.recordValidationError(provider);
        }
        throw err;
      }

      // 3. Load existing database record to run data quality comparison
      const existingAnime = await db.anime.findUnique({
        where: { id: animeId },
        include: { translations: true }
      });

      // 4. Validate payload deviation (Data Quality Check)
      const isQualityPassed = DataQualityMonitor.verifyDataQuality(existingAnime, rawPayload);
      if (!isQualityPassed) {
        logger.error(`SyncWorker: Ingest rejected due to Data Quality deviation checks for anime ${animeId}.`);
        throw new Error('Data quality validation failed.');
      }

      // 5. Query other healthy providers mapped to this anime to compile multi-source data
      const otherMappings = await db.externalMapping.findMany({
        where: { animeId, NOT: { provider } }
      });

      const payloads: { [key in ProviderType]?: any } = { [provider]: rawPayload };
      const lastUpdatedMap: { [key in ProviderType]?: Date } = { [provider]: new Date() };

      for (const mapping of otherMappings) {
        const isOtherQuarantined = await QuarantineService.isQuarantined(mapping.provider);
        if (isOtherQuarantined) continue;

        try {
          const otherProv = ProviderManager.getProvider(mapping.provider);
          const res = await otherProv.getAnime(mapping.providerId);
          payloads[mapping.provider] = res.data;
          lastUpdatedMap[mapping.provider] = mapping.updatedAt;
        } catch (otherErr) {
          logger.warn(`SyncWorker: Failed to sideload data from ${mapping.provider} for anime ${animeId}:`, otherErr);
        }
      }

      // 6. Merge payloads using MergeEngine
      const merged = MergeEngine.consolidate(payloads, lastUpdatedMap);

      // 7. Write to PostgreSQL using optimistic concurrency control
      // We run in transaction to ensure consistency
      await db.$transaction(async (tx) => {
        const currentAnime = await tx.anime.findUnique({
          where: { id: animeId }
        });

        const currentVersion = currentAnime?.version || 1;

        // Perform write and increment version
        const updateCount = await tx.anime.updateMany({
          where: { id: animeId, version: currentVersion },
          data: {
            status: merged.status,
            season: merged.season,
            year: merged.year,
            episodesCount: merged.episodesCount,
            popularity: merged.popularity,
            score: merged.score,
            version: currentVersion + 1,
            updatedAt: new Date()
          }
        });

        if (updateCount.count === 0) {
          throw new Error('Optimistic concurrency lock failed: Anime record was modified by another transaction.');
        }

        // Upsert Translation (EN)
        if (merged.synopsisEn) {
          await tx.animeTranslation.upsert({
            where: { animeId_language: { animeId, language: 'en' } },
            create: { animeId, language: 'en', title: merged.titles.find(t => t.language === 'en')?.value || 'Unknown', synopsis: merged.synopsisEn },
            update: { title: merged.titles.find(t => t.language === 'en')?.value || 'Unknown', synopsis: merged.synopsisEn }
          });
        }

        // Upsert Translation (DE)
        if (merged.synopsisDe) {
          await tx.animeTranslation.upsert({
            where: { animeId_language: { animeId, language: 'de' } },
            create: { animeId, language: 'de', title: merged.titles.find(t => t.language === 'de')?.value || 'Unknown', synopsis: merged.synopsisDe },
            update: { title: merged.titles.find(t => t.language === 'de')?.value || 'Unknown', synopsis: merged.synopsisDe }
          });
        }
      });

      // 8. Invalidate caches
      await CacheManager.invalidate(`anime:detail:${animeId}`);
      logger.info(`SyncWorker: Successfully synchronized anime metadata for ${animeId}.`);

    }, {
      connection: { url: env.REDIS_URL },
      concurrency: 10 // Set concurrency limit to 10 to prevent database starvation
    });

    worker.on('failed', (job: any, err: any) => {
      logger.error(`SyncWorker: Job ${job?.id} failed processing:`, err);
    });

    // Graceful SIGTERM/SIGINT shutdown handling (Phase 3)
    const gracefulShutdown = async (signal: string) => {
      logger.info(`SyncWorker: Received ${signal}. Shutting down worker gracefully...`);
      if (worker) {
        await worker.close();
        logger.info('SyncWorker: Worker pool closed.');
      }
      process.exit(0);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (err) {
    logger.error('Failed to initialize SyncWorker:', err);
  }
}

export { worker };
