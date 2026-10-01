import { PlayerEvent } from '../types';

export interface PlayerPlugin {
  name: string;
  install(bus: PlayerEventBus, context: any): void;
  dispose(): void;
}

export class PlayerEventBus {
  private listeners: Set<(ev: PlayerEvent) => void> = new Set();

  public emit(event: PlayerEvent) {
    // Snapshot-safe emission to prevent concurrent modification errors
    const targets = Array.from(this.listeners);
    targets.forEach(cb => {
      try {
        cb(event);
      } catch (err) {
        console.error(`[PlayerEventBus] Listener error for event ${event.type}:`, err);
      }
    });
  }

  public subscribe(cb: (ev: PlayerEvent) => void): () => void {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  public dispose() {
    this.listeners.clear();
  }
}
