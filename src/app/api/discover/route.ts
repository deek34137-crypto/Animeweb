import { NextResponse } from 'next/server';
import { JikanAPI } from '@/services/jikan';
import { db } from '@/lib/db';
import { isHiddenGem } from '@/lib/discover/hiddenGems';


export async function GET() {
  try {
    // Fetch parallel lists from Jikan with caching (respects rate limits via cachedFetch)
    const [trendingRes, topAiringRes, popularWeeklyRes] = await Promise.all([
      JikanAPI.getTrendingAnime(1).catch(() => ({ data: [] })),
      JikanAPI.getTopAiringAnime(1).catch(() => ({ data: [] })),
      JikanAPI.getTopRatedAnime(1).catch(() => ({ data: [] })),
    ]);

    const trending = (trendingRes.data || []).slice(0, 10);
    const topAiring = (topAiringRes.data || []).slice(0, 10);
    const popularWeekly = (popularWeeklyRes.data || []).slice(0, 10);

    // Save fetched lists to local AnimeCache for future local queries
    const allFetched = [...trending, ...topAiring, ...popularWeekly];
    const now = new Date();

    for (const anime of allFetched) {
      const animeId = String(anime.mal_id);
      
      // Upsert basic cache data
      await db.animeCache.upsert({
        where: { animeId },
        create: {
          animeId,
          title: anime.title,
          poster: anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url || '',
          score: anime.score || 0.0,
          type: anime.type,
          episodes: anime.episodes,
          popularity: anime.popularity,
          members: anime.members,
          favorites: anime.favorites,
          updatedAt: now,
        },
        update: {
          score: anime.score || 0.0,
          popularity: anime.popularity,
          members: anime.members,
          favorites: anime.favorites,
          updatedAt: now,
        },
      });

      // Insert genres and studios normalized relations
      if (anime.genres) {
        for (const g of anime.genres) {
          const genreId = String(g.mal_id);
          
          // Deduplicate by name unique constraint
          const existingGenreByName = await db.genre.findUnique({
            where: { name: g.name },
          });

          let targetGenreId = genreId;
          if (existingGenreByName) {
            targetGenreId = existingGenreByName.id;
          } else {
            await db.genre.upsert({
              where: { id: genreId },
              create: { id: genreId, name: g.name },
              update: { name: g.name },
            }).catch(async () => {
              const fallback = await db.genre.findUnique({ where: { name: g.name } });
              if (fallback) targetGenreId = fallback.id;
            });
          }

          await db.animeGenre.upsert({
            where: { animeId_genreId: { animeId, genreId: targetGenreId } },
            create: { animeId, genreId: targetGenreId },
            update: {},
          });
        }
      }

      if (anime.studios) {
        for (const s of anime.studios) {
          const studioId = String(s.mal_id);

          // Deduplicate by name unique constraint
          const existingStudioByName = await db.studio.findUnique({
            where: { name: s.name },
          });

          let targetStudioId = studioId;
          if (existingStudioByName) {
            targetStudioId = existingStudioByName.id;
          } else {
            await db.studio.upsert({
              where: { id: studioId },
              create: { id: studioId, name: s.name },
              update: { name: s.name },
            }).catch(async () => {
              const fallback = await db.studio.findUnique({ where: { name: s.name } });
              if (fallback) targetStudioId = fallback.id;
            });
          }

          await db.animeStudio.upsert({
            where: { animeId_studioId: { animeId, studioId: targetStudioId } },
            create: { animeId, studioId: targetStudioId },
            update: {},
          });
        }
      }
    }

    // Load hidden gems from local cache
    const hiddenGemsCache = await db.animeCache.findMany({
      where: {
        score: { gte: 8.0 },
        popularity: { gte: 500 },
        members: { gte: 1000 },
      },
      take: 10,
    });

    // If cache does not contain enough items, query extra pages of Jikan Top Rated and filter
    if (hiddenGemsCache.length < 4) {
      try {
        const topRated2 = await JikanAPI.getTopRatedAnime(2);
        const filteredGems = (topRated2.data || []).filter(isHiddenGem);
        
        // Cache the newly discovered hidden gems
        for (const anime of filteredGems) {
          const animeId = String(anime.mal_id);
          const gemRecord = await db.animeCache.upsert({
            where: { animeId },
            create: {
              animeId,
              title: anime.title,
              poster: anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url || '',
              score: anime.score || 0.0,
              type: anime.type,
              episodes: anime.episodes,
              popularity: anime.popularity,
              members: anime.members,
              favorites: anime.favorites,
              updatedAt: now,
            },
            update: {},
          });
          hiddenGemsCache.push(gemRecord);
        }
      } catch (gemErr) {
        console.error('Failed to resolve additional hidden gems from Jikan:', gemErr);
      }
    }

    return NextResponse.json({
      trending,
      topAiring,
      popularWeekly,
      hiddenGems: hiddenGemsCache.slice(0, 10),
    });
  } catch (error: any) {
    console.error('Discover Hub API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
