'use client';

import React, { useState, useCallback } from 'react';
import { Search, X as XIcon } from 'lucide-react';
import { HentaiSource } from '@/services/hentai';
import { HStreamVideo } from '@/services/hentai';
import HentaiSourceCard from './HentaiSourceCard';
import HentaiPlayerModal, { HentaiModalPayload } from './HentaiPlayerModal';

type FilterType = 'all' | 'working' | 'cf_protected' | 'github';

interface HentaiSourceGridProps {
  sources: HentaiSource[];
  trendingVideos?: HStreamVideo[];
}

const FILTERS: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'All Sources' },
  { value: 'working', label: 'Working' },
  { value: 'cf_protected', label: 'CF Protected' },
  { value: 'github', label: 'GitHub' },
];

export default function HentaiSourceGrid({ sources, trendingVideos = [] }: HentaiSourceGridProps) {
  const [filter, setFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');
  const [modalPayload, setModalPayload] = useState<HentaiModalPayload | null>(null);

  const openModal = useCallback((payload: HentaiModalPayload) => {
    setModalPayload(payload);
  }, []);

  const closeModal = useCallback(() => {
    setModalPayload(null);
  }, []);

  const filtered = sources.filter((s) => {
    const matchStatus = filter === 'all' || s.status === filter;
    const matchSearch =
      !search.trim() ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.description.toLowerCase().includes(search.toLowerCase()) ||
      s.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
    return matchStatus && matchSearch;
  });

  return (
    <>
      {/* Search + Filter Row */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Search input */}
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sources by name, genre, tag…"
            className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-9 pr-9 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-red-500/40 focus:bg-white/[0.06] transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
            >
              <XIcon size={13} />
            </button>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1.5 flex-wrap">
          {FILTERS.map((f) => {
            const count =
              f.value === 'all' ? sources.length : sources.filter((s) => s.status === f.value).length;
            return (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 ${
                  filter === f.value
                    ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                    : 'text-text-secondary border border-border-subtle hover:text-text-primary hover:border-red-500/20 bg-white/[0.02]'
                }`}
              >
                {f.label}
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                    filter === f.value ? 'bg-red-500/20 text-red-300' : 'bg-white/5 text-text-muted'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick-stream from trending videos — show as small video cards */}
      {trendingVideos.length > 0 && !search && filter === 'all' && (
        <div className="mb-8">
          <h3 className="text-xs font-bold text-text-muted uppercase tracking-widest mb-3">
            🔥 Quick Stream — Trending Now
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {trendingVideos.slice(0, 12).map((video) => (
              <button
                key={video.id}
                onClick={() => openModal({ video })}
                className="group relative rounded-xl overflow-hidden border border-white/[0.06] hover:border-red-500/30 transition-all duration-200 hover:-translate-y-0.5 text-left"
                aria-label={`Stream ${video.title}`}
              >
                {video.cover ? (
                  <div className="aspect-[3/4] relative overflow-hidden">
                    <img
                      src={video.cover}
                      alt={video.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    {/* Play overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-red-500/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity scale-75 group-hover:scale-100 duration-200">
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-white ml-0.5">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                    {video.views > 0 && (
                      <div className="absolute bottom-1.5 left-1.5 right-1.5">
                        <span className="text-[9px] bg-black/70 text-white/70 rounded-full px-1.5 py-0.5">
                          {(video.views / 1000).toFixed(0)}K
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="aspect-[3/4] bg-red-950/30 flex items-center justify-center text-3xl">🎬</div>
                )}
                <div className="p-2">
                  <p className="text-[10px] font-semibold text-text-primary line-clamp-2 leading-tight">
                    {video.title}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Source Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((source) => (
          <HentaiSourceCard key={source.id} source={source} onStream={openModal} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-text-muted text-sm">
          {search
            ? `No sources match "${search}". Try clearing the search.`
            : 'No sources match this filter.'}
        </div>
      )}

      {/* Player Modal */}
      <HentaiPlayerModal payload={modalPayload} onClose={closeModal} />
    </>
  );
}