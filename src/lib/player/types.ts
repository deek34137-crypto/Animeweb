export interface PlayerEvent {
  type: string;
  payload?: any;
}

// ─── Chapter Types ─────────────────────────────────────────────────────────

export enum ChapterType {
  Intro    = 'intro',
  Opening  = 'opening',
  PartA    = 'partA',
  MidCard  = 'midCard',
  PartB    = 'partB',
  Ending   = 'ending',
  Preview  = 'preview',
  Credits  = 'credits',
  Unknown  = 'unknown',
}

export interface ChapterSegment {
  title: string;
  type: ChapterType;
  startTime: number;
  endTime: number;
}

// ─── Skip Intervals ────────────────────────────────────────────────────────

export interface SkipInterval {
  startTime: number;
  endTime: number;
  type: 'op' | 'ed' | 'recap';
}

// ─── Analytics ─────────────────────────────────────────────────────────────

export interface AnalyticsContext {
  animeId: string;
  episode: number;
  provider: string;
  quality: string;
  playbackPosition: number;
  timestamp: number;
}

export type AnalyticsEventType =
  | 'play'
  | 'pause'
  | 'seek'
  | 'quality_changed'
  | 'mirror_changed'
  | 'auto_skip_triggered'
  | 'next_episode_accepted'
  | 'next_episode_cancelled'
  | 'progress_save'
  | 'buffer_stall'
  | 'episode_complete';

export interface AnalyticsEvent {
  type: AnalyticsEventType;
  context: AnalyticsContext;
  payload?: Record<string, unknown>;
}

// ─── Storyboard ────────────────────────────────────────────────────────────

export interface StoryboardCue {
  startTime: number;
  endTime: number;
  imageUrl: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

// ─── Episode Source ────────────────────────────────────────────────────────

export interface EpisodeSource {
  url: string;
  quality: '1080p' | '720p' | '480p' | '360p' | 'auto' | 'default';
  isM3U8: boolean;
  lang?: string;
}
export type SubtitleState = 'idle' | 'loading' | 'ready' | 'error';

export type SubtitleErrorType = 'network' | 'parse' | 'unsupported_format' | 'engine_initialization' | 'rendering';

export interface SubtitleError {
  type: SubtitleErrorType;
  message: string;
  originalError?: any;
}

export interface SubtitleCapabilities {
  supportsCustomStyling: boolean;
  supportsPositioning: boolean;
  supportsDelay: boolean;
  supportsVisibility: boolean;
}

export interface SubtitleTrack {
  id?: string;
  lang: string;
  label: string;
  codec?: 'vtt' | 'srt' | 'ass';
  mimeType?: string;
  url: string;
  isDefault?: boolean;
  isForced?: boolean;
  isSDH?: boolean;
  provider?: string;
  version?: string;
}

export interface SubtitleFragment {
  type: 'text' | 'bold' | 'italic' | 'underline' | 'ruby' | 'rt' | 'class' | 'voice';
  text: string;
  children?: SubtitleFragment[];
  attributes?: Record<string, string>;
}

export interface ParsedCue {
  id?: string;
  startTime: number; // in seconds
  endTime: number;   // in seconds
  fragments: SubtitleFragment[];
}

export interface ParsedSubtitleTrack {
  cues: ParsedCue[];
}

export interface SubtitleStyle {
  fontSizeMultiplier: number; // 0.8, 1.0, 1.2, 1.5, 2.0
  fontFamily: string;
  textColor: string;
  backgroundMode: 'none' | 'shadow' | 'semi-transparent' | 'solid';
  verticalPosition: number; // 0-100 representing position from bottom
}

// ─── Premium UX Types ───────────────────────────────────────────────────────

export type PlayerAction =
  | 'togglePlay'
  | 'seekBackward'
  | 'seekForward'
  | 'volumeUp'
  | 'volumeDown'
  | 'toggleMute'
  | 'toggleFullscreen'
  | 'cycleSubtitle'
  | 'delayDecrease'
  | 'delayIncrease'
  | 'delayReset'
  | 'speedIncrease'
  | 'speedDecrease'
  | 'nextEpisode'
  | 'prevEpisode'
  | 'skipIntro'
  | 'skipEnding';

export interface KeyBinding {
  code: string; // KeyboardEvent.code (e.g. 'Space', 'KeyK', 'ArrowLeft')
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;
}

export type KeyBinds = Record<PlayerAction, KeyBinding>;

export type CastState = 'idle' | 'connecting' | 'connected' | 'disconnecting' | 'failed';

export interface CastCapabilities {
  available: boolean;
  canConnect: boolean;
  provider: string;
}

