import { StreamingProviderInterface, EpisodeItem, EpisodeStreamInfo } from '../types';

/**
 * AniCLI Provider — Currently Not Implemented
 * 
 * AniCLI is a command-line tool without a stable public API.
 * Server-side scraping integration is planned for a future phase.
 * 
 * This stub throws descriptive errors so the fallback chain
 * skips it cleanly and the debug panel shows it as unavailable.
 */
export const anicliProvider: StreamingProviderInterface = {
  name: 'anicli',

  getEpisodes: async (_animeId: string, _animeTitle?: string): Promise<EpisodeItem[]> => {
    throw new Error('AniCLI provider is not yet implemented. Requires server-side scraping integration.');
  },

  getStreamInfo: async (_animeId: string, _episode: number, _animeTitle?: string): Promise<EpisodeStreamInfo> => {
    throw new Error('AniCLI provider is not yet implemented. Requires server-side scraping integration.');
  },
};

export default anicliProvider;
