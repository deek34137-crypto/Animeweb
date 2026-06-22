import { StreamingProviderInterface, EpisodeItem, EpisodeStreamInfo, EpisodeSource } from '../types';
import { AnimeApi } from '@/lib/api';
import { fetchAnilistMediaId } from '@/lib/trackers';
import { toonplayProvider } from './toonplay';
import { toonworldProvider } from './toonworld';
import { streamCache } from '../cache';

// Helper to check if a language track is active on the VidNest backend (cached for 6 hours)
async function checkTrackExists(anilistId: number, episode: number, lang: string): Promise<boolean> {
  const cacheKey = `vidnest:track:${anilistId}:${episode}:${lang}`;
  
  try {
    const cached = await streamCache.get<boolean>(cacheKey);
    if (cached !== null && cached !== undefined) {
      return cached;
    }
  } catch (err) {
    console.warn(`[VidNest] Cache read error for track availability:`, err);
  }

  const checkUrl = `https://new.animanga.fun/hianime/anime/${anilistId}/${episode}/${lang}`;
  try {
    const res = await fetch(checkUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Referer': 'https://vidnest.fun/'
      },
      signal: AbortSignal.timeout(3000), // fast check
    });
    
    const exists = res.status === 200;
    
    try {
      // Cache for 6 hours (21600 seconds)
      await streamCache.set(cacheKey, exists, 21600);
    } catch (ce) {
      console.warn(`[VidNest] Cache write error:`, ce);
    }
    
    return exists;
  } catch (err) {
    console.warn(`[VidNest] Failed to query track availability:`, err);
    return false;
  }
}

export const vidnestProvider: StreamingProviderInterface = {
  name: 'vidnest',

  getEpisodes: async (animeId: string, animeTitle?: string): Promise<EpisodeItem[]> => {
    console.info(`[VidNest] Resolving episodes for MAL ID ${animeId}`);

    // 1. Try ToonPlay metadata first
    try {
      const episodes = await toonplayProvider.getEpisodes(animeId, animeTitle);
      if (episodes && episodes.length > 0) {
        console.info(`[VidNest] Successfully resolved ${episodes.length} episodes from ToonPlay`);
        return episodes;
      }
    } catch (err: any) {
      console.warn(`[VidNest] ToonPlay episode query failed: ${err.message}`);
    }

    // 2. Try ToonWorld metadata next
    try {
      const episodes = await toonworldProvider.getEpisodes(animeId, animeTitle);
      if (episodes && episodes.length > 0) {
        console.info(`[VidNest] Successfully resolved ${episodes.length} episodes from ToonWorld`);
        return episodes;
      }
    } catch (err: any) {
      console.warn(`[VidNest] ToonWorld episode query failed: ${err.message}`);
    }

    // 3. Fallback to MAL Jikan API details
    try {
      const malId = parseInt(animeId, 10);
      if (!isNaN(malId)) {
        const detail = await AnimeApi.getAnimeDetail(malId);
        if (detail && detail.episodes) {
          console.info(`[VidNest] Successfully resolved ${detail.episodes} episodes from MAL Jikan`);
          return Array.from({ length: detail.episodes }, (_, i) => ({
            number: i + 1,
            title: `Episode ${i + 1}`,
          }));
        }
      }
    } catch (err: any) {
      console.warn(`[VidNest] MAL Jikan episode query failed: ${err.message}`);
    }

    // Final fallback: return empty array so that no incorrect episode lists are shown
    console.warn(`[VidNest] All episode count metadata resolution failed. Returning empty list.`);
    return [];
  },

  getStreamInfo: async (animeId: string, episode: number, animeTitle?: string): Promise<EpisodeStreamInfo> => {
    console.info(`[VidNest] Resolving stream info for MAL ID ${animeId}, ep ${episode}`);

    const isMalId = !animeId.startsWith('series-') && !animeId.startsWith('movies-');
    if (!isMalId) {
      throw new Error('VidNest requires a numeric MAL ID');
    }

    // Resolve MAL ID to AniList ID
    let anilistId: number | null = null;
    try {
      anilistId = await fetchAnilistMediaId(animeId);
    } catch (err: any) {
      throw new Error(`AniList ID mapping threw an error: ${err.message}`);
    }

    if (!anilistId) {
      throw new Error(`AniList mapping failed for MAL ID ${animeId}`);
    }

    console.info(`[VidNest] Translated MAL ID ${animeId} to AniList ID ${anilistId}`);

    // Verify availability of sub, dub, hindi tracks in parallel
    const [subExists, dubExists, hindiExists] = await Promise.all([
      checkTrackExists(anilistId, episode, 'sub'),
      checkTrackExists(anilistId, episode, 'dub'),
      checkTrackExists(anilistId, episode, 'hindi'),
    ]);

    const subSources: EpisodeSource[] = [];
    const dubSources: EpisodeSource[] = [];
    const hindiSources: EpisodeSource[] = [];

    if (subExists) {
      subSources.push({
        url: `https://vidnest.fun/anime/${anilistId}/${episode}/sub`,
        quality: 'default',
        isM3U8: false,
      });
    }

    if (dubExists) {
      dubSources.push({
        url: `https://vidnest.fun/anime/${anilistId}/${episode}/dub`,
        quality: 'default',
        isM3U8: false,
      });
    }

    if (hindiExists) {
      hindiSources.push({
        url: `https://vidnest.fun/anime/${anilistId}/${episode}/hindi`,
        quality: 'default',
        isM3U8: false,
      });
    }

    // Ensure we have at least one valid source track resolved
    if (subSources.length === 0 && dubSources.length === 0 && hindiSources.length === 0) {
      throw new Error(`No active stream tracks resolved on VidNest for AniList ID ${anilistId}, ep ${episode}`);
    }

    const defaultSources = subSources.length > 0 ? subSources : (dubSources.length > 0 ? dubSources : hindiSources);

    return {
      sources: defaultSources,
      sub: subSources,
      dub: dubSources,
      hindi: hindiSources,
      subtitles: [],
      audioLanguage: subExists ? 'japanese' : (dubExists ? 'english' : 'hindi'),
      isFallback: false,
      matchedTitle: animeTitle || `AniList: ${anilistId}`,
      providerSlug: 'vidnest',
    };
  }
};

export default vidnestProvider;
