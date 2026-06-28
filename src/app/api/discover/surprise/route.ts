import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { JikanAPI } from '@/services/jikan';


export async function GET() {
  try {
    const rand = Math.random();
    let selectedAnime: any = null;

    if (rand < 0.40) {
      // 40% High Rated
      const highRated = await db.animeCache.findMany({
        where: { score: { gte: 8.2 } },
        take: 20,
      });
      if (highRated.length > 0) {
        selectedAnime = highRated[Math.floor(Math.random() * highRated.length)];
      }
    } else if (rand < 0.70) {
      // 30% Underwatched / Hidden Gem
      const hiddenGems = await db.animeCache.findMany({
        where: {
          score: { gte: 8.0 },
          popularity: { gte: 500 },
        },
        take: 20,
      });
      if (hiddenGems.length > 0) {
        selectedAnime = hiddenGems[Math.floor(Math.random() * hiddenGems.length)];
      }
    } else if (rand < 0.90) {
      // 20% Seasonal Airing
      try {
        const seasonal = await JikanAPI.getSeasonalAnime(1);
        if (seasonal?.data?.length > 0) {
          const picked = seasonal.data[Math.floor(Math.random() * seasonal.data.length)];
          selectedAnime = {
            animeId: String(picked.mal_id),
            title: picked.title,
            poster: picked.images?.jpg?.large_image_url || picked.images?.jpg?.image_url || '',
            score: picked.score || 0.0,
          };
        }
      } catch (e) {
        console.error('Failed to select seasonal anime for surprise, falling back:', e);
      }
    }

    // 10% Wildcard or Fallback (completely random popular anime from cached data)
    if (!selectedAnime) {
      const wildcard = await db.animeCache.findMany({
        where: { popularity: { lte: 1000 } },
        take: 50,
      });
      if (wildcard.length > 0) {
        selectedAnime = wildcard[Math.floor(Math.random() * wildcard.length)];
      }
    }

    // Double fallback to standard FMAB if db is empty
    if (!selectedAnime) {
      selectedAnime = {
        animeId: '5114',
        title: 'Fullmetal Alchemist: Brotherhood',
        poster: 'https://cdn.myanimelist.net/images/anime/1223/96541.jpg',
        score: 9.1,
      };
    }

    return NextResponse.json(selectedAnime);
  } catch (error: any) {
    console.error('Surprise Me API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
