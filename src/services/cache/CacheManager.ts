// src/services/cache/CacheManager.ts
import Redis from 'ioredis';
import { env } from '@/lib/config/env';
import { logger } from '@/lib/logger';

// --- Lightweight In-Memory LRU Cache (L1) ---
class SimpleLRU<K, V> {
  private max: number;
  private cache: Map<K, V>;

  constructor(max = 1000) {
    this.max = max;
    this.cache = new Map<K, V>();
  }

  get(key: K): V | undefined {
    const item = this.cache.get(key);
    if (item !== undefined) {
      this.cache.delete(key);
      this.cache.set(key, item);
    }
    return item;
  }

  set(key: K, val: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.max) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, val);
  }

  delete(key: K): boolean {
    return this.cache.delete(key);
  }
}

// L1 memory cache (1000 items)
const l1Cache = new SimpleLRU<string, { value: any; expiresAt: number }>(1000);
const activeQueries = new Map<string, Promise<any>>(); // Singleflight coalescing

let redis: Redis | null = null;
let pubSub: Redis | null = null;

if (env.FLAG_USE_NEW_CACHE) {
  try {
    redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
    redis.on('error', (err: any) => {
      logger.error('Redis client error:', err);
    });

    pubSub = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
    pubSub.on('error', (err: any) => {
      logger.error('Redis Pub/Sub error:', err);
    });

    pubSub.subscribe('cache:invalidate:channel');
    pubSub.on('message', (channel: string, message: string) => {
      if (channel === 'cache:invalidate:channel') {
        const [key, version] = message.split('|');
        const versionedKey = `${key}:v${version}`;
        l1Cache.delete(versionedKey);
        logger.info(`L1 Cache Invalidation: Purged L1 key ${versionedKey}`);
      }
    });
  } catch (err: any) {
    logger.error('Failed to initialize Redis clients in CacheManager:', err);
  }
}

export class CacheManager {
  private static readonly SCHEMA_VERSION = '1';

  /**
   * Reads from L1 Memory -> L2 Redis -> DB (via fetchFn).
   * Implements singleflight request coalescing to prevent cache stampedes.
   */
  static async get<T>(baseKey: string, fetchFn: () => Promise<T>): Promise<T> {
    const now = Date.now();
    const versionedKey = `${baseKey}:v${this.SCHEMA_VERSION}`;

    // 1. Check L1 Cache
    const l1Cached = l1Cache.get(versionedKey);
    if (l1Cached && l1Cached.expiresAt > now) {
      return l1Cached.value;
    }

    // 2. Singleflight Coalescing
    if (activeQueries.has(versionedKey)) {
      return activeQueries.get(versionedKey)!;
    }

    const promise = (async () => {
      // 3. Check L2 Redis Cache (if enabled)
      if (env.FLAG_USE_NEW_CACHE && redis) {
        try {
          const l2Cached = await redis.get(versionedKey);
          if (l2Cached) {
            const parsed = JSON.parse(l2Cached);
            // Populate L1 cache (30s TTL)
            l1Cache.set(versionedKey, { value: parsed, expiresAt: now + 30_000 });
            return parsed;
          }
        } catch (err) {
          logger.error(`Redis read error for key ${versionedKey}:`, err);
        }
      }

      // 4. Fallback to fetchFn (Database/API lookup)
      const data = await fetchFn();

      // Populate L2 Cache (6-hour TTL)
      if (env.FLAG_USE_NEW_CACHE && redis) {
        try {
          await redis.setex(versionedKey, 21600, JSON.stringify(data));
        } catch (err) {
          logger.error(`Redis write error for key ${versionedKey}:`, err);
        }
      }

      // Populate L1 Cache (30s TTL)
      l1Cache.set(versionedKey, { value: data, expiresAt: now + 30_000 });
      return data;
    })();

    activeQueries.set(versionedKey, promise);
    try {
      return await promise;
    } finally {
      activeQueries.delete(versionedKey);
    }
  }

  /**
   * Invalidates L2 and broadcasts L1 invalidation to all replicas.
   */
  static async invalidate(baseKey: string): Promise<void> {
    const versionedKey = `${baseKey}:v${this.SCHEMA_VERSION}`;
    l1Cache.delete(versionedKey); // Local delete

    if (env.FLAG_USE_NEW_CACHE && redis) {
      try {
        await redis.del(versionedKey);
        await redis.publish('cache:invalidate:channel', `${baseKey}|${this.SCHEMA_VERSION}`);
      } catch (err) {
        logger.error(`Redis invalidation failed for key ${versionedKey}:`, err);
      }
    }
  }
}
export { redis };
