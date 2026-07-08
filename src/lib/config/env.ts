// src/lib/config/env.ts
import { z } from 'zod';
import { logger } from '@/lib/logger';

const envSchema = z.object({
  APP_URL: z.string().url().default('http://localhost:3000'),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().optional(),
  MEILISEARCH_HOST: z.string().url().optional(),
  MEILISEARCH_KEY: z.string().optional(),
  CDN_BUCKET: z.string().default('aniworld-cdn'),
  AWS_REGION: z.string().default('us-east-1'),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  ANILIST_TOKEN: z.string().optional(),
  TMDB_API_KEY: z.string().optional(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).optional(),

  // Upstream config validation
  CONSUMET_API_MIRRORS: z.string()
    .default('http://localhost:4000')
    .transform((val) => val.split(',').map(s => s.trim()).filter(Boolean))
    .refine((urls) => urls.length > 0, { message: "At least one mirror must be specified" })
    .refine((urls) => new Set(urls).size === urls.length, { message: "Duplicate mirrors are not allowed" })
    .refine((urls) => urls.every(u => {
      try {
        const parsed = new URL(u);
        if (parsed.protocol === 'https:') return true;
        if (parsed.protocol === 'http:' && (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')) return true;
        return false;
      } catch {
        return false;
      }
    }), { message: "Mirrors must be valid HTTPS URLs (or HTTP for localhost)" }),

  // Feature Flags
  FLAG_USE_NEW_METADATA: z.enum(['true', 'false']).transform(v => v === 'true').default(false),
  FLAG_ENABLE_OUTBOX: z.enum(['true', 'false']).transform(v => v === 'true').default(false),
  FLAG_ENABLE_SEARCH_FALLBACK: z.enum(['true', 'false']).transform(v => v === 'true').default(false),
  FLAG_USE_NEW_CACHE: z.enum(['true', 'false']).transform(v => v === 'true').default(false),
  FLAG_ENABLE_PROVIDER_QUARANTINE: z.enum(['true', 'false']).transform(v => v === 'true').default(false),
  FLAG_ENABLE_TORRENTS: z.enum(['true', 'false']).transform(v => v === 'true').default(false),
}).superRefine((data, ctx) => {
  if (data.FLAG_USE_NEW_CACHE && !data.REDIS_URL) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "REDIS_URL is required when FLAG_USE_NEW_CACHE is enabled", path: ["REDIS_URL"] });
  }
  if (data.FLAG_ENABLE_SEARCH_FALLBACK && !data.MEILISEARCH_HOST) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "MEILISEARCH_HOST is required when FLAG_ENABLE_SEARCH_FALLBACK is enabled", path: ["MEILISEARCH_HOST"] });
  }
});

// Parse and validate environment variables
const parsed = envSchema.safeParse({
  APP_URL: process.env.APP_URL || process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  DATABASE_URL: process.env.DATABASE_URL,
  REDIS_URL: process.env.REDIS_URL,
  MEILISEARCH_HOST: process.env.MEILISEARCH_HOST,
  MEILISEARCH_KEY: process.env.MEILISEARCH_KEY,
  CDN_BUCKET: process.env.CDN_BUCKET,
  AWS_REGION: process.env.AWS_REGION,
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  ANILIST_TOKEN: process.env.ANILIST_TOKEN,
  TMDB_API_KEY: process.env.TMDB_API_KEY,
  LOG_LEVEL: process.env.LOG_LEVEL,
  CONSUMET_API_MIRRORS: process.env.CONSUMET_API_MIRRORS,

  FLAG_USE_NEW_METADATA: process.env.FLAG_USE_NEW_METADATA || 'false',
  FLAG_ENABLE_OUTBOX: process.env.FLAG_ENABLE_OUTBOX || 'false',
  FLAG_ENABLE_SEARCH_FALLBACK: process.env.FLAG_ENABLE_SEARCH_FALLBACK || 'false',
  FLAG_USE_NEW_CACHE: process.env.FLAG_USE_NEW_CACHE || 'false',
  FLAG_ENABLE_PROVIDER_QUARANTINE: process.env.FLAG_ENABLE_PROVIDER_QUARANTINE || 'false',
  FLAG_ENABLE_TORRENTS: process.env.FLAG_ENABLE_TORRENTS || 'false',
});

if (!parsed.success) {
  logger.error('Environment configuration validation failed:', parsed.error.format());
  throw new Error('Environment configuration validation failed');
}

export const env = parsed.data;

/**
 * Checks connection to critical dependencies at startup (Phase 0).
 * Delegates to shared health check helpers for consistent timeout and result handling.
 */
export async function verifyConnectivity(): Promise<{
  postgres: boolean;
  redis: boolean;
  meilisearch: boolean;
  s3: boolean;
}> {
  const { checkDatabase, checkRedis, checkMeilisearch, checkS3 } = await import('@/services/infra/healthChecks');

  const status = {
    postgres: false,
    redis: false,
    meilisearch: false,
    s3: false,
  };

  // 1. Check PostgreSQL
  const dbResult = await checkDatabase();
  status.postgres = dbResult.status === 'up';
  logger.info(`Connectivity Check: PostgreSQL is ${status.postgres ? 'CONNECTED' : 'DISCONNECTED'}`, { latencyMs: dbResult.latencyMs, error: dbResult.error });

  // 2. Check Redis
  const redisResult = await checkRedis();
  if (redisResult === null) {
    logger.info('Connectivity Check: Redis skipped (no URL configured)');
  } else {
    status.redis = redisResult.status === 'up';
    logger.info(`Connectivity Check: Redis is ${status.redis ? 'CONNECTED' : 'DISCONNECTED'}`, { latencyMs: redisResult.latencyMs, error: redisResult.error });
  }

  // 3. Check Meilisearch
  const meiliResult = await checkMeilisearch();
  if (meiliResult === null) {
    logger.info('Connectivity Check: Meilisearch skipped (no host configured)');
  } else {
    status.meilisearch = meiliResult.status === 'up';
    logger.info(`Connectivity Check: Meilisearch is ${status.meilisearch ? 'CONNECTED' : 'DISCONNECTED'}`, { latencyMs: meiliResult.latencyMs, error: meiliResult.error });
  }

  // 4. Check S3
  const s3Result = await checkS3();
  if (s3Result === null) {
    logger.info('Connectivity Check: AWS S3 skipped (no credentials provided)');
  } else {
    status.s3 = s3Result.status === 'up';
    logger.info(`Connectivity Check: AWS S3 is ${status.s3 ? 'CONNECTED' : 'DISCONNECTED'}`, { latencyMs: s3Result.latencyMs, error: s3Result.error });
  }

  return status;
}
