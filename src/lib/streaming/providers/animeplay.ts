import { StreamingProviderInterface, EpisodeItem, EpisodeStreamInfo, EpisodeSource } from '../types';
import { AnimeApi } from '@/lib/api';
import { fetchAnilistMediaId } from '@/lib/trackers';

export const animeplayProvider: StreamingProviderInterface = {
  name: 'animeplay',

  getEpisodes: async (animeId: string, animeTitle?: string): Promise<EpisodeItem[]> => {
    console.info(`[AnimePlay] Resolving episodes for MAL ID ${animeId}, title: "${animeTitle}"`);
    try {
      const malId = parseInt(animeId, 10);
      if (!isNaN(malId)) {
        const detail = await AnimeApi.getAnimeDetail(malId);
        const total = detail.episodes || 12;
        return Array.from({ length: total }, (_, i) => ({
          number: i + 1,
          title: `Episode ${i + 1}`,
        }));
      }
    } catch (e: any) {
      console.warn(`[AnimePlay] Failed to fetch episode count from MAL: ${e.message}`);
    }
    // Fallback default episode list
    return Array.from({ length: 100 }, (_, i) => ({
      number: i + 1,
      title: `Episode ${i + 1}`,
    }));
  },

  getStreamInfo: async (animeId: string, episode: number, animeTitle?: string): Promise<EpisodeStreamInfo> => {
    console.info(`[AnimePlay] Resolving streams for MAL ID ${animeId}, ep ${episode}, title: "${animeTitle}"`);

    const isMalId = !animeId.startsWith('series-') && !animeId.startsWith('movies-');
    let anilistId: number | null = null;

    if (isMalId) {
      try {
        anilistId = await fetchAnilistMediaId(animeId);
      } catch (err: any) {
        console.warn(`[AnimePlay] AniList ID mapping failed: ${err.message}`);
      }
    }

    // Default fallback to AniList ID if lookup fails
    const finalAnilistId = anilistId || parseInt(animeId, 10) || 20;

    const subSource: EpisodeSource = {
      url: `https://animeplay.cfd/stream/ani/${finalAnilistId}/${episode}/sub`,
      quality: 'default',
      isM3U8: false,
    };

    const dubSource: EpisodeSource = {
      url: `https://animeplay.cfd/stream/ani/${finalAnilistId}/${episode}/dub`,
      quality: 'default',
      isM3U8: false,
    };

    return {
      sources: [subSource],
      sub: [subSource],
      dub: [dubSource],
      hindi: [],
      subtitles: [],
      audioLanguage: 'japanese',
      isFallback: false,
      matchedTitle: animeTitle || `AniList: ${finalAnilistId}`,
      providerSlug: 'animeplay',
    };
  },
};

export default animeplayProvider;
