'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from '@/navigation';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import SearchModal from '@/components/search/SearchModal';
import { useSession } from 'next-auth/react';
import { useWatchlistStore } from '@/store/useWatchlistStore';
import PageTransition from '@/components/PageTransition';
import dynamic from 'next/dynamic';

const CommandPalette = dynamic(() => import('@/components/ui/CommandPalette'), { ssr: false });
const ShortcutHelper = dynamic(() => import('@/components/ui/ShortcutHelper'), { ssr: false });
const XPToastManager = dynamic(() => import('@/components/gamification/XPToastManager'), { ssr: false });
const InstallAppPrompt = dynamic(() => import('@/components/ui/InstallAppPrompt'), { ssr: false });
const QuickMenu = dynamic(() => import('@/components/dashboard/QuickMenu'), { ssr: false });

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const { data: session } = useSession();
  const { entries, fetchList } = useWatchlistStore();

  useEffect(() => {
    if (session?.user?.id) {
      fetchList();
    }
  }, [session?.user?.id, fetchList]);

  const myAnimeCount = Object.keys(entries).length;
  const continueWatchingCount = Object.values(entries).filter(
    (entry) => entry.status === 'watching'
  ).length;

  // Listen to open-search custom event
  useEffect(() => {
    const handleOpenSearch = () => setSearchOpen(true);
    window.addEventListener('open-global-search', handleOpenSearch);
    return () => window.removeEventListener('open-global-search', handleOpenSearch);
  }, []);

  const isWatchPage = pathname.includes('/watch');

  if (isWatchPage) {
    return (
      <div className="min-h-screen flex flex-col bg-bg-primary text-text-primary transition-colors duration-200 overflow-x-clip">
        {/* Skip navigation */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[200] focus:px-4 focus:py-2 focus:bg-accent-violet focus:text-white focus:rounded-xl focus:font-bold focus:text-sm focus:shadow-lg"
        >
          Skip to main content
        </a>
        <Navbar onToggleSidebar={() => setSidebarOpen(true)} />
        <main id="main-content" className="flex-grow w-full">
          <PageTransition>
            {children}
          </PageTransition>
        </main>
        
        {/* Global Search Modal */}
        <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

        {/* Global Client Overlays */}
        <CommandPalette />
        <ShortcutHelper />
        <XPToastManager />
        <InstallAppPrompt />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-bg-primary text-text-primary transition-colors duration-200 overflow-x-clip">
      {/* Skip navigation */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[200] focus:px-4 focus:py-2 focus:bg-accent-violet focus:text-white focus:rounded-xl focus:font-bold focus:text-sm focus:shadow-lg"
      >
        Skip to main content
      </a>
      {/* Persistent Left Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        myAnimeCount={myAnimeCount}
        continueWatchingCount={continueWatchingCount}
      />

      {/* Main Right Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <Navbar onToggleSidebar={() => setSidebarOpen(true)} />

        {/* Dynamic page content container */}
        <main id="main-content" className="flex-grow w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
          <PageTransition>
            {children}
          </PageTransition>
        </main>

        <Footer />
      </div>

      {/* Global Search Modal */}
      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* Global Client Overlays */}
      <CommandPalette />
      <ShortcutHelper />
      <XPToastManager />
      <InstallAppPrompt />
      <QuickMenu />
    </div>
  );
}
