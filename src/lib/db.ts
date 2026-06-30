import { PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';
import { logger } from './logger';
import { CANONICAL_BATCH_SIZE, CANONICAL_LOCK_KEY } from '../config/canonicalConfig';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const db =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;

/**
 * Persist canonical data in configurable batches.
 * Returns extended statistics.
 */
export async function persistCanonical(data: Record<string, any>) {
  const stats = {
    metadataCreated: 0,
    metadataUpdated: 0,
    metadataUnchanged: 0,
    episodesCreated: 0,
    episodesUpdated: 0,
    episodesUnchanged: 0,
    episodesSoftDeleted: 0,
    streamsCreated: 0,
    streamsUpdated: 0,
    streamsUnchanged: 0,
    streamsSoftDeleted: 0,
    validationFailures: 0,
    mergeConflicts: 0,
    processingTimeMs: 0,
  } as Record<string, number>;

  const batchSize = Math.min(Math.max(CANONICAL_BATCH_SIZE, 50), 500);
  const keys = Object.keys(data);
  const batches: string[][] = [];
  for (let i = 0; i < keys.length; i += batchSize) {
    batches.push(keys.slice(i, i + batchSize));
  }

  const startAll = Date.now();
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batchKeys = batches[batchIndex];
    const batchData = batchKeys.reduce((acc, k) => {
      acc[k] = data[k];
      return acc;
    }, {} as Record<string, any>);

    logger.info('persistCanonical batch start', { batchIndex, batchSize: batchKeys.length });
    const batchStart = Date.now();

    // Acquire advisory lock – ensures only one builder runs at a time.
    await db.$executeRawUnsafe(`SELECT pg_advisory_lock(${CANONICAL_LOCK_KEY});`);
    try {
      await db.$transaction(async (tx) => {
        for (const key of Object.keys(batchData)) {
          const record = batchData[key];
          const meta = record.metadata || {};
          const version = meta.pipelineVersion ?? 1;
          const now = new Date();

          // --- Upsert Anime Metadata with idempotency check ---
          const existingMeta = await tx.canonicalAnimeMetadata.findFirst({
            where: {
              OR: [
                { anilistId: meta.anilist_id },
                { malId: meta.mal_id },
                { tmdbId: meta.tmdb_id },
                { titleNormalized: meta.title_normalized },
              ],
            },
          });

          let animeId: string;
          if (existingMeta) {
            const fieldsMatch =
              existingMeta.anilistId === meta.anilist_id &&
              existingMeta.malId === meta.mal_id &&
              existingMeta.tmdbId === meta.tmdb_id &&
              existingMeta.titleRomaji === meta.title_romaji &&
              existingMeta.titleEnglish === meta.title_english &&
              existingMeta.titleNative === meta.title_native &&
              existingMeta.titleNormalized === meta.title_normalized &&
              existingMeta.description === meta.description &&
              JSON.stringify(existingMeta.genres) === JSON.stringify(meta.genres) &&
              existingMeta.studio === meta.studio &&
              JSON.stringify(existingMeta.images) === JSON.stringify(meta.images);

            animeId = existingMeta.animeId;
            if (fieldsMatch) {
              await tx.canonicalAnimeMetadata.update({
                where: { animeId },
                data: { lastMergedAt: now, lastValidatedAt: now },
              });
              stats.metadataUnchanged++;
            } else {
              await tx.canonicalAnimeMetadata.update({
                where: { animeId },
                data: {
                  anilistId: meta.anilist_id,
                  malId: meta.mal_id,
                  tmdbId: meta.tmdb_id,
                  titleRomaji: meta.title_romaji,
                  titleEnglish: meta.title_english,
                  titleNative: meta.title_native,
                  titleNormalized: meta.title_normalized,
                  description: meta.description,
                  genres: meta.genres,
                  studio: meta.studio,
                  images: meta.images,
                  pipelineVersion: version,
                  lastMergedAt: now,
                  lastValidatedAt: now,
                },
              });
              stats.metadataUpdated++;
            }
          } else {
            const created = await tx.canonicalAnimeMetadata.create({
              data: {
                anilistId: meta.anilist_id,
                malId: meta.mal_id,
                tmdbId: meta.tmdb_id,
                titleRomaji: meta.title_romaji,
                titleEnglish: meta.title_english,
                titleNative: meta.title_native,
                titleNormalized: meta.title_normalized,
                description: meta.description,
                genres: meta.genres,
                studio: meta.studio,
                images: meta.images,
                pipelineVersion: version,
                lastMergedAt: now,
                lastValidatedAt: now,
              },
            });
            animeId = created.animeId;
            stats.metadataCreated++;
          }

          // --- Episodes Upsert with soft‑delete handling ---
          const incomingEpisodes = record.episodes || [];
          const existingEpisodes = await tx.canonicalEpisode.findMany({ where: { animeId } });
          const existingMap = new Map<string, any>();
          existingEpisodes.forEach((e) => {
            const key = `${e.season ?? ''}_${e.episodeNumber}`;
            existingMap.set(key, e);
          });

          const incomingKeys = new Set<string>();
          for (const ep of incomingEpisodes) {
            const season = ep.season ?? null;
            const episodeNumber = ep.episode_number;
            const key = `${season ?? ''}_${episodeNumber}`;
            incomingKeys.add(key);
            const where = { animeId_season_episodeNumber: { animeId, season, episodeNumber } } as any;
            const payload = {
              animeId,
              season,
              episodeNumber,
              title: ep.title ?? null,
              pipelineVersion: version,
              lastMergedAt: now,
              lastValidatedAt: now,
              deletedAt: null,
            };
            const existing = existingMap.get(key);
            if (existing) {
              const unchanged =
                existing.title === payload.title &&
                existing.pipelineVersion === version &&
                existing.deletedAt === null;
              if (!unchanged) {
                await tx.canonicalEpisode.update({ where, data: payload });
                stats.episodesUpdated++;
              } else {
                stats.episodesUnchanged++;
              }
            } else {
              await tx.canonicalEpisode.create({ data: { ...payload, episodeId: undefined } });
              stats.episodesCreated++;
            }
          }
          for (const [key, epRec] of existingMap.entries()) {
            if (!incomingKeys.has(key) && !epRec.deletedAt) {
              await tx.canonicalEpisode.update({
                where: { episodeId: epRec.episodeId },
                data: { deletedAt: now },
              });
              stats.episodesSoftDeleted++;
            }
          }

          // --- Streams Upsert with soft‑delete handling ---
          const incomingStreams = record.streams || [];
          const episodeRecords = await tx.canonicalEpisode.findMany({ where: { animeId } });
          const episodeKeyToId = new Map<string, string>();
          episodeRecords.forEach((e) => {
            const key = `${e.season ?? ''}_${e.episodeNumber}`;
            episodeKeyToId.set(key, e.episodeId);
          });

          const existingStreams = await tx.canonicalStream.findMany({
            where: { episodeId: { in: episodeRecords.map((e) => e.episodeId) } },
          });
          const existingStreamMap = new Map<string, any>();
          existingStreams.forEach((s) => {
            const key = `${s.episodeId}|${s.provider}|${s.language ?? ''}|${s.quality ?? ''}|${s.url}`;
            existingStreamMap.set(key, s);
          });
          const incomingStreamKeys = new Set<string>();

          for (const st of incomingStreams) {
            const season = st.season ?? null;
            const episodeNumber = st.episode_number;
            const epKey = `${season ?? ''}_${episodeNumber}`;
            const episodeId = episodeKeyToId.get(epKey);
            if (!episodeId) continue;
            const where = {
              streamId_episodeId_provider_language_quality_url: {
                episodeId,
                provider: st.provider,
                language: st.language ?? null,
                quality: st.quality ?? null,
                url: st.url,
              },
            } as any;
            const payload = {
              episodeId,
              provider: st.provider,
              language: st.language ?? null,
              quality: st.quality ?? null,
              url: st.url,
              isM3u8: st.isM3u8 ?? null,
              pipelineVersion: version,
              lastMergedAt: now,
              lastValidatedAt: now,
              deletedAt: null,
            };
            const streamKey = `${episodeId}|${st.provider}|${st.language ?? ''}|${st.quality ?? ''}|${st.url}`;
            incomingStreamKeys.add(streamKey);
            const existing = existingStreamMap.get(streamKey);
            if (existing) {
              const unchanged =
                existing.isM3u8 === payload.isM3u8 &&
                existing.pipelineVersion === version &&
                existing.deletedAt === null;
              if (!unchanged) {
                await tx.canonicalStream.update({ where, data: payload });
                stats.streamsUpdated++;
              } else {
                stats.streamsUnchanged++;
              }
            } else {
              await tx.canonicalStream.create({ data: payload });
              stats.streamsCreated++;
            }
          }

          for (const [key, streamRec] of existingStreamMap.entries()) {
            if (!incomingStreamKeys.has(key) && !streamRec.deletedAt) {
              await tx.canonicalStream.update({
                where: { streamId: streamRec.streamId },
                data: { deletedAt: now },
              });
              stats.streamsSoftDeleted++;
            }
          }
        }
      });
    } finally {
      await db.$executeRawUnsafe(`SELECT pg_advisory_unlock(${CANONICAL_LOCK_KEY});`);
    }
    const batchDuration = Date.now() - batchStart;
    logger.info('persistCanonical batch completed', { batchIndex, durationMs: batchDuration, batchStats: stats });
  }
  stats.processingTimeMs = Date.now() - startAll;
  logger.info('persistCanonical overall stats', stats);
  return stats;
}
