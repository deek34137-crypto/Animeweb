'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from '@/navigation';
import { useTheme } from '@/providers/ThemeProvider';
import {
  Compass, Search, Settings, HelpCircle, Sun, Moon, Laptop, Keyboard, Plus, X
} from 'lucide-react';

export default function QuickMenu() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Click outside to close
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handler);
    }
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleOpenSearch = () => {
    setOpen(false);
    window.dispatchEvent(new CustomEvent('open-global-search'));
  };

  const handleOpenShortcuts = () => {
    setOpen(false);
    window.dispatchEvent(new CustomEvent('open-shortcut-helper'));
  };

  const cycleTheme = () => {
    const themes: ('light' | 'dark' | 'system')[] = ['light', 'dark', 'system'];
    const nextIndex = (themes.indexOf(theme) + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  const getThemeIcon = () => {
    switch (theme) {
      case 'light':
        return <Sun size={14} className="text-amber-500" />;
      case 'dark':
        return <Moon size={14} className="text-violet-400" />;
      default:
        return <Laptop size={14} className="text-text-secondary" />;
    }
  };

  return (
    <div ref={menuRef} className="fixed bottom-6 right-6 z-40 hidden md:block">
      {/* Menu Actions Stack */}
      {open && (
        <div
          className="absolute bottom-14 right-0 flex flex-col gap-2 p-2 rounded-2xl glass-panel border border-border-subtle bg-bg-secondary/95 shadow-2xl min-w-[170px]"
          style={{
            animation: 'slideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          }}
        >
          <div className="px-2.5 py-1.5 border-b border-border-subtle mb-1">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Quick Actions</span>
          </div>

          {/* Go Home */}
          <button
            onClick={() => {
              setOpen(false);
              router.push('/');
            }}
            className="flex items-center gap-2.5 px-2.5 py-2 text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-bg-elevated rounded-xl transition-all"
          >
            <Compass size={14} className="text-text-muted" />
            <span>Go Dashboard</span>
          </button>

          {/* Search */}
          <button
            onClick={handleOpenSearch}
            className="flex items-center gap-2.5 px-2.5 py-2 text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-bg-elevated rounded-xl transition-all"
          >
            <Search size={14} className="text-text-muted" />
            <span>Search Search</span>
          </button>

          {/* Theme cycle */}
          <button
            onClick={cycleTheme}
            className="flex items-center justify-between w-full px-2.5 py-2 text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-bg-elevated rounded-xl transition-all"
          >
            <div className="flex items-center gap-2.5">
              {getThemeIcon()}
              <span>Toggle Theme</span>
            </div>
            <span className="text-[9px] font-bold text-text-disabled capitalize border border-border-subtle rounded px-1">{theme}</span>
          </button>

          {/* Shortcuts */}
          <button
            onClick={handleOpenShortcuts}
            className="flex items-center gap-2.5 px-2.5 py-2 text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-bg-elevated rounded-xl transition-all"
          >
            <Keyboard size={14} className="text-text-muted" />
            <span>Keyboard Shortcuts</span>
          </button>

          {/* Settings */}
          <button
            onClick={() => {
              setOpen(false);
              router.push('/profile/settings');
            }}
            className="flex items-center gap-2.5 px-2.5 py-2 text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-bg-elevated rounded-xl transition-all"
          >
            <Settings size={14} className="text-text-muted" />
            <span>Settings</span>
          </button>
        </div>
      )}

      {/* Floating Trigger Button */}
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center justify-center w-11 h-11 rounded-full shadow-lg border border-border-subtle bg-bg-secondary hover:bg-bg-elevated text-text-primary transition-all duration-300 hover:scale-105 active:scale-95 ${
          open ? 'rotate-90 border-[#7c3aed]/40 text-[#7c3aed] shadow-[#7c3aed]/10 shadow-xl' : ''
        }`}
        aria-label="Quick Navigation Menu"
        aria-expanded={open}
      >
        {open ? <X size={18} /> : <Compass size={18} className="animate-spin-slow" />}
      </button>
    </div>
  );
}
