'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Loader2, Home, Play, Heart, Clock, Flame, Calendar, Star, Settings, Laptop, Moon, Sun, Tv, Sliders } from 'lucide-react';
import { useRouter } from '@/navigation';
import { useLocale } from 'next-intl';
import { AnimeData } from '@/services/jikan';
import { useTheme } from '@/providers/ThemeProvider';
import { useWatchlistStore } from '@/store/useWatchlistStore';

interface SearchResult {
  type: 'anime' | 'character' | 'action';
  id: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  score?: number;
  action?: () => void;
  icon?: React.ReactNode;
}

let debounceTimer: ReturnType<typeof setTimeout>;

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentCommands, setRecentCommands] = useState<string[]>([]);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const locale = useLocale();
  const { setTheme } = useTheme();
  const { entries } = useWatchlistStore();

  // Load recent commands from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem('recent_commands');
    if (saved) {
      try {
        setRecentCommands(JSON.parse(saved));
      } catch {}
    }
  }, []);

  const saveRecentCommand = (commandName: string) => {
    const updated = [commandName, ...recentCommands.filter(c => c !== commandName)].slice(0, 5);
    setRecentCommands(updated);
    localStorage.setItem('recent_commands', JSON.stringify(updated));
  };

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
      if (e.key === '/' && !isOpen && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
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

  // Resume last watched helper
  const handleResumeWatch = () => {
    const watchingList = Object.values(entries).filter(e => e.status === 'watching');
    const latestWatch = watchingList.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )[0];
    
    if (latestWatch) {
      router.push(`/watch/${latestWatch.animeId}/${latestWatch.episodesWatched}` as '/');
    } else {
      router.push('/profile?tab=watching');
    }
  };

  // Define static quick actions list
  const getQuickActions = useCallback((): SearchResult[] => {
    return [
      {
        type: 'action',
        id: 'go-home',
        title: 'Go to Dashboard',
        subtitle: 'Navigate back to homepage',
        icon: <Home size={14} className="text-accent-violet" />,
        action: () => { router.push('/'); saveRecentCommand('Go to Dashboard'); }
      },
      {
        type: 'action',
        id: 'go-my-anime',
        title: 'Go to My Anime',
        subtitle: 'View your library progress',
        icon: <Heart size={14} className="text-accent-pink" />,
        action: () => { router.push('/profile'); saveRecentCommand('Go to My Anime'); }
      },
      {
        type: 'action',
        id: 'go-history',
        title: 'Go to Watch History',
        subtitle: 'Check recently watched episodes',
        icon: <Clock size={14} className="text-accent-cyan" />,
        action: () => { router.push('/history'); saveRecentCommand('Go to Watch History'); }
      },
      {
        type: 'action',
        id: 'resume-watch',
        title: 'Resume Last Watch',
        subtitle: 'Play the latest active show in progress',
        icon: <Play size={14} className="text-emerald-500" />,
        action: () => { handleResumeWatch(); saveRecentCommand('Resume Last Watch'); }
      },
      {
        type: 'action',
        id: 'theme-light',
        title: 'Switch to Light Theme',
        subtitle: 'Change app theme to Light',
        icon: <Sun size={14} className="text-amber-500" />,
        action: () => { setTheme('light'); saveRecentCommand('Switch to Light Theme'); }
      },
      {
        type: 'action',
        id: 'theme-dark',
        title: 'Switch to Dark Theme',
        subtitle: 'Change app theme to Dark',
        icon: <Moon size={14} className="text-violet-400" />,
        action: () => { setTheme('dark'); saveRecentCommand('Switch to Dark Theme'); }
      },
      {
        type: 'action',
        id: 'theme-system',
        title: 'Switch to System Theme',
        subtitle: 'Sync app theme with OS',
        icon: <Laptop size={14} className="text-text-muted" />,
        action: () => { setTheme('system'); saveRecentCommand('Switch to System Theme'); }
      },
      {
        type: 'action',
        id: 'go-player-settings',
        title: 'Open Player Settings',
        subtitle: 'Configure auto-skip, audio language, quality, and countdowns',
        icon: <Settings size={14} className="text-text-secondary" />,
        action: () => { router.push('/profile/settings'); saveRecentCommand('Open Player Settings'); }
      },
      {
        type: 'action',
        id: 'go-account-settings',
        title: 'Open Account Settings',
        subtitle: 'Configure your profile bio, sync, and tracking integrations',
        icon: <Sliders size={14} className="text-text-secondary" />,
        action: () => { router.push('/settings'); saveRecentCommand('Open Account Settings'); }
      }
    ];
  }, [entries, router, recentCommands]);

  // Search with debounce
  useEffect(() => {
    clearTimeout(debounceTimer);
    
    if (!query.trim() || query.length < 2) {
      // If empty, show quick actions (sorted with recents at top if matching)
      const actions = getQuickActions();
      setResults(actions);
      setSelectedIndex(0);
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
          id: String(a.mal_id),
          title: a.title_english || a.title,
          subtitle: `${a.type || 'TV'} · ${a.episodes ? `${a.episodes} eps` : 'Ongoing'} · ★${a.score?.toFixed(1) || 'N/A'}`,
          imageUrl: a.images?.webp?.image_url || a.images?.jpg?.image_url,
          score: a.score || 0,
        }));

        const charResults: SearchResult[] = (charData.data || []).map((c: any) => ({
          type: 'character' as const,
          id: String(c.character?.mal_id),
          title: c.character?.name,
          imageUrl: c.character?.images?.webp?.image_url || c.character?.images?.jpg?.image_url,
        }));

        setResults([...animeResults, ...charResults]);
        setSelectedIndex(0);
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 280);
  }, [query, getQuickActions]);

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
        executeSelection(results[selectedIndex]);
      } else if (query.trim()) {
        router.push(`/search?q=${encodeURIComponent(query.trim())}`);
        close();
      }
    }
  };

  const executeSelection = (result: SearchResult) => {
    if (result.type === 'action' && result.action) {
      result.action();
    } else if (result.type === 'anime') {
      router.push(`/anime/${result.id}` as '/');
    } else if (result.type === 'character') {
      router.push(`/search?q=${encodeURIComponent(result.title)}&type=characters`);
    }
    close();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[12vh] px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-md transition-opacity duration-300"
        onClick={close}
        aria-hidden="true"
      />

      {/* Palette Panel */}
      <div
        className="relative w-full max-w-xl glass-panel border border-border-subtle bg-bg-secondary/95 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{
          animation: 'fadeIn 0.15s ease-out both',
          maxHeight: '480px',
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Command Palette"
      >
        {/* Input Bar */}
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
            placeholder="Search commands, anime, pages..."
            className="flex-1 bg-transparent text-text-primary placeholder:text-text-muted text-sm outline-none font-medium"
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

        {/* Dynamic List */}
        <div className="flex-1 overflow-y-auto no-scrollbar py-2">
          {results.length === 0 && query.length >= 2 && !isLoading && (
            <div className="px-4 py-8 text-center text-text-muted text-xs">
              No matching results found.
            </div>
          )}

          {results.length > 0 && (
            <ul role="listbox">
              {/* Actions Section Header */}
              {results.some(r => r.type === 'action') && (
                <li className="px-4 py-1.5 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-text-muted">
                  System Controls & Navigation
                </li>
              )}

              {/* Anime Section Header */}
              {query.length >= 2 && results.some(r => r.type === 'anime') && (
                <li className="px-4 py-1.5 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-text-muted">
                  <Tv size={10} /> Anime Shows
                </li>
              )}

              {results.map((result, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <li key={result.id} role="option" aria-selected={isSelected}>
                    <button
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all duration-100 ${
                        isSelected
                          ? 'bg-accent-violet/10 text-accent-primary border-l-2 border-accent-violet pl-3.5'
                          : 'hover:bg-bg-elevated/40 text-text-secondary pl-4'
                      }`}
                      onClick={() => executeSelection(result)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                    >
                      {/* Icon or Thumbnail */}
                      {result.type === 'action' && result.icon && (
                        <div className="w-6 h-6 rounded-lg bg-bg-elevated flex items-center justify-center flex-shrink-0">
                          {result.icon}
                        </div>
                      )}
                      
                      {result.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={result.imageUrl}
                          alt={result.title}
                          className={`object-cover bg-surface-3 flex-shrink-0 ${
                            result.type === 'character' ? 'w-6 h-6 rounded-full' : 'w-7 h-9 rounded-md'
                          }`}
                          referrerPolicy="no-referrer"
                        />
                      )}

                      <div className="min-w-0 flex-1">
                        <p className={`text-xs font-bold truncate ${isSelected ? 'text-text-primary' : 'text-text-secondary'}`}>
                          {result.title}
                        </p>
                        {result.subtitle && (
                          <p className="text-[10px] text-text-muted mt-0.5 truncate">{result.subtitle}</p>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
