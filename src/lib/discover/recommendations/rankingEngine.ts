import { ScoredCandidate } from './types';

export function rankAndBalance(
  candidates: ScoredCandidate[],
  limit = 20,
  maxPercentagePerGenre = 0.35
): ScoredCandidate[] {
  // Sort candidates by final score in descending order
  const sorted = [...candidates].sort((a, b) => b.finalScore - a.finalScore);

  const selected: ScoredCandidate[] = [];
  const genreCounts: Record<string, number> = {};
  const maxLimitPerGenre = Math.ceil(limit * maxPercentagePerGenre);

  // Keep a pool of items we skipped to fall back to if we don't hit the limit
  const skippedPool: ScoredCandidate[] = [];

  for (const item of sorted) {
    if (selected.length >= limit) break;

    // Check if any of the candidate's genres have already reached the cap limit
    let exceedsLimit = false;
    for (const g of item.genres) {
      const currentCount = genreCounts[g.id] || 0;
      if (currentCount >= maxLimitPerGenre) {
        exceedsLimit = true;
        break;
      }
    }

    if (exceedsLimit) {
      skippedPool.push(item);
      continue;
    }

    // Add candidate to selected list and increment genre counts
    selected.push(item);
    item.genres.forEach((g) => {
      genreCounts[g.id] = (genreCounts[g.id] || 0) + 1;
    });
  }

  // Fallback: If we didn't fill the recommended quota, fill with highest rated skipped items
  for (const item of skippedPool) {
    if (selected.length >= limit) break;
    selected.push(item);
  }

  return selected;
}
