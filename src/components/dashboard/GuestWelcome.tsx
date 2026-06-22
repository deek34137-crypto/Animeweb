'use client';

import React from 'react';
import { Link } from '@/navigation';
import { Sparkles, ArrowRight, Library, RefreshCw, Zap } from 'lucide-react';

export default function GuestWelcome() {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-border-subtle bg-gradient-to-br from-bg-secondary via-bg-secondary/90 to-accent-violet/5 p-6 sm:p-8 md:p-10 shadow-xl transition-all duration-300 hover:border-accent-violet/25">
      {/* Visual background ambient orbs */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-accent-violet/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />
      <div className="absolute bottom-0 left-1/3 w-48 h-48 bg-accent-pink/5 rounded-full blur-3xl pointer-events-none -mb-12" />

      <div className="max-w-2xl relative z-10 space-y-6">
        {/* Badge header */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent-violet/10 border border-accent-violet/20 text-[#7c3aed] text-xs font-bold shadow-sm">
          <Sparkles size={12} className="animate-pulse-slow" />
          <span>Explore Aniworld</span>
        </div>

        {/* Headline */}
        <div className="space-y-2">
          <h2 className="text-2xl sm:text-4xl font-black text-text-primary tracking-tight font-display leading-tight">
            Welcome to Aniworld
          </h2>
          <p className="text-sm sm:text-base text-text-secondary leading-relaxed">
            Your premium anime discovery and progress tracking hub. Connect with other fans, sync platforms, and enjoy seamless streaming.
          </p>
        </div>

        {/* Feature list */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-2">
          <div className="flex gap-3 items-start">
            <div className="w-8 h-8 rounded-xl bg-accent-violet/10 border border-accent-violet/20 flex items-center justify-center text-accent-primary flex-shrink-0">
              <Library size={14} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-text-primary">Track Anime</h4>
              <p className="text-[10px] text-text-muted mt-0.5">Organize and monitor watch progress easily.</p>
            </div>
          </div>
          <div className="flex gap-3 items-start">
            <div className="w-8 h-8 rounded-xl bg-accent-cyan/10 border border-accent-cyan/20 flex items-center justify-center text-accent-cyan flex-shrink-0">
              <RefreshCw size={14} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-text-primary">Sync Progress</h4>
              <p className="text-[10px] text-text-muted mt-0.5">Integrate smoothly with MAL and AniList.</p>
            </div>
          </div>
          <div className="flex gap-3 items-start">
            <div className="w-8 h-8 rounded-xl bg-accent-pink/10 border border-accent-pink/20 flex items-center justify-center text-accent-pink flex-shrink-0">
              <Zap size={14} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-text-primary">Continue Watching</h4>
              <p className="text-[10px] text-text-muted mt-0.5">Pick up instantly right where you paused.</p>
            </div>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 px-5 py-3 rounded-2xl bg-accent-violet text-white font-bold text-xs sm:text-sm shadow-[0_0_24px_rgba(124,91,255,0.35)] hover:shadow-[0_0_32px_rgba(124,91,255,0.55)] hover:bg-[#6b4ae6] transition-all duration-200 hover:-translate-y-px group"
          >
            <span>Log In to Sync History</span>
            <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center gap-1.5 px-5 py-3 rounded-2xl bg-bg-elevated border border-border-subtle hover:border-text-secondary/20 text-text-primary font-bold text-xs sm:text-sm hover:bg-border-subtle transition-all duration-200 hover:-translate-y-px"
          >
            Create an Account
          </Link>
        </div>
      </div>
    </div>
  );
}
