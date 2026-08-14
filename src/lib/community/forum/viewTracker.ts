export interface ViewTracker {
  /**
   * Checks if a view on a thread is unique for the given IP address.
   * If unique, registers the view in the tracking cache and returns true.
   * Otherwise returns false.
   */
  recordView(ipAddress: string, threadId: string): Promise<boolean>;
}

export class MemoryViewTracker implements ViewTracker {
  // Map of "ipAddress:threadId" -> expiration timestamp (ms)
  private cache = new Map<string, number>();
  private readonly ttlMs: number;

  constructor(ttlMinutes: number = 60) {
    this.ttlMs = ttlMinutes * 60 * 1000;
  }

  async recordView(ipAddress: string, threadId: string): Promise<boolean> {
    const now = Date.now();
    const key = `${ipAddress}:${threadId}`;

    // Inline cleanup of expired entries to prevent memory growth
    this.cleanupExpired(now);

    const expiry = this.cache.get(key);
    if (expiry && expiry > now) {
      // Already viewed within the TTL window
      return false;
    }

    // Set new expiration
    this.cache.set(key, now + this.ttlMs);
    return true;
  }

  private cleanupExpired(now: number) {
    for (const [key, expiry] of this.cache.entries()) {
      if (expiry <= now) {
        this.cache.delete(key);
      }
    }
  }
}

// Export a singleton instance of the default memory tracker
export const defaultViewTracker = new MemoryViewTracker();
