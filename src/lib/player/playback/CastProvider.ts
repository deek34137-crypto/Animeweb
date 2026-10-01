import { CastState, CastCapabilities } from '../types';

export interface CastProvider {
  name: string;
  supported(): boolean;
  getCapabilities(): CastCapabilities;
  connect(video: HTMLVideoElement): Promise<void>;
  disconnect(): Promise<void>;
  getState(): CastState;
  subscribe(callback: (state: CastState) => void): () => void;
  dispose(): void;
}

export class RemotePlaybackProvider implements CastProvider {
  public name = 'remotePlayback';
  private state: CastState = 'idle';
  private listeners: Set<(state: CastState) => void> = new Set();
  private videoElement: HTMLVideoElement | null = null;
  private watchId: any = null;

  constructor() {}

  public supported(): boolean {
    if (typeof window === 'undefined') return false;
    return 'remote' in HTMLMediaElement.prototype;
  }

  public getCapabilities(): CastCapabilities {
    const isSupported = this.supported();
    return {
      available: isSupported,
      canConnect: isSupported && this.state !== 'connected' && this.state !== 'connecting',
      provider: 'W3C Remote Playback API'
    };
  }

  private notify() {
    // Snapshot-safe listener execution
    const targets = Array.from(this.listeners);
    targets.forEach(cb => cb(this.state));
  }

  public async connect(video: HTMLVideoElement): Promise<void> {
    if (!this.supported()) {
      this.state = 'failed';
      this.notify();
      throw new Error('Remote Playback API is unsupported on this browser.');
    }

    this.videoElement = video;
    const remote = (video as any).remote;

    try {
      this.state = 'connecting';
      this.notify();

      // Listen for remote state changes
      remote.addEventListener('statechange', this.handleStateChange);

      // Start watching availability if supported
      if (remote && typeof remote.watchAvailability === 'function') {
        try {
          this.watchId = await remote.watchAvailability((available: boolean) => {
            // Can be used to log or trace availability
          });
        } catch (e) {
          console.warn('watchAvailability failed:', e);
        }
      }

      await remote.prompt();
    } catch (err) {
      this.state = 'failed';
      this.notify();
      remote.removeEventListener('statechange', this.handleStateChange);
      throw err;
    }
  }

  public async disconnect(): Promise<void> {
    if (!this.videoElement) return;
    const remote = (this.videoElement as any).remote;
    if (remote) {
      this.state = 'disconnecting';
      this.notify();
      try {
        await remote.prompt();
      } catch (err) {
        this.state = 'failed';
        this.notify();
        console.warn('Disconnect prompt error:', err);
      }
    }
  }

  public getState(): CastState {
    return this.state;
  }

  public subscribe(callback: (state: CastState) => void): () => void {
    this.listeners.add(callback);
    callback(this.state);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private handleStateChange = (e: any) => {
    const remoteState = e.target.state; // 'connecting' | 'connected' | 'disconnected'
    if (remoteState === 'connecting') {
      this.state = 'connecting';
    } else if (remoteState === 'connected') {
      this.state = 'connected';
    } else if (remoteState === 'disconnected') {
      this.state = 'idle';
    } else {
      this.state = 'idle';
    }
    this.notify();
  };

  public dispose(): void {
    const targets = Array.from(this.listeners);
    targets.forEach(cb => cb('idle'));
    this.listeners.clear();
    if (this.videoElement) {
      const remote = (this.videoElement as any).remote;
      if (remote) {
        remote.removeEventListener('statechange', this.handleStateChange);
        if (this.watchId !== null && typeof remote.cancelWatchAvailability === 'function') {
          try {
            remote.cancelWatchAvailability(this.watchId);
          } catch {}
        }
      }
    }
    this.videoElement = null;
    this.watchId = null;
    this.state = 'idle';
  }
}
