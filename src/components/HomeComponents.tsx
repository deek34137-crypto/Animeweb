'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Play, Plus, Info, ChevronLeft, ChevronRight, Flame, Star, Sparkles, Clock } from 'lucide-react';
import { Link } from '@/navigation';
import { AnimeData } from '@/services/jikan';
import Badge from '@/components/ui/Badge';

interface HeroSpotlightProps {
  items: AnimeData[];
}

export default function HeroSpotlight({ items }: HeroSpotlightProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const goTo = useCallback(
    (index: number) => {
      if (isTransitioning || index === currentIndex) return;
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIndex(index);
        setIsTransitioning(false);
      }, 300);
    },
    [currentIndex, isTransitioning]
  );

  const next = useCallback(() => goTo((currentIndex + 1) % items.length), [currentIndex, goTo, items.length]);
  const prev = useCallback(() => goTo((currentIndex - 1 + items.length) % items.length), [currentIndex, goTo, items.length]);

  // Auto-advance every 7 seconds
  useEffect(() => {
    if (items.length <= 1) return;
    const t = setTimeout(next, 7000);
    return () => clearTimeout(t);
  }, [currentIndex, next, items.length]);

  if (!items.length) return null;

  const anime = items[currentIndex];
  const title = anime.title_english || anime.title;
  const synopsis = anime.synopsis
    ? anime.synopsis.split('\n')[0].slice(0, 200) + (anime.synopsis.length > 200 ? '...' : '')
    : '';
  const genres = anime.genres?.slice(0, 3) || [];

  return (
    <section className="relative w-full rounded-2xl overflow-hidden aspect-[4/3] sm:aspect-[16/9] lg:aspect-[21/9] min-h-[340px] sm:min-h-[400px]">
      {/* Background Image with Ken Burns */}
      <div
        key={`bg-${currentIndex}`}
        className={`absolute inset-0 transition-opacity duration-500 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={anime.images.webp.large_image_url || anime.images.jpg.large_image_url}
          alt={title}
          className="w-full h-full object-cover ken-burns"
          referrerPolicy="no-referrer"
        />
        {/* Multi-layer gradients for cinematic depth */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#05050A] via-[#05050A]/75 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#05050A] via-transparent to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#05050A]/30 to-transparent" />
      </div>

      {/* Content */}
      <div
        key={`content-${currentIndex}`}
        className={`relative z-10 flex flex-col justify-end h-full p-4 sm:p-10 lg:p-14 max-w-3xl transition-all duration-500 ${
          isTransitioning ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
        }`}
      >
        {/* Rank badge */}
        <div className="flex items-center gap-2 mb-2 sm:mb-3">
          <Badge variant="violet" size="xs">
            <Flame size={9} />
            #{currentIndex + 1} Trending
          </Badge>
          {genres.slice(0, 2).map((g) => (
            <Badge key={g.mal_id} variant="ghost" size="xs">
              {g.name}
            </Badge>
          ))}
        </div>

        {/* Title */}
        <h1 className="text-xl sm:text-3xl md:text-5xl font-black text-white leading-tight tracking-tight font-display mb-2 sm:mb-3">
          {title}
        </h1>

        {/* Meta bar */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 mb-3 sm:mb-4 text-xs sm:text-sm text-text-secondary">
          {anime.score && (
            <span className="flex items-center gap-1 text-accent-gold font-bold">
              <Star size={13} fill="currentColor" />
              {anime.score.toFixed(1)}
            </span>
          )}
          {anime.type && <span className="font-medium">{anime.type}</span>}
          {anime.episodes && (
            <span className="flex items-center gap-1">
              <Clock size={11} />
              {anime.episodes} Eps
            </span>
          )}
          {anime.year && <span>{anime.year}</span>}
        </div>

        {/* Synopsis - hidden on mobile for cleaner look */}
        <p className="hidden sm:block text-sm md:text-base text-text-secondary leading-relaxed line-clamp-2 md:line-clamp-3 mb-6 max-w-2xl">
          {synopsis}
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <Link
            href={`/anime/${anime.mal_id}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 sm:px-6 sm:py-3 rounded-xl bg-accent-violet text-white font-bold text-xs sm:text-sm shadow-[0_0_24px_rgba(124,91,255,0.4)] hover:shadow-[0_0_36px_rgba(124,91,255,0.6)] hover:bg-[#6b4ae6] transition-all duration-200 hover:-translate-y-px"
          >
            <Play size={14} fill="currentColor" />
            View Details
          </Link>
          <Link
            href={`/anime/${anime.mal_id}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 sm:px-6 sm:py-3 rounded-xl bg-[rgba(255,255,255,0.08)] backdrop-blur-md border border-[rgba(255,255,255,0.12)] text-white font-semibold text-xs sm:text-sm hover:bg-[rgba(255,255,255,0.14)] transition-all duration-200 hover:-translate-y-px"
          >
            <Info size={14} />
            More Info
          </Link>
        </div>
      </div>

      {/* Navigation Controls - hidden on mobile to avoid overlapping content */}
      {items.length > 1 && (
        <>
          <button
            onClick={prev}
            className="hidden sm:flex absolute left-4 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-[rgba(5,5,10,0.6)] backdrop-blur-md border border-border-subtle items-center justify-center text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-all duration-200"
            aria-label="Previous"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={next}
            className="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-[rgba(5,5,10,0.6)] backdrop-blur-md border border-border-subtle items-center justify-center text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-all duration-200"
            aria-label="Next"
          >
            <ChevronRight size={18} />
          </button>

          {/* Dot indicators */}
          <div className="absolute bottom-4 sm:bottom-5 right-4 sm:right-6 z-20 flex items-center gap-1 sm:gap-1.5">
            {items.slice(0, 8).map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={`h-1 sm:h-1.5 rounded-full transition-all duration-300 ${
                  i === currentIndex
                    ? 'bg-accent-violet w-4 sm:w-5 shadow-[0_0_8px_rgba(124,91,255,0.8)]'
                    : 'bg-text-disabled w-1 sm:w-1.5 hover:bg-text-muted'
                }`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section Header
// ─────────────────────────────────────────────────────────────────────────────

interface SectionHeaderProps {
  title: string;
  icon: React.ReactNode;
  viewAllHref?: string;
}

export function SectionHeader({ title, icon, viewAllHref }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
      <h2 className="flex items-center gap-2.5 text-xl md:text-2xl font-black text-text-primary font-display tracking-tight">
        <span className="text-accent-violet">{icon}</span>
        {title}
      </h2>
      {viewAllHref && (
        <Link
          href={viewAllHref as '/'}
          className="text-xs font-semibold text-text-muted hover:text-accent-violet transition-colors duration-200 flex items-center gap-1"
        >
          View all
          <ChevronRight size={12} />
        </Link>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Continue Watching Rail
// ─────────────────────────────────────────────────────────────────────────────

interface ContinueWatchingEntry {
  animeId: string;
  animeTitle: string;
  animeImage: string;
  animeEpisodes?: number | null;
  episodesWatched: number;
}

interface ContinueWatchingRailProps {
  entries: ContinueWatchingEntry[];
}

export function ContinueWatchingRail({ entries }: ContinueWatchingRailProps) {
  if (!entries.length) return null;

  return (
    <section className="space-y-3">
      <SectionHeader
        title="Continue Watching"
        icon={<Play size={20} />}
        viewAllHref="/profile"
      />
      <div className="flex gap-3 overflow-x-auto rail-scroll pb-2">
        {entries.map((entry) => {
          const pct = entry.animeEpisodes
            ? Math.round((entry.episodesWatched / entry.animeEpisodes) * 100)
            : null;

          return (
            <Link
              key={entry.animeId}
              href={`/anime/${entry.animeId}` as '/'}
              className="flex-shrink-0 w-36 group"
            >
              <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-surface-2 border border-border-subtle group-hover:border-accent-violet/40 transition-colors duration-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={entry.animeImage}
                  alt={entry.animeTitle}
                  className="w-full h-full object-cover group-hover:scale-[1.05] transition-transform duration-300"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#05050A] via-transparent to-transparent" />

                {/* Episode progress pill */}
                <div className="absolute bottom-2 left-2 right-2">
                  {pct !== null && (
                    <div className="h-1 bg-[rgba(255,255,255,0.15)] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent-violet rounded-full shadow-[0_0_4px_rgba(124,91,255,0.7)]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* Play overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <div className="w-10 h-10 rounded-full bg-accent-violet/80 backdrop-blur-sm flex items-center justify-center">
                    <Play size={16} fill="white" className="text-white ml-0.5" />
                  </div>
                </div>
              </div>

              <div className="mt-2 px-0.5">
                <p className="text-xs font-semibold text-text-primary line-clamp-1 group-hover:text-accent-violet transition-colors">
                  {entry.animeTitle}
                </p>
                <p className="text-[10px] text-text-muted mt-0.5">
                  Ep {entry.episodesWatched}
                  {entry.animeEpisodes ? ` / ${entry.animeEpisodes}` : ''}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section icons export
// ─────────────────────────────────────────────────────────────────────────────
export { Flame, Star, Sparkles };
