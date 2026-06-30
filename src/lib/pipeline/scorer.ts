// src/lib/pipeline/scorer.ts
import weights from '../../config/scoringWeights.json' assert { type: 'json' };
/**
 * Apply weighted scoring to deduplicated canonical records.
 * Each record receives a `score` field based on configured weights.
 */
export function scoreCanonical(merged: Record<string, any>) {
  for (const key in merged) {
    const record = merged[key];
    // Simple example: sum of weighted counts of each part.
    const metaScore = record.metadata ? 1 : 0;
    const epScore = record.episodes ? record.episodes.length : 0;
    const stScore = record.streams ? record.streams.length : 0;
    const totalScore =
      metaScore * (weights.metadata ?? 0) +
      epScore * (weights.episodes ?? 0) +
      stScore * (weights.streams ?? 0);
    record.score = totalScore;
  }
  return merged;
}
