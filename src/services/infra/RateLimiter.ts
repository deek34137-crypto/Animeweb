// src/services/infra/RateLimiter.ts
import { redis } from '@/services/cache/CacheManager';
import { env } from '@/lib/config/env';
import { logger } from '@/lib/logger';

const tokenBucketScript = `
local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refill_rate = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local requested = tonumber(ARGV[4])

local state = redis.call('HMGET', key, 'tokens', 'last_updated')
local tokens = tonumber(state[1])
local last_updated = tonumber(state[2])

if not tokens then
  tokens = capacity
  last_updated = now
else
  local elapsed = now - last_updated
  local refilled = elapsed * refill_rate
  tokens = math.min(capacity, tokens + refilled)
end

if tokens >= requested then
  tokens = tokens - requested
  redis.call('HMSET', key, 'tokens', tokens, 'last_updated', now)
  return 1 -- Allowed
else
  redis.call('HMSET', key, 'tokens', tokens, 'last_updated', now)
  return 0 -- Rejected
end
`;

export class RateLimiter {
  /**
   * Consumes 1 token from the bucket for the given provider.
   * Capacity is 60 tokens, Refill is 1 token per second.
   */
  static async consume(provider: string): Promise<boolean> {
    if (!env.FLAG_USE_NEW_CACHE || !redis) {
      // If Redis cache is disabled, allow requests dynamically (fallback to public client throttling)
      return true;
    }

    try {
      const key = `limiter:bucket:${provider}`;
      const now = Math.floor(Date.now() / 1000);

      const result = await redis.eval(
        tokenBucketScript,
        1,
        key,
        "60", // Capacity
        "1",  // Refill rate (1 token per second)
        now.toString(),
        "1"   // Requested tokens
      );

      return result === 1;
    } catch (err) {
      logger.error(`RateLimiter error for provider ${provider}:`, err);
      // Fallback: fail-open in production so metadata is not blocked
      return true;
    }
  }
}
