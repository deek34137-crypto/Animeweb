// src/services/metadata/health/QuarantineService.ts
import { redis } from '@/services/cache/CacheManager';
import { env } from '@/lib/config/env';
import { ProviderType } from '@prisma/client';
import { logger } from '@/lib/logger';

export class QuarantineService {
  private static readonly FAILURE_LIMIT = 100;
  private static readonly WINDOW_SEC = 3600; // 1 hour tracking window
  private static readonly BUCKET_SEC = 300;  // 5-minute bucket size

  /**
   * Records a schema validation error for a provider.
   * Compiles error metrics over a sliding window.
   */
  static async recordValidationError(provider: ProviderType): Promise<void> {
    if (!env.FLAG_ENABLE_PROVIDER_QUARANTINE || !redis) return;

    try {
      const now = Date.now();
      const currentBucket = Math.floor(now / (this.BUCKET_SEC * 1000));
      const errorKey = `quarantine:errors:${provider}:${currentBucket}`;

      // Increment errors in the current 5-min bucket
      await redis.incr(errorKey);
      await redis.expire(errorKey, this.WINDOW_SEC);

      // Scan all active error keys in the last hour
      let cursor = '0';
      let totalErrors = 0;
      const matchPattern = `quarantine:errors:${provider}:*`;

      do {
        const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', matchPattern, 'COUNT', 100);
        cursor = nextCursor;

        if (keys.length > 0) {
          const values = await redis.mget(keys);
          totalErrors += values.reduce((sum: number, val: any) => sum + Number(val || 0), 0);
        }
      } while (cursor !== '0');

      if (totalErrors > this.FAILURE_LIMIT) {
        // Quarantine the provider for 24 hours (86400 seconds)
        await redis.setex(`quarantine:status:${provider}`, 86400, 'QUARANTINED');
        logger.error(`QUARANTINED provider ${provider} due to high validation failure rates (${totalErrors} errors in 1h).`);
      }
    } catch (err) {
      logger.error(`QuarantineService record error failed for ${provider}:`, err);
    }
  }

  /**
   * Checks if the provider is currently quarantined.
   */
  static async isQuarantined(provider: ProviderType): Promise<boolean> {
    if (!env.FLAG_ENABLE_PROVIDER_QUARANTINE || !redis) return false;

    try {
      const status = await redis.get(`quarantine:status:${provider}`);
      return status === 'QUARANTINED';
    } catch (err) {
      logger.error(`Quarantine check failed for provider ${provider}:`, err);
      return false; // Fail-open in production
    }
  }

  /**
   * Manually lifts the quarantine status for a provider.
   */
  static async liftQuarantine(provider: ProviderType): Promise<void> {
    if (!redis) return;
    try {
      await redis.del(`quarantine:status:${provider}`);
      logger.info(`Quarantine manually LIFTED for provider: ${provider}`);
    } catch (err) {
      logger.error(`Failed to lift quarantine for ${provider}:`, err);
    }
  }
}
export default QuarantineService;
