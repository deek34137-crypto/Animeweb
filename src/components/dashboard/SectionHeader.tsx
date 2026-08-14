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
      <div className="flex items-center gap-2.5">
        {icon && (
          <span className="text-text-secondary flex items-center justify-center flex-shrink-0">
            {icon}
          </span>
        )}
        
        <h2 className="text-lg sm:text-xl font-bold text-text-primary font-display leading-none">
          {title}
        </h2>
      </div>

      {/* Optional Link */}
      {viewAllHref && (
        <Link
          href={viewAllHref as '/'}
          className="inline-flex items-center gap-1 text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors duration-200 group"
        >
          <span>{viewAllText}</span>
          <ChevronRight size={14} className="transition-transform duration-200 group-hover:translate-x-1" />
        </Link>
      )}
    </div>
  );
}
