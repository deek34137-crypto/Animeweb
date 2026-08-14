import { db } from '@/lib/db';
import { PipelineContext, RecommendationCandidate } from './types';

export async function filterCandidates(
  candidates: RecommendationCandidate[],
  context: PipelineContext
): Promise<RecommendationCandidate[]> {
  const { userLibrary } = context;

  // 1. Create a set of anime IDs already in the user's library
  const librarySet = new Set(userLibrary.map((entry) => entry.animeId));

  // 2. Exclude library items and invalid entries
  const filtered1 = candidates.filter((c) => {
    // Exclude if already in library
    if (librarySet.has(c.animeId)) return false;
    // Exclude if no valid id
    if (!c.animeId) return false;
    return true;
  });

  if (filtered1.length === 0) return [];

  // 3. Franchise Penalty: Check for prequels
  // Find all prequels for the remaining candidates in a single query
  const candidateIds = filtered1.map((c) => c.animeId);
  const relations = await db.animeRelations.findMany({
    where: {
      animeId: { in: candidateIds },
      relationType: 'PREQUEL',
    },
  });

  // Map each candidate to its list of prequels
  const prequelMap = new Map<string, string[]>();
  relations.forEach((rel) => {
    const list = prequelMap.get(rel.animeId) || [];
    list.push(rel.relatedAnimeId);
    prequelMap.set(rel.animeId, list);
  });

  // Filter out candidates if they have prequels and the user hasn't watched them
  return filtered1.filter((c) => {
    const prequels = prequelMap.get(c.animeId);
    if (!prequels || prequels.length === 0) return true;

    // Check if the user has watched at least one prequel in their library (watching or completed)
    const hasWatchedPrequel = prequels.some((prequelId) => {
      const entry = userLibrary.find((e) => e.animeId === prequelId);
      return entry && (entry.status === 'completed' || entry.status === 'watching');
    });

    // If candidate has a prequel, but user hasn't watched it, filter it out
    return hasWatchedPrequel;
  });
}
