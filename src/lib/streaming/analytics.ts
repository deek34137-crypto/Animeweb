// Simple Streaming Analytics Logger

export const StreamingAnalytics = {
  trackProviderFailure: (provider: string, error: string) => {
    console.warn(`[ANALYTICS] Provider Failure: provider=${provider}, error=${error}`);
  },

  trackPlaybackFailure: (provider: string, episode: number, error: string) => {
    console.error(`[ANALYTICS] Playback Failure: provider=${provider}, episode=${episode}, error=${error}`);
  },

  trackFallbackEvent: (fromProvider: string, toProvider: string, episode: number) => {
    console.info(`[ANALYTICS] Fallback Event: from=${fromProvider}, to=${toProvider}, episode=${episode}`);
  },
};

export default StreamingAnalytics;
