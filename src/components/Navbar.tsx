'use client';

import React, { useState, useTransition } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link, useRouter, usePathname } from '@/navigation';
import { Search, Menu, X, Globe } from 'lucide-react';

export default function Navbar() {
  const t = useTranslations('Navbar');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setMobileMenuOpen(false);
    }
  };

  const handleLanguageChange = (newLocale: 'en' | 'es' | 'ja') => {
    startTransition(() => {
      router.replace(pathname, { locale: newLocale });
    });
  };

  return (
    <nav className="sticky top-0 z-50 w-full glass-card border-b border-anime-border/40 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2 group">
              <span className="text-2xl font-black tracking-wider text-white">
                ANI<span className="text-anime-orange group-hover:text-anime-orangeHover transition-colors">WORLD</span>
              </span>
            </Link>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex ml-10 space-x-8">
              <Link
                href="/"
                className="text-sm font-medium text-gray-300 hover:text-anime-orange transition-colors"
              >
                {t('home')}
              </Link>
              <Link
                href="/search"
                className="text-sm font-medium text-gray-300 hover:text-anime-orange transition-colors"
              >
                {t('search')}
              </Link>
            </div>
          </div>

          {/* Desktop Controls (Search, Lang, Actions) */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Search Input */}
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                type="text"
                placeholder={t('searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 bg-anime-dark border border-anime-border/80 text-sm rounded-full py-1.5 pl-4 pr-10 focus:outline-none focus:border-anime-orange focus:ring-1 focus:ring-anime-orange transition-all duration-300 text-gray-200"
              />
              <button
                type="submit"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-anime-orange transition-colors"
              >
                <Search size={16} />
              </button>
            </form>

            {/* Language Selector Dropdown */}
            <div className="relative flex items-center bg-anime-dark border border-anime-border/80 rounded-full px-3 py-1.5 text-xs text-gray-300">
              <Globe size={14} className="mr-1.5 text-anime-orange" />
              <select
                value={locale}
                onChange={(e) => handleLanguageChange(e.target.value as any)}
                className="bg-transparent border-none outline-none focus:ring-0 text-xs font-semibold text-gray-300 cursor-pointer pr-1"
              >
                <option value="en" className="bg-anime-card text-gray-200">EN</option>
                <option value="es" className="bg-anime-card text-gray-200">ES</option>
                <option value="ja" className="bg-anime-card text-gray-200">JA</option>
              </select>
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden items-center space-x-2">
            {/* Locale shortcut */}
            <div className="flex items-center bg-anime-dark border border-anime-border/80 rounded-full px-2.5 py-1 text-xs text-gray-300">
              <select
                value={locale}
                onChange={(e) => handleLanguageChange(e.target.value as any)}
                className="bg-transparent border-none outline-none focus:ring-0 text-xs font-semibold cursor-pointer pr-1"
              >
                <option value="en" className="bg-anime-card text-gray-200">EN</option>
                <option value="es" className="bg-anime-card text-gray-200">ES</option>
                <option value="ja" className="bg-anime-card text-gray-200">JA</option>
              </select>
            </div>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-gray-300 hover:text-anime-orange transition-colors p-1"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-anime-card/95 border-b border-anime-border/60 px-4 pt-2 pb-4 space-y-3">
          <Link
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:text-anime-orange hover:bg-anime-dark transition-all"
          >
            {t('home')}
          </Link>
          <Link
            href="/search"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:text-anime-orange hover:bg-anime-dark transition-all"
          >
            {t('search')}
          </Link>

          {/* Mobile Search Form */}
          <form onSubmit={handleSearchSubmit} className="relative px-3 pt-2">
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-anime-dark border border-anime-border text-sm rounded-full py-2 pl-4 pr-10 focus:outline-none focus:border-anime-orange focus:ring-1 focus:ring-anime-orange text-gray-200"
            />
            <button
              type="submit"
              className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 hover:text-anime-orange"
            >
              <Search size={16} />
            </button>
          </form>
        </div>
      )}
    </nav>
  );
}
