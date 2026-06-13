'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Play, ChevronDown, RotateCcw } from 'lucide-react';
import { Link } from '@/navigation';

interface WatchProgress {
  episode: number;
  position: number;
  duration: number;
}

interface WatchActionsProps {
  animeId: string;
  latestProgress?: WatchProgress | null;
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function WatchActions({ animeId, latestProgress }: WatchActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!latestProgress) {
    // Standard Watch Now button linking to Episode 1
    return (
      <Link
        href={`/watch/${animeId}/1` as '/'}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-accent-violet text-white font-bold text-sm shadow-[0_0_24px_rgba(124,91,255,0.35)] hover:shadow-[0_0_36px_rgba(124,91,255,0.55)] hover:bg-[#6b4ae6] transition-all duration-200 hover:-translate-y-px"
      >
        <Play size={16} fill="currentColor" />
        Watch Now (Ep 1)
      </Link>
    );
  }

  const resumeHref = `/watch/${animeId}/${latestProgress.episode}`;
  const restartHref = `/watch/${animeId}/${latestProgress.episode}?start=beginning`;
  const restartAllHref = `/watch/${animeId}/1?start=beginning`;

  return (
    <div className="relative inline-flex items-center" ref={dropdownRef}>
      {/* Resume Button */}
      <Link
        href={resumeHref as '/'}
        className="inline-flex items-center gap-2 px-5 py-3 rounded-l-xl bg-accent-violet text-white font-bold text-sm shadow-[0_0_24px_rgba(124,91,255,0.25)] hover:bg-[#6b4ae6] transition-colors"
      >
        <Play size={16} fill="currentColor" />
        Resume Ep {latestProgress.episode}
      </Link>

      {/* Dropdown Toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center justify-center p-3 rounded-r-xl bg-[#6b4ae6] border-l border-white/10 text-white font-bold text-sm hover:bg-[#5b3bd6] transition-colors"
        aria-label="Playback options"
      >
        <ChevronDown size={16} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Floating Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1.5 w-60 rounded-xl bg-[#0D0D14]/95 border border-border-default backdrop-blur-md shadow-2xl z-50 py-1.5 animate-fade-up">
          {/* Option 1: Resume */}
          <Link
            href={resumeHref as '/'}
            onClick={() => setIsOpen(false)}
            className="flex flex-col px-4 py-2 hover:bg-white/5 transition-colors text-left"
          >
            <span className="text-white font-bold text-xs">Resume Last Played</span>
            <span className="text-[10px] text-text-muted mt-0.5">
              Ep {latestProgress.episode} at {formatTime(latestProgress.position)} / {formatTime(latestProgress.duration)}
            </span>
          </Link>

          {/* Option 2: Restart Episode */}
          <Link
            href={restartHref as '/'}
            onClick={() => setIsOpen(false)}
            className="flex flex-col px-4 py-2 hover:bg-white/5 transition-colors text-left border-t border-white/5"
          >
            <span className="text-white font-bold text-xs flex items-center gap-1.5">
              <RotateCcw size={12} />
              Restart Episode {latestProgress.episode}
            </span>
            <span className="text-[10px] text-text-muted mt-0.5">Play current episode from 0:00</span>
          </Link>

          {/* Option 3: Start from Beginning */}
          <Link
            href={restartAllHref as '/'}
            onClick={() => setIsOpen(false)}
            className="flex flex-col px-4 py-2 hover:bg-white/5 transition-colors text-left border-t border-white/5"
          >
            <span className="text-white font-bold text-xs flex items-center gap-1.5">
              <RotateCcw size={12} />
              Watch from Beginning (Ep 1)
            </span>
            <span className="text-[10px] text-text-muted mt-0.5">Start entire series from Episode 1</span>
          </Link>
        </div>
      )}
    </div>
  );
}
