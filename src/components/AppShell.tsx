'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from '@/navigation';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import SearchModal from '@/components/search/SearchModal';

interface AppShellProps {
  children: React.ReactNode;
  myAnimeCount: number;
  continueWatchingCount: number;
}

export default function AppShell({
  children,
  myAnimeCount,
  continueWatchingCount,
}: AppShellProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Listen to open-search custom event
  useEffect(() => {
    const handleOpenSearch = () => setSearchOpen(true);
    window.addEventListener('open-global-search', handleOpenSearch);
    return () => window.removeEventListener('open-global-search', handleOpenSearch);
  }, []);

  const isWatchPage = pathname.includes('/watch');

  if (isWatchPage) {
    return (
      <div className="min-h-screen flex flex-col bg-bg-primary text-text-primary transition-colors duration-200">
        <Navbar onToggleSidebar={() => setSidebarOpen(true)} />
        <main className="flex-grow w-full">
          {children}
        </main>
        
        {/* Global Search Modal */}
        <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-bg-primary text-text-primary transition-colors duration-200">
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
        <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {children}
        </main>

        <Footer />
      </div>

      {/* Global Search Modal */}
      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
