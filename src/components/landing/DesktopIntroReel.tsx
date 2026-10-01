'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Volume2, VolumeX, SkipForward, SkipBack, Play, Pause, Compass, Sparkles, Monitor } from 'lucide-react';
import { ANIME_EDITS } from '@/lib/edits/manifest';

interface DesktopIntroReelProps {
  onEnter: () => void;
}

export default function DesktopIntroReel({ onEnter }: DesktopIntroReelProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const currentEdit = ANIME_EDITS[currentIndex];

  // Auto-play current video
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = 0;
    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => setIsPlaying(true))
        .catch(() => {
          // Autoplay policy prevented playback, keep muted
          video.muted = true;
          setIsMuted(true);
          video.play().catch(() => {});
        });
    }
  }, [currentIndex]);

  const nextReel = useCallback(() => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % ANIME_EDITS.length);
      setIsTransitioning(false);
    }, 250);
  }, []);

  const prevReel = useCallback(() => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + ANIME_EDITS.length) % ANIME_EDITS.length);
      setIsTransitioning(false);
    }, 250);
  }, []);

  const toggleSound = () => {
    if (!videoRef.current) return;
    const newMuted = !isMuted;
    videoRef.current.muted = newMuted;
    setIsMuted(newMuted);
    setHasInteracted(true);
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  // Keyboard navigation for desktop:
  // Space = toggle play/pause | Enter = Enter site | M = Mute | ArrowRight = Next | ArrowLeft = Prev
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        onEnter();
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'm' || e.key === 'M') {
        toggleSound();
      } else if (e.key === 'ArrowRight') {
        nextReel();
      } else if (e.key === 'ArrowLeft') {
        prevReel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onEnter, isMuted, isPlaying, nextReel, prevReel]);

  return (
    <div className="fixed inset-0 z-[9999] bg-black text-white flex items-center justify-center overflow-hidden select-none font-sans">
      {/* Blurred Ambience Video Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40 scale-110 filter blur-3xl">
        <video
          key={`ambient-${currentEdit.id}`}
          src={currentEdit.src}
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover"
        />
      </div>

      {/* Dark Vignette Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/80 pointer-events-none" />
      <div className="absolute inset-0 bg-radial-gradient from-transparent via-black/20 to-black/80 pointer-events-none" />

      {/* Main Container */}
      <div className="relative z-10 w-full h-full max-w-7xl mx-auto flex flex-col justify-between p-6 sm:p-10">
        {/* Top Header */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-purple-500/30 ring-1 ring-white/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-black text-xl tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-300">
                ANIWORLD
              </span>
              <span className="ml-2 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-white/10 text-white/70 border border-white/10">
                Desktop Experience
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Audio Toggle */}
            <button
              onClick={toggleSound}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/15 transition-all duration-200 text-sm font-semibold active:scale-95"
              title="Toggle Audio (M)"
            >
              {isMuted ? (
                <>
                  <VolumeX className="w-4 h-4 text-pink-400 animate-pulse" />
                  <span className="text-white/80">Unmute</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-white/80">Sound On</span>
                </>
              )}
            </button>

            {/* Quick Skip to Main Page Button */}
            <button
              onClick={onEnter}
              className="group flex items-center gap-2.5 px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-sm tracking-wide shadow-xl shadow-purple-900/40 border border-white/25 transition-all duration-300 hover:scale-105 active:scale-95"
            >
              <span>Go to Main Page</span>
              <Compass className="w-4 h-4 group-hover:rotate-45 transition-transform duration-300" />
            </button>
          </div>
        </header>

        {/* Center Video Frame */}
        <div className="relative flex-1 flex items-center justify-center my-4">
          <div className="relative h-[72vh] max-h-[820px] aspect-[9/16] rounded-3xl overflow-hidden shadow-2xl shadow-purple-900/50 border border-white/20 bg-black/90 group">
            {/* Video Element */}
            <video
              ref={videoRef}
              key={currentEdit.id}
              src={currentEdit.src}
              autoPlay
              loop={false}
              muted={isMuted}
              playsInline
              onEnded={nextReel}
              className={`w-full h-full object-cover transition-opacity duration-300 ${
                isTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
              }`}
            />

            {/* Center Play/Pause Overlay on Click */}
            <button
              onClick={togglePlay}
              className="absolute inset-0 w-full h-full flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
            >
              <div className="w-16 h-16 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center border border-white/30 text-white shadow-xl hover:scale-110 transition-transform">
                {isPlaying ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ml-1" />}
              </div>
            </button>

            {/* In-Frame Edit Badge */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
              <div className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-xs font-semibold text-purple-200">
                {currentEdit.anime}
              </div>
              <div className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-xs font-mono text-white/70">
                {currentIndex + 1} / {ANIME_EDITS.length}
              </div>
            </div>

            {/* In-Frame Bottom Caption */}
            <div className="absolute bottom-4 left-4 right-4 p-3 rounded-2xl bg-gradient-to-t from-black/90 via-black/60 to-transparent pointer-events-none">
              <h3 className="text-base font-bold text-white tracking-wide">{currentEdit.title}</h3>
              <p className="text-xs text-white/60">Press [Space] to pause &bull; [Enter] to explore library</p>
            </div>
          </div>

          {/* Left Arrow (Previous) */}
          <button
            onClick={prevReel}
            className="absolute left-4 lg:left-12 p-3.5 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white hover:scale-110 active:scale-95 transition-all duration-200 shadow-xl"
            title="Previous Edit (Left Arrow)"
          >
            <SkipBack className="w-6 h-6" />
          </button>

          {/* Right Arrow (Next) */}
          <button
            onClick={nextReel}
            className="absolute right-4 lg:right-12 p-3.5 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white hover:scale-110 active:scale-95 transition-all duration-200 shadow-xl"
            title="Next Edit (Right Arrow)"
          >
            <SkipForward className="w-6 h-6" />
          </button>
        </div>

        {/* Bottom Bar: Action & Short Keys Guide */}
        <footer className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          {/* Key Hints */}
          <div className="flex items-center gap-4 text-xs text-white/50">
            <span className="flex items-center gap-1.5">
              <kbd className="px-2 py-0.5 rounded bg-white/10 border border-white/15 text-white/80 font-mono text-[11px]">
                Space
              </kbd>
              Pause/Play
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="px-2 py-0.5 rounded bg-white/10 border border-white/15 text-white/80 font-mono text-[11px]">
                M
              </kbd>
              Mute/Unmute
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="px-2 py-0.5 rounded bg-white/10 border border-white/15 text-white/80 font-mono text-[11px]">
                &larr; &rarr;
              </kbd>
              Switch Edit
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="px-2 py-0.5 rounded bg-white/10 border border-white/15 text-white/80 font-mono text-[11px]">
                Enter
              </kbd>
              Main Page
            </span>
          </div>

          {/* Large CTA Button */}
          <div className="flex items-center gap-4">
            <button
              onClick={onEnter}
              className="px-8 py-3.5 rounded-2xl bg-white text-black hover:bg-purple-50 font-black text-sm tracking-wide shadow-2xl hover:shadow-purple-500/40 transition-all duration-300 hover:scale-105 active:scale-95 flex items-center gap-2"
            >
              <span>ENTER MAIN SITE</span>
              <Compass className="w-4 h-4" />
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
