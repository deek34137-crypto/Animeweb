'use client';

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface SectionErrorFallbackProps {
  title: string;
  onRetry?: () => void;
}

export default function SectionErrorFallback({
  title,
  onRetry,
}: SectionErrorFallbackProps) {
  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  return (
    <div
      role="alert"
      className="w-full rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-6 md:p-8 flex flex-col items-center justify-center text-center space-y-3.5 my-4 animate-fade-in"
    >
      <div className="p-3 bg-yellow-500/10 rounded-full text-yellow-500 border border-yellow-500/20">
        <AlertTriangle size={20} className="animate-pulse" aria-hidden="true" />
      </div>
      <div className="space-y-1">
        <h4 className="font-bold text-sm text-text-primary">
          Unable to load {title}
        </h4>
        <p className="text-xs text-text-muted max-w-md mx-auto">
          The catalog service is temporarily rate-limited or unavailable. Other features like streaming still work.
        </p>
      </div>
      <button
        onClick={handleRetry}
        className="flex items-center gap-1.5 px-4 py-2 bg-surface-2 border border-border-subtle hover:border-border-emphasis text-text-secondary hover:text-white rounded-xl text-xs font-bold transition-all active:scale-[0.98]"
      >
        <RefreshCw size={12} aria-hidden="true" />
        Retry Loading
      </button>
    </div>
  );
}
