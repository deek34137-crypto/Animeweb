'use client';

import { useState, useEffect, useRef, RefObject } from 'react';
import type { SkipInterval } from '@/lib/player/types';
import { LOCAL_SKIP_TIMES } from '@/lib/streaming/skiptimes';

interface UseSkipMarkersOptions {
  animeId: string;
  episodeNumber: number;
  videoRef: RefObject<HTMLVideoElement | null>;
  /** Global setting: auto-skip openings */
  autoSkipIntro: boolean;
  /** Global setting: auto-skip endings */
  autoSkipOutro: boolean;
  onToast: (msg: string) => void;
}

interface SkipMarkersReturn {
  skipIntervals: SkipInterval[];
  showSkipIntro: boolean;
  showSkipEnding: boolean;
  showSkipRecap: boolean;
  /** Manually skip the opening */
  skipIntro: () => void;
  /** Manually skip the ending */
  skipEnding: () => void;
  /** Manually skip the recap */
  skipRecap: () => void;
  /**
   * "Skip Once" — overrides auto-skip just for this episode without changing
   * global settings. Pass `true` to skip this once, `false` to cancel a
   * previously requested once-skip.
   */
  skipOnce: (type: 'op' | 'ed' | 'recap', value: boolean) => void;
}

/**
 * useSkipMarkers
 *
 * Fetches skip intervals from the local DB markers endpoint, falls back to
 * local override constants, then to the AniSkip API. Handles auto-skip logic
 * and shows skip confirmation toasts. Supports "Skip Once" per marker type.
 */
export function useSkipMarkers({
  animeId,
  episodeNumber,
  videoRef,
  autoSkipIntro,
  autoSkipOutro,
  onToast,
}: UseSkipMarkersOptions): SkipMarkersReturn {
  const [skipIntervals, setSkipIntervals] = useState<SkipInterval[]>([]);
  const [showSkipIntro, setShowSkipIntro] = useState(false);
  const [showSkipEnding, setShowSkipEnding] = useState(false);
  const [showSkipRecap, setShowSkipRecap] = useState(false);

  // "Skip Once" flags — activated by user for a single episode without changing globals
  const skipOnceRef = useRef<Record<'op' | 'ed' | 'recap', boolean>>({ op: false, ed: false, recap: false });
  // Track whether we've already auto-skipped each segment to avoid repeated jumps
  const hasAutoSkippedRef = useRef<Record<'op' | 'ed' | 'recap', boolean>>({ op: false, ed: false, recap: false });

  // ─── Fetch markers ──────────────────────────────────────────────────────
  useEffect(() => {
    hasAutoSkippedRef.current = { op: false, ed: false, recap: false };
    skipOnceRef.current = { op: false, ed: false, recap: false };

    const fetchSkipTimes = async () => {
      // 1. Local DB endpoint
      try {
        const res = await fetch(`/api/anime/${animeId}/episodes/${episodeNumber}/markers`);
        if (res.ok) {
          const data = await res.json();
          if (data.found && Array.isArray(data.markers) && data.markers.length > 0) {
            setSkipIntervals(
              data.markers.map((m: { startTime: number; endTime: number; type: string }) => ({
                startTime: m.startTime,
                endTime: m.endTime,
                type:
                  m.type.toLowerCase() === 'op'
                    ? 'op'
                    : m.type.toLowerCase() === 'ed'
                    ? 'ed'
                    : 'recap',
              }))
            );
            return;
          }
        }
      } catch {}

      // 2. Local overrides
      const localOverride = LOCAL_SKIP_TIMES[animeId];
      if (localOverride) {
        const intervals: SkipInterval[] = [
          { startTime: localOverride.introStart, endTime: localOverride.introEnd, type: 'op' },
        ];
        if (localOverride.outroStart !== undefined && localOverride.outroEnd !== undefined) {
          intervals.push({ startTime: localOverride.outroStart, endTime: localOverride.outroEnd, type: 'ed' });
        }
        if (localOverride.recapStart !== undefined && localOverride.recapEnd !== undefined) {
          intervals.push({ startTime: localOverride.recapStart, endTime: localOverride.recapEnd, type: 'recap' });
        }
        setSkipIntervals(intervals);
        return;
      }

      // 3. AniSkip API — only for numeric MAL IDs
      const numericId = parseInt(animeId, 10);
      if (isNaN(numericId)) {
        setSkipIntervals([]);
        return;
      }

      try {
        const res = await fetch(
          `https://api.aniskip.com/v2/skip-times/${numericId}/${episodeNumber}?types[]=op&types[]=ed&types[]=recap`
        );
        if (!res.ok) {
          setSkipIntervals([]);
          return;
        }
        const data = await res.json();
        if (data.found && Array.isArray(data.results)) {
          setSkipIntervals(
            data.results.map((r: { interval: { startTime: number; endTime: number }; skipType: string }) => ({
              startTime: r.interval?.startTime || 0,
              endTime: r.interval?.endTime || 0,
              type: r.skipType === 'recap' ? 'recap' : r.skipType === 'op' ? 'op' : 'ed',
            }))
          );
        } else {
          setSkipIntervals([]);
        }
      } catch {
        setSkipIntervals([]);
      }
    };

    fetchSkipTimes();
  }, [animeId, episodeNumber]);

  // ─── Auto-skip detection (called from onTimeUpdate) ─────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      const t = video.currentTime;
      const dur = video.duration;

      const opInterval = skipIntervals.find((i) => i.type === 'op');
      const edInterval = skipIntervals.find((i) => i.type === 'ed');
      const recapInterval = skipIntervals.find((i) => i.type === 'recap');

      // Show/hide manual skip buttons
      setShowSkipIntro(opInterval ? t >= opInterval.startTime && t <= opInterval.endTime : t >= 90 && t <= 180);
      setShowSkipEnding(
        edInterval
          ? t >= edInterval.startTime && t <= edInterval.endTime
          : dur > 200 && t >= dur - 90 && t < dur - 10
      );
      setShowSkipRecap(recapInterval ? t >= recapInterval.startTime && t <= recapInterval.endTime : false);

      // Auto-skip logic
      const shouldSkipOp =
        !hasAutoSkippedRef.current.op &&
        opInterval &&
        t >= opInterval.startTime &&
        t < opInterval.endTime - 0.5;
      const shouldSkipEd =
        !hasAutoSkippedRef.current.ed &&
        edInterval &&
        t >= edInterval.startTime &&
        t < edInterval.endTime - 0.5;
      const shouldSkipRecap =
        !hasAutoSkippedRef.current.recap &&
        recapInterval &&
        t >= recapInterval.startTime &&
        t < recapInterval.endTime - 0.5;

      const localPref = typeof localStorage !== 'undefined'
        ? localStorage.getItem(`animeworld:auto_skip:${animeId}`)
        : null;
      const effectiveAutoSkipIntro = localPref === 'true' ? true : localPref === 'false' ? false : autoSkipIntro;

      if (shouldSkipOp && (effectiveAutoSkipIntro || skipOnceRef.current.op)) {
        hasAutoSkippedRef.current.op = true;
        skipOnceRef.current.op = false;
        video.currentTime = opInterval!.endTime;
        onToast('⏭ Skipped Opening');
      }
      if (shouldSkipEd && (autoSkipOutro || skipOnceRef.current.ed)) {
        hasAutoSkippedRef.current.ed = true;
        skipOnceRef.current.ed = false;
        video.currentTime = edInterval!.endTime;
        onToast('⏭ Skipped Ending');
      }
      if (shouldSkipRecap && (effectiveAutoSkipIntro || skipOnceRef.current.recap)) {
        hasAutoSkippedRef.current.recap = true;
        skipOnceRef.current.recap = false;
        video.currentTime = recapInterval!.endTime;
        onToast('⏭ Skipped Recap');
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  }, [skipIntervals, autoSkipIntro, autoSkipOutro, animeId, onToast, videoRef]);

  // ─── Manual skip actions ─────────────────────────────────────────────────
  const skipIntro = () => {
    const video = videoRef.current;
    const opInterval = skipIntervals.find((i) => i.type === 'op');
    if (video && opInterval) {
      hasAutoSkippedRef.current.op = true;
      video.currentTime = opInterval.endTime;
    }
  };

  const skipEnding = () => {
    const video = videoRef.current;
    const edInterval = skipIntervals.find((i) => i.type === 'ed');
    if (video && edInterval) {
      hasAutoSkippedRef.current.ed = true;
      video.currentTime = edInterval.endTime;
    }
  };

  const skipRecap = () => {
    const video = videoRef.current;
    const recapInterval = skipIntervals.find((i) => i.type === 'recap');
    if (video && recapInterval) {
      hasAutoSkippedRef.current.recap = true;
      video.currentTime = recapInterval.endTime;
    }
  };

  const skipOnce = (type: 'op' | 'ed' | 'recap', value: boolean) => {
    skipOnceRef.current[type] = value;
    // Reset the hasAutoSkipped guard so the skip fires when time enters the interval
    if (value) hasAutoSkippedRef.current[type] = false;
  };

  return {
    skipIntervals,
    showSkipIntro,
    showSkipEnding,
    showSkipRecap,
    skipIntro,
    skipEnding,
    skipRecap,
    skipOnce,
  };
}
