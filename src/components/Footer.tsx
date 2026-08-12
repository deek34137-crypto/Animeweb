'use client';

import React from 'react';
import { Link } from '@/navigation';
import { useTranslations } from 'next-intl';

export default function Footer() {
  const t = useTranslations('Footer');

  const handleCookieSettings = () => {
    if (typeof window !== 'undefined' && (window as any).__openCookieSettings) {
      (window as any).__openCookieSettings();
    }
  };

  return (
    <footer className="bg-surface-1 border-t border-border-subtle py-10 mt-auto" role="contentinfo">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
        <div>
          <Link href="/" className="flex items-center group mb-2" aria-label="AnimeWorld RJ — Go to homepage">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/watermark.png"
              alt="AnimeWorld RJ"
              className="h-10 md:h-12 w-auto object-contain transition-transform duration-300 group-hover:scale-[1.02]"
            />
          </Link>
          <p className="text-xs text-text-muted mt-2">
            © {new Date().getFullYear()} Aniworld. {t('discoverTrackDiscuss')}
          </p>
        </div>
        <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-text-muted" aria-label="Footer navigation">
          <Link href="/privacy" className="hover:text-accent-violet transition-colors focus-visible:text-accent-violet">
            {t('privacyPolicy')}
          </Link>
          <Link href="/terms" className="hover:text-accent-violet transition-colors focus-visible:text-accent-violet">
            {t('termsOfService')}
          </Link>
          <Link href="/dmca" className="hover:text-accent-violet transition-colors focus-visible:text-accent-violet">
            DMCA
          </Link>
          <button
            onClick={handleCookieSettings}
            className="hover:text-accent-violet transition-colors focus-visible:text-accent-violet cursor-pointer"
          >
            Cookie Settings
          </button>
          <Link href="/contact" className="hover:text-accent-violet transition-colors focus-visible:text-accent-violet">
            {t('contactUs')}
          </Link>
        </nav>
      </div>
    </footer>
  );
}

