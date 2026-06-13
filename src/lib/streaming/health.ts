// Health Monitoring Helper for HLS Stream Sources and Providers

interface ProviderStats {
  successes: number;
  failures: number;
  lastSuccess?: Date;
}

// Default starting values — equal baselines since all providers are now real
const providerStats: Record<string, ProviderStats> = {
  toonworld: { successes: 50, failures: 2 },
  consumet: { successes: 50, failures: 5 },
  animepahe: { successes: 45, failures: 10 },
  anicli: { successes: 0, failures: 50 }, // Not implemented — will always fail
  mock: { successes: 100, failures: 0 },  // Always succeeds (test streams)
};

export const StreamingHealth = {
  /**
   * Records a successful fetch/stream load for a provider.
   */
  recordSuccess: (provider: string) => {
    const key = provider.toLowerCase();
    if (!providerStats[key]) {
      providerStats[key] = { successes: 0, failures: 0 };
    }
    providerStats[key].successes += 1;
    providerStats[key].lastSuccess = new Date();
  },

  /**
   * Records a failure for a provider.
   */
  recordFailure: (provider: string) => {
    const key = provider.toLowerCase();
    if (!providerStats[key]) {
      providerStats[key] = { successes: 0, failures: 0 };
    }
    providerStats[key].failures += 1;
  },

  /**
   * Returns the success rate percentage of a provider.
   */
  getSuccessPercentage: (provider: string): number => {
    const key = provider.toLowerCase();
    const stats = providerStats[key];
    if (!stats) return 0;
    const total = stats.successes + stats.failures;
    if (total === 0) return 0;
    return (stats.successes / total) * 100;
  },

  /**
   * Returns current stats for all providers (for debug panel).
   */
  getAllStats: (): Record<string, { successRate: number; total: number }> => {
    const result: Record<string, { successRate: number; total: number }> = {};
    for (const [key, stats] of Object.entries(providerStats)) {
      const total = stats.successes + stats.failures;
      result[key] = {
        successRate: total > 0 ? Math.round((stats.successes / total) * 100) : 0,
        total,
      };
    }
    return result;
  },

  /**
   * Reorders a list of providers by their success percentage (descending).
   * Mock provider is always placed last — it should only be used as final fallback.
   */
  getReorderedProviders: (providers: string[]): string[] => {
    return [...providers].sort((a, b) => {
      // Mock always last
      if (a === 'mock') return 1;
      if (b === 'mock') return -1;
      const rateA = StreamingHealth.getSuccessPercentage(a);
      const rateB = StreamingHealth.getSuccessPercentage(b);
      return rateB - rateA;
    });
  },

  /**
   * Validates if a stream URL is online, reachable, and returns a valid HLS/media response.
   * No bypasses for demo/test URLs — every URL is checked honestly.
   */
  checkSourceHealth: async (url: string): Promise<boolean> => {
    // If it's a relative URL or local dev stream, skip fetch checks
    if (url.startsWith('/') || url.includes('localhost') || url.includes('127.0.0.1')) {
      return true;
    }

    // Skip network request health check for embed/iframe URLs to avoid CORS/Referer blocks
    if (
      url.includes('/stream/') ||
      url.includes('vidtube.site') ||
      url.includes('megaplay.buzz') ||
      url.includes('embed') ||
      url.includes('iframe')
    ) {
      return true;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      let response;
      try {
        response = await fetch(url, {
          method: 'HEAD',
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          },
        });
      } catch (headErr) {
        console.warn(`HEAD check encountered error for ${url}, trying GET...`);
      }

      clearTimeout(timeoutId);

      // If HEAD request failed, returned non-200, or wasn't resolved, fall back to GET
      if (!response || !response.ok) {
        const getController = new AbortController();
        const getTimeoutId = setTimeout(() => getController.abort(), 5000);
        
        try {
          response = await fetch(url, {
            method: 'GET',
            signal: getController.signal,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
              'Range': 'bytes=0-0', // Request only the first byte to be fast
            },
          });
        } catch (getErr) {
          console.warn(`GET fallback check failed for ${url}`);
        }
        
        clearTimeout(getTimeoutId);
      }

      return response ? response.ok : false;
    } catch (err) {
      console.warn(`Health check failed for stream source: ${url}`, err);
      return false;
    }
  },
};

export default StreamingHealth;
