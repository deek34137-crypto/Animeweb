// src/services/infra/healthChecks.ts
import { db } from '@/lib/db';
import Redis from 'ioredis';
import { Meilisearch } from 'meilisearch';
import { S3Client, HeadBucketCommand } from '@aws-sdk/client-s3';
import { env } from '@/lib/config/env';

export interface HealthCheckResult {
  status: 'up' | 'down';
  latencyMs: number;
  error?: string;
}

/**
 * Races a promise against a timeout. Returns the promise result or rejects with a timeout error.
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} health check timed out after ${timeoutMs}ms`)), timeoutMs);
    promise
      .then((result) => { clearTimeout(timer); resolve(result); })
      .catch((err) => { clearTimeout(timer); reject(err); });
  });
}

/**
 * Checks PostgreSQL connectivity. Timeout: 10 seconds.
 */
export async function checkDatabase(): Promise<HealthCheckResult> {
  const start = Date.now();
  try {
    await withTimeout(db.$queryRaw`SELECT 1`, 10000, 'Database');
    return { status: 'up', latencyMs: Date.now() - start };
  } catch (err: any) {
    return { status: 'down', latencyMs: Date.now() - start, error: err.message };
  }
}

/**
 * Checks Redis connectivity. Timeout: 2 seconds.
 * Returns `up` immediately if Redis is not configured.
 */
export async function checkRedis(): Promise<HealthCheckResult | null> {
  if (!env.REDIS_URL) return null;

  const start = Date.now();
  let redis: Redis | null = null;
  try {
    redis = new Redis(env.REDIS_URL, { connectTimeout: 2000, lazyConnect: true });
    redis.on('error', () => { /* suppress */ });
    await withTimeout(
      (async () => { await redis!.connect(); await redis!.ping(); })(),
      2000,
      'Redis'
    );
    return { status: 'up', latencyMs: Date.now() - start };
  } catch (err: any) {
    return { status: 'down', latencyMs: Date.now() - start, error: err.message };
  } finally {
    if (redis) {
      try { redis.disconnect(); } catch { /* ignore */ }
    }
  }
}

/**
 * Checks Meilisearch connectivity. Timeout: 3 seconds.
 * Returns null if Meilisearch is not configured.
 */
export async function checkMeilisearch(): Promise<HealthCheckResult | null> {
  if (!env.MEILISEARCH_HOST) return null;

  const start = Date.now();
  try {
    const meili = new Meilisearch({ host: env.MEILISEARCH_HOST, apiKey: env.MEILISEARCH_KEY });
    const healthy = await withTimeout(meili.isHealthy(), 3000, 'Meilisearch');
    if (healthy) {
      return { status: 'up', latencyMs: Date.now() - start };
    }
    return { status: 'down', latencyMs: Date.now() - start, error: 'Meilisearch reported unhealthy' };
  } catch (err: any) {
    return { status: 'down', latencyMs: Date.now() - start, error: err.message };
  }
}

/**
 * Checks AWS S3 connectivity. Timeout: 5 seconds.
 * Returns null if AWS credentials are not configured.
 */
export async function checkS3(): Promise<HealthCheckResult | null> {
  if (!env.AWS_ACCESS_KEY_ID || !env.AWS_SECRET_ACCESS_KEY) return null;

  const start = Date.now();
  try {
    const s3 = new S3Client({
      region: env.AWS_REGION,
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
      },
      maxAttempts: 1,
    });
    await withTimeout(
      s3.send(new HeadBucketCommand({ Bucket: env.CDN_BUCKET })),
      5000,
      'S3'
    );
    return { status: 'up', latencyMs: Date.now() - start };
  } catch (err: any) {
    // 403/404 means S3 API is reachable
    if (err.$metadata?.httpStatusCode === 403 || err.$metadata?.httpStatusCode === 404 || err.name === 'NotFound') {
      return { status: 'up', latencyMs: Date.now() - start };
    }
    return { status: 'down', latencyMs: Date.now() - start, error: err.message };
  }
}
