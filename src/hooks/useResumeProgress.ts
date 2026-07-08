'use client';

import { useEffect, useRef, RefObject } from 'react';
import { progressService } from '@/lib/streaming/progress';
import { AnalyticsBus } from '@/lib/player/analytics/AnalyticsBus';
import type { AnalyticsContext } from '@/lib/player/types';

const SAVE_INTERVAL_MS = 15_000;   // 15 seconds
const MIN_PROGRESS_DELTA_S = 5;    // only save if position advanced ≥ 5 s

interface UseResumeProgressOptions {
  videoRef: RefObject<HTMLVideoElement | null>;
  animeId: string;
  animeTitle: string;
  animeImage: string;
  episodeNumber: number;
  totalEpisodes: number | undefined;
  analyticsContext: Omit<AnalyticsContext, 'playbackPosition' | 'timestamp'>;
}

/**
 * useResumeProgress
 *
 * Saves watch progress every 15 seconds (only when position has advanced ≥ 5 s
 * since last save to avoid redundant writes). Also saves on:
 *   - pause
 *   - seek (via seeked event)
 *   - page hide / beforeunload
 *   - episode completion
 */
export function useResumeProgress({
  videoRef,
  animeId,
  animeTitle,
  animeImage,
  episodeNumber,
  totalEpisodes,
  analyticsContext,
}: UseResumeProgressOptions) {
  const lastSavedPositionRef = useRef<number>(-1);

  const saveProgress = (force = false) => {
    const video = videoRef.current;
    if (!video) return;

    const t = video.currentTime;
    const dur = video.duration;



    if (!force && Math.abs(t - lastSavedPositionRef.current) < MIN_PROGRESS_DELTA_S) return;

    lastSavedPositionRef.current = t;

    progressService.updateProgress({
      animeId,
      animeTitle,
      animeImage,
      episode: episodeNumber,
      position: t,
      duration: dur,
      totalEpisodes,
      force,
    });

    AnalyticsBus.dispatch({
      type: 'progress_save',
      context: {
        ...analyticsContext,
        playbackPosition: t,
        timestamp: Date.now(),
      },
    });
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    lastSavedPositionRef.current = -1;

    const handlePause   = () => saveProgress(true);
    const handleSeeked  = () => saveProgress(true);
    const handleEnded   = () => {
      progressService.updateProgress({
        animeId,
        animeTitle,
        animeImage,
        episode: episodeNumber,
        position: video.duration,
        duration: video.duration,
        totalEpisodes,
        force: true,
      });
      AnalyticsBus.dispatch({
        type: 'episode_complete',
        context: { ...analyticsContext, playbackPosition: video.duration, timestamp: Date.now() },
      });
    };
    const handleVisibility = () => { if (document.hidden) saveProgress(true); };
    const handleUnload  = () => saveProgress(true);

    video.addEventListener('pause',  handlePause);
    video.addEventListener('seeked', handleSeeked);
    video.addEventListener('ended',  handleEnded);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('beforeunload', handleUnload);

    const interval = setInterval(() => saveProgress(false), SAVE_INTERVAL_MS);

    return () => {
      clearInterval(interval);
      video.removeEventListener('pause',  handlePause);
      video.removeEventListener('seeked', handleSeeked);
      video.removeEventListener('ended',  handleEnded);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', handleUnload);
      saveProgress(true); // flush on unmount
    };
  }, [animeId, episodeNumber, animeTitle, animeImage, totalEpisodes]);
}
