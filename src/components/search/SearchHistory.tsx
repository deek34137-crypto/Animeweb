'use client';

import React from 'react';
import { History, TrendingUp, Trash2 } from 'lucide-react';

interface SearchHistoryProps {
  history: string[];
  onSelect: (query: string) => void;
  onClear: () => void;
}

const POPULAR_SEARCHES = ['One Piece', 'Dandadan', 'Kaiju No. 8', 'Demon Slayer', 'Solo Leveling', 'Jujutsu Kaisen'];

export default function SearchHistory({ history, onSelect, onClear }: SearchHistoryProps) {
  return (
    <div className="space-y-6 select-none">
      {/* Search History */}
      {history.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
              <History size={13} className="text-accent-violet" />
              <span>Recent Searches</span>
            </h4>
            <button
              onClick={onClear}
              className="inline-flex items-center gap-1 text-[10px] font-bold text-text-muted hover:text-red-500 transition-colors"
            >
              <Trash2 size={11} />
              <span>Clear</span>
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {history.map((q, idx) => (
              <button
                key={`${q}-${idx}`}
                onClick={() => onSelect(q)}
                className="text-xs px-3 py-1.5 rounded-xl border border-border-subtle bg-bg-secondary hover:border-text-secondary/20 text-text-primary font-semibold transition-all"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Popular Searches */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
          <TrendingUp size={13} className="text-accent-pink" />
          <span>Popular Searches</span>
        </h4>
        <div className="flex flex-wrap gap-2">
          {POPULAR_SEARCHES.map((q) => (
            <button
              key={q}
              onClick={() => onSelect(q)}
              className="text-xs px-3 py-1.5 rounded-xl border border-border-subtle bg-bg-secondary hover:border-accent-pink/20 hover:text-accent-pink text-text-primary font-semibold transition-all"
            >
              {q}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
