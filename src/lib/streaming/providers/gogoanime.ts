import { StreamingProviderInterface, EpisodeItem, EpisodeStreamInfo } from '../types';
import { mockProvider } from './mock';

export const gogoanimeProvider: StreamingProviderInterface = {
  name: 'gogoanime',

  getEpisodes: async (animeId: string): Promise<EpisodeItem[]> => {
    // Scaffolded for actual gogoanime scraping.
    // In Phase 2 development, it falls back to mock provider episodes.
    console.info(`GoGoAnime provider requesting episodes for animeId: ${animeId}`);
    return mockProvider.getEpisodes(animeId);
  },

  getStreamInfo: async (animeId: string, episode: number): Promise<EpisodeStreamInfo> => {
    // Scaffolded for actual gogoanime link extraction.
    // In Phase 2 development, it falls back to mock provider streams.
    console.info(`GoGoAnime provider requesting stream for animeId: ${animeId}, ep: ${episode}`);
    return mockProvider.getStreamInfo(animeId, episode);
  },
};

