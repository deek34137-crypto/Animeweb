import type { ParsedSubtitleTrack } from '../types';

export class SubtitleCache {
  private cache = new Map<string, ParsedSubtitleTrack>();
  private order: string[] = [];
  private limit: number;

  constructor(limit = 15) {
    this.limit = limit;
  }

  public get(key: string): ParsedSubtitleTrack | null {
    if (!this.cache.has(key)) return null;
    
    // Move key to the end of the order to mark it as recently used
    this.order = this.order.filter(k => k !== key);
    this.order.push(key);
    
    return this.cache.get(key) || null;
  }

  public set(key: string, track: ParsedSubtitleTrack): void {
    if (this.cache.has(key)) {
      this.order = this.order.filter(k => k !== key);
    } else if (this.order.length >= this.limit) {
      // Evict the least recently used item (first element in order)
      const oldestKey = this.order.shift();
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
    
    this.cache.set(key, track);
    this.order.push(key);
  }

  public clear(): void {
    this.cache.clear();
    this.order = [];
  }

  public getHitRate(totalRequests: number, hitCount: number): number {
    if (totalRequests === 0) return 0;
    return hitCount / totalRequests;
  }
}
