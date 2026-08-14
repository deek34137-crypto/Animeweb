import { StreamingProviderInterface, EpisodeItem, EpisodeStreamInfo, EpisodeSource } from '../types';

/**
 * VidSrc.me Provider (vidsrc.me)
 * TMDB-based anime embed provider (1080p).
 */
export const vidsrcMeProvider: StreamingProviderInterface = {
  name: 'vidsrc_me',

  getEpisodes: async (animeId: string, animeTitle?: string): Promise<EpisodeItem[]> => {
    return Array.from({ length: 24 }, (_, i) => ({
      number: i + 1,
      title: `Episode ${i + 1}`,
    }));
  },

  getStreamInfo: async (animeId: string, episode: number, animeTitle?: string): Promise<EpisodeStreamInfo> => {
    // Uses MAL/TMDB mapping ID or animeId if numeric TMDB ID
    const tmdbId = animeId;
    const url = `https://vidsrc.me/embed/tv/${tmdbId}/1/${episode}`;

    const sources: EpisodeSource[] = [
      {
        url,
        quality: '1080p',
        isM3U8: false,
      },
    ];

    return {
      sources,
      sub: sources,
      dub: [],
      subtitles: [],
      audioLanguage: 'japanese',
      isFallback: false,
      matchedTitle: animeTitle || 'Anime',
      providerSlug: 'vidsrc_me',
    };
  },
};

export default vidsrcMeProvider;
