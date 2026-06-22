'use client';

import React from 'react';
import { useRouter } from '@/navigation';
import { Plus, Flame, Import } from 'lucide-react';
import ResumeButton from './ResumeButton';
import FeelingLucky from './FeelingLucky';

interface QuickActionsProps {
  resumeUrl?: string | null;
  guestMode?: boolean;
}

export default function QuickActions({ resumeUrl, guestMode = false }: QuickActionsProps) {
  const router = useRouter();

  // Trigger Command Palette search
  const handleAddAnime = () => {
    const event = new KeyboardEvent('keydown', {
      key: 'k',
      ctrlKey: true,
      bubbles: true,
    });
    window.dispatchEvent(event);
  };

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Quick Actions</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Add Anime */}
        <button
          onClick={handleAddAnime}
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-border-subtle bg-bg-secondary hover:border-accent-violet/40 hover:bg-bg-elevated hover:shadow-[0_4px_12px_rgba(124,58,237,0.05)] text-text-primary hover:text-[#7c3aed] text-xs font-semibold transition-all duration-200"
        >
          <Plus size={14} className="text-text-muted hover:text-inherit" />
          <span>Add Anime</span>
        </button>

        {/* Resume Last Anime */}
        <ResumeButton className="w-full" />

        {/* Browse Trending */}
        <button
          onClick={() => router.push('/search?sort=trending')}
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-border-subtle bg-bg-secondary hover:border-accent-violet/40 hover:bg-bg-elevated hover:shadow-[0_4px_12px_rgba(124,58,237,0.05)] text-text-primary hover:text-[#7c3aed] text-xs font-semibold transition-all duration-200"
        >
          <Flame size={13} className="text-text-muted hover:text-inherit" />
          <span>Browse Trending</span>
        </button>

        {/* Feeling Lucky */}
        <FeelingLucky className="w-full" />

        {/* Import Sync */}
        <button
          onClick={() => router.push('/settings')}
          className="col-span-2 sm:col-span-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-border-subtle bg-bg-secondary hover:border-accent-violet/40 hover:bg-bg-elevated hover:shadow-[0_4px_12px_rgba(124,58,237,0.05)] text-text-primary hover:text-[#7c3aed] text-xs font-semibold transition-all duration-200"
        >
          <Import size={13} className="text-text-muted hover:text-inherit" />
          <span>Import Sync</span>
        </button>
      </div>
    </div>
  );
}
