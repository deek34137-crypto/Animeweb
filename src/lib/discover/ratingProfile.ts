/**
 * Rating Profile — Score → Discovery Affinity Analysis
 *
 * Analyzes a user's rating history to identify taste dimensions.
 * Output is used by the recommendation scoring engine to boost/penalize
 * candidates based on how well they match what the user already loves.
 */

import { db } from '@/lib/db';
import { JikanAPI } from '@/services/jikan';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface GenreAffinity {
  genreId: string;
  genreName: string;
  avgScore: number;     // User's average score for anime with this genre
  count: number;        // Number of rated anime with this genre
  affinityTier: 'love' | 'like' | 'neutral' | 'dislike';
}

export interface RatingProfile {
  userId: string;
  totalRated: number;
  avgScore: number;
  scoreVariance: number;
  loveThreshold: number;   // Scores above this are "love zone" (typically avg + 0.5σ)
  dislikeThreshold: number; // Scores below this are "dislike zone"
  genreAffinities: GenreAffinity[];
  sweetSpotDescription: string; // Human-readable summary
  computedAt: Date;
}

// ─── Genre ID to Name mapping (Jikan MAL genre IDs) ──────────────────────────

const GENRE_AFFINITY_CATEGORIES: Record<string, 'emotional' | 'cerebral' | 'action' | 'atmospheric'> = {
  // Emotional genres
  '22': 'emotional',  // Romance
  '8':  'emotional',  // Drama
  '36': 'emotional',  // Slice of Life
  '25': 'emotional',  // Shoujo
  '46': 'emotional',  // Award Winning
  // Cerebral genres
  '7':  'cerebral',  // Mystery
  '24': 'cerebral',  // Sci-Fi
  '40': 'cerebral',  // Psychological
  '41': 'cerebral',  // Thriller
  '30': 'cerebral',  // Sports (tactics-heavy)
  // Action genres
  '1':  'action',    // Action
  '27': 'action',    // Shounen
  '2':  'action',    // Adventure
  '38': 'action',    // Military
  '4':  'action',    // Comedy (fast-paced)
  // Atmospheric genres
  '10': 'atmospheric', // Fantasy
  '14': 'atmospheric', // Horror
  '47': 'atmospheric', // Avant Garde
  '19': 'atmospheric', // Music
};

// ─── Core Analysis ────────────────────────────────────────────────────────────

export async function computeRatingProfile(userId: string): Promise<RatingProfile | null> {
  // Fetch all rated entries with genres via Jikan
  const entries = await db.listEntry.findMany({
    where: {
      userId,
      score: { not: null },
      status: { in: ['completed', 'watching', 'rewatching'] },
    },
    select: { animeId: true, score: true },
    orderBy: { score: 'desc' },
  });

  if (entries.length < 5) return null;

  const scores = entries.map((e) => e.score as number);
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((s, v) => s + Math.pow(v - avgScore, 2), 0) / scores.length;
  const stddev = Math.sqrt(variance);

  const loveThreshold = Math.min(9.5, avgScore + stddev * 0.5);
  const dislikeThreshold = Math.max(1.5, avgScore - stddev * 0.5);

  // Fetch genre data for top 50 entries (avoid rate limiting)
  const topEntries = entries.slice(0, 50);
  const genreScoreMap = new Map<string, { name: string; totalScore: number; count: number }>();

  await Promise.allSettled(
    topEntries.map(async (entry) => {
      try {
        const detail = await JikanAPI.getAnimeDetail(parseInt(entry.animeId, 10));
        const genres = detail.data?.genres ?? [];
        genres.forEach((g: { mal_id: number; name: string }) => {
          const id = String(g.mal_id);
          const existing = genreScoreMap.get(id) ?? { name: g.name, totalScore: 0, count: 0 };
          genreScoreMap.set(id, {
            name: g.name,
            totalScore: existing.totalScore + (entry.score as number),
            count: existing.count + 1,
          });
        });
      } catch {
        // skip if Jikan fails for this anime
      }
    })
  );

  const genreAffinities: GenreAffinity[] = Array.from(genreScoreMap.entries())
    .filter(([, v]) => v.count >= 2)
    .map(([genreId, { name, totalScore, count }]) => {
      const avg = totalScore / count;
      const affinityTier: GenreAffinity['affinityTier'] =
        avg >= loveThreshold ? 'love' :
        avg >= avgScore      ? 'like' :
        avg >= dislikeThreshold ? 'neutral' : 'dislike';
      return { genreId, genreName: name, avgScore: avg, count, affinityTier };
    })
    .sort((a, b) => b.avgScore - a.avgScore);

  const topGenre = genreAffinities[0]?.genreName ?? 'anime';
  const sweetSpotDescription = `You score ${topGenre} anime an average of ${
    genreAffinities[0]?.avgScore.toFixed(2) ?? avgScore.toFixed(2)
  }/10 — higher than any other genre.`;

  return {
    userId,
    totalRated: entries.length,
    avgScore: Math.round(avgScore * 100) / 100,
    scoreVariance: Math.round(variance * 100) / 100,
    loveThreshold: Math.round(loveThreshold * 100) / 100,
    dislikeThreshold: Math.round(dislikeThreshold * 100) / 100,
    genreAffinities,
    sweetSpotDescription,
    computedAt: new Date(),
  };
}

/**
 * Get the rating affinity score boost for a candidate anime's genres.
 * Returns a value between -10 and +20 to add to the recommendation score.
 */
export function getRatingAffinityBoost(
  candidateGenreIds: string[],
  genreAffinities: GenreAffinity[],
): { boost: number; reason: string | null } {
  if (candidateGenreIds.length === 0 || genreAffinities.length === 0) {
    return { boost: 0, reason: null };
  }

  const affinityMap = new Map(genreAffinities.map((g) => [g.genreId, g]));
  let totalBoost = 0;
  let topMatchGenre: string | null = null;
  let topMatchTier: GenreAffinity['affinityTier'] | null = null;

  for (const genreId of candidateGenreIds) {
    const affinity = affinityMap.get(genreId);
    if (!affinity) continue;

    const boost =
      affinity.affinityTier === 'love'    ? 20 :
      affinity.affinityTier === 'like'    ? 10 :
      affinity.affinityTier === 'neutral' ? 0  :
      -10; // dislike

    totalBoost += boost;
    if (!topMatchTier || (affinity.affinityTier === 'love' && topMatchTier !== 'love')) {
      topMatchGenre = affinity.genreName;
      topMatchTier = affinity.affinityTier;
    }
  }

  const clampedBoost = Math.max(-10, Math.min(20, totalBoost));
  const reason = topMatchGenre && (topMatchTier === 'love' || topMatchTier === 'like')
    ? `Based on your love of ${topMatchGenre}`
    : null;

  return { boost: clampedBoost, reason };
}
