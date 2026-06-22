'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from '@/navigation';
import { Search, X, Loader2, Calendar, Award, Tv, User, Library, Star } from 'lucide-react';
import SearchFilters from './SearchFilters';
import SearchSuggestions from './SearchSuggestions';
import SearchHistory from './SearchHistory';
import SearchResults from './SearchResults';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'anime' | 'character' | 'studio' | 'people' | 'genre'>('all');
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load search history from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem('search_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch {}
    }
  }, []);

  const addQueryToHistory = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed || trimmed.length < 2) return;
    const updated = [trimmed, ...history.filter((h) => h !== trimmed)].slice(0, 8);
    setHistory(updated);
    localStorage.setItem('search_history', JSON.stringify(updated));
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('search_history');
  };

  // Keyboard shortcut '/' focuses search or opens modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !isOpen && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        onClose(); // In case another is open, close first
        // Trigger open
        const event = new CustomEvent('open-global-search');
        window.dispatchEvent(event);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Focus input on mount
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  // Debounced search logic
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const delayDebounce = setTimeout(async () => {
      try {
        const typeParam = activeFilter === 'all' ? 'anime' : activeFilter;
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&type=${typeParam}&limit=12`);
        if (res.ok) {
          const json = await res.json();
          setResults(json.data || []);
        }
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setIsLoading(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [query, activeFilter]);

  const handleSelectQuery = (selectedQuery: string) => {
    setQuery(selectedQuery);
    addQueryToHistory(selectedQuery);
  };

  const handleViewAll = () => {
    addQueryToHistory(query);
    router.push(`/search?q=${encodeURIComponent(query)}` as '/');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-start justify-center pt-[8vh] px-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Search Container Panel */}
      <div
        className="relative w-full max-w-2xl glass-panel border border-border-subtle bg-bg-secondary/95 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
        style={{
          animation: 'fadeIn 0.15s ease-out both',
          maxHeight: '520px',
        }}
      >
        {/* Search Header Input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border-subtle">
          {isLoading ? (
            <Loader2 size={20} className="text-accent-violet animate-spin flex-shrink-0" />
          ) : (
            <Search size={20} className="text-text-muted flex-shrink-0" />
          )}
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search anime, characters, studios, genres..."
            className="flex-1 bg-transparent text-text-primary placeholder:text-text-muted text-sm sm:text-base outline-none font-semibold"
            autoComplete="off"
            spellCheck={false}
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-text-muted hover:text-text-primary transition-colors">
              <X size={18} />
            </button>
          )}
          <button
            onClick={onClose}
            className="text-xs font-bold text-text-muted hover:text-text-primary px-2.5 py-1 border border-border-subtle rounded-xl bg-bg-elevated/40"
          >
            ESC
          </button>
        </div>

        {/* Filter Pills Header */}
        <SearchFilters activeFilter={activeFilter} onChange={setActiveFilter} />

        {/* Results Area */}
        <div className="flex-grow overflow-y-auto no-scrollbar p-5 space-y-6">
          {!query.trim() ? (
            /* History & Popular Keywords View */
            <SearchHistory
              history={history}
              onSelect={handleSelectQuery}
              onClear={clearHistory}
            />
          ) : (
            /* Search Suggestions or Grouped Grid Results */
            <>
              <SearchSuggestions query={query} onSelect={handleSelectQuery} />

              {results.length > 0 ? (
                <SearchResults
                  query={query}
                  filter={activeFilter}
                  results={results}
                  onSelect={(item) => {
                    addQueryToHistory(query);
                    onClose();
                  }}
                />
              ) : (
                !isLoading && (
                  <div className="py-8 text-center text-xs text-text-muted font-bold">
                    No matching search results found.
                  </div>
                )
              )}

              {/* Full Search page CTA */}
              {results.length > 0 && (
                <div className="pt-2 border-t border-border-subtle flex justify-end">
                  <button
                    onClick={handleViewAll}
                    className="inline-flex items-center gap-1 text-xs font-bold text-accent-violet hover:text-[#6b4ae6] transition-colors"
                  >
                    <span>View all matching results &rarr;</span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
