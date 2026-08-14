import { StreamingProviderInterface, EpisodeItem, EpisodeStreamInfo, EpisodeSource } from '../types';

/**
 * GogoCDN Provider (gogocdn.net)
 * Base64 ID-based Gogoanime backend embed provider (720p).
 */
export const gogocdnProvider: StreamingProviderInterface = {
  name: 'gogocdn',

  getEpisodes: async (animeId: string, animeTitle?: string): Promise<EpisodeItem[]> => {
    return Array.from({ length: 24 }, (_, i) => ({
      number: i + 1,
      title: `Episode ${i + 1}`,
    }));
  },

  getStreamInfo: async (animeId: string, episode: number, animeTitle?: string): Promise<EpisodeStreamInfo> => {
    // Encodes episode ID to base64 for GogoCDN
    const rawId = `${animeId}-${episode}`;
    const base64Id = Buffer.from(rawId).toString('base64');
    const url = `https://gogocdn.net/streaming.php?id=${base64Id}`;

    const sources: EpisodeSource[] = [
      {
        url,
        quality: '720p',
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
      providerSlug: 'gogocdn',
    };
  },
};

export default gogocdnProvider;
