'use client';

import React from 'react';
import { Search } from 'lucide-react';

export default function GlobalSearch() {
  const triggerSearch = () => {
    const event = new CustomEvent('open-global-search');
    window.dispatchEvent(event);
  };

  return (
    <button
      onClick={triggerSearch}
      className="flex items-center gap-2 bg-white/[0.04] dark:bg-white/[0.02] border border-border-subtle rounded-xl px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary hover:border-[#7c3aed]/50 transition-all duration-200"
      aria-label="Search"
    >
      <Search size={13} className="text-text-muted" />
      <span>Search...</span>
      <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[9px] text-text-disabled font-mono border border-border-subtle rounded px-1.5">
        /
      </kbd>
    </button>
  );
}
