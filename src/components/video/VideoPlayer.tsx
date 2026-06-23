'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize, RotateCcw,
  SkipForward, SkipBack, Settings, Subtitles, Loader2, PlayCircle, HelpCircle, Tv, Globe, Server,
  Expand, Shrink, Bookmark
} from 'lucide-react';
import { progressService } from '@/lib/streaming/progress';
import { LOCAL_SKIP_TIMES } from '@/lib/streaming/skiptimes';
import PlayerError from './PlayerError';
import PlayerSettings from './PlayerSettings';
import ShortcutsOverlay from './ShortcutsOverlay';
import StreamDebugPanel from './StreamDebugPanel';
import BookmarksPanel from './BookmarksPanel';
import { useRouter } from '@/navigation';

interface EpisodeSource {
  url: string;
  quality: '1080p' | '720p' | '480p' | '360p' | 'auto' | 'default';
  isM3U8: boolean;
  lang?: string;
}

interface SubtitleTrack {
  label: string;
  lang: string;
  url: string;
}

interface SkipInterval {
  startTime: number;
  endTime: number;
  type: 'op' | 'ed' | 'recap';
}

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
    case 'toonplay': return 'ToonPlay';
    case 'toonworld': return 'ToonWorld';
    case 'vidnest': return 'VidNest';
    case 'desidubanime': return 'Hindi Dub';
    case 'piratexplay': return 'PirateX';
    case 'tryembed': return 'TryEmbed';
    case 'animeplay': return 'AnimePlay';
    case 'consumet': return 'Multilingual 1';
    case 'animepahe': return 'Multilingual 2';
    default: return name.charAt(0).toUpperCase() + name.slice(1);
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

  const handlePrev = onPrevEpisode || (() => {
    if (episodeNumber > 1) {
      router.push(`/watch/${animeId}/${episodeNumber - 1}`);
    }
  });

  const handleNext = onNextEpisode || (() => {
    if (totalEpisodes && episodeNumber < totalEpisodes) {
      router.push(`/watch/${animeId}/${episodeNumber + 1}`);
    }
  });

  // Dynamic Provider & Audio Language States
  const [subSourcesList, setSubSourcesList] = useState<EpisodeSource[]>(subSources.length > 0 ? subSources : sources);
  const [dubSourcesList, setDubSourcesList] = useState<EpisodeSource[]>(dubSources);
  const [hindiSourcesList, setHindiSourcesList] = useState<EpisodeSource[]>(hindiSources);
  const [tamilSourcesList, setTamilSourcesList] = useState<EpisodeSource[]>(tamilSources);
  const [teluguSourcesList, setTeluguSourcesList] = useState<EpisodeSource[]>(teluguSources);
  const [subtitleTracks, setSubtitleTracks] = useState<SubtitleTrack[]>(subtitles);
  const [providersList, setProvidersList] = useState<string[]>(providers.length > 0 ? providers : ['mock']);
  const [currentProviderName, setCurrentProviderName] = useState<string>(currentProvider);
  const [currentLanguage, setCurrentLanguage] = useState<'sub' | 'dub' | 'hindi' | 'tamil' | 'telugu'>(() => {
    // 1. Dynamic server-side/first render fallback
    const hindiCount = (hindiSources && hindiSources.length) || 0;
    const subCount = (subSources && subSources.length) || (sources && sources.length) || 0;
    const dubCount = (dubSources && dubSources.length) || 0;
    const tamilCount = (tamilSources && tamilSources.length) || 0;
    const teluguCount = (teluguSources && teluguSources.length) || 0;

    // 2. Default priorities: Hindi -> Japanese (SUB) -> English (DUB) -> Tamil -> Telugu
    if (hindiCount > 0) return 'hindi';
    if (subCount > 0) return 'sub';
    if (dubCount > 0) return 'dub';
    if (tamilCount > 0) return 'tamil';
    if (teluguCount > 0) return 'telugu';
    return 'sub';
  });
  const [isFallbackActive, setIsFallbackActive] = useState<boolean>(isFallback);
  const [fallbackReasonText, setFallbackReasonText] = useState<string | undefined>(fallbackReason);
  const [hasNativeHindi, setHasNativeHindi] = useState(false);

  const [matchedTitle, setMatchedTitle] = useState<string | undefined>(initialMatchedTitle);
  const [matchedSlug, setMatchedSlug] = useState<string | undefined>(initialMatchedSlug);
  const [searchCount, setSearchCount] = useState<number | undefined>(initialSearchCount);
  const [episodeCountFound, setEpisodeCountFound] = useState<number | undefined>(initialEpisodeCountFound);
  const [providerSlug, setProviderSlug] = useState<string | undefined>(initialProviderSlug);

  // Player States
  const [isPlaying, setIsPlaying] = useState(false);

  // Sync media session playback state
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    }
  }, [isPlaying]);
  const [currentTime, setCurrentTime] = useState(initialPosition);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [activeSourceIdx, setActiveSourceIdx] = useState(0);
  const [activeSubtitleIdx, setActiveSubtitleIdx] = useState(-1); // -1 = off
  const [isAutoplayNext, setIsAutoplayNext] = useState(true);
  const [isAutoSkipGlobal, setIsAutoSkipGlobal] = useState(false);
  const [isAutoSkipLocal, setIsAutoSkipLocal] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Settings & Overlays
  const [showSettings, setShowSettings] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const countdownIntervalRef = useRef<any>(null);
  const hasPreloadedRef = useRef(false);

  // Skip Intro / Ending Detection States
  const [showSkipIntro, setShowSkipIntro] = useState(false);
  const [showSkipEnding, setShowSkipEnding] = useState(false);
  const [showSkipRecap, setShowSkipRecap] = useState(false);
  const [autoSkipIntro, setAutoSkipIntro] = useState(false);
  const [autoSkipOutro, setAutoSkipOutro] = useState(false);

  // Autoplay countdown configuration state
  const [autoplayCountdown, setAutoplayCountdown] = useState(5);
  const [showCaughtUp, setShowCaughtUp] = useState(false);

  // In-player resume states
  const [showResumePromptState, setShowResumePromptState] = useState(false);
  const [resumeTime, setResumeTime] = useState<number>(0);

  // Bookmarks side panel state
  const [showBookmarksPanel, setShowBookmarksPanel] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Mobile Swipe / Gesture States
  const [touchFeedback, setTouchFeedback] = useState<'back' | 'forward' | null>(null);
  const [isLongPressing2x, setIsLongPressing2x] = useState(false);
  const [showVolumeIndicator, setShowVolumeIndicator] = useState(false);
  const [gestureVolume, setGestureVolume] = useState(1);
  const lastTapRef = useRef<{ time: number; x: number }>({ time: 0, x: 0 });
  const touchStartRef = useRef<{ x: number; y: number; time: number; volume: number }>({ x: 0, y: 0, time: 0, volume: 1 });
  const longPressTimeoutRef = useRef<any>(null);

  // Phase 3 Premium States
  const [showControls, setShowControls] = useState(true);
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [skipIntervals, setSkipIntervals] = useState<SkipInterval[]>([]);
  const [accentColor, setAccentColor] = useState('hsl(250, 100%, 60%)');
  const [accentH, setAccentH] = useState(250);
  const [accentS, setAccentS] = useState('100%');
  const [accentL, setAccentL] = useState('60%');
  const [isPiPSupported, setIsPiPSupported] = useState(false);
  const controlsTimeoutRef = useRef<any>(null);

  // Theater mode toggle
  const toggleTheaterMode = () => {
    const next = !isTheaterMode;
    setIsTheaterMode(next);
    onTheaterModeChange?.(next);
  };

  // Inactivity Controls Fade Helper
  const resetControlsTimeout = () => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    setShowControls(true);
    if (isPlaying && !showSettings && !showShortcutsHelp) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 2000);
    }
  };

  useEffect(() => {
    resetControlsTimeout();
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [isPlaying, showSettings, showShortcutsHelp]);

  const handleMouseMove = () => {
    resetControlsTimeout();
  };

  const handleMouseLeave = () => {
    if (isPlaying && !showSettings && !showShortcutsHelp) {
      setShowControls(false);
    }
  };

  // Client-Side Canvas Accent Color Extraction
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
                if (maxVal - minVal > 20) { // filter colorful ones
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
            let h = 0, s = 0, l = (max + min) / 2;

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

            // Keep it vibrant and sufficiently bright on dark background
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

  // Fetch skip time configurations from local overrides or AniSkip
  useEffect(() => {
    const fetchSkipTimes = async () => {
      // 1. Check local overrides database first
      const localOverride = LOCAL_SKIP_TIMES[animeId];
      if (localOverride) {
        const intervals: SkipInterval[] = [];
        intervals.push({
          startTime: localOverride.introStart,
          endTime: localOverride.introEnd,
          type: 'op',
        });
        if (localOverride.outroStart !== undefined && localOverride.outroEnd !== undefined) {
          intervals.push({
            startTime: localOverride.outroStart,
            endTime: localOverride.outroEnd,
            type: 'ed',
          });
        }
        if (localOverride.recapStart !== undefined && localOverride.recapEnd !== undefined) {
          intervals.push({
            startTime: localOverride.recapStart,
            endTime: localOverride.recapEnd,
            type: 'recap',
          });
        }
        setSkipIntervals(intervals);
        return;
      }

      // 2. Fall back to AniSkip API only if animeId is a numeric MAL ID
      const numericId = parseInt(animeId, 10);
      if (isNaN(numericId)) {
        setSkipIntervals([]);
        return;
      }

      try {
        const res = await fetch(`https://api.aniskip.com/v2/skip-times/${numericId}/${episodeNumber}?types[]=op&types[]=ed&types[]=recap`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.found && data.results) {
          const intervals = data.results.map((r: any) => ({
            startTime: r.interval?.startTime || 0,
            endTime: r.interval?.endTime || 0,
            type: r.skipType === 'recap' ? 'recap' : (r.skipType === 'op' ? 'op' : 'ed'),
          }));
          setSkipIntervals(intervals);
        } else {
          setSkipIntervals([]);
        }
      } catch {
        setSkipIntervals([]);
      }
    };
    fetchSkipTimes();
  }, [animeId, episodeNumber]);

  // Reset preloaded status on episode or anime change
  useEffect(() => {
    hasPreloadedRef.current = false;
  }, [animeId, episodeNumber]);

  // Check Picture-in-Picture support
  useEffect(() => {
    if (typeof document !== 'undefined') {
      setIsPiPSupported(
        document.pictureInPictureEnabled ||
        (videoRef.current && (videoRef.current as any).webkitSupportsPresentationMode && typeof (videoRef.current as any).webkitSetPresentationMode === 'function')
      );
    }
  }, []);

  // ─── Media Session API ──────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: `Episode ${episodeNumber}`,
      artist: animeTitle,
      album: animeTitle,
      artwork: animeImage
        ? [
            { src: animeImage, sizes: '512x512', type: 'image/jpeg' },
          ]
        : [],
    });

    navigator.mediaSession.setActionHandler('play', () => {
      videoRef.current?.play().catch(() => {});
      setIsPlaying(true);
    });
    navigator.mediaSession.setActionHandler('pause', () => {
      videoRef.current?.pause();
      setIsPlaying(false);
    });
    navigator.mediaSession.setActionHandler('seekforward', () => {
      if (videoRef.current) {
        videoRef.current.currentTime = Math.min(videoRef.current.currentTime + 10, videoRef.current.duration);
      }
    });
    navigator.mediaSession.setActionHandler('seekbackward', () => {
      if (videoRef.current) {
        videoRef.current.currentTime = Math.max(videoRef.current.currentTime - 10, 0);
      }
    });
    navigator.mediaSession.setActionHandler('nexttrack', () => handleNext());
    navigator.mediaSession.setActionHandler('previoustrack', () => handlePrev());

    return () => {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
        navigator.mediaSession.setActionHandler('seekforward', null);
        navigator.mediaSession.setActionHandler('seekbackward', null);
        navigator.mediaSession.setActionHandler('nexttrack', null);
        navigator.mediaSession.setActionHandler('previoustrack', null);
      }
    };
  }, [animeTitle, animeImage, episodeNumber]);

  const togglePiP = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await video.requestPictureInPicture();
      }
    } catch {}
  };

  // Automatically enable subtitles on SUB audio and disable on DUB audio
  useEffect(() => {
    if (currentLanguage === 'sub') {
      if (subtitleTracks.length > 0) {
        const engIdx = subtitleTracks.findIndex(
          (t) =>
            t.lang.toLowerCase() === 'en' ||
            t.label.toLowerCase().includes('eng')
        );
        if (engIdx > -1) {
          setActiveSubtitleIdx(engIdx);
        } else {
          setActiveSubtitleIdx(0);
        }
      }
    } else {
      setActiveSubtitleIdx(-1);
    }
  }, [currentLanguage, subtitleTracks]);

  // HLS level detection
  const [qualityLevels, setQualityLevels] = useState<string[]>(['Auto']);
  const [currentQuality, setCurrentQuality] = useState('Auto');
  const hlsRef = useRef<any>(null);

  // Refs to preserve fresh values inside HLS loadedmetadata callback (avoids stale closures)
  const currentTimeRef = useRef(initialPosition);
  const playbackSpeedRef = useRef(1);
  const volumeRef = useRef(1);
  const isMutedRef = useRef(false);
  const activeSubtitleIdxRef = useRef(-1);
  const isPlayingRef = useRef(false);

  // Sync prop changes
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
    if (matchedTitle !== initialMatchedTitle) setMatchedTitle(initialMatchedTitle);
    if (matchedSlug !== initialMatchedSlug) setMatchedSlug(initialMatchedSlug);
    if (searchCount !== initialSearchCount) setSearchCount(initialSearchCount);
    if (episodeCountFound !== initialEpisodeCountFound) setEpisodeCountFound(initialEpisodeCountFound);
    if (providerSlug !== initialProviderSlug) setProviderSlug(initialProviderSlug);
  }, [
    sources, subSources, dubSources, hindiSources, tamilSources, teluguSources, subtitles, providers, currentProvider,
    initialMatchedTitle, initialMatchedSlug, initialSearchCount, initialEpisodeCountFound, initialProviderSlug,
    subSourcesList, dubSourcesList, hindiSourcesList, tamilSourcesList, teluguSourcesList, subtitleTracks, providersList,
    currentProviderName, matchedTitle, matchedSlug, searchCount, episodeCountFound, providerSlug
  ]);

  // Sync refs
  useEffect(() => { currentTimeRef.current = currentTime; }, [currentTime]);
  useEffect(() => { playbackSpeedRef.current = playbackSpeed; }, [playbackSpeed]);
  useEffect(() => { volumeRef.current = volume; }, [volume]);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  useEffect(() => { activeSubtitleIdxRef.current = activeSubtitleIdx; }, [activeSubtitleIdx]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  // Sync activeSubtitleIdx to video.textTracks mode
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const textTracks = video.textTracks;
    
    const syncTracks = () => {
      for (let i = 0; i < textTracks.length; i++) {
        textTracks[i].mode = i === activeSubtitleIdx ? 'showing' : 'disabled';
      }
    };

    // Run sync immediately in case tracks are already there
    syncTracks();

    // Also listen for any new tracks added asynchronously
    textTracks.onaddtrack = () => {
      syncTracks();
    };

    return () => {
      textTracks.onaddtrack = null;
    };
  }, [activeSubtitleIdx, subtitleTracks]);

  // Load preferences from localStorage + DB on mount
  useEffect(() => {
    // 1. First, load from localStorage as immediate synchronous fallback
    const savedAutoplay = localStorage.getItem('animeworld:autoplay_next');
    if (savedAutoplay !== null) {
      setIsAutoplayNext(savedAutoplay === 'true');
    }

    const savedVolume = localStorage.getItem('animeworld:preferredVolume');
    if (savedVolume !== null) {
      const parsedVol = Number(savedVolume);
      if (!isNaN(parsedVol)) {
        setVolume(parsedVol);
      }
    }

    const savedAutoSkipIntro = localStorage.getItem('animeworld:auto_skip_intro');
    if (savedAutoSkipIntro !== null) {
      setAutoSkipIntro(savedAutoSkipIntro === 'true');
    } else {
      const savedAutoSkipGlobal = localStorage.getItem('animeworld:auto_skip_global');
      if (savedAutoSkipGlobal !== null) {
        setAutoSkipIntro(savedAutoSkipGlobal === 'true');
      }
    }

    const savedAutoSkipOutro = localStorage.getItem('animeworld:auto_skip_outro');
    if (savedAutoSkipOutro !== null) {
      setAutoSkipOutro(savedAutoSkipOutro === 'true');
    }

    const savedCountdown = localStorage.getItem('animeworld:autoplay_countdown');
    if (savedCountdown !== null) {
      const parsedCountdown = parseInt(savedCountdown, 10);
      if (!isNaN(parsedCountdown)) setAutoplayCountdown(parsedCountdown);
    }

    const savedReduced = localStorage.getItem('animeworld:reduced_motion');
    if (savedReduced !== null) {
      setReducedMotion(savedReduced === 'true');
    }

    const savedAutoSkipLocal = localStorage.getItem(`animeworld:auto_skip:${animeId}`);
    if (savedAutoSkipLocal !== null) {
      setIsAutoSkipLocal(savedAutoSkipLocal === 'true' ? true : savedAutoSkipLocal === 'false' ? false : null);
    } else {
      setIsAutoSkipLocal(null);
    }
    
    const savedLang = localStorage.getItem('animeworld:preferredLanguage') as any;
    if (savedLang && ['sub', 'dub', 'hindi', 'tamil', 'telugu'].includes(savedLang)) {
      setCurrentLanguage(savedLang);
    }

    const savedSpeed = localStorage.getItem('animeworld:preferredPlaybackSpeed');
    if (savedSpeed !== null) {
      const parsedSpeed = parseFloat(savedSpeed);
      if (!isNaN(parsedSpeed)) setPlaybackSpeed(parsedSpeed);
    }

    const savedQuality = localStorage.getItem('animeworld:preferredQuality');
    if (savedQuality !== null) {
      setCurrentQuality(savedQuality);
    }

    // Restore provider and playback position sequentially
    const savedProvider = localStorage.getItem('animeworld:provider');
    if (savedProvider && savedProvider !== currentProviderName && providersList.includes(savedProvider)) {
      selectProvider(savedProvider);
    }

    // 2. Fetch and overlay preferences from DB
    const loadDbPreferences = async () => {
      try {
        const res = await fetch('/api/user/preferences');
        if (res.ok) {
          const prefs = await res.json();
          if (prefs) {
            setIsAutoplayNext(prefs.autoplayNext);
            setAutoSkipIntro(prefs.autoSkipIntro);
            setAutoSkipOutro(prefs.autoSkipOutro);
            setAutoplayCountdown(prefs.autoplayCountdown);
            if (prefs.preferredLanguage) setCurrentLanguage(prefs.preferredLanguage);
            if (prefs.preferredQuality) setCurrentQuality(prefs.preferredQuality);
            if (prefs.preferredSpeed) setPlaybackSpeed(prefs.preferredSpeed);
            if (prefs.defaultVolume !== undefined) setVolume(prefs.defaultVolume);
            if (prefs.reducedMotion !== undefined) setReducedMotion(prefs.reducedMotion);
            
            // Sync to local storage
            localStorage.setItem('animeworld:autoplay_next', String(prefs.autoplayNext));
            localStorage.setItem('animeworld:auto_skip_intro', String(prefs.autoSkipIntro));
            localStorage.setItem('animeworld:auto_skip_outro', String(prefs.autoSkipOutro));
            localStorage.setItem('animeworld:autoplay_countdown', String(prefs.autoplayCountdown));
            localStorage.setItem('animeworld:preferredLanguage', prefs.preferredLanguage);
            localStorage.setItem('animeworld:preferredQuality', prefs.preferredQuality);
            localStorage.setItem('animeworld:preferredPlaybackSpeed', String(prefs.preferredSpeed));
            localStorage.setItem('animeworld:preferredVolume', String(prefs.defaultVolume));
            localStorage.setItem('animeworld:reduced_motion', String(prefs.reducedMotion));
          }
        }
      } catch (err) {
        console.error('Failed to load DB preferences:', err);
      }
    };
    loadDbPreferences();

    // 3. Playback position handling with Resume Prompt
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
      // Check if we should prompt
      const savedShowPrompt = localStorage.getItem('animeworld:show_resume_prompt') !== 'false';
      if (savedShowPrompt) {
        setResumeTime(savedTime);
        setShowResumePromptState(true);
      } else {
        // Resume silently
        if (videoRef.current) {
          videoRef.current.currentTime = savedTime;
        }
        setCurrentTime(savedTime);
        currentTimeRef.current = savedTime;
      }
    }
  }, [animeId, episodeNumber, initialPosition, providersList]);

  const handleResumeConfirm = () => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = resumeTime;
      video.play().catch(() => {});
      setIsPlaying(true);
    }
    setCurrentTime(resumeTime);
    currentTimeRef.current = resumeTime;
    setShowResumePromptState(false);
  };

  const handleResumeRestart = () => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = 0;
      video.play().catch(() => {});
      setIsPlaying(true);
    }
    setCurrentTime(0);
    currentTimeRef.current = 0;
    setShowResumePromptState(false);
  };

  // Auto-dismiss resume prompt
  useEffect(() => {
    if (!showResumePromptState) return;
    const timer = setTimeout(() => {
      handleResumeConfirm();
    }, 8000);
    return () => clearTimeout(timer);
  }, [showResumePromptState, resumeTime]);

  // Sync state volume to the video element and persist in localStorage + DB
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
    }
    localStorage.setItem('animeworld:preferredVolume', String(volume));
    
    const timer = setTimeout(() => {
      fetch('/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ defaultVolume: volume }),
      }).catch((err) => console.error(err));
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [volume, videoRef.current]);

  // Auto-switch language if the currently selected language is not available on the active provider
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
        console.info(`[Language Auto-Switch] Swapping from unavailable language "${currentLanguage}" to "${fallback}"`);
        setCurrentLanguage(fallback);
      }
    }
  }, [hindiSourcesList, subSourcesList, dubSourcesList, tamilSourcesList, teluguSourcesList, hasNativeHindi, currentLanguage]);

  // Priority language selection when sources change (if no manual preference is set)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const hasUserPref = localStorage.getItem('animeworld:userSetLanguagePreference') === 'true';
    if (hasUserPref) return;

    // Default priority order: Hindi -> Japanese (SUB) -> English (DUB) -> Tamil -> Telugu
    if (hindiSourcesList.length > 0 || hasNativeHindi) {
      if (currentLanguage !== 'hindi') setCurrentLanguage('hindi');
    } else if (subSourcesList.length > 0) {
      if (currentLanguage !== 'sub') setCurrentLanguage('sub');
    } else if (dubSourcesList.length > 0) {
      if (currentLanguage !== 'dub') setCurrentLanguage('dub');
    } else if (tamilSourcesList.length > 0) {
      if (currentLanguage !== 'tamil') setCurrentLanguage('tamil');
    } else if (teluguSourcesList.length > 0) {
      if (currentLanguage !== 'telugu') setCurrentLanguage('telugu');
    }
  }, [hindiSourcesList, subSourcesList, dubSourcesList, tamilSourcesList, teluguSourcesList, hasNativeHindi]);

  const syncHlsAudioTrack = (lang: 'sub' | 'dub' | 'hindi' | 'tamil' | 'telugu', hlsInstance = hlsRef.current) => {
    if (!hlsInstance) return;
    const tracks = hlsInstance.audioTracks;
    if (!tracks || tracks.length <= 1) return;

    let targetIdx = -1;
    if (lang === 'hindi') {
      targetIdx = tracks.findIndex(
        (t: any) =>
          t.lang?.toLowerCase().startsWith('hi') ||
          t.name?.toLowerCase().includes('hindi') ||
          t.name?.toLowerCase().includes('hin')
      );
    } else if (lang === 'tamil') {
      targetIdx = tracks.findIndex(
        (t: any) =>
          t.lang?.toLowerCase().startsWith('ta') ||
          t.name?.toLowerCase().includes('tamil') ||
          t.name?.toLowerCase().includes('tam')
      );
    } else if (lang === 'telugu') {
      targetIdx = tracks.findIndex(
        (t: any) =>
          t.lang?.toLowerCase().startsWith('te') ||
          t.name?.toLowerCase().includes('telugu') ||
          t.name?.toLowerCase().includes('tel')
      );
    } else if (lang === 'dub') {
      targetIdx = tracks.findIndex(
        (t: any) =>
          t.lang?.toLowerCase().startsWith('en') ||
          t.name?.toLowerCase().includes('english') ||
          t.name?.toLowerCase().includes('dub')
      );
    } else if (lang === 'sub') {
      targetIdx = tracks.findIndex(
        (t: any) =>
          t.lang?.toLowerCase().startsWith('ja') ||
          t.name?.toLowerCase().includes('japanese') ||
          t.name?.toLowerCase().includes('sub')
      );
    }

    if (targetIdx > -1) {
      console.info(`[HLS Audio] Switching audio track to index ${targetIdx} (${tracks[targetIdx].name}) for language: ${lang}`);
      hlsInstance.audioTrack = targetIdx;
    } else {
      console.info(`[HLS Audio] No matching audio track found in manifest for language: ${lang}`);
    }
  };

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

  // Trigger loading when iframe source changes
  useEffect(() => {
    if (isIframeSource) {
      setIsLoading(true);
    }
  }, [activeSource?.url, isIframeSource]);

  // Save progress immediately when playing inside an iframe source (as timeupdates do not fire for cross-origin iframes)
  useEffect(() => {
    if (isIframeSource && activeSource) {
      console.info(`[VideoPlayer] Recording iframe watch progress for ep ${episodeNumber}`);
      progressService.updateProgress({
        animeId,
        animeTitle,
        animeImage,
        episode: episodeNumber,
        position: 1,
        duration: 1200, // mock duration (20 minutes)
        force: true,
      });
    }
  }, [animeId, episodeNumber, activeSource, isIframeSource, animeTitle, animeImage]);

  // Iframe Timeout Fallback
  useEffect(() => {
    if (!isLoading || !isIframeSource) return;

    const timeout = setTimeout(() => {
      if (isLoading) {
        setIsLoading(false);
        setToastMessage(`${getProviderFriendlyName(currentProviderName)} load timeout — try another server`);
        
        const buttons = document.querySelectorAll('.server-btn:not(.active)');
        if (buttons[0]) {
          buttons[0].classList.add('pulse-suggest');
          setTimeout(() => buttons[0].classList.remove('pulse-suggest'), 3000);
        }
      }
    }, 10000);

    return () => clearTimeout(timeout);
  }, [isLoading, isIframeSource, currentProviderName]);

  // ─── HLS Load & Failover ───────────────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !activeSource) return;

    setIsLoading(true);
    setErrorMessage(null);

    const handleLoadedMetadata = () => {
      setIsLoading(false);
      setDuration(video.duration);
      
      // Seek to playback position sequentially with end buffer threshold check
      let restoreTime = currentTimeRef.current;
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

      // Re-apply subtitle index
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

            // Populate quality levels from HLS manifest — user-friendly labels only
            const parsedLevels = hls.levels
              .map((l: any) => l.height ? `${l.height}p` : null)
              .filter((l: string | null): l is string => l !== null);
            // Deduplicate and sort descending
            const uniqueLevels = Array.from(new Set<string>(parsedLevels)).sort((a: string, b: string) => parseInt(b) - parseInt(a));
            const levels: string[] = ['Auto', ...uniqueLevels];
            setQualityLevels(levels);

            // Restore previous quality choice
            const preferredQ = localStorage.getItem('preferredQuality') || 'Auto';
            if (preferredQ !== 'Auto') {
              const height = parseInt(preferredQ, 10);
              const idx = hls.levels.findIndex((lvl: any) => lvl.height === height);
              if (idx > -1) {
                hls.currentLevel = idx;
                setCurrentQuality(preferredQ);
              }
            }

            // Detect native multi-audio tracks (HLS AUDIO-GROUP)
            const tracks = hls.audioTracks;
            if (tracks && tracks.length > 1) {
              console.info(`[HLS Audio] Found ${tracks.length} audio tracks in manifest.`);
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

            // Sync the active audio track immediately
            syncHlsAudioTrack(currentLanguage, hls);

            let restoreTime = currentTimeRef.current;
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
              console.warn(`HLS fatal error: ${data.type}`);
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
  }, [activeSourceIdx, activeSource?.url, currentLanguage]);

  // ─── Mid-playback buffering / stall detection ──────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleWaiting = () => setIsLoading(true);
    const handleStalled = () => setIsLoading(true);
    const handlePlaying = () => setIsLoading(false);
    const handleCanPlay = () => setIsLoading(false);

    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('stalled', handleStalled);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('canplay', handleCanPlay);

    return () => {
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('stalled', handleStalled);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('canplay', handleCanPlay);
    };
  }, []);

  const handleSourceError = () => {
    if (activeSourceIdx + 1 < activeSources.length) {
      setActiveSourceIdx((prev) => prev + 1);
    } else {
      setErrorMessage('Failed to load all available stream sources.');
      setIsLoading(false);
    }
  };

  // ─── Time Updates, Preloading & Skips ─────────────────────────────────────
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;

    const t = video.currentTime;
    const dur = video.duration;

    setCurrentTime(t);

    // Save playback position to namespaced localStorage periodically
    if (t > 0) {
      localStorage.setItem(`animeworld:playbackTime:${animeId}:${episodeNumber}`, String(t));
    }

    // Skip Intro / Ending / Recap Detection using exact intervals or defaults
    const opInterval = skipIntervals.find(i => i.type === 'op');
    const edInterval = skipIntervals.find(i => i.type === 'ed');
    const recapInterval = skipIntervals.find(i => i.type === 'recap');

    if (opInterval) {
      setShowSkipIntro(t >= opInterval.startTime && t <= opInterval.endTime);
    } else {
      setShowSkipIntro(t >= 90 && t <= 180);
    }

    if (edInterval) {
      setShowSkipEnding(t >= edInterval.startTime && t <= edInterval.endTime);
    } else {
      setShowSkipEnding(dur > 200 && t >= dur - 90 && t < dur - 10);
    }

    if (recapInterval) {
      setShowSkipRecap(t >= recapInterval.startTime && t <= recapInterval.endTime);
    } else {
      setShowSkipRecap(false);
    }

    // Support Global + Per-Anime Auto Skip Preferences
    const shouldAutoSkipIntro = () => {
      const localPref = localStorage.getItem(`animeworld:auto_skip:${animeId}`);
      if (localPref === 'true') return true;
      if (localPref === 'false') return false;
      return autoSkipIntro;
    };

    const shouldAutoSkipOutro = () => {
      return autoSkipOutro;
    };

    const shouldAutoSkipRecap = () => {
      return autoSkipIntro;
    };

    if (opInterval && t >= opInterval.startTime && t < opInterval.endTime - 0.5) {
      if (shouldAutoSkipIntro()) {
        video.currentTime = opInterval.endTime;
        setToastMessage('Auto-skipped opening theme');
      }
    }
    if (edInterval && t >= edInterval.startTime && t < edInterval.endTime - 0.5) {
      if (shouldAutoSkipOutro()) {
        video.currentTime = edInterval.endTime;
        setToastMessage('Auto-skipped ending theme');
      }
    }
    if (recapInterval && t >= recapInterval.startTime && t < recapInterval.endTime - 0.5) {
      if (shouldAutoSkipRecap()) {
        video.currentTime = recapInterval.endTime;
        setToastMessage('Auto-skipped recap');
      }
    }

    // Preload next episode when progress > 80% and remaining time < 5 min (300 seconds)
    const nextEp = episodeNumber + 1;
    if (totalEpisodes && nextEp <= totalEpisodes && dur > 0) {
      const progressRatio = t / dur;
      const remainingTime = dur - t;
      if (progressRatio > 0.80 && remainingTime < 300 && !hasPreloadedRef.current) {
        console.info(`[PRELOAD] Pre-fetching Episode ${nextEp} stream details...`);
        hasPreloadedRef.current = true;
        fetch(`/api/stream/source?animeId=${animeId}&episode=${nextEp}&title=${encodeURIComponent(animeTitle)}`)
          .then((res) => res.json())
          .then((data) => {
            console.info(`[PRELOAD] Cache primed for Episode ${nextEp}`);
          })
          .catch((err) => {
            console.warn(`[PRELOAD] Pre-fetch failed for Episode ${nextEp}:`, err);
            hasPreloadedRef.current = false;
          });
      }
    }

    progressService.updateProgress({
      animeId,
      animeTitle,
      animeImage,
      episode: episodeNumber,
      position: t,
      duration: dur,
      totalEpisodes,
    });

    // Sync Media Session playback position
    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator && dur > 0) {
      try {
        navigator.mediaSession.setPositionState({
          duration: dur,
          playbackRate: videoRef.current?.playbackRate || 1,
          position: t,
        });
      } catch {}
    }
  };



  // Autoplay Countdown handling
  const handleVideoEnded = () => {
    setIsPlaying(false);
    const video = videoRef.current;
    if (video) {
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
    }

    const isLastEpisode = totalEpisodes && episodeNumber === totalEpisodes;
    if (isLastEpisode) {
      setShowCaughtUp(true);
    } else if (isAutoplayNext && totalEpisodes && episodeNumber < totalEpisodes) {
      setCountdown(autoplayCountdown);
    }
  };

  useEffect(() => {
    if (countdown === null) {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      return;
    }

    if (countdown === 0) {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      setCountdown(null);
      handleNext();
      return;
    }

    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearInterval(countdownIntervalRef.current);
  }, [countdown]);

  // ─── Actions & Swaps ───────────────────────────────────────────────────────
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video || isLoading) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
      progressService.updateProgress({
        animeId,
        animeTitle,
        animeImage,
        episode: episodeNumber,
        position: video.currentTime,
        duration: video.duration,
        totalEpisodes,
        force: true,
      });
    } else {
      video.play().catch(() => {});
      setIsPlaying(true);
      setCountdown(null); // Cancel auto-next countdown if playing again
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const newTime = Number(e.target.value);
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    const nextMute = !isMuted;
    video.muted = nextMute;
    setIsMuted(nextMute);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const newVol = Number(e.target.value);
    video.volume = newVol;
    setVolume(newVol);
    if (newVol > 0 && isMuted) {
      video.muted = false;
      setIsMuted(false);
    }
  };

  const toggleFullscreen = () => {
    const player = playerRef.current;
    if (!player) return;

    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    } else {
      player.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const changeSpeed = (speed: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = speed;
    setPlaybackSpeed(speed);
    localStorage.setItem('animeworld:preferredPlaybackSpeed', String(speed));
    fetch('/api/user/preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preferredSpeed: speed }),
    }).catch((err) => console.error(err));
  };

  const selectQuality = (level: string) => {
    setCurrentQuality(level);
    localStorage.setItem('animeworld:preferredQuality', level);
    fetch('/api/user/preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preferredQuality: level }),
    }).catch((err) => console.error(err));

    if (hlsRef.current) {
      if (level === 'Auto') {
        hlsRef.current.currentLevel = -1;
      } else {
        const height = parseInt(level, 10);
        const idx = hlsRef.current.levels.findIndex((l: any) => l.height === height);
        if (idx > -1) {
          hlsRef.current.currentLevel = idx;
        }
      }
    } else {
      const idx = activeSources.findIndex((s) => s.quality === level);
      if (idx > -1) setActiveSourceIdx(idx);
    }
  };

  const selectLanguage = async (lang: 'sub' | 'dub' | 'hindi' | 'tamil' | 'telugu') => {
    setCurrentLanguage(lang);
    localStorage.setItem('animeworld:preferredLanguage', lang);
    localStorage.setItem('animeworld:language', lang);
    localStorage.setItem('animeworld:userSetLanguagePreference', 'true');
    fetch('/api/user/preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preferredLanguage: lang }),
    }).catch((err) => console.error(err));

    if (lang === 'hindi') {
      if (providersList.includes('desidubanime') && currentProviderName !== 'desidubanime') {
        selectProvider('desidubanime');
        setToastMessage('Switched to Hindi Dub server');
        return;
      }
    }

    if (lang === 'dub') {
      const dubServers = ['tryembed', 'animeplay', 'toonplay', 'toonworld'];
      const available = dubServers.find(s => providersList.includes(s));
      if (available && available !== currentProviderName) {
        selectProvider(available);
        return;
      }
    }
    
    const targetSources = lang === 'hindi' 
      ? hindiSourcesList 
      : lang === 'tamil'
        ? tamilSourcesList
        : lang === 'telugu'
          ? teluguSourcesList
          : lang === 'dub' 
            ? dubSourcesList 
            : subSourcesList;

    if (targetSources && targetSources.length > 0) {
      console.info(`[Audio Swap] Switching stream sources for language: ${lang}`);
      setActiveSourceIdx(0);
    } else {
      // Current provider doesn't have the selected language audio.
      // Probing all other providers in parallel to resolve capability.
      console.info(`[Audio Swap] Current provider doesn't support ${lang}. Probing alternative providers in parallel...`);
      setIsLoading(true);

      const fetchPromises = providersList
        .filter(prov => prov !== currentProviderName)
        .map(async (prov) => {
          try {
            const res = await fetch(`/api/stream/source?animeId=${animeId}&episode=${episodeNumber}&provider=${prov}&title=${encodeURIComponent(animeTitle)}&lang=${lang}`);
            if (res.ok) {
              const data = await res.json();
              const alternateSources = lang === 'hindi'
                ? data.hindi
                : lang === 'tamil'
                  ? data.tamil
                  : lang === 'telugu'
                    ? data.telugu
                    : lang === 'dub'
                      ? data.dub
                      : data.sub || data.sources;
              if (alternateSources && alternateSources.length > 0) {
                return { provider: prov, data };
              }
            }
          } catch (err) {
            console.warn(`[Audio Swap] Parallel check failed for "${prov}":`, err);
          }
          return null;
        });

      try {
        const results = await Promise.all(fetchPromises);
        
        // Deterministic Priority Selection
        const priorityOrder = ['toonplay', 'toonworld', 'vidnest', 'desidubanime', 'piratexplay'];
        let matchedResult = null;

        for (const prov of priorityOrder) {
          const found = results.find(r => r && r.provider === prov);
          if (found) {
            matchedResult = found;
            break;
          }
        }

        if (!matchedResult) {
          matchedResult = results.find(r => r !== null) || null;
        }

        if (matchedResult) {
          const { provider, data } = matchedResult;
          console.info(`[Audio Swap] Found alternative provider "${provider}" supporting language: ${lang}`);
          
          setCurrentProviderName(data.currentProvider || provider);
          localStorage.setItem('animeworld:provider', data.currentProvider || provider);
          
          setSubSourcesList(data.sub || []);
          setDubSourcesList(data.dub || []);
          setHindiSourcesList(data.hindi || []);
          setTamilSourcesList(data.tamil || []);
          setTeluguSourcesList(data.telugu || []);
          setSubtitleTracks(data.subtitles || []);
          setIsFallbackActive(data.isFallback || false);
          setFallbackReasonText(data.fallbackReason);
          setMatchedTitle(data.matchedTitle);
          setMatchedSlug(data.matchedSlug);
          setSearchCount(data.searchCount);
          setEpisodeCountFound(data.episodeCountFound);
          setProviderSlug(data.providerSlug);
          setActiveSourceIdx(0);
        } else {
          console.info(`[Audio Swap] No alternative provider found. Toggling in-place HLS audio tracks for language: ${lang}`);
          syncHlsAudioTrack(lang);
        }
      } catch (err) {
        console.error(`[Audio Swap] Parallel capability check failed:`, err);
        syncHlsAudioTrack(lang);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const selectSubtitle = (idx: number) => {
    const video = videoRef.current;
    if (!video) return;

    const tracks = video.textTracks;
    for (let i = 0; i < tracks.length; i++) {
      tracks[i].mode = i === idx ? 'showing' : 'disabled';
    }
    setActiveSubtitleIdx(idx);
  };

  // Provider Selection Loader (In-Place Reload)
  const selectProvider = async (provider: string) => {
    setIsLoading(true);
    setShowSettings(false);
    try {
      const res = await fetch(`/api/stream/source?animeId=${animeId}&episode=${episodeNumber}&provider=${provider}&title=${encodeURIComponent(animeTitle)}`);
      if (!res.ok) throw new Error('Provider resolved failed status.');
      const data = await res.json();
      
      if (!data?.sources?.length && !data?.streams?.length && !data?.sub?.length && !data?.dub?.length && !data?.hindi?.length) {
        throw new Error('No stream found');
      }

      setCurrentProviderName(data.currentProvider || provider);
      localStorage.setItem('animeworld:provider', data.currentProvider || provider);
      
      setSubSourcesList(data.sub || []);
      setDubSourcesList(data.dub || []);
      setHindiSourcesList(data.hindi || []);
      setTamilSourcesList(data.tamil || []);
      setTeluguSourcesList(data.telugu || []);
      setSubtitleTracks(data.subtitles || []);
      setIsFallbackActive(data.isFallback || false);
      setFallbackReasonText(data.fallbackReason);
      setMatchedTitle(data.matchedTitle);
      setMatchedSlug(data.matchedSlug);
      setSearchCount(data.searchCount);
      setEpisodeCountFound(data.episodeCountFound);
      setProviderSlug(data.providerSlug);
      setActiveSourceIdx(0);

      // Auto-switch language if the current language has no sources in the new provider
      const hasSub = data.sub && data.sub.length > 0;
      const hasDub = data.dub && data.dub.length > 0;
      const hasHindi = data.hindi && data.hindi.length > 0;
      const hasTamil = data.tamil && data.tamil.length > 0;
      const hasTelugu = data.telugu && data.telugu.length > 0;

      let newLang = currentLanguage;
      if (currentLanguage === 'sub' && !hasSub) {
        if (hasHindi) newLang = 'hindi';
        else if (hasDub) newLang = 'dub';
        else if (hasTamil) newLang = 'tamil';
        else if (hasTelugu) newLang = 'telugu';
      } else if (currentLanguage === 'hindi' && !hasHindi) {
        if (hasSub) newLang = 'sub';
        else if (hasDub) newLang = 'dub';
      } else if (currentLanguage === 'dub' && !hasDub) {
        if (hasSub) newLang = 'sub';
        else if (hasHindi) newLang = 'hindi';
      }

      if (newLang !== currentLanguage) {
        setCurrentLanguage(newLang);
        localStorage.setItem('animeworld:preferredLanguage', newLang);
        localStorage.setItem('animeworld:language', newLang);
      }
    } catch (err) {
      console.warn(`Failed to swap provider in place to ${provider}:`, err);
      setToastMessage(`${getProviderFriendlyName(provider)} unavailable — try another server`);
      setIsLoading(false);

      const buttons = document.querySelectorAll('.server-btn:not(.active)');
      if (buttons[0]) {
        buttons[0].classList.add('pulse-suggest');
        setTimeout(() => buttons[0].classList.remove('pulse-suggest'), 3000);
      }
    }
  };

  // Manual Skip Skip Actions
  const skipIntro = () => {
    const video = videoRef.current;
    if (!video) return;
    const opInterval = skipIntervals.find(i => i.type === 'op');
    const targetTime = opInterval ? opInterval.endTime : 181;
    video.currentTime = targetTime;
    setCurrentTime(targetTime);
    setShowSkipIntro(false);
  };

  const skipEnding = () => {
    setShowSkipEnding(false);
    const hasNext = totalEpisodes && episodeNumber < totalEpisodes;
    if (hasNext) {
      handleNext();
    } else {
      const video = videoRef.current;
      if (!video) return;
      const edInterval = skipIntervals.find(i => i.type === 'ed');
      const targetTime = edInterval ? edInterval.endTime : Math.max(0, video.duration - 1);
      video.currentTime = targetTime;
      setCurrentTime(targetTime);
    }
  };

  const skipRecap = () => {
    const video = videoRef.current;
    if (!video) return;
    const recapInterval = skipIntervals.find(i => i.type === 'recap');
    const targetTime = recapInterval ? recapInterval.endTime : video.currentTime;
    video.currentTime = targetTime;
    setCurrentTime(targetTime);
    setShowSkipRecap(false);
  };

  // ─── Touch Gesture Handlers ────────────────────────────────────────────────
  const showTouchFeedback = (dir: 'back' | 'forward') => {
    setTouchFeedback(dir);
    setTimeout(() => setTouchFeedback(null), 500);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const video = videoRef.current;
    if (!video) return;

    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
      volume: video.volume,
    };

    // Long press 2x speed trigger (500ms hold)
    if (isPlaying) {
      longPressTimeoutRef.current = setTimeout(() => {
        setIsLongPressing2x(true);
        video.playbackRate = 2.0;
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

    // Volume swipe gesture (Vertical swipe right side)
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

    // Double Tap seek check
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

  // ─── Keyboard Shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const handleGlobalKeys = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      const video = videoRef.current;
      if (!video) return;

      switch (e.key.toLowerCase()) {
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
        case 'arrowright':
          e.preventDefault();
          video.currentTime = Math.min(video.currentTime + 10, video.duration);
          break;
        case 'arrowleft':
          e.preventDefault();
          video.currentTime = Math.max(video.currentTime - 10, 0);
          break;
        case 'arrowup':
          e.preventDefault();
          const volUp = Math.min(video.volume + 0.1, 1);
          video.volume = volUp;
          setVolume(volUp);
          break;
        case 'arrowdown':
          e.preventDefault();
          const volDown = Math.max(video.volume - 0.1, 0);
          video.volume = volDown;
          setVolume(volDown);
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 't':
          e.preventDefault();
          toggleTheaterMode();
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 'n':
          e.preventDefault();
          handleNext();
          break;
        case 'p':
          e.preventDefault();
          handlePrev();
          break;
        case 'i':
          e.preventDefault();
          if (showSkipIntro) {
            skipIntro();
            setToastMessage('Skipped Intro');
          }
          break;
        case 'o':
          e.preventDefault();
          if (showSkipEnding) {
            skipEnding();
            setToastMessage('Skipped Ending');
          }
          break;
        case 'b':
          e.preventDefault();
          const current = Math.floor(video.currentTime);
          if (onAddBookmark) {
            onAddBookmark(current, '').then(() => {
              setToastMessage(`Bookmark added at ${formatTime(current)}`);
            }).catch((err) => console.error(err));
          }
          break;
        case '?':
          e.preventDefault();
          setShowShortcutsHelp((prev) => !prev);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, [isPlaying, isLoading, episodeNumber, totalEpisodes, showSkipIntro, showSkipEnding, onAddBookmark]);

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '00:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);

    const pad = (num: number) => String(num).padStart(2, '0');

    if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
    return `${pad(m)}:${pad(s)}`;
  };

  return (
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
      <div
        ref={playerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className={`relative w-full aspect-video bg-black rounded-2xl overflow-hidden group/player shadow-2xl border border-border-subtle ${
          isFullscreen ? 'rounded-none border-none' : ''
        }`}
        style={{
          cursor: showControls ? 'default' : 'none',
          ['--player-accent' as any]: accentColor,
          ['--player-accent-h' as any]: accentH,
          ['--player-accent-s' as any]: accentS,
          ['--player-accent-l' as any]: accentL,
        }}
      >
        {/* Native HTML5 Video or embedded Iframe Player */}
        {isIframeSource ? (
          <iframe
            src={activeSource.url}
            className="w-full h-full border-0"
            allowFullScreen
            allow="autoplay; encrypted-media; picture-in-picture"
            sandbox={activeSource?.url?.includes('piratexplay.cc') ? "allow-scripts allow-same-origin allow-forms allow-popups" : undefined}
            onLoad={() => setIsLoading(false)}
          />
        ) : (
          <video
            ref={videoRef}
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleVideoEnded}
            onClick={togglePlay}
            className="w-full h-full object-contain cursor-pointer"
            playsInline
            crossOrigin="anonymous"
          >
            {subtitleTracks.map((track, i) => (
              <track
                key={track.lang + i}
                kind="subtitles"
                label={track.label}
                srcLang={track.lang}
                src={track.url}
                default={i === activeSubtitleIdx}
              />
            ))}
          </video>
        )}

        {/* Manual Skip Intro / Ending / Recap Overlays */}
        {showSkipIntro && (
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
        {showSkipEnding && (
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
        {showSkipRecap && (
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

        {/* In-Player Resume Prompt Overlay */}
        {showResumePromptState && (
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

        {/* Auto Next Countdown Overlay */}
        {countdown !== null && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md text-center p-6">
            <div className="space-y-6 max-w-md w-full bg-[#0D0D14]/90 border border-white/10 rounded-2xl p-6 shadow-2xl animate-fade-up">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-accent-violet select-none mb-1">
                  Up Next
                </p>
                <h3 className="text-base font-bold text-white leading-tight font-display select-none">
                  Episode {episodeNumber + 1} {nextEpisodeTitle ? `– ${nextEpisodeTitle}` : ''}
                </h3>
              </div>

              {nextEpisodeThumbnail ? (
                <div className="relative aspect-video w-full max-w-xs mx-auto rounded-xl overflow-hidden border border-white/10 shadow-lg select-none">
                  <img
                    src={nextEpisodeThumbnail}
                    alt={`Episode ${episodeNumber + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <span className="text-white font-black text-3xl drop-shadow-md">
                      {countdown}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="w-16 h-16 rounded-full bg-accent-violet/10 border border-accent-violet/30 flex items-center justify-center mx-auto text-white font-black text-2xl select-none">
                  {countdown}
                </div>
              )}

              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setCountdown(null)}
                  className="px-5 py-2 rounded-xl border border-white/10 hover:bg-white/10 text-white font-bold text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setCountdown(null);
                    handleNext();
                  }}
                  className="px-5 py-2 rounded-xl bg-accent-violet hover:bg-accent-violet/85 text-white font-bold text-xs transition-colors"
                >
                  Play Now
                </button>
              </div>
            </div>
          </div>
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
                  You're all caught up!
                </h3>
                <p className="text-xs text-text-secondary select-none">
                  You've watched the final episode of {animeTitle}.
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

        {/* Long Press 2x Speed Indicator */}
        {isLongPressing2x && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none px-3 py-1.5 rounded-full bg-black/60 border border-white/10 text-white font-bold text-[10px] tracking-widest uppercase flex items-center gap-1.5">
            <Loader2 className="w-3.5 h-3.5 text-accent-violet animate-spin" />
            <span>2X Speed Active</span>
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

        {/* Loading overlay spinner */}
        {isLoading && !errorMessage && (
          <div className="absolute inset-0 z-40 flex flex-col gap-4 items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="relative w-16 h-16 rounded-2xl overflow-hidden border border-white/10 shadow-[0_0_30px_rgba(124,91,255,0.4)] animate-pulse">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/app-icon.jpg" alt="Loading..." className="w-full h-full object-cover" />
            </div>
            <Loader2 className="w-6 h-6 text-accent-violet animate-spin" />
          </div>
        )}

        {/* Error fallback overlay */}
        {errorMessage && (
          <PlayerError message={errorMessage} onRetry={handleSourceError} />
        )}

        {/* Play/Pause Center Indicator */}
        {!isLoading && !errorMessage && !isIframeSource && countdown === null && (
          <div
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center bg-black/0 active:bg-black/10 transition-colors pointer-events-none"
          >
            {!isPlaying && (
              <div className="w-16 h-16 rounded-full bg-accent-violet/70 backdrop-blur-xs flex items-center justify-center text-white scale-95 opacity-0 group-hover/player:scale-100 group-hover/player:opacity-100 transition-all duration-200 shadow-lg pointer-events-auto cursor-pointer">
                <PlayCircle className="w-12 h-12 text-white fill-white/10" />
              </div>
            )}
          </div>
        )}

        {/* ─── Control Bar Overlay ──────────────────────────────────────────────── */}
        {!errorMessage && !isIframeSource && (
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
              <div className="flex-grow relative h-6 flex items-center group rounded-lg focus-within:ring-2 focus-within:ring-white/50">
                {/* Base background bar */}
                <div className="absolute left-0 right-0 h-1.5 rounded-lg bg-white/20 pointer-events-none" />

                {/* Active played progress bar */}
                <div 
                  className="absolute left-0 h-1.5 rounded-lg pointer-events-none" 
                  style={{
                    backgroundColor: 'var(--player-accent)',
                    width: `${duration ? (currentTime / duration) * 100 : 0}%`
                  }}
                />

                {/* Chapter markers (op, ed, recap) */}
                {duration > 0 && skipIntervals.map((interval, idx) => {
                  const left = (interval.startTime / duration) * 100;
                  const width = ((interval.endTime - interval.startTime) / duration) * 100;
                  let bgColor = 'rgba(168, 85, 247, 0.4)'; // op color: light violet
                  if (interval.type === 'ed') bgColor = 'rgba(236, 72, 153, 0.4)'; // ed color: pink
                  if (interval.type === 'recap') bgColor = 'rgba(234, 179, 8, 0.4)'; // recap color: yellow
                  return (
                    <div
                      key={`chapter-${idx}`}
                      className="absolute h-1.5 pointer-events-none"
                      style={{
                        left: `${left}%`,
                        width: `${width}%`,
                        backgroundColor: bgColor,
                      }}
                    />
                  );
                })}

                {/* Bookmark ticks */}
                {duration > 0 && bookmarks.map((b) => {
                  const left = (b.timestamp / duration) * 100;
                  return (
                    <div
                      key={`bookmark-tick-${b.id || b.timestamp}`}
                      className="absolute w-1 h-3 bg-emerald-400 z-10 pointer-events-none transform -translate-x-1/2"
                      style={{ left: `${left}%` }}
                    />
                  );
                })}

                {/* The actual range input transparent or styled appropriately overlaying on top */}
                <input
                  type="range"
                  min={0}
                  max={duration || 0}
                  value={currentTime}
                  onChange={handleSeek}
                  className="absolute w-full h-full opacity-0 cursor-pointer z-20"
                  aria-label={`Seek bar. Current time: ${formatTime(currentTime)} of ${formatTime(duration)}`}
                />
                
                {/* Visual thumb helper visible on hover */}
                <div 
                  className="absolute w-3.5 h-3.5 rounded-full bg-white shadow-lg pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-10 transform -translate-x-1/2"
                  style={{ left: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                />
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
                  title="Rewind 10s"
                >
                  <RotateCcw size={16} />
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
                  title="Skip 10s"
                >
                  <SkipForward size={16} />
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
                  title="Keyboard Shortcuts"
                >
                  <HelpCircle size={17} />
                </button>

                {/* Bookmarks Toggle Button */}
                <button
                  onClick={() => setShowBookmarksPanel(!showBookmarksPanel)}
                  className={`text-text-secondary hover:text-white transition-colors ${showBookmarksPanel ? 'text-accent-violet' : ''}`}
                  title="Bookmarks"
                  aria-label="Bookmarks"
                >
                  <Bookmark size={18} fill={showBookmarksPanel ? 'currentColor' : 'none'} />
                </button>

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
                      playbackSpeed={playbackSpeed}
                      onChangeSpeed={changeSpeed}
                      isAutoplayNext={isAutoplayNext}
                      onToggleAutoplay={() => {
                        const next = !isAutoplayNext;
                        setIsAutoplayNext(next);
                        localStorage.setItem('animeworld:autoplay_next', String(next));
                        fetch('/api/user/preferences', {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ autoplayNext: next }),
                        }).catch(err => console.error(err));
                      }}
                      autoSkipIntro={autoSkipIntro}
                      onToggleAutoSkipIntro={() => {
                        const next = !autoSkipIntro;
                        setAutoSkipIntro(next);
                        localStorage.setItem('animeworld:auto_skip_intro', String(next));
                        fetch('/api/user/preferences', {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ autoSkipIntro: next }),
                        }).catch(err => console.error(err));
                      }}
                      autoSkipOutro={autoSkipOutro}
                      onToggleAutoSkipOutro={() => {
                        const next = !autoSkipOutro;
                        setAutoSkipOutro(next);
                        localStorage.setItem('animeworld:auto_skip_outro', String(next));
                        fetch('/api/user/preferences', {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ autoSkipOutro: next }),
                        }).catch(err => console.error(err));
                      }}
                      autoplayCountdown={autoplayCountdown}
                      onSelectCountdown={(seconds) => {
                        setAutoplayCountdown(seconds);
                        localStorage.setItem('animeworld:autoplay_countdown', String(seconds));
                        fetch('/api/user/preferences', {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ autoplayCountdown: seconds }),
                        }).catch(err => console.error(err));
                      }}
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
                    title="Picture-in-Picture"
                  >
                    <Tv size={17} />
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

        {/* Fallback Test Stream Banner */}
        {isFallbackActive && (
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
            isFallback: isFallbackActive,
            fallbackReason: fallbackReasonText,
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
            providerSlug,
            matchedTitle,
            matchedSlug,
            searchCount,
            episodeCountFound,
            lastError: isFallbackActive ? fallbackReasonText : undefined,
          }}
        />

        {/* Keyboard Shortcuts Overlay Modal */}
        {showShortcutsHelp && (
          <ShortcutsOverlay onClose={() => setShowShortcutsHelp(false)} />
        )}

        {toastMessage && (
          <div className={`absolute top-4 right-4 z-50 backdrop-blur-md border text-white font-medium text-xs px-4 py-2.5 rounded-xl shadow-2xl animate-fade-in flex items-center gap-2 select-none ${
            toastMessage.toLowerCase().includes('switched') || toastMessage.toLowerCase().includes('server')
              ? 'bg-teal-900/90 border-teal-500/40'
              : 'bg-[#0D0D14]/90 border-red-500/30'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              toastMessage.toLowerCase().includes('switched') || toastMessage.toLowerCase().includes('server')
                ? 'bg-teal-400'
                : 'bg-red-500 animate-ping'
            }`} />
            <span>{toastMessage}</span>
          </div>
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
              {[
                { key: 'hindi', label: 'HINDI', available: hindiSourcesList.length > 0 || hasNativeHindi },
                { key: 'sub', label: 'SUB', available: subSourcesList.length > 0 },
                { key: 'dub', label: 'DUB', available: dubSourcesList.length > 0 },
                { key: 'tamil', label: 'TAMIL', available: tamilSourcesList.length > 0 },
                { key: 'telugu', label: 'TELUGU', available: teluguSourcesList.length > 0 },
              ].map((lang) => {
                const isActive = currentLanguage === lang.key;
                return (
                  <button
                    key={lang.key}
                    disabled={!lang.available}
                    onClick={() => selectLanguage(lang.key as any)}
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
              {providersList.map((prov) => {
                const isActive = currentProviderName === prov;
                const friendlyName = getProviderFriendlyName(prov);
                return (
                  <button
                    key={prov}
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
                    {prov === 'piratexplay' && (
                      <span className="server-lang-badge hindi">HINDI</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
