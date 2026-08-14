'use client';

import { useEffect } from 'react';
import { trackRecentlyViewed, OfflineAnimeSnapshot } from '@/lib/offlineCache';

interface OfflineTrackerProps {
  anime: OfflineAnimeSnapshot;
}

export default function OfflineTracker({ anime }: OfflineTrackerProps) {
  useEffect(() => {
    trackRecentlyViewed(anime);
  }, [anime]);

  return null;
}
