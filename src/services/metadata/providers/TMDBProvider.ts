// src/services/metadata/providers/TMDBProvider.ts
import { IMetadataProvider, NormalizedAnime, ProviderResponse } from './IMetadataProvider';
import { ProviderType } from '@prisma/client';
import { ResilientClient } from '../client/ResilientClient';
import { env } from '@/lib/config/env';

export class TMDBProvider implements IMetadataProvider {
  type = ProviderType.TMDB;

  async getAnime(providerId: string, etag?: string): Promise<ProviderResponse<NormalizedAnime>> {
    if (!env.TMDB_API_KEY) {
      throw new Error('TMDB_API_KEY is not configured');
    }

    // TMDB treats anime series as TV shows
    const url = `https://api.themoviedb.org/3/tv/${providerId}?api_key=${env.TMDB_API_KEY}&append_to_response=translations,external_ids`;

    const fetchFn = async () => {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`TMDB API returned HTTP ${res.status}`);
      }

      const json = await res.json();
      return {
        statusCode: res.status,
        data: json
      };
    };

    const response = await ResilientClient.executeWithBackoff(this.type, fetchFn);
    const tv = response.data;

    // Resolve translations (DE and EN)
    const translations = tv.translations?.translations || [];
    const deTrans = translations.find((t: any) => t.iso_639_1 === 'de');
    const enTrans = translations.find((t: any) => t.iso_639_1 === 'en');

    const deSynopsis = deTrans?.data?.overview || null;
    const enSynopsis = enTrans?.data?.overview || tv.overview || null;

    // Resolve titles
    const titles = [
      { language: 'en', value: tv.name, type: 'ENGLISH' }
    ];
    if (tv.original_name && tv.original_name !== tv.name) {
      titles.push({ language: 'ja', value: tv.original_name, type: 'NATIVE' });
    }

    // Resolve status mapping
    // TMDB values: Returning Series, Planned, In Production, Ended, Canceled
    const statusMap: Record<string, 'ONGOING' | 'FINISHED' | 'UPCOMING' | 'HIATUS'> = {
      'Returning Series': 'ONGOING',
      'Planned': 'UPCOMING',
      'In Production': 'ONGOING',
      'Ended': 'FINISHED',
      'Canceled': 'FINISHED'
    };

    const airDate = tv.first_air_date ? new Date(tv.first_air_date) : null;

    const normalized: NormalizedAnime = {
      titles,
      synopsis: enSynopsis || undefined,
      synopsis_de: deSynopsis || undefined,
      synopsis_en: enSynopsis || undefined,
      status: statusMap[tv.status] || 'FINISHED',
      year: airDate ? airDate.getFullYear() : undefined,
      episodesCount: tv.number_of_episodes || 0,
      popularity: tv.popularity ? Math.round(tv.popularity) : undefined,
      score: tv.vote_average || undefined,
      genres: tv.genres?.map((g: { name: string }) => g.name) || [],
      studios: tv.production_companies?.map((c: { name: string }) => c.name) || []
    };

    return {
      statusCode: response.statusCode,
      data: normalized
    };
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
export default TMDBProvider;
