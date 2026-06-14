import React from 'react';
import { Link } from '@/navigation';

export default function Footer() {
  return (
    <footer className="bg-anime-dark border-t border-anime-border/40 py-10 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
        <div>
          <Link href="/" className="flex items-center group mb-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/watermark.png"
              alt="AnimeWorld RJ"
              className="h-10 md:h-12 w-auto object-contain transition-transform duration-300 group-hover:scale-[1.02]"
            />
          </Link>
          <p className="text-xs text-anime-muted mt-2">
            © {new Date().getFullYear()} Aniworld. Discover, track, and discuss your favorite anime in style.
          </p>
        </div>
        <div className="flex space-x-6 text-xs text-anime-muted">
          <Link href="/privacy" className="hover:text-anime-orange transition-colors">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-anime-orange transition-colors">Terms of Service</Link>
          <Link href="/contact" className="hover:text-anime-orange transition-colors">Contact Us</Link>
        </div>
      </div>
    </footer>
  );
}
