'use client';

import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import SectionHeader from './SectionHeader';

interface AnimeCarouselProps {
  title: string;
  icon?: React.ReactNode;
  viewAllHref?: string;
  children: React.ReactNode;
}

export default function AnimeCarousel({
  title,
  icon,
  viewAllHref,
  children,
}: AnimeCarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  // Check scroll position to hide/show navigation arrows
  const checkScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    
    // Show left arrow if scrolled away from the start
    setShowLeftArrow(el.scrollLeft > 10);
    
    // Show right arrow if there is remaining content to scroll
    const maxScroll = el.scrollWidth - el.clientWidth;
    setShowRightArrow(el.scrollLeft < maxScroll - 10);
  };

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (el) {
      el.addEventListener('scroll', checkScroll);
      // Run once initially
      checkScroll();
      
      // Handle resizing
      window.addEventListener('resize', checkScroll);
    }
    return () => {
      if (el) {
        el.removeEventListener('scroll', checkScroll);
      }
      window.removeEventListener('resize', checkScroll);
    };
  }, [children]);

  // Scroll function
  const scroll = (direction: 'left' | 'right') => {
    const el = scrollContainerRef.current;
    if (!el) return;
    
    const scrollAmount = el.clientWidth * 0.75;
    el.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  return (
    <div className="space-y-1 relative group/carousel">
      {/* Title Header */}
      <SectionHeader title={title} icon={icon} viewAllHref={viewAllHref} />

      {/* Carousel Container */}
      <div className="relative">
        {/* Left Arrow Button */}
        {showLeftArrow && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-bg-secondary/70 backdrop-blur-md border border-border-subtle flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-bg-elevated/90 transition-all duration-200 shadow-lg opacity-0 group-hover/carousel:opacity-100 focus:opacity-100"
            aria-label="Scroll Left"
          >
            <ChevronLeft size={18} />
          </button>
        )}

        {/* Right Arrow Button */}
        {showRightArrow && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-bg-secondary/70 backdrop-blur-md border border-border-subtle flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-bg-elevated/90 transition-all duration-200 shadow-lg opacity-0 group-hover/carousel:opacity-100 focus:opacity-100"
            aria-label="Scroll Right"
          >
            <ChevronRight size={18} />
          </button>
        )}

        {/* Horizontal Scroll Area */}
        <div
          ref={scrollContainerRef}
          className="flex gap-4 overflow-x-auto pb-4 scroll-smooth snap-x scrollbar-none"
          style={{
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
