/**
 * Shared player types — used across hooks, components, and analytics.
 */

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

export interface SubtitleTrack {
  label: string;
  lang: string;
  url: string;
}
