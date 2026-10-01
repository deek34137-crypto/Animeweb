/**
 * Compare Rate Engine
 *
 * YAR-style "drag a slider and watch your list rearrange live".
 * The user positions a new anime at a target score (0.25 steps),
 * and this module computes the live reorder of all rated entries.
 */

import { snapToQuarterPoint } from '@/lib/rating/scaleDescriptions';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RatedEntry {
  animeId: string;
  animeTitle: string;
  animeImage: string;
  score: number;
  compareRatePosn: number | null;
}

export interface CompareRatePreview {
  targetScore: number;          // Snapped to 0.25 step
  orderedEntries: RatedEntry[]; // All entries re-sorted including the target
  insertIndex: number;          // Position of the target in the sorted list
}

// ─── Core: Live Preview ───────────────────────────────────────────────────────

/**
 * Given a raw slider value and the user's current rated list,
 * returns a live preview of where the new/updated anime would slot in.
 *
 * Called on every slider move (client-side friendly — no DB calls).
 */
export function getCompareRatePreview(
  rawSliderValue: number,
  existingEntries: RatedEntry[],
  targetAnimeId: string,
): CompareRatePreview {
  const targetScore = snapToQuarterPoint(rawSliderValue);

  // Build list excluding the target anime (to avoid double-entry if re-rating)
  const others = existingEntries.filter((e) => e.animeId !== targetAnimeId);

  // Sort descending by score, then by existing position as tiebreaker
  const sorted = [...others].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (a.compareRatePosn ?? 999) - (b.compareRatePosn ?? 999);
  });

  // Find insertion index
  let insertIndex = sorted.findIndex((e) => e.score < targetScore);
  if (insertIndex === -1) insertIndex = sorted.length; // Goes at the end

  // Splice target into the sorted list for preview
  const orderedEntries: RatedEntry[] = [
    ...sorted.slice(0, insertIndex),
    {
      animeId: targetAnimeId,
      animeTitle: '',
      animeImage: '',
      score: targetScore,
      compareRatePosn: insertIndex,
    },
    ...sorted.slice(insertIndex),
  ];

  return { targetScore, orderedEntries, insertIndex };
}

// ─── Confirm: Compute new positions ──────────────────────────────────────────

/**
 * After the user confirms a Compare Rate, computes the final ordinal
 * positions for all affected entries.
 *
 * Returns a map of { animeId → { score, compareRatePosn } } for DB update.
 */
export function computeConfirmedPositions(
  existingEntries: RatedEntry[],
  targetAnimeId: string,
  confirmedScore: number,
): Map<string, { score: number; compareRatePosn: number }> {
  const snapped = snapToQuarterPoint(confirmedScore);

  // Build list with the new score for target
  const allEntries: RatedEntry[] = existingEntries.map((e) =>
    e.animeId === targetAnimeId
      ? { ...e, score: snapped }
      : e
  );

  // If target wasn't in existing, add it (new rating)
  if (!allEntries.some((e) => e.animeId === targetAnimeId)) {
    allEntries.push({
      animeId: targetAnimeId,
      animeTitle: '',
      animeImage: '',
      score: snapped,
      compareRatePosn: null,
    });
  }

  // Sort descending by score
  const sorted = [...allEntries].sort((a, b) => b.score - a.score);

  // Assign positions
  const updates = new Map<string, { score: number; compareRatePosn: number }>();
  sorted.forEach((entry, index) => {
    updates.set(entry.animeId, { score: entry.score, compareRatePosn: index });
  });

  return updates;
}
