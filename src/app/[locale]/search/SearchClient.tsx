'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { AnimeApi } from '@/lib/api';
import AnimeCard from '@/components/AnimeCard';
import { Search as SearchIcon, Filter, RefreshCw, Calendar, Eye, Heart } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import { SectionSkeleton } from '@/components/ui/Skeleton';

const GENRES = [
  { id: 1, name: 'Action' },
  { id: 2, name: 'Adventure' },
  { id: 4, name: 'Comedy' },
  { id: 8, name: 'Drama' },
  { id: 10, name: 'Fantasy' },
  { id: 22, name: 'Romance' },
  { id: 24, name: 'Sci-Fi' },
  { id: 30, name: 'Sports' },
  { id: 37, name: 'Supernatural' },
  { id: 41, name: 'Suspense' }
];

const YEARS = Array.from({ length: 27 }, (_, i) => String(2026 - i));

interface SearchClientProps {
  initialQuery: string;
}

export default function SearchClient({ initialQuery }: SearchClientProps) {
  const t = useTranslations('Search');

  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  // Debounce the text search input to avoid hitting Jikan API too rapidly
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 450);

    return () => {
      clearTimeout(handler);
    };
  }, [query]);

  // Sync initial query when navigation updates q parameter
  useEffect(() => {
    setQuery(initialQuery);
    setDebouncedQuery(initialQuery);
  }, [initialQuery]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['search', debouncedQuery, selectedGenre, selectedYear, selectedStatus],
    queryFn: () =>
      AnimeApi.searchAnime(debouncedQuery, {
        genres: selectedGenre ? String(selectedGenre) : undefined,
        year: selectedYear || undefined,
        status: selectedStatus || undefined,
        limit: 24
      }),
    placeholderData: (prev) => prev
  });

  const animeList = data?.data || [];

  const toggleGenre = (genreId: number) => {
    if (selectedGenre === genreId) {
      setSelectedGenre(null);
    } else {
      setSelectedGenre(genreId);
    }
  };

  const resetFilters = () => {
    setQuery('');
    setDebouncedQuery('');
    setSelectedGenre(null);
    setSelectedYear('');
    setSelectedStatus('');
  };

  return (
    <div className="space-y-8 pb-16 animate-fade-up">
      {/* Search and Filters Header */}
      <div className="glass-panel border border-border-default rounded-2xl p-6 space-y-6 relative overflow-hidden">
        <div className="absolute -top-16 -left-16 w-32 h-32 bg-accent-violet/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-32 h-32 bg-accent-sakura/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <h1 className="text-xl md:text-2xl font-black text-text-primary tracking-tight flex items-center space-x-2 font-display">
            <Filter size={20} className="text-accent-violet animate-pulse" />
            <span>{t('filterTitle')}</span>
          </h1>
          
          <button
            onClick={resetFilters}
            className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary hover:bg-surface-3 border border-border-subtle hover:border-border-emphasis rounded-xl px-3 py-1.5 bg-surface-2 transition-all"
          >
            <RefreshCw size={12} />
            <span>Reset All</span>
          </button>
        </div>

        {/* Input & Dropdowns Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
          {/* Keyword Search Input */}
          <div className="relative">
            <input
              type="text"
              placeholder="Filter by keyword..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-surface-2 border border-border-subtle rounded-xl py-2.5 pl-4 pr-10 focus:outline-none focus:border-accent-violet focus:ring-1 focus:ring-accent-violet transition-all text-sm text-text-primary"
            />
            <SearchIcon size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
          </div>

          {/* Year Dropdown */}
          <div className="relative">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full bg-surface-2 border border-border-subtle rounded-xl py-2.5 px-4 focus:outline-none focus:border-accent-violet focus:ring-1 focus:ring-accent-violet text-sm text-text-primary cursor-pointer appearance-none"
            >
              <option value="">{t('year')}: {t('all')}</option>
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <Calendar size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          </div>

          {/* Status Dropdown */}
          <div className="relative">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-surface-2 border border-border-subtle rounded-xl py-2.5 px-4 focus:outline-none focus:border-accent-violet focus:ring-1 focus:ring-accent-violet text-sm text-text-primary cursor-pointer appearance-none"
            >
              <option value="">{t('statusLabel')}: {t('all')}</option>
              <option value="airing">Airing</option>
              <option value="complete">Completed</option>
              <option value="upcoming">Upcoming</option>
            </select>
            <Eye size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          </div>
        </div>

        {/* Genre Pills */}
        <div className="space-y-2.5 pt-4 border-t border-border-subtle relative z-10">
          <label className="block text-xs font-bold text-text-muted tracking-wider uppercase">
            {t('genre')}
          </label>
          <div className="flex flex-wrap gap-1.5">
            {GENRES.map((g) => {
              const active = selectedGenre === g.id;
              return (
                <button
                  key={g.id}
                  onClick={() => toggleGenre(g.id)}
                  className={`text-xs px-3.5 py-1.5 rounded-xl border transition-all duration-200 font-semibold ${
                    active
                      ? 'bg-accent-violet text-white border-accent-violet shadow-[0_0_12px_rgba(124,91,255,0.3)] font-bold'
                      : 'bg-surface-2 hover:bg-surface-3 border-border-subtle text-text-secondary hover:border-accent-violet/40 hover:text-text-primary'
                  }`}
                >
                  {g.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Results Section */}
      <div className="space-y-4">
        {/* Results title info */}
        {!isLoading && (
          <div className="text-xs text-text-muted pl-1">
            Found {animeList.length} results
          </div>
        )}

        {/* Loading skeletons */}
        {isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {Array.from({ length: 12 }).map((_, idx) => (
              <div key={idx} className="animate-pulse flex flex-col space-y-3">
                <div className="bg-surface-2 aspect-[3/4] w-full rounded-xl" />
                <div className="h-4 bg-surface-2 rounded w-3/4" />
                <div className="h-3 bg-surface-2 rounded w-1/2" />
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {isError && (
          <div className="glass-panel border border-red-500/20 text-red-400 rounded-2xl p-8 text-center text-sm max-w-md mx-auto">
            <RefreshCw size={24} className="mx-auto mb-3 animate-spin text-red-400" />
            <p className="font-semibold">Error loading anime search results.</p>
            <p className="text-xs text-text-muted mt-1">Jikan API might be rate-limited. Please try again.</p>
            <button
              onClick={() => refetch()}
              className="mt-4 text-xs font-bold text-white bg-accent-violet hover:bg-[#6b4ae6] rounded-xl px-5 py-2.5 transition"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Dynamic Cards Grid */}
        {!isLoading && !isError && animeList.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {animeList.map((anime) => (
              <AnimeCard key={anime.mal_id} anime={anime} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !isError && animeList.length === 0 && (
          <div className="glass-panel rounded-2xl border border-border-default p-12 text-center max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 rounded-full bg-surface-2 border border-border-subtle flex items-center justify-center mx-auto text-accent-violet">
              <Heart size={28} className="text-accent-violet" />
            </div>
            <h3 className="text-lg font-black text-text-primary font-display">{t('noResults')}</h3>
            <p className="text-xs text-text-muted leading-relaxed">
              We couldn&apos;t find anything matching your filters. Try checking spelling or relaxing some dropdown options!
            </p>
            <button
              onClick={resetFilters}
              className="text-xs font-semibold text-white bg-accent-violet hover:bg-[#6b4ae6] rounded-xl px-5 py-2.5 transition"
            >
              Clear All Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
