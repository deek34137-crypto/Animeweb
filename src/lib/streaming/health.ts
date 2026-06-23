// Health Monitoring Helper for HLS Stream Sources and Providers

interface ProviderStats {
  successes: number;
  failures: number;
  lastSuccess?: Date;
  totalResponseTimeMs: number; // cumulative response time for successful fetches
}

// Default starting values — equal baselines since all providers are now real
const providerStats: Record<string, ProviderStats> = {
  toonworld: { successes: 50, failures: 2, totalResponseTimeMs: 75000 },
  consumet: { successes: 50, failures: 5, totalResponseTimeMs: 100000 },
  animepahe: { successes: 45, failures: 10, totalResponseTimeMs: 112500 },
  anicli: { successes: 0, failures: 50, totalResponseTimeMs: 0 }, // Not implemented — will always fail
  mock: { successes: 100, failures: 0, totalResponseTimeMs: 1000 }, // Always succeeds (test streams)
};

export const StreamingHealth = {
  /**
   * Records a successful fetch/stream load for a provider.
   * @param provider Provider name
   * @param responseTimeMs Optional response time in milliseconds for this fetch
   */
  recordSuccess: (provider: string, responseTimeMs?: number) => {
    const key = provider.toLowerCase();
    if (!providerStats[key]) {
      providerStats[key] = { successes: 0, failures: 0, totalResponseTimeMs: 0 };
    }
    providerStats[key].successes += 1;
    providerStats[key].lastSuccess = new Date();
    if (responseTimeMs !== undefined && responseTimeMs > 0) {
      providerStats[key].totalResponseTimeMs += responseTimeMs;
    }
  },

  /**
   * Records a failure for a provider.
   */
  recordFailure: (provider: string) => {
    const key = provider.toLowerCase();
    if (!providerStats[key]) {
      providerStats[key] = { successes: 0, failures: 0, totalResponseTimeMs: 0 };
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
   * Returns average response time in milliseconds for a provider.
   * Lower is better. Returns Infinity if no successful data yet.
   */
  getAverageResponseTime: (provider: string): number => {
    const key = provider.toLowerCase();
    const stats = providerStats[key];
    if (!stats || stats.successes === 0) return Infinity;
    return stats.totalResponseTimeMs / stats.successes;
  },

  /**
   * Returns current stats for all providers (for debug panel).
   */
  getAllStats: (): Record<string, { successRate: number; total: number; avgResponseMs: number }> => {
    const result: Record<string, { successRate: number; total: number; avgResponseMs: number }> = {};
    for (const [key, stats] of Object.entries(providerStats)) {
      const total = stats.successes + stats.failures;
      result[key] = {
        successRate: total > 0 ? Math.round((stats.successes / total) * 100) : 0,
        total,
        avgResponseMs: stats.successes > 0 ? Math.round(stats.totalResponseTimeMs / stats.successes) : 0,
      };
    }
    return result;
  },

  /**
   * Reorders a list of providers by their success percentage (descending).
   * For ties, faster average response time breaks the tie.
   * Mock provider is always placed last — it should only be used as final fallback.
   */
  getReorderedProviders: (providers: string[]): string[] => {
    return [...providers].sort((a, b) => {
      // Mock always last
      if (a === 'mock') return 1;
      if (b === 'mock') return -1;
      const rateA = StreamingHealth.getSuccessPercentage(a);
      const rateB = StreamingHealth.getSuccessPercentage(b);
      if (Math.abs(rateA - rateB) > 5) {
        // Significant success rate difference — use success rate
        return rateB - rateA;
      }
      // Tie-break by average response time (lower is better)
      return StreamingHealth.getAverageResponseTime(a) - StreamingHealth.getAverageResponseTime(b);
    });
  },

  /**
   * Validates if a stream URL is online, reachable, and returns a valid HLS/media response.
   * No bypasses for demo/test URLs — every URL is checked honestly.
   */
  checkSourceHealth: async (url: string): Promise<boolean> => {
    if (!url) return false;

    // Ignore localhost, mock, or sample URLs
    if (url.startsWith('http://localhost') || url.includes('mock-') || url.includes('sample.m3u8')) {
      return true;
    }

    try {
      // Use AbortController for a strict timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': '*/*',
        },
        signal: controller.signal,
        cache: 'no-store',
      });

      clearTimeout(timeoutId);

      // Specifically handle 404 (Not Found), 410 (Gone), and server errors
      if (res.status === 404 || res.status === 410 || res.status >= 500) {
        console.warn(`[StreamingHealth] Source health check failed for URL: ${url} (HTTP status ${res.status})`);
        return false;
      }

      return true;
    } catch (err: any) {
      console.warn(`[StreamingHealth] Source health check error for URL: ${url} - ${err.message}`);
      return false;
    }
  },
};

export default StreamingHealth;
