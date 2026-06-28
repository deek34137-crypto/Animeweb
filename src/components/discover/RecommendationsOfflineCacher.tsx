'use client';

import { useEffect } from 'react';
import { cacheRecommendations } from '@/lib/offlineCache';

interface RecommendationsOfflineCacherProps {
  recommendations: any[];
}

export default function RecommendationsOfflineCacher({ recommendations }: RecommendationsOfflineCacherProps) {
  useEffect(() => {
    if (recommendations && recommendations.length > 0) {
      // Map to offline snapshot format
      const mapped = recommendations.map(rec => ({
        title: rec.title || '',
        coverImage: rec.images?.jpg?.large_image_url || rec.images?.jpg?.image_url || '',
        synopsis: rec.synopsis || rec.reasons?.map((r: any) => r.seedTitle ? `Similar to ${r.seedTitle}` : '').join(', ') || 'Based on your watch history.',
        genres: rec.genres || []
      }));
      cacheRecommendations(mapped);
    }
  }, [recommendations]);

  return null;
}
