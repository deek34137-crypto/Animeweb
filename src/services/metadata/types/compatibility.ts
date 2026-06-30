/**
 * src/services/metadata/types/compatibility.ts
 *
 * Jikan v4–compatible TypeScript interfaces.
 *
 * This is the SINGLE SOURCE OF TRUTH for all legacy Jikan types consumed by
 * UI components, API routes, and library modules. Provider implementations map
 * their raw responses into the internal domain model first; the compatibility
 * mapper then converts the domain model into these types for backward compat.
 *
 * Do NOT add provider-specific fields here. Keep this file stable so that
 * existing imports ( `import { AnimeData } from '@/services/jikan'` ) continue
 * to compile without change.
 */

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

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
  youtube_id: string | null;
  url: string | null;
  embed_url: string | null;
}

// ---------------------------------------------------------------------------
// Taxonomy tags (genres / studios / producers / etc.)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export interface RelationEntry {
  mal_id: number;
  type: string;
  name: string;
  url: string;
}

export interface RelationItem {
  relation: string;
  entry: RelationEntry[];
}

// ---------------------------------------------------------------------------
// Core anime record
// ---------------------------------------------------------------------------

export interface BroadcastInfo {
  day: string | null;
  time: string | null;
  timezone: string | null;
  string: string | null;
}

export interface AiredInfo {
  from: string | null;
  to: string | null;
  string: string;
}

export interface AnimeData {
  mal_id: number;
  url: string;
  images: AnimeImages;
  trailer: AnimeTrailer;
  approved: boolean;

  // Titles
  title: string;
  title_english: string | null;
  title_japanese: string | null;
  title_synonyms: string[];

  // Classification
  type: string | null;        // 'TV' | 'Movie' | 'OVA' | 'ONA' | 'Special' | 'Music'
  source: string | null;      // 'Manga' | 'Light novel' | 'Original' | etc.
  episodes: number | null;
  status: string | null;      // 'Finished Airing' | 'Currently Airing' | 'Not yet aired'
  airing: boolean;
  aired: AiredInfo;
  duration: string | null;
  rating: string | null;

  // Scores & rankings
  score: number | null;
  scored_by: number | null;
  rank: number | null;
  popularity: number | null;
  members: number | null;
  favorites: number | null;

  // Content
  synopsis: string | null;
  background: string | null;
  season: string | null;      // 'winter' | 'spring' | 'summer' | 'fall'
  year: number | null;

  // Broadcast
  broadcast: BroadcastInfo;

  // Credits
  producers: ProducerTag[];
  licensors: ProducerTag[];
  studios: StudioTag[];
  genres: GenreTag[];
  explicit_genres: GenreTag[];
  themes: GenreTag[];
  demographics: GenreTag[];

  // Relations (present only on "full" endpoints)
  relations?: RelationItem[];
  theme?: {
    openings: string[];
    endings: string[];
  } | null;
  external?: Array<{ name: string; url: string }> | null;
  streaming?: Array<{ name: string; url: string }> | null;
}

// ---------------------------------------------------------------------------
// Episode
// ---------------------------------------------------------------------------

export interface EpisodeData {
  mal_id: number;
  url: string | null;
  title: string;
  title_japanese: string | null;
  title_romanji: string | null;
  aired: string | null;
  score: number | null;
  filler: boolean;
  recap: boolean;
  forum_url: string | null;
}

// ---------------------------------------------------------------------------
// Characters
// ---------------------------------------------------------------------------

export interface CharacterRoster {
  character: {
    mal_id: number;
    url: string;
    images: AnimeImages;
    name: string;
  };
  role: string;
  favorites: number;
  voice_actors: Array<{
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
    language: string;
  }>;
}

// ---------------------------------------------------------------------------
// Staff
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Recommendations
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------

export interface UserReview {
  mal_id: number;
  url: string;
  type: string;
  votes: number;
  date: string;
  review: string;
  score: number;
  tags: string[];
  is_spoiler: boolean;
  is_preliminary: boolean;
  episodes_watched: number | null;
  user: {
    url: string;
    username: string;
    images: {
      jpg: { image_url: string };
      webp: { image_url: string };
    };
  };
}

// ---------------------------------------------------------------------------
// Airing schedule entry
// ---------------------------------------------------------------------------

export interface ScheduleEntry {
  mal_id: number;
  url: string;
  images: AnimeImages;
  trailer: AnimeTrailer;
  title: string;
  title_english: string | null;
  title_japanese: string | null;
  type: string | null;
  episodes: number | null;
  status: string | null;
  airing: boolean;
  aired: AiredInfo;
  duration: string | null;
  rating: string | null;
  score: number | null;
  rank: number | null;
  popularity: number | null;
  members: number | null;
  favorites: number | null;
  synopsis: string | null;
  season: string | null;
  year: number | null;
  broadcast: BroadcastInfo;
  studios: StudioTag[];
  genres: GenreTag[];
  themes: GenreTag[];
  demographics: GenreTag[];
}

// ---------------------------------------------------------------------------
// Pagination envelope (mirrors Jikan paged responses)
// ---------------------------------------------------------------------------

export interface JikanPagination {
  last_visible_page: number;
  has_next_page: boolean;
  current_page?: number;
  items?: {
    count: number;
    total: number;
    per_page: number;
  };
}

export interface JikanListResponse<T> {
  data: T[];
  pagination: JikanPagination;
}
