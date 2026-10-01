import type { SubtitleTrack, SubtitleStyle, SubtitleCapabilities, SubtitleState, SubtitleError, ParsedCue } from '../types';

export type Unsubscribe = () => void;

export interface SubtitleEngine {
  initialize(video: HTMLVideoElement, container: HTMLDivElement): Promise<void>;
  destroy(): void;
  setTrack(track: SubtitleTrack, signal?: AbortSignal): Promise<void>;
  setDelay(delayMs: number): void;
  setStyle(style: SubtitleStyle): void;
  resize(width: number, height: number, dpr: number): void;
  setVisible(visible: boolean): void;
  
  getCapabilities(): SubtitleCapabilities;

  // Subscriptions returning cleanups
  onCueChange(callback: (cues: ParsedCue[]) => void): Unsubscribe;
  onStateChange(callback: (state: SubtitleState) => void): Unsubscribe;
  onError(callback: (error: SubtitleError) => void): Unsubscribe;
}
