'use client';

import React from 'react';
import { Link } from '@/navigation';
import { ChevronRight } from 'lucide-react';

interface SectionHeaderProps {
  title: string;
  icon?: React.ReactNode;
  viewAllHref?: string;
  viewAllText?: string;
}

export default function SectionHeader({
  title,
  icon,
  viewAllHref,
  viewAllText = 'View All',
}: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      {/* Title + Icon group */}
      <div className="flex items-center gap-2">
        {/* Accent Bar */}
        <div className="w-1 h-5 rounded-full bg-gradient-to-b from-[#7c3aed] to-[#ec4899] flex-shrink-0" />
        
        {icon && (
          <span className="text-accent-violet flex items-center justify-center flex-shrink-0">
            {icon}
          </span>
        )}
        
        <h2 className="text-base sm:text-lg font-bold text-text-primary font-display tracking-tight leading-none">
          {title}
        </h2>
      </div>

      {/* Optional Link */}
      {viewAllHref && (
        <Link
          href={viewAllHref as '/'}
          className="inline-flex items-center gap-0.5 text-xs font-bold text-accent-violet hover:text-[#6b4ae6] transition-colors group"
        >
          <span>{viewAllText}</span>
          <ChevronRight size={13} className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}
