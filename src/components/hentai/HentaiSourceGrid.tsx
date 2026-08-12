'use client';

import React, { useState } from 'react';
import { HentaiSource } from '@/services/hentai';
import HentaiSourceCard from './HentaiSourceCard';

type FilterType = 'all' | 'working' | 'cf_protected' | 'github';

interface HentaiSourceGridProps {
  sources: HentaiSource[];
}

const FILTERS: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'All Sources' },
  { value: 'working', label: 'Working' },
  { value: 'cf_protected', label: 'CF Protected' },
  { value: 'github', label: 'GitHub' },
];

export default function HentaiSourceGrid({ sources }: HentaiSourceGridProps) {
  const [filter, setFilter] = useState<FilterType>('all');

  const filtered = filter === 'all' ? sources : sources.filter((s) => s.status === filter);

  return (
    <div>
      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {FILTERS.map((f) => {
          const count = f.value === 'all' ? sources.length : sources.filter((s) => s.status === f.value).length;
          return (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                filter === f.value
                  ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                  : 'text-text-secondary border border-border-subtle hover:text-text-primary hover:border-red-500/20 bg-white/[0.02]'
              }`}
            >
              {f.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${filter === f.value ? 'bg-red-500/20 text-red-300' : 'bg-white/5 text-text-muted'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((source) => (
          <HentaiSourceCard key={source.id} source={source} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-text-muted text-sm">
          No sources match this filter.
        </div>
      )}
    </div>
  );
}