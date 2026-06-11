import { registry } from './providers/registry';
import { streamCache } from './cache';
import { db } from '../db';
import { EpisodeItem, EpisodeStreamInfo } from './types';
import { StreamingHealth } from './health';

export const StreamingManager = {
  /**
   * Resolves the current default provider or selected provider by name.
   */
  getProvider: (name?: string) => {
    if (name) {
      const p = registry.get(name);
      if (p) return p;
    }
    return registry.getDefault();
  },

  /**
   * Fetches episodes list for a given anime from the active provider.
   * Caches results for 15 minutes.
   */
  getEpisodes: async (animeId: string, providerName?: string): Promise<EpisodeItem[]> => {
    const provider = StreamingManager.getProvider(providerName);
    const cacheKey = `episodes:${provider.name}:${animeId}`;

    const cached = await streamCache.get<EpisodeItem[]>(cacheKey);
    if (cached) return cached;

    const episodes = await provider.getEpisodes(animeId);
    
    // Cache for 15 minutes
    await streamCache.set(cacheKey, episodes, 900);
    return episodes;
  },

  /**
   * Resolves stream sources, subtitles, and audio track info for a specific episode.
   * Leverages db mapping to store and fetch resolved provider IDs.
   */
  getStreamInfo: async (
    animeId: string,
    episode: number,
    providerName?: string
  ): Promise<EpisodeStreamInfo> => {
    const provider = StreamingManager.getProvider(providerName);
    const cacheKey = `stream:${provider.name}:${animeId}:${episode}`;

    const cached = await streamCache.get<EpisodeStreamInfo>(cacheKey);
    if (cached) return cached;

    // Check if we have a resolved provider mapping in the database
    let mapping = await db.streamingProvider.findFirst({
      where: {
        animeId,
        provider: provider.name,
      },
    });

    // If no mapping exists, create a stub/mapping entry
    if (!mapping) {
      mapping = await db.streamingProvider.create({
        data: {
          animeId,
          provider: provider.name,
          providerId: `${animeId}-provider-id`, // stub mapping
        },
      });
    }

    // Call the provider using the resolved mapping ID
    const streamInfo = await provider.getStreamInfo(mapping.providerId, episode);

    // Validate sources and bubble up healthy ones
    if (streamInfo.sources && streamInfo.sources.length > 1) {
      try {
        const healthChecks = await Promise.all(
          streamInfo.sources.map(async (src) => {
            const isHealthy = await StreamingHealth.checkSourceHealth(src.url);
            return { src, isHealthy };
          })
        );
        const healthySources = healthChecks.filter(c => c.isHealthy).map(c => c.src);
        const unhealthySources = healthChecks.filter(c => !c.isHealthy).map(c => c.src);
        if (healthySources.length > 0) {
          streamInfo.sources = [...healthySources, ...unhealthySources];
        }
      } catch (err) {
        console.warn('Failed to perform stream sources health check:', err);
      }
    }

    // Cache for 5 minutes
    await streamCache.set(cacheKey, streamInfo, 300);
    return streamInfo;
  },
};

export default StreamingManager;
export * from './types';
