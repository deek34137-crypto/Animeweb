'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from '@/navigation';
import { 
  Play, Star, Calendar, Sparkles, Flame, Clock, 
  ChevronRight, Tv, Bookmark, Compass, Shuffle, Zap
} from 'lucide-react';
import { AnimeData } from '@/services/jikan';
import ResumeButton from './ResumeButton';
import FeelingLucky from './FeelingLucky';

interface DesktopSpotlightBentoProps {
  spotlightAnime?: AnimeData | null;
  airingSchedule?: AnimeData[];
  topPick?: AnimeData | null;
  continueWatching?: any | null;
  guestMode?: boolean;
}

export default function DesktopSpotlightBento({
  spotlightAnime,
  airingSchedule = [],
  topPick,
  continueWatching,
  guestMode = false,
}: DesktopSpotlightBentoProps) {
  const router = useRouter();

  if (!spotlightAnime && airingSchedule.length === 0) return null;

  const spotlight = spotlightAnime;
  const spotlightImage = spotlight 
    ? (spotlight.background || spotlight.images?.webp?.large_image_url || spotlight.images?.jpg?.large_image_url || '')
    : '';
  const spotlightTitle = spotlight ? (spotlight.title_english || spotlight.title) : 'Featured Anime';

  return (
    <div className="w-full space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white tracking-tight uppercase">
              Spotlight & Airing Radar
            </h2>
            <p className="text-xs text-white/50">
              Curated highlights, broadcast countdowns, and quick access
            </p>
          </div>
        </div>

        <Link
          href="/discover"
          className="group inline-flex items-center gap-1.5 text-xs font-bold text-purple-400 hover:text-purple-300 transition-colors"
        >
          <span>Explore Catalog</span>
          <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      {/* Bento Grid Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* ── CARD 1: Large Spotlight Showcase (Col 1-7) ── */}
        {spotlight && (
          <div className="lg:col-span-7 relative rounded-3xl overflow-hidden border border-white/10 bg-zinc-950/80 group shadow-2xl flex flex-col justify-end min-h-[420px] lg:min-h-[460px]">
            {/* Background Poster Image */}
            <div className="absolute inset-0 z-0">
              {spotlightImage ? (
                <Image
                  src={spotlightImage}
                  alt={spotlightTitle}
                  fill
                  priority
                  className="object-cover object-center group-hover:scale-105 transition-transform duration-700 filter brightness-75"
                  sizes="(max-width: 1024px) 100vw, 60vw"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-purple-950/60 to-zinc-950" />
              )}
              {/* Cinematic Vignette Overlays */}
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/70 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/90 via-zinc-950/40 to-transparent" />
            </div>

            {/* Content overlay */}
            <div className="relative z-10 p-6 sm:p-8 space-y-4">
              {/* Badges Row */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30 text-xs font-black uppercase tracking-wider backdrop-blur-md">
                  <Flame className="w-3.5 h-3.5 text-pink-400" />
                  #1 Trending Today
                </span>

                {spotlight.score && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold backdrop-blur-md">
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    {spotlight.score.toFixed(1)}
                  </span>
                )}

                {spotlight.type && (
                  <span className="px-2.5 py-1 rounded-full bg-white/10 text-white/80 border border-white/10 text-xs font-semibold backdrop-blur-md">
                    {spotlight.type}
                  </span>
                )}

                {spotlight.episodes && (
                  <span className="px-2.5 py-1 rounded-full bg-white/10 text-white/80 border border-white/10 text-xs font-semibold backdrop-blur-md">
                    {spotlight.episodes} Episodes
                  </span>
                )}
              </div>

              {/* Title */}
              <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight line-clamp-2">
                {spotlightTitle}
              </h3>

              {/* Synopsis snippet */}
              {spotlight.synopsis && (
                <p className="text-white/70 text-xs sm:text-sm line-clamp-2 sm:line-clamp-3 max-w-xl font-normal leading-relaxed">
                  {spotlight.synopsis}
                </p>
              )}

              {/* Genres */}
              {spotlight.genres && spotlight.genres.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {spotlight.genres.slice(0, 4).map((g) => (
                    <span 
                      key={g.name} 
                      className="text-[11px] font-semibold text-white/60 bg-black/40 border border-white/10 px-2 py-0.5 rounded-lg"
                    >
                      {g.name}
                    </span>
                  ))}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <Link
                  href={`/anime/${spotlight.mal_id}`}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-purple-900/40 hover:shadow-purple-700/50 hover:scale-105 active:scale-95 transition-all duration-200"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Watch Series</span>
                </Link>

                <Link
                  href={`/anime/${spotlight.mal_id}`}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 backdrop-blur-md text-white font-bold text-xs transition-all duration-200 hover:scale-105"
                >
                  <span>Details & Cast</span>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ── Right Column: Stacked Cards (Col 8-12) ── */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          
          {/* CARD 2: Airing Today Live Radar */}
          <div className="rounded-3xl border border-white/10 bg-zinc-950/60 backdrop-blur-xl p-5 sm:p-6 flex-1 flex flex-col justify-between shadow-xl">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
                    Airing Today Radar
                  </span>
                </div>
                <Link 
                  href="/schedule" 
                  className="text-[11px] font-bold text-white/50 hover:text-white transition-colors flex items-center gap-1"
                >
                  <span>Full Schedule</span>
                  <ChevronRight className="w-3 h-3" />
                </Link>
              </div>

              {/* Mini List of Today's Airing Anime */}
              <div className="space-y-2.5">
                {airingSchedule.slice(0, 3).map((item, idx) => {
                  const img = item.images?.webp?.small_image_url || item.images?.jpg?.small_image_url || '';
                  const title = item.title_english || item.title;
                  return (
                    <Link
                      key={item.mal_id || idx}
                      href={`/anime/${item.mal_id}`}
                      className="group flex items-center gap-3 p-2 rounded-2xl hover:bg-white/5 border border-transparent hover:border-white/10 transition-all duration-200"
                    >
                      <div className="relative w-12 h-14 rounded-xl overflow-hidden bg-zinc-800 flex-shrink-0">
                        {img && (
                          <Image
                            src={img}
                            alt={title}
                            fill
                            className="object-cover group-hover:scale-110 transition-transform duration-300"
                            sizes="48px"
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-white truncate group-hover:text-purple-300 transition-colors">
                          {title}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md border border-emerald-500/20 font-bold">
                            NEW EPISODE
                          </span>
                          {item.type && (
                            <span className="text-[10px] text-white/40 font-semibold">
                              {item.type}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="p-2 rounded-xl bg-white/5 text-white/40 group-hover:text-white group-hover:bg-purple-600 transition-all flex-shrink-0">
                        <Play className="w-3.5 h-3.5" />
                      </div>
                    </Link>
                  );
                })}

                {airingSchedule.length === 0 && (
                  <p className="text-xs text-white/40 py-4 text-center">
                    Check schedule for upcoming releases today.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* CARD 3: Quick Action & Stream Hub */}
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-purple-950/30 via-zinc-950 to-zinc-950 p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" />
                Quick Launch Hub
              </span>
              <span className="text-[10px] text-white/40 font-mono">
                DESKTOP EXCLUSIVE
              </span>
            </div>

            {/* If continue watching exists */}
            {continueWatching ? (
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-white/60">Resume Last Show</span>
                  <span className="text-[10px] font-mono text-purple-400 font-bold">
                    Ep {continueWatching.episodesWatched}
                  </span>
                </div>
                <h5 className="text-xs font-bold text-white truncate">
                  {continueWatching.animeTitle}
                </h5>
                <Link
                  href={`/watch/${continueWatching.animeId}/${continueWatching.episodesWatched}`}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md shadow-purple-900/30"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Continue Playing</span>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => {
                    const event = new KeyboardEvent('keydown', {
                      key: 'k',
                      ctrlKey: true,
                      bubbles: true,
                    });
                    window.dispatchEvent(event);
                  }}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-500/40 text-white transition-all text-center gap-1.5 group"
                >
                  <Compass className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold">Search (Ctrl+K)</span>
                  <span className="text-[10px] text-white/40">Find any show</span>
                </button>

                <FeelingLucky className="w-full h-full" />
              </div>
            )}

            {/* Quick Links Row */}
            <div className="flex items-center justify-between pt-1 text-[11px] font-semibold text-white/60">
              <Link href="/search?sort=trending" className="hover:text-purple-300 transition-colors flex items-center gap-1">
                <Flame className="w-3 h-3 text-pink-400" /> Trending
              </Link>
              <Link href="/discover" className="hover:text-purple-300 transition-colors flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-indigo-400" /> Discover
              </Link>
              <Link href="/genres" className="hover:text-purple-300 transition-colors flex items-center gap-1">
                <Tv className="w-3 h-3 text-cyan-400" /> All Genres
              </Link>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
