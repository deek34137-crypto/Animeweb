'use client';

import { useEffect, useRef, RefObject } from 'react';
import type { AnalyticsContext } from '@/lib/player/types';
import { AnalyticsBus } from '@/lib/player/analytics/AnalyticsBus';

const STALL_THRESHOLD_MS = 3000;

interface UseBufferDiagnosticsOptions {
  videoRef: RefObject<HTMLVideoElement | null>;
  analyticsContext: Omit<AnalyticsContext, 'playbackPosition' | 'timestamp'>;
  onToast: (msg: string) => void;
}

/**
 * useBufferDiagnostics
 *
 * Listens for `waiting` and `stalled` video events. If the stall lasts more
 * than 3 seconds, shows an actionable diagnostic toast that does not blame
 * the user's connection — it covers both network and source-server issues.
 */
export function useBufferDiagnostics({ videoRef, analyticsContext, onToast }: UseBufferDiagnosticsOptions) {
  const stallTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stallCountRef = useRef(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const clearStall = () => {
      if (stallTimerRef.current) {
        clearTimeout(stallTimerRef.current);
        stallTimerRef.current = null;
      }
    };

    const handleStall = () => {
      clearStall();
      stallTimerRef.current = setTimeout(() => {
        stallCountRef.current += 1;
        onToast(
          '⏳ Playback is buffering. Try lowering quality or switching mirrors for a smoother experience.'
        );

        AnalyticsBus.dispatch({
          type: 'buffer_stall',
          context: {
            ...analyticsContext,
            playbackPosition: video.currentTime,
            timestamp: Date.now(),
          },
          payload: {
            stallCount: stallCountRef.current,
            quality: analyticsContext.quality,
            provider: analyticsContext.provider,
          },
        });
      }, STALL_THRESHOLD_MS);
    };

    const handleResumed = () => {
      clearStall();
    };

    video.addEventListener('waiting', handleStall);
    video.addEventListener('stalled', handleStall);
    video.addEventListener('playing', handleResumed);
    video.addEventListener('canplay', handleResumed);

    return () => {
      clearStall();
      video.removeEventListener('waiting', handleStall);
      video.removeEventListener('stalled', handleStall);
      video.removeEventListener('playing', handleResumed);
      video.removeEventListener('canplay', handleResumed);
    };
  }, [videoRef, analyticsContext, onToast]);
}
