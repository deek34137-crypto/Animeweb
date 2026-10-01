'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Volume2, VolumeX, ArrowRight } from 'lucide-react';
import { ANIME_EDITS } from '@/lib/edits/manifest';

interface DesktopIntroReelProps {
  onEnter: () => void;
}

export default function DesktopIntroReel({ onEnter }: DesktopIntroReelProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  const currentEdit = ANIME_EDITS[currentIndex];

  // Auto-advance sequentially when a video ends: video 1 -> video 2 -> video 3 -> ...
  const handleVideoEnded = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % ANIME_EDITS.length);
  }, []);

  // When index changes, play the new video
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = 0;
    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Fallback to muted playback if autoplay policy triggers
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

  // Keyboard shortcut: Enter = Go to Main Page, M = Toggle Mute
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        onEnter();
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
  }, [onEnter]);

  return (
    <div className="fixed inset-0 z-[99999] w-screen h-screen bg-black overflow-hidden select-none">
      {/* ── Video Playing All Over The Screen (Edge-to-Edge) ── */}
      <video
        ref={videoRef}
        key={currentEdit.id}
        src={currentEdit.src}
        autoPlay
        loop={false}
        muted={isMuted}
        playsInline
        onEnded={handleVideoEnded}
        className="w-full h-full object-cover"
      />

      {/* ── Subtle Vignette at Bottom-Right for Button Readability ── */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

      {/* ── Side Controls: ONLY "Go to Main Page" and Audio Toggle ── */}
      <div className="absolute bottom-8 right-8 sm:bottom-12 sm:right-12 z-20 flex items-center gap-3">
        {/* Sound Toggle */}
        <button
          onClick={toggleSound}
          className="p-3.5 sm:p-4 rounded-2xl bg-black/60 hover:bg-black/80 backdrop-blur-xl border border-white/20 text-white shadow-2xl transition-all duration-200 hover:scale-105 active:scale-95"
          title={isMuted ? 'Unmute Audio (M)' : 'Mute Audio (M)'}
          aria-label="Toggle Sound"
        >
          {isMuted ? (
            <VolumeX className="w-5 h-5 sm:w-6 sm:h-6 text-pink-400" />
          ) : (
            <Volume2 className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />
          )}
        </button>

        {/* Go to Main Page Button */}
        <button
          onClick={onEnter}
          className="group flex items-center gap-3 px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl bg-white hover:bg-purple-50 text-black font-black text-xs sm:text-sm tracking-wider uppercase shadow-2xl shadow-purple-950/50 border border-white/40 transition-all duration-300 hover:scale-105 active:scale-95 hover:shadow-purple-600/50"
        >
          <span>Go to Main Page</span>
          <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-300 group-hover:translate-x-1" />
        </button>
      </div>
    </div>
  );
}
