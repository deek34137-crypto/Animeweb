import React from 'react';
import { Loader2 } from 'lucide-react';

export default function GlobalLoading() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background">
      {/* Cinematic Ambient Glow Background */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent-violet/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-accent-sakura/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative space-y-6 flex flex-col items-center">
        {/* Pulsing Glowing App Icon Logo */}
        <div className="relative w-24 h-24 rounded-3xl overflow-hidden border border-white/10 shadow-[0_0_50px_rgba(124,91,255,0.35)] animate-pulse">
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
            <Loader2 className="w-4 h-4 text-accent-violet animate-spin" />
            <span className="text-sm font-bold text-white tracking-wider font-display uppercase">
              Loading <span className="text-accent-violet">Aniworld</span>
            </span>
          </div>
          <span className="text-[10px] font-mono text-text-disabled tracking-widest uppercase animate-pulse">
            Please wait...
          </span>
        </div>
      </div>
    </div>
  );
}
