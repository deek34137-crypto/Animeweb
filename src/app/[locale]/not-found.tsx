'use client';

import React from 'react';
import { HelpCircle, Home } from 'lucide-react';
import { Link } from '@/navigation';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full text-center space-y-6 p-8 rounded-2xl glass-panel shadow-2xl relative overflow-hidden animate-fade-up">
        {/* Glow effect */}
        <div className="absolute -top-16 -left-16 w-32 h-32 bg-accent-violet/15 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-32 h-32 bg-accent-sakura/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-3">
          <div className="w-16 h-16 rounded-full bg-accent-violet/10 border border-accent-violet/20 flex items-center justify-center mx-auto text-accent-violet">
            <HelpCircle size={28} />
          </div>
          <h1 className="text-3xl font-black text-text-primary tracking-tight font-display">
            404 - Not Found
          </h1>
          <p className="text-sm text-text-muted leading-relaxed">
            The page you are looking for does not exist or has been moved.
          </p>
        </div>

        {/* Buttons */}
        <div className="relative z-10 pt-2">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 w-full px-5 py-3 rounded-xl bg-accent-violet hover:bg-[#6b4ae6] text-white font-bold text-sm transition shadow-lg shadow-accent-violet/15"
          >
            <Home size={14} />
            Go back to Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
