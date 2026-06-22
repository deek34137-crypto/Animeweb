class ProgressService {
  // Store key = animeId:episode, value = last saved timestamp in milliseconds
  private lastSaveTimes = new Map<string, number>();

  /**
   * Dispatches watch progress updates throttled to once every 30 seconds,
   * or immediately if forced (such as on play pause, ended, or unload).
   */
  public async updateProgress(data: {
    animeId: string;
    animeTitle: string;
    animeImage: string;
    episode: number;
    position: number; // current time in seconds
    duration: number; // total duration in seconds
    totalEpisodes?: number | null;
    force?: boolean;
  }) {
    const key = `${data.animeId}:${data.episode}`;
    const now = Date.now();
    const lastSave = this.lastSaveTimes.get(key) || 0;

    const currentPos = Math.round(data.position);
    const totalDuration = Math.round(data.duration);
    
    if (totalDuration <= 0) return;

    const isCompletedThreshold = currentPos >= totalDuration * 0.90;

    // Check throttle constraints: 30 seconds cooldown, completed threshold reached, or forced save
    if (data.force || isCompletedThreshold || now - lastSave >= 30000) {
      this.lastSaveTimes.set(key, now);

      try {
        // Send async post request to server route
        const response = await fetch('/api/stream/progress', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            animeId: data.animeId,
            animeTitle: data.animeTitle,
            animeImage: data.animeImage,
            episode: data.episode,
            position: currentPos,
            duration: totalDuration,
            totalEpisodes: data.totalEpisodes,
          }),
        });

        if (!response.ok) {
          throw new Error(`Progress sync response status: ${response.status}`);
        }
      } catch (err) {
        console.warn('Failed to sync playback progress to database:', err);
      }
    }
  }

  /**
   * Helper to execute progress syncs during page unloads using beacon fetch.
   */
  public syncProgressBeacon(data: {
    animeId: string;
    animeTitle: string;
    animeImage: string;
    episode: number;
    position: number;
    duration: number;
    totalEpisodes?: number | null;
  }) {
    const currentPos = Math.round(data.position);
    const totalDuration = Math.round(data.duration);

    if (totalDuration <= 0) return;

    const payload = JSON.stringify({
      animeId: data.animeId,
      animeTitle: data.animeTitle,
      animeImage: data.animeImage,
      episode: data.episode,
      position: currentPos,
      duration: totalDuration,
      totalEpisodes: data.totalEpisodes,
    });

    // Use sendBeacon if available for reliable unload transmission, fallback to fetch
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([payload], { type: 'application/json' });
      navigator.sendBeacon('/api/stream/progress', blob);
    } else {
      fetch('/api/stream/progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    }
  }
}

export const progressService = new ProgressService();
export default progressService;
