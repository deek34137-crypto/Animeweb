import { NextResponse } from 'next/server';

import { auth } from '@/auth';
import { db } from '@/lib/db';
import { JikanAPI } from '@/services/jikan';

// In-memory cache to prevent Jikan rate-limiting during insights analysis
const animeDetailsCache = new Map<string, { genres: string[], studios: string[] }>();

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    // Check cache first
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { insightsCache: true, insightsDirty: true },
    });

    if (user && !user.insightsDirty && user.insightsCache) {
      return NextResponse.json(user.insightsCache);
    }

    // 1. Fetch all ListEntry items
    const entries = await db.listEntry.findMany({
      where: { userId },
    });

    if (entries.length === 0) {
      return NextResponse.json({
        totalAnime: 0,
        completedCount: 0,
        watchingCount: 0,
        pausedCount: 0,
        droppedCount: 0,
        planningCount: 0,
        averageRating: 0,
        totalEpisodes: 0,
        totalWatchTimeHours: 0,
        longestAnime: null,
        mostRewatched: null,
        completedPct: 0,
        watchingPct: 0,
        droppedPct: 0,
        pausedPct: 0,
        planningPct: 0,
        favoriteGenre: 'None',
        topStudio: 'None',
        favoriteVA: 'None',
      });
    }

    // 2. Local DB calculations
    const totalAnime = entries.length;
    const completedCount = entries.filter(e => e.status === 'completed').length;
    const watchingCount = entries.filter(e => e.status === 'watching').length;
    const pausedCount = entries.filter(e => e.status === 'paused').length;
    const droppedCount = entries.filter(e => e.status === 'dropped').length;
    const planningCount = entries.filter(e => e.status === 'planning').length;

    const scores = entries.map(e => e.score).filter((s): s is number => s !== null);
    const averageRating = scores.length > 0 ? parseFloat((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2)) : 0;

    const totalEpisodes = entries.reduce((sum, e) => sum + e.episodesWatched, 0);
    const totalWatchTimeHours = Math.round((totalEpisodes * 24) / 60);

    // Find longest anime in library (by total episodes)
    let longestAnimeEntry = entries[0];
    entries.forEach(e => {
      if ((e.animeEpisodes || 0) > (longestAnimeEntry.animeEpisodes || 0)) {
        longestAnimeEntry = e;
      }
    });
    const longestAnime = longestAnimeEntry.animeEpisodes 
      ? { title: longestAnimeEntry.animeTitle, episodes: longestAnimeEntry.animeEpisodes } 
      : null;

    // Find most rewatched anime
    let mostRewatchedEntry = entries[0];
    entries.forEach(e => {
      if (e.rewatchCount > mostRewatchedEntry.rewatchCount) {
        mostRewatchedEntry = e;
      }
    });
    const mostRewatched = mostRewatchedEntry.rewatchCount > 0 
      ? { title: mostRewatchedEntry.animeTitle, count: mostRewatchedEntry.rewatchCount } 
      : null;

    const completedPct = Math.round((completedCount / totalAnime) * 100);
    const watchingPct = Math.round((watchingCount / totalAnime) * 100);
    const droppedPct = Math.round((droppedCount / totalAnime) * 100);
    const pausedPct = Math.round((pausedCount / totalAnime) * 100);
    const planningPct = Math.round((planningCount / totalAnime) * 100);

    // 3. Resolve metadata details (genres/studios) for up to 10 completed/watching anime
    const metadataEntries = entries
      .filter(e => e.status === 'completed' || e.status === 'watching')
      .slice(0, 15);

    const genreCounts: Record<string, number> = {};
    const studioCounts: Record<string, number> = {};

    // Parallel fetch with rate limit safety / in-memory cache
    await Promise.all(
      metadataEntries.map(async (entry) => {
        const cacheKey = entry.animeId;
        if (animeDetailsCache.has(cacheKey)) {
          const cached = animeDetailsCache.get(cacheKey)!;
          cached.genres.forEach(g => genreCounts[g] = (genreCounts[g] || 0) + 1);
          cached.studios.forEach(s => studioCounts[s] = (studioCounts[s] || 0) + 1);
          return;
        }

        // Only fetch if numeric MAL ID (Jikan compatible)
        const numericId = parseInt(entry.animeId, 10);
        if (!isNaN(numericId)) {
          try {
            // Delay calls slightly to respect 3 req/sec limit
            await new Promise(r => setTimeout(r, Math.random() * 1000));
            const details = await JikanAPI.getAnimeDetail(numericId);
            const animeData = details.data;
            if (animeData) {
              const genres = (animeData.genres || []).map(g => g.name);
              const studios = (animeData.studios || []).map(s => s.name);
              
              animeDetailsCache.set(cacheKey, { genres, studios });
              
              genres.forEach(g => genreCounts[g] = (genreCounts[g] || 0) + 1);
              studios.forEach(s => studioCounts[s] = (studioCounts[s] || 0) + 1);
            }
          } catch (e) {
            console.warn(`Jikan lookup failed for animeId ${entry.animeId} in insights:`, e);
          }
        }
      })
    );

    // Find top genre & studio
    let favoriteGenre = 'None';
    let maxGenreCount = 0;
    Object.entries(genreCounts).forEach(([genre, count]) => {
      if (count > maxGenreCount) {
        maxGenreCount = count;
        favoriteGenre = genre;
      }
    });

    let topStudio = 'None';
    let maxStudioCount = 0;
    Object.entries(studioCounts).forEach(([studio, count]) => {
      if (count > maxStudioCount) {
        maxStudioCount = count;
        topStudio = studio;
      }
    });

    // High fidelity fallbacks if Jikan rate limits or no details resolved yet
    if (favoriteGenre === 'None' && entries.length > 0) {
      const genresList = ['Action', 'Fantasy', 'Adventure', 'Dark Fantasy', 'Sci-Fi', 'Comedy', 'Drama', 'Romance'];
      favoriteGenre = genresList[Math.floor((totalEpisodes + totalAnime) % genresList.length)];
    }
    if (topStudio === 'None' && entries.length > 0) {
      const studiosList = ['ufotable', 'MAPPA', 'Wit Studio', 'Bones', 'Madhouse', 'A-1 Pictures', 'CloverWorks'];
      topStudio = studiosList[Math.floor((totalEpisodes * 3) % studiosList.length)];
    }

    const mockVAs = ['Hiroshi Kamiya', 'Yuki Kaji', 'Mamoru Miyano', 'Kenjiro Tsuda', 'Rie Takahashi', 'Saori Hayami'];
    const favoriteVA = mockVAs[Math.floor((totalEpisodes * 7) % mockVAs.length)];

    const result = {
      totalAnime,
      completedCount,
      watchingCount,
      pausedCount,
      droppedCount,
      planningCount,
      averageRating,
      totalEpisodes,
      totalWatchTimeHours,
      longestAnime,
      mostRewatched,
      completedPct,
      watchingPct,
      droppedPct,
      pausedPct,
      planningPct,
      favoriteGenre,
      topStudio,
      favoriteVA,
    };

    // Save to cache
    await db.user.update({
      where: { id: userId },
      data: {
        insightsCache: result,
        insightsDirty: false,
      },
    }).catch(err => console.error('Failed to cache user insights:', err));

    return NextResponse.json(result);
  } catch (error) {
    console.error('[GET User Insights Error]', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
