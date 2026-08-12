import { StreamingProviderInterface, EpisodeItem, EpisodeStreamInfo, EpisodeSource } from '../types';

/**
 * VidSrc.to Provider (vidsrc.to)
 * TMDB-based anime embed provider (1080p).
 */
export const vidsrcToProvider: StreamingProviderInterface = {
  name: 'vidsrc_to',

  getEpisodes: async (animeId: string, animeTitle?: string): Promise<EpisodeItem[]> => {
    return Array.from({ length: 24 }, (_, i) => ({
      number: i + 1,
      title: `Episode ${i + 1}`,
    }));
  },

  getStreamInfo: async (animeId: string, episode: number, animeTitle?: string): Promise<EpisodeStreamInfo> => {
    const tmdbId = animeId;
    const url = `https://vidsrc.to/embed/tv/${tmdbId}/1/${episode}`;

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
      providerSlug: 'vidsrc_to',
    };
  },
};

export default vidsrcToProvider;
