import { StreamingProviderInterface, EpisodeItem, EpisodeStreamInfo } from '../types';
import { mockProvider } from './mock';

export const animepaheProvider: StreamingProviderInterface = {
  name: 'animepahe',

  getEpisodes: async (animeId: string): Promise<EpisodeItem[]> => {
    console.info(`AnimePahe provider requesting episodes for animeId: ${animeId}`);
    return mockProvider.getEpisodes(animeId);
  },

  getStreamInfo: async (animeId: string, episode: number): Promise<EpisodeStreamInfo> => {
    console.info(`AnimePahe provider requesting stream for animeId: ${animeId}, ep: ${episode}`);
    
    // Return different mock source (Big Buck Bunny) to visually distinguish AnimePahe
    const subSources = [
      {
        url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
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
          label: 'English (AnimePahe)',
          lang: 'en',
          url: 'https://raw.githubusercontent.com/mdn/learning-area/master/html/multimedia-and-embedding/video-and-audio-content/subtitles-en.vtt',
        },
      ],
      audioLanguage: 'japanese',
    };
  },
};

export default animepaheProvider;
