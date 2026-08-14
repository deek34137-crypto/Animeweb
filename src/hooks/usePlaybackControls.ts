'use client';

import { useEffect, useRef, RefObject } from 'react';
import { KeyBinds, PlayerAction } from '@/lib/player/types';
import { DEFAULT_KEYBINDS } from '@/lib/player/preferences/preferences';

interface UsePlaybackControlsOptions {
  videoRef: RefObject<HTMLVideoElement | null>;
  isPlaying: boolean;
  isLoading: boolean;
  playbackSpeed: number;
  volume: number;
  isMuted: boolean;
  activeSubtitleIdx: number;
  subtitleCount: number;
  episodeNumber: number;
  totalEpisodes: number | undefined;
  showSkipIntro: boolean;
  showSkipEnding: boolean;
  keyBinds?: Partial<KeyBinds>;
  /** Called when user toggles play/pause */
  onTogglePlay: () => void;
  /** Called to seek to a specific time */
  onSeek: (time: number) => void;
  /** Called when user changes volume [0, 1] */
  onVolumeChange: (vol: number) => void;
  /** Called when user toggles mute */
  onToggleMute: () => void;
  /** Called when user toggles fullscreen */
  onToggleFullscreen: () => void;
  /** Called when speed changes (e.g. +0.25) */
  onSpeedChange: (speed: number) => void;
  /** Called to cycle to the next subtitle track */
  onCycleSubtitle: () => void;
  /** Called to shift subtitle delay (offset) */
  onAdjustDelay?: (amount: number) => void;
  /** Called to reset subtitle delay to 0 */
  onResetDelay?: () => void;
  /** Called to manually skip intro */
  onSkipIntro: () => void;
  /** Called to manually skip ending */
  onSkipEnding: () => void;
  /** Called to go to next episode */
  onNext: () => void;
  /** Called to go to previous episode */
  onPrev: () => void;
  /** Called when 2x hold state changes */
  onLongPressChange: (active: boolean) => void;
}

const HOLD_THRESHOLD_MS = 450;
const SPEED_2X = 2.0;

const normalizeCode = (e: KeyboardEvent) => {
  if (e.code) return e.code;
  const keyToCodeMap: Record<string, string> = {
    ' ': 'Space',
    'ArrowLeft': 'ArrowLeft',
    'ArrowRight': 'ArrowRight',
    'ArrowUp': 'ArrowUp',
    'ArrowDown': 'ArrowDown',
    'm': 'KeyM', 'M': 'KeyM',
    'f': 'KeyF', 'F': 'KeyF',
    'c': 'KeyC', 'C': 'KeyC',
    '[': 'BracketLeft',
    ']': 'BracketRight',
    '\\': 'Backslash',
    '.': 'Period',
    ',': 'Comma',
    'n': 'KeyN', 'N': 'KeyN',
    'p': 'KeyP', 'P': 'KeyP',
    'i': 'KeyI', 'I': 'KeyI',
    'e': 'KeyE', 'E': 'KeyE',
    'v': 'KeyV', 'V': 'KeyV',
    'Shift': 'ShiftLeft',
  };
  return keyToCodeMap[e.key] || e.key;
};

const serializeKey = (e: KeyboardEvent) => {
  const parts: string[] = [];
  if (e.ctrlKey) parts.push('ctrl');
  if (e.altKey) parts.push('alt');
  const code = normalizeCode(e);
  if (e.shiftKey && code !== 'ShiftLeft' && code !== 'ShiftRight') parts.push('shift');
  if (e.metaKey) parts.push('meta');
  parts.push(code);
  return parts.join('+');
};

const serializeBinding = (binding: { code: string; ctrl?: boolean; alt?: boolean; shift?: boolean; meta?: boolean }) => {
  const parts: string[] = [];
  if (binding.ctrl) parts.push('ctrl');
  if (binding.alt) parts.push('alt');
  if (binding.shift) parts.push('shift');
  if (binding.meta) parts.push('meta');
  parts.push(binding.code);
  return parts.join('+');
};

export function usePlaybackControls({
  videoRef,
  isPlaying,
  isLoading,
  playbackSpeed,
  volume,
  isMuted,
  activeSubtitleIdx,
  subtitleCount,
  episodeNumber,
  totalEpisodes,
  showSkipIntro,
  showSkipEnding,
  keyBinds,
  onTogglePlay,
  onSeek,
  onVolumeChange,
  onToggleMute,
  onToggleFullscreen,
  onSpeedChange,
  onCycleSubtitle,
  onAdjustDelay,
  onResetDelay,
  onSkipIntro,
  onSkipEnding,
  onNext,
  onPrev,
  onLongPressChange,
}: UsePlaybackControlsOptions) {
  // Refs to capture fresh values inside event listeners without stale closures
  const isLongPressing2xRef = useRef(false);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mouseHoldTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const restore2x = () => {
    const video = videoRef.current;
    if (video && isLongPressing2xRef.current) {
      isLongPressing2xRef.current = false;
      video.playbackRate = playbackSpeed;
      onLongPressChange(false);
    }
  };

  const activate2x = () => {
    const video = videoRef.current;
    if (video && !isLongPressing2xRef.current && isPlaying) {
      isLongPressing2xRef.current = true;
      video.playbackRate = SPEED_2X;
      onLongPressChange(true);
    }
  };

  // ─── Keyboard shortcuts ─────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.isComposing) return;

      const activeEl = document.activeElement;
      if (activeEl) {
        const tag = activeEl.tagName;
        const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(tag);
        const isEditable = (typeof activeEl.hasAttribute === 'function' && activeEl.hasAttribute('contenteditable')) || activeEl.getAttribute?.('contenteditable') === 'true';
        if (isInput || isEditable) return;
      }

      const video = videoRef.current;
      if (!video) return;

      const binds = keyBinds || DEFAULT_KEYBINDS;
      const lookup = new Map<string, PlayerAction>();
      Object.entries(binds).forEach(([action, bind]) => {
        if (bind && bind.code) {
          lookup.set(serializeBinding(bind), action as PlayerAction);
        }
      });

      const serialized = serializeKey(e);
      let action = lookup.get(serialized);
      if (!action) {
        action = lookup.get(normalizeCode(e));
      }

      if (!action) {
        // Shift speed activator (independent of configurable action maps)
        const code = normalizeCode(e);
        if (code === 'ShiftLeft' || code === 'ShiftRight') {
          e.preventDefault();
          if (!holdTimerRef.current && !isLongPressing2xRef.current) {
            holdTimerRef.current = setTimeout(activate2x, HOLD_THRESHOLD_MS);
          }
        }
        return;
      }

      e.preventDefault();

      switch (action) {
        case 'togglePlay':
          if (!isLoading) onTogglePlay();
          break;

        case 'seekBackward':
          onSeek(Math.max(video.currentTime - 5, 0));
          break;

        case 'seekForward':
          onSeek(Math.min(video.currentTime + 5, video.duration));
          break;

        case 'volumeUp':
          onVolumeChange(Math.min(volume + 0.1, 1));
          break;

        case 'volumeDown':
          onVolumeChange(Math.max(volume - 0.1, 0));
          break;

        case 'toggleMute':
          onToggleMute();
          break;

        case 'toggleFullscreen':
          onToggleFullscreen();
          break;

        case 'cycleSubtitle':
          if (subtitleCount > 0) onCycleSubtitle();
          break;

        case 'delayDecrease':
          onAdjustDelay?.(e.shiftKey ? -1000 : -100);
          break;

        case 'delayIncrease':
          onAdjustDelay?.(e.shiftKey ? 1000 : 100);
          break;

        case 'delayReset':
          onResetDelay?.();
          break;

        case 'speedIncrease':
          onSpeedChange(Math.min(playbackSpeed + 0.25, 3));
          break;

        case 'speedDecrease':
          onSpeedChange(Math.max(playbackSpeed - 0.25, 0.25));
          break;

        case 'nextEpisode':
          if (totalEpisodes !== undefined && episodeNumber < totalEpisodes) onNext();
          break;

        case 'prevEpisode':
          if (episodeNumber > 1) onPrev();
          break;

        case 'skipIntro':
          if (showSkipIntro) onSkipIntro();
          break;

        case 'skipEnding':
          if (showSkipEnding) onSkipEnding();
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl) {
        const tag = activeEl.tagName;
        const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(tag);
        const isEditable = (typeof activeEl.hasAttribute === 'function' && activeEl.hasAttribute('contenteditable')) || activeEl.getAttribute?.('contenteditable') === 'true';
        if (isInput || isEditable) return;
      }

      const code = normalizeCode(e);
      if (code === 'ShiftLeft' || code === 'ShiftRight') {
        e.preventDefault();
        // Cancel timer if hold threshold wasn't reached
        if (holdTimerRef.current) {
          clearTimeout(holdTimerRef.current);
          holdTimerRef.current = null;
        }
        restore2x();
      }
    };

    const handleBlur = () => {
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
        holdTimerRef.current = null;
      }
      restore2x();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    };
  }, [
    isPlaying, isLoading, playbackSpeed, volume, isMuted,
    activeSubtitleIdx, subtitleCount, episodeNumber, totalEpisodes,
    showSkipIntro, showSkipEnding, keyBinds,
    onTogglePlay, onSeek, onVolumeChange, onToggleMute, onToggleFullscreen,
    onSpeedChange, onCycleSubtitle, onAdjustDelay, onResetDelay, onSkipIntro, onSkipEnding, onNext, onPrev,
    onLongPressChange,
  ]);

  // ─── Media Session API Integration ─────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;

    try {
      navigator.mediaSession.setActionHandler('play', onTogglePlay);
      navigator.mediaSession.setActionHandler('pause', onTogglePlay);
      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        const offset = details.seekOffset || 10;
        const video = videoRef.current;
        if (video) onSeek(Math.max(video.currentTime - offset, 0));
      });
      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        const offset = details.seekOffset || 10;
        const video = videoRef.current;
        if (video) onSeek(Math.min(video.currentTime + offset, video.duration));
      });
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) {
          if (details.fastSeek && videoRef.current?.fastSeek) {
            videoRef.current.fastSeek(details.seekTime);
          } else {
            onSeek(details.seekTime);
          }
        }
      });
      
      if (totalEpisodes !== undefined && episodeNumber < totalEpisodes) {
        navigator.mediaSession.setActionHandler('nexttrack', onNext);
      } else {
        navigator.mediaSession.setActionHandler('nexttrack', null);
      }

      if (episodeNumber > 1) {
        navigator.mediaSession.setActionHandler('previoustrack', onPrev);
      } else {
        navigator.mediaSession.setActionHandler('previoustrack', null);
      }
    } catch (err) {
      console.warn('Failed to set media session handlers:', err);
    }

    return () => {
      if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;
      try {
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
        navigator.mediaSession.setActionHandler('seekbackward', null);
        navigator.mediaSession.setActionHandler('seekforward', null);
        navigator.mediaSession.setActionHandler('seekto', null);
        navigator.mediaSession.setActionHandler('nexttrack', null);
        navigator.mediaSession.setActionHandler('previoustrack', null);
      } catch {}
    };
  }, [videoRef, onTogglePlay, onSeek, onNext, onPrev, episodeNumber, totalEpisodes]);

  // Synchronize playback state in Media Session
  useEffect(() => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  }, [isPlaying]);

  // Synchronize playback rate & position
  useEffect(() => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;
    const video = videoRef.current;
    if (!video || !video.duration) return;

    try {
      navigator.mediaSession.setPositionState({
        duration: video.duration || 0,
        playbackRate: video.playbackRate || 1.0,
        position: video.currentTime || 0,
      });
    } catch {}
  }, [isPlaying, playbackSpeed, videoRef.current?.currentTime]);

  // ─── Right-mouse-button hold-to-2× ─────────────────────────────────────
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 2) return; // right button only
    e.preventDefault();

    if (mouseHoldTimerRef.current) clearTimeout(mouseHoldTimerRef.current);
    mouseHoldTimerRef.current = setTimeout(activate2x, HOLD_THRESHOLD_MS);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (e.button !== 2) return;
    if (mouseHoldTimerRef.current) {
      clearTimeout(mouseHoldTimerRef.current);
      mouseHoldTimerRef.current = null;
    }
    restore2x();
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    // Suppress the browser context menu when right-clicking for hold-to-2×
    e.preventDefault();
  };

  return { handleMouseDown, handleMouseUp, handleContextMenu };
}
