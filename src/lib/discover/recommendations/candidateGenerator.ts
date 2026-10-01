import { db } from '@/lib/db';
import { JikanAPI } from '@/services/jikan';
import { PipelineContext, RecommendationCandidate } from './types';

// Maximum age constants
const STANDARD_CACHE_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days
const TRENDING_CACHE_TTL = 7 * 24 * 60 * 60 * 1000;  // 7 days for popular/trending titles

export async function generateCandidates(
  seeds: string[],
  context: PipelineContext
): Promise<RecommendationCandidate[]> {
  const candidatesMap = new Map<string, RecommendationCandidate>();

  for (const seedId of seeds) {
    const seedInt = parseInt(seedId, 10);
    if (isNaN(seedInt)) continue;

    // 1. Resolve seed user score details
    const userLibraryEntry = context.userLibrary.find((e) => e.animeId === seedId);
    const seedScore = userLibraryEntry?.score ?? undefined;

    // 2. Fetch from AnimeRecommendationCache
    const cacheEntries = await db.animeRecommendationCache.findMany({
      where: { animeId: seedId },
    });

    // Check if the seed is a trending/popular title
    const seedCache = await db.animeCache.findUnique({
      where: { animeId: seedId },
    });

    const isTrending = seedCache ? (seedCache.popularity || 999999) <= 200 : false;
    const cacheTTL = isTrending ? TRENDING_CACHE_TTL : STANDARD_CACHE_TTL;
    const isExpired =
      cacheEntries.length > 0 &&
      Date.now() - cacheEntries[0].updatedAt.getTime() > cacheTTL;

    let rawRecommendations: any[] = [];

    if (cacheEntries.length === 0 || isExpired) {
      console.log(`[Candidate Gen] Cache miss or expired for seed ${seedId}. Fetching from Jikan...`);
      try {
        const jikanRes = await JikanAPI.getAnimeRecommendations(seedInt);
        rawRecommendations = jikanRes.data || [];

        // Save recommendations to database cache
        const now = new Date();
        
        // 3. Clear old cache entries
        await db.animeRecommendationCache.deleteMany({
          where: { animeId: seedId },
        });

        // 4. Save new cache entries and populate basic AnimeCache details
        for (const rec of rawRecommendations) {
          const recAnimeId = String(rec.entry.mal_id);
          
          await db.animeRecommendationCache.create({
            data: {
              animeId: seedId,
              recommendedAnimeId: recAnimeId,
              votes: rec.votes || 1,
              updatedAt: now,
            },
          });

          // Insert basic metadata if it doesn't exist
          await db.animeCache.upsert({
            where: { animeId: recAnimeId },
            create: {
              animeId: recAnimeId,
              title: rec.entry.title,
              poster:
                rec.entry.images?.jpg?.large_image_url ||
                rec.entry.images?.jpg?.image_url ||
                '',
              score: 0.0,
              updatedAt: now,
            },
            update: {}, // Keep existing metadata intact
          });
        }
      } catch (err) {
        console.error(`[Candidate Gen] Failed to fetch Jikan recommendations for seed ${seedId}:`, err);
        // Fallback to expired cache if Jikan fails
        rawRecommendations = cacheEntries.map((c) => ({
          entry: { mal_id: parseInt(c.recommendedAnimeId, 10), title: '', images: {} },
          votes: c.votes,
        }));
      }
    } else {
      // Use cached results
      rawRecommendations = cacheEntries.map((c) => ({
        entry: { mal_id: parseInt(c.recommendedAnimeId, 10), title: '', images: {} },
        votes: c.votes,
      }));
    }

    // 5. Build full candidate records by querying AnimeCache details
    const candidateIds = rawRecommendations.map((r) => String(r.entry.mal_id));
    const cachedDetails = await db.animeCache.findMany({
      where: { animeId: { in: candidateIds } },
      include: {
        genres: { include: { genre: true } },
        studios: { include: { studio: true } },
        airingSchedule: true,
      },
    });

    const detailsMap = new Map<string, typeof cachedDetails[0]>();
    cachedDetails.forEach((d) => detailsMap.set(d.animeId, d));

    rawRecommendations.forEach((rec) => {
      const recId = String(rec.entry.mal_id);
      const details = detailsMap.get(recId);

      const title = details?.title || rec.entry.title || 'Unknown Title';
      const poster =
        details?.poster ||
        rec.entry.images?.jpg?.large_image_url ||
        rec.entry.images?.jpg?.image_url ||
        '';

      const genres =
        details?.genres.map((g) => ({
          id: g.genre.id,
          name: g.genre.name,
        })) || [];

      const studios =
        details?.studios.map((s) => ({
          id: s.studio.id,
          name: s.studio.name,
        })) || [];

      const existing = candidatesMap.get(recId);
      const totalVotes = (existing?.votes || 0) + (rec.votes || 1);

      candidatesMap.set(recId, {
        animeId: recId,
        title,
        poster,
        genres,
        studios,
        score: details?.score || 0.0,
        popularity: details?.popularity || 999999,
        episodes: details?.episodes || 0,
        airing: !!details?.airingSchedule,
        seedAnimeId: seedId,
        seedScore,
        votes: totalVotes,
      });
    });
  }

  return Array.from(candidatesMap.values());
}
