'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Search, X as XIcon, Loader2 } from 'lucide-react';
import { HStreamVideo, fetchHStreamSearch } from '@/services/hentai';
import HentaiVideoCard from './HentaiVideoCard';
import HentaiPlayerModal, { HentaiModalPayload } from './HentaiPlayerModal';

interface HentaiVideoGridProps {
  trendingVideos?: HStreamVideo[];
}

export default function HentaiVideoGrid({ trendingVideos = [] }: HentaiVideoGridProps) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [videos, setVideos] = useState<HStreamVideo[]>(trendingVideos);
  const [loading, setLoading] = useState(false);
  const [modalPayload, setModalPayload] = useState<HentaiModalPayload | null>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch search results
  useEffect(() => {
    if (!debouncedSearch.trim()) {
      setVideos(trendingVideos);
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);

    fetchHStreamSearch(debouncedSearch).then((results) => {
      if (isMounted) {
        setVideos(results);
        setLoading(false);
      }
    }).catch(() => {
      if (isMounted) {
        setVideos([]);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [debouncedSearch, trendingVideos]);

  const openModal = useCallback((video: HStreamVideo) => {
    setModalPayload({ video });
  }, []);

  const closeModal = useCallback(() => {
    setModalPayload(null);
  }, []);

  return (
    <>
      {/* Search Row */}
      <div className="flex mb-8">
        <div className="relative w-full max-w-2xl mx-auto">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search hentai by title, tag, or character..."
            className="w-full bg-surface-2 border border-border-subtle rounded-xl pl-11 pr-11 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-red-500/50 focus:bg-surface-3 transition-all shadow-sm focus:shadow-[0_0_16px_rgba(239,68,68,0.1)]"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors p-1"
            >
              <XIcon size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Grid Status Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-text-primary">
          {search ? 'Search Results' : 'Trending Now'}
        </h3>
        <span className="text-[10px] text-text-muted bg-surface-2 border border-border-subtle px-2 py-0.5 rounded-full">
          {videos.length} videos
        </span>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-text-muted">
          <Loader2 className="w-8 h-8 animate-spin mb-4 text-red-400" />
          <p className="text-sm font-medium">Searching videos...</p>
        </div>
      ) : (
        <>
          {/* Videos Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {videos.map((video) => (
              <HentaiVideoCard key={video.id} video={video} onStream={openModal} />
            ))}
          </div>

          {/* Empty State */}
          {videos.length === 0 && (
            <div className="text-center py-20 text-text-muted">
              <div className="text-4xl mb-4 opacity-50">🔍</div>
              <p className="text-sm font-medium">
                {search ? `No videos found for "${search}".` : 'No videos available right now.'}
              </p>
            </div>
          )}
        </>
      )}

      {/* Player Modal */}
      <HentaiPlayerModal payload={modalPayload} onClose={closeModal} />
    </>
  );
}
