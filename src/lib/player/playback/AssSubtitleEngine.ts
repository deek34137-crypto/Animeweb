import type { SubtitleEngine, Unsubscribe } from './SubtitleEngine';
import type { SubtitleTrack, SubtitleStyle, SubtitleCapabilities, SubtitleState, ParsedCue, SubtitleError, SubtitleErrorType } from '../types';

export class AssSubtitleEngine implements SubtitleEngine {
  private video: HTMLVideoElement | null = null;
  private container: HTMLDivElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private activeTrack: SubtitleTrack | null = null;
  private delayMs = 0;
  private visible = true;
  private state: SubtitleState = 'idle';
  
  private jassubInstance: any = null;
  private scriptLoadingPromise: Promise<void> | null = null;

  // Subscriptions lists
  private cueListeners = new Set<(cues: ParsedCue[]) => void>();
  private stateListeners = new Set<(state: SubtitleState) => void>();
  private errorListeners = new Set<(error: SubtitleError) => void>();

  public async initialize(video: HTMLVideoElement, container: HTMLDivElement): Promise<void> {
    this.video = video;
    this.container = container;
    
    // Create ASS Canvas Overlay
    this.canvas = document.createElement('canvas');
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.zIndex = '15'; // display above video but below player controls
    this.container.appendChild(this.canvas);
    
    this.updateState('idle');
  }

  public destroy(): void {
    if (this.jassubInstance) {
      try {
        this.jassubInstance.destroy();
      } catch {}
      this.jassubInstance = null;
    }
    if (this.canvas && this.container) {
      try {
        this.container.removeChild(this.canvas);
      } catch {}
    }
    this.canvas = null;
    this.video = null;
    this.container = null;
    this.cueListeners.clear();
    this.stateListeners.clear();
    this.errorListeners.clear();
  }

  public getCapabilities(): SubtitleCapabilities {
    return {
      supportsCustomStyling: false, // preserve author styling
      supportsPositioning: false,   // preserve author formatting
      supportsDelay: true,
      supportsVisibility: true
    };
  }

  public async setTrack(track: SubtitleTrack, signal?: AbortSignal): Promise<void> {
    this.activeTrack = track;
    this.updateState('loading');

    try {
      await this.loadJassubScript(signal);
      if (signal?.aborted) return;

      const JASSUB = (window as any).JASSUB;
      if (!JASSUB) {
        throw new Error('JASSUB library is not defined after script load');
      }

      if (this.jassubInstance) {
        // Reuse JASSUB instance on track changes
        this.jassubInstance.destroy();
        this.jassubInstance = null;
      }

      if (!this.video || !this.canvas) return;

      this.jassubInstance = new JASSUB({
        video: this.video,
        canvas: this.canvas,
        subUrl: track.url,
        workerUrl: '/vendor/jassub/jassub-worker.js',
        delay: this.delayMs / 1000,
        visible: this.visible,
        fallbackFont: '/fonts/Arial.ttf' // Fallback font mapping if required
      });

      this.updateState('ready');
    } catch (err: any) {
      if (signal?.aborted) return;
      
      const subErr: SubtitleError = {
        type: 'engine_initialization',
        message: err.message || 'Failed to load JASSUB subtitle engine',
        originalError: err
      };
      this.updateState('error');
      this.notifyError(subErr);
    }
  }

  public setDelay(delayMs: number): void {
    this.delayMs = delayMs;
    if (this.jassubInstance) {
      try {
        this.jassubInstance.setDelay(delayMs / 1000);
      } catch {}
    }
  }

  public setStyle(style: SubtitleStyle): void {
    // Unsupported: Keep author styling intact
  }

  public resize(width: number, height: number, dpr: number): void {
    if (this.jassubInstance) {
      try {
        // Call resize if JASSUB supports it
        this.jassubInstance.resize();
      } catch {}
    }
  }

  public setVisible(visible: boolean): void {
    this.visible = visible;
    if (this.jassubInstance) {
      try {
        if (visible) {
          this.jassubInstance.show();
        } else {
          this.jassubInstance.hide();
        }
      } catch {}
    }
  }

  // Subscription registration
  public onCueChange(callback: (cues: ParsedCue[]) => void): Unsubscribe {
    this.cueListeners.add(callback);
    // ASS renders entirely via Canvas; we return an empty cue payload to WebVTT overlays
    callback([]);
    return () => {
      this.cueListeners.delete(callback);
    };
  }

  public onStateChange(callback: (state: SubtitleState) => void): Unsubscribe {
    this.stateListeners.add(callback);
    callback(this.state);
    return () => {
      this.stateListeners.delete(callback);
    };
  }

  public onError(callback: (error: SubtitleError) => void): Unsubscribe {
    this.errorListeners.add(callback);
    return () => {
      this.errorListeners.delete(callback);
    };
  }

  // JASSUB JavaScript wrapper dynamic loading
  private loadJassubScript(signal?: AbortSignal): Promise<void> {
    if ((window as any).JASSUB) {
      return Promise.resolve();
    }
    if (this.scriptLoadingPromise) {
      return this.scriptLoadingPromise;
    }

    this.scriptLoadingPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = '/vendor/jassub/jassub.js';
      script.async = true;

      const onAbort = () => {
        script.removeEventListener('load', onLoad);
        script.removeEventListener('error', onError);
        document.head.removeChild(script);
        this.scriptLoadingPromise = null;
        reject(new DOMException('JASSUB script load aborted', 'AbortError'));
      };

      const onLoad = () => {
        script.removeEventListener('load', onLoad);
        script.removeEventListener('error', onError);
        signal?.removeEventListener('abort', onAbort);
        resolve();
      };

      const onError = () => {
        script.removeEventListener('load', onLoad);
        script.removeEventListener('error', onError);
        signal?.removeEventListener('abort', onAbort);
        document.head.removeChild(script);
        this.scriptLoadingPromise = null;
        reject(new Error('Failed to load JASSUB script from /vendor/jassub/jassub.js'));
      };

      if (signal?.aborted) {
        reject(new DOMException('JASSUB script load aborted', 'AbortError'));
        return;
      }

      signal?.addEventListener('abort', onAbort);
      script.addEventListener('load', onLoad);
      script.addEventListener('error', onError);
      document.head.appendChild(script);
    });

    return this.scriptLoadingPromise;
  }

  private updateState(state: SubtitleState): void {
    this.state = state;
    for (const listener of this.stateListeners) {
      listener(state);
    }
  }

  private notifyError(error: SubtitleError): void {
    for (const listener of this.errorListeners) {
      listener(error);
    }
  }
}
