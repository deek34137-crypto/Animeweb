'use client';

import React, { useEffect, useState } from 'react';
import { Link, usePathname } from '@/navigation';
import { Clock, ArrowRight, Tv, Compass, Settings, User, Search } from 'lucide-react';

interface HistoryItem {
  path: string;
  title: string;
  timestamp: number;
}

export default function RecentHistory() {
  const pathname = usePathname();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window === 'undefined') return;

    const loadHistory = () => {
      try {
        const stored = localStorage.getItem('aniworld-page-history');
        return stored ? JSON.parse(stored) : [];
      } catch (e) {
        return [];
      }
    };

    const saveHistory = (items: HistoryItem[]) => {
      localStorage.setItem('aniworld-page-history', JSON.stringify(items));
    };

    // Calculate a clean title for the page
    let title = 'Page';
    if (pathname === '/' || pathname === '/dashboard') {
      title = 'Dashboard';
    } else if (pathname === '/settings') {
      title = 'Account Settings';
    } else if (pathname === '/profile/settings') {
      title = 'Player Settings';
    } else if (pathname === '/profile') {
      title = 'My Anime';
    } else if (pathname === '/history') {
      title = 'Watch History';
    } else if (pathname === '/search') {
      title = 'Search';
    } else if (pathname.includes('/watch/')) {
      const parts = pathname.split('/');
      const animeId = parts[parts.indexOf('watch') + 1];
      title = `Watching #${animeId}`;
    } else if (pathname.includes('/anime/')) {
      const parts = pathname.split('/');
      const animeId = parts[parts.indexOf('anime') + 1];
      title = `Anime Details`;
      
      // Attempt to retrieve actual title dynamically
      setTimeout(() => {
        const docTitle = document.title.split(' - ')[0];
        if (docTitle && !docTitle.includes('Anime Details') && !docTitle.includes('AnimeWorld') && !docTitle.includes('Anime #')) {
          const current = loadHistory();
          const updated = current.map((item: HistoryItem) => 
            item.path === pathname ? { ...item, title: docTitle } : item
          );
          setHistory(updated);
          saveHistory(updated);
        }
      }, 800);
    } else {
      title = pathname.substring(1).charAt(0).toUpperCase() + pathname.substring(2);
    }

    const currentHistory = loadHistory();
    const filtered = currentHistory.filter((item: HistoryItem) => item.path !== pathname);
    const updated = [{ path: pathname, title, timestamp: Date.now() }, ...filtered].slice(0, 5);

    setHistory(updated);
    saveHistory(updated);
  }, [pathname]);

  const getIcon = (title: string) => {
    const t = title.toLowerCase();
    if (t.includes('dashboard')) return <Compass size={13} className="text-[#3b82f6]" />;
    if (t.includes('watch') || t.includes('watching')) return <Tv size={13} className="text-[#a855f7]" />;
    if (t.includes('anime') || t.includes('details')) return <Tv size={13} className="text-[#ec4899]" />;
    if (t.includes('settings')) return <Settings size={13} className="text-[#64748b]" />;
    if (t.includes('my anime')) return <User size={13} className="text-[#10b981]" />;
    if (t.includes('history')) return <Clock size={13} className="text-[#f59e0b]" />;
    if (t.includes('search')) return <Search size={13} className="text-[#06b6d4]" />;
    return <Compass size={13} className="text-[#64748b]" />;
  };

  if (!mounted) return null;

  const recents = history.filter(item => item.path !== pathname);

  if (recents.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Clock size={12} className="text-text-secondary" />
        <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Recently Visited</h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {recents.map((item) => (
          <Link
            key={item.path}
            href={item.path as '/'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border-subtle bg-bg-secondary hover:border-[#7c3aed]/30 hover:bg-bg-elevated text-xs text-text-secondary hover:text-text-primary transition-all duration-200 group"
          >
            {getIcon(item.title)}
            <span className="truncate max-w-[130px] font-medium">{item.title}</span>
            <ArrowRight size={10} className="text-text-disabled group-hover:translate-x-0.5 transition-transform" />
          </Link>
        ))}
      </div>
    </div>
  );
}
