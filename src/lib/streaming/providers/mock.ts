import { StreamingProviderInterface, EpisodeItem, EpisodeStreamInfo } from '../types';
import { AnimeApi } from '@/lib/api';

export const mockProvider: StreamingProviderInterface = {
  name: 'mock',

  getEpisodes: async (animeId: string): Promise<EpisodeItem[]> => {
    try {
      // Try fetching the actual episodes list from Jikan
      const malId = parseInt(animeId, 10);
      const eps = await AnimeApi.getAnimeEpisodes(malId);
      
      if (eps && eps.length > 0) {
        return eps.map((ep) => ({
          number: ep.mal_id,
          title: ep.title || `Episode ${ep.mal_id}`,
          aired: ep.aired || undefined,
          filler: ep.filler,
          recap: ep.recap,
        }));
      }
    } catch (err) {
      console.warn('Mock provider Jikan episodes load failed, using fallback mock list:', err);
    }

    // Fallback if Jikan is offline or anime is invalid
    return Array.from({ length: 12 }, (_, i) => ({
      number: i + 1,
      title: `Episode ${i + 1} - Mock Episode Title`,
      aired: new Date(Date.now() - (12 - i) * 7 * 24 * 60 * 60 * 1000).toISOString(),
      filler: i === 3, // mock episode 4 is filler
      recap: i === 8,  // mock episode 9 is recap
    }));
  },

  getStreamInfo: async (animeId: string, episode: number): Promise<EpisodeStreamInfo> => {
    // High-fidelity fallback HLS streams for testing
    // Sub: Sintel HLS, Dub: Tears of Steel HLS
    const subSources = [
      {
        url: 'https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8',
        quality: 'auto' as const,
        isM3U8: true,
      },
    ];

    const dubSources = [
      {
        url: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
        quality: 'auto' as const,
        isM3U8: true,
      },
    ];

    return {
      sources: subSources,
      sub: subSources,
      dub: dubSources,
      subtitles: [
        {
          label: 'English',
          lang: 'en',
          url: 'https://raw.githubusercontent.com/mdn/learning-area/master/html/multimedia-and-embedding/video-and-audio-content/subtitles-en.vtt',
        },
        {
          label: 'Spanish',
          lang: 'es',
          url: 'https://raw.githubusercontent.com/mdn/learning-area/master/html/multimedia-and-embedding/video-and-audio-content/subtitles-en.vtt', // using same as mock
        },
      ],
      audioLanguage: 'japanese',
    };
  },
};

