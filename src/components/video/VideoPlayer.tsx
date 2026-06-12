'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize, RotateCcw,
  SkipForward, SkipBack, Settings, Subtitles, Loader2, PlayCircle, HelpCircle
} from 'lucide-react';
import { progressService } from '@/lib/streaming/progress';
import PlayerError from './PlayerError';
import PlayerSettings from './PlayerSettings';
import ShortcutsOverlay from './ShortcutsOverlay';
import StreamDebugPanel from './StreamDebugPanel';
import { useRouter } from '@/navigation';

interface EpisodeSource {
  url: string;
  quality: '1080p' | '720p' | '480p' | '360p' | 'auto' | 'default';
  isM3U8: boolean;
}

interface SubtitleTrack {
  label: string;
  lang: string;
  url: string;
}

interface VideoPlayerProps {
  animeId: string;
  animeImage: string;
  sources: EpisodeSource[]; // legacy fallback
  subSources?: EpisodeSource[];
  dubSources?: EpisodeSource[];
  subtitles?: SubtitleTrack[];
  animeTitle: string;
  episodeNumber: number;
  totalEpisodes?: number;
  onPrevEpisode?: () => void;
  onNextEpisode?: () => void;
  onProgress?: (position: number, duration: number) => void;
  initialPosition?: number;
  providers?: string[];
  currentProvider?: string;
  isFallback?: boolean;
  fallbackReason?: string;
}

export default function VideoPlayer({
  animeId,
  animeImage,
  sources,
  subSources = [],
  dubSources = [],
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
  const [subtitleTracks, setSubtitleTracks] = useState<SubtitleTrack[]>(subtitles);
  const [providersList, setProvidersList] = useState<string[]>(providers.length > 0 ? providers : ['mock']);
  const [currentProviderName, setCurrentProviderName] = useState<string>(currentProvider);
  const [currentLanguage, setCurrentLanguage] = useState<'sub' | 'dub'>('sub');
  const [isFallbackActive, setIsFallbackActive] = useState<boolean>(isFallback);
  const [fallbackReasonText, setFallbackReasonText] = useState<string | undefined>(fallbackReason);

  // Player States
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(initialPosition);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [activeSourceIdx, setActiveSourceIdx] = useState(0);
  const [activeSubtitleIdx, setActiveSubtitleIdx] = useState(-1); // -1 = off
  const [isAutoplayNext, setIsAutoplayNext] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Settings & Overlays
  const [showSettings, setShowSettings] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const countdownIntervalRef = useRef<any>(null);

  // Skip Intro / Ending Detection States
  const [showSkipIntro, setShowSkipIntro] = useState(false);
  const [showSkipEnding, setShowSkipEnding] = useState(false);

  // Mobile Swipe / Gesture States
  const [touchFeedback, setTouchFeedback] = useState<'back' | 'forward' | null>(null);
  const [isLongPressing2x, setIsLongPressing2x] = useState(false);
  const [showVolumeIndicator, setShowVolumeIndicator] = useState(false);
  const [gestureVolume, setGestureVolume] = useState(1);
  const lastTapRef = useRef<{ time: number; x: number }>({ time: 0, x: 0 });
  const touchStartRef = useRef<{ x: number; y: number; time: number; volume: number }>({ x: 0, y: 0, time: 0, volume: 1 });
  const longPressTimeoutRef = useRef<any>(null);

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
    setSubSourcesList(subSources.length > 0 ? subSources : sources);
    setDubSourcesList(dubSources);
    setSubtitleTracks(subtitles);
    setProvidersList(providers.length > 0 ? providers : ['mock']);
    setCurrentProviderName(currentProvider);
  }, [sources, subSources, dubSources, subtitles, providers, currentProvider]);

  // Sync refs
  useEffect(() => { currentTimeRef.current = currentTime; }, [currentTime]);
  useEffect(() => { playbackSpeedRef.current = playbackSpeed; }, [playbackSpeed]);
  useEffect(() => { volumeRef.current = volume; }, [volume]);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  useEffect(() => { activeSubtitleIdxRef.current = activeSubtitleIdx; }, [activeSubtitleIdx]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  // Load preferences from localStorage on mount
  useEffect(() => {
    const savedAutoplay = localStorage.getItem('autoplay_next');
    if (savedAutoplay !== null) {
      setIsAutoplayNext(savedAutoplay === 'true');
    }
    
    const savedLang = localStorage.getItem('preferredLanguage') as 'sub' | 'dub';
    if (savedLang === 'sub' || savedLang === 'dub') {
      setCurrentLanguage(savedLang);
    }

    const savedSpeed = localStorage.getItem('preferredPlaybackSpeed');
    if (savedSpeed !== null) {
      const parsedSpeed = parseFloat(savedSpeed);
      if (!isNaN(parsedSpeed)) setPlaybackSpeed(parsedSpeed);
    }

    const savedQuality = localStorage.getItem('preferredQuality');
    if (savedQuality !== null) {
      setCurrentQuality(savedQuality);
    }
  }, []);

  const activeSources = currentLanguage === 'dub' && dubSourcesList.length > 0 ? dubSourcesList : subSourcesList;
  const activeSource = activeSources[activeSourceIdx];

  // ─── HLS Load & Failover ───────────────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !activeSource) return;

    setIsLoading(true);
    setErrorMessage(null);

    const handleLoadedMetadata = () => {
      setIsLoading(false);
      setDuration(video.duration);
      
      // Preserve state on switch
      video.currentTime = currentTimeRef.current;
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

            video.currentTime = currentTimeRef.current;
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

    setCurrentTime(video.currentTime);

    // Skip Intro / Ending Detection
    const t = video.currentTime;
    const dur = video.duration;
    
    // Skip Intro: manual button between 01:30 and 03:00
    setShowSkipIntro(t >= 90 && t <= 180);

    // Skip Ending: manual button 90s before end
    setShowSkipEnding(dur > 200 && t >= dur - 90 && t < dur - 10);

    progressService.updateProgress({
      animeId,
      animeTitle,
      animeImage,
      episode: episodeNumber,
      position: video.currentTime,
      duration: video.duration,
      totalEpisodes,
    });
  };

  // Preloading N+1 Episode data
  useEffect(() => {
    if (!isPlaying) return;

    const nextEp = episodeNumber + 1;
    if (totalEpisodes && nextEp <= totalEpisodes) {
      const preloadTimer = setTimeout(() => {
        console.info(`[PRELOAD] Pre-fetching Episode ${nextEp} stream details...`);
        fetch(`/api/stream/source?animeId=${animeId}&episode=${nextEp}&title=${encodeURIComponent(animeTitle)}`)
          .then((res) => res.json())
          .then((data) => {
            console.info(`[PRELOAD] Cache primed for Episode ${nextEp}`);
          })
          .catch((err) => console.warn(`[PRELOAD] Pre-fetch failed for Episode ${nextEp}:`, err));
      }, 10000); // Trigger pre-load after 10s of stable playback

      return () => clearTimeout(preloadTimer);
    }
  }, [animeId, episodeNumber, totalEpisodes, isPlaying]);

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

    if (isAutoplayNext && totalEpisodes && episodeNumber < totalEpisodes) {
      setCountdown(5);
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
    localStorage.setItem('preferredPlaybackSpeed', String(speed));
  };

  const selectQuality = (level: string) => {
    setCurrentQuality(level);
    localStorage.setItem('preferredQuality', level);

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

  const selectLanguage = (lang: 'sub' | 'dub') => {
    setCurrentLanguage(lang);
    localStorage.setItem('preferredLanguage', lang);
    setActiveSourceIdx(0);
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
      
      setCurrentProviderName(data.currentProvider || provider);
      setSubSourcesList(data.sub || []);
      setDubSourcesList(data.dub || []);
      setSubtitleTracks(data.subtitles || []);
      setIsFallbackActive(data.isFallback || false);
      setFallbackReasonText(data.fallbackReason);
      setActiveSourceIdx(0);
    } catch (err) {
      console.warn(`Failed to swap provider in place to ${provider}:`, err);
      setErrorMessage(`Failed to switch provider to ${provider}.`);
      setIsLoading(false);
    }
  };

  // Manual Skip Skip Actions
  const skipIntro = () => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 181; // skip past intro
    setCurrentTime(181);
    setShowSkipIntro(false);
  };

  const skipEnding = () => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, video.duration - 5);
    setCurrentTime(video.duration - 5);
    setShowSkipEnding(false);
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
  }, [isPlaying, isLoading, episodeNumber, totalEpisodes]);

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
    <div
      ref={playerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={`relative w-full aspect-video bg-black rounded-2xl overflow-hidden group/player shadow-2xl border border-border-subtle ${
        isFullscreen ? 'rounded-none border-none' : ''
      }`}
    >
      {/* Native HTML5 Video Element */}
      <video
        ref={videoRef}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleVideoEnded}
        onClick={togglePlay}
        className="w-full h-full object-contain cursor-pointer"
        playsInline
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

      {/* Manual Skip Intro / Ending Overlays */}
      {showSkipIntro && (
        <button
          onClick={skipIntro}
          className="absolute bottom-20 left-6 z-40 bg-[#0D0D14]/90 border border-accent-violet/30 hover:border-accent-violet/60 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-lg animate-fade-up select-none backdrop-blur-md"
        >
          ⏩ Skip Intro
        </button>
      )}
      {showSkipEnding && (
        <button
          onClick={skipEnding}
          className="absolute bottom-20 left-6 z-40 bg-[#0D0D14]/90 border border-accent-violet/30 hover:border-accent-violet/60 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-lg animate-fade-up select-none backdrop-blur-md"
        >
          ⏩ Skip Ending
        </button>
      )}

      {/* Auto Next Countdown Overlay */}
      {countdown !== null && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs text-center">
          <div className="space-y-4 max-w-xs animate-fade-up">
            <p className="text-[10px] font-black uppercase tracking-wider text-accent-violet select-none">
              Up Next
            </p>
            <h3 className="text-base font-bold text-white leading-tight font-display select-none">
              Episode {episodeNumber + 1} Starts In
            </h3>
            <div className="w-16 h-16 rounded-full bg-accent-violet/10 border border-accent-violet/30 flex items-center justify-center mx-auto text-white font-black text-2xl select-none">
              {countdown}
            </div>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setCountdown(null)}
                className="px-4 py-1.5 rounded-lg border border-white/10 hover:bg-white/10 text-white font-bold text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setCountdown(null);
                  handleNext();
                }}
                className="px-4 py-1.5 rounded-lg bg-accent-violet hover:bg-accent-violet-hover text-white font-bold text-xs transition-colors"
              >
                Play Now
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
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-xs">
          <Loader2 className="w-10 h-10 text-accent-violet animate-spin" />
        </div>
      )}

      {/* Error fallback overlay */}
      {errorMessage && (
        <PlayerError message={errorMessage} onRetry={handleSourceError} />
      )}

      {/* Play/Pause Center Indicator */}
      {!isLoading && !errorMessage && countdown === null && (
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
      {!errorMessage && (
        <div
          className={`absolute bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-[#05050A]/95 via-[#05050A]/70 to-transparent p-4 flex flex-col gap-3 transition-all duration-300 ${
            isPlaying ? 'translate-y-full group-hover/player:translate-y-0' : 'translate-y-0'
          }`}
        >
          {/* Progress Bar and Scrubber */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-text-secondary select-none">
              {formatTime(currentTime)}
            </span>
            <input
              type="range"
              min={0}
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              className="flex-grow h-1.5 rounded-lg appearance-none cursor-pointer bg-white/20 accent-accent-violet focus:outline-none"
              style={{
                background: `linear-gradient(to right, var(--color-accent-violet) 0%, var(--color-accent-violet) ${
                  duration ? (currentTime / duration) * 100 : 0
                }%, rgba(255, 255, 255, 0.2) ${
                  duration ? (currentTime / duration) * 100 : 0
                }%, rgba(255, 255, 255, 0.2) 100%)`,
              }}
            />
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
                    subtitles={subtitleTracks}
                    activeSubtitleIdx={activeSubtitleIdx}
                    onSelectSubtitle={selectSubtitle}
                    playbackSpeed={playbackSpeed}
                    onChangeSpeed={changeSpeed}
                    isAutoplayNext={isAutoplayNext}
                    onToggleAutoplay={() => {
                      const next = !isAutoplayNext;
                      setIsAutoplayNext(next);
                      localStorage.setItem('autoplay_next', String(next));
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
                  className="w-0 group-hover/volume:w-16 focus:w-16 h-1.5 rounded-lg appearance-none cursor-pointer bg-white/20 accent-accent-violet focus:outline-none transition-all duration-300"
                  style={{
                    background: `linear-gradient(to right, var(--color-accent-violet) 0%, var(--color-accent-violet) ${
                      isMuted ? 0 : volume * 100
                    }%, rgba(255, 255, 255, 0.2) ${
                      isMuted ? 0 : volume * 100
                    }%, rgba(255, 255, 255, 0.2) 100%)`,
                  }}
                />
              </div>

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
        }}
      />

      {/* Keyboard Shortcuts Overlay Modal */}
      {showShortcutsHelp && (
        <ShortcutsOverlay onClose={() => setShowShortcutsHelp(false)} />
      )}
    </div>
  );
}
