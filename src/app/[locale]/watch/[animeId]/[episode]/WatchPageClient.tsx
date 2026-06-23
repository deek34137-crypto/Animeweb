'use client';

import React, { useState, useEffect, Suspense } from 'react';
import VideoPlayer from '@/components/video/VideoPlayer';

interface EpisodeSource {
  url: string;
  quality: '1080p' | '720p' | '480p' | '360p' | 'auto' | 'default';
  isM3U8: boolean;
  lang?: string;
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
  
  // Next episode details
  nextEpisodeTitle?: string;
  nextEpisodeThumbnail?: string;
}

export default function WatchPageClient({
  sidebar,
  ...playerProps
}: WatchPageClientProps) {
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [bookmarks, setBookmarks] = useState<any[]>([]);

  // Fetch bookmarks on client mount / parameter changes
  useEffect(() => {
    const fetchBookmarks = async () => {
      try {
        const res = await fetch(`/api/user/bookmarks?animeId=${playerProps.animeId}&episode=${playerProps.episodeNumber}`);
        if (res.ok) {
          const data = await res.json();
          setBookmarks(data);
        }
      } catch (err) {
        console.error('Failed to fetch bookmarks:', err);
      }
    };
    fetchBookmarks();
  }, [playerProps.animeId, playerProps.episodeNumber]);

  const handleAddBookmark = async (timestamp: number, note: string) => {
    try {
      const res = await fetch('/api/user/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          animeId: playerProps.animeId,
          episode: playerProps.episodeNumber,
          timestamp,
          note,
        }),
      });
      if (res.ok) {
        const newB = await res.json();
        setBookmarks((prev) => [...prev, newB].sort((a, b) => a.timestamp - b.timestamp));
      }
    } catch (err) {
      console.error('Failed to add bookmark:', err);
    }
  };

  const handleDeleteBookmark = async (id: string) => {
    try {
      const res = await fetch(`/api/user/bookmarks?id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setBookmarks((prev) => prev.filter((b) => b.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete bookmark:', err);
    }
  };

  const handleUpdateBookmarkNote = async (id: string, note: string) => {
    try {
      const res = await fetch('/api/user/bookmarks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, note }),
      });
      if (res.ok) {
        const updated = await res.json();
        setBookmarks((prev) => prev.map((b) => (b.id === id ? updated : b)));
      }
    } catch (err) {
      console.error('Failed to update bookmark note:', err);
    }
  };

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
            bookmarks={bookmarks}
            onAddBookmark={handleAddBookmark}
            onDeleteBookmark={handleDeleteBookmark}
            onUpdateBookmarkNote={handleUpdateBookmarkNote}
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
