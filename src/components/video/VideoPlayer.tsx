'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize, RotateCcw,
  SkipForward, SkipBack, Settings, Subtitles, List, Loader2, PlayCircle
} from 'lucide-react';
import { progressService } from '@/lib/streaming/progress';
import PlayerError from './PlayerError';
import { useRouter } from '@/navigation';

interface EpisodeSource {
  url: string;
  quality: string;
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
  sources: EpisodeSource[];
  subtitles?: SubtitleTrack[];
  animeTitle: string;
  episodeNumber: number;
  totalEpisodes?: number;
  onPrevEpisode?: () => void;
  onNextEpisode?: () => void;
  onProgress?: (position: number, duration: number) => void;
  initialPosition?: number;
}

export default function VideoPlayer({
  animeId,
  animeImage,
  sources,
  subtitles = [],
  animeTitle,
  episodeNumber,
  totalEpisodes,
  onPrevEpisode,
  onNextEpisode,
  onProgress,
  initialPosition = 0,
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

  // States
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

  const [touchFeedback, setTouchFeedback] = useState<'back' | 'forward' | null>(null);
  const lastTapRef = useRef<{ time: number; x: number }>({ time: 0, x: 0 });

  const showTouchFeedback = (dir: 'back' | 'forward') => {
    setTouchFeedback(dir);
    setTimeout(() => setTouchFeedback(null), 500);
  };

  const handleVideoTouch = (e: React.TouchEvent<HTMLVideoElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const now = Date.now();
    const touch = e.touches[0];
    const rect = video.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const width = rect.width;

    const timeDiff = now - lastTapRef.current.time;
    const distDiff = Math.abs(x - lastTapRef.current.x);

    if (timeDiff < 300 && distDiff < 40) {
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

  // Selector Menus
  const [showSettings, setShowSettings] = useState(false);
  const [showSubtitles, setShowSubtitles] = useState(false);
  const [showEpisodes, setShowEpisodes] = useState(false);

  const activeSource = sources[activeSourceIdx];

  // Autoplay settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('autoplay_next');
    if (saved !== null) {
      setIsAutoplayNext(saved === 'true');
    }
  }, []);

  const toggleAutoplay = () => {
    const nextVal = !isAutoplayNext;
    setIsAutoplayNext(nextVal);
    localStorage.setItem('autoplay_next', String(nextVal));
  };

  // ─── HLS Load & Stream Failover ─────────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !activeSource) return;

    setIsLoading(true);
    setErrorMessage(null);

    const handleLoadedMetadata = () => {
      setIsLoading(false);
      setDuration(video.duration);
      if (initialPosition > 0) {
        video.currentTime = initialPosition;
      }
      if (isPlaying) {
        video.play().catch(() => setIsPlaying(false));
      }
    };

    let hls: any = null;

    if (activeSource.isM3U8) {
      // Native Apple HLS support
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = activeSource.url;
        video.addEventListener('loadedmetadata', handleLoadedMetadata);
      } else {
        // Load hls.js dynamically for Chrome / Firefox
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

          hls.loadSource(activeSource.url);
          hls.attachMedia(video);

          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            setIsLoading(false);
            // Restore playback position if returning
            if (initialPosition > 0) {
              video.currentTime = initialPosition;
            }
            if (isPlaying) {
              video.play().catch(() => setIsPlaying(false));
            }
          });

          hls.on(Hls.Events.ERROR, (event: any, data: any) => {
            if (data.fatal) {
              console.warn(`HLS fatal error encountered on source index ${activeSourceIdx}:`, data.type);
              handleSourceError();
            }
          });
        });
      }
    } else {
      // Standard MP4 source
      video.src = activeSource.url;
      video.addEventListener('loadedmetadata', handleLoadedMetadata);
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [activeSourceIdx, activeSource?.url]);

  // Handle source errors by attempting the next available source in failover list
  const handleSourceError = () => {
    if (activeSourceIdx + 1 < sources.length) {
      console.info(`Triggering stream failover from source index ${activeSourceIdx} to ${activeSourceIdx + 1}`);
      setActiveSourceIdx((prev) => prev + 1);
    } else {
      setErrorMessage('Failed to load all available stream sources. Please try again later.');
      setIsLoading(false);
    }
  };

  // ─── Progress Tracker & Auto-Advance ────────────────────────────────────────
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;

    setCurrentTime(video.currentTime);

    // Call progressService to save throttled progress
    progressService.updateProgress({
      animeId,
      animeTitle,
      animeImage,
      episode: episodeNumber,
      position: video.currentTime,
      duration: video.duration,
      totalEpisodes,
    });

    if (onProgress && video.currentTime > 0) {
      onProgress(video.currentTime, video.duration);
    }
  };

  const handleVideoEnded = () => {
    setIsPlaying(false);
    
    // Force complete progress sync immediately
    const video = videoRef.current;
    if (video) {
      progressService.updateProgress({
        animeId,
        animeTitle,
        animeImage,
        episode: episodeNumber,
        position: video.duration, // force completion
        duration: video.duration,
        totalEpisodes,
        force: true,
      });
    }

    if (isAutoplayNext) {
      handleNext();
    }
  };

  // Sync progress on tab close or page navigate away
  useEffect(() => {
    const handleUnload = () => {
      const video = videoRef.current;
      if (video && video.currentTime > 0) {
        progressService.syncProgressBeacon({
          animeId,
          animeTitle,
          animeImage,
          episode: episodeNumber,
          position: video.currentTime,
          duration: video.duration,
          totalEpisodes,
        });
      }
    };

    window.addEventListener('beforeunload', handleUnload);
    return () => {
      handleUnload(); // Save progress when component unmounts (Next.js client-side navigation)
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, [animeId, episodeNumber, totalEpisodes]);

  // ─── Custom Player UI Events ───────────────────────────────────────────────
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video || isLoading) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
      // Force sync on pause
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
    const video = videoRef.current;
    if (!player || !video) return;

    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    } else if (player.requestFullscreen) {
      player.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else if ((video as any).webkitEnterFullscreen) {
      (video as any).webkitEnterFullscreen();
    }
  };

  // Listen to external fullscreen changes
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
    setShowSettings(false);
  };

  const selectQuality = (idx: number) => {
    // Quality selection switches active source index and keeps current playback position
    const video = videoRef.current;
    const currentPos = video ? video.currentTime : currentTime;
    
    // Temporarily save position to inject into useEffect trigger
    setActiveSourceIdx(idx);
    setShowSettings(false);
  };

  const selectSubtitle = (idx: number) => {
    const video = videoRef.current;
    if (!video) return;

    // Toggle track visibility on HTML5 video element
    const tracks = video.textTracks;
    for (let i = 0; i < tracks.length; i++) {
      tracks[i].mode = i === idx ? 'showing' : 'disabled';
    }

    setActiveSubtitleIdx(idx);
    setShowSubtitles(false);
  };

  // ─── Keyboard Shortcuts ───────────────────────────────────────────────────
  useEffect(() => {
    const handleGlobalKeys = (e: KeyboardEvent) => {
      // Don't intercept shortcuts when users type in input fields
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
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, [isPlaying, isLoading]);

  // Formats seconds to mm:ss or hh:mm:ss
  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '00:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);

    const pad = (num: number) => String(num).padStart(2, '0');

    if (h > 0) {
      return `${h}:${pad(m)}:${pad(s)}`;
    }
    return `${pad(m)}:${pad(s)}`;
  };

  return (
    <div
      ref={playerRef}
      className={`relative w-full aspect-video bg-black rounded-2xl overflow-hidden group/player shadow-2xl border border-border-subtle ${
        isFullscreen ? 'rounded-none border-none' : ''
      }`}
    >
      {/* Dynamic Native HTML5 Video */}
      <video
        ref={videoRef}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleVideoEnded}
        onClick={togglePlay}
        onTouchStart={handleVideoTouch}
        className="w-full h-full object-contain cursor-pointer"
        playsInline
      >
        {subtitles.map((track, i) => (
          <track
            key={track.lang}
            kind="subtitles"
            label={track.label}
            srcLang={track.lang}
            src={track.url}
            default={i === 0}
          />
        ))}
      </video>

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

      {/* Play/Pause Center Indicator (Animates briefly on click) */}
      {!isLoading && !errorMessage && (
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

              <span className="text-xs font-bold text-white tracking-wide select-none hidden sm:inline-block">
                Ep {episodeNumber} · {animeTitle}
              </span>
            </div>

            {/* Right Actions (Selectors, Volume, PIP, Fullscreen) */}
            <div className="flex items-center gap-4 relative">
              {/* Autoplay Toggle */}
              <button
                onClick={toggleAutoplay}
                className={`text-xs font-bold px-2.5 py-1 rounded-lg border transition-all ${
                  isAutoplayNext
                    ? 'bg-accent-violet/20 border-accent-violet/40 text-accent-violet'
                    : 'border-border-subtle text-text-muted hover:text-text-secondary'
                }`}
                title="Autoplay Next Episode"
              >
                Auto-Next
              </button>

              {/* Subtitles Button */}
              {subtitles.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => {
                      setShowSubtitles(!showSubtitles);
                      setShowSettings(false);
                    }}
                    className={`text-text-secondary hover:text-white transition-colors ${
                      activeSubtitleIdx > -1 ? 'text-accent-violet' : ''
                    }`}
                    aria-label="Subtitles"
                  >
                    <Subtitles size={18} />
                  </button>

                  {/* Subtitle Selector Dropdown */}
                  {showSubtitles && (
                    <div className="absolute bottom-8 right-0 bg-[#0D0D14]/95 border border-border-default backdrop-blur-md rounded-xl p-2 min-w-32 shadow-xl z-50 text-xs">
                      <p className="px-2.5 py-1.5 text-text-disabled font-bold uppercase tracking-wider text-[9px]">
                        Subtitles
                      </p>
                      <button
                        onClick={() => selectSubtitle(-1)}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-surface-2 transition-colors ${
                          activeSubtitleIdx === -1 ? 'text-accent-violet font-semibold' : 'text-text-secondary'
                        }`}
                      >
                        Off
                      </button>
                      {subtitles.map((track, idx) => (
                        <button
                          key={track.lang}
                          onClick={() => selectSubtitle(idx)}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-surface-2 transition-colors ${
                            activeSubtitleIdx === idx ? 'text-accent-violet font-semibold' : 'text-text-secondary'
                          }`}
                        >
                          {track.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Settings / Quality / Speed Button */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowSettings(!showSettings);
                    setShowSubtitles(false);
                  }}
                  className="text-text-secondary hover:text-white transition-colors"
                  aria-label="Settings"
                >
                  <Settings size={18} />
                </button>

                {/* Settings Panel Dropdown */}
                {showSettings && (
                  <div className="absolute bottom-8 right-0 bg-[#0D0D14]/95 border border-border-default backdrop-blur-md rounded-xl p-3.5 min-w-44 shadow-xl z-50 text-xs space-y-3">
                    {/* Quality Switcher */}
                    <div>
                      <p className="text-text-disabled font-bold uppercase tracking-wider text-[9px] mb-1.5">
                        Stream Quality
                      </p>
                      <div className="space-y-0.5">
                        {sources.map((src, idx) => (
                          <button
                            key={src.quality + idx}
                            onClick={() => selectQuality(idx)}
                            className={`w-full text-left px-2 py-1 rounded-lg hover:bg-surface-2 transition-colors capitalize ${
                              activeSourceIdx === idx
                                ? 'text-accent-violet font-semibold bg-accent-violet/5'
                                : 'text-text-secondary'
                            }`}
                          >
                            Source {idx + 1} ({src.quality})
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Speed Switcher */}
                    <div className="border-t border-border-subtle pt-2">
                      <p className="text-text-disabled font-bold uppercase tracking-wider text-[9px] mb-1.5">
                        Playback Speed
                      </p>
                      <div className="grid grid-cols-4 gap-1 text-[10px] text-center">
                        {[0.5, 1, 1.5, 2].map((speed) => (
                          <button
                            key={speed}
                            onClick={() => changeSpeed(speed)}
                            className={`py-1 rounded hover:bg-surface-2 transition-colors ${
                              playbackSpeed === speed
                                ? 'bg-accent-violet text-white font-bold'
                                : 'text-text-secondary'
                            }`}
                          >
                            {speed}x
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
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
    </div>
  );
}
