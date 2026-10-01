import { useState, useEffect, useRef, useCallback } from 'react';
import type { SubtitleTrack, SubtitleStyle, SubtitleCapabilities, SubtitleState, ParsedCue, SubtitleError, SubtitleErrorType } from '@/lib/player/types';
import { WebVttSubtitleEngine } from '@/lib/player/playback/WebVttSubtitleEngine';
import { AssSubtitleEngine } from '@/lib/player/playback/AssSubtitleEngine';
import type { SubtitleEngine } from '@/lib/player/playback/SubtitleEngine';
import { AnalyticsBus } from '@/lib/player/analytics/AnalyticsBus';

interface UseSubtitleManagerOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  activeTrack: SubtitleTrack | null;
  delayMs: number;
  style: SubtitleStyle;
  visible: boolean;
  animeId: string;
  episodeNumber: number;
  currentProviderName?: string;
}

export function useSubtitleManager({
  videoRef,
  containerRef,
  activeTrack,
  delayMs,
  style,
  visible,
  animeId,
  episodeNumber,
  currentProviderName = 'unknown'
}: UseSubtitleManagerOptions) {
  const [activeCues, setActiveCues] = useState<ParsedCue[]>([]);
  const [subtitleState, setSubtitleState] = useState<SubtitleState>('idle');
  const [error, setError] = useState<SubtitleError | null>(null);
  const [capabilities, setCapabilities] = useState<SubtitleCapabilities | null>(null);

  const currentEngineRef = useRef<SubtitleEngine | null>(null);
  const activeTrackRef = useRef<SubtitleTrack | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Keep latest config in refs to avoid engine setup re-running on simple updates
  const delayMsRef = useRef(delayMs);
  const styleRef = useRef(style);
  const visibleRef = useRef(visible);

  useEffect(() => { delayMsRef.current = delayMs; }, [delayMs]);
  useEffect(() => { styleRef.current = style; }, [style]);
  useEffect(() => { visibleRef.current = visible; }, [visible]);

  // Clean up existing subscriptions and engine
  const teardownEngine = useCallback(() => {
    if (currentEngineRef.current) {
      currentEngineRef.current.destroy();
      currentEngineRef.current = null;
    }
    setCapabilities(null);
    setActiveCues([]);
    setSubtitleState('idle');
    setError(null);
  }, []);

  // Set up the subtitle engine
  useEffect(() => {
    const video = videoRef.current;
    const container = containerRef.current;

    if (!video || !container) {
      teardownEngine();
      return;
    }

    // Cancel in-flight loads
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    if (!activeTrack) {
      teardownEngine();
      return;
    }

    // Instantiate correct engine depending on codec
    const needsNewEngine = !currentEngineRef.current || 
      (activeTrack.codec === 'ass' && !(currentEngineRef.current instanceof AssSubtitleEngine)) ||
      (activeTrack.codec !== 'ass' && !(currentEngineRef.current instanceof WebVttSubtitleEngine));

    if (needsNewEngine) {
      teardownEngine();

      const engine: SubtitleEngine = activeTrack.codec === 'ass' 
        ? new AssSubtitleEngine() 
        : new WebVttSubtitleEngine();

      currentEngineRef.current = engine;
      setCapabilities(engine.getCapabilities());

      const loadStart = Date.now();

      engine.initialize(video, container).then(() => {
        if (currentEngineRef.current !== engine) return;
        
        // Setup subscriptions with cleanups
        const unsubCue = engine.onCueChange((cues) => setActiveCues(cues));
        const unsubState = engine.onStateChange((state) => setSubtitleState(state));
        const unsubError = engine.onError((err) => {
          setError(err);
          AnalyticsBus.dispatch({
            type: 'buffer_stall', // fallback type
            context: {
              animeId,
              episode: episodeNumber,
              provider: currentProviderName,
              quality: 'auto',
              playbackPosition: video.currentTime,
              timestamp: Date.now()
            },
            payload: {
              category: 'subtitle',
              errorType: err.type,
              errorMessage: err.message
            }
          });
        });

        // Save subscriptions for unmount / teardown
        engine.destroy = (() => {
          const originalDestroy = engine.destroy.bind(engine);
          return () => {
            unsubCue();
            unsubState();
            unsubError();
            originalDestroy();
          };
        })();

        // Trigger loading
        loadTrack(engine, activeTrack, loadStart);
      }).catch((err) => {
        setError({
          type: 'engine_initialization',
          message: err.message || 'Engine initialization failed'
        });
        setSubtitleState('error');
      });
    } else {
      // Reuse engine
      const loadStart = Date.now();
      loadTrack(currentEngineRef.current!, activeTrack, loadStart);
    }

    return () => {
      // We don't teardown immediately on quick effects to avoid unneeded reinstantiation, 
      // but abort signals should be cancelled.
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [activeTrack, videoRef, containerRef]);

  // Load a new track
  const loadTrack = async (engine: SubtitleEngine, track: SubtitleTrack, loadStart: number) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      // Sync parameters before loading
      engine.setDelay(delayMsRef.current);
      engine.setStyle(styleRef.current);
      engine.setVisible(visibleRef.current);

      await engine.setTrack(track, signal);
      
      if (signal.aborted) return;

      const duration = Date.now() - loadStart;
      AnalyticsBus.dispatch({
        type: 'quality_changed', // reuse existing analytics events
        context: {
          animeId,
          episode: episodeNumber,
          provider: currentProviderName,
          quality: 'auto',
          playbackPosition: videoRef.current?.currentTime || 0,
          timestamp: Date.now()
        },
        payload: {
          category: 'subtitle_load',
          codec: track.codec,
          durationMs: duration
        }
      });
    } catch (err: any) {
      if (signal.aborted) return;
      setError({
        type: 'parse',
        message: err.message || 'Track load failed'
      });
      setSubtitleState('error');
    }
  };

  // Keep engine attributes synchronized when preferences or variables change
  useEffect(() => {
    if (currentEngineRef.current && subtitleState === 'ready') {
      currentEngineRef.current.setDelay(delayMs);
    }
  }, [delayMs, subtitleState]);

  useEffect(() => {
    if (currentEngineRef.current && subtitleState === 'ready') {
      currentEngineRef.current.setStyle(style);
    }
  }, [style, subtitleState]);

  useEffect(() => {
    if (currentEngineRef.current && subtitleState === 'ready') {
      currentEngineRef.current.setVisible(visible);
    }
  }, [visible, subtitleState]);

  // ResizeObserver for tracking container and window size / DPR modifications
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      if (currentEngineRef.current && subtitleState === 'ready') {
        const rect = container.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        currentEngineRef.current.resize(rect.width, rect.height, dpr);
      }
    });

    observer.observe(container);

    // Watch resolution changes using matchMedia query as well
    let matchMediaCleanup: (() => void) | null = null;
    const registerDprWatcher = () => {
      try {
        const dpr = window.devicePixelRatio;
        const mediaQuery = window.matchMedia(`(resolution: ${dpr}dppx)`);
        
        const handleDprChange = () => {
          if (currentEngineRef.current && subtitleState === 'ready') {
            const rect = container.getBoundingClientRect();
            currentEngineRef.current.resize(rect.width, rect.height, window.devicePixelRatio || 1);
          }
          // Re-register matching filter for next ratio
          registerDprWatcher();
        };

        mediaQuery.addEventListener('change', handleDprChange, { once: true });
        matchMediaCleanup = () => {
          try {
            mediaQuery.removeEventListener('change', handleDprChange);
          } catch {}
        };
      } catch {}
    };

    registerDprWatcher();

    return () => {
      observer.disconnect();
      if (matchMediaCleanup) matchMediaCleanup();
    };
  }, [containerRef, subtitleState]);

  // Complete cleanup on final unmount
  useEffect(() => {
    return () => {
      teardownEngine();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [teardownEngine]);

  return {
    activeCues,
    subtitleState,
    error,
    capabilities
  };
}
