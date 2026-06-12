import { StreamingProviderInterface, EpisodeItem, EpisodeStreamInfo } from '../types';
import { mockProvider } from './mock';

export const gogoanimeProvider: StreamingProviderInterface = {
  name: 'gogoanime',

  getEpisodes: async (animeId: string, animeTitle?: string): Promise<EpisodeItem[]> => {
    // Scaffolded — delegates to mock provider. Use consumet provider for Gogoanime sources.
    console.info(`GoGoAnime provider requesting episodes for animeId: ${animeId}`);
    return mockProvider.getEpisodes(animeId, animeTitle);
  },

  getStreamInfo: async (animeId: string, episode: number, animeTitle?: string): Promise<EpisodeStreamInfo> => {
    // Scaffolded — delegates to mock provider. Use consumet provider for Gogoanime sources.
    console.info(`GoGoAnime provider requesting stream for animeId: ${animeId}, ep: ${episode}`);
    return mockProvider.getStreamInfo(animeId, episode, animeTitle);
  },
};
