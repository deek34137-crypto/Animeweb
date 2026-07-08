'use client';

import { useEffect, useRef, RefObject } from 'react';

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

/**
 * usePlaybackControls
 *
 * Handles all keyboard shortcuts and hold-to-2× gestures.
 *
 * Hold-to-2× is bound to:
 *   • Shift key hold (keyboard)
 *   • Right mouse button hold (mouse)
 *
 * Space is never used for hold-to-2× — it remains play/pause exclusively.
 *
 * Focus-loss recovery: if the window loses focus while Shift is held,
 * the speed is restored immediately so the video doesn't stay at 2× forever.
 */
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
  onTogglePlay,
  onSeek,
  onVolumeChange,
  onToggleMute,
  onToggleFullscreen,
  onSpeedChange,
  onCycleSubtitle,
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
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const video = videoRef.current;
      if (!video) return;

      switch (e.key) {
        // Space — play/pause only (never hold-to-2x)
        case ' ':
          e.preventDefault();
          if (!isLoading) onTogglePlay();
          break;

        // Arrow seek
        case 'ArrowLeft':
          e.preventDefault();
          onSeek(Math.max(video.currentTime - 5, 0));
          break;
        case 'ArrowRight':
          e.preventDefault();
          onSeek(Math.min(video.currentTime + 5, video.duration));
          break;

        // J / L — ±10 s
        case 'j':
        case 'J':
          e.preventDefault();
          onSeek(Math.max(video.currentTime - 10, 0));
          break;
        case 'l':
        case 'L':
          e.preventDefault();
          onSeek(Math.min(video.currentTime + 10, video.duration));
          break;

        // Volume
        case 'ArrowUp':
          e.preventDefault();
          onVolumeChange(Math.min(volume + 0.1, 1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          onVolumeChange(Math.max(volume - 0.1, 0));
          break;

        // Mute
        case 'm':
        case 'M':
          e.preventDefault();
          onToggleMute();
          break;

        // Fullscreen
        case 'f':
        case 'F':
          e.preventDefault();
          onToggleFullscreen();
          break;

        // Captions
        case 'c':
        case 'C':
          e.preventDefault();
          if (subtitleCount > 0) onCycleSubtitle();
          break;

        // Speed increase
        case '>':
        case '.':
          e.preventDefault();
          onSpeedChange(Math.min(playbackSpeed + 0.25, 3));
          break;

        // Speed decrease
        case '<':
        case ',':
          e.preventDefault();
          onSpeedChange(Math.max(playbackSpeed - 0.25, 0.25));
          break;

        // Shift — hold-to-2x (start timer)
        case 'Shift':
          e.preventDefault();
          if (!holdTimerRef.current && !isLongPressing2xRef.current) {
            holdTimerRef.current = setTimeout(activate2x, HOLD_THRESHOLD_MS);
          }
          break;

        // Episode navigation
        case 'n':
        case 'N':
          e.preventDefault();
          if (totalEpisodes && episodeNumber < totalEpisodes) onNext();
          break;
        case 'p':
        case 'P':
          e.preventDefault();
          if (episodeNumber > 1) onPrev();
          break;

        // Skip shortcuts
        case 'i':
        case 'I':
          if (showSkipIntro) { e.preventDefault(); onSkipIntro(); }
          break;
        case 'e':
        case 'E':
          if (showSkipEnding) { e.preventDefault(); onSkipEnding(); }
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === 'Shift') {
        e.preventDefault();
        // Cancel timer if hold threshold wasn't reached
        if (holdTimerRef.current) {
          clearTimeout(holdTimerRef.current);
          holdTimerRef.current = null;
        }
        restore2x();
      }
    };

    // Focus-loss recovery: if alt-tab or any window blur happens while holding Shift,
    // restore speed immediately so video doesn't stay at 2× indefinitely.
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
    showSkipIntro, showSkipEnding,
    onTogglePlay, onSeek, onVolumeChange, onToggleMute, onToggleFullscreen,
    onSpeedChange, onCycleSubtitle, onSkipIntro, onSkipEnding, onNext, onPrev,
    onLongPressChange,
  ]);

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
