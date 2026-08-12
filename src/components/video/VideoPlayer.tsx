'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize, RotateCcw,
  SkipForward, SkipBack, Settings, HelpCircle, Tv, Globe, Server,
  Expand, Shrink, Bookmark, List, Maximize2, X, MonitorUp
} from 'lucide-react';
import { RemotePlaybackProvider } from '@/lib/player/playback/CastProvider';
import type { CastState, CastCapabilities } from '@/lib/player/types';
import PlayerError from './PlayerError';
import PlayerSettings from './PlayerSettings';
import ShortcutsOverlay from './ShortcutsOverlay';
import StreamDebugPanel from './StreamDebugPanel';
import BookmarksPanel from './BookmarksPanel';
import SeekBar from './SeekBar';
import ChaptersMenu from './ChaptersMenu';
import NextEpisodeOverlay from './NextEpisodeOverlay';
import { useRouter } from '@/navigation';
import { PlayerProvider } from './PlayerContext';
import { restorePlayerState } from '@/lib/usePlayerSession';
import { usePlayerPreferences } from '@/hooks/usePlayerPreferences';
import { useSkipMarkers } from '@/hooks/useSkipMarkers';
import { useStoryboard } from '@/hooks/useStoryboard';
import { usePlaybackControls } from '@/hooks/usePlaybackControls';
import { useNextEpisode } from '@/hooks/useNextEpisode';
import { useBufferDiagnostics } from '@/hooks/useBufferDiagnostics';
import { useResumeProgress } from '@/hooks/useResumeProgress';
import { useVideoSession } from '@/hooks/useVideoSession';
import { useSubtitleManager } from '@/hooks/useSubtitleManager';
import SubtitleOverlay from './SubtitleOverlay';
import type { EpisodeSource, SubtitleTrack } from '@/lib/player/types';
import type { UserSyncedPreferences } from '@/lib/player/preferences/preferences';

// STRICT IFRAME SANDBOX TOGGLE
export const ENABLE_IFRAME_SANDBOX = false;

interface VideoPlayerProps {
  animeId: string;
  animeImage: string;
  sources: EpisodeSource[]; // legacy fallback
  subSources?: EpisodeSource[];
  dubSources?: EpisodeSource[];
  hindiSources?: EpisodeSource[];
  tamilSources?: EpisodeSource[];
  teluguSources?: EpisodeSource[];
  subtitles?: SubtitleTrack[];
  animeTitle: string;
  episodeNumber: number;
  totalEpisodes?: number;
  onPrevEpisode?: () => void;
  onNextEpisode?: () => void;
  onProgress?: (position: number, duration: number) => void;
  onTheaterModeChange?: (isTheater: boolean) => void;
  initialPosition?: number;
  providers?: string[];
  currentProvider?: string;
  isFallback?: boolean;
  fallbackReason?: string;
  matchedTitle?: string;
  matchedSlug?: string;
  searchCount?: number;
  episodeCountFound?: number;
  providerSlug?: string;
  // Bookmark props
  bookmarks?: { id: string; timestamp: number; note?: string | null; label?: string | null }[];
  onAddBookmark?: (timestamp: number, note: string) => Promise<void>;
  onDeleteBookmark?: (id: string) => Promise<void>;
  onUpdateBookmarkNote?: (id: string, note: string) => Promise<void>;
  // Next episode details
  nextEpisodeTitle?: string;
  nextEpisodeThumbnail?: string;
}

const getProviderFriendlyName = (name: string): string => {
  switch (name.toLowerCase()) {
    case 'filmu':        return 'FilmU';
    case 'kaa':          return 'KickAss';
    case 'anibd':        return 'AniBD';
    case 'allmanga':     return 'AllAnime';
    case 'vidnest':      return 'VidNest';
    case 'gogocdn':      return 'GogoCDN';
    case 'reanime':      return 'ReAnime';
    case 'anime_nexus':  return 'Nexus';
    case 'anizone':      return 'AniZone';
    case 'anihq':        return 'AniHQ';
    case 'toonplay':     return 'ToonPlay';
    case 'toonworld':    return 'ToonWorld';
    case 'animotvslash': return 'AnimoTV';
    case 'vidsrc_me':    return 'VidSrc';
    case 'vidsrc_to':    return 'VidSrc.to';
    case 'vidsrc_sbs':   return 'VidSrc.sbs';
    case 'consumet':     return 'Multilingual 1';
    case 'animepahe':    return 'Multilingual 2';
    default: return name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }
};


export default function VideoPlayer({
  animeId,
  animeImage,
  sources,
  subSources = [],
  dubSources = [],
  hindiSources = [],
  tamilSources = [],
  teluguSources = [],
  subtitles = [],
  animeTitle,
  episodeNumber,
  totalEpisodes,
  onPrevEpisode,
  onNextEpisode,
  initialPosition = 0,
  providers = [],
  currentProvider = 'mock',
  isFallback = false,
  fallbackReason,
  matchedTitle: initialMatchedTitle,
  matchedSlug: initialMatchedSlug,
  searchCount: initialSearchCount,
  episodeCountFound: initialEpisodeCountFound,
  providerSlug: initialProviderSlug,
  onTheaterModeChange,
  // Bookmark props default values
  bookmarks = [],
  onAddBookmark,
  onDeleteBookmark,
  onUpdateBookmarkNote,
  nextEpisodeTitle,
  nextEpisodeThumbnail,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Unified preferences hook
  const {
    preferences,
    loading: preferencesLoading,
    setSyncedPreference,
    setDevicePreference,
    debouncedSetDevice,
  } = usePlayerPreferences();

  // Core Playback State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(initialPosition);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [activeSubtitleIdx, setActiveSubtitleIdx] = useState(-1);

  // UI Panels
  const [showSettings, setShowSettings] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [showBookmarksPanel, setShowBookmarksPanel] = useState(false);
  const [showChapters, setShowChapters] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Floating Mini-player states
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [isFloating, setIsFloating] = useState(false);
  const [isFloatingClosed, setIsFloatingClosed] = useState(false);
  const floatingCorner = preferences.floatingCorner || 'bottom-right';
  const setFloatingCorner = useCallback((corner: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left') => {
    setDevicePreference('floatingCorner', corner);
  }, [setDevicePreference]);

  // Casting states
  const [castState, setCastState] = useState<CastState>('idle');
  const [castCapabilities, setCastCapabilities] = useState<CastCapabilities>({
    available: false,
    canConnect: false,
    provider: '',
  });
  const castProviderRef = useRef<RemotePlaybackProvider | null>(null);

  useEffect(() => {
    const provider = new RemotePlaybackProvider();
    castProviderRef.current = provider;

    const unsubscribe = provider.subscribe((state) => {
      setCastState(state);
      setCastCapabilities(provider.getCapabilities());
    });

    return () => {
      unsubscribe();
      provider.dispose();
    };
  }, []);

  const startCast = useCallback(async () => {
    const video = videoRef.current;
    if (video && castProviderRef.current) {
      try {
        await castProviderRef.current.connect(video);
      } catch (err) {
        console.error('Casting connection failed:', err);
      }
    }
  }, []);

  const stopCast = useCallback(async () => {
    if (castProviderRef.current) {
      await castProviderRef.current.disconnect();
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || window.innerWidth < 1024) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) {
          const ratio = entry.intersectionRatio;

          // Reset closed state if scroll returns sentinel to view
          if (ratio > 0.25) {
            setIsFloatingClosed(false);
          }

          setIsFloating((prev) => {
            if (isFullscreen) return false;
            if (isFloatingClosed) return false;

            if (prev) {
              return ratio < 0.25;
            } else {
              return ratio < 0.05;
            }
          });
        }
      },
      {
        threshold: [0.01, 0.05, 0.1, 0.2, 0.25, 0.3],
        rootMargin: '-80px 0px 0px 0px',
      }
    );

    observer.observe(sentinel);
    return () => {
      observer.disconnect();
    };
  }, [isFullscreen, isFloatingClosed]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsFloating(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const restoreInline = useCallback(() => {
    setIsFloating(false);
    sentinelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    playerRef.current?.focus();
  }, []);

  // Mobile gesture/swipe states
  const [touchFeedback, setTouchFeedback] = useState<'back' | 'forward' | null>(null);
  const [showVolumeIndicator, setShowVolumeIndicator] = useState(false);
  const [gestureVolume, setGestureVolume] = useState(1.0);
  const [isLongPressing2x, setIsLongPressing2x] = useState(false);

  // Resume watched position
  const [showResumePromptState, setShowResumePromptState] = useState(false);
  const [resumeTime, setResumeTime] = useState(0);

  // Caught up overlay
  const [showCaughtUp, setShowCaughtUp] = useState(false);

  // Client-Side Canvas Accent Color Extraction
  const [accentColor, setAccentColor] = useState('hsl(250, 100%, 60%)');
  const [accentH, setAccentH] = useState(250);
  const [accentS, setAccentS] = useState('100%');
  const [accentL, setAccentL] = useState('60%');

  // Interactive toasts
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const lastTapRef = useRef<{ time: number; x: number }>({ time: 0, x: 0 });
  const touchStartRef = useRef<{ x: number; y: number; time: number; volume: number }>({ x: 0, y: 0, time: 0, volume: 1 });
  const longPressTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Navigation handlers
  const handlePrev = useCallback(() => {
    if (onPrevEpisode) {
      onPrevEpisode();
    } else if (episodeNumber > 1) {
      router.push(`/watch/${animeId}/${episodeNumber - 1}`);
    }
  }, [onPrevEpisode, episodeNumber, animeId, router]);

  const handleNext = useCallback(() => {
    if (onNextEpisode) {
      onNextEpisode();
    } else if (totalEpisodes && episodeNumber < totalEpisodes) {
      router.push(`/watch/${animeId}/${episodeNumber + 1}`);
    }
  }, [onNextEpisode, totalEpisodes, episodeNumber, animeId, router]);

  // 1. Video Session Manager (HLS + Quality + Audio + Providers)
  const {
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
    setActiveSourceIdx,
    hasNativeHindi,
  } = useVideoSession({
    videoRef,
    animeId,
    episodeNumber,
    animeTitle,
    animeImage,
    initialPosition,
    sources,
    subSources,
    dubSources,
    hindiSources,
    tamilSources,
    teluguSources,
    subtitles,
    providers,
    currentProvider,
    onToast: setToastMessage,
    playbackSpeed,
    volume,
    isMuted,
    activeSubtitleIdx,
    isPlaying,
    setIsPlaying,
    setDuration,
    setCurrentTime,
  });

  // 2. Skip Markers
  const {
    skipIntervals,
    showSkipIntro,
    showSkipEnding,
    showSkipRecap,
    skipIntro,
    skipEnding,
    skipRecap,
  } = useSkipMarkers({
    animeId,
    episodeNumber,
    videoRef,
    autoSkipIntro: preferences.autoSkipOP,
    autoSkipOutro: preferences.autoSkipED,
    onToast: setToastMessage,
  });

  // 3. Storyboard (parsed WebVTT image strip with LRU cache)
  const {
    getCueAt: getStoryboardCueAt,
  } = useStoryboard(animeId, episodeNumber);

  // 3.5 Subtitle Manager (dynamic WebVTT/SRT overlay + ASS engine)
  const {
    activeCues,
    subtitleState,
    error: subtitleError,
    capabilities: subtitleCapabilities
  } = useSubtitleManager({
    videoRef,
    containerRef: playerRef,
    activeTrack: activeSubtitleIdx === -1 ? null : subtitleTracks[activeSubtitleIdx],
    delayMs: preferences.subtitleDelayOffset,
    style: preferences.subtitleStyle,
    visible: preferences.subtitlesVisible,
    animeId,
    episodeNumber,
    currentProviderName
  });

  // 4. Playback Controls (Shift-hold 2x speed, Right-click hold, hotkeys layout)
  const {
    handleMouseDown,
    handleMouseUp,
    handleContextMenu,
  } = usePlaybackControls({
    videoRef,
    isPlaying,
    isLoading,
    playbackSpeed,
    volume,
    isMuted,
    activeSubtitleIdx,
    subtitleCount: subtitleTracks.length,
    episodeNumber,
    totalEpisodes,
    showSkipIntro,
    showSkipEnding,
    keyBinds: preferences.keyBinds,
    onTogglePlay: () => togglePlay(),
    onSeek: (time) => {
      const video = videoRef.current;
      if (video) {
        video.currentTime = time;
        setCurrentTime(time);
      }
    },
    onVolumeChange: (vol) => {
      const video = videoRef.current;
      if (video) video.volume = vol;
      setVolume(vol);
      debouncedSetDevice('volume', vol);
    },
    onToggleMute: () => {
      const video = videoRef.current;
      if (video) video.muted = !isMuted;
      setIsMuted(!isMuted);
    },
    onToggleFullscreen: () => {
      toggleFullscreen();
    },
    onSpeedChange: (speed) => {
      const video = videoRef.current;
      if (video) video.playbackRate = speed;
      setPlaybackSpeed(speed);
      setSyncedPreference('playbackSpeed', speed);
    },
    onCycleSubtitle: () => {
      const nextIdx = activeSubtitleIdx + 1 >= subtitleTracks.length ? -1 : activeSubtitleIdx + 1;
      setActiveSubtitleIdx(nextIdx);
      const label = nextIdx === -1 ? 'Off' : subtitleTracks[nextIdx]?.label || 'Off';
      setToastMessage(`Subtitles: ${label}`);
    },
    onAdjustDelay: (amount) => {
      const current = preferences.subtitleDelayOffset || 0;
      const next = Math.max(-10000, Math.min(10000, current + amount));
      setDevicePreference('subtitleDelayOffset', next);
      setToastMessage(`Subtitle delay: ${next > 0 ? '+' : ''}${next}ms`);
    },
    onResetDelay: () => {
      setDevicePreference('subtitleDelayOffset', 0);
      setToastMessage('Subtitle delay: Reset (0ms)');
    },
    onSkipIntro: skipIntro,
    onSkipEnding: skipEnding,
    onNext: handleNext,
    onPrev: handlePrev,
    onLongPressChange: (active) => {
      setIsLongPressing2x(active);
    },
  });

  // 5. Next Episode Overlay (context-aware countdown overlay trigger)
  const {
    countdown,
    dismiss: dismissNextEpisode,
    accept: acceptNextEpisode,
  } = useNextEpisode({
    videoRef,
    episodeNumber,
    totalEpisodes,
    skipIntervals,
    isAutoplayNext: preferences.autoNext,
    autoplayCountdown: 5,
    onNext: handleNext,
  });

  // 6. Buffering Diagnostics Toast Warnings
  useBufferDiagnostics({
    videoRef,
    analyticsContext: {
      animeId,
      episode: episodeNumber,
      provider: currentProviderName,
      quality: currentQuality,
    },
    onToast: setToastMessage,
  });

  // 7. Watch progress periodically database sync
  useResumeProgress({
    videoRef,
    animeId,
    animeTitle,
    animeImage,
    episodeNumber,
    totalEpisodes,
    analyticsContext: {
      animeId,
      episode: episodeNumber,
      provider: currentProviderName,
      quality: currentQuality,
    },
    activeSubtitleIdx,
    currentLanguage,
    currentQuality,
  });

  // Toggles and settings mappings
  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video || isLoading) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      video.play().catch(() => {});
      setIsPlaying(true);
    }
  }, [isLoading, isPlaying]);

  const toggleFullscreen = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;

    if (!document.fullscreenElement) {
      player.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  }, []);

  const [isPiPSupported, setIsPiPSupported] = useState(false);
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const video = videoRef.current;
      setIsPiPSupported(
        !!(document as unknown as { pictureInPictureEnabled?: boolean }).pictureInPictureEnabled ||
        !!(video && (video as unknown as { webkitSupportsPresentationMode?: boolean }).webkitSupportsPresentationMode)
      );
    }
  }, []);

  const togglePiP = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await video.requestPictureInPicture();
      }
    } catch {}
  }, []);

  const selectLanguage = (lang: 'sub' | 'dub' | 'hindi' | 'tamil' | 'telugu') => {
    setCurrentLanguage(lang);
    setActiveSourceIdx(0);
  };

  const selectSubtitle = (idx: number) => {
    setActiveSubtitleIdx(idx);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = Number(e.target.value);
    const video = videoRef.current;
    if (video) video.volume = vol;
    setVolume(vol);
    debouncedSetDevice('volume', vol);
    if (vol > 0 && isMuted) {
      if (video) video.muted = false;
      setIsMuted(false);
    }
  };

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      video.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  }, [isMuted]);

  const changeSpeed = useCallback((speed: number) => {
    const video = videoRef.current;
    if (video) video.playbackRate = speed;
    setPlaybackSpeed(speed);
    setSyncedPreference('playbackSpeed', speed);
  }, [setSyncedPreference]);

  const toggleTheaterMode = useCallback(() => {
    const next = !isTheaterMode;
    setIsTheaterMode(next);
    onTheaterModeChange?.(next);
  }, [isTheaterMode, onTheaterModeChange]);

  // Touch Swipe Gesture Actions
  const showTouchFeedback = (dir: 'back' | 'forward') => {
    setTouchFeedback(dir);
    setTimeout(() => setTouchFeedback(null), 800);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    touchStartRef.current = {
      x,
      y,
      time: Date.now(),
      volume,
    };

    if (isPlaying) {
      longPressTimeoutRef.current = setTimeout(() => {
        setIsLongPressing2x(true);
        const video = videoRef.current;
        if (video) video.playbackRate = 2.0;
      }, 500);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const video = videoRef.current;
    if (!video) return;

    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;

    if (isLongPressing2x) {
      if (longPressTimeoutRef.current) clearTimeout(longPressTimeoutRef.current);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const touchXFromLeft = touch.clientX - rect.left;
    const isRightSide = touchXFromLeft > rect.width / 2;

    if (Math.abs(deltaY) > 30 && Math.abs(deltaY) > Math.abs(deltaX) && isRightSide) {
      if (longPressTimeoutRef.current) clearTimeout(longPressTimeoutRef.current);
      e.preventDefault();

      const volChange = -deltaY / 150;
      const nextVol = Math.max(0, Math.min(1, touchStartRef.current.volume + volChange));
      video.volume = nextVol;
      setVolume(nextVol);
      setGestureVolume(nextVol);
      setShowVolumeIndicator(true);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (longPressTimeoutRef.current) clearTimeout(longPressTimeoutRef.current);

    const video = videoRef.current;
    if (!video) return;

    if (isLongPressing2x) {
      setIsLongPressing2x(false);
      video.playbackRate = playbackSpeed;
      return;
    }

    setTimeout(() => setShowVolumeIndicator(false), 1000);

    const now = Date.now();
    const touch = e.changedTouches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const width = rect.width;

    const timeDiff = now - lastTapRef.current.time;
    const distDiff = Math.abs(x - lastTapRef.current.x);

    if (timeDiff < 300 && distDiff < 50) {
      e.preventDefault();
      if (x < width / 2) {
        video.currentTime = Math.max(video.currentTime - 10, 0);
        showTouchFeedback('back');
      } else {
        video.currentTime = Math.min(video.currentTime + 10, video.duration);
        showTouchFeedback('forward');
      }
    }

    lastTapRef.current = { time: now, x };
  };

  useEffect(() => {
    if (preferencesLoading) return;
    if (preferences.volume !== undefined) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVolume(preferences.volume);
    }
    if (preferences.playbackSpeed !== undefined) {
      setPlaybackSpeed(preferences.playbackSpeed);
    }
  }, [preferencesLoading, preferences.volume, preferences.playbackSpeed]);

  // Mount-time resume prompts
  useEffect(() => {
    const session = restorePlayerState(animeId, episodeNumber);
    if (session) {
      if (session.provider) {
        localStorage.setItem('animeworld:provider', session.provider);
      }
      if (session.language && ['sub', 'dub', 'hindi', 'tamil', 'telugu'].includes(session.language)) {
        localStorage.setItem('animeworld:preferredLanguage', session.language);
      }
      if (session.quality) {
        localStorage.setItem('animeworld:preferredQuality', session.quality);
      }
      if (session.currentTime > 90) {
        localStorage.setItem(
          `animeworld:playbackTime:${animeId}:${episodeNumber}`,
          String(session.currentTime),
        );
      }
    }

    const savedVolume = localStorage.getItem('animeworld:preferredVolume');
    if (savedVolume !== null) {
      const parsedVol = Number(savedVolume);
      if (!isNaN(parsedVol)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setVolume(parsedVol);
      }
    }

    const savedSpeed = localStorage.getItem('animeworld:preferredPlaybackSpeed');
    if (savedSpeed !== null) {
      const parsedSpeed = parseFloat(savedSpeed);
      if (!isNaN(parsedSpeed)) setPlaybackSpeed(parsedSpeed);
    }

    const savedReduced = localStorage.getItem('animeworld:reduced_motion');
    if (savedReduced !== null) {
      setReducedMotion(savedReduced === 'true');
    }

    const loadDbPreferences = async () => {
      try {
        const res = await fetch('/api/user/preferences');
        if (res.ok) {
          const prefs = await res.json();
          if (prefs && prefs.reducedMotion !== undefined) {
            setReducedMotion(prefs.reducedMotion);
            localStorage.setItem('animeworld:reduced_motion', String(prefs.reducedMotion));
          }
        }
      } catch {}
    };
    loadDbPreferences();

    const savedTimeStr = localStorage.getItem(`animeworld:playbackTime:${animeId}:${episodeNumber}`);
    let savedTime = 0;
    
    if (initialPosition > 90) {
      savedTime = initialPosition;
    } else if (savedTimeStr) {
      const parsedTime = parseFloat(savedTimeStr);
      if (!isNaN(parsedTime)) {
        savedTime = parsedTime;
      }
    }

    if (savedTime > 90) {
      const savedShowPrompt = localStorage.getItem('animeworld:show_resume_prompt') !== 'false';
      if (savedShowPrompt) {
        setResumeTime(savedTime);
        setShowResumePromptState(true);
      } else {
        if (videoRef.current) {
          videoRef.current.currentTime = savedTime;
        }
        setCurrentTime(savedTime);
      }
    }
  }, [animeId, episodeNumber, initialPosition]);

  const handleResumeConfirm = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = resumeTime;
      video.play().catch(() => {});
      setIsPlaying(true);
    }
    setCurrentTime(resumeTime);
    setShowResumePromptState(false);

    // Extended resume parameters validation and restoration
    if (typeof window !== 'undefined') {
      try {
        const resumeDataStr = localStorage.getItem(`aniworld-resume:${animeId}:${episodeNumber}`);
        if (resumeDataStr) {
          const resumeData = JSON.parse(resumeDataStr);
          if (resumeData.resumeVersion === 1) {
            // 1. Playback Rate
            if (resumeData.playbackRate && video) {
              video.playbackRate = resumeData.playbackRate;
              setPlaybackSpeed(resumeData.playbackRate);
            }
            // 2. Subtitle Track Validation
            if (resumeData.activeSubtitleIdx !== undefined && resumeData.activeSubtitleIdx >= -1 && resumeData.activeSubtitleIdx < subtitleTracks.length) {
              setActiveSubtitleIdx(resumeData.activeSubtitleIdx);
            }
            // 3. Audio Language
            if (resumeData.currentLanguage) {
              const hasSource = resumeData.currentLanguage === 'hindi' ? (hindiSourcesList.length > 0 || hasNativeHindi) :
                                resumeData.currentLanguage === 'tamil' ? tamilSourcesList.length > 0 :
                                resumeData.currentLanguage === 'telugu' ? teluguSourcesList.length > 0 :
                                resumeData.currentLanguage === 'dub' ? dubSourcesList.length > 0 :
                                subSourcesList.length > 0;
              if (hasSource) {
                setCurrentLanguage(resumeData.currentLanguage);
              }
            }
            // 4. Quality Level
            if (resumeData.currentQuality && qualityLevels.includes(resumeData.currentQuality)) {
              selectQuality(resumeData.currentQuality);
            }
          }
        }
      } catch (err) {
        console.warn('Failed to restore extended resume parameters:', err);
      }
    }
  }, [resumeTime, videoRef, animeId, episodeNumber, subtitleTracks, hindiSourcesList, hasNativeHindi, tamilSourcesList, teluguSourcesList, dubSourcesList, subSourcesList, qualityLevels, selectQuality, setCurrentLanguage]);

  const handleResumeRestart = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = 0;
      video.play().catch(() => {});
      setIsPlaying(true);
    }
    setCurrentTime(0);
    setShowResumePromptState(false);
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(`aniworld-resume:${animeId}:${episodeNumber}`);
      } catch {}
    }
  }, [videoRef, animeId, episodeNumber]);

  useEffect(() => {
    if (!showResumePromptState) return;
    const timer = setTimeout(() => {
      handleResumeConfirm();
    }, 8000);
    return () => clearTimeout(timer);
  }, [showResumePromptState, handleResumeConfirm]);

  // Color extraction and auto subtitle sync
  useEffect(() => {
    if (!animeImage) return;

    const extractColor = async () => {
      try {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = animeImage;
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = 10;
            canvas.height = 10;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            ctx.drawImage(img, 0, 0, 10, 10);
            const pixels = ctx.getImageData(0, 0, 10, 10).data;
            
            let rSum = 0, gSum = 0, bSum = 0, count = 0;
            for (let i = 0; i < pixels.length; i += 4) {
              const r = pixels[i];
              const g = pixels[i+1];
              const b = pixels[i+2];
              const a = pixels[i+3];
              if (a > 200) {
                const maxVal = Math.max(r, g, b);
                const minVal = Math.min(r, g, b);
                if (maxVal - minVal > 20) {
                  rSum += r;
                  gSum += g;
                  bSum += b;
                  count++;
                }
              }
            }

            if (count === 0) {
              for (let i = 0; i < pixels.length; i += 4) {
                rSum += pixels[i];
                gSum += pixels[i+1];
                bSum += pixels[i+2];
                count++;
              }
            }

            const rAvg = Math.round(rSum / count);
            const gAvg = Math.round(gSum / count);
            const bAvg = Math.round(bSum / count);

            const rNorm = rAvg / 255;
            const gNorm = gAvg / 255;
            const bNorm = bAvg / 255;
            const max = Math.max(rNorm, gNorm, bNorm);
            const min = Math.min(rNorm, gNorm, bNorm);
            let h = 0, s = 0;
            const l = (max + min) / 2;

            if (max !== min) {
              const d = max - min;
              s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
              switch (max) {
                case rNorm: h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0); break;
                case gNorm: h = (bNorm - rNorm) / d + 2; break;
                case bNorm: h = (rNorm - gNorm) / d + 4; break;
              }
              h /= 6;
            }

            const sFinal = Math.max(0.65, s) * 100;
            const lFinal = Math.max(0.45, Math.min(0.65, l)) * 100;
            const hFinal = h * 360;

            const roundedH = Math.round(hFinal);
            const roundedS = Math.round(sFinal);
            const roundedL = Math.round(lFinal);

            setAccentColor(`hsl(${roundedH}, ${roundedS}%, ${roundedL}%)`);
            setAccentH(roundedH);
            setAccentS(`${roundedS}%`);
            setAccentL(`${roundedL}%`);
          } catch {}
        };
      } catch {}
    };

    extractColor();
  }, [animeImage]);

  useEffect(() => {
    if (currentLanguage === 'sub') {
      if (subtitleTracks.length > 0) {
        const engIdx = subtitleTracks.findIndex(
          (t) =>
            t.lang.toLowerCase() === 'en' ||
            t.label.toLowerCase().includes('eng')
        );
        if (engIdx > -1) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setActiveSubtitleIdx(engIdx);
        } else {
          setActiveSubtitleIdx(0);
        }
      }
    } else {
      setActiveSubtitleIdx(-1);
    }
  }, [currentLanguage, subtitleTracks]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const textTracks = video.textTracks;
    const syncTracks = () => {
      for (let i = 0; i < textTracks.length; i++) {
        textTracks[i].mode = 'disabled';
      }
    };

    syncTracks();
    textTracks.onaddtrack = () => {
      syncTracks();
    };

    return () => {
      textTracks.onaddtrack = null;
    };
  }, [activeSubtitleIdx, subtitleTracks, videoRef]);

  // Controls overlay timer fade logic
  const resetControlsTimeout = useCallback(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    setShowControls(true);
    if (isPlaying && !showSettings && !showShortcutsHelp) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 2000);
    }
  }, [isPlaying, showSettings, showShortcutsHelp]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    resetControlsTimeout();
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [resetControlsTimeout]);

  const handleMouseMove = () => {
    resetControlsTimeout();
  };

  const handleMouseLeave = () => {
    if (isPlaying && !showSettings && !showShortcutsHelp) {
      setShowControls(false);
    }
  };

  // Helper formatting time strings
  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '00:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);

    const pad = (num: number) => String(num).padStart(2, '0');

    if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
    return `${pad(m)}:${pad(s)}`;
  };

  const playbackContextValue = useMemo(() => ({
    videoRef,
    isPlaying,
    setIsPlaying,
    playbackSpeed,
    setPlaybackSpeed,
    isMuted,
    setIsMuted,
    volume,
    setVolume,
    duration,
    setDuration,
    togglePlay,
    toggleMute,
    seek: (time: number) => {
      const video = videoRef.current;
      if (video) {
        video.currentTime = time;
        setCurrentTime(time);
      }
    },
    changeSpeed,
    isLongPressing2x,
    episodeNumber,
  }), [
    isPlaying,
    playbackSpeed,
    isMuted,
    volume,
    duration,
    isLongPressing2x,
    episodeNumber,
    changeSpeed,
    toggleMute,
    togglePlay,
  ]);

  const sessionContextValue = useMemo(() => ({
    currentLanguage,
    setCurrentLanguage,
    currentQuality,
    selectQuality,
    currentProviderName,
    selectProvider,
    qualityLevels,
    providersList,
    subtitleTracks,
    activeSubtitleIdx,
    setActiveSubtitleIdx,
    hasNativeHindi,
    activeSource,
    activeSources,
    isIframeSource,
    castState,
    castCapabilities,
    startCast,
    stopCast,
  }), [
    currentLanguage,
    currentQuality,
    currentProviderName,
    qualityLevels,
    providersList,
    subtitleTracks,
    activeSubtitleIdx,
    hasNativeHindi,
    activeSource,
    activeSources,
    isIframeSource,
    castState,
    castCapabilities,
    startCast,
    stopCast,
    selectProvider,
    selectQuality,
    setCurrentLanguage,
  ]);

  const preferencesContextValue = useMemo(() => ({
    preferences,
    preferencesLoading,
    debouncedSetDevicePreference: debouncedSetDevice,
    togglePreference: async (key: string) => {
      const currentVal = preferences[key as keyof typeof preferences];
      if (typeof currentVal === 'boolean') {
        await setSyncedPreference(key as keyof UserSyncedPreferences, !currentVal);
      }
    },
    skipIntervals,
    showSkipIntro,
    showSkipEnding,
    skipIntro,
    skipEnding,
  }), [
    preferences,
    preferencesLoading,
    skipIntervals,
    showSkipIntro,
    showSkipEnding,
    debouncedSetDevice,
    setSyncedPreference,
    skipEnding,
    skipIntro,
  ]);

  const uiContextValue = useMemo(() => ({
    isFullscreen,
    setIsFullscreen,
    toggleFullscreen,
    showControls,
    setShowControls,
    isPiPSupported,
    togglePiP,
    reducedMotion,
    setReducedMotion,
    accentColor,
    accentH,
    accentS,
    accentL,
    handleNext,
    handlePrev,
    formatTime: formatTime,
    getCueAt: getStoryboardCueAt,
    bookmarks,
    nextEpisodeNumber: episodeNumber,
    nextEpisodeTitle,
    nextEpisodeThumbnail,
    nextEpisodeCountdown: countdown,
    nextEpisodeAccept: acceptNextEpisode,
    nextEpisodeDismiss: dismissNextEpisode,
    isFloating,
    setIsFloating,
    floatingCorner,
    setFloatingCorner,
  }), [
    isFullscreen,
    showControls,
    isPiPSupported,
    reducedMotion,
    accentColor,
    accentH,
    accentS,
    accentL,
    handleNext,
    handlePrev,
    bookmarks,
    episodeNumber,
    nextEpisodeTitle,
    nextEpisodeThumbnail,
    countdown,
    acceptNextEpisode,
    dismissNextEpisode,
    getStoryboardCueAt,
    toggleFullscreen,
    togglePiP,
    isFloating,
    floatingCorner,
    setFloatingCorner,
  ]);

  return (
    <PlayerProvider
      playback={playbackContextValue}
      session={sessionContextValue}
      preferences={preferencesContextValue}
      ui={uiContextValue}
    >
      <div className={`flex flex-col gap-4 w-full ${reducedMotion ? 'reduced-motion-active' : ''}`}>
      {reducedMotion && (
        <style dangerouslySetInnerHTML={{ __html: `
          .reduced-motion-active *,
          .reduced-motion-active *::before,
          .reduced-motion-active *::after {
            animation-duration: 0.001ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.001ms !important;
            scroll-behavior: auto !important;
          }
        `}} />
      )}
      {/* Sentinel scroll trigger */}
      <div ref={sentinelRef} className="h-0 w-full" />

      {/* Stable Placeholder to prevent layout shift */}
      {isFloating && (
        <div className="w-full aspect-video rounded-2xl bg-white/5 shimmer-loader flex items-center justify-center text-text-muted text-xs select-none">
          Anime playback is active in mini-player mode
        </div>
      )}

      <div
        ref={playerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onContextMenu={handleContextMenu}
        className={isFloating
          ? `fixed z-50 shadow-2xl rounded-xl border border-white/10 aspect-video transition-all duration-300 ${
              floatingCorner === 'bottom-right' ? 'bottom-4 right-4' :
              floatingCorner === 'bottom-left' ? 'bottom-4 left-4' :
              floatingCorner === 'top-right' ? 'top-20 right-4' :
              'top-20 left-4'
            } w-80 lg:w-96`
          : `relative w-full aspect-video bg-black rounded-2xl overflow-hidden group/player shadow-2xl border border-border-subtle ${
              isFullscreen ? 'rounded-none border-none' : ''
            }`
        }
        style={{
          cursor: showControls ? 'default' : 'none',
          ...({
            '--player-accent': accentColor,
            '--player-accent-h': accentH,
            '--player-accent-s': accentS,
            '--player-accent-l': accentL,
          } as React.CSSProperties)
        }}
      >
        {/* Error State Overlay */}
        {errorMessage && (
          <PlayerError
            message={errorMessage}
            onRetry={() => {
              setErrorMessage(null);
              setActiveSourceIdx(0);
            }}
          />
        )}

        {/* Native HTML5 Video or embedded Iframe Player */}
        {isIframeSource ? (
          <iframe
            src={activeSource.url}
            className="w-full h-full border-0"
            allowFullScreen
            allow="autoplay; encrypted-media; picture-in-picture"
            sandbox={ENABLE_IFRAME_SANDBOX ? "allow-scripts allow-same-origin allow-forms" : undefined}
            onLoad={() => setIsLoading(false)}
          />
        ) : (
          <video
            ref={videoRef}
            className="w-full h-full object-contain cursor-pointer"
            playsInline
            crossOrigin="anonymous"
          />
        )}

        {/* Custom WebVTT Subtitles Overlay */}
        {!isIframeSource && subtitleTracks[activeSubtitleIdx]?.codec !== 'ass' && (
          <SubtitleOverlay 
            activeCues={activeCues} 
            style={preferences.subtitleStyle} 
          />
        )}

        {/* Playback speed 2x hold indicator overlay */}
        {isLongPressing2x && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-40 bg-black/60 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full flex items-center gap-2 text-white text-xs font-black tracking-widest uppercase shadow-2xl animate-pulse select-none">
            <span className="w-2 h-2 rounded-full bg-accent-violet animate-ping" />
            <span>2.0x Speed</span>
          </div>
        )}

        {/* Manual Skip Intro / Ending / Recap Overlays — only for native video */}
        {!isIframeSource && showSkipIntro && (
          <button
            onClick={skipIntro}
            className={`absolute left-6 z-40 bg-[#0D0D14]/90 border border-accent-violet/30 hover:border-accent-violet/60 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all duration-300 shadow-lg select-none backdrop-blur-md ${
              showControls ? 'bottom-32' : 'bottom-8'
            }`}
            aria-label="Skip Intro"
          >
            ⏩ Skip Intro
          </button>
        )}
        {!isIframeSource && showSkipEnding && (
          <button
            onClick={skipEnding}
            className={`absolute left-6 z-40 bg-[#0D0D14]/90 border border-accent-violet/30 hover:border-accent-violet/60 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all duration-300 shadow-lg select-none backdrop-blur-md ${
              showControls ? 'bottom-32' : 'bottom-8'
            }`}
            aria-label="Skip Ending"
          >
            ⏩ Skip Ending
          </button>
        )}
        {!isIframeSource && showSkipRecap && (
          <button
            onClick={skipRecap}
            className={`absolute left-6 z-40 bg-[#0D0D14]/90 border border-accent-violet/30 hover:border-accent-violet/60 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all duration-300 shadow-lg select-none backdrop-blur-md ${
              showControls ? 'bottom-32' : 'bottom-8'
            }`}
            aria-label="Skip Recap"
          >
            ⏩ Skip Recap
          </button>
        )}

        {/* In-Player Resume Prompt Overlay — only for native video */}
        {!isIframeSource && showResumePromptState && (
          <div
            className={`absolute left-6 z-40 bg-[#0D0D14]/95 border border-accent-violet/30 p-4 rounded-xl shadow-2xl backdrop-blur-md flex flex-col gap-2 max-w-xs transition-all duration-300 ${
              showControls ? 'bottom-32' : 'bottom-8'
            }`}
          >
            <p className="text-xs font-bold text-white">
              Continue watching from {formatTime(resumeTime)}?
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={handleResumeConfirm}
                className="px-3 py-1.5 bg-accent-violet hover:bg-accent-violet/85 text-white font-bold text-[10px] rounded-lg transition-colors"
              >
                ▶ Resume
              </button>
              <button
                onClick={handleResumeRestart}
                className="px-3 py-1.5 border border-white/10 hover:bg-white/10 text-white font-bold text-[10px] rounded-lg transition-colors"
              >
                ↩ Start from 0:00
              </button>
            </div>
          </div>
        )}

        {/* Auto Next Countdown Overlay (Floating bottom-right card) */}
        {countdown !== null && (
          <NextEpisodeOverlay />
        )}

        {/* You're All Caught Up Overlay */}
        {showCaughtUp && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md text-center p-6 animate-fade-in">
            <div className="space-y-6 max-w-md w-full bg-[#0D0D14]/95 border border-white/10 rounded-2xl p-6 shadow-2xl animate-fade-up">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white leading-tight font-display mb-1 select-none">
                  You&apos;re all caught up!
                </h3>
                <p className="text-xs text-text-secondary select-none">
                  You&apos;ve watched the final episode of {animeTitle}.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setShowCaughtUp(false)}
                  className="px-5 py-2 rounded-xl border border-white/10 hover:bg-white/10 text-white font-bold text-xs transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setShowCaughtUp(false);
                    const video = videoRef.current;
                    if (video) {
                      video.currentTime = 0;
                      video.play().catch(() => {});
                      setIsPlaying(true);
                    }
                  }}
                  className="px-5 py-2 rounded-xl bg-accent-violet hover:bg-accent-violet/85 text-white font-bold text-xs transition-colors"
                >
                  Replay Episode
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Gesture Volume Indicator */}
        {showVolumeIndicator && (
          <div className="absolute right-6 top-1/2 -translate-y-1/2 z-50 pointer-events-none flex flex-col items-center gap-1.5 bg-black/60 border border-white/10 rounded-full py-4 px-2 w-10 text-white">
            <Volume2 size={16} />
            <div className="w-1 h-20 bg-white/20 rounded-full relative overflow-hidden">
              <div
                className="absolute bottom-0 left-0 right-0 bg-accent-violet transition-all duration-75"
                style={{ height: `${gestureVolume * 100}%` }}
              />
            </div>
            <span className="text-[8px] font-mono select-none">{Math.round(gestureVolume * 100)}</span>
          </div>
        )}

        {/* Touch seeking feedback overlay */}
        {touchFeedback === 'back' && (
          <div className="absolute left-[15%] top-1/2 -translate-y-1/2 z-50 pointer-events-none flex flex-col items-center gap-1.5 animate-ping text-white text-xs bg-black/40 rounded-full p-4">
            <RotateCcw className="w-6 h-6 text-white" />
            <span>-10s</span>
          </div>
        )}
        {touchFeedback === 'forward' && (
          <div className="absolute right-[15%] top-1/2 -translate-y-1/2 z-50 pointer-events-none flex flex-col items-center gap-1.5 animate-ping text-white text-xs bg-black/40 rounded-full p-4">
            <SkipForward className="w-6 h-6 text-white" />
            <span>+10s</span>
          </div>
        )}

        {/* Custom Controls Bar Container overlay — hidden for iframe sources (they have built-in controls) */}
        {showControls && !isIframeSource && !isFloating && (
          <div
            className={`absolute bottom-4 left-4 right-4 z-40 bg-[#05050A]/70 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex flex-col gap-3 transition-all duration-300 shadow-2xl ${
              showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
            }`}
          >
            {/* Progress Bar and Scrubber */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-text-secondary select-none">
                {formatTime(currentTime)}
              </span>
              <div className="flex-grow">
                <SeekBar />
              </div>
              <span className="text-xs font-mono text-text-secondary select-none">
                {formatTime(duration)}
              </span>
            </div>

            {/* Controls Bar Row */}
            <div className="flex items-center justify-between">
              {/* Left Actions (Play, Skip, Next/Prev) */}
              <div className="flex items-center gap-4">
                <button
                  onClick={togglePlay}
                  className="text-text-secondary hover:text-white transition-colors"
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                </button>

                <button
                  onClick={() => {
                    const video = videoRef.current;
                    if (video) video.currentTime = Math.max(video.currentTime - 10, 0);
                  }}
                  className="text-text-secondary hover:text-white transition-colors"
                  aria-label="Rewind 10 seconds"
                >
                  <RotateCcw size={16} aria-hidden="true" />
                </button>

                {(onPrevEpisode || episodeNumber > 1) && (
                  <button
                    onClick={handlePrev}
                    className="text-text-secondary hover:text-white transition-colors"
                    aria-label="Previous Episode"
                  >
                    <SkipBack size={18} />
                  </button>
                )}

                {(onNextEpisode || (totalEpisodes && episodeNumber < totalEpisodes)) && (
                  <button
                    onClick={handleNext}
                    className="text-text-secondary hover:text-white transition-colors"
                    aria-label="Next Episode"
                  >
                    <SkipForward size={18} />
                  </button>
                )}

                <button
                  onClick={() => {
                    const video = videoRef.current;
                    if (video) video.currentTime = Math.min(video.currentTime + 10, video.duration);
                  }}
                  className="text-text-secondary hover:text-white transition-colors"
                  aria-label="Skip forward 10 seconds"
                >
                  <SkipForward size={16} aria-hidden="true" />
                </button>

                <div className="hidden sm:flex flex-col gap-0 min-w-0">
                  <span className="text-[11px] font-black text-white tracking-wide truncate leading-tight">
                    {animeTitle}
                  </span>
                  <span className="text-[9px] font-semibold text-white/50 tracking-wider truncate leading-tight">
                    Episode {episodeNumber} · {currentQuality} · {currentLanguage.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Right Actions */}
              <div className="flex items-center gap-4 relative">
                
                {/* Keyboard Shortcuts Help */}
                <button
                  onClick={() => setShowShortcutsHelp(!showShortcutsHelp)}
                  className="text-text-secondary hover:text-white transition-colors"
                  aria-label="Keyboard shortcuts"
                >
                  <HelpCircle size={17} aria-hidden="true" />
                </button>

                {/* Chapters Dropdown Button */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setShowChapters(!showChapters);
                      setShowSettings(false);
                      setShowBookmarksPanel(false);
                    }}
                    className={`text-text-secondary hover:text-white transition-colors ${showChapters ? 'text-accent-violet' : ''}`}
                    title="Chapters"
                    aria-label="Chapters"
                  >
                    <List size={18} />
                  </button>

                  {showChapters && (
                    <ChaptersMenu
                      onClose={() => setShowChapters(false)}
                    />
                  )}
                </div>

                {/* Bookmarks Toggle Button */}
                <button
                  onClick={() => setShowBookmarksPanel(!showBookmarksPanel)}
                  className={`text-text-secondary hover:text-white transition-colors ${showBookmarksPanel ? 'text-accent-violet' : ''}`}
                  title="Bookmarks"
                  aria-label="Bookmarks"
                >
                  <Bookmark size={18} fill={showBookmarksPanel ? 'currentColor' : 'none'} />
                </button>

                {/* Cast Button */}
                {castCapabilities.available && (
                  <button
                    onClick={castState === 'connected' ? stopCast : startCast}
                    className={`transition-colors ${
                      castState === 'connected' ? 'text-accent-violet' :
                      castState === 'connecting' ? 'text-accent-violet animate-pulse' :
                      'text-text-secondary hover:text-white'
                    }`}
                    title={castState === 'connected' ? 'Stop casting' : 'Cast to device'}
                    aria-label={castState === 'connected' ? 'Stop casting' : 'Cast to device'}
                  >
                    <MonitorUp size={18} />
                  </button>
                )}

                {/* Settings Dropdown Button */}
                <div className="relative">
                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="text-text-secondary hover:text-white transition-colors"
                    aria-label="Settings"
                  >
                    <Settings size={18} />
                  </button>

                  {/* Settings Panel */}
                  {showSettings && (
                    <PlayerSettings
                      levels={qualityLevels}
                      currentLevel={currentQuality}
                      onSelectQuality={selectQuality}
                      currentLanguage={currentLanguage}
                      onSelectLanguage={selectLanguage}
                      hasSub={subSourcesList.length > 0}
                      hasDub={dubSourcesList.length > 0}
                      hasHindi={hindiSourcesList.length > 0 || hasNativeHindi}
                      hasTamil={tamilSourcesList.length > 0}
                      hasTelugu={teluguSourcesList.length > 0}
                      subtitles={subtitleTracks}
                      activeSubtitleIdx={activeSubtitleIdx}
                      onSelectSubtitle={selectSubtitle}
                      capabilities={subtitleCapabilities}
                      subtitlesVisible={preferences.subtitlesVisible}
                      onToggleVisibility={() => setDevicePreference('subtitlesVisible', !preferences.subtitlesVisible)}
                      subtitleStyle={preferences.subtitleStyle}
                      onChangeSubtitleStyle={(newStyle) => setDevicePreference('subtitleStyle', newStyle)}
                      subtitleDelayOffset={preferences.subtitleDelayOffset}
                      onChangeSubtitleDelay={(newDelay) => setDevicePreference('subtitleDelayOffset', newDelay)}
                      playbackSpeed={playbackSpeed}
                      onChangeSpeed={changeSpeed}
                      isAutoplayNext={preferences.autoNext}
                      onToggleAutoplay={() => setSyncedPreference('autoNext', !preferences.autoNext)}
                      autoSkipIntro={preferences.autoSkipOP}
                      onToggleAutoSkipIntro={() => setSyncedPreference('autoSkipOP', !preferences.autoSkipOP)}
                      autoSkipOutro={preferences.autoSkipED}
                      onToggleAutoSkipOutro={() => setSyncedPreference('autoSkipED', !preferences.autoSkipED)}
                      autoplayCountdown={5}
                      onSelectCountdown={() => {}}
                      providers={providersList}
                      currentProvider={currentProviderName}
                      onSelectProvider={selectProvider}
                      onClose={() => setShowSettings(false)}
                    />
                  )}
                </div>

                {/* Volume Scrubber */}
                <div className="flex items-center gap-1.5 group/volume">
                  <button
                    onClick={toggleMute}
                    className="text-text-secondary hover:text-white transition-colors"
                    aria-label={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-0 group-hover/volume:w-16 focus:w-16 h-1.5 rounded-lg appearance-none cursor-pointer bg-white/20 focus:outline-none transition-all duration-300"
                    style={{
                      accentColor: 'var(--player-accent)',
                      background: `linear-gradient(to right, var(--player-accent) 0%, var(--player-accent) ${
                        isMuted ? 0 : volume * 100
                      }%, rgba(255, 255, 255, 0.2) ${
                        isMuted ? 0 : volume * 100
                      }%, rgba(255, 255, 255, 0.2) 100%)`,
                    }}
                  />
                </div>

                {/* Picture-in-Picture Button */}
                {isPiPSupported && (
                  <button
                    onClick={togglePiP}
                    className="text-text-secondary hover:text-white transition-colors"
                    aria-label="Picture-in-Picture"
                  >
                    <Tv size={17} aria-hidden="true" />
                  </button>
                )}

                {/* Theater Mode Button */}
                <button
                  onClick={toggleTheaterMode}
                  className="text-text-secondary hover:text-white transition-colors"
                  title={isTheaterMode ? 'Exit Theater Mode' : 'Theater Mode'}
                  aria-label={isTheaterMode ? 'Exit Theater Mode' : 'Theater Mode'}
                >
                  {isTheaterMode ? <Shrink size={17} /> : <Expand size={17} />}
                </button>

                {/* Fullscreen Button */}
                <button
                  onClick={toggleFullscreen}
                  className="text-text-secondary hover:text-white transition-colors"
                  aria-label={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                >
                  {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Floating Mini-player Controls overlay */}
        {showControls && !isIframeSource && isFloating && (
          <div className="absolute inset-0 bg-black/50 z-40 flex flex-col justify-between p-2.5 opacity-0 hover:opacity-100 transition-opacity duration-200">
            {/* Top row: Restore and Close */}
            <div className="flex justify-between items-center w-full">
              <button
                onClick={restoreInline}
                className="text-white/80 hover:text-white p-1 rounded bg-black/40 hover:bg-black/60 transition-colors cursor-pointer"
                title="Restore inline"
              >
                <Maximize2 size={15} />
              </button>
              <button
                onClick={() => {
                  setIsFloatingClosed(true);
                  if (isPlaying) {
                    const video = videoRef.current;
                    if (video) video.pause();
                    setIsPlaying(false);
                  }
                }}
                className="text-white/80 hover:text-white p-1 rounded bg-black/40 hover:bg-black/60 transition-colors cursor-pointer"
                title="Close"
              >
                <X size={15} />
              </button>
            </div>

            {/* Center Play/Pause */}
            <button
              onClick={togglePlay}
              className="self-center text-white p-3 rounded-full bg-black/60 border border-white/10 hover:bg-black/80 hover:scale-105 transition-all duration-200 cursor-pointer"
            >
              {isPlaying ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" />}
            </button>

            {/* Bottom Progress Bar */}
            <div className="w-full flex items-center gap-2">
              <span className="text-[10px] font-mono text-text-secondary select-none">
                {formatTime(currentTime)}
              </span>
              <div className="flex-grow h-1.5 bg-white/20 rounded overflow-hidden relative">
                <div
                  className="absolute top-0 bottom-0 left-0 bg-accent-violet"
                  style={{ width: `${(currentTime / duration) * 100}%` }}
                />
              </div>
              <span className="text-[10px] font-mono text-text-secondary select-none">
                {formatTime(duration)}
              </span>
            </div>
          </div>
        )}

        {/* Fallback Test Stream Banner */}
        {isFallback && (
          <div className="absolute top-0 left-0 right-0 z-[55] bg-amber-600/90 backdrop-blur-sm text-white text-center py-1.5 px-4 text-xs font-bold tracking-wide">
            ⚠ Fallback Test Stream — Real anime sources could not be resolved
          </div>
        )}

        {/* Stream Debug Panel */}
        <StreamDebugPanel
          debugInfo={{
            activeProvider: currentProviderName,
            streamUrl: activeSource?.url || '',
            sourceType: activeSource?.isM3U8 ? 'HLS' : 'MP4',
            isFallback,
            fallbackReason,
            subtitleCount: subtitleTracks.length,
            subtitleLangs: subtitleTracks.map((t) => t.lang),
            qualityLevels,
            currentQuality,
            audioLanguage: currentLanguage,
            providers: providersList,
            // Advanced Diagnostics
            resolvedSourcesCount: activeSources.length,
            animeId,
            episodeNumber,
            providerSlug: initialProviderSlug,
            matchedTitle: initialMatchedTitle,
            matchedSlug: initialMatchedSlug,
            searchCount: initialSearchCount,
            episodeCountFound: initialEpisodeCountFound,
            lastError: isFallback ? fallbackReason : undefined,
          }}
        />

        {/* Keyboard Shortcuts Overlay Modal */}
        {showShortcutsHelp && (
          <ShortcutsOverlay onClose={() => setShowShortcutsHelp(false)} />
        )}

        {/* Bookmarks Side Panel */}
        {showBookmarksPanel && (
          <BookmarksPanel
            bookmarks={bookmarks}
            currentTime={currentTime}
            onSeek={(t) => {
              const video = videoRef.current;
              if (video) {
                video.currentTime = t;
                setCurrentTime(t);
              }
            }}
            onAddBookmark={onAddBookmark || (async () => {})}
            onDeleteBookmark={onDeleteBookmark || (async () => {})}
            onUpdateNote={onUpdateBookmarkNote || (async () => {})}
            onClose={() => setShowBookmarksPanel(false)}
          />
        )}
      </div>

      {/* Custom Inline Language & Server Selectors */}
      {!isFullscreen && (
        <div className="w-full bg-[#05050A]/70 backdrop-blur-md border border-white/10 rounded-2xl p-5 space-y-4 shadow-2xl">
          {/* Language Selector Row */}
          <div className="flex flex-col sm:flex-row sm:items-start md:items-center gap-3">
            <div className="flex items-center gap-2 text-white/80 font-bold text-xs uppercase tracking-wider min-w-[120px] select-none py-1.5">
              <Globe className="w-4 h-4 text-accent-violet" style={{ color: 'var(--player-accent)' }} />
              <span>Languages</span>
            </div>
            <div className="lang-toggle">
              {(
                [
                  { key: 'hindi', label: 'HINDI', available: hindiSourcesList.length > 0 || hasNativeHindi },
                  { key: 'sub', label: 'SUB', available: subSourcesList.length > 0 },
                  { key: 'dub', label: 'DUB', available: dubSourcesList.length > 0 },
                  { key: 'tamil', label: 'TAMIL', available: tamilSourcesList.length > 0 },
                  { key: 'telugu', label: 'TELUGU', available: teluguSourcesList.length > 0 },
                ] as const
              ).map((lang) => {
                const isActive = currentLanguage === lang.key;
                return (
                  <button
                    key={lang.key}
                    disabled={!lang.available}
                    onClick={() => selectLanguage(lang.key)}
                    className={`lang-toggle-btn ${isActive ? 'active' : ''} ${!lang.available ? 'opacity-40 cursor-not-allowed' : ''}`}
                    style={isActive ? { backgroundColor: 'var(--player-accent)' } : undefined}
                  >
                    <span>{lang.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-white/5 w-full" />

          {/* Servers / Providers Selector Row */}
          <div className="flex flex-col sm:flex-row sm:items-start md:items-center gap-3">
            <div className="flex items-center gap-2 text-white/80 font-bold text-xs uppercase tracking-wider min-w-[120px] select-none py-1.5">
              <Server className="w-4 h-4 text-accent-violet" style={{ color: 'var(--player-accent)' }} />
              <span>Servers</span>
            </div>
            <div className="server-row flex-grow">
              {providersList
                .filter(prov => prov !== '__drawer__')  /* strip UI sentinel */
                .map((prov) => {
                const isActive = currentProviderName === prov;
                const friendlyName = getProviderFriendlyName(prov);
                return (
                  <button
                    key={prov}
                    data-provider={prov}
                    onClick={() => selectProvider(prov)}
                    className={`server-btn ${isActive ? 'active' : ''}`}
                    style={isActive ? { backgroundColor: 'var(--player-accent)', borderColor: 'var(--player-accent)' } : undefined}
                  >
                    <span className="server-dot" />
                    <span>{friendlyName}</span>
                    {prov === 'toonworld' && (
                      <>
                        <span className="server-lang-badge multi">MULTI</span>
                        <span className="server-lang-badge hindi">HINDI</span>
                      </>
                    )}
                    {prov === 'anibd' && (
                      <span className="server-lang-badge" style={{ background: '#7c3aed', color: '#fff' }}>BD</span>
                    )}
                    {prov === 'animotvslash' && (
                      <span className="server-lang-badge hindi">HINDI</span>
                    )}
                    {prov === 'allmanga' && (
                      <span className="server-lang-badge multi">MULTI</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  </PlayerProvider>
);
}
