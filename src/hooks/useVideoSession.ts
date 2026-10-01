'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { EpisodeSource, SubtitleTrack } from '@/lib/player/types';
import { progressService } from '@/lib/streaming/progress';
import { savePlayerState } from '@/lib/usePlayerSession';
import { AnalyticsBus } from '@/lib/player/analytics/AnalyticsBus';

const ENABLE_IFRAME_SANDBOX = false;

// Stall detection & auto-failover thresholds
const STALL_COUNT_THRESHOLD       = 4;        // stalls in window before failover
const STALL_DURATION_THRESHOLD_MS = 15_000;   // total stall ms in window before failover
const STALL_SINGLE_THRESHOLD_MS   = 10_000;   // single continuous stall before failover
const STALL_WINDOW_MS             = 60_000;   // rolling window duration
const AUTO_FAILOVER_COOLDOWN_MS   = 90_000;   // min ms between auto-failovers

interface UseVideoSessionOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  animeId: string;
  episodeNumber: number;
  animeTitle: string;
  animeImage: string;
  initialPosition: number;
  sources: EpisodeSource[];
  subSources: EpisodeSource[];
  dubSources: EpisodeSource[];
  hindiSources: EpisodeSource[];
  tamilSources: EpisodeSource[];
  teluguSources: EpisodeSource[];
  subtitles: SubtitleTrack[];
  providers: string[];
  currentProvider: string;
  onToast: (msg: string | null) => void;
  onAutoFailover?: (failedProvider: string, skipProviders: string[]) => void;
  // Dynamic audio speed / volume / subtitles details needed for HLS initialization
  playbackSpeed: number;
  volume: number;
  isMuted: boolean;
  activeSubtitleIdx: number;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  setDuration: (dur: number) => void;
  setCurrentTime: (time: number) => void;
}

export function useVideoSession({
  videoRef,
  animeId,
  episodeNumber,
  animeTitle,
  animeImage,
  initialPosition,
  sources,
  subSources = [],
  dubSources = [],
  hindiSources = [],
  tamilSources = [],
  teluguSources = [],
  subtitles = [],
  providers = [],
  currentProvider,
  onToast,
  onAutoFailover,
  playbackSpeed,
  volume,
  isMuted,
  activeSubtitleIdx,
  isPlaying,
  setIsPlaying,
  setDuration,
  setCurrentTime,
}: UseVideoSessionOptions) {
  // Source lists
  const [subSourcesList, setSubSourcesList] = useState<EpisodeSource[]>(subSources.length > 0 ? subSources : sources);
  const [dubSourcesList, setDubSourcesList] = useState<EpisodeSource[]>(dubSources);
  const [hindiSourcesList, setHindiSourcesList] = useState<EpisodeSource[]>(hindiSources);
  const [tamilSourcesList, setTamilSourcesList] = useState<EpisodeSource[]>(tamilSources);
  const [teluguSourcesList, setTeluguSourcesList] = useState<EpisodeSource[]>(teluguSources);
  const [subtitleTracks, setSubtitleTracks] = useState<SubtitleTrack[]>(subtitles);
  const [providersList, setProvidersList] = useState<string[]>(providers.length > 0 ? providers : ['mock']);
  const [currentProviderName, setCurrentProviderName] = useState<string>(currentProvider);
  const [activeSourceIdx, setActiveSourceIdx] = useState(0);

  // Preferred audio language state
  const [currentLanguage, setCurrentLanguage] = useState<'sub' | 'dub' | 'hindi' | 'tamil' | 'telugu'>(() => {
    const hindiCount = hindiSources.length;
    const subCount = subSources.length > 0 ? subSources.length : sources.length;
    const dubCount = dubSources.length;
    const tamilCount = tamilSources.length;
    const teluguCount = teluguSources.length;

    if (hindiCount > 0) return 'hindi';
    if (subCount > 0) return 'sub';
    if (dubCount > 0) return 'dub';
    if (tamilCount > 0) return 'tamil';
    if (teluguCount > 0) return 'telugu';
    return 'sub';
  });

  const [hasNativeHindi, setHasNativeHindi] = useState(false);
  const [qualityLevels, setQualityLevels] = useState<string[]>(['Auto']);
  const [currentQuality, setCurrentQuality] = useState('Auto');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const hlsRef = useRef<any>(null);

  // Telemetry session references
  const eventIdRef = useRef<string>('');
  const loadStartRef = useRef<number>(0);
  const loadDurationRef = useRef<number>(0);
  const stallsRef = useRef<number>(0);
  const failedRef = useRef<boolean>(false);
  const errorRef = useRef<string | null>(null);
  const hasSentRef = useRef<boolean>(false);

  // Stall duration tracking
  const stallStartRef            = useRef<number>(0);          // ts when current buffering event began
  const stallTotalMsRef          = useRef<number>(0);          // cumulative stall ms for telemetry
  const stallCountInWindowRef    = useRef<number>(0);          // stall count in rolling window
  const stallTotalMsInWindowRef  = useRef<number>(0);          // stall ms in rolling window
  const stallWindowStartRef      = useRef<number>(Date.now()); // start of current rolling window
  const lastAutoFailoverRef      = useRef<number>(0);          // ts of last auto-failover

  // Episode-scoped provider failure memory — reset when episode changes
  const failedProvidersThisEpisodeRef = useRef<Set<string>>(new Set());

  // Keep fresh copies of parameters for event callbacks to avoid stale closures
  const playbackSpeedRef = useRef(playbackSpeed);
  const volumeRef = useRef(volume);
  const isMutedRef = useRef(isMuted);
  const activeSubtitleIdxRef = useRef(activeSubtitleIdx);
  const isPlayingRef = useRef(isPlaying);
  const currentLanguageRef = useRef(currentLanguage);
  const currentQualityRef = useRef(currentQuality);

  useEffect(() => { playbackSpeedRef.current = playbackSpeed; }, [playbackSpeed]);
  useEffect(() => { volumeRef.current = volume; }, [volume]);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  useEffect(() => { activeSubtitleIdxRef.current = activeSubtitleIdx; }, [activeSubtitleIdx]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { currentLanguageRef.current = currentLanguage; }, [currentLanguage]);
  useEffect(() => { currentQualityRef.current = currentQuality; }, [currentQuality]);

  // Refs to avoid stale closures inside auto-failover callback
  const currentProviderNameRef = useRef(currentProviderName);
  const providersListRef       = useRef(providersList);
  useEffect(() => { currentProviderNameRef.current = currentProviderName; }, [currentProviderName]);
  useEffect(() => { providersListRef.current = providersList; }, [providersList]);

  // Reset episode-scoped state when episode changes
  useEffect(() => {
    failedProvidersThisEpisodeRef.current = new Set();
    stallCountInWindowRef.current = 0;
    stallTotalMsInWindowRef.current = 0;
    stallWindowStartRef.current = Date.now();
  }, [episodeNumber]);

  // Synchronise arrays when props change
  useEffect(() => {
    const isDifferentArray = (a: any[] | undefined, b: any[] | undefined) => {
      if (!a && !b) return false;
      if (!a || !b) return true;
      if (a.length !== b.length) return true;
      for (let i = 0; i < a.length; i++) {
        if (JSON.stringify(a[i]) !== JSON.stringify(b[i])) return true;
      }
      return false;
    };

    const nextSubs = subSources.length > 0 ? subSources : sources;
    if (isDifferentArray(subSourcesList, nextSubs)) setSubSourcesList(nextSubs);
    if (isDifferentArray(dubSourcesList, dubSources)) setDubSourcesList(dubSources);
    if (isDifferentArray(hindiSourcesList, hindiSources)) setHindiSourcesList(hindiSources);
    if (isDifferentArray(tamilSourcesList, tamilSources)) setTamilSourcesList(tamilSources);
    if (isDifferentArray(teluguSourcesList, teluguSources)) setTeluguSourcesList(teluguSources);
    if (isDifferentArray(subtitleTracks, subtitles)) setSubtitleTracks(subtitles);

    const nextProviders = providers.length > 0 ? providers : ['mock'];
    if (isDifferentArray(providersList, nextProviders)) setProvidersList(nextProviders);
    if (currentProviderName !== currentProvider) setCurrentProviderName(currentProvider);
  }, [sources, subSources, dubSources, hindiSources, tamilSources, teluguSources, subtitles, providers, currentProvider]);

  // Active sources calculation
  const activeSources = currentLanguage === 'hindi' && hindiSourcesList.length > 0
    ? hindiSourcesList
    : currentLanguage === 'tamil' && tamilSourcesList.length > 0
      ? tamilSourcesList
      : currentLanguage === 'telugu' && teluguSourcesList.length > 0
        ? teluguSourcesList
        : currentLanguage === 'dub' && dubSourcesList.length > 0
          ? dubSourcesList
          : subSourcesList;

  const activeSource = activeSources[activeSourceIdx];

  const isIframeSource = activeSource?.url
    ? activeSource.url.includes('/stream/') ||
      activeSource.url.includes('vidtube.site') ||
      activeSource.url.includes('megaplay.buzz') ||
      activeSource.url.includes('embed') ||
      activeSource.url.includes('iframe') ||
      activeSource.url.includes('desidubanime.me') ||
      activeSource.url.includes('piratexplay.cc') ||
      activeSource.url.includes('vidnest.fun')
    : false;

  // Sync state volume and preferences updates
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
    }
  }, [volume, videoRef]);

  // Telemetry transmission
  const sendTelemetry = useCallback(() => {
    if (hasSentRef.current || !eventIdRef.current || !activeSource) return;
    hasSentRef.current = true;

    let browser = 'Unknown';
    let platform = 'Unknown';
    if (typeof window !== 'undefined') {
      const ua = window.navigator.userAgent;
      if (ua.includes('Firefox')) browser = 'Firefox';
      else if (ua.includes('Chrome')) browser = 'Chrome';
      else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
      else if (ua.includes('Edge')) browser = 'Edge';

      if (ua.includes('Windows')) platform = 'Windows';
      else if (ua.includes('Mac')) platform = 'macOS';
      else if (ua.includes('Linux')) platform = 'Linux';
      else if (ua.includes('iPhone') || ua.includes('iPad')) platform = 'iOS';
      else if (ua.includes('Android')) platform = 'Android';
    }

    let networkType = 'unknown';
    const connection = typeof window !== 'undefined' && ((navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection);
    if (connection) {
      networkType = connection.type || connection.effectiveType || 'unknown';
    }

    const payload = {
      eventId: eventIdRef.current,
      animeId,
      episodeId: episodeNumber.toString(),
      provider: currentProviderName || 'unknown',
      loadDurationMs: Math.max(0, loadDurationRef.current),
      bufferingStalls: stallsRef.current,
      stallDurationMs: stallTotalMsRef.current,
      failed: failedRef.current,
      error: errorRef.current,
      browser,
      platform,
      playerVersion: '1.0.0',
      networkType,
    };

    try {
      if (typeof window !== 'undefined' && navigator.sendBeacon) {
        navigator.sendBeacon('/api/stream/analytics', JSON.stringify(payload));
      } else {
        throw new Error('sendBeacon not supported');
      }
    } catch {
      fetch('/api/stream/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {});
    }
  }, [activeSource, animeId, episodeNumber, currentProviderName]);

  // Audio track syncing helper for native HLS
  const syncHlsAudioTrack = useCallback((lang: 'sub' | 'dub' | 'hindi' | 'tamil' | 'telugu', hlsInstance = hlsRef.current) => {
    if (!hlsInstance) return;
    const tracks = hlsInstance.audioTracks;
    if (!tracks || tracks.length <= 1) return;

    let targetIdx = -1;
    if (lang === 'hindi') {
      targetIdx = tracks.findIndex((t: any) => t.lang?.toLowerCase().startsWith('hi') || t.name?.toLowerCase().includes('hindi') || t.name?.toLowerCase().includes('hin'));
    } else if (lang === 'tamil') {
      targetIdx = tracks.findIndex((t: any) => t.lang?.toLowerCase().startsWith('ta') || t.name?.toLowerCase().includes('tamil') || t.name?.toLowerCase().includes('tam'));
    } else if (lang === 'telugu') {
      targetIdx = tracks.findIndex((t: any) => t.lang?.toLowerCase().startsWith('te') || t.name?.toLowerCase().includes('telugu') || t.name?.toLowerCase().includes('tel'));
    } else if (lang === 'dub') {
      targetIdx = tracks.findIndex((t: any) => t.lang?.toLowerCase().startsWith('en') || t.name?.toLowerCase().includes('english') || t.name?.toLowerCase().includes('dub'));
    } else if (lang === 'sub') {
      targetIdx = tracks.findIndex((t: any) => t.lang?.toLowerCase().startsWith('ja') || t.name?.toLowerCase().includes('japanese') || t.name?.toLowerCase().includes('sub'));
    }

    if (targetIdx > -1) {
      hlsInstance.audioTrack = targetIdx;
    }
  }, []);

  const selectQuality = useCallback((level: string) => {
    setCurrentQuality(level);
    localStorage.setItem('animeworld:preferredQuality', level);
    
    // Save to DB preferences
    fetch('/api/user/preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preferredQuality: level }),
    }).catch(() => {});

    AnalyticsBus.dispatch({
      type: 'quality_changed',
      context: {
        animeId,
        episode: episodeNumber,
        provider: currentProviderName,
        quality: level,
        playbackPosition: videoRef.current?.currentTime || 0,
        timestamp: Date.now(),
      },
    });

    const hls = hlsRef.current;
    if (hls) {
      if (level === 'Auto') {
        hls.currentLevel = -1;
      } else {
        const height = parseInt(level, 10);
        const idx = hls.levels.findIndex((lvl: any) => lvl.height === height);
        if (idx > -1) {
          hls.currentLevel = idx;
        }
      }
    }
  }, [animeId, episodeNumber, currentProviderName, videoRef]);

  const selectProvider = useCallback((name: string) => {
    setCurrentProviderName(name);
    setActiveSourceIdx(0);
    localStorage.setItem('animeworld:provider', name);

    AnalyticsBus.dispatch({
      type: 'mirror_changed',
      context: {
        animeId,
        episode: episodeNumber,
        provider: name,
        quality: currentQualityRef.current,
        playbackPosition: videoRef.current?.currentTime || 0,
        timestamp: Date.now(),
      },
    });
  }, [animeId, episodeNumber, videoRef]);

  // Auto-failover: switch provider when stall thresholds are exceeded
  const triggerAutoFailover = useCallback(() => {
    const now = Date.now();
    if (now - lastAutoFailoverRef.current < AUTO_FAILOVER_COOLDOWN_MS) return;
    lastAutoFailoverRef.current = now;

    const failedProvider = currentProviderNameRef.current;
    failedProvidersThisEpisodeRef.current.add(failedProvider);

    // Reset the stall window so we don't immediately re-trigger on the next provider
    stallCountInWindowRef.current = 0;
    stallTotalMsInWindowRef.current = 0;
    stallWindowStartRef.current = Date.now();

    if (onAutoFailover) {
      const skipProviders = Array.from(failedProvidersThisEpisodeRef.current);
      onToast(`Auto-switching from ${failedProvider} (too many stalls)…`);
      onAutoFailover(failedProvider, skipProviders);
    }
  }, [onAutoFailover, onToast]);

  const handleSourceError = useCallback(() => {
    if (activeSourceIdx + 1 < activeSources.length) {
      setActiveSourceIdx((prev) => prev + 1);
    } else {
      setErrorMessage('Failed to load all available stream sources.');
      setIsLoading(false);
    }
  }, [activeSourceIdx, activeSources.length]);

  // Audio Auto Switcher
  useEffect(() => {
    const isAvailable = (lang: 'sub' | 'dub' | 'hindi' | 'tamil' | 'telugu'): boolean => {
      if (lang === 'hindi') return hindiSourcesList.length > 0 || hasNativeHindi;
      if (lang === 'sub') return subSourcesList.length > 0;
      if (lang === 'dub') return dubSourcesList.length > 0;
      if (lang === 'tamil') return tamilSourcesList.length > 0;
      if (lang === 'telugu') return teluguSourcesList.length > 0;
      return false;
    };

    if (!isAvailable(currentLanguage)) {
      const priorities: ('hindi' | 'sub' | 'dub' | 'tamil' | 'telugu')[] = ['hindi', 'sub', 'dub', 'tamil', 'telugu'];
      const fallback = priorities.find(lang => isAvailable(lang));
      if (fallback) {
        setCurrentLanguage(fallback);
      }
    }
  }, [hindiSourcesList, subSourcesList, dubSourcesList, tamilSourcesList, teluguSourcesList, hasNativeHindi, currentLanguage]);

  // Session state updates
  useEffect(() => {
    savePlayerState({
      animeId,
      episode: episodeNumber,
      provider: currentProviderName,
      language: currentLanguage,
      quality: currentQuality,
      currentTime: videoRef.current?.currentTime || 0,
    });
  }, [currentProviderName, currentLanguage, currentQuality, animeId, episodeNumber, videoRef]);

  // HLS Loader and Native Fallback
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !activeSource) return;

    if (eventIdRef.current) {
      sendTelemetry();
    }
    eventIdRef.current = typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID 
      ? window.crypto.randomUUID() 
      : (Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2));

    loadStartRef.current = Date.now();
    loadDurationRef.current = 0;
    stallsRef.current = 0;
    failedRef.current = false;
    errorRef.current = null;
    hasSentRef.current = false;
    stallStartRef.current = 0;
    stallTotalMsRef.current = 0;

    setIsLoading(true);
    setErrorMessage(null);

    const handleLoadedMetadata = () => {
      setIsLoading(false);
      setDuration(video.duration);
      if (loadDurationRef.current === 0 && loadStartRef.current > 0) {
        loadDurationRef.current = Date.now() - loadStartRef.current;
      }

      const restoreTime = initialPosition || 0;
      if (restoreTime > 0) {
        if (restoreTime < video.duration - 30) {
          video.currentTime = restoreTime;
        } else {
          video.currentTime = 0;
          setCurrentTime(0);
        }
      } else {
        video.currentTime = 0;
      }
      video.playbackRate = playbackSpeedRef.current;
      video.volume = volumeRef.current;
      video.muted = isMutedRef.current;

      const tracks = video.textTracks;
      for (let i = 0; i < tracks.length; i++) {
        tracks[i].mode = i === activeSubtitleIdxRef.current ? 'showing' : 'disabled';
      }

      if (isPlayingRef.current) {
        video.play().catch(() => setIsPlaying(false));
      }
    };

    let hls: any = null;

    if (activeSource.isM3U8) {
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = activeSource.url;
        video.addEventListener('loadedmetadata', handleLoadedMetadata);
      } else {
        import('hls.js').then(({ default: Hls }) => {
          if (!Hls.isSupported()) {
            setErrorMessage('HLS playback is not supported in this browser.');
            setIsLoading(false);
            return;
          }

          hls = new Hls({
            maxMaxBufferLength: 20,
            enableWorker: true,
          });

          hlsRef.current = hls;
          hls.loadSource(activeSource.url);
          hls.attachMedia(video);

          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            setIsLoading(false);
            if (loadDurationRef.current === 0 && loadStartRef.current > 0) {
              loadDurationRef.current = Date.now() - loadStartRef.current;
            }

            const parsedLevels = hls.levels
              .map((l: any) => l.height ? `${l.height}p` : null)
              .filter((l: string | null): l is string => l !== null);
            const uniqueLevels = Array.from(new Set<string>(parsedLevels)).sort((a: string, b: string) => parseInt(b) - parseInt(a));
            setQualityLevels(['Auto', ...uniqueLevels]);

            const preferredQ = localStorage.getItem('animeworld:preferredQuality') || 'Auto';
            if (preferredQ !== 'Auto') {
              const height = parseInt(preferredQ, 10);
              const idx = hls.levels.findIndex((lvl: any) => lvl.height === height);
              if (idx > -1) {
                hls.currentLevel = idx;
                setCurrentQuality(preferredQ);
              }
            }

            const tracks = hls.audioTracks;
            if (tracks && tracks.length > 1) {
              const hasHiTrack = tracks.some(
                (t: any) =>
                  t.lang?.toLowerCase().startsWith('hi') ||
                  t.name?.toLowerCase().includes('hindi') ||
                  t.name?.toLowerCase().includes('hin')
              );
              if (hasHiTrack) {
                setHasNativeHindi(true);
              }
            }

            syncHlsAudioTrack(currentLanguageRef.current, hls);

            const restoreTime = initialPosition || 0;
            if (restoreTime > 0) {
              if (restoreTime < video.duration - 30) {
                video.currentTime = restoreTime;
              } else {
                video.currentTime = 0;
                setCurrentTime(0);
              }
            } else {
              video.currentTime = 0;
            }
            video.playbackRate = playbackSpeedRef.current;
            video.volume = volumeRef.current;
            video.muted = isMutedRef.current;

            if (isPlayingRef.current) {
              video.play().catch(() => setIsPlaying(false));
            }
          });

          hls.on(Hls.Events.ERROR, (event: any, data: any) => {
            if (data.fatal) {
              failedRef.current = true;
              errorRef.current = `HLS Fatal Error: ${data.type} - details: ${data.details || 'unknown'}`;
              sendTelemetry();
              handleSourceError();
            }
          });
        });
      }
    } else {
      video.src = activeSource.url;
      video.addEventListener('loadedmetadata', handleLoadedMetadata);
    }

    return () => {
      if (hls) {
        hls.destroy();
        hlsRef.current = null;
      }
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [activeSourceIdx, activeSource?.url, currentLanguage, initialPosition, videoRef, handleSourceError, sendTelemetry, syncHlsAudioTrack, isPlaying, setCurrentTime, setDuration, setIsPlaying]);

  // Video listeners for telemetry
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleWaiting = () => {
      setIsLoading(true);
      stallsRef.current += 1;
      // Start timing this stall if not already in one
      if (stallStartRef.current === 0) {
        stallStartRef.current = Date.now();
      }
    };
    const handleStalled = () => {
      setIsLoading(true);
      // stall count is already incremented in handleWaiting to avoid double-counting
    };
    const handlePlaying = () => {
      setIsLoading(false);
      if (loadDurationRef.current === 0 && loadStartRef.current > 0) {
        loadDurationRef.current = Date.now() - loadStartRef.current;
      }

      // Close out the stall timing and check thresholds
      if (stallStartRef.current > 0) {
        const stallMs = Date.now() - stallStartRef.current;
        stallStartRef.current = 0;
        stallTotalMsRef.current += stallMs;

        // Refresh rolling window if expired
        const now = Date.now();
        if (now - stallWindowStartRef.current > STALL_WINDOW_MS) {
          stallWindowStartRef.current = now;
          stallCountInWindowRef.current = 0;
          stallTotalMsInWindowRef.current = 0;
        }
        stallCountInWindowRef.current += 1;
        stallTotalMsInWindowRef.current += stallMs;

        // Single continuous stall exceeded limit
        if (stallMs >= STALL_SINGLE_THRESHOLD_MS) {
          triggerAutoFailover();
          return;
        }

        // Window-based threshold: too many stalls or too much total stall time
        if (
          stallCountInWindowRef.current >= STALL_COUNT_THRESHOLD ||
          stallTotalMsInWindowRef.current >= STALL_DURATION_THRESHOLD_MS
        ) {
          triggerAutoFailover();
        }
      }
    };
    const handleCanPlay = () => {
      setIsLoading(false);
      if (loadDurationRef.current === 0 && loadStartRef.current > 0) {
        loadDurationRef.current = Date.now() - loadStartRef.current;
      }
    };
    const handlePlay = () => {
      if (hasSentRef.current) {
        eventIdRef.current = typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : (Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2));
        loadStartRef.current = Date.now();
        loadDurationRef.current = 0;
        stallsRef.current = 0;
        failedRef.current = false;
        errorRef.current = null;
        hasSentRef.current = false;
      }
    };
    const handlePause = () => {
      sendTelemetry();
    };
    const handleEnded = () => {
      sendTelemetry();
    };
    const handleError = () => {
      if (video.error) {
        failedRef.current = true;
        errorRef.current = `HTML5 Video Error: code ${video.error.code} - message: ${video.error.message || 'unknown'}`;
        sendTelemetry();
      }
    };

    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('stalled', handleStalled);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('error', handleError);

    return () => {
      sendTelemetry();
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('stalled', handleStalled);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('error', handleError);
    };
  }, [activeSourceIdx, activeSource?.url, videoRef, sendTelemetry, triggerAutoFailover]);

  // Periodic telemetry updates (every 60s)
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      sendTelemetry();
      eventIdRef.current = typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : (Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2));
      loadStartRef.current = Date.now();
      loadDurationRef.current = 0;
      stallsRef.current = 0;
      failedRef.current = false;
      errorRef.current = null;
      hasSentRef.current = false;
    }, 60000);

    return () => clearInterval(interval);
  }, [isPlaying, sendTelemetry]);

  // Iframe load timeouts
  useEffect(() => {
    if (!isLoading || !isIframeSource) return;

    const timeout = setTimeout(() => {
      if (isLoading) {
        setIsLoading(false);
        onToast(`${currentProviderName} load timeout — try another server`);
      }
    }, 10000);

    return () => clearTimeout(timeout);
  }, [isLoading, isIframeSource, currentProviderName, onToast]);

  return {
    subSourcesList,
    dubSourcesList,
    hindiSourcesList,
    tamilSourcesList,
    teluguSourcesList,
    subtitleTracks,
    providersList,
    currentProviderName,
    activeSource,
    activeSources,
    isIframeSource,
    isLoading,
    setIsLoading,
    errorMessage,
    setErrorMessage,
    qualityLevels,
    currentQuality,
    selectQuality,
    currentLanguage,
    setCurrentLanguage,
    selectProvider,
    activeSourceIdx,
    setActiveSourceIdx,
    hasNativeHindi,
    syncHlsAudioTrack,
  };
}
