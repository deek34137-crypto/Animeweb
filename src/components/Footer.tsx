import React from 'react';
import { Link } from '@/navigation';

export default function Footer() {
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
            © {new Date().getFullYear()} Aniworld. Discover, track, and discuss your favorite anime in style.
          </p>
        </div>
        <nav className="flex space-x-6 text-xs text-text-muted" aria-label="Footer navigation">
          <Link href="/privacy" className="hover:text-accent-violet transition-colors focus-visible:text-accent-violet">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-accent-violet transition-colors focus-visible:text-accent-violet">
            Terms of Service
          </Link>
          <Link href="/contact" className="hover:text-accent-violet transition-colors focus-visible:text-accent-violet">
            Contact Us
          </Link>
        </nav>
      </div>
    </footer>
  );
}
