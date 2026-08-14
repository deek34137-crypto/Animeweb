import { db } from '@/lib/db';
import { JikanAPI } from '@/services/jikan';
import { generateSeeds } from './seedGenerator';
import { generateCandidates } from './candidateGenerator';
import { filterCandidates } from './candidateFilter';
import { scoreCandidates } from './scoringEngine';
import { rankAndBalance } from './rankingEngine';
import { PipelineContext, ScoredCandidate } from './types';

export const RECOMMENDATION_ALGORITHM_VERSION = 1;

// List of popular, highly rated beginner anime IDs for Cold Start fallbacks
const BEGINNER_ANIME_IDS = [
  '1535',  // Death Note
  '5114',  // Fullmetal Alchemist: Brotherhood
  '16498', // Attack on Titan
  '38000', // Demon Slayer: Kimetsu no Yaiba
  '30276', // One Punch Man
  '20583', // Haikyu!!
  '31964', // My Hero Academia
  '40748', // Jujutsu Kaisen
];

export async function calculateRecommendations(userId: string): Promise<void> {
  console.log(`[Pipeline] Beginning recommendation calculation for user ${userId}`);

  // 1. Fetch user's watch library
  const userLibrary = await db.listEntry.findMany({
    where: { userId },
  });

  const context: PipelineContext = {
    userId,
    algorithmVersion: RECOMMENDATION_ALGORITHM_VERSION,
    userLibrary,
    userStats: {
      favoriteGenreIds: new Set(),
      favoriteStudioIds: new Set(),
    },
  };

  let recommendedCandidates: ScoredCandidate[] = [];

  if (userLibrary.length < 2) {
    // --- COLD START STRATEGY ---
    console.log(`[Pipeline] Cold start trigger for user ${userId}. Loading beginner fallback list...`);
    recommendedCandidates = await getColdStartRecommendations(context);
  } else {
    // --- STANDARD PIPELINE STAGES ---
    
    // Compute user's favorite genres/studios from cached library details
    context.userStats = await computeUserStats(userLibrary);

    // Stage 1: Seed Selection
    const seeds = await generateSeeds(context, 5);
    console.log(`[Pipeline] Generated seeds for user ${userId}:`, seeds);

    if (seeds.length === 0) {
      recommendedCandidates = await getColdStartRecommendations(context);
    } else {
      // Stage 2: Candidate Generation
      const candidates = await generateCandidates(seeds, context);
      console.log(`[Pipeline] Generated ${candidates.length} candidates.`);

      // Stage 3: Candidate Filtering
      const filtered = await filterCandidates(candidates, context);
      console.log(`[Pipeline] Filtered down to ${filtered.length} candidates.`);

      // Stage 4: Scoring Engine
      const scored = await scoreCandidates(filtered, context);

      // Stage 5: Ranking Engine & Category Balancing
      recommendedCandidates = rankAndBalance(scored, 20, 0.35);
    }
  }

  // --- PERSISTENCE STAGE ---
  const now = new Date();
  
  // 1. Ensure all recommended anime exist in AnimeCache
  for (const rec of recommendedCandidates) {
    await db.animeCache.upsert({
      where: { animeId: rec.animeId },
      create: {
        animeId: rec.animeId,
        title: rec.title,
        poster: rec.poster,
        score: rec.score || 0.0,
        updatedAt: now,
      },
      update: {},
    });
  }

  // 2. Delete old recommendations and insert new ones
  await db.userRecommendation.deleteMany({
    where: { userId },
  });

  if (recommendedCandidates.length > 0) {
    await db.userRecommendation.createMany({
      data: recommendedCandidates.map((rec) => ({
        userId,
        animeId: rec.animeId,
        score: rec.finalScore,
        scoreBreakdown: rec.scoreBreakdown as any,
        reasonData: rec.reasons as any,
        algorithmVersion: RECOMMENDATION_ALGORITHM_VERSION,
        updatedAt: now,
      })),
    });
  }

  console.log(`[Pipeline] Successfully saved ${recommendedCandidates.length} recommendations for user ${userId}`);
}

async function computeUserStats(userLibrary: any[]) {
  const animeIds = userLibrary.map((e) => e.animeId);
  const cachedAnime = await db.animeCache.findMany({
    where: { animeId: { in: animeIds } },
    include: {
      genres: { include: { genre: true } },
      studios: { include: { studio: true } },
    },
  });

  const genreCounts: Record<string, number> = {};
  const studioCounts: Record<string, number> = {};

  cachedAnime.forEach((anime) => {
    // Count occurrences weighted by user score if available
    const entry = userLibrary.find((e) => e.animeId === anime.animeId);
    const weight = entry && entry.score ? entry.score : 5.0;

    anime.genres.forEach((g) => {
      genreCounts[g.genre.id] = (genreCounts[g.genre.id] || 0) + weight;
    });
    anime.studios.forEach((s) => {
      studioCounts[s.studio.id] = (studioCounts[s.studio.id] || 0) + weight;
    });
  });

  const favoriteGenreIds = new Set(
    Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map((entry) => entry[0])
  );

  const favoriteStudioIds = new Set(
    Object.entries(studioCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map((entry) => entry[0])
  );

  return { favoriteGenreIds, favoriteStudioIds };
}

async function getColdStartRecommendations(context: PipelineContext): Promise<ScoredCandidate[]> {
  const now = new Date();
  
  // Try fetching fresh trending items from DB/Jikan first, otherwise use fallback ids
  let coldIds = [...BEGINNER_ANIME_IDS];
  try {
    const trending = await JikanAPI.getTrendingAnime(1);
    if (trending?.data?.length > 0) {
      coldIds = trending.data.slice(0, 10).map((a) => String(a.mal_id));
    }
  } catch (e) {
    console.error('[Pipeline] Failed to fetch live trending list, using hardcoded fallbacks:', e);
  }

  // Pre-seed AnimeCache for beginner fallback list
  const candidates: ScoredCandidate[] = [];
  
  for (const id of coldIds) {
    // Exclude if already in user library
    if (context.userLibrary.some((e) => e.animeId === id)) continue;

    let cached = await db.animeCache.findUnique({
      where: { animeId: id },
      include: {
        genres: { include: { genre: true } },
        studios: { include: { studio: true } },
      },
    });

    if (!cached) {
      try {
        const detail = await JikanAPI.getAnimeDetail(parseInt(id, 10));
        if (detail?.data) {
          cached = await db.animeCache.create({
            data: {
              animeId: id,
              title: detail.data.title,
              poster:
                detail.data.images?.jpg?.large_image_url ||
                detail.data.images?.jpg?.image_url ||
                '',
              score: detail.data.score || 8.0,
              type: detail.data.type,
              episodes: detail.data.episodes,
              popularity: detail.data.popularity,
              members: detail.data.members,
              favorites: detail.data.favorites,
              updatedAt: now,
            },
            include: {
              genres: { include: { genre: true } },
              studios: { include: { studio: true } },
            },
          });
        }
      } catch (err) {
        console.error(`[Pipeline] Failed to seed details for beginner anime ${id}:`, err);
      }
    }

    if (cached) {
      candidates.push({
        animeId: id,
        title: cached.title,
        poster: cached.poster,
        genres: cached.genres.map((g) => ({ id: g.genre.id, name: g.genre.name })),
        studios: cached.studios.map((s) => ({ id: s.studio.id, name: s.studio.name })),
        score: cached.score,
        popularity: cached.popularity || 0,
        episodes: cached.episodes || 0,
        airing: false,
        votes: 10,
        finalScore: 85, // Static high score for cold start items
        scoreBreakdown: {
          genre: 0,
          studio: 0,
          recommendations: 40,
          popularity: 15,
          rating: 20,
          recency: 0,
          completion: 10,
        },
        reasons: [{ type: 'COLD_START' }],
      });
    }
  }

  return candidates.slice(0, 10);
}
