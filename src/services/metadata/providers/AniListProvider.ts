// src/services/metadata/providers/AniListProvider.ts
import { IMetadataProvider, NormalizedAnime, ProviderResponse } from './IMetadataProvider';
import { ProviderType } from '@prisma/client';
import { ResilientClient } from '../client/ResilientClient';
import { env } from '@/lib/config/env';
import { cleanGraphQLVariables } from './utils';
import { AnimeData, GenreTag, StudioTag } from '../types/compatibility';

const ANILIST_ENDPOINT = 'https://graphql.anilist.co';

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
  isAdult
  relations { 
    edges { 
      relationType 
      node { 
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
        endDate { year month day } 
        coverImage { large medium } 
        bannerImage 
        trailer { id site } 
        studios(isMain: true) { nodes { id name } }
        isAdult
      } 
    } 
  }
`;

const GET_ANIME_QUERY = /* GraphQL */ `
  query ($id: Int, $idMal: Int) {
    Media(id: $id, idMal: $idMal, type: ANIME) {
      ${MEDIA_FIELDS}
    }
  }
`;

const SEARCH_ANIME_QUERY = /* GraphQL */ `
  query ($search: String, $limit: Int) {
    Page(page: 1, perPage: $limit) {
      media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
        ${MEDIA_FIELDS}
      }
    }
  }
`;

const SEARCH_CHARACTERS_QUERY = /* GraphQL */ `
  query ($search: String, $limit: Int) {
    Page(page: 1, perPage: $limit) {
      characters(search: $search) {
        nodes {
          media(type: ANIME, perPage: 6) {
            nodes {
              ${MEDIA_FIELDS}
            }
          }
        }
      }
    }
  }
`;

const SEARCH_STUDIOS_QUERY = /* GraphQL */ `
  query ($search: String, $limit: Int) {
    Page(page: 1, perPage: $limit) {
      studios(search: $search) {
        nodes {
          media(type: ANIME, perPage: 8) {
            nodes {
              ${MEDIA_FIELDS}
            }
          }
        }
      }
    }
  }
`;

export function mapAnilistMedia(m: any): AnimeData {
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

  const rawSynopsis: string = m.description ?? '';
  const synopsis = rawSynopsis.replace(/<[^>]*>/g, '').replace(/&[a-z]+;/gi, ' ').trim() || null;

  const genres: GenreTag[] = (m.genres ?? []).map((name: string, i: number) => ({
    mal_id: i + 1,
    type: 'anime',
    name,
    url: `https://anilist.co/genre/${encodeURIComponent(name)}`,
  }));

  const studios: StudioTag[] = (m.studios?.nodes ?? []).map((s: { id: number; name: string }) => ({
    mal_id: s.id,
    type: 'anime',
    name: s.name,
    url: `https://anilist.co/studio/${s.id}`,
  }));

  const isAdult = m.isAdult ?? false;
  const genresList = m.genres ?? [];
  const rating = isAdult
    ? 'R-18+'
    : genresList.includes('Hentai')
    ? 'R-18+'
    : genresList.includes('Ecchi')
    ? 'R-17+'
    : 'PG-13';

  const relations = (m.relations?.edges ?? []).map((edge: any) => {
    const node = edge.node;
    if (!node) return null;
    const nodeJpg = node.coverImage?.large ?? node.coverImage?.medium ?? '';
    const nodeImages = {
      jpg: { image_url: nodeJpg, small_image_url: node.coverImage?.medium ?? nodeJpg, large_image_url: nodeJpg },
      webp: { image_url: nodeJpg, small_image_url: node.coverImage?.medium ?? nodeJpg, large_image_url: nodeJpg },
    };

    const relIsAdult = node.isAdult ?? false;
    const relGenres = node.genres ?? [];
    const relRating = relIsAdult
      ? 'R-18+'
      : relGenres.includes('Hentai')
      ? 'R-18+'
      : relGenres.includes('Ecchi')
      ? 'R-17+'
      : 'PG-13';

    const relationAnime: AnimeData = {
      mal_id: node.idMal ?? node.id,
      url: node.siteUrl ?? '',
      images: nodeImages,
      trailer: { youtube_id: null, url: null, embed_url: null },
      approved: true,
      title: node.title?.romaji ?? node.title?.english ?? 'Unknown',
      title_english: node.title?.english ?? null,
      title_japanese: node.title?.native ?? null,
      title_synonyms: node.synonyms ?? [],
      type: node.format ?? 'TV',
      source: node.source ?? null,
      episodes: node.episodes ?? null,
      status: statusMap[node.status] ?? node.status ?? null,
      airing: node.status === 'RELEASING',
      aired: { from: null, to: null, string: 'Aired info unavailable' },
      duration: node.duration ? `${node.duration} min per ep` : null,
      rating: relRating,
      score: node.averageScore ? node.averageScore / 10 : null,
      scored_by: node.popularity ?? null,
      rank: null,
      popularity: node.popularity ?? null,
      members: node.popularity ?? null,
      favorites: null,
      synopsis: node.description ? node.description.replace(/<[^>]*>/g, '').replace(/&[a-z]+;/gi, ' ').trim() : null,
      background: node.bannerImage ?? null,
      season: node.season ? (seasonMap[node.season] ?? node.season.toLowerCase()) : null,
      year: node.seasonYear ?? (node.startDate?.year) ?? null,
      broadcast: { day: null, time: null, timezone: null, string: null },
      producers: [],
      licensors: [],
      studios: (node.studios?.nodes ?? []).map((s: any) => ({ mal_id: s.id, type: 'anime', name: s.name, url: '' })),
      genres: (node.genres ?? []).map((name: string, i: number) => ({ mal_id: i + 1, type: 'anime', name, url: '' })),
      explicit_genres: [],
      themes: [],
      demographics: [],
      relations: [],
    };

    return {
      relation: edge.relationType,
      entry: [
        {
          mal_id: node.idMal ?? node.id,
          type: 'anime',
          name: node.title?.english || node.title?.romaji || 'Unknown',
          url: node.siteUrl || '',
           anime: relationAnime,
        } as any
      ]
    };
  }).filter(Boolean);

  const recommendations = (m.recommendations?.edges ?? []).map((edge: any) => {
    const node = edge.node?.mediaRecommendation;
    if (!node) return null;
    const nodeJpg = node.coverImage?.large ?? node.coverImage?.medium ?? '';
    const nodeImages = {
      jpg: { image_url: nodeJpg, small_image_url: node.coverImage?.medium ?? nodeJpg, large_image_url: nodeJpg },
      webp: { image_url: nodeJpg, small_image_url: node.coverImage?.medium ?? nodeJpg, large_image_url: nodeJpg },
    };

    const recAnime: AnimeData = {
      mal_id: node.idMal ?? node.id,
      url: node.siteUrl ?? '',
      images: nodeImages,
      trailer: { youtube_id: null, url: null, embed_url: null },
      approved: true,
      title: node.title?.romaji ?? node.title?.english ?? 'Unknown',
      title_english: node.title?.english ?? null,
      title_japanese: node.title?.native ?? null,
      title_synonyms: node.synonyms ?? [],
      type: node.format ?? 'TV',
      source: node.source ?? null,
      episodes: node.episodes ?? null,
      status: statusMap[node.status] ?? node.status ?? null,
      airing: node.status === 'RELEASING',
      aired: { from: null, to: null, string: 'Aired info unavailable' },
      duration: node.duration ? `${node.duration} min per ep` : null,
      rating: 'PG-13',
      score: node.averageScore ? node.averageScore / 10 : null,
      scored_by: node.popularity ?? null,
      rank: null,
      popularity: node.popularity ?? null,
      members: node.popularity ?? null,
      favorites: null,
      synopsis: node.description ? node.description.replace(/<[^>]*>/g, '').replace(/&[a-z]+;/gi, ' ').trim() : null,
      background: node.bannerImage ?? null,
      season: node.season ? (seasonMap[node.season] ?? node.season.toLowerCase()) : null,
      year: node.seasonYear ?? (node.startDate?.year) ?? null,
      broadcast: { day: null, time: null, timezone: null, string: null },
      producers: [],
      licensors: [],
      studios: (node.studios?.nodes ?? []).map((s: any) => ({ mal_id: s.id, type: 'anime', name: s.name, url: '' })),
      genres: (node.genres ?? []).map((name: string, i: number) => ({ mal_id: i + 1, type: 'anime', name, url: '' })),
      explicit_genres: [],
      themes: [],
      demographics: [],
      relations: [],
    };

    return recAnime;
  }).filter(Boolean);

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
    rating,
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
    relations,
    recommendations,
  };
}

export class AniListProvider implements IMetadataProvider {
  type = ProviderType.ANILIST;

  private async executeGql<T>(query: string, variables: any = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    };
    if (env.ANILIST_TOKEN) {
      headers['Authorization'] = `Bearer ${env.ANILIST_TOKEN}`;
    }
    const fetchFn = async () => {
      const res = await fetch(ANILIST_ENDPOINT, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query, variables: cleanGraphQLVariables(variables) }),
        next: { revalidate: 300 }
      });
      if (!res.ok) {
        throw new Error(`AniList API returned HTTP ${res.status}`);
      }
      const json = await res.json();
      if (json.errors && json.errors.length > 0) {
        throw new Error(`AniList GQL Error: ${json.errors[0].message}`);
      }
      return json.data;
    };
    return ResilientClient.executeWithBackoff(this.type, fetchFn);
  }

  async getAnime(providerId: string, etag?: string): Promise<ProviderResponse<NormalizedAnime>> {
    let id: number | null = null;
    let idMal: number | null = null;

    if (providerId.startsWith('mal:')) {
      idMal = parseInt(providerId.split(':')[1], 10);
    } else {
      id = parseInt(providerId, 10);
    }

    const data = await this.executeGql<any>(GET_ANIME_QUERY, { id, idMal });
    const media = data?.Media;

    if (!media) {
      throw new Error(`AniList returned empty payload for ID ${providerId}`);
    }

    const mapped = mapAnilistMedia(media);

    const normalized: NormalizedAnime = {
      titles: mTitles(media),
      synopsis: mapped.synopsis || undefined,
      status: media.status === 'FINISHED' ? 'FINISHED' : media.status === 'RELEASING' ? 'ONGOING' : media.status === 'HIATUS' ? 'HIATUS' : 'UPCOMING',
      season: media.season || undefined,
      year: media.seasonYear || undefined,
      episodesCount: media.episodes || 0,
      popularity: media.popularity || undefined,
      score: media.averageScore ? media.averageScore / 10 : undefined,
      genres: media.genres || [],
      studios: media.studios?.nodes?.map((s: { name: string }) => s.name) || []
    };

    return {
      statusCode: 200,
      data: normalized
    };
  }

  async searchAnime(query: string, limit = 24): Promise<AnimeData[]> {
    try {
      const data = await this.executeGql<any>(SEARCH_ANIME_QUERY, { search: query, limit });
      const mediaList = data?.Page?.media || [];
      return mediaList.map(mapAnilistMedia);
    } catch (err) {
      console.error('AniListProvider.searchAnime failed:', err);
      return [];
    }
  }

  async searchCharacters(query: string, limit = 3): Promise<{ characterNode: any; media: AnimeData[] }[]> {
    try {
      const data = await this.executeGql<any>(SEARCH_CHARACTERS_QUERY, { search: query, limit });
      const nodes = data?.Page?.characters?.nodes || [];
      return nodes.map((c: any) => ({
        characterNode: c,
        media: (c.media?.nodes || []).map(mapAnilistMedia)
      }));
    } catch (err) {
      console.error('AniListProvider.searchCharacters failed:', err);
      return [];
    }
  }

  async searchStudios(query: string, limit = 3): Promise<{ studioNode: any; media: AnimeData[] }[]> {
    try {
      const data = await this.executeGql<any>(SEARCH_STUDIOS_QUERY, { search: query, limit });
      const nodes = data?.Page?.studios?.nodes || [];
      return nodes.map((s: any) => ({
        studioNode: s,
        media: (s.media?.nodes || []).map(mapAnilistMedia)
      }));
    } catch (err) {
      console.error('AniListProvider.searchStudios failed:', err);
      return [];
    }
  }

  async getCharacters(providerId: string): Promise<ProviderResponse<any[]>> {
    return { statusCode: 200, data: [] };
  }

  async getEpisodes(providerId: string): Promise<ProviderResponse<any[]>> {
    return { statusCode: 200, data: [] };
  }

  async getRecommendations(providerId: string): Promise<ProviderResponse<any[]>> {
    return { statusCode: 200, data: [] };
  }

  async getRelations(providerId: string): Promise<ProviderResponse<any[]>> {
    return { statusCode: 200, data: [] };
  }
}

function mTitles(media: any) {
  const titles = [
    { language: 'en', value: media.title.romaji || 'Unknown', type: 'ROMAJI' }
  ];
  if (media.title.english) {
    titles.push({ language: 'en', value: media.title.english, type: 'ENGLISH' });
  }
  if (media.title.native) {
    titles.push({ language: 'ja', value: media.title.native, type: 'NATIVE' });
  }
  if (media.synonyms) {
    media.synonyms.forEach((syn: string) => {
      titles.push({ language: 'en', value: syn, type: 'SYNONYM' });
    });
  }
  return titles;
}

export default AniListProvider;
