import { StreamingProviderInterface, EpisodeItem, EpisodeStreamInfo } from '../types';
import { AnimeApi } from '@/lib/api';

/**
 * Mock/Fallback Provider
 * 
 * Used ONLY when all real providers fail. Returns test HLS streams
 * with explicit "Fallback Test Stream" labeling so the UI can clearly
 * indicate that real anime content was not resolved.
 * 
 * All returned streams are marked with isFallback: true.
 */
export const mockProvider: StreamingProviderInterface = {
  name: 'mock',

  getEpisodes: async (animeId: string, _animeTitle?: string): Promise<EpisodeItem[]> => {
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
      title: `Episode ${i + 1}`,
      aired: new Date(Date.now() - (12 - i) * 7 * 24 * 60 * 60 * 1000).toISOString(),
      filler: i === 3,
      recap: i === 8,
    }));
  },

  getStreamInfo: async (_animeId: string, episode: number, _animeTitle?: string): Promise<EpisodeStreamInfo> => {
    console.warn(`[FALLBACK] Mock provider active — returning test streams for episode ${episode}. No real provider could resolve this anime.`);

    // Clearly labeled test streams — these are NOT anime content
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
      subtitles: [],
      audioLanguage: 'japanese',
      isFallback: true,
      fallbackReason: 'All streaming providers failed to resolve real anime sources. Displaying test content.',
    };
  },
};
