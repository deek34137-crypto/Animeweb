'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import AnimeCard from '@/components/AnimeCard';
import { Search as SearchIcon, Filter, RefreshCw, Calendar, Eye, Heart, Globe, Tv, User, Award, Library, Star } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import { AnimeCardSkeleton } from '@/components/ui/Skeleton';
import { Link, useRouter } from '@/navigation';

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
  initialLang?: string;
  initialGenre?: number | null;
  initialYear?: string;
  initialStatus?: string;
}

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
  const [selectedGenre, setSelectedGenre] = useState<number | null>(initialGenre);
  const [selectedYear, setSelectedYear] = useState<string>(initialYear);
  const [selectedStatus, setSelectedStatus] = useState<string>(initialStatus);
  const [selectedLang, setSelectedLang] = useState<string>(initialLang);

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
    setSelectedLang(initialLang);
    setSelectedGenre(initialGenre);
    setSelectedYear(initialYear);
    setSelectedStatus(initialStatus);
  }, [initialQuery, initialLang, initialGenre, initialYear, initialStatus]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['search', debouncedQuery, selectedGenre, selectedYear, selectedStatus, selectedLang],
    queryFn: async () => {
      if (selectedLang) {
        const res = await fetch(`/api/search/language?lang=${selectedLang}&q=${encodeURIComponent(debouncedQuery)}`);
        if (!res.ok) throw new Error('Language search failed');
        const json = await res.json();
        return json as { data: any[] };
      }
      
      const params = new URLSearchParams();
      if (debouncedQuery) params.append('q', debouncedQuery);
      if (selectedGenre) params.append('genres', String(selectedGenre));
      if (selectedYear) params.append('year', selectedYear);
      if (selectedStatus) params.append('status', selectedStatus);
      params.append('limit', '24');

      const res = await fetch(`/api/search?${params.toString()}`);
      if (!res.ok) throw new Error('Search failed');
      return res.json();
    },
    placeholderData: (prev) => prev
  });

  // Redirect if genre redirect was returned by the API
  useEffect(() => {
    if (data && 'redirect' in data && (data as any).redirect) {
      router.replace((data as any).redirect);
    }
  }, [data, router]);

  const [isHindiPreferred, setIsHindiPreferred] = useState(false);
  useEffect(() => {
    setIsHindiPreferred(localStorage.getItem('preferredLanguage') === 'hindi');
  }, []);

  const HINDI_FAVORITE_KEYWORDS = [
    'naruto', 'demon slayer', 'jujutsu', 'hero academia', 'death note', 
    'attack on titan', 'one piece', 'dragon ball', 'pokemon', 'doraemon', 
    'shin-chan', 'shin chan', 'crayon', 'hunter x hunter', 'detective conan',
    'avatar', 'blue lock', 'chainsaw man', 'solo leveling', 'tokyo revengers',
    'black clover', 'haikyu'
  ];

  const hasHindiDub = (title: string, malId: number) => {
    const t = title.toLowerCase();
    return HINDI_FAVORITE_KEYWORDS.some(keyword => t.includes(keyword)) || [20, 1535, 21, 38000, 40748, 31964, 16498].includes(malId);
  };

  const sortHindi = (list: any[]) => {
    if (!isHindiPreferred) return list;
    return [...list].sort((a, b) => {
      const aHas = hasHindiDub(a.title_english || a.title, a.mal_id);
      const bHas = hasHindiDub(b.title_english || b.title, b.mal_id);
      if (aHas && !bHas) return -1;
      if (!aHas && bHas) return 1;
      return 0;
    });
  };

  // Auto-open logic when exactly one highly confident match is found
  useEffect(() => {
    if (isLoading || isError || !data || 'redirect' in data) {
      return;
    }

    const sections = (data as any)?.sections;
    if (!sections) return;

    const topMatch = sections.topMatch;
    const recommendations = sections.recommendations || [];
    const relatedSeries = sections.relatedSeries || [];
    const otherResults = sections.otherResults || [];

    if (!topMatch || !debouncedQuery || debouncedQuery.trim().length < 3) {
      return;
    }

    const cleanQuery = debouncedQuery.toLowerCase().trim();
    const firstTitle = (topMatch.title_english || topMatch.title || '').toLowerCase().trim();
    const cleanTitle = firstTitle.replace(/[^a-z0-9]/g, '');
    const cleanQ = cleanQuery.replace(/[^a-z0-9]/g, '');

    const isStrongMatch = cleanTitle === cleanQ || firstTitle === cleanQuery || (topMatch.title_synonyms || []).some((s: string) => s.toLowerCase().trim() === cleanQuery);
    if (!isStrongMatch) return;

    let hasAlternative = false;
    const allAlternatives = [...relatedSeries, ...recommendations, ...otherResults];
    for (const alt of allAlternatives) {
      if (alt.mal_id === topMatch.mal_id) continue;
      const altTitle = (alt.title_english || alt.title || '').toLowerCase().trim();
      const cleanAlt = altTitle.replace(/[^a-z0-9]/g, '');
      if (cleanAlt.includes(cleanQ) || altTitle.includes(cleanQuery)) {
        hasAlternative = true;
        break;
      }
    }

    if (!hasAlternative) {
      const sessionKey = `auto_opened_${cleanQ}`;
      if (!sessionStorage.getItem(sessionKey)) {
        sessionStorage.setItem(sessionKey, 'true');
        router.replace(`/anime/${topMatch.mal_id}` as '/');
      }
    }
  }, [data, isLoading, isError, debouncedQuery, router]);

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
    setSelectedLang('');
  };

  const results = data || { sections: { topMatch: null, relatedSeries: [], recommendations: [], otherResults: [] }, characters: [], studios: [] };
  const sections = results.sections || { topMatch: null, relatedSeries: [], recommendations: [], otherResults: [] };
  const characters = results.characters || [];
  const studios = results.studios || [];

  const topMatch = sections.topMatch;
  const relatedSeries = sortHindi(sections.relatedSeries || []);
  const recommendations = sortHindi(sections.recommendations || []);
  const otherResults = sortHindi(sections.otherResults || []);

  const totalCount = (topMatch ? 1 : 0) + relatedSeries.length + recommendations.length + otherResults.length;

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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
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

          {/* Language Dropdown */}
          <div className="relative">
            <select
              value={selectedLang}
              onChange={(e) => setSelectedLang(e.target.value)}
              className="w-full bg-surface-2 border border-border-subtle rounded-xl py-2.5 px-4 focus:outline-none focus:border-accent-violet focus:ring-1 focus:ring-accent-violet text-sm text-text-primary cursor-pointer appearance-none"
            >
              <option value="">Language: All</option>
              <option value="hindi">Hindi Dub</option>
              <option value="japanese">Japanese Sub</option>
              <option value="english">English Dub</option>
              <option value="tamil">Tamil Dub</option>
              <option value="telugu">Telugu Dub</option>
            </select>
            <Globe size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
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
      <div className="space-y-8">
        {/* Results count */}
        {!isLoading && !isError && totalCount > 0 && (
          <div className="text-xs text-text-muted pl-1">
            Found {totalCount} results
          </div>
        )}

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
            <p className="font-semibold">Error loading anime search results.</p>
            <p className="text-xs text-text-muted mt-1">Please check your network and try again.</p>
            <button
              onClick={() => refetch()}
              className="mt-4 text-xs font-bold text-white bg-accent-violet hover:bg-[#6b4ae6] rounded-xl px-5 py-2.5 transition"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Premium Grouped Search Layout */}
        {!isLoading && !isError && totalCount > 0 && (
          <div className="space-y-10">
            {/* 1. Top Match Spotlight */}
            {debouncedQuery && topMatch && (
              <div className="glass-panel border border-border-default rounded-3xl p-6 md:p-8 flex flex-col md:flex-row gap-6 relative overflow-hidden bg-gradient-to-br from-surface-1 to-surface-2 shadow-xl">
                <div className="absolute top-0 right-0 w-80 h-80 bg-accent-violet/5 rounded-full blur-3xl pointer-events-none" />
                
                <div className="w-full md:w-48 shrink-0 aspect-[2/3] rounded-2xl overflow-hidden border border-border-subtle relative shadow-2xl">
                  <img src={topMatch.images.jpg.image_url} alt={topMatch.title} className="w-full h-full object-cover" />
                  <div className="absolute top-3 right-3">
                    <Badge variant="violet">Top Match</Badge>
                  </div>
                </div>

                <div className="flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <h2 className="text-xl md:text-3xl font-black font-display text-text-primary leading-tight">
                      {topMatch.title_english || topMatch.title}
                    </h2>
                    <div className="flex flex-wrap items-center gap-2.5 text-xs text-text-secondary font-medium">
                      <span>{topMatch.year || 'Ongoing'}</span>
                      <span>·</span>
                      <span className="uppercase font-extrabold tracking-wider">{topMatch.type || 'TV'}</span>
                      {topMatch.rating && (
                        <>
                          <span>·</span>
                          <span className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-black border border-white/10 uppercase">
                            {topMatch.rating}
                          </span>
                        </>
                      )}
                      {topMatch.score && (
                        <>
                          <span>·</span>
                          <span className="flex items-center gap-1 text-accent-gold font-extrabold">
                            <Star size={12} fill="currentColor" /> {topMatch.score}
                          </span>
                        </>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-1.5 text-xs text-text-muted">
                      {topMatch.studios && topMatch.studios.length > 0 && (
                        <span className="font-bold text-accent-primary mr-2">
                          Studio: {topMatch.studios[0].name}
                        </span>
                      )}
                      {topMatch.genres && topMatch.genres.length > 0 && (
                        <span>Genres: {topMatch.genres.map((g: any) => g.name).join(', ')}</span>
                      )}
                    </div>
                    <p className="text-xs md:text-sm text-text-muted leading-relaxed line-clamp-4">
                      {topMatch.synopsis}
                    </p>
                  </div>
                  
                  <div>
                    <Link href={`/anime/${topMatch.mal_id}`} className="inline-flex items-center gap-2 px-6 py-2.5 bg-accent-violet hover:bg-[#6b4ae6] text-white font-bold rounded-2xl shadow-lg transition-all duration-200 text-xs">
                      Watch Now
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* 2. Matching Characters */}
            {debouncedQuery && characters.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-text-primary tracking-wider uppercase font-display flex items-center gap-2">
                  <User size={16} className="text-accent-violet" />
                  <span>Matching Characters</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {characters.map((char: any) => (
                    <div key={char.id} className="glass-panel border border-border-subtle rounded-2xl p-3 flex items-center gap-3 bg-surface-2 hover:bg-surface-3 transition">
                      <div className="w-10 h-10 rounded-full overflow-hidden border border-border-subtle shrink-0">
                        <img src={char.image} alt={char.name} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <div className="text-xs font-black text-text-primary">{char.name}</div>
                        <div className="text-[9px] text-text-muted">Featured Character</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. Matching Studios */}
            {debouncedQuery && studios.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-text-primary tracking-wider uppercase font-display flex items-center gap-2">
                  <Award size={16} className="text-accent-gold" />
                  <span>Studios</span>
                </h3>
                <div className="flex flex-wrap gap-2.5">
                  {studios.map((studio: any) => (
                    <span key={studio.id} className="text-xs px-4 py-2 rounded-xl border border-border-subtle bg-surface-2 font-bold text-text-secondary">
                      {studio.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 4. Related Series */}
            {debouncedQuery && relatedSeries.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-text-primary tracking-wider uppercase font-display flex items-center gap-2">
                  <Tv size={16} className="text-accent-pink" />
                  <span>Related Series</span>
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {relatedSeries.map((anime: any) => (
                    <AnimeCard key={anime.mal_id} anime={anime} />
                  ))}
                </div>
              </div>
            )}

            {/* 5. Similar Anime Recommendations */}
            {debouncedQuery && recommendations.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-text-primary tracking-wider uppercase font-display flex items-center gap-2">
                  <Heart size={16} className="text-accent-sakura" />
                  <span>Similar Anime</span>
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {recommendations.map((anime: any) => (
                    <AnimeCard key={anime.mal_id} anime={anime} />
                  ))}
                </div>
              </div>
            )}

            {/* 6. Other Results / Flat Catalog Grid */}
            {otherResults.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-text-primary tracking-wider uppercase font-display flex items-center gap-2">
                  <Library size={16} className="text-text-muted" />
                  <span>{debouncedQuery ? 'Other Matches' : 'Catalog'}</span>
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {otherResults.map((anime: any) => (
                    <AnimeCard key={anime.mal_id} anime={anime} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !isError && totalCount === 0 && (
          <div className="glass-panel rounded-2xl border border-border-default p-12 text-center max-w-md mx-auto space-y-4 bg-gradient-to-br from-surface-1 to-surface-2 shadow-xl">
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
