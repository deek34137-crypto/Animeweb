'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { JikanAPI } from '@/services/jikan';
import AnimeCard from '@/components/AnimeCard';
import { Search as SearchIcon, Filter, RefreshCw, Calendar, Eye, Heart } from 'lucide-react';

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
  const tHome = useTranslations('Homepage');

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

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['search', debouncedQuery, selectedGenre, selectedYear, selectedStatus],
    queryFn: () =>
      JikanAPI.searchAnime(debouncedQuery, {
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
    <div className="space-y-8 pb-16">
      {/* Search and Filters Header */}
      <div className="bg-anime-card rounded-2xl p-6 border border-anime-border/40 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h1 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center space-x-2">
            <Filter size={22} className="text-anime-orange" />
            <span>{t('filterTitle')}</span>
          </h1>
          
          <button
            onClick={resetFilters}
            className="flex items-center space-x-1.5 text-xs text-anime-orange hover:text-anime-orangeHover transition-colors border border-anime-orange/30 hover:border-anime-orange rounded-full px-3 py-1 bg-anime-dark/50"
          >
            <RefreshCw size={12} />
            <span>Reset All</span>
          </button>
        </div>

        {/* Input & Dropdowns Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Keyword Search Input */}
          <div className="relative">
            <input
              type="text"
              placeholder="Filter by keyword..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-anime-dark border border-anime-border/60 rounded-xl py-2.5 pl-4 pr-10 focus:outline-none focus:border-anime-orange focus:ring-1 focus:ring-anime-orange transition-all text-sm text-gray-200"
            />
            <SearchIcon size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
          </div>

          {/* Year Dropdown */}
          <div className="relative">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full bg-anime-dark border border-anime-border/60 rounded-xl py-2.5 px-4 focus:outline-none focus:border-anime-orange focus:ring-1 focus:ring-anime-orange text-sm text-gray-200 cursor-pointer appearance-none"
            >
              <option value="">{t('year')}: {t('all')}</option>
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <Calendar size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          </div>

          {/* Status Dropdown */}
          <div className="relative">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-anime-dark border border-anime-border/60 rounded-xl py-2.5 px-4 focus:outline-none focus:border-anime-orange focus:ring-1 focus:ring-anime-orange text-sm text-gray-200 cursor-pointer appearance-none"
            >
              <option value="">{t('statusLabel')}: {t('all')}</option>
              <option value="airing">Airing</option>
              <option value="complete">Completed</option>
              <option value="upcoming">Upcoming</option>
            </select>
            <Eye size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          </div>
        </div>

        {/* Genre Pills */}
        <div className="space-y-2.5 pt-2 border-t border-anime-border/20">
          <label className="block text-xs font-bold text-gray-400 tracking-wider uppercase">
            {t('genre')}
          </label>
          <div className="flex flex-wrap gap-2">
            {GENRES.map((g) => {
              const active = selectedGenre === g.id;
              return (
                <button
                  key={g.id}
                  onClick={() => toggleGenre(g.id)}
                  className={`text-xs px-3.5 py-1.5 rounded-full border transition-all duration-300 font-medium ${
                    active
                      ? 'bg-anime-orange text-black border-anime-orange font-bold shadow-md shadow-orange-500/10'
                      : 'bg-anime-dark hover:bg-anime-card border-anime-border text-gray-300 hover:border-anime-orange/40'
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
          <div className="text-xs text-anime-muted">
            Found {animeList.length} results
          </div>
        )}

        {/* Loading skeletons */}
        {isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {Array.from({ length: 12 }).map((_, idx) => (
              <div key={idx} className="animate-pulse flex flex-col space-y-3">
                <div className="bg-anime-card aspect-[3/4] w-full rounded-xl" />
                <div className="h-4 bg-anime-card rounded w-3/4" />
                <div className="h-3 bg-anime-card rounded w-1/2" />
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {isError && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-6 text-center text-sm">
            <RefreshCw size={24} className="mx-auto mb-2 animate-spin text-red-400" />
            <p>Error loading anime search results. Jikan API might be overloaded.</p>
            <button
              onClick={() => refetch()}
              className="mt-3 text-xs font-bold text-white bg-red-500 hover:bg-red-600 rounded-full px-4 py-2 transition"
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
          <div className="bg-anime-card rounded-2xl border border-anime-border/40 p-12 text-center max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 rounded-full bg-anime-dark border border-anime-border flex items-center justify-center mx-auto text-anime-orange">
              <Heart size={28} className="text-anime-orange" />
            </div>
            <h3 className="text-lg font-black text-white">{t('noResults')}</h3>
            <p className="text-xs text-anime-muted leading-relaxed">
              We couldn&apos;t find anything matching your filters. Try checking spelling or relaxing some dropdown options!
            </p>
            <button
              onClick={resetFilters}
              className="text-xs font-semibold text-black bg-anime-orange hover:bg-anime-orangeHover rounded-full px-5 py-2.5 transition"
            >
              Clear All Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
