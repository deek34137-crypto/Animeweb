'use client';

import React from 'react';
import { Search, ArrowUpLeft } from 'lucide-react';

interface SearchSuggestionsProps {
  query: string;
  onSelect: (suggestion: string) => void;
}

const COMMON_TITLES = [
  'One Piece',
  'Naruto Shippuden',
  'Bleach: Thousand-Year Blood War',
  'Demon Slayer: Kimetsu no Yaiba',
  'Jujutsu Kaisen',
  'Attack on Titan',
  'My Hero Academia',
  'Frieren: Beyond Journey\'s End',
  'Spy x Family',
  'Chainsaw Man',
  'Fullmetal Alchemist: Brotherhood',
  'Steins;Gate'
];

export default function SearchSuggestions({ query, onSelect }: SearchSuggestionsProps) {
  if (!query || query.trim().length < 2) return null;

  const q = query.toLowerCase();
  const suggestions = COMMON_TITLES.filter((item) =>
    item.toLowerCase().includes(q) && item.toLowerCase() !== q
  ).slice(0, 3);

  if (suggestions.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Suggestions</span>
      <div className="flex flex-col gap-1.5">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            onClick={() => onSelect(suggestion)}
            className="flex items-center justify-between w-full px-3 py-2 rounded-xl bg-white/[0.01] hover:bg-white/[0.04] dark:bg-white/[0.005] dark:hover:bg-white/[0.02] border border-border-subtle hover:border-[#7c3aed]/20 text-xs font-semibold text-text-secondary hover:text-text-primary transition text-left group"
          >
            <div className="flex items-center gap-2">
              <Search size={12} className="text-text-muted group-hover:text-[#7c3aed] transition-colors" />
              <span>{suggestion}</span>
            </div>
            <ArrowUpLeft size={12} className="text-text-disabled opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        ))}
      </div>
    </div>
  );
}
