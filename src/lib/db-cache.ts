import { cache } from 'react';
import { db } from '@/lib/db';
import { AnimeApi, UnifiedAnimeDetail } from '@/lib/api';
import { fetchUserProfile } from '@/services/profile';

// Memoized fetching of Anime details
export const getCachedAnime = cache(async (id: string): Promise<UnifiedAnimeDetail | null> => {
  const isMalId = !id.startsWith('series-') && !id.startsWith('movies-');
  if (!isMalId) {
    try {
      const TOONPLAY_HEADERS = {
        'Origin': 'https://toonplay.in',
        'Referer': 'https://toonplay.in/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      };
      const res = await fetch(`https://animesalt.streamindia.co.in/api/info?id=${id}`, {
        headers: TOONPLAY_HEADERS,
        next: { revalidate: 1800 },
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.anime) {
          const tpAnime = data.anime;
          return {
            mal_id: id as any,
            title: tpAnime.title,
            title_english: tpAnime.title,
            title_japanese: tpAnime.title,
            synopsis: tpAnime.description || 'No description available.',
            images: {
              jpg: {
                image_url: tpAnime.image || '/app-icon.jpg',
                small_image_url: tpAnime.image || '/app-icon.jpg',
                large_image_url: tpAnime.image || '/app-icon.jpg',
              },
              webp: {
                image_url: tpAnime.image || '/app-icon.jpg',
                small_image_url: tpAnime.image || '/app-icon.jpg',
                large_image_url: tpAnime.image || '/app-icon.jpg',
              }
            },
            type: tpAnime.type === 'movie' ? 'Movie' : 'TV',
            episodes: tpAnime.episodesCount || null,
            score: 8.0,
            scored_by: 100,
            status: 'Finished Airing',
            genres: [],
            year: tpAnime.year || null,
            studios: [],
            producers: [],
            userTracking: null,
          } as unknown as UnifiedAnimeDetail;
        }
      }
    } catch (error) {
      console.error('Failed to load ToonPlay direct catalog info in cache:', error);
    }
    return null;
  } else {
    const animeId = parseInt(id, 10);
    if (isNaN(animeId)) return null;
    return AnimeApi.getAnimeDetail(animeId).catch(() => null);
  }
});

// Memoized fetching of Collections
export const getCachedCollection = cache(async (id: string) => {
  try {
    const collection = await db.collection.findUnique({
      where: { id, deletedAt: null },
      include: {
        user: {
          select: {
            username: true,
            displayName: true,
          },
        },
        entries: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!collection) return null;

    const mappedEntries = collection.entries.map((entry) => {
      const snapshot = (entry.animeSnapshot as Record<string, any>) || {};
      return {
        ...entry,
        animeTitle: (snapshot.title || '') as string,
        animeImage: (snapshot.image || '') as string,
      };
    });

    return {
      ...collection,
      entries: mappedEntries,
    };
  } catch (error) {
    console.error('Failed to get cached collection:', error);
    return null;
  }
});

// Memoized fetching of Forum Threads
export const getCachedThread = cache(async (slug: string) => {
  try {
    return await db.forumThread.findFirst({
      where: { slug },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            role: true,
          },
        },
      },
    });
  } catch (error) {
    console.error('Failed to get cached forum thread:', error);
    return null;
  }
});

// Memoized fetching of User Profiles
export const getCachedUserProfile = cache(async (username: string, requestorId?: string) => {
  try {
    return await fetchUserProfile(username, { requestorId });
  } catch (error) {
    console.error('Failed to get cached user profile:', error);
    return null;
  }
});
