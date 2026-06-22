// Jikan API Client (v4) with rate-limiting and in-memory cache

class RequestQueue {
  private queue: (() => Promise<void>)[] = [];
  private processing = false;
  private lastRequestTime = 0;
  private delay = 350; // Delay in ms between requests (strictly maintains < 3 req/sec)

  public add<T>(requestFn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await requestFn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      this.process();
    });
  }

  private async process() {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const now = Date.now();
      const elapsed = now - this.lastRequestTime;
      if (elapsed < this.delay) {
        await new Promise(r => setTimeout(r, this.delay - elapsed));
      }

      const nextRequest = this.queue.shift();
      if (nextRequest) {
        this.lastRequestTime = Date.now();
        await nextRequest();
      }
    }

    this.processing = false;
  }
}

const queue = new RequestQueue();
const cacheMap = new Map<string, { data: any; expiry: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

async function cachedFetch<T>(url: string): Promise<T> {
  const cached = cacheMap.get(url);
  if (cached && cached.expiry > Date.now()) {
    return cached.data as T;
  }

  return queue.add(async () => {
    // Check cache again in case it got populated while queued
    const cachedQueued = cacheMap.get(url);
    if (cachedQueued && cachedQueued.expiry > Date.now()) {
      return cachedQueued.data as T;
    }

    const response = await fetch(url, {
      next: { revalidate: 300 } // Next.js level caching (5 minutes)
    });

    if (response.status === 429) {
      // Back off and try one more time
      await new Promise(resolve => setTimeout(resolve, 2000));
      const retryResponse = await fetch(url);
      if (!retryResponse.ok) {
        throw new Error(`Jikan API Error: ${retryResponse.statusText} (${retryResponse.status})`);
      }
      const data = await retryResponse.json();
      cacheMap.set(url, { data, expiry: Date.now() + CACHE_TTL });
      return data as T;
    }

    if (!response.ok) {
      throw new Error(`Jikan API Error: ${response.statusText} (${response.status})`);
    }

    const data = await response.json();
    cacheMap.set(url, { data, expiry: Date.now() + CACHE_TTL });
    return data as T;
  });
}

// Interfaces based on Jikan API v4 structures
export interface AnimeImage {
  image_url: string;
  small_image_url: string;
  large_image_url: string;
}

export interface AnimeImages {
  jpg: AnimeImage;
  webp: AnimeImage;
}

export interface AnimeTrailer {
  youtube_id: string;
  url: string;
  embed_url: string;
}

export interface GenreTag {
  mal_id: number;
  type: string;
  name: string;
  url: string;
}

export interface ProducerTag {
  mal_id: number;
  type: string;
  name: string;
  url: string;
}

export interface StudioTag {
  mal_id: number;
  type: string;
  name: string;
  url: string;
}

export interface RelationItem {
  relation: string;
  entry: {
    mal_id: number;
    type: string;
    name: string;
    url: string;
  }[];
}

export interface AnimeData {
  mal_id: number;
  url: string;
  images: AnimeImages;
  trailer: AnimeTrailer;
  title: string;
  title_english: string | null;
  title_japanese: string | null;
  title_synonyms: string[];
  type: string;
  source: string;
  episodes: number | null;
  status: string;
  airing: boolean;
  aired: {
    string: string;
  };
  duration: string;
  rating: string;
  score: number | null;
  scored_by: number | null;
  rank: number;
  popularity: number;
  synopsis: string | null;
  background: string | null;
  season: string | null;
  year: number | null;
  producers: ProducerTag[];
  licensors: ProducerTag[];
  studios: StudioTag[];
  genres: GenreTag[];
  relations?: RelationItem[];
  theme?: {
    openings: string[];
    endings: string[];
  };
  external?: {
    name: string;
    url: string;
  }[];
  streaming?: {
    name: string;
    url: string;
  }[];
}

export interface EpisodeData {
  mal_id: number;
  url: string;
  title: string;
  title_japanese: string | null;
  title_romanji: string | null;
  aired: string | null;
  score: number | null;
  filler: boolean;
  recap: boolean;
  forum_url: string | null;
}

export interface CharacterRoster {
  character: {
    mal_id: number;
    url: string;
    images: AnimeImages;
    name: string;
  };
  role: string;
  voice_actors: {
    person: {
      mal_id: number;
      url: string;
      images: AnimeImages;
      name: string;
    };
    language: string;
  }[];
}

export interface RecommendationItem {
  entry: {
    mal_id: number;
    url: string;
    images: AnimeImages;
    title: string;
  };
  url: string;
  votes: number;
}

export interface StaffMember {
  person: {
    mal_id: number;
    url: string;
    images: {
      jpg: {
        image_url: string;
      };
    };
    name: string;
  };
  positions: string[];
}

export interface UserReview {
  mal_id: number;
  url: string;
  type: string;
  reactions: {
    overall: number;
    nice: number;
    love_it: number;
    funny: number;
    confusing: number;
    informative: number;
    well_written: number;
  };
  date: string;
  review: string;
  score: number;
  is_spoiler: boolean;
  is_preliminary: boolean;
  episodes_watched: number | null;
  tags: string[];
  user: {
    username: string;
    url: string;
    images?: {
      jpg?: {
        image_url: string;
      };
      webp?: {
        image_url: string;
      };
    };
  };
}

const BASE_URL = 'https://api.jikan.moe/v4';

export const JikanAPI = {
  getTrendingAnime: async (page = 1): Promise<{ data: AnimeData[] }> => {
    return cachedFetch<{ data: AnimeData[] }>(`${BASE_URL}/top/anime?filter=bypopularity&page=${page}&limit=20`);
  },

  getTopRatedAnime: async (page = 1): Promise<{ data: AnimeData[] }> => {
    return cachedFetch<{ data: AnimeData[] }>(`${BASE_URL}/top/anime?filter=favorite&page=${page}&limit=12`);
  },

  getSeasonalAnime: async (page = 1): Promise<{ data: AnimeData[] }> => {
    return cachedFetch<{ data: AnimeData[] }>(`${BASE_URL}/seasons/now?page=${page}&limit=12`);
  },

  getAnimeDetail: async (id: number): Promise<{ data: AnimeData }> => {
    return cachedFetch<{ data: AnimeData }>(`${BASE_URL}/anime/${id}/full`);
  },

  getAnimeEpisodes: async (id: number): Promise<{ data: EpisodeData[] }> => {
    // If anime is a movie, it won't have episodes lists
    try {
      return await cachedFetch<{ data: EpisodeData[] }>(`${BASE_URL}/anime/${id}/episodes`);
    } catch {
      return { data: [] };
    }
  },

  getAnimeCharacters: async (id: number): Promise<{ data: CharacterRoster[] }> => {
    return cachedFetch<{ data: CharacterRoster[] }>(`${BASE_URL}/anime/${id}/characters`);
  },

  getAnimeRecommendations: async (id: number): Promise<{ data: RecommendationItem[] }> => {
    return cachedFetch<{ data: RecommendationItem[] }>(`${BASE_URL}/anime/${id}/recommendations`);
  },

  getAnimeStaff: async (id: number): Promise<{ data: StaffMember[] }> => {
    try {
      return await cachedFetch<{ data: StaffMember[] }>(`${BASE_URL}/anime/${id}/staff`);
    } catch {
      return { data: [] };
    }
  },

  getAnimeReviews: async (id: number): Promise<{ data: UserReview[] }> => {
    try {
      return await cachedFetch<{ data: UserReview[] }>(`${BASE_URL}/anime/${id}/reviews`);
    } catch {
      return { data: [] };
    }
  },

  getGenres: async (): Promise<{ data: GenreTag[] }> => {
    return cachedFetch<{ data: GenreTag[] }>(`${BASE_URL}/genres/anime`);
  },

  getTopAiringAnime: async (page = 1): Promise<{ data: AnimeData[] }> => {
    return cachedFetch<{ data: AnimeData[] }>(`${BASE_URL}/top/anime?filter=airing&page=${page}&limit=12`);
  },

  getAiringSchedule: async (page = 1): Promise<{ data: AnimeData[] }> => {
    return cachedFetch<{ data: AnimeData[] }>(`${BASE_URL}/schedules?page=${page}&limit=12`);
  },

  getRecentAnimeRecommendations: async (page = 1): Promise<{ data: AnimeData[] }> => {
    try {
      const res = await cachedFetch<{ data: any[] }>(`${BASE_URL}/recommendations/anime?page=${page}`);
      const animeList: AnimeData[] = [];
      const seenIds = new Set<number>();
      
      (res.data || []).forEach((item) => {
        (item.entry || []).forEach((entry: any) => {
          if (!seenIds.has(entry.mal_id)) {
            seenIds.add(entry.mal_id);
            animeList.push(entry);
          }
        });
      });
      
      return { data: animeList.slice(0, 12) };
    } catch {
      return { data: [] };
    }
  },

  searchAnime: async (
    query: string,
    filters: {
      genres?: string;
      year?: string;
      status?: string;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{ data: AnimeData[]; pagination: { has_next_page: boolean; last_visible_page: number } }> => {
    const params = new URLSearchParams();
    if (query) params.append('q', query);
    if (filters.genres) params.append('genres', filters.genres);
    if (filters.year) params.append('start_date', `${filters.year}-01-01`);
    if (filters.status) params.append('status', filters.status);
    params.append('page', String(filters.page || 1));
    params.append('limit', String(filters.limit || 20));

    return cachedFetch<{ data: AnimeData[]; pagination: { has_next_page: boolean; last_visible_page: number } }>(
      `${BASE_URL}/anime?${params.toString()}`
    );
  }
};
