import { registry } from './providers/registry';
import { streamCache } from './cache';
import { db } from '../db';
import { EpisodeItem, EpisodeStreamInfo } from './types';
import { StreamingHealth } from './health';
import { StreamingAnalytics } from './analytics';

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
   * Leverages db mapping and implements automatic priority-based failover.
   */
  getStreamInfo: async (
    animeId: string,
    episode: number,
    providerName?: string
  ): Promise<EpisodeStreamInfo> => {
    const cacheKey = providerName 
      ? `stream:resolve:${providerName.toLowerCase()}:${animeId}:${episode}`
      : `stream:resolve:auto:${animeId}:${episode}`;

    const cached = await streamCache.get<EpisodeStreamInfo>(cacheKey);
    if (cached) return cached;

    // Get all registered provider names
    const registeredProviders = registry.getPriorityChain(); // ['consumet', 'animepahe', 'anicli', 'mock']
    
    // Sort providers dynamically based on reliability success rate percentages
    const sortedProviderNames = StreamingHealth.getReorderedProviders(registeredProviders);

    // If a specific provider is requested, prioritize it at the front of the queue
    let queue = [...sortedProviderNames];
    if (providerName) {
      const idx = queue.indexOf(providerName.toLowerCase());
      if (idx > -1) {
        queue.splice(idx, 1);
      }
      queue.unshift(providerName.toLowerCase());
    }

    let lastError: any = null;

    // Loop through providers in order of priority and attempt source resolution
    for (let i = 0; i < queue.length; i++) {
      const pName = queue[i];
      const provider = registry.get(pName);
      if (!provider) continue;

      try {
        console.info(`Attempting stream resolution via provider: ${provider.name} for animeId: ${animeId}, ep: ${episode}`);
        
        let resolvedProviderId = animeId;
        try {
          let mapping = await db.streamingProvider.findFirst({
            where: {
              animeId,
              provider: provider.name,
            },
          });

          if (!mapping) {
            mapping = await db.streamingProvider.create({
              data: {
                animeId,
                provider: provider.name,
                providerId: `${animeId}-${provider.name}-id`,
              },
            });
          }
          resolvedProviderId = mapping.providerId;
        } catch (dbErr) {
          console.warn(`StreamingProvider DB lookup failed for ${provider.name} (using raw animeId):`, dbErr);
        }

        const streamInfo = await provider.getStreamInfo(resolvedProviderId, episode);

        // Validate that provider returned sources
        const activeSources = streamInfo.sub && streamInfo.sub.length > 0 ? streamInfo.sub : streamInfo.sources;
        if (!activeSources || activeSources.length === 0) {
          throw new Error('No stream sources returned by provider.');
        }

        // Validate source health (ping the first HLS stream URL)
        const primarySrc = activeSources[0];
        const isHealthy = await StreamingHealth.checkSourceHealth(primarySrc.url);
        if (!isHealthy) {
          throw new Error(`Primary stream source health check failed: ${primarySrc.url}`);
        }

        // Mark success
        StreamingHealth.recordSuccess(provider.name);

        // Normalize the payload
        const resolvedInfo: EpisodeStreamInfo = {
          sources: streamInfo.sources || streamInfo.sub,
          sub: streamInfo.sub || [],
          dub: streamInfo.dub || [],
          subtitles: streamInfo.subtitles || [],
          audioLanguage: streamInfo.audioLanguage,
          providers: registeredProviders,
          currentProvider: provider.name,
        };

        // Cache for 10 minutes (600 seconds)
        await streamCache.set(cacheKey, resolvedInfo, 600);
        return resolvedInfo;

      } catch (err: any) {
        console.warn(`Provider ${provider.name} failed to resolve stream for animeId ${animeId}, ep ${episode}:`, err.message);
        StreamingHealth.recordFailure(provider.name);
        StreamingAnalytics.trackProviderFailure(provider.name, err.message);

        // Log fallback action if next provider exists
        const nextProviderName = queue[i + 1];
        if (nextProviderName) {
          StreamingAnalytics.trackFallbackEvent(provider.name, nextProviderName, episode);
        }
        lastError = err;
      }
    }

    throw lastError || new Error('All registered stream providers failed to resolve a working stream.');
  },
};

export default StreamingManager;
export * from './types';
