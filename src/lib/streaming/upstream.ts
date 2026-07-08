// src/lib/streaming/upstream.ts
import { env } from '@/lib/config/env';
import { logger } from '@/lib/logger';
import { redis } from '@/services/cache/CacheManager';

export class UpstreamUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UpstreamUnavailableError';
  }
}

interface MirrorState {
  url: string;
  failureCount: number;
  suspendedUntil: number; // timestamp in ms
}

// Local in-memory state fallback for non-Redis deployments
const localState = new Map<string, MirrorState>();

/**
 * Resolves the state of a mirror, using Redis if available.
 */
async function getMirrorState(url: string): Promise<MirrorState> {
  const defaultState: MirrorState = { url, failureCount: 0, suspendedUntil: 0 };

  const redisClient = redis;
  if (env.FLAG_USE_NEW_CACHE && redisClient) {
    try {
      const key = `upstream:mirror:${url}`;
      const data = await (redisClient as any).hmget(key, 'failureCount', 'suspendedUntil');
      if (data && data[0] !== null) {
        return {
          url,
          failureCount: parseInt(data[0] || '0', 10),
          suspendedUntil: parseInt(data[1] || '0', 10),
        };
      }
    } catch (err) {
      logger.warn(`[Upstream] Redis get state failed for ${url}:`, err);
    }
  }

  // Fallback to local memory state
  const state = localState.get(url);
  if (!state) {
    localState.set(url, defaultState);
    return defaultState;
  }
  return state;
}

/**
 * Saves the state of a mirror, using Redis if available.
 */
async function saveMirrorState(state: MirrorState): Promise<void> {
  const redisClient = redis;
  if (env.FLAG_USE_NEW_CACHE && redisClient) {
    try {
      const key = `upstream:mirror:${state.url}`;
      await (redisClient as any).hset(key, {
        failureCount: state.failureCount.toString(),
        suspendedUntil: state.suspendedUntil.toString(),
      });
      // Set TTL of 1 hour to prevent keys from persisting forever
      await (redisClient as any).expire(key, 3600);
      return;
    } catch (err) {
      logger.warn(`[Upstream] Redis save state failed for ${state.url}:`, err);
    }
  }

  localState.set(state.url, state);
}

/**
 * Retrieves all healthy configured mirrors, performing load distribution (randomized).
 */
async function getHealthyMirrors(): Promise<string[]> {
  const mirrors = env.CONSUMET_API_MIRRORS;
  if (!mirrors || mirrors.length === 0) {
    return [];
  }

  const now = Date.now();
  const healthy: string[] = [];

  for (const url of mirrors) {
    const state = await getMirrorState(url);
    if (state.suspendedUntil < now) {
      healthy.push(url);
    }
  }

  // Randomize healthy mirrors list to distribute load (load balancing)
  return healthy.sort(() => Math.random() - 0.5);
}

/**
 * Performs a resilient fetch across configured upstream API mirrors.
 * Handles timeouts, retries (max 1 failover), and circuit-breaking health scoring.
 */
export async function fetchUpstream(path: string, init?: RequestInit): Promise<Response> {
  const healthyMirrors = await getHealthyMirrors();

  if (healthyMirrors.length === 0) {
    logger.error('[Upstream] All configured upstream mirrors are currently suspended or unavailable.');
    throw new UpstreamUnavailableError('All upstream streaming servers are currently offline.');
  }

  // Max 1 retry (2 attempts total) to prevent latency cascading/explosion
  const maxAttempts = Math.min(2, healthyMirrors.length);
  let lastError: any = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const mirror = healthyMirrors[attempt];
    const targetUrl = `${mirror}${path.startsWith('/') ? '' : '/'}${path}`;

    logger.info(`[Upstream] Sending request to mirror (Attempt ${attempt + 1}/${maxAttempts}): ${targetUrl}`);

    try {
      // Use a shorter timeout for localhost mirrors — if they're not running,
      // ECONNREFUSED fires almost instantly; the 4s timeout only adds latency.
      const isLocalhost = mirror.includes('localhost') || mirror.includes('127.0.0.1');
      const res = await fetch(targetUrl, {
        ...init,
        headers: {
          ...init?.headers,
          'User-Agent': 'AniWorld/1.0 (+https://aniworld.app)',
        },
        signal: AbortSignal.timeout(isLocalhost ? 1500 : 4000),
      });

      const state = await getMirrorState(mirror);

      if (res.ok) {
        // Success: Gradually self-heal the score (decrement failures)
        if (state.failureCount > 0) {
          state.failureCount = Math.max(0, state.failureCount - 1);
          await saveMirrorState(state);
        }
        return res;
      }

      // HTTP error status (5xx server error, 429 rate limit, etc.)
      if (res.status >= 500 || res.status === 429) {
        throw new Error(`HTTP status ${res.status}`);
      }

      // For 4xx errors (client errors), return response immediately without failing over
      return res;

    } catch (err: any) {
      logger.warn(`[Upstream] Request to ${mirror} failed: ${err.message}`);
      lastError = err;

      // Increment failure score
      const state = await getMirrorState(mirror);
      state.failureCount += 1;

      // Circuit breaker: Suspend mirror for 5 minutes if failures reach threshold
      if (state.failureCount >= 3) {
        state.suspendedUntil = Date.now() + 5 * 60 * 1000;
        logger.error(`[Upstream] Mirror ${mirror} has reached maximum failures. Suspending for 5 minutes.`);
      }

      await saveMirrorState(state);
    }
  }

  throw new UpstreamUnavailableError(`Upstream query failed. Last error: ${lastError?.message || 'Unknown'}`);
}
