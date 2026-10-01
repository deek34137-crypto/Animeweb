import type { SubtitleEngine, Unsubscribe } from './SubtitleEngine';
import type { SubtitleTrack, SubtitleStyle, SubtitleCapabilities, SubtitleState, ParsedCue, SubtitleError, SubtitleErrorType } from '../types';
import { VttParser, SrtParser } from './SubtitleParser';
import { SubtitleCache } from './SubtitleCache';

export class WebVttSubtitleEngine implements SubtitleEngine {
  private video: HTMLVideoElement | null = null;
  private container: HTMLDivElement | null = null;
  private activeTrack: SubtitleTrack | null = null;
  private delayMs = 0;
  private style: SubtitleStyle | null = null;
  private visible = true;
  private state: SubtitleState = 'idle';

  // Parsers and Caching
  private vttParser = new VttParser();
  private srtParser = new SrtParser();
  private static cache = new SubtitleCache(15);

  // Subscriptions lists
  private cueListeners = new Set<(cues: ParsedCue[]) => void>();
  private stateListeners = new Set<(state: SubtitleState) => void>();
  private errorListeners = new Set<(error: SubtitleError) => void>();

  // Parsed cues
  private currentCues: ParsedCue[] = [];
  private lastRenderedCuesJson = '';

  // Timing loops
  private animationFrameId: number | null = null;
  private isRunning = false;

  public async initialize(video: HTMLVideoElement, container: HTMLDivElement): Promise<void> {
    this.video = video;
    this.container = container;
    this.startTimingLoop();
    this.updateState('idle');
  }

  public destroy(): void {
    this.stopTimingLoop();
    this.video = null;
    this.container = null;
    this.cueListeners.clear();
    this.stateListeners.clear();
    this.errorListeners.clear();
    this.currentCues = [];
  }

  public getCapabilities(): SubtitleCapabilities {
    return {
      supportsCustomStyling: true,
      supportsPositioning: true,
      supportsDelay: true,
      supportsVisibility: true
    };
  }

  public async setTrack(track: SubtitleTrack, signal?: AbortSignal): Promise<void> {
    this.activeTrack = track;
    this.currentCues = [];
    this.notifyCueChange([]);

    const cacheKey = `${track.provider || 'default'}:${track.url}:${track.version || '1.0'}`;
    const cached = WebVttSubtitleEngine.cache.get(cacheKey);

    if (cached) {
      this.currentCues = cached.cues;
      this.updateState('ready');
      this.tick();
      return;
    }

    this.updateState('loading');

    try {
      const response = await fetch(track.url, { signal });
      if (!response.ok) {
        throw new Error(`Failed to fetch subtitle track: ${response.statusText}`);
      }
      const content = await response.text();
      
      if (signal?.aborted) return;

      const parser = track.codec === 'srt' ? this.srtParser : this.vttParser;
      const parsedTrack = await parser.parse(content);
      
      if (signal?.aborted) return;

      WebVttSubtitleEngine.cache.set(cacheKey, parsedTrack);
      this.currentCues = parsedTrack.cues;
      this.updateState('ready');
      this.tick();
    } catch (err: any) {
      if (signal?.aborted) return;
      
      const subErr: SubtitleError = {
        type: err.name === 'AbortError' ? 'network' : 'parse',
        message: err.message || 'Unknown parsing or network error',
        originalError: err
      };
      this.updateState('error');
      this.notifyError(subErr);
    }
  }

  public setDelay(delayMs: number): void {
    this.delayMs = delayMs;
    this.tick();
  }

  public setStyle(style: SubtitleStyle): void {
    this.style = style;
    // Styling values will be parsed in UI React components dynamically
  }

  public resize(width: number, height: number, dpr: number): void {
    // Handled in WebVTT CSS layout
  }

  public setVisible(visible: boolean): void {
    this.visible = visible;
    this.tick();
  }

  // Subscription registration
  public onCueChange(callback: (cues: ParsedCue[]) => void): Unsubscribe {
    this.cueListeners.add(callback);
    callback(this.getActiveCues());
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

  // Timing update loops
  private startTimingLoop(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    
    if (this.video) {
      this.video.addEventListener('timeupdate', this.onTimeUpdate);
    }
    
    this.requestFrame();
  }

  private stopTimingLoop(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.video) {
      this.video.removeEventListener('timeupdate', this.onTimeUpdate);
    }
  }

  private onTimeUpdate = () => {
    this.tick();
  };

  private recursionDepth = 0;
  private requestFrame(): void {
    if (!this.isRunning) return;
    if (this.recursionDepth > 3) return;
    
    this.recursionDepth++;
    try {
      if (this.video && 'requestVideoFrameCallback' in this.video) {
        (this.video as any).requestVideoFrameCallback(() => {
          this.tick();
          this.requestFrame();
        });
      } else {
        this.animationFrameId = requestAnimationFrame(() => {
          this.tick();
          this.requestFrame();
        });
      }
    } finally {
      this.recursionDepth--;
    }
  }

  private tick(): void {
    if (!this.video || !this.visible || this.state !== 'ready') {
      this.notifyCueChange([]);
      return;
    }

    const activeCues = this.getActiveCues();
    const activeJson = JSON.stringify(activeCues);
    if (activeJson !== this.lastRenderedCuesJson) {
      this.lastRenderedCuesJson = activeJson;
      this.notifyCueChange(activeCues);
    }
  }

  private getActiveCues(): ParsedCue[] {
    if (!this.video || !this.visible || this.currentCues.length === 0) return [];
    
    const adjustedTime = this.video.currentTime + (this.delayMs / 1000);
    const active: ParsedCue[] = [];
    
    let lo = 0;
    let hi = this.currentCues.length - 1;
    let index = -1;
    
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const cue = this.currentCues[mid];
      if (adjustedTime >= cue.startTime && adjustedTime <= cue.endTime) {
        index = mid;
        break;
      }
      if (adjustedTime < cue.startTime) {
        hi = mid - 1;
      } else {
        lo = mid + 1;
      }
    }

    if (index !== -1) {
      active.push(this.currentCues[index]);
      
      let i = index - 1;
      while (i >= 0 && adjustedTime >= this.currentCues[i].startTime && adjustedTime <= this.currentCues[i].endTime) {
        active.push(this.currentCues[i]);
        i--;
      }
      
      let j = index + 1;
      while (j < this.currentCues.length && adjustedTime >= this.currentCues[j].startTime && adjustedTime <= this.currentCues[j].endTime) {
        active.push(this.currentCues[j]);
        j++;
      }
    }
    
    return active;
  }

  private updateState(state: SubtitleState): void {
    this.state = state;
    for (const listener of this.stateListeners) {
      listener(state);
    }
  }

  private notifyCueChange(cues: ParsedCue[]): void {
    for (const listener of this.cueListeners) {
      listener(cues);
    }
  }

  private notifyError(error: SubtitleError): void {
    for (const listener of this.errorListeners) {
      listener(error);
    }
  }
}
