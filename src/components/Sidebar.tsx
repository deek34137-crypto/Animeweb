'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { usePathname } from '@/navigation';
import { Link } from '@/navigation';
import {
  Home, Play, Heart, Clock, Flame, Calendar, Settings, X, Tv, Compass, MessageSquare, Trophy, ShieldAlert, Baby, Sparkles, Brain, Layers, ChevronDown
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useSession } from 'next-auth/react';
import { useFocusTrap } from '@/lib/hooks/useFocusTrap';

// Mobile drawer wrapper with focus trap and dialog ARIA
function MobileSidebarDrawer({ onClose, children }: { onClose?: () => void; children: React.ReactNode }) {
  const trapRef = useFocusTrap(true, onClose);
  return (
    <div className="lg:hidden fixed inset-0 z-50 flex">
      {/* Overlay backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Drawer content panel */}
      <div
        ref={trapRef as React.RefCallback<HTMLDivElement>}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className="relative flex flex-col w-[280px] max-w-[85vw] h-full bg-bg-secondary shadow-2xl transition-transform duration-300 ease-out"
        style={{ animation: 'slideInLeft 0.25s ease-out both' }}
      >
        {/* Close button */}
        <div className="flex items-center justify-between p-4 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <div className="w-6.5 h-6.5 rounded-lg bg-gradient-to-tr from-[#7c3aed] to-[#ec4899] flex items-center justify-center text-white">
              <Tv size={12} aria-hidden="true" />
            </div>
            <span className="logo-text text-base">Aniworld</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
            aria-label="Close navigation menu"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto no-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
}

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
  const [isKidsMode, setIsKidsMode] = React.useState(false);

  // Grouped Navigation Data
  const navGroups = [
    {
      id: 'browse',
      label: 'Browse',
      links: [
        { href: '/', label: 'Home', icon: Home },
        { href: '/discover', label: 'Discover', icon: Compass },
        { href: '/seasonal', label: 'Seasonal', icon: Flame },
        { href: '/calendar', label: 'Calendar', icon: Calendar },
        { href: '/kids', label: 'Kids Zone 🎈', icon: Baby, badge: 'Hindi/Sub' },
      ],
    },
    {
      id: 'myAnime',
      label: 'My Anime',
      links: [
        { href: '/profile?tab=watching', label: 'Continue Watching', icon: Play, badge: continueWatchingCount > 0 ? continueWatchingCount : null },
        { href: '/profile', label: 'Library', icon: Heart, badge: myAnimeCount > 0 ? myAnimeCount : null },
        { href: '/history', label: 'History', icon: Clock },
      ],
    },
    {
      id: 'fun',
      label: 'Fun & Stats',
      links: [
        { href: '/top-moments', label: 'Top Moments 🏆', icon: Sparkles },
        { href: '/profile/persona', label: 'Anime Persona 🎭', icon: Brain },
        { href: '/profile/tier-check', label: 'Tier Check 📊', icon: Layers },
      ],
    },
    {
      id: 'community',
      label: 'Community',
      links: [
        { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
        { href: '/community', label: 'Community', icon: MessageSquare },
      ],
    },
    {
      id: 'system',
      label: 'System',
      links: [
        { href: '/profile/settings', label: 'Settings', icon: Settings },
      ],
    },
  ];

  if (userRole === 'ADMIN' || userRole === 'MODERATOR') {
    navGroups.find(g => g.id === 'system')?.links.push({ href: '/admin', label: 'Admin Panel', icon: ShieldAlert });
  }

  const allHrefs = navGroups.flatMap(g => g.links.map(l => l.href));

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/' || pathname === '';
    }
    const cleanHref = href.split('?')[0];
    return pathname.startsWith(cleanHref);
  };

  const activeHref = allHrefs.find(isActive) ?? null;

  // Group State
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    browse: true,
    myAnime: true,
    fun: true,
    community: true,
    system: true,
  });

  const toggleGroup = (id: string) => {
    setOpenGroups(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Cursor state
  const navRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLElement>>(new Map());
  const [cursorStyle, setCursorStyle] = useState<{ top: number; height: number; opacity: number }>({
    top: 0,
    height: 44,
    opacity: 0,
  });
  const [hoveredHref, setHoveredHref] = useState<string | null>(null);

  React.useEffect(() => {
    setIsKidsMode(localStorage.getItem('kids_mode') === 'true');
  }, []);

  // Initialize open groups based on active route
  useEffect(() => {
    if (activeHref) {
      const activeGroup = navGroups.find(g => g.links.some(l => isActive(l.href)));
      if (activeGroup) {
        setOpenGroups(prev => ({ ...prev, [activeGroup.id]: true }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const targetHref = hoveredHref ?? activeHref;

  // Move cursor to target element
  const updateCursor = useCallback((href: string | null) => {
    if (!href || !navRef.current) {
      setCursorStyle(prev => ({ ...prev, opacity: 0 }));
      return;
    }
    
    // Slight delay to allow DOM/drawer animation to render
    setTimeout(() => {
      const el = itemRefs.current.get(href);
      if (!el || !navRef.current) {
        setCursorStyle(prev => ({ ...prev, opacity: 0 }));
        return;
      }
      
      // Ensure the element is visible (its group is open)
      const groupContainer = el.closest('.nav-group-content');
      if (groupContainer && groupContainer.classList.contains('opacity-0')) {
        setCursorStyle(prev => ({ ...prev, opacity: 0 }));
        return;
      }

      const navRect = navRef.current.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      setCursorStyle({
        top: elRect.top - navRect.top + navRef.current.scrollTop,
        height: elRect.height,
        opacity: 1,
      });
    }, 50);
  }, []);

  useEffect(() => {
    updateCursor(targetHref);
  }, [targetHref, pathname, updateCursor, openGroups]);

  const setItemRef = (href: string, el: HTMLElement | null) => {
    if (el) {
      itemRefs.current.set(href, el);
    } else {
      itemRefs.current.delete(href);
    }
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
      <div ref={navRef} className="flex-1 relative overflow-y-auto overflow-x-hidden pr-1 -mr-1 scrollbar-thin min-h-0 pb-10">
        {/* Animated cursor pill */}
        <div
          aria-hidden="true"
          className="absolute left-0 right-0 rounded-xl pointer-events-none transition-all duration-200 ease-out"
          style={{
            top: cursorStyle.top,
            height: cursorStyle.height,
            opacity: cursorStyle.opacity,
            background: hoveredHref
              ? 'linear-gradient(90deg, rgba(124,58,237,0.08) 0%, transparent 100%)'
              : 'linear-gradient(90deg, rgba(124,58,237,0.10) 0%, transparent 100%)',
            borderLeft: hoveredHref
              ? '2px solid rgba(124,58,237,0.6)'
              : '2px solid rgba(124,58,237,0.7)',
            boxShadow: hoveredHref
              ? '0 0 12px rgba(124,58,237,0.15)'
              : '0 0 16px rgba(124,58,237,0.2)',
          }}
        />

        <div className="space-y-6">
          {navGroups.map((group) => {
            const isOpen = openGroups[group.id];
            
            return (
              <div key={group.id} className="flex flex-col">
                <button
                  onClick={() => toggleGroup(group.id)}
                  className="flex items-center justify-between px-4 py-2 mb-1 group"
                >
                  <span className="text-xs font-bold uppercase tracking-wider text-text-muted group-hover:text-text-secondary transition-colors">
                    {group.label}
                  </span>
                  <ChevronDown
                    size={14}
                    className={`text-text-muted group-hover:text-text-secondary transition-transform duration-200 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                
                <div 
                  className={`nav-group-content space-y-1 overflow-hidden transition-all duration-300 ease-in-out ${
                    isOpen ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0 pointer-events-none'
                  }`}
                >
                  {group.links.map(({ href, label, icon: Icon, badge }) => {
                    const active = isActive(href);

                    return (
                      <React.Fragment key={href}>
                        <Link
                          href={href as '/'}
                          ref={(el) => setItemRef(href, el as HTMLElement | null)}
                          onClick={onClose}
                          onMouseEnter={() => setHoveredHref(href)}
                          onMouseLeave={() => setHoveredHref(null)}
                          aria-current={active ? 'page' : undefined}
                          className={`group relative flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-colors duration-150 ${
                            active
                              ? 'text-[#7c3aed]'
                              : 'text-text-secondary hover:text-text-primary'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Icon
                              size={16}
                              aria-hidden="true"
                              className={`transition-colors duration-150 ${
                                active 
                                  ? 'text-[#7c3aed]' 
                                  : 'text-text-muted group-hover:text-text-secondary'
                              }`}
                            />
                            <span>{label}</span>
                          </div>

                          {/* Badge */}
                          {badge !== null && badge !== undefined && (
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
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sidebar Footer */}
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
        <MobileSidebarDrawer onClose={onClose}>
          <SidebarContent />
        </MobileSidebarDrawer>
      )}
    </>
  );
}
