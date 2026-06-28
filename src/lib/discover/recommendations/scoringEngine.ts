import { isHiddenGem } from '../hiddenGems';
import { PipelineContext, RecommendationCandidate, ScoredCandidate, ExplanationReason } from './types';

export async function scoreCandidates(
  candidates: RecommendationCandidate[],
  context: PipelineContext
): Promise<ScoredCandidate[]> {
  const { favoriteGenreIds, favoriteStudioIds } = context.userStats;

  return candidates.map((candidate) => {
    // 1. Recommendations Weight (votes) - Max 40
    // Jikan votes are usually small (1 to 50+). Scale votes logarithmically or linearly.
    const recommendationsScore = Math.min(40, Math.round(Math.log2(candidate.votes + 1) * 8));

    // 2. Genre Boost - Max 25
    let genreScore = 0;
    const matchingGenres: { id: string; name: string }[] = [];
    
    if (candidate.genres.length > 0) {
      candidate.genres.forEach((g) => {
        if (favoriteGenreIds.has(g.id)) {
          matchingGenres.push(g);
        }
      });
      const matchRatio = matchingGenres.length / Math.max(1, candidate.genres.length);
      genreScore = Math.round(matchRatio * 25);
    }

    // 3. Studio Boost - Max 10
    let studioScore = 0;
    const matchingStudios: { id: string; name: string }[] = [];
    
    candidate.studios.forEach((s) => {
      if (favoriteStudioIds.has(s.id)) {
        matchingStudios.push(s);
        studioScore = 10; // Max out if any studio matches
      }
    });

    // 4. Rating / Score Boost - Max 13
    const ratingScore = Math.round((candidate.score / 10) * 13);

    // 5. Recency Bonus - Max 10
    const recencyScore = candidate.airing ? 10 : 0;

    // 6. Completion Probability - Max 5
    let completionScore = 0;
    if (candidate.episodes > 0) {
      if (candidate.episodes <= 13) {
        completionScore = 5;
      } else if (candidate.episodes <= 26) {
        completionScore = 4;
      } else if (candidate.episodes <= 50) {
        completionScore = 2;
      }
    } else {
      completionScore = 3; // Unknown episode count gets middle rating
    }

    // 7. Popularity Penalty - Max -10
    let popularityPenalty = 0;
    // Check if it's a hidden gem first (bypass penalty)
    const isGem = isHiddenGem({
      score: candidate.score,
      popularity: candidate.popularity,
      members: candidate.popularity, // Use popularity as members placeholder or check candidate
    });

    if (!isGem) {
      if (candidate.popularity > 5000) {
        popularityPenalty = -10; // Very obscure
      } else if (candidate.popularity > 2000) {
        popularityPenalty = -5;  // Moderately obscure
      }
    }

    // Calculate Raw Score
    const rawScore =
      recommendationsScore +
      genreScore +
      studioScore +
      ratingScore +
      recencyScore +
      completionScore +
      popularityPenalty;

    // Normalize to 0-100
    // Maximum possible positive points = 40 + 25 + 10 + 13 + 10 + 5 = 103
    const maxRawScore = 103;
    const finalScore = Math.max(0, Math.min(100, Math.round((rawScore / maxRawScore) * 100)));

    // Generate Reasons (Title-Free, ID-Only)
    const reasons: ExplanationReason[] = [];

    if (candidate.seedAnimeId) {
      reasons.push({
        type: 'SIMILAR_TO',
        seedAnimeId: candidate.seedAnimeId,
        seedScore: candidate.seedScore,
      });
    }

    matchingGenres.slice(0, 2).forEach((g) => {
      reasons.push({
        type: 'SAME_GENRE',
        genreId: g.id,
        genreName: g.name,
      });
    });

    matchingStudios.slice(0, 1).forEach((s) => {
      reasons.push({
        type: 'SAME_STUDIO',
        studioId: s.id,
        studioName: s.name,
      });
    });

    if (candidate.votes >= 5) {
      reasons.push({
        type: 'COMMUNITY_RECOMMENDED',
      });
    }

    return {
      ...candidate,
      finalScore,
      scoreBreakdown: {
        genre: genreScore,
        studio: studioScore,
        recommendations: recommendationsScore,
        popularity: popularityPenalty,
        rating: ratingScore,
        recency: recencyScore,
        completion: completionScore,
      },
      reasons,
    };
  });
}
