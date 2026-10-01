'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Volume2, VolumeX, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { ANIME_EDITS } from '@/lib/edits/manifest';

interface DesktopIntroReelProps {
  onEnter: () => void;
}

export default function DesktopIntroReel({ onEnter }: DesktopIntroReelProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  const currentEdit = ANIME_EDITS[currentIndex];

  // Advance to next edit
  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % ANIME_EDITS.length);
  }, []);

  // Return to previous edit
  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + ANIME_EDITS.length) % ANIME_EDITS.length);
  }, []);

  // Auto-advance sequentially when video finishes
  const handleVideoEnded = useCallback(() => {
    handleNext();
  }, [handleNext]);

  // When index changes, play the new video
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = 0;
    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        if (video) {
          video.muted = true;
          setIsMuted(true);
          video.play().catch(() => {});
        }
      });
    }
  }, [currentIndex]);

  const toggleSound = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  // Keyboard navigation: Enter = Go to Homepage, ArrowRight = Next, ArrowLeft = Prev, M = Mute
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        onEnter();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'm' || e.key === 'M') {
        if (videoRef.current) {
          const nextMuted = !videoRef.current.muted;
          videoRef.current.muted = nextMuted;
          setIsMuted(nextMuted);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onEnter, handleNext, handlePrev]);

  return (
    <div className="fixed inset-0 z-[99999] w-screen h-screen bg-black overflow-hidden select-none group/player">
      {/* ── Ambient Blurred Background (fills entire screen) ── */}
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

      {/* ── Foreground Video (Zoomed out slightly for full character/scene visibility) ── */}
      <div className="relative z-10 w-full h-full flex items-center justify-center overflow-hidden">
        <video
          ref={videoRef}
          key={currentEdit.id}
          src={currentEdit.src}
          autoPlay
          loop={false}
          muted={isMuted}
          playsInline
          onEnded={handleVideoEnded}
          className="w-full h-full object-cover scale-[0.88] sm:scale-[0.90] transition-transform duration-500 rounded-3xl shadow-2xl shadow-black/80"
        />
      </div>

      {/* ── Subtle Vignette at Bottom ── */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none z-10" />

      {/* ── Screen Edge Navigation Arrows (Left / Right) ── */}
      <button
        onClick={handlePrev}
        className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 z-20 p-2.5 sm:p-3 rounded-full bg-black/40 hover:bg-black/75 backdrop-blur-md border border-white/15 text-white/70 hover:text-white opacity-40 hover:opacity-100 group-hover/player:opacity-80 transition-all duration-200 hover:scale-110 active:scale-95 shadow-xl"
        title="Previous Edit (Left Arrow)"
        aria-label="Previous Edit"
      >
        <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>

      <button
        onClick={handleNext}
        className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 z-20 p-2.5 sm:p-3 rounded-full bg-black/40 hover:bg-black/75 backdrop-blur-md border border-white/15 text-white/70 hover:text-white opacity-40 hover:opacity-100 group-hover/player:opacity-80 transition-all duration-200 hover:scale-110 active:scale-95 shadow-xl"
        title="Next Edit (Right Arrow)"
        aria-label="Next Edit"
      >
        <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>

      {/* ── Side Controls (Bottom-Right) ── */}
      <div className="absolute bottom-6 right-6 sm:bottom-10 sm:right-10 z-20 flex items-center gap-2 sm:gap-2.5">
        {/* Compact Previous Arrow */}
        <button
          onClick={handlePrev}
          className="p-2 sm:p-2.5 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/20 text-white/80 hover:text-white opacity-75 hover:opacity-100 shadow-xl transition-all duration-200 hover:scale-105 active:scale-95"
          title="Previous Edit"
          aria-label="Previous Edit"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Compact Next Arrow */}
        <button
          onClick={handleNext}
          className="p-2 sm:p-2.5 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/20 text-white/80 hover:text-white opacity-75 hover:opacity-100 shadow-xl transition-all duration-200 hover:scale-105 active:scale-95"
          title="Next Edit"
          aria-label="Next Edit"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Compact Volume Button (Decreased size) */}
        <button
          onClick={toggleSound}
          className="p-2 sm:p-2.5 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/20 text-white opacity-75 hover:opacity-100 shadow-xl transition-all duration-200 hover:scale-105 active:scale-95"
          title={isMuted ? 'Unmute Audio (M)' : 'Mute Audio (M)'}
          aria-label="Toggle Sound"
        >
          {isMuted ? (
            <VolumeX className="w-4 h-4 text-pink-400" />
          ) : (
            <Volume2 className="w-4 h-4 text-emerald-400" />
          )}
        </button>

        {/* Go to Homepage Button (with Hover Opacity effect) */}
        <button
          onClick={onEnter}
          className="group flex items-center gap-2.5 px-5 sm:px-6 py-2.5 sm:py-3 rounded-full bg-white text-black font-extrabold text-xs tracking-wider uppercase shadow-2xl opacity-75 hover:opacity-100 border border-white/40 transition-all duration-300 hover:scale-105 active:scale-95 hover:shadow-purple-600/50 cursor-pointer"
        >
          <span>Go to Homepage</span>
          <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
        </button>
      </div>
    </div>
  );
}
