'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowRight } from 'lucide-react';
import { ANIME_EDITS } from '@/lib/edits/manifest';

interface DesktopIntroReelProps {
  onEnter: () => void;
}

export default function DesktopIntroReel({ onEnter }: DesktopIntroReelProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  const currentEdit = ANIME_EDITS[currentIndex];
  const nextIndex = (currentIndex + 1) % ANIME_EDITS.length;
  const nextEdit = ANIME_EDITS[nextIndex];

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

  // Click anywhere on video to toggle sound
  const toggleSound = () => {
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
        toggleSound();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onEnter, handleNext, handlePrev, isMuted]);

  return (
    <div className="fixed inset-0 z-[99999] w-screen h-screen bg-black overflow-hidden select-none">
      {/* ── Ambient Background Blur (Only active for non-16:9 aspect ratios for maximum 60fps performance) ── */}
      {currentEdit.aspectRatio !== '16:9' && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40 scale-110 filter blur-3xl">
          <video
            key={`ambient-${currentEdit.id}`}
            src={currentEdit.src}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* ── Foreground Video (Native GPU Accelerated Video Playback) ── */}
      <div 
        onClick={toggleSound}
        className="relative z-10 w-full h-full flex items-center justify-center cursor-pointer"
        title="Click to toggle audio"
      >
        <video
          ref={videoRef}
          key={currentEdit.id}
          src={currentEdit.src}
          autoPlay
          loop={false}
          muted={isMuted}
          playsInline
          preload="auto"
          onEnded={handleVideoEnded}
          className={`w-full h-full ${
            currentEdit.aspectRatio === '16:9' ? 'object-cover' : 'object-contain'
          }`}
        />
      </div>

      {/* ── Silent Background Buffer for NEXT Video (0ms switch latency) ── */}
      <video
        key={`preload-${nextEdit.id}`}
        src={nextEdit.src}
        preload="auto"
        muted
        playsInline
        className="hidden"
        aria-hidden="true"
      />

      {/* ── Corner Control: Small compact button at bottom-right corner ── */}
      <div className="absolute bottom-5 right-5 sm:bottom-6 sm:right-6 z-20">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEnter();
          }}
          className="group flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white text-black font-bold text-[11px] tracking-wide shadow-lg opacity-50 hover:opacity-100 border border-white/30 transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-sm"
          title="Go to Homepage"
        >
          <span>Homepage</span>
          <ArrowRight className="w-3 h-3 transition-transform duration-200 group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  );
}
