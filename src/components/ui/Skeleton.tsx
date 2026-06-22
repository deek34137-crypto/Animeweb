import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'rect' | 'circle' | 'text';
  width?: string | number;
  height?: string | number;
  count?: number;
}

function SkeletonBlock({ className = '' }: { className?: string }) {
  return (
    <div
      className={`shimmer-loader rounded-lg ${className}`}
      aria-hidden="true"
    />
  );
}

export function AnimeCardSkeleton() {
  return (
    <div className="rounded-xl overflow-hidden bg-surface-2 border border-border-subtle h-full flex flex-col">
      <div className="aspect-[2/3] shimmer-loader" />
      <div className="p-3 space-y-2">
        <SkeletonBlock className="h-4 w-4/5" />
        <div className="flex justify-between">
          <SkeletonBlock className="h-3 w-16" />
          <SkeletonBlock className="h-3 w-12" />
        </div>
      </div>
    </div>
  );
}

export function HeroSkeleton() {
  return (
    <div className="relative rounded-2xl overflow-hidden h-[460px] shimmer-loader" />
  );
}

export function DetailHeroSkeleton() {
  return (
    <div className="relative w-full h-[500px] bg-surface-1 overflow-hidden">
      <div className="absolute inset-0 shimmer-loader" />
      <div className="absolute bottom-0 left-0 p-8 space-y-4 z-10 max-w-3xl">
        <SkeletonBlock className="h-5 w-24" />
        <SkeletonBlock className="h-12 w-3/4" />
        <SkeletonBlock className="h-4 w-full" />
        <SkeletonBlock className="h-4 w-5/6" />
        <div className="flex gap-3 pt-2">
          <SkeletonBlock className="h-10 w-32 rounded-xl" />
          <SkeletonBlock className="h-10 w-32 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function SectionSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
        <SkeletonBlock className="h-7 w-48" />
        <SkeletonBlock className="h-5 w-16" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {Array.from({ length: count }).map((_, i) => (
          <AnimeCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export default function Skeleton({ className = '', variant = 'rect', width, height, count = 1 }: SkeletonProps) {
  const style: React.CSSProperties = {
    width: width ? (typeof width === 'number' ? `${width}px` : width) : undefined,
    height: height ? (typeof height === 'number' ? `${height}px` : height) : undefined,
  };

  const baseClass = variant === 'circle' ? 'rounded-full' : variant === 'text' ? 'rounded' : 'rounded-lg';

  if (count === 1) {
    return <SkeletonBlock className={`${baseClass} ${className}`} />;
  }

  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`shimmer-loader ${baseClass} ${className}`} style={style} />
      ))}
    </div>
  );
}
