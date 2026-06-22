'use client';

import React from 'react';
import { usePathname } from '@/navigation';
import { Link } from '@/navigation';
import { Home, ChevronRight } from 'lucide-react';

export default function Breadcrumb() {
  const pathname = usePathname();

  if (pathname === '/' || pathname === '') return null;

  // Split paths and filter out empty segments
  const segments = pathname.split('/').filter(Boolean);

  // Helper to map route segment name to pretty label
  const getSegmentLabel = (segment: string) => {
    switch (segment) {
      case 'profile':
        return 'My Anime';
      case 'history':
        return 'History';
      case 'settings':
        return 'Settings';
      case 'search':
        return 'Search';
      case 'watch':
        return 'Watch';
      case 'anime':
        return 'Details';
      default:
        // Decouple IDs or slugs, capitalize first letter
        if (!isNaN(parseInt(segment, 10)) || segment.startsWith('series-')) {
          return 'Show';
        }
        return segment.charAt(0).toUpperCase() + segment.slice(1);
    }
  };

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-text-secondary select-none py-2 mb-4">
      {/* Home link */}
      <Link
        href="/"
        className="flex items-center gap-1 text-text-muted hover:text-text-primary transition-colors"
      >
        <Home size={13} />
        <span className="hidden sm:inline">Home</span>
      </Link>

      {segments.map((segment, idx) => {
        const isLast = idx === segments.length - 1;
        const href = '/' + segments.slice(0, idx + 1).join('/');
        const label = getSegmentLabel(segment);

        return (
          <React.Fragment key={href}>
            <ChevronRight size={12} className="text-text-disabled flex-shrink-0" />
            {isLast ? (
              <span className="font-semibold text-text-primary truncate max-w-[120px] sm:max-w-none">
                {label}
              </span>
            ) : (
              <Link
                href={href as '/'}
                className="text-text-muted hover:text-text-primary transition-colors truncate max-w-[100px] sm:max-w-none"
              >
                {label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
