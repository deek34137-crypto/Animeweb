'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, ArrowUpDown, Check, Play, ChevronDown, Loader2 } from 'lucide-react';
import { Link, useRouter } from '@/navigation';

interface EpisodeItem {
  number: number;
  title?: string;
  aired?: string;
  filler?: boolean;
  recap?: boolean;
}

interface SeasonItem {
  malId: number;
  name: string;
  relation: string;
  isCurrent: boolean;
}

interface EpisodeSidebarProps {
  episodes: EpisodeItem[];
  animeId: string;
  currentEpisode: number;
  watchedEpisodes: number[];
  animeTitle: string;
  animeImage: string;
  totalEpisodes?: number | null;
  seasons?: SeasonItem[];
}

export default function EpisodeSidebar({
  episodes,
  animeId,
  currentEpisode,
  watchedEpisodes,
  animeTitle,
  animeImage,
  totalEpisodes,
  seasons = [],
}: EpisodeSidebarProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortAsc, setSortAsc] = useState(true);
  const [localWatched, setLocalWatched] = useState<number[]>(watchedEpisodes);
  const [isToggling, setIsToggling] = useState<number | null>(null);

  // Ref for the scrollable list container and the active episode row
  const listContainerRef = useRef<HTMLDivElement>(null);
  const activeEpRef = useRef<HTMLAnchorElement>(null);

  // Auto-scroll to current episode when sidebar mounts
  useEffect(() => {
    if (activeEpRef.current && listContainerRef.current) {
      // Small delay so layout is stable before scrolling
      const timer = setTimeout(() => {
        activeEpRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }, 120);
      return () => clearTimeout(timer);
    }
  }, [currentEpisode]);

  useEffect(() => {
    setLocalWatched(watchedEpisodes);
  }, [watchedEpisodes]);

  const handleToggleWatched = async (e: React.MouseEvent, epNum: number) => {
    e.preventDefault();
    e.stopPropagation();

    if (isToggling !== null) return;
    setIsToggling(epNum);

    const isCurrentlyWatched = localWatched.includes(epNum);
    const nextWatched = isCurrentlyWatched
      ? localWatched.filter((n) => n !== epNum)
      : [...localWatched, epNum];

    setLocalWatched(nextWatched);

    try {
      const res = await fetch('/api/user/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          animeId,
          animeTitle,
          animeImage,
          episode: epNum,
          watched: !isCurrentlyWatched,
          totalEpisodes: totalEpisodes || episodes.length,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to toggle watch state');
      }
    } catch (err) {
      console.error(err);
      setLocalWatched(localWatched);
    } finally {
      setIsToggling(null);
    }
  };

  // Fallback: if no episodes from provider, generate stubs from totalEpisodes
  // Fallback & Padding: ensure we show up to totalEpisodes if provider returned fewer episodes
  const resolvedEpisodes = useMemo(() => {
    const list = [...episodes];
    const maxEp = Math.max(totalEpisodes || 0, list.length);

    for (let i = 1; i <= maxEp; i++) {
      if (!list.some((e) => e.number === i)) {
        list.push({
          number: i,
          title: undefined,
          aired: undefined,
          filler: false,
          recap: false,
        });
      }
    }

    return list.sort((a, b) => a.number - b.number);
  }, [episodes, totalEpisodes]);

  // Search & Filter
  const filteredEpisodes = useMemo(() => {
    let result = [...resolvedEpisodes];

    // Filter by keyword
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (ep) =>
          ep.number.toString().includes(q) ||
          (ep.title && ep.title.toLowerCase().includes(q))
      );
    }

    // Sort order
    result.sort((a, b) => (sortAsc ? a.number - b.number : b.number - a.number));

    return result;
  }, [resolvedEpisodes, searchQuery, sortAsc]);

  const toggleSort = () => setSortAsc(!sortAsc);

  return (
    <div className="glass-panel border border-border-default rounded-2xl flex flex-col h-[560px] overflow-hidden">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-border-subtle space-y-3 flex-shrink-0 bg-surface-1/50">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-text-primary uppercase tracking-widest font-display">
            Episodes Browser
          </h3>
          <button
            onClick={toggleSort}
            className="flex items-center gap-1 text-[11px] font-semibold text-text-muted hover:text-white transition-colors"
            title="Toggle Sort Direction"
          >
            <ArrowUpDown size={12} />
            <span>{sortAsc ? 'Ascending' : 'Descending'}</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search episode title or number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface-2 border border-border-subtle focus:border-accent-violet focus:ring-1 focus:ring-accent-violet rounded-xl py-2 pl-3 pr-8 text-xs text-text-primary placeholder:text-text-muted outline-none transition-all"
          />
          <Search size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-disabled" />
        </div>

        {/* Season Selector */}
        {seasons && seasons.length > 1 && (
          <div className="relative">
            <div className="relative">
              <select
                value={animeId}
                onChange={(e) => {
                  const selectedId = e.target.value;
                  router.push(`/watch/${selectedId}/1` as '/');
                }}
                className="w-full bg-surface-2 border border-border-subtle focus:border-accent-violet rounded-xl py-1.5 pl-3 pr-8 text-xs font-bold text-text-primary outline-none appearance-none cursor-pointer transition-all truncate"
              >
                {seasons.map((s) => (
                  <option key={s.malId} value={String(s.malId)}>
                    {s.isCurrent ? 'Current Season: ' : `${s.relation}: `}{s.name}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">
                <ChevronDown size={14} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Episode Rows List */}
      <div ref={listContainerRef} className="flex-grow overflow-y-auto no-scrollbar p-2 space-y-1">
        {filteredEpisodes.length === 0 ? (
          <div className="py-12 text-center text-xs text-text-muted">
            No episodes match your search.
          </div>
        ) : (
          filteredEpisodes.map((ep) => {
            const isActive = ep.number === currentEpisode;
            const isWatched = localWatched.includes(ep.number);

            return (
              <Link
                key={ep.number}
                ref={isActive ? activeEpRef : undefined}
                href={`/watch/${animeId}/${ep.number}` as '/'}
                onMouseEnter={() => {
                  // Pre-resolve stream in background on hover
                  fetch(`/api/stream/source?animeId=${animeId}&episode=${ep.number}&title=${encodeURIComponent(animeTitle)}`).catch(() => {});
                }}
                className={`block rounded-xl border overflow-hidden transition-all duration-200 group relative ${
                  isActive
                    ? 'border-l-2 border-accent-violet bg-accent-violet/10 shadow-[0_0_16px_rgba(124,91,255,0.15)]'
                    : isWatched
                      ? 'border-border-subtle bg-surface-2/40 opacity-70 hover:opacity-100 hover:border-border-emphasis'
                      : 'border-border-subtle bg-surface-2/80 hover:border-border-emphasis'
                }`}
              >
                <div className="flex gap-3 p-2">
                  {/* Thumbnail */}
                  <div className="relative w-24 h-[54px] rounded-lg overflow-hidden flex-shrink-0">
                    <img
                      src={animeImage}
                      alt={ep.title || `Episode ${ep.number}`}
                      className="w-full h-full object-cover animate-fade-in"
                      referrerPolicy="no-referrer"
                      loading="lazy"
                    />
                    {isActive && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Play size={18} fill="currentColor" className="text-accent-violet animate-pulse" />
                      </div>
                    )}

                    {/* Checkmark click target overlay */}
                    <button
                      type="button"
                      onClick={(e) => handleToggleWatched(e, ep.number)}
                      disabled={isToggling === ep.number}
                      className={`absolute top-1 right-1 z-20 w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                        isWatched
                          ? 'bg-emerald-500 border-emerald-400 text-white shadow-sm opacity-100'
                          : 'bg-black/60 border-white/20 text-white/50 opacity-0 group-hover:opacity-100 hover:text-white hover:border-white'
                      }`}
                      title={isWatched ? 'Mark as unwatched' : 'Mark as watched'}
                    >
                      {isToggling === ep.number ? (
                        <Loader2 size={10} className="animate-spin text-white" />
                      ) : (
                        <Check size={10} strokeWidth={3} />
                      )}
                    </button>
                  </div>

                  {/* Episode info */}
                  <div className="min-w-0 flex-grow flex flex-col justify-center">
                    <p className="text-[9px] font-black uppercase tracking-widest text-text-muted">
                      EP {ep.number}
                    </p>
                    <p
                      className={`text-xs font-bold truncate transition-colors ${
                        isActive
                          ? 'text-accent-violet'
                          : 'text-text-primary group-hover:text-accent-violet'
                      }`}
                    >
                      {ep.title || `Episode ${ep.number}`}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className="text-[10px] text-text-disabled">23m</span>
                      {ep.aired && (() => {
                        const date = new Date(ep.aired);
                        const isValid = !isNaN(date.getTime());
                        return (
                          <>
                            <span className="text-[10px] text-text-disabled">·</span>
                            <span className="text-[10px] text-text-disabled">
                              {isValid ? date.toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              }) : ep.aired}
                            </span>
                          </>
                        );
                      })()}
                      {ep.filler && (
                        <span className="text-[8px] font-black uppercase tracking-wider px-1 py-px bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 rounded-full leading-tight">
                          Filler
                        </span>
                      )}
                      {ep.recap && (
                        <span className="text-[8px] font-black uppercase tracking-wider px-1 py-px bg-accent-violet/10 border border-accent-violet/20 text-accent-violet rounded-full leading-tight">
                          Recap
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                {isWatched && (
                  <div className="h-0.5 bg-white/10 rounded-full w-full">
                    <div className="h-0.5 bg-accent-violet rounded-full w-full" />
                  </div>
                )}
              </Link>
            );
          })
        )}
      </div>

      {/* Footer stats summary */}
      <div className="p-3 border-t border-border-subtle text-[10px] text-text-muted font-semibold bg-surface-1/50 flex-shrink-0 flex justify-between">
        <span>Total: {resolvedEpisodes.length} episodes</span>
        <span>Watched: {localWatched.length}</span>
      </div>
    </div>
  );
}
