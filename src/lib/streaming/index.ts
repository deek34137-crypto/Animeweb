import { registry } from './providers/registry';
import { streamCache } from './cache';
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
   * Tries each provider in the priority chain until one succeeds.
   * Caches results for 15 minutes.
   */
  getEpisodes: async (animeId: string, animeTitle?: string, providerName?: string): Promise<EpisodeItem[]> => {
    const cacheKey = `episodes:${providerName || 'auto'}:${animeId}`;

    const cached = await streamCache.get<EpisodeItem[]>(cacheKey);
    if (cached) return cached;

    // If a specific provider is requested, use only that one (no fallback)
    if (providerName) {
      const provider = StreamingManager.getProvider(providerName);
      const episodes = await provider.getEpisodes(animeId, animeTitle);
      await streamCache.set(cacheKey, episodes, 900);
      return episodes;
    }

    // Try each provider in the priority chain until one returns episodes
    const chain = registry.getPriorityChain();
    for (const pName of chain) {
      const provider = registry.get(pName);
      if (!provider) continue;
      try {
        const episodes = await provider.getEpisodes(animeId, animeTitle);
        if (episodes && episodes.length > 0) {
          await streamCache.set(cacheKey, episodes, 900);
          return episodes;
        }
      } catch {
        // Provider failed — try next
      }
    }

    return [];
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
    providerName?: string,
    preferredLanguage?: string
  ): Promise<EpisodeStreamInfo> => {
    const cacheKey = providerName 
      ? `stream:resolve:${providerName.toLowerCase()}:${animeId}:${episode}:${preferredLanguage || 'auto'}`
      : `stream:resolve:auto:${animeId}:${episode}:${preferredLanguage || 'auto'}`;

    const cached = await streamCache.get<EpisodeStreamInfo>(cacheKey);
    if (cached) return cached;

    // Priority chain — used for the auto-failover queue
    const priorityChain = registry.getPriorityChain();

    // Full selectable list sent to the player UI (primary + __drawer__ sentinel + extras)
    // PlayerSettings splits on '__drawer__' to render the two-section provider menu.
    const drawerProviders = registry.getDrawerProviders();
    const registeredProviders: string[] = [
      ...priorityChain,
      '__drawer__',
      ...drawerProviders,
    ];

    // Sort priority chain dynamically based on reliability
    const sortedProviderNames = StreamingHealth.getReorderedProviders(priorityChain);

    // If Hindi is preferred, elevate Hindi providers to the absolute front of the failover chain
    let finalChain = [...sortedProviderNames];
    if (preferredLanguage?.toLowerCase() === 'hindi') {
      const hindiProviders = ['toonplay', 'toonworld', 'vidnest'];
      finalChain = finalChain.filter(p => !hindiProviders.includes(p));
      finalChain.unshift(...hindiProviders);
    }

    // If a specific provider is requested, resolve only that provider (no fallback failover)
    let queue = [...finalChain];
    if (providerName) {
      queue = [providerName.toLowerCase()];
    }

    let lastError: any = null;
    const fallbackChain: { provider: string; status: 'success' | 'failed' | 'skipped'; error?: string }[] = [];

    // Loop through providers in order of priority and attempt source resolution
    for (let i = 0; i < queue.length; i++) {
      const pName = queue[i];
      const provider = registry.get(pName);
      if (!provider) continue;

      // Circuit breaker: skip providers whose health score is too low
      if (StreamingHealth.isCircuitOpen(pName)) {
        console.warn(`[StreamingManager] Skipping ${pName} — circuit open (health score < 20)`);
        fallbackChain.push({ provider: pName, status: 'skipped', error: 'Circuit open' });
        continue;
      }

      // Log attempt details in exact requested format
      console.info(`\n[${provider.name.toUpperCase()}]`);
      console.info(`anime=${animeId}`);
      console.info(`episode=${episode}`);

      try {
        const attemptStart = Date.now();
        const streamInfo = await provider.getStreamInfo(animeId, episode, animeTitle);
        const responseTimeMs = Date.now() - attemptStart;

        // Select which sources list to validate based on preferredLanguage
        let sourcesToCheck = streamInfo.sources;
        const prefLang = preferredLanguage?.toLowerCase();
        if (prefLang === 'hindi' && streamInfo.hindi && streamInfo.hindi.length > 0) {
          sourcesToCheck = streamInfo.hindi;
        } else if (prefLang === 'tamil' && streamInfo.tamil && streamInfo.tamil.length > 0) {
          sourcesToCheck = streamInfo.tamil;
        } else if (prefLang === 'telugu' && streamInfo.telugu && streamInfo.telugu.length > 0) {
          sourcesToCheck = streamInfo.telugu;
        } else if (prefLang === 'dub' && streamInfo.dub && streamInfo.dub.length > 0) {
          sourcesToCheck = streamInfo.dub;
        } else if (prefLang === 'sub' && streamInfo.sub && streamInfo.sub.length > 0) {
          sourcesToCheck = streamInfo.sub;
        } else {
          // Fallback selection logic
          sourcesToCheck = streamInfo.hindi && streamInfo.hindi.length > 0 
            ? streamInfo.hindi 
            : (streamInfo.sub && streamInfo.sub.length > 0 ? streamInfo.sub : streamInfo.sources);
        }

        if (!sourcesToCheck || sourcesToCheck.length === 0) {
          throw new Error(`No stream sources returned by provider for preferred language: ${preferredLanguage || 'default'}`);
        }

        // Health-check the primary stream URL only for direct m3u8 streams.
        // Skip for iframe/embed URLs — those sites reject server-side HEAD requests,
        // so a failed HEAD does not mean the stream is broken for the browser player.
        if (!streamInfo.isFallback) {
          const primarySrc = sourcesToCheck[0];
          const isIframeOrEmbed = !primarySrc.isM3U8 &&
            !primarySrc.url.includes('.m3u8') &&
            !primarySrc.url.includes('.mp4');
          if (!isIframeOrEmbed) {
            const isHealthy = await StreamingHealth.checkSourceHealth(primarySrc.url);
            if (!isHealthy) {
              throw new Error(`Primary stream source health check failed: ${primarySrc.url}`);
            }
          }
        }

        // Log success details
        console.info(`status=200`);
        console.info(`url=resolved`);

        // Mark success
        StreamingHealth.recordSuccess(provider.name, responseTimeMs);
        fallbackChain.push({ provider: provider.name, status: 'success' });

        // Normalize the payload
        const resolvedInfo: EpisodeStreamInfo = {
          sources: streamInfo.sources || streamInfo.sub || streamInfo.hindi,
          sub: streamInfo.sub || [],
          dub: streamInfo.dub || [],
          hindi: streamInfo.hindi || [],
          subtitles: streamInfo.subtitles || [],
          audioLanguage: streamInfo.audioLanguage,
          providers: registeredProviders,   // full list for UI (includes __drawer__ sentinel)
          currentProvider: provider.name,
          isFallback: streamInfo.isFallback || false,
          fallbackReason: streamInfo.fallbackReason,
          matchedTitle: streamInfo.matchedTitle,
          matchedSlug: streamInfo.matchedSlug,
          searchCount: streamInfo.searchCount,
          episodeCountFound: streamInfo.episodeCountFound,
          providerSlug: streamInfo.providerSlug,
        };

        // Cache for 10 minutes (shorter for fallback, longer for real sources)
        const cacheTtl = resolvedInfo.isFallback ? 120 : 600;
        await streamCache.set(cacheKey, resolvedInfo, cacheTtl);
        return resolvedInfo;

      } catch (err: any) {
        // Log failure details in exact requested format
        console.info(`url=${err.url || 'N/A'}`);
        console.info(`status=${err.status || 500}`);
        console.info(`error=${err.message || 'Unknown error'}`);

        // Classify severity from error message
        let severity: 'minor' | 'medium' | 'high' | 'critical' = 'medium';
        const msg = (err.message || '').toLowerCase();
        if (msg.includes('404') || msg.includes('not found')) {
          severity = 'minor';
        } else if (msg.includes('unreachable') || msg.includes('econnrefused') || msg.includes('fetch failed') || msg.includes('offline')) {
          severity = 'critical';
        } else if (msg.includes('health check failed') || msg.includes('stall')) {
          severity = 'high';
        }

        console.warn(`[StreamingManager] Provider ${provider.name} failed for "${animeTitle}" ep ${episode}:`, err.message);
        StreamingHealth.recordFailure(provider.name, { severity });
        StreamingAnalytics.trackProviderFailure(provider.name, err.message, severity);
        fallbackChain.push({ provider: provider.name, status: 'failed', error: err.message });

        // Log fallback action if next provider exists
        const nextProviderName = queue[i + 1];
        if (nextProviderName) {
          StreamingAnalytics.trackFallbackEvent(provider.name, nextProviderName, episode);
        }
        lastError = err;
      }
    }

    // If we get here, ALL providers failed
    console.error(`[StreamingManager] All providers failed for "${animeTitle}" (MAL: ${animeId}), ep: ${episode}.`);
    console.error('[StreamingManager] Fallback chain:', JSON.stringify(fallbackChain, null, 2));

    // Return empty with fallback flag
    return {
      sources: [],
      sub: [],
      dub: [],
      hindi: [],
      subtitles: [],
      providers: registeredProviders,   // full list for UI
      currentProvider: 'none',
      isFallback: true,
      fallbackReason: `All ${queue.length} providers failed. Last error: ${lastError?.message || 'Unknown'}`,
    };
  },
};

export default StreamingManager;
export * from './types';
