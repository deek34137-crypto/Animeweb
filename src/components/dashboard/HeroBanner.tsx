'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from '@/navigation';
import { Play, Star, Clock, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { AnimeData } from '@/services/jikan';
import { getEpisodeDisplay } from '@/lib/episode';

interface ContinueWatchingEntry {
  animeId: string;
  animeTitle: string;
  animeImage: string;
  animeEpisodes?: number | null;
  episodesWatched: number;
  percentageComplete?: number;
  remainingMinutes?: number;
  lastWatchedAt?: string;
}

interface HeroBannerProps {
  continueWatching?: ContinueWatchingEntry | null;
  trendingToday?: AnimeData | null;
  seasonSpotlight?: AnimeData | null;
  upcomingRelease?: AnimeData | null;
  editorsPick?: AnimeData | null;
  randomRec?: AnimeData | null;
  guestMode?: boolean;
}

interface SlideItem {
  id: string;
  malId: number | string;
  tagline: string;
  title: string;
  banner: string;
  synopsis: string | null;
  score: number | null;
  episodes: number | null;
  type: string;
  ctaText: string;
  ctaUrl: string;
  isContinue?: boolean;
  extra?: ContinueWatchingEntry;
}

export default function HeroBanner({
  continueWatching,
  trendingToday,
  seasonSpotlight,
  upcomingRelease,
  editorsPick,
  randomRec,
  guestMode = false,
}: HeroBannerProps) {
  const router = useRouter();
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides: SlideItem[] = [];

  // 1. Add Continue Watching if available
  if (continueWatching) {
    slides.push({
      id: 'continue',
      malId: continueWatching.animeId,
      tagline: 'Continue Watching',
      title: continueWatching.animeTitle,
      banner: continueWatching.animeImage,
      synopsis: null,
      score: null,
      episodes: continueWatching.animeEpisodes || null,
      type: 'TV Series',
      ctaText: 'Continue &rarr;',
      ctaUrl: `/watch/${continueWatching.animeId}/${continueWatching.episodesWatched}`,
      isContinue: true,
      extra: continueWatching,
    });
  }

  // 2. Add Trending Today
  if (trendingToday) {
    slides.push({
      id: 'trending',
      malId: trendingToday.mal_id,
      tagline: 'Trending Today',
      title: trendingToday.title_english || trendingToday.title,
      banner: trendingToday.background || trendingToday.images.webp.large_image_url || trendingToday.images.jpg.large_image_url,
      synopsis: trendingToday.synopsis,
      score: trendingToday.score,
      episodes: trendingToday.episodes,
      type: trendingToday.type || 'TV',
      ctaText: 'Watch Now',
      ctaUrl: `/anime/${trendingToday.mal_id}`,
    });
  }

  // 3. Add Season Spotlight
  if (seasonSpotlight) {
    slides.push({
      id: 'season',
      malId: seasonSpotlight.mal_id,
      tagline: 'Season Spotlight',
      title: seasonSpotlight.title_english || seasonSpotlight.title,
      banner: seasonSpotlight.background || seasonSpotlight.images.webp.large_image_url || seasonSpotlight.images.jpg.large_image_url,
      synopsis: seasonSpotlight.synopsis,
      score: seasonSpotlight.score,
      episodes: seasonSpotlight.episodes,
      type: seasonSpotlight.type || 'TV',
      ctaText: 'Watch Now',
      ctaUrl: `/anime/${seasonSpotlight.mal_id}`,
    });
  }

  // 4. Add Upcoming Release highlight
  if (upcomingRelease) {
    slides.push({
      id: 'upcoming',
      malId: upcomingRelease.mal_id,
      tagline: 'Upcoming Release',
      title: upcomingRelease.title_english || upcomingRelease.title,
      banner: upcomingRelease.background || upcomingRelease.images.webp.large_image_url || upcomingRelease.images.jpg.large_image_url,
      synopsis: upcomingRelease.synopsis,
      score: upcomingRelease.score,
      episodes: upcomingRelease.episodes,
      type: upcomingRelease.type || 'TV',
      ctaText: 'Pre-register / View',
      ctaUrl: `/anime/${upcomingRelease.mal_id}`,
    });
  }

  // 5. Add Editor's Pick
  if (editorsPick) {
    slides.push({
      id: 'editors-pick',
      malId: editorsPick.mal_id,
      tagline: "Editor's Pick",
      title: editorsPick.title_english || editorsPick.title,
      banner: editorsPick.background || editorsPick.images.webp.large_image_url || editorsPick.images.jpg.large_image_url,
      synopsis: editorsPick.synopsis,
      score: editorsPick.score,
      episodes: editorsPick.episodes,
      type: editorsPick.type || 'TV',
      ctaText: 'Explore',
      ctaUrl: `/anime/${editorsPick.mal_id}`,
    });
  }

  // 6. Add Random Recommendation
  if (randomRec) {
    slides.push({
      id: 'recommendation',
      malId: randomRec.mal_id,
      tagline: 'Random Recommendation',
      title: randomRec.title_english || randomRec.title,
      banner: randomRec.background || randomRec.images.webp.large_image_url || randomRec.images.jpg.large_image_url,
      synopsis: randomRec.synopsis,
      score: randomRec.score,
      episodes: randomRec.episodes,
      type: randomRec.type || 'TV',
      ctaText: 'Check It Out',
      ctaUrl: `/anime/${randomRec.mal_id}`,
    });
  }

  // Auto-advance slides every 7 seconds
  useEffect(() => {
    if (slides.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 7000);
    return () => clearInterval(interval);
  }, [slides.length]);

  if (slides.length === 0) return null;

  const current = slides[currentSlide];

  const handlePrev = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const handleNext = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  return (
    <div className="relative overflow-hidden rounded-3xl aspect-[16/7.2] sm:aspect-[21/8] min-h-[250px] sm:min-h-[310px] border border-border-subtle bg-bg-secondary shadow-xl transition-all duration-300 group">
      {/* Background Media */}
      <div className="absolute inset-0 z-0 select-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current.banner}
          alt=""
          aria-hidden="true"
          className="w-full h-full object-cover blur-2xl opacity-15 scale-110 pointer-events-none"
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current.banner}
          alt={current.title}
          className="absolute inset-0 w-full h-full object-cover opacity-35 transition-opacity duration-500 ease-out animate-hero-zoom"
          key={current.id}
          referrerPolicy="no-referrer"
        />
        {/* Cinematic gradients */}
        <div className="absolute inset-0 bg-gradient-to-r from-bg-secondary via-bg-secondary/75 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg-secondary via-transparent to-transparent" />
      </div>

      {/* Slide Content */}
      <div
        key={current.id}
        className="relative z-10 flex flex-col justify-end h-full p-5 sm:p-8 max-w-2xl space-y-3 animate-hero-text"
      >
        {/* Tagline */}
        <div className="space-y-1">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-widest ${
              current.isContinue
                ? 'bg-accent-pink/15 text-accent-pink'
                : 'bg-accent-violet/10 border border-accent-violet/20 text-[#7c3aed]'
            }`}
          >
            {current.tagline}
          </span>
          <h1 className="text-xl sm:text-3xl md:text-4xl font-black text-text-primary tracking-tight font-display line-clamp-1 leading-tight">
            {current.title}
          </h1>
        </div>

        {/* Synopsis / Watch Progress */}
        {current.isContinue && current.extra ? (
          /* Continue Watching Progress detail view */
          <div className="space-y-3 max-w-md">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-secondary font-medium">
              <span>Episode {current.extra.episodesWatched} {current.episodes ? `/ ${current.episodes}` : ''}</span>
              {current.extra.lastWatchedAt && (
                <span className="text-text-muted">Watched {current.extra.lastWatchedAt}</span>
              )}
              {current.extra.remainingMinutes && current.extra.remainingMinutes > 0 ? (
                <span className="text-accent-cyan font-bold">{current.extra.remainingMinutes}m remaining</span>
              ) : null}
            </div>

            <div className="w-full space-y-1.5">
              <div className="h-1.5 bg-bg-elevated rounded-full overflow-hidden border border-border-subtle">
                <div
                  className="h-full bg-gradient-to-r from-[#7c3aed] to-[#ec4899] rounded-full shadow-[0_0_8px_rgba(124,91,255,0.6)] transition-all duration-500"
                  style={{ width: `${current.extra.percentageComplete || 0}%` }}
                />
              </div>
              {current.episodes && current.extra.episodesWatched + 1 <= current.episodes && (
                <p className="text-[10px] text-text-muted font-bold">Next: Episode {current.extra.episodesWatched + 1}</p>
              )}
            </div>
          </div>
        ) : (
          /* Standard Anime details view */
          <>
            {current.synopsis && (
              <p className="text-xs sm:text-sm text-text-secondary leading-relaxed line-clamp-2 md:line-clamp-3 lg:line-clamp-4">
                {current.synopsis}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-secondary font-medium">
              {current.score && (
                <span className="flex items-center gap-1 text-accent-gold font-bold">
                  <Star size={12} fill="currentColor" /> {current.score.toFixed(1)}
                </span>
              )}
              <span className="uppercase tracking-wider font-extrabold text-[10px]">{current.type}</span>
              {current.episodes && (
                <span className="flex items-center gap-1">
                  <Clock size={11} /> {getEpisodeDisplay({ title: current.title, episodes: current.episodes, malId: current.malId })}
                </span>
              )}
            </div>
          </>
        )}

        {/* CTA Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push(current.ctaUrl as '/')}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-accent-violet text-white font-bold text-xs hover:bg-[#6b4ae6] transition-all duration-200 hover:-translate-y-px shadow-[0_0_20px_rgba(124,91,255,0.3)] hover:shadow-[0_0_28px_rgba(124,91,255,0.5)]"
          >
            <Play size={11} fill="white" />
            <span dangerouslySetInnerHTML={{ __html: current.ctaText }} />
          </button>
          {!current.isContinue && (
            <button
              onClick={() => router.push(current.ctaUrl as '/')}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-bg-elevated/70 border border-border-subtle hover:border-text-secondary/20 text-text-primary font-bold text-xs hover:bg-bg-elevated transition-all duration-200 hover:-translate-y-px backdrop-blur-md"
            >
              <Info size={12} />
              <span>More Info</span>
            </button>
          )}
        </div>
      </div>

      {/* Manual Slide Navigation Controls */}
      {slides.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-bg-secondary/40 backdrop-blur-md border border-border-subtle flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-bg-elevated/80 transition-all opacity-0 group-hover:opacity-100"
            aria-label="Previous Slide"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-bg-secondary/40 backdrop-blur-md border border-border-subtle flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-bg-elevated/80 transition-all opacity-0 group-hover:opacity-100"
            aria-label="Next Slide"
          >
            <ChevronRight size={16} />
          </button>

          {/* Slider dots */}
          <div className="absolute bottom-4 right-6 z-20 flex items-center gap-1">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                  currentSlide === idx ? 'bg-accent-violet w-4 shadow-[0_0_8px_rgba(124,91,255,0.6)]' : 'bg-text-disabled hover:bg-text-muted'
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
