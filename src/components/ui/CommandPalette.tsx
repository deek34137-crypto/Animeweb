'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Loader2, TrendingUp, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { AnimeData } from '@/services/jikan';

interface SearchResult {
  type: 'anime' | 'character';
  id: number;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  score?: number;
}

let debounceTimer: ReturnType<typeof setTimeout>;

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const locale = useLocale();

  const open = useCallback(() => {
    setIsOpen(true);
    setQuery('');
    setResults([]);
    setSelectedIndex(0);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery('');
    setResults([]);
  }, []);

  // Keyboard shortcut listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        isOpen ? close() : open();
      }
      if (e.key === '/' && !isOpen && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        open();
      }
      if (e.key === 'Escape' && isOpen) {
        close();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, open, close]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  // Search with debounce
  useEffect(() => {
    clearTimeout(debounceTimer);
    if (!query.trim() || query.length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    debounceTimer = setTimeout(async () => {
      try {
        const [animeRes, charRes] = await Promise.all([
          fetch(`/api/search?q=${encodeURIComponent(query)}&type=anime&limit=5`),
          fetch(`/api/search?q=${encodeURIComponent(query)}&type=character&limit=3`),
        ]);

        const animeData = animeRes.ok ? await animeRes.json() : { data: [] };
        const charData = charRes.ok ? await charRes.json() : { data: [] };

        const animeResults: SearchResult[] = (animeData.data || []).map((a: AnimeData) => ({
          type: 'anime' as const,
          id: a.mal_id,
          title: a.title_english || a.title,
          subtitle: `${a.type || 'TV'} · ${a.episodes ? `${a.episodes} eps` : 'Ongoing'} · ★${a.score?.toFixed(1) || 'N/A'}`,
          imageUrl: a.images?.webp?.image_url || a.images?.jpg?.image_url,
          score: a.score,
        }));

        const charResults: SearchResult[] = (charData.data || []).map((c: { character: { mal_id: number; name: string; images?: { webp?: { image_url?: string } } } }) => ({
          type: 'character' as const,
          id: c.character?.mal_id,
          title: c.character?.name,
          imageUrl: c.character?.images?.webp?.image_url,
        }));

        setResults([...animeResults, ...charResults]);
        setSelectedIndex(0);
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 280);
  }, [query]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        navigate(results[selectedIndex]);
      } else if (query.trim()) {
        router.push(`/${locale}/search?q=${encodeURIComponent(query.trim())}`);
        close();
      }
    }
  };

  const navigate = (result: SearchResult) => {
    if (result.type === 'anime') {
      router.push(`/${locale}/anime/${result.id}`);
    } else {
      router.push(`/${locale}/search?q=${encodeURIComponent(result.title)}&type=characters`);
    }
    close();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh] px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={close}
        aria-hidden="true"
      />

      {/* Palette Panel */}
      <div
        className="relative w-full max-w-xl glass-panel border border-border-default rounded-2xl shadow-2xl overflow-hidden"
        style={{ animation: 'cmdPaletteIn 0.18s ease-out both' }}
        role="dialog"
        aria-modal="true"
        aria-label="Search"
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border-subtle">
          {isLoading ? (
            <Loader2 size={18} className="text-text-muted animate-spin flex-shrink-0" />
          ) : (
            <Search size={18} className="text-text-muted flex-shrink-0" />
          )}
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search anime, characters…"
            className="flex-1 bg-transparent text-text-primary placeholder:text-text-muted text-sm outline-none"
            autoComplete="off"
            spellCheck={false}
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-text-muted hover:text-text-primary transition-colors">
              <X size={16} />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-1 text-[10px] text-text-disabled border border-border-subtle rounded px-1.5 py-0.5 font-mono">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[360px] overflow-y-auto no-scrollbar py-2">
          {!query && (
            <div className="px-4 py-8 text-center">
              <Search size={32} className="text-text-disabled mx-auto mb-3" />
              <p className="text-sm text-text-muted">Search for anime or characters</p>
              <p className="text-xs text-text-disabled mt-1">Press Enter to see full results</p>
            </div>
          )}

          {query.length >= 2 && !isLoading && results.length === 0 && (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-text-muted">No results for &ldquo;{query}&rdquo;</p>
            </div>
          )}

          {results.length > 0 && (
            <ul role="listbox">
              {/* Anime section */}
              {results.filter(r => r.type === 'anime').length > 0 && (
                <>
                  <li className="px-4 py-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-text-disabled">
                    <TrendingUp size={10} />
                    Anime
                  </li>
                  {results.filter(r => r.type === 'anime').map((result, idx) => {
                    const globalIdx = idx;
                    return (
                      <li key={`anime-${result.id}`} role="option" aria-selected={globalIdx === selectedIndex}>
                        <button
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                            globalIdx === selectedIndex
                              ? 'bg-accent-violet/10 text-text-primary'
                              : 'hover:bg-surface-2 text-text-secondary'
                          }`}
                          onClick={() => navigate(result)}
                          onMouseEnter={() => setSelectedIndex(globalIdx)}
                        >
                          {result.imageUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={result.imageUrl}
                              alt={result.title}
                              className="w-9 h-12 object-cover rounded-md flex-shrink-0 bg-surface-3"
                              referrerPolicy="no-referrer"
                            />
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate text-text-primary">{result.title}</p>
                            {result.subtitle && (
                              <p className="text-[11px] text-text-muted mt-0.5 truncate">{result.subtitle}</p>
                            )}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </>
              )}

              {/* Character section */}
              {results.filter(r => r.type === 'character').length > 0 && (
                <>
                  <li className="px-4 py-1.5 mt-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-text-disabled border-t border-border-subtle">
                    <User size={10} />
                    Characters
                  </li>
                  {results.filter(r => r.type === 'character').map((result, idx) => {
                    const globalIdx = results.filter(r => r.type === 'anime').length + idx;
                    return (
                      <li key={`char-${result.id}`} role="option" aria-selected={globalIdx === selectedIndex}>
                        <button
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                            globalIdx === selectedIndex
                              ? 'bg-accent-violet/10 text-text-primary'
                              : 'hover:bg-surface-2 text-text-secondary'
                          }`}
                          onClick={() => navigate(result)}
                          onMouseEnter={() => setSelectedIndex(globalIdx)}
                        >
                          {result.imageUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={result.imageUrl}
                              alt={result.title}
                              className="w-9 h-9 object-cover rounded-full flex-shrink-0 bg-surface-3"
                              referrerPolicy="no-referrer"
                            />
                          )}
                          <p className="text-sm font-semibold text-text-primary truncate">{result.title}</p>
                        </button>
                      </li>
                    );
                  })}
                </>
              )}
            </ul>
          )}

          {/* Full search link */}
          {query.trim().length >= 2 && (
            <div className="border-t border-border-subtle px-4 py-2.5 mt-1">
              <button
                className="w-full flex items-center gap-2 text-sm text-accent-violet hover:text-text-primary transition-colors"
                onClick={() => {
                  router.push(`/${locale}/search?q=${encodeURIComponent(query.trim())}`);
                  close();
                }}
              >
                <Search size={14} />
                Search all results for &ldquo;{query}&rdquo;
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
