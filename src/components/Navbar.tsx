'use client';

import React, { useState, useTransition, useEffect, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link, useRouter, usePathname } from '@/navigation';
import {
  Search, Menu, X, Globe, Home, TrendingUp, Calendar, Star,
  User, LogOut, Settings, ChevronDown, Command, Clock
} from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';

const NAV_LINKS = [
  { href: '/', labelKey: 'home', icon: Home },
  { href: '/search?sort=trending', labelKey: 'trending', icon: TrendingUp },
  { href: '/search?season=current', labelKey: 'seasonal', icon: Calendar },
  { href: '/search?sort=score', labelKey: 'topRated', icon: Star },
];

export default function Navbar() {
  const t = useTranslations('Navbar');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const { data: session } = useSession();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Scroll detection for glassmorphism intensity
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close user menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    if (userMenuOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [userMenuOpen]);

  const handleLanguageChange = (newLocale: string) => {
    startTransition(() => {
      router.replace(pathname, { locale: newLocale as 'en' | 'es' | 'ja' });
    });
  };

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/' || pathname === '';
    return pathname.startsWith(href.split('?')[0]);
  };

  return (
    <>
      <nav
        className={`sticky top-0 z-50 w-full transition-all duration-300 ${
          scrolled
            ? 'bg-[rgba(5,5,10,0.88)] backdrop-blur-xl border-b border-border-subtle shadow-[0_4px_32px_rgba(0,0,0,0.4)]'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* ─── Brand Logo ─── */}
            <div className="flex items-center gap-8">
              <Link href="/" className="flex items-center group flex-shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logo.png"
                  alt="AnimeWorld RJ"
                  className="h-10 md:h-12 w-auto object-contain transition-transform duration-300 group-hover:scale-[1.03]"
                />
              </Link>

              {/* Desktop Navigation */}
              <nav className="hidden lg:flex items-center gap-0.5">
                {NAV_LINKS.map(({ href, labelKey, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href as '/'}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                      isActive(href)
                        ? 'text-text-primary bg-surface-2 border border-border-subtle'
                        : 'text-text-secondary hover:text-text-primary hover:bg-surface-2/50'
                    }`}
                  >
                    <Icon size={14} className={isActive(href) ? 'text-accent-violet' : ''} />
                    {/* Using raw text since translation keys may vary */}
                    <span className="capitalize">{labelKey === 'home' ? t('home') : labelKey === 'trending' ? 'Trending' : labelKey === 'seasonal' ? 'Seasonal' : 'Top Rated'}</span>
                  </Link>
                ))}
              </nav>
            </div>

            {/* ─── Right Controls ─── */}
            <div className="flex items-center gap-2">
              {/* Cmd+K Search Trigger */}
              <button
                id="navbar-search-trigger"
                onClick={() => {
                  const event = new KeyboardEvent('keydown', {
                    key: 'k',
                    ctrlKey: true,
                    bubbles: true,
                  });
                  window.dispatchEvent(event);
                }}
                className="hidden md:flex items-center gap-2.5 bg-surface-2 border border-border-subtle rounded-xl px-3 py-2 text-sm text-text-muted hover:text-text-primary hover:border-border-emphasis transition-all duration-200 group"
              >
                <Search size={14} />
                <span className="text-xs">Search anime…</span>
                <div className="ml-2 flex items-center gap-0.5 text-[10px] text-text-disabled">
                  <Command size={10} />
                  <span>K</span>
                </div>
              </button>

              {/* Language Selector */}
              <div className="hidden md:flex items-center bg-surface-2 border border-border-subtle rounded-xl px-2.5 py-2 text-xs">
                <Globe size={13} className="text-accent-violet mr-1.5" />
                <select
                  value={locale}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                  className="bg-transparent border-none outline-none text-xs font-semibold text-text-secondary cursor-pointer"
                >
                  <option value="en">EN</option>
                  <option value="es">ES</option>
                  <option value="ja">JA</option>
                </select>
              </div>

              {/* Auth — Desktop */}
              {session ? (
                <div ref={userMenuRef} className="relative hidden md:block">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl bg-surface-2 border border-border-subtle hover:border-border-emphasis transition-all duration-200"
                    aria-expanded={userMenuOpen}
                  >
                    <div className="w-6 h-6 rounded-full bg-accent-violet/20 border border-accent-violet/40 flex items-center justify-center text-xs font-bold text-accent-violet overflow-hidden flex-shrink-0">
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
                    <span className="text-xs font-medium text-text-secondary max-w-[80px] truncate">
                      {session.user?.name || 'Profile'}
                    </span>
                    <ChevronDown size={12} className={`text-text-disabled transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {userMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-48 glass-panel border border-border-default rounded-xl shadow-xl overflow-hidden z-50">
                      <div className="px-3 py-2.5 border-b border-border-subtle">
                        <p className="text-xs font-semibold text-text-primary truncate">
                          {session.user?.name}
                        </p>
                        <p className="text-[10px] text-text-muted truncate">{session.user?.email}</p>
                      </div>
                      <nav className="py-1">
                        <Link
                          href="/profile"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors"
                        >
                          <User size={14} /> My List
                        </Link>
                        <Link
                          href="/history"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors"
                        >
                          <Clock size={14} /> Watch History
                        </Link>
                        <Link
                          href="/settings"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors"
                        >
                          <Settings size={14} /> Settings
                        </Link>
                        <div className="border-t border-border-subtle mt-1 pt-1">
                          <button
                            onClick={() => { signOut(); setUserMenuOpen(false); }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-surface-2 transition-colors"
                          >
                            <LogOut size={14} /> Sign Out
                          </button>
                        </div>
                      </nav>
                    </div>
                  )}
                </div>
              ) : (
                <div className="hidden md:flex items-center gap-2">
                  <Link
                    href="/login"
                    className="px-3.5 py-2 rounded-xl text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
                  >
                    Log In
                  </Link>
                  <Link
                    href="/register"
                    className="px-3.5 py-2 rounded-xl text-sm font-semibold bg-accent-violet text-white hover:bg-[#6b4ae6] shadow-[0_0_16px_rgba(124,91,255,0.3)] hover:shadow-[0_0_24px_rgba(124,91,255,0.5)] transition-all duration-200"
                  >
                    Sign Up
                  </Link>
                </div>
              )}

              {/* Mobile: search + hamburger */}
              <button
                id="navbar-mobile-search"
                className="md:hidden p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-2 transition-all"
                onClick={() => {
                  const event = new KeyboardEvent('keydown', {
                    key: 'k',
                    ctrlKey: true,
                    bubbles: true,
                  });
                  window.dispatchEvent(event);
                }}
                aria-label="Search"
              >
                <Search size={20} />
              </button>

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-2 transition-all"
                aria-label="Toggle menu"
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>

        {/* ─── Mobile Drawer ─── */}
        {mobileMenuOpen && (
          <div className="lg:hidden glass-panel border-t border-border-subtle px-4 pt-3 pb-5 space-y-1">
            {NAV_LINKS.map(({ href, labelKey, icon: Icon }) => (
              <Link
                key={href}
                href={href as '/'}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive(href)
                    ? 'bg-accent-violet/10 text-text-primary border border-accent-violet/20'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-2'
                }`}
              >
                <Icon size={16} className={isActive(href) ? 'text-accent-violet' : ''} />
                <span className="capitalize">{labelKey === 'home' ? 'Home' : labelKey === 'trending' ? 'Trending' : labelKey === 'seasonal' ? 'Seasonal' : 'Top Rated'}</span>
              </Link>
            ))}

            <div className="pt-2 border-t border-border-subtle">
              {session ? (
                <div className="space-y-1">
                  <Link
                    href="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-all"
                  >
                    <User size={16} /> My List
                  </Link>
                  <Link
                    href="/history"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-all"
                  >
                    <Clock size={16} /> Watch History
                  </Link>
                  <button
                    onClick={() => { signOut(); setMobileMenuOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-red-400 hover:bg-surface-2 transition-all"
                  >
                    <LogOut size={16} /> Sign Out
                  </button>
                </div>
              ) : (
                <div className="flex gap-2 pt-1">
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex-1 text-center py-2.5 rounded-xl border border-border-default text-sm font-medium text-text-secondary hover:bg-surface-2 transition-all"
                  >
                    Log In
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex-1 text-center py-2.5 rounded-xl bg-accent-violet text-white text-sm font-semibold hover:bg-[#6b4ae6] transition-all"
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 px-3 py-2.5">
              <Globe size={14} className="text-accent-violet" />
              <select
                value={locale}
                onChange={(e) => { handleLanguageChange(e.target.value); setMobileMenuOpen(false); }}
                className="bg-transparent border-none outline-none text-sm text-text-secondary font-medium cursor-pointer"
              >
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="ja">日本語</option>
              </select>
            </div>
          </div>
        )}
      </nav>
    </>
  );
}
