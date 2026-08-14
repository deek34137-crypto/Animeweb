// src/lib/streaming/health.ts
// Redis-backed provider reputation with:
//   - Write-through, read-from-memory architecture
//   - Exponential decay (0.95/day) applied at scoring time
//   - Bayesian confidence smoothing for sparse providers
//   - Severity-weighted failure recording
//   - Composite health score (success rate + latency + stall rate + trend)
//   - Circuit breaker threshold (HealthScore < 20 → circuit open)
//   - HEAD-based source health checks with 2-minute Redis URL cache
//   - Background Redis warm-up with atomic in-memory swap

import { redis } from '@/services/cache/CacheManager';

// ─── Types ────────────────────────────────────────────────────────────────────

export type FailureSeverity = 'minor' | 'medium' | 'high' | 'critical';

interface ProviderStats {
  // Raw counts (stored in Redis)
  successes: number;
  weightedFailures: number;       // severity-weighted failure accumulator
  totalResponseTimeMs: number;
  totalStallMs: number;           // cumulative stall ms reported via telemetry
  recentEvents: (0 | 1)[];       // last 10 events: 1=success, 0=failure (ring buffer)
  lastWrittenAt: number;          // Unix ms — used for decay calculation
  lastSuccessAt?: number;
}

interface ProviderHealthView {
  successRate: number;
  avgResponseMs: number;
  total: number;
  healthScore: number;
  status: 'healthy' | 'degraded' | 'down';
  circuitOpen: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const REDIS_KEY_PREFIX  = 'stream:health:provider:';
const URL_CACHE_PREFIX  = 'stream:health:url:';
const REDIS_TTL_SECS    = 7 * 24 * 3600;   // 7 days
const URL_CACHE_TTL     = 120;              // 2 minutes

const DECAY_FACTOR      = 0.95;            // per-day decay
const PRIOR_SUCCESSES   = 10;              // Bayesian prior
const PRIOR_TOTAL       = 20;

const SEVERITY_WEIGHTS: Record<FailureSeverity, number> = {
  minor:    0.5,
  medium:   1.0,   // default
  high:     2.0,
  critical: 4.0,
};

// Circuit breaker threshold
const CIRCUIT_OPEN_THRESHOLD = 20;        // healthScore < 20 → circuit open

// Composite score weights
const W_SUCCESS   = 0.45;
const W_LATENCY   = 0.25;
const W_STALL     = 0.20;
const W_TREND     = 0.10;
const MAX_EXPECTED_LATENCY_MS = 5000;     // normalisation ceiling

// ─── In-memory cache ──────────────────────────────────────────────────────────

// Default seed values — healthy baselines for all providers
const DEFAULT_SEEDS: Record<string, ProviderStats> = {
  filmu:        { successes: 50, weightedFailures: 0, totalResponseTimeMs: 25000, totalStallMs: 0, recentEvents: [1,1,1,1,1], lastWrittenAt: Date.now() },
  kaa:          { successes: 50, weightedFailures: 0, totalResponseTimeMs: 30000, totalStallMs: 0, recentEvents: [1,1,1,1,1], lastWrittenAt: Date.now() },
  anibd:        { successes: 50, weightedFailures: 0, totalResponseTimeMs: 15000, totalStallMs: 0, recentEvents: [1,1,1,1,1], lastWrittenAt: Date.now() },
  allmanga:     { successes: 50, weightedFailures: 0, totalResponseTimeMs: 20000, totalStallMs: 0, recentEvents: [1,1,1,1,1], lastWrittenAt: Date.now() },
  reanime:      { successes: 50, weightedFailures: 0, totalResponseTimeMs: 25000, totalStallMs: 0, recentEvents: [1,1,1,1,1], lastWrittenAt: Date.now() },
  anime_nexus:  { successes: 50, weightedFailures: 0, totalResponseTimeMs: 25000, totalStallMs: 0, recentEvents: [1,1,1,1,1], lastWrittenAt: Date.now() },
  anizone:      { successes: 50, weightedFailures: 0, totalResponseTimeMs: 25000, totalStallMs: 0, recentEvents: [1,1,1,1,1], lastWrittenAt: Date.now() },
  anihq:        { successes: 50, weightedFailures: 0, totalResponseTimeMs: 30000, totalStallMs: 0, recentEvents: [1,1,1,1,1], lastWrittenAt: Date.now() },
  animotvslash: { successes: 50, weightedFailures: 0, totalResponseTimeMs: 30000, totalStallMs: 0, recentEvents: [1,1,1,1,1], lastWrittenAt: Date.now() },
  vidnest:      { successes: 50, weightedFailures: 0, totalResponseTimeMs: 35000, totalStallMs: 0, recentEvents: [1,1,1,1,1], lastWrittenAt: Date.now() },
  gogocdn:      { successes: 50, weightedFailures: 0, totalResponseTimeMs: 40000, totalStallMs: 0, recentEvents: [1,1,1,1,1], lastWrittenAt: Date.now() },
  toonworld:    { successes: 50, weightedFailures: 0, totalResponseTimeMs: 30000, totalStallMs: 0, recentEvents: [1,1,1,1,1], lastWrittenAt: Date.now() },
  toonplay:     { successes: 50, weightedFailures: 0, totalResponseTimeMs: 35000, totalStallMs: 0, recentEvents: [1,1,1,1,1], lastWrittenAt: Date.now() },
  vidsrc_me:    { successes: 50, weightedFailures: 0, totalResponseTimeMs: 40000, totalStallMs: 0, recentEvents: [1,1,1,1,1], lastWrittenAt: Date.now() },
  vidsrc_to:    { successes: 50, weightedFailures: 0, totalResponseTimeMs: 40000, totalStallMs: 0, recentEvents: [1,1,1,1,1], lastWrittenAt: Date.now() },
  vidsrc_sbs:   { successes: 50, weightedFailures: 0, totalResponseTimeMs: 40000, totalStallMs: 0, recentEvents: [1,1,1,1,1], lastWrittenAt: Date.now() },
  mock:         { successes: 10, weightedFailures: 20, totalResponseTimeMs: 50000, totalStallMs: 0, recentEvents: [0,0,1],   lastWrittenAt: Date.now() },
};

let providerStats: Record<string, ProviderStats> = { ...DEFAULT_SEEDS };
let redisLoaded = false;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function applyDecay(stats: ProviderStats): ProviderStats {
  const ageMs = Date.now() - (stats.lastWrittenAt || Date.now());
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  const factor = Math.pow(DECAY_FACTOR, ageDays);
  return {
    ...stats,
    successes:         stats.successes * factor,
    weightedFailures:  stats.weightedFailures * factor,
    totalResponseTimeMs: stats.totalResponseTimeMs * factor,
    totalStallMs:      stats.totalStallMs * factor,
  };
}

function computeConfidenceRate(decayedSuccesses: number, decayedTotal: number): number {
  return (decayedSuccesses + PRIOR_SUCCESSES) / (decayedTotal + PRIOR_TOTAL);
}

function computeHealthScore(stats: ProviderStats): number {
  const decayed = applyDecay(stats);
  const decayedTotal = decayed.successes + decayed.weightedFailures;

  const confidenceRate = computeConfidenceRate(decayed.successes, decayedTotal);

  // Normalised latency score (1 = fastest, 0 = at or beyond ceiling)
  const avgLatency = decayed.successes > 0
    ? decayed.totalResponseTimeMs / decayed.successes
    : MAX_EXPECTED_LATENCY_MS;
  const latencyScore = Math.max(0, 1 - avgLatency / MAX_EXPECTED_LATENCY_MS);

  // Stall rate: stall ms per second of total response time
  const totalResponseSec = decayed.totalResponseTimeMs / 1000;
  const stallRate = totalResponseSec > 0
    ? Math.min(1, decayed.totalStallMs / 1000 / totalResponseSec)
    : 0;
  const stallScore = 1 - stallRate;

  // Recent trend: % of last 10 events that were successes
  const recentEvents = stats.recentEvents || [];
  const recentTrend = recentEvents.length > 0
    ? recentEvents.reduce<number>((a, b) => a + b, 0) / recentEvents.length
    : confidenceRate;

  const score = (
    W_SUCCESS * confidenceRate +
    W_LATENCY * latencyScore +
    W_STALL   * stallScore +
    W_TREND   * recentTrend
  ) * 100;

  return Math.round(Math.max(0, Math.min(100, score)));
}

function computeStatus(healthScore: number): 'healthy' | 'degraded' | 'down' {
  if (healthScore >= 75) return 'healthy';
  if (healthScore >= 40) return 'degraded';
  return 'down';
}

function pushRecentEvent(stats: ProviderStats, outcome: 0 | 1): (0 | 1)[] {
  const ring = [...(stats.recentEvents || []), outcome];
  return ring.slice(-10) as (0 | 1)[];
}

function ensureStats(key: string): void {
  if (!providerStats[key]) {
    providerStats[key] = {
      successes: 0,
      weightedFailures: 0,
      totalResponseTimeMs: 0,
      totalStallMs: 0,
      recentEvents: [],
      lastWrittenAt: Date.now(),
    };
  }
}

// ─── Redis persistence ────────────────────────────────────────────────────────

async function writeToRedis(key: string): Promise<void> {
  const r = redis;
  if (!r) return;
  try {
    const stats = providerStats[key];
    if (!stats) return;
    const redisKey = `${REDIS_KEY_PREFIX}${key}`;
    await (r as any).hset(redisKey, {
      successes:          stats.successes.toString(),
      weightedFailures:   stats.weightedFailures.toString(),
      totalResponseTimeMs: stats.totalResponseTimeMs.toString(),
      totalStallMs:       stats.totalStallMs.toString(),
      recentEvents:       JSON.stringify(stats.recentEvents),
      lastWrittenAt:      stats.lastWrittenAt.toString(),
      lastSuccessAt:      stats.lastSuccessAt?.toString() ?? '',
    });
    await (r as any).expire(redisKey, REDIS_TTL_SECS);
  } catch {
    // Redis write failure is non-fatal — in-memory data is still valid
  }
}

async function loadFromRedis(): Promise<void> {
  const r = redis;
  if (!r) {
    redisLoaded = true;
    return;
  }
  try {
    const pattern = `${REDIS_KEY_PREFIX}*`;
    let cursor = '0';
    const loadedMap: Record<string, ProviderStats> = {};

    do {
      const result: [string, string[]] = await (r as any).scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = result[0];
      const keys: string[] = result[1];

      await Promise.all(keys.map(async (redisKey: string) => {
        try {
          const data = await (r as any).hgetall(redisKey);
          if (!data || !data.successes) return;
          const providerKey = redisKey.replace(REDIS_KEY_PREFIX, '');
          loadedMap[providerKey] = {
            successes:           parseFloat(data.successes || '0'),
            weightedFailures:    parseFloat(data.weightedFailures || '0'),
            totalResponseTimeMs: parseFloat(data.totalResponseTimeMs || '0'),
            totalStallMs:        parseFloat(data.totalStallMs || '0'),
            recentEvents:        JSON.parse(data.recentEvents || '[]'),
            lastWrittenAt:       parseInt(data.lastWrittenAt || Date.now().toString(), 10),
            lastSuccessAt:       data.lastSuccessAt ? parseInt(data.lastSuccessAt, 10) : undefined,
          };
        } catch { /* skip malformed entry */ }
      }));
    } while (cursor !== '0');

    // Atomic swap: merge Redis data over seeds, preserving seeds for providers not in Redis
    if (Object.keys(loadedMap).length > 0) {
      providerStats = { ...DEFAULT_SEEDS, ...loadedMap };
    }
    redisLoaded = true;
  } catch {
    redisLoaded = true; // fall back to seeds silently
  }
}

// Fire and forget — warm-up starts immediately at module load
loadFromRedis().catch(() => { redisLoaded = true; });

// ─── Public API ───────────────────────────────────────────────────────────────

export const StreamingHealth = {
  /**
   * Records a successful stream load for a provider.
   */
  recordSuccess: (provider: string, responseTimeMs?: number, stallDurationMs?: number): void => {
    const key = provider.toLowerCase();
    ensureStats(key);

    const s = providerStats[key];
    s.successes += 1;
    s.lastSuccessAt = Date.now();
    s.lastWrittenAt = Date.now();
    if (responseTimeMs && responseTimeMs > 0) {
      s.totalResponseTimeMs += responseTimeMs;
    }
    if (stallDurationMs && stallDurationMs > 0) {
      s.totalStallMs += stallDurationMs;
    }
    s.recentEvents = pushRecentEvent(s, 1);

    // Fire-and-forget Redis write (non-blocking)
    writeToRedis(key).catch(() => {});
  },

  /**
   * Records a failure for a provider with optional severity weighting.
   */
  recordFailure: (provider: string, opts?: { severity?: FailureSeverity }): void => {
    const key = provider.toLowerCase();
    ensureStats(key);

    const weight = SEVERITY_WEIGHTS[opts?.severity ?? 'medium'];
    const s = providerStats[key];
    s.weightedFailures += weight;
    s.lastWrittenAt = Date.now();
    s.recentEvents = pushRecentEvent(s, 0);

    writeToRedis(key).catch(() => {});
  },

  /**
   * Returns success rate percentage (for backward compatibility).
   */
  getSuccessPercentage: (provider: string): number => {
    const key = provider.toLowerCase();
    const stats = providerStats[key];
    if (!stats) return 0;
    const decayed = applyDecay(stats);
    const total = decayed.successes + decayed.weightedFailures;
    return computeConfidenceRate(decayed.successes, total) * 100;
  },

  /**
   * Returns average response time in ms. Infinity if no data.
   */
  getAverageResponseTime: (provider: string): number => {
    const key = provider.toLowerCase();
    const stats = providerStats[key];
    if (!stats || stats.successes === 0) return Infinity;
    return stats.totalResponseTimeMs / stats.successes;
  },

  /**
   * Returns the composite health score (0–100) for a provider.
   */
  getHealthScore: (provider: string): number => {
    const key = provider.toLowerCase();
    const stats = providerStats[key];
    if (!stats) return 0;
    return computeHealthScore(stats);
  },

  /**
   * Returns true if the circuit should be considered open for this provider.
   * HealthScore < 20 → circuit open.
   */
  isCircuitOpen: (provider: string): boolean => {
    return StreamingHealth.getHealthScore(provider) < CIRCUIT_OPEN_THRESHOLD;
  },

  /**
   * Reorders providers by composite health score descending.
   * Mock provider always goes last.
   */
  getReorderedProviders: (providers: string[]): string[] => {
    return [...providers].sort((a, b) => {
      if (a === 'mock') return 1;
      if (b === 'mock') return -1;
      return StreamingHealth.getHealthScore(b) - StreamingHealth.getHealthScore(a);
    });
  },

  /**
   * Returns full health data for all known providers.
   * Used by admin endpoint.
   */
  getAllStats: (): Record<string, ProviderHealthView> => {
    const result: Record<string, ProviderHealthView> = {};
    for (const [key, stats] of Object.entries(providerStats)) {
      const decayed = applyDecay(stats);
      const total = decayed.successes + decayed.weightedFailures;
      const successRate = Math.round(computeConfidenceRate(decayed.successes, total) * 100);
      const avgResponseMs = stats.successes > 0
        ? Math.round(stats.totalResponseTimeMs / stats.successes)
        : 0;
      const healthScore = computeHealthScore(stats);
      result[key] = {
        successRate,
        avgResponseMs,
        total: Math.round(total),
        healthScore,
        status: computeStatus(healthScore),
        circuitOpen: healthScore < CIRCUIT_OPEN_THRESHOLD,
      };
    }
    return result;
  },

  /**
   * Returns minimal provider status for the public player endpoint.
   * Only exposes name + status — no rates, counts, or latency.
   */
  getPublicProviderStatus: (): { name: string; status: 'healthy' | 'degraded' | 'down' }[] => {
    return Object.entries(providerStats)
      .filter(([name]) => name !== 'mock') // never expose mock to clients
      .map(([name, stats]) => ({
        name,
        status: computeStatus(computeHealthScore(stats)),
      }));
  },

  /**
   * Checks if a stream URL is reachable via a non-blocking HEAD request.
   * Results are cached in Redis for 2 minutes.
   * Falls back to true (optimistic) if Redis is unavailable.
   */
  checkSourceHealth: async (url: string): Promise<boolean> => {
    if (!url) return false;

    // Embed/iframe URLs or local/mock URLs — skip HEAD request, always treat as reachable
    if (
      url.includes('embed.') ||
      url.includes('/embed/') ||
      url.includes('kaa.lt') ||
      url.includes('anibd.app') ||
      url.includes('allmanga.to') ||
      url.includes('reanime.to') ||
      url.includes('anime.nexus') ||
      url.includes('anizone.to') ||
      url.includes('anihq.cc') ||
      url.includes('animotvslash.org') ||
      url.startsWith('http://localhost') ||
      url.includes('mock-') ||
      url.includes('sample.m3u8')
    ) {
      return true;
    }

    // Check Redis cache first
    const cacheKey = `${URL_CACHE_PREFIX}${Buffer.from(url).toString('base64url').slice(0, 64)}`;
    const r = redis;
    if (r) {
      try {
        const cached = await (r as any).get(cacheKey);
        if (cached !== null) {
          return cached === '1';
        }
      } catch { /* skip cache on error */ }
    }

    let result = true;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const res = await fetch(url, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        },
        signal: controller.signal,
        cache: 'no-store',
      });

      clearTimeout(timeoutId);

      result = !(res.status === 404 || res.status === 410 || res.status >= 500);
    } catch {
      result = false;
    }

    // Cache result in Redis
    if (r) {
      try {
        await (r as any).setex(cacheKey, URL_CACHE_TTL, result ? '1' : '0');
      } catch { /* non-fatal */ }
    }

    return result;
  },

  /** Returns whether Redis warm-up has completed. */
  isRedisLoaded: (): boolean => redisLoaded,

  /**
   * Resets reputation for a single provider back to neutral seed values.
   * Clears both the in-memory stats and the Redis key.
   * Use after infrastructure changes, scoring algorithm updates, or data corruption.
   */
  resetProvider: async (provider: string): Promise<void> => {
    const key = provider.toLowerCase();
    providerStats[key] = {
      successes:           DEFAULT_SEEDS[key]?.successes         ?? 0,
      weightedFailures:    DEFAULT_SEEDS[key]?.weightedFailures  ?? 0,
      totalResponseTimeMs: DEFAULT_SEEDS[key]?.totalResponseTimeMs ?? 0,
      totalStallMs:        0,
      recentEvents:        [],
      lastWrittenAt:       Date.now(),
    };

    const r = redis;
    if (r) {
      try {
        await (r as any).del(`${REDIS_KEY_PREFIX}${key}`);
      } catch { /* non-fatal */ }
    }
  },

  /**
   * Resets reputation for all known providers back to neutral seed values.
   * Clears all in-memory stats and deletes all Redis keys under the provider prefix.
   */
  resetAll: async (): Promise<void> => {
    providerStats = { ...DEFAULT_SEEDS };

    const r = redis;
    if (r) {
      try {
        let cursor = '0';
        do {
          const result: [string, string[]] = await (r as any).scan(
            cursor, 'MATCH', `${REDIS_KEY_PREFIX}*`, 'COUNT', 100,
          );
          cursor = result[0];
          if (result[1].length > 0) {
            await (r as any).del(...result[1]);
          }
        } while (cursor !== '0');
      } catch { /* non-fatal */ }
    }
  },
};

export default StreamingHealth;
