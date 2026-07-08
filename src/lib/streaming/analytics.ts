// Streaming Analytics Logger

export type FailureSeverity = 'minor' | 'medium' | 'high' | 'critical';

export const StreamingAnalytics = {
  trackProviderFailure: (
    provider: string,
    error: string,
    severity: FailureSeverity = 'medium',
  ) => {
    console.warn(
      `[ANALYTICS] Provider Failure: provider=${provider}, severity=${severity}, error=${error}`,
    );
  },

  trackPlaybackFailure: (provider: string, episode: number, error: string) => {
    console.error(
      `[ANALYTICS] Playback Failure: provider=${provider}, episode=${episode}, error=${error}`,
    );
  },

  trackFallbackEvent: (fromProvider: string, toProvider: string, episode: number) => {
    console.info(
      `[ANALYTICS] Fallback Event: from=${fromProvider}, to=${toProvider}, episode=${episode}`,
    );
  },

  trackAutoFailover: (fromProvider: string, skipProviders: string[], episode: number) => {
    console.info(
      `[ANALYTICS] Auto-Failover: from=${fromProvider}, skipping=[${skipProviders.join(', ')}], episode=${episode}`,
    );
  },
};

export default StreamingAnalytics;
