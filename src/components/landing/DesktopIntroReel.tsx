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
      {/* ── Ambient Blurred Background (Fills 100% of the screen seamlessly) ── */}
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

      {/* ── Foreground Video (Zoomed out to show full scene without cropping) ── */}
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
          onEnded={handleVideoEnded}
          className={`w-full h-full ${
            currentEdit.aspectRatio === '16:9' ? 'object-cover' : 'object-contain'
          }`}
        />
      </div>

      {/* ── Side Control: ONLY Go to Homepage Button with 50% Idle Opacity ── */}
      <div className="absolute bottom-8 right-8 sm:bottom-12 sm:right-12 z-20">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEnter();
          }}
          className="group flex items-center gap-3 px-6 sm:px-8 py-3.5 sm:py-4 rounded-full bg-white text-black font-black text-xs sm:text-sm tracking-wider uppercase shadow-2xl opacity-50 hover:opacity-100 border border-white/40 transition-all duration-300 hover:scale-105 active:scale-95 hover:shadow-purple-600/50 cursor-pointer"
        >
          <span>Go to Homepage</span>
          <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-300 group-hover:translate-x-1" />
        </button>
      </div>
    </div>
  );
}
