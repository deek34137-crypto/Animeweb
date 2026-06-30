// src/services/metadata/monitoring/DataQualityMonitor.ts
import { logger } from '@/lib/logger';

export class DataQualityMonitor {
  /**
   * Validates incoming metadata against existing database records.
   * Returns false if there is a severe deviation, signaling that ingestion should be aborted.
   */
  static verifyDataQuality(current: any, incoming: any): boolean {
    if (!current) return true; // Safe to create new records

    // 1. Episode Count Anomaly
    // If the database has a positive episode count, and the incoming sync returns 0,
    // this is a severe data regression (likely API error or bad mapping). Abort.
    if (current.episodesCount > 0 && incoming.episodesCount === 0) {
      logger.error(`Data Quality Alert: Ingest rejected. Episode count dropped to 0 for anime ID ${current.id}.`, {
        oldValue: current.episodesCount,
        newValue: incoming.episodesCount
      });
      return false;
    }

    // 2. Blank Title check
    // If the incoming title array is empty or undefined, reject the ingest.
    if (!incoming.titles || incoming.titles.length === 0) {
      logger.error(`Data Quality Alert: Ingest rejected. Incoming titles array is empty for anime ID ${current.id}.`);
      return false;
    }

    // 3. Score Volatility Check
    // If the score deviates by more than 80%, log a warning for manual audit, but do not block the run.
    if (current.score > 0 && incoming.score > 0) {
      const deviation = Math.abs(current.score - incoming.score) / current.score;
      if (deviation > 0.8) {
        logger.warn(`Data Quality Warning: Score drifted by ${Math.round(deviation * 100)}% for anime ID ${current.id}.`, {
          oldScore: current.score,
          newScore: incoming.score
        });
      }
    }

    return true;
  }
}
export default DataQualityMonitor;
