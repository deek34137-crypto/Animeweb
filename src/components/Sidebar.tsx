'use client';

import React from 'react';
import { usePathname } from '@/navigation';
import { Link } from '@/navigation';
import {
  Home, Play, Heart, Clock, Flame, Calendar, Settings, X, Tv, Compass, MessageSquare, Trophy, ShieldAlert
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useSession } from 'next-auth/react';

interface SidebarProps {
  myAnimeCount?: number;
  continueWatchingCount?: number;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({
  myAnimeCount = 0,
  continueWatchingCount = 0,
  isOpen = false,
  onClose,
}: SidebarProps) {
  const pathname = usePathname();
  const t = useTranslations('Navbar');
  const { data: session } = useSession();
  const userRole = session?.user?.role;

  const navLinks = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/discover', label: 'Discover', icon: Compass },
    {
      href: '/profile?tab=watching',
      label: 'Continue Watching',
      icon: Play,
      badge: continueWatchingCount > 0 ? continueWatchingCount : null,
    },
    {
      href: '/profile',
      label: 'Library',
      icon: Heart,
      badge: myAnimeCount > 0 ? myAnimeCount : null,
    },
    { href: '/history', label: 'History', icon: Clock },
    { href: '/calendar', label: 'Calendar', icon: Calendar },
    { href: '/seasonal', label: 'Seasonal', icon: Flame },
    { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
    { href: '/community', label: 'Community', icon: MessageSquare },
    { href: '/profile/settings', label: 'Settings', icon: Settings },
  ];

  if (userRole === 'ADMIN' || userRole === 'MODERATOR') {
    navLinks.push({ href: '/admin', label: 'Admin Panel', icon: ShieldAlert });
  }

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/' || pathname === '';
    }
    const cleanHref = href.split('?')[0];
    return pathname.startsWith(cleanHref);
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-bg-secondary border-r border-border-subtle p-5">
      {/* Brand logo in Sidebar (Desktop) */}
      <div className="hidden lg:flex items-center gap-3 mb-8 px-2">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#7c3aed] to-[#ec4899] flex items-center justify-center text-white shadow-[0_0_16px_rgba(124,58,237,0.3)]">
          <Tv size={16} strokeWidth={2.5} />
        </div>
        <Link href="/" className="logo-text text-xl">
          Aniworld
        </Link>
      </div>

      {/* Nav links */}
      <nav className="flex-1 space-y-1">
        {navLinks.map(({ href, label, icon: Icon, badge }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href as '/'}
              onClick={onClose}
              className={`group flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                active
                  ? 'bg-accent-violet/10 text-[#7c3aed]'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  size={16}
                  className={`transition-colors duration-200 ${
                    active ? 'text-[#7c3aed]' : 'text-text-muted group-hover:text-text-secondary'
                  }`}
                />
                <span>{label}</span>
              </div>

              {/* Badge */}
              {badge !== null && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold shadow-sm transition-colors ${
                    active
                      ? 'bg-[#7c3aed] text-white'
                      : 'bg-bg-elevated text-text-secondary group-hover:bg-border-subtle group-hover:text-text-primary'
                  }`}
                >
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      
      {/* Sidebar Footer context */}
      <div className="pt-4 border-t border-border-subtle mt-4 text-[10px] text-text-muted px-2">
        &copy; 2025 Aniworld. All rights reserved.
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (persistent on screens >= lg) */}
      <aside className="hidden lg:block w-64 flex-shrink-0 h-screen sticky top-0 z-40">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Slide-out Drawer */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Overlay backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
            onClick={onClose}
          />

          {/* Drawer content panel */}
          <div
            className="relative flex flex-col w-64 max-w-xs h-full bg-bg-secondary shadow-2xl transition-transform duration-300 ease-out"
            style={{
              animation: 'slideInLeft 0.25s ease-out both',
            }}
          >
            {/* Close button inside Drawer */}
            <div className="flex items-center justify-between p-4 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <div className="w-6.5 h-6.5 rounded-lg bg-gradient-to-tr from-[#7c3aed] to-[#ec4899] flex items-center justify-center text-white">
                  <Tv size={12} />
                </div>
                <span className="logo-text text-base">Aniworld</span>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors"
                aria-label="Close menu"
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              <SidebarContent />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
