import type { AnalyticsEvent, AnalyticsEventType, AnalyticsContext } from '@/lib/player/types';

// Re-export for consumers that import directly from this module
export type { AnalyticsEvent, AnalyticsEventType, AnalyticsContext };

// ─── Legacy event types (preserved for backwards compatibility) ───────────

/** @deprecated Use AnalyticsEventType from @/lib/player/types */
export type PlayerEventType =
  | 'PLAY'
  | 'PAUSE'
  | 'SEEK'
  | 'BUFFER_START'
  | 'BUFFER_END'
  | 'QUALITY_CHANGE'
  | 'SUBTITLE_CHANGE'
  | 'EPISODE_COMPLETE'
  | 'ERROR';

/** @deprecated Use AnalyticsEvent from @/lib/player/types */
export interface PlayerEvent<T = unknown> {
  type: PlayerEventType;
  timestamp: number;
  episodeId: string;
  userId: string;
  payload: T;
}

// ─── Transport interface ──────────────────────────────────────────────────

export interface IAnalyticsTransport {
  name: string;
  /** Called for every dispatched event, both legacy and new-style */
  send(event: AnalyticsEvent | PlayerEvent<unknown>): void | Promise<void>;
  sendBatch?(events: (AnalyticsEvent | PlayerEvent<unknown>)[]): void | Promise<void>;
}

// Helper to determine event priority
function getEventPriority(type: string): 'critical' | 'normal' | 'low' {
  const criticalEvents = ['EPISODE_COMPLETE', 'progress_save', 'mirror_changed', 'quality_changed', 'quality_change', 'error', 'ERROR'];
  const normalEvents = ['PLAY', 'PAUSE', 'SEEK', 'BUFFER_START', 'BUFFER_END', 'play', 'pause', 'seek', 'buffer_stall'];
  
  if (criticalEvents.includes(type)) return 'critical';
  if (normalEvents.includes(type)) return 'normal';
  return 'low';
}

// ─── Bus ─────────────────────────────────────────────────────────────────

export class AnalyticsBus {
  private static transports: IAnalyticsTransport[] = [];
  private static queue: (AnalyticsEvent | PlayerEvent<unknown>)[] = [];
  private static flushTimer: ReturnType<typeof setTimeout> | null = null;
  private static maxQueueSize = 100;
  private static retryCount = 0;
  private static maxRetries = 5;
  private static retryTimer: ReturnType<typeof setTimeout> | null = null;
  private static isFlushing = false;

  static registerTransport(transport: IAnalyticsTransport) {
    this.transports.push(transport);
  }

  static getTransports(): IAnalyticsTransport[] {
    return [...this.transports];
  }

  /**
   * Dispatch a typed analytics event with shared playback context.
   * Every event includes: animeId, episode, provider, quality,
   * playbackPosition, and timestamp for consistent downstream analysis.
   */
  static dispatch(event: AnalyticsEvent): void;
  /** @deprecated Use the new signature with AnalyticsEvent instead */
  static dispatch<T = unknown>(event: PlayerEvent<T>): void;
  static dispatch(event: AnalyticsEvent | PlayerEvent<unknown>): void {
    // Generate event timestamp immediately at enqueue time
    if ('context' in event) {
      event.context.timestamp = event.context.timestamp || Date.now();
    } else {
      (event as any).timestamp = (event as any).timestamp || Date.now();
    }

    // Check queue limit and enforce priority-based drop policies if full
    if (this.queue.length >= this.maxQueueSize) {
      // 1. Try discarding a 'low' priority event first
      const lowIdx = this.queue.findIndex(e => getEventPriority(e.type) === 'low');
      if (lowIdx > -1) {
        this.queue.splice(lowIdx, 1);
      } else {
        // 2. Try discarding a 'normal' priority event next
        const normalIdx = this.queue.findIndex(e => getEventPriority(e.type) === 'normal');
        if (normalIdx > -1) {
          this.queue.splice(normalIdx, 1);
        } else {
          // 3. Fallback to discarding the oldest event (first in queue)
          this.queue.shift();
        }
      }
    }

    this.queue.push(event);

    // Immediate flush triggers on high-priority boundaries
    const priority = getEventPriority(event.type);
    const isImmediateBoundary =
      priority === 'critical' ||
      event.type === 'EPISODE_COMPLETE' ||
      event.type.includes('changed') ||
      event.type.includes('change');

    if (isImmediateBoundary || this.queue.length >= 20) {
      this.flush();
    } else {
      // Schedule background batch send if not already scheduled
      if (!this.flushTimer) {
        this.flushTimer = setTimeout(() => {
          this.flushTimer = null;
          this.flush();
        }, 5000);
      }
    }
  }

  /**
   * Flush all events in the queue to registered transports.
   * Handles failure retries using capped exponential backoff.
   */
  static async flush(): Promise<void> {
    if (this.isFlushing || this.queue.length === 0) return;
    this.isFlushing = true;

    // Clear background timer if it was running
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    const batch = [...this.queue];

    try {
      // Send events to all registered transports in parallel
      await Promise.all(
        this.transports.map(async (transport) => {
          if (transport.sendBatch) {
            await transport.sendBatch(batch);
          } else {
            // Fallback: loop through events if batch sending is not supported
            for (const item of batch) {
              await transport.send(item);
            }
          }
        })
      );

      // Success! Clear processed batch from queue and reset retries
      this.queue = this.queue.slice(batch.length);
      this.retryCount = 0;
      if (this.retryTimer) {
        clearTimeout(this.retryTimer);
        this.retryTimer = null;
      }
    } catch (error) {
      // Failure: retry using exponential backoff
      this.retryCount++;
      if (this.retryCount <= this.maxRetries) {
        const delay = Math.min(500 * Math.pow(2, this.retryCount - 1), 8000);
        if (this.retryTimer) clearTimeout(this.retryTimer);
        this.retryTimer = setTimeout(() => {
          this.flush();
        }, delay);
      } else {
        // Discard failed batch if retries are exhausted to avoid locking the queue
        this.queue = this.queue.slice(batch.length);
        this.retryCount = 0;
      }
    } finally {
      this.isFlushing = false;
    }
  }

  /**
   * Safe clean unmount trigger. Useful for unmounts or browser close/navigation.
   */
  static flushSync(): void {
    if (this.queue.length === 0) return;
    const batch = [...this.queue];
    this.queue = [];

    this.transports.forEach((transport) => {
      try {
        if (transport.sendBatch) {
          transport.sendBatch(batch);
        } else {
          batch.forEach((item) => {
            transport.send(item);
          });
        }
      } catch {}
    });
  }
}

// ─── Dev console transport ────────────────────────────────────────────────

if (process.env.NODE_ENV !== 'production') {
  AnalyticsBus.registerTransport({
    name: 'ConsoleLogTransport',
    send: (event) => {
      // eslint-disable-next-line no-console
      console.log(`[AnalyticsBus] [${'type' in event ? event.type : 'UNKNOWN'}]`, event);
    },
    sendBatch: (events) => {
      // eslint-disable-next-line no-console
      console.log(`[AnalyticsBus] [BATCH - ${events.length} events]`, events);
    }
  });
}

// Wire client-side tab exit listeners (runs only in browser)
if (typeof window !== 'undefined') {
  const handleExit = () => {
    AnalyticsBus.flushSync();
  };
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      handleExit();
    }
  });
  window.addEventListener('pagehide', handleExit);
}
