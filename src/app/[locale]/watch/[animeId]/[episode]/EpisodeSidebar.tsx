'use client';

import React, { useState, useMemo } from 'react';
import { Search, ArrowUpDown, Check, Play } from 'lucide-react';
import { Link } from '@/navigation';

interface EpisodeItem {
  number: number;
  title?: string;
  aired?: string;
  filler?: boolean;
  recap?: boolean;
}

interface EpisodeSidebarProps {
  episodes: EpisodeItem[];
  animeId: string;
  currentEpisode: number;
  watchedEpisodes: number[];
  animeTitle: string;
  animeImage: string;
  totalEpisodes?: number | null;
}

export default function EpisodeSidebar({
  episodes,
  animeId,
  currentEpisode,
  watchedEpisodes,
  animeTitle,
  animeImage,
  totalEpisodes,
}: EpisodeSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortAsc, setSortAsc] = useState(true);

  // Fallback: if no episodes from provider, generate stubs from totalEpisodes
  const resolvedEpisodes = useMemo(() => {
    if (episodes.length > 0) return episodes;
    if (totalEpisodes && totalEpisodes > 0) {
      return Array.from({ length: totalEpisodes }, (_, i) => ({
        number: i + 1,
        title: undefined,
        aired: undefined,
        filler: false,
        recap: false,
      }));
    }
    return [];
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
      </div>

      {/* Episode Rows List */}
      <div className="flex-grow overflow-y-auto no-scrollbar p-2 space-y-1">
        {filteredEpisodes.length === 0 ? (
          <div className="py-12 text-center text-xs text-text-muted">
            No episodes match your search.
          </div>
        ) : (
          filteredEpisodes.map((ep) => {
            const isActive = ep.number === currentEpisode;
            const isWatched = watchedEpisodes.includes(ep.number);

            return (
              <Link
                key={ep.number}
                href={`/watch/${animeId}/${ep.number}` as '/'}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 group ${
                  isActive
                    ? 'bg-accent-violet/10 border-accent-violet text-text-primary shadow-[0_0_12px_rgba(124,91,255,0.1)]'
                    : isWatched
                      ? 'bg-surface-2/40 border-border-subtle opacity-70 hover:opacity-100 hover:border-border-emphasis'
                      : 'bg-surface-2/80 border-border-subtle hover:border-border-emphasis'
                }`}
              >
                {/* Visual Status Indicator (Play icon if active, checkmark if watched, number if raw) */}
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0 transition-colors ${
                    isActive
                      ? 'bg-accent-violet text-white shadow-md'
                      : isWatched
                        ? 'bg-green-500/15 text-green-400 border border-green-500/20'
                        : 'bg-surface-3 text-text-muted border border-border-subtle group-hover:text-text-primary group-hover:border-border-emphasis'
                  }`}
                >
                  {isActive ? (
                    <Play size={12} fill="currentColor" className="ml-0.5 animate-pulse" />
                  ) : isWatched ? (
                    <Check size={12} />
                  ) : (
                    ep.number
                  )}
                </div>

                {/* Episode metadata details */}
                <div className="min-w-0 flex-grow">
                  <p
                    className={`text-xs font-bold truncate transition-colors ${
                      isActive
                        ? 'text-accent-violet'
                        : 'text-text-primary group-hover:text-accent-violet'
                    }`}
                  >
                    {ep.title || `Episode ${ep.number}`}
                  </p>
                  {ep.aired && (
                    <p className="text-[10px] text-text-disabled mt-0.5">
                      {new Date(ep.aired).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  )}
                </div>

                {/* Sub-label badges */}
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  {ep.filler && (
                    <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 rounded">
                      Filler
                    </span>
                  )}
                  {ep.recap && (
                    <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 bg-accent-violet/10 border border-accent-violet/20 text-accent-violet rounded">
                      Recap
                    </span>
                  )}
                </div>
              </Link>
            );
          })
        )}
      </div>

      {/* Footer stats summary */}
      <div className="p-3 border-t border-border-subtle text-[10px] text-text-muted font-semibold bg-surface-1/50 flex-shrink-0 flex justify-between">
        <span>Total: {resolvedEpisodes.length} episodes</span>
        <span>Watched: {watchedEpisodes.length}</span>
      </div>
    </div>
  );
}
