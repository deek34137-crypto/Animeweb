import React from 'react';
import { getTranslations } from 'next-intl/server';
import { JikanAPI } from '@/services/jikan';
import AnimeCard from '@/components/AnimeCard';
import { Play, Plus, Flame, Star, Sparkles } from 'lucide-react';
import { Link } from '@/navigation';

export const revalidate = 3600; // Revalidate page cache every hour

export default async function HomePage() {
  const t = await getTranslations('Homepage');

  // Concurrent server-side fetching
  const [trendingRes, topRatedRes, seasonalRes] = await Promise.all([
    JikanAPI.getTrendingAnime(1),
    JikanAPI.getTopRatedAnime(1),
    JikanAPI.getSeasonalAnime(1)
  ]);

  const trendingAnime = trendingRes.data || [];
  const topRatedAnime = topRatedRes.data || [];
  const seasonalAnime = seasonalRes.data || [];

  // Pick the absolute top trending anime as the Hero Spotlight!
  const heroAnime = trendingAnime[0] || null;
  const heroTitle = heroAnime ? (heroAnime.title_english || heroAnime.title) : '';
  const heroSynopsis = heroAnime?.synopsis
    ? heroAnime.synopsis.split('\n')[0].slice(0, 220) + '...'
    : '';

  return (
    <div className="space-y-12 pb-16">
      {/* Featured Hero Banner Section */}
      {heroAnime && (
        <div className="relative rounded-2xl overflow-hidden border border-anime-border/40 bg-anime-card">
          <div className="absolute inset-0 aspect-[16/7] md:aspect-[21/9]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heroAnime.images.webp.large_image_url || heroAnime.images.jpg.large_image_url}
              alt={heroTitle}
              className="w-full h-full object-cover scale-105 filter blur-[2px] brightness-[0.3]"
            />
            {/* Linear background overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
          </div>

          <div className="relative z-10 p-6 md:p-12 lg:p-16 max-w-2xl flex flex-col justify-center h-full min-h-[340px] md:min-h-[460px]">
            {/* Badge Indicator */}
            <div className="inline-flex items-center space-x-1.5 bg-anime-orange/15 text-anime-orange text-xs font-bold px-3 py-1 rounded-full w-fit mb-4">
              <Flame size={12} fill="currentColor" />
              <span>#1 TRENDING SPOTLIGHT</span>
            </div>

            <h1 className="text-3xl md:text-5xl font-black text-white leading-tight font-sans tracking-tight">
              {heroTitle}
            </h1>

            {/* Micro details bar */}
            <div className="flex items-center space-x-4 mt-3 text-xs text-anime-muted">
              <span className="flex items-center text-anime-orange font-bold">
                <Star size={13} fill="currentColor" className="mr-1 text-anime-orange" />
                {heroAnime.score?.toFixed(1) || 'N/A'}
              </span>
              <span>{heroAnime.type}</span>
              <span>{heroAnime.episodes} Episodes</span>
              <span>{heroAnime.status}</span>
            </div>

            <p className="text-sm md:text-base text-gray-300 mt-4 leading-relaxed line-clamp-3">
              {heroSynopsis}
            </p>

            {/* Hero Action Buttons */}
            <div className="flex flex-wrap gap-4 mt-8">
              <Link
                href={`/anime/${heroAnime.mal_id}`}
                className="inline-flex items-center justify-center space-x-2 bg-anime-orange hover:bg-anime-orangeHover text-black font-extrabold text-sm px-6 py-3 rounded-full shadow-lg hover:shadow-orange-500/20 transition-all duration-300 transform hover:-translate-y-0.5"
              >
                <Play size={16} fill="currentColor" />
                <span>{t('watchNow')}</span>
              </Link>
              <button
                className="inline-flex items-center justify-center space-x-2 bg-transparent border border-gray-400 hover:border-anime-orange text-gray-200 hover:text-anime-orange text-sm font-semibold px-6 py-3 rounded-full transition-all duration-300"
              >
                <Plus size={16} />
                <span>{t('addToList')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grid Categories */}
      {/* 1. Trending Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-anime-border/40 pb-2">
          <h2 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center space-x-2">
            <Flame size={20} className="text-anime-orange" />
            <span>{t('trending')}</span>
          </h2>
          <Link
            href="/search"
            className="text-xs font-semibold text-anime-orange hover:text-anime-orangeHover transition-colors"
          >
            {t('viewAll')}
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {trendingAnime.slice(0, 12).map((anime) => (
            <AnimeCard key={anime.mal_id} anime={anime} />
          ))}
        </div>
      </section>

      {/* 2. Seasonal Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-anime-border/40 pb-2">
          <h2 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center space-x-2">
            <Sparkles size={20} className="text-anime-orange" />
            <span>{t('seasonal')}</span>
          </h2>
          <Link
            href="/search"
            className="text-xs font-semibold text-anime-orange hover:text-anime-orangeHover transition-colors"
          >
            {t('viewAll')}
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {seasonalAnime.slice(0, 12).map((anime) => (
            <AnimeCard key={anime.mal_id} anime={anime} />
          ))}
        </div>
      </section>

      {/* 3. Top Rated Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-anime-border/40 pb-2">
          <h2 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center space-x-2">
            <Star size={20} className="text-anime-orange" />
            <span>{t('topRated')}</span>
          </h2>
          <Link
            href="/search"
            className="text-xs font-semibold text-anime-orange hover:text-anime-orangeHover transition-colors"
          >
            {t('viewAll')}
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {topRatedAnime.slice(0, 12).map((anime) => (
            <AnimeCard key={anime.mal_id} anime={anime} />
          ))}
        </div>
      </section>
    </div>
  );
}
