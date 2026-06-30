/**
 * src/services/jikan.ts
 *
 * COMPATIBILITY FACADE — Phase 1
 *
 * This file is intentionally kept as the public import path used by every UI
 * component, API route, and library module in the codebase.
 *
 * All Jikan types are re-exported from the canonical types file so that the
 * 40+ existing `import { AnimeData } from '@/services/jikan'` statements
 * continue to compile without modification.
 *
 * DATA SOURCE (Phase 1):
 *   Primary  → AniList GraphQL API  (https://graphql.anilist.co)
 *   Fallback → stale in-memory cache, then empty dataset
 *
 * PHASE ROADMAP:
 *   Phase 2 → Replace direct AniList calls with MetadataProvider interface
 *   Phase 3 → Add Normalizer → Mapper → Domain Model pipeline
 *   Phase 4 → Add Repository layer (PostgreSQL + Redis)
 *   Phase 5 → Route search through Meilisearch index
 *   Phase 6 → BullMQ background synchronisation
 *   Phase 7 → Circuit-breakers, observability, health checks
 */

// ---------------------------------------------------------------------------
// Re-export all legacy Jikan types (single source of truth)
// ---------------------------------------------------------------------------
export type {
  AnimeImage,
  AnimeImages,
  AnimeTrailer,
  GenreTag,
  ProducerTag,
  StudioTag,
  RelationEntry,
  RelationItem,
  BroadcastInfo,
  AiredInfo,
  AnimeData,
  EpisodeData,
  CharacterRoster,
  StaffMember,
  RecommendationItem,
  UserReview,
  ScheduleEntry,
  JikanPagination,
  JikanListResponse,
} from '@/services/metadata/types/compatibility';

import type {
  AnimeData,
  EpisodeData,
  CharacterRoster,
  StaffMember,
  RecommendationItem,
  UserReview,
  GenreTag,
  ScheduleEntry,
  JikanPagination,
} from '@/services/metadata/types/compatibility';

import { env } from '@/lib/config/env';
import { MetadataService } from '@/services/metadata/MetadataService';

// ---------------------------------------------------------------------------
// Minimal in-memory cache (replaced by Redis in Phase 4)
// ---------------------------------------------------------------------------
interface CacheEntry<T> { data: T; expiresAt: number }
const _cache = new Map<string, CacheEntry<unknown>>();

function getCache<T>(key: string): T | null {
  const entry = _cache.get(key) as CacheEntry<T> | undefined;
  if (!entry || Date.now() > entry.expiresAt) return null;
  return entry.data;
}

function setCache<T>(key: string, data: T, ttlMs = 5 * 60 * 1000): void {
  _cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

// ---------------------------------------------------------------------------
// AniList GraphQL transport (Phase 1 primary source)
// ---------------------------------------------------------------------------
const ANILIST_ENDPOINT = 'https://graphql.anilist.co';

async function anilistQuery<T>(
  query: string,
  variables: Record<string, unknown> = {}
): Promise<T> {
  const res = await fetch(ANILIST_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query, variables }),
    next: { revalidate: 300 },
  });

  if (!res.ok) throw new Error(`AniList HTTP ${res.status}`);

  const json = (await res.json()) as { data?: T; errors?: { message: string }[] };
  if (json.errors?.length) throw new Error(`AniList GQL: ${json.errors[0].message}`);
  if (!json.data) throw new Error('AniList returned no data');
  return json.data;
}

// ---------------------------------------------------------------------------
// AniList → AnimeData mapper (Phase 3 will move this to mappers/)
// ---------------------------------------------------------------------------
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapAnilistMedia(m: any): AnimeData {
  const jpg = m.coverImage?.large ?? '';
  const images = {
    jpg: { image_url: jpg, small_image_url: m.coverImage?.medium ?? jpg, large_image_url: jpg },
    webp: { image_url: jpg, small_image_url: m.coverImage?.medium ?? jpg, large_image_url: jpg },
  };

  const statusMap: Record<string, string> = {
    FINISHED: 'Finished Airing',
    RELEASING: 'Currently Airing',
    NOT_YET_RELEASED: 'Not yet aired',
    CANCELLED: 'Cancelled',
    HIATUS: 'On Hiatus',
  };

  const seasonMap: Record<string, string> = {
    WINTER: 'winter', SPRING: 'spring', SUMMER: 'summer', FALL: 'fall',
  };

  const startDate = m.startDate
    ? `${m.startDate.year ?? ''}-${String(m.startDate.month ?? 1).padStart(2, '0')}-${String(m.startDate.day ?? 1).padStart(2, '0')}`
    : null;

  const endDate = m.endDate
    ? `${m.endDate.year ?? ''}-${String(m.endDate.month ?? 1).padStart(2, '0')}-${String(m.endDate.day ?? 1).padStart(2, '0')}`
    : null;

  // Strip HTML from synopsis
  const rawSynopsis: string = m.description ?? '';
  const synopsis = rawSynopsis.replace(/<[^>]*>/g, '').replace(/&[a-z]+;/gi, ' ').trim() || null;

  const genres: GenreTag[] = (m.genres ?? []).map((name: string, i: number) => ({
    mal_id: i + 1,
    type: 'anime',
    name,
    url: `https://anilist.co/genre/${encodeURIComponent(name)}`,
  }));

  const studios: { mal_id: number; type: string; name: string; url: string }[] =
    (m.studios?.nodes ?? []).map((s: { id: number; name: string }) => ({
      mal_id: s.id,
      type: 'anime',
      name: s.name,
      url: `https://anilist.co/studio/${s.id}`,
    }));

  return {
    mal_id: m.idMal ?? 0,
    url: m.siteUrl ?? '',
    images,
    trailer: {
      youtube_id: m.trailer?.id ?? null,
      url: m.trailer?.id ? `https://youtu.be/${m.trailer.id}` : null,
      embed_url: m.trailer?.id ? `https://www.youtube.com/embed/${m.trailer.id}` : null,
    },
    approved: true,
    title: m.title?.romaji ?? m.title?.english ?? 'Unknown',
    title_english: m.title?.english ?? null,
    title_japanese: m.title?.native ?? null,
    title_synonyms: m.synonyms ?? [],
    type: m.format ?? null,
    source: m.source ?? null,
    episodes: m.episodes ?? null,
    status: statusMap[m.status] ?? m.status ?? null,
    airing: m.status === 'RELEASING',
    aired: {
      from: startDate,
      to: endDate,
      string: startDate ? (endDate ? `${startDate} to ${endDate}` : `${startDate} to ?`) : 'Not aired',
    },
    duration: m.duration ? `${m.duration} min per ep` : null,
    rating: null,
    score: m.averageScore ? m.averageScore / 10 : null,
    scored_by: m.popularity ?? null,
    rank: m.rankings?.[0]?.rank ?? null,
    popularity: m.popularity ?? null,
    members: m.popularity ?? null,
    favorites: m.favourites ?? null,
    synopsis,
    background: m.bannerImage ?? null,
    season: m.season ? (seasonMap[m.season] ?? m.season.toLowerCase()) : null,
    year: m.seasonYear ?? m.startDate?.year ?? null,
    broadcast: { day: null, time: null, timezone: null, string: null },
    producers: [],
    licensors: [],
    studios,
    genres,
    explicit_genres: [],
    themes: [],
    demographics: [],
    relations: [],
  };
}

// ---------------------------------------------------------------------------
// Shared AniList fragments
// ---------------------------------------------------------------------------
const MEDIA_FIELDS = /* GraphQL */ `
  id
  idMal
  siteUrl
  title { romaji english native }
  synonyms
  format
  status
  description
  episodes
  duration
  season
  seasonYear
  averageScore
  popularity
  favourites
  genres
  source
  startDate { year month day }
  endDate   { year month day }
  coverImage { large medium }
  bannerImage
  trailer { id site }
  rankings { rank type allTime season year context }
  studios(isMain: true) { nodes { id name } }
  relations { edges { relationType node { id idMal title { romaji } format } } }
`;

// ---------------------------------------------------------------------------
// Public JikanAPI facade
// ---------------------------------------------------------------------------
export const JikanAPI = {
  // ── Trending / Charts ────────────────────────────────────────────────────

  async getTrendingAnime(page = 1): Promise<{ data: AnimeData[]; pagination: { has_next_page: boolean; last_visible_page: number } }> {
    const cacheKey = `trending-${page}`;
    const cached = getCache<{ data: AnimeData[]; pagination: { has_next_page: boolean; last_visible_page: number } }>(cacheKey);
    if (cached) return cached;

    try {
      const perPage = 20;
      const gql = /* GraphQL */ `
        query ($page: Int, $perPage: Int) {
          Page(page: $page, perPage: $perPage) {
            pageInfo { hasNextPage lastPage }
            media(sort: TRENDING_DESC, type: ANIME) { ${MEDIA_FIELDS} }
          }
        }
      `;
      const res = await anilistQuery<{ Page: { pageInfo: { hasNextPage: boolean; lastPage: number }; media: unknown[] } }>(
        gql, { page, perPage }
      );
      const result = {
        data: res.Page.media.map(mapAnilistMedia),
        pagination: { has_next_page: res.Page.pageInfo.hasNextPage, last_visible_page: res.Page.pageInfo.lastPage },
      };
      setCache(cacheKey, result, 5 * 60 * 1000); // 5 min TTL
      return result;
    } catch {
      return { data: [], pagination: { has_next_page: false, last_visible_page: 1 } };
    }
  },

  async getTopAiringAnime(page = 1): Promise<{ data: AnimeData[] }> {
    const cacheKey = `airing-${page}`;
    const cached = getCache<{ data: AnimeData[] }>(cacheKey);
    if (cached) return cached;

    try {
      const gql = /* GraphQL */ `
        query ($page: Int, $perPage: Int) {
          Page(page: $page, perPage: $perPage) {
            media(status: RELEASING, sort: POPULARITY_DESC, type: ANIME) { ${MEDIA_FIELDS} }
          }
        }
      `;
      const res = await anilistQuery<{ Page: { media: unknown[] } }>(gql, { page, perPage: 20 });
      const result = { data: res.Page.media.map(mapAnilistMedia) };
      setCache(cacheKey, result, 5 * 60 * 1000);
      return result;
    } catch {
      return { data: [] };
    }
  },

  async getTopRatedAnime(page = 1): Promise<{ data: AnimeData[] }> {
    const cacheKey = `rated-${page}`;
    const cached = getCache<{ data: AnimeData[] }>(cacheKey);
    if (cached) return cached;

    try {
      const gql = /* GraphQL */ `
        query ($page: Int, $perPage: Int) {
          Page(page: $page, perPage: $perPage) {
            media(sort: SCORE_DESC, type: ANIME) { ${MEDIA_FIELDS} }
          }
        }
      `;
      const res = await anilistQuery<{ Page: { media: unknown[] } }>(gql, { page, perPage: 20 });
      const result = { data: res.Page.media.map(mapAnilistMedia) };
      setCache(cacheKey, result, 60 * 60 * 1000); // 1 hr
      return result;
    } catch {
      return { data: [] };
    }
  },

  // ── Seasonal ─────────────────────────────────────────────────────────────

  async getSeasonalAnime(page = 1): Promise<{ data: AnimeData[] }> {
    const cacheKey = `seasonal-${page}`;
    const cached = getCache<{ data: AnimeData[] }>(cacheKey);
    if (cached) return cached;

    try {
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();
      const seasonMap: Record<number, string> = { 1: 'WINTER', 2: 'WINTER', 3: 'WINTER', 4: 'SPRING', 5: 'SPRING', 6: 'SPRING', 7: 'SUMMER', 8: 'SUMMER', 9: 'SUMMER', 10: 'FALL', 11: 'FALL', 12: 'FALL' };
      const season = seasonMap[month];

      const gql = /* GraphQL */ `
        query ($season: MediaSeason, $year: Int, $page: Int, $perPage: Int) {
          Page(page: $page, perPage: $perPage) {
            media(season: $season, seasonYear: $year, sort: POPULARITY_DESC, type: ANIME) { ${MEDIA_FIELDS} }
          }
        }
      `;
      const res = await anilistQuery<{ Page: { media: unknown[] } }>(gql, { season, year, page, perPage: 20 });
      const result = { data: res.Page.media.map(mapAnilistMedia) };
      setCache(cacheKey, result, 60 * 60 * 1000); // 1 hr
      return result;
    } catch {
      return { data: [] };
    }
  },

  async getUpcomingSeasonalAnime(page = 1): Promise<{ data: AnimeData[] }> {
    const cacheKey = `upcoming-${page}`;
    const cached = getCache<{ data: AnimeData[] }>(cacheKey);
    if (cached) return cached;

    try {
      const gql = /* GraphQL */ `
        query ($page: Int, $perPage: Int) {
          Page(page: $page, perPage: $perPage) {
            media(status: NOT_YET_RELEASED, sort: POPULARITY_DESC, type: ANIME) { ${MEDIA_FIELDS} }
          }
        }
      `;
      const res = await anilistQuery<{ Page: { media: unknown[] } }>(gql, { page, perPage: 20 });
      const result = { data: res.Page.media.map(mapAnilistMedia) };
      setCache(cacheKey, result, 60 * 60 * 1000);
      return result;
    } catch {
      return { data: [] };
    }
  },

  // ── Schedule ──────────────────────────────────────────────────────────────

  async getAiringSchedule(page = 1): Promise<{ data: ScheduleEntry[] }> {
    const cacheKey = `schedule-${page}`;
    const cached = getCache<{ data: ScheduleEntry[] }>(cacheKey);
    if (cached) return cached;

    try {
      const gql = /* GraphQL */ `
        query ($page: Int, $perPage: Int) {
          Page(page: $page, perPage: $perPage) {
            media(status: RELEASING, sort: TRENDING_DESC, type: ANIME) { ${MEDIA_FIELDS} }
          }
        }
      `;
      const res = await anilistQuery<{ Page: { media: unknown[] } }>(gql, { page, perPage: 50 });
      // ScheduleEntry is structurally compatible with AnimeData for Phase 1
      const result = { data: res.Page.media.map(mapAnilistMedia) as unknown as ScheduleEntry[] };
      setCache(cacheKey, result, 5 * 60 * 1000); // 5 min TTL – schedules change fast
      return result;
    } catch {
      return { data: [] };
    }
  },

  // ── Anime detail ──────────────────────────────────────────────────────────

  async getAnimeDetail(id: number): Promise<{ data: AnimeData }> {
    if (env.FLAG_USE_NEW_METADATA) {
      try {
        const detail = await MetadataService.getAnimeDetail(id);
        return { data: detail };
      } catch (err) {
        console.warn(`Canary: MetadataService failed for ID ${id}, falling back to legacy AniList:`, err);
      }
    }

    const cacheKey = `detail-${id}`;
    const cached = getCache<{ data: AnimeData }>(cacheKey);
    if (cached) return cached;

    try {
      const gql = /* GraphQL */ `
        query ($id: Int) {
          Media(idMal: $id, type: ANIME) { ${MEDIA_FIELDS} }
        }
      `;
      const res = await anilistQuery<{ Media: unknown }>(gql, { id });
      const result = { data: mapAnilistMedia(res.Media) };
      setCache(cacheKey, result, 24 * 60 * 60 * 1000); // 24 hr
      return result;
    } catch {
      // Fallback: try by AniList ID in case MAL ID differs
      const gql2 = /* GraphQL */ `
        query ($id: Int) {
          Media(id: $id, type: ANIME) { ${MEDIA_FIELDS} }
        }
      `;
      try {
        const res2 = await anilistQuery<{ Media: unknown }>(gql2, { id });
        const result2 = { data: mapAnilistMedia(res2.Media) };
        setCache(cacheKey, result2, 24 * 60 * 60 * 1000);
        return result2;
      } catch {
        throw new Error(`Failed to fetch anime detail for id ${id}`);
      }
    }
  },

  // ── Episodes ──────────────────────────────────────────────────────────────

  async getAnimeEpisodes(id: number): Promise<{ data: EpisodeData[] }> {
    // AniList does not expose individual episode lists.
    // Phase 4 will query TMDB for episode data.
    // Phase 1: return synthetic entries based on total episode count.
    const cacheKey = `episodes-${id}`;
    const cached = getCache<{ data: EpisodeData[] }>(cacheKey);
    if (cached) return cached;

    try {
      const detail = await JikanAPI.getAnimeDetail(id);
      const count = detail.data.episodes ?? 0;
      const data: EpisodeData[] = Array.from({ length: count }, (_, i) => ({
        mal_id: i + 1,
        url: null,
        title: `Episode ${i + 1}`,
        title_japanese: null,
        title_romanji: null,
        aired: null,
        score: null,
        filler: false,
        recap: false,
        forum_url: null,
      }));
      const result = { data };
      setCache(cacheKey, result, 12 * 60 * 60 * 1000); // 12 hr
      return result;
    } catch {
      return { data: [] };
    }
  },

  // ── Characters ────────────────────────────────────────────────────────────

  async getAnimeCharacters(id: number): Promise<{ data: CharacterRoster[] }> {
    const cacheKey = `chars-${id}`;
    const cached = getCache<{ data: CharacterRoster[] }>(cacheKey);
    if (cached) return cached;

    try {
      const gql = /* GraphQL */ `
        query ($id: Int) {
          Media(idMal: $id, type: ANIME) {
            characters(sort: ROLE, perPage: 25) {
              edges {
                role
                node {
                  id
                  name { full native }
                  image { large medium }
                  siteUrl
                }
                voiceActors(language: JAPANESE, sort: RELEVANCE) {
                  id
                  name { full }
                  image { large }
                  siteUrl
                  languageV2
                }
              }
            }
          }
        }
      `;
      const res = await anilistQuery<{
        Media: {
          characters: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            edges: any[];
          };
        };
      }>(gql, { id });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: CharacterRoster[] = (res.Media.characters.edges ?? []).map((edge: any) => {
        const node = edge.node;
        const imgUrl = node.image?.large ?? node.image?.medium ?? '';
        const charImages = {
          jpg: { image_url: imgUrl, small_image_url: node.image?.medium ?? imgUrl, large_image_url: imgUrl },
          webp: { image_url: imgUrl, small_image_url: node.image?.medium ?? imgUrl, large_image_url: imgUrl },
        };
        return {
          character: {
            mal_id: node.id,
            url: node.siteUrl ?? '',
            images: charImages,
            name: node.name?.full ?? '',
          },
          role: edge.role ?? 'Supporting',
          favorites: 0,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          voice_actors: (edge.voiceActors ?? []).map((va: any) => ({
            person: {
              mal_id: va.id,
              url: va.siteUrl ?? '',
              images: { jpg: { image_url: va.image?.large ?? '' } },
              name: va.name?.full ?? '',
            },
            language: va.languageV2 ?? 'Japanese',
          })),
        };
      });

      const result = { data };
      setCache(cacheKey, result, 7 * 24 * 60 * 60 * 1000); // 7 days
      return result;
    } catch {
      return { data: [] };
    }
  },

  // ── Staff ─────────────────────────────────────────────────────────────────

  async getAnimeStaff(id: number): Promise<{ data: StaffMember[] }> {
    const cacheKey = `staff-${id}`;
    const cached = getCache<{ data: StaffMember[] }>(cacheKey);
    if (cached) return cached;

    try {
      const gql = /* GraphQL */ `
        query ($id: Int) {
          Media(idMal: $id, type: ANIME) {
            staff(sort: RELEVANCE, perPage: 25) {
              edges {
                role
                node {
                  id
                  name { full }
                  image { large }
                  siteUrl
                }
              }
            }
          }
        }
      `;
      const res = await anilistQuery<{
        Media: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          staff: { edges: any[] };
        };
      }>(gql, { id });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: StaffMember[] = (res.Media.staff.edges ?? []).map((edge: any) => ({
        person: {
          mal_id: edge.node.id,
          url: edge.node.siteUrl ?? '',
          images: { jpg: { image_url: edge.node.image?.large ?? '' } },
          name: edge.node.name?.full ?? '',
        },
        positions: edge.role ? [edge.role] : [],
      }));

      const result = { data };
      setCache(cacheKey, result, 7 * 24 * 60 * 60 * 1000); // 7 days
      return result;
    } catch {
      return { data: [] };
    }
  },

  // ── Recommendations ───────────────────────────────────────────────────────

  async getAnimeRecommendations(id: number): Promise<{ data: RecommendationItem[] }> {
    const cacheKey = `recs-${id}`;
    const cached = getCache<{ data: RecommendationItem[] }>(cacheKey);
    if (cached) return cached;

    try {
      const gql = /* GraphQL */ `
        query ($id: Int) {
          Media(idMal: $id, type: ANIME) {
            recommendations(sort: RATING_DESC, perPage: 15) {
              nodes {
                rating
                mediaRecommendation {
                  id
                  idMal
                  siteUrl
                  title { romaji english }
                  coverImage { large medium }
                }
              }
            }
          }
        }
      `;
      const res = await anilistQuery<{
        Media: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          recommendations: { nodes: any[] };
        };
      }>(gql, { id });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: RecommendationItem[] = (res.Media.recommendations.nodes ?? [])
        .filter((n: { mediaRecommendation: unknown }) => n.mediaRecommendation)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((n: any) => {
          const m = n.mediaRecommendation;
          const imgUrl = m.coverImage?.large ?? m.coverImage?.medium ?? '';
          const images = {
            jpg: { image_url: imgUrl, small_image_url: m.coverImage?.medium ?? imgUrl, large_image_url: imgUrl },
            webp: { image_url: imgUrl, small_image_url: m.coverImage?.medium ?? imgUrl, large_image_url: imgUrl },
          };
          return {
            entry: {
              mal_id: m.idMal ?? 0,
              url: m.siteUrl ?? '',
              images,
              title: m.title?.romaji ?? m.title?.english ?? '',
            },
            url: m.siteUrl ?? '',
            votes: n.rating ?? 0,
          };
        });

      const result = { data };
      setCache(cacheKey, result, 24 * 60 * 60 * 1000); // 24 hr
      return result;
    } catch {
      return { data: [] };
    }
  },

  async getRecentAnimeRecommendations(page = 1): Promise<{ data: RecommendationItem[] }> {
    const cacheKey = `recent-recs-${page}`;
    const cached = getCache<{ data: RecommendationItem[] }>(cacheKey);
    if (cached) return cached;

    try {
      // AniList doesn't have a "recent recommendations" endpoint.
      // We return popular titles as a reasonable proxy.
      const trending = await JikanAPI.getTrendingAnime(page);
      const data: RecommendationItem[] = trending.data.slice(0, 12).map((anime) => ({
        entry: {
          mal_id: anime.mal_id,
          url: anime.url,
          images: anime.images,
          title: anime.title,
        },
        url: anime.url,
        votes: anime.members ?? 0,
      }));
      const result = { data };
      setCache(cacheKey, result, 60 * 60 * 1000); // 1 hr
      return result;
    } catch {
      return { data: [] };
    }
  },

  // ── Search ────────────────────────────────────────────────────────────────

  async searchAnime(
    query: string,
    filters: {
      genres?: string;
      year?: string;
      status?: string;
      limit?: number;
      page?: number;
    } = {}
  ): Promise<{ data: AnimeData[]; pagination: { has_next_page: boolean; last_visible_page: number } }> {
    const { genres, year, status, limit = 20, page = 1 } = filters;

    if (env.FLAG_USE_NEW_METADATA) {
      try {
        const results = await MetadataService.searchAnime(query, limit);
        return {
          data: results,
          pagination: { has_next_page: false, last_visible_page: 1 }
        };
      } catch (err) {
        console.warn('Canary: MetadataService search failed, falling back to legacy search:', err);
      }
    }

    const cacheKey = `search-${query}-${JSON.stringify(filters)}`;
    const cached = getCache<{ data: AnimeData[]; pagination: { has_next_page: boolean; last_visible_page: number } }>(cacheKey);
    if (cached) return cached;

    try {
      const statusMap: Record<string, string> = {
        airing: 'RELEASING',
        complete: 'FINISHED',
        upcoming: 'NOT_YET_RELEASED',
      };

      const anilistGenreMap: Record<string, string> = {
        '1': 'Action', '2': 'Adventure', '4': 'Comedy', '8': 'Drama',
        '10': 'Fantasy', '14': 'Horror', '7': 'Mystery', '22': 'Romance',
        '24': 'Sci-Fi', '36': 'Slice of Life', '30': 'Sports', '37': 'Supernatural',
        '41': 'Thriller',
      };

      const genreFilter = genres ? [anilistGenreMap[genres] ?? genres] : undefined;
      const statusFilter = status ? (statusMap[status] ?? status.toUpperCase()) : undefined;

      const gql = /* GraphQL */ `
        query ($search: String, $genres: [String], $status: MediaStatus, $year: Int, $page: Int, $perPage: Int) {
          Page(page: $page, perPage: $perPage) {
            pageInfo { hasNextPage lastPage }
            media(
              search: $search
              genre_in: $genres
              status: $status
              seasonYear: $year
              type: ANIME
              sort: SEARCH_MATCH
            ) { ${MEDIA_FIELDS} }
          }
        }
      `;

      const res = await anilistQuery<{
        Page: {
          pageInfo: { hasNextPage: boolean; lastPage: number };
          media: unknown[];
        };
      }>(gql, {
        search: query || undefined,
        genres: genreFilter,
        status: statusFilter,
        year: year ? parseInt(year, 10) : undefined,
        page,
        perPage: Math.min(limit, 50),
      });

      const result = {
        data: res.Page.media.map(mapAnilistMedia),
        pagination: {
          has_next_page: res.Page.pageInfo.hasNextPage,
          last_visible_page: res.Page.pageInfo.lastPage,
        },
      };
      setCache(cacheKey, result, 5 * 60 * 1000); // 5 min
      return result;
    } catch {
      return { data: [], pagination: { has_next_page: false, last_visible_page: 1 } };
    }
  },

  // ── Reviews ───────────────────────────────────────────────────────────────

  async getAnimeReviews(_id: number): Promise<{ data: UserReview[] }> {
    // AniList does not expose reviews via public API.
    // Phase 4 will serve reviews from the local database.
    return { data: [] };
  },

  // ── Genres ────────────────────────────────────────────────────────────────

  async getGenres(): Promise<{ data: GenreTag[] }> {
    const cacheKey = 'genres';
    const cached = getCache<{ data: GenreTag[] }>(cacheKey);
    if (cached) return cached;

    try {
      const gql = /* GraphQL */ `
        query { GenreCollection }
      `;
      const res = await anilistQuery<{ GenreCollection: string[] }>(gql);
      const data: GenreTag[] = res.GenreCollection.map((name, i) => ({
        mal_id: i + 1,
        type: 'anime',
        name,
        url: `https://anilist.co/genre/${encodeURIComponent(name)}`,
      }));
      const result = { data };
      setCache(cacheKey, result, 30 * 24 * 60 * 60 * 1000); // 30 days
      return result;
    } catch {
      return { data: [] };
    }
  },
};

// ---------------------------------------------------------------------------
// Legacy default export alias (some older imports use fetchJikan)
// ---------------------------------------------------------------------------
export async function fetchJikan<T>(_path: string, _fallbackKey?: string): Promise<T> {
  throw new Error(
    'fetchJikan() is deprecated. Use JikanAPI methods or MetadataService instead.'
  );
}
