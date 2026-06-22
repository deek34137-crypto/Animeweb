'use client';

import React from 'react';

type FilterType = 'all' | 'anime' | 'character' | 'studio' | 'people' | 'genre';

interface SearchFiltersProps {
  activeFilter: FilterType;
  onChange: (filter: FilterType) => void;
}

export default function SearchFilters({ activeFilter, onChange }: SearchFiltersProps) {
  const filters: { value: FilterType; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'anime', label: 'Anime' },
    { value: 'character', label: 'Characters' },
    { value: 'studio', label: 'Studios' },
    { value: 'people', label: 'Voice Actors' },
    { value: 'genre', label: 'Genres' },
  ];

  return (
    <div className="flex gap-2 overflow-x-auto px-5 py-3 border-b border-border-subtle bg-bg-elevated/10 scrollbar-none select-none">
      {filters.map((f) => {
        const active = activeFilter === f.value;
        return (
          <button
            key={f.value}
            onClick={() => onChange(f.value)}
            className={`text-xs px-3.5 py-1.5 rounded-xl font-bold transition-all border whitespace-nowrap ${
              active
                ? 'bg-accent-violet/10 border-accent-violet/30 text-[#7c3aed]'
                : 'bg-transparent border-border-subtle text-text-secondary hover:text-text-primary hover:border-text-secondary/20'
            }`}
          >
            {f.label}
          </button>
        );
      })}
    </div>
  );
}
