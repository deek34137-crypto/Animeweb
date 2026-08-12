import { StreamingProviderInterface, EpisodeItem, EpisodeStreamInfo, EpisodeSource } from '../types';

/**
 * VidSrc.sbs Provider (vidsrc.sbs)
 * CloudStream backend TMDB-based anime embed provider (1080p).
 */
export const vidsrcSbsProvider: StreamingProviderInterface = {
  name: 'vidsrc_sbs',

  getEpisodes: async (animeId: string, animeTitle?: string): Promise<EpisodeItem[]> => {
    return Array.from({ length: 24 }, (_, i) => ({
      number: i + 1,
      title: `Episode ${i + 1}`,
    }));
  },

  getStreamInfo: async (animeId: string, episode: number, animeTitle?: string): Promise<EpisodeStreamInfo> => {
    const tmdbId = animeId;
    const url = `https://vidsrc.sbs/embed/tv/${tmdbId}/1/${episode}`;

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
      providerSlug: 'vidsrc_sbs',
    };
  },
};

export default vidsrcSbsProvider;
