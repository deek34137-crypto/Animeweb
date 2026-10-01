import { NextResponse } from 'next/server';
import { JikanAPI } from '@/services/jikan';

export async function GET() {
  try {
    const rand = Math.random();
    let selectedAnime: any = null;

    if (rand < 0.40) {
      // 40% High Rated (pages 1 to 5)
      try {
        const randomPage = Math.floor(Math.random() * 5) + 1;
        const res = await JikanAPI.getTopRatedAnime(randomPage);
        if (res?.data?.length > 0) {
          const picked = res.data[Math.floor(Math.random() * res.data.length)];
          selectedAnime = {
            animeId: String(picked.mal_id),
            title: picked.title,
            poster: picked.images?.jpg?.large_image_url || picked.images?.jpg?.image_url || '',
            score: picked.score || 0.0,
          };
        }
      } catch (e) {
        console.error('Failed to select high rated anime for surprise:', e);
      }
    } else if (rand < 0.70) {
      // 30% Underwatched / Hidden Gems (pages 5 to 15)
      try {
        const randomPage = Math.floor(Math.random() * 11) + 5;
        const res = await JikanAPI.getTopRatedAnime(randomPage);
        if (res?.data?.length > 0) {
          const picked = res.data[Math.floor(Math.random() * res.data.length)];
          selectedAnime = {
            animeId: String(picked.mal_id),
            title: picked.title,
            poster: picked.images?.jpg?.large_image_url || picked.images?.jpg?.image_url || '',
            score: picked.score || 0.0,
          };
        }
      } catch (e) {
        console.error('Failed to select hidden gems for surprise:', e);
      }
    } else if (rand < 0.90) {
      // 20% Seasonal Airing
      try {
        const res = await JikanAPI.getSeasonalAnime(1);
        if (res?.data?.length > 0) {
          const picked = res.data[Math.floor(Math.random() * res.data.length)];
          selectedAnime = {
            animeId: String(picked.mal_id),
            title: picked.title,
            poster: picked.images?.jpg?.large_image_url || picked.images?.jpg?.image_url || '',
            score: picked.score || 0.0,
          };
        }
      } catch (e) {
        console.error('Failed to select seasonal anime for surprise:', e);
      }
    }

    // 10% Wildcard or Fallback (random popular page 1 to 20)
    if (!selectedAnime) {
      try {
        const randomPage = Math.floor(Math.random() * 20) + 1;
        const res = await JikanAPI.getTrendingAnime(randomPage);
        if (res?.data?.length > 0) {
          const picked = res.data[Math.floor(Math.random() * res.data.length)];
          selectedAnime = {
            animeId: String(picked.mal_id),
            title: picked.title,
            poster: picked.images?.jpg?.large_image_url || picked.images?.jpg?.image_url || '',
            score: picked.score || 0.0,
          };
        }
      } catch (e) {
        console.error('Failed to select wildcard for surprise:', e);
      }
    }

    // Double fallback to Fullmetal Alchemist if everything fails
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
      { error: 'Internal Server Error', details: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
