'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { 
  Play, Pause, Volume2, VolumeX, Sparkles, Flame, Star, 
  ChevronRight, ChevronLeft, ShieldCheck, Zap, Compass, Film,
  Layers, Disc3
} from 'lucide-react';
import { ANIME_EDITS, AnimeEditReel } from '@/lib/edits/manifest';

interface CinematicEditHeroProps {
  trendingAnime?: Array<{
    mal_id: number;
    title: string;
    title_english?: string | null;
    images?: any;
    score?: number | null;
    episodes?: number | null;
    genres?: Array<{ name: string }>;
  }>;
}

export default function CinematicEditHero({ trendingAnime = [] }: CinematicEditHeroProps) {
  const [currentEditIndex, setCurrentEditIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  const currentEdit = ANIME_EDITS[currentEditIndex];

  // Auto-switch edit on end
  const handleVideoEnded = useCallback(() => {
    setCurrentEditIndex((prev) => (prev + 1) % ANIME_EDITS.length);
  }, []);

  // Update progress bar
  const handleTimeUpdate = () => {
    if (videoRef.current && videoRef.current.duration) {
      setProgress((videoRef.current.currentTime / videoRef.current.duration) * 100);
    }
  };

  // Play video on index change
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {
        if (videoRef.current) {
          videoRef.current.muted = true;
          setIsMuted(true);
          videoRef.current.play().catch(() => {});
        }
      });
    }
  }, [currentEditIndex]);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggleSound = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  const nextEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentEditIndex((prev) => (prev + 1) % ANIME_EDITS.length);
  };

  const prevEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentEditIndex((prev) => (prev - 1 + ANIME_EDITS.length) % ANIME_EDITS.length);
  };

  return (
    <section 
      className="relative w-full rounded-3xl overflow-hidden bg-zinc-950 border border-white/10 shadow-2xl shadow-purple-950/30 group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* ── Background Blurred Glow ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40 filter blur-3xl scale-110">
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

      {/* ── Dark Cinema Gradients ── */}
      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/70 to-zinc-950/30 pointer-events-none z-10" />
      <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/80 to-transparent pointer-events-none z-10" />

      {/* ── Main Layout (Widescreen 16:9 Cinema Container) ── */}
      <div className="relative z-20 grid grid-cols-1 lg:grid-cols-12 min-h-[580px] lg:min-h-[640px] items-center p-6 sm:p-10 lg:p-14 gap-8">
        
        {/* Left Column: Brand & Anime Showcase */}
        <div className="lg:col-span-7 flex flex-col justify-center space-y-6">
          {/* Top Chips */}
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-black uppercase tracking-wider backdrop-blur-md animate-pulse">
              <Flame className="w-3.5 h-3.5 text-pink-400" />
              Live Anime Reel #{currentEditIndex + 1}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white/80 border border-white/15 text-xs font-semibold backdrop-blur-md">
              <Disc3 className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
              Auto-Playing High Bitrate Edits
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold">
              <Zap className="w-3 h-3" /> 4K Ultra HD
            </span>
          </div>

          {/* Heading */}
          <div className="space-y-2">
            <p className="text-sm font-bold tracking-widest uppercase text-pink-400/90 font-mono">
              FEATURED EDIT &bull; {currentEdit.anime}
            </p>
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-none text-balance">
              {currentEdit.title}
            </h1>
          </div>

          {/* Description */}
          <p className="text-white/70 text-sm sm:text-base leading-relaxed max-w-xl font-normal">
            Immerse yourself in high-energy fan creations, legendary showdowns, and cinematic animations. 
            Stream full seasons in pristine quality with zero intrusive popups.
          </p>

          {/* Action Row */}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Link
              href="/discover"
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-black text-sm tracking-wide shadow-xl shadow-purple-900/50 hover:shadow-purple-700/60 transition-all duration-300 hover:scale-105 active:scale-95 flex items-center gap-2.5 group/btn"
            >
              <span>EXPLORE ALL SHOWS</span>
              <Compass className="w-4 h-4 group-hover/btn:rotate-45 transition-transform duration-300" />
            </Link>

            <button
              onClick={toggleSound}
              className="flex items-center gap-2 px-5 py-4 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 backdrop-blur-md text-white font-bold text-sm transition-all duration-200 hover:scale-105 active:scale-95"
            >
              {isMuted ? (
                <>
                  <VolumeX className="w-4 h-4 text-pink-400" />
                  <span>Unmute Audio</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4 text-emerald-400" />
                  <span>Sound Active</span>
                </>
              )}
            </button>
          </div>

          {/* Mini Reel Selector Row */}
          <div className="pt-4 flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            {ANIME_EDITS.slice(0, 8).map((edit, idx) => (
              <button
                key={edit.id}
                onClick={() => setCurrentEditIndex(idx)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 border ${
                  idx === currentEditIndex
                    ? 'bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-600/40 scale-105'
                    : 'bg-white/5 text-white/60 hover:text-white border-white/10 hover:bg-white/10'
                }`}
              >
                #{idx + 1} {edit.anime.split(':')[0].split(' ')[0]}
              </button>
            ))}
            <span className="text-xs text-white/40 pl-1 font-mono">+{ANIME_EDITS.length - 8} more</span>
          </div>
        </div>

        {/* Right Column: Live Playing 9:16 Cinema Reel Stage */}
        <div className="lg:col-span-5 flex justify-center lg:justify-end">
          <div className="relative w-[280px] sm:w-[320px] aspect-[9/16] rounded-3xl overflow-hidden bg-black/90 border border-white/20 shadow-2xl shadow-purple-900/40 group/player">
            {/* Active Video Reel */}
            <video
              ref={videoRef}
              key={currentEdit.id}
              src={currentEdit.src}
              autoPlay
              loop={false}
              muted={isMuted}
              playsInline
              onEnded={handleVideoEnded}
              onTimeUpdate={handleTimeUpdate}
              className="w-full h-full object-cover"
            />

            {/* Click to Pause/Play Overlay */}
            <div 
              onClick={togglePlay}
              className="absolute inset-0 bg-black/30 opacity-0 group-hover/player:opacity-100 transition-opacity duration-200 flex items-center justify-center cursor-pointer"
            >
              <div className="w-14 h-14 rounded-full bg-black/70 backdrop-blur-md border border-white/30 text-white flex items-center justify-center shadow-xl hover:scale-110 transition-transform">
                {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
              </div>
            </div>

            {/* Bottom Progress Bar */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
              <div 
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-100" 
                style={{ width: `${progress}%` }} 
              />
            </div>

            {/* In-Frame Navigation Arrows */}
            <button
              onClick={prevEdit}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/20 text-white opacity-0 group-hover/player:opacity-100 transition-all duration-200 hover:scale-110"
              title="Previous Reel"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={nextEdit}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/20 text-white opacity-0 group-hover/player:opacity-100 transition-all duration-200 hover:scale-110"
              title="Next Reel"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* In-Frame Badges */}
            <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between pointer-events-none">
              <span className="px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-[11px] font-bold text-pink-300">
                {currentEdit.anime}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-[10px] font-mono text-white/80">
                {currentEditIndex + 1}/{ANIME_EDITS.length}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
