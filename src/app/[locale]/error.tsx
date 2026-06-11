'use client';

import React, { useEffect } from 'react';
import { RefreshCw, Home, AlertCircle } from 'lucide-react';
import { Link } from '@/navigation';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorBoundary({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Unhandled application error:', error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full text-center space-y-6 p-8 rounded-2xl glass-panel shadow-2xl relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute -top-16 -left-16 w-32 h-32 bg-red-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-32 h-32 bg-accent-violet/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-3">
          <div className="w-16 h-16 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center mx-auto text-red-400">
            <AlertCircle size={28} className="animate-pulse" />
          </div>
          <h1 className="text-2xl font-black text-text-primary tracking-tight font-display">
            Something went wrong!
          </h1>
          <p className="text-sm text-text-muted leading-relaxed">
            An unexpected error occurred. The API may be rate-limited, or there was a database interruption.
          </p>
          {error.digest && (
            <p className="text-[10px] text-text-disabled font-mono bg-surface-2 py-1 px-2 rounded-lg inline-block">
              ID: {error.digest}
            </p>
          )}
        </div>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 relative z-10 pt-2">
          <button
            onClick={reset}
            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-accent-violet hover:bg-[#6b4ae6] text-white font-bold text-sm transition shadow-lg shadow-accent-violet/15"
          >
            <RefreshCw size={14} />
            Try Again
          </button>
          <Link
            href="/"
            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-surface-2 border border-border-subtle hover:border-border-emphasis text-text-secondary hover:text-text-primary font-semibold text-sm transition"
          >
            <Home size={14} />
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
