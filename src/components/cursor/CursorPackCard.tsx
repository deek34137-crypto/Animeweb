'use client';

import React from 'react';
import { useCursor, CursorPack } from '@/providers/CursorProvider';
import { Check } from 'lucide-react';

interface CursorPackCardProps {
  pack: CursorPack;
}

export default function CursorPackCard({ pack }: CursorPackCardProps) {
  const { activeCursor, setCursor, setPreviewCursor } = useCursor();
  const isActive = activeCursor?.id === pack.id;

  const handleMouseEnter = () => {
    setPreviewCursor(pack);
  };

  const handleMouseLeave = () => {
    setPreviewCursor(null);
  };

  const handleClick = () => {
    setCursor(pack);
  };

  return (
    <button
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative w-full flex flex-col items-center justify-between p-5 rounded-2xl border text-center transition-all duration-300 group overflow-hidden ${
        isActive
          ? 'bg-gradient-to-b from-[#7c3aed]/10 to-[#ec4899]/5 border-[#7c3aed] shadow-[0_0_20px_rgba(124,58,237,0.25)]'
          : 'bg-white/[0.02] dark:bg-white/[0.01] border-border-subtle hover:border-[#7c3aed]/40 hover:bg-white/[0.04] dark:hover:bg-white/[0.02] hover:shadow-[0_10px_30px_rgba(0,0,0,0.3)] hover:-translate-y-1'
      }`}
    >
      {/* Background ambient glow on hover */}
      <div className="absolute inset-0 bg-gradient-to-tr from-[#7c3aed]/0 via-[#7c3aed]/0 to-[#ec4899]/0 group-hover:from-[#7c3aed]/5 group-hover:to-[#ec4899]/5 transition-all duration-500" />

      {/* Active Checkmark Badge */}
      {isActive && (
        <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-gradient-to-r from-[#7c3aed] to-[#ec4899] flex items-center justify-center text-white shadow-lg animate-scale-in">
          <Check size={12} strokeWidth={3} />
        </div>
      )}

      {/* Image Preview Container */}
      <div className="relative w-20 h-20 rounded-2xl bg-white/[0.04] dark:bg-black/30 border border-border-subtle flex items-center justify-center mb-4 transition-all duration-300 group-hover:scale-110 group-hover:border-[#7c3aed]/40 group-hover:bg-white/[0.06]">
        {/* Pointer & Cursor Side-by-Side Preview */}
        <div className="flex gap-4 items-center justify-center">
          {/* Default Cursor Image */}
          <div className="relative flex flex-col items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={pack.cursor}
              alt={`${pack.name} cursor`}
              className="w-8 h-8 object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
              draggable={false}
            />
            <span className="text-[9px] text-text-muted mt-1 font-mono uppercase tracking-wider">Default</span>
          </div>

          {/* Link Pointer Image */}
          <div className="relative flex flex-col items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={pack.pointer}
              alt={`${pack.name} pointer`}
              className="w-8 h-8 object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
              draggable={false}
            />
            <span className="text-[9px] text-text-muted mt-1 font-mono uppercase tracking-wider">Link</span>
          </div>
        </div>
      </div>

      {/* Cursor Info */}
      <div className="w-full">
        <h3 className="text-xs sm:text-sm font-bold text-text-primary truncate mb-1 group-hover:text-[#7c3aed] transition-colors duration-200">
          {pack.name}
        </h3>
        
        {/* Category Tag */}
        <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/[0.05] dark:bg-white/[0.03] border border-border-subtle text-text-secondary">
          {pack.category}
        </span>
      </div>
    </button>
  );
}
