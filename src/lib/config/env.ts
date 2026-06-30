// src/lib/config/env.ts
import { z } from 'zod';
import { db } from '@/lib/db';
import Redis from 'ioredis';
import { Meilisearch } from 'meilisearch';
import { S3Client, HeadBucketCommand } from '@aws-sdk/client-s3';
import { logger } from '@/lib/logger';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().default('redis://localhost:6379'),
  MEILISEARCH_HOST: z.string().url().default('http://localhost:7700'),
  MEILISEARCH_KEY: z.string().optional(),
  CDN_BUCKET: z.string().default('aniworld-cdn'),
  AWS_REGION: z.string().default('us-east-1'),
  ANILIST_TOKEN: z.string().optional(),
  TMDB_API_KEY: z.string().optional(),

  // Feature Flags
  FLAG_USE_NEW_METADATA: z.enum(['true', 'false']).transform(v => v === 'true').default(false),
  FLAG_ENABLE_OUTBOX: z.enum(['true', 'false']).transform(v => v === 'true').default(false),
  FLAG_ENABLE_SEARCH_FALLBACK: z.enum(['true', 'false']).transform(v => v === 'true').default(false),
  FLAG_USE_NEW_CACHE: z.enum(['true', 'false']).transform(v => v === 'true').default(false),
  FLAG_ENABLE_PROVIDER_QUARANTINE: z.enum(['true', 'false']).transform(v => v === 'true').default(false),
});

// Parse and validate environment variables
const parsed = envSchema.safeParse({
  DATABASE_URL: process.env.DATABASE_URL,
  REDIS_URL: process.env.REDIS_URL,
  MEILISEARCH_HOST: process.env.MEILISEARCH_HOST,
  MEILISEARCH_KEY: process.env.MEILISEARCH_KEY,
  CDN_BUCKET: process.env.CDN_BUCKET,
  AWS_REGION: process.env.AWS_REGION,
  ANILIST_TOKEN: process.env.ANILIST_TOKEN,
  TMDB_API_KEY: process.env.TMDB_API_KEY,

  FLAG_USE_NEW_METADATA: process.env.FLAG_USE_NEW_METADATA || 'false',
  FLAG_ENABLE_OUTBOX: process.env.FLAG_ENABLE_OUTBOX || 'false',
  FLAG_ENABLE_SEARCH_FALLBACK: process.env.FLAG_ENABLE_SEARCH_FALLBACK || 'false',
  FLAG_USE_NEW_CACHE: process.env.FLAG_USE_NEW_CACHE || 'false',
  FLAG_ENABLE_PROVIDER_QUARANTINE: process.env.FLAG_ENABLE_PROVIDER_QUARANTINE || 'false',
});

if (!parsed.success) {
  logger.error('Environment configuration validation failed:', parsed.error.format());
  throw new Error('Environment configuration validation failed');
}

export const env = parsed.data;

/**
 * Checks connection to critical dependencies at startup (Phase 0)
 */
export async function verifyConnectivity(): Promise<{
  postgres: boolean;
  redis: boolean;
  meilisearch: boolean;
  s3: boolean;
}> {
  const status = {
    postgres: false,
    redis: false,
    meilisearch: false,
    s3: false,
  };

  // 1. Check PostgreSQL
  try {
    await db.$queryRaw`SELECT 1`;
    status.postgres = true;
    logger.info('Connectivity Check: PostgreSQL is CONNECTED');
  } catch (err: any) {
    logger.error('Connectivity Check: PostgreSQL is DISCONNECTED', { error: err.message });
  }

  // 2. Check Redis
  try {
    const redis = new Redis(env.REDIS_URL, { connectTimeout: 3000, lazyConnect: true });
    redis.on('error', (err: any) => {
      // Consume error to prevent unhandled exception
    });
    await redis.connect();
    await redis.ping();
    status.redis = true;
    logger.info('Connectivity Check: Redis is CONNECTED');
    redis.disconnect();
  } catch (err: any) {
    logger.error('Connectivity Check: Redis is DISCONNECTED', { error: err.message });
  }

  // 3. Check Meilisearch
  try {
    const meili = new Meilisearch({ host: env.MEILISEARCH_HOST, apiKey: env.MEILISEARCH_KEY });
    const health = await meili.isHealthy();
    status.meilisearch = health;
    if (health) {
      logger.info('Connectivity Check: Meilisearch is CONNECTED');
    } else {
      logger.warn('Connectivity Check: Meilisearch returned unhealthy status');
    }
  } catch (err: any) {
    logger.error('Connectivity Check: Meilisearch is DISCONNECTED', { error: err.message });
  }

  // 4. Check S3
  try {
    const s3 = new S3Client({
      region: env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'dummy',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'dummy',
      },
      maxAttempts: 1,
    });
    // Fast verification
    await s3.send(new HeadBucketCommand({ Bucket: env.CDN_BUCKET }));
    status.s3 = true;
    logger.info('Connectivity Check: AWS S3 is CONNECTED');
  } catch (err: any) {
    // If it's a 403 or 404, we technically communicated with S3, but let's log the details
    if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
      status.s3 = true;
      logger.warn(`Connectivity Check: AWS S3 Bucket ${env.CDN_BUCKET} not found, but API is reachable.`);
    } else if (err.$metadata?.httpStatusCode === 403) {
      status.s3 = true;
      logger.warn(`Connectivity Check: AWS S3 returned 403 Forbidden, but API is reachable.`);
    } else {
      logger.error('Connectivity Check: AWS S3 is DISCONNECTED', { error: err.message });
    }
  }

  return status;
}
