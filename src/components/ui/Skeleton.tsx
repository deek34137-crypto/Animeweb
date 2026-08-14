import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'rect' | 'circle' | 'text';
  width?: string | number;
  height?: string | number;
  count?: number;
}

export function SkeletonBlock({ className = '' }: { className?: string }) {
  return (
    <div
      className={`shimmer-loader rounded-sm ${className}`}
      aria-hidden="true"
    />
  );
}

export function AnimeCardSkeleton() {
  return (
    <div className="rounded-card overflow-hidden bg-surface-2 border border-border-subtle h-full flex flex-col">
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
    <div className="relative rounded-modal overflow-hidden h-[310px] sm:h-[460px] shimmer-loader" />
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
          <SkeletonBlock className="h-10 w-32 rounded-button" />
          <SkeletonBlock className="h-10 w-32 rounded-button" />
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

export function EpisodeListSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex gap-3 p-3 bg-surface-2/40 border border-border-subtle rounded-card items-center animate-pulse">
          <SkeletonBlock className="w-20 aspect-video rounded-sm flex-shrink-0" />
          <div className="flex-grow space-y-2">
            <SkeletonBlock className="h-4 w-3/4" />
            <SkeletonBlock className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function CharacterListSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-surface-2/40 border border-border-subtle p-3 rounded-card flex flex-col items-center text-center space-y-3 animate-pulse">
          <SkeletonBlock className="w-16 h-16 rounded-full" />
          <div className="space-y-1.5 w-full flex flex-col items-center">
            <SkeletonBlock className="h-3.5 w-4/5" />
            <SkeletonBlock className="h-2.5 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ReviewsSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="p-5 bg-surface-2/40 border border-border-subtle rounded-card space-y-4 animate-pulse">
          <div className="flex items-center gap-3">
            <SkeletonBlock className="w-10 h-10 rounded-full" />
            <div className="space-y-2 flex-grow">
              <SkeletonBlock className="h-4 w-1/4" />
              <SkeletonBlock className="h-3 w-12" />
            </div>
          </div>
          <div className="space-y-2">
            <SkeletonBlock className="h-3 w-full" />
            <SkeletonBlock className="h-3 w-5/6" />
            <SkeletonBlock className="h-3 w-4/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function CollectionsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-surface-2 border border-border-subtle rounded-card overflow-hidden flex flex-col justify-between p-5 space-y-4">
          <div className="flex gap-4 items-center">
            <SkeletonBlock className="w-16 h-24 rounded-sm flex-shrink-0" />
            <div className="space-y-2 flex-grow">
              <SkeletonBlock className="h-4 w-3/4" />
              <SkeletonBlock className="h-3.5 w-1/2" />
              <SkeletonBlock className="h-3 w-1/3" />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <SkeletonBlock className="h-8 flex-1 rounded-button" />
            <SkeletonBlock className="h-8 flex-1 rounded-button" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function InsightsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
      <div className="bg-surface-2 border border-border-subtle rounded-modal p-6 space-y-4 h-64 flex flex-col justify-between col-span-1">
        <SkeletonBlock className="h-4 w-1/3" />
        <div className="flex justify-center py-2">
          <SkeletonBlock className="w-32 h-32 rounded-full" />
        </div>
        <SkeletonBlock className="h-4 w-2/3 mx-auto" />
      </div>
      <div className="bg-surface-2 border border-border-subtle rounded-modal p-6 space-y-4 h-64 col-span-1 md:col-span-2">
        <SkeletonBlock className="h-4 w-1/4" />
        <div className="space-y-3.5 pt-4">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="flex items-center gap-4">
              <SkeletonBlock className="h-4 w-16" />
              <SkeletonBlock className="h-4 flex-grow rounded-sm" />
              <SkeletonBlock className="h-4 w-8" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ActivityLogSkeleton() {
  return (
    <div className="relative border-l-2 border-border-subtle ml-4 pl-6 space-y-6 animate-pulse">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="relative">
          <span className="absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 border-surface-1 bg-surface-3 shadow-md" />
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <SkeletonBlock className="h-4 w-24" />
              <SkeletonBlock className="h-3 w-16" />
            </div>
            <SkeletonBlock className="h-3.5 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Skeleton({ className = '', variant = 'rect', width, height, count = 1 }: SkeletonProps) {
  const style: React.CSSProperties = {
    width: width ? (typeof width === 'number' ? `${width}px` : width) : undefined,
    height: height ? (typeof height === 'number' ? `${height}px` : height) : undefined,
  };

  const baseClass = variant === 'circle' ? 'rounded-full' : variant === 'text' ? 'rounded-sm' : 'rounded-card';

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
