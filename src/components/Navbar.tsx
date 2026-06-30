'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useLocale } from 'next-intl';
import { Link, useRouter, usePathname } from '@/navigation';
import {
  Search, Menu, Globe, User, LogOut, Settings, Clock, Command, Tv, Sliders, MousePointer, ShieldAlert
} from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import ThemeToggle from '@/components/ui/ThemeToggle';
import NotificationBell from '@/components/notifications/NotificationBell';

interface NavbarProps {
  onToggleSidebar?: () => void;
}

export default function Navbar({ onToggleSidebar }: NavbarProps) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close menus on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLanguageChange = (newLocale: string) => {
    router.replace(pathname, { locale: newLocale as 'en' | 'es' | 'ja' });
  };

  return (
    <header className="sticky top-0 z-30 w-full bg-bg-primary/80 backdrop-blur-xl border-b border-border-subtle px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between transition-colors duration-200">
      {/* Left: Mobile Toggle & Logo */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors"
          aria-label="Toggle Sidebar Menu"
        >
          <Menu size={20} />
        </button>

        {/* Mobile-only logo */}
        <Link href="/" className="flex lg:hidden items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#7c3aed] to-[#ec4899] flex items-center justify-center text-white">
            <Tv size={14} />
          </div>
          <span className="logo-text text-base">Aniworld</span>
        </Link>
      </div>

      {/* Right: Search, Notifications, Theme, Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Cmd+K Search trigger */}
        <button
          onClick={() => {
            const event = new KeyboardEvent('keydown', {
              key: 'k',
              ctrlKey: true,
              bubbles: true,
            });
            window.dispatchEvent(event);
          }}
          className="flex items-center gap-2 bg-white/[0.04] dark:bg-white/[0.02] border border-border-subtle rounded-xl px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary hover:border-[#7c3aed]/50 transition-all duration-200 group"
          aria-label="Search Command Palette"
        >
          <Search size={13} className="text-text-muted group-hover:text-text-primary transition-colors" />
          <span className="hidden sm:inline">Search anime...</span>
          <div className="hidden sm:flex items-center gap-0.5 text-[9px] text-text-disabled font-mono border border-border-subtle rounded px-1 py-0.2">
            <Command size={8} />
            <span>K</span>
          </div>
        </button>

        {/* Language Selector */}
        <div className="hidden sm:flex items-center bg-white/[0.04] border border-border-subtle rounded-xl px-3 py-1.5 text-xs text-text-secondary">
          <Globe size={13} className="text-[#7c3aed] mr-1.5" />
          <select
            value={locale}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="bg-transparent border-none outline-none text-xs font-semibold cursor-pointer text-text-secondary"
          >
            <option value="en">EN</option>
            <option value="es">ES</option>
            <option value="ja">JA</option>
          </select>
        </div>

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Notifications Popover */}
        <NotificationBell />

        {/* Profile User Dropdown */}
        <div ref={userMenuRef} className="relative">
          {session ? (
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 p-1 rounded-xl bg-white/[0.04] border border-border-subtle hover:border-[#7c3aed]/50 hover:bg-white/[0.08] transition-all duration-200"
              aria-label="User menu"
              aria-expanded={userMenuOpen}
            >
              <div className="w-7 h-7 rounded-lg bg-[#7c3aed]/20 border border-[#7c3aed]/40 flex items-center justify-center text-xs font-bold text-[#7c3aed] overflow-hidden flex-shrink-0">
                {session.user?.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={session.user.image}
                    alt={session.user?.name || 'User'}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  (session.user?.name || session.user?.email || 'U')[0].toUpperCase()
                )}
              </div>
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <Link
                href="/login"
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-all"
              >
                Log In
              </Link>
            </div>
          )}

          {userMenuOpen && session && (
            <div
              className="absolute right-0 mt-2 w-48 rounded-2xl glass-panel border border-border-subtle bg-bg-secondary p-1.5 shadow-2xl z-50"
              style={{ animation: 'fadeIn 0.12s ease-out' }}
            >
              <div className="px-3 py-2 border-b border-border-subtle mb-1">
                <p className="text-xs font-bold text-text-primary truncate">
                  {session.user?.name}
                </p>
                <p className="text-[10px] text-text-muted truncate">{session.user?.email}</p>
              </div>
              <nav className="space-y-0.5">
                <Link
                  href="/profile"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-bg-elevated rounded-xl transition-all"
                >
                  <User size={13} className="text-text-muted" /> My Library
                </Link>
                <Link
                  href="/history"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-bg-elevated rounded-xl transition-all"
                >
                  <Clock size={13} className="text-text-muted" /> Watch History
                </Link>
                <Link
                  href="/profile/settings"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-bg-elevated rounded-xl transition-all"
                >
                  <Settings size={13} className="text-text-muted" /> Player Settings
                </Link>
                <Link
                  href="/settings"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-bg-elevated rounded-xl transition-all"
                >
                  <Sliders size={13} className="text-text-muted" /> Account Settings
                </Link>
                <Link
                  href="/cursors"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-text-secondary hover:text-[#9f5eff] hover:bg-bg-elevated rounded-xl transition-all"
                >
                  <MousePointer size={13} className="text-[#9f5eff]" /> Custom Cursor ⭐
                </Link>
                {((session?.user as any)?.role === 'ADMIN' || (session?.user as any)?.role === 'MODERATOR') && (
                  <Link
                    href="/admin"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-[#ef4444] hover:bg-red-500/10 rounded-xl transition-all"
                  >
                    <ShieldAlert size={13} className="text-[#ef4444]" /> Admin Panel
                  </Link>
                )}
              </nav>
              <div className="border-t border-border-subtle mt-1.5 pt-1">
                <button
                  onClick={() => {
                    signOut();
                    setUserMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-red-500 hover:bg-red-500/10 rounded-xl transition-all text-left"
                >
                  <LogOut size={13} /> Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
