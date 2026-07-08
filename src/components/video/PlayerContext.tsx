'use client';

import React, { createContext, useContext, useMemo, RefObject } from 'react';
import type { SkipInterval, StoryboardCue, EpisodeSource } from '@/lib/player/types';

// Playback Context
export interface PlaybackContextType {
  videoRef: RefObject<HTMLVideoElement | null>;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  playbackSpeed: number;
  setPlaybackSpeed: (speed: number) => void;
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
  volume: number;
  setVolume: (vol: number) => void;
  duration: number;
  setDuration: (dur: number) => void;
  togglePlay: () => void;
  toggleMute: () => void;
  seek: (time: number) => void;
  changeSpeed: (speed: number) => void;
  isLongPressing2x: boolean;
  episodeNumber: number;
}

export const PlaybackContext = createContext<PlaybackContextType | null>(null);

// Session Context
export interface SessionContextType {
  currentLanguage: string;
  setCurrentLanguage: (lang: any) => void;
  currentQuality: string;
  selectQuality: (quality: string) => void;
  currentProviderName: string;
  selectProvider: (provider: string) => void;
  qualityLevels: string[];
  providersList: string[];
  subtitleTracks: { lang: string; label: string; url: string }[];
  activeSubtitleIdx: number;
  setActiveSubtitleIdx: (idx: number) => void;
  hasNativeHindi: boolean;
  activeSource: EpisodeSource | null;
  activeSources: EpisodeSource[];
  isIframeSource: boolean;
}

export const SessionContext = createContext<SessionContextType | null>(null);

// Preferences Context
export interface PreferencesContextType {
  preferences: {
    subtitleLanguage: string;
    defaultAudioLanguage: string;
    autoSkipOP: boolean;
    autoSkipED: boolean;
    skipRecaps: boolean;
    skipCredits: boolean;
    alwaysResume: boolean;
    autoplay: boolean;
    autoNext: boolean;
  };
  preferencesLoading: boolean;
  debouncedSetDevicePreference: (key: any, value: any) => void;
  togglePreference: (key: string) => Promise<void>;
  // Skip info
  skipIntervals: SkipInterval[];
  showSkipIntro: boolean;
  showSkipEnding: boolean;
  skipIntro: () => void;
  skipEnding: () => void;
}

export const PreferencesContext = createContext<PreferencesContextType | null>(null);

// UI Context
export interface UIContextType {
  isFullscreen: boolean;
  setIsFullscreen: (fullscreen: any) => void;
  toggleFullscreen: () => void;
  showControls: boolean;
  setShowControls: (show: any) => void;
  isPiPSupported: boolean;
  togglePiP: () => Promise<void>;
  reducedMotion: boolean;
  setReducedMotion: (reduced: any) => void;
  accentColor: string;
  accentH: number;
  accentS: string;
  accentL: string; // Wait, let's verify if accentL is also a string!
  // Navigation
  handleNext: () => void;
  handlePrev: () => void;
  formatTime: (secs: number) => string;
  getCueAt: (time: number) => StoryboardCue | null;
  bookmarks: { id?: string; timestamp: number }[];
}

export const UIContext = createContext<UIContextType | null>(null);

// Combined Provider
export interface PlayerProviderProps {
  playback: PlaybackContextType;
  session: SessionContextType;
  preferences: PreferencesContextType;
  ui: UIContextType;
  children: React.ReactNode;
}

export function PlayerProvider({
  playback,
  session,
  preferences,
  ui,
  children,
}: PlayerProviderProps) {
  // Memoize stable arrays to prevent unnecessary renders in context updates
  const sessionMemo = useMemo(() => session, [
    session.currentLanguage,
    session.currentQuality,
    session.currentProviderName,
    session.qualityLevels,
    session.providersList,
    session.subtitleTracks,
    session.activeSubtitleIdx,
    session.hasNativeHindi,
    session.activeSource,
    session.activeSources,
    session.isIframeSource,
  ]);

  const preferencesMemo = useMemo(() => preferences, [
    preferences.preferences,
    preferences.preferencesLoading,
    preferences.skipIntervals,
    preferences.showSkipIntro,
    preferences.showSkipEnding,
  ]);

  const uiMemo = useMemo(() => ui, [
    ui.isFullscreen,
    ui.showControls,
    ui.isPiPSupported,
    ui.reducedMotion,
    ui.accentColor,
    ui.accentH,
    ui.accentS,
    ui.accentL,
    ui.bookmarks,
  ]);

  return (
    <PlaybackContext.Provider value={playback}>
      <SessionContext.Provider value={sessionMemo}>
        <PreferencesContext.Provider value={preferencesMemo}>
          <UIContext.Provider value={uiMemo}>
            {children}
          </UIContext.Provider>
        </PreferencesContext.Provider>
      </SessionContext.Provider>
    </PlaybackContext.Provider>
  );
}

// Unified Hooks
export function usePlayback() {
  const context = useContext(PlaybackContext);
  if (!context) throw new Error('usePlayback must be used within a PlayerProvider');
  return context;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession must be used within a PlayerProvider');
  return context;
}

export function usePlayerPreferences() {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error('usePlayerPreferences must be used within a PlayerProvider');
  return context;
}

export function usePlayerUI() {
  const context = useContext(UIContext);
  if (!context) throw new Error('usePlayerUI must be used within a PlayerProvider');
  return context;
}

export function usePlayer() {
  const playback = useContext(PlaybackContext);
  const session = useContext(SessionContext);
  const prefs = useContext(PreferencesContext);
  const ui = useContext(UIContext);

  if (!playback || !session || !prefs || !ui) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }

  return useMemo(() => ({
    ...playback,
    ...session,
    ...prefs,
    ...ui,
  }), [playback, session, prefs, ui]);
}
