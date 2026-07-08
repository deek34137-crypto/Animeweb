'use client';

import { useState, useEffect, useRef, RefObject } from 'react';

interface UseNextEpisodeOptions {
  videoRef: RefObject<HTMLVideoElement | null>;
  episodeNumber: number;
  totalEpisodes: number | undefined;
  skipIntervals: Array<{ startTime: number; endTime: number; type: string }>;
  isAutoplayNext: boolean;
  autoplayCountdown: number;
  onNext: () => void;
}

interface NextEpisodeReturn {
  countdown: number | null;
  setCountdown: (n: number | null) => void;
  dismiss: () => void;
  accept: () => void;
}

const BACKWARD_SCRUB_WINDOW_MS = 30_000; // 30 s
const NEXT_EP_TRIGGER_BEFORE_END_S = 10; // show overlay this many seconds before ED ends / end of video

/**
 * useNextEpisode
 *
 * Context-aware next-episode overlay trigger. Only shows the countdown when:
 *  1. The user is NOT paused.
 *  2. The user has NOT scrubbed backward in the last 30 s.
 *  3. The current time is within the ending theme segment (or ≥ 90% of duration).
 *  4. autoplayNext is enabled.
 *  5. There is a next episode to go to.
 */
export function useNextEpisode({
  videoRef,
  episodeNumber,
  totalEpisodes,
  skipIntervals,
  isAutoplayNext,
  autoplayCountdown,
  onNext,
}: UseNextEpisodeOptions): NextEpisodeReturn {
  const [countdown, setCountdown] = useState<number | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const overlayTriggeredRef = useRef(false);
  const lastScrubBackwardRef = useRef<number>(0);
  const prevTimeRef = useRef<number>(0);

  const hasNextEpisode = !!(totalEpisodes && episodeNumber < totalEpisodes);

  // Track backward scrubs
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleSeeking = () => {
      const current = video.currentTime;
      // If time moved backward by more than 3 seconds, consider it a scrub-back
      if (prevTimeRef.current - current > 3) {
        lastScrubBackwardRef.current = Date.now();
        // Cancel any active overlay
        if (overlayTriggeredRef.current) {
          overlayTriggeredRef.current = false;
          setCountdown(null);
        }
      }
      prevTimeRef.current = current;
    };

    video.addEventListener('seeking', handleSeeking);
    return () => video.removeEventListener('seeking', handleSeeking);
  }, [videoRef]);

  // Trigger detection
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      if (!isAutoplayNext || !hasNextEpisode || overlayTriggeredRef.current) return;
      if (video.paused) return;

      const t = video.currentTime;
      const dur = video.duration;
      prevTimeRef.current = t;

      if (!dur || isNaN(dur)) return;

      // Check: user scrubbed backward in the last 30 s → suppress overlay
      if (Date.now() - lastScrubBackwardRef.current < BACKWARD_SCRUB_WINDOW_MS) return;

      const edInterval = skipIntervals.find((i) => i.type === 'ed');

      let shouldTrigger = false;

      if (edInterval) {
        // Trigger when entering the ending theme segment (10s before it ends)
        const triggerPoint = Math.max(edInterval.startTime, edInterval.endTime - NEXT_EP_TRIGGER_BEFORE_END_S);
        shouldTrigger = t >= triggerPoint && t < edInterval.endTime;
      } else {
        // No ED marker: trigger at 90% of duration
        shouldTrigger = t >= dur * 0.9;
      }

      if (shouldTrigger) {
        overlayTriggeredRef.current = true;
        setCountdown(autoplayCountdown);
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  }, [videoRef, isAutoplayNext, hasNextEpisode, skipIntervals, autoplayCountdown]);

  // Handle video end (fallback for when trigger didn't fire)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleEnded = () => {
      if (!isAutoplayNext || !hasNextEpisode) return;
      if (!overlayTriggeredRef.current) {
        overlayTriggeredRef.current = true;
        setCountdown(autoplayCountdown);
      }
    };

    video.addEventListener('ended', handleEnded);
    return () => video.removeEventListener('ended', handleEnded);
  }, [videoRef, isAutoplayNext, hasNextEpisode, autoplayCountdown]);

  // Countdown tick
  useEffect(() => {
    if (countdown === null) {
      if (countdownRef.current) clearInterval(countdownRef.current);
      return;
    }

    if (countdown === 0) {
      if (countdownRef.current) clearInterval(countdownRef.current);
      setCountdown(null);
      onNext();
      return;
    }

    countdownRef.current = setInterval(() => {
      setCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [countdown, onNext]);

  // Reset when episode changes
  useEffect(() => {
    overlayTriggeredRef.current = false;
    lastScrubBackwardRef.current = 0;
    prevTimeRef.current = 0;
    setCountdown(null);
  }, [episodeNumber]);

  const dismiss = () => {
    overlayTriggeredRef.current = false;
    setCountdown(null);
  };

  const accept = () => {
    setCountdown(null);
    onNext();
  };

  return { countdown, setCountdown, dismiss, accept };
}
