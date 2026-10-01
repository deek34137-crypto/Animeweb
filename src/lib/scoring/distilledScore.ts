/**
 * Distilled Community Score Engine
 *
 * Anti-brigading scoring algorithm inspired by YourAnimeRank.
 * Uses a Winsorized weighted mean to dampen rage-votes and shill votes.
 *
 * Algorithm:
 *   1. Collect all user scores for an anime
 *   2. Compute mean and standard deviation
 *   3. Apply Winsorization: scores >2σ from mean are pulled back to mean±2σ
 *   4. Apply deviation-based weights: scores within 1σ get full weight (1.0x),
 *      scores 1–2σ away get 0.6x, scores >2σ away get 0.25x
 *   5. Compute weighted average = distilled score
 *   6. Store rawAvg separately for transparency
 */

import { db } from '@/lib/db';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DistilledResult {
  animeId: string;
  rawAvg: number;
  distilledScore: number;
  totalVotes: number;
  scoreVariance: number;
}

// ─── Core Algorithm ──────────────────────────────────────────────────────────

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stddev(values: number[], avg: number): number {
  if (values.length < 2) return 0;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length;
  return Math.sqrt(variance);
}

function winsorize(value: number, lower: number, upper: number): number {
  return Math.max(lower, Math.min(upper, value));
}

export function computeDistilledScore(scores: number[]): {
  rawAvg: number;
  distilledScore: number;
  scoreVariance: number;
} {
  if (scores.length === 0) {
    return { rawAvg: 0, distilledScore: 0, scoreVariance: 0 };
  }

  const rawAvg = mean(scores);
  const sd = stddev(scores, rawAvg);
  const scoreVariance = sd * sd;

  // Winsorize bounds
  const lowerBound = rawAvg - 2 * sd;
  const upperBound = rawAvg + 2 * sd;

  let weightedSum = 0;
  let totalWeight = 0;

  for (const score of scores) {
    const winsorized = winsorize(score, lowerBound, upperBound);
    const deviation = Math.abs(score - rawAvg);

    // Deviation-based weight
    let weight: number;
    if (sd === 0) {
      weight = 1.0; // All scores identical
    } else if (deviation <= sd) {
      weight = 1.0;  // Within 1σ — full weight
    } else if (deviation <= 2 * sd) {
      weight = 0.6;  // 1–2σ away — partial weight
    } else {
      weight = 0.25; // >2σ away — rage/shill vote dampened
    }

    weightedSum += winsorized * weight;
    totalWeight += weight;
  }

  const distilledScore = totalWeight > 0
    ? Math.round((weightedSum / totalWeight) * 100) / 100
    : rawAvg;

  return {
    rawAvg: Math.round(rawAvg * 100) / 100,
    distilledScore,
    scoreVariance: Math.round(scoreVariance * 100) / 100,
  };
}

// ─── DB Operations ────────────────────────────────────────────────────────────

/**
 * Recalculates and upserts the community score for a single anime.
 * Should be called after any ListEntry score change for that anime.
 */
export async function recalculateCommunityScore(animeId: string): Promise<DistilledResult | null> {
  try {
    // Fetch all non-null scores for this anime from completed/watching/rewatching entries
    const entries = await db.listEntry.findMany({
      where: {
        animeId,
        score: { not: null },
        status: { in: ['completed', 'watching', 'rewatching'] },
      },
      select: { score: true },
    });

    const scores = entries.map((e) => e.score as number);

    if (scores.length === 0) {
      // No scores — delete the community score if it exists
      await db.communityScore.deleteMany({ where: { animeId } });
      return null;
    }

    const { rawAvg, distilledScore, scoreVariance } = computeDistilledScore(scores);

    await db.communityScore.upsert({
      where: { animeId },
      update: {
        rawAvg,
        distilledScore,
        totalVotes: scores.length,
        scoreVariance,
      },
      create: {
        animeId,
        rawAvg,
        distilledScore,
        totalVotes: scores.length,
        scoreVariance,
      },
    });

    return { animeId, rawAvg, distilledScore, totalVotes: scores.length, scoreVariance };
  } catch (error) {
    console.error(`[DistilledScore] Failed to recalculate score for anime ${animeId}:`, error);
    return null;
  }
}

/**
 * Bulk recalculates community scores for multiple anime IDs.
 * Used for admin resets and migrations.
 */
export async function bulkRecalculateCommunityScores(animeIds: string[]): Promise<void> {
  const BATCH_SIZE = 50;
  for (let i = 0; i < animeIds.length; i += BATCH_SIZE) {
    const batch = animeIds.slice(i, i + BATCH_SIZE);
    await Promise.allSettled(batch.map((id) => recalculateCommunityScore(id)));
  }
}

/**
 * Fetches community score for a single anime. Returns null if not yet computed.
 */
export async function getCommunityScore(animeId: string): Promise<DistilledResult | null> {
  const row = await db.communityScore.findUnique({ where: { animeId } });
  if (!row) return null;
  return {
    animeId: row.animeId,
    rawAvg: row.rawAvg,
    distilledScore: row.distilledScore,
    totalVotes: row.totalVotes,
    scoreVariance: row.scoreVariance,
  };
}
