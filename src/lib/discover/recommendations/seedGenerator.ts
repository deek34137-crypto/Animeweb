import { db } from '@/lib/db';
import { PipelineContext } from './types';

export async function generateSeeds(context: PipelineContext, totalSeeds = 5): Promise<string[]> {
  const { userLibrary } = context;

  // Filter for anime the user liked (score >= 7 or favorited)
  const likedEntries = userLibrary.filter(
    (entry) => (entry.score && entry.score >= 7.0) || entry.isFavorite || entry.isTopFavorite
  );

  const candidateEntries = likedEntries.length > 0 ? likedEntries : userLibrary;

  if (candidateEntries.length === 0) {
    return []; // Cold start
  }

  const animeIds = candidateEntries.map((e) => e.animeId);

  // Load genres from AnimeCache to analyze user profile preference ratios
  const cachedDetails = await db.animeCache.findMany({
    where: { animeId: { in: animeIds } },
    include: {
      genres: {
        include: {
          genre: true,
        },
      },
    },
  });

  const animeGenreMap = new Map<string, string[]>();
  const genreFrequency: Record<string, number> = {};

  cachedDetails.forEach((anime) => {
    const genres = anime.genres.map((g) => g.genre.name);
    animeGenreMap.set(anime.animeId, genres);
    genres.forEach((genreName) => {
      genreFrequency[genreName] = (genreFrequency[genreName] || 0) + 1;
    });
  });

  // Calculate total genre weight
  const totalGenreCounts = Object.values(genreFrequency).reduce((a, b) => a + b, 0);

  const seeds: string[] = [];
  const selectedAnimeIds = new Set<string>();

  if (totalGenreCounts === 0 || cachedDetails.length === 0) {
    // Fallback: Pick top 5 overall highest rated user anime if cache is empty
    const fallbackSorted = [...candidateEntries].sort((a, b) => (b.score || 0) - (a.score || 0));
    return fallbackSorted.slice(0, totalSeeds).map((e) => e.animeId);
  }

  // Calculate dynamic seed allocations per genre
  const genreAllocations: { genre: string; count: number }[] = Object.entries(genreFrequency)
    .map(([genre, freq]) => {
      const ratio = freq / totalGenreCounts;
      const count = Math.max(1, Math.round(ratio * totalSeeds));
      return { genre, count };
    })
    .sort((a, b) => b.count - a.count);

  // Group candidate entries by score for prioritization
  const entriesSortedByRating = [...candidateEntries].sort((a, b) => {
    const scoreA = a.score || 0;
    const scoreB = b.score || 0;
    return scoreB - scoreA;
  });

  // Allocate seeds dynamically
  for (const allocation of genreAllocations) {
    if (seeds.length >= totalSeeds) break;
    
    let allocatedForThisGenre = 0;
    for (const entry of entriesSortedByRating) {
      if (seeds.length >= totalSeeds || allocatedForThisGenre >= allocation.count) break;
      if (selectedAnimeIds.has(entry.animeId)) continue;

      const genres = animeGenreMap.get(entry.animeId) || [];
      if (genres.includes(allocation.genre)) {
        seeds.push(entry.animeId);
        selectedAnimeIds.add(entry.animeId);
        allocatedForThisGenre++;
      }
    }
  }

  // If we didn't fill the total seeds due to overlapping genres, fill with highest rated remaining
  for (const entry of entriesSortedByRating) {
    if (seeds.length >= totalSeeds) break;
    if (!selectedAnimeIds.has(entry.animeId)) {
      seeds.push(entry.animeId);
      selectedAnimeIds.add(entry.animeId);
    }
  }

  return seeds;
}
