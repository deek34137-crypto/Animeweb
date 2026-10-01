// src/app/api/health/ready/route.ts
import { NextResponse } from 'next/server';
import { getLifecycleState } from '@/services/infra/lifecycle';
import { checkDatabase, checkRedis, checkMeilisearch, type HealthCheckResult } from '@/services/infra/healthChecks';
import { env } from '@/lib/config/env';

/**
 * GET /api/health/ready — Readiness probe.
 *
 * Determines whether the instance is able to serve requests.
 * Returns 503 during startup and shutdown.
 * Checks dependencies conditionally based on what is configured.
 */
export async function GET() {
  const state = getLifecycleState();

  // During startup or shutdown, the instance is not ready
  if (state !== 'ready') {
    return NextResponse.json(
      {
        status: 'not_ready',
        reason: state === 'starting' ? 'application_starting' : 'application_shutting_down',
      },
      {
        status: 503,
        headers: { 'Cache-Control': 'no-store' },
      }
    );
  }

  // Run dependency checks
  const checks: Record<string, HealthCheckResult> = {};
  let allHealthy = true;

  // Database is always required
  const dbResult = await checkDatabase();
  checks.database = dbResult;
  if (dbResult.status === 'down') allHealthy = false;

  // Redis — check only when configured
  if (env.REDIS_URL) {
    const redisResult = await checkRedis();
    if (redisResult) {
      checks.redis = redisResult;
      if (redisResult.status === 'down') allHealthy = false;
    }
  }

  // Meilisearch — check only when configured
  if (env.MEILISEARCH_HOST) {
    const meiliResult = await checkMeilisearch();
    if (meiliResult) {
      checks.meilisearch = meiliResult;
      if (meiliResult.status === 'down') allHealthy = false;
    }
  }

  const status = allHealthy ? 'ready' : 'not_ready';
  const httpStatus = allHealthy ? 200 : 503;

  return NextResponse.json(
    { status, checks },
    {
      status: httpStatus,
      headers: { 'Cache-Control': 'no-store' },
    }
  );
}
