'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from '@/navigation';
import { Play } from 'lucide-react';
import { useWatchlistStore } from '@/store/useWatchlistStore';

interface ResumeButtonProps {
  className?: string;
  variant?: 'primary' | 'secondary' | 'icon';
}

export default function ResumeButton({ className = '', variant = 'primary' }: ResumeButtonProps) {
  const router = useRouter();
  const { entries, fetchList } = useWatchlistStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (Object.keys(entries).length === 0) {
      fetchList().catch(() => {});
    }
  }, [entries, fetchList]);

  // Find the entry that has status === 'watching' and was updated most recently
  const resumeEntry = mounted
    ? Object.values(entries)
        .filter((entry) => entry.status === 'watching')
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0]
    : null;

  const handleResume = () => {
    if (!resumeEntry) return;
    const nextEp = (resumeEntry.episodesWatched || 0) + 1;
    router.push(`/watch/${resumeEntry.animeId}/${nextEp}`);
  };

  if (!resumeEntry) {
    if (variant === 'icon') return null;
    return (
      <button
        disabled
        title="No active watch progress found"
        className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-border-subtle bg-bg-secondary/40 text-text-muted text-xs font-semibold cursor-not-allowed opacity-50 ${className}`}
      >
        <Play size={13} className="text-text-disabled" />
        <span>Resume Last</span>
      </button>
    );
  }

  if (variant === 'icon') {
    return (
      <button
        onClick={handleResume}
        className={`flex items-center justify-center w-8 h-8 rounded-full bg-[#7c3aed] text-white hover:bg-[#6d28d9] transition-all hover:scale-105 shadow-md ${className}`}
        title={`Resume ${resumeEntry.animeTitle}`}
      >
        <Play size={14} fill="currentColor" />
      </button>
    );
  }

  const nextEp = (resumeEntry.episodesWatched || 0) + 1;

  return (
    <button
      onClick={handleResume}
      className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-border-subtle bg-bg-secondary hover:border-[#ec4899]/40 hover:bg-bg-elevated hover:shadow-[0_4px_12px_rgba(236,72,153,0.05)] text-text-primary hover:text-[#ec4899] text-xs font-semibold transition-all duration-200 ${className}`}
    >
      <Play size={13} fill="currentColor" className="text-text-muted hover:text-inherit" />
      <span className="truncate max-w-[120px]">Resume Ep {nextEp}</span>
    </button>
  );
}
