// src/services/metadata/providers/AniListProvider.ts
import { IMetadataProvider, NormalizedAnime, ProviderResponse } from './IMetadataProvider';
import { ProviderType } from '@prisma/client';
import { ResilientClient } from '../client/ResilientClient';
import { env } from '@/lib/config/env';

const ANILIST_ENDPOINT = 'https://graphql.anilist.co';

const MEDIA_QUERY = /* GraphQL */ `
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      id
      title { romaji english native }
      synonyms
      description
      status
      episodes
      season
      seasonYear
      averageScore
      popularity
      genres
      studios(isMain: true) { nodes { name } }
    }
  }
`;

export class AniListProvider implements IMetadataProvider {
  type = ProviderType.ANILIST;

  async getAnime(providerId: string, etag?: string): Promise<ProviderResponse<NormalizedAnime>> {
    const id = parseInt(providerId, 10);

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
        body: JSON.stringify({ query: MEDIA_QUERY, variables: { id } })
      });

      if (!res.ok) {
        throw new Error(`AniList API returned HTTP ${res.status}`);
      }

      const json = await res.json();
      if (json.errors && json.errors.length > 0) {
        throw new Error(`AniList GQL Error: ${json.errors[0].message}`);
      }

      return {
        statusCode: res.status,
        data: json.data?.Media
      };
    };

    // Execute with circuit breaker and backoff
    const response = await ResilientClient.executeWithBackoff(this.type, fetchFn);
    const media = response.data;

    if (!media) {
      throw new Error(`AniList returned empty payload for ID ${providerId}`);
    }

    // Mapping AniList status to internal status
    const statusMap: Record<string, 'ONGOING' | 'FINISHED' | 'UPCOMING' | 'HIATUS'> = {
      FINISHED: 'FINISHED',
      RELEASING: 'ONGOING',
      NOT_YET_RELEASED: 'UPCOMING',
      CANCELLED: 'FINISHED',
      HIATUS: 'HIATUS'
    };

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

    // Strip HTML from description
    const synopsis = media.description
      ? media.description.replace(/<[^>]*>/g, '').replace(/&[a-z]+;/gi, ' ').trim()
      : undefined;

    const normalized: NormalizedAnime = {
      titles,
      synopsis,
      status: statusMap[media.status] || 'UPCOMING',
      season: media.season || undefined,
      year: media.seasonYear || undefined,
      episodesCount: media.episodes || 0,
      popularity: media.popularity || undefined,
      score: media.averageScore ? media.averageScore / 10 : undefined,
      genres: media.genres || [],
      studios: media.studios?.nodes?.map((s: { name: string }) => s.name) || []
    };

    return {
      statusCode: response.statusCode,
      data: normalized
    };
  }

  async getCharacters(providerId: string): Promise<ProviderResponse<any[]>> {
    // Basic wrapper
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
export default AniListProvider;
