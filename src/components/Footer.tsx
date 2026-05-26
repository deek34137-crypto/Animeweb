import React from 'react';
import { Link } from '@/navigation';

export default function Footer() {
  return (
    <footer className="bg-anime-dark border-t border-anime-border/40 py-10 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
        <div>
          <Link href="/" className="text-xl font-black tracking-wider text-white">
            ANI<span className="text-anime-orange">WORLD</span>
          </Link>
          <p className="text-xs text-anime-muted mt-2">
            © {new Date().getFullYear()} Aniworld. Discover, track, and discuss your favorite anime in style.
          </p>
        </div>
        <div className="flex space-x-6 text-xs text-anime-muted">
          <a href="#" className="hover:text-anime-orange transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-anime-orange transition-colors">Terms of Service</a>
          <a href="#" className="hover:text-anime-orange transition-colors">Contact Us</a>
        </div>
      </div>
    </footer>
  );
}
