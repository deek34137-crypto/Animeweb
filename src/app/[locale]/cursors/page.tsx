'use client';

import React, { useState, useMemo } from 'react';
import { useCursor } from '@/providers/CursorProvider';
import CursorPackCard from '@/components/cursor/CursorPackCard';
import { Search, RotateCcw, MousePointer, HelpCircle } from 'lucide-react';

const CATEGORIES = [
  'All',
  'Anime / Manga',
  'Games',
  'Viral Memes',
  'Cartoon & Movies',
  'Others',
];

const ITEMS_PER_PAGE = 24;

export default function CursorsPage() {
  const { cursorPacks, activeCursor, resetToDefault, isLoading } = useCursor();
  
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  // Filter and search cursor packs
  const filteredPacks = useMemo(() => {
    return cursorPacks.filter((pack) => {
      const matchesCategory =
        selectedCategory === 'All' || pack.category === selectedCategory;
      const matchesSearch =
        pack.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pack.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [cursorPacks, selectedCategory, searchQuery]);

  // Reset page size when filters change
  React.useEffect(() => {
    setVisibleCount(ITEMS_PER_PAGE);
  }, [selectedCategory, searchQuery]);

  const visiblePacks = useMemo(() => {
    return filteredPacks.slice(0, visibleCount);
  }, [filteredPacks, visibleCount]);

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + ITEMS_PER_PAGE);
  };

  // Count items per category dynamically
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: cursorPacks.length };
    cursorPacks.forEach((pack) => {
      counts[pack.category] = (counts[pack.category] || 0) + 1;
    });
    return counts;
  }, [cursorPacks]);

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-t-[#7c3aed] border-r-transparent border-b-[#ec4899] border-l-transparent animate-spin" />
        <p className="text-sm font-semibold text-text-secondary animate-pulse">
          Loading custom cursors...
        </p>
      </div>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Premium Header */}
      <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-16 relative">
        {/* Glow behind header */}
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-72 h-72 bg-gradient-to-tr from-[#7c3aed]/10 to-[#ec4899]/10 rounded-full blur-3xl -z-10" />

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#7c3aed]/10 border border-[#7c3aed]/20 text-xs font-semibold text-[#9f5eff] mb-4">
          <MousePointer size={12} /> Personalization
        </span>
        
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-4 font-display bg-gradient-to-r from-text-primary via-[#9f5eff] to-[#ec4899] bg-clip-text text-transparent">
          Custom Cursor Gallery
        </h1>
        
        <p className="text-sm sm:text-base text-text-secondary">
          Personalize your AnimeWorld experience! Browse and pick your favorite cursor.
          <span className="block mt-1 text-xs text-[#9f5eff]/80 font-medium">
            💡 Hover over any card to live-preview the cursor instantly!
          </span>
        </p>
      </div>

      {/* Active Cursor & Controls Bar */}
      <div className="glass-panel border border-border-subtle bg-white/[0.02] dark:bg-bg-secondary p-4 sm:p-6 rounded-3xl mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-border-subtle flex items-center justify-center flex-shrink-0">
            {activeCursor ? (
              <div className="flex gap-1.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={activeCursor.cursor} className="w-6 h-6 object-contain" alt="Active Cursor" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={activeCursor.pointer} className="w-6 h-6 object-contain" alt="Active Pointer" />
              </div>
            ) : (
              <MousePointer className="text-text-muted" size={20} />
            )}
          </div>
          <div className="text-center sm:text-left">
            <span className="text-[10px] uppercase font-mono tracking-wider text-text-muted block">
              Active Style
            </span>
            <span className="text-sm font-bold text-text-primary">
              {activeCursor ? activeCursor.name : 'Default Browser Cursor'}
            </span>
          </div>
        </div>

        {activeCursor && (
          <button
            onClick={resetToDefault}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-white/[0.05] rounded-xl border border-border-subtle transition-all duration-200"
          >
            <RotateCcw size={13} /> Reset to Default
          </button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-6 mb-8">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* Category Tabs */}
          <div className="flex flex-wrap gap-1.5 bg-white/[0.02] dark:bg-black/20 p-1 border border-border-subtle rounded-2xl w-full md:w-auto">
            {CATEGORIES.map((category) => {
              const count = categoryCounts[category] || 0;
              const isSelected = selectedCategory === category;
              return (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-gradient-to-r from-[#7c3aed] to-[#ec4899] text-white shadow-lg'
                      : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.03]'
                  }`}
                >
                  <span>{category}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-white/[0.05] text-text-muted'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
            <input
              type="text"
              placeholder="Search cursors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/[0.03] dark:bg-black/20 border border-border-subtle rounded-2xl pl-10 pr-4 py-2.5 text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-[#7c3aed]/50 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Cursors Grid */}
      {filteredPacks.length === 0 ? (
        <div className="text-center py-20 glass-panel border border-border-subtle rounded-3xl">
          <HelpCircle size={40} className="mx-auto text-text-muted mb-4 animate-bounce" />
          <h3 className="text-base font-bold text-text-primary mb-1">No cursors found</h3>
          <p className="text-xs text-text-secondary max-w-xs mx-auto">
            Try matching a different keyword or check your spelling.
          </p>
        </div>
      ) : (
        <div className="space-y-12">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-6">
            {visiblePacks.map((pack) => (
              <CursorPackCard key={pack.id} pack={pack} />
            ))}
          </div>

          {/* Load More Button */}
          {filteredPacks.length > visibleCount && (
            <div className="text-center">
              <button
                onClick={handleLoadMore}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-[#7c3aed] to-[#ec4899] text-xs font-bold text-white shadow-lg hover:shadow-xl hover:opacity-90 active:scale-95 transition-all duration-200"
              >
                Load More Cursors
              </button>
              <p className="text-[10px] text-text-muted mt-3">
                Showing {visibleCount} of {filteredPacks.length} cursors
              </p>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
