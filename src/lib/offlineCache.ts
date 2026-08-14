export interface OfflineAnimeSnapshot {
  animeId: string;
  title: string;
  coverImage: string;
  synopsis: string | null;
  genres: string[];
  episodeCount: number | null;
  status: string | null;
}

export const trackRecentlyViewed = (anime: OfflineAnimeSnapshot) => {
  if (typeof window === 'undefined') return;

  try {
    const raw = localStorage.getItem('offline-recently-viewed');
    let list: OfflineAnimeSnapshot[] = [];
    
    if (raw) {
      list = JSON.parse(raw);
    }
    
    // Remove duplicate entry if it exists
    list = list.filter(item => item.animeId !== anime.animeId);
    
    // Add to the front of the list
    list.unshift(anime);
    
    // Keep only the last 50 items
    if (list.length > 50) {
      list = list.slice(0, 50);
    }
    
    localStorage.setItem('offline-recently-viewed', JSON.stringify(list));
  } catch (e) {
    console.error('Failed to update recently viewed offline cache:', e);
  }
};

export const cacheRecommendations = (recommendations: any[]) => {
  if (typeof window === 'undefined') return;

  try {
    // Only cache essential fields to save space
    const snapshots = recommendations.map(rec => ({
      title: rec.title || rec.animeTitle || '',
      coverImage: rec.coverImage || rec.animeImage || '',
      synopsis: rec.synopsis || null,
      genres: rec.genres || []
    }));

    localStorage.setItem('offline-recommendation', JSON.stringify(snapshots));
  } catch (e) {
    console.error('Failed to update recommendations offline cache:', e);
  }
};
