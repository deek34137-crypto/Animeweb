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
  getEpisodes: async (animeId: string, animeTitle?: string, providerName?: string): Promise<EpisodeItem[]> => {
    const provider = StreamingManager.getProvider(providerName);
    const cacheKey = `episodes:${provider.name}:${animeId}`;

    const cached = await streamCache.get<EpisodeItem[]>(cacheKey);
    if (cached) return cached;

    const episodes = await provider.getEpisodes(animeId, animeTitle);
    
    // Cache for 15 minutes
    await streamCache.set(cacheKey, episodes, 900);
    return episodes;
  },

  /**
   * Resolves stream sources, subtitles, and audio track info for a specific episode.
   * Leverages priority-based failover across registered providers.
   * Falls back to mock provider with explicit labeling if all real providers fail.
   */
  getStreamInfo: async (
    animeId: string,
    episode: number,
    animeTitle?: string,
    providerName?: string
  ): Promise<EpisodeStreamInfo> => {
    const cacheKey = providerName 
      ? `stream:resolve:${providerName.toLowerCase()}:${animeId}:${episode}`
      : `stream:resolve:auto:${animeId}:${episode}`;

    const cached = await streamCache.get<EpisodeStreamInfo>(cacheKey);
    if (cached) return cached;

    // Get all registered provider names
    const registeredProviders = registry.getPriorityChain(); // ['consumet', 'animepahe', 'anicli', 'mock']
    
    // Sort providers dynamically based on reliability, keeping mock last
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
    const fallbackChain: { provider: string; status: 'success' | 'failed' | 'skipped'; error?: string }[] = [];

    // Loop through providers in order of priority and attempt source resolution
    for (let i = 0; i < queue.length; i++) {
      const pName = queue[i];
      const provider = registry.get(pName);
      if (!provider) continue;

      try {
        console.info(`[StreamingManager] Attempting stream via ${provider.name} for "${animeTitle}" (MAL: ${animeId}), ep: ${episode}`);
        
        const streamInfo = await provider.getStreamInfo(animeId, episode, animeTitle);

        // Validate that provider returned sources
        const activeSources = streamInfo.sub && streamInfo.sub.length > 0 ? streamInfo.sub : streamInfo.sources;
        if (!activeSources || activeSources.length === 0) {
          throw new Error('No stream sources returned by provider.');
        }

        // Health-check the primary stream URL (skip for mock/fallback — those are known test URLs)
        if (!streamInfo.isFallback) {
          const primarySrc = activeSources[0];
          const isHealthy = await StreamingHealth.checkSourceHealth(primarySrc.url);
          if (!isHealthy) {
            throw new Error(`Primary stream source health check failed: ${primarySrc.url}`);
          }
        }

        // Mark success
        StreamingHealth.recordSuccess(provider.name);
        fallbackChain.push({ provider: provider.name, status: 'success' });

        // Normalize the payload
        const resolvedInfo: EpisodeStreamInfo = {
          sources: streamInfo.sources || streamInfo.sub,
          sub: streamInfo.sub || [],
          dub: streamInfo.dub || [],
          subtitles: streamInfo.subtitles || [],
          audioLanguage: streamInfo.audioLanguage,
          providers: registeredProviders,
          currentProvider: provider.name,
          isFallback: streamInfo.isFallback || false,
          fallbackReason: streamInfo.fallbackReason,
        };

        // Cache for 10 minutes (shorter for fallback, longer for real sources)
        const cacheTtl = resolvedInfo.isFallback ? 120 : 600;
        await streamCache.set(cacheKey, resolvedInfo, cacheTtl);
        return resolvedInfo;

      } catch (err: any) {
        console.warn(`[StreamingManager] Provider ${provider.name} failed for "${animeTitle}" ep ${episode}:`, err.message);
        StreamingHealth.recordFailure(provider.name);
        StreamingAnalytics.trackProviderFailure(provider.name, err.message);
        fallbackChain.push({ provider: provider.name, status: 'failed', error: err.message });

        // Log fallback action if next provider exists
        const nextProviderName = queue[i + 1];
        if (nextProviderName) {
          StreamingAnalytics.trackFallbackEvent(provider.name, nextProviderName, episode);
        }
        lastError = err;
      }
    }

    // If we get here, ALL providers including mock failed
    console.error(`[StreamingManager] All providers failed for "${animeTitle}" (MAL: ${animeId}), ep: ${episode}.`);
    console.error('[StreamingManager] Fallback chain:', JSON.stringify(fallbackChain, null, 2));

    // Return empty with fallback flag rather than throwing — let the UI handle it gracefully
    return {
      sources: [],
      sub: [],
      dub: [],
      subtitles: [],
      providers: registeredProviders,
      currentProvider: 'none',
      isFallback: true,
      fallbackReason: `All ${queue.length} providers failed. Last error: ${lastError?.message || 'Unknown'}`,
    };
  },
};

export default StreamingManager;
export * from './types';
