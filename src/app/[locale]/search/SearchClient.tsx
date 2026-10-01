'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import AnimeCard from '@/components/AnimeCard';
import { Search as SearchIcon, RefreshCw, Heart, Filter } from 'lucide-react';
import { AnimeCardSkeleton } from '@/components/ui/Skeleton';
import { useRouter } from '@/navigation';

interface SearchClientProps {
  initialQuery: string;
  initialLang?: string;
  initialGenre?: number | null;
  initialYear?: string;
  initialStatus?: string;
}

type FilterType = 'All' | 'Series' | 'Movie' | 'OVA' | 'Special';

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

export default function SearchClient({
  initialQuery,
  initialLang = '',
  initialGenre = null,
  initialYear = '',
  initialStatus = ''
}: SearchClientProps) {
  const t = useTranslations('Search');
  const router = useRouter();

  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [activeFilter, setActiveFilter] = useState<FilterType>('All');
  
  const [selectedGenre, setSelectedGenre] = useState<number | null>(initialGenre || null);
  const [selectedYear, setSelectedYear] = useState<string>(initialYear || '');
  const [selectedStatus, setSelectedStatus] = useState<string>(initialStatus || '');
  const [selectedLang, setSelectedLang] = useState<string>(initialLang || '');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Debounce the text search input
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
    setSelectedGenre(initialGenre || null);
    setSelectedYear(initialYear || '');
    setSelectedStatus(initialStatus || '');
    setSelectedLang(initialLang || '');
  }, [initialQuery, initialGenre, initialYear, initialStatus, initialLang]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['search', debouncedQuery, selectedGenre, selectedYear, selectedStatus, selectedLang],
    queryFn: async () => {
      // Handle special language search api if language is selected
      if (selectedLang) {
        const res = await fetch(`/api/search/language?lang=${selectedLang}&q=${encodeURIComponent(debouncedQuery)}`);
        if (!res.ok) throw new Error('Language search failed');
        return res.json();
      }

      const params = new URLSearchParams();
      if (debouncedQuery) params.append('q', debouncedQuery);
      if (selectedGenre) params.append('genres', String(selectedGenre));
      if (selectedYear) params.append('year', selectedYear);
      if (selectedStatus) params.append('status', selectedStatus);
      params.append('limit', '50'); // Fetch a bit more to allow local filtering

      const res = await fetch(`/api/search?${params.toString()}`);
      if (!res.ok) throw new Error('Search failed');
      return res.json();
    },
    placeholderData: (prev) => prev
  });

  const allResults = useMemo(() => {
    if (!data || !data.data || !Array.isArray(data.data)) return [];
    return data.data;
  }, [data]);

  // Derive counts for filters
  const counts = useMemo(() => {
    const defaultCounts = { All: 0, Series: 0, Movie: 0, OVA: 0, Special: 0 };
    if (!allResults.length) return defaultCounts;

    return allResults.reduce((acc: { All: number, Series: number, Movie: number, OVA: number, Special: number }, item: any) => {
      acc.All += 1;
      const type = (item.type || '').toUpperCase();
      if (type === 'TV') acc.Series += 1;
      else if (type === 'MOVIE') acc.Movie += 1;
      else if (type === 'OVA') acc.OVA += 1;
      else if (type === 'SPECIAL') acc.Special += 1;
      return acc;
    }, defaultCounts);
  }, [allResults]);

  // Filter the displayed results based on the active tab
  const displayedResults = useMemo(() => {
    if (activeFilter === 'All') return allResults;
    return allResults.filter((item: any) => {
      const type = (item.type || '').toUpperCase();
      if (activeFilter === 'Series') return type === 'TV';
      if (activeFilter === 'Movie') return type === 'MOVIE';
      if (activeFilter === 'OVA') return type === 'OVA';
      if (activeFilter === 'Special') return type === 'SPECIAL';
      return false;
    });
  }, [allResults, activeFilter]);

  return (
    <div className="space-y-8 pb-16 animate-fade-up">
      {/* Header and Type Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pt-4">
        
        {/* Left Side: Title and Search Box */}
        <div className="space-y-4 flex-1 max-w-2xl">
          <div className="flex items-center gap-3">
            <SearchIcon size={24} className="text-accent-violet" />
            <h1 className="text-2xl md:text-3xl font-black text-text-primary tracking-tight font-display">
              Search Results for <span className="text-accent-violet">&quot;{debouncedQuery || 'Everything'}&quot;</span>
            </h1>
            {!isLoading && !isError && (
              <span className="px-3 py-1 bg-surface-2 border border-border-subtle rounded-full text-xs font-bold text-text-secondary">
                {counts.All} titles found
              </span>
            )}
          </div>
          
          <div className="relative max-w-md flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Refine search..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-surface-2 border border-border-subtle rounded-xl py-2.5 pl-10 pr-4 focus:outline-none focus:border-accent-violet focus:ring-1 focus:ring-accent-violet transition-all text-sm text-text-primary shadow-sm"
              />
              <SearchIcon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
            </div>
            <button 
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={`p-2.5 rounded-xl border transition-all ${showAdvanced ? 'bg-accent-violet border-accent-violet text-white shadow-md' : 'bg-surface-2 border-border-subtle text-text-muted hover:text-text-primary hover:border-border-emphasis hover:bg-surface-3'}`}
              title="Advanced Filters"
              aria-label="Toggle Advanced Filters"
            >
              <Filter size={18} />
            </button>
          </div>
          
          {showAdvanced && (
            <div className="glass-panel p-4 rounded-xl border border-border-subtle grid grid-cols-1 sm:grid-cols-3 gap-3 animate-fade-in text-sm max-w-2xl bg-surface-1/50 backdrop-blur-md">
               <select value={selectedLang} onChange={(e) => setSelectedLang(e.target.value)} className="bg-surface-2 border border-border-subtle rounded-lg py-2 px-3 text-text-primary focus:outline-none focus:border-accent-violet text-xs">
                 <option value="">Language: All</option>
                 <option value="hindi">Hindi Dub</option>
                 <option value="japanese">Japanese Sub</option>
                 <option value="english">English Dub</option>
                 <option value="tamil">Tamil Dub</option>
                 <option value="telugu">Telugu Dub</option>
               </select>

               <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="bg-surface-2 border border-border-subtle rounded-lg py-2 px-3 text-text-primary focus:outline-none focus:border-accent-violet text-xs">
                 <option value="">Year: All</option>
                 {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
               </select>

               <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="bg-surface-2 border border-border-subtle rounded-lg py-2 px-3 text-text-primary focus:outline-none focus:border-accent-violet text-xs">
                 <option value="">Status: All</option>
                 <option value="airing">Airing</option>
                 <option value="complete">Completed</option>
                 <option value="upcoming">Upcoming</option>
               </select>
               
               <div className="col-span-1 sm:col-span-3 pt-3 border-t border-border-subtle flex flex-wrap gap-1.5 mt-1">
                 <span className="text-[10px] font-black text-text-muted mr-1 self-center uppercase tracking-widest">Genres</span>
                 {GENRES.map((g) => (
                   <button
                     key={g.id}
                     onClick={() => setSelectedGenre(selectedGenre === g.id ? null : g.id)}
                     className={`text-[10px] px-2.5 py-1 rounded-lg border font-bold transition-all ${
                       selectedGenre === g.id
                         ? 'bg-accent-violet text-white border-accent-violet shadow-sm'
                         : 'bg-surface-3 text-text-secondary border-border-subtle hover:text-text-primary'
                     }`}
                   >
                     {g.name}
                   </button>
                 ))}
               </div>
            </div>
          )}
        </div>

        {/* Right Side: Type Filter Pills */}
        {!isLoading && !isError && counts.All > 0 && (
          <div className="flex flex-wrap items-center gap-2 bg-surface-1 p-1.5 rounded-2xl border border-border-subtle self-start md:self-auto">
            {(['All', 'Series', 'Movie', 'OVA', 'Special'] as FilterType[]).map((filter) => {
              if (filter !== 'All' && counts[filter] === 0) return null;
              const isActive = activeFilter === filter;
              return (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`text-xs px-4 py-2 rounded-xl transition-all duration-200 font-bold flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-accent-violet text-white shadow-md'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface-3'
                  }`}
                >
                  {filter} 
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${isActive ? 'bg-white/20 text-white' : 'bg-surface-3 text-text-muted'}`}>
                    {counts[filter]}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Results Section */}
      <div className="space-y-8">
        
        {/* Loading skeletons */}
        {isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, idx) => (
              <AnimeCardSkeleton key={idx} />
            ))}
          </div>
        )}

        {/* Error State */}
        {isError && (
          <div className="glass-panel border border-red-500/20 text-red-400 rounded-2xl p-8 text-center text-sm max-w-md mx-auto">
            <RefreshCw size={24} className="mx-auto mb-3 animate-spin text-red-400" />
            <p className="font-bold">Error loading anime search results.</p>
            <p className="text-xs text-text-muted mt-1">Please check your network and try again.</p>
            <button
              onClick={() => refetch()}
              className="mt-4 text-xs font-bold text-white bg-accent-violet hover:bg-[#6b4ae6] rounded-xl px-5 py-2.5 transition"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Results Grid */}
        {!isLoading && !isError && displayedResults.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {displayedResults.map((anime: any) => (
              <AnimeCard key={anime.mal_id} anime={anime} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !isError && counts.All === 0 && (
          <div className="glass-panel rounded-2xl border border-border-default p-12 text-center max-w-md mx-auto space-y-4 bg-gradient-to-br from-surface-1 to-surface-2 shadow-xl">
            <div className="w-16 h-16 rounded-full bg-surface-2 border border-border-subtle flex items-center justify-center mx-auto text-accent-violet">
              <Heart size={28} className="text-accent-violet" />
            </div>
            <h3 className="text-lg font-black text-text-primary font-display">{t('noResults')}</h3>
            <p className="text-xs text-text-muted leading-relaxed">
              We couldn&apos;t find anything matching your search. Try checking spelling or using broader terms!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
