'use client';

import React, { useState, Suspense } from 'react';
import VideoPlayer from '@/components/video/VideoPlayer';

interface EpisodeSource {
  url: string;
  quality: '1080p' | '720p' | '480p' | '360p' | 'auto' | 'default';
  isM3U8: boolean;
}

interface SubtitleTrack {
  label: string;
  lang: string;
  url: string;
}

interface WatchPageClientProps {
  animeId: string;
  animeImage: string;
  sources: EpisodeSource[];
  subSources?: EpisodeSource[];
  dubSources?: EpisodeSource[];
  hindiSources?: EpisodeSource[];
  tamilSources?: EpisodeSource[];
  teluguSources?: EpisodeSource[];
  subtitles?: SubtitleTrack[];
  animeTitle: string;
  episodeNumber: number;
  totalEpisodes?: number;
  initialPosition?: number;
  providers?: string[];
  currentProvider?: string;
  isFallback?: boolean;
  fallbackReason?: string;
  matchedTitle?: string;
  matchedSlug?: string;
  searchCount?: number;
  episodeCountFound?: number;
  providerSlug?: string;
  sidebar: React.ReactNode;
}

export default function WatchPageClient({
  sidebar,
  ...playerProps
}: WatchPageClientProps) {
  const [isTheaterMode, setIsTheaterMode] = useState(false);

  return (
    <div
      className={`transition-all duration-300 ${
        isTheaterMode
          ? 'flex flex-col gap-6'
          : 'grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start'
      }`}
    >
      {/* Left Area: Video Player */}
      <div className="space-y-6 min-w-0">
        <Suspense fallback={<div className="aspect-video w-full rounded-2xl shimmer-loader" />}>
          <VideoPlayer
            {...playerProps}
            onTheaterModeChange={setIsTheaterMode}
          />
        </Suspense>
      </div>

      {/* Right/Bottom Area: Episode Sidebar */}
      <aside
        className={`w-full ${
          isTheaterMode ? '' : 'lg:sticky lg:top-[88px] z-20'
        }`}
      >
        {sidebar}
      </aside>
    </div>
  );
}
