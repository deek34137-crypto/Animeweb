'use client';

import React, { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function GlobalLoading() {
  // Dispatch custom window events to drive the stateless TopProgressBar in persistent layout
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('route-loading-start'));
    return () => {
      window.dispatchEvent(new CustomEvent('route-loading-end'));
    };
  }, []);

  return (
    <div className="w-full min-h-[60vh] flex flex-col items-center justify-center p-8 animate-fade-in relative">
      {/* Cinematic Ambient Glow Background */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-accent-violet/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent-sakura/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative space-y-6 flex flex-col items-center">
        {/* Pulsing Glowing App Icon Logo */}
        <div className="relative w-16 h-16 rounded-2xl overflow-hidden border border-white/10 shadow-[0_0_30px_rgba(124,91,255,0.25)] animate-pulse">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/app-icon.jpg"
            alt="Aniworld"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Loading text and spinner */}
        <div className="flex flex-col items-center space-y-2">
          <div className="flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 text-accent-violet animate-spin" />
            <span className="text-xs font-bold text-text-primary tracking-wider font-display uppercase">
              Loading <span className="text-accent-violet">Aniworld</span>
            </span>
          </div>
          <span className="text-[9px] font-mono text-text-muted tracking-widest uppercase animate-pulse">
            Please wait...
          </span>
        </div>
      </div>
    </div>
  );
}
